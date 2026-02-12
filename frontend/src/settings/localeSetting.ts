import type { LocaleSetting, LocaleType } from '/#/config';

export const LOCALE: { [key: string]: LocaleType } = {
  ZH_CN: 'zh_CN',
  EN_US: 'en',
};

export const localeSetting: LocaleSetting = {
  showPicker: true,
  locale: LOCALE.ZH_CN,
  fallback: LOCALE.ZH_CN,
  availableLocales: [LOCALE.ZH_CN, LOCALE.EN_US],
};

export interface DropMenu {
  onClick?: Fn
  to?: string
  icon?: string
  event: string | number
  text: string
  disabled?: boolean
  divider?: boolean
}

export const localeList: DropMenu[] = [
  {
    text: '简体中文',
    event: LOCALE.ZH_CN,
  },
  {
    text: 'English',
    event: LOCALE.EN_US,
  },
];
