<template>
  <div class="congestion-page">
    <el-card shadow="never">
      <div class="header-controls">
        <h3>市场宽度分析</h3>
        <IndustryFilter v-model="selectedIndustries" :industries="availableIndustries" />
      </div>
      <IndustryBreadthAnalysis
        :selected-industries="selectedIndustries"
        @industries-loaded="onIndustriesLoaded"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 市场宽度分析页面
 * 功能：
 * - 承载市场宽度热力图分析组件
 * - 提供行业筛选功能，支持多选只看关注的行业
 * - 筛选列表由获取到的实际数据驱动，而非独立接口
 * - 统一提供页面级标题与布局容器
 * 参数：无
 * 返回值：无
 * 事件：无
 */
import { ref } from 'vue'
import IndustryBreadthAnalysis from '@/components/IndustryBreadthAnalysis.vue'
import IndustryFilter from '@/components/IndustryFilter.vue'

const selectedIndustries = ref<string[]>([])
const availableIndustries = ref<string[]>([])

/**
 * 当数据加载完成后，更新可用的行业列表，
 * 并清除已选中但不再存在于新列表中的行业（比如切换板块类型后）。
 */
const onIndustriesLoaded = (industries: string[]) => {
  availableIndustries.value = industries
  if (selectedIndustries.value.length > 0) {
    const validSet = new Set(industries)
    selectedIndustries.value = selectedIndustries.value.filter(name => validSet.has(name))
  }
}
</script>

<style scoped lang="scss">
.congestion-page {
  padding: 0;

  // 去掉 el-card 的边框、圆角和阴影
  :deep(.el-card) {
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  // 去掉 el-card 的 header 和 body 的左右 padding
  :deep(.el-card__header),
  :deep(.el-card__body) {
    padding-left: 0;
    padding-right: 0;
  }
}

.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.header-controls h3 {
  margin: 0;
  color: #303133;
}

@media (max-width: 768px) {
  .congestion-page {
    padding: 0;
  }

  .header-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}
</style>
