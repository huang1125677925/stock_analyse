<template>
  <div class="congestion-heatmap">
    <el-card>
      <div class="header-controls">
        <h3>行业拥挤度分析</h3>
        <div>
          <el-checkbox v-model="onlyMine" @change="handleOnlyMineChange">仅看我的</el-checkbox>
        </div>
      </div>
      
      <el-tabs
        v-model="activeTab"
        class="analysis-tabs"
        :lazy="true"
        @tab-change="handleTabChange"
      >
        <el-tab-pane label="成交金额占比分位数" name="turnover">
          <TurnoverAnalysis :industry-whitelist="industryWhitelist" />
        </el-tab-pane>
        
        <el-tab-pane label="行业业绩指标" name="performance">
          <PerformanceAnalysis :industry-whitelist="industryWhitelist" />
        </el-tab-pane>
        
        <el-tab-pane label="行业资金流" name="fundflow">
          <FundFlowAnalysis :industry-whitelist="industryWhitelist" />
        </el-tab-pane>
        
        <el-tab-pane label="行业矩形树图" name="treemap">
          <IndustryTreemap :industry-whitelist="industryWhitelist" />
        </el-tab-pane>
        
        <el-tab-pane label="行业宽度热力图" name="breadth">
          <IndustryBreadthAnalysis :industry-whitelist="industryWhitelist" />
        </el-tab-pane>
        
        <el-tab-pane label="行业规模宽度" name="scaleBreadth">
          <IndustryScaleBreadthPanel :industry-whitelist="industryWhitelist" panel-type="breadth" />
        </el-tab-pane>
        <el-tab-pane label="行业产出营收" name="outputScale">
          <IndustryScaleBreadthPanel :industry-whitelist="industryWhitelist" panel-type="output" />
        </el-tab-pane>
        
        <el-tab-pane label="指数RPS强度排名" name="indexrps">
          <IndexRpsView />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 行业拥挤度热力图主页面
 * 功能：
 * - 提供tab切换功能，展示不同类型的行业分析
 * - 在切换时触发图表尺寸重算以避免ECharts隐藏容器初始化导致的尺寸异常
 * - 新增“仅看我的”功能：根据个人持有/关注的股票列表抽取行业白名单，仅展示相关行业
 * 
 * 参数：无
 * 返回值：无
 * 事件：无
 */
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import TurnoverAnalysis from '@/components/TurnoverAnalysis.vue'
import PerformanceAnalysis from '@/components/PerformanceAnalysis.vue'
import FundFlowAnalysis from '@/components/FundFlowAnalysis.vue'
import IndustryTreemap from '@/components/IndustryTreemap.vue'
import IndexRpsView from '@/views/strategy/IndexRpsView.vue'
import { getPersonalHoldings, type PersonalHoldingsListResponse } from '@/services/personalHoldingsApi'
import { isAuthenticated } from '@/services/auth'
import IndustryBreadthAnalysis from '@/components/IndustryBreadthAnalysis.vue'
import IndustryScaleBreadthPanel from '@/components/IndustryScaleBreadthPanel.vue'

// 当前激活的tab
const activeTab = ref('turnover')

// “仅看我的”开关与行业白名单
const onlyMine = ref(false)
const industryWhitelist = ref<string[]>([])

// 切换“仅看我的”时处理逻辑
const router = useRouter()
const handleOnlyMineChange = async () => {
  if (onlyMine.value) {
    // 需要登录后才能提取个人行业列表
    if (!isAuthenticated()) {
      ElMessage.error('请先登录后再启用“仅看我的”')
      onlyMine.value = false
      router.push('/login')
      return
    }
    try {
      const res: PersonalHoldingsListResponse = await getPersonalHoldings()
      // 抽取行业列表并去重
      const industries = Array.from(new Set((res.data?.list || [])
        .map(item => (item.industry || '').trim())
        .filter(name => !!name)))
      industryWhitelist.value = industries
      if (industries.length === 0) {
        ElMessage.warning('您的持有/关注列表为空，当前无可筛选的行业')
      } else {
        ElMessage.success(`已启用，仅展示 ${industries.length} 个相关行业`)
      }
    } catch (error) {
      console.error('获取个人持有/关注列表失败:', error)
      ElMessage.error('获取个人行业列表失败，请稍后重试')
      onlyMine.value = false
      industryWhitelist.value = []
    }
  } else {
    // 关闭时清空白名单，恢复展示全部
    industryWhitelist.value = []
  }
}

// tab切换处理
const handleTabChange = async (tabName: string) => {
  activeTab.value = tabName
  // 由于ECharts在容器隐藏时初始化会获取到0宽高，切换到可见后需要主动resize
  await nextTick()
  window.dispatchEvent(new Event('resize'))
}
</script>

<style scoped lang="scss">
.congestion-heatmap {
  padding: 20px;
  
  .header-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    
    h3 {
      margin: 0;
      color: #303133;
    }
  }
}

// 移动端优化
@media (max-width: 768px) {
  .congestion-heatmap {
    padding: 12px;

    .header-controls {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 8px;

      h3 {
        font-size: 16px;
        line-height: 1.2;
      }
    }
  }

  // 卡片内边距缩小
  :deep(.el-card__body) {
    padding: 12px;
  }

  // Tabs 标题在窄屏下可横向滚动，并缩小高度与字号
  .analysis-tabs {
    :deep(.el-tabs__header) {
      --el-tabs-header-height: 36px;
    }
    :deep(.el-tabs__nav-wrap) {
      overflow-x: auto;
      overflow-y: hidden;
    }
    :deep(.el-tabs__nav) {
      display: inline-flex;
      white-space: nowrap;
    }
    :deep(.el-tabs__item) {
      padding: 0 12px;
      font-size: 12px;
    }
  }
}
</style>