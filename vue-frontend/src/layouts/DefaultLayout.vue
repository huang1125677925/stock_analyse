<template>
  <el-container class="layout-container">
    <!-- 顶栏布局 -->
    <el-header class="topbar">
      <div class="topbar-left">
        <h3 class="app-title">股票分析系统</h3>
      </div>

      <!-- 桌面端：横向菜单 + 用户操作 -->
      <div class="topbar-right" v-if="!isMobile">
        <el-menu :default-active="$route.path" class="top-menu" mode="horizontal" router>
          <template v-for="item in menuItems" :key="item.path">
            <!-- 行业分析：使用大导航弹窗（mega menu） -->
            <template v-if="item.path === '/analysis'">
              <el-popover placement="bottom-start" trigger="hover" :hide-after="0" popper-class="mega-menu-popper mega-menu-popper-green">
                <template #reference>
                  <div class="mega-menu-trigger">
                    <el-icon>
                      <component :is="item.icon" />
                    </el-icon>
                    <span class="mega-menu-title">{{ item.title }}</span>
                  </div>
                </template>
                <div class="mega-menu">
                  <div v-for="section in analysisMegaMenuSections" :key="section.title" class="mega-section">
                    <div class="mega-section-title">{{ section.title }}</div>
                    <ul class="mega-links">
                      <li v-for="link in section.items" :key="link.title">
                        <el-link :underline="false" :disabled="!link.path" @click="goPath(link.path)">{{ link.title }}</el-link>
                      </li>
                    </ul>
                  </div>
                </div>
              </el-popover>
            </template>

            <!-- 股市基本面：使用大导航弹窗（mega menu） -->
            <template v-else-if="item.path === '/market-fundamentals'">
              <el-popover placement="bottom-start" trigger="hover" :hide-after="0" :width="isMobile ? 360 : 600" popper-class="mega-menu-popper mega-menu-popper-green">
                <template #reference>
                  <div class="mega-menu-trigger">
                    <el-icon>
                      <component :is="item.icon" />
                    </el-icon>
                    <span class="mega-menu-title">{{ item.title }}</span>
                  </div>
                </template>
                <div class="mega-menu mega-menu-horizontal">
                  <div v-for="section in fundamentalsMegaMenuSections" :key="section.title" class="mega-section">
                    <div class="mega-section-title">{{ section.title }}</div>
                    <ul class="mega-links">
                      <li v-for="link in section.items" :key="link.title">
                        <el-link :underline="false" :disabled="!link.path" @click="goPath(link.path)">{{ link.title }}</el-link>
                      </li>
                    </ul>
                  </div>
                </div>
              </el-popover>
            </template>

            <!-- 其他菜单维持原有渲染逻辑 -->
            <el-sub-menu v-else-if="item.children && item.children.length" :index="item.path" :key="item.path + ':sub'">
              <template #title>
                <el-icon>
                  <component :is="item.icon" />
                </el-icon>
                <span>{{ item.title }}</span>
              </template>
              <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
                <el-icon>
                  <component :is="child.icon" />
                </el-icon>
                <template #title>{{ child.title }}</template>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="item.path" :key="item.path + ':item'">
              <el-icon>
                <component :is="item.icon" />
              </el-icon>
              <template #title>{{ item.title }}</template>
            </el-menu-item>
          </template>
        </el-menu>

        <div class="header-right">
          <div v-if="!isAuthenticated" class="auth-buttons">
            <router-link to="/login">
              <el-button type="primary" size="small">登录</el-button>
            </router-link>
            <router-link to="/register">
              <el-button size="small">注册</el-button>
            </router-link>
          </div>
          <el-dropdown v-else @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
              <span class="username">{{ currentUser?.username || '用户' }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="changePassword">修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 移动端：折叠按钮，仅展示系统名称 -->
      <el-button v-else class="mobile-menu-btn" type="text" @click="mobileMenuVisible = true">
        <el-icon><Menu /></el-icon>
      </el-button>
    </el-header>

    <!-- 顶栏下方子栏：桌面端显示面包屑与风险提示 -->
    <div v-if="!isMobile" class="subbar">
      <div class="subbar-content">
        <div>
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path" :to="item.path">
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="risk-warning">
          <strong>注意：所有数据仅作参考，不作为任何投资建议，风险自担</strong>
        </div>
      </div>
    </div>

    <!-- 主内容 -->
    <el-main class="main-content">
      <router-view />
    </el-main>

    <!-- 移动端抽屉菜单 -->
    <el-drawer v-model="mobileMenuVisible" direction="rtl" size="100%" :with-header="false">
      <div class="mobile-drawer">
        <div class="mobile-drawer-header">
          <h3>导航</h3>
          <el-button type="text" @click="mobileMenuVisible = false"><el-icon><Fold /></el-icon></el-button>
        </div>
        <el-menu :default-active="$route.path" router class="mobile-menu" @select="onMobileMenuSelect">
          <template v-for="item in menuItems" :key="item.path">
            <el-sub-menu v-if="item.children && item.children.length" :index="item.path">
              <template #title>
                <el-icon>
                  <component :is="item.icon" />
                </el-icon>
                <span>{{ item.title }}</span>
              </template>
              <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
                <el-icon>
                  <component :is="child.icon" />
                </el-icon>
                <template #title>{{ child.title }}</template>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="item.path">
              <el-icon>
                <component :is="item.icon" />
              </el-icon>
              <template #title>{{ item.title }}</template>
            </el-menu-item>
          </template>
        </el-menu>

        <div class="mobile-auth">
          <div v-if="!isAuthenticated" class="auth-buttons">
            <router-link to="/login">
              <el-button type="primary" size="small" @click="mobileMenuVisible=false">登录</el-button>
            </router-link>
            <router-link to="/register">
              <el-button size="small" @click="mobileMenuVisible=false">注册</el-button>
            </router-link>
          </div>
          <div v-else class="user-info">
            <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
            <span class="username">{{ currentUser?.username || '用户' }}</span>
            <el-button type="primary" link @click="handleCommand('logout')">退出登录</el-button>
          </div>
        </div>
      </div>
    </el-drawer>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { isAuthenticated, currentUser, logout, initAuth } from '../services/auth'
import {
  Fold,
  Expand,
  HomeFilled,
  TrendCharts,
  DataAnalysis,
  Setting,
  Document,
  User,
  MagicStick,
  DataLine,
  List,
  Timer,
  Calendar,
  Clock,
  Menu,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

// 初始化认证状态
onMounted(() => {
  initAuth()
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
})

// 处理用户下拉菜单命令
function handleCommand(command: string) {
  switch (command) {
    case 'profile':
      ElMessageBox.alert('个人中心功能暂未实现', '提示', {
        confirmButtonText: '确定',
      })
      break
    case 'changePassword':
      ElMessageBox.alert('修改密码功能暂未实现', '提示', {
        confirmButtonText: '确定',
      })
      break
    case 'logout':
      ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          logout()
          router.push('/login')
        })
        .catch(() => {})
      break
  }
}
// 响应式：是否为移动端与抽屉状态
const isMobile = ref(false)
const mobileMenuVisible = ref(false)

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// 菜单项配置
const menuItems = computed(() => {
  const baseMenuItems = [
    {
      path: '/',
      title: '首页',
      icon: 'HomeFilled',
    },
    {
      path: '/market-fundamentals',
      title: '股市基本面',
      icon: 'DataAnalysis',
      children: [
        {
          path: '/analysis/market-change',
          title: '大盘涨跌',
          icon: 'TrendCharts',
        },
        {
          path: '/analysis/market',
          title: '大盘分析',
          icon: 'TrendCharts',
        },
        {
          path: '/analysis/index-list',
          title: '指数列表',
          icon: 'List',
        },
        {
          path: '/analysis/index-dailybasic',
          title: '指数日基本面',
          icon: 'List',
        },
        {
          path: '/analysis/news-list',
          title: 'CCTV新闻',
          icon: 'Document',
        },
        {
          path: '/analysis/news-wordcloud',
          title: '新闻热力图',
          icon: 'DataLine',
        },
        {
          path: '/analysis/irm-qa-sh',
          title: '上证E互动问答',
          icon: 'List',
        },
        {
          path: '/analysis/irm-qa-sz',
          title: '深证互动易问答',
          icon: 'List',
        },
      ],
    },
    {
      path: '/analysis',
      title: '行业分析',
      icon: 'TrendCharts',
      children: [
        {
          path: '/analysis/congestion',
          title: '行业整体分析',
          icon: 'TrendCharts',
        },
        {
          path: '/industries',
          title: '单一行业分析',
          icon: 'Document',
        }
      ],
    },
    {
      path: '/etf',
      title: 'ETF分析',
      icon: 'DataLine',
      children: [
        { path: '/analysis/etf-basic', title: 'ETF基本信息', icon: 'List' },
        { path: '/analysis/etf-daily', title: 'ETF日线行情', icon: 'TrendCharts' },
        { path: '/analysis/etf-realtime', title: 'ETF实时行情', icon: 'TrendCharts' },
        { path: '/analysis/etf-correlation', title: 'ETF相关性分析', icon: 'DataLine' },
        { path: '/analysis/etf-volatility', title: 'ETF波动性列表', icon: 'TrendCharts' },
        { path: '/etf-system', title: '全天候ETF投资系统', icon: 'TrendCharts'},
      ],
    },
    {
      path: '/stock-picker',
      title: '智能选股',
      icon: 'MagicStick',
      children: [
        {
          path: '/stock-list',
          title: '股票列表',
          icon: 'List',
        },
        {
          path: '/stock-history',
          title: '个股分析',
          icon: 'Calendar',
        },
        {
          path: '/analysis/factor-stock-picker',
          title: '因子选股',
          icon: 'List',
        },
        {
          path: '/stock-ah-comparison',
          title: 'AH溢价对比',
          icon: 'List',
        },
        {
          path: '/stock-broker-recommend',
          title: '券商推荐评级',
          icon: 'List',
        },
        {
          path: '/stock-ccass-hold',
          title: '中结持股汇总',
          icon: 'List',
        },
        {
          path: '/stock-ccass-hold-detail',
          title: '中结持股明细',
          icon: 'List',
        },
        {
          path: '/stock-hm-detail',
          title: '游资每日明细',
          icon: 'List',
        },
        {
          path: '/stock-limit-step',
          title: '连板天梯',
          icon: 'List',
        },
        {
          path: '/strategy-results',
          title: '策略选股',
          icon: 'List',
        },
        {
          path: '/stock-cyq-perf',
          title: '每日筹码及胜率',
          icon: 'List',
        },
        {
          path: '/stock-hk-hold-detail',
          title: '沪深港股通持股明细',
          icon: 'List',
        },
        {
          path: '/stock-hsgt-top10',
          title: '沪深股通十大成交股',
          icon: 'List',
        },
        {
          path: '/stock-hsgt-list',
          title: '沪深港通股票列表',
          icon: 'List',
        },
        {
          path: '/stock-correlation',
          title: '股票相关性分析',
          icon: 'DataLine',
        },
        {
          path: '/stock-volatility',
          title: '股票波动率分析',
          icon: 'TrendCharts',
        },
        
      ],
    },
    {
      path: '/quant',
      title: '量化分析',
      icon: 'DataAnalysis',
      children: [
        {
          path: '/strategy-list',
          title: '回测策略列表',
          icon: 'Document',
        },
        {
          path: '/backtest-strategy',
          title: '创建回测任务',
          icon: 'Setting',
        },
        {
          path: '/backtest-history',
          title: '回测任务历史',
          icon: 'Clock',
        },
      ],
    },
    {
      path: '/ml',
      title: '机器学习研究',
      icon: 'DataAnalysis',
      children: [
        { path: '/ml/index-prediction-validation', title: '指数预测验证', icon: 'TrendCharts' },
      ],
    },
    // 在此处新增个人中心入口
    {
      path: '/personal/holdings',
      title: '个人中心',
      icon: 'User',
    },
    // {
    //       path: '/forum/posts',
    //       title: '论坛讨论区',
    //       icon: 'Document'
    //     }
  ]

  // 只有管理员用户才能看到系统设置菜单
  if (currentUser.value && currentUser.value.is_admin) {
    baseMenuItems.push({
      path: '/settings',
      title: '系统设置',
      icon: 'Setting',
    })
  }

  return baseMenuItems
})

// 行业分析大导航结构（悬停展开的 mega menu）
const analysisMegaMenuSections = [
  // {
  //   title: '景气度指标',
  //   items: [
  //     { title: '净利润增长率' },
  //     { title: '营业收入增长率' },
  //     { title: '营业总收入增长率' },
  //     { title: 'ROE增长率' },
  //     { title: '利润总额增长率' },
  //   ],
  // },
  {
    title: '拥挤度指标',
    items: [
      // { title: '行业整体分析', path: '/analysis/congestion' },
      { title: '单一行业分析', path: '/industries' },
      { title: '成交金额占比分位数', path: '/analysis/congestion/turnover' },
      { title: '行业业绩指标', path: '/analysis/congestion/performance' },
      { title: '行业资金流', path: '/analysis/congestion/fundflow' },
      { title: '行业矩形树图', path: '/analysis/congestion/treemap' },
      { title: '行业宽度热力图', path: '/analysis/congestion/breadth' },
      { title: '行业规模宽度', path: '/analysis/congestion/scale-breadth' },
      { title: '行业产出营收', path: '/analysis/congestion/output-scale' },
      { title: '指数RPS强度排名', path: '/analysis/congestion/index-rps' },
      // { title: '大盘挤拥度' },
      // { title: '融资买入/成交额' },
      // { title: '行业挤拥度-申万1级' },
      // { title: '行业挤拥度-申万2级' },
      // { title: '小市值因子挤拥度与因子估值' },
    ],
  },
  {
    title: '申万行业数据',
    items: [
      { title: '申万行业分类', path: '/analysis/sw-index-classify' },
      { title: '行业成分构成', path: '/analysis/sw-index-member-all' },
    ],
  },
  // {
  //   title: '机构调研',
  //   items: [
  //     { title: '近期调研列表' },
  //     { title: '近30天调研次数排名' },
  //     { title: '近30天机构调研排名' },
  //   ],
  // },
  // {
  //   title: '其他',
  //   items: [
  //     { title: '业绩预告统计' },
  //     { title: '估值' },
  //     { title: '回购' },
  //     { title: '近期A股回购数据' },
  //   ],
  // },
]

// 股市基本面大导航结构（悬停展开的 mega menu）
const fundamentalsMegaMenuSections = [
  {
    title: '大盘分析',
    items: [
      { title: '大盘涨跌', path: '/analysis/market-change' },
      { title: '大盘分析', path: '/analysis/market' },
    ],
  },
  {
    title: '指数分析',
    items: [
      { title: '指数分析', path: '/analysis/index-analysis' },
      { title: '指数列表', path: '/analysis/index-list' },
      { title: '指数日基本面', path: '/analysis/index-dailybasic' },
    ],
  },
  {
    title: '基金/ETF',
    items: [
      { title: 'ETF基本信息', path: '/analysis/etf-basic' },
      { title: 'ETF日线行情', path: '/analysis/etf-daily' },
    ],
  },
  {
    title: '新闻与舆情',
    items: [
      { title: 'CCTV新闻', path: '/analysis/news-list' },
      { title: '新闻热力图', path: '/analysis/news-wordcloud' },
    ],
  },
  {
    title: '互动问答',
    items: [
      { title: '上证E互动问答', path: '/analysis/irm-qa-sh' },
      { title: '深证互动易问答', path: '/analysis/irm-qa-sz' },
    ],
  },
]

function goPath(path?: string) {
  if (!path) return
  router.push(path)
}

// 面包屑导航（桌面端显示）
const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta && item.meta.title)
  return matched.map((item) => ({
    path: item.path,
    title: item.meta?.title || '未知页面',
  }))
})

// 移动端：选择菜单或路由变化时自动关闭抽屉
function onMobileMenuSelect(index: string, indexPath: string[]) {
  if (isMobile.value) {
    mobileMenuVisible.value = false
  }
}

watch(
  () => route.path,
  () => {
    if (isMobile.value && mobileMenuVisible.value) {
      mobileMenuVisible.value = false
    }
  }
)
</script>

<style scoped>
.layout-container {
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
}

.topbar {
  background-color: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 64px;
  box-shadow: 0 2px 4px rgba(0, 21, 41, 0.08);
}

.topbar-left {
  display: flex;
  align-items: center;
}

.app-title {
  margin: 0;
  font-size: 16px;
  white-space: nowrap;
}

.breadcrumb {
  margin-left: 8px;
  white-space: nowrap;
}

.risk-warning {
  font-weight: bold;
  color: #ff0000;
  font-size: 14px;
  white-space: nowrap;
}

.topbar-right {
  display: flex;
  align-items: center;
}

.top-menu {
  border-bottom: none;
  margin-right: 12px;
  white-space: nowrap;
}

/* mega menu 触发器样式，保持与顶栏菜单一致 */
.mega-menu-trigger {
  height: 60px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}
.mega-menu-title {
  font-size: 14px;
  white-space: nowrap;
  writing-mode: horizontal-tb;
}

/* mega menu 弹窗样式 */
.mega-menu-popper {
  padding: 20px 24px;
  width: fit-content;
  max-width: 95vw;
}
.mega-menu-popper-green {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%) !important;
}
.mega-menu-popper-green .mega-section-title {
  color: #2e7d6e;
}
.mega-menu {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.mega-menu-horizontal {
  display: flex;
  gap: 0px;
  align-items: flex-start;
  flex-wrap: nowrap;
}
.mega-menu-horizontal .mega-section {
  min-width: 120px;
  flex-shrink: 0;
}
.mega-section-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  font-size: 15px;
}
.mega-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}
.mega-menu .el-link {
  color: #606266;
  font-size: 14px;
  padding: 4px 0;
  display: inline-block;
}
.mega-menu .el-link:hover {
  color: #409EFF;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.username {
  margin-left: 8px;
  font-size: 14px;
}

.auth-buttons {
  display: flex;
  gap: 10px;
}

.mobile-menu-btn {
  color: #606266;
}

.main-content {
  background-color: #f5f5f5;
  padding: 20px;
  overflow-y: auto;
}

/* 抽屉样式 */
.mobile-drawer {
  padding: 12px;
}

.mobile-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.mobile-auth {
  margin-top: 12px;
}
/* 顶栏下方子栏样式，确保面包屑与风险提示同一行 */
.subbar {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
}
.subbar-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: nowrap;
  gap: 16px;
  padding: 8px 16px;
}
</style>
