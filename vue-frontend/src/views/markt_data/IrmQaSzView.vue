<template>
  <div class="irm-qa-sz-view">
    <el-card class="page-header" shadow="hover">
      <template #header>
        <div class="header-content">
          <h2>深证 互动易问答</h2>
          <div class="actions">
            <el-button type="primary" :loading="loading" @click="handleSearch">查询</el-button>
            <el-button @click="resetForm">重置</el-button>
          </div>
        </div>
      </template>
      <div class="search-section">
        <el-form :inline="true" :model="form" class="query-form">
          <el-form-item label="股票代码">
            <el-input v-model="form.tsCode" placeholder="可选，例：000001.SZ" style="width: 200px" />
          </el-form-item>
          <el-form-item label="发布日期范围">
            <el-date-picker
              v-model="pubDateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              value-format="YYYY-MM-DD HH:mm:ss"
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
            <span>问答列表（{{ totalCount }} 条）</span>
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
 * 组件名称：IrmQaSzView
 * 功能：
 * - 查询并展示 `/django/api/tasks/irm-qa-sz/` 的深证 互动易董秘问答数据
 * - 提供股票代码与发布日期范围筛选，支持限定字段
 * - 页面挂载时初始化默认参数并自动拉取数据
 * 参数（props）：无
 * 返回值：无
 * 事件（emits）：
 * - loaded: 数据加载完成时触发，传递记录数
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchIrmQaSz, type IrmQaItem } from '@/services/irmQaApi'

const emit = defineEmits<{ (e: 'loaded', count: number): void }>()

const loading = ref(false)

const form = reactive({
  tsCode: '',
  fields: '',
})
const pubDateRange = ref<[string, string]>()

const records = ref<IrmQaItem[]>([])
const dynamicColumns = ref<string[]>([])
const totalCount = ref<number>(0)

function buildDefaultPubDateRange(days = 7): [string, string] {
  const now = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const HH = String(d.getHours()).padStart(2, '0')
    const MM = String(d.getMinutes()).padStart(2, '0')
    const SS = String(d.getSeconds()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`
  }
  return [fmt(start), fmt(now)]
}

async function fetchData() {
  try {
    loading.value = true
    const [pubStart, pubEnd] = pubDateRange.value || buildDefaultPubDateRange()
    const res = await fetchIrmQaSz({
      tsCode: form.tsCode || undefined,
      pubDateStart: pubStart,
      pubDateEnd: pubEnd,
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
  form.tsCode = ''
  form.fields = ''
  pubDateRange.value = buildDefaultPubDateRange()
  fetchData()
}

onMounted(() => {
  pubDateRange.value = buildDefaultPubDateRange()
  fetchData()
})
</script>

<style scoped>
.irm-qa-sz-view { padding: 20px; }
.page-header, .search-section, .table-section { margin-bottom: 20px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>