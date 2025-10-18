<template>
  <el-select 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
    placeholder="选择资金流指标" 
    style="width: 180px;"
  >
    <el-option 
      v-for="(config, key) in FUND_FLOW_METRICS" 
      :key="key" 
      :label="config.name" 
      :value="key" 
    />
  </el-select>
</template>

<script setup lang="ts">
import { FUND_FLOW_METRICS, FundFlowMetricType } from '@/services/industry-fund-flow'

/**
 * 资金流指标选择器组件
 * 
 * 功能：提供资金流指标的下拉选择器
 * 支持的指标包括：
 * - 全部净流入金额/占比
 * - 主力净流入金额/占比
 * - 超大单净流入金额/占比
 * - 大单净流入金额/占比
 * - 中单净流入金额/占比
 * - 小单净流入金额/占比
 * 
 * Props:
 * @param {FundFlowMetricType} modelValue - 当前选中的资金流指标类型
 * 
 * Events:
 * @event update:modelValue - 选择值变化时触发，用于v-model双向绑定
 * @event change - 选择值变化时触发，用于监听变化事件
 */

interface Props {
  modelValue: FundFlowMetricType
}

interface Emits {
  (e: 'update:modelValue', value: FundFlowMetricType): void
  (e: 'change', value: FundFlowMetricType): void
}

const { modelValue } = defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped lang="scss">
// 组件样式可以根据需要添加
</style>