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
      v-for="name in displayList"
      :key="name"
      :label="name"
      :value="name"
    />
  </el-select>
</template>

<script setup lang="ts">
/**
 * 行业筛选多选下拉组件
 * 功能：
 * - 支持v-model双向绑定选中的行业名称数组
 * - 选中为空时表示不过滤（显示全部）
 * - 两种数据源模式：
 *   1. 外部驱动：当 industries prop 被显式传入时，直接使用该列表
 *   2. 自行获取：当 industries prop 未传入时，自动从 API 获取行业列表
 *
 * Props:
 * @param {string[]} modelValue - 当前选中的行业名称列表，通过v-model绑定
 * @param {string[] | undefined} industries - 可选的行业名称列表，传入时使用外部数据驱动
 *
 * Events:
 * @event update:modelValue - 选中值变化事件，用于v-model双向绑定
 * @event change - 选中值变化事件，用于监听变化
 */
import { ref, computed, onMounted } from 'vue'
import { fetchIndustriesData, type Industry } from '@/services/industryApi'

interface Props {
  modelValue: string[]
  industries?: string[]
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void
  (e: 'change', value: string[]): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

/** 内部通过 API 获取的行业列表（仅在 industries prop 未传入时使用） */
const fetchedList = ref<Industry[]>([])

/** 是否使用外部传入的行业列表 */
const useExternal = computed(() => props.industries !== undefined)

/** 实际展示的行业名称列表 */
const displayList = computed<string[]>(() => {
  if (useExternal.value) {
    return props.industries!
  }
  return fetchedList.value.map(item => item.industry)
})

/** 自行获取行业列表（仅在未传入 industries prop 时调用） */
const loadIndustries = async () => {
  if (useExternal.value) return
  try {
    const data = await fetchIndustriesData()
    fetchedList.value = data || []
  } catch (error) {
    console.error('加载行业列表失败:', error)
    fetchedList.value = []
  }
}

onMounted(() => {
  loadIndustries()
})
</script>

<style scoped lang="scss">
</style>