<template>
  <div class="index-analysis">
    <el-card class="mt-16" shadow="hover">
      <template #header>
        <div class="chart-header">
          <h3>指数趋势（成交量/额/收盘价）</h3>
          <div class="chart-controls">
            <el-select v-model="selectedMarket" placeholder="选择市场" style="width: 160px; margin-right: 10px;">
              <el-option label="MSCI指数" value="MSCI" />
              <el-option label="中证指数" value="CSI" />
              <el-option label="上交所指数" value="SSE" />
              <el-option label="深交所指数" value="SZSE" />
              <el-option label="中金指数" value="CICC" />
              <el-option label="申万指数" value="SW" />
              <el-option label="其他指数" value="OTH" />
            </el-select>
            <el-select v-model="selectedIndexTsCode" placeholder="选择指数" style="width: 220px;" filterable>
              <el-option
                v-for="item in indexList"
                :key="item.ts_code"
                :label="`${item.name ?? item.ts_code} (${item.ts_code})`"
                :value="item.ts_code"
              />
            </el-select>
          </div>
        </div>
      </template>
      <IndexVolumeTrend :ts-code="selectedIndexTsCode" height="420px" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import IndexVolumeTrend from '@/components/IndexVolumeTrend.vue'
import { fetchIndexBasicList, type IndexBasicItem } from '@/services/indexBasicApi'

const route = useRoute()

// 指数列表与选择
const indexList = ref<IndexBasicItem[]>([])
const selectedIndexTsCode = ref<string>((route.query.ts_code as string) || '000001.SH')
const selectedMarket = ref<'MSCI' | 'CSI' | 'SSE' | 'SZSE' | 'CICC' | 'SW' | 'OTH'>((route.query.market as any) || 'SSE')

async function loadIndexList() {
  try {
    const list = await fetchIndexBasicList({ market: selectedMarket.value })
    indexList.value = list
    if (!list.find(i => i.ts_code === selectedIndexTsCode.value)) {
      selectedIndexTsCode.value = list.length ? list[0].ts_code : ''
    }
  } catch (err) {
    console.error('获取指数列表失败:', err)
    ElMessage.error('获取指数列表失败')
  }
}

onMounted(() => {
  loadIndexList()
})

watch(selectedMarket, () => {
  loadIndexList()
})
</script>

<style scoped>
.index-analysis {
  padding: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>