<template>
  <div class="congestion-page">
    <IndexRpsView />
  </div>
</template>

<script setup lang="ts">
/**
 * 组件：行业热点-指数RPS页面包装器（CongestionIndexRpsView）
 * 功能：复用指数RPS主视图，用于行业热点导航入口，避免重复实现页面逻辑
 * 参数：无
 * 返回值：无（渲染 IndexRpsView 页面内容）
 * 事件：无
 */
import IndexRpsView from '@/views/strategy/IndexRpsView.vue'
</script>

<style scoped lang="scss">
.congestion-page { padding: 20px; }
@media (max-width: 768px) { .congestion-page { padding:12px; } }
</style>
