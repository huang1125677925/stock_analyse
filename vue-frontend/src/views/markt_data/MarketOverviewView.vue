<template>
  <div class="market-overview-view">
    <IndexDailybasicView embedded />
    <MajorIndexRpsView embedded />
  </div>
</template>

<script setup lang="ts">
import IndexDailybasicView from './IndexDailybasicView.vue'
import MajorIndexRpsView from './MajorIndexRpsView.vue'
</script>

<style scoped>
.market-overview-view {
  min-height: calc(100dvh - 104px);
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f4f6f8;
}

@media (max-width: 768px) {
  .market-overview-view {
    min-height: auto;
    padding: 8px;
    gap: 8px;
  }
}
</style>
