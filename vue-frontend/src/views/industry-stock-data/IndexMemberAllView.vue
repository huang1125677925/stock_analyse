<template>
  <div class="index-member-all-view">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>申万行业成分构成</span>
        </div>
      </template>

      <div class="form-row">
        <el-form :inline="true" label-width="120px">
          <el-form-item label="一级行业代码">
            <el-input v-model="query.l1_code" placeholder="可选" />
          </el-form-item>
          <el-form-item label="二级行业代码">
            <el-input v-model="query.l2_code" placeholder="可选" />
          </el-form-item>
          <el-form-item label="三级行业代码">
            <el-input v-model="query.l3_code" placeholder="可选" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="fetchMembers">查询</el-button>
            <el-button @click="resetDefaults">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-alert v-if="hint" type="info" :closable="false" :title="hint" class="mb-12" />
      <el-alert v-if="error" type="error" :closable="false" :title="error" class="mb-12" />

      <el-skeleton v-if="loading && !error" rows="6" animated />

      <div v-else>
        <div v-if="tableData.records && tableData.records.length" class="table-wrapper">
          <el-table :data="paginatedRecords" border height="520" stripe style="width: 100%">
            <el-table-column prop="l1_code" label="一级代码" min-width="100" />
            <el-table-column prop="l1_name" label="一级名称" min-width="100" />
            <el-table-column prop="l2_code" label="二级代码" min-width="100" />
            <el-table-column prop="l2_name" label="二级名称" min-width="100" />
            <el-table-column prop="l3_code" label="三级代码" min-width="100" />
            <el-table-column prop="l3_name" label="三级名称" min-width="120" />
            <el-table-column prop="ts_code" label="股票代码" min-width="100" />
            <el-table-column prop="name" label="股票名称" min-width="100" />
            <el-table-column prop="in_date" label="纳入日期" min-width="100" />
            <el-table-column prop="out_date" label="剔除日期" min-width="100" />
            <el-table-column prop="is_new" label="最新" min-width="80" />
          </el-table>
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="total"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
        <el-empty v-else description="暂无数据" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件：IndexMemberAllView
 * 功能：调用 `/django/api/index/sw-industry-members/` 接口，展示申万行业成分构成。
 * 参数：
 *  - query.l1_code: string 一级行业代码（可选）
 *  - query.l2_code: string 二级行业代码（可选）
 *  - query.l3_code: string 三级行业代码（可选）
 * 返回值：data.records 列表。
 */
import { reactive, ref, onMounted, computed } from 'vue'
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
  records?: Record<string, any>[]
}

const loading = ref(false)
const error = ref('')
const hint = ref('')
const tableData = reactive<TableData>({})

// 分页相关状态
const currentPage = ref(1)
const pageSize = ref(20)

const query = reactive({
  l1_code: '',
  l2_code: '',
  l3_code: ''
})

const total = computed(() => tableData.records?.length || 0)

const paginatedRecords = computed(() => {
  const records = tableData.records || []
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return records.slice(start, end)
})

function handleSizeChange(val: number) {
  pageSize.value = val
  currentPage.value = 1 // 切换每页条数时重置到第一页
}

function handleCurrentChange(val: number) {
  currentPage.value = val
}

function resetDefaults() {
  query.l1_code = ''
  query.l2_code = ''
  query.l3_code = ''
  currentPage.value = 1
}

async function fetchMembers() {
  loading.value = true
  error.value = ''
  hint.value = ''
  try {
    const params = { ...query }
    // 过滤掉空参数
    const filteredParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '')
    );

    const res = await axios.get<ApiResponse<TableData>, ApiResponse<TableData>>('/django/api/index/sw-industry-members/', {
      params: filteredParams
    })
    Object.assign(tableData, res.data || {})
    currentPage.value = 1 // 查询后重置到第一页
    if (!tableData.records || tableData.records.length === 0) {
      hint.value = '查询成功但数据为空，请尝试调整查询条件'
    }
  } catch (e: any) {
    error.value = e?.message || '请求失败'
    Object.assign(tableData, {})
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
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
.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
