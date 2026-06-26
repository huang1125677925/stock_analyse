<template>
  <div class="index-rps-view" v-loading="loading" element-loading-text="正在加载指数RPS数据...">
    <!-- 已移除周期选择 -->

    <!-- RPS数据表格 -->
    <div class="rps-data-section" v-if="rpsData.length > 0">
      <el-card shadow="hover" class="rps-card">
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
              </div>
              <div class="table-summary">
                <el-tag type="info" effect="plain">共 {{ filteredRpsData.length }} 条</el-tag>
                <el-tag v-if="queryTime" type="success" effect="light">更新时间 {{ queryTime }}</el-tag>
              </div>
            </div>
            <div class="rps-filter-panel">
              <div
                v-for="filterGroup in rpsFilterGroups"
                :key="filterGroup.field"
                class="rps-filter-group"
              >
                <span class="rps-filter-label">{{ filterGroup.label }}</span>
                <div class="rps-filter-tags">
                  <el-check-tag
                    v-for="tag in rpsRankOptions"
                    :key="`${filterGroup.field}-${tag}`"
                    :checked="selectedRpsRanks[filterGroup.field].includes(tag)"
                    @change="toggleRpsRank(filterGroup.field, tag)"
                  >
                    {{ tag }}
                  </el-check-tag>
                </div>
              </div>
              <el-button
                v-if="hasActiveRpsFilter"
                link
                type="primary"
                class="rps-filter-reset"
                @click="resetRpsFilters"
              >
                清空强度筛选
              </el-button>
            </div>
          </div>
        </template>

        <div class="methodology">
          <p>
            RPS（Relative Price Strength）用于衡量当前指数相对同组指数的价格强度。系统会计算各指数在 5、20、60、120、250 日周期内的涨跌幅，再按涨跌幅从高到低排序。
          </p>
          <p>
            计算方式：RPS = (1 - 排名 / 总板块数) × 100。数值越高，表示该指数在同组指数中的相对强度越靠前。
          </p>
        </div>
        
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
          <el-table-column prop="ts_code" label="ts_code" min-width="100" sortable="custom" fixed="left" align="center">
            <template #default="scope">
              <el-tag size="small" effect="plain">{{ scope.row.ts_code }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="name" min-width="120" sortable="custom" fixed="left">
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

          <el-table-column
            prop="pct_change"
            label="当日涨跌幅"
            min-width="110"
            sortable="custom"
            align="center"
          >
            <template #header>
              <div class="custom-header">
                <span>当日涨跌幅</span>
                <el-tooltip content="截止交易日当天涨跌幅" placement="top">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <template #default="scope">
              <div class="change-percent-cell">
                <span :class="{ up: getNumericValue(scope.row.pct_change) > 0, down: getNumericValue(scope.row.pct_change) < 0 }">
                  {{ formatPercent(scope.row.pct_change) }}
                </span>
                <div class="trend-indicator">
                  <el-icon v-if="getNumericValue(scope.row.pct_change) > 0"><CaretTop /></el-icon>
                  <el-icon v-else-if="getNumericValue(scope.row.pct_change) < 0"><CaretBottom /></el-icon>
                  <el-icon v-else><Minus /></el-icon>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            prop="RPS_today"
            label="RPS_today"
            min-width="120"
            sortable="custom"
            align="center"
          >
            <template #header>
              <div class="custom-header">
                <span>RPS_today</span>
                <el-tooltip content="基于当天涨跌幅计算的 RPS 强度" placement="top">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <template #default="scope">
              <div class="rps-cell">
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
          
          <template v-for="period in rpsPeriods" :key="period">
            <el-table-column
              :label="`${period}日涨跌幅`"
              min-width="110"
              sortable="custom"
              :prop="getReturnProp(period)"
              align="center"
            >
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
                  <span :class="{ up: Number(scope.row[getReturnProp(period)]) > 0, down: Number(scope.row[getReturnProp(period)]) < 0 }">
                    {{ formatPercent(scope.row[getReturnProp(period)]) }}
                  </span>
                  <div class="trend-indicator">
                    <el-icon v-if="Number(scope.row[getReturnProp(period)]) > 0"><CaretTop /></el-icon>
                    <el-icon v-else-if="Number(scope.row[getReturnProp(period)]) < 0"><CaretBottom /></el-icon>
                    <el-icon v-else><Minus /></el-icon>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              :label="`RPS_${period}`"
              min-width="120"
              sortable="custom"
              :prop="getRpsProp(period)"
              align="center"
            >
              <template #header>
                <div class="custom-header">
                  <span>{{ `RPS_${period}` }}</span>
                  <el-tooltip content="相对强度指标，值越高表示相对强度越强" placement="top">
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
              </template>
              <template #default="scope">
                <div class="rps-cell">
                  <el-progress
                    :percentage="Number(scope.row[getRpsProp(period)])"
                    :color="getRpsColor(Number(scope.row[getRpsProp(period)]))"
                    :format="(val: number) => val.toFixed(1)"
                    :stroke-width="18"
                    :text-inside="true"
                    :show-text="true"
                  />
                  <div class="rps-rank" :class="getRpsRankClass(Number(scope.row[getRpsProp(period)]))">
                    {{ getRpsRankText(Number(scope.row[getRpsProp(period)])) }}
                  </div>
                </div>
              </template>
            </el-table-column>
          </template>
          
          <!-- 操作列：领涨数据详情 -->
          <el-table-column label="操作" min-width="110" align="center">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                @click="openLeadRiseDetail(scope.row)"
              >
                领涨数据详情
              </el-button>
            </template>
          </el-table-column>
          
          </el-table>
        <!-- 领涨数据详情对话框组件实例 -->
        <LeadRiseDetailDialog
          v-model="detailDialogVisible"
          :ts-code="currentTsCode"
          :idx-type="idxType"
          :name="currentIndexName"
        />
      </el-card>
    </div>

    <!-- 无数据提示 -->
    <el-empty v-if="!loading && rpsData.length === 0" description="暂无RPS数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, defineComponent, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElDialog, ElTable, ElTableColumn, ElButton } from 'element-plus'
import { InfoFilled, CaretTop, CaretBottom, Minus, Search } from '@element-plus/icons-vue'
import { getIndexRps } from '@/services/strategyApi'
import type { DcIndustryLevel, IndexRpsIdxType, IndexRpsItem } from '@/services/strategyApi'
import { fetchDcIndexLastNDays, type DcIndexRecord } from '@/services/dcIndexApi'

const industryLevelOptions: DcIndustryLevel[] = ['东财一级行业', '东财二级行业', '东财三级行业']

interface Props {
  level?: DcIndustryLevel
}

type RpsPeriod = 5 | 20 | 60 | 120 | 250
type RpsField = `RPS_${RpsPeriod}`
type ReturnField = `return_${RpsPeriod}`
type RpsRankLabel = '极强' | '强势' | '良好' | '一般' | '弱势'

const props = defineProps<Props>()

const rpsPeriods: readonly RpsPeriod[] = [5, 20, 60, 120, 250]
const rpsRankOptions: RpsRankLabel[] = ['极强', '强势', '良好', '一般', '弱势']
const rpsFilterGroups: Array<{ field: RpsField; label: string }> = rpsPeriods.map((period) => ({
  field: `RPS_${period}` as RpsField,
  label: `RPS_${period}强度`
}))

function normalizeIndustryLevel(value: unknown): DcIndustryLevel {
  return industryLevelOptions.includes(value as DcIndustryLevel)
    ? value as DcIndustryLevel
    : '东财一级行业'
}

/**
 * 组件：指数RPS强度排名视图（IndexRpsView）
 * 功能：展示不同板块类型下的指数RPS强度排名，支持搜索、排序、强度筛选与详情跳转
 * 参数：
 *  - 无外部props；内部状态包括：
 *    - idxType: 板块类型（'概念板块' | '行业板块' | '地域板块'），默认 '行业板块'
 *    - searchKeyword: 搜索关键词
 *    - rpsPeriods: 展示周期（5/20/60/120/250）
 * 返回值：无（组件渲染UI）；内部从接口获取 IndexRpsData:
 *  - data: IndexRpsItem[] 指数数据
 *  - query_time: 查询时间
 * 事件：
 *  - 点击指数简称触发路由跳转到股票列表并携带概念名
 *  - 表格排序、筛选变化触发列表重排
 *  - 修改板块类型触发数据刷新
 */

// 数据加载状态
const loading = ref(false)

// 路由
const router = useRouter()
const route = useRoute()

// RPS数据
const rpsData = ref<IndexRpsItem[]>([])
const queryTime = ref('')

// 搜索关键词
const searchKeyword = ref('')

// RPS标签筛选
const selectedRpsRanks = reactive<Record<RpsField, RpsRankLabel[]>>(
  rpsPeriods.reduce((accumulator, period) => {
    accumulator[`RPS_${period}` as RpsField] = []
    return accumulator
  }, {} as Record<RpsField, RpsRankLabel[]>)
)

// 板块类型（默认：行业板块）
const idxType = ref<IndexRpsIdxType>('行业板块')

// 行业板块级别，支持通过组件 prop 或 URL query: level 传入初始值
const industryLevel = ref<DcIndustryLevel>(normalizeIndustryLevel(props.level || route.query.level))

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

/**
 * 数值格式化工具
 * 功能：将可能为空的接口字段转换为可用于排序和进度条的数值
 * 参数：value(unknown) 原始值
 * 返回值：number 有效数值；无效时返回 0
 * 事件：无
 */
const getNumericValue = (value: unknown): number => {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(num) ? num : 0
}

/**
 * RPS 文本格式化工具
 * 功能：将 RPS 数值格式化为进度条文本，兼容空值显示
 * 参数：value(unknown) 原始 RPS 值
 * 返回值：string 格式化后的 RPS 文本；无效时返回 '-'
 * 事件：无
 */
const formatRpsValue = (value: unknown): string => {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (!Number.isFinite(num)) return '-'
  return num.toFixed(1)
}

/**
 * 工具：判断指定 RPS 字段是否启用了标签筛选
 * 功能：用于识别当前字段是否存在选中的强度标签
 * 参数：field(RpsField) RPS字段名
 * 返回值：boolean 是否存在选中的标签
 * 事件：无
 */
const hasSelectedRanks = (field: RpsField): boolean => selectedRpsRanks[field].length > 0

/**
 * 工具：切换 RPS 强度标签
 * 功能：在指定字段上执行强度标签的选中与取消，用于多选筛选
 * 参数：
 *  - field(RpsField): RPS字段名
 *  - rank(RpsRankLabel): 强度标签文本
 * 返回值：无
 * 事件：更新 selectedRpsRanks，触发表格过滤结果重算
 */
const toggleRpsRank = (field: RpsField, rank: RpsRankLabel) => {
  const ranks = selectedRpsRanks[field]
  const index = ranks.indexOf(rank)
  if (index >= 0) {
    ranks.splice(index, 1)
    return
  }
  ranks.push(rank)
}

/**
 * 工具：清空所有 RPS 强度标签筛选
 * 功能：恢复全部 RPS 周期（5/20/60/120/250）的强度筛选状态
 * 参数：无
 * 返回值：无
 * 事件：重置 selectedRpsRanks，触发表格过滤结果重算
 */
const resetRpsFilters = () => {
  rpsFilterGroups.forEach(({ field }) => {
    selectedRpsRanks[field] = []
  })
}

/**
 * 工具：判断单条记录是否满足 RPS 标签筛选
 * 功能：按全部 RPS 周期的已选标签过滤当前记录；同一字段内为“或”，不同字段间为“且”
 * 参数：item(IndexRpsItem) 当前指数RPS记录
 * 返回值：boolean 是否满足全部标签筛选条件
 * 事件：无
 */
const matchesRpsFilters = (item: IndexRpsItem): boolean => {
  return rpsFilterGroups.every(({ field }) => {
    if (!hasSelectedRanks(field)) {
      return true
    }
    return selectedRpsRanks[field].includes(getRpsRankText(Number(item[field])) as RpsRankLabel)
  })
}

const hasActiveRpsFilter = computed(() => {
  return rpsFilterGroups.some(({ field }) => hasSelectedRanks(field))
})

// 过滤后的RPS数据
const filteredRpsData = computed(() => {
  let result = rpsData.value
  if (searchKeyword.value) {
    result = result.filter(item => {
      return item.name.includes(searchKeyword.value)
    })
  }
  result = result.filter(matchesRpsFilters)
  return result
})

// 获取默认排序属性
const getDefaultSortProp = () => {
  return 'RPS_5' // 默认按RPS_5排序
}

// 获取涨跌幅字段名
const getReturnProp = (period: RpsPeriod): ReturnField => `return_${period}`

// 获取RPS字段名
const getRpsProp = (period: RpsPeriod): RpsField => `RPS_${period}`

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

/**
 * 组件：领涨数据详情对话框（LeadRiseDetailDialog）
 * 功能：在对话框中展示指定概念板块（ts_code/name）近30天的 dc_index 领涨数据
 * 参数：
 *  - modelValue(Boolean): 对话框显示状态（v-model）
 *  - tsCode(String): 概念代码（格式：xxxxx.DC，优先使用）
 *  - idxType(String): 板块类型（用于标题展示）
 *  - name(String): 概念名称，用于对话框标题与查询备用
 * 返回值：无（组件内部渲染UI）
 * 事件：
 *  - update:modelValue(Boolean): 关闭或打开对话框时触发，用于双向绑定
 */
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

    // 渲染函数：构建 ElDialog + ElTable 展示数据
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

// 详情对话框状态
const detailDialogVisible = ref(false)
const currentTsCode = ref('')
const currentIndexName = ref('')

// 打开对话框
const openLeadRiseDetail = (row: IndexRpsItem) => {
  currentTsCode.value = row.ts_code
  currentIndexName.value = row.name
  detailDialogVisible.value = true
}

// 刷新数据
const refreshData = async () => {
  if (loading.value) return
  
  loading.value = true
  try {
    const periodsStr = rpsPeriods.join(',') // 固定周期参数
    const response = await getIndexRps(
      periodsStr,
      false,
      idxType.value,
      idxType.value === '行业板块' ? industryLevel.value : undefined
    )
    
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

// 监听板块类型变化，刷新数据
watch(idxType, () => {
  refreshData()
})

// 监听行业级别变化，刷新行业板块数据
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
.index-rps-view {
  padding: 20px;
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

.rps-filter-panel {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 4px;
}

.rps-filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rps-filter-label {
  color: #606266;
  font-size: 13px;
  white-space: nowrap;
}

.rps-filter-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rps-filter-reset {
  padding: 0;
}

.rps-data-section {
  margin-bottom: 20px;
}

.rps-card {
  border-radius: 14px;
}

:deep(.rps-card .el-card__header) {
  padding: 18px 20px 16px;
}

:deep(.rps-card .el-card__body) {
  padding: 0 20px 20px;
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
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
}

.ai-analysis-card {
  margin-top: 20px;
}

.ai-content-wrapper {
  min-height: 100px;
}

/* Markdown Styles */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: bold;
  color: #303133;
}

.markdown-body :deep(p) {
  margin-bottom: 1em;
  line-height: 1.6;
  color: #606266;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 2em;
  margin-bottom: 1em;
}

.markdown-body :deep(li) {
  margin-bottom: 0.5em;
  line-height: 1.6;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid #409EFF;
  padding-left: 1em;
  background-color: #ecf5ff;
  color: #606266;
  margin-bottom: 1em;
  padding-top: 0.5em;
  padding-bottom: 0.5em;
}

.markdown-body :deep(code) {
  background-color: #f5f7fa;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
  color: #c0392b;
}

.markdown-body :deep(pre) {
  background-color: #f5f7fa;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
  margin-bottom: 1em;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background-color: transparent;
  color: #303133;
}

.markdown-body :deep(strong) {
  color: #303133;
  font-weight: 600;
}

@media (max-width: 768px) {
  .index-rps-view {
    padding: 12px;
  }

  .control-item,
  .control-search {
    width: 100%;
  }

  .table-summary {
    width: 100%;
  }

  :deep(.rps-card .el-card__header) {
    padding: 16px;
  }

  :deep(.rps-card .el-card__body) {
    padding: 0 16px 16px;
  }
}
</style>
