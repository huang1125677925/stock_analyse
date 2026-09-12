<template>
  <el-tooltip content="用 DeepSeek 分析当前页面数据" placement="bottom" :show-after="300">
    <el-button
      :type="props.type"
      :size="props.size"
      :plain="props.plain"
      :link="props.link"
      :text="props.text"
      class="ai-analysis-button"
      @click="openAiAnalysisDialog"
    >
      <el-icon><MagicStick /></el-icon>
      <span v-if="props.showLabel" class="ai-analysis-button-label">{{ props.label }}</span>
    </el-button>
  </el-tooltip>
</template>

<script setup lang="ts">
/**
 * 组件：AiAnalysisButton
 * 功能：全局数据分析入口按钮 —— 点击后打开分析弹窗，把当前页面采集到的数据交给 DeepSeek 分析。
 * 参数（Props）：
 *  - label: string 按钮文案，默认「数据分析」
 *  - type/size/plain/link/text: 透传给 el-button 的外观参数
 *  - showLabel: boolean 是否展示文案（窄屏只留图标时传 false）
 * 返回值：无
 * 事件（Emits）：无
 *
 * 说明：弹窗本体由 DefaultLayout 统一渲染一份（见 composables/useAiAnalysisDialog），
 * 本组件只负责触发打开，避免桌面端/移动端入口各挂一个弹窗实例。
 */
import { MagicStick } from '@element-plus/icons-vue'
import { openAiAnalysisDialog } from '@/composables/useAiAnalysisDialog'

interface Props {
  label?: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'
  size?: 'large' | 'default' | 'small'
  plain?: boolean
  link?: boolean
  text?: boolean
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '数据分析',
  type: 'primary',
  size: 'default',
  plain: true,
  link: false,
  text: false,
  showLabel: true,
})
</script>

<style scoped>
.ai-analysis-button {
  flex-shrink: 0;
}
</style>
