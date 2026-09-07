import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/styles/weixin.css';
import './assets/styles/desktop-fixes.css';
import { initializeTheme } from './utils/themeSync';
import { runPendingMemoryJobs } from './services/memoryWorker';

const app = createApp(App);

initializeTheme();

app.use(router);
app.mount('#app');

const resumeMemoryJobs = () => runPendingMemoryJobs().catch(error => console.warn('恢复记忆任务失败:', error.message));
setTimeout(resumeMemoryJobs, 800);
window.addEventListener('online', resumeMemoryJobs);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') resumeMemoryJobs();
});
