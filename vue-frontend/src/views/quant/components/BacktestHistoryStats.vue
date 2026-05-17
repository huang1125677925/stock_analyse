<template>
  <div class="history-stats">
    <el-card class="stats-card">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">回测总次数</div>
          <div class="stat-value">{{ totalCount }}</div>
        </div>

        <div class="stat-item">
          <div class="stat-label">回测平均收益率</div>
          <div class="stat-value" :class="getReturnClass(averageReturn ?? 0)">
            {{ formatPercent(averageReturn) }}
          </div>
        </div>

        <div class="stat-item clickable" :class="{ disabled: !highestReturnTask }" @click="handleTaskClick(highestReturnTask)">
          <div class="stat-label">回测最高收益率</div>
          <div class="stat-value positive">{{ formatPercent(highestReturnTask?.result_summary?.total_return) }}</div>
          <div v-if="highestReturnTask" class="stat-detail">
            {{ highestReturnTask.stock_name || highestReturnTask.stock_code }} ({{ highestReturnTask.stock_code }})
          </div>
          <div v-else class="stat-detail">暂无数据</div>
        </div>

        <div class="stat-item clickable" :class="{ disabled: !lowestReturnTask }" @click="handleTaskClick(lowestReturnTask)">
          <div class="stat-label">回测最低收益率</div>
          <div class="stat-value negative">{{ formatPercent(lowestReturnTask?.result_summary?.total_return) }}</div>
          <div v-if="lowestReturnTask" class="stat-detail">
            {{ lowestReturnTask.stock_name || lowestReturnTask.stock_code }} ({{ lowestReturnTask.stock_code }})
          </div>
          <div v-else class="stat-detail">暂无数据</div>
        </div>
      </div>
    </el-card>

    <el-card class="distribution-card">
      <template #header>
        <div class="distribution-header">
          <span>回测策略分布</span>
        </div>
      </template>

      <div v-if="strategyDistribution.length" class="distribution-list">
        <div v-for="item in strategyDistribution" :key="item.strategyName" class="distribution-item">
          <div class="distribution-meta">
            <div class="distribution-name" :title="item.displayName">{{ item.displayName }}</div>
            <div class="distribution-values">
              <span class="distribution-count">{{ item.count }} 次</span>
              <span class="distribution-percent">{{ item.percentage }}%</span>
            </div>
          </div>
          <div class="distribution-bar-track">
            <div class="distribution-bar-fill" :style="{ width: `${item.percentage}%` }" />
          </div>
          <div class="distribution-stats">
            <div class="distribution-stat">
              <span class="distribution-stat-label">平均收益</span>
              <span class="distribution-stat-value" :class="getReturnClass(item.averageReturn ?? 0)">
                {{ formatPercent(item.averageReturn) }}
              </span>
            </div>
            <div class="distribution-stat">
              <span class="distribution-stat-label">最大收益</span>
              <span class="distribution-stat-value positive">
                {{ formatPercent(item.maxReturn) }}
              </span>
            </div>
            <div class="distribution-stat">
              <span class="distribution-stat-label">最小收益</span>
              <span class="distribution-stat-value negative">
                {{ formatPercent(item.minReturn) }}
              </span>
            </div>
            <div class="distribution-stat">
              <span class="distribution-stat-label">平均回撤</span>
              <span class="distribution-stat-value negative">
                {{ formatPercent(item.averageDrawdown) }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无策略分布数据" :image-size="60" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import type { BacktestTask } from '@/services/quantBacktestApi'

interface StrategyDistributionItem {
  strategyName: string
  displayName: string
  count: number
  percentage: number
  averageReturn: number | null
  maxReturn: number | null
  minReturn: number | null
  averageDrawdown: number | null
}

const props = defineProps<{
  totalCount: number
  averageReturn: number | null
  highestReturnTask: BacktestTask | null
  lowestReturnTask: BacktestTask | null
  strategyDistribution: StrategyDistributionItem[]
  formatPercent: (value: number | null | undefined) => string
  getReturnClass: (value: number) => string
}>()

const emit = defineEmits<{
  (e: 'view-task', taskId: string): void
}>()

const handleTaskClick = (task: BacktestTask | null) => {
  if (!task) return
  emit('view-task', task.task_id)
}
</script>

<style scoped>
.history-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-item {
  padding: 18px;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid #e4ecf5;
}

.stat-item.clickable {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-item.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(64, 158, 255, 0.12);
}

.stat-item.disabled {
  cursor: default;
}

.stat-item.disabled:hover {
  transform: none;
  box-shadow: none;
}

.stat-label {
  margin-bottom: 10px;
  color: #909399;
  font-size: 13px;
}

.stat-value {
  color: #1f2937;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-detail {
  margin-top: 10px;
  color: #606266;
  font-size: 13px;
  line-height: 1.4;
}

.positive {
  color: #e20725;
}

.negative {
  color: #0a11dd;
}

.distribution-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 280px;
  overflow: auto;
}

.distribution-item {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fafcff;
  border: 1px solid #edf2f7;
}

.distribution-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.distribution-name {
  color: #303133;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.distribution-values {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.distribution-count,
.distribution-percent {
  color: #606266;
  font-size: 12px;
}

.distribution-bar-track {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #edf2f7;
  overflow: hidden;
}

.distribution-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #60a5fa 0%, #2563eb 100%);
}

.distribution-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  margin-top: 8px;
}

.distribution-stat {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.distribution-stat-label {
  color: #909399;
  font-size: 12px;
}

.distribution-stat-value {
  font-size: 12px;
  font-weight: 600;
  text-align: right;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .distribution-stats {
    grid-template-columns: 1fr;
  }
}
</style>
