<template>
  <div class="sw-industry-valuation-view">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <span>申万行业估值分析</span>
          </div>
        </div>
      </template>

      <div class="form-row">
        <el-form :inline="true" label-width="80px">
          <el-form-item label="行业分级">
            <el-select v-model="query.level" placeholder="选择分级" style="width: 150px">
              <el-option label="一级行业" value="L1" />
              <el-option label="二级行业" value="L2" />
              <el-option label="三级行业" value="L3" />
            </el-select>
          </el-form-item>
          <el-form-item label="日期范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYYMMDD"
              value-format="YYYYMMDD"
              :shortcuts="dateShortcuts"
              style="width: 320px"
              :clearable="false"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="fetchData">查询</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        style="width: 100%"
        :default-sort="{ prop: 'pe_percentile', order: 'ascending' }"
      >
        <el-table-column prop="ts_code" label="行业代码" width="120" sortable />
        <el-table-column prop="name" label="行业名称" min-width="150" align="center" sortable />
        <el-table-column prop="trade_date" label="交易日期" width="120" sortable />
        
        <el-table-column label="PE (市盈率)" align="center">
          <el-table-column prop="pe" label="数值" width="100" sortable>
            <template #default="{ row }">
              {{ formatNumber(row.pe) }}
            </template>
          </el-table-column>
          <el-table-column prop="pe_percentile" label="分位数 (%)" width="120" sortable>
            <template #default="{ row }">
              <span :style="getPercentileStyle(row.pe_percentile)">
                {{ row.pe_percentile !== undefined && row.pe_percentile !== null ? row.pe_percentile.toFixed(2) + '%' : '--' }}
              </span>
            </template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="PB (市净率)" align="center">
          <el-table-column prop="pb" label="数值" width="100" sortable>
            <template #default="{ row }">
              {{ formatNumber(row.pb) }}
            </template>
          </el-table-column>
          <el-table-column prop="pb_percentile" label="分位数 (%)" width="120" sortable>
            <template #default="{ row }">
              <span :style="getPercentileStyle(row.pb_percentile)">
                {{ row.pb_percentile !== undefined && row.pb_percentile !== null ? row.pb_percentile.toFixed(2) + '%' : '--' }}
              </span>
            </template>
          </el-table-column>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称: SwIndustryValuationView
 * 功能描述: 申万行业估值分析页面
 * 
 * 功能点:
 * 1. 提供行业分级选择 (L1/L2/L3)
 * 2. 提供日期范围选择，支持快捷选项
 * 3. 展示行业估值数据表格 (PE/PB及其分位数)
 * 4. 对分位数进行颜色标记 (高风险/低风险)
 * 
 * 依赖接口:
 * - getSwValuationAnalysis: 获取估值数据
 */
import { ref, reactive, onMounted } from 'vue'
import { getSwValuationAnalysis, type SwValuationAnalysisItem } from '@/services/industryApi'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const tableData = ref<SwValuationAnalysisItem[]>([])

const query = reactive({
  level: 'L1'
})

// 默认查询最近十年的数据
const endDate = new Date()
const startDate = new Date()
startDate.setFullYear(startDate.getFullYear() - 10)

/**
 * 格式化日期对象为 YYYYMMDD 字符串
 * @param date Date对象
 * @returns YYYYMMDD格式字符串
 */
const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

const dateRange = ref<[string, string]>([
  formatDate(startDate),
  formatDate(endDate)
])

const dateShortcuts = [
  {
    text: '最近一年',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setFullYear(start.getFullYear() - 1)
      return [start, end]
    },
  },
  {
    text: '最近三年',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setFullYear(start.getFullYear() - 3)
      return [start, end]
    },
  },
  {
    text: '最近五年',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setFullYear(start.getFullYear() - 5)
      return [start, end]
    },
  },
  {
    text: '最近十年',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setFullYear(start.getFullYear() - 10)
      return [start, end]
    },
  },
]

/**
 * 获取行业估值数据
 * 根据选择的日期范围和行业等级查询数据
 */
const fetchData = async () => {
  if (!dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请选择日期范围')
    return
  }

  loading.value = true
  try {
    const res = await getSwValuationAnalysis({
      start_date: dateRange.value[0],
      end_date: dateRange.value[1],
      level: query.level
    })
    
    if (Array.isArray(res)) {
      tableData.value = res
    } else {
      tableData.value = []
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取数据失败')
  } finally {
    loading.value = false
  }
}

/**
 * 格式化数字，保留两位小数
 * @param num 数字
 */
const formatNumber = (num: number) => {
  return num ? num.toFixed(2) : '--'
}

/**
 * 获取分位数对应的样式
 * @param percentile 分位数 (0-100)
 * @returns 样式对象
 * 
 * 规则:
 * - >= 80: 高估 (红色)
 * - <= 20: 低估 (绿色)
 * - 其他: 适中 (蓝色)
 */
const getPercentileStyle = (percentile: number) => {
  // percentile is 0-100
  if (percentile === undefined || percentile === null) {
    return {}
  }
  
  if (percentile >= 80) {
    return { color: '#F56C6C', fontWeight: 'bold' } // High - Red
  } else if (percentile <= 20) {
    return { color: '#67C23A', fontWeight: 'bold' } // Low - Green
  } else {
    return { color: '#409EFF', fontWeight: 'bold' } // Moderate - Blue
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.sw-industry-valuation-view {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
}

.form-row {
  margin-bottom: 20px;
}
</style>
