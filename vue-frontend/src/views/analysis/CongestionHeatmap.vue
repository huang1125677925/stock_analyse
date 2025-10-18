<template>
  <div class="congestion-heatmap">
    <el-card>
      
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="成交金额占比分位数" name="turnover">
          <TurnoverAnalysis />
        </el-tab-pane>
        
        <el-tab-pane label="行业业绩指标" name="performance">
          <PerformanceAnalysis />
        </el-tab-pane>
        
        <el-tab-pane label="行业资金流" name="fundflow">
          <FundFlowAnalysis />
        </el-tab-pane>
        
        <el-tab-pane label="行业矩形树图" name="treemap">
          <IndustryTreemap />
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
 * 功能：提供tab切换功能，展示不同类型的行业分析；在切换时触发图表尺寸重算以避免ECharts隐藏容器初始化导致的尺寸异常
 * 参数：无
 * 返回值：无
 * 事件：无
 */
import { ref, nextTick } from 'vue'
import TurnoverAnalysis from '@/components/TurnoverAnalysis.vue'
import PerformanceAnalysis from '@/components/PerformanceAnalysis.vue'
import FundFlowAnalysis from '@/components/FundFlowAnalysis.vue'
import IndustryTreemap from '@/components/IndustryTreemap.vue'
import IndexRpsView from '@/views/strategy/IndexRpsView.vue'

// 当前激活的tab
const activeTab = ref('turnover')

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
    
    h3 {
      margin: 0;
      color: #303133;
    }
  }
}
</style>