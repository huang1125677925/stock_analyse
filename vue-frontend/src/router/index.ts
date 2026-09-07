import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/markt_data/IndexDailybasicView.vue'),
          meta: { title: '大盘指数估值' }
        }
      ]
    },
    {
      path: '/login',
      redirect: '/'
    },
    {
      path: '/register',
      redirect: '/'
    },
    {
      path: '/reset-password',
      redirect: '/'
    },
    {
      path: '/change-password',
      redirect: '/reset-password'
    },
    {
      path: '/market-overview',
      component: DefaultLayout,
      meta: { title: '大盘概览' },
      children: [
        {
          path: '/market-overview/index-valuation',
          name: 'market-index-valuation',
          component: () => import('@/views/markt_data/IndexDailybasicView.vue'),
          meta: { title: '大盘指数估值' }
        },
        {
          path: '/major-index-rps',
          name: 'major-index-rps',
          component: () => import('@/views/markt_data/MajorIndexRpsView.vue'),
          meta: { title: '大盘指数RPS' }
        },
        {
          path: '/market-overview/index-breadth',
          name: 'market-index-breadth',
          component: () => import('@/views/markt_data/MarketIndexBreadthView.vue'),
          meta: { title: '大盘指数宽度分析' }
        }
      ]
    },
    {
      path: '/analysis',
      component: DefaultLayout,
      meta: { title: 'ETF/指数' },
      children: [
        {
          path: '/analysis/major-index-rps',
          redirect: '/major-index-rps',
        },
        {
          path: '/analysis/congestion/breadth',
          name: 'congestion-breadth',
          component: () => import('@/views/industry-stock-data/CongestionBreadthView.vue'),
          meta: { title: '市场宽度分析' }
        },
        {
          path: '/analysis/congestion/index-rps',
          name: 'congestion-index-rps',
          component: () => import('@/views/industry-stock-data/CongestionIndexRpsView.vue'),
          meta: { title: '指数RPS强度排名' }
        },
        {
          path: '/analysis/sw-industry-valuation',
          name: 'sw-industry-valuation',
          component: () => import('@/views/industry-stock-data/SwIndustryValuationView.vue'),
          meta: { title: '申万行业估值分析' }
        },
        {
          path: '/analysis/etf-tree',
          name: 'etf-tree',
          component: () => import('@/views/markt_data/EtfTreeView.vue'),
          meta: { title: 'ETF全面分析' }
        },
      ]
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
          meta: { title: '涨停分析选股' }
        },
        {
          path: '/stock-picker/potential-stocks',
          name: 'stock-potential-stocks',
          component: () => import('@/views/indival_stock_data/PotentialStockPickerView.vue'),
          meta: { title: '潜力股票筛选' }
        },
        {
          path: '/stock-picker/swing-practice',
          name: 'stock-swing-practice',
          component: () => import('@/views/indival_stock_data/StockSwingPracticeView.vue'),
          meta: { title: '波段趋势选股' }
        }
      ]
    },
    {
      path: '/stock-limit-board-analysis',
      redirect: '/stock-picker/limit-board-analysis'
    },
    {
      path: '/stock-potential-stocks',
      redirect: '/stock-picker/potential-stocks'
    },
    {
      path: '/stock-swing-practice',
      redirect: '/stock-picker/swing-practice'
    },
    {
      path: '/admin/invite-codes',
      component: DefaultLayout,
      children: [
        {
          path: '',
          name: 'admin-invite-codes',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: '邀请码生成' }
        }
      ]
    }
  ]
})

export default router
