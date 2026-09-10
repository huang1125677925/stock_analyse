import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/market-overview',
    },
    {
      path: '/login',
      redirect: '/',
    },
    {
      path: '/register',
      redirect: '/',
    },
    {
      path: '/reset-password',
      redirect: '/',
    },
    {
      path: '/change-password',
      redirect: '/reset-password',
    },
    {
      path: '/market-overview',
      component: DefaultLayout,
      meta: { title: '大盘概览' },
      children: [
        {
          path: '',
          name: 'market-overview',
          component: () => import('@/views/markt_data/MarketOverviewView.vue'),
        },
      ],
    },
    {
      path: '/major-index-rps',
      redirect: '/market-overview',
    },
    {
      path: '/market-overview/index-valuation',
      redirect: '/market-overview',
    },
    {
      path: '/market-overview/index-breadth',
      redirect: '/market-overview',
    },
    {
      path: '/analysis',
      component: DefaultLayout,
      meta: { title: 'ETF/指数' },
      children: [
        {
          path: '/analysis/major-index-rps',
          redirect: '/market-overview',
        },
        {
          path: '/analysis/congestion/breadth',
          name: 'congestion-breadth',
          component: () => import('@/views/industry-stock-data/CongestionBreadthView.vue'),
          meta: { title: '市场宽度分析' },
        },
        {
          path: '/analysis/congestion/index-rps',
          name: 'congestion-index-rps',
          component: () => import('@/views/industry-stock-data/CongestionIndexRpsView.vue'),
          meta: { title: '指数RPS强度排名' },
        },
        {
          path: '/analysis/industry-fund-flow',
          name: 'industry-fund-flow',
          component: () => import('@/views/industry-stock-data/IndustryFundFlowView.vue'),
          meta: { title: '行业资金流量' },
        },
        {
          path: '/analysis/sw-industry-valuation',
          name: 'sw-industry-valuation',
          component: () => import('@/views/industry-stock-data/SwIndustryValuationView.vue'),
          meta: { title: '申万行业估值分析' },
        },
      ],
    },
    {
      path: '/stock-picker',
      component: DefaultLayout,
      meta: { title: '股票实战' },
      children: [
        {
          path: '/stock-picker/limit-board-analysis',
          name: 'stock-limit-board-analysis',
          component: () => import('@/views/indival_stock_data/LimitBoardAnalysisView.vue'),
          meta: { title: '涨停分析选股' },
        },
        {
          path: '/stock-picker/swing-practice',
          name: 'stock-swing-practice',
          component: () => import('@/views/indival_stock_data/StockSwingPracticeView.vue'),
          meta: { title: '波段趋势选股' },
        },
      ],
    },
    {
      path: '/stock-limit-board-analysis',
      redirect: '/stock-picker/limit-board-analysis',
    },
    {
      path: '/stock-swing-practice',
      redirect: '/stock-picker/swing-practice',
    },
    {
      path: '/admin/invite-codes',
      component: DefaultLayout,
      children: [
        {
          path: '',
          name: 'admin-invite-codes',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: '邀请码生成' },
        },
      ],
    },
  ],
})

export default router
