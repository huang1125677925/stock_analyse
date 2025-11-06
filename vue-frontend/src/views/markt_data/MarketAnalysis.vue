<template>
  <div class="market-analysis" v-loading="loading" element-loading-text="正在加载大盘数据...">
    <!-- 大盘资金流热力图 -->
    <div class="fund-flow-section">
      <el-card shadow="hover">
        <template #header>
          <div class="chart-header">
            <h3>大盘资金流热力图</h3>
            <div class="chart-controls">
              <!-- 时间范围选择：默认20天，可选30/40天 -->
              <el-select v-model="daysRange" placeholder="时间范围" style="width: 120px; margin-right: 10px;">
                <el-option label="20天" :value="20"></el-option>
                <el-option label="30天" :value="30"></el-option>
                <el-option label="40天" :value="40"></el-option>
                <el-option label="60天" :value="60"></el-option>
                <el-option label="90天" :value="90"></el-option>
                <el-option label="120天" :value="120"></el-option>
                <el-option label="180天" :value="180"></el-option>
              </el-select>
              <el-select v-model="valueFilter" placeholder="数值过滤" style="width: 120px; margin-right: 10px;">
                <el-option label="全部" value="all"></el-option>
                <el-option label="正值" value="positive"></el-option>
                <el-option label="负值" value="negative"></el-option>
              </el-select>

            </div>
          </div>
        </template>
        <div class="chart-container">
          <MarketFundFlowHeatmap 
            :data="fundFlowData"
            :selectedMetric="selectedFundFlowMetric"
            :searchKeyword="searchKeyword"
            :valueFilter="valueFilter"
            @chart-click="handleFundFlowClick"
          />
        </div>
      </el-card>
      <el-card class="mt-16" shadow="never">
        <!-- 涨跌比热力图 -->
        <div class="rise-fall-section" v-if="riseFallData.length > 0">
          <el-card class="mt-16" shadow="hover">
            <template #header>
              <div class="chart-header">
                <h3>新高新低比热力图</h3>
                <div class="chart-controls">
                  <!-- 指数代码选择，与页面时间范围共用 -->
                  <el-select v-model="indexCode" placeholder="指数代码" style="width: 160px;">
                    <el-option label="全部A股" value="all" />
                    <el-option label="上证50" value="sz50" />
                    <el-option label="沪深300" value="hs300" />
                    <el-option label="中证500" value="zz500" />
                  </el-select>
                </div>
              </div>
            </template>
            <div class="chart-container">
              <HeatmapChart :option="riseFallHeatmapOption" :height="480" @chart-click="handleRiseFallClick" />
            </div>
          </el-card>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { computed } from 'vue'
 import MarketFundFlowHeatmap from '@/components/MarketFundFlowHeatmap.vue'
 import { fetchMarketFundFlowData, FUND_FLOW_METRICS, type FundFlowMetricType, type MarketFundFlowDataItem } from '@/services/marketFundFlowApi'
 import HeatmapChart from '@/components/HeatmapChart.vue'
 import { fetchRiseFallRatioData, type RiseFallRatioItem } from '@/services/marketRiseFallRatioApi'
 import type { EChartsOption } from 'echarts'

 // 仅保留加载状态与资金流相关状态
const loading = ref(false)
const fundFlowMetrics = FUND_FLOW_METRICS
const fundFlowData = ref<MarketFundFlowDataItem[]>([])
const selectedFundFlowMetric = ref<FundFlowMetricType>('main_net_inflow_amount')
const searchKeyword = ref('')
const valueFilter = ref<'all' | 'positive' | 'negative'>('all')
// 时间范围（天数），默认20天
const daysRange = ref<number>(20)

// 获取大盘资金流数据
async function fetchFundFlowData() {
  try {
    loading.value = true
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - daysRange.value * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    // pageSize 按天数范围设置，确保分页足够覆盖
    const res = await fetchMarketFundFlowData(startDate, endDate, 1, daysRange.value, '-date')
    fundFlowData.value = res.list ?? []
  } catch (error) {
    console.error('获取大盘资金流数据出错:', error)
    ElMessage.error('获取大盘资金流数据出错')
  } finally {
    loading.value = false
  }
}

function handleFundFlowClick(payload: unknown) {
  console.log('fund flow chart click:', payload)
}

// 涨跌比相关状态
const indexCode = ref<'all' | 'sz50' | 'hs300' | 'zz500'>('all')
const riseFallData = ref<RiseFallRatioItem[]>([])



/**
 * 获取涨跌比数据
 * @description 复用页面的时间范围（daysRange），根据选择的指数代码拉取指定日期范围的涨跌比数据
 * @returns Promise<void>
 */
async function fetchRiseFallData() {
  try {
    loading.value = true
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - daysRange.value * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const list = await fetchRiseFallRatioData({ indexCode: indexCode.value, startDate, endDate })
    // 排序：按日期升序，确保热力图x轴顺序正确
    riseFallData.value = [...list].sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    console.error('获取涨跌比数据出错:', error)
    ElMessage.error('获取涨跌比数据出错')
  } finally {
    loading.value = false
  }
}

/**
 * 涨跌比热力图配置
 * @description x轴为日期，y轴为三个周期的涨跌比（20/60/120），颜色按值大小渐变
 */
const riseFallHeatmapOption = computed<EChartsOption>(() => {
  const dates = riseFallData.value.map(item => item.date)
  const metrics = [
    { key: 'rise_fall_ratio_20', label: '20日涨跌比' },
    { key: 'rise_fall_ratio_60', label: '60日涨跌比' },
    { key: 'rise_fall_ratio_120', label: '120日涨跌比' }
  ] as const

  // 组装热力图数据 [xIndex, yIndex, value]
  const values: number[] = []
  const heatmapData: [number, number, number][] = []
  riseFallData.value.forEach((item, xIdx) => {
    metrics.forEach((m, yIdx) => {
      const v = (item as any)[m.key] as number
      if (typeof v === 'number') {
        values.push(v)
        heatmapData.push([xIdx, yIdx, v])
      }
    })
  })

  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1

  return {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const date = dates[params.value[0]]
        const metric = metrics[params.value[1]].label
        const val = params.value[2]
        return `${date}<br/>${metric}: ${val.toFixed(4)}`
      }
    },
    grid: { left: 80, right: 30, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { rotate: 45 }
    },
    yAxis: {
      type: 'category',
      data: metrics.map(m => m.label)
    },
    visualMap: {
      min,
      max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: ['#50a3ba', '#eac763', '#d94e5d']
      }
    },
    series: [
      {
        name: '涨跌比热力图',
        type: 'heatmap',
        data: heatmapData,
        progressive: 0,
        label: { show: false }
      }
    ]
  }
})

function handleRiseFallClick(payload: unknown) {
  console.log('rise-fall chart click:', payload)
}

onMounted(() => {
  // 初始化拉取资金流与涨跌比数据
  fetchFundFlowData()
  fetchRiseFallData()
})

// 切换时间范围或指数时自动刷新相关数据
watch(daysRange, () => {
  fetchFundFlowData()
  fetchRiseFallData()
})
watch(indexCode, () => {
  fetchRiseFallData()
})
// 指数趋势已分离为独立页面
// 已移除“收盘价与涨跌幅趋势”图，相关字段与数据处理不再需要
</script>

<style scoped>
.market-analysis {
  padding: 20px;
}

/* 删除与上证指数历史API相关的样式块（最新数据与趋势图表） */
.latest-data-section { display: none; }
.charts-section { display: none; }

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 500px;
  margin-top: 20px;
}

.rise-fall-section {
  margin-top: 16px;
}
</style>