<template>
  <el-radio-group 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
    size="small"
  >
    <el-radio-button label="turnover">成交金额占比分位数</el-radio-button>
    <el-radio-button label="performance">行业业绩指标</el-radio-button>
    <el-radio-button label="fundflow">行业资金流</el-radio-button>
  </el-radio-group>
</template>

<script setup lang="ts">
/**
 * 热力图类型选择器组件
 * 
 * 功能：提供三种热力图类型的单选按钮组
 * - turnover: 成交金额占比分位数
 * - performance: 行业业绩指标  
 * - fundflow: 行业资金流
 * 
 * Props:
 * @param {string} modelValue - 当前选中的热力图类型
 * 
 * Events:
 * @event update:modelValue - 选择值变化时触发，用于v-model双向绑定
 * @event change - 选择值变化时触发，用于监听变化事件
 */

interface Props {
  modelValue: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

const { modelValue } = defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped lang="scss">
// 组件样式可以根据需要添加
</style>