<template>
  <el-select 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
    placeholder="选择指标" 
    style="width: 180px;"
  >
    <el-option 
      v-for="(config, key) in HEATMAP_METRICS" 
      :key="key" 
      :label="config.name" 
      :value="key" 
    />
  </el-select>
</template>

<script setup lang="ts">
import { HEATMAP_METRICS, HeatmapMetricType } from '@/services/industry-heatmap'

/**
 * 业绩指标选择器组件
 * 
 * 功能：提供业绩指标的下拉选择器
 * 支持的指标包括：
 * - 营业收入增长率
 * - 净利润增长率  
 * - 总营业收入
 * - 总净利润
 * - 每股收益
 * - 净资产收益率
 * - 毛利率
 * - 每股净资产
 * - 每股经营现金流
 * 
 * Props:
 * @param {HeatmapMetricType} modelValue - 当前选中的指标类型
 * 
 * Events:
 * @event update:modelValue - 选择值变化时触发，用于v-model双向绑定
 * @event change - 选择值变化时触发，用于监听变化事件
 */

interface Props {
  modelValue: HeatmapMetricType
}

interface Emits {
  (e: 'update:modelValue', value: HeatmapMetricType): void
  (e: 'change', value: HeatmapMetricType): void
}

const { modelValue } = defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped lang="scss">
// 组件样式可以根据需要添加
</style>