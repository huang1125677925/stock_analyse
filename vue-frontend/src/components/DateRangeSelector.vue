<template>
  <el-select 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
    placeholder="选择日期范围" 
    style="width: 150px;"
  >
    <el-option label="最近10天" value="10" />
    <el-option label="最近15天" value="15" />
    <el-option label="最近20天" value="20" />
    <el-option label="全部29天" value="all" />
  </el-select>
</template>

<script setup lang="ts">
/**
 * 日期范围选择器组件
 * 
 * 功能：提供日期范围的下拉选择器
 * 支持的日期范围包括：
 * - 最近10天
 * - 最近15天
 * - 最近20天
 * - 全部29天
 * 
 * Props:
 * @param {string} modelValue - 当前选中的日期范围值
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