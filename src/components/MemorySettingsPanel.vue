<template>
  <section class="memory-settings">
    <div class="memory-control">
      <span><strong>自动整理记忆</strong><small>累计 30 条，保留最新 12 条原文</small></span>
      <input :checked="settings.autoMemoryEnabled === true" type="checkbox" class="memory-switch" @change="patchSettings({ autoMemoryEnabled: $event.target.checked })" />
    </div>

    <label class="memory-budget">
      <span><strong>上下文预算</strong><small>{{ budget }} tokens（估算）</small></span>
      <input :value="budget" type="range" min="2000" max="32000" step="1000" @input="patchSettings({ contextTokenBudget: Number($event.target.value) })" />
    </label>

    <div class="memory-actions">
      <button :disabled="busy" @click="organizeNow">{{ busy ? '正在整理…' : '立即整理记忆' }}</button>
      <button v-if="failedJobs.length" :disabled="busy" @click="retryFailed">重试失败任务（{{ failedJobs.length }}）</button>
    </div>
    <p v-if="message" class="memory-message">{{ message }}</p>

    <div class="memory-tabs">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
        {{ tab.label }} <span>{{ tab.count }}</span>
      </button>
    </div>

    <div v-if="visibleMemories.length" class="memory-list">
      <article v-for="memory in visibleMemories" :key="memory.id" class="memory-card">
        <div class="memory-meta"><span>{{ typeLabel(memory.type) }}</span><span>重要度 {{ memory.importance }} · 置信度 {{ Math.round(memory.confidence * 100) }}%</span></div>
        <p>{{ memory.content }}</p>
        <div class="memory-card-actions">
          <button v-if="memory.status === 'pending'" @click="accept(memory, false)">接受</button>
          <button v-if="memory.status === 'pending'" @click="editAndAccept(memory)">编辑后接受</button>
          <button v-if="memory.status === 'pending' && memory.conflictWithId" @click="accept(memory, true)">替换旧记忆</button>
          <button v-if="memory.sourceMessageIds?.length" @click="openSource(memory)">查看来源</button>
          <button v-if="memory.status !== 'archived'" class="danger" @click="archive(memory)">归档</button>
        </div>
      </article>
    </div>
    <p v-else class="memory-empty">这里暂时没有记忆。</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { contextJobService, conversationService, memoryService, messageService } from '../services/db';
import { ensureMemoryJob, runMemoryJob } from '../services/memoryWorker';

const props = defineProps({
  roleId: { type: Number, required: true },
  settings: { type: Object, required: true }
});
const emit = defineEmits(['update:settings']);
const router = useRouter();
const memories = ref([]);
const jobs = ref([]);
const busy = ref(false);
const message = ref('');
const activeTab = ref('active');
const budget = computed(() => Number(props.settings.contextTokenBudget) || 8000);
const failedJobs = computed(() => jobs.value.filter(job => job.status === 'failed' && (job.attempts || 0) < 3));
const tabs = computed(() => [
  { id: 'active', label: '自动记忆', count: memories.value.filter(item => item.status === 'active').length },
  { id: 'pending', label: '待确认', count: memories.value.filter(item => item.status === 'pending').length },
  { id: 'archived', label: '已归档', count: memories.value.filter(item => ['archived', 'superseded'].includes(item.status)).length }
]);
const visibleMemories = computed(() => memories.value.filter(item => activeTab.value === 'archived'
  ? ['archived', 'superseded'].includes(item.status)
  : item.status === activeTab.value));

const typeLabels = { user_fact: '用户事实', preference: '偏好', relationship_event: '关系事件', commitment: '承诺', unresolved_topic: '未完成话题', character_state: '角色状态' };
const typeLabel = type => typeLabels[type] || '记忆';
const patchSettings = changes => emit('update:settings', { ...props.settings, ...changes });

const load = async () => {
  if (!props.roleId) return;
  [memories.value, jobs.value] = await Promise.all([
    memoryService.listByRole(props.roleId),
    contextJobService.listByRole(props.roleId)
  ]);
};

const organizeNow = async () => {
  busy.value = true;
  message.value = '';
  try {
    const job = await ensureMemoryJob(props.roleId, { manual: true });
    if (!job) message.value = '可整理的旧消息不足 5 条，最新 12 条会保留为原始上下文。';
    else {
      await runMemoryJob(job);
      message.value = '记忆整理完成。';
    }
  } catch (error) {
    message.value = `整理失败：${error.message}`;
  } finally {
    busy.value = false;
    await load();
  }
};

const retryFailed = async () => {
  busy.value = true;
  message.value = '';
  try {
    for (const job of failedJobs.value.filter(item => (item.attempts || 0) < 3)) {
      try { await runMemoryJob(job); } catch { /* 失败状态由任务服务持久化 */ }
    }
    message.value = '重试已完成。';
  } finally {
    busy.value = false;
    await load();
  }
};

const accept = async (memory, replace) => { await memoryService.accept(memory.id, { replace }); await load(); };
const editAndAccept = async memory => {
  const content = prompt('编辑记忆内容', memory.content);
  if (content === null || !content.trim()) return;
  await memoryService.accept(memory.id, { content });
  await load();
};
const archive = async memory => { await memoryService.archive(memory.id); await load(); };
const openSource = async memory => {
  const source = await messageService.getById(memory.sourceMessageIds?.[0]);
  if (!source) { message.value = '来源消息已经不存在。'; return; }
  const conversation = await conversationService.getById(source.conversationId);
  router.push(conversation?.source === 'sms' ? `/messages/${props.roleId}` : `/chat/${source.conversationId}`);
};

watch(() => props.roleId, load);
onMounted(load);
</script>

<style scoped>
.memory-settings { display: grid; gap: 14px; }
.memory-control,.memory-budget { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px; border-radius:16px; background:rgba(127,127,127,.08); }
.memory-control span,.memory-budget span { display:grid; gap:4px; }
.memory-settings strong { font-size:14px; }
.memory-settings small,.memory-meta,.memory-empty,.memory-message { color:#8e8e93; font-size:12px; }
.memory-budget { display:grid; }
.memory-budget input { width:100%; }
.memory-switch { width:44px; height:26px; accent-color:#34c759; }
.memory-actions,.memory-card-actions,.memory-tabs { display:flex; flex-wrap:wrap; gap:8px; }
.memory-actions button,.memory-card-actions button,.memory-tabs button { border:0; border-radius:10px; padding:8px 11px; background:rgba(127,127,127,.12); color:inherit; }
.memory-actions button:first-child { background:#34c759; color:#fff; }
.memory-tabs button.active { background:#111; color:#fff; }
.memory-tabs span { opacity:.7; }
.memory-list { display:grid; gap:10px; }
.memory-card { padding:13px; border-radius:14px; background:rgba(127,127,127,.08); }
.memory-card p { margin:8px 0 12px; line-height:1.55; white-space:pre-wrap; }
.memory-meta { display:flex; justify-content:space-between; gap:8px; }
.memory-card-actions .danger { color:#ff3b30; }
button:disabled { opacity:.5; }
</style>
