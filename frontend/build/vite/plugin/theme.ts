/**
 * Vite plugin for website theme color switching
 * https://github.com/anncwb/vite-plugin-theme
 */
import type { PluginOption } from 'vite';
import {
  viteThemePlugin,
  mixLighten,
  mixDarken,
  tinycolor,
} from 'vite-plugin-theme';
import { getThemeColors, generateColors } from '../../config/themeConfig';

export function configThemePlugin(_isBuild: boolean): PluginOption[] {
  const colors = generateColors({
    mixDarken,
    mixLighten,
    tinycolor,
  });
  const plugin = [
    viteThemePlugin({
      colorVariables: [...getThemeColors(), ...colors],
    }),
  ];

  return plugin as unknown as PluginOption[];
}
