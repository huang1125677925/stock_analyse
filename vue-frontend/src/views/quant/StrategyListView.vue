<template>
  <div class="strategy-list-view">
    <el-card class="strategy-overview-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <div class="header-copy">
            <span class="header-title">可用回测策略</span>
            <span class="header-subtitle">直接查看全部策略、参数和默认值</span>
          </div>
          <el-button type="primary" @click="goToCreateBacktest">创建回测任务</el-button>
        </div>
      </template>

      <div v-if="strategyList.length === 0 && !loading" class="empty-data">
        <el-empty description="暂无可用策略" />
      </div>

      <div v-else class="strategy-grid">
        <el-card v-for="strategy in strategyList" :key="strategy.name" shadow="hover" class="strategy-card">
          <div class="strategy-card-top">
            <div class="strategy-head">
              <h3>{{ strategy.name }}</h3>
              <code class="strategy-name">{{ strategy.name }}</code>
            </div>
            <el-button link type="primary" @click="goToCreateBacktestWithStrategy(strategy.name)">
              创建回测
            </el-button>
          </div>

          <p class="strategy-description">{{ strategy.description || '暂无策略说明' }}</p>

          <div class="strategy-summary">
            <span class="summary-pill">{{ getParamCount(strategy) }} 个参数</span>
          </div>

          <div v-if="formatStrategyParams(strategy.params).length" class="param-list">
            <div v-for="param in formatStrategyParams(strategy.params)" :key="`${strategy.name}-${param.name}`" class="param-item">
              <div class="param-main">
                <div class="param-title-row">
                  <span class="param-name">{{ param.name }}</span>
                  <span class="param-type">{{ param.type }}</span>
                </div>
                <p class="param-description">{{ param.description || '暂无参数说明' }}</p>
              </div>
              <div class="param-default">
                <span class="default-label">默认值</span>
                <span class="default-value">{{ param.default }}</span>
              </div>
            </div>
          </div>

          <div v-else class="no-param-state">
            该策略无需额外参数
          </div>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getStrategies, type Strategy } from '@/services/quantBacktestApi'

interface StrategyParamItem {
  name: string
  description: string
  type: string
  default: string
}

const router = useRouter()
const strategyList = ref<Strategy[]>([])
const loading = ref(false)

const formatStrategyParams = (params?: Record<string, any>): StrategyParamItem[] => {
  if (!params) return []

  return Object.entries(params).map(([key, value]) => ({
    name: key,
    description: value.description || '',
    type: value.type || '-',
    default: typeof value.default === 'object' ? JSON.stringify(value.default) : String(value.default)
  }))
}

const getParamCount = (strategy: Strategy): number => formatStrategyParams(strategy.params).length

const goToCreateBacktest = () => {
  router.push('/backtest-strategy')
}

const goToCreateBacktestWithStrategy = (strategyName: string) => {
  router.push({
    path: '/backtest-strategy',
    query: { strategy: strategyName }
  })
}

const loadStrategyList = async () => {
  loading.value = true
  try {
    const strategies = await getStrategies()
    strategyList.value = strategies
  } catch (error) {
    console.error('加载策略列表失败:', error)
    ElMessage.error('加载策略列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStrategyList()
})
</script>

<style scoped>
.strategy-list-view {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.header-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title {
  color: #111827;
  font-size: 18px;
  font-weight: 700;
}

.header-subtitle {
  color: #6b7280;
  font-size: 13px;
}

.empty-data {
  padding: 32px 0;
}

.strategy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.strategy-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
}

:deep(.strategy-card .el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  padding: 16px;
}

.strategy-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.strategy-head {
  min-width: 0;
}

.strategy-head h3 {
  margin: 0 0 6px;
  color: #111827;
  font-size: 18px;
  line-height: 1.35;
}

.strategy-description {
  margin: -4px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.strategy-name {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
}

.strategy-summary {
  display: flex;
  align-items: center;
}

.summary-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 12px;
  font-weight: 600;
}

.param-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.param-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #edf2f7;
}

.param-main {
  min-width: 0;
}

.param-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.param-name {
  color: #111827;
  font-size: 14px;
  font-weight: 700;
}

.param-type {
  padding: 2px 6px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.param-description {
  margin: 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}

.param-default {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 88px;
}

.default-label {
  color: #9ca3af;
  font-size: 11px;
}

.default-value {
  max-width: 180px;
  color: #1f2937;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  word-break: break-word;
}

.no-param-state {
  padding: 12px;
  border-radius: 10px;
  background: #f9fafb;
  color: #6b7280;
  font-size: 13px;
}

@media (max-width: 900px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .strategy-grid {
    grid-template-columns: 1fr;
  }

  .param-item {
    grid-template-columns: 1fr;
  }

  .param-default {
    align-items: flex-start;
  }

  .default-value {
    max-width: none;
    text-align: left;
  }
}
</style>
