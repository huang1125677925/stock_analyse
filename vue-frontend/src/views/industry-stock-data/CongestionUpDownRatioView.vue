<template>
  <div class="congestion-page">
    <el-card>
      <div class="header-controls">
        <h3>行业涨跌比分析</h3>
      </div>
      <IndustryUpDownRatioAnalysis />
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 行业涨跌比分析页面
 * 功能：
 * - 承载行业涨跌比分析组件
 * - 统一提供页面级标题与布局容器
 * 参数：无
 * 返回值：无
 * 事件：无
 */
import IndustryUpDownRatioAnalysis from '@/components/IndustryUpDownRatioAnalysis.vue'
</script>

<style scoped lang="scss">
.congestion-page { padding: 20px; }
.header-controls { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.header-controls h3 { margin:0; color:#303133; }
@media (max-width: 768px) { .congestion-page { padding:12px; } }
</style>
