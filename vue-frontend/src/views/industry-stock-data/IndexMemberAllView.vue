<template>
  <div class="index-member-all-view">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>申万行业成分构成（分级/TS代码）</span>
        </div>
      </template>

      <div class="form-row">
        <el-form :inline="true" label-width="120px">
          <el-form-item label="是否最新">
            <el-select v-model="query.is_new" style="width: 120px">
              <el-option :value="1" label="是" />
              <el-option :value="0" label="否" />
            </el-select>
          </el-form-item>
          <el-form-item label="一级行业代码">
            <el-input v-model="query.l1_code" placeholder="可选，与l2/l3/ts_code二选一" />
          </el-form-item>
          <el-form-item label="二级行业代码">
            <el-input v-model="query.l2_code" placeholder="可选" />
          </el-form-item>
          <el-form-item label="三级行业代码">
            <el-input v-model="query.l3_code" placeholder="可选" />
          </el-form-item>
          <el-form-item label="TS代码">
            <el-input v-model="query.ts_code" placeholder="优先使用(来自分类接口)" />
          </el-form-item>
          <el-form-item label="字段列表">
            <el-input v-model="query.fields" placeholder="例如: index_code,ts_code,name,weight" />
          </el-form-item>
          <el-form-item label="Token">
            <el-input v-model="query.token" placeholder="可留空，走服务端默认" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="fetchMembers">查询</el-button>
            <el-button @click="resetDefaults">重置默认</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-alert v-if="hint" type="info" :closable="false" :title="hint" class="mb-12" />
      <el-alert v-if="error" type="error" :closable="false" :title="error" class="mb-12" />

      <el-skeleton v-if="loading && !error" rows="6" animated />

      <div v-else>
        <div v-if="tableData.items && tableData.fields" class="table-wrapper">
          <el-table :data="normalizedItems" border height="520">
            <el-table-column v-for="col in tableData.fields" :key="String(col)" :prop="String(col)" :label="String(col)" />
          </el-table>
        </div>
        <div v-else-if="tableData.records && tableData.records.length" class="table-wrapper">
          <el-table :data="tableData.records" border height="520">
            <el-table-column v-for="(val, key) in tableData.records[0]" :key="String(key)" :prop="String(key)" :label="String(key)" />
          </el-table>
        </div>
        <el-empty v-else description="暂无数据" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件：IndexMemberAllView
 * 功能：调用 `/django/api/tasks/index-member-all/` 接口，展示申万行业成分构成。
 * 参数：
 *  - query.fields: string 字段列表，逗号分隔，默认 "index_code,ts_code,name,weight"
 *  - query.is_new: number 是否最新(1/0)，默认 1
 *  - query.l1_code: string 一级行业代码（可选）
 *  - query.l2_code: string 二级行业代码（可选）
 *  - query.l3_code: string 三级行业代码（可选）
 *  - query.ts_code: string 行业或指数TS代码（优先使用），默认尝试从分类接口获取首个 index_code
 *  - query.token: string Tushare API Token，可不填
 * 返回值：接口通用响应结构，优先支持 data.fields + data.items；其次支持 data.records。
 * 事件：
 *  - 无对外自定义事件；内部提供查询与重置操作；首次挂载尝试自动选取一个TS代码进行预加载。
 */
import { reactive, ref, computed, onMounted } from 'vue'
import axios from '@/services/axiosConfig'

interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

interface TableData {
  interface?: string
  count?: number
  fields?: string[]
  items?: (string | number)[][]
  records?: Record<string, any>[]
}

const loading = ref(false)
const error = ref('')
const hint = ref('')
const tableData = reactive<TableData>({})

const query = reactive({
  fields: 'index_code,ts_code,name,weight',
  is_new: 1 as 0 | 1,
  l1_code: '',
  l2_code: '',
  l3_code: '',
  ts_code: '',
  token: ''
})

const normalizedItems = computed<Record<string, any>[]>(() => {
  if (!tableData.items || !tableData.fields) return []
  return tableData.items.map((row) => {
    const obj: Record<string, any> = {}
    tableData.fields!.forEach((f, i) => {
      obj[String(f)] = row[i]
    })
    return obj
  })
})

function resetDefaults() {
  query.fields = 'index_code,ts_code,name,weight'
  query.is_new = 1
  query.l1_code = ''
  query.l2_code = ''
  query.l3_code = ''
  query.token = ''
  // ts_code 保留当前选择，便于快速重查
}

async function fetchMembers() {
  loading.value = true
  error.value = ''
  hint.value = ''
  try {
    const params = { ...query }
    const res = await axios.get<ApiResponse<TableData>, ApiResponse<TableData>>('/django/api/tasks/index-member-all/', {
      params
    })
    Object.assign(tableData, res.data || {})
    if (!tableData.items && !tableData.records) {
      hint.value = '查询成功但数据为空，请尝试调整代码或字段参数'
    }
  } catch (e: any) {
    error.value = e?.message || '请求失败'
    Object.assign(tableData, {})
  } finally {
    loading.value = false
  }
}

async function prefetchDefaultTsCode() {
  // 尝试从分类接口拿到一个 index_code 作为默认 ts_code
  try {
    const res = await axios.get<ApiResponse<TableData>, ApiResponse<TableData>>('/django/api/tasks/index-classify/', {
      params: { fields: 'index_code,industry,level,name' }
    })
    const d = res.data
    let firstIndexCode = ''
    if (d?.items && d?.fields) {
      const idx = d.fields.indexOf('index_code')
      if (idx >= 0 && d.items.length) {
        firstIndexCode = String(d.items[0][idx] ?? '')
      }
    } else if (d?.records && d.records.length) {
      const r0 = d.records[0]
      if (r0 && r0.index_code) firstIndexCode = String(r0.index_code)
    }
    if (firstIndexCode) {
      query.ts_code = firstIndexCode
    }
  } catch {
    // 静默失败，不影响后续查询
  }
}

onMounted(async () => {
  // 先尝试预取一个 ts_code；若成功则直接进行一次默认查询
  await prefetchDefaultTsCode()
  await fetchMembers()
})
</script>

<style scoped>
.index-member-all-view {
  padding: 12px;
}
.form-row {
  margin-bottom: 12px;
}
.table-wrapper {
  margin-top: 12px;
}
.mb-12 {
  margin-bottom: 12px;
}
</style>