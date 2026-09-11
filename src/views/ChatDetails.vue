<template>
  <div class="wx-page chat-details-page">
    <div class="nav-bar">
      <button class="nav-btn" aria-label="返回" @click="goBack">
        <i class="ph ph-caret-left"></i>
      </button>
      <div class="nav-title">{{ viewTitle }}</div>
    </div>

    <main v-show="currentView === 'main'" class="page-content details-home">
      <section class="role-hero">
        <img class="role-avatar" :src="role?.avatar || defaultAvatar" alt="" />
        <div class="role-copy">
          <h1>{{ role?.name || '未命名角色' }}</h1>
          <p>{{ roleSubtitle }}</p>
        </div>
      </section>

      <section class="settings-section">
        <div class="group-label">聊天</div>
        <div class="panel">
          <label class="list-item file-row">
            <span class="item-label">聊天背景</span>
            <div class="item-right">
              <span class="text-blue" @click.stop="triggerBgUpload">{{ settings.chatBackground ? '更换' : '选择图片' }}</span>
              <span v-if="settings.chatBackground" class="text-red" @click.stop="clearBackground">清除</span>
            </div>
            <input ref="bgInput" type="file" accept="image/*" class="hidden-file" @change="onBgUpload" />
          </label>

          <label class="list-item">
            <span class="item-label">置顶聊天</span>
            <input v-model="settings.isTop" type="checkbox" class="wx-switch" />
          </label>

          <label class="list-item">
            <span class="item-label">消息免打扰</span>
            <input v-model="settings.isMuted" type="checkbox" class="wx-switch" />
          </label>

          <label class="list-item">
            <span class="item-label">真实时间感知</span>
            <input v-model="settings.isRealTimeOn" type="checkbox" class="wx-switch" />
          </label>
        </div>
      </section>

      <section class="settings-section">
        <div class="group-label">上下文</div>
        <div class="panel range-panel">
          <div class="range-head">
            <span class="item-label">最近 {{ settings.contextLength }} 轮对话</span>
            <span class="item-value">影响记忆长度</span>
          </div>
          <input v-model.number="settings.contextLength" type="range" min="1" max="300" class="wx-slider" />
        </div>
        <button class="panel list-item" @click="currentView = 'memory'">
          <span class="item-label">记忆与上下文</span>
          <span class="item-right"><span class="item-value">{{ contextCapacityLabel }}</span><i class="ph ph-caret-right"></i></span>
        </button>
      </section>

      <section class="settings-section">
        <div class="group-label">连接</div>
        <div class="panel">
          <button class="list-item" @click="currentView = 'api'">
            <span class="item-label">API 方案</span>
            <span class="item-right"><span class="item-value">{{ selectedProfileName }}</span><i class="ph ph-caret-right"></i></span>
          </button>

          <button class="list-item" @click="currentView = 'persona'">
            <span class="item-label">用户人设</span>
            <span class="item-right"><span class="item-value">{{ selectedPersonaName }}</span><i class="ph ph-caret-right"></i></span>
          </button>

          <button class="list-item" @click="currentView = 'stickers'">
            <span class="item-label">表情包库</span>
            <span class="item-right"><span class="item-value">{{ linkedLibraryName }}</span><i class="ph ph-caret-right"></i></span>
          </button>

          <button class="list-item" @click="currentView = 'minimax'">
            <span class="item-label">语音音色</span>
            <span class="item-right"><span class="item-value">{{ settings.minimaxVoiceId || '未配置' }}</span><i class="ph ph-caret-right"></i></span>
          </button>
        </div>
      </section>

      <section class="settings-section">
        <div class="group-label">角色资料</div>
        <div class="panel">
          <button class="list-item" @click="openChar">
            <span class="item-label">打开 char 档案</span>
            <span class="item-right"><span class="item-value">人设 / 记忆 / 关系</span><i class="ph ph-caret-right"></i></span>
          </button>
        </div>
      </section>

      <div class="danger-panel">
        <button class="danger-btn" @click="deleteRoleFromDetails">删除角色和聊天记录</button>
      </div>

      <div v-if="saveMsg" class="save-toast">{{ saveMsg }}</div>
    </main>

    <main v-show="currentView === 'api'" class="page-content sub-page">
      <div class="group-label">API 方案</div>
      <div class="panel">
        <button class="list-item" @click="apiProfileId = null">
          <span class="item-label">使用全局配置</span>
          <i v-if="!apiProfileId" class="ph ph-check check-icon"></i>
        </button>
        <button v-for="profile in apiProfiles" :key="profile.id" class="list-item" @click="apiProfileId = profile.id">
          <span>
            <span class="item-label block">{{ profile.name }}</span>
            <small>{{ profile.model || '未填写模型' }}</small>
          </span>
          <i v-if="sameId(apiProfileId, profile.id)" class="ph ph-check check-icon"></i>
        </button>
        <div v-if="apiProfiles.length === 0" class="empty-hint">暂无 API 方案，请先到系统设置中创建。</div>
      </div>
    </main>

    <main v-show="currentView === 'persona'" class="page-content sub-page">
      <div class="group-label">用户人设</div>
      <div class="panel">
        <button class="list-item" @click="settings.selectedPersonaId = null">
          <span class="item-label">不使用人设</span>
          <i v-if="!settings.selectedPersonaId" class="ph ph-check check-icon"></i>
        </button>
        <button v-for="persona in personas" :key="persona.id" class="list-item" @click="settings.selectedPersonaId = persona.id">
          <span>
            <span class="item-label block">{{ persona.name }}</span>
            <small>{{ persona.description || '无描述' }}</small>
          </span>
          <i v-if="sameId(settings.selectedPersonaId, persona.id)" class="ph ph-check check-icon"></i>
        </button>
        <div v-if="personas.length === 0" class="empty-hint">暂无用户人设。</div>
      </div>
    </main>

    <main v-show="currentView === 'stickers'" class="page-content sub-page">
      <div class="group-label">表情包库</div>
      <div class="panel">
        <button class="list-item" @click="selectLibrary(null)">
          <span class="item-label">不关联表情包</span>
          <i v-if="!settings.linkedLibraryId" class="ph ph-check check-icon"></i>
        </button>
        <button v-for="library in libraries" :key="library.id" class="list-item" @click="selectLibrary(library.id)">
          <span class="item-label">{{ library.name }}</span>
          <i v-if="sameId(settings.linkedLibraryId, library.id)" class="ph ph-check check-icon"></i>
        </button>
        <div v-if="libraries.length === 0" class="empty-hint">暂无表情包库。</div>
      </div>
      <button class="secondary-btn" @click="$router.push('/stickers')">管理表情包</button>
    </main>

    <main v-show="currentView === 'minimax'" class="page-content sub-page">
      <div class="group-label">MiniMax 语音</div>
      <div class="panel form-panel">
        <label class="form-row">
          <span>模型</span>
          <input v-model="settings.minimaxModel" placeholder="speech-02-hd" />
        </label>
        <label class="form-row">
          <span>Voice ID</span>
          <input v-model="settings.minimaxVoiceId" placeholder="如 male-qn-qingse" />
        </label>
      </div>

      <div class="panel range-panel">
        <div class="range-head">
          <span class="item-label">语速 {{ Number(settings.minimaxSpeed).toFixed(1) }}x</span>
        </div>
        <input v-model.number="settings.minimaxSpeed" type="range" min="0.5" max="2" step="0.1" class="wx-slider" />
      </div>

      <div class="panel range-panel">
        <div class="range-head">
          <span class="item-label">音调 {{ settings.minimaxPitch > 0 ? '+' : '' }}{{ settings.minimaxPitch }}</span>
        </div>
        <input v-model.number="settings.minimaxPitch" type="range" min="-12" max="12" step="1" class="wx-slider" />
      </div>
    </main>

    <main v-show="currentView === 'memory'" class="page-content sub-page">
      <div class="group-label">固定记忆</div>
      <div class="panel form-panel memory-texts">
        <label class="form-row memory-row">
          <span>核心记忆</span>
          <textarea v-model="settings.coreMemory" rows="4" placeholder="角色设定、关系核心事实"></textarea>
        </label>
        <label class="form-row memory-row">
          <span>长期记忆</span>
          <textarea v-model="settings.longTermMemory" rows="4" placeholder="用户手动维护的长期记忆"></textarea>
        </label>
      </div>
      <div class="memory-structured">
        <MemorySettingsPanel v-if="role?.id" :role-id="role.id" :settings="settings" @update:settings="Object.assign(settings, $event)" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiProfileService, conversationService, personaService, roleService, stickerLibraryService } from '../services/db';
import { roleSummary } from '../composables/useCharProfile';
import MemorySettingsPanel from '../components/MemorySettingsPanel.vue';

const route = useRoute();
const router = useRouter();

const routeRoleId = route.params.roleId ? Number(route.params.roleId) : null;
const routeConvId = route.params.convId ? Number(route.params.convId) : null;

const currentView = ref('main');
const role = ref(null);
const conversation = ref(null);
const apiProfiles = ref([]);
const personas = ref([]);
const libraries = ref([]);
const apiProfileId = ref(null);
const bgInput = ref(null);
const saveMsg = ref('');
let initialized = false;
let saveTimer = null;

const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="72" height="72"%3E%3Crect fill="%23ddd" width="72" height="72" rx="12"/%3E%3Cpath fill="%23999" d="M36 18a10 10 0 100 20 10 10 0 000-20zm0 25c-7.3 0-13 4.3-13 9.7V56h26v-3.3C49 47.3 43.3 43 36 43z"/%3E%3C/svg%3E';

const settings = reactive({
  contextLength: 15,
  contextTokenBudget: 8000,
  autoMemoryEnabled: false,
  coreMemory: '',
  longTermMemory: '',
  chatBackground: '',
  isTop: false,
  isMuted: false,
  isRealTimeOn: true,
  minimaxVoiceId: '',
  minimaxModel: 'speech-02-hd',
  minimaxSpeed: 1.2,
  minimaxPitch: 0,
  selectedPersonaId: null,
  linkedLibraryId: null
});

const viewTitle = computed(() => {
  const titles = {
    main: '聊天设置',
    api: 'API 方案',
    persona: '用户人设',
    stickers: '表情包库',
    minimax: '语音音色',
    memory: '记忆与上下文'
  };
  return titles[currentView.value] || '聊天设置';
});

const roleSubtitle = computed(() => role.value ? roleSummary(role.value, 42) : '聊天配置保留在这里，角色资料去 char 查看');

const selectedProfileName = computed(() => {
  if (!apiProfileId.value) return '全局配置';
  const profile = apiProfiles.value.find(item => sameId(item.id, apiProfileId.value));
  return profile?.name || '全局配置';
});

const selectedPersonaName = computed(() => {
  if (!settings.selectedPersonaId) return '未选择';
  const persona = personas.value.find(item => sameId(item.id, settings.selectedPersonaId));
  return persona?.name || '未选择';
});

const linkedLibraryName = computed(() => {
  if (!settings.linkedLibraryId) return '未选择';
  const library = libraries.value.find(item => sameId(item.id, settings.linkedLibraryId));
  return library?.name || '未选择';
});

const contextCapacityLabel = computed(() => ({
  4000: '精简',
  8000: '标准',
  16000: '充足',
  32000: '最大'
}[Number(settings.contextTokenBudget) || 8000] || '自定义'));

const normalizeId = (id) => {
  if (id === null || id === undefined || id === '') return null;
  const numericId = Number(id);
  return Number.isFinite(numericId) ? numericId : id;
};

const sameId = (left, right) => normalizeId(left) === normalizeId(right);

const goBack = () => {
  if (currentView.value !== 'main') {
    currentView.value = 'main';
    return;
  }
  router.back();
};

const openChar = () => {
  if (!role.value?.id) return;
  router.push(`/char/${role.value.id}`);
};

const triggerBgUpload = () => {
  bgInput.value?.click();
};

const onBgUpload = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    settings.chatBackground = ev.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
};

const clearBackground = () => {
  settings.chatBackground = '';
};

const selectLibrary = (libraryId) => {
  settings.linkedLibraryId = normalizeId(libraryId);
};

const saveSettings = async () => {
  if (!initialized || !role.value?.id) return;
  await roleService.update(role.value.id, {
    chatSettings: JSON.parse(JSON.stringify(settings)),
    apiProfileId: normalizeId(apiProfileId.value)
  });
  if (conversation.value?.id) {
    await conversationService.update(conversation.value.id, {
      isTop: settings.isTop,
      isMuted: settings.isMuted
    });
  }
  saveMsg.value = '已保存';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveMsg.value = '';
  }, 1200);
};

const deleteRoleFromDetails = async () => {
  if (!role.value) return;
  if (!confirm(`确定删除角色“${role.value.name || '未命名角色'}”和相关聊天记录吗？`)) return;
  await roleService.delete(role.value.id);
  router.replace('/chats');
};

watch(settings, saveSettings, { deep: true });
watch(apiProfileId, saveSettings);

onMounted(async () => {
  [apiProfiles.value, personas.value, libraries.value] = await Promise.all([
    apiProfileService.getAll(),
    personaService.getAll(),
    stickerLibraryService.getAll()
  ]);

  let roleId = routeRoleId;
  if (!roleId && routeConvId) {
    conversation.value = await conversationService.getById(routeConvId);
    roleId = conversation.value?.roleId;
  }

  if (!roleId) {
    initialized = true;
    return;
  }

  role.value = await roleService.getById(roleId);
  if (role.value?.chatSettings) {
    Object.assign(settings, role.value.chatSettings);
  }
  apiProfileId.value = normalizeId(role.value?.apiProfileId ?? null);

  if (!conversation.value) {
    conversation.value = await conversationService.getOrCreate(roleId);
  }

  settings.isTop = conversation.value?.isTop ?? settings.isTop;
  settings.isMuted = conversation.value?.isMuted ?? settings.isMuted;
  settings.linkedLibraryId = normalizeId(settings.linkedLibraryId);
  settings.selectedPersonaId = normalizeId(settings.selectedPersonaId);
  initialized = true;
});
</script>

<style scoped>
.chat-details-page {
  width: 100%;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--wx-bg);
  color: var(--wx-text-primary);
}

.memory-texts { margin-bottom: 16px; }
.memory-row { display: grid !important; gap: 9px; padding:14px 16px !important; }
.memory-row textarea { width:100%; min-height:104px; max-height:180px; box-sizing:border-box; border:0; outline:0; resize:vertical; padding:12px 13px; border-radius:13px; background:rgba(127,127,127,.08); color:inherit; font:inherit; font-size:15px; line-height:1.55; }
.memory-structured { margin:0 16px; }

.nav-bar {
  height: 48px;
  padding: env(safe-area-inset-top) 14px 0;
  display: grid;
  grid-template-columns: 42px 1fr 42px;
  align-items: center;
  flex-shrink: 0;
  background: var(--wx-white);
  border-bottom: 1px solid var(--wx-border);
}

.nav-bar::after {
  content: '';
  width: 42px;
  height: 42px;
}

.nav-btn {
  width: 42px;
  height: 42px;
  border: 0;
  background: transparent;
  color: var(--wx-text-primary);
  display: grid;
  place-items: center;
  font-size: 24px;
}

.nav-btn.ghost {
  color: var(--wx-green);
}

.nav-title {
  min-width: 0;
  font-size: 17px;
  font-weight: 700;
  text-align: center;
}

.page-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 0 max(32px, env(safe-area-inset-bottom));
}

.page-content::-webkit-scrollbar {
  display: none;
}

.role-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 16px 16px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--wx-white), rgba(7, 193, 96, 0.08));
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.05);
}

.role-avatar {
  width: 62px;
  height: 62px;
  border-radius: 16px;
  object-fit: cover;
  flex-shrink: 0;
}

.role-copy {
  min-width: 0;
  flex: 1;
}

.role-copy h1 {
  margin: 0;
  overflow: hidden;
  font-size: 21px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-copy p {
  margin: 5px 0 0;
  color: var(--wx-text-secondary);
  font-size: 13px;
  line-height: 1.35;
}

.secondary-btn {
  border: 0;
  border-radius: 999px;
  padding: 9px 14px;
  background: rgba(7, 193, 96, 0.12);
  color: #07a857;
  font-weight: 700;
}

.group-label {
  padding: 14px 18px 7px;
  color: var(--wx-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.panel {
  margin: 0 16px 4px;
  overflow: hidden;
  border-radius: 14px;
  background: var(--wx-white);
}

.list-item {
  width: 100%;
  min-height: 52px;
  border: 0;
  border-bottom: 1px solid var(--wx-border);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: transparent;
  color: inherit;
  text-align: left;
  font: inherit;
}

.list-item:last-child {
  border-bottom: 0;
}

.file-row {
  position: relative;
}

.hidden-file {
  display: none;
}

.item-label {
  color: var(--wx-text-primary);
  font-size: 15px;
  font-weight: 600;
}

.item-label.block {
  display: block;
}

.item-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.item-value,
small {
  color: var(--wx-text-secondary);
  font-size: 13px;
}

.text-blue {
  color: #007aff;
}

.text-red {
  margin-left: 8px;
  color: #ff3b30;
}

.range-panel {
  padding: 14px 16px 16px;
}

.range-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.wx-slider {
  width: 100%;
  margin: 8px 0 0;
}

.wx-switch {
  position: relative;
  width: 50px;
  height: 30px;
  appearance: none;
  background: var(--wx-border);
  border-radius: 999px;
  outline: none;
}

.wx-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: transform 0.22s;
}

.wx-switch:checked {
  background: #07c160;
}

.wx-switch:checked::after {
  transform: translateX(20px);
}

.form-panel .form-row {
  min-height: 54px;
  border-bottom: 1px solid var(--wx-border);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-panel .form-row:last-child {
  border-bottom: 0;
}

.form-row span {
  min-width: 72px;
  color: var(--wx-text-primary);
  font-weight: 600;
}

.form-row input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--wx-text-primary);
  font: inherit;
  text-align: right;
}

.check-icon {
  color: #07c160;
  font-size: 20px;
}

.empty-hint {
  padding: 16px;
  color: var(--wx-text-secondary);
  font-size: 14px;
}

.secondary-btn {
  width: calc(100% - 32px);
  margin: 16px;
  padding: 13px;
  border-radius: 14px;
}

.danger-panel {
  margin: 22px 16px 10px;
}

.danger-btn {
  width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 14px;
  background: var(--wx-white);
  color: #ff3b30;
  font-size: 15px;
  font-weight: 700;
}

.save-toast {
  position: fixed;
  left: 50%;
  bottom: 72px;
  transform: translateX(-50%);
  border-radius: 999px;
  padding: 8px 18px;
  background: rgba(0, 0, 0, 0.66);
  color: #fff;
  font-size: 13px;
  pointer-events: none;
}
</style>
