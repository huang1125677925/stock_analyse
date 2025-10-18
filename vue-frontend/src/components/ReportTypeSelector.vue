<template>
  <el-select 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
    placeholder="选择报告类型" 
    style="width: 120px;"
  >
    <el-option label="年报" value="annual" />
    <el-option label="中报" value="semi_annual" />
    <el-option label="一季报" value="q1" />
    <el-option label="三季报" value="q3" />
    <el-option label="季报" value="quarterly" />
  </el-select>
</template>

<script setup lang="ts">
/**
 * 报告类型选择器组件
 * 
 * 功能：提供财务报告类型的下拉选择器
 * 支持的报告类型包括：
 * - annual: 年报
 * - semi_annual: 中报
 * - q1: 一季报
 * - q3: 三季报
 * - quarterly: 季报
 * 
 * Props:
 * @param {string} modelValue - 当前选中的报告类型
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