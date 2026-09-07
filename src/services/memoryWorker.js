import { apiProfileService, contextJobService, memoryService, messageService, roleService } from './db';
import { callClaude } from './claude';

const ALLOWED_TYPES = new Set(['user_fact', 'preference', 'relationship_event', 'commitment', 'unresolved_topic', 'character_state']);
const PROTECTED_TAIL = 12;
const AUTO_THRESHOLD = 30;
const MANUAL_MINIMUM = 5;

export async function resolveRoleApi(roleId) {
  const role = await roleService.getById(Number(roleId));
  if (!role) throw new Error('角色不存在');
  let profile = null;
  if (role.apiProfileId) profile = await apiProfileService.getById(role.apiProfileId);
  if (!profile) profile = (await apiProfileService.getAll())[0] || null;
  return profile ? { ...role, ...profile, id: role.id, chatSettings: role.chatSettings } : role;
}

const makeJobId = (roleId, ids) => `memory:${roleId}:${ids[0]}-${ids[ids.length - 1]}`;

export async function ensureMemoryJob(roleId, { manual = false } = {}) {
  const role = await roleService.getById(Number(roleId));
  if (!role) throw new Error('角色不存在');
  if (!manual && role.chatSettings?.autoMemoryEnabled !== true) return null;

  const all = await messageService.getContextMessagesByRole(roleId);
  const protectedIds = new Set(all.slice(-PROTECTED_TAIL).map(message => message.id));
  const jobs = await contextJobService.listByRole(roleId);
  const processed = new Set(jobs.filter(job => ['pending', 'running', 'done', 'failed'].includes(job.status)).flatMap(job => job.sourceMessageIds || []));
  const candidates = all.filter(message => !protectedIds.has(message.id) && !processed.has(message.id));
  const minimum = manual ? MANUAL_MINIMUM : AUTO_THRESHOLD;
  if (candidates.length < minimum) return null;

  const source = candidates.slice(0, manual ? Math.max(MANUAL_MINIMUM, Math.min(AUTO_THRESHOLD, candidates.length)) : AUTO_THRESHOLD);
  const id = makeJobId(roleId, source.map(message => message.id));
  const existing = await contextJobService.get(id);
  if (existing) return existing;
  return await contextJobService.put({
    id,
    type: 'memory_compaction',
    roleId: Number(roleId),
    sourceMessageIds: source.map(message => message.id),
    status: 'pending'
  });
}

const parseJsonObject = text => {
  const clean = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('MEMORY_JSON_INVALID');
  return JSON.parse(clean.slice(start, end + 1));
};

const memoryPrompt = `你是记忆整理器。根据聊天记录提取少量、长期有用且可追溯的事实，不要编造，也不要把普通寒暄存成记忆。
只输出合法 JSON：{"memories":[{"type":"user_fact|preference|relationship_event|commitment|unresolved_topic|character_state","content":"简洁事实","keywords":["关键词"],"importance":1-5,"confidence":0-1}]}
如果没有值得保存的内容，输出 {"memories":[]}。`;

const repairPrompt = `把上一段内容修复为合法 JSON。只允许返回 {"memories":[]} 结构，不要解释。`;

const normalizeCandidates = payload => (Array.isArray(payload?.memories) ? payload.memories : [])
  .filter(item => item && ALLOWED_TYPES.has(item.type) && String(item.content || '').trim())
  .slice(0, 12)
  .map(item => ({
    type: item.type,
    content: String(item.content).trim().slice(0, 500),
    keywords: Array.isArray(item.keywords) ? item.keywords.slice(0, 20) : [],
    importance: Math.min(5, Math.max(1, Number(item.importance) || 3)),
    confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.5))
  }));

const hasConflict = (candidate, active) => {
  const candidateWords = new Set([...(candidate.keywords || []), ...candidate.content.split(/[\s，。；、]+/)].map(String).filter(word => word.length >= 2));
  return active.find(row => {
    if (row.type !== candidate.type) return false;
    const words = [...(row.keywords || []), ...String(row.content).split(/[\s，。；、]+/)].map(String).filter(word => word.length >= 2);
    const overlap = words.filter(word => candidateWords.has(word)).length;
    return overlap >= 2 && row.content !== candidate.content;
  }) || null;
};

export async function runMemoryJob(jobOrId, { callModel = callClaude } = {}) {
  const job = typeof jobOrId === 'string' ? await contextJobService.get(jobOrId) : jobOrId;
  if (!job || ['done', 'cancelled'].includes(job.status)) return job;
  await contextJobService.update(job.id, { status: 'running', errorCode: null });
  try {
    const role = await resolveRoleApi(job.roleId);
    if (!role.apiKey) throw new Error('MEMORY_API_MISSING');
    const all = await messageService.getContextMessagesByRole(job.roleId);
    const wanted = new Set(job.sourceMessageIds || []);
    const messages = all.filter(message => wanted.has(message.id));
    if (!messages.length) throw new Error('MEMORY_SOURCE_MISSING');
    const transcript = messages.map(message => `${message.role === 'user' ? '用户' : '角色'}：${message.content}`).join('\n');
    let response = await callModel({ ...role, systemPrompt: memoryPrompt, skipSystemPromptMerge: true }, [{ role: 'user', content: transcript }]);
    let payload;
    try {
      payload = parseJsonObject(response);
    } catch {
      response = await callModel({ ...role, systemPrompt: repairPrompt, skipSystemPromptMerge: true }, [{ role: 'user', content: response }]);
      payload = parseJsonObject(response);
    }

    const active = await memoryService.listByRole(job.roleId, { status: 'active' });
    const created = [];
    for (const candidate of normalizeCandidates(payload)) {
      const exact = active.find(row => row.type === candidate.type && row.content === candidate.content);
      if (exact) continue;
      const conflict = hasConflict(candidate, active);
      const memory = await memoryService.create({
        ...candidate,
        scopeType: 'role',
        scopeId: String(job.roleId),
        ownerRoleId: job.roleId,
        sourceMessageIds: job.sourceMessageIds,
        status: candidate.confidence >= 0.75 && !conflict ? 'active' : 'pending',
        conflictWithId: conflict?.id || null,
        source: 'auto'
      });
      created.push(memory);
      if (memory.status === 'active') active.push(memory);
    }
    return await contextJobService.update(job.id, { status: 'done', resultMemoryIds: created.map(row => row.id), completedAt: Date.now() });
  } catch (error) {
    const attempts = (job.attempts || 0) + 1;
    await contextJobService.update(job.id, {
      status: 'failed',
      attempts,
      nextRetryAt: Date.now() + Math.min(60 * 60 * 1000, 30000 * (2 ** Math.max(0, attempts - 1))),
      errorCode: String(error?.message || 'MEMORY_JOB_FAILED').slice(0, 120)
    });
    throw error;
  }
}

export async function runPendingMemoryJobs({ roleId, callModel } = {}) {
  const jobs = await contextJobService.listRunnable();
  const selected = roleId ? jobs.filter(job => job.roleId === Number(roleId)) : jobs;
  for (const job of selected) {
    try { await runMemoryJob(job, { callModel }); } catch (error) { console.warn('记忆整理失败:', error.message); }
  }
}

export function scheduleMemoryMaintenance(roleId) {
  const work = async () => {
    try {
      const job = await ensureMemoryJob(roleId);
      if (job) await runMemoryJob(job);
      await runPendingMemoryJobs({ roleId });
    } catch (error) {
      console.warn('记忆维护未完成:', error.message);
    }
  };
  if ('requestIdleCallback' in globalThis) globalThis.requestIdleCallback(work, { timeout: 5000 });
  else setTimeout(work, 500);
}
