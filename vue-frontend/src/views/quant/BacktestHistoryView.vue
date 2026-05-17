<template>
  <div class="backtest-history-view">
    <BacktestHistoryStats
      :total-count="pagination.total"
      :average-return="averageReturn"
      :highest-return-task="highestReturnTask"
      :lowest-return-task="lowestReturnTask"
      :strategy-distribution="strategyDistribution"
      :format-percent="formatPercent"
      :get-return-class="getReturnClass"
      @view-task="viewResult"
    />

    <BacktestTable
      :tasks="taskList"
      :pagination="pagination"
      :filter-form="filterForm"
      :loading="loading"
      :running-tasks="runningTasks"
      :checking-tasks="checkingTasks"
      :strategy-list="strategyList"
      @row-click="handleRowClick"
      @run-task="runTask"
      @copy-config="copyConfig"
      @check-status="checkStatus"
      @view-result="viewResult"
      @search="searchTasks"
      @reset="resetFilter"
      @refresh="refreshData"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
    
    <!-- 任务详情对话框 -->
    <BacktestDetailDialog
      v-model:visible="detailDialogVisible"
      :task="selectedTask"
      :running-tasks="runningTasks"
      :checking-tasks="checkingTasks"
      @run-task="runTask"
      @check-status="checkStatus"
      @view-result="viewResult"
    />
    
    <!-- 回测结果对话框 -->
    <BacktestResultDialog 
      v-model:visible="resultDialogVisible" 
      :task-id="selectedTaskId" 
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 回测历史页面
 * 功能：
 * 1. 显示历史回测任务列表
 * 2. 支持按策略、股票、状态筛选
 * 3. 支持状态查询和结果查看
 * 4. 支持运行已创建的任务
 * 
 * 重构说明：
 * - 逻辑抽离至 composables/useBacktestHistory.ts
 * - UI 拆分为 components/BacktestFilter.vue, BacktestTable.vue, BacktestDetailDialog.vue
 */
import { onMounted } from 'vue'
import BacktestResultDialog from '@/components/BacktestResultDialog.vue'
import BacktestHistoryStats from './components/BacktestHistoryStats.vue'
import BacktestTable from './components/BacktestTable.vue'
import BacktestDetailDialog from './components/BacktestDetailDialog.vue'
import { useBacktestHistory } from './composables/useBacktestHistory'

const {
  filterForm,
  pagination,
  taskList,
  strategyList,
  selectedTask,
  loading,
  detailDialogVisible,
  resultDialogVisible,
  selectedTaskId,
  runningTasks,
  checkingTasks,
  loadTaskList,
  loadStrategyList,
  searchTasks,
  resetFilter,
  refreshData,
  runTask,
  checkStatus,
  viewResult,
  handleRowClick,
  handleSizeChange,
  handleCurrentChange,
  copyConfig,
  averageReturn,
  highestReturnTask,
  lowestReturnTask,
  strategyDistribution,
  getReturnClass,
  formatPercent
} = useBacktestHistory()

// 页面初始化
onMounted(async () => {
  await Promise.all([
    loadStrategyList(),
    loadTaskList()
  ])
})
</script>

<style scoped>
.backtest-history-view {
  padding: 20px;
}
</style>
