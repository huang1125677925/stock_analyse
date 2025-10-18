<template>
  <el-select 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
    placeholder="选择日期范围" 
    style="width: 150px;"
  >
    <!-- 按天模式的选项 -->
    <template v-if="!weekFlag">
      <el-option label="最近5天" value="5" />
      <el-option label="最近10天" value="10" />
      <el-option label="最近15天" value="15" />
      <el-option label="最近20天" value="20" />
      <el-option label="全部29天" value="all" />
    </template>
    
    <!-- 按周模式的选项 -->
    <template v-else>
      <el-option label="最近5周" value="5" />
      <el-option label="最近10周" value="10" />
      <el-option label="最近20周" value="20" />
    </template>
  </el-select>
</template>

<script setup lang="ts">
/**
 * 日期范围选择器组件
 * 
 * 功能：提供日期范围的下拉选择器，支持按天和按周两种模式
 * 
 * 按天模式支持的日期范围：
 * - 最近5天
 * - 最近10天
 * - 最近15天
 * - 最近20天
 * - 全部29天
 * 
 * 按周模式支持的日期范围：
 * - 最近5周（默认）
 * - 最近10周
 * - 最近20周
 * 
 * Props:
 * @param {string} modelValue - 当前选中的日期范围值
 * @param {boolean} weekFlag - 周期标志，false为按天，true为按周
 * 
 * Events:
 * @event update:modelValue - 选择值变化时触发，用于v-model双向绑定
 * @event change - 选择值变化时触发，用于监听变化事件
 */

interface Props {
  modelValue: string
  weekFlag?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

const { modelValue, weekFlag = false } = defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped lang="scss">
// 组件样式可以根据需要添加
</style>