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
        <el-form-item label="指数代码">
          <el-select 
            v-model="query.index_code" 
            placeholder="选择或搜索指数" 
            clearable 
            filterable
            style="width: 200px"
          >
            <el-option
              v-for="item in indexCodeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="ETF代码">
          <el-select
            v-model="query.ts_code"
            placeholder="选择或搜索 ETF 代码/名称"
            filterable
            remote
            reserve-keyword
            clearable
            :remote-method="remoteSearchEtf"
            :loading="selectLoading"
            style="width: 220px"
          >
            <el-option
              v-for="item in etfOptions"
              :key="item.ts_code"
              :label="`${item.extname || item.csname || item.cname || ''}（${item.ts_code}）`"
              :value="item.ts_code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="交易所">
          <el-select 
            v-model="query.exchange" 
            placeholder="选择交易所" 
            clearable 
            style="width: 140px"
          >
            <el-option
              v-for="item in exchangeOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="上市状态">
          <el-select v-model="query.list_status" placeholder="全部" clearable style="width: 160px">
            <el-option label="全部" value="" />
            <el-option label="上市" value="L" />
            <el-option label="退市" value="D" />
            <el-option label="暂停" value="P" />
          </el-select>
        </el-form-item>
        <el-form-item label="上市年份">
          <el-select 
            v-model="query.list_year" 
            placeholder="选择年份" 
            clearable 
            style="width: 120px"
          >
            <el-option
              v-for="y in listYearOptions"
              :key="y"
              :label="y"
              :value="y"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="ETF类型">
          <el-select 
            v-model="query.etf_type" 
            placeholder="选择类型" 
            clearable 
            style="width: 160px"
          >
            <el-option
              v-for="item in etfTypeOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="管理人">
          <el-select 
            v-model="query.mgr_name" 
            placeholder="选择或搜索管理人" 
            clearable 
            filterable
            style="width: 180px"
          >
            <el-option
              v-for="item in mgrNameOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="名称关键词">
          <el-input v-model="query.name" placeholder="支持模糊搜索" clearable />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="items" v-loading="loading" border style="width: 100%">
        <el-table-column prop="extname" label="ETF简称" min-width="160" align="center" />
        <el-table-column prop="ts_code" label="ETF代码" min-width="140" align="center" />
        <el-table-column prop="index_name" label="跟踪指数" min-width="160" align="center" />
        <el-table-column prop="index_code" label="指数代码" min-width="140" align="center">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="goToIndexAnalysis(row.index_code)">
              {{ row.index_code }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="exchange" label="交易所" min-width="80" align="center" />
        <!-- <el-table-column prop="list_status" label="上市状态" min-width="100" align="center" /> -->
        <!-- <el-table-column prop="mgr_name" label="管理人" min-width="160" align="center" /> -->
        <!-- 补充其他字段展示：包含基金名称、代码、类型、费率、日期与托管人等 -->
        <el-table-column prop="csname" label="基金简称" min-width="160" align="center" />
        <!-- <el-table-column prop="cname" label="基金全称" min-width="240" align="center" /> -->
        <el-table-column prop="etf_type" label="ETF类型" min-width="120" align="center" />
        <el-table-column prop="mgt_fee" label="管理费率" min-width="100" align="center" />
        <!-- <el-table-column prop="setup_date" label="成立日期" min-width="120" align="center" /> -->
        <el-table-column prop="list_date" label="上市日期" min-width="120" align="center" />
        <el-table-column prop="delist_date" label="退市日期" min-width="120" align="center" />
        <el-table-column prop="custod_name" label="托管人" min-width="180" align="center" />
        <!-- <el-table-column prop="created_at" label="创建时间" min-width="180" /> -->
        <!-- <el-table-column prop="updated_at" label="更新时间" min-width="180" /> -->
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
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getEtfBasic, type EtfBasicItem } from '@/services/etfApi'

const router = useRouter()

// 加载状态
const loading = ref(false)
const selectLoading = ref(false)

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
  list_year: '',
})

// 下拉选项数据
const indexCodeOptions = ref<{ value: string; label: string }[]>([])
const exchangeOptions = ref<string[]>([])
const etfTypeOptions = ref<string[]>([])
const mgrNameOptions = ref<string[]>([])
const listYearOptions = ref<string[]>([])

// ETF 代码远程搜索选项
const etfOptions = ref<EtfBasicItem[]>([])

// 远程搜索 ETF 基础列表，用于下拉选项
const remoteSearchEtf = async (keyword: string) => {
  const q = (keyword || '').trim()
  if (!q) return
  selectLoading.value = true
  try {
    const isTsCode = /^[0-9]{3,6}\.[A-Z]{2,3}$/.test(q)
    const res = await getEtfBasic({
      ts_code: isTsCode ? q : undefined,
      name: !isTsCode ? q : undefined,
      page: 1,
      page_size: 20,
    })
    etfOptions.value = res.data || []
  } catch (e: any) {
    ElMessage.error(e?.message || 'ETF 基础列表搜索失败')
  } finally {
    selectLoading.value = false
  }
}

// 获取筛选选项数据（全量）
const fetchFilterOptions = async () => {
  try {
    // 获取全量数据用于提取选项（假设数量不超过 5000，如果更多需要后端提供专用接口）
    const data = await getEtfBasic({
      page: 1,
      page_size: 5000
    })
    
    if (data.data) {
      const records = data.data
      
      // 提取指数代码
      const indexMap = new Map<string, string>()
      records.forEach(item => {
        if (item.index_code) {
          indexMap.set(item.index_code, item.index_name || '')
        }
      })
      indexCodeOptions.value = Array.from(indexMap.entries()).map(([code, name]) => ({
        value: code,
        label: name ? `${code} ${name}` : code
      }))

      // 提取交易所
      const exchanges = new Set<string>()
      records.forEach(item => {
        if (item.exchange) exchanges.add(item.exchange)
      })
      exchangeOptions.value = Array.from(exchanges).sort()

      // 提取ETF类型
      const types = new Set<string>()
      records.forEach(item => {
        if (item.etf_type) types.add(item.etf_type)
      })
      etfTypeOptions.value = Array.from(types).sort()

      // 提取管理人
      const mgrs = new Set<string>()
      records.forEach(item => {
        if (item.mgr_name) mgrs.add(item.mgr_name)
      })
      mgrNameOptions.value = Array.from(mgrs).sort((a, b) => a.localeCompare(b, 'zh-CN'))

      // 提取上市年份
      const years = new Set<string>()
      records.forEach(item => {
        const d = item.list_date || ''
        if (d && d.length >= 4) {
          years.add(d.slice(0, 4))
        }
      })
      listYearOptions.value = Array.from(years).sort((a, b) => b.localeCompare(a))
    }
  } catch (e) {
    console.error('获取筛选选项失败', e)
  }
}

// 获取数据
const fetchList = async () => {
  loading.value = true
  try {
    const needClientFilterByYear = !!query.list_year
    if (needClientFilterByYear) {
      const all = await getEtfBasic({
        ts_code: query.ts_code || undefined,
        index_code: query.index_code || undefined,
        exchange: query.exchange || undefined,
        list_status: query.list_status || undefined,
        etf_type: query.etf_type || undefined,
        mgr_name: query.mgr_name || undefined,
        name: query.name || undefined,
        page: 1,
        page_size: 5000,
      })
      const records = (all.data || []).filter(it => {
        const d = it.list_date || ''
        return d && d.startsWith(query.list_year)
      })
      const total = records.length
      const pages = Math.ceil(total / pagination.page_size)
      const start = (pagination.page - 1) * pagination.page_size
      const end = start + pagination.page_size
      items.value = records.slice(start, end)
      pagination.total = total
      pagination.pages = pages
      if (pagination.page > pages) {
        pagination.page = Math.max(1, pages)
      }
    } else {
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
    }
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
   query.list_year = ''
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

const goToIndexAnalysis = (indexCode: string) => {
  if (!indexCode) return
  router.push({
    name: 'index-analysis',
    query: { ts_code: indexCode }
  })
}

onMounted(() => {
  fetchFilterOptions()
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
