import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '../services/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { title: '登录', requiresAuth: false }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/auth/RegisterView.vue'),
      meta: { title: '注册', requiresAuth: false }
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/auth/ResetPasswordView.vue'),
      meta: { title: '重置密码', requiresAuth: false }
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { title: '首页' }
    },
    {
      path: '/industries',
      name: 'industries',
      component: () => import('../views/industry-stock-data/IndustryAnalysis.vue'),
      meta: { title: '行业分析' }
    },
    {
      path: '/industries/:industry',
      name: 'industry-detail',
      component: () => import('../views/analysis/IndustryDetail.vue'),
      meta: { title: '行业详情' }
    },
    {
      path: '/stock-picker',
      name: 'stock-picker',
      meta: { title: '智能选股' },
      children: [
        {
          path: '/stock-viewer',
          name: 'stock-viewer',
          component: () => import('../views/analysis/StockPickerView.vue'),
          meta: { title: '股票分析' }
        },
        {
          path: '/stock-kline',
          name: 'stock-kline',
          component: () => import('../views/indival_stock_data/StockKLineView.vue'),
          meta: { title: '股票K线图分析' }
        }
      ]
    },
    {
      path: '/quant',
      name: 'quant',
      meta: { title: '量化分析' },
      children: [
        {
          path: '/backtest',
          name: 'QuantitativeBacktest',
          component: () => import('@/views/quant/QuantitativeBacktestView.vue'),
          meta: { title: '回测分析' }
        },
        {
          path: '/backtest-strategy',
          name: 'BacktestStrategy',
          component: () => import('@/views/quant/BacktestStrategyCreate.vue'),
          meta: { title: '创建回测策略' }
        },
        {
          path: '/backtest-history',
          name: 'BacktestHistory',
          component: () => import('@/views/quant/BacktestHistoryView.vue'),
          meta: { title: '回测历史' }
        },
        {
          path: '/strategy-list',
          name: 'StrategyList',
          component: () => import('@/views/quant/StrategyListView.vue'),
          meta: { title: '回测策略列表' }
        },
        {
          path: '/backtest-result/:taskId',
          name: 'BacktestResult',
          component: () => import('@/views/quant/BacktestResultView.vue'),
          meta: { title: '回测结果详情' }
        },
      ]
    },
    {
      path: '/etf-system',
      name: 'etf-system',
      component: () => import('../views/etf-investment-system/EtfSystemView.vue'),
      meta: { title: '全天候ETF投资系统' }
    },
    {
      path: '/analysis',
      name: 'analysis',
      meta: { title: '股票分析' },
      children: [
        {
          path: '/analysis/technical',
          name: 'technical',
          component: () => import('../views/analysis/TechnicalAnalysis.vue'),
          meta: { title: '技术分析' }
        },
        {
          path: '/analysis/fundamental',
          name: 'fundamental',
          component: () => import('../views/analysis/FundamentalAnalysis.vue'),
          meta: { title: '基本面分析' }
        },
        {
          path: '/analysis/trend',
          name: 'trend',
          component: () => import('../views/analysis/TrendAnalysis.vue'),
          meta: { title: '趋势分析' }
        },
        {
          path: '/analysis/stock/:code',
          name: 'stock-detail',
          component: () => import('../views/analysis/StockDetail.vue'),
          meta: { title: '股票详情' }
        },
        {
          path: '/analysis/market',
          name: 'market-analysis',
          component: () => import('@/views/markt_data/MarketAnalysis.vue'),
          meta: { title: '大盘分析' }
        },
        {
          path: '/analysis/index-analysis',
          name: 'index-analysis',
          component: () => import('@/views/markt_data/IndexAnalysis.vue'),
          meta: { title: '指数分析' }
        },
        {
          path: '/analysis/index-dailybasic',
          name: 'index-dailybasic',
          component: () => import('@/views/markt_data/IndexDailybasicView.vue'),
          meta: { title: '大盘指数估值' }
        },
        {
          path: '/analysis/market-change',
          name: 'MarketChangeHeatmap',
          component: () => import('@/views/markt_data/MarketChangeHeatmap.vue'),
          meta: { title: '大盘涨跌' }
        },
        {
          path: '/analysis/congestion',
          name: 'congestion-heatmap',
          component: () => import('@/views/industry-stock-data/CongestionHeatmap.vue'),
          meta: { title: '行业热力图' }
        },
        {
          path: '/analysis/congestion/turnover',
          name: 'congestion-turnover',
          component: () => import('@/views/industry-stock-data/CongestionTurnoverView.vue'),
          meta: { title: '成交金额占比分位数' }
        },
        {
          path: '/analysis/congestion/performance',
          name: 'congestion-performance',
          component: () => import('@/views/industry-stock-data/CongestionPerformanceView.vue'),
          meta: { title: '行业业绩指标' }
        },
        {
          path: '/analysis/congestion/fundflow',
          name: 'congestion-fundflow',
          component: () => import('@/views/industry-stock-data/CongestionFundFlowView.vue'),
          meta: { title: '行业资金流' }
        },
        {
          path: '/analysis/congestion/treemap',
          name: 'congestion-treemap',
          component: () => import('@/views/industry-stock-data/CongestionTreemapView.vue'),
          meta: { title: '行业矩形树图' }
        },
        {
          path: '/analysis/congestion/breadth',
          name: 'congestion-breadth',
          component: () => import('@/views/industry-stock-data/CongestionBreadthView.vue'),
          meta: { title: '行业宽度热力图' }
        },
        {
          path: '/analysis/congestion/scale-breadth',
          name: 'congestion-scale-breadth',
          component: () => import('@/views/industry-stock-data/CongestionScaleBreadthView.vue'),
          meta: { title: '行业规模宽度' }
        },
        {
          path: '/analysis/congestion/output-scale',
          name: 'congestion-output-scale',
          component: () => import('@/views/industry-stock-data/CongestionOutputScaleView.vue'),
          meta: { title: '行业产出营收' }
        },
        {
          path: '/analysis/congestion/index-rps',
          name: 'congestion-index-rps',
          component: () => import('@/views/industry-stock-data/CongestionIndexRpsView.vue'),
          meta: { title: '指数RPS强度排名' }
        },
        {
          path: '/analysis/sw-index-classify',
          name: 'sw-index-classify',
          component: () => import('@/views/industry-stock-data/IndexClassifyView.vue'),
          meta: { title: '申万行业分类' }
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
          path: '/analysis/sw-index-graph',
          name: 'sw-index-graph',
          component: () => import('@/views/industry-stock-data/SwIndexGraphView.vue'),
          meta: { title: '申万指数图谱' }
        },
        {
          path: '/analysis/sw-index-member-all',
          name: 'sw-index-member-all',
          component: () => import('@/views/industry-stock-data/IndexMemberAllView.vue'),
          meta: { title: '申万行业成分构成' }
        },
        {
          path: '/analysis/news-list',
          name: 'news-list',
          component: () => import('@/views/analysis/NewsList.vue'),
          meta: { title: 'CCTV新闻列表' }
        },
        {
          path: '/analysis/news-wordcloud',
          name: 'news-wordcloud',
          component: () => import('@/views/markt_data/NewsWordcloud.vue'),
          meta: { title: '新闻词云' }
        },
        {
          path: '/analysis/irm-qa-sh',
          name: 'irm-qa-sh',
          component: () => import('@/views/markt_data/IrmQaShView.vue'),
          meta: { title: '上证E互动问答' }
        },
        {
          path: '/analysis/irm-qa-sz',
          name: 'irm-qa-sz',
          component: () => import('@/views/markt_data/IrmQaSzView.vue'),
          meta: { title: '深证互动易问答' }
        },
        {
          path: '/analysis/news-detail/:id',
          name: 'news-detail',
          component: () => import('@/views/analysis/NewsDetail.vue'),
          meta: { title: '新闻详情' }
        },
        {
          path: '/analysis/industry-treemap',
          name: 'industry-treemap',
          component: () => import('@/views/analysis/IndustryTreemapView.vue'),
          meta: { title: '行业矩形树图分析' }
        },
        {
          path: '/analysis/index-list',
          name: 'index-list',
          component: () => import('@/views/markt_data/IndexList.vue'),
          meta: { title: '指数列表' }
        },
        {
          path: '/analysis/factor-stock-picker',
          name: 'factor-stock-picker',
          component: () => import('@/views/analysis/FactorStockPickerView.vue'),
          meta: { title: '因子选股' }
        }
        ,
        {
          path: '/analysis/etf-basic',
          name: 'etf-basic',
          component: () => import('@/views/etf/EtfBasicView.vue'),
          meta: { title: 'ETF基本信息' }
        },
        {
          path: '/analysis/etf-analysis',
          name: 'etf-analysis',
          component: () => import('@/views/etf/EtfAnalysisView.vue'),
          meta: { title: 'ETF数据统计分析' }
        },
        {
          path: '/analysis/etf-daily',
          name: 'etf-daily',
          component: () => import('@/views/etf/EtfDailyView.vue'),
          meta: { title: 'ETF日线行情' }
        },
        {
          path: '/analysis/etf-realtime',
          name: 'etf-realtime',
          component: () => import('@/views/etf/EtfRealtimeView.vue'),
          meta: { title: 'ETF实时行情' }
        }
        ,
        {
          path: '/analysis/etf-correlation',
          name: 'etf-correlation',
          component: () => import('@/views/etf/EtfCorrelationView.vue'),
          meta: { title: 'ETF相关性分析' }
        }
        ,
        {
          path: '/analysis/etf-volatility',
          name: 'etf-volatility',
          component: () => import('@/views/etf/EtfVolatilityView.vue'),
          meta: { title: 'ETF波动性列表' }
        }
      ]
    },
    {
      path: '/personal/holdings',
      name: 'personal-center-holdings',
      component: () => import('@/views/personal-center/HoldingsView.vue'),
      meta: { title: '个人中心-持有/关注', requiresAuth: true }
    },
    {
      path: '/strategy',
      name: 'strategy',
      meta: { title: '策略分析' },
      children: [
        {
          path: '/strategy/index-rps',
          name: 'index-rps',
          component: () => import('@/views/strategy/IndexRpsView.vue'),
          meta: { title: '指数RPS强度排名' }
        },
        {
          path: '/strategy/historical-rps',
          name: 'historical-rps',
          component: () => import('@/views/strategy/HistoricalRpsView.vue'),
          meta: { title: '历史RPS数据分析' }
        }
      ]
    },
    {
      path: '/ml',
      name: 'ml',
      meta: { title: '机器学习研究' },
      children: [
        {
          path: '/ml/index-prediction-validation',
          name: 'ml-index-prediction-validation',
          component: () => import('@/views/ml/MlIndexPredictionValidation.vue'),
          meta: { title: '机器学习-指数预测验证', requiresAuth: false }
        }
      ]
    },
    {
      path: '/forum',
      name: 'forum',
      meta: { title: '论坛讨论区' },
      children: [
        {
          path: '/forum/posts',
          name: 'forum-posts',
          component: () => import('@/views/forum/ForumListView.vue'),
          meta: { title: '帖子列表' }
        },
        {
          path: '/forum/posts/:id',
          name: 'post-detail',
          component: () => import('@/views/forum/PostDetailView.vue'),
          meta: { title: '帖子详情' }
        }
      ]
    },
    {
      path: '/portfolio',
      name: 'portfolio',
      component: () => import('../views/PortfolioView.vue'),
      meta: { title: '投资组合' }
    },
    {      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { title: '系统设置', requiresAdmin: true }
    },
    {
      path: '/stock-data',
      name: 'stock-data',
      meta: { title: '个股数据' },
      children: [
        {
          path: '/stock-list',
          name: 'stock-list',
          component: () => import('@/views/indival_stock_data/StockListView.vue'),
          meta: { title: '股票列表' }
        },
        {
          path: '/stock-realtime/:code?',
          name: 'stock-realtime',
          component: () => import('@/views/indival_stock_data/StockRealtimeView.vue'),
          meta: { title: '股票实时行情' }
        },
        {
          path: '/stock-history/:code?',
          name: 'stock-history',
          component: () => import('@/views/indival_stock_data/StockHistoryView.vue'),
          meta: { title: '股票历史行情' }
        },
        {
          path: '/strategy-results',
          name: 'strategy-results',
          component: () => import('@/views/indival_stock_data/StrategyResultListView.vue'),
          meta: { title: '策略结果管理' }
        },
        {
          path: '/stock-ah-comparison',
          name: 'stock-ah-comparison',
          component: () => import('@/views/indival_stock_data/AhComparisonView.vue'),
          meta: { title: 'AH溢价对比' }
        },
        {
          path: '/stock-broker-recommend',
          name: 'stock-broker-recommend',
          component: () => import('@/views/indival_stock_data/BrokerRecommendView.vue'),
          meta: { title: '券商推荐评级' }
        },
        {
          path: '/stock-ccass-hold',
          name: 'stock-ccass-hold',
          component: () => import('@/views/indival_stock_data/CcassHoldView.vue'),
          meta: { title: '中结持股汇总' }
        },
        {
          path: '/stock-ccass-hold-detail',
          name: 'stock-ccass-hold-detail',
          component: () => import('@/views/indival_stock_data/CcassHoldDetailView.vue'),
          meta: { title: '中结持股明细' }
        },
        {
          path: '/stock-hm-detail',
          name: 'stock-hm-detail',
          component: () => import('@/views/indival_stock_data/HmDetailView.vue'),
          meta: { title: '游资每日明细' }
        },
        {
          path: '/stock-limit-step',
          name: 'stock-limit-step',
          component: () => import('@/views/indival_stock_data/LimitStepView.vue'),
          meta: { title: '连板天梯' }
        }
        ,
        {
          path: '/stock-cyq-perf',
          name: 'stock-cyq-perf',
          component: () => import('@/views/indival_stock_data/CyqPerfView.vue'),
          meta: { title: '每日筹码及胜率' }
        },
        {
          path: '/stock-hk-hold-detail',
          name: 'stock-hk-hold-detail',
          component: () => import('@/views/indival_stock_data/HkHoldDetailView.vue'),
          meta: { title: '沪深港股通持股明细' }
        },
        {
          path: '/stock-hsgt-top10',
          name: 'stock-hsgt-top10',
          component: () => import('@/views/indival_stock_data/HsgtTop10View.vue'),
          meta: { title: '沪深股通十大成交股' }
        },
        {
          path: '/stock-hsgt-list',
          name: 'stock-hsgt-list',
          component: () => import('@/views/indival_stock_data/StockHsgtListView.vue'),
          meta: { title: '沪深港通股票列表' }
        },
        {
          path: '/stock-correlation',
          name: 'stock-correlation',
          component: () => import('@/views/indival_stock_data/StockCorrelationView.vue'),
          meta: { title: '股票相关性分析' }
        },
        {
          path: '/stock-volatility',
          name: 'stock-volatility',
          component: () => import('@/views/indival_stock_data/StockVolatilityView.vue'),
          meta: { title: '股票波动率分析' }
        }
      ]
    },

  ],
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 股票分析系统` : '股票分析系统'
  
  // 检查路由是否需要认证，默认所有路由都需要认证，除非明确设置requiresAuth为false
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false)
  
  // 如果路由需要认证且用户未登录，则重定向到登录页面
  if (requiresAuth && !isAuthenticated()) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }
  
  // 检查是否需要管理员权限
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin === true)
  
  // 如果需要管理员权限，检查当前用户是否是管理员
  if (requiresAdmin) {
    const userJson = localStorage.getItem('user')
    if (userJson) {
      const user = JSON.parse(userJson)
      if (!user.is_admin) {
        // 如果不是管理员，重定向到首页
        next({ name: 'home' })
        return
      }
    } else {
      // 如果没有用户信息，重定向到登录页面
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }
  }
  
  next()
})

export default router
