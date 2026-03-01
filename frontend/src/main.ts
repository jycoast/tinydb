// 关键样式 - 立即加载
import 'virtual:windi-base.css';
import "/@/design/index.less"

// Register icon sprite
import 'virtual:svg-icons-register';
import App from './App.vue';
import {createApp} from 'vue';
import {initAppConfigStore} from '/@/logics/initAppConfig';
import {setupRouter} from '/@/router';
import {setupStore} from '/@/store';
import {setupGlobDirectives} from '/@/directives';
import {setupI18n, i18n} from '/@/locales/setupI18n';
import ElementPlus from "element-plus"

Promise.all([
  import("virtual:windi-components.css"),
  import("element-plus/dist/index.css"),
]).then(() => {})

async function bootstrap() {
  const app = createApp(App);

  setupStore(app)
  const { registerDefaultCommands } = await import("/@/commands")
  registerDefaultCommands()
  initAppConfigStore()
  app.use(ElementPlus)
  app.use(i18n)
  setupRouter(app)
  setupGlobDirectives(app)
  app.mount("#app")

  import("/@/utils/tinydb/cache").then(({ initCacheListener }) => initCacheListener())

  const loadingEl = document.getElementById('app-loading');
  if (loadingEl) {
    loadingEl.classList.add('hidden');
  }

  setupI18n(app).catch(err => {
    console.warn('Failed to setup i18n:', err);
  });
}

function showBootstrapError(err: unknown) {
  const appEl = document.getElementById('app');
  const loadingEl = document.getElementById('app-loading');
  if (loadingEl) loadingEl.classList.add('hidden');
  if (appEl) {
    const msg = err instanceof Error ? err.message : String(err);
    appEl.innerHTML = `<div style="padding:24px;font-family:system-ui;color:#333;"><p style="color:#c00;font-weight:bold;">应用启动失败</p><pre style="background:#f5f5f5;padding:12px;overflow:auto;font-size:12px;">${msg}</pre></div>`;
  }
  console.error('bootstrap failed:', err);
}

bootstrap().catch(showBootstrapError);
