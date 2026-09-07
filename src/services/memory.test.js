import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import db, { contextJobService, memoryService, migrateHeartVoicesToMemories, roleService } from './db';

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map(table => table.clear()));
});

describe('structured memories', () => {
  it('backfills saved heart voices without deleting the legacy profile item', async () => {
    const role = await roleService.create({ name: '角色', profile: { memoryItems: [{ id: 'h1', type: 'heart_voice', content: '有点想念用户', createdAt: 10 }] } });
    await db.transaction('rw', db.roles, db.memories, tx => migrateHeartVoicesToMemories(tx));
    expect((await memoryService.get(`heart:${role.id}:h1`)).type).toBe('character_state');
    expect((await roleService.getById(role.id)).profile.memoryItems).toHaveLength(1);
  });

  it('retrieves only active memories and caps results at five', async () => {
    for (let index = 0; index < 7; index += 1) {
      await memoryService.create({
        id: `m${index}`, ownerRoleId: 1, scopeType: 'role', scopeId: '1',
        type: 'preference', content: `用户喜欢咖啡 ${index}`, keywords: ['咖啡'],
        importance: index % 5 + 1, confidence: 0.9, status: index === 6 ? 'pending' : 'active'
      });
    }
    const rows = await memoryService.retrieveForRole(1, '想喝咖啡', 5);
    expect(rows).toHaveLength(5);
    expect(rows.every(row => row.status === 'active')).toBe(true);
  });

  it('accepts a conflict and supersedes the old memory only on replace', async () => {
    await memoryService.create({ id: 'old', ownerRoleId: 1, scopeId: '1', type: 'user_fact', content: '住在上海', status: 'active' });
    await memoryService.create({ id: 'new', ownerRoleId: 1, scopeId: '1', type: 'user_fact', content: '搬到杭州', status: 'pending', conflictWithId: 'old' });
    await memoryService.accept('new', { replace: true });
    expect((await memoryService.get('old')).status).toBe('superseded');
    expect((await memoryService.get('new')).status).toBe('active');
  });

  it('returns runnable jobs only below the retry limit', async () => {
    await contextJobService.put({ id: 'retry', type: 'memory_compaction', roleId: 1, sourceMessageIds: [1], status: 'failed', attempts: 2, nextRetryAt: 0 });
    await contextJobService.put({ id: 'stopped', type: 'memory_compaction', roleId: 1, sourceMessageIds: [2], status: 'failed', attempts: 3, nextRetryAt: 0 });
    expect((await contextJobService.listRunnable()).map(job => job.id)).toEqual(['retry']);
  });
});
