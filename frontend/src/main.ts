// 关键样式 - 立即加载
import 'virtual:windi-base.css';
import '/@/design/index.less';
import '/@/design/tinydb.less'

// Register icon sprite
import 'virtual:svg-icons-register';
import App from './App.vue';
import {createApp} from 'vue';
import {initAppConfigStore} from '/@/logics/initAppConfig';
import {setupRouter} from '/@/router';
import {setupStore} from '/@/store';
import {setupGlobDirectives} from '/@/directives';
import {setupI18n, i18n} from '/@/locales/setupI18n';
import {registerGlobComp} from '/@/components/registerGlobComp';
import {isDevMode} from './utils/env'

// 引入 Element Plus
import ElementPlus from 'element-plus';

// 延迟加载非关键样式，不阻塞初始渲染
Promise.all([
  import('virtual:windi-components.css'),
  import('element-plus/dist/index.css')
]).then(() => {
  // 样式加载完成
});

// 开发模式下延迟加载 Ant Design Vue 样式
if (isDevMode()) {
  import('ant-design-vue/es/style').catch(() => {});
}

async function bootstrap() {
  const app = createApp(App);

  // Configure store
  // 配置 store
  setupStore(app);

  // 注册内置命令（新建连接等）
  await import('/@/commands/stdCommands');

  // Initialize internal system configuration
  // 初始化内部系统配置
  initAppConfigStore();

  // Register Element Plus
  // 注册 Element Plus
  app.use(ElementPlus);

  // Register global components
  // 注册全局组件
  registerGlobComp(app);

  // 先注册默认的 i18n 实例（避免 App.vue 中使用时出错）
  // Register default i18n instance first (to avoid errors when App.vue uses it)
  app.use(i18n);

  // Configure routing
  // 配置路由 - 先设置路由，让应用可以立即渲染
  setupRouter(app);

  // Register global directive
  // 注册全局指令
  setupGlobDirectives(app);

  // 先挂载应用，让用户看到界面
  app.mount('#app');
  
  // 隐藏加载占位符
  const loadingEl = document.getElementById('app-loading');
  if (loadingEl) {
    loadingEl.classList.add('hidden');
  }

  // Multilingual configuration - 延迟加载语言文件，不阻塞初始渲染
  // 多语言配置 - 异步加载语言文件，不阻塞初始渲染
  setupI18n(app).catch(err => {
    console.warn('Failed to setup i18n:', err);
  });
}

bootstrap();
