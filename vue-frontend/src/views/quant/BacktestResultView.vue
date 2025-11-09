<template>
  <div class="backtest-result-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-button type="primary" @click="goBack" class="back-button">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <div class="header-content">
        <h1>回测结果详情</h1>
        <p v-if="taskInfo">{{ taskInfo.strategy_name }} - {{ taskInfo.stock_name }}({{ taskInfo.stock_code }})</p>
      </div>
    </div>

    <div v-loading="loading" class="content-container">
      <!-- 基本数据展示 - 优化为更紧凑的布局 -->
      <div class="basic-stats-section">
        <el-card class="stats-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">回测基本数据</span>
            </div>
          </template>
          
          <div v-if="backtestResult" class="stats-container">
            <!-- 回测时间区间和资金信息放在同一行 -->
            <div class="top-info-row">
              <!-- 回测时间区间信息 -->
              <div class="fund-item">
                <div class="period-item">
                  <span class="period-label">回测区间:</span>
                  <span class="period-value" v-if="taskInfo">{{ formatDate(taskInfo.start_date) }} 至 {{ formatDate(taskInfo.end_date) }}</span>
                </div>
              </div>
              
              <!-- 资金信息 -->
              <div class="fund-item">
                <div class="fund-icon">
                  <el-icon><Money /></el-icon>
                </div>
                <div class="fund-content">
                  <div class="fund-label">初始资金</div>
                  <div class="fund-value">¥{{ formatMoney(taskInfo?.initial_cash || 0) }}</div>
                </div>
              </div>
              <div class="fund-item">
                <div class="fund-icon">
                  <el-icon><Wallet /></el-icon>
                </div>
                <div class="fund-content">
                  <div class="fund-label">最终资金</div>
                  <div class="fund-value" :class="getReturnClass(backtestResult.performance.final_value - taskInfo.initial_cash)">
                    ¥{{ formatMoney(backtestResult.performance.final_value) }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 主要指标 - 大卡片显示 -->
            <div class="main-stats">
              <div class="main-stat-item">
                <div class="stat-icon positive-bg">
                  <el-icon><TrendCharts /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">总收益率</div>
                  <div class="stat-value" :class="getReturnClass(backtestResult.performance.total_return)">
                    {{ formatPercent(backtestResult.performance.total_return) }}
                  </div>
                </div>
              </div>
              
              <div class="main-stat-item">
                <div class="stat-icon info-bg">
                  <el-icon><DataAnalysis /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">年化收益率</div>
                  <div class="stat-value" :class="getReturnClass(backtestResult.performance.annual_return)">
                    {{ formatPercent(backtestResult.performance.annual_return) }}
                  </div>
                </div>
              </div>
              
              <div class="main-stat-item">
                <div class="stat-icon warning-bg">
                  <el-icon><Warning /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">最大回撤</div>
                  <div class="stat-value negative">
                    {{ formatPercent(backtestResult.performance.max_drawdown) }}
                  </div>
                </div>
              </div>
              
              <div class="main-stat-item">
                <div class="stat-icon success-bg">
                  <el-icon><Medal /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">夏普比率</div>
                  <div class="stat-value">
                    {{ backtestResult.performance.sharpe_ratio.toFixed(2) }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 次要指标 - 小卡片显示 -->
            <div class="secondary-stats horizontal-stats">
              <div class="secondary-stat-item">
                <div class="stat-header">
                  <div class="stat-label">胜率</div>
                  <div class="trend-indicator" :class="backtestResult.performance.win_rate >= 0.6 ? 'trend-up' : 'trend-down'">
                    <el-icon v-if="backtestResult.performance.win_rate >= 0.6"><ArrowUp /></el-icon>
                    <el-icon v-else><ArrowDown /></el-icon>
                  </div>
                </div>
                <div class="stat-value">
                  {{ formatPercent(backtestResult.performance.win_rate) }}
                </div>
                <div class="stat-progress">
                  <el-progress 
                    :percentage="backtestResult.performance.win_rate" 
                    :show-text="false" 
                    :stroke-width="6"
                    :color="getProgressColor(backtestResult.performance.win_rate)"
                  />
                </div>
                <div class="stat-description">
                  {{ backtestResult.performance.win_rate >= 0.6 ? '表现优秀' : backtestResult.performance.win_rate >= 0.4 ? '表现一般' : '需要改进' }}
                </div>
              </div>
              
              <div class="secondary-stat-item">
                <div class="stat-header">
                  <div class="stat-label">总交易次数</div>
                  <div class="stat-badge">
                    <el-icon><DataLine /></el-icon>
                  </div>
                </div>
                <div class="stat-value">
                  {{ backtestResult.performance.total_trades }}
                </div>
                <div class="stat-description">
                  交易频率: {{ (backtestResult.performance.total_trades / 252).toFixed(1) }}/年
                </div>
              </div>
              
              <div class="secondary-stat-item">
                <div class="stat-header">
                  <div class="stat-label">盈利交易</div>
                  <div class="stat-badge success">
                    <el-icon><CircleCheck /></el-icon>
                  </div>
                </div>
                <div class="stat-value positive">
                  {{ backtestResult.performance.winning_trades }}
                </div>
                <div class="stat-description">
                  占比: {{ ((backtestResult.performance.winning_trades / backtestResult.performance.total_trades) * 100).toFixed(1) }}%
                </div>
              </div>
              
              <div class="secondary-stat-item">
                <div class="stat-header">
                  <div class="stat-label">亏损交易</div>
                  <div class="stat-badge danger">
                    <el-icon><CircleClose /></el-icon>
                  </div>
                </div>
                <div class="stat-value negative">
                  {{ backtestResult.performance.losing_trades }}
                </div>
                <div class="stat-description">
                  占比: {{ ((backtestResult.performance.losing_trades / backtestResult.performance.total_trades) * 100).toFixed(1) }}%
                </div>
              </div>
              
              <!-- 新增风险指标 -->
              <div class="secondary-stat-item">
                <div class="stat-header">
                  <div class="stat-label">风险评级</div>
                  <div class="risk-level" :class="getRiskLevel(backtestResult.performance.max_drawdown, backtestResult.performance.sharpe_ratio)">
                    <el-icon><Wallet /></el-icon>
                  </div>
                </div>
                <div class="stat-value">
                  {{ getRiskLevelText(backtestResult.performance.max_drawdown, backtestResult.performance.sharpe_ratio) }}
                </div>
                <div class="stat-description">
                  基于回撤和夏普比率
                </div>
              </div>
              
              <!-- 新增收益风险比 -->
              <div class="secondary-stat-item">
                <div class="stat-header">
                  <div class="stat-label">收益风险比</div>
                  <div class="stat-badge info">
                    <el-icon><Coin /></el-icon>
                  </div>
                </div>
                <div class="stat-value">
                  {{ (Math.abs(backtestResult.performance.total_return) / Math.abs(backtestResult.performance.max_drawdown)).toFixed(2) }}
                </div>
                <div class="stat-description">
                  收益/最大回撤
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 图表区域 - 重新组织布局 -->
      <div class="charts-section">
        <!-- 主要图表 - K线图 -->
        <el-card class="chart-card main-chart">
          <template #header>
            <div class="card-header">
              <span class="card-title">价格走势与交易信号</span>
            </div>
          </template>
          
          <div class="chart-container">
            <!-- 收盘价趋势图和技术指标合并展示 -->
            <div ref="klineChartRef" class="chart main-chart-content"></div>
            
            <!-- 观测器数据图表（放在日期下方的小窄幅趋势图） -->
            <div class="observer-legend" style="margin-top: 10px; margin-bottom: 5px; text-align: center;">
              <span class="legend-item"><span class="color-dot broker-color"></span>资金曲线</span>
              <span class="legend-item"><span class="color-dot return-color"></span>收益率曲线</span>
              <span class="legend-item"><span class="color-dot drawdown-color"></span>回撤曲线</span>
            </div>
            <!-- 观测器曲线区域：资金、收益率、回撤（回撤置于最下方），统一紧凑高度 -->
            <div class="observer-charts-container">
              <div ref="brokerChartRef" class="chart observer-chart"></div>
              <div ref="returnChartRef" class="chart observer-chart"></div>
              <div ref="drawdownChartRef" class="chart observer-chart"></div>
            </div>
          </div>
        </el-card>
      </div>


          <!-- 交易记录表格组件
               功能：仅展示回测交易记录数据的表格
               参数：数据源为 filteredTrades（数组），每项包含 datetime、type、price、size、value、return_rate、commission 等字段
               返回值：无
               事件：无（纯展示）
          -->
          <el-table 
            :data="filteredTrades" 
            stripe 
            style="width: 100%"
            :default-sort="{ prop: 'datetime', order: 'descending' }"
            class="trades-table"
          >
            <el-table-column type="index" label="#" min-width="60" />
            <el-table-column prop="datetime" label="交易日期" min-width="120" sortable>
              <template #default="scope">
                <span class="date-value">{{ formatDate(scope.row.datetime) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="80" align="center">
              <template #default="scope">
                <el-tag 
                  :type="scope.row.type === 'buy' ? 'success' : 'danger'"
                  size="small"
                  effect="dark"
                >
                  {{ scope.row.type === 'buy' ? '买入' : '卖出' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="price" label="价格" min-width="100" sortable align="right">
              <template #default="scope">
                <span class="price-value">¥{{ Number(scope.row.price ?? 0).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="size" label="数量" min-width="100" align="right">
              <template #default="scope">
                <span class="quantity-value">{{ Number(scope.row.size ?? 0).toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="value" label="成本" min-width="120" sortable align="right">
              <template #default="scope">
                <span class="amount-value">¥{{ Number(scope.row.value ?? 0).toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="pnl" label="盈亏" min-width="120" sortable align="right">
              <template #default="scope">
                <span v-if="scope.row.type === 'sell'" :class="getReturnClass(scope.row.pnl || 0)">
                  {{ formatMoney(scope.row.pnl) }}
                </span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="收益率" min-width="100" align="right">
              <template #default="scope">
                <span v-if="scope.row.type === 'sell'" :class="getReturnClass(scope.row.pnl_pct || 0)">
                  {{ formatPercent(scope.row.pnl_pct || 0) }}
                </span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="手续费" min-width="100" align="right">
              <template #default="scope">
                <span class="commission-value">¥{{ formatMoney(Number(scope.row.commission ?? 0)) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="120">
              <template #default="scope">
                <span class="remark-text">
                  {{ scope.row.type === 'buy' ? '策略买入信号' : '策略卖出信号' }}
                </span>
              </template>
            </el-table-column>
          </el-table>
      </div>
    </div>
</template>

<script setup lang="ts">
/**
 * 回测结果详情页面
 * 功能：
 * 1. 展示回测基本数据（总收益率、最大回撤等）
 * 2. 显示观测器数据图表（资金曲线、收益率曲线、回撤曲线）
 * 3. 显示原始数据和技术指标趋势图
 * 4. 标记买卖点
 * 5. 显示交易记录表格
 * 
 * 参数：
 * - taskId: 回测任务ID
 * 
 * 事件：
 * - 无
 */
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  ArrowLeft, 
  Download, 
  TrendCharts, 
  DataAnalysis, 
  Warning, 
  Medal, 
  Search 
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

import { 
  getBacktestResult,
  type BacktestResult as ApiBacktestResult
} from '@/services/quantBacktestApi'
interface BacktestResult {
  task_id: string
  strategy_name: string
  symbol: string
  period: {
    start_date: string
    end_date: string
  }
  detailed_data: DetailedData
  performance: {
    initial_value: number
    final_value: number
    total_return: number
    annual_return: number
    sharpe_ratio: number
    max_drawdown: number
    volatility: any
    total_trades: number
    winning_trades: number
    losing_trades: number
    win_rate: number
  }
  portfolio_value: Array<{
    date: string
    value: number
  }>
  trades: TradeRecord[]
}

export interface DetailedData {
  daily_returns: any[]
  portfolio_values: any[]
  trade_records: TradeRecord[]
}

export interface TradeRecord {
  pnl?: number
  size: number
  type: string
  price: number
  value: number
  pnl_pct?: number
  pnlcomm?: number
  datetime: string
  commission: number
  trade_closed: boolean
}

interface ObserverData {
  task_info: {
    task_id: string
    strategy_name: string
    stock_code: string
    stock_name: string
    start_date: string
    end_date: string
    initial_cash: number
    commission: number
  }
  observer_data: {
    broker: Array<{
      datetime: string
      cash: number
      value: number
    }>
    trades: Array<{
      ref: number
      size: number
      price: number
      value: number
      commission: number
      pnl: number
      pnlcomm: number
    }>
    buysell: Array<{
      datetime: string
      size: number
      price: number
      value: number
      commission: number
    }>
    timereturn: Timereturn[]
    drawdown: Array<{
      datetime: string
      len: number
      drawdown: number
      maxdrawdown: number
    }>
    benchmark: any[]
  }
}

export interface Timereturn {
  return: number
  datetime: string
  portfolio_value: number
  cumulative_return: number
}

interface RawIndicatorData {
  task_info: {
    task_id: string
    strategy_name: string
    stock_code: string
    stock_name: string
    start_date: string
    end_date: string
    initial_cash: number
    commission: number
  }
  raw_data: {
    datetime: string[]
    open: number[]
    high: number[]
    low: number[]
    close: number[]
    volume: number[]
  }
  indicator_data: {
    [key: string]: number[]
  }
}

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(false)
const taskId = ref<string>('')
const backtestResult = ref<BacktestResult | null>(null)
const observerData = ref<ObserverData | null>(null)
const rawIndicatorData = ref<RawIndicatorData | null>(null)
const taskInfo = ref<any>(null)
const indicatorData = ref<any>(null)

// 新增响应式数据
const chartTimeRange = ref('ALL')
// 不再需要选择指标，自动展示所有指标
const tradeSearchKeyword = ref('')
const tradeTypeFilter = ref('')
const tradeDateRange = ref<[string, string] | null>(null)

// 图表引用
const brokerChartRef = ref<HTMLElement>()
const returnChartRef = ref<HTMLElement>()
const drawdownChartRef = ref<HTMLElement>()
const klineChartRef = ref<HTMLElement>()
const indicatorChartRef = ref<HTMLElement>()
const filteredTrades = ref<TradeRecord[]>([])

// 图表实例
let brokerChart: echarts.ECharts | null = null
let returnChart: echarts.ECharts | null = null
let drawdownChart: echarts.ECharts | null = null
let klineChart: echarts.ECharts | null = null
let indicatorChart: echarts.ECharts | null = null

// 获取回测结果数据
const fetchBacktestResult = async () => {
  try {
    const result = await getBacktestResult(taskId.value)
    
    // 转换API数据格式到组件内部格式
    backtestResult.value = {
      task_id: result.task_info.task_id,
      strategy_name: result.task_info.strategy_name,
      symbol: result.task_info.stock_code,
      period: {
        start_date: result.task_info.start_date,
        end_date: result.task_info.end_date
      },
      detailed_data: result.detailed_data,
      performance: {
        total_return: result.performance.total_return,
        annual_return: result.performance.annual_return,
        max_drawdown: result.performance.max_drawdown,
        sharpe_ratio: result.performance.sharpe_ratio || 0,
        win_rate: result.performance.win_rate || 0,
        total_trades: result.performance.total_trades,
        winning_trades: result.performance.winning_trades,
        losing_trades: result.performance.losing_trades,
        initial_value: result.performance.initial_value,
        final_value: result.performance.final_value,
        volatility: result.performance.volatility || 0
      },
      portfolio_value: result.detailed_data?.portfolio_values || result.portfolio_value || [],
      trades: result.detailed_data?.trade_records || result.trades || []
    }
    
    // 设置任务信息（用于头部展示）
    taskInfo.value = result.task_info

    // 设置交易记录数据
    if (backtestResult.value) {
      filteredTrades.value = backtestResult.value.trades as TradeRecord[]
      console.log('filteredTrades.value', filteredTrades.value)
    }

    // 从回测结果中提取观测器数据（如果后端已合并返回）
    const anyResult: any = result as any
    if (anyResult.observer_data) {
      observerData.value = {
        task_info: result.task_info,
        observer_data: anyResult.observer_data
      }
    }

    // 从回测结果中提取原始数据和指标数据（如果后端已合并返回）
    if (anyResult.raw_data || anyResult.indicator_data) {
      rawIndicatorData.value = {
        task_info: result.task_info,
        raw_data: anyResult.raw_data ?? { datetime: [], open: [], high: [], low: [], close: [], volume: [] },
        indicator_data: anyResult.indicator_data ?? {}
      }
      indicatorData.value = rawIndicatorData.value.indicator_data
    }
  } catch (error) {
    console.error('获取回测结果失败:', error)
    ElMessage.error('获取回测结果失败')
  }
}

// 不再需要指标变化处理函数，因为现在自动展示所有指标

// 初始化图表
const initCharts = async () => {
  await nextTick()
  
  // 获取共享的日期数据
  let sharedDates: string[] = []
  if (observerData.value?.observer_data?.broker) {
    sharedDates = observerData.value.observer_data.broker.map(item => item.datetime.split(' ')[0])
  } else if (rawIndicatorData.value?.raw_data) {
    sharedDates = rawIndicatorData.value.raw_data.datetime
  }
  
  // 初始化收盘价趋势图和技术指标（合并在一个图表中）
  if (klineChartRef.value && rawIndicatorData.value?.raw_data) {
    klineChart = echarts.init(klineChartRef.value)
    const rawData = rawIndicatorData.value.raw_data
    const dates = rawData.datetime || []
    const closeData = dates.map((date: string, index: number) => rawData.close[index])
    
    // 获取买卖信号
    const buySignals: any[] = []
    const sellSignals: any[] = []
    
    if (observerData.value?.observer_data?.buysell) {
      observerData.value.observer_data.buysell.forEach(trade => {
        const dateIndex = dates.findIndex((d: string) => d.startsWith(trade.datetime.split(' ')[0]))
        if (dateIndex !== -1) {
          if (trade.size > 0) {
            buySignals.push([dateIndex, trade.price])
          } else {
            sellSignals.push([dateIndex, trade.price])
          }
        }
      })
    }
    
    // 准备系列数据
    const series: any[] = [
      // 收盘价线
      {
        name: '收盘价',
        type: 'line',
        data: closeData,
        smooth: true,
        showSymbol: false,
        lineStyle: { 
          width: 2,
          color: '#5470c6'
        },
        z: 5
      },
      // 买入信号
      { 
          name: '买入', 
          type: 'scatter', 
          data: buySignals,
          symbolSize: 8,
          itemStyle: { color: '#F20505' },
          symbol: 'triangle' // 将 'triangle' 改为 'arrow'
      },
      // 卖出信号
      { 
        name: '卖出', 
        type: 'scatter', 
        data: sellSignals,
        symbolSize: 8,
        itemStyle: { color: '#030008' },
        symbol: 'triangle',
        symbolRotate: 180
      }
    ]
    
    // 添加技术指标系列
    if (rawIndicatorData.value?.indicator_data) {
      const indicatorData = rawIndicatorData.value.indicator_data
      
      // 指标颜色配置：统一可读配色，并在系列间循环使用
      const indicatorColors = ['#5470c6','#91cc75','#fac858','#ee6666','#73c0de','#3ba272','#fc8452','#9a60b4','#ea7ccc','#2f4554']
      let colorIdx = 0
      
      // 计算收盘价的最大值
      const closeMaxValue = Math.max(...closeData)
      
      // 为所有指标添加系列，根据指标最大值与收盘价最大值的比较来决定使用哪个Y轴
      Object.keys(indicatorData).forEach(key => {
        if (indicatorData[key]) {
          // 计算当前指标的最大值
          const indicatorMaxValue = Math.max(...indicatorData[key].filter(v => v !== null && v !== undefined))
          
          // 判断指标类型，crossover类型放右边Y轴，其他根据最大值比例决定
          const isCrossover = key.toLowerCase().includes('crossover')
          const isSignal = key.toLowerCase().includes('signal')
          
          // 计算指标最大值与收盘价最大值的比例
          const ratio = indicatorMaxValue / closeMaxValue
          
          // 如果指标最大值比收盘价最大值小50%以上(ratio < 0.5)，或者是crossover/signal类型，则用第二个Y轴
          const yAxisIndex = (ratio < 0.5 || isCrossover || isSignal) ? 1 : 0
          
          const color = indicatorColors[colorIdx++ % indicatorColors.length]
          series.push({
            name: key,
            type: 'line',
            data: indicatorData[key],
            smooth: true,
            showSymbol: false,
            yAxisIndex: yAxisIndex, // 根据比例或类型决定使用哪个Y轴
            lineStyle: {
              width: 1.5,
              color: color
            }
          })
        }
      })
    }
    
    const option = {
      tooltip: { 
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: { 
        data: ['收盘价', '买入', '卖出', ...Object.keys(rawIndicatorData.value?.indicator_data || {})],
        type: 'scroll',
        orient: 'horizontal',
        top: 0,
        textStyle: { fontSize: 11 },
        pageButtonItemGap: 5,
        pageButtonGap: 5
      },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '60px', containLabel: true },
      xAxis: { 
        type: 'category', 
        data: dates,
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        axisLabel: { 
          rotate: 45,
          interval: 'auto',
          formatter: function(value: string) {
            // 只显示月份和日期，省略年份和时间
            return value.substring(5, 10);
          }
        }
      },
      yAxis: [
        { 
          name: '价格',
          type: 'value',
          scale: true,
          position: 'left',
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#909399', fontSize: 10 },
          splitLine: { show: true, lineStyle: { type: 'dashed', color: '#ebeef5' } }
        },
        {
          name: '指标值',
          type: 'value',
          scale: true,
          position: 'right',
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#909399', fontSize: 10 },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { show: true, type: 'slider', bottom: 0, start: 0, end: 100 }
      ],
      series: series
    }
    klineChart.setOption(option)
  }
  
  // 初始化观测器图表 - 共用X轴的紧凑布局
  // 1. 资金曲线
  if (brokerChartRef.value && observerData.value?.observer_data?.broker) {
    brokerChart = echarts.init(brokerChartRef.value)
    const brokerData = observerData.value.observer_data.broker
    const dates = brokerData.map(item => item.datetime.split(' ')[0])
    const values = brokerData.map(item => item.value)
    const cash = brokerData.map(item => item.cash)
    
    const option = {
      tooltip: { 
        trigger: 'axis',
        formatter: (params: any) => {
          let result = `${params[0].axisValue}<br/>`
          params.forEach((param: any) => {
            result += `${param.seriesName}: ¥${param.value.toLocaleString()}<br/>`
          })
          return result
        }
      },
      grid: { left: '3%', right: '4%', bottom: '0%', top: '3%', containLabel: true, height: 60 },
      xAxis: { 
        type: 'category', 
        data: dates,
        axisLabel: { show: false }, // 隐藏X轴标签，共用一个X轴
        axisLine: { show: false },  // 隐藏X轴线
        axisTick: { show: false }   // 隐藏X轴刻度
      },
      yAxis: { 
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#ebeef5' } },
        axisLabel: {
          color: '#909399',
          fontSize: 10,
          formatter: (value: number) => `¥${(value / 1000).toFixed(0)}K`
        }
      },
      series: [
        { 
          name: '总资产', 
          type: 'line', 
          data: values,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#5470c6', width: 2 },
          areaStyle: { 
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
                { offset: 1, color: 'rgba(84, 112, 198, 0.1)' }
              ]
            }
          }
        },
        { 
          name: '现金', 
          type: 'line', 
          data: cash,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#67C23A', width: 1.5 }
        }
      ]
    }
    brokerChart.setOption(option)
  }
  
  // 2. 收益率曲线
  if (returnChartRef.value && observerData.value?.observer_data?.timereturn) {
    returnChart = echarts.init(returnChartRef.value)
    const returnData = observerData.value.observer_data.timereturn
    const dates = returnData.map(item => item.datetime.split(' ')[0])
    const returns = returnData.map(item => item.return)
    
    const option = {
      tooltip: { 
        trigger: 'axis',
        formatter: (params: any) => {
          return `${params[0].axisValue}<br/>收益率: ${params[0].value.toFixed(2)}%`
        }
      },
      grid: { left: '3%', right: '4%', bottom: '0%', top: '3%', containLabel: true, height: 60 },
      xAxis: { 
        type: 'category', 
        data: dates,
        axisLabel: { show: false }, // 隐藏X轴标签，共用一个X轴
        axisLine: { show: false },  // 隐藏X轴线
        axisTick: { show: false }   // 隐藏X轴刻度
      },
      yAxis: { 
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#ebeef5' } },
        axisLabel: {
          color: '#909399',
          fontSize: 10,
          formatter: (value: number) => `${value.toFixed(1)}%`
        }
      },
      series: [{
        name: '收益率', 
        type: 'line', 
        data: returns,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: '#91cc75', width: 2 },
        areaStyle: { 
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(145, 204, 117, 0.3)' },
              { offset: 1, color: 'rgba(145, 204, 117, 0.1)' }
            ]
          }
        }
      }]
    }
    returnChart.setOption(option)
  }
  
  // 3. 回撤曲线 - 隐藏X轴标签
  if (drawdownChartRef.value && observerData.value?.observer_data?.drawdown) {
    drawdownChart = echarts.init(drawdownChartRef.value)
    const drawdownData = observerData.value.observer_data.drawdown
    const dates = drawdownData.map(item => item.datetime.split(' ')[0])
    const drawdowns = drawdownData.map(item => item.drawdown * 100)
    
    const option = {
      tooltip: { 
        trigger: 'axis',
        formatter: (params: any) => {
          return `${params[0].axisValue}<br/>回撤: ${params[0].value.toFixed(2)}%`
        }
      },
      grid: { left: '3%', right: '4%', bottom: '5%', top: '3%', containLabel: true, height: 60 },
      xAxis: { 
        type: 'category', 
        data: dates,
        axisLabel: { show: false }, // 隐藏X轴标签
        axisLine: { show: false },  // 隐藏X轴线
        axisTick: { show: false }   // 隐藏X轴刻度
      },
      yAxis: { 
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#ebeef5' } },
        axisLabel: {
          color: '#909399',
          fontSize: 10,
          formatter: (value: number) => `${value.toFixed(1)}%`
        }
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, start: 0, end: 100 },
        { show: false, xAxisIndex: 0, type: 'slider', bottom: 0, start: 0, end: 100 } // 隐藏滑动条
      ],
      series: [{
        name: '回撤', 
        type: 'line', 
        data: drawdowns,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: '#ee6666', width: 2 },
        areaStyle: { 
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(238, 102, 102, 0.5)' }, // 增加透明度，使曲线更明显
              { offset: 1, color: 'rgba(238, 102, 102, 0.2)' }
            ]
          }
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(238, 102, 102, 0.5)'
          }
        }
      }]
    }
    drawdownChart.setOption(option)
  }
}

// 工具函数
const getReturnClass = (value: number): string => {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return ''
}

const formatPercent = (value: number): string => {
  if (value === null || value === undefined) return '0.00%';
  return `${value.toFixed(2)}%`
}

const formatMoney = (value: number): string => {
  if (value === null || value === undefined) return '0.00';
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const getProgressColor = (percentage: number): string => {
  if (percentage >= 70) return '#67c23a'
  if (percentage >= 50) return '#e6a23c'
  return '#f56c6c'
}

const getRiskLevel = (maxDrawdown: number, sharpeRatio: number): string => {
  if (Math.abs(maxDrawdown) < 0.1 && sharpeRatio > 1.5) return 'low-risk'
  if (Math.abs(maxDrawdown) < 0.2 && sharpeRatio > 1.0) return 'medium-risk'
  return 'high-risk'
}

const getRiskLevelText = (maxDrawdown: number, sharpeRatio: number): string => {
  if (Math.abs(maxDrawdown) < 0.1 && sharpeRatio > 1.5) return '低风险'
  if (Math.abs(maxDrawdown) < 0.2 && sharpeRatio > 1.0) return '中风险'
  return '高风险'
}


// 计算属性：统计数据
const filteredTradesTotal = computed(() => filteredTrades.value.length)

const buyTradesCount = computed(() => 
  filteredTrades.value.filter(trade => trade.type === 'buy').length
)

const sellTradesCount = computed(() => 
  filteredTrades.value.filter(trade => trade.type === 'sell').length
)

const totalTradeAmount = computed(() => 
  filteredTrades.value.reduce((sum, trade) => sum + trade.value, 0)
)

const formatDate = (dateStr: string): string => {
  return dateStr.split('T')[0]
}


const goBack = () => {
  router.push({ name: 'BacktestHistory' })
}

// 页面初始化
onMounted(async () => {
  taskId.value = route.params.taskId as string
  
  if (!taskId.value) {
    ElMessage.error('缺少任务ID参数')
    goBack()
    return
  }
  
  loading.value = true
  
  try {
    // 只调用一次回测结果接口，后端已合并返回所需数据
    await fetchBacktestResult()

    
    
    await initCharts()
  } catch (error) {
    console.error('页面初始化失败:', error)
  } finally {
    loading.value = false
  }
})

// 清理图表实例
const cleanup = () => {
  if (brokerChart) {
    brokerChart.dispose()
    brokerChart = null
  }
  if (returnChart) {
    returnChart.dispose()
    returnChart = null
  }
  if (drawdownChart) {
    drawdownChart.dispose()
    drawdownChart = null
  }
  if (klineChart) {
    klineChart.dispose()
    klineChart = null
  }
  if (indicatorChart) {
    indicatorChart.dispose()
    indicatorChart = null
  }
}

// 组件卸载时清理
import { onUnmounted } from 'vue'
onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.backtest-result-view {
  padding: 20px;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-button {
  margin-right: 20px;
}

.header-content h1 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
}

.header-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.content-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

/* 顶部信息行 - 回测区间和资金信息 */
.top-info-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

/* 基本数据展示 */
.stats-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  /* 回测时间区间样式 */
  .backtest-period {
    background-color: #f5f7fa;
    border-radius: 8px;
    padding: 10px 15px;
    margin-bottom: 10px;
  }
  
  .period-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .period-label {
    font-weight: 600;
    color: #606266;
  }
  
  .period-value {
    color: #303133;
  }
  
  /* 资金信息样式 */
  .funds-info {
    display: flex;
    gap: 20px;
    margin-top: 10px;
  }
  
  .fund-item {
    flex: 1;
    display: flex;
    align-items: center;
    background-color: #f5f7fa;
    border-radius: 8px;
    padding: 15px;
  }
  
  .fund-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background-color: #e6f1fc;
    color: #409eff;
    margin-right: 12px;
  }
  
  .fund-content {
    display: flex;
    flex-direction: column;
  }
  
  .fund-label {
    font-size: 14px;
    color: #606266;
    margin-bottom: 4px;
  }
  
  .fund-value {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }

.main-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.main-stat-item {
  display: flex;
  align-items: center;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.main-stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
}

.positive-bg {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  color: white;
}

.info-bg {
  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: white;
}

.warning-bg {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
  color: white;
}

.success-bg {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.secondary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.horizontal-stats {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 12px;
  padding-bottom: 8px;
}

.horizontal-stats .secondary-stat-item {
  min-width: 180px;
  flex: 1;
}

.secondary-stat-item {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.secondary-stat-item:hover {
  transform: translateY(-1px);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.trend-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.trend-up {
  background: #f0f9ff;
  color: #67c23a;
}

.trend-down {
  background: #fef0f0;
  color: #f56c6c;
}

.stat-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  background: #f5f7fa;
  color: #909399;
}

.stat-badge.success {
  background: #f0f9ff;
  color: #67c23a;
}

.stat-badge.danger {
  background: #fef0f0;
  color: #f56c6c;
}

.stat-badge.info {
  background: #f0f9ff;
  color: #409eff;
}

.risk-level {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.low-risk {
  background: #f0f9ff;
  color: #67c23a;
}

.medium-risk {
  background: #fdf6ec;
  color: #e6a23c;
}

.high-risk {
  background: #fef0f0;
  color: #f56c6c;
}

.stat-progress {
  margin: 8px 0;
}

.stat-description {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.positive {
  color: #c23a3f;
}

.negative {
  color: #6e6cf5;
}

/* 图表容器 */
.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.chart-item {
  display: flex;
  flex-direction: column;
}

.chart-item.full-width {
  grid-column: 1 / -1;
}

.chart-item h3 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 16px;
}

.chart-card {
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chart {
  width: 100%;
}

.main-chart-content {
  height: 400px;
}

/* 技术指标区域样式 */
.indicator-area {
  margin-top: 10px;
  border-top: 1px dashed #e0e0e0;
  padding-top: 10px;
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.indicator-title {
  font-weight: 600;
  font-size: 14px;
  color: #606266;
}

.indicator-chart {
  height: 200px;
}

/* 观测器图表容器 */
.observer-card {
  margin-top: 20px;
}

.observer-legend {
  display: flex;
  gap: 15px;
  justify-content: center; /* 居中排列 */
  align-items: center; /* 垂直居中 */
  flex-wrap: wrap; /* 当空间不足时换行，仍保持居中 */
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 5px;
}

.broker-color {
  background-color: #5470c6;
}

.return-color {
  background-color: #91cc75;
}

.drawdown-color {
  background-color: #ee6666;
}

.observer-charts-container {
  display: flex;
  flex-direction: column;
  gap: 5px; /* 优化小图间距 */
}

.observer-chart {
  height: 60px; /* 统一小图高度 */
}

/* 筛选操作区域样式 */
.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: 16px;
}

.filter-actions .el-button {
  border-radius: 6px;
}

/* 导出按钮样式 */
.header-actions .el-button {
  margin-left: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .charts-container {
    grid-template-columns: 1fr;
  }
  
  .chart {
    height: 250px;
  }
  
  .large-chart {
    height: 300px;
  }
  
  .filter-actions {
    flex-direction: column;
    margin-left: 0;
    margin-top: 8px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .back-button {
    margin-right: 0;
    margin-bottom: 10px;
  }
}

/* 交易记录汇总样式 */
.table-summary {
  margin-bottom: 20px;
}

.summary-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
}

.summary-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border-color: #e0e0e0;
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  position: relative;
  overflow: hidden;
}

.stat-icon-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: inherit;
  opacity: 0.1;
  border-radius: inherit;
}

.stat-icon {
  font-size: 20px;
  z-index: 1;
}

.stat-icon-wrapper.total {
  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: #409eff;
}

.stat-icon-wrapper.buy {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  color: #67c23a;
}

.stat-icon-wrapper.sell {
  background: linear-gradient(135deg, #f56c6c, #f78989);
  color: #f56c6c;
}

.stat-icon-wrapper.amount {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
  color: #e6a23c;
}

.summary-stat-card .stat-content {
  flex: 1;
}

.summary-stat-card .stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
  line-height: 1.2;
}

.summary-stat-card .stat-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
  margin-bottom: 6px;
}

.summary-stat-card .stat-description {
  font-size: 12px;
  color: #909399;
  line-height: 1.3;
}

/* 表格样式优化 */
.trades-table {
  border-radius: 8px;
  overflow: hidden;
}

.trades-table .el-table__header {
  background-color: #fafafa;
}

.trades-table .el-table__row:hover {
  background-color: #f8f9fa;
}

.date-value {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
}

.price-value, .amount-value {
  font-family: 'Monaco', 'Menlo', monospace;
  font-weight: 600;
}
.commission-value {
  font-family: 'Monaco', 'Menlo', monospace;
  font-weight: 600;
}
</style>