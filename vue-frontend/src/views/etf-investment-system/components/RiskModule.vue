<template>
  <el-card class="risk-module">
    <template #header>
      <div class="card-header">
        <span>压力测试 (Risk Management)</span>
        <el-tag type="danger">保住本金</el-tag>
      </div>
    </template>

    <div class="simulation">
      <h4>极端行情模拟器</h4>
      <p>假设市场发生系统性风险，你的组合能承受多大跌幅？</p>
      
      <div class="slider-block">
        <span>市场下跌幅度: {{ drawdown }}%</span>
        <el-slider v-model="drawdown" :min="0" :max="70" :step="5" show-stops />
      </div>

      <div class="result-block">
        <el-statistic title="当前总资产" :value="currentAssets" prefix="¥" />
        <el-statistic 
          title="模拟后资产" 
          :value="simulatedAssets" 
          prefix="¥" 
          value-style="color: red"
        />
        <el-statistic 
          title="最大回撤金额" 
          :value="currentAssets - simulatedAssets" 
          prefix="- ¥" 
        />
      </div>

      <el-alert
        v-if="drawdown > 50"
        title="警告：这是历史级的大崩盘 (如2008年)。请确保你有足够的现金流生活，不要被迫在底部卖出。"
        type="error"
        effect="dark"
        style="margin-top: 20px;"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const drawdown = ref(30);
const currentAssets = ref(150000); // Mock total assets

// Simple simulation: Stocks drop by drawdown%, Bonds drop by 10% of that
// Assuming 50/50 split for demo
const simulatedAssets = computed(() => {
  const stockPart = currentAssets.value * 0.5;
  const bondPart = currentAssets.value * 0.5;

  const stockLoss = stockPart * (drawdown.value / 100);
  const bondLoss = bondPart * (drawdown.value / 100 * 0.2); // Bonds correlate weakly

  return Math.floor(currentAssets.value - stockLoss - bondLoss);
});
</script>

<style scoped>
.risk-module {
  margin-top: 20px;
}
.result-block {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  background: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
}
</style>
