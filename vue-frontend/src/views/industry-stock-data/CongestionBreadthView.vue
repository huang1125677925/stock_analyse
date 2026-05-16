<template>
  <div class="congestion-page">
    <el-card>
      <div class="header-controls">
        <h3>行业宽度分析</h3>
      </div>
      <IndustryBreadthAnalysis />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import IndustryBreadthAnalysis from '@/components/IndustryBreadthAnalysis.vue'
</script>

<style scoped lang="scss">
.congestion-page { padding: 20px; }
.header-controls { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.header-controls h3 { margin:0; color:#303133; }
@media (max-width: 768px) { .congestion-page { padding:12px; } }
</style>
