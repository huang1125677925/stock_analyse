/**
 * 全局数据分析弹窗的开合状态
 *
 * 为什么放在模块级响应式变量而不是组件内部：
 * 1. 布局里桌面端（面包屑行）与移动端（右上角）各有一个入口按钮，弹窗必须只有一份，
 *    否则会出现两个实例、状态不同步。
 * 2. 入口按钮位于 `v-if="!isMobile"` / `v-else` 分支中：窗口宽度跨越 768px 断点时组件会被
 *    销毁重建，若弹窗状态挂在按钮内部，正在进行的分析会被中断并丢失结果。
 *    把弹窗提升到布局层（不随断点销毁），分析过程就不会被窗口尺寸变化打断。
 */
import { ref } from 'vue'

/** 弹窗是否可见，供布局层 v-model 与任意入口按钮共享 */
export const aiAnalysisDialogVisible = ref(false)

/** 打开数据分析弹窗 */
export function openAiAnalysisDialog(): void {
  aiAnalysisDialogVisible.value = true
}

/** 关闭数据分析弹窗 */
export function closeAiAnalysisDialog(): void {
  aiAnalysisDialogVisible.value = false
}
