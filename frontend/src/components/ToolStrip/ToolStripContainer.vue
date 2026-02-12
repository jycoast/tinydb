<template>
  <div class="toolstrip">
    <slot name="toolstrip"></slot>
  </div>
  <div class="content">
    <slot></slot>
  </div>
</template>

<style scoped>
.content {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: var(--dim-toolstrip-height);
  display: flex;
  min-height: 0;
}

.toolstrip {
  position: absolute;
  left: 0;
  height: var(--dim-toolstrip-height);
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  background: var(--theme-bg-1);
  border-top: 1px solid var(--theme-border);
}
</style>
