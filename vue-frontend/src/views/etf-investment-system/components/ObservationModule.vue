<template>
  <el-card class="observation-module">
    <template #header>
      <div class="card-header">
        <span>观察与诊断体系 (Market Observation)</span>
        <el-tag :type="marketTempTagType">{{ marketStatusText }}</el-tag>
      </div>
    </template>

    <div class="market-summary" style="margin-bottom: 20px;">
      <div class="thermometer-label" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span>全市场估值温度 (Percentile):</span>
        <span style="font-weight: bold;">{{ marketTemp.toFixed(1) }}%</span>
      </div>
      <el-progress 
        :percentage="marketTemp" 
        :color="tempColor" 
        :stroke-width="18" 
        :format="formatTemp"
      />
      <div class="thermometer-legend" style="display: flex; justify-content: space-between; font-size: 12px; color: #909399; margin-top: 5px;">
        <span>0% (极冷)</span>
        <span>100% (极热)</span>
      </div>
    </div>

    <el-table :data="etfList" style="width: 100%" :row-class-name="tableRowClassName">
      <el-table-column prop="name" label="指数名称" width="120" />
      <el-table-column prop="code" label="代码" width="100" />
      <el-table-column label="PE / 10年分位" width="150">
        <template #default="scope">
          <span>{{ scope.row.pe.toFixed(2) }} ({{ scope.row.pePercentile.toFixed(1) }}%)</span>
        </template>
      </el-table-column>
      <el-table-column label="PB / 10年分位" width="150">
        <template #default="scope">
          <span>{{ scope.row.pb.toFixed(2) }} ({{ scope.row.pbPercentile.toFixed(1) }}%)</span>
        </template>
      </el-table-column>
      <el-table-column label="市值 (万亿)" width="120">
        <template #default="scope">
          <span>{{ (scope.row.totalMv / 1000000000000).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
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
import { computed, ref, onMounted } from 'vue';
import { getMockEtfData, getValuationStatus } from '../core';
import type { EtfData } from '../types';
import axios from '@/services/axiosConfig';

// Extend EtfData locally to include totalMv if not present in global types
interface ExtendedEtfData extends EtfData {
  totalMv: number;
}

// Data
const etfList = ref<ExtendedEtfData[]>([]);

const fetchEtfData = async () => {
  try {
    const response = await axios.get('/django/api/index/index-valuation-summary/');
    // Check if response has data property (wrapped response) or is the data itself
    const data = response.data || response;
    // Handle array directly or wrapped in results/items
    const results = Array.isArray(data) ? data : (data.results || data.items);
    
    if (results) {
      etfList.value = results.map((item: any) => ({
        code: item.value,
        name: item.label,
        category: 'STOCK_CN',
        pe: item.pe,
        pePercentile: item.pe_quantile_10y * 100, // Use 10y percentile
        pb: item.pb,
        pbPercentile: item.pb_quantile_10y * 100, // Use 10y percentile
        currentPrice: 0,
        maxDrawdownHistory: 0,
        totalMv: item.total_mv
      }));
    } else {
      // Fallback to mock data if API fails or empty
      etfList.value = getMockEtfData().map(d => ({ ...d, totalMv: 0 }));
    }
  } catch (error) {
    console.error('Failed to fetch ETF data:', error);
    etfList.value = getMockEtfData().map(d => ({ ...d, totalMv: 0 }));
  }
};

onMounted(() => {
  fetchEtfData();
});

const tempColor = [
  { color: '#67c23a', percentage: 30 },
  { color: '#e6a23c', percentage: 70 },
  { color: '#f56c6c', percentage: 100 },
];

const formatTemp = (percentage: number) => {
  return percentage < 30 ? '低估' : percentage > 70 ? '高估' : '正常';
};

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
