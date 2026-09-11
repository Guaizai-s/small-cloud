<template>
  <div class="h-screen w-full flex flex-col relative font-sans transition-colors duration-500" :class="t.appBg">
    
    <!-- 顶部状态栏留白 (适配刘海屏) -->
    <div class="h-12 w-full absolute top-0 z-20 backdrop-blur-md transition-colors" :class="t.headerBg"></div>

    <!-- Header 导航栏 -->
    <div class="pt-12 pb-3 px-4 flex items-center justify-between z-20 sticky top-0 backdrop-blur-md border-b transition-colors duration-500 shrink-0" 
         :class="[t.headerBg, t.border]">
      <button @click="goBack" class="p-2 -ml-2 rounded-full transition-colors flex items-center" :class="[t.textMuted, `hover:${t.textMain}`]">
        <i class="ph ph-caret-left text-2xl"></i>
      </button>
      <div class="text-[17px] font-semibold tracking-wide transition-colors" :class="t.textMain">{{ viewTitle }}</div>
      <div class="w-10"></div> <!-- 占位符保证标题居中 -->
    </div>

    <!-- 滚动内容区 -->
    <div class="flex-1 overflow-x-hidden relative">
      <transition name="slide" mode="out-in">
        
        <!-- ================= 主页视图 ================= -->
        <div v-if="currentView === 'main'" class="absolute inset-0 overflow-y-auto pb-12 px-5 scrollbar-hide">
          
          <!-- 顶部角色信息 (Ins风大头像) -->
          <div class="flex flex-col items-center mt-6 mb-8">
            <div class="w-24 h-24 rounded-full overflow-hidden shadow-sm mb-3 border-2 flex items-center justify-center transition-colors duration-500" :class="[t.border, t.iconBg]">
              <img v-if="role.avatar" :src="role.avatar" class="w-full h-full object-cover">
              <i v-else class="ph ph-user text-4xl" :class="t.textMuted"></i>
            </div>
            <h2 class="text-[22px] font-semibold tracking-tight transition-colors" :class="t.textMain">{{ role.name || '未命名角色' }}</h2>
            <span class="text-[13px] mt-1 cursor-pointer transition-colors" :class="t.textMuted">编辑角色设定</span>
          </div>

          <!-- 聊天行为 -->
          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 transition-colors" :class="t.textMuted">Chat Behavior</div>
          <div class="rounded-[1.5rem] p-1.5 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            
            <!-- 置顶聊天 -->
            <div class="flex justify-between items-center px-4 py-3.5 rounded-2xl transition-colors" :class="[`hover:${t.hoverBg}`]">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">置顶聊天</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="settings.isTop" class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all transition-colors duration-300" :class="settings.isTop ? t.switchBg : (activeTheme === 'midnight' ? '!bg-[#333]' : '!bg-[#E5E5E5]')"></div>
              </label>
            </div>
            
            <div class="h-[1px] mx-4 transition-colors" :class="t.border"></div>
            
            <!-- 消息免打扰 -->
            <div class="flex justify-between items-center px-4 py-3.5 rounded-2xl transition-colors" :class="[`hover:${t.hoverBg}`]">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">消息免打扰</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="settings.isMuted" class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all transition-colors duration-300" :class="settings.isMuted ? t.switchBg : (activeTheme === 'midnight' ? '!bg-[#333]' : '!bg-[#E5E5E5]')"></div>
              </label>
            </div>

            <div class="h-[1px] mx-4 transition-colors" :class="t.border"></div>
            
            <!-- 真实时间感知 -->
            <div class="flex justify-between items-center px-4 py-3.5 rounded-2xl transition-colors" :class="[`hover:${t.hoverBg}`]">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">真实时间感知</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="settings.isRealTimeOn" class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all transition-colors duration-300" :class="settings.isRealTimeOn ? t.switchBg : (activeTheme === 'midnight' ? '!bg-[#333]' : '!bg-[#E5E5E5]')"></div>
              </label>
            </div>
            
          </div>

          <!-- 记忆与上下文 -->
          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 transition-colors" :class="t.textMuted">Memory & Context</div>
          <div class="rounded-[1.5rem] p-1.5 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <div @click="currentView = 'memory'" class="flex justify-between items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-colors" :class="[`hover:${t.hoverBg}`]">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">记忆设置</span>
              <div class="flex items-center gap-2">
                <span class="text-[14px] transition-colors" :class="t.textMuted">长期 / 核心</span>
                <i class="ph ph-caret-right text-sm" :class="t.textMuted"></i>
              </div>
            </div>
            
            <div class="h-[1px] mx-4 transition-colors" :class="t.border"></div>
            
            <div class="flex justify-between items-center px-4 py-3.5 rounded-2xl transition-colors">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">上下文长度</span>
              <span class="text-[14px] font-medium transition-colors" :class="t.textMuted">{{ settings.contextLength || 15 }} 轮</span>
            </div>
            <div class="px-4 pb-4 pt-1">
              <input type="range" min="1" max="100" v-model.number="settings.contextLength" 
                     class="w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none transition-colors"
                     :class="[t.iconBg]" 
                     :style="`background: linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${settings.contextLength}%, transparent ${settings.contextLength}%, transparent 100%);`" />
            </div>
          </div>

          <!-- 角色设置 -->
          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 transition-colors" :class="t.textMuted">Role</div>
          <div class="rounded-[1.5rem] p-1.5 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <div @click="currentView = 'roleEdit'" class="flex justify-between items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-colors" :class="[`hover:${t.hoverBg}`]">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">编辑角色</span>
              <div class="flex items-center gap-2">
                <span class="text-[14px] transition-colors" :class="t.textMuted">{{ role.name || '...' }}</span>
                <i class="ph ph-caret-right text-sm" :class="t.textMuted"></i>
              </div>
            </div>
          </div>

          <!-- API 与其他 -->
          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 transition-colors" :class="t.textMuted">Integration</div>
          <div class="rounded-[1.5rem] p-1.5 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <div @click="currentView = 'api'" class="flex justify-between items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-colors" :class="[`hover:${t.hoverBg}`]">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">API 方案</span>
              <div class="flex items-center gap-2">
                <span class="text-[14px] transition-colors" :class="t.textMuted">{{ selectedProfileName }}</span>
                <i class="ph ph-caret-right text-sm" :class="t.textMuted"></i>
              </div>
            </div>
            <div class="h-[1px] mx-4 transition-colors" :class="t.border"></div>
            <div @click="currentView = 'minimax'" class="flex justify-between items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-colors" :class="[`hover:${t.hoverBg}`]">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">Minimax 音色</span>
              <div class="flex items-center gap-2">
                <span class="text-[14px] transition-colors" :class="t.textMuted">{{ settings.minimaxVoiceId || '未配置' }}</span>
                <i class="ph ph-caret-right text-sm" :class="t.textMuted"></i>
              </div>
            </div>
          </div>

          <!-- 主动发消息 -->
          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 transition-colors" :class="t.textMuted">Proactive</div>
          <div class="rounded-[1.5rem] p-1.5 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <div class="flex justify-between items-center px-4 py-3.5 rounded-2xl transition-colors" :class="[`hover:${t.hoverBg}`]">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">允许 AI 主动发消息</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="settings.isProactive" class="sr-only peer">
                <div class="w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all transition-colors duration-300" :class="settings.isProactive ? t.switchBg : (activeTheme === 'midnight' ? '!bg-[#333]' : '!bg-[#E5E5E5]')"></div>
              </label>
            </div>
            <template v-if="settings.isProactive">
              <div class="h-[1px] mx-4 transition-colors" :class="t.border"></div>
              <div class="flex justify-between items-center px-4 py-3.5 rounded-2xl transition-colors" :class="[`hover:${t.hoverBg}`]">
                <span class="text-[15px] font-medium transition-colors" :class="t.textMain">定时触发</span>
                <div class="flex items-center gap-2">
                  <input v-if="settings.triggerTimer" type="time" v-model="settings.triggerTimerValue" class="bg-transparent outline-none text-[14px] transition-colors" :class="t.textMuted" />
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="settings.triggerTimer" class="sr-only peer">
                    <div class="w-9 h-5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all transition-colors duration-300" :class="settings.triggerTimer ? t.switchBg : (activeTheme === 'midnight' ? '!bg-[#333]' : '!bg-[#E5E5E5]')"></div>
                  </label>
                </div>
              </div>
              <div class="h-[1px] mx-4 transition-colors" :class="t.border"></div>
              <div class="flex justify-between items-center px-4 py-3.5 rounded-2xl transition-colors" :class="[`hover:${t.hoverBg}`]">
                <span class="text-[15px] font-medium transition-colors" :class="t.textMain">超时未回触发</span>
                <div class="flex items-center gap-2">
                  <select v-if="settings.triggerTimeout" v-model="settings.triggerTimeoutValue" class="bg-transparent outline-none text-[14px] transition-colors" :class="t.textMuted">
                    <option value="1">1小时</option>
                    <option value="3">3小时</option>
                    <option value="5">5小时</option>
                    <option value="12">12小时</option>
                    <option value="24">24小时</option>
                  </select>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="settings.triggerTimeout" class="sr-only peer">
                    <div class="w-9 h-5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all transition-colors duration-300" :class="settings.triggerTimeout ? t.switchBg : (activeTheme === 'midnight' ? '!bg-[#333]' : '!bg-[#E5E5E5]')"></div>
                  </label>
                </div>
              </div>
            </template>
          </div>

          <!-- 用户人设 -->
          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 transition-colors" :class="t.textMuted">Persona</div>
          <div class="rounded-[1.5rem] p-1.5 shadow-sm border transition-colors duration-500 mb-8" :class="[t.cardBg, t.border]">
            <div @click="currentView = 'persona'" class="flex justify-between items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-colors" :class="[`hover:${t.hoverBg}`]">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">选择人设卡</span>
              <div class="flex items-center gap-2">
                <span class="text-[14px] transition-colors" :class="t.textMuted">{{ selectedPersonaName }}</span>
                <i class="ph ph-caret-right text-sm" :class="t.textMuted"></i>
              </div>
            </div>
          </div>
          
        </div>

        <!-- ================= Minimax 音色视图 ================= -->
        <div v-else-if="currentView === 'minimax'" class="absolute inset-0 overflow-y-auto pb-12 px-5 scrollbar-hide">
          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 mt-6 transition-colors" :class="t.textMuted">TTS 模型</div>
          <div class="rounded-[1.5rem] p-1.5 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <div class="flex justify-between items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-colors" :class="[`hover:${t.hoverBg}`]" @click="showModelList = !showModelList">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">模型</span>
              <div class="flex items-center gap-2">
                <span class="text-[14px] transition-colors" :class="t.textMuted">{{ settings.minimaxModel }}</span>
                <i class="ph ph-caret-down text-sm transition-transform" :class="[t.textMuted, showModelList ? 'rotate-180' : '']"></i>
              </div>
            </div>
            <template v-if="showModelList">
              <div class="h-[1px] mx-4 transition-colors" :class="t.border"></div>
              <div v-for="m in ttsModeList" :key="m.id"
                @click="settings.minimaxModel = m.id; showModelList = false"
                class="flex justify-between items-center px-4 py-3 rounded-2xl cursor-pointer transition-colors" :class="[`hover:${t.hoverBg}`]">
                <span class="text-[14px] transition-colors" :class="t.textMain">{{ m.name }}</span>
                <i v-if="settings.minimaxModel === m.id" class="ph ph-check text-sm" :class="t.textMuted"></i>
              </div>
            </template>
          </div>

          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 transition-colors" :class="t.textMuted">Voice ID</div>
          <div class="rounded-[1.5rem] p-4 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <input v-model="settings.minimaxVoiceId" placeholder="如 male-qn-qingse 或克隆音色ID"
              class="w-full bg-transparent outline-none text-[15px] transition-colors" :class="t.textMain" />
          </div>

          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 transition-colors" :class="t.textMuted">语速 ({{ Number(settings.minimaxSpeed).toFixed(1) }}x)</div>
          <div class="rounded-[1.5rem] p-4 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <input type="range" min="0.5" max="2.0" step="0.1" v-model.number="settings.minimaxSpeed"
              class="w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none" :class="t.iconBg"
              :style="`background: linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${(settings.minimaxSpeed - 0.5) / 1.5 * 100}%, transparent ${(settings.minimaxSpeed - 0.5) / 1.5 * 100}%, transparent 100%);`" />
          </div>

          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 transition-colors" :class="t.textMuted">音调 ({{ settings.minimaxPitch > 0 ? '+' : '' }}{{ settings.minimaxPitch }})</div>
          <div class="rounded-[1.5rem] p-4 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <input type="range" min="-12" max="12" step="1" v-model.number="settings.minimaxPitch"
              class="w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none" :class="t.iconBg"
              :style="`background: linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${(settings.minimaxPitch + 12) / 24 * 100}%, transparent ${(settings.minimaxPitch + 12) / 24 * 100}%, transparent 100%);`" />
          </div>
        </div>

        <!-- ================= 角色编辑视图 ================= -->
        <div v-else-if="currentView === 'roleEdit'" class="absolute inset-0 overflow-y-auto pb-12 px-5 scrollbar-hide">
          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 mt-6 transition-colors" :class="t.textMuted">基本信息</div>
          <div class="rounded-[1.5rem] p-1.5 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <div class="flex justify-between items-center px-4 py-3.5 rounded-2xl transition-colors">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">角色名称</span>
              <input v-model="roleEditData.name" placeholder="请输入角色名称"
                class="bg-transparent outline-none text-[15px] text-right transition-colors" :class="t.textMuted" />
            </div>
            <div class="h-[1px] mx-4 transition-colors" :class="t.border"></div>
            <div class="flex justify-between items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-colors" :class="[`hover:${t.hoverBg}`]" @click="avatarInput.click()">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">角色头像</span>
              <div class="flex items-center gap-2">
                <img v-if="roleEditData.avatar" :src="roleEditData.avatar" class="w-8 h-8 rounded-lg object-cover" />
                <span class="text-[14px] transition-colors" :class="t.textMuted">选择图片</span>
              </div>
              <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarUpload" />
            </div>
          </div>
          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 transition-colors" :class="t.textMuted">系统提示词</div>
          <div class="rounded-[1.5rem] p-4 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <textarea v-model="roleEditData.systemPrompt" rows="8"
              placeholder="定义角色的性格、说话风格、背景故事等..."
              class="w-full bg-transparent outline-none resize-none text-[15px] leading-relaxed transition-colors"
              :class="t.textMain"></textarea>
          </div>
          <button class="w-full py-4 rounded-[1.25rem] font-semibold text-[16px] shadow-sm transition-all active:scale-95"
                  :class="[t.switchBg, activeTheme === 'midnight' ? '!text-[#121212]' : 'text-white']"
                  @click="saveRoleEdit">保存角色</button>
        </div>

        <!-- ================= API 方案视图 ================= -->
        <div v-else-if="currentView === 'api'" class="absolute inset-0 overflow-y-auto pb-12 px-5 scrollbar-hide">
          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 mt-6 transition-colors" :class="t.textMuted">选择 API 方案</div>
          <div class="rounded-[1.5rem] p-1.5 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <div @click="apiProfileId = null" class="flex justify-between items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-colors" :class="[`hover:${t.hoverBg}`]">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">使用全局配置</span>
              <i v-if="!apiProfileId" class="ph ph-check text-lg" :class="t.switchBg.replace('!bg-', 'text-').replace('bg-', 'text-')"></i>
            </div>
            <div v-for="p in apiProfiles" :key="p.id" @click="apiProfileId = p.id"
              class="flex justify-between items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-colors" :class="[`hover:${t.hoverBg}`]">
              <div>
                <div class="text-[15px] font-medium transition-colors" :class="t.textMain">{{ p.name }}</div>
                <div class="text-[13px] transition-colors" :class="t.textMuted">{{ p.model }}</div>
              </div>
              <i v-if="apiProfileId === p.id" class="ph ph-check text-lg" :class="t.switchBg.replace('!bg-', 'text-').replace('bg-', 'text-')"></i>
            </div>
            <div v-if="apiProfiles.length === 0" class="px-4 py-3.5 text-[14px] transition-colors" :class="t.textMuted">暂无方案，请先在「设置 → API 方案」中创建</div>
          </div>
        </div>

        <!-- ================= 人设卡视图 ================= -->
        <div v-else-if="currentView === 'persona'" class="absolute inset-0 overflow-y-auto pb-12 px-5 scrollbar-hide">
          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 mt-6 transition-colors" :class="t.textMuted">选择用户人设卡</div>
          <div class="rounded-[1.5rem] p-1.5 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <div @click="settings.selectedPersonaId = null" class="flex justify-between items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-colors" :class="[`hover:${t.hoverBg}`]">
              <span class="text-[15px] font-medium transition-colors" :class="t.textMain">不使用人设</span>
              <i v-if="!settings.selectedPersonaId" class="ph ph-check text-lg" :class="t.switchBg.replace('!bg-', 'text-').replace('bg-', 'text-')"></i>
            </div>
            <div v-for="p in personas" :key="p.id" @click="settings.selectedPersonaId = p.id"
              class="flex justify-between items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-colors" :class="[`hover:${t.hoverBg}`]">
              <div>
                <div class="text-[15px] font-medium transition-colors" :class="t.textMain">{{ p.name }}</div>
                <div v-if="p.description" class="text-[13px] transition-colors" :class="t.textMuted">{{ p.description }}</div>
              </div>
              <i v-if="settings.selectedPersonaId === p.id" class="ph ph-check text-lg" :class="t.switchBg.replace('!bg-', 'text-').replace('bg-', 'text-')"></i>
            </div>
            <div v-if="personas.length === 0" class="px-4 py-3.5 text-[14px] transition-colors" :class="t.textMuted">暂无人设卡</div>
          </div>
        </div>

        <!-- ================= 记忆设置视图 ================= -->
        <div v-else-if="currentView === 'memory'" class="absolute inset-0 overflow-y-auto pb-12 px-5 scrollbar-hide">
          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 mt-6 transition-colors" :class="t.textMuted">长期记忆 (Long Term)</div>
          <div class="rounded-[1.5rem] p-4 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <textarea v-model="settings.longTermMemory" rows="4"
              placeholder="每行一条记忆，例如：&#10;· 用户喜欢喝咖啡&#10;· 用户叫小明，18岁"
              class="w-full bg-transparent outline-none resize-none text-[15px] leading-relaxed transition-colors placeholder-opacity-50"
              :class="[t.textMain, `placeholder-${t.textMuted.replace('text-', '')}`]"
            ></textarea>
          </div>

          <div class="text-[12px] font-bold tracking-widest uppercase mb-2 ml-2 transition-colors" :class="t.textMuted">核心记忆 (Core)</div>
          <div class="rounded-[1.5rem] p-4 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <textarea v-model="settings.coreMemory" rows="6"
              placeholder="填写角色设定、用户画像等核心信息，每次对话都会发送给 AI。"
              class="w-full bg-transparent outline-none resize-none text-[15px] leading-relaxed transition-colors placeholder-opacity-50"
              :class="[t.textMain, `placeholder-${t.textMuted.replace('text-', '')}`]"
            ></textarea>
          </div>

          <div class="rounded-[1.5rem] p-4 shadow-sm border transition-colors duration-500 mb-6" :class="[t.cardBg, t.border]">
            <MemorySettingsPanel v-if="role?.id" :role-id="role.id" :settings="settings" @update:settings="applyMemorySettings" />
          </div>

          <button class="w-full py-4 rounded-[1.25rem] font-semibold text-[16px] shadow-sm transition-all active:scale-95"
                  :class="[t.switchBg, activeTheme === 'midnight' ? '!text-[#121212]' : 'text-white']"
                  @click="goBack">
            保存设置
          </button>
        </div>

      </transition>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTheme } from '../composables/useTheme';
import { roleService, conversationService, apiProfileService, personaService } from '../services/db';
import MemorySettingsPanel from '../components/MemorySettingsPanel.vue';

const router = useRouter();
const route = useRoute();
const { activeTheme, t } = useTheme();

const roleId = parseInt(route.params.id);
const currentView = ref('main');
const showModelList = ref(false);
const role = ref({ name: '', avatar: '' });
const apiProfiles = ref([]);
const personas = ref([]);
const apiProfileId = ref(null);
const avatarInput = ref(null);
const roleEditData = ref({ name: '', avatar: '', systemPrompt: '' });

const ttsModeList = [
  { id: 'speech-2.8-hd',    name: 'Speech-2.8 HD' },
  { id: 'speech-2.8-turbo', name: 'Speech-2.8 Turbo' },
  { id: 'speech-2.6-hd',    name: 'Speech-2.6 HD' },
  { id: 'speech-2.6-turbo', name: 'Speech-2.6 Turbo' },
  { id: 'speech-02-hd',     name: 'Speech-02 HD' },
  { id: 'speech-02-turbo',  name: 'Speech-02 Turbo' },
  { id: 'speech-01-hd',     name: 'Speech-01 HD' },
  { id: 'speech-01-turbo',  name: 'Speech-01 Turbo' },
];

const sliderColor = computed(() => {
  if (activeTheme.value === 'vanilla') return '#B4A79A';
  if (activeTheme.value === 'mono') return '#111111';
  return '#E0E0E0';
});

const viewTitle = computed(() => {
  const map = { main: '详细信息', memory: '记忆设置', minimax: 'Minimax 音色', roleEdit: '编辑角色', api: 'API 方案', persona: '用户人设' };
  return map[currentView.value] || '设置';
});

const selectedProfileName = computed(() => {
  if (!apiProfileId.value) return '全局配置';
  const p = apiProfiles.value.find(p => p.id === apiProfileId.value);
  return p ? p.name : '全局配置';
});

const selectedPersonaName = computed(() => {
  if (!settings.value.selectedPersonaId) return '未选择';
  const p = personas.value.find(p => p.id === settings.value.selectedPersonaId);
  return p ? p.name : '未选择';
});

const settings = ref({
  isTop: false,
  isMuted: false,
  isRealTimeOn: true,
  contextLength: 15,
  contextTokenBudget: 8000,
  autoMemoryEnabled: false,
  longTermMemory: '',
  coreMemory: '',
  minimaxVoiceId: '',
  minimaxModel: 'speech-02-hd',
  minimaxSpeed: 1.2,
  minimaxPitch: 0,
  isProactive: false,
  triggerTimer: false,
  triggerTimerValue: '08:00',
  triggerTimeout: false,
  triggerTimeoutValue: '5',
  selectedPersonaId: null,
});

let convId = null;
let initialized = false;

const applyMemorySettings = (next) => { settings.value = { ...settings.value, ...next }; };

const saveSettings = async () => {
  if (!role.value?.id || !initialized) return;
  await roleService.update(role.value.id, { chatSettings: { ...role.value.chatSettings, ...settings.value } });
  if (convId) await conversationService.update(convId, { isTop: settings.value.isTop, isMuted: settings.value.isMuted });
};

const saveApiProfile = async () => {
  if (!role.value?.id || !initialized) return;
  await roleService.update(role.value.id, { apiProfileId: apiProfileId.value });
};

let saveTimer = null;
watch(settings, () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSettings, 400);
}, { deep: true });
watch(apiProfileId, saveApiProfile);

watch(currentView, (v) => {
  if (v === 'roleEdit' && role.value) {
    roleEditData.value = { name: role.value.name || '', avatar: role.value.avatar || '', systemPrompt: role.value.systemPrompt || '' };
  }
});

onMounted(async () => {
  [apiProfiles.value, personas.value] = await Promise.all([apiProfileService.getAll(), personaService.getAll()]);
  const r = await roleService.getById(roleId);
  if (r) {
    role.value = r;
    apiProfileId.value = r.apiProfileId ?? null;
    const cs = r.chatSettings || {};
    settings.value = {
      isTop: cs.isTop ?? false,
      isMuted: cs.isMuted ?? false,
      isRealTimeOn: cs.isRealTimeOn ?? true,
      contextLength: cs.contextLength ?? 15,
      contextTokenBudget: cs.contextTokenBudget ?? 8000,
      autoMemoryEnabled: cs.autoMemoryEnabled ?? false,
      longTermMemory: cs.longTermMemory || '',
      coreMemory: cs.coreMemory || '',
      minimaxVoiceId: cs.minimaxVoiceId || '',
      minimaxModel: cs.minimaxModel || 'speech-02-hd',
      minimaxSpeed: cs.minimaxSpeed ?? 1.2,
      minimaxPitch: cs.minimaxPitch ?? 0,
      isProactive: cs.isProactive ?? false,
      triggerTimer: cs.triggerTimer ?? false,
      triggerTimerValue: cs.triggerTimerValue || '08:00',
      triggerTimeout: cs.triggerTimeout ?? false,
      triggerTimeoutValue: cs.triggerTimeoutValue || '5',
      selectedPersonaId: cs.selectedPersonaId ?? null,
    };
  }
  const conv = await conversationService.getOrCreateSms(roleId);
  if (conv) {
    convId = conv.id;
    settings.value.isTop = conv.isTop ?? settings.value.isTop;
    settings.value.isMuted = conv.isMuted ?? settings.value.isMuted;
  }
  initialized = true;
});

const saveRoleEdit = async () => {
  if (!role.value?.id || !roleEditData.value.name.trim()) return;
  await roleService.update(role.value.id, {
    name: roleEditData.value.name,
    avatar: roleEditData.value.avatar,
    systemPrompt: roleEditData.value.systemPrompt,
  });
  role.value = await roleService.getById(role.value.id);
  currentView.value = 'main';
};

const onAvatarUpload = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => { roleEditData.value.avatar = ev.target.result; };
  reader.readAsDataURL(file);
  e.target.value = '';
};

const goBack = () => {
  if (currentView.value !== 'main') { currentView.value = 'main'; } else { router.back(); }
};
</script>

<style scoped>
/* 隐藏滚动条但保持可滚动 */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 页面切换滑入滑出过渡效果 */
.slide-enter-active, .slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-enter-from { 
  transform: translateX(100%); 
  opacity: 0; 
}
.slide-leave-to { 
  transform: translateX(-30%); 
  opacity: 0; 
}
</style>
