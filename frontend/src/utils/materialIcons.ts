/**
 * Google Fonts Material Icons 按需加载工具
 * 使用 Google Fonts CSS2 API 按需加载特定图标
 */

// 已加载的图标集合
const loadedIcons = new Set<string>();
let linkElement: HTMLLinkElement | null = null;

/**
 * 加载指定的 Material Icons
 * @param icons 图标名称数组，例如 ['home', 'settings', 'delete']
 */
export function loadMaterialIcons(icons: string[]): void {
  if (!icons || icons.length === 0) return;

  // 过滤出未加载的图标
  const newIcons = icons.filter(icon => !loadedIcons.has(icon));
  if (newIcons.length === 0) return;

  // 将新图标添加到已加载集合
  newIcons.forEach(icon => loadedIcons.add(icon));

  // 使用 Google Fonts 的标准方式加载 Material Icons
  // 由于 Google Fonts 不支持按图标名称加载，我们加载整个字体
  // 但只在第一次加载时添加 link 标签
  if (!linkElement) {
    linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.id = 'material-icons-font';
    // 使用 Material Symbols Outlined (推荐使用，更现代)
    linkElement.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
    linkElement.crossOrigin = 'anonymous';
    document.head.appendChild(linkElement);
    
    // 同时加载 Material Icons (filled 样式)
    const filledLink = document.createElement('link');
    filledLink.rel = 'stylesheet';
    filledLink.id = 'material-icons-filled-font';
    filledLink.href = 'https://fonts.googleapis.com/css2?family=Material+Icons';
    filledLink.crossOrigin = 'anonymous';
    document.head.appendChild(filledLink);
  }
}

/**
 * 预加载常用图标
 */
export function preloadCommonIcons(): void {
  const commonIcons = [
    'home', 'settings', 'delete', 'edit', 'add', 'remove',
    'search', 'close', 'check', 'arrow_back', 'arrow_forward',
    'menu', 'more_vert', 'more_horiz', 'refresh', 'save'
  ];
  loadMaterialIcons(commonIcons);
}

/**
 * 使用 Material Icons 的图标名称
 * 支持两种格式：
 * - 'material:home' - 使用 Material Symbols Outlined
 * - 'material-filled:home' - 使用 Material Symbols (filled)
 */
export function isMaterialIcon(icon: string): boolean {
  return icon.startsWith('material:') || icon.startsWith('material-filled:');
}

/**
 * 从图标名称中提取 Material Icon 名称
 */
export function getMaterialIconName(icon: string): string | null {
  if (icon.startsWith('material:')) {
    return icon.replace('material:', '');
  }
  if (icon.startsWith('material-filled:')) {
    return icon.replace('material-filled:', '');
  }
  return null;
}

/**
 * 获取 Material Icon 的类名
 */
export function getMaterialIconClass(icon: string): string {
  if (icon.startsWith('material-filled:')) {
    return 'material-icons';
  }
  return 'material-symbols-outlined';
}

