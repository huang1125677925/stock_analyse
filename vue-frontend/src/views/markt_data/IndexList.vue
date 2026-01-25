<template>
  <div class="index-list" v-loading="loading" element-loading-text="正在加载指数数据...">
    <!-- 搜索和筛选区域 -->
    <div class="search-section">
      <el-card shadow="hover">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="市场">
            <el-select 
              v-model="searchForm.market" 
              placeholder="选择市场" 
              style="width: 160px" 
              clearable
              @change="fetchIndexList"
            >
              <el-option label="MSCI指数" value="MSCI" />
              <el-option label="中证指数" value="CSI" />
              <el-option label="上交所指数" value="SSE" />
              <el-option label="深交所指数" value="SZSE" />
              <el-option label="中金指数" value="CICC" />
              <el-option label="申万指数" value="SW" />
              <el-option label="其他指数" value="OTH" />
            </el-select>
          </el-form-item>
          <el-form-item label="类别">
            <el-select 
              v-model="searchForm.category" 
              placeholder="选择类别" 
              style="width: 160px" 
              clearable
              @change="handleSearch"
            >
              <el-option 
                v-for="cat in categoryOptions" 
                :key="cat" 
                :label="cat" 
                :value="cat" 
              />
            </el-select>
          </el-form-item>
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
            <el-button @click="refreshData" :loading="loading" :icon="Refresh">
              刷新
            </el-button>
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
          <el-table-column prop="ts_code" label="指数代码" width="200" align="center">
            <template #default="{ row }">
              <el-tag type="primary">{{ row.ts_code }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="指数名称" min-width="200" align="center" show-overflow-tooltip />
          <el-table-column prop="market" label="市场" width="100" align="center" />
          <el-table-column prop="publisher" label="发布商" width="150" show-overflow-tooltip />
          <el-table-column prop="category" label="类别" width="120" align="center" />
          
          <el-table-column label="操作" width="100" align="center" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                link
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
import { fetchIndexBasicList, type IndexBasicItem } from '@/services/indexBasicApi'

const router = useRouter()

/**
 * 指数列表页面组件
 * 功能：展示股票市场指数基础信息，支持搜索、分页和查看详情
 * 改动：使用 fetchIndexBasicList 接口，并实现前端分页和搜索
 */

interface PaginationInfo {
  current_page: number
  total_count: number
  page_size: number
}

// 响应式数据
const loading = ref(false)
// 存储所有从接口获取的数据
const allIndexList = ref<IndexBasicItem[]>([])
// 当前页显示的数据
const indexList = ref<IndexBasicItem[]>([])
// 类别选项
const categoryOptions = ref<string[]>([])

const pagination = reactive<PaginationInfo>({
  current_page: 1,
  total_count: 0,
  page_size: 20
})

// 搜索表单
const searchForm = reactive({
  search: '',
  code: '',
  market: 'SSE', // 默认上交所
  category: ''
})

// 获取指数列表数据
const fetchIndexList = async () => {
  loading.value = true
  try {
    // 获取所有数据，参数传空对象获取全部（或根据API行为）
    // 这里我们先获取列表，然后在前端进行搜索和分页
    // 根据市场参数获取数据
    const list = await fetchIndexBasicList({
      market: searchForm.market || undefined
    })
    allIndexList.value = list
    
    // 提取类别选项
    const categories = new Set<string>()
    list.forEach(item => {
      if (item.category) {
        categories.add(item.category)
      }
    })
    categoryOptions.value = Array.from(categories).sort()
    
    // 执行初始筛选和分页
    filterAndPaginate()
  } catch (error) {
    console.error('获取指数列表失败:', error)
    ElMessage.error('网络请求失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 前端筛选和分页逻辑
const filterAndPaginate = () => {
  let result = [...allIndexList.value]

  // 1. 筛选
  const searchKw = searchForm.search.trim().toLowerCase()
  const searchCode = searchForm.code.trim().toLowerCase()
  const searchCategory = searchForm.category

  // 类别筛选
  if (searchCategory) {
    result = result.filter(item => item.category === searchCategory)
  }

  if (searchKw) {
    result = result.filter(item => 
      (item.ts_code && item.ts_code.toLowerCase().includes(searchKw)) || 
      (item.name && item.name.toLowerCase().includes(searchKw))
    )
  }

  if (searchCode) {
    result = result.filter(item => 
      item.ts_code && item.ts_code.toLowerCase() === searchCode
    )
  }

  // 更新总数
  pagination.total_count = result.length

  // 2. 分页
  const start = (pagination.current_page - 1) * pagination.page_size
  const end = start + pagination.page_size
  indexList.value = result.slice(start, end)
}

// 搜索处理
const handleSearch = () => {
  pagination.current_page = 1
  filterAndPaginate()
}

// 重置搜索
const handleReset = () => {
  searchForm.search = ''
  searchForm.code = ''
  searchForm.market = 'SSE'
  searchForm.category = ''
  pagination.current_page = 1
  // 重置时也重新获取数据
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
  filterAndPaginate()
}

// 当前页改变
const handleCurrentChange = (newPage: number) => {
  pagination.current_page = newPage
  filterAndPaginate()
}

// 查看指数详情
const viewIndexDetail = (row: IndexBasicItem) => {
  router.push({
    path: '/analysis/index-analysis',
    query: {
      ts_code: row.ts_code,
      market: row.market
    }
  })
  ElMessage.success(`正在跳转到指数分析: ${row.name || ''} (${row.ts_code})`)
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
