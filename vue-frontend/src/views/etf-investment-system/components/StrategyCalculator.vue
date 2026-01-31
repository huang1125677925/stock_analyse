<template>
  <el-card class="strategy-calculator">
    <template #header>
      <div class="card-header">
        <span>策略计算器 (Interactive Tools)</span>
      </div>
    </template>

    <el-tabs type="border-card">
      <el-tab-pane label="网格交易模拟器">
        <el-form :model="gridForm" label-width="120px">
          <el-form-item label="起始价格">
            <el-input-number v-model="gridForm.startPrice" :precision="2" :step="0.1" />
          </el-form-item>
          <el-form-item label="网格大小 (%)">
            <el-input-number v-model="gridForm.gridSize" :precision="1" :step="0.5" />
          </el-form-item>
          <el-form-item label="单份投入金额">
            <el-input-number v-model="gridForm.amountPerGrid" :step="1000" />
          </el-form-item>
          <el-form-item label="预设最大跌幅 (%)">
            <el-input-number v-model="gridForm.maxDrop" :precision="0" :step="5" />
          </el-form-item>
        </el-form>

        <div class="calculation-result" v-if="gridData.length > 0">
          <el-divider content-position="left">压力测试结果</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-statistic title="所需总资金" :value="totalCapitalRequired" prefix="¥" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="网格档数" :value="gridData.length" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="最低买入价" :value="gridData[gridData.length-1].price" prefix="¥" :precision="3" />
            </el-col>
          </el-row>

          <el-table :data="gridData" style="width: 100%; margin-top: 20px" height="250">
            <el-table-column prop="index" label="档位" width="80" />
            <el-table-column prop="drop" label="累计跌幅" width="100">
              <template #default="scope">-{{ scope.row.drop }}%</template>
            </el-table-column>
            <el-table-column prop="price" label="买入价格" width="120">
               <template #default="scope">¥{{ scope.row.price }}</template>
            </el-table-column>
            <el-table-column prop="amount" label="投入金额" />
            <el-table-column prop="total" label="累计投入" />
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="目标市值跟踪">
        <el-form :model="targetForm" label-width="120px">
          <el-form-item label="初始投入">
            <el-input-number v-model="targetForm.initialCapital" :step="10000" />
          </el-form-item>
          <el-form-item label="目标涨幅/期 (%)">
             <el-input-number v-model="targetForm.targetGrowth" :step="0.5" />
          </el-form-item>
          <el-form-item label="当前期数">
            <el-input-number v-model="targetForm.period" :min="1" />
          </el-form-item>
           <el-form-item label="当前实际市值">
            <el-input-number v-model="targetForm.currentValue" :step="1000" />
          </el-form-item>
        </el-form>

        <div class="target-result">
           <el-divider content-position="left">操作建议</el-divider>
           <p>第 {{ targetForm.period }} 期目标市值应为：<strong style="color: #409EFF">¥{{ targetMarketValue.toFixed(2) }}</strong></p>
           <p>当前实际市值：<strong>¥{{ targetForm.currentValue }}</strong></p>
           <el-alert
            :title="targetAction.title"
            :type="targetAction.type"
            :description="targetAction.desc"
            show-icon
            :closable="false"
          />
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// --- Grid Simulator ---
const gridForm = ref({
  startPrice: 10.00,
  gridSize: 5.0,
  amountPerGrid: 10000,
  maxDrop: 50
});

const gridData = computed(() => {
  const { startPrice, gridSize, amountPerGrid, maxDrop } = gridForm.value;
  const grids = [];
  let currentDrop = 0;
  let accumulated = 0;
  let index = 0;

  // Base grid (0%)
  accumulated += amountPerGrid;
  grids.push({
    index: index++,
    drop: 0,
    price: startPrice.toFixed(3),
    amount: amountPerGrid,
    total: accumulated
  });

  while (currentDrop < maxDrop && gridSize > 0) {
    currentDrop += gridSize;
    if (currentDrop > maxDrop) break; // Ensure we don't overshoot significantly or if precision issues occur

    const price = startPrice * (1 - currentDrop / 100);
    accumulated += amountPerGrid;
    grids.push({
      index: index++,
      drop: currentDrop.toFixed(1),
      price: price.toFixed(3),
      amount: amountPerGrid,
      total: accumulated
    });
    
    // Safety break to prevent infinite loops if logic fails
    if (index > 1000) break;
  }
  return grids;
});

const totalCapitalRequired = computed(() => {
  if (gridData.value.length === 0) return 0;
  return gridData.value[gridData.value.length - 1].total;
});

// --- Target Market Value ---
const targetForm = ref({
  initialCapital: 100000,
  targetGrowth: 3.0, // 3% per period
  period: 1,
  currentValue: 102000
});

const targetMarketValue = computed(() => {
  const { initialCapital, targetGrowth, period } = targetForm.value;
  return initialCapital * Math.pow(1 + targetGrowth / 100, period);
});

const targetAction = computed(() => {
  const diff = targetForm.value.currentValue - targetMarketValue.value;
  if (diff > 0) {
    return {
      title: `卖出止盈 ¥${diff.toFixed(2)}`,
      type: 'warning',
      desc: '当前市值高于目标市值，请卖出多余部分，落袋为安。'
    };
  } else if (diff < 0) {
    return {
      title: `买入补仓 ¥${Math.abs(diff).toFixed(2)}`,
      type: 'success',
      desc: '当前市值低于目标市值，请补仓以跟上增长曲线。'
    };
  } else {
    return {
      title: '保持持有',
      type: 'info',
      desc: '当前市值完美符合目标。'
    };
  }
});
</script>

<style scoped>
.strategy-calculator {
  margin-top: 20px;
}
.calculation-result {
  margin-top: 20px;
}
</style>
