<template>
  <div class="news-wordcloud-view">
    <el-card shadow="hover" class="page-header">
      <div class="header-content">
        <h2>新闻利好分析词云统计</h2>
        <p>统计指定日期范围内 CCTV 新闻 AI 内容的高频词，用于词云展示。</p>
      </div>
    </el-card>

    <el-card shadow="hover" class="query-panel">
      <template #header>
        <div class="panel-header">
          <span>查询条件</span>
        </div>
      </template>
      <div class="query-form">
        <el-form :inline="true" label-width="80px">
          <el-form-item label="日期范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="Top N">
            <el-input-number v-model="topN" :min="1" :max="500" />
          </el-form-item>
          <el-form-item label="最小长度">
            <el-input-number v-model="minLen" :min="1" :max="10" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="loadData">查询</el-button>
            <el-button @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <el-card shadow="hover" class="result-panel" v-loading="loading">
      <template #header>
        <div class="panel-header">
          <span>词云结果</span>
          <div class="stats" v-if="stats">
            <span>词总数：{{ stats.total }}</span>
            <span class="divider">|</span>
            <span>区间：{{ stats.query.start_date }} 至 {{ stats.query.end_date }}</span>
            <span class="divider">|</span>
            <span>TopN：{{ stats.query.top_n }} 最小长度：{{ stats.query.min_len }}</span>
          </div>
        </div>
      </template>

      <div v-if="words.length > 0" class="wordcloud-container">
        <span
          v-for="(item, idx) in words"
          :key="item.word + '_' + idx"
          class="word-item"
          :style="getWordStyle(item)"
          :title="item.word + '：' + item.count"
        >
          {{ item.word }}
        </span>
      </div>

      <!-- 词频统计列表组件 -->
      <WordFrequencyTable v-if="words.length > 0" :words="words" />

      <el-empty v-else description="暂无数据，请调整查询条件" :image-size="200" />
    </el-card>
  </div>
  
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchNewsWordcloud, type WordItem, type NewsWordcloudData } from '@/services/newsWordcloudApi'
import WordFrequencyTable from '@/components/WordFrequencyTable.vue'

// 日期范围，默认最近30天
const dateRange = ref<[string, string] | null>(null)
const topN = ref<number>(100)
const minLen = ref<number>(3)
const loading = ref(false)
const words = ref<WordItem[]>([])
const stats = ref<NewsWordcloudData | null>(null)

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function initDefaultRange() {
  const end = new Date()
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  dateRange.value = [formatDate(start), formatDate(end)]
}

async function loadData() {
  if (!dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请选择日期范围')
    return
  }
  loading.value = true
  try {
    const [start_date, end_date] = dateRange.value
    const data = await fetchNewsWordcloud({ start_date, end_date, top_n: topN.value, min_len: minLen.value })
    words.value = data.words || []
    stats.value = data
  } catch (e) {
    console.error('加载新闻词云失败:', e)
    ElMessage.error('加载新闻词云失败')
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  initDefaultRange()
  topN.value = 100
  minLen.value = 2
}

// 词样式：根据词频计算字体大小与颜色
const maxCount = computed(() => words.value.reduce((m, it) => Math.max(m, it.count), 0))
const minCount = computed(() => words.value.reduce((m, it) => Math.min(m, it.count), Infinity))

function getWordStyle(item: WordItem) {
  const minSize = 12
  const maxSize = 42
  const min = (minCount.value === Infinity ? 0 : minCount.value)
  const max = (maxCount.value || 1)
  const ratio = max === min ? 0.5 : (item.count - min) / (max - min)
  const size = Math.round(minSize + ratio * (maxSize - minSize))
  const hue = Math.round(200 - ratio * 160) // 蓝到红
  const sat = 70
  const light = 45 + Math.round((1 - ratio) * 15)
  const rotate = Math.random() < 0.1 ? (Math.random() < 0.5 ? -10 : 10) : 0
  return {
    fontSize: size + 'px',
    color: `hsl(${hue}, ${sat}%, ${light}%)`,
    transform: `rotate(${rotate}deg)`
  }
}

onMounted(() => {
  initDefaultRange()
  loadData()
})
</script>

<style scoped>
.news-wordcloud-view {
  padding: 4px;
}

.page-header .header-content h2 {
  margin: 0 0 6px 0;
}
.page-header .header-content p {
  margin: 0;
  color: #606266;
}

.query-panel {
  margin-top: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header .stats {
  display: flex;
  gap: 10px;
  color: #606266;
}

.panel-header .divider {
  color: #d0d0d0;
}

.query-form {
  padding: 4px 2px;
}

.result-panel {
  margin-top: 12px;
}

.wordcloud-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: flex-start;
}

.word-item {
  line-height: 1;
  user-select: none;
  display: inline-block;
}
</style>