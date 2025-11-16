<template>
  <div class="etf-basic-view">
    <div class="page-header">
      <div class="header-content">
        <h2>ETF 基本信息</h2>
        <el-space>
          <el-button type="primary" :loading="loading" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button @click="refreshData"><el-icon><Refresh /></el-icon>刷新</el-button>
        </el-space>
      </div>
    </div>

    <el-card class="search-card">
      <el-form :model="query" label-width="110px" label-position="left" inline>
        <el-form-item label="TS代码">
          <el-input v-model="query.ts_code" placeholder="如 510300.SH" clearable />
        </el-form-item>
        <el-form-item label="指数代码">
          <el-input v-model="query.index_code" placeholder="如 000300.SH" clearable />
        </el-form-item>
        <el-form-item label="交易所">
          <el-input v-model="query.exchange" placeholder="如 SSE/ SZSE" clearable />
        </el-form-item>
        <el-form-item label="上市状态">
          <el-select v-model="query.list_status" placeholder="全部" clearable style="width: 160px">
            <el-option label="全部" value="" />
            <el-option label="上市" value="L" />
            <el-option label="退市" value="D" />
            <el-option label="暂停" value="P" />
          </el-select>
        </el-form-item>
        <el-form-item label="ETF类型">
          <el-input v-model="query.etf_type" placeholder="如 指数、行业 等" clearable />
        </el-form-item>
        <el-form-item label="管理人">
          <el-input v-model="query.mgr_name" placeholder="基金管理人简称" clearable />
        </el-form-item>
        <el-form-item label="名称关键词">
          <el-input v-model="query.name" placeholder="支持模糊搜索" clearable />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="items" v-loading="loading" border style="width: 100%">
        <el-table-column prop="extname" label="ETF简称" min-width="160" />
        <el-table-column prop="ts_code" label="TS代码" min-width="140" />
        <el-table-column prop="index_name" label="跟踪指数" min-width="160" />
        <el-table-column prop="exchange" label="交易所" min-width="120" />
        <el-table-column prop="list_status" label="上市状态" min-width="100" />
        <el-table-column prop="mgr_name" label="管理人" min-width="160" />
        <!-- 补充其他字段展示：包含基金名称、代码、类型、费率、日期与托管人等 -->
        <el-table-column prop="csname" label="基金简称" min-width="160" />
        <el-table-column prop="cname" label="基金全称" min-width="240" />
        <el-table-column prop="index_code" label="指数代码" min-width="140" />
        <el-table-column prop="etf_type" label="ETF类型" min-width="120" />
        <el-table-column prop="mgt_fee" label="管理费率" min-width="100" />
        <el-table-column prop="setup_date" label="成立日期" min-width="120" />
        <el-table-column prop="list_date" label="上市日期" min-width="120" />
        <el-table-column prop="delist_date" label="退市日期" min-width="120" />
        <el-table-column prop="custod_name" label="托管人" min-width="180" />
        <el-table-column prop="created_at" label="创建时间" min-width="180" />
        <el-table-column prop="updated_at" label="更新时间" min-width="180" />
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          v-model:page-size="pagination.page_size"
          v-model:current-page="pagination.page"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：EtfBasicView
 * 功能：调用 `/django/api/etf/basic/` 接口，按筛选条件分页展示 ETF 基本信息。
 * 参数：无（页面组件不接收外部 props）。
 * 返回值：无（页面不向父组件返回值）。
 * 事件：无（页面不主动对外 emit 事件）。
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getEtfBasic, type EtfBasicItem } from '@/services/etfApi'

// 加载状态
const loading = ref(false)

// 列表与分页
const items = ref<EtfBasicItem[]>([])
const pagination = reactive({ page: 1, page_size: 20, total: 0, pages: 0 })

// 查询条件
const query = reactive({
  ts_code: '',
  index_code: '',
  exchange: '',
  list_status: '',
  etf_type: '',
  mgr_name: '',
  name: '',
})

// 获取数据
const fetchList = async () => {
  loading.value = true
  try {
    const data = await getEtfBasic({
      ts_code: query.ts_code || undefined,
      index_code: query.index_code || undefined,
      exchange: query.exchange || undefined,
      list_status: query.list_status || undefined,
      etf_type: query.etf_type || undefined,
      mgr_name: query.mgr_name || undefined,
      name: query.name || undefined,
      page: pagination.page,
      page_size: pagination.page_size,
    })
    items.value = data.data || []
    pagination.total = data.total || 0
    pagination.pages = data.pages || 0
  } catch (e: any) {
    ElMessage.error(e?.message || 'ETF 基本信息获取失败')
  } finally {
    loading.value = false
  }
}

// 操作
const handleSearch = () => {
  pagination.page = 1
  fetchList()
}

const handleReset = () => {
  query.ts_code = ''
  query.index_code = ''
  query.exchange = ''
  query.list_status = ''
  query.etf_type = ''
  query.mgr_name = ''
  query.name = ''
  pagination.page = 1
  fetchList()
}

const refreshData = () => fetchList()

const handleSizeChange = (size: number) => {
  pagination.page_size = size
  pagination.page = 1
  fetchList()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  fetchList()
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.etf-basic-view { padding: 20px; }
.page-header { margin-bottom: 12px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.search-card { margin-bottom: 12px; }
.table-card { margin-top: 8px; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>