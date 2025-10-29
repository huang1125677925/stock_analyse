<template>
  <div class="invitation-management">
    <el-card>
      <template #header>
        <div class="invitation-header">
          <span>邀请码管理</span>
          <el-button type="primary" @click="generateInviteCode" :loading="generatingCode">
            生成邀请码
          </el-button>
        </div>
      </template>
      <div v-loading="loadingInviteCodes">
        <el-empty v-if="invitationCodes.length === 0" description="暂无邀请码" />
        <!-- 非空时同时展示统计与表格，需要使用 template v-else 包裹 -->
        <template v-else>
          <!-- 邀请码使用状态统计 -->
          <div class="invite-stats">
            <el-tag type="danger">已使用：{{ usedCount }}</el-tag>
            <el-tag type="success" class="stats-gap">未使用：{{ unusedCount }}</el-tag>
            <el-tag class="stats-gap">总数：{{ totalCount }}</el-tag>
          </div>
          <el-table :data="invitationCodes" style="width: 100%">
           <el-table-column prop="code" label="邀请码" width="180" />
           <el-table-column label="状态" width="120">
             <template #default="scope">
               <el-tag :type="scope.row.is_used ? 'info' : 'success'">
                 {{ scope.row.is_used ? '已使用' : '未使用' }}
               </el-tag>
             </template>
           </el-table-column>
           <el-table-column label="使用者" width="150">
             <template #default="scope">
               <span>{{ scope.row.used_by || '-' }}</span>
             </template>
           </el-table-column>
           <el-table-column prop="created_at" label="创建时间" width="180" />
           <el-table-column prop="expires_at" label="过期时间" width="180" />
           <el-table-column label="操作">
             <template #default="scope">
               <el-button 
                 type="primary" 
                 link 
                 @click="copyInviteCode(scope.row.code)"
                 :disabled="scope.row.is_used"
               >
                 复制
               </el-button>
             </template>
           </el-table-column>
          </el-table>
        </template>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getInvitationCodes, generateInvitationCode } from '../services/userApi'
import type { InvitationCode } from '../services/userApi'



// 邀请码相关
const invitationCodes = ref<InvitationCode[]>([])
const loadingInviteCodes = ref(false)
const generatingCode = ref(false)

// 统计数据
const usedCount = computed(() => invitationCodes.value.filter((c) => c.is_used).length)
const unusedCount = computed(() => invitationCodes.value.filter((c) => !c.is_used).length)
const totalCount = computed(() => invitationCodes.value.length)

// 获取邀请码列表
const fetchInvitationCodes = async () => {
  loadingInviteCodes.value = true
  try {
    const response = await getInvitationCodes()
    invitationCodes.value = response
  } catch (error) {
    console.error('获取邀请码列表失败:', error)
    ElMessage.error('获取邀请码列表失败')
  } finally {
    loadingInviteCodes.value = false
  }
}

// 生成邀请码
const generateInviteCode = async () => {
  generatingCode.value = true
  try {
    const response = await generateInvitationCode()
    ElMessage.success('邀请码生成成功')
    // 添加新生成的邀请码到列表
    invitationCodes.value.unshift(response)
  } catch (error) {
    console.error('生成邀请码失败:', error)
    ElMessage.error('生成邀请码失败')
  } finally {
    generatingCode.value = false
  }
}

// 复制邀请码
const copyInviteCode = (code: string) => {
  navigator.clipboard.writeText(code)
    .then(() => {
      ElMessage.success('邀请码已复制到剪贴板')
    })
    .catch(() => {
      ElMessage.error('复制失败，请手动复制')
    })
}





// 页面加载时获取邀请码列表
onMounted(() => {
  fetchInvitationCodes()
})
</script>

<style scoped>
.invitation-management {
  padding: 20px;
}

/* 邀请码管理样式 */
.invitation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.el-table {
  margin-top: 10px;
}

.el-empty {
  padding: 30px 0;
}

.invite-stats {
  margin: 10px 0;
}

.stats-gap {
  margin-left: 8px;
}
</style>