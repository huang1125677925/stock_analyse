<template>
  <div class="congestion-page">
    <el-card>
      <div class="header-controls">
        <h3>行业规模宽度</h3>
        <div>
          <el-checkbox v-model="onlyMine" @change="handleOnlyMineChange">仅看我的</el-checkbox>
        </div>
      </div>
      <IndustryScaleBreadthPanel :industry-whitelist="industryWhitelist" panel-type="breadth" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import IndustryScaleBreadthPanel from '@/components/IndustryScaleBreadthPanel.vue'
import { getPersonalHoldings, type PersonalHoldingsListResponse } from '@/services/personalHoldingsApi'
import { isAuthenticated } from '@/services/auth'

const router = useRouter()
const onlyMine = ref(false)
const industryWhitelist = ref<string[]>([])

const handleOnlyMineChange = async () => {
  if (onlyMine.value) {
    if (!isAuthenticated()) {
      ElMessage.error('请先登录后再启用“仅看我的”')
      onlyMine.value = false
      router.push('/login')
      return
    }
    try {
      const res: PersonalHoldingsListResponse = await getPersonalHoldings()
      const industries = Array.from(new Set((res.data?.list || [])
        .map(item => (item.industry || '').trim())
        .filter(name => !!name)))
      industryWhitelist.value = industries
      if (industries.length === 0) {
        ElMessage.warning('您的持有/关注列表为空，当前无可筛选的行业')
      } else {
        ElMessage.success(`已启用，仅展示 ${industries.length} 个相关行业`)
      }
    } catch (error) {
      console.error('获取个人持有/关注列表失败:', error)
      ElMessage.error('获取个人行业列表失败，请稍后重试')
      onlyMine.value = false
      industryWhitelist.value = []
    }
  } else {
    industryWhitelist.value = []
  }
}
</script>

<style scoped lang="scss">
.congestion-page { padding: 20px; }
.header-controls { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.header-controls h3 { margin:0; color:#303133; }
@media (max-width: 768px) { .congestion-page { padding:12px; } }
</style>