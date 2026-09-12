<template>
  <div class="congestion-page">
    <!--
      不再渲染页面级标题：筛选条与说明已由 IndustryBreadthAnalysis 内部以单行紧凑形式提供，
      让页面纵向空间尽量留给热力图
    -->
    <IndustryBreadthAnalysis
      v-model:selected-industries="selectedIndustries"
      @industries-loaded="onIndustriesLoaded"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 市场宽度分析页面
 * 功能：
 * - 承载市场宽度热力图分析组件
 * - 提供行业筛选功能（v-model 透传到热力图组件内的单行筛选条），支持多选只看关注的行业
 * - 筛选列表由获取到的实际数据驱动，而非独立接口
 * 参数：无
 * 返回值：无
 * 事件：无
 */
import { ref } from 'vue'
import IndustryBreadthAnalysis from '@/components/IndustryBreadthAnalysis.vue'

const selectedIndustries = ref<string[]>([])

/**
 * 当热力图数据重新加载后，清除已选中但不再存在于新列表中的行业（比如切换板块类型/层级后）。
 * 行业下拉的选项由组件内部的 rawIndustryNames（实际数据）驱动，无需页面再维护一份列表。
 */
const onIndustriesLoaded = (industries: string[]) => {
  if (selectedIndustries.value.length === 0) return
  const validSet = new Set(industries)
  selectedIndustries.value = selectedIndustries.value.filter(name => validSet.has(name))
}
</script>

<style scoped lang="scss">
.congestion-page {
  padding: 0;
}
</style>
