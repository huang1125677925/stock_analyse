<template>
  <div class="index-rps-heatmap-view" v-loading="loading" element-loading-text="正在加载指数RPS数据...">
    <div class="rps-data-section" v-if="rpsData.length > 0">
      <el-card shadow="never" class="rps-card">
        <template #header>
          <div class="table-header">
            <div class="toolbar-row">
              <div class="table-controls">
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索指数名称"
                  :prefix-icon="Search"
                  clearable
                  class="control-item control-search"
                />
                <el-select
                  v-model="idxType"
                  placeholder="选择板块类型"
                  class="control-item"
                >
                  <el-option label="行业板块" value="行业板块" />
                  <el-option label="概念板块" value="概念板块" />
                  <el-option label="地域板块" value="地域板块" />
                </el-select>
                <el-select
                  v-if="idxType === '行业板块'"
                  v-model="industryLevel"
                  placeholder="选择行业级别"
                  class="control-item"
                >
                  <el-option
                    v-for="level in industryLevelOptions"
                    :key="level"
                    :label="level"
                    :value="level"
                  />
                </el-select>
                <el-select
                  v-model="heatmapSortField"
                  placeholder="排序依据"
                  class="control-item"
                >
                  <el-option
                    v-for="option in strengthFieldOptions"
                    :key="option.value"
                    :label="`按 ${option.label} 排序`"
                    :value="option.value"
                  />
                </el-select>
              </div>
              <div class="table-summary">
                <el-tag type="info" effect="plain">共 {{ heatmapRows.length }} 条</el-tag>
                <el-tag v-if="queryTime" type="success" effect="light">更新时间 {{ queryTime }}</el-tag>
              </div>
            </div>
            <div class="simple-filter-panel">
              <div class="simple-filter-group">
                <span class="simple-filter-label">RPS强度项</span>
                <el-select
                  v-model="selectedStrengthFields"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
                  placeholder="选择一个或多个强度项"
                  class="simple-filter-select strength-filter-select"
                >
                  <el-option
                    v-for="option in strengthFieldOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
              <div class="simple-filter-group">
                <span class="simple-filter-label">最低强度</span>
                <el-select
                  v-model="minimumStrengthRank"
                  placeholder="选择强度下限"
                  class="simple-filter-select"
                >
                  <el-option
                    v-for="option in minimumStrengthOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
              <div class="simple-filter-group">
                <span class="simple-filter-label">涨跌幅关系</span>
                <el-select
                  v-model="changeRelationMode"
                  placeholder="选择关系"
                  class="simple-filter-select relation-filter-select"
                >
                  <el-option
                    v-for="option in changeRelationOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
              <div class="simple-filter-group">
                <span class="simple-filter-label">成交额范围</span>
                <div class="amount-range-inputs">
                  <el-select
                    v-model="minAmount"
                    placeholder="最小值"
                    class="amount-range-select"
                  >
                    <el-option
                      v-for="option in amountFilterOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                  <span class="amount-range-separator">-</span>
                  <el-select
                    v-model="maxAmount"
                    placeholder="最大值"
                    class="amount-range-select"
                  >
                    <el-option
                      v-for="option in amountFilterOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </div>
              </div>
              <el-button
                v-if="hasActiveSimpleFilter"
                link
                type="primary"
                class="simple-filter-reset"
                @click="resetSimpleFilters"
              >
                清空筛选
              </el-button>
            </div>
          </div>
        </template>

        <div class="methodology">
          <p>
            RPS（Relative Price Strength）用于衡量当前指数相对同组指数的价格强度。热力图纵轴为各指数，横轴为不同周期（当日、5、20、60、120、250 日），单元格颜色深浅代表 RPS 强度高低。
          </p>
          <p>
            计算方式：RPS = (1 - 排名 / 总板块数) × 100。数值越高、颜色越偏红，表示该指数在同组指数中越强。点击任意方块可选择查看该指数的行业趋势图、成分股RPS或领涨数据详情。
          </p>
        </div>

        <HeatmapChart
          v-if="heatmapOption"
          :option="heatmapOption"
          @chart-click="onHeatmapClick"
        />
        <el-empty v-else description="暂无可展示的RPS数据" />

        <LeadRiseDetailDialog
          v-model="detailDialogVisible"
          :ts-code="currentTsCode"
          :idx-type="idxType"
          :name="currentIndexName"
        />

        <!-- 点击热力图方块后，选择查看方式 -->
        <el-dialog
          v-model="actionSelectVisible"
          :title="`选择查看方式 - ${actionSelectRow?.name ?? ''}`"
          width="420px"
          append-to-body
        >
          <div class="action-select-body">
            <p class="action-select-tip">请选择要查看的内容：</p>
            <div class="action-select-buttons">
              <el-button type="primary" @click="handleSelectAction('trend')">行业趋势图</el-button>
              <el-button type="success" @click="handleSelectAction('member')">成分股RPS</el-button>
              <el-button type="warning" @click="handleSelectAction('lead')">领涨数据详情</el-button>
            </div>
          </div>
        </el-dialog>

        <el-dialog
          v-model="indexTrendDialogVisible"
          width="88%"
          top="6vh"
          :close-on-click-modal="false"
          destroy-on-close
          append-to-body
        >
          <template #header>
            <div class="trend-dialog-header">
              <div class="trend-dialog-title">
                {{ indexTrendBoard.name || indexTrendBoard.code }} 趋势看板K线图
              </div>
              <div class="trend-dialog-subtitle">
                {{ indexTrendDateRange.start || '-' }} 至 {{ indexTrendDateRange.end || '-' }}
              </div>
            </div>
          </template>

          <div class="trend-dialog-body">
            <div class="toolbar-row">
              <div class="table-summary">
                <el-tag v-if="indexTrendBoard.code" type="info" effect="plain">
                  板块代码 {{ indexTrendBoard.code }}
                </el-tag>
                <el-tag type="warning" effect="light">板块类型 {{ idxType }}</el-tag>
                <el-tag v-if="latestIndexTrendData" type="success" effect="light">
                  最新收盘 {{ latestIndexTrendData.close_price.toFixed(2) }}
                </el-tag>
                <el-tag
                  v-if="latestIndexTrendData"
                  :type="latestIndexTrendData.change_percent > 0 ? 'danger' : latestIndexTrendData.change_percent < 0 ? 'success' : 'info'"
                  effect="light"
                >
                  最新涨跌幅 {{ formatPercent(latestIndexTrendData.change_percent) }}
                </el-tag>
                <el-tag v-if="latestIndexTrendData" type="info" effect="light">
                  最新成交额 {{ formatAmount(latestIndexTrendData.amount) }}
                </el-tag>
              </div>
              <div class="trend-shortcuts">
                <el-radio-group v-model="indexTrendShortcut" @change="handleIndexTrendShortcutChange">
                  <el-radio-button label="1y">最近1年</el-radio-button>
                  <el-radio-button label="3y">最近3年</el-radio-button>
                  <el-radio-button label="5y">最近5年</el-radio-button>
                  <el-radio-button label="10y">最近10年</el-radio-button>
                  <el-radio-button label="20y">最近20年</el-radio-button>
                </el-radio-group>
              </div>
            </div>

            <el-card class="trend-preview-card" v-loading="indexTrendLoading">
              <StockKLineChart
                v-if="indexTrendData.length"
                :stock-code="indexTrendBoard.code"
                :stock-name="indexTrendBoard.name"
                :kline-data="indexTrendData"
                height="420px"
              />
              <el-empty
                v-else-if="!indexTrendLoading"
                :description="indexTrendEmptyText"
                :image-size="80"
              />
            </el-card>
          </div>
        </el-dialog>

        <el-dialog
          v-model="memberRpsDialogVisible"
          :title="`成分股RPS强度 - ${memberRpsBoardName || memberRpsBoardTsCode}`"
          width="1400px"
          top="5vh"
          destroy-on-close
        >
          <div class="member-rps-dialog" v-loading="memberRpsLoading" element-loading-text="正在加载成分股RPS数据...">
            <!-- 使用场景说明 -->
            <el-alert
              title="使用场景说明"
              type="info"
              :closable="false"
              class="usage-tips"
            >
              <template #default>
                <div class="tips-content">
                  <div class="tip-item">
                    <strong>找强势股：</strong>选择"20日" + "强于行业"，立即看到20日涨幅超过行业的成分股，查看这些股票的平均涨幅、最高涨幅等统计
                  </div>
                  <div class="tip-item">
                    <strong>找补涨股：</strong>选择"5日" + "弱于行业"，找出短期表现弱于行业的股票，可能存在补涨机会
                  </div>
                  <div class="tip-item">
                    <strong>多周期对比：</strong>切换不同周期（5日、20日、60日等），观察在不同时间维度上的强弱分布，结合RPS值综合判断个股强度
                  </div>
                </div>
              </template>
            </el-alert>

            <div class="toolbar-row member-rps-toolbar">
              <div class="table-controls">
                <el-input
                  v-model="memberRpsSearchKeyword"
                  placeholder="搜索成分股名称或代码"
                  :prefix-icon="Search"
                  clearable
                  class="control-item control-search"
                />
                <el-date-picker
                  v-model="memberRpsSelectedDate"
                  type="date"
                  placeholder="选择交易日（默认最近交易日）"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  :disabled="memberRpsLoading"
                  :disabled-date="disableFutureDate"
                  @change="handleMemberRpsDateChange"
                  class="control-item member-rps-date"
                />
              </div>
              <div class="table-summary">
                <el-tag type="info" effect="plain">共 {{ filteredMemberRpsData.length }} 条</el-tag>
                <el-tag v-if="memberRpsTradeDate" type="warning" effect="light">交易日 {{ memberRpsTradeDate }}</el-tag>
                <el-tag v-if="memberRpsQueryTime" type="success" effect="light">更新时间 {{ memberRpsQueryTime }}</el-tag>
              </div>
            </div>

            <div class="toolbar-row member-rps-filter-toolbar">
              <div class="table-controls">
                <div class="simple-filter-group">
                  <div class="simple-filter-label">涨跌幅筛选</div>
                  <el-select
                    v-model="memberRpsFilterPeriod"
                    placeholder="选择周期"
                    clearable
                    class="control-item"
                  >
                    <el-option
                      v-for="option in memberRpsFilterPeriodOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </div>
                <div class="simple-filter-group" v-if="memberRpsFilterPeriod !== null">
                  <div class="simple-filter-label">对比行业</div>
                  <el-select
                    v-model="memberRpsFilterMode"
                    class="control-item"
                  >
                    <el-option
                      v-for="option in memberRpsFilterModeOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </div>
              </div>
              <div class="table-summary" v-if="memberRpsFilterPeriod !== null && memberRpsFilterMode !== 'all'">
                <el-tag type="primary" effect="plain">
                  筛选后 {{ memberRpsStatistics.count }}/{{ memberRpsStatistics.totalCount }} 只
                  ({{ memberRpsStatistics.percentage.toFixed(1) }}%)
                </el-tag>
                <el-tag type="success" effect="light">平均 {{ formatPercent(memberRpsStatistics.avgReturn) }}</el-tag>
                <el-tag type="danger" effect="light">最高 {{ formatPercent(memberRpsStatistics.maxReturn) }}</el-tag>
                <el-tag type="info" effect="light">最低 {{ formatPercent(memberRpsStatistics.minReturn) }}</el-tag>
              </div>
            </div>

            <!-- 周期统计表格 -->
            <div class="period-statistics-container" v-if="memberRpsPeriodStatistics.length > 0">
              <div class="statistics-header">
                <span class="statistics-title">周期统计概览</span>
                <span class="statistics-subtitle">展示各周期下成分股相对行业的强弱分布</span>
              </div>
              <el-table
                :data="memberRpsPeriodStatistics"
                size="small"
                border
                stripe
                class="period-statistics-table"
              >
                <el-table-column prop="periodLabel" label="周期" width="80" align="center" />
                <el-table-column label="强于行业" width="120" align="center">
                  <template #default="scope">
                    <span class="stat-value">{{ scope.row.aboveCount }}/{{ scope.row.totalCount }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="占比" width="100" align="center">
                  <template #default="scope">
                    <el-tag
                      :type="scope.row.abovePercentage >= 50 ? 'success' : 'info'"
                      size="small"
                      effect="light"
                    >
                      {{ scope.row.abovePercentage.toFixed(1) }}%
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="行业涨跌幅" width="120" align="center">
                  <template #default="scope">
                    <span
                      class="return-value"
                      :class="{ up: scope.row.boardReturn > 0, down: scope.row.boardReturn < 0 }"
                    >
                      {{ formatPercent(scope.row.boardReturn) }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column label="成分股平均涨跌幅" width="150" align="center">
                  <template #default="scope">
                    <span
                      class="return-value"
                      :class="{ up: scope.row.avgReturn > 0, down: scope.row.avgReturn < 0 }"
                    >
                      {{ formatPercent(scope.row.avgReturn) }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column label="行业排名" min-width="150" align="center">
                  <template #default="scope">
                    <div class="rank-indicator">
                      <span v-if="scope.row.avgReturn > scope.row.boardReturn" class="rank-tag rank-above">
                        成分股强于行业
                      </span>
                      <span v-else-if="scope.row.avgReturn < scope.row.boardReturn" class="rank-tag rank-below">
                        成分股弱于行业
                      </span>
                      <span v-else class="rank-tag rank-equal">
                        持平
                      </span>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <el-table
              :data="filteredMemberRpsData"
              stripe
              style="width: 100%"
              :height="isMobile ? undefined : 620"
              :default-sort="{ prop: memberRpsDefaultSortProp, order: 'descending' }"
              highlight-current-row
              :row-class-name="memberRpsTableRowClassName"
              @sort-change="handleMemberRpsSortChange"
            >
              <el-table-column type="index" label="#" :width="isMobile ? 40 : 50" align="center" :fixed="isMobile ? false : 'left'" />
              <el-table-column prop="ts_code" label="ts_code" :min-width="isMobile ? 100 : 120" sortable="custom" :fixed="isMobile ? false : 'left'" align="center">
                <template #default="scope">
                  <el-tag size="small" effect="plain">{{ scope.row.ts_code }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="名称" :min-width="isMobile ? 100 : 150" sortable="custom" :fixed="isMobile ? false : 'left'">
                <template #default="scope">
                  <el-button
                    type="primary"
                    link
                    @click="openMemberStockTrendDialog(scope.row)"
                  >
                    {{ scope.row.name }}
                  </el-button>
                </template>
              </el-table-column>

              <el-table-column prop="RPS_today" label="当日涨跌幅 / RPS_today" min-width="150" sortable="custom" align="center">
                <template #default="scope">
                  <div class="rps-cell rps-cell-with-change">
                    <span class="rps-change-text" :class="{ up: getNumericValue(scope.row.pct_change) > 0, down: getNumericValue(scope.row.pct_change) < 0 }">
                      {{ formatPercent(scope.row.pct_change) }}
                    </span>
                    <el-progress
                      :percentage="getNumericValue(scope.row.RPS_today)"
                      :color="getRpsColor(getNumericValue(scope.row.RPS_today))"
                      :format="() => formatRpsValue(scope.row.RPS_today)"
                      :stroke-width="18"
                      :text-inside="true"
                      :show-text="true"
                    />
                    <div class="rps-rank" :class="getRpsRankClass(getNumericValue(scope.row.RPS_today))">
                      {{ getRpsRankText(getNumericValue(scope.row.RPS_today)) }}
                    </div>
                  </div>
                </template>
              </el-table-column>

              <template v-for="period in memberRpsPeriods" :key="period">
                <el-table-column
                  :prop="getDynamicRpsProp(period)"
                  :label="`${period}日涨跌幅 / RPS_${period}`"
                  min-width="150"
                  sortable="custom"
                  align="center"
                >
                  <template #default="scope">
                    <div class="rps-cell rps-cell-with-change">
                      <span class="rps-change-text" :class="{ up: getNumericValue(scope.row[getDynamicReturnProp(period)]) > 0, down: getNumericValue(scope.row[getDynamicReturnProp(period)]) < 0 }">
                        {{ formatPercent(scope.row[getDynamicReturnProp(period)]) }}
                      </span>
                      <el-progress
                        :percentage="getNumericValue(scope.row[getDynamicRpsProp(period)])"
                        :color="getRpsColor(getNumericValue(scope.row[getDynamicRpsProp(period)]))"
                        :format="() => formatRpsValue(scope.row[getDynamicRpsProp(period)])"
                        :stroke-width="18"
                        :text-inside="true"
                        :show-text="true"
                      />
                      <div class="rps-rank" :class="getRpsRankClass(getNumericValue(scope.row[getDynamicRpsProp(period)]))">
                        {{ getRpsRankText(getNumericValue(scope.row[getDynamicRpsProp(period)])) }}
                      </div>
                    </div>
                  </template>
                </el-table-column>
              </template>
            </el-table>
          </div>
        </el-dialog>

        <el-dialog
          v-model="memberStockTrendDialogVisible"
          width="88%"
          top="6vh"
          :close-on-click-modal="false"
          destroy-on-close
          append-to-body
        >
          <template #header>
            <div class="trend-dialog-header">
              <div class="trend-dialog-title">
                {{ memberStockTrendStock.name || memberStockTrendStock.code }} K线趋势图
              </div>
              <div class="trend-dialog-subtitle">
                {{ memberStockTrendDateRange.start || '-' }} 至 {{ memberStockTrendDateRange.end || '-' }}
              </div>
            </div>
          </template>

          <div class="trend-dialog-body">
            <div class="trend-shortcuts">
              <el-radio-group v-model="memberStockTrendShortcut" @change="handleMemberStockTrendShortcutChange">
                <el-radio-button label="1y">最近1年</el-radio-button>
                <el-radio-button label="3y">最近3年</el-radio-button>
                <el-radio-button label="5y">最近5年</el-radio-button>
                <el-radio-button label="10y">最近10年</el-radio-button>
                <el-radio-button label="20y">最近20年</el-radio-button>
              </el-radio-group>
            </div>

            <el-card class="trend-preview-card" v-loading="memberStockTrendLoading">
              <StockKLineChart
                v-if="memberStockTrendData.length"
                :stock-code="memberStockTrendStock.code"
                :stock-name="memberStockTrendStock.name"
                :kline-data="memberStockTrendData"
                height="420px"
              />
              <el-empty
                v-else-if="!memberStockTrendLoading"
                :description="memberStockTrendEmptyText"
                :image-size="80"
              />
            </el-card>
          </div>
        </el-dialog>
      </el-card>
    </div>

    <el-empty v-if="!loading && rpsData.length === 0" description="暂无RPS数据" />
  </div>
</template>

<script setup lang="ts">
/**
 * 指数RPS强度热力图页面
 * 功能：
 * - 以热力图形式展示各指数在不同周期（当日、5、20、60、120、250日）的RPS强度
 * - 复用指数RPS强度排名页的数据获取与筛选（板块类型、行业层级、强度、涨跌幅关系、成交额范围）
 * - 点击热力图任意方块时，弹出选择框，由用户选择查看该指数的行业趋势图、成分股RPS或领涨数据详情
 * 参数：level(可选) 行业层级
 * 返回值：无
 * 事件：无
 */
import { ref, reactive, computed, onMounted, onUnmounted, watch, defineComponent, h } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElDialog, ElTable, ElTableColumn, ElButton } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getDcBoardMemberRps, getIndexRps } from '@/services/strategyApi'
import type { DcBoardMemberRpsItem, DcIndustryLevel, IndexRpsIdxType, IndexRpsItem } from '@/services/strategyApi'
import { fetchDcIndexLastNDays, type DcIndexRecord } from '@/services/dcIndexApi'
import { fetchDcDaily } from '@/services/dcDailyApi'
import HeatmapChart from '@/components/HeatmapChart.vue'
import StockKLineChart from '@/components/StockKLineChart.vue'
import { fetchStockHistoryData, type StockHistoryDataItem } from '@/services/stockHistoryApi'
import {
  fetchIndustryTurnoverPercentile,
  type IndustryTurnoverPercentileItem
} from '@/services/industry-turnover-percentile'

const industryLevelOptions: DcIndustryLevel[] = ['东财一级行业', '东财二级行业', '东财三级行业']

// 响应式屏幕宽度检测
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

interface Props {
  level?: DcIndustryLevel
}

type RpsPeriod = 5 | 20 | 60 | 120 | 250
type RpsField = 'RPS_today' | `RPS_${RpsPeriod}`
type ReturnField = `return_${RpsPeriod}`
type DynamicRpsField = 'RPS_today' | `RPS_${number}`
type MemberTrendShortcut = '1y' | '3y' | '5y' | '10y' | '20y'
type StrengthRankThreshold = 'all' | 'excellent' | 'strong' | 'good' | 'normal'
type ChangeRelationMode = 'all' | 'ascending' | 'descending'
type CellAction = 'trend' | 'member' | 'lead'

const props = defineProps<Props>()

const rpsPeriods: readonly RpsPeriod[] = [5, 20, 60, 120, 250]

function normalizeIndustryLevel(value: unknown): DcIndustryLevel {
  return industryLevelOptions.includes(value as DcIndustryLevel)
    ? value as DcIndustryLevel
    : '东财二级行业'
}

const loading = ref(false)
const route = useRoute()
const rpsData = ref<IndexRpsItem[]>([])
const queryTime = ref('')
const searchKeyword = ref('')
const heatmapSortField = ref<RpsField>('RPS_5')
const indexTrendDialogVisible = ref(false)
const indexTrendLoading = ref(false)
const indexTrendShortcut = ref<MemberTrendShortcut>('1y')
const indexTrendData = ref<StockHistoryDataItem[]>([])
const indexTrendBoard = reactive({
  code: '',
  name: ''
})
const indexTrendDateRange = reactive({
  start: '',
  end: ''
})
let indexTrendRequestId = 0
const memberRpsDialogVisible = ref(false)
const memberRpsLoading = ref(false)
const memberRpsBoardTsCode = ref('')
const memberRpsBoardName = ref('')
const memberRpsTradeDate = ref('')
const memberRpsQueryTime = ref('')
const memberRpsSearchKeyword = ref('')
const memberRpsSelectedDate = ref('')
const memberRpsData = ref<DcBoardMemberRpsItem[]>([])
const memberRpsPeriods = ref<number[]>([])
const memberRpsBoardRpsData = ref<IndexRpsItem | null>(null)
const memberRpsFilterPeriod = ref<number | null>(null)
const memberRpsFilterMode = ref<'all' | 'above' | 'below'>('all')
let memberRpsRequestId = 0
const memberStockTrendDialogVisible = ref(false)
const memberStockTrendLoading = ref(false)
const memberStockTrendShortcut = ref<MemberTrendShortcut>('1y')
const memberStockTrendData = ref<StockHistoryDataItem[]>([])
const memberStockTrendStock = reactive({
  code: '',
  name: ''
})
const memberStockTrendDateRange = reactive({
  start: '',
  end: ''
})
let memberStockTrendRequestId = 0
const idxType = ref<IndexRpsIdxType>('行业板块')
const industryLevel = ref<DcIndustryLevel>(normalizeIndustryLevel(props.level || route.query.level))
const selectedStrengthFields = ref<RpsField[]>([])
const minimumStrengthRank = ref<StrengthRankThreshold>('all')
const changeRelationMode = ref<ChangeRelationMode>('all')
const turnoverData = ref<IndustryTurnoverPercentileItem[]>([])
const minAmount = ref<number>(10000000000)
const maxAmount = ref<number>(0)

// 点击热力图方块后的“选择查看方式”弹窗状态
const actionSelectVisible = ref(false)
const actionSelectRow = ref<IndexRpsItem | null>(null)

const amountFilterOptions: Array<{ label: string; value: number }> = [
  { label: '不限', value: 0 },
  { label: '100亿', value: 10000000000 },
  { label: '300亿', value: 30000000000 },
  { label: '500亿', value: 50000000000 },
  { label: '1000亿', value: 100000000000 },
  { label: '2000亿', value: 200000000000 }
]

const strengthFieldOptions: Array<{ label: string; value: RpsField }> = [
  { label: 'RPS_today', value: 'RPS_today' },
  ...rpsPeriods.map((period) => ({
    label: `RPS_${period}`,
    value: `RPS_${period}` as RpsField
  }))
]

// 热力图列定义：横轴各周期，与 strengthFieldOptions 一一对应
const heatmapColumns: Array<{ label: string; field: RpsField }> = [
  { label: '当日', field: 'RPS_today' },
  { label: 'RPS5', field: 'RPS_5' },
  { label: 'RPS20', field: 'RPS_20' },
  { label: 'RPS60', field: 'RPS_60' },
  { label: 'RPS120', field: 'RPS_120' },
  { label: 'RPS250', field: 'RPS_250' }
]

const minimumStrengthOptions: Array<{ label: string; value: StrengthRankThreshold }> = [
  { label: '不筛选', value: 'all' },
  { label: '一般及以上', value: 'normal' },
  { label: '良好及以上', value: 'good' },
  { label: '强势及以上', value: 'strong' },
  { label: '极强', value: 'excellent' }
]

const changeRelationOptions: Array<{ label: string; value: ChangeRelationMode }> = [
  { label: '不筛选', value: 'all' },
  { label: '递增', value: 'ascending' },
  { label: '递减', value: 'descending' }
]

const memberRpsFilterModeOptions = [
  { label: '全部成分股', value: 'all' },
  { label: '强于行业', value: 'above' },
  { label: '弱于行业', value: 'below' }
]

const hasActiveSimpleFilter = computed(() => {
  return selectedStrengthFields.value.length > 0
    || minimumStrengthRank.value !== 'all'
    || changeRelationMode.value !== 'all'
    || minAmount.value > 0
    || maxAmount.value > 0
})

const relationStrengthFields = computed(() => {
  if (selectedStrengthFields.value.length >= 2) {
    return selectedStrengthFields.value
  }
  return []
})

const formatPercent = (value: unknown): string => {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (!Number.isFinite(num)) return '-'
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

const getNumericValue = (value: unknown): number => {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(num) ? num : 0
}

const formatRpsValue = (value: unknown): string => {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (!Number.isFinite(num)) return '-'
  return num.toFixed(1)
}

const formatDateToYYYYMMDDWithDash = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateForStockApi = (dateText: string): string => dateText.replace(/-/g, '')

const disableFutureDate = (date: Date): boolean => date.getTime() > Date.now()

const formatAmount = (value: unknown): string => {
  const numericValue = getNumericValue(value)
  if (!Number.isFinite(numericValue) || numericValue === 0) {
    return '0'
  }
  if (numericValue >= 100000000) {
    return `${(numericValue / 100000000).toFixed(2)}亿`
  }
  if (numericValue >= 10000) {
    return `${(numericValue / 10000).toFixed(2)}万`
  }
  return numericValue.toFixed(2)
}

const getDynamicReturnProp = (period: number): `return_${number}` => `return_${period}` as `return_${number}`
const getDynamicRpsProp = (period: number): DynamicRpsField => `RPS_${period}` as DynamicRpsField
const getReturnProp = (period: RpsPeriod): ReturnField => `return_${period}`

function getStrengthThresholdValue(rank: StrengthRankThreshold): number {
  switch (rank) {
    case 'excellent':
      return 90
    case 'strong':
      return 80
    case 'good':
      return 70
    case 'normal':
      return 50
    default:
      return 0
  }
}

function getReturnValueByStrengthField(item: IndexRpsItem, field: RpsField): number {
  if (field === 'RPS_today') {
    return getNumericValue(item.pct_change)
  }
  const period = Number(field.replace('RPS_', '')) as RpsPeriod
  return getNumericValue(item[getReturnProp(period)])
}

function matchesStrengthFilters(item: IndexRpsItem): boolean {
  if (selectedStrengthFields.value.length === 0 || minimumStrengthRank.value === 'all') {
    return true
  }
  const threshold = getStrengthThresholdValue(minimumStrengthRank.value)
  return selectedStrengthFields.value.every((field) => getNumericValue(item[field]) >= threshold)
}

function matchesChangeRelation(item: IndexRpsItem): boolean {
  if (changeRelationMode.value === 'all' || relationStrengthFields.value.length < 2) {
    return true
  }

  const values = relationStrengthFields.value.map((field) => getReturnValueByStrengthField(item, field))

  for (let i = 1; i < values.length; i++) {
    if (changeRelationMode.value === 'ascending' && values[i] <= values[i - 1]) {
      return false
    }
    if (changeRelationMode.value === 'descending' && values[i] >= values[i - 1]) {
      return false
    }
  }

  return true
}

function resetSimpleFilters() {
  selectedStrengthFields.value = []
  minimumStrengthRank.value = 'all'
  changeRelationMode.value = 'all'
  minAmount.value = 10000000000
  maxAmount.value = 0
}

const memberStockTrendEmptyText = computed(() => {
  return memberStockTrendStock.code
    ? '暂无该股票区间K线数据'
    : '请选择股票查看K线趋势'
})

const indexTrendEmptyText = computed(() => {
  return indexTrendBoard.code
    ? '暂无该东财指数区间K线数据'
    : '请选择指数查看趋势看板'
})

const latestIndexTrendData = computed(() => {
  return indexTrendData.value.length > 0
    ? indexTrendData.value[indexTrendData.value.length - 1]
    : null
})

/**
 * 构建 ts_code -> 最近交易日成交额 的映射
 * 使用成交额接口返回数据中最近一个交易日的 amount，用于成交额范围筛选
 */
const sectorAmountMap = computed(() => {
  const map = new Map<string, number>()
  if (turnoverData.value.length === 0) return map

  const allDates = Array.from(new Set(turnoverData.value.map(d => d.date))).sort()
  if (allDates.length === 0) return map
  const latestDate = allDates[allDates.length - 1]

  turnoverData.value.forEach(item => {
    if (item.date === latestDate) {
      map.set(item.sector_code, item.amount ?? 0)
    }
  })
  return map
})

/**
 * 成交额范围筛选：按最近一个交易日的成交额筛选指数
 * 支持设置最小值和最大值，实现区间筛选；无成交额数据时不筛选
 */
function matchesAmountFilter(item: IndexRpsItem): boolean {
  const hasMinFilter = minAmount.value > 0
  const hasMaxFilter = maxAmount.value > 0
  if (!hasMinFilter && !hasMaxFilter) return true
  if (sectorAmountMap.value.size === 0) return true

  const amount = sectorAmountMap.value.get(item.ts_code) ?? 0
  if (hasMinFilter && amount < minAmount.value) return false
  if (hasMaxFilter && amount > maxAmount.value) return false
  return true
}

const filteredRpsData = computed(() => {
  let result = rpsData.value
  if (searchKeyword.value) {
    result = result.filter(item => item.name.includes(searchKeyword.value))
  }
  result = result.filter(matchesStrengthFilters)
  result = result.filter(matchesChangeRelation)
  result = result.filter(matchesAmountFilter)
  return result
})

/**
 * 热力图行数据：在筛选结果的基础上，按选定的排序字段降序排列
 */
const heatmapRows = computed(() => {
  const field = heatmapSortField.value
  return [...filteredRpsData.value].sort(
    (a, b) => getNumericValue(b[field]) - getNumericValue(a[field])
  )
})

/**
 * 热力图配置：纵轴为指数、横轴为各周期、值为 RPS 强度（0-100）
 */
const heatmapOption = computed<echarts.EChartsOption | null>(() => {
  const rows = heatmapRows.value
  if (rows.length === 0) return null

  const yLabels = rows.map(row => row.name)
  const xLabels = heatmapColumns.map(col => col.label)
  const data: [number, number, number][] = []
  rows.forEach((row, yi) => {
    heatmapColumns.forEach((col, xi) => {
      data.push([xi, yi, getNumericValue(row[col.field])])
    })
  })

  return {
    animation: false,
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [x, y, v] = params?.data ?? []
        const row = typeof y === 'number' ? rows[y] : undefined
        const col = typeof x === 'number' ? heatmapColumns[x] : undefined
        return `${row?.name ?? ''}<br/>${col?.label ?? ''}: ${Number(v).toFixed(1)}`
      }
    },
    grid: { left: 140, right: 80, top: 60, bottom: 20, containLabel: true },
    xAxis: {
      type: 'category',
      data: xLabels,
      position: 'top',
      splitArea: { show: true },
      axisLabel: { rotate: 0, hideOverlap: true, interval: 'auto' }
    },
    yAxis: {
      type: 'category',
      data: yLabels,
      splitArea: { show: true }
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'vertical',
      right: 10,
      top: 40,
      bottom: 40,
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      }
    },
    series: [{
      type: 'heatmap',
      data,
      label: {
        show: true,
        fontSize: 9,
        formatter: (params: any) => `${Number(params.data[2]).toFixed(0)}`
      },
      itemStyle: { borderColor: '#fff', borderWidth: 1 },
      emphasis: {
        itemStyle: { shadowBlur: 5, shadowColor: 'rgba(0, 0, 0, 0.3)' },
        label: {
          show: true,
          fontSize: 10,
          formatter: (params: any) => `${Number(params.data[2]).toFixed(1)}`
        }
      }
    }]
  }
})

/**
 * 事件：点击热力图方块
 * 功能：定位对应的指数行，打开“选择查看方式”弹窗，由用户选择后续展示内容
 * 参数：params(any) ECharts 点击事件负载，data 为 [x, y, value]
 * 返回值：无
 */
const onHeatmapClick = (params: any) => {
  const data = params?.data as [number, number, number] | undefined
  if (!data) return
  const y = data[1]
  if (typeof y !== 'number') return
  const row = heatmapRows.value[y]
  if (!row) return
  actionSelectRow.value = row
  actionSelectVisible.value = true
}

/**
 * 事件：在选择弹窗中选定查看方式
 * 功能：根据用户选择打开对应的行业趋势图 / 成分股RPS / 领涨数据详情
 * 参数：action(CellAction) 选定的查看方式
 * 返回值：无
 */
const handleSelectAction = (action: CellAction) => {
  const row = actionSelectRow.value
  if (!row) return
  actionSelectVisible.value = false
  if (action === 'trend') {
    showIndexDetail(row)
  } else if (action === 'member') {
    openBoardMemberRpsDialog(row)
  } else if (action === 'lead') {
    openLeadRiseDetail(row)
  }
}

const filteredMemberRpsData = computed(() => {
  let result = memberRpsData.value

  // 搜索筛选
  if (memberRpsSearchKeyword.value) {
    const keyword = memberRpsSearchKeyword.value.trim()
    result = result.filter((item) => item.name.includes(keyword) || item.ts_code.includes(keyword))
  }

  // 涨跌幅相对行业筛选
  if (memberRpsFilterMode.value !== 'all' && memberRpsFilterPeriod.value !== null && memberRpsBoardRpsData.value) {
    const period = memberRpsFilterPeriod.value
    const boardReturnField = period === 0 ? 'pct_change' : getDynamicReturnProp(period)
    const boardReturn = getNumericValue(
      memberRpsBoardRpsData.value[boardReturnField as keyof IndexRpsItem]
    )

    result = result.filter((item) => {
      const itemReturnField = period === 0 ? 'pct_change' : getDynamicReturnProp(period)
      const itemReturn = getNumericValue((item as Record<string, unknown>)[itemReturnField])

      if (memberRpsFilterMode.value === 'above') {
        return itemReturn > boardReturn
      } else if (memberRpsFilterMode.value === 'below') {
        return itemReturn < boardReturn
      }
      return true
    })
  }

  // 将行业RPS数据作为第一行插入
  if (memberRpsBoardRpsData.value) {
    const boardRow: DcBoardMemberRpsItem = {
      ts_code: memberRpsBoardRpsData.value.ts_code,
      name: `【行业】${memberRpsBoardRpsData.value.name}`,
      pct_change: memberRpsBoardRpsData.value.pct_change,
      RPS_today: memberRpsBoardRpsData.value.RPS_today
    }

    // 动态添加各周期的return和RPS字段
    memberRpsPeriods.value.forEach(period => {
      const returnField = getDynamicReturnProp(period)
      const rpsField = getDynamicRpsProp(period)
      boardRow[returnField] = memberRpsBoardRpsData.value![returnField as keyof IndexRpsItem] as number | null
      boardRow[rpsField] = memberRpsBoardRpsData.value![rpsField as keyof IndexRpsItem] as number | null
    })

    result = [boardRow, ...result]
  }

  return result
})

const memberRpsStatistics = computed(() => {
  // 排除行业行，只计算成分股的统计
  const stocks = filteredMemberRpsData.value.filter(item => !item.name.startsWith('【行业】'))
  const totalStocks = memberRpsData.value.length // 总成分股数

  if (stocks.length === 0 || memberRpsFilterPeriod.value === null) {
    return {
      count: stocks.length,
      totalCount: totalStocks,
      percentage: 0,
      avgReturn: 0,
      maxReturn: 0,
      minReturn: 0
    }
  }

  const period = memberRpsFilterPeriod.value
  const returnField = period === 0 ? 'pct_change' : getDynamicReturnProp(period)

  const returns = stocks.map(stock =>
    getNumericValue((stock as Record<string, unknown>)[returnField])
  )

  const sum = returns.reduce((acc, val) => acc + val, 0)
  const avg = returns.length > 0 ? sum / returns.length : 0
  const max = returns.length > 0 ? Math.max(...returns) : 0
  const min = returns.length > 0 ? Math.min(...returns) : 0
  const percentage = totalStocks > 0 ? (stocks.length / totalStocks) * 100 : 0

  return {
    count: stocks.length,
    totalCount: totalStocks,
    percentage,
    avgReturn: avg,
    maxReturn: max,
    minReturn: min
  }
})

const memberRpsFilterPeriodOptions = computed(() => {
  const options = [{ label: '当日', value: 0 }]
  memberRpsPeriods.value.forEach(period => {
    options.push({ label: `${period}日`, value: period })
  })
  return options
})

const memberRpsPeriodStatistics = computed(() => {
  if (!memberRpsBoardRpsData.value || memberRpsData.value.length === 0) {
    return []
  }

  const periods = [0, ...memberRpsPeriods.value] // 包含当日
  const stats = periods.map(period => {
    const returnField = period === 0 ? 'pct_change' : getDynamicReturnProp(period)

    // 获取行业涨跌幅
    const boardReturn = getNumericValue(
      memberRpsBoardRpsData.value![returnField as keyof IndexRpsItem]
    )

    // 统计所有成分股的涨跌幅
    const stockReturns = memberRpsData.value.map(stock =>
      getNumericValue((stock as Record<string, unknown>)[returnField])
    )

    // 计算强于行业的成分股数量
    const aboveCount = stockReturns.filter(ret => ret > boardReturn).length
    const totalCount = stockReturns.length
    const abovePercentage = totalCount > 0 ? (aboveCount / totalCount) * 100 : 0

    // 计算所有成分股的平均涨跌幅
    const avgReturn = stockReturns.length > 0
      ? stockReturns.reduce((acc, val) => acc + val, 0) / stockReturns.length
      : 0

    return {
      period,
      periodLabel: period === 0 ? '当日' : `${period}日`,
      aboveCount,
      totalCount,
      abovePercentage,
      boardReturn,
      avgReturn
    }
  })

  return stats
})

const memberRpsDefaultSortProp = computed(() => {
  const firstPeriod = memberRpsPeriods.value[0]
  return firstPeriod ? getDynamicRpsProp(firstPeriod) : 'RPS_today'
})

const getRpsColor = (rpsValue: number) => {
  if (rpsValue >= 90) return '#f56c6c'
  if (rpsValue >= 80) return '#e6a23c'
  if (rpsValue >= 70) return '#67c23a'
  return '#909399'
}

const getRpsRankText = (value: number) => {
  if (value >= 90) return '极强'
  if (value >= 80) return '强势'
  if (value >= 70) return '良好'
  if (value >= 50) return '一般'
  return '弱势'
}

const getRpsRankClass = (value: number) => {
  if (value >= 90) return 'rank-excellent'
  if (value >= 80) return 'rank-strong'
  if (value >= 70) return 'rank-good'
  if (value >= 50) return 'rank-normal'
  return 'rank-weak'
}

const applyIndexTrendShortcut = (range: MemberTrendShortcut) => {
  const yearMap: Record<MemberTrendShortcut, number> = { '1y': 1, '3y': 3, '5y': 5, '10y': 10, '20y': 20 }
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - yearMap[range])
  indexTrendDateRange.start = formatDateToYYYYMMDDWithDash(startDate)
  indexTrendDateRange.end = formatDateToYYYYMMDDWithDash(endDate)
}

const loadIndexTrendData = async () => {
  const requestId = ++indexTrendRequestId

  if (!indexTrendBoard.code || !indexTrendDateRange.start || !indexTrendDateRange.end) {
    indexTrendData.value = []
    return
  }

  indexTrendLoading.value = true
  try {
    const response = await fetchDcDaily({
      ts_code: indexTrendBoard.code,
      idx_type: idxType.value,
      start_date: formatDateForStockApi(indexTrendDateRange.start),
      end_date: formatDateForStockApi(indexTrendDateRange.end),
      fields: 'ts_code,trade_date,open,high,low,close,change,pct_change,vol,amount,swing,turnover_rate'
    })

    if (requestId !== indexTrendRequestId) return

    indexTrendData.value = [...(response.records || [])]
      .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
      .map((item) => ({
        stock_code: item.ts_code,
        stock_name: indexTrendBoard.name,
        date: item.trade_date,
        open_price: getNumericValue(item.open),
        close_price: getNumericValue(item.close),
        high_price: getNumericValue(item.high),
        low_price: getNumericValue(item.low),
        change_percent: getNumericValue(item.pct_change),
        change_amount: getNumericValue(item.change),
        volume: getNumericValue(item.vol),
        amount: getNumericValue(item.amount),
        amplitude: getNumericValue(item.swing),
        turnover_rate: getNumericValue(item.turnover_rate),
        created_at: ''
      }))
  } catch (error) {
    if (requestId !== indexTrendRequestId) return
    console.error('加载东财指数趋势看板失败:', error)
    indexTrendData.value = []
    ElMessage.error('加载东财指数趋势看板失败，请稍后重试')
  } finally {
    if (requestId === indexTrendRequestId) {
      indexTrendLoading.value = false
    }
  }
}

const handleIndexTrendShortcutChange = (range: MemberTrendShortcut) => {
  applyIndexTrendShortcut(range)
  loadIndexTrendData()
}

const showIndexDetail = (row: IndexRpsItem) => {
  indexTrendBoard.code = row.ts_code
  indexTrendBoard.name = row.name
  indexTrendShortcut.value = '1y'
  indexTrendData.value = []
  applyIndexTrendShortcut('1y')
  indexTrendDialogVisible.value = true
  loadIndexTrendData()
}

const LeadRiseDetailDialog = defineComponent({
  name: 'LeadRiseDetailDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    tsCode: { type: String, required: true },
    idxType: { type: String, required: true },
    name: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const visible = ref(props.modelValue)
    const loading = ref(false)
    const records = ref<DcIndexRecord[]>([])

    const loadData = async () => {
      if (!props.tsCode || !props.idxType) return
      loading.value = true
      try {
        const data = await fetchDcIndexLastNDays({ tsCode: props.tsCode, name: props.name }, 30)
        records.value = (data.records || []).sort((a, b) => a.trade_date.localeCompare(b.trade_date))
      } catch (e) {
        console.error('获取dc_daily数据失败:', e)
        records.value = []
      } finally {
        loading.value = false
      }
    }

    watch(() => props.modelValue, (val) => {
      visible.value = val
      if (val) {
        loadData()
      }
    })

    watch(() => props.tsCode, (newVal) => {
      if (visible.value && newVal) {
        loadData()
      }
    })

    const close = () => emit('update:modelValue', false)

    return () => h(
      ElDialog as any,
      {
        modelValue: visible.value,
        'onUpdate:modelValue': (v: boolean) => emit('update:modelValue', v),
        title: `领涨数据详情 - ${props.name || props.tsCode}`,
        width: '1200px'
      },
      {
        default: () => [
          h('div', { style: 'margin-bottom: 12px; color: #909399;' }, `近30天概念板块（领涨）：${props.idxType}`),
          h(
            ElTable as any,
            { data: records.value, stripe: true, border: true, height: 420 },
            {
              default: () => [
                h(ElTableColumn as any, { prop: 'trade_date', label: '日期', width: 110, align: 'center' }),
                h(ElTableColumn as any, { prop: 'name', label: '概念名称', minWidth: 150 }),
                h(ElTableColumn as any, { prop: 'leading', label: '领涨股票', minWidth: 150 }),
                h(ElTableColumn as any, { prop: 'leading_code', label: '领涨代码', width: 120, align: 'center' }),
                h(ElTableColumn as any, { prop: 'leading_pct', label: '领涨涨幅%', width: 110, align: 'center' }),
                h(ElTableColumn as any, { prop: 'pct_change', label: '板块涨幅%', width: 110, align: 'center' }),
                h(ElTableColumn as any, { prop: 'total_mv', label: '总市值', width: 120, align: 'center' }),
                h(ElTableColumn as any, { prop: 'turnover_rate', label: '换手率', width: 100, align: 'center' }),
                h(ElTableColumn as any, { prop: 'up_num', label: '上涨家数', width: 100, align: 'center' }),
                h(ElTableColumn as any, { prop: 'down_num', label: '下跌家数', width: 100, align: 'center' })
              ]
            }
          )
        ],
        footer: () => [
          h(ElButton as any, { onClick: close }, '关闭')
        ]
      }
    )
  }
})

const detailDialogVisible = ref(false)
const currentTsCode = ref('')
const currentIndexName = ref('')

const openLeadRiseDetail = (row: IndexRpsItem) => {
  currentTsCode.value = row.ts_code
  currentIndexName.value = row.name
  detailDialogVisible.value = true
}

/**
 * 加载成分股RPS数据
 * 功能：按当前板块与选中的交易日拉取成分股RPS。selectedDate 为空时后端返回最近一个交易日。
 * 参数：无（读取 memberRpsBoardTsCode 与 memberRpsSelectedDate）
 * 返回值：Promise<void>
 * 事件：更新 memberRpsData、memberRpsTradeDate 等状态
 */
const loadMemberRpsData = async () => {
  const tsCode = memberRpsBoardTsCode.value
  if (!tsCode) return

  const requestId = ++memberRpsRequestId
  memberRpsLoading.value = true
  try {
    const tradeDate = memberRpsSelectedDate.value
      ? formatDateForStockApi(memberRpsSelectedDate.value)
      : undefined
    const response = await getDcBoardMemberRps(tsCode, '5,20,60,120,250', tradeDate)

    if (requestId !== memberRpsRequestId) return

    memberRpsData.value = response.data || []
    memberRpsPeriods.value = response.periods || []
    memberRpsBoardTsCode.value = response.board_ts_code || tsCode
    memberRpsBoardName.value = response.board_name || memberRpsBoardName.value
    memberRpsTradeDate.value = response.trade_date || ''
    memberRpsQueryTime.value = response.query_time || ''
    // 将实际返回的交易日回填到日期选择器，默认展示最近一个交易日
    if (response.trade_date) {
      memberRpsSelectedDate.value = response.trade_date
    }
    ElMessage.success('成分股RPS数据加载成功')
  } catch (error) {
    if (requestId !== memberRpsRequestId) return
    console.error('加载成分股RPS数据失败:', error)
    memberRpsData.value = []
    ElMessage.error('加载成分股RPS数据失败，请稍后重试')
  } finally {
    if (requestId === memberRpsRequestId) {
      memberRpsLoading.value = false
    }
  }
}

/**
 * 事件：切换成分股RPS交易日
 * 功能：用户在弹窗中选择交易日后，按新交易日重新拉取成分股RPS数据
 * 参数：无
 * 返回值：无
 */
const handleMemberRpsDateChange = () => {
  loadMemberRpsData()
}

const openBoardMemberRpsDialog = async (row: IndexRpsItem) => {
  memberRpsDialogVisible.value = true
  memberRpsBoardTsCode.value = row.ts_code
  memberRpsBoardName.value = row.name
  memberRpsTradeDate.value = ''
  memberRpsQueryTime.value = ''
  memberRpsSearchKeyword.value = ''
  // 重置为空，让后端返回最近一个交易日，随后回填到日期选择器
  memberRpsSelectedDate.value = ''
  memberRpsData.value = []
  memberRpsPeriods.value = []
  // 保存当前行业板块的RPS数据，用于在成分股表格中对比显示
  memberRpsBoardRpsData.value = row

  await loadMemberRpsData()
}

const handleMemberRpsSortChange = (sort: { prop: string, order: string }) => {
  if (sort.prop && sort.order) {
    memberRpsData.value.sort((a, b) => {
      const propA = getNumericValue((a as Record<string, unknown>)[sort.prop])
      const propB = getNumericValue((b as Record<string, unknown>)[sort.prop])

      if (sort.order === 'ascending') {
        return propA - propB
      }
      return propB - propA
    })
  }
}

const memberRpsTableRowClassName = ({ row }: { row: DcBoardMemberRpsItem }) => {
  // 行业行特殊样式
  if (row.name.startsWith('【行业】')) {
    return 'row-board-highlight'
  }
  return ''
}

const applyMemberStockTrendShortcut = (range: MemberTrendShortcut) => {
  const yearMap: Record<MemberTrendShortcut, number> = { '1y': 1, '3y': 3, '5y': 5, '10y': 10, '20y': 20 }
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - yearMap[range])
  memberStockTrendDateRange.start = formatDateToYYYYMMDDWithDash(startDate)
  memberStockTrendDateRange.end = formatDateToYYYYMMDDWithDash(endDate)
}

const loadMemberStockTrendData = async () => {
  const requestId = ++memberStockTrendRequestId

  if (!memberStockTrendStock.code || !memberStockTrendDateRange.start || !memberStockTrendDateRange.end) {
    memberStockTrendData.value = []
    return
  }

  memberStockTrendLoading.value = true
  try {
    const data = await fetchStockHistoryData(
      memberStockTrendStock.code,
      formatDateForStockApi(memberStockTrendDateRange.start),
      formatDateForStockApi(memberStockTrendDateRange.end),
      'qfq'
    )
    if (requestId !== memberStockTrendRequestId) return
    memberStockTrendData.value = [...data].sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    if (requestId !== memberStockTrendRequestId) return
    console.error('加载成分股K线趋势失败:', error)
    memberStockTrendData.value = []
    ElMessage.error('加载成分股K线趋势失败，请稍后重试')
  } finally {
    if (requestId === memberStockTrendRequestId) {
      memberStockTrendLoading.value = false
    }
  }
}

const handleMemberStockTrendShortcutChange = (range: MemberTrendShortcut) => {
  applyMemberStockTrendShortcut(range)
  loadMemberStockTrendData()
}

const openMemberStockTrendDialog = (row: DcBoardMemberRpsItem) => {
  memberStockTrendStock.code = row.ts_code
  memberStockTrendStock.name = row.name
  memberStockTrendShortcut.value = '1y'
  memberStockTrendData.value = []
  applyMemberStockTrendShortcut('1y')
  memberStockTrendDialogVisible.value = true
  loadMemberStockTrendData()
}

const refreshData = async () => {
  if (loading.value) return

  loading.value = true
  try {
    const periodsStr = rpsPeriods.join(',')
    // 计算成交额查询的日期范围：取最近约15天，用于获取最近一个交易日的成交额
    const endDateObj = new Date()
    const startDateObj = new Date()
    startDateObj.setDate(endDateObj.getDate() - 15)
    const level = idxType.value === '行业板块' ? industryLevel.value : undefined

    // 并行获取RPS数据与成交额数据
    const [response, turnoverResult] = await Promise.all([
      getIndexRps(periodsStr, false, idxType.value, level),
      fetchIndustryTurnoverPercentile({
        startDate: formatDateToYYYYMMDDWithDash(startDateObj),
        endDate: formatDateToYYYYMMDDWithDash(endDateObj),
        idxType: idxType.value,
        level
      }).catch((err) => {
        console.error('获取成交额数据失败:', err)
        return null
      })
    ])

    rpsData.value = response.data
    queryTime.value = response.query_time
    turnoverData.value = turnoverResult?.data ?? []
    ElMessage.success('RPS数据加载成功')
  } catch (error) {
    console.error('加载RPS数据失败:', error)
    ElMessage.error('加载RPS数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshData()
})

watch(idxType, () => {
  refreshData()
})

watch(industryLevel, () => {
  if (idxType.value === '行业板块') {
    refreshData()
  }
})

watch(() => route.query.level, (level) => {
  const nextLevel = normalizeIndustryLevel(level)
  if (nextLevel !== industryLevel.value) {
    industryLevel.value = nextLevel
  }
})
</script>

<style scoped>
.index-rps-heatmap-view {
  padding: 0;
}

.table-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: stretch;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.table-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.control-item {
  width: 160px;
}

.control-search {
  width: 220px;
}

.table-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.simple-filter-panel {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 4px;
}

.simple-filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.simple-filter-label {
  color: #606266;
  font-size: 13px;
  white-space: nowrap;
}

.simple-filter-select {
  width: 180px;
}

.strength-filter-select {
  width: 260px;
}

.relation-filter-select {
  width: 180px;
}

.amount-range-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.amount-range-select {
  width: 110px;
}

.amount-range-separator {
  color: #909399;
}

.simple-filter-reset {
  padding: 0;
}

.action-select-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-select-tip {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.action-select-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-select-buttons .el-button {
  flex: 1;
  min-width: 110px;
  margin: 0;
}

.member-rps-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.usage-tips {
  margin-bottom: 8px;
}

.tips-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.tip-item {
  color: #606266;
}

.tip-item strong {
  color: #409eff;
  margin-right: 4px;
}

.period-statistics-container {
  background: #f9fafb;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 8px;
}

.statistics-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}

.statistics-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.statistics-subtitle {
  font-size: 12px;
  color: #909399;
}

.period-statistics-table {
  background: white;
}

.period-statistics-table .stat-value {
  font-weight: 600;
  color: #606266;
}

.period-statistics-table .return-value {
  font-weight: 600;
  font-size: 13px;
}

.period-statistics-table .return-value.up {
  color: #f56c6c;
}

.period-statistics-table .return-value.down {
  color: #67c23a;
}

.rank-indicator {
  display: flex;
  justify-content: center;
}

.rank-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.rank-above {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

.rank-below {
  background-color: #f0f9ff;
  color: #409eff;
  border: 1px solid #b3d8ff;
}

.rank-equal {
  background-color: #f4f4f5;
  color: #909399;
  border: 1px solid #d3d4d6;
}

.trend-dialog-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trend-dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.trend-dialog-subtitle {
  font-size: 13px;
  color: #909399;
}

.trend-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trend-shortcuts {
  display: flex;
  justify-content: flex-end;
}

.trend-preview-card {
  min-height: 220px;
}

.member-rps-toolbar {
  margin-bottom: 0;
}

.member-rps-filter-toolbar {
  margin-bottom: 0;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
}

.member-rps-date {
  width: 220px;
}

.rps-data-section {
  margin-bottom: 20px;
}

.rps-card {
  border-radius: 0;
}

:deep(.rps-card.el-card) {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

:deep(.rps-card .el-card__header) {
  padding: 18px 0 16px;
}

:deep(.rps-card .el-card__body) {
  padding: 0 0 20px;
}

.methodology {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #f7f8fa;
  color: #606266;
  font-size: 13px;
  line-height: 1.7;
}

.methodology p {
  margin: 0;
}

.methodology p + p {
  margin-top: 6px;
}

:deep(.el-table) {
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
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

.rps-cell {
  display: flex;
  flex-direction: column;
}

.rps-cell-with-change {
  gap: 4px;
}

.rps-change-text {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
}

.rps-change-text.up {
  color: #f56c6c;
}

.rps-change-text.down {
  color: #67c23a;
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

:deep(.row-board-highlight) {
  background-color: #fff7e6 !important;
  font-weight: 600;
}

:deep(.row-board-highlight:hover) {
  background-color: #ffe7ba !important;
}

@media (max-width: 768px) {
  .index-rps-heatmap-view {
    padding: 0;
  }

  .control-item,
  .control-search,
  .simple-filter-select,
  .strength-filter-select,
  .relation-filter-select {
    width: 100%;
  }

  .simple-filter-group {
    width: 100%;
  }

  .amount-range-inputs {
    width: 100%;
  }

  .amount-range-select {
    flex: 1;
    min-width: 0;
    width: auto;
  }

  .table-summary {
    width: 100%;
  }

  :deep(.rps-card .el-card__header) {
    padding: 16px 12px;
  }

  :deep(.rps-card .el-card__body) {
    padding: 0 0 12px;
  }
}
</style>
