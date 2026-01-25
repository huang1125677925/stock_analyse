<template>
  <el-container class="layout-container">
    <!-- 顶栏布局 -->
    <el-header class="topbar">
      <div class="topbar-left" @click="$router.push('/')" style="cursor: pointer;">
        <h3 class="app-title">股票分析系统</h3>
      </div>

      <!-- 桌面端：横向菜单 + 用户操作 -->
      <div class="topbar-right" v-if="!isMobile">
        <el-menu :default-active="$route.path" class="top-menu" mode="horizontal" router :ellipsis="false">
          <template v-for="item in menuItems" :key="item.path">
            <!-- Mega Menu Logic using Popover for better layout control -->
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
                  <div class="mega-menu-trigger" :class="{ 'is-active': $route.path.startsWith(item.path) }">
                    <el-icon>
                      <component :is="item.icon" />
                    </el-icon>
                    <span class="mega-menu-title">{{ item.title }}</span>
                    <el-icon class="el-icon--right"><arrow-down /></el-icon>
                  </div>
                </template>
                <div class="mega-menu-container">
                  <div class="mega-menu-content">
                    <div v-for="section in getMegaMenuSections(item.path)" :key="section.title" class="mega-column">
                      <div class="mega-column-title">{{ section.title }}</div>
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

            <!-- 普通下拉菜单 -->
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

            <!-- 普通菜单项 -->
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
                <el-dropdown-item v-if="currentUser?.is_admin" command="inviteCode">邀请码生成</el-dropdown-item>
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
        <div class="mindset-carousel">
          <el-carousel height="24px" direction="vertical" :autoplay="true" indicator-position="none" :interval="5000">
            <el-carousel-item v-for="item in quotes" :key="item">
              <span class="quote-text">"{{ item }}"</span>
            </el-carousel-item>
          </el-carousel>
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
            <!-- 移动端 Mega Menu 展示逻辑 -->
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

            <!-- 普通下拉菜单 -->
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
              <div class="mobile-user-item" @click="handleCommand('profile')">
                <el-icon><User /></el-icon>
                <span>个人中心</span>
              </div>
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
  Document,
  User,
  MagicStick,
  DataLine,
  List,
  Timer,
  Calendar,
  Clock,
  Menu,
  ArrowDown,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const quotes = [
  "1. 投资的终极真理：低买高卖。",
  "2. 市场的核心规律：最大的利好是价格便宜，最大的利空是价格昂贵。",
  "3. 投资的朴素哲学：熊市买入，牛市卖出；人弃我取，人取我予。",
  "4. 投资的目标：不是每次战胜市场，而是在指数回到原位时，你的资产比上次更多。",
  "5. 投资体系重于预测：不预测未来，而是建立一套能应对所有可能情况的体系。",
  "6. 投资与做人相通：在市场无人问津时出手购买，在人声鼎沸时慷慨卖出，做个“善良”的人。",
  "7. 投资是一场马拉松：对手只有你自己，能跑到终点的人已是赢家。",
  "8. 投资的本质是一场概率游戏：你所能做的，就是通过努力提高胜利的概率。",
  "9. 投资就是做生意：以有利的价格交易，争取主动，无欲则刚。",
  "10. 投资的底层逻辑：是你性格和世界观的外在体现。你是什么样的人，就会做什么样的投资。",
  "11. 第一铁律：本金安全永远第一。",
  "12. 仓位管理（20%原则）：单一品种占金融资产比例原则上不超过20%。",
  "13. 闲钱投资：只动用闲钱投资，并至少留够未来一至三年的生活费。",
  "14. 不要豪赌已有之物：不要拿你已经拥有的、足够好的生活，去赌你臆想中“需要”的东西。",
  "15. 最大的危险时刻：恰恰是在资本市场大赚、志得意满的时候，此时要格外审视策略。",
  "16. 永远不要满仓满杠杆：即使再看好，也要避免因意外情况产生无法承受的损失。",
  "17. 警惕高收益承诺：不懂就不要乱投，凡是承诺高收益、固定回报的，都要高度警惕。",
  "18. 投资的胜负手：首要考虑的是最坏情况下的亏损你是否能承受，而非能赚多少钱。",
  "19. 不要借钱投资、短贷长投：此为投资大忌。",
  "20. 长远之计：活下去成为老兵，比争做流芳百世的将星更重要。",
  "21. 别无选择时才资产配置：对于绝大多数普通人，资产配置才是唯一的生路。",
  "22. 简单法则：买便宜的总不会错。",
  "23. 判断标准：选择“不会死”的品种，买在相对低位。",
  "24. 对待下跌：下跌是机会的源泉；只要是跌出来的，值得兴奋。",
  "25. 对待上涨：上涨是风险的积聚；只要是涨出来的，要保持警惕。",
  "26. 何为“低估”：当一个品种被所有人唱衰、嫌弃时，往往机会已至。",
  "27. 警惕追高：千万不要追涨那些不断创新高、人人抢购的投资标的。",
  "28. 逆向挖掘：关注那些无人问津、跌跌不休的品种，可能是未来的金矿。",
  "29. 均值回归定律：跌多了总会涨，涨多了总会跌。无论是大周期还是小周期。",
  "30. 永不向下摊平的危险：买在最高点未必致命，致命的是在半山腰就重仓乃至满仓。",
  "31. 买入的信心：在你买入的那一刹那，就应该知道自己是会赚还是会赔。",
  "32. 买入的原则：左侧分批买入时，时间和空间至少要占其一。",
  "33. 分批买入精髓：首笔价格无需苛求极致低估；但一旦进入低估区间，应按计划果断加码。",
  "34. 买入的策略：成本要尽量控制在最低价的10%-15%以内。",
  "35. 买入的逻辑：先搞清楚资金的去向和投资的底层逻辑。搞不清楚，宁可错过。",
  "36. 买入的准备：买入之前，预设好盈亏点、仓位、最坏情况及后续应对策略。",
  "37. 绝不亏本出局：买入的所有品种，都要以实现盈利为目标。“割肉”不在体系的选项内。",
  "38. 不要急于求成：播种与收获不在一个季节。今天买明天涨，这种想法本身就不科学。",
  "39. 价值与趋势相结合：从根上是价值投资者，但只要有助于挣钱和规避风险的方法，都可灵活采用。",
  "40. 持有的关键：耐心持有，往往比买入和卖出更难，也更重要。",
  "41. 等待的品质：“等得起”是做好投资最珍贵的品质之一。",
  "42. 投资的节奏：如同跳舞，市场冰冷时稳步布局（守），市场狂热时悄然撤离（攻）。",
  "43. 龟兔赛跑的智慧：在市场波动中保持净值稳步向上，等待最终的爆发式增长。",
  "44. 信念是发动机：投资需要信念。它能让你在市场困境和嘲笑声中坚持到底。",
  "45. 淡定之源：只要品种没问题、成本足够低，即使再跌也只是因为情绪，你只需安心等待起风。",
  "46. 时间的玫瑰：只要品种不差、成本够低，“起飞”虽迟到但必到，回报值得等待。",
  "47. 应对短期无效：投资要有“三年不开张，开张吃三年”的觉悟。",
  "48. 警惕短期噪声：每天的新消息、新传言，只会打乱你的节奏。少看为好。",
  "49. 满仓穿越牛熊的前提：仅适用于茅台那样“永远不会死且被严重低估”的极品。",
  "50. 卖出比买入更难：买入是进取，卖出是撤退。过早会损失大利润，过晚会血本无归。",
  "51. 何时卖出？由市场决定，而非由你的感觉或他人的预测决定。",
  "52. 新高不卖：绝不因为“感觉”高了或想“抄顶”而卖出上涨中的仓位。",
  "53. 让利润奔跑：能否在上涨趋势中死死拿住筹码，决定了最终能否取得大成功。",
  "54. 卖出心法：不要有心魔，不要因为曾见过某个高价，就舍不得以稍低的价格卖出。",
  "55. 卖出是再平衡：卖出是为了回收本金，保留利润，并在低位找到新的猎物。",
  "56. 分批卖出策略：不必追求卖在最高点，分两次操作可以兼顾收益与安全。",
  "57. 极端情绪的指向标：当他人的情绪走向极端（极度贪婪或恐惧）时，就是你执行既定卖出策略的时刻。",
  "58. 投资的敌人：不是市场，而是自己的人性——贪、嗔、痴、慢、疑。",
  "59. 情绪是无用的废物：投资中不需要感觉，更不能被贪婪和恐惧绑架。情绪应留给风花雪月。",
  "60. 纪律是一切：没有严格的纪律执行，一切策略都是空中楼阁。",
  "61. 建立一个系统：构建并严格执行一套能克服人性弱点的投资系统。",
  "62. 最难的是坚持：大部分人制定了策略，最终仍因无法长期坚持而失败。",
  "63. 舒服最重要：你的操作，无论是买入、持有还是卖出，前提是让自己“舒服”。",
  "64. 识别“正常”的能力：知道什么是市场的“正常”与“不正常”，才能避免站在山顶或谷底。",
  "65. 反思的力量：不要被最近一次的成功或失败经验绑架，而要将其融入到体系中不断完善。",
  "66. 赢家心态（过程导向）：不在于买完后的涨跌，而在买入的那一刻就已确信必胜的逻辑。",
  "67. 对抗从众本能：如果思维和市场上的大多数人一样，你大概率会成为韭菜。",
  "68. 信息过载的危害：有时候，知道的太多反而是坏事。“闭着眼捂着耳”安稳投资也能做好。",
  "69. 投资是自己的事：不要把投资建立在“怼人”和对错之争上。",
  "70. 不必说服他人：不要轻易给别人投资建议，因为后果你可能无法承担。",
  "71. 多数人的观点不可靠：投资的关键在于，要敢于与多数人的观点背道而驰。",
  "72. 走出羊群：人们因为惧怕落单而不敢走出羊群，知行合一远比随大流困难得多。",
  "73. 从历史中吸取教训（但不刻舟求剑）：过去有效的经验绝不能简单推论未来一定有效（无论牛市末期还是上新杠杆）。",
  "74. 记录与复盘：记录你自己的市场和买卖判断并验证，会让你了解自己的预测胜率，切忌用其为指导行动的准则。",
  "75. 凡事留有余地：永远不要把局面搞到进退两难的境地，“不要把自己推到极致”。",
  "76. 能力圈自知：必须清醒认识自己的能力范围，不要在不懂的领域下重注（如初创投资）。",
  "77. 博采众长，独立思考：投资是理论与实践相结合的艺术，”守正”（坚守原则）”出奇”（释放想象力兼备）。",
  "78. 投资是做事的映射：“对市场发展的现状要有清晰清晰的判断；对市场未来方向要有粗略的判断。”",
  "79. 知行路径差异：“通过努力学习树立正确的理念，策略，体系；投资是在科技之上的艺术。”",
  "80. 体系的建立：一个成熟的体系需要多种策略搭配和一个观察体系。",
  "81. 策略的演变：没有最好的投资策略，只有最适合你的。策略也需不断优化、与时俱进。",
  "82. 策略的融合：科学的理性计算（占75%）与艺术的、适应人性的灵活性（占25%）相结合。",
  "83. 左侧与右侧交易各有优劣：包容所有被证明有效的策略，改造使其为自己所用。",
  "84. 学习的捷径：80%以上的失败经验可以从别人的教训中学习和规避。",
  "85. 有效的经历：只有在完整的投资周期里，从始至终清楚明白的经历，才是有效的经验。",
  "86. 从匠人到艺术家：先建立严格的体系成为能稳定盈利的“匠人”，再追求突破体系瓶颈的“艺术家”。",
  "87. 节奏与分寸：投资节奏讲究“平衡”（随波逐流）与“分寸”（仓位控制）。",
  "88. 概率化布局：投资是一场赌博，但可以通过多种方式布局（了解胜率及仓位配置）。",
  "89. 排列组合逻辑：“好行业+好事公司+低位+低成本+仓位管理”的组合失败风险更低。",
  "90. 面向未来而非当下布局：“投资专注于未来钻石领域，不为美好当前。”",
  "91. 财富增长的公式：“积少成多，尽早开始，注重风险。”",
  "92. 投资与生活的关系：投资是为更好的生活服务，不要为了投资过度牺牲当下的生活质量。",
  "93. 复利的力量：尽早投资，让时间成为你的朋友。",
  "94. 投资是信仰：当别人因看不到短期利益而放弃时，你仍能坚持的事物。",
  "95. 投资的悟道：想要在投资这条路上走远，真正需要的是大智慧。",
  "96. 与市场共舞的心态：保持平和，无论涨跌，均保持从容。市场天然会波动，无需因之得意或沮丧。",
  "97. 投资的检验标准：不是为了争当股神，而是为了最终能“吃得好、睡得好”。",
  "98. 平凡人的盈利之道：用不着急的钱，在低价买入不会死的资产，长期持有，涨了卖出，循环往复。",
  "99. 最好的建议：“想清楚，然后纪律投资。”——买入前想清楚一切相关问题，然后像机器一样执行。",
  "100. 投资最终极的敌人：是你自己。战胜自己的人性，你就能在这个市场里长久生存。",
]

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
      router.push('/personal/holdings')
      break
    case 'inviteCode':
      router.push('/settings')
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
interface MenuItem {
  path: string
  title: string
  icon: string
  children?: MenuItem[]
}

const menuItems = computed(() => {
  const baseMenuItems: MenuItem[] = [
    {
      path: '/market-fundamentals',
      title: '股市基本面',
      icon: 'DataAnalysis',
    },
    {
      path: '/etf',
      title: '行业/指数/ETF',
      icon: 'DataLine',
    },
    {
      path: '/stock-picker',
      title: '股票综合',
      icon: 'MagicStick',
    },
    {
      path: '/quant',
      title: '量化分析',
      icon: 'DataAnalysis',
    },
  ]



  return baseMenuItems
})

// 股市基本面大导航结构（悬停展开的 mega menu）
const fundamentalsMegaMenuSections = [
  {
    title: '大盘分析',
    items: [
      { title: '大盘涨跌', path: '/analysis/market-change' },
      { title: '大盘分析', path: '/analysis/market' },
      { title: '大盘估值', path: '/analysis/index-dailybasic' },
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

// ETF/指数大导航结构（悬停展开的 mega menu）
const etfIndexMegaMenuSections = [
  {
    title: '行业分析',
    items: [
      { title: '行业整体分析', path: '/analysis/congestion' },
      { title: '单一行业分析', path: '/industries' },
      { title: '成交金额占比分位数', path: '/analysis/congestion/turnover' },
      { title: '行业业绩指标', path: '/analysis/congestion/performance' },
      { title: '行业资金流', path: '/analysis/congestion/fundflow' },
      { title: '行业矩形树图', path: '/analysis/congestion/treemap' },
      { title: '行业宽度热力图', path: '/analysis/congestion/breadth' },
      { title: '行业规模宽度', path: '/analysis/congestion/scale-breadth' },
      { title: '行业产出营收', path: '/analysis/congestion/output-scale' },
      { title: '指数RPS强度排名', path: '/analysis/congestion/index-rps' },
    ],
  },
  {
    title: '指数分析',
    items: [
      { title: '指数列表', path: '/analysis/index-list' },
      { title: '指数趋势图', path: '/analysis/index-analysis' },
      { title: '申万行业指数分类', path: '/analysis/sw-index-classify' },
      { title: '申万行业指数成分构成', path: '/analysis/sw-index-member-all' },
    ],
  },
  {
    title: 'ETF分析',
    items: [
      { title: 'ETF基本信息', path: '/analysis/etf-basic' },
      { title: 'ETF日线行情', path: '/analysis/etf-daily' },
      { title: 'ETF实时行情', path: '/analysis/etf-realtime' },
      { title: 'ETF相关性分析', path: '/analysis/etf-correlation' },
      { title: 'ETF波动性列表', path: '/analysis/etf-volatility' },
    ],
  },
]

// 智能选股大导航结构（悬停展开的 mega menu）
const stockPickerMegaMenuSections = [
  {
    title: '基础数据',
    items: [
      { title: '股票列表', path: '/stock-list' },
      { title: '个股分析', path: '/stock-history' },
      { title: '股票相关性分析', path: '/stock-correlation' },
      { title: '股票波动率分析', path: '/stock-volatility' },
    ],
  },
  {
    title: '选股工具',
    items: [
      { title: '因子选股', path: '/analysis/factor-stock-picker' },
      { title: '策略选股', path: '/strategy-results' },
      { title: '连板天梯', path: '/stock-limit-step' },
    ],
  },
  {
    title: '资金分析',
    items: [
      { title: '游资每日明细', path: '/stock-hm-detail' },
      { title: '每日筹码及胜率', path: '/stock-cyq-perf' },
      { title: '券商推荐评级', path: '/stock-broker-recommend' },
      { title: 'AH溢价对比', path: '/stock-ah-comparison' },
    ],
  },
  {
    title: '沪深港通/中结',
    items: [
      { title: '中结持股汇总', path: '/stock-ccass-hold' },
      { title: '中结持股明细', path: '/stock-ccass-hold-detail' },
      { title: '沪深港股通持股明细', path: '/stock-hk-hold-detail' },
      { title: '沪深股通十大成交股', path: '/stock-hsgt-top10' },
      { title: '沪深港通股票列表', path: '/stock-hsgt-list' },
    ],
  },
]

// 量化分析大导航结构（悬停展开的 mega menu）
const quantMegaMenuSections = [
  {
    title: '回测',
    items: [
      { title: '回测策略列表', path: '/strategy-list' },
      { title: '创建回测任务', path: '/backtest-strategy' },
      { title: '回测任务历史', path: '/backtest-history' },
    ],
  },
  {
    title: '预测',
    items: [
      { title: '指数预测验证', path: '/ml/index-prediction-validation' },
    ],
  },
  {
    title: '投资系统',
    items: [
      { title: '全天候ETF投资系统', path: '/etf-system' },
    ],
  }
]

function goPath(path?: string) {
  if (!path) return
  router.push(path)
}

function hasMegaMenu(path: string) {
  return ['/analysis', '/market-fundamentals', '/stock-picker', '/etf', '/quant'].includes(path)
}

function getMegaMenuSections(path: string) {
  switch (path) {
    case '/market-fundamentals':
      return fundamentalsMegaMenuSections
    case '/stock-picker':
      return stockPickerMegaMenuSections
    case '/etf':
      return etfIndexMegaMenuSections
    case '/quant':
      return quantMegaMenuSections
    default:
      return []
  }
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

.mindset-carousel {
  flex: 1;
  margin-left: 20px;
  overflow: hidden;
  max-width: 600px;
}

.quote-text {
  color: #409EFF;
  font-size: 14px;
  line-height: 24px;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
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

/* mega menu 触发器样式，保持与顶栏菜单一致 */
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
.mega-menu-trigger:hover, .mega-menu-trigger.is-active {
  color: var(--el-color-primary);
}

.mega-menu-title {
  font-size: 14px;
  white-space: nowrap;
  writing-mode: horizontal-tb;
}

/* Mega Menu Styles */
.mega-menu-content {
  display: flex;
  flex-wrap: nowrap;
  gap: 0;
  padding: 10px 0;
}

.mega-column {
  min-width: 160px;
  display: flex;
  flex-direction: column;
  padding: 0 24px;
  border-right: 1px solid #f0f0f0;
}

.mega-column:last-child {
  border-right: none;
}

.mega-column-title {
  font-size: 14px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 16px;
  line-height: 1.5;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.mega-column-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mega-link {
  font-size: 14px;
  color: #606266;
  justify-content: flex-start;
  transition: all 0.2s;
  line-height: 1.5;
}

.mega-link:hover, .mega-link.is-active {
  color: var(--el-color-primary);
  font-weight: 500;
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
  margin-left: auto;
}

.main-content {
  background-color: #f5f5f5;
  padding: 0;
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

.mobile-user-menu {
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
}

.mobile-user-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 12px;
}

.mobile-user-actions {
  display: flex;
  flex-direction: column;
}

.mobile-user-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  color: #606266;
  font-size: 14px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.mobile-user-item:active {
  background-color: #f5f7fa;
}

.mobile-user-item .el-icon {
  margin-right: 10px;
  font-size: 16px;
}

.mobile-user-item.logout {
  color: #f56c6c;
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
