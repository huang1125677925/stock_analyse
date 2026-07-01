<template>
  <div class="market-fund-flow-view">
    <el-card class="page-header" shadow="hover">
      <template #header>
        <div class="header-content">
          <div>
            <h2>大盘资金分析</h2>
            <p class="page-desc">基于指定时间范围展示大盘不同资金对象的净流入变化，并同步观察上证综指、深证成指点位与涨跌幅。</p>
          </div>
        </div>
      </template>
    </el-card>

    <MarketFundFlowTrendAnalysis />
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：MarketFundFlowView
 * 功能：
 * - 作为大盘概览下的大盘资金分析页面入口
 * - 承载大盘资金趋势分析组件，统一展示页面标题与说明
 * 参数（props）：无
 * 返回值：无
 * 事件（emits）：无
 */
import MarketFundFlowTrendAnalysis from '@/components/MarketFundFlowTrendAnalysis.vue'
</script>

<style scoped lang="scss">
.market-fund-flow-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-content h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.page-desc {
  margin: 8px 0 0;
  color: #606266;
  line-height: 1.6;
}
</style>
