<template>
  <div class="market-overview-view">
    <div class="overview-grid">
      <IndexDailybasicView embedded />
      <MajorIndexRpsView embedded />
    </div>
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
  background: #f4f6f8;
}

/* 大盘指数估值与大平台指数 RPS 左右各占一半，窄屏再回退为上下堆叠 */
.overview-grid {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.overview-grid > * {
  flex: 1 1 50%;
  min-width: 0;
}

/* 堆叠时必须让两栏占满整宽：列方向下 align-items 会退化为横向，若沿用 flex-start
   子项将按内容宽度（ECharts canvas / 表格列宽）撑开，导致宽度失控 */
@media (max-width: 1200px) {
  .overview-grid {
    flex-direction: column;
    align-items: stretch;
  }

  .overview-grid > * {
    width: 100%;
    flex: 0 0 auto;
  }
}

@media (max-width: 768px) {
  .market-overview-view {
    min-height: auto;
    padding: 8px;
  }

  .overview-grid {
    gap: 8px;
  }
}
</style>
