<template>
  <el-card class="page-card">
    <template #header>
      <div class="card-header">AH股比价查询</div>
    </template>

    <el-form :inline="true" class="query-form">
      <el-form-item label="选择日期">
        <el-date-picker
          v-model="queryDate"
          type="date"
          placeholder="选择日期"
          value-format="YYYYMMDD"
          :clearable="false"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <div v-loading="loading">
      <!-- 市场概览指标 -->
      <div v-if="hasData" class="metrics-container">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card shadow="hover" class="metric-card bg-blue-light">
              <div class="metric-title">平均溢价率 (A/H)</div>
              <div class="metric-value">{{ avgPremium }}%</div>
              <div class="metric-desc">整体市场估值水平</div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="metric-card bg-green-light">
              <div class="metric-title">A股折价 (A便宜)</div>
              <div class="metric-value success-text">{{ discountCount }} <span class="unit">只</span></div>
              <div class="metric-desc">溢价率 < 0%</div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="metric-card bg-red-light">
              <div class="metric-title">A股溢价 (H便宜)</div>
              <div class="metric-value danger-text">{{ premiumCount }} <span class="unit">只</span></div>
              <div class="metric-desc">溢价率 > 0%</div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 图表区域 -->
      <div v-if="hasData" class="charts-section">
        <el-row :gutter="20">
          <!-- 左侧：溢价率分布或趋势 -->
          <el-col :span="12">
            <div class="chart-wrapper">
              <div class="chart-title">{{ isSingleStockMode ? 'AH溢价率走势' : '当前日期 AH溢价率分布' }}</div>
              <div ref="mainChartRef" class="chart-box"></div>
            </div>
          </el-col>
          <!-- 右侧：机会榜单 (仅在多股模式下显示) -->
          <el-col :span="12" v-if="!isSingleStockMode">
            <div class="chart-wrapper">
              <div class="chart-title">高性价比机会 (Top 5) - {{ formatDateStr(queryDate) }}</div>
              <div class="opportunity-lists">
                <div class="opp-list">
                  <div class="list-header success-bg">A股最便宜 (折价最高)</div>
                  <div v-for="item in topDiscountList" :key="item.ts_code" class="list-item clickable" @click="openTrendModal(item)">
                    <span class="stock-name">{{ item.name }}</span>
                    <span class="premium-val success-text">{{ item.ah_premium }}%</span>
                  </div>
                </div>
                <div class="opp-list">
                  <div class="list-header danger-bg">H股最便宜 (溢价最高)</div>
                  <div v-for="item in topPremiumList" :key="item.ts_code" class="list-item clickable" @click="openTrendModal(item)">
                    <span class="stock-name">{{ item.name }}</span>
                    <span class="premium-val danger-text">{{ item.ah_premium }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
           <!-- 右侧：个股详情 (仅在单股模式下显示) -->
           <el-col :span="12" v-else>
             <div class="chart-wrapper">
               <div class="chart-title">最新价差详情</div>
               <div class="stock-detail-card" v-if="latestRecord">
                  <div class="detail-row">
                    <span class="label">A股价格:</span>
                    <span class="value">{{ latestRecord.close }} ({{ latestRecord.pct_chg }}%)</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">H股价格:</span>
                    <span class="value">{{ latestRecord.hk_close }} ({{ latestRecord.hk_pct_chg }}%)</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">当前溢价:</span>
                    <span class="value highlight">{{ latestRecord.ah_premium }}%</span>
                  </div>
                  <div class="detail-desc">
                    <el-tag :type="Number(latestRecord.ah_premium) > 0 ? 'danger' : 'success'">
                      {{ Number(latestRecord.ah_premium) > 0 ? 'A股更贵 (H股划算)' : 'A股更便宜 (A股划算)' }}
                    </el-tag>
                  </div>
               </div>
             </div>
           </el-col>
        </el-row>
      </div>

      <!-- 数据表格 -->
      <el-table 
        v-if="hasData"
        :data="displayRows" 
        border 
        stripe 
        style="width: 100%; margin-top: 20px;"
        :default-sort="{ prop: 'ah_premium', order: 'descending' }"
      >
        <el-table-column label="日期" prop="trade_date" width="100" sortable />
        
        <el-table-column label="A股信息" min-width="160">
          <template #default="{ row }">
            <div class="stock-cell clickable" @click="openTrendModal(row)" title="点击查看走势">
              <span class="stock-name link-text">{{ row.name }} <el-icon><TrendCharts /></el-icon></span>
              <span class="stock-code">{{ row.ts_code }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="A股收盘/涨跌" min-width="140">
          <template #default="{ row }">
            <div :class="getPriceColorClass(row.pct_chg)">
              {{ row.close }} ({{ row.pct_chg }}%)
            </div>
          </template>
        </el-table-column>

        <el-table-column label="H股信息" min-width="160">
          <template #default="{ row }">
            <div class="stock-cell clickable" @click="openTrendModal(row)" title="点击查看走势">
              <span class="stock-name link-text">{{ row.hk_name }}</span>
              <span class="stock-code">{{ row.hk_code }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="H股收盘/涨跌" min-width="140">
          <template #default="{ row }">
            <div :class="getPriceColorClass(row.hk_pct_chg)">
              {{ row.hk_close }} ({{ row.hk_pct_chg }}%)
            </div>
          </template>
        </el-table-column>

        <el-table-column label="AH溢价率" prop="ah_premium" min-width="180" sortable>
          <template #default="{ row }">
            <div class="premium-cell">
              <span :class="getPremiumColorClass(row.ah_premium)" class="premium-text">
                {{ row.ah_premium }}%
              </span>
              <el-progress 
                :percentage="Math.min(Math.abs(Number(row.ah_premium)), 100)" 
                :color="getPremiumColor(row.ah_premium)"
                :show-text="false"
                :stroke-width="6"
              />
              <span class="premium-tag">
                {{ Number(row.ah_premium) > 0 ? 'H股便宜' : 'A股便宜' }}
              </span>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <el-empty v-else-if="!loading && !hasData" description="暂无数据，请查询" />
    </div>

    <!-- 趋势图弹窗 -->
    <el-dialog
      v-model="trendDialogVisible"
      :title="trendDialogTitle"
      width="800px"
      @opened="initTrendChart"
      destroy-on-close
    >
      <div ref="trendChartRef" style="width: 100%; height: 400px;"></div>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue'
import { fetchAhComparison, type AhComparisonQueryParams } from '@/services/ahComparisonApi'
import { TrendCharts } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

/**
 * 组件：AhComparisonView
 * 功能：提供 AH 股比价数据的查询与展示
 */

const loading = ref(false)
const queryDate = ref<string>('')
const rawData = ref<Record<string, any>[]>([]) // 存储接口返回的所有数据
const mainChartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// 趋势图弹窗相关
const trendDialogVisible = ref(false)
const trendDialogTitle = ref('')
const trendChartRef = ref<HTMLElement | null>(null)
const currentTrendStock = ref<any>(null) // 当前查看趋势的股票信息
let trendChartInstance: echarts.ECharts | null = null
const trendLoading = ref(false) // 趋势图加载状态

// 计算属性

// 1. 是否有数据
const hasData = computed(() => rawData.value.length > 0)

// 2. 单股模式判断 (现在主界面总是多股模式)
const isSingleStockMode = computed(() => false)

// 3. 当前显示的行数据 (即 rawData，因为只查询了一天)
const displayRows = computed(() => rawData.value)

// 4. 最新记录 (保留变量名以兼容模板，但在多股模式下仅用于取第一条)
const latestRecord = computed(() => displayRows.value[0])

// 5. 统计指标 (基于 displayRows 计算)
const avgPremium = computed(() => {
  const rows = displayRows.value
  if (!rows.length) return 0
  const total = rows.reduce((sum, r) => sum + Number(r.ah_premium || 0), 0)
  return (total / rows.length).toFixed(2)
})

const discountCount = computed(() => displayRows.value.filter(r => Number(r.ah_premium) < 0).length)
const premiumCount = computed(() => displayRows.value.filter(r => Number(r.ah_premium) > 0).length)

// 6. 榜单 (基于 displayRows 计算)
const topDiscountList = computed(() => {
  return [...displayRows.value]
    .sort((a, b) => Number(a.ah_premium) - Number(b.ah_premium))
    .slice(0, 5)
})

const topPremiumList = computed(() => {
  return [...displayRows.value]
    .sort((a, b) => Number(b.ah_premium) - Number(a.ah_premium))
    .slice(0, 5)
})

function normalizeToRows(data: any): Record<string, any>[] {
  if (!data) return []
  if (Array.isArray(data.records) && data.records.length > 0) {
    return data.records
  }
  if (Array.isArray(data.items) && Array.isArray(data.fields)) {
    const f = data.fields as string[]
    return (data.items as any[][]).map(arr => {
      const obj: Record<string, any> = {}
      f.forEach((k, i) => (obj[k] = arr[i]))
      return obj
    })
  }
  return []
}

async function onSearch() {
  if (!queryDate.value) return
  
  loading.value = true
  try {
    const params: AhComparisonQueryParams = {
      trade_date: queryDate.value
    }
    const data = await fetchAhComparison(params)
    rawData.value = normalizeToRows(data)
    
    nextTick(() => {
      renderMainChart()
    })
  } finally {
    loading.value = false
  }
}

// 辅助函数
function getPriceColorClass(val: number | string) {
  const v = Number(val)
  if (v > 0) return 'text-red'
  if (v < 0) return 'text-green'
  return ''
}

function getPremiumColorClass(val: number | string) {
  const v = Number(val)
  return v > 0 ? 'text-red' : 'text-green'
}

function getPremiumColor(val: number | string) {
  return Number(val) > 0 ? '#F56C6C' : '#67C23A'
}

function formatDateStr(dateStr: string) {
  if (!dateStr || dateStr.length !== 8) return dateStr
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
}

// 主图表渲染 (分布图)
function renderMainChart() {
  if (!mainChartRef.value || !hasData.value) return
  
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(mainChartRef.value)

  // 多股模式：分布直方图
  const buckets = {
    '<-20%': 0,
    '-20%~0%': 0,
    '0%~20%': 0,
    '20%~50%': 0,
    '>50%': 0
  }
  
  displayRows.value.forEach(r => {
    const p = Number(r.ah_premium)
    if (p < -20) buckets['<-20%']++
    else if (p < 0) buckets['-20%~0%']++
    else if (p < 20) buckets['0%~20%']++
    else if (p < 50) buckets['20%~50%']++
    else buckets['>50%']++
  })

  const option: any = {
    title: { text: '市场AH溢价率分布' },
    tooltip: { trigger: 'item' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: Object.keys(buckets) },
    yAxis: { type: 'value', name: '股票数量' },
    series: [{
      name: '股票数量',
      type: 'bar',
      data: Object.values(buckets),
      itemStyle: {
        color: (params: any) => {
          const idx = params.dataIndex
          // 0,1 are discounts (greenish), others premiums (reddish)
          return idx < 2 ? '#67C23A' : '#F56C6C'
        }
      },
      label: { show: true, position: 'top' }
    }]
  }

  chartInstance.setOption(option)
}

// 弹窗趋势图逻辑
function openTrendModal(item: any) {
  currentTrendStock.value = item
  trendDialogTitle.value = `${item.name} (${item.ts_code}) - AH溢价率历史走势`
  trendDialogVisible.value = true
  // 弹窗打开动画结束后加载数据
}

function getTodayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function getOneYearAgo(dateStr: string) {
  const y = parseInt(dateStr.slice(0, 4))
  const m = parseInt(dateStr.slice(4, 6)) - 1
  const d = parseInt(dateStr.slice(6, 8))
  const date = new Date(y, m, d)
  date.setFullYear(date.getFullYear() - 1)
  
  const ny = date.getFullYear()
  const nm = String(date.getMonth() + 1).padStart(2, '0')
  const nd = String(date.getDate()).padStart(2, '0')
  return `${ny}${nm}${nd}`
}

async function initTrendChart() {
  if (!trendChartRef.value || !currentTrendStock.value) return
  
  if (trendChartInstance) trendChartInstance.dispose()
  trendChartInstance = echarts.init(trendChartRef.value)
  trendChartInstance.showLoading()
  
  try {
    // 计算查询时间范围：过去一年
    const endDate = queryDate.value || getTodayStr()
    const startDate = getOneYearAgo(endDate)
    
    const params: AhComparisonQueryParams = {
      ts_code: currentTrendStock.value.ts_code,
      start_date: startDate,
      end_date: endDate
    }
    
    const data = await fetchAhComparison(params)
    const historyData = normalizeToRows(data)
      .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
      
    const dates = historyData.map(r => r.trade_date)
    const premiums = historyData.map(r => r.ah_premium)
    
    const option = {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: { 
        type: 'category', 
        data: dates,
        axisLabel: { rotate: 45 }
      },
      yAxis: { 
        type: 'value', 
        name: '溢价率(%)',
        scale: true
      },
      series: [{
        name: 'AH溢价率',
        type: 'line',
        data: premiums,
        smooth: true,
        markLine: {
          data: [{ yAxis: 0, name: '平价线' }]
        },
        itemStyle: { color: '#409EFF' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64,158,255,0.5)' },
            { offset: 1, color: 'rgba(64,158,255,0.01)' }
          ])
        }
      }]
    }
    
    trendChartInstance.setOption(option)
  } catch (e) {
    console.error('Fetch trend data failed', e)
    trendChartInstance.setOption({
      title: {
        text: '数据加载失败',
        left: 'center',
        top: 'center'
      }
    })
  } finally {
    trendChartInstance.hideLoading()
  }
}

function handleResize() {
  chartInstance?.resize()
  trendChartInstance?.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  // 默认选中最新交易日（或者今天）
  queryDate.value = getTodayStr()
  onSearch()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  trendChartInstance?.dispose()
})
</script>

<style scoped>
.page-card { margin: 12px; }
.card-header { font-weight: 600; }
.query-form { margin-bottom: 12px; }

/* 日期选择器 */
.date-selector {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  background: #f4f4f5;
  padding: 10px;
  border-radius: 4px;
}
.date-selector .label {
  font-size: 14px;
  color: #606266;
  margin-right: 12px;
  font-weight: bold;
}

/* 统计卡片样式 */
.metrics-container { margin-bottom: 20px; }
.metric-card { text-align: center; border: none; }
.metric-title { font-size: 14px; color: #606266; margin-bottom: 8px; }
.metric-value { font-size: 24px; font-weight: bold; color: #303133; margin-bottom: 4px; }
.metric-desc { font-size: 12px; color: #909399; }
.unit { font-size: 12px; font-weight: normal; }

.bg-blue-light { background-color: #ecf5ff; }
.bg-green-light { background-color: #f0f9eb; }
.bg-red-light { background-color: #fef0f0; }

.text-red { color: #F56C6C; }
.text-green { color: #67C23A; }
.success-text { color: #67C23A; }
.danger-text { color: #F56C6C; }

/* 图表区域样式 */
.charts-section { margin-bottom: 24px; }
.chart-wrapper {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 16px;
  height: 320px;
  display: flex;
  flex-direction: column;
}
.chart-title {
  font-weight: bold;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #409EFF;
}
.chart-box { flex: 1; width: 100%; }

/* 榜单样式 */
.opportunity-lists {
  display: flex;
  gap: 20px;
  height: 100%;
  overflow: hidden;
}
.opp-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 8px;
}
.list-header {
  padding: 8px;
  font-size: 13px;
  font-weight: bold;
  color: #fff;
  border-radius: 4px;
  margin-bottom: 8px;
  text-align: center;
}
.success-bg { background-color: #67C23A; }
.danger-bg { background-color: #F56C6C; }

.list-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px dashed #e4e7ed;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.list-item:hover { background-color: #e6f7ff; }
.list-item:last-child { border-bottom: none; }
.stock-name { font-weight: 500; }
.premium-val { font-weight: bold; }

/* 单股详情样式 */
.stock-detail-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: center;
  height: 100%;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 12px;
}
.detail-row .label { color: #606266; }
.detail-row .value { font-weight: bold; }
.detail-row .value.highlight { font-size: 20px; color: #409EFF; }
.detail-desc { text-align: center; margin-top: 10px; }

/* 表格样式优化 */
.stock-cell { display: flex; flex-direction: column; cursor: pointer; }
.stock-code { font-size: 12px; color: #909399; }
.premium-cell { display: flex; flex-direction: column; gap: 4px; }
.premium-text { font-weight: bold; font-size: 14px; }
.premium-tag { font-size: 12px; color: #909399; }

.link-text { color: #409EFF; font-weight: bold; }
.link-text:hover { text-decoration: underline; }
.clickable { cursor: pointer; }
</style>