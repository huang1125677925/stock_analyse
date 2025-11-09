<template>
  <div class="index-dailybasic-view">
    <el-card class="page-header" shadow="hover">
      <template #header>
        <div class="header-content">
          <h2>指数每日基础指标</h2>
          <div class="actions">
            <el-button type="primary" :loading="loading" @click="handleSearch">查询</el-button>
            <el-button @click="resetForm">重置</el-button>
          </div>
        </div>
      </template>
      <div class="search-section">
        <el-form :inline="true" :model="form" class="query-form">
          <el-form-item label="指数代码">
            <el-input v-model="form.tsCode" placeholder="例如 000001.SH" style="width: 200px" />
          </el-form-item>
          <el-form-item label="日期范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYYMMDD"
            />
          </el-form-item>
          <el-form-item label="字段">
            <el-input v-model="form.fields" placeholder="可选，逗号分隔，留空为默认字段" style="width: 320px" />
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <div class="table-section">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>数据列表（{{ totalCount }} 条）</span>
            <el-button link @click="refreshData">刷新</el-button>
          </div>
        </template>
        <el-table :data="records" v-loading="loading" style="width: 100%" height="560">
          <el-table-column v-for="col in dynamicColumns" :key="col" :prop="col" :label="col" show-overflow-tooltip />
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：IndexDailybasicView
 * 功能：
 * - 查询并展示 `/django/api/tasks/index-dailybasic/` 的指数每日基础指标数据
 * - 提供指数代码和日期范围筛选，支持限定字段
 * - 页面挂载时初始化默认参数并自动拉取数据
 * 参数（props）：无
 * 返回值：无
 * 事件（emits）：
 * - loaded: 数据加载完成时触发，传递记录数
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchIndexDailybasic, type IndexDailybasicItem } from '@/services/indexDailybasicApi'

// emits：对外发出 loaded 事件
const emit = defineEmits<{ (e: 'loaded', count: number): void }>()

// 加载状态
const loading = ref(false)

// 表单状态与默认参数
const form = reactive({
  tsCode: '000001.SH',
  fields: '',
})
// 日期范围：默认最近30天
const dateRange = ref<[string, string]>()

// 数据与列
const records = ref<IndexDailybasicItem[]>([])
const dynamicColumns = ref<string[]>([])
const totalCount = ref<number>(0)

function buildDefaultDateRange(days = 30): [string, string] {
  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return [fmt(start), fmt(end)]
}

async function fetchData() {
  try {
    loading.value = true
    const [startDate, endDate] = dateRange.value || buildDefaultDateRange()
    const res = await fetchIndexDailybasic({
      tsCode: form.tsCode,
      startDate,
      endDate,
      fields: form.fields || undefined,
    })
    records.value = res.records || []
    dynamicColumns.value = records.value.length ? Object.keys(records.value[0]) : []
    totalCount.value = res.count || records.value.length
    emit('loaded', totalCount.value)
  } catch (e: any) {
    ElMessage.error(e?.message || '数据加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() { fetchData() }
function refreshData() { fetchData() }
function resetForm() {
  form.tsCode = '000001.SH'
  form.fields = ''
  dateRange.value = buildDefaultDateRange()
  fetchData()
}

onMounted(() => {
  dateRange.value = buildDefaultDateRange()
  fetchData()
})
</script>

<style scoped>
.index-dailybasic-view { padding: 20px; }
.page-header, .search-section, .table-section { margin-bottom: 20px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>