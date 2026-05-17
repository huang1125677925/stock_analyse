<template>
  <div class="basic-stats-section">
    <el-card class="stats-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">回测基本数据</span>
        </div>
      </template>

      <div v-if="backtestResult && taskInfo" class="stats-container">
        <div class="top-info-row">
          <div class="fund-item">
            <div class="period-item">
              <span class="period-label">回测区间:</span>
              <span class="period-value">{{ formatDate(taskInfo.start_date) }} 至 {{ formatDate(taskInfo.end_date) }}</span>
            </div>
          </div>

          <div class="fund-item">
            <div class="fund-icon">
              <el-icon><Money /></el-icon>
            </div>
            <div class="fund-content">
              <div class="fund-label">初始资金</div>
              <div class="fund-value">¥{{ formatMoney(taskInfo.initial_cash || 0) }}</div>
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
              <div class="main-stat-description">
                衡量单位风险获得的超额收益，数值越高风险调整后表现越好。
                <br>
                计算：夏普比率 = (年化收益率 - 无风险收益率) / 年化波动率。
              </div>
            </div>
          </div>
        </div>

        <div class="secondary-stats horizontal-stats">
          <div class="secondary-stat-item">
            <div class="stat-header">
              <div class="stat-label">胜率</div>
              <div class="trend-indicator" :class="backtestResult.performance.win_rate >= 0.6 ? 'trend-up' : 'trend-down'">
                <el-icon v-if="backtestResult.performance.win_rate >= 0.6"><ArrowUp /></el-icon>
                <el-icon v-else><ArrowDown /></el-icon>
              </div>
            </div>
            <div class="stat-value">{{ formatPercent(backtestResult.performance.win_rate) }}</div>
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
            <div class="stat-value">{{ backtestResult.performance.total_trades }}</div>
            <div class="stat-description">交易频率: {{ (backtestResult.performance.total_trades / 252).toFixed(1) }}/年</div>
          </div>

          <div class="secondary-stat-item">
            <div class="stat-header">
              <div class="stat-label">盈利交易</div>
              <div class="stat-badge success">
                <el-icon><CircleCheck /></el-icon>
              </div>
            </div>
            <div class="stat-value positive">{{ backtestResult.performance.winning_trades }}</div>
            <div class="stat-description">
              占比:
              {{
                backtestResult.performance.total_trades
                  ? ((backtestResult.performance.winning_trades / backtestResult.performance.total_trades) * 100).toFixed(1)
                  : '0.0'
              }}%
            </div>
          </div>

          <div class="secondary-stat-item">
            <div class="stat-header">
              <div class="stat-label">亏损交易</div>
              <div class="stat-badge danger">
                <el-icon><CircleClose /></el-icon>
              </div>
            </div>
            <div class="stat-value negative">{{ backtestResult.performance.losing_trades }}</div>
            <div class="stat-description">
              占比:
              {{
                backtestResult.performance.total_trades
                  ? ((backtestResult.performance.losing_trades / backtestResult.performance.total_trades) * 100).toFixed(1)
                  : '0.0'
              }}%
            </div>
          </div>

          <div class="secondary-stat-item">
            <div class="stat-header">
              <div class="stat-label">风险评级</div>
              <div class="risk-level" :class="getRiskLevel(backtestResult.performance.max_drawdown, backtestResult.performance.sharpe_ratio)">
                <el-icon><Wallet /></el-icon>
              </div>
            </div>
            <div class="stat-value">{{ getRiskLevelText(backtestResult.performance.max_drawdown, backtestResult.performance.sharpe_ratio) }}</div>
            <div class="stat-description">基于回撤和夏普比率</div>
          </div>

          <div class="secondary-stat-item">
            <div class="stat-header">
              <div class="stat-label">收益风险比</div>
              <div class="stat-badge info">
                <el-icon><Coin /></el-icon>
              </div>
            </div>
            <div class="stat-value">
              {{
                backtestResult.performance.max_drawdown === 0
                  ? '-'
                  : (Math.abs(backtestResult.performance.total_return) / Math.abs(backtestResult.performance.max_drawdown)).toFixed(2)
              }}
            </div>
            <div class="stat-description">收益/最大回撤</div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件功能：
 * - 展示回测核心绩效指标、交易统计及风险评级信息
 * 参数：
 * - taskInfo: 任务基础信息
 * - backtestResult: 回测结果聚合数据
 * - formatDate/formatMoney/formatPercent/getReturnClass: 页面格式化与样式函数
 * 返回值：
 * - 无
 * 事件：
 * - 无
 */
import {
  ArrowDown,
  ArrowUp,
  CircleCheck,
  CircleClose,
  Coin,
  DataAnalysis,
  DataLine,
  Medal,
  Money,
  TrendCharts,
  Warning,
  Wallet
} from '@element-plus/icons-vue'
import type { BacktestResult } from '@/services/quantBacktestApi'
import type { BacktestResultViewData } from '../composables/useBacktestResult'

defineProps<{
  taskInfo: BacktestResult['task_info'] | null
  backtestResult: BacktestResultViewData | null
  formatDate: (dateStr: string | null | undefined) => string
  formatMoney: (value: number | null | undefined) => string
  formatPercent: (value: number | null | undefined) => string
  getReturnClass: (value: number) => string
}>()

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
</script>

<style scoped lang="scss" src="./styles/backtest-result-stats.scss"></style>
