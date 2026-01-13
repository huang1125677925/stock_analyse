<template>
  <div class="ml-index-validation">
    <!--
      组件名称：MlIndexPredictionValidation
      功能：基于后端接口 `/django/api/strategy/individual-analysis/actual-rise-ratio/{stock_code}/`，
            提供指数/股票在指定区间的5日实际上涨比例查询与验证展示，用于机器学习预测效果校验。
      参数（入参，来自表单）：
      - stockCode: string 指数或股票代码（必填），例如 `000001.SH` 或 `600000.SH`
      - startDate?: string 查询开始日期（可选，格式：YYYY-MM-DD）
      - endDate?: string 查询结束日期（可选，格式：YYYY-MM-DD）
      - predictionType?: string 预测类型（可选，如 `macd_xgb`、`svm` 等，后端支持的类型为准）
      返回值：后端统一响应结构（code、message、data）。data通常包含统计或明细数据；页面对 data 动态渲染。
      事件：
      - 无外部事件。内部交互包含“查询”与“重置”，分别触发对后端的请求与表单清空。
      设计原则：遵循单一职责，仅负责指数预测验证的数据查询与展示。
    -->

    <el-card class="query-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>指数预测验证查询</span>
          <el-tag type="success" size="small">5日实际上涨比例</el-tag>
        </div>
      </template>

      <el-form :model="form" label-position="right" label-width="120px" :inline="false">
        <el-row :gutter="12">
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="代码（TS）">
              <el-input v-model="form.stockCode" placeholder="例如：000001.SH 或 399001.SZ" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="开始日期">
              <el-date-picker v-model="form.startDate" type="date" placeholder="选择开始日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="结束日期">
              <el-date-picker v-model="form.endDate" type="date" placeholder="选择结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="预测类型">
              <el-select v-model="form.predictionType" placeholder="可选：后端支持类型">
                <el-option label="macd_xgb" value="macd_xgb" />
                <el-option label="svm" value="svm" />
                <el-option label="lr" value="lr" />
                <el-option label="auto" value="auto" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="8">
            <div class="actions">
              <el-button type="primary" :loading="loading" @click="onQuery">查询</el-button>
              <el-button @click="onReset">重置</el-button>
            </div>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="result-card" shadow="never" v-if="result">
      <template #header>
        <div class="card-header">
          <span>查询结果</span>
          <el-tag type="info" size="small">动态渲染</el-tag>
        </div>
      </template>

      <!-- 结果摘要（如果存在通用字段） -->
      <div class="summary" v-if="summaryItems.length">
        <el-descriptions :column="isMobile ? 1 : 3" border>
          <el-descriptions-item v-for="(item, idx) in summaryItems" :key="idx" :label="item.label">
            {{ item.value }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 若 data 为数组，渲染表格；若为对象，渲染键值对 -->
      <div v-if="Array.isArray(result.data)" class="table-wrapper">
        <el-table :data="result.data" stripe size="small">
          <el-table-column
            v-for="col in dynamicColumns"
            :key="col"
            :prop="col"
            :label="columnLabelMap[col] || col"
            :min-width="120"
            align="center"
            sortable
          />
        </el-table>
      </div>
      <div v-else class="kv-wrapper">
        <el-descriptions :column="isMobile ? 1 : 2" border>
          <el-descriptions-item v-for="(value, key) in result.data" :key="key" :label="key" align="center">
            <span v-if="isPrimitive(value)">{{ value }}</span>
            <el-table v-else :data="normalizeObjectArray(value)" size="small" style="width: 100%">
              <el-table-column v-for="col in getObjCols(value)" :key="col" :prop="col" :label="col" :min-width="120" align="center" />
            </el-table>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchActualRiseRatio, type ActualRiseRatioParams, type ApiResponseAny } from '../../services/mlApi'

/**
 * 默认行为：页面加载即使用默认代码（000001.SH）发起查询，无需用户输入。
 * 方法：onQuery
 * 功能：校验表单并请求后端，获取5日实际上涨比例数据。
 * 参数：无（使用组件内部响应式 `form`）
 * 返回值：无（更新组件状态 `result` 与 `loading`）
 * 事件：无
 */

const isMobile = computed(() => window.innerWidth < 768)

const form = ref<ActualRiseRatioParams>({
  stockCode: '',
  startDate: '',
  endDate: '',
  predictionType: ''
})

const loading = ref(false)
const result = ref<ApiResponseAny | null>(null)

const dynamicColumns = computed(() => {
  if (!result.value || !Array.isArray(result.value.data) || result.value.data.length === 0) return []
  return Object.keys(result.value.data[0] ?? {})
})

// 表头中文映射（仅映射常见字段，未知字段保持原名）
const columnLabelMap: Record<string, string> = {
  market: '市场',
  code: '代码',
  name: '名称',
  trade_date: '交易日期',
  predict_rise_prob: '预测上涨概率',
  confidence: '置信度',
  actual_rise_ratio_5d: '5日实际上涨比例(未满5天则按实际天数计算)',
  prediction_type: '预测类型',
  created_at: '创建时间'
}

const summaryItems = computed(() => {
  const items: { label: string; value: unknown }[] = []
  if (!result.value) return items
  const d: any = result.value.data
  // 常见摘要字段（健壮性：仅在存在时展示）
  if (d && typeof d === 'object') {
    if (d.stock_code) items.push({ label: '代码', value: d.stock_code })
    if (d.start_date) items.push({ label: '开始日期', value: d.start_date })
    if (d.end_date) items.push({ label: '结束日期', value: d.end_date })
    if (d.prediction_type) items.push({ label: '预测类型', value: d.prediction_type })
    if (typeof d.count === 'number') items.push({ label: '记录数', value: d.count })
    if (typeof d.total === 'number') items.push({ label: '总条数', value: d.total })
  }
  return items
})

function isPrimitive(val: unknown) {
  return ['string', 'number', 'boolean'].includes(typeof val) || val === null || val === undefined
}

function normalizeObjectArray(val: unknown): Record<string, unknown>[] {
  if (Array.isArray(val)) {
    return val.map((v) => (typeof v === 'object' && v ? v : { value: v }))
  }
  if (typeof val === 'object' && val) {
    return Object.entries(val as Record<string, unknown>).map(([k, v]) => ({ key: k, value: v }))
  }
  return [{ value: val }]
}

function getObjCols(val: unknown): string[] {
  if (Array.isArray(val)) {
    const first = val.find((v) => typeof v === 'object' && v)
    return first ? Object.keys(first as Record<string, unknown>) : ['value']
  }
  if (typeof val === 'object' && val) {
    return ['key', 'value']
  }
  return ['value']
}

async function onQuery() {
  if (!form.value.stockCode) {
    // 若未提供代码，则采用默认代码
    form.value.stockCode = ''
  }
  loading.value = true
  try {
    // 默认查询最近七天：结束日期为今日，开始日期为7天前
    const format = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    const end = new Date()
    const start = new Date(end)
    // 近7天区间：包含今天在内的最近7个自然日
    start.setDate(end.getDate() - 6)
    const defaultStart = format(start)
    const defaultEnd = format(end)
    const res = await fetchActualRiseRatio(form.value.stockCode, {
      startDate: form.value.startDate || defaultStart,
      endDate: form.value.endDate || defaultEnd,
      predictionType: form.value.predictionType || undefined
    })
    result.value = res
    ElMessage.success('查询成功')
  } catch (err) {
    ElMessage.error('查询失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function onReset() {
  form.value = { stockCode: '', startDate: '', endDate: '', predictionType: '' }
  result.value = null
}

// 页面加载自动查询默认代码数据
onMounted(() => {
  onQuery()
})
</script>

<style scoped>
.ml-index-validation {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.actions {
  display: flex;
  gap: 8px;
}
.table-wrapper, .kv-wrapper, .summary {
  margin-top: 8px;
}
</style>