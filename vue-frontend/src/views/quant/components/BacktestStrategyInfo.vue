<template>
  <el-card v-if="taskInfo" class="strategy-card">
    <template #header>
      <div class="card-header">
        <span class="card-title">策略信息</span>
      </div>
    </template>

    <div class="strategy-content">
      <div class="strategy-summary">
        <div class="summary-item">
          <span class="summary-label">策略名称</span>
          <span class="summary-value">{{ taskInfo.strategy_name }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">策略说明</span>
          <span class="summary-value">{{ strategyDefinition?.description || '暂无策略说明' }}</span>
        </div>
      </div>

      <div class="params-section">
        <div class="params-title">策略参数</div>
        <div v-if="paramEntries.length" class="params-grid">
          <div v-for="item in paramEntries" :key="item.key" class="param-item">
            <div class="param-header">
              <span class="param-key">{{ item.key }}</span>
              <span v-if="item.description" class="param-description">{{ item.description }}</span>
            </div>
            <div class="param-value">{{ item.value }}</div>
          </div>
        </div>
        <el-empty v-else description="该回测未配置策略参数" :image-size="56" />
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BacktestResult, Strategy } from '@/services/quantBacktestApi'

const props = defineProps<{
  taskInfo: BacktestResult['task_info'] | null
  strategyDefinition: Strategy | null
}>()

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const paramEntries = computed(() => {
  const params = props.taskInfo?.strategy_params ?? {}
  const definitions = props.strategyDefinition?.params ?? {}

  return Object.entries(params).map(([key, value]) => ({
    key,
    value: formatValue(value),
    description: definitions[key]?.description || ''
  }))
})
</script>

<style scoped>
.strategy-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.strategy-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.strategy-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.summary-item {
  padding: 16px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #ebeef5;
}

.summary-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #909399;
}

.summary-value {
  color: #303133;
  line-height: 1.6;
  word-break: break-word;
}

.params-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.params-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.param-item {
  padding: 14px 16px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #ebeef5;
}

.param-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.param-key {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.param-description {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.param-value {
  color: #606266;
  line-height: 1.6;
  word-break: break-word;
}

@media (max-width: 768px) {
  .strategy-summary {
    grid-template-columns: 1fr;
  }
}
</style>
