<template>
  <div class="widgetsInnerContainer">
    <slot></slot>
  </div>
</template>

<style scoped>
.widgetsInnerContainer {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  width: 100%;
}
</style>
