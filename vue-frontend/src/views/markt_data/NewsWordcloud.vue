<template>
  <div class="news-heatmap-view">
    <el-card shadow="hover" class="page-header">
      <div class="header-content">
        <h2>新闻利好行业热力图</h2>
        <p>统计最近若干天 CCTV 新闻的 AI 行业分析，纵轴为行业，横轴为日期；有利好标红，点击显示利好原因。</p>
      </div>
    </el-card>

    <el-card shadow="hover" class="query-panel">
      <template #header>
        <div class="panel-header">
          <span>查询条件</span>
        </div>
      </template>
      <div class="query-form">
        <el-form :inline="true" label-width="80px">
          <el-form-item label="最近天数">
            <el-radio-group v-model="days">
              <el-radio-button :label="10">10天</el-radio-button>
              <el-radio-button :label="20">20天</el-radio-button>
              <el-radio-button :label="40">40天</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="loadData">查询</el-button>
            <el-button @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <el-card shadow="hover" class="result-panel" v-loading="loading">
      <template #header>
        <div class="panel-header">
          <span>行业×日期热力图</span>
          <div class="stats">
            <span>日期范围：{{ dateList[0] }} 至 {{ dateList[dateList.length-1] }}</span>
            <span class="divider">|</span>
            <span>行业数：{{ industryList.length }}</span>
          </div>
        </div>
      </template>

      <div class="content-split" v-if="dateList.length > 0">
        <div class="industry-list-pane">
          <div class="pane-title">行业列表</div>
          <el-scrollbar class="industry-scroll">
            <div
              v-for="(ind, yi) in sortedIndustryList.slice().reverse()"
              :key="ind"
              class="industry-item"
              @click="openIndustryDialog(ind)"
              :title="`点击查看 ${ind} 近${days}天的利好消息`"
            >
              <span class="name">{{ ind }}</span>
              <el-tag size="small" :type="industryPositiveCount(ind) > 0 ? 'success' : 'info'">
                {{ industryPositiveCount(ind) }} 天有利好
              </el-tag>
            </div>
          </el-scrollbar>
        </div>

        <div class="heatmap-pane">
          <div class="heatmap-scroll">
            <HeatmapChart
              :option="chartOption"
              @chartClick="handleChartClick"
            />
          </div>
        </div>
      </div>

      <el-empty v-else description="暂无数据，尝试调整查询条件" :image-size="200" />
    </el-card>

    <!-- 查看利好原因对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <div v-if="selectedCell">
        <div class="reason-list">
          <div class="reason-item" v-for="(r, i) in selectedCell.reasons" :key="i">
            <span class="reason-index">{{ i + 1 }}.</span>
            <span class="reason-text">{{ r }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 行业维度利好消息对话框 -->
    <el-dialog v-model="industryDialogVisible" :title="industryDialogTitle" width="700px">
      <div class="industry-reasons" v-if="industryDialogItems.length > 0">
        <div class="industry-date-block" v-for="(it, i) in industryDialogItems" :key="i">
          <div class="date">{{ it.date }}</div>
          <div class="reason-list">
            <div class="reason-item" v-for="(r, j) in it.reasons" :key="j">
              <span class="reason-index">{{ j + 1 }}.</span>
              <span class="reason-text">{{ r }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="industryDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getNewsList, type NewsItem } from '@/services/newsApi'
import HeatmapChart from '@/components/HeatmapChart.vue'
import type { EChartsOption } from 'echarts'

// 行业列表（固定）
const industryList = [
  '航空机场','铁路公路','物流行业','水泥建材','工程建设','公用事业','电力行业','交运设备','农牧饲渔','纺织服装','煤炭行业','食品饮料','家用轻工','互联网服务','通信设备','航运港口','房地产开发','塑料制品','家电行业','电网设备','仪器仪表','电子元件','石油行业','化学制药','造纸印刷','化纤行业','证券','保险','银行','装修建材','酿酒行业','有色金属','钢铁行业','航天航空','汽车零部件','商业百货','贸易行业','旅游酒店','文化传媒','化学制品','综合行业','通用设备','玻璃玻纤','装修装饰','工程咨询服务','医疗服务','环保行业','船舶制造','农药兽药','化肥行业','贵金属','包装材料','珠宝首饰','计算机设备','通信服务','软件开发','多元金融','工程机械','教育','专用设备','能源金属','汽车服务','采掘行业','橡胶制品','化学原料','非金属材料','小金属','燃气','汽车整车','电机','光伏设备','风电设备','电池','电源设备','美容护理','半导体','消费电子','光学光电子','电子化学品','中药','医疗器械','医药商业','专业服务','生物制品','房地产服务','游戏'
] as const

type Industry = typeof industryList[number]

// 选择的最近天数
const days = ref<number>(20)
const loading = ref(false)

// 日期序列
const dateList = computed<string[]>(() => {
  const end = new Date()
  const list: string[] = []
  for (let i = days.value - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 24 * 60 * 60 * 1000)
    list.push(formatDate(d))
  }
  return list
})

// 热力图数据：date -> industry -> reasons[]
const heatMap = ref<Record<string, Record<string, string[]>>>({})

// 选中单元格展示
const dialogVisible = ref(false)
const selectedCell = ref<{ date: string; industry: string; reasons: string[] } | null>(null)
const dialogTitle = computed(() => selectedCell.value ? `${selectedCell.value.date} · ${selectedCell.value.industry}` : '利好原因')

// 行业维度对话框
const industryDialogVisible = ref(false)
const industryDialogTitle = ref('行业利好消息')
const industryDialogItems = ref<Array<{ date: string; reasons: string[] }>>([])

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function resetQuery() {
  days.value = 20
  loadData()
}

function parseAiContent(ai: string | null | undefined): Record<string, string[]> {
  if (!ai) return {}
  try {
    const obj = JSON.parse(ai) as Record<string, unknown>
    const result: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (!industryList.includes(k as Industry)) continue
      if (Array.isArray(v)) {
        result[k] = (v as unknown[]).map(x => String(x)).filter(Boolean)
      } else if (typeof v === 'string') {
        result[k] = [v]
      } else if (v != null) {
        result[k] = [String(v)]
      }
    }
    return result
  } catch (e) {
    console.warn('AI内容解析失败:', e)
    return {}
  }
}

function buildGrid(news: NewsItem[]) {
  const grid: Record<string, Record<string, string[]>> = {}
  for (const d of dateList.value) {
    grid[d] = {}
    for (const ind of industryList) grid[d][ind] = []
  }
  for (const item of news) {
    const d = item.publish_date?.slice(0, 10)
    if (!d || !(d in grid)) continue
    const parsed = parseAiContent(item.ai_content)
    for (const [ind, reasons] of Object.entries(parsed)) {
      if (!(ind in grid[d])) continue
      grid[d][ind].push(...reasons)
    }
  }
  heatMap.value = grid
}

async function loadData() {
  loading.value = true
  try {
    // 为覆盖每天多条新闻，按天数放大查询上限并设最大值
    const limit = Math.min(days.value * 20, 600)
    const resp = await getNewsList(limit, 0)
    const news = resp.news || []
    // 仅保留目标日期范围内的数据
    const set = new Set(dateList.value)
    const filtered = news.filter(n => set.has(n.publish_date?.slice(0, 10)))
    buildGrid(filtered)
  } catch (e) {
    console.error('加载新闻列表失败:', e)
    ElMessage.error('加载新闻列表失败')
  } finally {
    loading.value = false
  }
}

function hasPositive(industry: string, date: string): boolean {
  const reasons = heatMap.value[date]?.[industry] || []
  return reasons.length > 0
}

function industryPositiveCount(industry: string): number {
  let cnt = 0
  for (const d of dateList.value) {
    const reasons = heatMap.value[d]?.[industry] || []
    if (reasons.length > 0) cnt++
  }
  return cnt
}

// 行业列表按利好天数降序排序（用于侧边行业列表展示，并列按名称）
const sortedIndustryList = computed<string[]>(() => {
  const list = [...industryList]
  list.sort((a, b) => {
    const diff = industryPositiveCount(a) - industryPositiveCount(b)
    if (diff !== 0) return diff
    // 并列时按行业名称排序，使用中文本地化比较，保证稳定性
    return a.localeCompare(b, 'zh-CN')
  })
  return list
})

function openIndustryDialog(industry: string) {
  const items: Array<{ date: string; reasons: string[] }> = []
  for (const d of dateList.value) {
    const reasons = heatMap.value[d]?.[industry] || []
    if (reasons.length > 0) items.push({ date: d, reasons })
  }
  if (items.length === 0) {
    ElMessage.info(`${industry} 近${days.value}天暂无利好消息`)
    return
  }
  industryDialogItems.value = items
  industryDialogTitle.value = `${industry} · 近${days.value}天利好消息`
  industryDialogVisible.value = true
}

function cellTitle(industry: string, date: string): string {
  const reasons = heatMap.value[date]?.[industry] || []
  return reasons.length > 0 ? `${industry} · ${date}：${reasons.length}条利好` : `${industry} · ${date}：无利好`
}

function openCell(industry: string, date: string) {
  const reasons = heatMap.value[date]?.[industry] || []
  if (reasons.length === 0) return
  selectedCell.value = { date, industry, reasons }
  dialogVisible.value = true
}

// 热力图数据点：[xIndex, yIndex, value]
const heatmapPoints = computed(() => {
  const pts: Array<[number, number, number]> = []
  const inds = sortedIndustryList.value
  for (let yi = 0; yi < inds.length; yi++) {
    const ind = inds[yi]
    for (let xi = 0; xi < dateList.value.length; xi++) {
      const d = dateList.value[xi]
      const reasons = heatMap.value[d]?.[ind] || []
      pts.push([xi, yi, reasons.length > 0 ? 1 : 0])
    }
  }
  return pts
})

// 构建 ECharts 配置
const chartOption = computed<EChartsOption>(() => ({
  grid: { left: 160, right: 20, top: 40, bottom: 40 },
  tooltip: {
    formatter: (p: any) => {
      const v = p?.value as number[]
      if (!Array.isArray(v)) return ''
      const xi = Number(v[0])
      const yi = Number(v[1])
      const date = dateList.value[xi]
      const industry = sortedIndustryList.value[yi]
      const reasons = heatMap.value[date]?.[industry] || []
      return reasons.length > 0
        ? `${industry} · ${date}：利好${reasons.length}条`
        : `${industry} · ${date}：无利好`
    }
  },
  xAxis: {
    type: 'category',
    position: 'top',
    data: dateList.value,
    axisLabel: { color: '#606266' },
    axisLine: { lineStyle: { color: '#ebeef5' } }
  },
  yAxis: {
    type: 'category',
    data: sortedIndustryList.value as unknown as string[],
    axisLabel: { color: '#606266' },
    axisLine: { lineStyle: { color: '#ebeef5' } }
  },
  visualMap: {
    show: false,
    type: 'piecewise',
    pieces: [
      { value: 0, color: 'rgba(0,0,0,0)' },
      { value: 1, color: 'rgba(245,108,108,0.18)' }
    ]
  },
  series: [
    {
      type: 'heatmap',
      data: heatmapPoints.value,
      label: {
        show: true,
        color: '#f56c6c',
        fontWeight: 600,
        formatter: (p: any) => (p.value?.[2] > 0 ? '利好' : '')
      },
      itemStyle: { borderColor: '#f0f2f5', borderWidth: 1 },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)' } }
    }
  ]
}))

// 点击热力图单元格，打开原因弹窗
function handleChartClick(params: any) {
  const v = params?.value as number[]
  if (!Array.isArray(v)) return
  const xi = Number(v[0])
  const yi = Number(v[1])
  const date = dateList.value[xi]
  const industry = sortedIndustryList.value[yi]
  openCell(industry, date)
}

onMounted(() => {
  loadData()
})

// 切换天数时自动刷新数据
watch(days, () => {
  loadData()
})
</script>

<style scoped lang="scss">
.news-heatmap-view {
  padding: 8px;
}

.page-header .header-content h2 {
  margin: 0 0 6px 0;
}
.page-header .header-content p {
  margin: 0;
  color: #606266;
}

.query-panel {
  margin-top: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header .stats {
  display: flex;
  gap: 10px;
  color: #606266;
}

.panel-header .divider {
  color: #d0d0d0;
}

.query-form {
  padding: 4px 2px;
}

.result-panel {
  margin-top: 12px;
}

.heatmap-scroll {
  overflow: auto;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.content-split {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 12px;
}

.industry-list-pane {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.pane-title {
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  color: #606266;
}
.industry-scroll {
  height: 560px;
}
.industry-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
}
.industry-item:hover {
  background: #f5f7fa;
}
.industry-item .name {
  color: #303133;
}

.heatmap-pane {
  min-width: 640px;
}

.industry-reasons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.industry-date-block .date {
  font-weight: 600;
  color: #606266;
  margin-bottom: 6px;
}

.reason-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.reason-item {
  display: flex;
  gap: 6px;
}
.reason-index {
  color: #909399;
}
.reason-text {
  color: #303133;
}
</style>