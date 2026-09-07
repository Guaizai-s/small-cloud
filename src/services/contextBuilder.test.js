import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { estimateTokens, groupMessagesIntoTurns, selectCompleteTurns } from './contextBuilder';

const msg = (id, role, content) => ({ id, role, content, type: 'text', timestamp: id });

describe('contextBuilder', () => {
  it('groups consecutive assistant bubbles into the user turn', () => {
    const turns = groupMessagesIntoTurns([
      msg(1, 'user', '在吗'), msg(2, 'assistant', '在'), msg(3, 'assistant', '怎么啦'),
      msg(4, 'user', '晚饭吃什么'), msg(5, 'assistant', '面条')
    ]);
    expect(turns).toHaveLength(2);
    expect(turns[0].map(item => item.id)).toEqual([1, 2, 3]);
  });

  it('never begins in the middle of an assistant response', () => {
    const messages = [
      msg(1, 'user', '一'), msg(2, 'assistant', '一答1'), msg(3, 'assistant', '一答2'),
      msg(4, 'user', '二'), msg(5, 'assistant', '二答')
    ];
    const selected = selectCompleteTurns(messages, 1, 1000);
    expect(selected.messages.map(item => item.id)).toEqual([4, 5]);
  });

  it('keeps the newest complete turn even when it exceeds budget', () => {
    const selected = selectCompleteTurns([
      msg(1, 'user', '旧消息'), msg(2, 'assistant', '旧回复'),
      msg(3, 'user', '新'.repeat(200)), msg(4, 'assistant', '回复')
    ], 10, 10);
    expect(selected.messages.map(item => item.id)).toEqual([3, 4]);
    expect(selected.truncated).toBe(true);
  });

  it('uses a conservative estimate for Chinese text', () => {
    expect(estimateTokens('你好世界')).toBeGreaterThanOrEqual(4);
    expect(estimateTokens('a'.repeat(40))).toBeGreaterThanOrEqual(10);
  });
});
