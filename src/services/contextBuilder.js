import { assetService, memoryService, messageService, worldBookEntryService } from './db';
import { buildEnhancedSystemPrompt } from '../utils/promptBuilder';
import { buildWorldBookContext } from '../utils/worldBook';

export const DEFAULT_CONTEXT_TOKEN_BUDGET = 8000;
export const MIN_CONTEXT_TOKEN_BUDGET = 2000;
export const MAX_CONTEXT_TOKEN_BUDGET = 32000;

export const estimateTokens = (value) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const other = text.replace(/[\u3400-\u9fff]/g, '').length;
  return Math.max(1, cjk + Math.ceil(other / 4) + 4);
};

const estimateMessages = messages => messages.reduce((sum, message) => {
  if (message.type === 'image') return sum + 1000;
  return sum + estimateTokens(message.content);
}, 0);

const clipTextToTokens = (text, budget) => {
  const value = String(text || '');
  if (estimateTokens(value) <= budget) return value;
  let low = 0;
  let high = value.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (estimateTokens(value.slice(0, mid)) <= budget) low = mid;
    else high = mid - 1;
  }
  return `${value.slice(0, Math.max(0, low - 1)).trim()}…`;
};

export const groupMessagesIntoTurns = (messages = []) => {
  const turns = [];
  for (const message of messages) {
    if (message.role === 'user' || turns.length === 0) {
      turns.push([message]);
    } else {
      turns[turns.length - 1].push(message);
    }
  }
  return turns;
};

export const selectCompleteTurns = (messages = [], maxTurns = 15, tokenBudget = Infinity) => {
  const turns = groupMessagesIntoTurns(messages).slice(-Math.max(1, Number(maxTurns) || 15));
  const selected = [];
  let used = 0;
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const cost = estimateMessages(turns[index]);
    if (selected.length > 0 && used + cost > tokenBudget) break;
    if (selected.length === 0 && cost > tokenBudget) {
      let remaining = Math.max(1, tokenBudget);
      const clippedTurn = turns[index].map(message => {
        const costForMessage = message.type === 'image' ? 1000 : estimateTokens(message.content);
        const allowance = Math.max(1, Math.min(costForMessage, remaining));
        remaining -= allowance;
        return message.type === 'image' ? message : { ...message, content: clipTextToTokens(message.content, allowance) };
      });
      selected.unshift(clippedTurn);
      used = tokenBudget;
    } else {
      selected.unshift(turns[index]);
      used += cost;
    }
  }
  return { messages: selected.flat(), turns: selected.length, estimatedTokens: used, truncated: selected.length < turns.length };
};

const clampBudget = value => Math.min(MAX_CONTEXT_TOKEN_BUDGET, Math.max(MIN_CONTEXT_TOKEN_BUDGET, Number(value) || DEFAULT_CONTEXT_TOKEN_BUDGET));

const toApiMessages = async (messages, apiFormat) => {
  let lastImageIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].type === 'image') { lastImageIndex = index; break; }
  }

  return await Promise.all(messages.map(async (message, index) => {
    if (message.type === 'image') {
      if (index === lastImageIndex) {
        const content = message.imageRef || message.content || '';
        const match = content.match(/^\[IMAGE:(.+)\]$/);
        const dataUrl = match ? await assetService.get(match[1]) : content.startsWith('data:') ? content : null;
        if (dataUrl) {
          const mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
          const base64 = dataUrl.split(',')[1];
          return apiFormat === 'anthropic'
            ? { role: message.role, content: [{ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } }] }
            : { role: message.role, content: [{ type: 'image_url', image_url: { url: dataUrl } }] };
        }
      }
      return { role: message.role, content: '[图片]' };
    }
    return { role: message.role, content: message.audioUrl && message.content ? `[语音:${message.content}]` : message.content };
  }));
};

export async function buildContextPacket(role, options = {}) {
  if (!role?.id) throw new Error('角色不存在');
  const settings = role.chatSettings || {};
  const tokenBudget = clampBudget(options.tokenBudget ?? settings.contextTokenBudget);
  const maxTurns = Math.max(1, Number(options.maxTurns ?? settings.contextLength) || 15);
  const allMessages = options.contextMessages || await messageService.getContextMessagesByRole(role.id);
  const query = allMessages.slice(-8).map(message => message.content).join('\n');
  const memories = options.memoryEntries || await memoryService.retrieveForRole(role.id, query, 5);
  const worldBookResult = options.worldBookResult || buildWorldBookContext(
    await worldBookEntryService.getAll(),
    allMessages.slice(-8),
    { scanDepth: 8, maxEntries: 8, maxChars: 6000 }
  );

  let includeDiaries = options.includeDiaries !== false;
  let selectedMemories = memories.slice(0, 5);
  let selectedWorldBook = worldBookResult;
  let longTermMemoryMaxChars = 8000;
  let coreMemoryMaxChars = 4000;
  let rolePromptMaxChars = 12000;
  const promptOptions = () => ({
    ...options, memoryEntries: selectedMemories, worldBookResult: selectedWorldBook, includeDiaries,
    longTermMemoryMaxChars, coreMemoryMaxChars, rolePromptMaxChars
  });
  let systemPrompt = await buildEnhancedSystemPrompt(role, allMessages, {
    ...promptOptions()
  });

  // Optional material is removed before recent messages are sacrificed.
  const minimumMessageReserve = Math.min(Math.floor(tokenBudget * 0.35), 2500);
  if (estimateTokens(systemPrompt) > tokenBudget - minimumMessageReserve && includeDiaries) {
    includeDiaries = false;
    systemPrompt = await buildEnhancedSystemPrompt(role, allMessages, promptOptions());
  }
  while (estimateTokens(systemPrompt) > tokenBudget - minimumMessageReserve && selectedMemories.length) {
    selectedMemories = selectedMemories.slice(0, -1);
    systemPrompt = await buildEnhancedSystemPrompt(role, allMessages, promptOptions());
  }
  if (estimateTokens(systemPrompt) > tokenBudget - minimumMessageReserve && selectedWorldBook.text) {
    selectedWorldBook = { text: '', entries: [] };
    systemPrompt = await buildEnhancedSystemPrompt(role, allMessages, promptOptions());
  }
  if (estimateTokens(systemPrompt) > tokenBudget - minimumMessageReserve && longTermMemoryMaxChars) {
    longTermMemoryMaxChars = 0;
    systemPrompt = await buildEnhancedSystemPrompt(role, allMessages, promptOptions());
  }
  if (estimateTokens(systemPrompt) > tokenBudget - minimumMessageReserve) {
    coreMemoryMaxChars = Math.min(coreMemoryMaxChars, Math.floor(tokenBudget * 0.2));
    rolePromptMaxChars = Math.min(rolePromptMaxChars, Math.floor(tokenBudget * 0.3));
    systemPrompt = await buildEnhancedSystemPrompt(role, allMessages, promptOptions());
  }
  if (estimateTokens(systemPrompt) > tokenBudget - 128) {
    systemPrompt = clipTextToTokens(systemPrompt, Math.max(128, tokenBudget - 128));
  }

  const systemTokens = estimateTokens(systemPrompt);
  const selection = selectCompleteTurns(allMessages, maxTurns, Math.max(1, tokenBudget - systemTokens));
  const apiMessages = await toApiMessages(selection.messages, role.apiFormat || 'openai');
  const messageTokens = estimateMessages(selection.messages);

  return {
    systemPrompt,
    messages: apiMessages,
    contextMessages: selection.messages,
    memoryEntries: selectedMemories,
    selectedMemoryIds: selectedMemories.map(memory => memory.id),
    selectedWorldBookIds: (selectedWorldBook.entries || []).map(entry => entry.id),
    estimatedInputTokens: systemTokens + messageTokens,
    truncated: selection.truncated || systemTokens + messageTokens > tokenBudget || !includeDiaries || longTermMemoryMaxChars < 8000 || coreMemoryMaxChars < 4000 || rolePromptMaxChars < 12000 || selectedMemories.length < memories.length || selectedWorldBook.entries?.length < worldBookResult.entries?.length,
    diagnostics: {
      tokenBudget,
      systemTokens,
      messageTokens,
      selectedTurns: selection.turns,
      availableTurns: groupMessagesIntoTurns(allMessages).length,
      includedDiaries: includeDiaries,
      coreMemoryMaxChars,
      longTermMemoryMaxChars,
      rolePromptMaxChars
    }
  };
}
