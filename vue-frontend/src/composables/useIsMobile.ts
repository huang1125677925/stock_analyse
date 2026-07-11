import { ref, onMounted, onUnmounted, readonly } from 'vue'

const MOBILE_QUERY = '(max-width: 768px)'

/**
 * 统一的移动端断点检测。
 *
 * 基于 matchMedia 而非 window.innerWidth，避免每个组件重复写 resize 监听，
 * 也让图表 option、el-dialog 宽度、el-descriptions 列数等 CSS 无法处理的
 * 逻辑能够随断点变化响应式地重算。
 *
 * @param query 自定义媒体查询，默认 `(max-width: 768px)`
 * @returns 只读的 isMobile 响应式引用
 */
export function useIsMobile(query: string = MOBILE_QUERY) {
  const isMobile = ref(false)
  let mql: MediaQueryList | null = null

  const update = (e: MediaQueryList | MediaQueryListEvent) => {
    isMobile.value = e.matches
  }

  onMounted(() => {
    mql = window.matchMedia(query)
    isMobile.value = mql.matches
    // Safari < 14 只支持 addListener/removeListener
    if (mql.addEventListener) {
      mql.addEventListener('change', update)
    } else {
      mql.addListener(update)
    }
  })

  onUnmounted(() => {
    if (!mql) return
    if (mql.removeEventListener) {
      mql.removeEventListener('change', update)
    } else {
      mql.removeListener(update)
    }
    mql = null
  })

  return { isMobile: readonly(isMobile) }
}
