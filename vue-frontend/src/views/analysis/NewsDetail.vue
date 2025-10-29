<template>
  <div class="news-detail">
    <el-card class="page-header">
      <template #header>
        <div class="card-header">
          <span>新闻详情</span>
          <div class="header-actions">
            <el-button @click="goBack">返回列表</el-button>
          </div>
        </div>
      </template>
      
      <div class="detail-content" v-loading="loading" element-loading-text="正在加载新闻详情...">
        <el-empty v-if="!newsDetail && !loading" description="未找到新闻详情" />
        
        <template v-if="newsDetail">
          <!-- 新闻标题 -->
          <h1 class="news-title">{{ newsDetail.title }}</h1>
          
          <!-- 新闻日期 -->
          <div class="news-meta">
            <el-tag size="small" type="info">发布日期: {{ newsDetail.publish_date }}</el-tag>
          </div>
          
          <el-divider />

          <!-- AI分析结果（置顶） -->
          <el-row :gutter="20" class="mt-20">
            <el-col :span="24">
              <el-card class="content-card" shadow="hover">
                <template #header>
                  <div class="ai-header">
                    <span>AI分析结果</span>
                    <el-tag type="success" size="small">AI智能分析</el-tag>
                  </div>
                </template>
                <div class="ai-content" v-if="aiEntries.length">
                  <div class="ai-line" v-for="item in aiEntries" :key="item.industry">
                    <span class="industry">{{ item.industry }}</span>
                    <el-tag :type="getImpactTagType(item.impact)" size="small">{{ item.impact }}</el-tag>
                  </div>
                </div>
                <el-empty v-else description="暂无AI分析结果" />
              </el-card>
            </el-col>
          </el-row>

          <!-- 新闻内容（下方） -->
          <el-row :gutter="20" class="mt-20">
            <el-col :span="24">
              <el-card class="content-card">
                <template #header>
                  <span>新闻内容</span>
                </template>
                <div class="news-content" v-html="formatContent(newsDetail.content)"></div>
              </el-card>
            </el-col>
          </el-row>
        </template>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getNewsDetail, type NewsItem } from '@/services/newsApi'
import { marked } from 'marked'

// 配置marked选项
marked.setOptions({
  gfm: true, // 启用GitHub风格的Markdown
  breaks: true, // 允许回车换行
})

const route = useRoute()
const router = useRouter()
const newsId = route.params.id
const newsDetail = ref<NewsItem | null>(null)
const loading = ref(false)

// 获取新闻详情
async function fetchNewsDetail() {
  loading.value = true
  try {
    const data = await getNewsDetail(newsId as string)
    
    if (data) {
      newsDetail.value = data
    } else {
      ElMessage.error(`获取新闻详情失败: ${data}`)
    }
  } catch (error) {
    console.error('获取新闻详情失败:', error)
    ElMessage.error('获取新闻详情失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 格式化内容，将Markdown转换为HTML
function formatContent(content: string): string {
  if (!content) return ''
  try {
    // 确保返回字符串类型
    const result = marked.parse(content)
    // 如果结果是Promise，返回空字符串并在控制台记录错误
    if (result instanceof Promise) {
      console.error('Markdown解析返回了Promise，请使用异步方法')
      return `<p class="error">内容解析错误</p>`
    }
    return result
  } catch (error) {
    console.error('Markdown解析错误:', error)
    return `<p class="error">内容解析错误</p>`
  }
}

// 解析 AI 内容（JSON 字符串：key 为行业，value 为影响，如“利好/利空/中性”）
interface AiEntry { industry: string; impact: string }
const aiEntries = computed<AiEntry[]>(() => {
  const raw = newsDetail.value?.ai_content
  if (!raw) return []
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!obj || typeof obj !== 'object') return []
    return Object.entries(obj as Record<string, unknown>).map(([industry, impact]) => ({
      industry,
      impact: String(impact ?? '')
    }))
  } catch (e) {
    console.error('AI内容解析失败:', e)
    return []
  }
})

// 根据影响值选择标签类型
function getImpactTagType(impact: string): 'success' | 'info' | 'warning' | 'danger' {
  const text = impact.trim()
  if (text.includes('利好')) return 'success'
  if (text.includes('利空')) return 'danger'
  if (text.includes('中性')) return 'info'
  return 'info'
}

// 返回列表页
function goBack() {
  router.push('/analysis/news-list')
}

// 初始化时获取新闻详情
onMounted(() => {
  if (newsId) {
    fetchNewsDetail()
  } else {
    ElMessage.warning('未指定新闻ID')
    router.push('/analysis/news-list')
  }
})
</script>

<style scoped>
.news-detail {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.detail-content {
  margin-top: 20px;
}

.news-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
  color: #303133;
}

.news-meta {
  margin-bottom: 20px;
}

.content-card {
  margin-bottom: 20px;
}

.news-content, .ai-content {
  line-height: 1.8;
  color: #606266;
  font-size: 16px;
}

.ai-content {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
}

.ai-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 8px;
}

.ai-line .industry {
  font-weight: 500;
  color: #303133;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mt-20 {
  margin-top: 20px;
}

/* Markdown样式 */
.news-content :deep(h1),
.news-content :deep(h2),
.news-content :deep(h3),
.news-content :deep(h4),
.news-content :deep(h5),
.news-content :deep(h6),
.ai-content :deep(h1),
.ai-content :deep(h2),
.ai-content :deep(h3),
.ai-content :deep(h4),
.ai-content :deep(h5),
.ai-content :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: bold;
}

.news-content :deep(p),
.ai-content :deep(p) {
  margin-bottom: 1em;
}

.news-content :deep(ul),
.news-content :deep(ol),
.ai-content :deep(ul),
.ai-content :deep(ol) {
  padding-left: 2em;
  margin-bottom: 1em;
}

.news-content :deep(blockquote),
.ai-content :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 1em;
  color: #666;
  margin-bottom: 1em;
}

.news-content :deep(code),
.ai-content :deep(code) {
  background-color: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}

.news-content :deep(pre),
.ai-content :deep(pre) {
  background-color: #f5f5f5;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
  margin-bottom: 1em;
}

.news-content :deep(a),
.ai-content :deep(a) {
  color: #409EFF;
  text-decoration: none;
}

.news-content :deep(a:hover),
.ai-content :deep(a:hover) {
  text-decoration: underline;
}

.news-content :deep(table),
.ai-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1em;
}

.news-content :deep(th),
.news-content :deep(td),
.ai-content :deep(th),
.ai-content :deep(td) {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.news-content :deep(th),
.ai-content :deep(th) {
  background-color: #f2f2f2;
}

/* 错误样式 */
.error {
  color: #F56C6C;
  padding: 10px;
  background-color: #FEF0F0;
  border-radius: 4px;
  border-left: 4px solid #F56C6C;
}
</style>