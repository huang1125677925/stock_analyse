<template>
  <div class="congestion-page">
    <el-card>
      <div class="header-controls">
        <h3>行业资金流</h3>
        <IndustryFilter v-model="selectedIndustries" />
      </div>
      <FundFlowAnalysis :selected-industries="selectedIndustries" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 行业资金流页面
 * 功能：
 * - 承载行业资金流分析组件
 * - 提供行业筛选功能，支持多选只看关注的行业
 * - 统一提供页面级标题与布局容器
 * 参数：无
 * 返回值：无
 * 事件：无
 */
import { ref } from 'vue'
import FundFlowAnalysis from '@/components/FundFlowAnalysis.vue'
import IndustryFilter from '@/components/IndustryFilter.vue'

const selectedIndustries = ref<string[]>([])
</script>

<style scoped lang="scss">
.congestion-page { padding: 20px; }
.header-controls { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.header-controls h3 { margin:0; color:#303133; }
@media (max-width: 768px) { .congestion-page { padding:12px; } }
</style>
