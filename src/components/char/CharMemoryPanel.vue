<template>
  <div class="memory-panel">
    <article class="memory-draw-strip">
      <div>
        <span>Memory Draw</span>
        <strong>抽一张记忆</strong>
      </div>
      <button disabled>即将开放</button>
    </article>

    <nav class="memory-tabs" aria-label="记忆分类">
      <button
        v-for="tab in memoryTabs"
        :key="tab.id"
        :class="{ active: activeType === tab.id }"
        @click="setActiveType(tab.id)"
      >
        <span>{{ tab.label }}</span>
        <em>{{ tab.count }}</em>
      </button>
    </nav>

    <section class="notebook-stack">
      <div class="stack-head">
        <div>
          <span>{{ activeTabLabel }}</span>
          <h2>{{ currentNote?.title || '暂无记忆' }}</h2>
        </div>
        <small>{{ activeNotes.length ? `${currentIndex + 1} / ${activeNotes.length}` : '0 / 0' }}</small>
      </div>

      <div
        class="note-stack-wrap"
        :class="{ empty: !currentNote }"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
        @touchcancel.passive="resetTouch"
      >
        <span class="stack-sheet back-one"></span>
        <span class="stack-sheet back-two"></span>

        <Transition :name="noteTransitionName" mode="out-in">
          <article v-if="currentNote" :key="currentNote.id" class="note-card" :class="currentNote.kind">
            <span class="tape"></span>
            <div class="note-head">
              <strong>{{ currentNote.title }}</strong>
              <time>{{ currentNote.dateLabel }}</time>
            </div>

            <button
              v-if="currentNote.audioMessage"
              class="memory-audio-btn"
              :class="{ playing: currentMemoryAudioId === currentNote.audioMessage.id }"
              @click="$emit('toggle-audio', currentNote.audioMessage)"
            >
              <i :class="currentMemoryAudioId === currentNote.audioMessage.id ? 'ph-fill ph-pause-circle' : 'ph-fill ph-play-circle'"></i>
              <span>{{ currentMemoryAudioId === currentNote.audioMessage.id ? '正在播放' : '播放语音' }}</span>
            </button>

            <p class="note-content" :class="{ collapsed: isCollapsed(currentNote) }">{{ currentNote.content }}</p>
            <button v-if="isLongNote(currentNote)" class="expand-btn" @click="toggleExpanded(currentNote.id)">
              {{ expandedNotes.has(currentNote.id) ? '收起' : '展开' }}
            </button>

            <div v-if="currentNote.fields?.length" class="heart-fields">
              <p v-for="field in currentNote.fields" :key="`${currentNote.id}-${field.key}`">
                <span>{{ field.label }}</span>{{ field.value }}
              </p>
            </div>

            <small v-if="currentNote.hint" class="future-hint">{{ currentNote.hint }}</small>
            <div v-if="currentNote.memory" class="structured-actions">
              <button v-if="currentNote.memory.status === 'pending'" @click="acceptMemory(currentNote.memory, false)">接受</button>
              <button v-if="currentNote.memory.status === 'pending'" @click="editMemory(currentNote.memory)">编辑</button>
              <button v-if="currentNote.memory.status === 'pending' && currentNote.memory.conflictWithId" @click="acceptMemory(currentNote.memory, true)">替换旧记忆</button>
              <button v-if="currentNote.memory.status !== 'archived'" @click="archiveMemory(currentNote.memory)">归档</button>
            </div>
          </article>

          <article v-else key="empty-note" class="note-card empty-note">
            <span class="tape"></span>
            <div class="note-head">
              <strong>{{ activeTabLabel }}</strong>
              <time>空</time>
            </div>
            <p>这里还没有纸条。以后保存或写入的记忆会收进这一叠。</p>
          </article>
        </Transition>
      </div>

      <div class="stack-controls">
        <button :disabled="activeNotes.length <= 1" @click="prevNote"><i class="ph ph-caret-left"></i></button>
        <span>左右滑动翻纸条</span>
        <button :disabled="activeNotes.length <= 1" @click="nextNote"><i class="ph ph-caret-right"></i></button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { clip, formatDate } from '../../composables/useCharProfile';
import { memoryService } from '../../services/db';

const props = defineProps({
  coreMemory: { type: String, default: '' },
  currentMemoryAudioId: { type: [Number, String, null], default: null },
  favoriteMessages: { type: Array, default: () => [] },
  heartVoiceFieldsFor: { type: Function, required: true },
  longTermMemory: { type: String, default: '' },
  messageMemoryText: { type: Function, required: true },
  role: { type: Object, required: true },
  roleDiaries: { type: Array, default: () => [] },
  savedHeartVoices: { type: Array, default: () => [] }
});

defineEmits(['toggle-audio']);

const activeType = ref('all');
const activeIndexByType = ref({});
const expandedNotes = ref(new Set());
const touchStartX = ref(0);
const touchStartY = ref(0);
const touchDeltaX = ref(0);
const touchDeltaY = ref(0);
const touchAxis = ref(null);
const noteTransitionName = ref('note-next');
const structuredMemories = ref([]);

const loadStructuredMemories = async () => {
  structuredMemories.value = props.role?.id ? await memoryService.listByRole(props.role.id) : [];
};
onMounted(loadStructuredMemories);
watch(() => props.role?.id, loadStructuredMemories);

const createNote = (patch) => ({
  audioMessage: null,
  content: '',
  dateLabel: '',
  fields: [],
  hint: '',
  kind: 'plain-note',
  timestamp: 0,
  ...patch
});

const memoryGroups = computed(() => {
  const heart = props.savedHeartVoices.map(item => createNote({
    id: item.id,
    kind: 'heart-note',
    title: item.title || '心声',
    dateLabel: formatDate(item.createdAt),
    content: item.content || '保存了一段心声。',
    fields: props.heartVoiceFieldsFor(item),
    timestamp: Number(item.createdAt) || 0
  }));

  const longTerm = props.longTermMemory
    ? [createNote({
        id: 'long-term-memory',
        kind: 'long-note',
        title: '长期记忆总览',
        dateLabel: '长期',
        content: props.longTermMemory,
        hint: '以后这里会拆成一条条记忆，可带总结、关键词和来源。',
        timestamp: 1
      })]
    : [];

  const core = props.coreMemory
    ? [createNote({
        id: 'core-memory',
        kind: 'core-note',
        title: '核心记忆',
        dateLabel: '核心',
        content: props.coreMemory,
        timestamp: 2
      })]
    : [];

  const diary = props.roleDiaries.map(item => createNote({
    id: `diary-${item.id}`,
    kind: 'diary-note',
    title: item.title || '角色日记',
    dateLabel: item.dateKey || formatDate(item.createdAt),
    content: clip(item.summary || item.content, 320),
    timestamp: Number(item.createdAt) || 0
  }));

  const favorite = props.favoriteMessages.map(msg => createNote({
    id: `favorite-${msg.id}`,
    kind: 'favorite-note',
    title: msg.role === 'user' ? '你' : props.role.name,
    dateLabel: formatDate(msg.favoriteAt || msg.timestamp),
    content: props.messageMemoryText(msg),
    audioMessage: msg.audioUrl ? msg : null,
    timestamp: Number(msg.favoriteAt || msg.timestamp) || 0
  }));

  const toStructuredNote = item => createNote({
    id: `structured-${item.id}`,
    kind: 'long-note',
    title: { active: '自动记忆', pending: '待确认记忆', archived: '已归档记忆', superseded: '已替换记忆' }[item.status] || '结构化记忆',
    dateLabel: formatDate(item.updatedAt),
    content: item.content,
    hint: `重要度 ${item.importance} · 置信度 ${Math.round((item.confidence || 0) * 100)}%`,
    timestamp: Number(item.updatedAt) || 0,
    memory: item
  });
  const automatic = structuredMemories.value.filter(item => item.status === 'active' && item.source !== 'heart_voice').map(toStructuredNote);
  const pending = structuredMemories.value.filter(item => item.status === 'pending').map(toStructuredNote);
  const archived = structuredMemories.value.filter(item => ['archived', 'superseded'].includes(item.status)).map(toStructuredNote);

  const all = [...heart, ...automatic, ...pending, ...longTerm, ...core, ...diary, ...favorite]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return { all, heart, automatic, pending, archived, longTerm, core, diary, favorite };
});

const memoryTabs = computed(() => [
  { id: 'all', label: '全部', count: memoryGroups.value.all.length },
  { id: 'heart', label: '心声', count: memoryGroups.value.heart.length },
  { id: 'automatic', label: '自动记忆', count: memoryGroups.value.automatic.length },
  { id: 'pending', label: '待确认', count: memoryGroups.value.pending.length },
  { id: 'archived', label: '已归档', count: memoryGroups.value.archived.length },
  { id: 'longTerm', label: '长期', count: memoryGroups.value.longTerm.length },
  { id: 'core', label: '核心', count: memoryGroups.value.core.length },
  { id: 'diary', label: '日记', count: memoryGroups.value.diary.length },
  { id: 'favorite', label: '收藏', count: memoryGroups.value.favorite.length }
]);

const activeNotes = computed(() => memoryGroups.value[activeType.value] || []);
const activeTabLabel = computed(() => memoryTabs.value.find(tab => tab.id === activeType.value)?.label || '记忆');
const currentIndex = computed(() => {
  const length = activeNotes.value.length;
  if (!length) return 0;
  const raw = activeIndexByType.value[activeType.value] || 0;
  return Math.min(Math.max(raw, 0), length - 1);
});
const currentNote = computed(() => activeNotes.value[currentIndex.value] || null);

const setActiveType = (type) => {
  activeType.value = type;
};

const acceptMemory = async (memory, replace) => { await memoryService.accept(memory.id, { replace }); await loadStructuredMemories(); };
const editMemory = async memory => {
  const content = prompt('编辑记忆内容', memory.content);
  if (content === null || !content.trim()) return;
  await memoryService.accept(memory.id, { content });
  await loadStructuredMemories();
};
const archiveMemory = async memory => { await memoryService.archive(memory.id); await loadStructuredMemories(); };

const setCurrentIndex = (index) => {
  const length = activeNotes.value.length;
  if (!length) return;
  activeIndexByType.value = {
    ...activeIndexByType.value,
    [activeType.value]: (index + length) % length
  };
};

const navigateNote = (direction) => {
  if (activeNotes.value.length <= 1) return;
  noteTransitionName.value = direction > 0 ? 'note-next' : 'note-prev';
  setCurrentIndex(currentIndex.value + direction);
};

const prevNote = () => navigateNote(-1);
const nextNote = () => navigateNote(1);

const isLongNote = (note) => String(note?.content || '').length > 130;
const isCollapsed = (note) => isLongNote(note) && !expandedNotes.value.has(note.id);

const toggleExpanded = (id) => {
  const next = new Set(expandedNotes.value);
  next.has(id) ? next.delete(id) : next.add(id);
  expandedNotes.value = next;
};

const onTouchStart = (event) => {
  const touch = event.changedTouches?.[0];
  touchStartX.value = touch?.clientX || 0;
  touchStartY.value = touch?.clientY || 0;
  touchDeltaX.value = 0;
  touchDeltaY.value = 0;
  touchAxis.value = null;
};

const onTouchMove = (event) => {
  const touch = event.changedTouches?.[0];
  if (!touch) return;

  touchDeltaX.value = touch.clientX - touchStartX.value;
  touchDeltaY.value = touch.clientY - touchStartY.value;

  if (!touchAxis.value && Math.hypot(touchDeltaX.value, touchDeltaY.value) >= 10) {
    touchAxis.value = Math.abs(touchDeltaX.value) > Math.abs(touchDeltaY.value) * 1.25
      ? 'horizontal'
      : 'vertical';
  }
};

const resetTouch = () => {
  touchDeltaX.value = 0;
  touchDeltaY.value = 0;
  touchAxis.value = null;
};

const onTouchEnd = (event) => {
  const touch = event.changedTouches?.[0];
  if (touch) {
    touchDeltaX.value = touch.clientX - touchStartX.value;
    touchDeltaY.value = touch.clientY - touchStartY.value;
  }

  if (!touchAxis.value && Math.hypot(touchDeltaX.value, touchDeltaY.value) >= 10) {
    touchAxis.value = Math.abs(touchDeltaX.value) > Math.abs(touchDeltaY.value) * 1.25
      ? 'horizontal'
      : 'vertical';
  }

  const isHorizontalSwipe = touchAxis.value === 'horizontal'
    && Math.abs(touchDeltaX.value) >= 56
    && Math.abs(touchDeltaX.value) > Math.abs(touchDeltaY.value) * 1.25;

  if (isHorizontalSwipe) {
    touchDeltaX.value > 0 ? prevNote() : nextNote();
  }
  resetTouch();
};
</script>

<style scoped>
.structured-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
.structured-actions button { border:0; border-radius:999px; padding:7px 11px; background:rgba(0,0,0,.08); color:inherit; }
.memory-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.memory-draw-strip {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  overflow: hidden;
  border: 1px solid var(--char-border-soft);
  border-radius: 18px;
  padding: 13px 14px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.38), transparent 54%),
    var(--char-accent-soft);
  box-shadow: 0 10px 22px var(--char-shadow);
}

.memory-draw-strip::before {
  content: '';
  position: absolute;
  left: 24px;
  top: -8px;
  width: 72px;
  height: 18px;
  border-radius: 4px;
  background: rgba(255, 244, 190, 0.62);
  transform: rotate(-5deg);
}

.memory-draw-strip span,
.stack-head span {
  display: block;
  color: var(--char-accent-text);
  font-size: 11px;
  font-weight: 900;
}

.memory-draw-strip strong {
  display: block;
  margin-top: 3px;
  color: var(--char-text-strong);
  font-size: 18px;
}

.memory-draw-strip button {
  flex-shrink: 0;
  border: 0;
  border-radius: 999px;
  padding: 8px 11px;
  color: var(--char-text-muted);
  background: var(--char-surface);
  font-size: 12px;
  font-weight: 900;
}

.memory-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.memory-tabs::-webkit-scrollbar {
  display: none;
}

.memory-tabs button {
  flex: 0 0 auto;
  min-width: 62px;
  border: 1px solid var(--char-border-soft);
  border-radius: 999px;
  padding: 8px 10px;
  color: var(--char-text-soft);
  background: var(--char-surface-soft);
  font-weight: 800;
}

.memory-tabs button.active {
  color: var(--char-text-strong);
  background: var(--char-surface);
  box-shadow: 0 8px 18px var(--char-shadow);
}

.memory-tabs span,
.memory-tabs em {
  display: inline-block;
}

.memory-tabs em {
  margin-left: 5px;
  color: var(--char-accent-text);
  font-size: 11px;
  font-style: normal;
}

.notebook-stack {
  border: 1px solid var(--char-border-soft);
  border-radius: 22px;
  padding: 16px 14px 14px;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 14px 28px var(--char-shadow);
}

.stack-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.stack-head h2 {
  margin: 4px 0 0;
  color: var(--char-text-strong);
  font-size: 22px;
  line-height: 1.2;
}

.stack-head small {
  border-radius: 999px;
  padding: 5px 9px;
  color: var(--char-accent-text);
  background: var(--char-accent-soft);
  font-weight: 900;
}

.note-stack-wrap {
  position: relative;
  min-height: 284px;
  touch-action: pan-y;
}

.stack-sheet {
  position: absolute;
  left: 10px;
  right: 10px;
  top: 10px;
  min-height: 240px;
  border: 1px solid rgba(126, 98, 69, 0.1);
  border-radius: 12px;
  background: var(--char-note-bg);
  box-shadow: 0 8px 18px rgba(58, 43, 32, 0.08);
}

.back-one {
  transform: rotate(-1.3deg) translateY(6px);
  opacity: 0.62;
}

.back-two {
  transform: rotate(1.1deg) translateY(13px);
  opacity: 0.42;
}

.note-card {
  position: relative;
  z-index: 2;
  min-height: 240px;
  border: 1px solid rgba(126, 98, 69, 0.12);
  border-radius: 12px;
  padding: 20px 16px 16px;
  color: var(--char-note-text);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0.14)),
    var(--char-note-bg);
  box-shadow:
    0 12px 24px rgba(58, 43, 32, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.36);
}

.note-next-enter-active,
.note-next-leave-active,
.note-prev-enter-active,
.note-prev-leave-active {
  transition:
    transform 180ms cubic-bezier(0.22, 0.8, 0.3, 1),
    opacity 180ms ease;
}

.note-next-enter-from,
.note-prev-leave-to {
  opacity: 0;
  transform: translateX(42px) rotate(1.5deg);
}

.note-next-leave-to,
.note-prev-enter-from {
  opacity: 0;
  transform: translateX(-42px) rotate(-1.5deg);
}

.tape {
  position: absolute;
  left: 50%;
  top: -9px;
  width: 68px;
  height: 20px;
  border-radius: 4px;
  background: rgba(255, 232, 153, 0.68);
  box-shadow: 0 2px 4px rgba(58, 43, 32, 0.08);
  transform: translateX(-50%) rotate(-3deg);
}

.heart-note .tape,
.favorite-note .tape {
  background: rgba(213, 226, 255, 0.7);
}

.diary-note .tape {
  background: rgba(255, 204, 213, 0.68);
}

.note-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.note-head strong {
  min-width: 0;
  color: inherit;
  font-size: 17px;
  line-height: 1.35;
}

.note-head time,
.future-hint {
  color: var(--char-note-muted);
  font-size: 12px;
}

.note-content {
  margin: 0;
  color: inherit;
  font-size: 14px;
  line-height: 1.72;
  white-space: pre-wrap;
}

.note-content.collapsed {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
}

.expand-btn {
  border: 0;
  border-radius: 999px;
  padding: 6px 10px;
  margin-top: 10px;
  color: var(--char-accent-text);
  background: var(--char-accent-soft);
  font-weight: 900;
}

.heart-fields {
  display: grid;
  gap: 7px;
  margin-top: 12px;
}

.heart-fields p {
  margin: 0;
  color: inherit;
  font-size: 14px;
  line-height: 1.6;
}

.heart-fields span {
  display: inline-block;
  margin-right: 8px;
  color: var(--char-accent-text);
  font-size: 12px;
  font-weight: 900;
}

.future-hint {
  display: block;
  margin-top: 12px;
}

.memory-audio-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  margin-bottom: 10px;
  color: var(--char-accent-text);
  background: var(--char-accent-soft);
  font-weight: 900;
}

.memory-audio-btn i {
  font-size: 18px;
}

.memory-audio-btn.playing {
  color: var(--char-bg-end);
  background: var(--char-accent);
}

.empty-note {
  min-height: 190px;
}

.stack-controls {
  display: grid;
  grid-template-columns: 42px 1fr 42px;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  color: var(--char-text-muted);
  font-size: 12px;
  text-align: center;
}

.stack-controls button {
  width: 42px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  color: var(--char-accent-text);
  background: var(--char-accent-soft);
  font-size: 18px;
}

.stack-controls button:disabled {
  color: var(--char-text-muted);
  background: var(--char-surface-soft);
}

@media (prefers-reduced-motion: reduce) {
  .note-next-enter-active,
  .note-next-leave-active,
  .note-prev-enter-active,
  .note-prev-leave-active {
    transition-duration: 1ms;
  }
}
</style>
