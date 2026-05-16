<template>
  <div class="congestion-page">
    <IndustryScaleBreadthPanel panel-type="breadth" />
  </div>
</template>

<script setup lang="ts">
import IndustryScaleBreadthPanel from '@/components/IndustryScaleBreadthPanel.vue'
</script>

<style scoped lang="scss">
.congestion-page { padding: 20px; }
@media (max-width: 768px) { .congestion-page { padding:12px; } }
</style>
