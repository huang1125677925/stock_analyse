<template>
  <div class="index-list" v-loading="loading" element-loading-text="正在加载指数数据...">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-card shadow="hover">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">指数列表</h1>
            <p class="page-subtitle">查看和管理股票市场指数基础信息</p>
          </div>
          <div class="header-actions">
            <el-button @click="refreshData" :loading="loading" :icon="Refresh" type="primary">
              刷新数据
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 搜索和筛选区域 -->
    <div class="search-section">
      <el-card shadow="hover">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="搜索关键词">
            <el-input
              v-model="searchForm.search"
              placeholder="输入指数代码或名称"
              clearable
              style="width: 200px"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="指数代码">
            <el-input
              v-model="searchForm.code"
              placeholder="精确匹配指数代码"
              clearable
              style="width: 150px"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch" :loading="loading">
              搜索
            </el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-card shadow="hover">
        <template #header>
          <div class="table-header">
            <span>指数数据列表</span>
            <span class="total-count" v-if="pagination.total_count">
              共 {{ pagination.total_count }} 条记录
            </span>
          </div>
        </template>
        
        <el-table
          :data="indexList"
          stripe
          border
          style="width: 100%"
          :empty-text="loading ? '正在加载...' : '暂无数据'"
        >
          <el-table-column prop="id" label="ID" width="80" align="center" />
          <el-table-column prop="code" label="指数代码" width="120" align="center">
            <template #default="{ row }">
              <el-tag type="primary">{{ row.code }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="指数名称" min-width="200" show-overflow-tooltip />
          <el-table-column prop="created_at" label="创建时间" width="180" align="center">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="180" align="center">
            <template #default="{ row }">
              {{ formatDateTime(row.updated_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                size="small"
                @click="viewIndexDetail(row)"
              >
                查看详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页组件 -->
        <div class="pagination-wrapper" v-if="pagination.total_count > 0">
          <el-pagination
            v-model:current-page="pagination.current_page"
            v-model:page-size="pagination.page_size"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total_count"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getIndexBasicData } from '@/services/marketIndexApi'

const router = useRouter()

/**
 * 指数列表页面组件
 * 功能：展示股票市场指数基础信息，支持搜索、分页和查看详情
 * 参数：无
 * 返回值：无
 * 事件：无
 */

// 接口数据类型定义
interface IndexItem {
  id: number
  code: string
  name: string
  created_at: string
  updated_at: string
}

interface PaginationInfo {
  current_page: number
  total_pages: number
  total_count: number
  page_size: number
  has_next: boolean
  has_previous: boolean
}

interface ApiResponse {
  code: number
  message: string
  data: {
    list: IndexItem[]
    pagination: PaginationInfo
  }
}

// 响应式数据
const loading = ref(false)
const indexList = ref<IndexItem[]>([])
const pagination = reactive<PaginationInfo>({
  current_page: 1,
  total_pages: 0,
  total_count: 0,
  page_size: 20,
  has_next: false,
  has_previous: false
})

// 搜索表单
const searchForm = reactive({
  search: '',
  code: ''
})

// 获取指数列表数据
const fetchIndexList = async () => {
  loading.value = true
  try {
    const res = await getIndexBasicData({
      page: pagination.current_page,
      page_size: pagination.page_size,
      search: searchForm.search.trim() || undefined,
      code: searchForm.code.trim() || undefined
    })

    indexList.value = res.list
    Object.assign(pagination, res.pagination)
  } catch (error) {
    console.error('获取指数列表失败:', error)
    ElMessage.error('网络请求失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.current_page = 1
  fetchIndexList()
}

// 重置搜索
const handleReset = () => {
  searchForm.search = ''
  searchForm.code = ''
  pagination.current_page = 1
  fetchIndexList()
}

// 刷新数据
const refreshData = () => {
  fetchIndexList()
}

// 分页大小改变
const handleSizeChange = (newSize: number) => {
  pagination.page_size = newSize
  pagination.current_page = 1
  fetchIndexList()
}

// 当前页改变
const handleCurrentChange = (newPage: number) => {
  pagination.current_page = newPage
  fetchIndexList()
}

// 查看指数详情
const viewIndexDetail = (row: IndexItem) => {
  router.push(`/stock-history/${row.code}`)
  ElMessage.success(`正在跳转到股票历史: ${row.name} (${row.code})`)
}

// 格式化日期时间
const formatDateTime = (dateString: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 组件挂载时获取数据
onMounted(() => {
  fetchIndexList()
})
</script>

<style scoped lang="scss">
.index-list {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;

  .page-header {
    margin-bottom: 20px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .title-section {
        .page-title {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
          color: #303133;
        }

        .page-subtitle {
          margin: 0;
          font-size: 14px;
          color: #909399;
        }
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }
    }
  }

  .search-section {
    margin-bottom: 20px;

    .search-form {
      .el-form-item {
        margin-bottom: 0;
      }
    }
  }

  .table-section {
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .total-count {
        font-size: 14px;
        color: #909399;
      }
    }

    .pagination-wrapper {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .index-list {
    padding: 10px;

    .page-header .header-content {
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;
    }

    .search-section .search-form {
      .el-form-item {
        display: block;
        margin-bottom: 12px;
      }
    }
  }
}
</style>