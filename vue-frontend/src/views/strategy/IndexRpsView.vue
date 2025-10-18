<template>
  <div class="index-rps-view" v-loading="loading" element-loading-text="正在加载指数RPS数据...">
    <!-- 已移除周期选择 -->

    <!-- RPS数据表格 -->
    <div class="rps-data-section" v-if="rpsData.length > 0">
      <el-card shadow="hover">
        <template #header>
          <div class="table-header">
            <h3>指数RPS强度排名 ({{ formatDate(queryTime) }})</h3>
            <div class="table-controls">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索指数名称"
                prefix-icon="Search"
                clearable
                style="width: 200px"
              />
            </div>
          </div>
        </template>
        
        <el-table
          :data="filteredRpsData"
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
          <el-table-column prop="指数代码" label="指数代码" width="100" sortable="custom" fixed="left" align="center">
            <template #default="scope">
              <el-tag size="small" effect="plain">{{ scope.row.指数代码 }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="指数简称" label="指数简称" width="120" sortable="custom" fixed="left">
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
                {{ scope.row.指数简称 }}
              </el-button>
            </template>
          </el-table-column>
          
          <!-- 动态周期列 -->
          <template v-for="period in displayPeriods" :key="period">
            <!-- 涨跌幅列 -->
            <el-table-column :label="`${period}日涨跌幅`" width="120" sortable="custom" :prop="`${period}日涨跌幅`" align="center">
              <template #header>
                <div class="custom-header">
                  <span>{{ period }}日涨跌幅</span>
                  <el-tooltip :content="`${period}日内的价格变化百分比`" placement="top">
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
              </template>
              <template #default="scope">
                <div class="change-percent-cell">
                  <span :class="{ 'up': scope.row[`${period}日涨跌幅`] > 0, 'down': scope.row[`${period}日涨跌幅`] < 0 }">
                    {{ scope.row[`${period}日涨跌幅`] > 0 ? '+' : '' }}{{ scope.row[`${period}日涨跌幅`].toFixed(2) }}%
                  </span>
                  <div class="trend-indicator">
                    <el-icon v-if="scope.row[`${period}日涨跌幅`] > 0"><CaretTop /></el-icon>
                    <el-icon v-else-if="scope.row[`${period}日涨跌幅`] < 0"><CaretBottom /></el-icon>
                    <el-icon v-else><Minus /></el-icon>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <!-- RPS值列 -->
            <el-table-column :label="`RPS_${period}`" width="170" sortable="custom" :prop="`RPS_${period}`" align="center">
              <template #header>
                <div class="custom-header">
                  <span>RPS_{{ period }}</span>
                  <el-tooltip content="相对强度指标，值越高表示相对强度越强" placement="top">
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
              </template>
              <template #default="scope">
                <div class="rps-cell">
                  <el-progress
                    :percentage="scope.row[`RPS_${period}`]"
                    :color="getRpsColor(scope.row[`RPS_${period}`])"
                    :format="(val: number) => val.toFixed(1)"
                    :stroke-width="18"
                    :text-inside="true"
                    :show-text="true"
                  />
                  <div class="rps-rank" :class="getRpsRankClass(scope.row[`RPS_${period}`])">
                    {{ getRpsRankText(scope.row[`RPS_${period}`]) }}
                  </div>
                </div>
              </template>
            </el-table-column>
          </template>
        </el-table>
        
        <!-- 表格底部分页 -->
        <div class="table-footer">
          <el-pagination
            v-if="rpsData.length > 10"
            layout="total, sizes, prev, pager, next"
            :total="rpsData.length"
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, InfoFilled, CaretTop, CaretBottom, Minus } from '@element-plus/icons-vue'
import { getIndexRps } from '@/services/strategyApi'
import type { IndexRpsItem } from '@/services/strategyApi'

// 数据加载状态
const loading = ref(false)

// RPS数据
const rpsData = ref<IndexRpsItem[]>([])
const queryTime = ref('')

// 搜索关键词
const searchKeyword = ref('')

// 固定显示的周期（5日、20日和60日）
const displayPeriods = ref<string[]>(['5', '20', '60'])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(20)

// 过滤后的RPS数据
const filteredRpsData = computed(() => {
  let result = rpsData.value
  if (searchKeyword.value) {
    result = result.filter(item => {
      return item.指数简称.includes(searchKeyword.value)
    })
  }
  
  // 分页处理
  const startIndex = (currentPage.value - 1) * pageSize.value
  const endIndex = startIndex + pageSize.value
  return result.slice(startIndex, endIndex)
})

// 获取默认排序属性
const getDefaultSortProp = () => {
  if (displayPeriods.value.length > 0) {
    return `RPS_${displayPeriods.value[0]}`
  }
  return ''
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

// 表格行样式
const tableRowClassName = ({ row }: { row: IndexRpsItem }) => {
  // 根据第一个周期的RPS值设置行样式
  if (displayPeriods.value.length > 0) {
    const rpsValue = row[`RPS_${displayPeriods.value[0]}`]
    if (rpsValue >= 90) return 'row-excellent'
    if (rpsValue >= 80) return 'row-strong'
    if (rpsValue >= 70) return 'row-good'
  }
  return ''
}

// 处理排序变化
const handleSortChange = (sort: { prop: string, order: string }) => {
  // 根据排序重新排列数据
  if (sort.prop && sort.order) {
    rpsData.value.sort((a, b) => {
      const propA = a[sort.prop as keyof IndexRpsItem] as number
      const propB = b[sort.prop as keyof IndexRpsItem] as number
      
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

// 显示指数详情
const showIndexDetail = (row: IndexRpsItem) => {
  ElMessage({
    message: `${row.指数简称} (${row.指数代码})`,
    type: 'info'
  })
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 刷新数据
const refreshData = async () => {
  if (loading.value) return
  
  loading.value = true
  try {
    const periodsStr = displayPeriods.value.join(',')
    const response = await getIndexRps(periodsStr)
    
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