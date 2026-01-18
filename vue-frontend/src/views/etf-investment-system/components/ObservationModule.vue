<template>
  <el-card class="observation-module">
    <template #header>
      <div class="card-header">
        <span>观察与诊断体系 (Market Observation)</span>
        <el-tag :type="marketTempTagType">{{ marketStatusText }}</el-tag>
      </div>
    </template>

    <el-table :data="etfList" style="width: 100%" :row-class-name="tableRowClassName">
      <el-table-column prop="name" label="ETF名称" width="120" />
      <el-table-column prop="code" label="代码" width="100" />
      <el-table-column label="PE / 分位" width="150">
        <template #default="scope">
          <span>{{ scope.row.pe }} ({{ scope.row.pePercentile }}%)</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.pePercentile)">{{ getStatusText(scope.row.pePercentile) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作建议">
        <template #default="scope">
          <span class="action-text">{{ getActionSuggestion(scope.row.pePercentile) }}</span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getMockEtfData, getValuationStatus } from '../core';
import type { EtfData } from '../types';

// Mock Data
const etfList = ref<EtfData[]>(getMockEtfData());

// Helpers
const getStatusText = (percentile: number) => {
  const status = getValuationStatus(percentile);
  const map: Record<string, string> = {
    'DIAMOND_PIT': '钻石坑 (极低)',
    'OPPORTUNITY': '机会区 (低)',
    'NORMAL': '正常持有',
    'OVERVALUED': '高估 (减)',
    'BUBBLE': '泡沫 (清)'
  };
  return map[status];
};

const getStatusType = (percentile: number) => {
  const status = getValuationStatus(percentile);
  if (status === 'DIAMOND_PIT') return 'success';
  if (status === 'OPPORTUNITY') return 'primary';
  if (status === 'NORMAL') return 'info';
  if (status === 'OVERVALUED') return 'warning';
  return 'danger';
};

const getActionSuggestion = (percentile: number) => {
  const status = getValuationStatus(percentile);
  if (status === 'DIAMOND_PIT') return '双倍定投 / 大额买入';
  if (status === 'OPPORTUNITY') return '开始定投 / 分批买入';
  if (status === 'NORMAL') return '持有 / 网格交易';
  if (status === 'OVERVALUED') return '停止买入 / 分批止盈';
  return '清仓 / 换仓';
};

// Market Temperature Logic (Average of all percentiles for simplicity)
const marketTemp = computed(() => {
  const sum = etfList.value.reduce((acc, cur) => acc + cur.pePercentile, 0);
  return sum / etfList.value.length;
});

const marketStatusText = computed(() => {
  if (marketTemp.value < 30) return '市场极冷 (遍地黄金)';
  if (marketTemp.value > 70) return '市场过热 (风险积聚)';
  return '市场温度适中';
});

const marketTempTagType = computed(() => {
  if (marketTemp.value < 30) return 'success';
  if (marketTemp.value > 70) return 'danger';
  return 'info';
});

const tableRowClassName = ({ row }: { row: EtfData }) => {
  if (row.pePercentile < 20) return 'success-row';
  if (row.pePercentile > 80) return 'warning-row';
  return '';
};
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.action-text {
  font-weight: bold;
}
</style>
