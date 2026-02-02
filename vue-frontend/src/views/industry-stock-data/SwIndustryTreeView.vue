<template>
  <div class="sw-industry-tree-view">
    <div class="main-container">
      <!-- 左侧树状图区域 -->
      <el-card class="left-panel">
        <template #header>
          <div class="card-header">
            <span>申万行业分类 (SW2021)</span>
          </div>
        </template>
        
        <div class="tree-wrapper">
          <el-tree
            :props="defaultProps"
            :load="loadNode"
            lazy
            node-key="index_code"
            highlight-current
            @node-click="handleNodeClick"
            @node-expand="handleNodeExpand"
          >
            <template #default="{ node, data }">
              <span class="custom-tree-node">
                <span class="node-label">{{ node.label }}</span>
                <span class="node-info">
                  <el-tag size="small" :type="getLevelTagType(data.level)" effect="plain">
                    {{ data.level }}
                  </el-tag>
                </span>
              </span>
            </template>
          </el-tree>
        </div>
      </el-card>

      <!-- 右侧详情区域 -->
      <el-card class="right-panel">
        <template #header>
          <div class="card-header">
            <span>行业详情信息</span>
          </div>
        </template>

        <div v-if="currentIndustry" class="detail-content">
          <el-tabs v-model="activeTab" class="industry-tabs">
            <el-tab-pane label="基本信息" name="basic">
              <div class="tab-content">
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="行业名称">
                    <span class="detail-title">{{ currentIndustry.industry_name }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="行业代码">
                    <el-tag>{{ currentIndustry.index_code }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="行业等级">
                    <el-tag :type="getLevelTagType(currentIndustry.level)">{{ currentIndustry.level }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="父级代码">
                    {{ currentIndustry.parent_code || '无' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="来源标准">
                    {{ currentIndustry.src || 'SW2021' }}
                  </el-descriptions-item>
                </el-descriptions>

                <!-- 下级行业列表 -->
                <div class="children-section" v-if="currentChildren.length > 0">
                  <div class="section-header">
                    <span>下级行业列表 ({{ currentChildren.length }})</span>
                  </div>
                  <el-table 
                    :data="tableData" 
                    style="width: 100%" 
                    height="300" 
                    border 
                    stripe 
                    size="small"
                    v-loading="valuationLoading"
                    :default-sort="{ prop: 'pe_percentile', order: 'ascending' }"
                  >
                    <el-table-column prop="index_code" label="行业代码" width="100" fixed />
                    <el-table-column prop="industry_name" label="行业名称" min-width="120" fixed />
                    <el-table-column prop="level" label="等级" width="80">
                      <template #default="{ row }">
                        <el-tag size="small" :type="getLevelTagType(row.level)">{{ row.level }}</el-tag>
                      </template>
                    </el-table-column>
                    
                    <el-table-column label="PE(TTM)" align="center">
                      <el-table-column prop="pe" label="数值" width="80" align="right">
                        <template #default="{ row }">
                          {{ formatNumber(row.pe) }}
                        </template>
                      </el-table-column>
                      <el-table-column prop="pe_percentile" label="分位(%)" width="80" align="right" sortable :sort-method="pePercentileSort">
                        <template #default="{ row }">
                          <span :style="getPercentileStyle(row.pe_percentile)">
                            {{ formatNumber(row.pe_percentile) }}
                          </span>
                        </template>
                      </el-table-column>
                    </el-table-column>

                    <el-table-column label="PB" align="center">
                      <el-table-column prop="pb" label="数值" width="80" align="right">
                        <template #default="{ row }">
                          {{ formatNumber(row.pb) }}
                        </template>
                      </el-table-column>
                      <el-table-column prop="pb_percentile" label="分位(%)" width="80" align="right" sortable :sort-method="pbPercentileSort">
                        <template #default="{ row }">
                          <span :style="getPercentileStyle(row.pb_percentile)">
                            {{ formatNumber(row.pb_percentile) }}
                          </span>
                        </template>
                      </el-table-column>
                    </el-table-column>
                    
                    <el-table-column prop="trade_date" label="数据日期" width="90" align="center" />
                  </el-table>
                </div>
                <div v-else-if="currentIndustry.level !== 'L3'" class="no-children-tip">
                  <el-text type="info">暂无已展开的下级行业，请在左侧点击展开</el-text>
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="行业趋势" name="trend">
              <div class="tab-content">
                <SwIndustryTrendChart
                  v-if="activeTab === 'trend'"
                  :key="currentIndustry.index_code"
                  :ts-code="currentIndustry.index_code"
                  :industry-name="currentIndustry.industry_name"
                />
              </div>
            </el-tab-pane>
            <el-tab-pane label="指数成分股" name="members">
              <div class="tab-content">
                <SwIndustryMembersTab
                  v-if="activeTab === 'members'"
                  :key="`${currentIndustry.industry_code}-${currentIndustry.level}`"
                  :industry-code="currentIndustry.industry_code"
                  :index-code="currentIndustry.index_code"
                  :level="currentIndustry.level"
                />
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
        <div v-else class="empty-state">
          <el-empty description="请选择左侧行业节点查看详情" />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：SwIndustryTreeView
 * 功能：展示申万行业分类的树状结构及详情
 * 逻辑：
 * 1. 左右分栏布局
 * 2. 左侧懒加载树，右侧展示详情和下级列表
 * 3. 联动逻辑：点击展示详情；展开展示子节点
 */
import { ref, computed, watch } from 'vue'
import type Node from 'element-plus/es/components/tree/src/model/node'
import { fetchSwIndexClassify, type SwIndexClassifyItem } from '@/services/swIndexClassifyApi'
import { getSwValuationAnalysis, type SwValuationAnalysisItem } from '@/services/industryApi'
import SwIndustryTrendChart from './components/SwIndustryTrendChart.vue'
import SwIndustryMembersTab from './components/SwIndustryMembersTab.vue'
import { ElMessage } from 'element-plus'

// 当前选中的行业
const currentIndustry = ref<SwIndexClassifyItem | null>(null)
// 当前选中的节点对象
const currentNode = ref<Node | null>(null)
// 当前节点的子节点列表
const currentChildren = ref<SwIndexClassifyItem[]>([])
// 估值数据 loading 状态
const valuationLoading = ref(false)
// 估值数据映射表
const valuationMap = ref<Map<string, SwValuationAnalysisItem>>(new Map())
// 当前选中的 Tab
const activeTab = ref('basic')

// 组合后的表格数据
const tableData = computed(() => {
  return currentChildren.value.map(item => {
    const valuation = valuationMap.value.get(item.index_code)
    return {
      ...item,
      pe: valuation?.pe,
      pe_percentile: valuation?.pe_percentile,
      pb: valuation?.pb,
      pb_percentile: valuation?.pb_percentile,
      trade_date: valuation?.trade_date
    }
  })
})

/**
 * 格式化数值
 * @param value 数值
 * @param decimals 小数位数
 */
const formatNumber = (value: number | undefined | null, decimals = 2) => {
  if (value === undefined || value === null) return '--'
  return value.toFixed(decimals)
}

/**
 * 获取分位数样式
 * @param value 分位数
 */
const getPercentileStyle = (value: number | undefined | null) => {
  if (value === undefined || value === null) return {}
  if (value < 20) return { color: '#67C23A', fontWeight: 'bold' } // 低估 - 绿色
  if (value > 80) return { color: '#F56C6C', fontWeight: 'bold' } // 高估 - 红色
  return {}
}

// 分位数排序（缺失值放末尾）
const percentileSort = (a: any, b: any, prop: 'pe_percentile' | 'pb_percentile') => {
  const av = typeof a?.[prop] === 'number' ? a[prop] as number : Number.POSITIVE_INFINITY
  const bv = typeof b?.[prop] === 'number' ? b[prop] as number : Number.POSITIVE_INFINITY
  return av - bv
}
const pePercentileSort = (a: any, b: any) => percentileSort(a, b, 'pe_percentile')
const pbPercentileSort = (a: any, b: any) => percentileSort(a, b, 'pb_percentile')

/**
 * 获取估值数据
 */
const fetchValuationData = async () => {
  if (currentChildren.value.length === 0) {
    valuationMap.value.clear()
    return
  }

  const level = currentChildren.value[0].level
  const indexCodes = currentChildren.value.map(item => item.index_code).join(',')
  
  // 使用最近的日期范围，确保能取到最新数据
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - 10) // 取最近十年，API应该会返回这期间的数据

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  try {
    valuationLoading.value = true
    const data = await getSwValuationAnalysis({
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      level: level,
      index_codes: indexCodes
    })

    // 将数据转换为Map，方便查找
    // 注意：API可能返回多天的记录，我们需要每个index_code最新的记录
    const map = new Map<string, SwValuationAnalysisItem>()
    
    // 按日期排序，确保处理顺序
    data.sort((a, b) => a.trade_date.localeCompare(b.trade_date))
    
    data.forEach(item => {
      // 后面的会覆盖前面的，所以最后留下的是日期最新的
      map.set(item.ts_code, item)
    })
    
    valuationMap.value = map
  } catch (error) {
    console.error('获取估值数据失败:', error)
    // 不弹出错误，以免影响用户体验，只是没有估值数据而已
  } finally {
    valuationLoading.value = false
  }
}

// 监听子节点列表变化，自动获取估值数据
watch(currentChildren, () => {
  fetchValuationData()
})

// 树组件配置
const defaultProps = {
  label: 'industry_name',
  isLeaf: (data: SwIndexClassifyItem, node: Node) => {
    // 申万行业分为三级，L3为叶子节点
    return data.level === 'L3'
  }
}

/**
 * 更新当前选中节点的子节点列表
 * @param node 节点对象
 */
const updateCurrentChildren = (node: Node) => {
  if (node && node.childNodes) {
    currentChildren.value = node.childNodes.map(child => child.data as SwIndexClassifyItem)
  } else {
    currentChildren.value = []
  }
}

/**
 * 懒加载节点数据
 * @param node 当前节点
 * @param resolve 数据加载完成后的回调
 */
const loadNode = async (node: Node, resolve: (data: SwIndexClassifyItem[]) => void) => {
  try {
    // 根节点加载（虚拟根节点）
    if (node.level === 0) {
      resolve([{
        industry_name: '申万行业分类',
        index_code: '0',
        industry_code: '0',
        level: 'ROOT',
        parent_code: '',
        src: 'SW2021'
      }])
      return
    }

    const parentData = node.data as SwIndexClassifyItem

    // 虚拟根节点加载一级行业
    if (parentData.level === 'ROOT' && parentData.industry_code === '0') {
      const data = await fetchSwIndexClassify({ parent_code: '0', src: 'SW2021' })
      resolve(data)
      
      if (currentNode.value && currentNode.value.key === node.key) {
        updateCurrentChildren(node)
      }
      return
    }

    // 非根节点加载（子行业）
    if (parentData && parentData.industry_code) {
      const data = await fetchSwIndexClassify({ 
        parent_code: parentData.industry_code,
        src: 'SW2021'
      })
      resolve(data)
      
      // 如果当前正在查看此节点，加载完数据后更新子节点列表
      if (currentNode.value && currentNode.value.key === node.key) {
        updateCurrentChildren(node)
      }
    } else {
      resolve([])
    }
  } catch (error) {
    console.error('加载行业数据失败:', error)
    ElMessage.error('加载行业数据失败')
    resolve([])
  }
}

/**
 * 节点点击事件
 * @param data 节点数据
 * @param node 节点对象
 */
const handleNodeClick = (data: SwIndexClassifyItem, node: Node) => {
  currentIndustry.value = data
  currentNode.value = node
  updateCurrentChildren(node)
}

/**
 * 节点展开事件
 * @param data 节点数据
 * @param node 节点对象
 */
const handleNodeExpand = (data: SwIndexClassifyItem, node: Node) => {
  // 如果展开的是当前选中的节点，更新列表
  if (currentNode.value && currentNode.value.key === node.key) {
    updateCurrentChildren(node)
  }
}

/**
 * 获取等级对应的Tag样式
 * @param level 行业等级
 */
const getLevelTagType = (level: string) => {
  switch (level) {
    case 'L1': return 'danger'
    case 'L2': return 'warning'
    case 'L3': return 'success'
    case 'ROOT': return 'primary'
    default: return 'info'
  }
}
</script>

<style scoped>
.sw-industry-tree-view {
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
  overflow-y: auto; /* 允许详情页滚动 */
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

.industry-tabs {
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
