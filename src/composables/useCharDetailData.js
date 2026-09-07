import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  diaryService,
  memoryService,
  messageService,
  roleService,
  worldBookEntryService
} from '../services/db';
import {
  clip,
  defaultAvatar,
  defaultUserAvatar,
  HEART_VOICE_FIELDS,
  normalizeProfile,
  promptSnippet
} from './useCharProfile';

export function useCharDetailData(roleIdRef) {
  const roles = ref([]);
  const worldEntries = ref([]);
  const roleMessages = ref([]);
  const roleDiaries = ref([]);
  const structuredMemories = ref([]);
  const userAvatar = ref(defaultUserAvatar);
  const loading = ref(true);
  const currentMemoryAudioId = ref(null);

  let memoryAudio = null;

  const currentRoleId = computed(() => Number(roleIdRef.value));
  const selectedRole = computed(() => roles.value.find(role => role.id === currentRoleId.value) || null);
  const profile = computed(() => normalizeProfile(selectedRole.value?.profile));
  const visibleTags = computed(() => [
    ...profile.value.tags,
    ...profile.value.likes.map(item => `喜欢：${item}`),
    ...profile.value.dislikes.map(item => `讨厌：${item}`)
  ]);

  const archiveText = computed(() => {
    if (profile.value.summary) return profile.value.summary;
    const prompt = promptSnippet(selectedRole.value?.systemPrompt, 220);
    return prompt || '还没有手写摘要。可以先保留提示词原文，等你想整理时再补充。';
  });

  const coreMemory = computed(() => selectedRole.value?.chatSettings?.coreMemory || '');
  const longTermMemory = computed(() => selectedRole.value?.chatSettings?.longTermMemory || '');
  const savedHeartVoices = computed(() => profile.value.memoryItems.filter(item => item.type === 'heart_voice'));
  const favoriteMessages = computed(() => roleMessages.value
    .filter(msg => msg.isFavorite)
    .sort((a, b) => (b.favoriteAt || b.timestamp || 0) - (a.favoriteAt || a.timestamp || 0)));
  const memoryCount = computed(() =>
    savedHeartVoices.value.length +
    favoriteMessages.value.length +
    roleDiaries.value.length +
    structuredMemories.value.filter(item => item.status !== 'superseded' && item.source !== 'heart_voice').length +
    (coreMemory.value ? 1 : 0) +
    (longTermMemory.value ? 1 : 0)
  );

  const matchedWorldEntries = computed(() => {
    if (!selectedRole.value) return [];
    const terms = [selectedRole.value.name, ...profile.value.tags, ...profile.value.likes]
      .map(item => String(item || '').trim().toLowerCase())
      .filter(Boolean);
    if (!terms.length) return [];
    return worldEntries.value.filter(entry => {
      const haystack = [
        entry.title,
        entry.content,
        ...(entry.keywords || [])
      ].join('\n').toLowerCase();
      return terms.some(term => haystack.includes(term));
    });
  });

  const relationNodes = computed(() => {
    if (!selectedRole.value) return [];
    const custom = profile.value.relationships.map(rel => {
      const linked = rel.targetRoleId ? roles.value.find(role => role.id === Number(rel.targetRoleId)) : null;
      return {
        name: rel.name || linked?.name || '未命名',
        label: rel.label || '关系未设定',
        avatar: rel.avatar || linked?.avatar || defaultAvatar
      };
    });
    return custom.length ? custom : [
      { name: '你', label: '特别的人', avatar: userAvatar.value }
    ];
  });

  const loadUserAvatar = () => {
    const saved = localStorage.getItem('userProfile');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      userAvatar.value = data.avatar || defaultUserAvatar;
    } catch {
      userAvatar.value = defaultUserAvatar;
    }
  };

  const loadBaseData = async () => {
    const [allRoles, allWorldEntries] = await Promise.all([
      roleService.getAll(),
      worldBookEntryService.getAll()
    ]);
    roles.value = allRoles;
    worldEntries.value = allWorldEntries;
  };

  const loadDetailData = async () => {
    if (!currentRoleId.value) {
      roleMessages.value = [];
      roleDiaries.value = [];
      structuredMemories.value = [];
      return;
    }
    const [messages, diaries, memories] = await Promise.all([
      messageService.getByRoleTimeRange(currentRoleId.value, 0, Date.now() + 1000),
      diaryService.getForRole(currentRoleId.value),
      memoryService.listByRole(currentRoleId.value)
    ]);
    roleMessages.value = messages;
    roleDiaries.value = diaries;
    structuredMemories.value = memories;
  };

  const loadAll = async () => {
    loading.value = true;
    await loadBaseData();
    await loadDetailData();
    loading.value = false;
  };

  const saveProfile = async (patch) => {
    if (!selectedRole.value?.id) return;
    const nextProfile = normalizeProfile({ ...profile.value, ...patch });
    const updated = await roleService.update(selectedRole.value.id, { profile: nextProfile });
    const index = roles.value.findIndex(role => role.id === updated.id);
    if (index >= 0) roles.value.splice(index, 1, updated);
  };

  const stopMemoryAudio = () => {
    if (memoryAudio) {
      memoryAudio.pause();
      memoryAudio = null;
    }
    currentMemoryAudioId.value = null;
  };

  const toggleMemoryAudio = (message) => {
    if (!message?.audioUrl) return;
    if (currentMemoryAudioId.value === message.id && memoryAudio) {
      stopMemoryAudio();
      return;
    }
    stopMemoryAudio();
    memoryAudio = new Audio(message.audioUrl);
    currentMemoryAudioId.value = message.id;
    memoryAudio.onended = stopMemoryAudio;
    memoryAudio.play();
  };

  const messageMemoryText = (message) => {
    if (!message) return '';
    if (message.type === 'image') return '[图片]';
    if (message.type === 'sticker') return '[表情]';
    if (message.audioUrl) return message.content || '语音消息';
    return clip(message.content, 160);
  };

  const heartVoiceFieldsFor = (item) => HEART_VOICE_FIELDS
    .map(field => ({
      ...field,
      value: String(item?.data?.[field.key] || '').trim()
    }))
    .filter(field => field.value);

  onMounted(async () => {
    loadUserAvatar();
    await loadAll();
  });

  watch(currentRoleId, async () => {
    stopMemoryAudio();
    await loadAll();
  });

  onUnmounted(() => {
    stopMemoryAudio();
  });

  return {
    archiveText,
    coreMemory,
    currentMemoryAudioId,
    favoriteMessages,
    heartVoiceFieldsFor,
    loading,
    longTermMemory,
    matchedWorldEntries,
    memoryCount,
    messageMemoryText,
    profile,
    relationNodes,
    roleDiaries,
    savedHeartVoices,
    saveProfile,
    selectedRole,
    toggleMemoryAudio,
    visibleTags
  };
}
