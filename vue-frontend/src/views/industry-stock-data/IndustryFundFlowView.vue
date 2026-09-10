<template>
  <div class="industry-fund-flow-view">
    <section class="fund-flow-panel">
      <div class="panel-header">
        <div class="panel-title">行业资金流量</div>
      </div>
      <FundFlowAnalysis :selected-industries="[]" />
    </section>
  </div>
</template>

<script setup lang="ts">
import FundFlowAnalysis from '@/components/FundFlowAnalysis.vue'
</script>

<style scoped>
.industry-fund-flow-view {
  min-height: calc(100dvh - 104px);
  padding: 12px 16px 16px;
  background: #f4f6f8;
}

.fund-flow-panel {
  min-height: calc(100dvh - 132px);
  padding: 12px 14px 16px;
  background: #ffffff;
  border: 1px solid #e1e6ee;
  border-radius: 6px;
}

.panel-header {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e8edf3;
}

.panel-title {
  font-size: 17px;
  font-weight: 600;
  color: #172033;
}

@media (max-width: 768px) {
  .industry-fund-flow-view {
    min-height: auto;
    padding: 8px;
  }

  .fund-flow-panel {
    min-height: auto;
    border-radius: 0;
    padding: 10px;
  }
}
</style>
