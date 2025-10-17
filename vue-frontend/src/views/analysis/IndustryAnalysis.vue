<template>
  <div class="industry-analysis">
    <!-- 筛选控制面板 -->
    <el-card class="filter-panel" shadow="hover">
      <div class="filter-row">
        <!-- 行业选择 -->
        <div class="filter-item">
          <label class="filter-label">选择行业：</label>
          <el-select
            v-model="selectedIndustry"
            placeholder="请选择行业"
            style="width: 200px"
            @change="handleIndustryChange"
          >
            <el-option
              v-for="industry in industryList"
              :key="industry.name"
              :label="industry.name"
              :value="industry.name"
            />
          </el-select>
        </div>

        <!-- 季度选择 -->
        <div class="filter-item">
          <label class="filter-label">选择季度：</label>
          <el-select
            v-model="selectedQuarter"
            placeholder="请选择季度"
            style="width: 150px"
            @change="handleQuarterChange"
          >
            <el-option
              v-for="quarter in quarterOptions"
              :key="quarter.value"
              :label="quarter.label"
              :value="quarter.value"
            />
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- 趋势图表展示区域 -->
    <IndustryTrendCharts
      v-if="selectedIndustry && selectedQuarter"
      :industry="selectedIndustry"
      :quarter="selectedQuarter"
      :industry-name="selectedIndustryName"
      :quarter-name="selectedQuarterName"
    />

    <!-- 空状态 -->
    <el-empty
      v-if="!selectedIndustry || !selectedQuarter"
      description="请选择行业和季度查看趋势分析"
      :image-size="200"
    />

    <!-- 资金流热力图 -->
    <el-card 
      class="fund-flow-panel" 
      shadow="hover" 
      v-if="selectedIndustry && selectedIndustry !== 'all'"
    >
      <IndustryFundFlowHeatmap 
        :industry="selectedIndustryName"
        :title="`${selectedIndustryName} - 资金流热力图`"
      />
    </el-card>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <el-loading
        element-loading-text="正在加载数据..."
        element-loading-spinner="el-icon-loading"
        element-loading-background="rgba(0, 0, 0, 0.8)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 行业分析页面组件
 * 功能：
 * 1. 提供行业选择、季度选择的交互界面
 * 2. 集成IndustryTrendCharts组件显示三个趋势图
 * 3. 集成IndustryFundFlowHeatmap组件显示资金流热力图
 * 4. 行业变更时同时更新趋势图和资金流数据
 * 5. 季度变更时只更新趋势图数据
 * 
 * 参数：无
 * 返回值：无
 * 事件：无
 */

import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  getIndustrySectors, 
  type IndustrySector
} from '../../services/industryAnalysisApi'
import IndustryFundFlowHeatmap from '../../components/IndustryFundFlowHeatmap.vue'
import IndustryTrendCharts from '../../components/IndustryTrendCharts.vue'

// 响应式数据
const loading = ref(false)

// 筛选条件
const selectedIndustry = ref<string>()
const selectedQuarter = ref<string>('')

// 基础数据
const industryList = ref<IndustrySector[]>([])

// 选项配置
const quarterOptions = ref([
  { label: '年报', value: 'annual' },
  { label: '中报', value: 'semi_annual' },
  { label: '一季报', value: 'q1' },
  { label: '三季报', value: 'q3' },
  { label: '季报', value: 'quarterly' },
])

// 计算属性
const selectedIndustryName = computed(() => {
  if (selectedIndustry.value === 'all') return '全部行业'
  const industry = industryList.value.find(item => item.name === selectedIndustry.value)
  return industry?.name || '未知行业'
})

const selectedQuarterName = computed(() => {
  const quarter = quarterOptions.value.find(item => item.value === selectedQuarter.value)
  return quarter?.label || '未选择'
})

// 方法
/**
 * 初始化页面数据
 */
const initializeData = async () => {
  loading.value = true
  try {
    // 获取行业列表
    const response = await getIndustrySectors()
    console.log('获取行业列表响应:', response)
    industryList.value = response.sectors
    console.log('行业列表:', industryList.value)
    
    // 设置默认值
    if (quarterOptions.value.length > 0) {
      selectedQuarter.value = quarterOptions.value[0].value
    }
    
    ElMessage.success('页面初始化完成')
  } catch (error) {
    console.error('初始化数据失败:', error)
    ElMessage.error('初始化数据失败，请刷新页面重试')
  } finally {
    loading.value = false
  }
}

/**
 * 事件处理
 * 行业变更时同时更新趋势图和资金流数据
 */
const handleIndustryChange = () => {
  // 行业变更时，IndustryTrendCharts组件会自动重新获取数据
  // IndustryFundFlowHeatmap组件也会根据新的industry prop自动更新
  console.log('行业已变更为:', selectedIndustry.value)
}

/**
 * 季度变更时只更新趋势图数据
 */
const handleQuarterChange = () => {
  // 季度变更时，只有IndustryTrendCharts组件会重新获取数据
  // IndustryFundFlowHeatmap组件不受季度变更影响
  console.log('季度已变更为:', selectedQuarter.value)
}

// 生命周期
onMounted(() => {
  initializeData()
})
</script>

<style scoped>
.industry-analysis {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.filter-panel {
  margin-bottom: 24px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.fund-flow-panel {
  margin-top: 24px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 1000;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .industry-analysis {
    padding: 16px;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .filter-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}
</style>