<template>
  <div class="backtest-result-view">
    <BacktestResultHeader :task-info="taskInfo" @back="goBack" />

    <div v-loading="loading" class="content-container">
      <BacktestStrategyInfo
        :task-info="taskInfo"
        :strategy-definition="strategyDefinition"
      />

      <BacktestResultStats
        :task-info="taskInfo"
        :backtest-result="backtestResult"
        :format-date="formatDate"
        :format-money="formatMoney"
        :format-percent="formatPercent"
        :get-return-class="getReturnClass"
      />

      <BacktestResultCharts :observer-data="observerData" :raw-indicator-data="rawIndicatorData" />

      <BacktestResultTradeSummary
        :filtered-trades-total="filteredTradesTotal"
        :buy-trades-count="buyTradesCount"
        :sell-trades-count="sellTradesCount"
        :total-trade-amount="totalTradeAmount"
        :format-money="formatMoney"
      />

      <BacktestResultTrades
        :trades="filteredTrades"
        :format-date="formatDate"
        :format-money="formatMoney"
        :format-percent="formatPercent"
        :get-return-class="getReturnClass"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件功能：
 * - 回测结果页面容器，负责组装头部、统计、图表、交易汇总与交易明细模块
 * 参数：
 * - 无（通过路由参数 taskId 在组合式函数内部获取）
 * 返回值：
 * - 无
 * 事件：
 * - 无
 */
import { onMounted } from 'vue'
import BacktestResultHeader from './components/BacktestResultHeader.vue'
import BacktestStrategyInfo from './components/BacktestStrategyInfo.vue'
import BacktestResultStats from './components/BacktestResultStats.vue'
import BacktestResultCharts from './components/BacktestResultCharts.vue'
import BacktestResultTradeSummary from './components/BacktestResultTradeSummary.vue'
import BacktestResultTrades from './components/BacktestResultTrades.vue'
import { useBacktestResult } from './composables/useBacktestResult'

const {
  loading,
  taskInfo,
  strategyDefinition,
  backtestResult,
  observerData,
  rawIndicatorData,
  filteredTrades,
  filteredTradesTotal,
  buyTradesCount,
  sellTradesCount,
  totalTradeAmount,
  getReturnClass,
  formatPercent,
  formatMoney,
  formatDate,
  goBack,
  initializePage
} = useBacktestResult()

onMounted(async () => {
  await initializePage()
})
</script>

<style scoped>
.backtest-result-view {
  padding: 20px;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.content-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
