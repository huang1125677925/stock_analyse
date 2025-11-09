<template>
  <div class="index-classify-view">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>申万行业分类查询</span>
        </div>
      </template>

      <div class="form-row">
        <el-form :inline="true" label-width="100px">
          <el-form-item label="字段列表">
            <el-input v-model="query.fields" placeholder="例如: index_code,industry,level,name" />
          </el-form-item>
          <el-form-item label="Token">
            <el-input v-model="query.token" placeholder="可留空，走服务端默认" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="fetchData">查询</el-button>
            <el-button @click="resetDefaults">重置默认</el-button>
          </el-form-item>
        </el-form>
      </div>

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
 * 组件：IndexClassifyView
 * 功能：调用 `/django/api/tasks/index-classify/` 接口，展示申万行业分类结果。
 * 参数：
 *  - query.fields: string 字段列表，逗号分隔，默认 "index_code,industry,level,name"
 *  - query.token: string Tushare API Token，可不填（服务端可能有默认）
 * 返回值：接口通用响应结构，优先支持 data.fields + data.items；其次支持 data.records。
 * 事件：
 *  - 无对外自定义事件；内部提供查询与重置操作按钮。
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
const tableData = reactive<TableData>({})

const query = reactive({
  fields: 'index_code,industry,level,name',
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
  query.fields = 'index_code,industry,level,name'
  query.token = ''
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get<ApiResponse<TableData>, ApiResponse<TableData>>('/django/api/tasks/index-classify/', {
      params: { ...query }
    })
    Object.assign(tableData, res.data || {})
  } catch (e: any) {
    error.value = e?.message || '请求失败'
    Object.assign(tableData, {})
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 默认加载一轮数据
  fetchData()
})
</script>

<style scoped>
.index-classify-view {
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