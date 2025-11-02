<template>
  <div class="home">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="welcome-card">
          <div class="welcome-content">
            <h2>平台功能迭代</h2>
            <p>查看平台最新的功能更新和版本发布历史，了解系统的持续改进和优化。</p>
            
            <div class="feature-updates-list">
              <div 
                v-for="(update, index) in sortedFeatureUpdates" 
                :key="index" 
                class="update-item"
              >
                <div class="update-header">
                  <div class="update-meta">
                    <span class="update-date">{{ update.date }}</span>
                  </div>
                </div>
                <div class="update-content">
                  <p class="update-description">{{ update.content }}</p>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getGitInfo, type GitCommitRecord } from '@/services/toolsApi'
const router = useRouter()

// 展示用的数据结构
interface FeatureUpdate { date: string; content: string }

// 功能迭代列表（从后端接口获取）
const featureUpdates = ref<FeatureUpdate[]>([])

// 加载两仓库的提交记录并合并
const loadFeatureUpdates = async () => {
  try {
    const FRONTEND_REPO = '/root/stock_analyse'
    const BACKEND_REPO = '/root/django/stock_data_service'
    const LIMIT = 1000

    const [fe, be] = await Promise.all([
      getGitInfo(FRONTEND_REPO, LIMIT),
      getGitInfo(BACKEND_REPO, LIMIT)
    ])

    const mapRecords = (records: GitCommitRecord[], prefix: string) =>
      records.map(r => ({ 
        date: new Date(r.authored_datetime).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }), 
        content: `${prefix}${r.message}` 
      }))

    featureUpdates.value = [...mapRecords(fe.records, '【前端】：'), ...mapRecords(be.records, '【后端】：')]
  } catch (error) {
    console.error('加载功能迭代失败:', error)
    ElMessage.error('加载功能迭代失败，请稍后重试')
  }
}

onMounted(() => {
  loadFeatureUpdates()
})

/**
 * 按日期排序的功能迭代列表（从最新到最旧）
 * @returns 排序后的功能迭代列表
 */
const sortedFeatureUpdates = computed(() => {
  return [...featureUpdates.value].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
})
</script>

<style scoped>
.home {
  padding: 20px;
}

.welcome-card {
  margin-bottom: 20px;
}

.welcome-content h2 {
  color: #303133;
  margin-bottom: 10px;
}

.welcome-content p {
  color: #606266;
  margin-bottom: 20px;
}

/* 功能迭代列表样式 */
.feature-updates-list {
  margin-top: 30px;
}

.update-item {
  background: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.update-item:hover {
  background: #f5f7fa;
  border-color: #c0c4cc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.update-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.update-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.update-date {
  color: #909399;
  font-size: 14px;
  font-weight: 500;
}

.version-tag {
  background-color: #ecf5ff;
  color: #409eff;
  border: 1px solid #b3d8ff;
}

.status-tag {
  margin-left: 4px;
}

.type-icon {
  flex-shrink: 0;
}

.update-content {
  padding-left: 4px;
}

.update-title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.update-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.feature-cards {
  margin-top: 30px;
}

.feature-card {
  text-align: center;
  padding: 20px;
  cursor: pointer;
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-card h3 {
  margin: 15px 0 10px 0;
  color: #303133;
}

.feature-card p {
  color: #909399;
  font-size: 14px;
}

.quick-stats {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-content {
  padding: 10px 0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  font-weight: bold;
  color: #606266;
}

.stat-value-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stat-value-number {
  font-weight: bold;
  color: #303133;
  font-size: 16px;
}

.stat-value {
  font-weight: bold;
  font-size: 14px;
}

.positive {
  color: #67C23A;
}

.negative {
  color: #F56C6C;
}



.mt-20 {
  margin-top: 20px;
}
</style>
