<template>
  <div class="sms-room-page w-full flex flex-col relative font-sans transition-colors duration-500 page-spring-enter-active" :class="[t.appBg, t.backgroundFx]" @click="onPageClick">

    <div class="h-8 w-full backdrop-blur-md absolute top-0 z-20 transition-colors duration-500" :class="t.headerBg"></div>

    <div class="pt-10 pb-3 px-4 flex items-center justify-between backdrop-blur-md z-10 border-b shrink-0 transition-colors duration-500"
         :class="[t.headerBg, t.headerBorder]">
      <div class="flex-1 flex justify-start">
        <button class="p-2 -ml-2 transition-all duration-200 flex items-center active:scale-90" :class="[t.textMuted, `hover:${t.textMain}`]" @click="router.back()">
          <i class="ph ph-caret-left text-2xl"></i>
        </button>
      </div>
      
      <div class="flex flex-col items-center flex-[2] relative">
        <h1 class="text-[17px] font-semibold tracking-wide transition-colors truncate max-w-full" :class="t.textMain">{{ role?.name || '...' }}</h1>
        <button class="sms-heart-status-hit" aria-label="心声" @click.stop="openHeartVoice"></button>
        <span class="text-[11px] font-medium tracking-wider transition-colors" :class="t.textMuted">{{ isTyping ? '正在输入...' : '在线' }}</span>
      </div>

      <div class="flex-1 flex justify-end">
        <button class="p-2 -mr-2 transition-all duration-200 flex items-center active:scale-90" :class="[t.textMuted, `hover:${t.textMain}`]" @click="router.push(`/messages/details/${roleId}`)">
          <i class="ph ph-dots-three text-[26px]"></i>
        </button>
      </div>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto px-4 pt-6 pb-28 scrollbar-hide">
      <transition-group name="msg-spring" tag="div" class="flex flex-col space-y-6">
        <div v-for="(msg, index) in messages" :key="msg.id">
          
          <div v-if="shouldShowTime(index)" class="flex justify-center mt-2 mb-4">
            <span class="text-[11px] font-medium px-3 py-1 rounded-full transition-colors"
                  :class="[t.textMuted, activeTheme === 'midnight' ? 'bg-white/5' : 'bg-black/5']">
              {{ formatMessageTime(msg.timestamp) }}
            </span>
          </div>

          <div
            v-if="isSystemMessage(msg)"
            class="sms-system-row"
            :class="{ clickable: msg.type === 'diary_notice' }"
            @click="handleSystemClick(msg)"
          >
            <button v-if="selectionMode" class="sms-select-dot" :class="{ active: selectedMessageIds.has(msg.id) }" @click.stop="toggleMessageSelection(msg.id)"></button>
            <span>{{ msg.content }}</span>
          </div>

          <div v-else class="flex items-end gap-2 relative" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
            <button v-if="selectionMode" class="sms-select-dot" :class="{ active: selectedMessageIds.has(msg.id) }" @click.stop="toggleMessageSelection(msg.id)"></button>
            <div v-if="msg.role !== 'user'" class="w-8 h-8 rounded-full overflow-hidden shrink-0 mb-1">
              <img v-if="showAvatar(index)" :src="role?.avatar" alt="avatar" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full bg-transparent"></div>
            </div>

            <div class="flex flex-col max-w-[75%] relative" :class="msg.role === 'user' ? 'items-end' : 'items-start'">
              <div v-if="activeMenuId === msg.id" class="sms-message-menu" :class="[t.cardBg, t.textMain, t.border]">
                <button v-for="item in menuItems(msg)" :key="item.action" @click.stop="handleMessageAction(item.action, msg)">
                  {{ item.label }}
                </button>
              </div>
              
              <div v-if="msg.audioUrl" 
                   @click="togglePlay(msg)"
                   @mousedown="onPressStart(msg.id)" @mouseup="onPressEnd" @mouseleave="onPressEnd"
                   @touchstart.passive="onPressStart(msg.id)" @touchend="onPressEnd" @touchcancel="onPressEnd"
                   @contextmenu.prevent="openMenu(msg.id)"
                   class="flex items-center gap-2.5 px-4 py-2.5 shadow-sm cursor-pointer transition-all duration-300 active:scale-95"
                   :class="[
                     msg.role === 'user' ? `${t.myBubble} rounded-[1.25rem] rounded-br-sm` : `${t.otherBubble} rounded-[1.25rem] rounded-bl-sm`
                   ]">
                
                <i class="ph-fill transition-all" :class="activeAudioId === msg.id ? 'ph-pause-circle text-[22px]' : 'ph-play-circle text-[22px]'"></i>
                
                <div class="flex items-center gap-[3px] h-4 mx-1">
                  <span class="w-[3px] rounded-full bg-current transition-all duration-200" :class="activeAudioId === msg.id ? 'wave-anim-1' : 'h-1.5'"></span>
                  <span class="w-[3px] rounded-full bg-current transition-all duration-200" :class="activeAudioId === msg.id ? 'wave-anim-2' : 'h-3'"></span>
                  <span class="w-[3px] rounded-full bg-current transition-all duration-200" :class="activeAudioId === msg.id ? 'wave-anim-3' : 'h-2'"></span>
                  <span class="w-[3px] rounded-full bg-current transition-all duration-200" :class="activeAudioId === msg.id ? 'wave-anim-4' : 'h-3.5'"></span>
                  <span class="w-[3px] rounded-full bg-current transition-all duration-200" :class="activeAudioId === msg.id ? 'wave-anim-2' : 'h-2'"></span>
                </div>
                
                <span class="text-[13px] font-medium tracking-wide"></span>
              </div>

              <div v-if="msg.audioUrl && isTranscriptVisible(msg.id)"
                   class="mt-2 px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap transition-colors duration-500 shadow-sm"
                   :class="[
                     msg.role === 'user' ? `${t.myBubble} rounded-[1.25rem] rounded-br-sm` : `${t.otherBubble} rounded-[1.25rem] rounded-bl-sm`
                   ]">
                {{ msg.content }}
              </div>

              <template v-else-if="!msg.audioUrl">
                <div v-for="(part, partIndex) in getMessageParts(msg)"
                     :key="`${msg.id}-${partIndex}`"
                     @mousedown="onPressStart(msg.id)" @mouseup="onPressEnd" @mouseleave="onPressEnd"
                     @touchstart.passive="onPressStart(msg.id)" @touchend="onPressEnd" @touchcancel="onPressEnd"
                     @contextmenu.prevent="openMenu(msg.id)"
                     class="px-4 py-3 text-[15px] leading-relaxed transition-colors duration-500 shadow-sm"
                     :class="[
                       partIndex > 0 ? 'mt-2' : '',
                       msg.role === 'user' ? `${t.myBubble} rounded-[1.25rem] rounded-br-sm` : `${t.otherBubble} rounded-[1.25rem] rounded-bl-sm`
                     ]">
                  <div v-if="partIndex === 0 && msg.replyTo" class="sms-reply-preview">{{ replyPreview(msg.replyTo) }}</div>
                  {{ part }}
                  <span v-if="msg.isFavorite && partIndex === getMessageParts(msg).length - 1" class="sms-favorite">★</span>
                </div>
              </template>
              
              <span class="text-[10px] mt-1 px-1 transition-colors duration-500" :class="t.textMuted">
                {{ new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
              </span>
            </div>
          </div>
        </div>
      </transition-group>
      
      <div ref="messagesEndRef" class="h-2"></div>
    </div>

    <div v-if="replyingTo && !selectionMode" class="sms-reply-draft" :class="[t.inputAreaBg, t.headerBorder]">
      <div>
        <span :class="t.textMuted">引用</span>
        <p :class="t.textMain">{{ messagePreview(replyingTo) }}</p>
      </div>
      <button :class="t.textMuted" @click="replyingTo = null">×</button>
    </div>

    <div v-if="selectionMode" class="sms-selection-bar" :class="[t.inputAreaBg, t.headerBorder]">
      <button :class="t.textMuted" @click="cancelSelection">取消</button>
      <span :class="t.textMuted">已选 {{ selectedMessageIds.size }} 条</span>
      <button class="danger" :disabled="selectedMessageIds.size === 0" @click="deleteSelectedMessages">删除</button>
    </div>

    <div v-else class="sms-compose" :class="[t.inputAreaBg, t.headerBorder]">
      <button class="sms-round-btn" :class="[t.textMuted, t.iconBtnBg]" aria-label="更多">
        <i class="ph ph-plus"></i>
      </button>

      <div class="sms-input-shell" :class="t.inputBg">
        <input
          ref="composerInputRef"
          v-model="inputText"
          type="text"
          placeholder="发消息..."
          :disabled="isTyping"
          :class="t.textMain"
          @keydown.enter.prevent="handleSend"
        />
        <button class="sms-emoji-btn" :class="t.textMuted" aria-label="表情">
          <i class="ph ph-smiley"></i>
        </button>
      </div>

      <button
        class="sms-trigger-btn"
        :class="[t.iconBtnBg, t.textMuted, { 'is-thinking': isTyping }]"
        :disabled="isTyping || !convId || messages.length === 0"
        title="让角色回复"
        aria-label="让角色回复"
        @click.stop="generateReply"
      >
        <i :class="isTyping ? 'ph ph-circle-notch' : 'ph ph-chat-circle-dots'"></i>
      </button>

      <button
        v-if="inputText.trim()"
        class="sms-send-btn"
        :class="t.sendBtn"
        :disabled="isTyping"
        aria-label="发送"
        @pointerdown.prevent
        @click="handleSend"
      >
        <i class="ph-fill ph-paper-plane-tilt"></i>
      </button>
    </div>

    <heart-voice-panel
      :visible="heartVoiceOpen"
      :loading="heartVoiceLoading"
      :error="heartVoiceError"
      :data="heartVoiceData"
      :role-name="role?.name || ''"
      :variant="activeTheme === 'midnight' ? 'sms theme-midnight' : 'sms'"
      :saved="heartVoiceSaved"
      :saving="heartVoiceSaving"
      @close="heartVoiceOpen = false"
      @retry="generateHeartVoice"
      @save="saveHeartVoice"
    />
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { roleService, conversationService, memoryService, messageService, apiProfileService } from '../services/db.js';
import { chatOrchestrator } from '../services/chatOrchestrator.js';
import { useTheme } from '../composables/useTheme.js';
import HeartVoicePanel from '../components/HeartVoicePanel.vue';
import { createHeartVoiceMemory, normalizeProfile } from '../composables/useCharProfile.js';

const route = useRoute();
const router = useRouter();
const roleId = parseInt(route.params.id);

const role = ref(null);
const messages = ref([]);
const inputText = ref('');
const { t, activeTheme } = useTheme();
const messagesEndRef = ref(null);
const composerInputRef = ref(null);
const activeMenuId = ref(null);
const selectionMode = ref(false);
const selectedMessageIds = ref(new Set());
const replyingTo = ref(null);
const heartVoiceOpen = ref(false);
const heartVoiceLoading = ref(false);
const heartVoiceError = ref('');
const heartVoiceData = ref(null);
const heartVoiceSaving = ref(false);
const heartVoiceSaved = ref(false);
let pressTimer = null;

const showAvatar = (index) => index === 0 || messages.value[index - 1].role === 'user';
const isTyping = ref(false);
const convId = ref(null);

// ================= 语音播放控制 =================
const activeAudioId = ref(null);
const visibleTranscriptIds = ref(new Set());
let currentAudioPlayer = null;

const togglePlay = (msg) => {
  if (!msg.audioUrl) return;
  if (activeMenuId.value !== null || selectionMode.value) return;

  const nextTranscriptIds = new Set(visibleTranscriptIds.value);
  if (nextTranscriptIds.has(msg.id)) {
    nextTranscriptIds.delete(msg.id);
  } else {
    nextTranscriptIds.add(msg.id);
  }
  visibleTranscriptIds.value = nextTranscriptIds;

  if (activeAudioId.value === msg.id) {
    // 暂停当前播放
    if (currentAudioPlayer) currentAudioPlayer.pause();
    activeAudioId.value = null;
  } else {
    // 播放新的语音
    if (currentAudioPlayer) {
      currentAudioPlayer.pause();
    }
    currentAudioPlayer = new Audio(msg.audioUrl);
    activeAudioId.value = msg.id;
    currentAudioPlayer.play();
    
    // 播放结束恢复静止状态
    currentAudioPlayer.onended = () => {
      activeAudioId.value = null;
    };
  }
};

const isTranscriptVisible = (id) => visibleTranscriptIds.value.has(id);

const getMessageParts = (msg) => {
  if (msg.type !== 'text' || msg.audioUrl) return [msg.content];
  return (msg.content || '').split('\n').map(part => part.trim()).filter(Boolean);
};

const isSystemMessage = (msg) => ['system', 'diary_notice'].includes(msg.type) || msg.role === 'system';

const messagePreview = (msg) => {
  if (!msg) return '';
  if (msg.type === 'image') return '[图片]';
  if (msg.type === 'sticker') return '[表情]';
  if (msg.audioUrl) return `[语音] ${msg.content || ''}`.trim();
  return String(msg.content || '').replace(/\s+/g, ' ').slice(0, 80);
};

const replyPreview = (reply) => {
  const author = reply?.role === 'user' ? '我' : '对方';
  return `${author}: ${String(reply?.content || '').replace(/\s+/g, ' ').slice(0, 44)}`;
};

const makeReplyPayload = (msg) => ({
  id: msg.id,
  role: msg.role,
  type: msg.type,
  content: messagePreview(msg),
  audioUrl: !!msg.audioUrl
});

const menuItems = (msg) => [
  { action: 'select', label: '多选' },
  { action: 'delete', label: '删除' },
  { action: 'withdraw', label: '撤回' },
  { action: 'favorite', label: msg.isFavorite ? '取消收藏' : '收藏' },
  { action: 'quote', label: '回复' }
];

const openMenu = (id) => { activeMenuId.value = id; };
const closeMenu = () => { activeMenuId.value = null; };
const focusComposerInput = () => {
  nextTick(() => {
    const input = composerInputRef.value;
    if (!input || selectionMode.value) return;
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
  });
};
const blurComposerInput = () => {
  if (document.activeElement === composerInputRef.value) {
    composerInputRef.value.blur();
  }
};
const onPageClick = (event) => {
  closeMenu();
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!target.closest('.sms-compose') && !target.closest('.sms-reply-draft')) {
    blurComposerInput();
  }
};
const onPressStart = (id) => {
  pressTimer = setTimeout(() => { activeMenuId.value = id; }, 500);
};
const onPressEnd = () => { clearTimeout(pressTimer); };

const toggleMessageSelection = (id) => {
  const next = new Set(selectedMessageIds.value);
  next.has(id) ? next.delete(id) : next.add(id);
  selectedMessageIds.value = next;
};

const startSelection = (msg) => {
  selectionMode.value = true;
  selectedMessageIds.value = new Set([msg.id]);
  closeMenu();
};

const cancelSelection = () => {
  selectionMode.value = false;
  selectedMessageIds.value = new Set();
};

const deleteMessage = async (msg) => {
  if (!confirm('确定删除这条信息吗？')) return;
  await messageService.delete(msg.id);
  if (replyingTo.value?.id === msg.id) replyingTo.value = null;
  messages.value = await messageService.getByConversation(convId.value);
};

const deleteSelectedMessages = async () => {
  const ids = [...selectedMessageIds.value];
  if (ids.length === 0) return;
  if (!confirm(`确定删除选中的 ${ids.length} 条信息吗？`)) return;
  await messageService.deleteMany(ids);
  if (replyingTo.value && ids.includes(replyingTo.value.id)) replyingTo.value = null;
  messages.value = await messageService.getByConversation(convId.value);
  cancelSelection();
};

const withdrawMessage = async (msg) => {
  if (!confirm('确定撤回这条信息吗？')) return;
  const notice = msg.role === 'user' ? '你撤回了一条信息' : `${role.value?.name || '角色'}撤回了一条信息`;
  await messageService.withdraw(msg.id, notice);
  if (replyingTo.value?.id === msg.id) replyingTo.value = null;
  messages.value = await messageService.getByConversation(convId.value);
};

const handleMessageAction = async (action, msg) => {
  closeMenu();
  if (action === 'select') return startSelection(msg);
  if (action === 'delete') return deleteMessage(msg);
  if (action === 'withdraw') return withdrawMessage(msg);
  if (action === 'favorite') {
    await messageService.update(msg.id, {
      isFavorite: !msg.isFavorite,
      favoriteAt: msg.isFavorite ? null : Date.now()
    });
    messages.value = await messageService.getByConversation(convId.value);
    return;
  }
  if (action === 'quote') replyingTo.value = msg;
};

const handleSystemClick = (msg) => {
  if (selectionMode.value) return toggleMessageSelection(msg.id);
  if (msg.type === 'diary_notice' && msg.diaryId) router.push({ path: '/diary', query: { diaryId: msg.diaryId } });
};

const openHeartVoice = () => {
  heartVoiceOpen.value = true;
  generateHeartVoice();
};

const generateHeartVoice = async () => {
  if (!role.value || heartVoiceLoading.value) return;
  heartVoiceLoading.value = true;
  heartVoiceError.value = '';
  heartVoiceSaved.value = false;
  try {
    const result = await chatOrchestrator.heartVoice({ roleId });
    heartVoiceData.value = result.data;
  } catch (error) {
    heartVoiceError.value = error.message || '心声生成失败';
  } finally {
    heartVoiceLoading.value = false;
  }
};

const saveHeartVoice = async () => {
  if (!role.value?.id || !heartVoiceData.value || heartVoiceSaving.value || heartVoiceSaved.value) return;
  heartVoiceSaving.value = true;
  try {
    const latestRole = await roleService.getById(role.value.id);
    const profile = normalizeProfile(latestRole?.profile || role.value.profile);
    const memoryItems = [createHeartVoiceMemory(heartVoiceData.value), ...profile.memoryItems].slice(0, 80);
    const updatedRole = await roleService.update(role.value.id, {
      profile: { ...profile, memoryItems }
    });
    const heartContent = memoryItems[0].content || memoryItems[0].title;
    if (heartContent) await memoryService.create({
      id: `heart:${role.value.id}:${memoryItems[0].id}`,
      scopeType: 'role', scopeId: String(role.value.id), ownerRoleId: role.value.id,
      type: 'character_state', content: heartContent, keywords: [], importance: 2,
      confidence: 1, sourceMessageIds: [], status: 'active', source: 'heart_voice'
    });
    role.value = { ...role.value, profile: updatedRole.profile };
    heartVoiceSaved.value = true;
  } finally {
    heartVoiceSaving.value = false;
  }
};

// 离开页面时停止播放
onUnmounted(() => {
  blurComposerInput();
  if (currentAudioPlayer) {
    currentAudioPlayer.pause();
    currentAudioPlayer = null;
  }
});
// ==============================================

const shouldShowTime = (index) => {
  if (index === 0) return true;
  const currentMsgTime = messages.value[index].timestamp;
  const previousMsgTime = messages.value[index - 1].timestamp;
  if (!currentMsgTime || !previousMsgTime) return false;
  return (currentMsgTime - previousMsgTime) > 5 * 60 * 1000;
};

const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  const timeStr = `${hours}:${minutes} ${ampm}`;
  return isToday ? `今天 ${timeStr}` : `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
};

onMounted(async () => {
  let r = await roleService.getById(roleId);
  if (r?.apiProfileId) {
    const profile = await apiProfileService.getById(r.apiProfileId);
    if (profile) r = { ...r, apiKey: profile.apiKey, baseUrl: profile.baseUrl, model: profile.model, apiFormat: profile.apiFormat };
  } else {
    const profiles = await apiProfileService.getAll();
    if (profiles.length > 0) r = { ...r, apiKey: profiles[0].apiKey, baseUrl: profiles[0].baseUrl, model: profiles[0].model, apiFormat: profiles[0].apiFormat };
  }
  role.value = r;
  const conv = await conversationService.getOrCreateSms(roleId);
  convId.value = conv.id;
  messages.value = await messageService.getByConversation(convId.value);
  scrollToBottom();
  focusComposerInput();
});

const scrollToBottom = () => {
  nextTick(() => messagesEndRef.value?.scrollIntoView({ behavior: 'instant' }));
};

watch(messages, () => scrollToBottom(), { deep: true });

const handleSend = async () => {
  const text = inputText.value.trim();
  if (!text || !convId.value || isTyping.value) return;
  inputText.value = '';
  focusComposerInput();

  const extra = replyingTo.value ? { replyTo: makeReplyPayload(replyingTo.value) } : {};
  const userMsg = await messageService.create(convId.value, 'user', text, 'text', null, extra);
  messages.value.push(userMsg);
  replyingTo.value = null;
  focusComposerInput();
};

const generateReply = async () => {
  if (!convId.value || isTyping.value || messages.value.length === 0) return;
  isTyping.value = true;
  try {
    await chatOrchestrator.reply({
      roleId,
      conversationId: convId.value,
      channel: 'sms',
      trigger: 'manual_generate',
      callbacks: { onMessageCreated: message => messages.value.push(message) }
    });
  } catch (e) {
    console.error('AI回复失败:', e);
    const errMsg = { id: Date.now(), role: 'assistant', content: `[回复失败: ${e.message}]`, timestamp: Date.now() };
    messages.value.push(errMsg);
  } finally {
    isTyping.value = false;
  }
};
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

.sms-room-page {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.sms-compose {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  border-top-width: 1px;
  flex-shrink: 0;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}
.sms-heart-status-hit {
  position: absolute;
  left: 50%;
  bottom: -2px;
  width: 84px;
  height: 20px;
  border: none;
  border-radius: 999px;
  background: transparent;
  transform: translateX(-50%);
}
.sms-heart-status-hit:active {
  background: rgba(128, 128, 128, 0.12);
}
.sms-round-btn,
.sms-trigger-btn,
.sms-send-btn,
.sms-emoji-btn {
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.18s ease, opacity 0.18s ease, background-color 0.3s ease;
}
.sms-round-btn,
.sms-trigger-btn,
.sms-send-btn {
  width: 38px;
  height: 38px;
  border-radius: 999px;
}
.sms-round-btn i,
.sms-trigger-btn i,
.sms-send-btn i,
.sms-emoji-btn i {
  font-size: 20px;
}
.sms-input-shell {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px 0 15px;
  border-width: 1px;
  border-radius: 999px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}
.sms-input-shell input {
  min-width: 0;
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  line-height: 1;
}
.sms-input-shell input:disabled {
  opacity: 0.55;
}
.sms-emoji-btn {
  width: 26px;
  height: 26px;
  background: transparent;
}
.sms-trigger-btn {
  position: relative;
  overflow: hidden;
}
.sms-trigger-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.055;
  transition: opacity 0.18s ease;
}
.sms-trigger-btn i {
  position: relative;
  z-index: 1;
  font-size: 21px;
}
.sms-trigger-btn:active:not(:disabled)::after {
  opacity: 0.12;
}
.sms-send-btn {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}
.sms-send-btn i {
  margin-left: 2px;
  font-size: 18px;
}
.sms-round-btn:active,
.sms-trigger-btn:active:not(:disabled),
.sms-send-btn:active:not(:disabled),
.sms-emoji-btn:active {
  transform: scale(0.92);
}
.sms-trigger-btn:disabled,
.sms-send-btn:disabled {
  opacity: 0.5;
}
.sms-trigger-btn.is-thinking i {
  animation: sms-spin 0.9s linear infinite;
}
@keyframes sms-spin {
  to { transform: rotate(360deg); }
}

.sms-system-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 2px 0 14px;
}
.sms-system-row span {
  max-width: min(78vw, 420px);
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(120, 120, 120, 0.14);
  color: currentColor;
  opacity: 0.72;
  font-size: 12px;
  line-height: 1.35;
  text-align: center;
}
.sms-system-row.clickable span {
  opacity: 0.9;
  cursor: pointer;
}
.sms-message-menu {
  position: absolute;
  top: -44px;
  z-index: 30;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  border-width: 1px;
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
}
.items-end .sms-message-menu {
  right: 0;
}
.items-start .sms-message-menu {
  left: 0;
}
.sms-message-menu button {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-weight: 600;
}
.sms-select-dot {
  width: 22px;
  height: 22px;
  border: 1.5px solid rgba(130, 130, 130, 0.45);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  flex-shrink: 0;
}
.sms-select-dot.active {
  border-color: #d97757;
  background: #d97757;
  box-shadow: inset 0 0 0 5px #fff;
}
.sms-reply-preview {
  margin-bottom: 6px;
  padding-left: 8px;
  border-left: 3px solid rgba(128, 128, 128, 0.28);
  opacity: 0.72;
  font-size: 12px;
  line-height: 1.35;
}
.sms-favorite {
  margin-left: 6px;
  color: #d6a33a;
  font-size: 12px;
}
.sms-reply-draft,
.sms-selection-bar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 11;
  flex-shrink: 0;
  border-top-width: 1px;
  transition: all 0.3s ease;
}
.sms-reply-draft {
  bottom: calc(59px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 16px;
}
.sms-reply-draft span {
  display: block;
  margin-bottom: 2px;
  font-size: 12px;
}
.sms-reply-draft p {
  margin: 0;
  font-size: 13px;
  line-height: 1.35;
}
.sms-reply-draft button,
.sms-selection-bar button {
  border: none;
  background: transparent;
  font-size: 15px;
}
.sms-selection-bar {
  bottom: 0;
  display: grid;
  grid-template-columns: 56px 1fr 56px;
  align-items: center;
  padding: 11px 16px calc(11px + env(safe-area-inset-bottom));
  text-align: center;
  font-size: 14px;
}
.sms-selection-bar .danger {
  color: #e5534b;
}
.sms-selection-bar button:disabled {
  opacity: 0.45;
}

/* ================= 页面与列表动画 ================= */
.page-spring-enter-active {
  animation: page-spring-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes page-spring-in {
  0% { opacity: 0; transform: translateY(15px) scale(0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.msg-spring-enter-active {
  animation: msg-spring-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.msg-spring-move {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes msg-spring-in {
  0% { opacity: 0; transform: translateY(20px) scale(0.9); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* ================= 语音波纹动画 ================= */
.wave-anim-1 { animation: wave 1s infinite ease-in-out; }
.wave-anim-2 { animation: wave 1s infinite ease-in-out 0.2s; }
.wave-anim-3 { animation: wave 1s infinite ease-in-out 0.4s; }
.wave-anim-4 { animation: wave 1s infinite ease-in-out 0.1s; }

@keyframes wave {
  0%, 100% { height: 6px; }
  50% { height: 16px; }
}
</style>
