/**
 *  Introduces component library styles on demand.
 *  https://github.com/anncwb/vite-plugin-style-import
 */
import { createStyleImportPlugin } from 'vite-plugin-style-import';

export function configStyleImportPlugin(_isBuild: boolean) {
  if (!_isBuild) {
    return [];
  }
  const styleImportPlugin = createStyleImportPlugin({
    libs: [],
  });
  return styleImportPlugin;
}
