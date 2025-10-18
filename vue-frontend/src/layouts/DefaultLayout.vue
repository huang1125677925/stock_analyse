<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarWidth" class="sidebar">
      <div class="sidebar-header">
        <h3>股票分析系统</h3>
      </div>
      <el-menu
        :default-active="$route.path"
        class="sidebar-menu"
        :collapse="isCollapse"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <template v-for="item in menuItems" :key="item.path">
          <!-- 有子菜单的项 -->
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

          <!-- 没有子菜单的项 -->
          <el-menu-item v-else :index="item.path">
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-button type="text" @click="toggleSidebar" class="collapse-btn">
            <el-icon>
              <Expand v-if="isCollapse" />
              <Fold v-if="!isCollapse" />
            </el-icon>
          </el-button>
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path" :to="item.path">
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
          <!-- 风险提示信息 -->
          <div class="risk-warning">
            <strong>注意：所有数据仅作参考，不作为任何投资建议，风险自担</strong>
          </div>
        </div>
        <div class="header-right">
          <!-- 未登录状态 -->
          <div v-if="!isAuthenticated" class="auth-buttons">
            <router-link to="/login">
              <el-button type="primary" size="small">登录</el-button>
            </router-link>
            <router-link to="/register">
              <el-button size="small">注册</el-button>
            </router-link>
          </div>

          <!-- 已登录状态 -->
          <el-dropdown v-else @command="handleCommand">
            <span class="user-info">
              <el-avatar
                :size="32"
                src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
              />
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
      </el-header>

      <!-- 主要内容区域 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

// 初始化认证状态
onMounted(() => {
  initAuth()
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
const isCollapse = ref(false)

// 侧边栏宽度计算
const sidebarWidth = computed(() => {
  return isCollapse.value ? '64px' : '200px'
})

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
          path: '/analysis/market',
          title: '大盘分析',
          icon: 'TrendCharts',
        },
        {
          path: '/analysis/news-list',
          title: 'CCTV新闻',
          icon: 'Document',
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

// 面包屑导航
const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta && item.meta.title)
  return matched.map((item) => ({
    path: item.path,
    title: item.meta?.title || '未知页面',
  }))
})

// 切换侧边栏展开/收起
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
}

.sidebar {
  background-color: #304156;
  transition: width 0.3s;
  height: 100vh;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2b3a4b;
  color: white;
  border-bottom: 1px solid #434a50;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-menu {
  border-right: none;
}

.header {
  background-color: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 21, 41, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-btn {
  margin-right: 16px;
  color: #606266;
}

.breadcrumb {
  margin-left: 8px;
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

.risk-warning {
  margin-left: 20px;
  font-weight: bold;
  color: #ff0000;
  font-size: 14px;
}

.main-content {
  background-color: #f5f5f5;
  padding: 20px;
  overflow-y: auto;
}
</style>