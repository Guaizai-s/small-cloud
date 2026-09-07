<template>
  <div class="page" :class="currentTheme">

    <div
      class="slide-container"
      :style="{ transform: activePage === 'appearance' ? 'translateX(-50%)' : 'translateX(0)' }"
    >
      <div class="slide-page main-page">
        <div class="nav-placeholder">
          <div class="nav-back" @click="router.back()">
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none"><path d="M9 1L1 8.5L9 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </div>
          <span class="nav-title-center"></span>
          <div style="width:60px"></div>
        </div>

        <div class="scroll-area">
          
          <div class="theme-carousel-section">
            <div class="carousel-track" ref="carouselTrack" @scroll="onCarouselScroll">
              <div class="carousel-spacer"></div>
              
              <div 
                v-for="(theme, index) in themes" 
                :key="theme.id"
                class="theme-card-wrapper"
                @click="selectTheme(index)"
              >
                <div class="theme-card" :class="[theme.id, { 'is-active': activeThemeIndex === index }]">
                  <div class="mock-nav"></div>
                  <div class="mock-hero"></div>
                  <div class="mock-grid">
                    <div class="mock-icon" v-for="i in 4" :key="i"></div>
                  </div>
                </div>
                <div class="theme-name" :class="{ 'is-active': activeThemeIndex === index }">{{ theme.name }}</div>
              </div>
              
              <div class="carousel-spacer"></div>
            </div>
            
            <div class="carousel-dots">
              <div 
                v-for="(theme, index) in themes" 
                :key="'dot-'+index"
                class="dot"
                :class="{ active: activeThemeIndex === index }"
              ></div>
            </div>
          </div>

          <div class="settings-list">
            
            <div class="pill-card" @click="activePage = 'api'">
              <div class="pill-left">
                <div class="icon-circle"><api-chat-icon /></div>
                <span class="pill-label">聊天 API</span>
              </div>
              <div class="pill-right">
                <span class="pill-value">{{ apiProfiles.length }} 个方案</span>
                  <chevron-right />
              </div>
            </div>

            <div class="pill-card" @click="activePage = 'minimax'">
              <div class="pill-left">
                <div class="icon-circle"><mic-icon /></div>
                <span class="pill-label">MiniMax 语音</span>
              </div>
              <div class="pill-right">
                <span class="pill-value">{{ globalMinimax.apiKey ? '已配置' : '未配置' }}</span>
                <chevron-right />
              </div>
            </div>

            <label class="pill-card">
              <div class="pill-left">
                <div class="icon-circle"><lightning-icon /></div>
                <span class="pill-label">流式输出</span>
              </div>
              <div class="pill-right">
                <input type="checkbox" v-model="useStreamAPI" @change="saveStreamAPI" class="wx-switch" />
              </div>
            </label>

            <label class="pill-card">
              <div class="pill-left">
                <div class="icon-circle"><api-chat-icon /></div>
                <span class="pill-label">Vercel API 代理</span>
              </div>
              <div class="pill-right">
                <input type="checkbox" v-model="useVercelProxy" @change="saveVercelProxy" class="wx-switch" />
              </div>
            </label>

            <div class="pill-card" @click="activePage = 'appearance'">
              <div class="pill-left">
                <div class="icon-circle"><theme-icon /></div>
              <span class="pill-label">图标与壁纸</span>
            </div>
            <div class="pill-right"><chevron-right /></div>
            </div>

            <div class="pill-card" @click="activePage = 'data'">
              <div class="pill-left">
                <div class="icon-circle"><db-icon /></div>
                <span class="pill-label">数据管理</span>
              </div>
              <div class="pill-right"><chevron-right /></div>
            </div>

          </div>

          <div class="version-text">Cloud</div>
        </div>
      </div>

      <div class="slide-page">
        <div class="nav-placeholder">
          <div class="nav-back" @click="activePage = 'main'">
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none"><path d="M9 1L1 8.5L9 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </div>
          <span class="nav-title-center"></span>
          <div style="width:60px"></div>
        </div>

        <div class="scroll-area">
          <div class="section-label mt-4">自定义桌面壁纸</div>
          <div class="card-group">
            <label class="card-item">
              <span class="item-label">上传图片</span>
              <div class="item-right">
                <img v-if="wallpaperPreview" :src="wallpaperPreview" class="preview-thumb" />
                <span class="text-blue">选择文件</span>
                <chevron-right />
              </div>
              <input type="file" accept="image/*" class="hidden-file" @change="onWallpaperUpload" />
            </label>
            <div v-if="wallpaperPreview" class="card-item del-row" @click="clearWallpaper">
              <span class="text-red">恢复默认背景</span>
            </div>
          </div>
          <p class="section-hint">上传图片将覆盖当前主题的纯色背景。</p>

          <div class="section-label mt-8">自定义 APP 图标 (四宫格)</div>
          <div class="card-group mb-8">
            <label
              v-for="(app, i) in allApps"
              :key="app.id"
              class="card-item"
              :class="{ 'no-border': i === allApps.length - 1 }"
            >
              <div class="icon-circle small">
                <component :is="app.iconComp" />
              </div>
              <span class="item-label">{{ app.name }}</span>
              <div class="item-right">
                <img v-if="customIcons[app.id]" :src="customIcons[app.id]" class="preview-thumb" />
                <span class="text-blue">选择图片</span>
                <chevron-right />
              </div>
              <input type="file" accept="image/*" class="hidden-file" @change="e => onIconUpload(e, app.id)" />
            </label>
          </div>
          <div v-if="Object.values(customIcons).some(v => v)" class="card-group mb-8" style="margin-top:12px">
            <div class="card-item no-border del-row" @click="resetIcons">
              <span class="text-red">重置所有图标</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <transition name="slide-up">
      <div v-show="activePage === 'api'" class="overlay-page">
        <div class="nav-placeholder">
          <div class="nav-back" @click="activePage = 'main'">
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none"><path d="M9 1L1 8.5L9 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </div>
          <span class="nav-title-center">聊天 API</span>
          <div style="width:60px"></div>
        </div>
        <div class="scroll-area">
          <div class="card-group mt-4">
            <div
              v-for="(p, i) in apiProfiles"
              :key="p.id"
              class="card-item"
              :class="{ 'no-border': i === apiProfiles.length - 1 }"
              @click="editProfile(p)"
            >
              <span class="item-label">{{ p.name }}</span>
              <div class="item-right">
                <span class="item-value">{{ p.model || '' }}</span>
                <chevron-right />
              </div>
            </div>
            <div v-if="!apiProfiles.length" class="empty-row">暂无方案</div>
          </div>
          <button class="action-btn mt-8" @click="newProfile">+ 新建方案</button>
        </div>
      </div>
    </transition>

    <transition name="slide-up">
      <div v-show="activePage === 'editProfile'" class="overlay-page">
        <div class="nav-placeholder">
          <div class="nav-back" @click="activePage = 'api'">
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none"><path d="M9 1L1 8.5L9 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </div>
          <span class="nav-title-center">{{ editingProfile.id ? '编辑方案' : '新建方案' }}</span>
          <div style="width:60px"></div>
        </div>
        <div class="scroll-area">
          <div class="card-group form-group mt-4">
            <div class="form-row"><label class="form-label">名称</label><input class="form-input" v-model="editingProfile.name" placeholder="如：GPT-4o" /></div>
            <div class="form-row"><label class="form-label">API Key</label><input class="form-input" type="password" v-model="editingProfile.apiKey" placeholder="sk-..." /></div>
            <div class="form-row"><label class="form-label">Base URL</label><input class="form-input" v-model="editingProfile.baseUrl" placeholder="留空用默认" /></div>
            <div class="form-row"><label class="form-label">模型</label><input class="form-input" v-model="editingProfile.model" placeholder="gpt-4o" /></div>
            <div class="form-row no-border">
              <label class="form-label">API格式</label>
              <select class="form-select" v-model="editingProfile.apiFormat">
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI 兼容</option>
              </select>
            </div>
          </div>
          <button class="action-btn mt-8" @click="saveProfile">保存</button>
          <button v-if="editingProfile.id" class="action-btn mt-4 red" @click="deleteProfile">删除方案</button>
        </div>
      </div>
    </transition>

    <transition name="slide-up">
      <div v-show="activePage === 'minimax'" class="overlay-page">
        <div class="nav-placeholder">
          <div class="nav-back" @click="activePage = 'main'">
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none"><path d="M9 1L1 8.5L9 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </div>
          <span class="nav-title-center">MiniMax 语音</span>
          <div style="width:60px"></div>
        </div>
        <div class="scroll-area">
          <div class="card-group form-group mt-4">
            <div class="form-row"><label class="form-label">API Key</label><input class="form-input" type="password" v-model="globalMinimax.apiKey" placeholder="请输入 API Key" /></div>
            <div class="form-row no-border"><label class="form-label">Group ID</label><input class="form-input" v-model="globalMinimax.groupId" placeholder="请输入 Group ID" /></div>
          </div>
          <button class="action-btn mt-8" @click="saveMinimax">保存配置</button>
        </div>
      </div>
    </transition>

    <transition name="slide-up">
      <div v-show="activePage === 'data'" class="overlay-page">
        <div class="nav-placeholder">
          <div class="nav-back" @click="activePage = 'main'">
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none"><path d="M9 1L1 8.5L9 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </div>
          <span class="nav-title-center">数据管理</span>
          <div style="width:60px"></div>
        </div>
        <div class="scroll-area">
          <div class="card-group mt-4">
            <div class="card-item" @click="exportData">
              <span class="item-label">导出本地数据备份</span>
              <div class="item-right"><chevron-right /></div>
            </div>
            <label class="card-item no-border">
              <span class="item-label">导入本地数据</span>
              <div class="item-right"><span class="text-blue">选择文件</span><chevron-right /></div>
              <input type="file" accept=".json" class="hidden-file" @change="importData" />
            </label>
          </div>
          <div v-if="dataMsg" class="msg-row mt-4" :class="dataMsg.includes('失败') ? 'text-red' : 'text-green'">{{ dataMsg }}</div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, onMounted, h, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import db, { apiProfileService, roleService, conversationService, messageService, assetService } from '../services/db';
import { applySystemTheme, SYSTEM_THEME_KEY, SMS_THEME_KEY } from '../utils/themeSync';

const router = useRouter();
const activePage = ref('main'); 

// 主题数据配置
const themes = [
  { id: 'theme-nordic', name: '北欧' },
  { id: 'theme-minimal', name: '原生' },
  { id: 'theme-data', name: '数据流' }
];
const currentTheme = ref('theme-minimal');
const activeThemeIndex = ref(0);
const carouselTrack = ref(null);

// 监听滚动实现居中吸附判断
const onCarouselScroll = () => {
  if (!carouselTrack.value) return;
  const scrollLeft = carouselTrack.value.scrollLeft;
  const cardWidth = 140 + 24; // 卡片宽 + gap
  const index = Math.round(scrollLeft / cardWidth);
  if (activeThemeIndex.value !== index && index >= 0 && index < themes.length) {
    activeThemeIndex.value = index;
    applyTheme(themes[index].id);
  }
};

const selectTheme = (index) => {
  if (!carouselTrack.value) return;
  const cardWidth = 140 + 24;
  carouselTrack.value.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
};

const applyTheme = (themeId) => {
  const { systemTheme } = applySystemTheme(themeId);
  currentTheme.value = systemTheme;
};

// ---- 图标组件基础 (用于系统项) ----
const mkSvg = (paths) => ({ render() { return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', width: 20, height: 20 }, paths.map(d => h('path', { d }))); } });

const ApiChatIcon = mkSvg(['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z','M9 9l3 3-3 3','M13 15h4']);
const MicIcon      = mkSvg(['M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z', 'M19 10v2a7 7 0 01-14 0v-2M12 19v4m-4 0h8']);
const DbIcon       = mkSvg(['M12 2C6.48 2 2 4.24 2 7s4.48 5 10 5 10-2.24 10-5-4.48-5-10-5z', 'M2 7v5c0 2.76 4.48 5 10 5s10-2.24 10-5V7', 'M2 12v5c0 2.76 4.48 5 10 5s10-2.24 10-5v-5']);
const ThemeIcon = mkSvg(['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z','M3 16l5-5 4 4 5-5 4 4','M8.5 8.5m-1.5 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0 -3 0']);
const ChevRight    = { render() { return h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: '#c7c7cc', 'stroke-width': '2.5', 'stroke-linecap': 'round' }, [h('path', { d: 'M9 18l6-6-6-6' })]); } };
const LightningIcon = mkSvg(['M13 2L3 14h9l-1 8 10-12h-9l1-8z']);

// ---- 完全同步 Desktop.vue 的那 8 个小卡片 SVG ----
const mkAppIcon = (paths) => ({ render() { return h('svg', { viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':'1.8', 'stroke-linecap':'round', 'stroke-linejoin':'round', width:18, height:18 }, paths.map(d=>h('path',{d}))); } });

const MsgIcon      = mkAppIcon(['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z']);
const ForumIcon    = mkAppIcon(['M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z']);
const SearchIcon   = mkAppIcon(['M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z']);
const DateIcon     = mkAppIcon(['M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z']);
const GameIcon     = mkAppIcon(['M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12']);
const ReadIcon     = mkAppIcon(['M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253']);
const GachaIcon    = mkAppIcon(['M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z']);
const SettingsIcon = mkAppIcon(['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z']);

// 仅仅保留这 8 个要替换图片的小应用
const allApps = [
  { id:'chat',     name:'微信',   iconComp: MsgIcon      },
  { id:'forum',    name:'论坛',   iconComp: ForumIcon    },
  { id:'search',   name:'查手机', iconComp: SearchIcon   },
  { id:'date',     name:'约会',   iconComp: DateIcon     },
  { id:'games',    name:'游戏',   iconComp: GameIcon     },
  { id:'read',     name:'阅读',   iconComp: ReadIcon     },
  { id:'gacha',    name:'账本',   iconComp: GachaIcon    },
  { id:'settings', name:'设置',   iconComp: SettingsIcon }
];

// ---- 状态数据 ----
const apiProfiles = ref([]);
const editingProfile = ref({ name:'', apiKey:'', baseUrl:'', model:'' });
const globalMinimax = ref({ apiKey:'', groupId:'' });
const useStreamAPI = ref(false);
const useVercelProxy = ref(false);
const wallpaperPreview = ref('');
const customIcons = ref({});
const dataMsg = ref('');
const backupTableNames = () => db.tables.map(table => table.name);
const BACKUP_LOCAL_STORAGE_KEYS = ['globalMinimax', 'useStreamAPI', 'useVercelProxy', SYSTEM_THEME_KEY, SMS_THEME_KEY, 'userStatus'];

const loadAll = async () => {
  apiProfiles.value = await apiProfileService.getAll();
  const mm = localStorage.getItem('globalMinimax');
  if (mm) globalMinimax.value = JSON.parse(mm);
  useStreamAPI.value = localStorage.getItem('useStreamAPI') === 'true';
  useVercelProxy.value = localStorage.getItem('useVercelProxy') === 'true';
  
  const savedTheme = localStorage.getItem(SYSTEM_THEME_KEY) || 'theme-minimal';
  applyTheme(savedTheme);
  const idx = themes.findIndex(t => t.id === savedTheme);
  if (idx !== -1) {
    activeThemeIndex.value = idx;
    nextTick(() => selectTheme(idx));
  }

  wallpaperPreview.value = await assetService.get('desktopWallpaper') || '';
  const icons = {};
  for (const a of allApps) { icons[a.id] = await assetService.get(`icon_${a.id}`) || ''; }
  customIcons.value = icons;
};
onMounted(loadAll);

// ---- 操作逻辑 ----
const editProfile = (p) => { editingProfile.value = { ...p }; activePage.value = 'editProfile'; };
const newProfile  = ()  => { editingProfile.value = { name:'', apiKey:'', baseUrl:'', model:'gpt-4o', apiFormat:'openai' }; activePage.value = 'editProfile'; };
const saveProfile = async () => {
  if (!editingProfile.value.name) return alert('请填写方案名称');
  if (editingProfile.value.id) await apiProfileService.update(editingProfile.value.id, editingProfile.value);
  else await apiProfileService.create(editingProfile.value);
  await loadAll(); activePage.value = 'api';
};
const deleteProfile = async () => {
  if (!confirm('删除此方案？')) return;
  await apiProfileService.delete(editingProfile.value.id);
  await loadAll(); activePage.value = 'api';
};
const saveMinimax = () => { localStorage.setItem('globalMinimax', JSON.stringify(globalMinimax.value)); activePage.value = 'main'; };
const saveStreamAPI = () => localStorage.setItem('useStreamAPI', useStreamAPI.value ? 'true' : 'false');
const saveVercelProxy = () => localStorage.setItem('useVercelProxy', useVercelProxy.value ? 'true' : 'false');

// 上传壁纸和图标
const onWallpaperUpload = (e) => {
  const f = e.target.files?.[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ev => { wallpaperPreview.value = ev.target.result; assetService.set('desktopWallpaper', ev.target.result); };
  r.readAsDataURL(f); e.target.value = '';
};
const clearWallpaper = () => { wallpaperPreview.value = ''; assetService.set('desktopWallpaper', ''); };

const onIconUpload = (e, id) => {
  const f = e.target.files?.[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ev => { customIcons.value[id] = ev.target.result; assetService.set(`icon_${id}`, ev.target.result); };
  r.readAsDataURL(f); e.target.value = '';
};

const resetIcons = async () => {
  for (const a of allApps) { await assetService.set(`icon_${a.id}`, ''); }
  const icons = {};
  allApps.forEach(a => { icons[a.id] = ''; });
  customIcons.value = icons;
};

const exportData = async () => {
  try {
    const tables = {};
    for (const tableName of backupTableNames()) {
      tables[tableName] = await db.table(tableName).toArray();
    }

    const localStorageData = {};
    for (const key of BACKUP_LOCAL_STORAGE_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) localStorageData[key] = value;
    }

    const backup = {
      app: 'xiaoshouji',
      version: 2,
      exportedAt: new Date().toISOString(),
      tables,
      localStorage: localStorageData
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `xiaoshouji-backup-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    dataMsg.value = '导出成功';
  } catch (error) {
    console.error('导出失败:', error);
    dataMsg.value = `导出失败: ${error.message}`;
  } finally {
    setTimeout(() => dataMsg.value = '', 3000);
  }
};

const readJsonFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      resolve(JSON.parse(reader.result));
    } catch (error) {
      reject(new Error('备份文件不是有效的 JSON'));
    }
  };
  reader.onerror = () => reject(new Error('读取备份文件失败'));
  reader.readAsText(file);
});

const normalizeBackupTables = (backup) => {
  if (backup?.tables && typeof backup.tables === 'object') return backup.tables;

  const legacyTables = {};
  for (const tableName of backupTableNames()) {
    if (Array.isArray(backup?.[tableName])) legacyTables[tableName] = backup[tableName];
  }
  return legacyTables;
};

const importData = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const backup = await readJsonFile(file);
    const tables = normalizeBackupTables(backup);
    const tableNames = backupTableNames();
    const hasTableData = tableNames.some(tableName => Array.isArray(tables[tableName]));
    if (!hasTableData) throw new Error('未找到可导入的数据表');

    const ok = confirm('导入备份会清空当前本地数据，并替换为备份文件中的内容。确定继续吗？');
    if (!ok) return;

    await db.transaction('rw', tableNames.map(tableName => db.table(tableName)), async () => {
      for (const tableName of tableNames) {
        await db.table(tableName).clear();
      }
      for (const tableName of tableNames) {
        const rows = tables[tableName];
        if (Array.isArray(rows) && rows.length > 0) {
          await db.table(tableName).bulkPut(rows);
        }
      }
    });

    if (backup.localStorage && typeof backup.localStorage === 'object') {
      for (const key of BACKUP_LOCAL_STORAGE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(backup.localStorage, key)) {
          localStorage.setItem(key, backup.localStorage[key]);
        }
      }
    }

    dataMsg.value = '导入成功，正在刷新';
    await loadAll();
    setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    console.error('导入失败:', error);
    dataMsg.value = `导入失败: ${error.message}`;
    setTimeout(() => dataMsg.value = '', 5000);
  } finally {
    event.target.value = '';
  }
};
</script>

<style scoped>
/* ================= 全局主题变量 ================= */
.page {
  --sys-bg: #f5f4ed;
  --card-bg: #faf9f5;
  --text-main: #5c504d;
  --text-sub: #9e938f;
  --accent: #d97757;
  --shadow: rgba(217, 119, 87, 0.08);
  
  width: 100%; height: 100dvh;
  background: var(--sys-bg); color: var(--text-main);
  overflow: hidden; position: relative; display: flex; flex-direction: column;
  transition: background-color 0.4s ease, color 0.4s ease;
}

.page.theme-nordic {
  --sys-bg: #f0f4f8;
  --card-bg: #ffffff;
  --text-main: #2c3e50;
  --text-sub: #7f8c8d;
  --accent: #6b8ea5;
  --shadow: rgba(107, 142, 165, 0.12);
}

.page.theme-data {
  --sys-bg: #1e2024; --card-bg: #2a2d34;
  --text-main: #e0e6ed; --text-sub: #8892b0;
  --accent: #40d1af; --shadow: rgba(0,0,0,0.3);
}

/* ================= 布局框架 ================= */
.slide-container { display: flex; width: 200%; height: 100%; transition: transform 0.4s cubic-bezier(.3,1,.3,1); }
.slide-page { width: 50%; height: 100%; display: flex; flex-direction: column; }
.overlay-page { position: absolute; inset: 0; background: var(--sys-bg); display: flex; flex-direction: column; z-index: 20; }
.scroll-area { flex: 1; overflow-y: auto; padding-bottom: 40px; }
.scroll-area::-webkit-scrollbar { display: none; }

/* 导航栏 */
.nav-placeholder {
  height: 50px; padding-top: env(safe-area-inset-top);
  display: flex; align-items: center; justify-content: space-between;
  padding-left: 12px; padding-right: 16px; flex-shrink: 0;
}
.nav-back { display: flex; align-items: center; gap: 4px; color: var(--accent); font-size: 16px; font-weight: 600; cursor: pointer; min-width: 60px; }
.nav-title-center { font-size: 17px; font-weight: 700; position: absolute; left: 0; right: 0; text-align: center; pointer-events: none; }

/* ================= 顶部主题轮播 ================= */
.theme-carousel-section {
  width: 100%; padding: 20px 0;
  display: flex; flex-direction: column; align-items: center;
}
.carousel-track {
  width: 100%; display: flex; overflow-x: auto;
  scroll-snap-type: x mandatory; scroll-behavior: smooth;
  gap: 24px; padding-bottom: 20px;
}
.carousel-track::-webkit-scrollbar { display: none; }

.carousel-spacer { width: calc(50vw - 70px - 12px); flex-shrink: 0; }

.theme-card-wrapper {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  scroll-snap-align: center; cursor: pointer;
}

.theme-card {
  width: 140px; height: 260px; border-radius: 24px;
  background: #fff; position: relative; overflow: hidden;
  box-shadow: 0 12px 32px var(--shadow);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s;
  transform: scale(0.85); opacity: 0.6;
  padding: 16px; display: flex; flex-direction: column; gap: 12px;
}
.theme-card.is-active { transform: scale(1); opacity: 1; border: 2px solid var(--accent); }

.mock-nav { width: 100%; height: 14px; border-radius: 7px; background: rgba(0,0,0,0.05); }
.mock-hero { width: 100%; height: 60px; border-radius: 12px; background: rgba(0,0,0,0.05); }
.mock-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex: 1; }
.mock-icon { background: rgba(0,0,0,0.05); border-radius: 10px; height: 40px; }

.theme-card.theme-minimal { background: #faf9f5; }
.theme-card.theme-minimal .mock-nav { background: #d97757; opacity: 0.3; }

.theme-card.theme-nordic { background: #ffffff; border: 2px solid #e1e8ed; }
.theme-card.theme-nordic .mock-nav { background: #6b8ea5; opacity: 0.3; }
.theme-card.theme-nordic .mock-hero, .theme-card.theme-nordic .mock-icon { background: rgba(107, 142, 165, 0.15); }

.theme-card.theme-data { background: #2a2d34; border: 2px solid #47c7a9; }
.theme-card.theme-data .mock-nav, .theme-card.theme-data .mock-hero, .theme-card.theme-data .mock-icon { background: rgba(100,255,218,0.15); }

.theme-name { font-size: 14px; font-weight: 600; color: var(--text-sub); transition: color 0.3s; }
.theme-name.is-active { color: var(--text-main); }

.carousel-dots { display: flex; gap: 8px; margin-top: -5px; }
.dot { width: 6px; height: 6px; border-radius: 3px; background: var(--text-sub); opacity: 0.3; transition: all 0.3s; }
.dot.active { opacity: 1; background: var(--accent); width: 14px; }

/* ================= 下方胶囊卡片列表 ================= */
.settings-list { padding: 10px 24px; display: flex; flex-direction: column; gap: 16px; }

.pill-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px; background: var(--card-bg);
  border-radius: 24px; cursor: pointer;
  box-shadow: 0 8px 20px var(--shadow);
  transition: transform 0.2s, box-shadow 0.2s;
}
.pill-card:active { transform: scale(0.96); }

.pill-left { display: flex; align-items: center; gap: 14px; }
.pill-right { display: flex; align-items: center; gap: 6px; }

/* 统一跟班主题色的图标样式 */
.icon-circle {
  width: 32px; height: 32px; border-radius: 10px;
  background: rgba(0, 0, 0, 0.04);
  color: var(--accent);
  display: flex; align-items: center; justify-content: center;
}
.theme-data .icon-circle { background: rgba(255, 255, 255, 0.06); }
.icon-circle.small { width: 28px; height: 28px; border-radius: 8px; }

.pill-label { font-size: 16px; font-weight: 600; }
.pill-value { font-size: 14px; color: var(--text-sub); }

/* 子页、表单、自定义上传样式 */
.section-label { font-size: 13px; color: var(--text-sub); padding: 16px 24px 8px; font-weight: 600; }
.card-group { background: var(--card-bg); border-radius: 20px; margin: 0 20px; overflow: hidden; box-shadow: 0 8px 20px var(--shadow); }
.card-item { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(0,0,0,0.05); cursor: pointer; position: relative; justify-content: space-between; }
.card-item.no-border, .card-item:last-child { border-bottom: none; }
.item-label { font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 12px;}
.item-right { display: flex; align-items: center; gap: 4px; }
.preview-thumb { width: 30px; height: 30px; border-radius: 8px; object-fit: cover; }
.hidden-file { display: none; }
.section-hint { font-size: 12px; color: var(--text-sub); padding: 8px 24px; line-height: 1.5; }

.text-blue { color: #007aff; font-size: 15px;}
.text-red { color: #ff3b30; font-weight: 500; }
.text-green { color: #34c759; }
.del-row { justify-content: center; }
.mt-4 { margin-top: 16px; } .mt-8 { margin-top: 32px; } .mb-8 { margin-bottom: 32px; }

.form-group .form-row { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(0,0,0,0.05); justify-content: space-between; }
.form-input { flex: 1; border: none; outline: none; background: transparent; color: var(--text-main); font-size: 15px; text-align: right; }
.form-select { border: none; outline: none; background: transparent; color: var(--text-main); font-size: 15px; }

.action-btn { width: calc(100% - 40px); margin: 0 20px; padding: 16px; background: var(--accent); color: #fff; border: none; border-radius: 20px; font-size: 17px; font-weight: 600; cursor: pointer; box-shadow: 0 8px 16px var(--shadow); }
.action-btn.red { background: #ff3b30; }
.version-text { text-align: center; font-size: 12px; color: var(--text-sub); margin-top: 40px; padding-bottom: 20px; font-weight: 600; }

/* Switch 开关 */
.wx-switch {
  position: relative; width: 48px; height: 28px; appearance: none;
  background-color: rgba(0,0,0,0.1); border-radius: 14px; outline: none; cursor: pointer;
  transition: all 0.3s; margin: 0;
}
.theme-data .wx-switch { background-color: rgba(255,255,255,0.1); }
.wx-switch::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 24px; height: 24px;
  background-color: #fff; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: transform 0.3s;
}
.wx-switch:checked { background-color: var(--accent); }
.wx-switch:checked::after { transform: translateX(20px); }
</style>
