<template>
  <el-card class="trade-module">
    <template #header>
      <div class="card-header">
        <span>交易策略执行 (Execution)</span>
        <el-tag type="warning">纪律是铁</el-tag>
      </div>
    </template>

    <div class="plan-section">
      <h3>本月操作计划</h3>
      <el-alert
        title="执行原则: 空间和时间，至少要占其一。越跌越买，非平均买入。"
        type="info"
        show-icon
        :closable="false"
      />
      
      <el-table :data="tradeSuggestions" style="width: 100%; margin-top: 15px;">
        <el-table-column prop="name" label="标的" />
        <el-table-column prop="action" label="动作">
          <template #default="scope">
            <el-tag :type="scope.row.action === 'BUY' ? 'success' : 'danger'">{{ scope.row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantityParts" label="份数" />
        <el-table-column prop="reason" label="逻辑依据" />
      </el-table>
    </div>

    <div class="grid-section">
      <h3>网格策略 (波段增强)</h3>
      <p>当前适合开启网格的品种：</p>
      <div v-for="etf in gridCandidates" :key="etf.code" class="grid-item">
        <el-tag>{{ etf.name }}</el-tag>
        <span> 波动率适中，估值正常，适合5%网格。</span>
      </div>
      <div v-if="gridCandidates.length === 0">无推荐品种</div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { getMockEtfData, getValuationStatus } from '../core';
import type { TradeInstruction } from '../types';

const etfs = getMockEtfData();

const tradeSuggestions = computed(() => {
  const plans: TradeInstruction[] = [];
  
  etfs.forEach(etf => {
    const status = getValuationStatus(etf.pePercentile);
    
    if (status === 'DIAMOND_PIT') {
      plans.push({
        code: etf.code,
        name: etf.name,
        action: 'BUY',
        quantityParts: 2, // Double buy
        reason: '极度低估 (钻石坑)，加倍买入'
      });
    } else if (status === 'OPPORTUNITY') {
      plans.push({
        code: etf.code,
        name: etf.name,
        action: 'BUY',
        quantityParts: 1,
        reason: '低估区域，正常定投'
      });
    } else if (status === 'BUBBLE') {
      plans.push({
        code: etf.code,
        name: etf.name,
        action: 'SELL',
        quantityParts: 1, // Sell logic is complex, simplify here
        reason: '严重泡沫，分批止盈'
      });
    }
  });
  
  return plans;
});

const gridCandidates = computed(() => {
  return etfs.filter(etf => {
    const status = getValuationStatus(etf.pePercentile);
    return status === 'NORMAL'; // Normal valuation is best for grid
  });
});
</script>

<style scoped>
.trade-module {
  margin-top: 20px;
}
.grid-item {
  margin-top: 10px;
}
</style>
