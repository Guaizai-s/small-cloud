import { apiProfileService, diaryService, messageService, parseAmountToCents, roleService, walletService } from './db';
import { callClaude } from './claude';
import { textToSpeech } from './minimax';
import { buildContextPacket } from './contextBuilder';
import { parseMessageDirectives } from '../utils/directiveParser';
import { buildHeartVoiceSystemPrompt } from '../utils/promptBuilder';
import { buildHeartVoiceMessages, parseHeartVoiceResponse } from '../utils/heartVoice';
import { scheduleMemoryMaintenance } from './memoryWorker';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const toDateKey = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export async function resolveChatRole(roleId) {
  const role = await roleService.getById(Number(roleId));
  if (!role) throw new Error('角色不存在');
  const profile = role.apiProfileId
    ? await apiProfileService.getById(role.apiProfileId)
    : (await apiProfileService.getAll())[0];
  return profile ? { ...role, ...profile, id: role.id, chatSettings: role.chatSettings } : role;
}

const emitCreated = async (callbacks, message) => {
  if (callbacks?.onMessageCreated) await callbacks.onMessageCreated(message);
};

const createTextBubbles = async (conversationId, text, callbacks) => {
  const created = [];
  const parts = String(text || '').split('\n').map(part => part.trim()).filter(Boolean);
  for (let index = 0; index < parts.length; index += 1) {
    if (index > 0) await sleep(500);
    const message = await messageService.create(conversationId, 'assistant', parts[index], 'text');
    created.push(message);
    await emitCreated(callbacks, message);
  }
  return created;
};

async function applyDirectives({ conversationId, role, rawText, channel, callbacks }) {
  const parsed = parseMessageDirectives(rawText);
  const created = [];
  const settings = role.chatSettings || {};
  const voice = parsed.directives.find(item => item.type === 'voice');
  const wallet = channel === 'wechat'
    ? parsed.directives.find(item => ['redpacket', 'transfer'].includes(item.type) && item.executable)
    : null;
  const diary = channel === 'wechat'
    ? parsed.directives.find(item => item.type === 'diary' && item.executable)
    : null;
  const stickers = parsed.directives.filter(item => item.type === 'sticker');

  if (parsed.cleanText) created.push(...await createTextBubbles(conversationId, parsed.cleanText, callbacks));

  for (const sticker of stickers) {
    const message = await messageService.create(conversationId, 'assistant', `[表情:${sticker.name}]`, 'text');
    created.push(message);
    await emitCreated(callbacks, message);
  }

  if (voice?.text) {
    let audioUrl = null;
    try {
      audioUrl = await textToSpeech(voice.text, {
        voiceId: settings.minimaxVoiceId,
        model: settings.minimaxModel,
        speed: settings.minimaxSpeed,
        pitch: settings.minimaxPitch
      });
    } catch (error) {
      console.warn('语音生成失败:', error.message);
    }
    const message = await messageService.create(conversationId, 'assistant', voice.text, 'text', audioUrl);
    created.push(message);
    await emitCreated(callbacks, message);
  }

  if (wallet) {
    try {
      const message = await walletService.createIncoming({
        conversationId,
        roleId: role.id,
        type: wallet.type,
        amountCents: parseAmountToCents(wallet.amount),
        note: wallet.note
      });
      created.push(message);
      await emitCreated(callbacks, message);
    } catch (error) {
      console.warn('钱包指令执行失败:', error.message);
    }
  }

  if (diary?.content) {
    try {
      const entry = await diaryService.create({
        authorType: 'role', roleId: role.id, linkedRoleIds: [role.id], dateKey: toDateKey(),
        title: diary.title || '聊天日记', content: diary.content, visibility: 'role_visible',
        includeInContext: true, source: 'directive'
      });
      const notice = await messageService.create(conversationId, 'system', `${role.name || '角色'}写了一篇日记 >`, 'diary_notice', null, { diaryId: entry.id });
      await emitCreated(callbacks, notice);
    } catch (error) {
      console.warn('角色日记写入失败:', error.message);
    }
  }
  return created;
}

export const chatOrchestrator = {
  async reply({ roleId, conversationId, channel = 'wechat', trigger = 'manual_generate', callbacks = {}, callModel = callClaude }) {
    if (!conversationId) throw new Error('会话不存在');
    const role = await resolveChatRole(roleId);
    const directiveTypes = channel === 'sms' ? ['voice'] : undefined;
    const packet = await buildContextPacket(role, { directiveTypes });
    let streamed = '';
    const useStream = localStorage.getItem('useStreamAPI') === 'true';
    const response = await callModel(
      { ...role, systemPrompt: packet.systemPrompt, skipSystemPromptMerge: true },
      packet.messages,
      useStream ? chunk => {
        streamed += chunk;
        callbacks.onStreamChunk?.(chunk, streamed);
      } : null
    );
    const rawText = useStream ? streamed || response : response;
    const createdMessages = await applyDirectives({ conversationId, role, rawText, channel, callbacks });
    scheduleMemoryMaintenance(role.id);
    return { role, packet, rawText, createdMessages, trigger };
  },

  async heartVoice({ roleId, callModel = callClaude }) {
    const role = await resolveChatRole(roleId);
    const packet = await buildContextPacket(role, { maxTurns: Math.max(20, role.chatSettings?.contextLength || 15), directiveTypes: [] });
    const systemPrompt = await buildHeartVoiceSystemPrompt(role, packet.contextMessages, { memoryEntries: packet.memoryEntries });
    const response = await callModel(
      { ...role, systemPrompt, skipSystemPromptMerge: true },
      buildHeartVoiceMessages(packet.contextMessages)
    );
    return { data: parseHeartVoiceResponse(response), packet };
  }
};
