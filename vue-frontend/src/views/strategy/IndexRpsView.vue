<template>
  <div class="index-rps-view" v-loading="loading" element-loading-text="正在加载指数RPS数据...">
    <!-- 已移除周期选择 -->

    <!-- RPS数据表格 -->
    <div class="rps-data-section" v-if="rpsData.length > 0">
      <el-card shadow="hover">
        <template #header>
          <div class="table-header">
            <div class="table-controls">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索指数名称"
                :prefix-icon="Search"
                clearable
                style="width: 200px"
              />
              <el-select
                v-model="idxType"
                placeholder="选择板块类型"
                style="width: 160px; margin-left: 12px"
              >
                <el-option label="行业板块" value="行业板块" />
                <el-option label="概念板块" value="概念板块" />
                <el-option label="地域板块" value="地域板块" />
              </el-select>
            </div>
          </div>
        </template>
        
        <el-table
          :data="paginatedRpsData"
          stripe
          border
          style="width: 100%"
          :default-sort="{ prop: getDefaultSortProp(), order: 'descending' }"
          height="600"
          :row-class-name="tableRowClassName"
          highlight-current-row
          @sort-change="handleSortChange"
        >
          <!-- 固定列 -->
          <el-table-column type="index" label="#" width="50" fixed="left" align="center" />
          <el-table-column prop="ts_code" label="ts_code" width="150" sortable="custom" fixed="left" align="center">
            <template #default="scope">
              <el-tag size="small" effect="plain">{{ scope.row.ts_code }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="name" width="150" sortable="custom" fixed="left">
            <template #header>
              <div class="custom-header">
                <span>指数简称</span>
                <el-tooltip content="点击指数名称可查看详情" placement="top">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <template #default="scope">
              <el-button type="text" @click="showIndexDetail(scope.row)">
                {{ scope.row.name }}
              </el-button>
            </template>
          </el-table-column>
          
          <!-- 5日涨跌幅 -->
          <el-table-column label="5日涨跌幅" width="120" sortable="custom" prop="return_5" align="center">
            <template #header>
              <div class="custom-header">
                <span>5日涨跌幅</span>
                <el-tooltip content="5日内的价格变化百分比" placement="top">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <template #default="scope">
              <div class="change-percent-cell">
                <span :class="{ 'up': Number(scope.row.return_5) > 0, 'down': Number(scope.row.return_5) < 0 }">
                  {{ formatPercent(scope.row.return_5) }}
                </span>
                <div class="trend-indicator">
                  <el-icon v-if="Number(scope.row.return_5) > 0"><CaretTop /></el-icon>
                  <el-icon v-else-if="Number(scope.row.return_5) < 0"><CaretBottom /></el-icon>
                  <el-icon v-else><Minus /></el-icon>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <!-- RPS_5 -->
          <el-table-column label="RPS_5" width="170" sortable="custom" prop="RPS_5" align="center">
            <template #header>
              <div class="custom-header">
                <span>RPS_5</span>
                <el-tooltip content="相对强度指标，值越高表示相对强度越强" placement="top">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <template #default="scope">
              <div class="rps-cell">
                <el-progress
                  :percentage="scope.row.RPS_5"
                  :color="getRpsColor(scope.row.RPS_5)"
                  :format="(val: number) => val.toFixed(1)"
                  :stroke-width="18"
                  :text-inside="true"
                  :show-text="true"
                />
                <div class="rps-rank" :class="getRpsRankClass(scope.row.RPS_5)">
                  {{ getRpsRankText(scope.row.RPS_5) }}
                </div>
              </div>
            </template>
          </el-table-column>

          <!-- 20日涨跌幅 -->
          <el-table-column label="20日涨跌幅" width="120" sortable="custom" prop="return_20" align="center">
            <template #header>
              <div class="custom-header">
                <span>20日涨跌幅</span>
                <el-tooltip content="20日内的价格变化百分比" placement="top">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <template #default="scope">
              <div class="change-percent-cell">
                <span :class="{ 'up': Number(scope.row.return_20) > 0, 'down': Number(scope.row.return_20) < 0 }">
                  {{ formatPercent(scope.row.return_20) }}
                </span>
                <div class="trend-indicator">
                  <el-icon v-if="Number(scope.row.return_20) > 0"><CaretTop /></el-icon>
                  <el-icon v-else-if="Number(scope.row.return_20) < 0"><CaretBottom /></el-icon>
                  <el-icon v-else><Minus /></el-icon>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <!-- RPS_20 -->
          <el-table-column label="RPS_20" width="170" sortable="custom" prop="RPS_20" align="center">
            <template #header>
              <div class="custom-header">
                <span>RPS_20</span>
                <el-tooltip content="相对强度指标，值越高表示相对强度越强" placement="top">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <template #default="scope">
              <div class="rps-cell">
                <el-progress
                  :percentage="Number(scope.row.RPS_20)"
                  :color="getRpsColor(scope.row.RPS_20)"
                  :format="(val: number) => val.toFixed(1)"
                  :stroke-width="18"
                  :text-inside="true"
                  :show-text="true"
                />
                <div class="rps-rank" :class="getRpsRankClass(scope.row.RPS_20)">
                  {{ getRpsRankText(scope.row.RPS_20) }}
                </div>
              </div>
            </template>
          </el-table-column>

          <!-- 60日涨跌幅 -->
          <el-table-column label="60日涨跌幅" width="120" sortable="custom" prop="return_60" align="center">
            <template #header>
              <div class="custom-header">
                <span>60日涨跌幅</span>
                <el-tooltip content="60日内的价格变化百分比" placement="top">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <template #default="scope">
              <div class="change-percent-cell">
                <span :class="{ 'up': Number(scope.row.return_60) > 0, 'down': Number(scope.row.return_60) < 0 }">
                  {{ formatPercent(scope.row.return_60) }}
                </span>
                <div class="trend-indicator">
                  <el-icon v-if="Number(scope.row.return_60) > 0"><CaretTop /></el-icon>
                  <el-icon v-else-if="Number(scope.row.return_60) < 0"><CaretBottom /></el-icon>
                  <el-icon v-else><Minus /></el-icon>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <!-- RPS_60 -->
          <el-table-column label="RPS_60" width="170" sortable="custom" prop="RPS_60" align="center">
            <template #header>
              <div class="custom-header">
                <span>RPS_60</span>
                <el-tooltip content="相对强度指标，值越高表示相对强度越强" placement="top">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <template #default="scope">
              <div class="rps-cell">
                <el-progress
                  :percentage="Number(scope.row.RPS_60)"
                  :color="getRpsColor(scope.row.RPS_60)"
                  :format="(val: number) => val.toFixed(1)"
                  :stroke-width="18"
                  :text-inside="true"
                  :show-text="true"
                />
                <div class="rps-rank" :class="getRpsRankClass(scope.row.RPS_60)">
                  {{ getRpsRankText(scope.row.RPS_60) }}
                </div>
              </div>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 表格底部分页 -->
        <div class="table-footer">
          <el-pagination
            v-if="filteredRpsData.length > 10"
            layout="total, sizes, prev, pager, next"
            :total="filteredRpsData.length"
            :page-sizes="[10, 20, 50, 100]"
            v-model:page-size="pageSize"
            v-model:current-page="currentPage"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 无数据提示 -->
    <el-empty v-if="!loading && rpsData.length === 0" description="暂无RPS数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, InfoFilled, CaretTop, CaretBottom, Minus, Search } from '@element-plus/icons-vue'
import { getIndexRps } from '@/services/strategyApi'
import type { IndexRpsItem } from '@/services/strategyApi'

/**
 * 组件：指数RPS强度排名视图（IndexRpsView）
 * 功能：展示不同板块类型下的指数RPS强度排名，支持搜索、排序、分页与详情跳转
 * 参数：
 *  - 无外部props；内部状态包括：
 *    - idxType: 板块类型（'概念板块' | '行业板块' | '地域板块'），默认 '行业板块'
 *    - searchKeyword: 搜索关键词
 *    - currentPage/pageSize: 分页参数
 * 返回值：无（组件渲染UI）；内部从接口获取 IndexRpsData:
 *  - data: IndexRpsItem[] 指数数据
 *  - query_time: 查询时间
 * 事件：
 *  - 点击指数简称触发路由跳转到股票列表并携带概念名
 *  - 表格排序、分页变化重排/翻页
 *  - 修改板块类型触发数据刷新
 */

// 数据加载状态
const loading = ref(false)

// 路由
const router = useRouter()

// RPS数据
const rpsData = ref<IndexRpsItem[]>([])
const queryTime = ref('')

// 搜索关键词
const searchKeyword = ref('')

// 板块类型（默认：行业板块）
const idxType = ref<'概念板块' | '行业板块' | '地域板块'>('行业板块')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(2000)

/**
 * 百分比格式化工具
 * 功能：兼容数字与字符串输入，安全格式化为百分比文本
 * 参数：value(unknown) 原始值，可能为 number 或 string
 * 返回值：string 格式化后的文本，如 '+1.23%'
 * 事件：无
 */
const formatPercent = (value: unknown): string => {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (!Number.isFinite(num)) return '-'
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

// 过滤后的RPS数据
const filteredRpsData = computed(() => {
  let result = rpsData.value
  if (searchKeyword.value) {
    result = result.filter(item => {
      return item.name.includes(searchKeyword.value)
    })
  }
  return result
})

// 分页后的数据
const paginatedRpsData = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  const endIndex = startIndex + pageSize.value
  return filteredRpsData.value.slice(startIndex, endIndex)
})

// 获取默认排序属性
const getDefaultSortProp = () => {
  return 'RPS_5' // 默认按RPS_5排序
}

// 获取RPS颜色
const getRpsColor = (rpsValue: number) => {
  if (rpsValue >= 90) return '#f56c6c' // 红色
  if (rpsValue >= 80) return '#e6a23c' // 橙色
  if (rpsValue >= 70) return '#67c23a' // 绿色
  return '#909399' // 灰色
}

// 获取RPS等级文本
const getRpsRankText = (value: number) => {
  if (value >= 90) return '极强'
  if (value >= 80) return '强势'
  if (value >= 70) return '良好'
  if (value >= 50) return '一般'
  return '弱势'
}

// 获取RPS等级样式类
const getRpsRankClass = (value: number) => {
  if (value >= 90) return 'rank-excellent'
  if (value >= 80) return 'rank-strong'
  if (value >= 70) return 'rank-good'
  if (value >= 50) return 'rank-normal'
  return 'rank-weak'
}

// 获取指定周期的RPS值
const getRpsValue = (row: IndexRpsItem, period: number): number => {
  return row[`RPS_${period}` as keyof IndexRpsItem] as number || 0
}

// 表格行样式
const tableRowClassName = ({ row }: { row: IndexRpsItem }) => {
  // 根据RPS_5值设置行样式
  const rpsValue = row.RPS_5
  if (rpsValue >= 90) return 'row-excellent'
  if (rpsValue >= 80) return 'row-strong'
  if (rpsValue >= 70) return 'row-good'
  return ''
}

// 处理排序变化
const handleSortChange = (sort: { prop: string, order: string }) => {
  // 根据排序重新排列数据
  if (sort.prop && sort.order) {
    rpsData.value.sort((a, b) => {
      const propA = Number(a[sort.prop as keyof IndexRpsItem] ?? 0)
      const propB = Number(b[sort.prop as keyof IndexRpsItem] ?? 0)
      
      if (sort.order === 'ascending') {
        return propA - propB
      } else {
        return propB - propA
      }
    })
  }
}

// 处理页面大小变化
const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1 // 重置到第一页
}

// 处理页码变化
const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

/**
 * 显示指数详情（跳转到股票列表页面）
 * 功能：点击指数简称时跳转到股票列表页面，并将概念名作为查询参数传递，便于在股票列表中按概念筛选
 * 参数：row(IndexRpsItem) 当前行的指数数据
 * 返回值：无
 * 事件：路由跳转到 '/stock-list'，并携带 query: { dc_concept }
 */
const showIndexDetail = (row: IndexRpsItem) => {
  router.push({ path: '/stock-list', query: { dc_concept: row.name } })
}

// 刷新数据
const refreshData = async () => {
  if (loading.value) return
  
  loading.value = true
  try {
    const periodsStr = '5,20,60' // 固定周期参数
    const response = await getIndexRps(periodsStr, false, idxType.value)
    
    // 由于在axiosConfig.ts中已经处理了非200状态码的情况
    // 这里直接使用返回的数据，不需要再次检查code
    rpsData.value = response.data
    queryTime.value = response.query_time
    ElMessage.success('RPS数据加载成功')
  } catch (error) {
    console.error('加载RPS数据失败:', error)
    ElMessage.error('加载RPS数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  refreshData()
})

// 监听搜索关键词变化，重置页码
watch(searchKeyword, () => {
  currentPage.value = 1
})

// 监听板块类型变化，刷新数据并重置分页
watch(idxType, () => {
  currentPage.value = 1
  refreshData()
})
</script>

<style scoped>
.index-rps-view {
  padding: 20px;
}

.period-selection {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rps-data-section {
  margin-bottom: 20px;
}

/* 表格样式 */
:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

:deep(.el-table__header) {
  font-weight: bold;
  background-color: #f5f7fa;
}

:deep(.el-table__row) {
  transition: all 0.3s;
}

:deep(.el-table__row:hover) {
  background-color: #f0f9ff !important;
}

/* 自定义表头 */
.custom-header {
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-header span {
  margin-right: 5px;
}

/* 涨跌颜色 */
.up {
  color: #f56c6c;
  font-weight: bold;
}

.down {
  color: #67c23a;
  font-weight: bold;
}

.change-percent-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.trend-indicator {
  margin-left: 5px;
}

/* RPS单元格样式 */
.rps-cell {
  display: flex;
  flex-direction: column;
}

.rps-rank {
  margin-top: 5px;
  text-align: center;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
  display: inline-block;
  align-self: center;
}

.rank-excellent {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

.rank-strong {
  background-color: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #f5dab1;
}

.rank-good {
  background-color: #ecf5ff;
  color: #409eff;
  border: 1px solid #b3d8ff;
}

.rank-normal {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #c2e7b0;
}

.rank-weak {
  background-color: #f4f4f5;
  color: #909399;
  border: 1px solid #d3d4d6;
}

/* 表格行样式 */
:deep(.row-excellent) {
  background-color: rgba(245, 108, 108, 0.05);
}

:deep(.row-strong) {
  background-color: rgba(230, 162, 60, 0.05);
}

:deep(.row-good) {
  background-color: rgba(64, 158, 255, 0.05);
}

/* 表格底部分页 */
.table-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>