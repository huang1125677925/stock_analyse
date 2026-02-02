<template>
  <div class="sw-industry-daily-view">
    <SwIndustryTrendChart 
      v-if="query.ts_code"
      :ts-code="query.ts_code"
      :industry-name="query.industry_name"
    />
    <el-alert v-else type="info" title="请提供行业代码 (ts_code)" :closable="false" />
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SwIndustryTrendChart from './components/SwIndustryTrendChart.vue'

const route = useRoute()

const query = reactive({
  ts_code: '',
  industry_name: ''
})

onMounted(() => {
  // 从路由参数获取 ts_code
  const tsCode = route.query.ts_code as string
  const industryName = route.query.industry_name as string
  
  if (tsCode) {
    query.ts_code = tsCode
    if (industryName) query.industry_name = industryName
  }
})
</script>

<style scoped>
.sw-industry-daily-view {
  padding: 12px;
}
</style>