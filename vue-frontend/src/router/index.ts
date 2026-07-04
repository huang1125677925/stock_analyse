import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '大盘指数估值' }
    },
    {
      path: '/market-overview',
      component: DefaultLayout,
      meta: { title: '大盘概览' },
      children: [
        {
          path: '/major-index-rps',
          name: 'major-index-rps',
          component: () => import('@/views/markt_data/MajorIndexRpsView.vue'),
          meta: { title: '大盘指数RPS' }
        },
        {
          path: '/market-fund-flow',
          name: 'market-fund-flow',
          component: () => import('@/views/markt_data/MarketFundFlowView.vue'),
          meta: { title: '大盘资金分析' }
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
          path: '/analysis/congestion/turnover',
          name: 'congestion-turnover',
          component: () => import('@/views/industry-stock-data/CongestionTurnoverView.vue'),
          meta: { title: '行业成交额分析' }
        },
        {
          path: '/analysis/industry-turnover-heatmap',
          redirect: '/analysis/congestion/turnover'
        },
        {
          path: '/analysis/congestion/fundflow',
          name: 'congestion-fundflow',
          component: () => import('@/views/industry-stock-data/CongestionFundFlowView.vue'),
          meta: { title: '行业流入资金分析' }
        },
        {
          path: '/analysis/congestion/breadth',
          name: 'congestion-breadth',
          component: () => import('@/views/industry-stock-data/CongestionBreadthView.vue'),
          meta: { title: '市场宽度分析' }
        },
        {
          path: '/analysis/congestion/up-down-ratio',
          name: 'congestion-up-down-ratio',
          component: () => import('@/views/industry-stock-data/CongestionUpDownRatioView.vue'),
          meta: { title: '行业涨跌比分析' }
        },
        {
          path: '/analysis/congestion/index-rps',
          name: 'congestion-index-rps',
          component: () => import('@/views/industry-stock-data/CongestionIndexRpsView.vue'),
          meta: { title: '指数RPS强度排名' }
        },
        {
          path: '/analysis/sw-industry-tree',
          name: 'sw-industry-tree',
          component: () => import('@/views/industry-stock-data/SwIndustryTreeView.vue'),
          meta: { title: '申万行业分类树状图' }
        },
        {
          path: '/analysis/sw-industry-daily',
          name: 'sw-industry-daily',
          component: () => import('@/views/industry-stock-data/SwIndustryDailyView.vue'),
          meta: { title: '申万行业日线行情' }
        },
        {
          path: '/analysis/sw-industry-valuation',
          name: 'sw-industry-valuation',
          component: () => import('@/views/industry-stock-data/SwIndustryValuationView.vue'),
          meta: { title: '申万行业估值分析' }
        },
        {
          path: '/analysis/sw-index-member-all',
          name: 'sw-index-member-all',
          component: () => import('@/views/industry-stock-data/IndexMemberAllView.vue'),
          meta: { title: '申万行业成分构成' }
        },
        {
          path: '/analysis/industry-treemap',
          name: 'industry-treemap',
          component: () => import('@/views/analysis/IndustryTreemapView.vue'),
          meta: { title: '行业矩形树图分析' }
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
      path: '/personal/holdings',
      name: 'personal-center-holdings',
      component: () => import('@/views/personal-center/HoldingsView.vue'),
      meta: { title: '个人持仓' }
    }
  ]
})

export default router
