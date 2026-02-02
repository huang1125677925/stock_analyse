<template>
  <div class="index-tree-view">
    <div class="main-container">
      <el-card class="left-panel">
        <template #header>
          <div class="card-header">
            <span>指数分类树状图</span>
          </div>
        </template>
        <div class="tree-wrapper">
          <el-tree
            :props="defaultProps"
            :load="loadNode"
            lazy
            node-key="key"
            highlight-current
            @node-click="handleNodeClick"
            @node-expand="handleNodeExpand"
          >
            <template #default="{ node, data }">
              <span class="custom-tree-node">
                <span class="node-label">{{ node.label }}</span>
                <span class="node-info">
                  <el-tag v-if="data.nodeType === 'MARKET'" size="small" type="primary" effect="plain">
                    {{ data.market }}
                  </el-tag>
                  <el-tag v-else-if="data.nodeType === 'CATEGORY'" size="small" type="warning" effect="plain">
                    类别
                  </el-tag>
                  <el-tag v-else-if="data.nodeType === 'INDEX'" size="small" type="success" effect="plain">
                    指数
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
                    <el-tag v-if="currentData.nodeType === 'MARKET'" type="primary">市场</el-tag>
                    <el-tag v-else-if="currentData.nodeType === 'CATEGORY'" type="warning">类别</el-tag>
                    <el-tag v-else-if="currentData.nodeType === 'INDEX'" type="success">指数</el-tag>
                    <el-tag v-else type="info">根</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="名称">
                    <span class="detail-title">{{ currentData.label }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="currentData.market" label="市场">
                    <el-tag>{{ currentData.market }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="currentData.category" label="类别">
                    <el-tag type="warning">{{ currentData.category }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="currentData.nodeType === 'INDEX'" label="指数代码">
                    <el-tag type="success">{{ currentData.index?.ts_code }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="currentData.nodeType === 'INDEX' && currentData.index?.publisher" label="发布方">
                    {{ currentData.index?.publisher }}
                  </el-descriptions-item>
                </el-descriptions>

                <div class="children-section" v-if="currentChildren.length > 0">
                  <div class="section-header">
                    <span>下级列表 ({{ currentChildren.length }})</span>
                  </div>

                  <template v-if="currentData.nodeType === 'MARKET'">
                    <el-table 
                      :data="categoryTableData" 
                      style="width: 100%" 
                      height="300" 
                      border 
                      stripe 
                      size="small"
                    >
                      <el-table-column prop="category" label="类别" min-width="160" />
                      <el-table-column prop="count" label="指数数量" width="100" align="center" />
                    </el-table>
                  </template>

                  <template v-else-if="currentData.nodeType === 'CATEGORY'">
                    <el-table 
                      :data="indexTableData" 
                      style="width: 100%" 
                      height="360" 
                      border 
                      stripe 
                      size="small"
                    >
                      <el-table-column prop="ts_code" label="指数代码" width="140" align="center" />
                      <el-table-column prop="name" label="指数名称" min-width="200" show-overflow-tooltip />
                      <el-table-column prop="publisher" label="发布方" min-width="160" show-overflow-tooltip />
                      <el-table-column prop="market" label="市场" width="100" align="center" />
                      <el-table-column prop="category" label="类别" width="120" align="center" />
                      <el-table-column label="操作" width="120" align="center" fixed="right">
                        <template #default="{ row }">
                          <el-button type="primary" link size="small" @click="viewIndexDetail(row)">
                            查看分析
                          </el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </template>
                </div>

                <div v-else-if="currentData.nodeType !== 'INDEX'" class="no-children-tip">
                  <el-text type="info">暂无已展开的下级节点，请在左侧点击展开</el-text>
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
import { ref, computed, watch } from 'vue'
import type Node from 'element-plus/es/components/tree/src/model/node'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchIndexBasicList, type IndexBasicItem } from '@/services/indexBasicApi'

type NodeType = 'ROOT' | 'MARKET' | 'CATEGORY' | 'INDEX'

interface TreeNodeData {
  key: string
  label: string
  nodeType: NodeType
  market?: string
  category?: string
  index?: IndexBasicItem
}

const router = useRouter()

const currentData = ref<TreeNodeData | null>(null)
const currentNode = ref<Node | null>(null)
const currentChildren = ref<TreeNodeData[]>([])
const activeTab = ref('basic')

const marketCache = ref<Map<string, IndexBasicItem[]>>(new Map())

const markets = [
  { code: 'MSCI', name: 'MSCI' },
  { code: 'CSI', name: '中证' },
  { code: 'SSE', name: '上交所' },
  { code: 'SZSE', name: '深交所' },
  { code: 'CICC', name: '中金' },
  { code: 'SW', name: '申万' },
  { code: 'OTH', name: '其他' }
]

const defaultProps = {
  label: 'label',
  isLeaf: (data: TreeNodeData, node: Node) => {
    return data.nodeType === 'INDEX'
  }
}

const updateCurrentChildren = (node: Node) => {
  if (node && node.childNodes) {
    currentChildren.value = node.childNodes.map(child => child.data as TreeNodeData)
  } else {
    currentChildren.value = []
  }
}

const loadNode = async (node: Node, resolve: (data: TreeNodeData[]) => void) => {
  try {
    if (node.level === 0) {
      resolve([{
        key: 'ROOT',
        label: '指数分类',
        nodeType: 'ROOT'
      }])
      return
    }

    const parentData = node.data as TreeNodeData

    if (parentData.nodeType === 'ROOT') {
      const children: TreeNodeData[] = markets.map(m => ({
        key: `MARKET:${m.code}`,
        label: `${m.name} (${m.code})`,
        nodeType: 'MARKET',
        market: m.code
      }))
      resolve(children)
      if (currentNode.value && currentNode.value.key === node.key) {
        updateCurrentChildren(node)
      }
      return
    }

    if (parentData.nodeType === 'MARKET' && parentData.market) {
      let list = marketCache.value.get(parentData.market)
      if (!list) {
        const fetched = await fetchIndexBasicList({ market: parentData.market })
        marketCache.value.set(parentData.market, fetched)
        list = fetched
      }
      const categories = Array.from(new Set(list.map(i => i.category || ''))).filter(c => !!c)
      const children: TreeNodeData[] = categories.map(cat => ({
        key: `CATEGORY:${parentData.market}:${cat}`,
        label: cat,
        nodeType: 'CATEGORY',
        market: parentData.market,
        category: cat
      }))
      resolve(children)
      if (currentNode.value && currentNode.value.key === node.key) {
        updateCurrentChildren(node)
      }
      return
    }

    if (parentData.nodeType === 'CATEGORY' && parentData.market && parentData.category) {
      const list = marketCache.value.get(parentData.market) || []
      const indices = list.filter(i => i.category === parentData.category)
      const children: TreeNodeData[] = indices.map(i => ({
        key: `INDEX:${i.ts_code}`,
        label: `${i.name || i.ts_code}`,
        nodeType: 'INDEX',
        market: i.market,
        category: i.category,
        index: i
      }))
      resolve(children)
      if (currentNode.value && currentNode.value.key === node.key) {
        updateCurrentChildren(node)
      }
      return
    }

    resolve([])
  } catch (error) {
    console.error('加载指数分类失败:', error)
    ElMessage.error('加载指数分类失败')
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

const categoryTableData = computed(() => {
  if (!currentData.value || currentData.value.nodeType !== 'MARKET') return []
  const list = marketCache.value.get(currentData.value.market || '') || []
  const map = new Map<string, number>()
  for (const i of list) {
    const cat = i.category || ''
    if (!cat) continue
    map.set(cat, (map.get(cat) || 0) + 1)
  }
  return Array.from(map.entries()).map(([category, count]) => ({ category, count }))
})

const indexTableData = computed(() => {
  if (!currentData.value || currentData.value.nodeType !== 'CATEGORY') return []
  const list = marketCache.value.get(currentData.value.market || '') || []
  return list.filter(i => i.category === currentData.value?.category)
})

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

watch(currentChildren, () => {
  activeTab.value = 'basic'
})
</script>

<style scoped>
.index-tree-view {
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

