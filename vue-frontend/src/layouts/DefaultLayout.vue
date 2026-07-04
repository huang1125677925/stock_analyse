<template>
  <el-container class="layout-container">
    <el-header class="topbar">
      <div class="topbar-left" @click="$router.push('/')" style="cursor: pointer;">
        <h3 class="app-title">股票分析系统</h3>
      </div>

      <div class="topbar-right" v-if="!isMobile">
        <el-menu :default-active="$route.path" class="top-menu" mode="horizontal" router :ellipsis="false">
          <template v-for="item in menuItems" :key="item.path">
            <template v-if="hasMegaMenu(item.path)">
              <el-popover
                placement="bottom-start"
                trigger="hover"
                :hide-after="0"
                :width="'auto'"
                popper-class="mega-menu-popper"
                :show-arrow="false"
                :offset="0"
              >
                <template #reference>
                  <div class="mega-menu-trigger" :class="{ 'is-active': isMegaMenuActive(item.path) }">
                    <el-icon>
                      <component :is="item.icon" />
                    </el-icon>
                    <span class="mega-menu-title">{{ item.title }}</span>
                    <el-icon class="el-icon--right"><arrow-down /></el-icon>
                  </div>
                </template>
                <div class="mega-menu-container">
                  <div class="mega-menu-content">
                    <div v-for="section in getMegaMenuSections(item.path)" :key="section.title || section.items.map(link => link.title).join('-')" class="mega-column">
                      <div v-if="section.title" class="mega-column-title">{{ section.title }}</div>
                      <ul class="mega-column-list">
                        <li v-for="link in section.items" :key="link.title">
                          <el-link 
                            :underline="false" 
                            :disabled="!link.path" 
                            @click="goPath(link.path)" 
                            class="mega-link"
                            :class="{ 'is-active': $route.path === link.path }"
                          >
                            {{ link.title }}
                          </el-link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </el-popover>
            </template>

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
                <el-dropdown-item v-if="currentUser?.is_admin" command="inviteCode">邀请码生成</el-dropdown-item>
                <el-dropdown-item command="changePassword">修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <el-button v-else class="mobile-menu-btn" type="text" @click="mobileMenuVisible = true">
        <el-icon><Menu /></el-icon>
      </el-button>
    </el-header>

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

    <el-main class="main-content">
      <router-view />
    </el-main>

    <el-drawer v-model="mobileMenuVisible" direction="rtl" size="100%" :with-header="false">
      <div class="mobile-drawer">
        <div class="mobile-drawer-header">
          <h3>导航</h3>
          <el-button type="text" @click="mobileMenuVisible = false"><el-icon><Fold /></el-icon></el-button>
        </div>
        <el-menu :default-active="$route.path" router class="mobile-menu" @select="onMobileMenuSelect">
          <template v-for="item in menuItems" :key="item.path">
            <el-sub-menu v-if="hasMegaMenu(item.path)" :index="item.path">
              <template #title>
                <el-icon>
                  <component :is="item.icon" />
                </el-icon>
                <span>{{ item.title }}</span>
              </template>
              <template v-for="section in getMegaMenuSections(item.path)" :key="section.title">
                <el-menu-item-group :title="section.title">
                  <el-menu-item v-for="link in section.items" :key="link.title" :index="link.path">
                    {{ link.title }}
                  </el-menu-item>
                </el-menu-item-group>
              </template>
            </el-sub-menu>

            <el-sub-menu v-else-if="item.children && item.children.length" :index="item.path">
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
          <div v-else class="mobile-user-menu">
            <div class="mobile-user-header">
              <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
              <span class="username">{{ currentUser?.username || '用户' }}</span>
            </div>
            <div class="mobile-user-actions">
              <div v-if="currentUser?.is_admin" class="mobile-user-item" @click="handleCommand('inviteCode')">
                <el-icon><Setting /></el-icon>
                <span>邀请码生成</span>
              </div>
              <div class="mobile-user-item" @click="handleCommand('changePassword')">
                <el-icon><Lock /></el-icon>
                <span>修改密码</span>
              </div>
              <div class="mobile-user-item logout" @click="handleCommand('logout')">
                <el-icon><SwitchButton /></el-icon>
                <span>退出登录</span>
              </div>
            </div>
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
  User,
  MagicStick,
  DataLine,
  List,
  Timer,
  Calendar,
  Clock,
  Menu,
  ArrowDown,
  Lock,
  SwitchButton,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  initAuth()
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
})

const isMobile = ref(false)
const mobileMenuVisible = ref(false)

function updateIsMobile() {
  isMobile.value = window.innerWidth <= 768
}

async function handleCommand(command: string) {
  switch (command) {
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })
        logout()
        router.push('/')
      } catch {
      }
      break
    case 'inviteCode':
      router.push('/admin/invite-codes')
      break
    case 'changePassword':
      router.push('/change-password')
      break
  }
}

interface MenuItem {
  path: string
  title: string
  icon: string
  children?: MenuItem[]
}

const menuItems = computed(() => {
  const baseMenuItems: MenuItem[] = [
    {
      path: '/market-overview',
      title: '大盘概览',
      icon: 'DataAnalysis',
    },
    {
      path: '/etf',
      title: '行业跟踪',
      icon: 'DataLine',
    },
    {
      path: '/stock-picker',
      title: '股票实战',
      icon: 'MagicStick',
    },
  ]

  return baseMenuItems
})

const marketOverviewMegaMenuSections = [
  {
    title: '',
    items: [
      { title: '大盘指数估值', path: '/market-overview/index-valuation' },
      { title: '大盘指数RPS', path: '/major-index-rps' },
      { title: '大盘资金分析', path: '/market-fund-flow' },
    ],
  },
]

const etfIndexMegaMenuSections = [
  {
    title: '行业估值',
    items: [
      { title: '申万行业估值分析', path: '/analysis/sw-industry-valuation' },
    ],
  },
  {
    title: '行业热点',
    items: [
      { title: '行业成交额分析', path: '/analysis/congestion/turnover' },
      { title: '行业流入资金分析', path: '/analysis/congestion/fundflow' },
      { title: '行业宽度分析', path: '/analysis/congestion/breadth' },
      { title: '行业涨跌比分析', path: '/analysis/congestion/up-down-ratio' },
      { title: '指数RPS强度排名', path: '/analysis/congestion/index-rps' },
    ],
  },
  {
    title: '行业洞察',
    items: [
      { title: 'ETF全面分析', path: '/analysis/etf-tree' },
    ],
  },
]

const stockPickerMegaMenuSections = [
  {
    title: '',
    items: [
      { title: '打板分析选股', path: '/stock-picker/limit-board-analysis' },
      { title: '波段趋势选股', path: '/stock-picker/swing-practice' },
    ],
  },
]

function goPath(path?: string) {
  if (!path) return
  router.push(path)
}

function hasMegaMenu(path: string) {
  return ['/market-overview', '/analysis', '/stock-picker', '/etf'].includes(path)
}

function isMegaMenuActive(path: string) {
  switch (path) {
    case '/market-overview':
      return route.path === '/market-overview/index-valuation' || route.path === '/major-index-rps' || route.path === '/market-fund-flow'
    case '/etf':
      return route.matched.some((record) => record.path === '/analysis')
    case '/stock-picker':
      return route.matched.some((record) => record.path === '/stock-picker') || route.path.startsWith('/stock-picker/')
    default:
      return route.path.startsWith(path)
  }
}

function getMegaMenuSections(path: string) {
  switch (path) {
    case '/market-overview':
      return marketOverviewMegaMenuSections
    case '/stock-picker':
      return stockPickerMegaMenuSections
    case '/etf':
      return etfIndexMegaMenuSections
    default:
      return []
  }
}

const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta && item.meta.title)
  return matched.map((item) => ({
    path: item.path,
    title: item.meta?.title || '未知页面',
  }))
})

function onMobileMenuSelect(_index: string, _indexPath: string[]) {
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
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  width: 100vw;
  max-width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.topbar {
  background-color: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 64px;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 21, 41, 0.08);
}

.topbar-left {
  display: flex;
  align-items: center;
  margin-right: 32px;
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
  flex: 1;
  justify-content: space-between;
}

.top-menu {
  border-bottom: none;
  margin-right: 12px;
  white-space: nowrap;
}

.mega-menu-trigger {
  height: 60px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  outline: none;
  transition: color 0.2s;
}

.mega-menu-trigger:hover,
.mega-menu-trigger.is-active {
  color: var(--el-color-primary);
}

.mega-menu-title {
  font-size: 14px;
  white-space: nowrap;
  writing-mode: horizontal-tb;
}

.mega-menu-content {
  display: flex;
  gap: 24px;
  padding: 8px 4px;
}

.mega-column-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.mega-column-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.mega-column-list li + li {
  margin-top: 8px;
}

.mega-link.is-active {
  color: var(--el-color-primary);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
}

.auth-buttons {
  display: flex;
  gap: 8px;
}

.user-info {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.username {
  color: #303133;
}

.subbar {
  border-bottom: 1px solid #ebeef5;
  background: #fff;
  flex-shrink: 0;
}

.subbar-content {
  height: 40px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.main-content {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: auto;
  background: #f5f7fa;
}

.mobile-menu-btn {
  margin-left: auto;
}

.mobile-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mobile-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.mobile-menu {
  flex: 1;
}

.mobile-auth {
  padding-top: 16px;
}

.mobile-user-menu {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-user-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mobile-user-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-user-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.mobile-user-item.logout {
  color: #f56c6c;
}
</style>
