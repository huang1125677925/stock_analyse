<template>
  <el-card class="allocation-module">
    <template #header>
      <div class="card-header">
        <span>资产配置 (Asset Allocation)</span>
      </div>
    </template>

    <el-form :inline="true" :model="userProfile" class="demo-form-inline">
      <el-form-item label="年龄">
        <el-input-number v-model="userProfile.age" :min="18" :max="100" />
      </el-form-item>
      <el-form-item label="风险偏好">
        <el-select v-model="userProfile.riskTolerance" style="width: 80px;">
          <el-option label="保守" value="LOW" />
          <el-option label="稳健" value="MEDIUM" />
          <el-option label="激进" value="HIGH" />
        </el-select>
      </el-form-item>
      <el-form-item label="总资金(元)">
        <el-input-number v-model="userProfile.totalCapital" :step="10000" />
      </el-form-item>
    </el-form>

    <div ref="chartDom" style="width: 100%; height: 300px;"></div>

    <div class="allocation-details">
      <h4>配置详情 (150份策略)</h4>
      <p>每份金额: <strong>{{ onePartValue }}</strong> 元</p>

      <div class="dynamic-allocation" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #eee;">
        <h4>动态仓位建议 (基于市场温度)</h4>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
             <span>建议总仓位:</span>
             <span style="font-size: 1.2em; color: #409EFF; font-weight: bold;">{{ targetPosition.toFixed(1) }}%</span>
        </div>
         <div style="display: flex; justify-content: space-between; align-items: center;">
             <span>当前应投金额:</span>
             <span style="font-size: 1.2em; color: #67C23A; font-weight: bold;">¥{{ Number(suggestedEquityAmount).toLocaleString() }}</span>
        </div>
        <div style="font-size: 12px; color: #999; margin-top: 5px;">
            * 此金额为建议持有的权益类资产总市值
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import * as echarts from 'echarts';
import { generateBaseAllocation, calculatePartValue } from '../core';
import type { UserProfile } from '../types';
import { useMarketData } from '../useMarketData';

const { fetchEtfData, targetPosition } = useMarketData();

const userProfile = ref<UserProfile>({
  age: 30,
  riskTolerance: 'MEDIUM',
  totalCapital: 150000, // 150k means 1k per part
  monthlyCashFlow: 5000,
  investmentHorizonYears: 10
});

const chartDom = ref<HTMLElement | null>(null);
let myChart: echarts.ECharts | null = null;

const onePartValue = computed(() => calculatePartValue(userProfile.value.totalCapital).toFixed(0));

/**
 * Calculate the suggested equity investment amount based on total capital and market temperature.
 * Dynamic Position = Total Capital * Target Position %
 */
const suggestedEquityAmount = computed(() => {
  return (userProfile.value.totalCapital * (targetPosition.value / 100)).toFixed(0);
});

const updateChart = () => {
  if (!myChart) return;
  const allocation = generateBaseAllocation(userProfile.value);
  
  const data = allocation.map(a => ({
    value: a.targetRatio,
    name: mapCategoryName(a.category)
  }));

  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      top: '5%',
      left: 'center'
    },
    series: [
      {
        name: 'Target Allocation',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data
      }
    ]
  };

  myChart.setOption(option);
};

const mapCategoryName = (cat: string) => {
  const map: Record<string, string> = {
    'STOCK_CN': 'A股资产',
    'STOCK_US': '美股/全球',
    'BOND': '债券/固收',
    'COMMODITY': '商品/抗通胀'
  };
  return map[cat] || cat;
};

onMounted(() => {
  if (chartDom.value) {
    myChart = echarts.init(chartDom.value);
    updateChart();
  }
  // Fetch market data for dynamic allocation suggestion
  fetchEtfData();
});

watch(userProfile, () => {
  updateChart();
}, { deep: true });
</script>

<style scoped>
.allocation-module {
  margin-top: 20px;
}
</style>
