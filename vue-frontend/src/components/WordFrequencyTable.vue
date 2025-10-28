<template>
  <div class="word-frequency-table">
    <el-card shadow="never">
      <template #header>
        <div class="table-header">
          <span>词频统计列表</span>
          <div class="actions">
            <el-input v-model="keyword" placeholder="搜索词" clearable style="width: 220px" />
          </div>
        </div>
      </template>
      <el-table
        :data="paginatedData"
        style="width: 100%"
        stripe
        border
        @sort-change="handleSortChange"
      >
        <el-table-column type="index" label="#" width="80" />
        <el-table-column prop="word" label="词" min-width="180" />
        <el-table-column prop="count" label="频次" width="120" sortable="custom" />
      </el-table>

      <div class="table-footer">
        <el-pagination
          background
          layout="prev, pager, next, total"
          :total="filteredData.length"
          :page-size="pageSize"
          :current-page="currentPage"
          @current-change="(p: number) => (currentPage = p)"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { WordItem } from '@/services/newsWordcloudApi'

interface Props {
  words: WordItem[]
}

const props = defineProps<Props>()

// 搜索与排序
const keyword = ref('')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 分页
const pageSize = 10
const currentPage = ref(1)

// 过滤数据
const filteredData = computed(() => {
  const kw = keyword.value.trim()
  const base = kw ? props.words.filter(w => w.word.includes(kw)) : props.words
  const sorted = [...base].sort((a, b) => sortOrder.value === 'desc' ? b.count - a.count : a.count - b.count)
  return sorted
})

// 分页数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredData.value.slice(start, start + pageSize)
})

function handleSortChange({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }) {
  if (prop !== 'count' || !order) return
  sortOrder.value = order === 'descending' ? 'desc' : 'asc'
}

// 当数据变化时重置到第一页
watch(() => props.words, () => {
  currentPage.value = 1
})
</script>

<style scoped>
.word-frequency-table {
  margin-top: 16px;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>