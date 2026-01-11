import type { App } from 'vue';
import type { I18n, I18nOptions } from 'vue-i18n';

import { createI18n } from 'vue-i18n';
import { setHtmlPageLang, setLoadLocalePool } from './helper';
import { localeSetting } from '/@/settings/localeSetting';
import { useLocaleStoreWithOut } from '/@/store/modules/locale';

const { fallback, availableLocales } = localeSetting;

// 先创建一个默认的 i18n 实例，避免在异步加载完成前访问 undefined
export let i18n: ReturnType<typeof createI18n> = createI18n({
  legacy: false,
  locale: fallback,
  fallbackLocale: fallback,
  messages: {},
  availableLocales: availableLocales,
  sync: true,
  silentTranslationWarn: true,
  missingWarn: false,
  silentFallbackWarn: true,
}) as I18n;

async function createI18nOptions(): Promise<I18nOptions> {
  const localeStore = useLocaleStoreWithOut();
  const locale = localeStore.getLocale;
  const defaultLocal = await import(`./lang/${locale}.ts`);
  const message = defaultLocal.default?.message ?? {};

  setHtmlPageLang(locale);
  setLoadLocalePool((loadLocalePool) => {
    loadLocalePool.push(locale);
  });

  return {
    legacy: false,
    locale,
    fallbackLocale: fallback,
    messages: {
      [locale]: message,
    },
    availableLocales: availableLocales,
    sync: true, //If you don’t want to inherit locale from global scope, you need to set sync of i18n component option to false.
    silentTranslationWarn: true, // true - warning off
    missingWarn: false,
    silentFallbackWarn: true,
  };
}

// setup i18n instance with glob
export async function setupI18n(app: App) {
  const options = await createI18nOptions();
  
  // 如果 app 已经挂载（i18n 已经注册），更新现有的 i18n 实例
  if (i18n && app._instance) {
    // 更新消息
    Object.keys(options.messages).forEach(locale => {
      i18n.global.setLocaleMessage(locale, options.messages[locale]);
    });
    // 更新 locale
    if (i18n.mode === 'legacy') {
      i18n.global.locale = options.locale;
    } else {
      (i18n.global.locale as any).value = options.locale;
    }
  } else {
    // 如果 app 还未挂载，创建新的 i18n 实例并注册
    i18n = createI18n(options) as I18n;
    app.use(i18n);
  }
}
