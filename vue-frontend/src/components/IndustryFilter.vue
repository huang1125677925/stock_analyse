<template>
  <el-select
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
    multiple
    filterable
    clearable
    collapse-tags
    collapse-tags-tooltip
    placeholder="筛选行业（默认全部）"
    style="min-width: 220px; max-width: 400px;"
  >
    <el-option
      v-for="item in industryList"
      :key="item.code || item.industry"
      :label="item.industry"
      :value="item.industry"
    />
  </el-select>
</template>

<script setup lang="ts">
/**
 * 行业筛选多选下拉组件
 * 功能：
 * - 展示所有行业板块列表供用户多选筛选
 * - 支持v-model双向绑定选中的行业名称数组
 * - 选中为空时表示不过滤（显示全部）
 *
 * Props:
 * @param {string[]} modelValue - 当前选中的行业名称列表，通过v-model绑定
 *
 * Events:
 * @event update:modelValue - 选中值变化事件，用于v-model双向绑定
 * @event change - 选中值变化事件，用于监听变化
 */
import { ref, onMounted } from 'vue'
import { fetchIndustriesData, type Industry } from '@/services/industryApi'

interface Props {
  modelValue: string[]
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void
  (e: 'change', value: string[]): void
}

defineProps<Props>()
defineEmits<Emits>()

const industryList = ref<Industry[]>([])

const loadIndustries = async () => {
  try {
    const data = await fetchIndustriesData()
    industryList.value = data || []
  } catch (error) {
    console.error('加载行业列表失败:', error)
    industryList.value = []
  }
}

onMounted(() => {
  loadIndustries()
})
</script>

<style scoped lang="scss">
</style>