/**
 * 页面数据注册 composable
 *
 * 功能：
 * - 让页面把「用于 AI 分析的精炼数据」显式注册给全局 DeepSeek 分析组件
 * - 注册的是 getter，分析时实时取值，因此筛选条件、日期区间变化后无需重新注册
 * - 组件卸载时自动注销，路由切换不会残留上一页的数据
 *
 * 使用（在 <script setup> 中）：
 * ```ts
 * useAiPageData(() => ({
 *   title: '行业涨停趋势',
 *   summary: '近两周按东财二级行业聚合的涨停强度，data 为 日期 -> 行业 -> 指标',
 *   data: industryTrendData.value,
 * }))
 * ```
 *
 * 说明：未显式注册的页面依然可用 —— 全局 axios 拦截器会自动采集当前页接口返回。
 */
import { getCurrentScope, onScopeDispose, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import {
  registerAiPageDataProvider,
  type AiPageDataInput,
  type AiPageDataProvider,
} from '@/services/aiPageDataStore'

/**
 * 注册页面的分析数据。
 * 参数：
 * - source 页面数据，可以是对象、ref、computed 或返回数据的函数（推荐函数，实时取值）
 * - options.name 可选名称，仅用于在控制台提示注册归属
 * 返回值：注销函数（组件内通常无需手动调用）
 */
export function useAiPageData(
  source: MaybeRefOrGetter<AiPageDataInput | null | undefined>,
  options: { name?: string } = {},
): () => void {
  const provider: AiPageDataProvider = () => toValue(source)

  const unregister = registerAiPageDataProvider(provider)

  if (getCurrentScope()) {
    onScopeDispose(unregister)
  } else {
    console.warn(
      `[ai-analysis] useAiPageData${options.name ? `(${options.name})` : ''} 需在组件 setup 中调用，` +
        '当前不在响应式作用域内，注册不会随组件卸载自动注销。',
    )
  }

  return unregister
}
