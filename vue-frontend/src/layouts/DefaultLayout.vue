<template>
  <el-container class="layout-container">
    <!-- 顶栏布局 -->
    <el-header class="topbar">
      <div class="topbar-left">
        <h3 class="app-title">股票分析系统</h3>
        <el-breadcrumb v-if="!isMobile" separator="/" class="breadcrumb">
          <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path" :to="item.path">
            {{ item.title }}
          </el-breadcrumb-item>
        </el-breadcrumb>
        <div v-if="!isMobile" class="risk-warning">
          <strong>注意：所有数据仅作参考，不作为任何投资建议，风险自担</strong>
        </div>
      </div>

      <!-- 桌面端：横向菜单 + 用户操作 -->
      <div class="topbar-right" v-if="!isMobile">
        <el-menu :default-active="$route.path" class="top-menu" mode="horizontal" router>
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

    <!-- 主内容 -->
    <el-main class="main-content">
      <router-view />
    </el-main>

    <!-- 移动端抽屉菜单 -->
    <el-drawer v-model="mobileMenuVisible" direction="rtl" size="80%" :with-header="false">
      <div class="mobile-drawer">
        <div class="mobile-drawer-header">
          <h3>导航</h3>
          <el-button type="text" @click="mobileMenuVisible = false"><el-icon><Fold /></el-icon></el-button>
        </div>
        <el-menu :default-active="$route.path" router class="mobile-menu">
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
          path: '/analysis/news-list',
          title: 'CCTV新闻',
          icon: 'Document',
        },
        {
          path: '/analysis/news-wordcloud',
          title: '新闻热力图',
          icon: 'DataLine',
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
          path: '/strategy-results',
          title: '策略选股',
          icon: 'List',
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

// 面包屑导航（桌面端显示）
const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta && item.meta.title)
  return matched.map((item) => ({
    path: item.path,
    title: item.meta?.title || '未知页面',
  }))
})
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
}

.risk-warning {
  margin-left: 20px;
  font-weight: bold;
  color: #ff0000;
  font-size: 14px;
}

.topbar-right {
  display: flex;
  align-items: center;
}

.top-menu {
  border-bottom: none;
  margin-right: 12px;
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
</style>