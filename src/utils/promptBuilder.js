import { diaryService, personaService, stickerService, worldBookEntryService } from '../services/db';
import { buildMessageDirectivesPrompt, buildStickerLibraryPrompt } from '../config/messageDirectives';
import { buildTimeContextPrompt } from './timeContext';
import { buildWorldBookContext } from './worldBook';

const section = (title, content) => {
  const clean = String(content || '').trim();
  return clean ? `[${title}]\n${clean}` : '';
};

const clipText = (text, max = 1000) => {
  const clean = String(text || '').trim();
  if (max <= 0) return '';
  return clean.length > max ? `${clean.slice(0, max).trim()}...` : clean;
};

async function buildDiaryMemoryPrompt(role, options = {}) {
  const settings = role?.chatSettings || {};
  if (options.enabled === false || !role?.id || settings.diaryMemoryEnabled !== true) return '';

  const limit = Math.min(20, Math.max(1, Number(settings.diaryMemoryLimit) || 3));
  const includeUser = settings.includeUserDiaries !== false;
  const includeRole = settings.includeRoleDiaries !== false;
  const diaries = await diaryService.getVisibleContextForRole(role.id, limit * 2);
  const selected = diaries
    .filter(entry => (entry.authorType === 'role' && includeRole) || (entry.authorType === 'user' && includeUser))
    .slice(0, limit);

  if (selected.length === 0) return '';

  const blocks = selected.map(entry => {
    const type = entry.authorType === 'role' ? '角色日记' : '用户日记';
    return `### ${entry.dateKey}｜${type}｜${entry.title || '未命名日记'}\n${clipText(entry.summary || entry.content, 1100)}`;
  });

  return [
    '[最近日记]',
    '以下是用户允许你看到、并设置为可作为记忆使用的日记。它们不是当前对话消息，而是长期记忆材料。请自然参考，不要生硬复述。',
    '',
    blocks.join('\n\n'),
    '[/最近日记]'
  ].join('\n');
}

export async function buildEnhancedSystemPrompt(role, contextMessages = [], options = {}) {
  const settings = role?.chatSettings || {};
  const parts = [buildMessageDirectivesPrompt(options.directiveTypes)];

  if (settings.isRealTimeOn !== false) {
    parts.push(buildTimeContextPrompt(contextMessages));
  }

  parts.push(clipText(role?.systemPrompt, options.rolePromptMaxChars ?? 12000));

  const worldBook = options.worldBookResult || buildWorldBookContext(
    await worldBookEntryService.getAll(),
    contextMessages,
    options.worldBook
  );
  if (worldBook.text) {
    console.log('📚 世界书命中:', worldBook.entries.map(entry => entry.title).join(', '));
    parts.push(`[World Book / 世界书]\n${worldBook.text}\n[/World Book]`);
  }

  parts.push(section('核心设定', clipText(settings.coreMemory, options.coreMemoryMaxChars ?? 4000)));
  parts.push(section('长期记忆', clipText(settings.longTermMemory, options.longTermMemoryMaxChars ?? 8000)));

  if (Array.isArray(options.memoryEntries) && options.memoryEntries.length) {
    parts.push(section('相关记忆', options.memoryEntries.map(entry => `- ${entry.content}`).join('\n')));
  }

  const diaryMemory = await buildDiaryMemoryPrompt(role, { enabled: options.includeDiaries !== false });
  if (diaryMemory) parts.push(diaryMemory);

  if (settings.selectedPersonaId) {
    const persona = await personaService.getById(settings.selectedPersonaId);
    if (persona?.description) parts.push(section('用户信息', persona.description));

    const userStatus = localStorage.getItem('userStatus') || '';
    if (userStatus) parts.push(section('用户状态', userStatus));
  }

  if (settings.linkedLibraryId && (!options.directiveTypes || options.directiveTypes.includes('sticker'))) {
    const linkedStickers = await stickerService.getByLibrary(settings.linkedLibraryId);
    parts.push(buildStickerLibraryPrompt(linkedStickers));
  }

  return parts.filter(Boolean).join('\n\n');
}

export async function buildDiaryReviewSystemPrompt(role, contextMessages = [], diary = {}) {
  const diaryTriggerMessage = {
    role: 'user',
    content: `日记标题：${diary.title || ''}\n日记正文：${diary.content || ''}`
  };
  const worldBookMessages = [...contextMessages.slice(-6), diaryTriggerMessage];
  const worldBookEntries = await worldBookEntryService.getAll();
  const worldBook = buildWorldBookContext(worldBookEntries, worldBookMessages, {
    scanDepth: worldBookMessages.length
  });

  const parts = [
    String(role?.systemPrompt || '').trim(),
    worldBook.text ? `[World Book / 世界书]\n${worldBook.text}\n[/World Book]` : '',
    '你正在阅读用户允许你看到的一篇日记。请结合最近聊天语境和世界书设定，用你的角色口吻给出简短、温柔、自然的回应。不要写成分析报告，不要复述系统设定。'
  ];

  return parts.filter(Boolean).join('\n\n');
}

export async function buildHeartVoiceSystemPrompt(role, contextMessages = [], options = {}) {
  const settings = role?.chatSettings || {};
  const worldBookEntries = await worldBookEntryService.getAll();
  const worldBook = buildWorldBookContext(worldBookEntries, contextMessages, {
    scanDepth: Math.min(8, Math.max(1, contextMessages.length || 1)),
    maxEntries: 8,
    maxChars: 6000
  });

  const parts = [
    String(role?.systemPrompt || '').trim(),
    worldBook.text ? `[World Book / 世界书]\n${worldBook.text}\n[/World Book]` : '',
    section('核心设定', settings.coreMemory),
    section('长期记忆', settings.longTermMemory),
    Array.isArray(options.memoryEntries) && options.memoryEntries.length
      ? section('相关记忆', options.memoryEntries.map(entry => `- ${entry.content}`).join('\n'))
      : '',
    [
      '你正在以角色本人的内在视角生成“心声”。',
      '心声不是对用户说出口的话，而是此刻内心的状态切片。请参考最近聊天上下文、世界书和角色设定，保持角色一致。',
      '不要复述系统提示，不要解释生成过程，不要使用 Markdown。',
      '必须只输出一个合法 JSON 对象，不要包裹代码块。',
      '必须包含这些字段：currentStatus, currentThought, desiredAction, affection, emotion。',
      '可以根据需要输出这些字段：observation, innerConflict, secret。',
      '字段含义：currentStatus=当前状态；currentThought=当前想法；desiredAction=想做的事；affection=好感度，可用 0-100 或简短文字；emotion=情绪。',
      '每个字段用中文，内容自然、具体、短而有画面感。秘密只写角色此刻愿意在内心承认但未说出口的内容。'
    ].join('\n')
  ];

  return parts.filter(Boolean).join('\n\n');
}
