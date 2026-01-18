<template>
  <div class="etf-system-container">
    <div class="header">
      <h1>全天候ETF投资指导系统</h1>
      <p class="subtitle">E大投资哲学 | 价值平均策略 | 150份长赢计划</p>
    </div>

    <el-tabs v-model="activeTab" class="system-tabs">
      <el-tab-pane label="仪表盘 (Dashboard)" name="dashboard">
        <el-row :gutter="20">
          <el-col :span="24">
            <ObservationModule />
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :xs="24" :md="12">
            <AssetAllocationModule />
          </el-col>
          <el-col :xs="24" :md="12">
            <TradeExecutionModule />
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :xs="24" :md="12">
            <RiskModule />
          </el-col>
          <el-col :xs="24" :md="12">
            <MindsetModule />
          </el-col>
        </el-row>
      </el-tab-pane>
      
      <el-tab-pane label="详细策略说明" name="docs">
        <el-card>
          <template #header>核心哲学基石</template>
          <ul>
            <li><strong>人类没有预测能力</strong>：完全摒弃依靠“感觉”或“分析”去预测市场涨跌的思维。</li>
            <li><strong>依赖体系而非个人</strong>：目标是构建一个“我离开后，我儿子还能用”的百年系统。</li>
            <li><strong>量化投资是普通人的最佳路径</strong>：基于规则的量化投资是唯一可行且高效的长期制胜方法。</li>
            <li><strong>投资世界观</strong>：在熊市中于“价值区域”慢慢买入，微笑面对波动。</li>
          </ul>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ObservationModule from './components/ObservationModule.vue';
import AssetAllocationModule from './components/AssetAllocationModule.vue';
import TradeExecutionModule from './components/TradeExecutionModule.vue';
import RiskModule from './components/RiskModule.vue';
import MindsetModule from './components/MindsetModule.vue';

const activeTab = ref('dashboard');
</script>

<style scoped>
.etf-system-container {
  padding: 20px;
  background-color: #f0f2f5;
  min-height: 100vh;
}
.header {
  text-align: center;
  margin-bottom: 20px;
}
.subtitle {
  color: #666;
  font-size: 14px;
}
</style>
