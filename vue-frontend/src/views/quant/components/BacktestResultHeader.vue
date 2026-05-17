<template>
  <div class="page-header">
    <div class="header-left">
      <el-button type="primary" class="back-button" @click="$emit('back')">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <div class="header-content">
        <h1>回测结果详情</h1>
      </div>
    </div>
    <div v-if="taskInfo" class="header-right">
      <div class="highlight-primary">{{ taskInfo.stock_name }} ({{ taskInfo.stock_code }})</div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件功能：
 * - 展示回测结果页头部信息与返回按钮
 * 参数：
 * - taskInfo: 任务基础信息（策略名、股票名、股票代码等）
 * 返回值：
 * - 无
 * 事件：
 * - back: 点击返回按钮时触发
 */
import { ArrowLeft } from '@element-plus/icons-vue'
import type { BacktestResult } from '@/services/quantBacktestApi'

defineProps<{
  taskInfo: BacktestResult['task_info'] | null
}>()

defineEmits<{
  (e: 'back'): void
}>()
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}

.back-button {
  flex-shrink: 0;
}

.header-content {
  min-width: 0;
}

.header-content h1 {
  margin: 0;
  color: #303133;
  font-size: 24px;
  line-height: 1.2;
}

.header-right {
  margin-left: auto;
  text-align: right;
  flex-shrink: 0;
}

.highlight-primary {
  margin-bottom: 0;
  color: #1f2937;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-left {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-right {
    width: 100%;
    margin-left: 0;
    text-align: left;
  }

  .highlight-primary {
    font-size: 24px;
  }
}
</style>
