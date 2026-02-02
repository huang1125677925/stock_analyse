<template>
  <div class="etf-tree-view">
    <div class="main-container">
      <el-card class="left-panel">
        <template #header>
          <div class="card-header">
            <span>ETF分类树状图</span>
          </div>
        </template>
        <div class="tree-wrapper">
          <div class="tree-search">
            <el-input v-model="filterText" clearable size="small" placeholder="筛选节点（模糊匹配名称/代码/管理人）" />
          </div>
          <el-tree
            ref="treeRef"
            :props="defaultProps"
            :load="loadNode"
            lazy
            node-key="key"
            highlight-current
            :filter-node-method="filterNode"
            @node-click="handleNodeClick"
            @node-expand="handleNodeExpand"
          >
            <template #default="{ node, data }">
              <span class="custom-tree-node">
                <span class="node-label">{{ node.label }}</span>
                <span class="node-info">
                  <el-tag v-if="data.nodeType === 'TYPE'" size="small" type="primary" effect="plain">
                    {{ data.etf_type }}
                  </el-tag>
                  <el-tag v-else-if="data.nodeType === 'INDEX'" size="small" type="warning" effect="plain">
                    指数
                  </el-tag>
                  <el-tag v-else-if="data.nodeType === 'CAT'" size="small" type="info" effect="plain">
                    指数类别
                  </el-tag>
                  <el-tag v-else-if="data.nodeType === 'MGR'" size="small" type="info" effect="plain">
                    基金管理人
                  </el-tag>
                  <el-tag v-else-if="data.nodeType === 'ETF'" size="small" type="success" effect="plain">
                    ETF
                  </el-tag>
                </span>
              </span>
            </template>
          </el-tree>
        </div>
      </el-card>

      <el-card class="right-panel">
        <template #header>
          <div class="card-header">
            <span>详情信息</span>
          </div>
        </template>

        <div v-if="currentData" class="detail-content">
          <el-tabs v-model="activeTab" class="detail-tabs">
            <el-tab-pane label="基本信息" name="basic">
              <div class="tab-content">
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="类型">
                    <el-tag v-if="currentData.nodeType === 'TYPE'" type="primary">ETF类型</el-tag>
                    <el-tag v-else-if="currentData.nodeType === 'INDEX'" type="warning">基准指数</el-tag>
                    <el-tag v-else-if="currentData.nodeType === 'CAT'" type="info">指数类别</el-tag>
                    <el-tag v-else-if="currentData.nodeType === 'MGR'" type="info">基金管理人</el-tag>
                    <el-tag v-else-if="currentData.nodeType === 'ETF'" type="success">ETF</el-tag>
                    <el-tag v-else type="info">根</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="名称">
                    <span class="detail-title">{{ currentData.label }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="currentData.etf_type" label="ETF类型">
                    <el-tag>{{ currentData.etf_type }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="currentData.index_code" label="指数代码">
                    <el-tag type="warning">{{ currentData.index_code }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="currentData.index_name" label="指数名称">
                    {{ currentData.index_name }}
                  </el-descriptions-item>
                  <el-descriptions-item v-if="currentData.mgr_name" label="基金管理人">
                    {{ currentData.mgr_name }}
                  </el-descriptions-item>
                  <template v-if="currentData.nodeType === 'ETF' && currentData.item">
                    <el-descriptions-item label="交易代码">
                      <el-tag type="success">{{ currentData.item.ts_code }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="简称">
                      {{ currentData.item.csname || currentData.item.extname }}
                    </el-descriptions-item>
                    <el-descriptions-item label="交易所">
                      {{ currentData.item.exchange }}
                    </el-descriptions-item>
                    <el-descriptions-item label="管理人">
                      {{ currentData.item.mgr_name }}
                    </el-descriptions-item>
                    <el-descriptions-item label="上市状态">
                      {{ currentData.item.list_status }}
                    </el-descriptions-item>
                    <el-descriptions-item label="上市日期">
                      {{ currentData.item.list_date || '--' }}
                    </el-descriptions-item>
                  </template>
                </el-descriptions>

                <div class="children-section" v-if="currentChildren.length > 0">
                  <div class="section-header">
                    <span>下级列表 ({{ currentChildren.length }})</span>
                  </div>

                  <template v-if="currentData.nodeType === 'TYPE'">
                    <el-table 
                      :data="typeManagerSummaryTable" 
                      style="width: 100%" 
                      height="300" 
                      border 
                      stripe 
                      size="small"
                    >
                      <el-table-column prop="mgr_name" label="基金管理人" min-width="220" show-overflow-tooltip />
                      <el-table-column prop="count" label="ETF数量" width="100" align="center" />
                    </el-table>
                  </template>

                  <template v-else-if="currentData.nodeType === 'MGR'">
                    <el-table 
                      :data="managerIndexSummaryTable" 
                      style="width: 100%" 
                      height="300" 
                      border 
                      stripe 
                      size="small"
                    >
                      <el-table-column prop="index_code" label="指数代码" width="160" />
                      <el-table-column prop="index_name" label="指数名称" min-width="220" show-overflow-tooltip />
                      <el-table-column prop="count" label="ETF数量" width="100" align="center" />
                    </el-table>
                    <div class="section-header">指数类别分布</div>
                    <el-row :gutter="20" class="mt-10">
                      <el-col :span="10">
                        <el-table
                          :data="managerIndexCategorySummary"
                          style="width: 100%"
                          height="260"
                          border
                          stripe
                          size="small"
                        >
                          <el-table-column prop="category" label="类别" min-width="160" show-overflow-tooltip />
                          <el-table-column prop="count" label="数量" width="100" align="center" />
                        </el-table>
                      </el-col>
                      <el-col :span="14">
                        <div ref="categoryChartRef" style="width: 100%; height: 280px;"></div>
                      </el-col>
                    </el-row>
                  </template>

                  <template v-else-if="currentData.nodeType === 'CAT'">
                    <el-table 
                      :data="categoryIndexSummaryTable" 
                      style="width: 100%" 
                      height="300" 
                      border 
                      stripe 
                      size="small"
                    >
                      <el-table-column prop="index_code" label="指数代码" width="160" />
                      <el-table-column prop="index_name" label="指数名称" min-width="220" show-overflow-tooltip />
                      <el-table-column prop="count" label="ETF数量" width="100" align="center" />
                    </el-table>
                  </template>

                  <template v-else-if="currentData.nodeType === 'INDEX'">
                    <el-table 
                      :data="etfListTable" 
                      style="width: 100%" 
                      height="360" 
                      border 
                      stripe 
                      size="small"
                    >
                      <el-table-column prop="ts_code" label="交易代码" width="140" align="center" />
                      <el-table-column prop="csname" label="ETF简称" min-width="220" show-overflow-tooltip />
                      <el-table-column prop="extname" label="扩位简称" min-width="160" show-overflow-tooltip />
                      <el-table-column prop="exchange" label="交易所" width="100" align="center" />
                      <el-table-column prop="mgr_name" label="管理人" min-width="160" show-overflow-tooltip />
                      <el-table-column prop="list_status" label="上市状态" width="100" align="center" />
                      <el-table-column prop="list_date" label="上市日期" width="120" align="center" />
                    </el-table>
                  </template>
                </div>

                <div v-else-if="currentData.nodeType !== 'ETF'" class="no-children-tip">
                  <el-text type="info">暂无已展开的下级节点，请在左侧点击展开</el-text>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane v-if="currentData.nodeType === 'ETF'" label="趋势图" name="trend">
              <div class="tab-content">
                <div style="margin-bottom: 10px; display: flex; justify-content: flex-end; gap: 8px;">
                  <span style="align-self: center; color: #606266; font-size: 13px;">日期范围</span>
                  <el-button-group>
                    <el-button :type="etfTrendRange === '1y' ? 'primary' : 'default'" size="small" @click="etfTrendRange = '1y'">一年</el-button>
                    <el-button :type="etfTrendRange === '3y' ? 'primary' : 'default'" size="small" @click="etfTrendRange = '3y'">三年</el-button>
                    <el-button :type="etfTrendRange === '5y' ? 'primary' : 'default'" size="small" @click="etfTrendRange = '5y'">五年</el-button>
                  </el-button-group>
                </div>
                <div v-if="etfTrendLoading" style="padding: 20px;">
                  <el-skeleton :rows="8" animated />
                </div>
                <div v-else>
                  <stock-k-line-chart
                    v-if="etfKlineData.length > 0 && currentData?.item"
                    :stock-code="currentData.item.ts_code"
                    :stock-name="currentData.item.csname || currentData.item.extname"
                    :kline-data="etfKlineData"
                    height="420px"
                  />
                  <el-empty v-else description="暂无趋势数据" />
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane v-if="currentData.nodeType === 'INDEX'" label="成分与权重" name="weights">
              <div class="tab-content">
                <el-table
                  :data="displayIndexWeights"
                  v-loading="indexWeightLoading"
                  element-loading-text="加载指数成分权重..."
                  style="width: 100%"
                  height="360"
                  border
                  stripe
                  size="small"
                >
                  <el-table-column label="成分代码" width="140" align="center">
                    <template #default="scope">
                      <span>{{ scope.row.base_code }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="成分名称" min-width="200" show-overflow-tooltip>
                    <template #default="scope">
                      <span>{{ scope.row.stock_name || scope.row.con_name }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="weight" label="权重(%)" width="120" align="right">
                    <template #default="scope">
                      <span>{{ formatPercent(scope.row.weight) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="trade_date" label="交易日期" width="120" align="center" />
                </el-table>
                <div class="section-header" style="margin-top: 10px;">成分行业分布</div>
                <div ref="industryChartRef" style="width: 100%; height: 280px;"></div>
              </div>
            </el-tab-pane>
            <el-tab-pane v-if="currentData.nodeType === 'CAT'" label="波动性分析" name="cat-volatility">
              <div class="tab-content">
                <etf-category-volatility-tab :etf-codes="catEtfCodes" :code-name-map="catCodeNameMapObj" />
              </div>
            </el-tab-pane>
            <el-tab-pane v-if="currentData.nodeType === 'INDEX'" label="趋势图" name="index-trend">
              <div class="tab-content">
                <div v-if="indexTrendLoading" style="padding: 20px;">
                  <el-skeleton :rows="8" animated />
                </div>
                <div v-else>
                  <stock-k-line-chart
                    v-if="indexKlineData.length > 0 && currentData?.index_code"
                    :stock-code="currentData.index_code"
                    :stock-name="currentData.index_name || currentData.index_code"
                    :kline-data="indexKlineData"
                    height="420px"
                  />
                  <el-empty v-else description="暂无指数趋势数据" />
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
        <div v-else class="empty-state">
          <el-empty description="请选择左侧节点查看详情" />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type Node from 'element-plus/es/components/tree/src/model/node'
import { ElMessage } from 'element-plus'
import { getEtfBasic, type EtfBasicItem } from '@/services/etfApi'
import * as echarts from 'echarts'
import { fetchIndexBasicList, type IndexBasicItem, fetchIndexWeight, type IndexWeightItem } from '@/services/indexBasicApi'
import { getEtfDaily, type EtfDailyItem } from '@/services/etfApi'
import StockKLineChart from '@/components/StockKLineChart.vue'
import EtfCategoryVolatilityTab from '@/components/EtfCategoryVolatilityTab.vue'
import { fetchIndexDailyKline, type IndexDailyKlineItem } from '@/services/indexDailyApi'
import { getStockList } from '@/services/individualStockApi'

type NodeType = 'ROOT' | 'TYPE' | 'MGR' | 'CAT' | 'INDEX' | 'ETF'

interface TreeNodeData {
  key: string
  label: string
  nodeType: NodeType
  etf_type?: string
  index_code?: string
  index_name?: string
  mgr_name?: string
  category?: string
  item?: EtfBasicItem
}
const treeRef = ref()
const filterText = ref('')


const currentData = ref<TreeNodeData | null>(null)
const currentNode = ref<Node | null>(null)
const currentChildren = ref<TreeNodeData[]>([])
const activeTab = ref('basic')
const indexWeights = ref<IndexWeightItem[]>([])
type DisplayIndexWeight = IndexWeightItem & { base_code: string; stock_name?: string; industry?: string }
const displayIndexWeights = ref<DisplayIndexWeight[]>([])
const indexWeightLoading = ref(false)
const etfTrendLoading = ref(false)
const etfDailyItems = ref<EtfDailyItem[]>([])
const indexTrendLoading = ref(false)
const indexDailyItems = ref<IndexDailyKlineItem[]>([])
const etfTrendRange = ref<'1y' | '3y' | '5y'>('1y')
const etfKlineData = computed(() =>
  (etfDailyItems.value || []).map(d => ({
    date: d.trade_date,
    open_price: d.open,
    close_price: d.close,
    high_price: d.high,
    low_price: d.low,
    volume: d.vol,
    amount: d.amount
  }))
)
const indexKlineData = computed(() =>
  (indexDailyItems.value || []).map(d => ({
    date: d.date,
    open_price: d.open,
    close_price: d.close,
    high_price: d.high,
    low_price: d.low,
    volume: d.vol ?? 0,
    amount: d.amount ?? 0
  }))
)

const typeCache = ref<Map<string, EtfBasicItem[]>>(new Map())
const indexBasicMap = ref<Map<string, IndexBasicItem>>(new Map())
const categoryChartRef = ref<HTMLElement>()
let categoryChart: echarts.ECharts | null = null
const industryChartRef = ref<HTMLElement>()
let industryChart: echarts.ECharts | null = null

const etfTypes = [
  { code: '纯境内', name: '纯境内' },
  { code: 'QDII', name: 'QDII' }
]

const defaultProps = {
  label: 'label',
  isLeaf: (data: TreeNodeData, node: Node) => {
    return data.nodeType === 'ETF'
  }
}

const filterNode = (value: string, data: TreeNodeData, node: Node) => {
  if (!value) return true
  const q = value.trim().toLowerCase()
  const fields = [
    data.label || '',
    data.etf_type || '',
    data.index_code || '',
    data.index_name || '',
    data.mgr_name || '',
    data.category || '',
    data.item?.ts_code || '',
    data.item?.csname || '',
    data.item?.extname || ''
  ]
  return fields.some(f => f.toLowerCase().includes(q))
}

watch(filterText, (val) => {
  if (treeRef.value && typeof treeRef.value.filter === 'function') {
    treeRef.value.filter(val)
  }
})

const updateCurrentChildren = (node: Node) => {
  if (node && node.childNodes) {
    currentChildren.value = node.childNodes.map(child => child.data as TreeNodeData)
  } else {
    currentChildren.value = []
  }
}

const waitForChildren = async (node: Node, timeout = 12000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    await nextTick()
    if (node.childNodes && node.childNodes.length > 0) return
    await new Promise(r => setTimeout(r, 100))
  }
}

const expandByKey = async (key: string) => {
  const tree: any = treeRef.value
  const node = tree?.getNode?.(key)
  if (!node) return
  if (typeof node.expand === 'function') {
    node.expand()
  } else if (typeof tree.setExpandedKeys === 'function') {
    const expanded = typeof tree.getExpandedKeys === 'function' ? tree.getExpandedKeys() : []
    tree.setExpandedKeys(Array.from(new Set([...(expanded || []), key])))
  }
  await waitForChildren(node)
  return node as Node
}

const preloadTreeAll = async () => {
  await nextTick()
  const rootNode = await expandByKey('ROOT')
  if (!rootNode) return
  for (const typeNode of rootNode.childNodes || []) {
    const type = await expandByKey(typeNode.key as string)
    if (!type) continue
    for (const mgrNode of type.childNodes || []) {
      const mgr = await expandByKey(mgrNode.key as string)
      if (!mgr) continue
      for (const catNode of mgr.childNodes || []) {
        const cat = await expandByKey(catNode.key as string)
        if (!cat) continue
        for (const indexNode of cat.childNodes || []) {
          const idx = await expandByKey(indexNode.key as string)
          if (!idx) continue
          // 加载 ETF 叶子
          for (const etfNode of idx.childNodes || []) {
            // 叶子无需展开
          }
        }
      }
    }
  }
}
const fetchAllEtfBasic = async (etf_type: string): Promise<EtfBasicItem[]> => {
  const cached = typeCache.value.get(etf_type)
  if (cached) return cached
  const pageSize = 2500
  let page = 1
  let totalPages = 1
  const list: EtfBasicItem[] = []
  try {
    while (page <= totalPages) {
      const res = await getEtfBasic({ etf_type, page, page_size: pageSize })
      list.push(...(res.data || []))
      totalPages = res.pages || 1
      page += 1
    }
    typeCache.value.set(etf_type, list)
    return list
  } catch (e) {
    ElMessage.error('加载ETF基础信息失败')
    return []
  }
}

const loadNode = async (node: Node, resolve: (data: TreeNodeData[]) => void) => {
  try {
    if (node.level === 0) {
      resolve([{
        key: 'ROOT',
        label: 'ETF分类',
        nodeType: 'ROOT'
      }])
      return
    }

    const parentData = node.data as TreeNodeData

    if (parentData.nodeType === 'ROOT') {
      const children: TreeNodeData[] = etfTypes.map(t => ({
        key: `TYPE:${t.code}`,
        label: `${t.name}`,
        nodeType: 'TYPE',
        etf_type: t.code
      }))
      resolve(children)
      if (currentNode.value && currentNode.value.key === node.key) {
        updateCurrentChildren(node)
      }
      return
    }

    if (parentData.nodeType === 'TYPE' && parentData.etf_type) {
      const list = await fetchAllEtfBasic(parentData.etf_type)
      const mgrSet = new Set(list.map(i => i.mgr_name || '').filter(x => !!x))
      const children: TreeNodeData[] = Array.from(mgrSet).map(mn => ({
        key: `MGR:${parentData.etf_type}:${mn}`,
        label: mn,
        nodeType: 'MGR',
        etf_type: parentData.etf_type,
        mgr_name: mn
      }))
      resolve(children)
      if (currentNode.value && currentNode.value.key === node.key) {
        updateCurrentChildren(node)
      }
      return
    }

    if (parentData.nodeType === 'MGR' && parentData.etf_type && parentData.mgr_name) {
      await ensureIndexBasicLoaded()
      const list = await fetchAllEtfBasic(parentData.etf_type)
      const filtered = list.filter(i => i.mgr_name === parentData.mgr_name)
      const catSet = new Set<string>()
      for (const i of filtered) {
        const code = i.index_code || ''
        if (!code) continue
        const basic = indexBasicMap.value.get(code)
        catSet.add(basic?.category || '未知')
      }
      const children: TreeNodeData[] = Array.from(catSet.values()).map(cat => ({
        key: `CAT:${parentData.etf_type}:${parentData.mgr_name}:${cat}`,
        label: cat,
        nodeType: 'CAT',
        etf_type: parentData.etf_type,
        mgr_name: parentData.mgr_name,
        category: cat
      }))
      resolve(children)
      if (currentNode.value && currentNode.value.key === node.key) {
        updateCurrentChildren(node)
      }
      return
    }

    if (parentData.nodeType === 'CAT' && parentData.etf_type && parentData.mgr_name && parentData.category) {
      await ensureIndexBasicLoaded()
      const list = await fetchAllEtfBasic(parentData.etf_type)
      const filtered = list.filter(i => i.mgr_name === parentData.mgr_name)
      const indexMap = new Map<string, string>()
      for (const i of filtered) {
        const code = i.index_code || ''
        if (!code) continue
        const basic = indexBasicMap.value.get(code)
        const cat = basic?.category || '未知'
        if (cat !== parentData.category) continue
        const name = i.index_name || ''
        if (!indexMap.has(code)) indexMap.set(code, name)
      }
      const children: TreeNodeData[] = Array.from(indexMap.entries()).map(([code, name]) => ({
        key: `INDEX:${parentData.etf_type}:${parentData.mgr_name}:${parentData.category}:${code}`,
        label: name || code,
        nodeType: 'INDEX',
        etf_type: parentData.etf_type,
        mgr_name: parentData.mgr_name,
        index_code: code,
        index_name: name,
        category: parentData.category
      }))
      resolve(children)
      if (currentNode.value && currentNode.value.key === node.key) {
        updateCurrentChildren(node)
      }
      return
    }

    if (parentData.nodeType === 'INDEX' && parentData.etf_type && parentData.index_code && parentData.mgr_name) {
      const list = await fetchAllEtfBasic(parentData.etf_type)
      const filtered = list.filter(i => i.index_code === parentData.index_code && i.mgr_name === parentData.mgr_name)
      const children: TreeNodeData[] = filtered.map(i => ({
        key: `ETF:${i.ts_code}`,
        label: `${i.csname || i.extname || i.ts_code}`,
        nodeType: 'ETF',
        etf_type: parentData.etf_type,
        index_code: i.index_code || undefined,
        index_name: i.index_name || undefined,
        mgr_name: i.mgr_name || undefined,
        category: parentData.category,
        item: i
      }))
      resolve(children)
      if (currentNode.value && currentNode.value.key === node.key) {
        updateCurrentChildren(node)
      }
      return
    }

    resolve([])
  } catch (error) {
    ElMessage.error('加载ETF分类失败')
    resolve([])
  }
}

const handleNodeClick = (data: TreeNodeData, node: Node) => {
  currentData.value = data
  currentNode.value = node
  updateCurrentChildren(node)
}

const handleNodeExpand = (data: TreeNodeData, node: Node) => {
  if (currentNode.value && currentNode.value.key === node.key) {
    updateCurrentChildren(node)
  }
}

const typeManagerSummaryTable = computed(() => {
  if (!currentData.value || currentData.value.nodeType !== 'TYPE') return []
  const list = typeCache.value.get(currentData.value.etf_type || '') || []
  const map = new Map<string, number>()
  for (const i of list) {
    const name = i.mgr_name || ''
    if (!name) continue
    map.set(name, (map.get(name) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([mgr_name, count]) => ({ mgr_name, count }))
    .sort((a, b) => b.count - a.count)
})

const managerIndexSummaryTable = computed(() => {
  if (!currentData.value || currentData.value.nodeType !== 'MGR') return []
  const list = typeCache.value.get(currentData.value.etf_type || '') || []
  const filtered = list.filter(i => i.mgr_name === currentData.value?.mgr_name)
  const map = new Map<string, { index_name: string; count: number }>()
  for (const i of filtered) {
    const code = i.index_code || ''
    if (!code) continue
    const name = i.index_name || ''
    const entry = map.get(code) || { index_name: name, count: 0 }
    entry.count += 1
    map.set(code, entry)
  }
  return Array.from(map.entries())
    .map(([index_code, v]) => ({ index_code, index_name: v.index_name, count: v.count }))
    .sort((a, b) => b.count - a.count)
})

const ensureIndexBasicLoaded = async () => {
  if (indexBasicMap.value.size > 0) return
  try {
    const list = await fetchIndexBasicList({ fields: 'ts_code,name,market,publisher,category' })
    const m = new Map<string, IndexBasicItem>()
    for (const it of list) {
      m.set(it.ts_code, it)
    }
    indexBasicMap.value = m
  } catch {
    ElMessage.error('加载指数基础信息失败')
  }
}

const managerIndexCategorySummary = computed(() => {
  if (!currentData.value || currentData.value.nodeType !== 'MGR') return []
  const list = typeCache.value.get(currentData.value.etf_type || '') || []
  const filtered = list.filter(i => i.mgr_name === currentData.value?.mgr_name)
  const indexCodes = new Set<string>()
  for (const i of filtered) {
    const code = i.index_code || ''
    if (code) indexCodes.add(code)
  }
  const catMap = new Map<string, number>()
  for (const code of indexCodes) {
    const basic = indexBasicMap.value.get(code)
    const cat = basic?.category || '未知'
    catMap.set(cat, (catMap.get(cat) || 0) + 1)
  }
  return Array.from(catMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
})

const categoryIndexSummaryTable = computed(() => {
  if (!currentData.value || currentData.value.nodeType !== 'CAT') return []
  const list = typeCache.value.get(currentData.value.etf_type || '') || []
  const filtered = list.filter(i => i.mgr_name === currentData.value?.mgr_name)
  const map = new Map<string, { index_name: string; count: number }>()
  for (const i of filtered) {
    const code = i.index_code || ''
    if (!code) continue
    const basic = indexBasicMap.value.get(code)
    const cat = basic?.category || '未知'
    if (cat !== currentData.value.category) continue
    const name = i.index_name || ''
    const entry = map.get(code) || { index_name: name, count: 0 }
    entry.count += 1
    map.set(code, entry)
  }
  return Array.from(map.entries())
    .map(([index_code, v]) => ({ index_code, index_name: v.index_name, count: v.count }))
    .sort((a, b) => b.count - a.count)
})

const updateCategoryChart = () => {
  if (!categoryChartRef.value) return
  if (!categoryChart) {
    categoryChart = echarts.init(categoryChartRef.value)
  }
  const data = managerIndexCategorySummary.value.map(d => ({ name: d.category, value: d.count }))
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        label: { show: true, formatter: '{b}: {d}%' },
        data
      }
    ]
  }
  categoryChart.setOption(option)
}

onMounted(() => {
  preloadTreeAll()
})

onUnmounted(() => {
  if (categoryChart) {
    categoryChart.dispose()
    categoryChart = null
  }
  if (industryChart) {
    industryChart.dispose()
    industryChart = null
  }
})

const etfListTable = computed(() => {
  if (!currentData.value || currentData.value.nodeType !== 'INDEX') return []
  const list = typeCache.value.get(currentData.value.etf_type || '') || []
  return list.filter(i => i.index_code === currentData.value?.index_code && i.mgr_name === currentData.value?.mgr_name)
})

const catEtfCodes = computed(() => {
  if (!currentData.value || currentData.value.nodeType !== 'CAT') return [] as string[]
  const list = typeCache.value.get(currentData.value.etf_type || '') || []
  const filtered = list.filter(i => i.mgr_name === currentData.value?.mgr_name)
  const codes: string[] = []
  for (const it of filtered) {
    const code = it.index_code || ''
    if (!code) continue
    const basic = indexBasicMap.value.get(code)
    const cat = basic?.category || '未知'
    if (cat !== currentData.value.category) continue
    if (it.ts_code) codes.push(it.ts_code)
  }
  return codes
})

const catEtfNameMap = computed(() => {
  if (!currentData.value || currentData.value.nodeType !== 'CAT') return new Map<string, string>()
  const list = typeCache.value.get(currentData.value.etf_type || '') || []
  const filtered = list.filter(i => i.mgr_name === currentData.value?.mgr_name)
  const map = new Map<string, string>()
  for (const it of filtered) {
    const code = it.index_code || ''
    if (!code) continue
    const basic = indexBasicMap.value.get(code)
    const cat = basic?.category || '未知'
    if (cat !== currentData.value.category) continue
    const name = it.extname || it.csname || it.cname || it.ts_code || ''
    if (it.ts_code) map.set(it.ts_code, name)
  }
  return map
})
const catCodeNameMapObj = computed(() => Object.fromEntries(catEtfNameMap.value as Map<string, string>))

watch(currentChildren, () => {
  activeTab.value = 'basic'
})

watch(currentData, async () => {
  if (currentData.value?.nodeType === 'MGR') {
    await ensureIndexBasicLoaded()
    await nextTick()
    updateCategoryChart()
  } else {
    if (categoryChart) {
      categoryChart.dispose()
      categoryChart = null
    }
  }
  if (currentData.value?.nodeType !== 'INDEX') {
    indexWeights.value = []
    indexWeightLoading.value = false
    if (industryChart) {
      industryChart.dispose()
      industryChart = null
    }
  }
  if (currentData.value?.nodeType !== 'INDEX') {
    indexDailyItems.value = []
    indexTrendLoading.value = false
  }
  if (currentData.value?.nodeType !== 'ETF') {
    etfDailyItems.value = []
    etfTrendLoading.value = false
  }
})

const loadIndexWeights = async () => {
  if (!currentData.value || currentData.value.nodeType !== 'INDEX') return
  const code = currentData.value.index_code || ''
  if (!code) return
  indexWeightLoading.value = true
  try {
    const list = await fetchIndexWeight({
      index_code: code,
      fields: 'index_code,con_code,con_name,weight,trade_date'
    })
    const norm = (d?: string) => (d || '').replace(/-/g, '')
    let latest = ''
    for (const it of list) {
      const d = norm(it.trade_date)
      if (d > latest) latest = d
    }
    const filtered = list.filter(it => norm(it.trade_date) === latest)
    indexWeights.value = [...filtered].sort((a, b) => (Number(b.weight || 0) - Number(a.weight || 0)))
    const stripSuffix = (c?: string) => (c || '').replace(/\.[A-Z]+$/i, '')
    const baseCodes = Array.from(new Set(indexWeights.value.map((w: IndexWeightItem) => stripSuffix(w.con_code))))
    let codeToName = new Map<string, string>()
    let codeToIndustry = new Map<string, string>()
    if (baseCodes.length > 0) {
      try {
        const res = await getStockList({ codes: baseCodes.join(','), page_size: baseCodes.length })
        const list = res.data || []
        codeToName = new Map<string, string>(list.map(it => [it.code, it.name]))
        codeToIndustry = new Map<string, string>(list.map(it => [it.code, it.industry]))
      } catch {}
    }
    displayIndexWeights.value = indexWeights.value.map((w: IndexWeightItem) => {
      const base_code = stripSuffix(w.con_code)
      const stock_name = base_code ? (codeToName.get(base_code) || undefined) : undefined
      const industry = base_code ? (codeToIndustry.get(base_code) || undefined) : undefined
      return { ...w, base_code, stock_name, industry }
    })
  } catch {
    ElMessage.error('加载指数成分权重失败')
  } finally {
    indexWeightLoading.value = false
  }
}

const updateIndustryChart = () => {
  if (!industryChartRef.value) return
  if (!industryChart) {
    industryChart = echarts.init(industryChartRef.value)
  }
  const map = new Map<string, number>()
  for (const it of displayIndexWeights.value) {
    const key = it.industry || '未知'
    map.set(key, (map.get(key) || 0) + 1)
  }
  const data = Array.from(map.entries())
    .map(([name, count]) => ({ name, value: count }))
    .sort((a, b) => b.value - a.value)
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        type: 'pie',
        center: ['50%', '45%'],
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        label: { show: true, formatter: '{b}: {d}%' },
        data
      }
    ]
  }
  industryChart.setOption(option)
}

watch(activeTab, async (tab) => {
  if (tab === 'weights') {
    await loadIndexWeights()
    await nextTick()
    updateIndustryChart()
  } else if (tab === 'trend') {
    await loadEtfTrend()
  } else if (tab === 'index-trend') {
    await loadIndexTrend()
  } else if (tab === 'cat-volatility') {
    await ensureIndexBasicLoaded()
  }
})

watch(etfTrendRange, async () => {
  if (activeTab.value === 'trend') {
    await loadEtfTrend()
  }
})

const formatPercent = (val?: number) => {
  const num = Number(val || 0)
  if (Number.isNaN(num)) return '--'
  return (num * 100).toFixed(2)
}

const formatDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const loadEtfTrend = async () => {
  if (!currentData.value || currentData.value.nodeType !== 'ETF' || !currentData.value.item) return
  const ts_code = currentData.value.item.ts_code
  if (!ts_code) return
  etfTrendLoading.value = true
  try {
    const today = new Date()
    const start = new Date()
    const years = etfTrendRange.value === '1y' ? 1 : etfTrendRange.value === '3y' ? 3 : 5
    start.setFullYear(today.getFullYear() - years)
    const items = await getEtfDaily({
      ts_code,
      start_date: formatDate(start),
      end_date: formatDate(today)
    })
    etfDailyItems.value = items
  } catch {
    ElMessage.error('加载ETF趋势数据失败')
  } finally {
    etfTrendLoading.value = false
  }
}

const loadIndexTrend = async () => {
  if (!currentData.value || currentData.value.nodeType !== 'INDEX') return
  const ts_code = currentData.value.index_code || ''
  if (!ts_code) return
  indexTrendLoading.value = true
  try {
    const today = new Date()
    const start = new Date()
    start.setDate(today.getDate() - 180)
    const items = await fetchIndexDailyKline(
      ts_code,
      formatDate(start).replace(/-/g, ''),
      formatDate(today).replace(/-/g, '')
    )
    indexDailyItems.value = items
  } catch {
    ElMessage.error('加载指数趋势数据失败')
  } finally {
    indexTrendLoading.value = false
  }
}
</script>

<style scoped>
.etf-tree-view {
  padding: 20px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.main-container {
  display: flex;
  gap: 20px;
  height: 100%;
  overflow: hidden;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.left-panel :deep(.el-card__body) {
  flex: 1;
  overflow: hidden;
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.right-panel {
  flex: 2;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.right-panel :deep(.el-card__body) {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.tree-wrapper {
  flex: 1;
  overflow-y: auto;
  height: 100%;
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 8px;
}

.node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-tabs {
  width: 100%;
}
.tab-content {
  width: 100%;
}

.detail-title {
  font-size: 16px;
  font-weight: bold;
}

.children-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-header {
  font-weight: bold;
  font-size: 14px;
  border-left: 4px solid #409EFF;
  padding-left: 10px;
}

.no-children-tip {
  margin-top: 20px;
  text-align: center;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
}
</style>
