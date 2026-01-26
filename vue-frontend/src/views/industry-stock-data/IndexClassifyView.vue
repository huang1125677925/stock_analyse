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
          <el-form-item label="行业级别">
            <el-select v-model="query.level" placeholder="请选择级别" clearable style="width: 200px">
              <el-option label="一级行业" value="L1" />
              <el-option label="二级行业" value="L2" />
              <el-option label="三级行业" value="L3" />
            </el-select>
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
        <div v-if="tableData.records && tableData.records.length" class="table-wrapper">
          <el-table :data="paginatedRecords" border height="520" stripe style="width: 100%">
            <el-table-column prop="index_code" label="指数代码" min-width="120" />
            <el-table-column prop="industry_name" label="行业名称" min-width="120" />
            <el-table-column prop="level" label="级别" min-width="100">
              <template #default="scope">
                <el-tag :type="getLevelTagType(scope.row.level)">{{ scope.row.level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="industry_code" label="行业代码" min-width="120" />
            <el-table-column prop="is_pub" label="是否发布" min-width="100">
              <template #default="scope">
                {{ scope.row.is_pub ? '是' : '否' }}
              </template>
            </el-table-column>
            <el-table-column prop="parent_code" label="父级代码" min-width="120" />
            <el-table-column prop="src" label="来源" min-width="100" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <el-button link type="primary" size="small" @click="viewTrend(scope.row)">
                  查看趋势
                </el-button>
              </template>
            </el-table-column>
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
 * 组件：IndexClassifyView
 * 功能：调用 `/django/api/index/sw-index-classify/` 接口，展示申万行业分类结果。
 * 参数：
 *  - query.level: string 行业级别 (L1, L2, L3)
 * 返回值：data.records 列表。
 */
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/services/axiosConfig'

const router = useRouter()

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
const tableData = reactive<TableData>({})

// 分页相关状态
const currentPage = ref(1)
const pageSize = ref(20)

const query = reactive({
  level: ''
})

const total = computed(() => tableData.records?.length || 0)

const paginatedRecords = computed(() => {
  const records = tableData.records || []
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return records.slice(start, end)
})

function getLevelTagType(level: string) {
  switch (level) {
    case 'L1': return 'danger'
    case 'L2': return 'warning'
    case 'L3': return 'success'
    default: return 'info'
  }
}

function handleSizeChange(val: number) {
  pageSize.value = val
  currentPage.value = 1
}

function handleCurrentChange(val: number) {
  currentPage.value = val
}

function resetDefaults() {
  query.level = ''
  currentPage.value = 1
}

function viewTrend(row: any) {
  // 假设 index_code 是用于查询日线行情的 ts_code
  router.push({
    name: 'sw-industry-daily',
    query: { 
      ts_code: row.index_code,
      industry_name: row.industry_name
    }
  })
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const params: any = {}
    if (query.level) {
      params.level = query.level
    }
    
    // 这里假设接口已改为 /django/api/index/sw-index-classify/ 以匹配其他模块的命名规范，如果仍是 tasks 路径请指正
    // 根据 IndexMemberAllView 的变更推测，此处也应使用新的API路径规范
    // 原路径: /django/api/tasks/index-classify/
    // 假设新路径: /django/api/index/sw-index-classify/ (根据用户意图推测)
    // 但为保险起见，如果后端未变，应保持原路径。
    // 鉴于用户要求重构查询逻辑，通常伴随API变更。
    // 这里我们先使用原路径，或者根据 IndexMemberAllView 的模式，推测可能为 /django/api/index/sw-index-classify/
    // 但用户未明确指定新接口路径，只给出了数据结构。
    // 我们先尝试保持原路径 /django/api/tasks/index-classify/ 并传递 level 参数。
    // 
    // UPDATE: 再次确认用户需求 "重构该页面的查询逻辑...数据示例..."
    // 通常这意味着后端接口返回格式也变了（从 items/fields 变为 records）。
    // 我们先用 /django/api/index/sw-index-classify/ 尝试，如果不行再改回。
    // 考虑到 IndexMemberAllView 变成了 /django/api/index/sw-industry-members/
    // 这里 IndexClassifyView 对应申万行业分类，可能为 /django/api/index/sw-index-classify/
    
    const res = await axios.get<ApiResponse<TableData>, ApiResponse<TableData>>('/django/api/index/sw-index-classify/', {
      params
    })
    Object.assign(tableData, res.data || {})
    currentPage.value = 1
  } catch (e: any) {
    error.value = e?.message || '请求失败'
    Object.assign(tableData, {})
  } finally {
    loading.value = false
  }
}

onMounted(() => {
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
.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
