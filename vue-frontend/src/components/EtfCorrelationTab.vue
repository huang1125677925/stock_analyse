<template>
  <div>
    <el-card class="search-card" shadow="never">
      <el-form :model="query" label-width="110px" label-position="left" inline>
        <el-form-item label="ETF范围">
          <el-select
            v-model="selectedCodes"
            multiple
            collapse-tags
            collapse-tags-tooltip
            clearable
            filterable
            placeholder="选择用于相关性分析的 ETF"
            style="width: 520px"
          >
            <el-option
              v-for="item in etfOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="query.start_date"
            type="date"
            placeholder="选择开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="query.end_date"
            type="date"
            placeholder="选择结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="fetchCorrelation">查询</el-button>
          <el-button @click="resetCorrelation">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <div class="hint-line">
        <span>当前纳入 {{ selectedCodes.length }} 只 ETF</span>
        <span v-if="props.etfCodes.length > defaultSelectionLimit">默认先展示前 {{ defaultSelectionLimit }} 只，可手动增减</span>
      </div>
      <HeatmapChart v-if="canQuery" :option="chartOption" :height="chartHeight" />
      <el-empty v-else description="至少需要 2 只 ETF 才能做相关性分析" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type * as echarts from 'echarts'
import HeatmapChart from '@/components/HeatmapChart.vue'
import { getEtfCorrelation, type EtfCorrelationData } from '@/services/etfApi'

const props = defineProps<{
  etfCodes: string[]
  codeNameMap: Record<string, string>
}>()

const defaultSelectionLimit = 12
const loading = ref(false)
const correlation = ref<EtfCorrelationData | null>(null)
const selectedCodes = ref<string[]>([])
const query = reactive({
  start_date: '',
  end_date: ''
})

const etfOptions = computed(() =>
  props.etfCodes.map(code => ({
    value: code,
    label: `${codeToName(code)}（${code}）`
  }))
)

const canQuery = computed(() => selectedCodes.value.length >= 2)
const chartHeight = computed(() => {
  const size = selectedCodes.value.length
  return Math.max(520, Math.min(920, size * 38 + 180))
})

const formatDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const setDefaultDates = () => {
  const today = new Date()
  const start = new Date()
  start.setDate(today.getDate() - 60)
  query.start_date = formatDate(start)
  query.end_date = formatDate(today)
}

const codeToName = (code: string) => props.codeNameMap[code] || code

const normalizeSelection = () => {
  const base = props.etfCodes.slice(0, defaultSelectionLimit)
  if (selectedCodes.value.length === 0) {
    selectedCodes.value = base
    return
  }
  const valid = selectedCodes.value.filter(code => props.etfCodes.includes(code))
  selectedCodes.value = valid.length > 0 ? valid : base
}

const fetchCorrelation = async () => {
  if (!canQuery.value) {
    correlation.value = null
    return
  }
  loading.value = true
  try {
    correlation.value = await getEtfCorrelation({
      ts_codes: selectedCodes.value,
      start_date: query.start_date || undefined,
      end_date: query.end_date || undefined
    })
  } catch (e: any) {
    correlation.value = null
    ElMessage.error(e?.message || '相关性数据查询失败')
  } finally {
    loading.value = false
  }
}

const resetCorrelation = () => {
  setDefaultDates()
  correlation.value = null
  if (canQuery.value) {
    fetchCorrelation()
  }
}

const chartOption = computed((): echarts.EChartsOption => {
  const data = correlation.value
  if (!data || !data.labels || !data.matrix || data.labels.length === 0) {
    return {
      title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { fontSize: 16, color: '#999' } }
    }
  }

  const xLabels = data.labels.map(codeToName)
  const yLabels = data.labels.map(codeToName)
  const heatmapData: [number, number, number][] = []
  let minV = Infinity
  let maxV = -Infinity

  for (let i = 0; i < yLabels.length; i++) {
    const row = data.matrix[i] || []
    for (let j = 0; j < xLabels.length; j++) {
      const value = typeof row[j] === 'number' ? row[j] : NaN
      if (!Number.isNaN(value)) {
        heatmapData.push([j, i, +value.toFixed(3)])
        minV = Math.min(minV, value)
        maxV = Math.max(maxV, value)
      }
    }
  }

  if (!Number.isFinite(minV) || !Number.isFinite(maxV)) {
    minV = -1
    maxV = 1
  }

  return {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [xIdx, yIdx, value] = params?.data ?? []
        const xLabel = xLabels[xIdx] ?? ''
        const yLabel = yLabels[yIdx] ?? ''
        return `${yLabel} vs ${xLabel}<br/>相关系数：${value}`
      }
    },
    grid: { left: '8%', right: '10%', top: '8%', bottom: '18%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: {
        rotate: 45,
        fontSize: xLabels.length > 12 ? 10 : 11,
        interval: 0
      }
    },
    yAxis: {
      type: 'category',
      data: yLabels,
      axisLabel: { fontSize: yLabels.length > 12 ? 10 : 11, interval: 0 }
    },
    visualMap: {
      min: Math.min(-1, Math.floor(minV * 10) / 10),
      max: Math.max(1, Math.ceil(maxV * 10) / 10),
      calculable: true,
      orient: 'vertical',
      right: '2%',
      top: '5%',
      inRange: {
        color: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']
      },
      text: ['高', '低']
    },
    series: [
      {
        name: '相关性矩阵',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: xLabels.length <= 14,
          fontSize: 9,
          formatter: (params: any) => params?.data?.[2]
        },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.35)' } }
      }
    ]
  }
})

onMounted(() => {
  setDefaultDates()
  normalizeSelection()
  if (canQuery.value) {
    fetchCorrelation()
  }
})

watch(
  () => props.etfCodes.slice(),
  () => {
    normalizeSelection()
    if (canQuery.value) {
      fetchCorrelation()
    } else {
      correlation.value = null
    }
  }
)

watch(
  () => selectedCodes.value.slice(),
  () => {
    if (canQuery.value) {
      fetchCorrelation()
    } else {
      correlation.value = null
    }
  }
)
</script>

<style scoped>
.search-card {
  margin-bottom: 12px;
}

.hint-line {
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}
</style>
