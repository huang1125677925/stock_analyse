<template>
  <div class="backtest-history-view">
    <div class="page-header">
      <h1>回测历史</h1>
      <p>查看历史回测任务，监控状态和查看结果</p>
    </div>
    
    <!-- 筛选条件 -->
    <div class="filter-panel">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>筛选条件</span>
            <el-button type="primary" @click="refreshData">刷新</el-button>
          </div>
        </template>
        
        <el-form :model="filterForm" inline class="filter-form">
          <el-form-item label="策略名称">
            <el-select
              v-model="filterForm.strategyName"
              placeholder="全部策略"
              clearable
              style="width: 150px"
            >
              <el-option
                v-for="item in strategyList"
                :key="item.name"
                :label="item.description"
                :value="item.name"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="股票代码">
            <el-input
              v-model="filterForm.symbol"
              placeholder="请输入股票代码"
              clearable
              style="width: 150px"
            />
          </el-form-item>
          
          <el-form-item label="状态">
            <el-select
              v-model="filterForm.status"
              placeholder="全部状态"
              clearable
              style="width: 120px"
            >
              <el-option label="已创建" value="created" />
              <el-option label="运行中" value="running" />
              <el-option label="已完成" value="completed" />
              <el-option label="执行失败" value="failed" />
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="searchTasks">查询</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
    
    <!-- 任务列表 -->
    <div class="task-list">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>回测任务列表</span>
            <div class="header-actions">
              <el-button type="primary" @click="$router.push('/backtest-strategy')">创建新任务</el-button>
            </div>
          </div>
        </template>
        
        <el-table 
          :data="tableData.tasks" 
          stripe 
          style="width: 100%"
          v-loading="loading"
          @row-click="handleRowClick"
          class="full-width-table"
        >
          <el-table-column prop="stock_code" label="股票代码" min-width="100" align="center" />
          <el-table-column prop="stock_name" label="股票名称" min-width="100" align="center" />
          <el-table-column label="策略" min-width="120">
            <template #default="scope">
              {{ getStrategyDescription(scope.row.strategy_name) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusTagType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="start_date" label="回测开始时间" min-width="100" align="center" />
          <el-table-column prop="end_date" label="回测结束时间" min-width="100" align="center" />
          <el-table-column prop="frequency" label="回测数据频率" min-width="100" align="center" />
          <el-table-column label="总收益率" min-width="120" align="center">
            <template #default="scope">
              <span v-if="scope.row.result_summary?.total_return !== undefined" :class="getReturnClass(scope.row.result_summary?.total_return)">
                {{ formatPercent(scope.row.result_summary?.total_return) }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="最大回撤" min-width="100">
            <template #default="scope">
              <span v-if="scope.row.result_summary?.max_drawdown !== undefined" class="negative">
                {{ formatPercent(scope.row.result_summary?.max_drawdown) }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="夏普比率" min-width="100">
            <template #default="scope">
              <span v-if="scope.row.result_summary?.sharpe_ratio !== undefined" class="positive">
                {{ scope.row.result_summary?.sharpe_ratio}}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="250" fixed="right" align="center">
            <template #default="scope">
              <el-button 
                type="primary" 
                size="small" 
                @click.stop="runTask(scope.row.task_id)"
                :disabled="scope.row.status !== 'created'"
                :loading="runningTasks.has(scope.row.task_id)"
              >
                运行
              </el-button>
              <el-button 
                type="info" 
                size="small" 
                @click.stop="checkStatus(scope.row.task_id)"
                :loading="checkingTasks.has(scope.row.task_id)"
              >
                查询状态
              </el-button>
              <el-button 
                type="success" 
                size="small" 
                @click.stop="viewResult(scope.row.task_id)"
                :disabled="scope.row.status !== 'completed'"
              >
                查看结果
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>
    
    <!-- 任务详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="任务详情"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedTask" class="task-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务ID">{{ selectedTask.task_id }}</el-descriptions-item>
          <el-descriptions-item label="策略名称">{{ selectedTask.strategy_name }}</el-descriptions-item>
          <el-descriptions-item label="股票代码">{{ selectedTask.stock_code }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(selectedTask.status)">{{ getStatusText(selectedTask.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(selectedTask.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ selectedTask.completed_at ? formatDateTime(selectedTask.completed_at) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="总收益率" v-if="selectedTask.result_summary?.total_return !== undefined">
            <span :class="getReturnClass(selectedTask.result_summary?.total_return)">{{ formatPercent(selectedTask.result_summary?.total_return) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="最大回撤" v-if="selectedTask.result_summary?.max_drawdown !== undefined">
            <span class="negative">{{ formatPercent(selectedTask.result_summary?.max_drawdown ?? 0) }}</span>
          </el-descriptions-item>
        </el-descriptions>
        
        <!-- 任务操作 -->
        <div class="task-actions" style="margin-top: 20px;">
          <el-button 
            type="primary" 
            @click="runTask(selectedTask.task_id)"
            :disabled="selectedTask.status !== 'created'"
            :loading="runningTasks.has(selectedTask.task_id)"
          >
            运行任务
          </el-button>
          <el-button 
            type="info" 
            @click="checkStatus(selectedTask.task_id)"
            :loading="checkingTasks.has(selectedTask.task_id)"
          >
            刷新状态
          </el-button>
          <el-button 
            type="success" 
            @click="viewResult(selectedTask.task_id)"
            :disabled="selectedTask.status !== 'completed'"
          >
            查看结果
          </el-button>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
    
    <!-- 回测结果对话框 -->
    <BacktestResultDialog 
      v-model:visible="resultDialogVisible" 
      :task-id="selectedTaskId" 
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 回测历史页面
 * 功能：
 * 1. 显示历史回测任务列表
 * 2. 支持按策略、股票、状态筛选
 * 3. 支持状态查询和结果查看
 * 4. 支持运行已创建的任务
 */
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  getBacktestTasks,
  getBacktestResult,
  runBacktestTask,
  getBacktestStatus,
  getStrategies,
  type BacktestTask,
  type BacktestResult,
  type Strategy
} from '@/services/quantBacktestApi'
import BacktestResultDialog from '@/components/BacktestResultDialog.vue'

const router = useRouter()

// 筛选表单
const filterForm = reactive({
  strategyName: '',
  symbol: '',
  status: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  pageSize: 10,  // 修改默认分页大小为10
  total: 0
})

// 数据状态
const taskList = ref<BacktestTask[]>([])
const strategyList = ref<Strategy[]>([])
const selectedTask = ref<BacktestTask | null>(null)
const loading = ref(false)
const detailDialogVisible = ref(false)
const resultDialogVisible = ref(false)
const selectedTaskId = ref<string>('')
const runningTasks = ref(new Set<string>())
const checkingTasks = ref(new Set<string>())

// 使用 reactive 管理表格数据
const tableData = reactive<{ tasks: BacktestTask[] }>({
  tasks: [] as BacktestTask[]
})


// 根据策略名获取策略描述
const getStrategyDescription = (strategyName: string): string => {
  const strategy = strategyList.value.find(s => s.name === strategyName)
  return strategy ? strategy.description : strategyName
}

// 加载任务列表
const loadTaskList = async () => {
  loading.value = true
  
  try {
    const params = {
      offset: (pagination.page - 1) * pagination.pageSize,
      limit: pagination.pageSize,
      ...(filterForm.strategyName && { strategy_name: filterForm.strategyName }),
      ...(filterForm.symbol && { stock_code: filterForm.symbol }),
      ...(filterForm.status && { status: filterForm.status })
    }
    
    const result = await getBacktestTasks(params)
    
    // 更新表格数据 - 使用 splice 确保响应式更新
    // tableData.tasks.splice(0, tableData.tasks.length, ...(result.tasks || []))
    // taskList.value = result.tasks || []·
    console.log('result.tasks', result.tasks)
    tableData.tasks = result.tasks || []
    taskList.value = result.tasks || []
    await nextTick()
    
    pagination.total = result.total

    
  } catch (error) {
    console.error('加载任务列表失败:', error)
    ElMessage.error('加载任务列表失败')
  } finally {
    loading.value = false
  }
}

// 加载策略列表
const loadStrategyList = async () => {
  try {
    const strategies = await getStrategies()
    strategyList.value = strategies
  } catch (error) {
    console.error('加载策略列表失败:', error)
  }
}

// 搜索任务
const searchTasks = () => {
  pagination.page = 1
  loadTaskList()
}

// 重置筛选条件
const resetFilter = () => {
  filterForm.strategyName = ''
  filterForm.symbol = ''
  filterForm.status = ''
  pagination.page = 1
  loadTaskList()
}

// 刷新数据
const refreshData = () => {
  loadTaskList()
}

// 运行任务
const runTask = async (taskId: string) => {
  runningTasks.value.add(taskId)
  
  try {
    await runBacktestTask(taskId)
    ElMessage.success('回测任务已启动')
    
    // 刷新任务列表
    await loadTaskList()
    
    // 如果详情对话框打开，更新选中的任务
    if (selectedTask.value && selectedTask.value.task_id === taskId) {
      const updatedTask = tableData.tasks.find(task => task.task_id === taskId)
      if (updatedTask) {
        selectedTask.value = updatedTask
      }
    }
    
  } catch (error) {
    console.error('运行回测任务失败:', error)
    ElMessage.error('运行回测任务失败')
  } finally {
    runningTasks.value.delete(taskId)
  }
}

// 查询状态
const checkStatus = async (taskId: string) => {
  checkingTasks.value.add(taskId)
  
  try {
    const status = await getBacktestStatus(taskId)
    
    // 更新任务列表中的状态
    const taskIndex = tableData.tasks.findIndex(task => task.task_id === taskId)
    if (taskIndex !== -1) {
      // 直接修改数组中的对象，确保响应式更新
      tableData.tasks[taskIndex].status = status.status
      if (status.completed_at) {
        tableData.tasks[taskIndex].completed_at = status.completed_at
      }
    }
    
    // 同步更新 taskList
    const taskListIndex = taskList.value.findIndex(task => task.task_id === taskId)
    if (taskListIndex !== -1) {
      taskList.value[taskListIndex].status = status.status
      if (status.completed_at) {
        taskList.value[taskListIndex].completed_at = status.completed_at
      }
    }
    
    // 如果详情对话框打开，更新选中的任务
    if (selectedTask.value && selectedTask.value.task_id === taskId) {
      selectedTask.value.status = status.status
      if (status.completed_at) {
        selectedTask.value.completed_at = status.completed_at
      }
    }
    
    ElMessage.success('状态已更新')
    
  } catch (error) {
    console.error('查询任务状态失败:', error)
    ElMessage.error('查询任务状态失败')
  } finally {
    checkingTasks.value.delete(taskId)
  }
}

// 查看结果
const viewResult = (taskId: string) => {
  router.push(`/backtest-result/${taskId}`)
}

// 处理行点击
const handleRowClick = (row: BacktestTask) => {
  selectedTask.value = row
  detailDialogVisible.value = true
}

// 处理页面大小变化
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.page = 1
  loadTaskList()
}

// 处理当前页变化
const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadTaskList()
}

// 获取状态标签类型
const getStatusTagType = (status: string): string => {
  switch (status) {
    case 'created':
      return 'info'
    case 'running':
      return 'warning'
    case 'completed':
      return 'success'
    case 'failed':
      return 'danger'
    default:
      return 'info'
  }
}

// 获取状态文本
const getStatusText = (status: string): string => {
  switch (status) {
    case 'created':
      return '已创建'
    case 'running':
      return '运行中'
    case 'completed':
      return '已完成'
    case 'failed':
      return '执行失败'
    default:
      return '未知状态'
  }
}

// 获取收益率样式类
const getReturnClass = (value: number): string => {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return ''
}

// 格式化百分比
const formatPercent = (value: number): string => {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(2)}%`
}

// 格式化日期时间
const formatDateTime = (dateTime: string): string => {
  return new Date(dateTime).toLocaleString('zh-CN')
}

// 监听 taskList 变化
watch(taskList, (newList) => {
  console.log('taskList 发生变化，新长度:', newList.length)
}, { deep: true })

// 监听 tableData.tasks 变化
watch(() => tableData.tasks, (newTasks) => {
  console.log('tableData.tasks 发生变化，新长度:', newTasks.length)
  console.log('tableData.tasks 内容:', newTasks)
}, { deep: true })

// 页面初始化
onMounted(async () => {
  await Promise.all([
    loadStrategyList(),
    loadTaskList()
  ])
})
</script>

<style scoped>
.backtest-history-view {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #606266;
}

.filter-panel {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-form {
  margin: 0;
}

.task-list {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.task-detail {
  padding: 10px 0;
}

.task-actions {
  display: flex;
  gap: 10px;
}

/* 收益率颜色 */
.positive {
  color: #e20725;
  font-weight: bold;
}

.negative {
  color: #0a11dd;
  font-weight: bold;
}

/* 表格样式 */
.full-width-table {
  width: 100% !important;
}

:deep(.el-table) {
  width: 100% !important;
}

:deep(.el-table__body-wrapper) {
  width: 100% !important;
}

:deep(.el-table__header-wrapper) {
  width: 100% !important;
}

/* 表格行悬停效果 */
:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}
</style>