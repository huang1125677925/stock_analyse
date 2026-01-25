<template>
  <div class="holdings-view">
    <el-card class="page-header" shadow="never">
      <template #header>
        <div class="header-content">
          <h2>个人中心 - 持有/关注股票</h2>
          <div class="header-actions">
            <el-button type="primary" :icon="Refresh" @click="fetchList" :loading="loading">刷新列表</el-button>
          </div>
        </div>
      </template>

      <!-- 列表区域 -->
      <div class="table-container">
        <el-table
          v-loading="loading"
          :data="records"
          border
          stripe
          style="width: 100%"
        >
          <el-table-column prop="stock_code" label="股票代码" min-width="120" align="center" header-align="center" />
          <el-table-column prop="stock_name" label="股票名称" min-width="160" align="center" header-align="center">
            <template #default="scope">
              <el-button type="primary" link @click="viewHistory(scope.row.stock_code)">
                {{ scope.row.stock_name }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="industry" label="行业" min-width="140" align="center" header-align="center" />
          <el-table-column prop="relation_type" label="类型" min-width="120" align="center" header-align="center">
            <template #default="scope">
              <el-tag :type="scope.row.relation_type === 'HELD' ? 'warning' : 'success'">
                {{ scope.row.relation_type === 'HELD' ? '持有' : '关注' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" min-width="180" align="center" header-align="center" />
          <el-table-column label="操作" min-width="160" align="center" header-align="center">
            <template #default="scope">
              <el-popconfirm title="确认删除该记录？" @confirm="handleDelete(scope.row.id)">
                <template #reference>
                  <el-button type="danger" size="small" :icon="Delete">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 个人中心页面：持有/关注股票列表
 * 
 * 功能：
 * - 展示当前登录用户的持有/关注记录列表
 * - 支持删除记录
 * - 提供刷新按钮
 * 
 * 参数：无（页面内部管理状态）
 * 返回值：无（组件页面）
 * 事件：
 * - fetchList: 加载列表数据
 * - handleDelete: 删除指定记录
 */
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Refresh } from '@element-plus/icons-vue'
import { getPersonalHoldings, deletePersonalHolding, type PersonalHoldingItem } from '@/services/personalHoldingsApi'
import { isAuthenticated } from '@/services/auth'
import { useRouter } from 'vue-router'

const router = useRouter()

// 加载状态
const loading = ref(false)

// 列表数据
const records = ref<PersonalHoldingItem[]>([])

// 方法：获取列表
const fetchList = async () => {
  if (!isAuthenticated()) {
    ElMessage.error('请先登录后再访问个人中心')
    router.push('/login')
    return
  }
  loading.value = true
  try {
    const res = await getPersonalHoldings()
    records.value = res.data.list
    ElMessage.success(res.message || '列表加载成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '列表加载失败')
  } finally {
    loading.value = false
  }
}

// 方法：删除记录
const handleDelete = async (id: number) => {
  if (!isAuthenticated()) {
    ElMessage.error('请先登录后再进行操作')
    router.push('/login')
    return
  }
  try {
    const res = await deletePersonalHolding(id)
    ElMessage.success(res.message || '删除成功')
    // 删除后刷新列表
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(() => {
  fetchList()
})

// 方法：跳转到股票历史详情
const viewHistory = (code: string) => {
  router.push(`/stock-history/${code}`)
}
</script>

<style scoped>
.holdings-view { padding: 0; }
.page-header { margin-bottom: 0; border: none; border-radius: 0; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.header-content h2 { margin: 0; font-size: 20px; font-weight: 600; }
.table-container { margin-top: 10px; width: 100%; }
</style>