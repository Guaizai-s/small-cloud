import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import db, { apiProfileService, conversationService, contextJobService, memoryService, messageService, roleService } from './db';
import { ensureMemoryJob, runMemoryJob } from './memoryWorker';
import { chatOrchestrator } from './chatOrchestrator';
import { buildContextPacket } from './contextBuilder';

globalThis.localStorage = {
  data: new Map(),
  getItem(key) { return this.data.get(key) ?? null; },
  setItem(key, value) { this.data.set(key, String(value)); },
  removeItem(key) { this.data.delete(key); },
  clear() { this.data.clear(); }
};

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map(table => table.clear()));
  localStorage.clear();
});

const seedRoleMessages = async count => {
  const profile = await apiProfileService.create({ name: 'test', apiKey: 'key', model: 'test', apiFormat: 'openai' });
  const role = await roleService.create({ name: '角色', apiProfileId: profile.id, systemPrompt: '保持角色', chatSettings: { autoMemoryEnabled: true } });
  const conversation = await conversationService.getOrCreate(role.id);
  for (let index = 0; index < count; index += 1) {
    await messageService.create(conversation.id, index % 2 ? 'assistant' : 'user', `消息 ${index}`);
  }
  return { role, conversation };
};

describe('memory worker and orchestrator', () => {
  it('shares role context across wechat and sms while preserving channel metadata', async () => {
    const { role, conversation } = await seedRoleMessages(1);
    const sms = await conversationService.getOrCreateSms(role.id);
    await messageService.create(sms.id, 'user', '短信里的信息');
    const context = await messageService.getContextMessagesByRole(role.id);
    expect(context.find(item => item.conversationId === conversation.id).channel).toBe('wechat');
    expect(context.find(item => item.conversationId === sms.id).channel).toBe('sms');
  });

  it('keeps the estimated packet within the configured budget', async () => {
    const { role } = await seedRoleMessages(20);
    await roleService.update(role.id, {
      systemPrompt: '角色设定'.repeat(5000),
      chatSettings: { contextLength: 100, contextTokenBudget: 2000, coreMemory: '核心'.repeat(3000), longTermMemory: '长期'.repeat(5000) }
    });
    const current = await roleService.getById(role.id);
    const packet = await buildContextPacket({ ...current, apiFormat: 'openai' });
    expect(packet.estimatedInputTokens).toBeLessThanOrEqual(2000);
    expect(packet.truncated).toBe(true);
  });

  it('creates one deterministic 30-message job and protects the latest 12 messages', async () => {
    const { role } = await seedRoleMessages(50);
    const job = await ensureMemoryJob(role.id);
    expect(job.sourceMessageIds).toHaveLength(30);
    expect((await ensureMemoryJob(role.id))).toBeNull();
  });

  it('repairs malformed JSON once and activates a high-confidence memory', async () => {
    const { role } = await seedRoleMessages(20);
    const job = await ensureMemoryJob(role.id, { manual: true });
    const callModel = vi.fn()
      .mockResolvedValueOnce('不是 JSON')
      .mockResolvedValueOnce('{"memories":[{"type":"preference","content":"用户喜欢咖啡","keywords":["咖啡"],"importance":4,"confidence":0.9}]}');
    await runMemoryJob(job, { callModel });
    expect(callModel).toHaveBeenCalledTimes(2);
    expect((await contextJobService.get(job.id)).status).toBe('done');
    expect((await memoryService.listByRole(role.id, { status: 'active' }))[0].content).toBe('用户喜欢咖啡');
  });

  it('persists assistant bubbles only once through the shared orchestrator', async () => {
    const { role, conversation } = await seedRoleMessages(1);
    const result = await chatOrchestrator.reply({
      roleId: role.id,
      conversationId: conversation.id,
      channel: 'sms',
      callModel: vi.fn().mockResolvedValue('第一句\n第二句')
    });
    const stored = await messageService.getByConversation(conversation.id);
    expect(result.createdMessages).toHaveLength(2);
    expect(stored.filter(message => message.role === 'assistant')).toHaveLength(2);
  });
});
