<template>
  <div class="sw-industry-members-tab">
    <el-card shadow="never" class="members-card">
      <template #header>
        <div class="card-header">
          <span>指数成分股列表</span>
        </div>
      </template>
      <div class="form-row">
        <el-form :inline="true">
          <el-form-item label="指数代码">
            <el-tag>{{ indexCode }}</el-tag>
          </el-form-item>
          <el-form-item label="等级">
            <el-tag :type="levelTag">{{ level }}</el-tag>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="fetchMembers">刷新</el-button>
          </el-form-item>
        </el-form>
      </div>
      <el-alert v-if="error" type="error" :closable="false" :title="error" class="mb-12" />
      <el-skeleton v-if="loading && !error" rows="6" animated />
      <div v-else>
        <div v-if="records.length" class="table-wrapper">
          <el-table :data="paginatedRecords" border height="520" stripe style="width: 100%">
            <!-- <el-table-column prop="l1_code" label="一级代码" min-width="100" />
            <el-table-column prop="l1_name" label="一级名称" min-width="120" />
            <el-table-column prop="l2_code" label="二级代码" min-width="100" />
            <el-table-column prop="l2_name" label="二级名称" min-width="120" />
            <el-table-column prop="l3_code" label="三级代码" min-width="100" />
            <el-table-column prop="l3_name" label="三级名称" min-width="140" /> -->
            <el-table-column prop="ts_code" label="股票代码" min-width="120" />
            <el-table-column prop="name" label="股票名称" min-width="120" />
            <el-table-column prop="in_date" label="纳入日期" min-width="110" />
            <el-table-column prop="out_date" label="剔除日期" min-width="110" />
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
import { ref, computed, watch } from 'vue'
import axios from '@/services/axiosConfig'

const props = defineProps<{
  industryCode: string
  indexCode: string
  level: string
}>()

const loading = ref(false)
const error = ref('')
const records = ref<Record<string, any>[]>([])

const currentPage = ref(1)
const pageSize = ref(20)

const total = computed(() => records.value.length || 0)
const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return records.value.slice(start, end)
})

function handleSizeChange(val: number) {
  pageSize.value = val
  currentPage.value = 1
}
function handleCurrentChange(val: number) {
  currentPage.value = val
}

const levelTag = computed(() => {
  switch (props.level) {
    case 'L1': return 'danger'
    case 'L2': return 'warning'
    case 'L3': return 'success'
    default: return 'info'
  }
})

async function fetchMembers() {
  if (!props.indexCode || !props.level) return
  loading.value = true
  error.value = ''
  try {
    const params: Record<string, string> = {}
    if (props.level === 'L1') params.l1_code = props.indexCode
    else if (props.level === 'L2') params.l2_code = props.indexCode
    else if (props.level === 'L3') params.l3_code = props.indexCode
    const res = await axios.get('/django/api/index/sw-industry-members/', { params })
    const data: any = res.data
    if (data && Array.isArray(data.records)) {
      records.value = data.records
      currentPage.value = 1
    } else {
      records.value = []
    }
  } catch (e: any) {
    error.value = e?.message || '请求失败'
    records.value = []
  } finally {
    loading.value = false
  }
}

watch(() => [props.industryCode, props.level], () => {
  fetchMembers()
}, { immediate: true })
</script>

<style scoped>
.members-card {
  border: 1px solid #ebeef5;
}
.form-row {
  margin-bottom: 12px;
}
.table-wrapper {
  margin-top: 12px;
}
.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.mb-12 {
  margin-bottom: 12px;
}
</style>
