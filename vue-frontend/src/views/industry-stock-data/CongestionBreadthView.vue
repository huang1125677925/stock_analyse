<template>
  <div class="congestion-page">
    <el-card>
      <div class="header-controls">
        <h3>市场宽度分析</h3>
        <IndustryFilter v-model="selectedIndustries" />
      </div>
      <IndustryBreadthAnalysis :selected-industries="selectedIndustries" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 市场宽度分析页面
 * 功能：
 * - 承载市场宽度热力图分析组件
 * - 提供行业筛选功能，支持多选只看关注的行业
 * - 统一提供页面级标题与布局容器
 * 参数：无
 * 返回值：无
 * 事件：无
 */
import { ref } from 'vue'
import IndustryBreadthAnalysis from '@/components/IndustryBreadthAnalysis.vue'
import IndustryFilter from '@/components/IndustryFilter.vue'

const selectedIndustries = ref<string[]>([])
</script>

<style scoped lang="scss">
.congestion-page { padding: 20px; }
.header-controls { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.header-controls h3 { margin:0; color:#303133; }
@media (max-width: 768px) { .congestion-page { padding:12px; } }
</style>
