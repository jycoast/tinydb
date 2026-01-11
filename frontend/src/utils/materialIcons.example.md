# Google Fonts Material Icons 使用指南

## 功能说明

本项目已集成 Google Fonts Material Icons 的按需加载功能，可以只加载实际使用的图标，减少资源加载。

## 使用方法

### 1. 在 FontIcon 组件中使用

`FontIcon` 组件已支持 Material Icons，使用以下格式：

```vue
<template>
  <!-- 使用 Material Symbols Outlined (默认) -->
  <FontIcon icon="material:home" />
  <FontIcon icon="material:settings" />
  <FontIcon icon="material:delete" />
  
  <!-- 使用 Material Icons (filled) -->
  <FontIcon icon="material-filled:home" />
  
  <!-- 带样式 -->
  <FontIcon icon="material:search" style="font-size: 20px; color: #409eff;" />
</template>
```

### 2. 直接使用 MaterialIcon 组件

```vue
<template>
  <MaterialIcon 
    icon="material:home" 
    :size="24" 
    color="#409eff"
    title="首页"
  />
</template>

<script setup>
import MaterialIcon from '/@/components/MaterialIcon.vue'
</script>
```

### 3. 编程方式加载图标

```typescript
import { loadMaterialIcons, preloadCommonIcons } from '/@/utils/materialIcons'

// 加载特定图标
loadMaterialIcons(['home', 'settings', 'delete'])

// 预加载常用图标
preloadCommonIcons()
```

## 图标名称格式

- `material:icon-name` - 使用 Material Symbols Outlined（轮廓样式）
- `material-filled:icon-name` - 使用 Material Icons（填充样式）

## 可用图标

访问 [Material Icons](https://fonts.google.com/icons) 查看所有可用图标。

常用图标示例：
- `home`, `settings`, `delete`, `edit`, `add`, `remove`
- `search`, `close`, `check`, `arrow_back`, `arrow_forward`
- `menu`, `more_vert`, `more_horiz`, `refresh`, `save`

## 优势

1. **按需加载**：只加载实际使用的图标，减少资源大小
2. **自动管理**：已加载的图标会被缓存，不会重复加载
3. **兼容现有代码**：可以与现有的 FontIcon 组件无缝集成

