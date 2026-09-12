import './assets/main.css'

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import { warnIfMisconfiguredDevHost } from './config/api'
import { loadDeepSeekConfig } from './services/deepseekConfig'
import { clearCapturedRecords, setAiAnalysisRoute } from './services/aiPageDataStore'

warnIfMisconfiguredDevHost()

// 恢复本机保存的 DeepSeek 配置，全局数据分析组件开箱可用
loadDeepSeekConfig()

// 页面数据分析只针对「当前页面」：路由切换时清空采集缓存，并记录当前页面名称与路径
router.afterEach((to) => {
  clearCapturedRecords()
  setAiAnalysisRoute({
    fullPath: to.fullPath,
    title: (to.meta?.title as string) || '',
  })
})

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus)
app.use(router)

app.mount('#app')
