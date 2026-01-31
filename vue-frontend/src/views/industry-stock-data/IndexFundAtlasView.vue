<!--
  组件名称：IndexFundAtlasView
  功能描述：展示指数基金图谱说明页面，内容源自《盈米_指数基金图谱.pdf》
  参数：无
  返回值：无
  事件：无
-->
<template>
  <div class="index-fund-atlas">
    <el-card class="atlas-card">
      <template #header>
        <div class="header-content">
          <el-icon class="header-icon"><Document /></el-icon>
          <span class="header-title">指数基金图谱说明</span>
        </div>
      </template>

      <div class="atlas-content">
        <el-alert
          title="内容声明"
          type="info"
          description="本页面内容基于《盈米·指数基金图谱》解读，旨在提供指数基金的分类、特点及核心指数的深度解析。"
          show-icon
          :closable="false"
          class="mb-20"
        />

        <el-tabs v-model="activeTab">
          <!-- 市场全景 -->
          <el-tab-pane label="市场全景" name="market-overview">
            <div class="tab-section">
              <el-row :gutter="20">
                <el-col :span="24">
                  <el-card shadow="never" class="overview-table-card">
                    <template #header>
                      <div class="card-header">
                        <span>国内指数基金市场全景 (截至2022年末)</span>
                      </div>
                    </template>
                    <el-table :data="marketOverview" stripe border style="width: 100%">
                      <el-table-column prop="type" label="指数类型" width="120" />
                      <el-table-column prop="count" label="数量" align="center" />
                      <el-table-column prop="countRatio" label="数量占比" align="center" />
                      <el-table-column prop="shares" label="份额 (亿份)" align="right" />
                      <el-table-column prop="sharesRatio" label="份额占比" align="center" />
                      <el-table-column prop="scale" label="规模 (亿元)" align="right" />
                      <el-table-column prop="scaleRatio" label="规模占比" align="center" />
                    </el-table>
                    <div class="data-source-note">数据来源：Choice (截至2022年12月31日)</div>
                  </el-card>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>

          <!-- 核心指数解析 -->
          <el-tab-pane label="核心指数解析" name="core-indices">
            <div class="tab-section">
              <el-row :gutter="20">
                <el-col :span="12" v-for="index in coreIndices" :key="index.name">
                  <el-card shadow="hover" class="index-detail-card">
                    <template #header>
                      <div class="index-header">
                        <span class="index-name">{{ index.name }}</span>
                        <el-tag size="small" :type="index.tagType">{{ index.tag }}</el-tag>
                      </div>
                    </template>
                    <div class="index-body">
                      <p><strong>定义：</strong>{{ index.definition }}</p>
                      <p><strong>行业分布：</strong>{{ index.industries }}</p>
                      <p><strong>指数特点：</strong>{{ index.features }}</p>
                      
                      <div class="index-stats" v-if="index.stats">
                        <el-table :data="index.stats" size="small" border>
                          <el-table-column prop="metric" label="指标" />
                          <el-table-column prop="value" label="近十年表现" />
                        </el-table>
                      </div>

                      <div class="index-cycles" v-if="index.cycles">
                        <h5 class="section-title">历史走势复盘 (2009年之后)</h5>
                        <el-descriptions :column="1" border size="small">
                          <el-descriptions-item label="上涨周期">
                            平均 {{ index.cycles.upDuration }}，平均涨幅 {{ index.cycles.upGain }}
                          </el-descriptions-item>
                          <el-descriptions-item label="下跌周期">
                            平均 {{ index.cycles.downDuration }}，平均下跌 {{ index.cycles.downLoss }}
                          </el-descriptions-item>
                        </el-descriptions>
                        <p class="cycle-summary">{{ index.cycleSummary }}</p>
                      </div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>

          <!-- 基金分类图谱 -->
          <el-tab-pane label="基金分类图谱" name="classification">
            <div class="tab-section">
              <el-timeline>
                <el-timeline-item
                  v-for="category in fundCategories"
                  :key="category.title"
                  :timestamp="category.timestamp"
                  placement="top"
                >
                  <el-card class="category-main-card">
                    <h4>{{ category.title }}</h4>
                    <p>{{ category.description }}</p>
                    
                    <div class="category-tags mb-10">
                      <el-tag
                        v-for="tag in category.tags"
                        :key="tag"
                        size="small"
                        class="mr-10"
                      >
                        {{ tag }}
                      </el-tag>
                    </div>

                    <!-- 细分逻辑展示 -->
                    <el-collapse v-if="category.details" accordion class="sub-category-collapse">
                      <el-collapse-item v-for="detail in category.details" :key="detail.name" :title="detail.name">
                        <div class="detail-content">
                          <p class="detail-desc">{{ detail.desc }}</p>
                          <ul class="detail-list" v-if="detail.items">
                            <li v-for="item in detail.items" :key="item.label">
                              <strong>{{ item.label }}：</strong>{{ item.content }}
                            </li>
                          </ul>
                          <div v-if="detail.table" class="detail-table mt-10">
                            <el-table :data="detail.table" size="small" border>
                              <el-table-column v-for="col in detail.tableCols" :key="col.prop" :prop="col.prop" :label="col.label" />
                            </el-table>
                          </div>
                        </div>
                      </el-collapse-item>
                    </el-collapse>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
            </div>
          </el-tab-pane>

          <!-- 投资策略建议 -->
          <el-tab-pane label="投资策略建议" name="strategies">
            <div class="tab-section">
              <el-row :gutter="20">
                <el-col :span="24">
                  <el-card shadow="never" class="strategy-steps-card mb-20">
                    <template #header>
                      <div class="card-header">
                        <span>选出好基金的三个步骤</span>
                      </div>
                    </template>
                    <el-steps :active="3" align-center>
                      <el-step v-for="step in selectionSteps" :key="step.title" :title="step.title" :description="step.desc" />
                    </el-steps>
                  </el-card>
                </el-col>
              </el-row>

              <el-collapse v-model="activeCollapse">
                <el-collapse-item title="1. 为什么建议定投指数基金组合？" name="1">
                  <div class="strategy-content">
                    <p><strong>解决两大难题：</strong>选股难（专业性要求高）与择时难（受情绪干扰）。</p>
                    <p><strong>策略优势：</strong>不用精准择时，分批买入降低成本；聚焦行业趋势和估值，降低非系统性风险。</p>
                    <p><strong>核心逻辑：</strong>Simple is best。定投沪深300作为“压舱石”，中证500兼顾成长，创业板/科创50博取高弹性收益。</p>
                  </div>
                </el-collapse-item>
                <el-collapse-item title="2. 行业/主题基金投资逻辑" name="2">
                  <div class="strategy-content">
                    <p><strong>赚赛道景气度的钱：</strong>行业分布随经济结构变迁。例如上证50中大金融占比下降，食品饮料上升。</p>
                    <p><strong>申万分类标准：</strong>聚焦一级行业（31个），兼顾重点二级行业（134个）。</p>
                    <p><strong>注意事项：</strong>主题指数往往细分、规模小、匹配短期市场特征，不宜盲目长期持有。</p>
                  </div>
                </el-collapse-item>
                <el-collapse-item title="3. 资产配置逻辑（全球视角）" name="3">
                  <div class="strategy-content">
                    <p><strong>跨境指数：</strong>分享全球增长，需关注汇率波动及资产比价优势（如对比PEG或股息率）。</p>
                    <p><strong>商品指数：</strong>在通胀环境下提供贝塔收益（如黄金、豆粕、原油）。</p>
                    <p><strong>策略指数 (Smart Beta)：</strong>红利、价值、成长。长期年化收益往往优于市值加权指数2-3个百分点。</p>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Document } from '@element-plus/icons-vue'

const activeTab = ref('market-overview')
// 默认展开所有策略项
const activeCollapse = ref(['1', '2', '3'])

// 市场全景数据
const marketOverview = [
  { type: '股票', count: 2152, countRatio: '76.72%', shares: '15487.92', sharesRatio: '66.69%', scale: '17979.16', scaleRatio: '62.60%' },
  { type: '跨境', count: 286, countRatio: '10.20%', shares: '3868.26', sharesRatio: '16.66%', scale: '3269.18', scaleRatio: '11.38%' },
  { type: '商品', count: 50, countRatio: '1.78%', shares: '170.66', sharesRatio: '0.73%', scale: '375.58', scaleRatio: '1.31%' },
  { type: '债券', count: 290, countRatio: '10.34%', shares: '3669.93', sharesRatio: '15.80%', scale: '4367.48', scaleRatio: '15.21%' },
  { type: '货币', count: 27, countRatio: '0.96%', shares: '27.28', sharesRatio: '0.12%', scale: '2729.07', scaleRatio: '9.50%' },
  { type: '合计', count: 2805, countRatio: '100%', shares: '23224.05', sharesRatio: '100%', scale: '28720.47', scaleRatio: '100%' }
]

// 选基三步走
const selectionSteps = [
  { title: '选方向', desc: '宏观环境、产业趋势、资产类别' },
  { title: '选指数', desc: '编制规则、权重分布、估值性价比' },
  { title: '定产品', desc: '规模、流动性、超额收益、费率' }
]

// 核心指数数据
const coreIndices = [
  {
    name: '上证 50',
    tag: '超大盘宽基',
    tagType: 'danger',
    definition: '沪市规模和流动性综合排名前 50 名的证券组成，反映最具市场影响力的龙头企业表现。',
    industries: '食品饮料、银行、非银金融（合计占比过半），整体以价值型为主。',
    features: '价值属性重，典型业绩驱动，股息率优势明显，波动率相对可控。',
    stats: [
      { metric: '年化收益率', value: '4.67%' },
      { metric: '波动率', value: '26.49%' },
      { metric: '夏普比率', value: '0.14' }
    ],
    cycles: { upDuration: '1.6年', upGain: '99.87%', downDuration: '1.9年', downLoss: '41.74%' },
    cycleSummary: '上涨由估值驱动转变为业绩驱动，基本面是核心要素。'
  },
  {
    name: '沪深 300',
    tag: '大盘宽基',
    tagType: 'primary',
    definition: '沪深两市规模、流动性综合前 300 的证券组成，代表两市整体表现，是众多产品的对标指数。',
    industries: '食品饮料、银行、电力设备、非银、医药（合计占比超 50%），行业覆盖分散。',
    features: '稳定性好，波动率最低，适合作为基础仓位配置。',
    stats: [
      { metric: '年化收益率', value: '4.80%' },
      { metric: '波动率', value: '24.56%' },
      { metric: '夏普比率', value: '0.15' }
    ],
    cycles: { upDuration: '1.6年', upGain: '104.91%', downDuration: '1.9年', downLoss: '40.03%' },
    cycleSummary: '周期轮回性稳定，回撤可控，适合作为组合中的“压舱石”。'
  },
  {
    name: '中证 500',
    tag: '中盘宽基',
    tagType: 'success',
    definition: '两市剔除沪深 300 后，市值排名前 500 的证券组成，样本平均市值约 250 亿。',
    industries: '医药、有色、新能源、非银、化工，覆盖极其分散，典型的均衡配置。',
    features: '兼具稳健与成长性，夏普比率具备优势，相比大盘指数更适合定投。',
    stats: [
      { metric: '年化收益率', value: '5.62%' },
      { metric: '波动率', value: '24.77%' },
      { metric: '夏普比率', value: '0.19' }
    ],
    cycles: { upDuration: '2.4年', upGain: '222.50%', downDuration: '1.4年', downLoss: '44.37%' },
    cycleSummary: '曾走过跨越两年的大牛行情（13-15年），成长价值分布均衡。'
  },
  {
    name: '创业板指',
    tag: '成长创新',
    tagType: 'warning',
    definition: '规模、流动性综合排名前 100 的证券组成，服务于成长创新型企业。',
    industries: '电力设备和医药生物（合计占比近 60%），宁德时代权重较高。',
    features: '高弹性、高波动，年化收益率显著好于权重宽基，适合控制风险下的定投。',
    stats: [
      { metric: '年化收益率', value: '11.55%' },
      { metric: '波动率', value: '43.90%' },
      { metric: '夏普比率', value: '0.34' }
    ],
    cycles: { upDuration: '1.6年', upGain: '181.24%', downDuration: '1.3年', downLoss: '48.95%' },
    cycleSummary: '具有大开大合的高波动属性，估值中枢显著高于权重指数。'
  },
  {
    name: '科创 50',
    tag: '硬科技',
    tagType: 'info',
    definition: '科创板中规模、流动性综合排名前 50 的证券组成，具有很强的“硬科技”属性。',
    industries: '电子、电力设备、生物医药（合计占比超 70%），符合国家自主可控战略。',
    features: '成立时间短，但波动率和换手率惊人，新陈代谢能力强。',
    stats: [
      { metric: '主要行业占比', value: '70%+' },
      { metric: '平均市值', value: '约500亿' }
    ],
    cycles: { upDuration: '多轮牛熊', upGain: '弹性大', downDuration: '回撤快', downLoss: '腰斩风险' },
    cycleSummary: '处于估值去泡沫阶段，解禁压力逐步缓解后未来表现可期。'
  }
]

// 基金分类数据
const fundCategories = [
  {
    timestamp: '宽基/策略',
    title: '宽基与策略指数基金',
    description: '投资组合的“压舱石”与“Smart Beta”',
    tags: ['上证50', '沪深300', '中证500', '创业板', '科创50', '红利', '价值', '成长'],
    details: [
      {
        name: '宽基指数 (Broad Base)',
        desc: '买宽基就是买国运。覆盖面宽泛，代表市场整体走势。',
        items: [
          { label: '适合人群', content: '小白及大多数投资者' },
          { label: '核心优势', content: '分散风险，规避个股炸雷' }
        ]
      },
      {
        name: '策略指数 (Smart Beta)',
        desc: '优中选优，在宽基基础上做策略因子加权。',
        items: [
          { label: '常见策略', content: '红利（股息率加权）、基本面、价值、波动率' },
          { label: '收益特征', content: '长期年化收益通常好于市值加权指数2-3个百分点' }
        ]
      }
    ]
  },
  {
    timestamp: '行业/主题',
    title: '行业与主题指数基金',
    description: '赚赛道景气度爆发的钱',
    tags: ['申万行业', '一级行业', '二级行业', '热门主题'],
    details: [
      {
        name: '行业指数',
        desc: '聚焦特定行业。目前常用申万行业分类。',
        items: [
          { label: '申万标准', content: '一级31个，二级134个，三级346个' },
          { label: '投资建议', content: '一级行业规模和流动性更好，种类已足够' }
        ]
      },
      {
        name: '主题指数',
        desc: '针对更细分的领域，如国改、周期、地区等。',
        items: [
          { label: '特点', content: '细分、规模小、匹配短期市场特征' },
          { label: '风险', content: '不适宜长期投资，波动较大' }
        ]
      }
    ]
  },
  {
    timestamp: '债券',
    title: '债券指数基金',
    description: '固收类资产的核心来源',
    tags: ['利率债', '信用债', '可转债'],
    details: [
      {
        name: '利率债',
        desc: '国债、地方债、政金债。信用极高，主要受宏观、通胀及货币政策影响。',
        items: [
          { label: '关键指标', content: '宏观经济、通胀水平、货币政策、流动性' }
        ]
      },
      {
        name: '信用债',
        desc: '企业债、公司债等。存在信用风险，收益率高于利率债。',
        items: [
          { label: '核心关注', content: '发债主体信用资质、行业背景、经营状况' }
        ]
      },
      {
        name: '可转债',
        desc: '股债双重属性。下可保底（债券属性），上不封顶（股票属性）。',
        items: [
          { label: '关键指标', content: '转股溢价率、正股表现' }
        ]
      }
    ]
  },
  {
    timestamp: '商品/跨境/货币',
    title: '商品、跨境与货币基金',
    description: '全球配置与现金管理工具',
    tags: ['黄金', '石油', '跨境美港股', '场内货币'],
    details: [
      {
        name: '商品指数',
        desc: '跟踪单一商品价格或相关股票。',
        items: [
          { label: '贝塔收益', content: '通胀环境下表现优异' },
          { label: '代表产品', content: '黄金ETF、豆粕ETF、华宝油气' }
        ]
      },
      {
        name: '跨境指数',
        desc: '跟踪境外市场（港、美、欧）。',
        items: [
          { label: '买入逻辑', content: '分享其他经济体增长或比价优势' },
          { label: '注意事项', content: '需考虑汇率波动影响' }
        ]
      },
      {
        name: '货币指数 (Money Market)',
        desc: '场内买卖的现金管理工具。',
        table: [
          { code: '511990.SH', name: '华宝添益', scale: '1239亿', daily: '163亿' },
          { code: '511880.SH', name: '银华日利', scale: '1135亿', daily: '129亿' }
        ],
        tableCols: [
          { prop: 'code', label: '代码' },
          { prop: 'name', label: '简称' },
          { prop: 'scale', label: '规模' },
          { prop: 'daily', label: '日均成交' }
        ]
      }
    ]
  }
]
</script>

<style scoped>
.index-fund-atlas {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 120px);
}

.atlas-card {
  max-width: 1200px;
  margin: 0 auto;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  font-size: 24px;
  color: #409eff;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
}

.mb-20 {
  margin-bottom: 20px;
}

.mb-10 {
  margin-bottom: 10px;
}

.mt-10 {
  margin-top: 10px;
}

.overview-table-card {
  margin-bottom: 20px;
}

.data-source-note {
  margin-top: 15px;
  font-size: 12px;
  color: #909399;
  text-align: right;
}

.tab-section {
  padding: 20px 0;
}

.index-detail-card {
  margin-bottom: 20px;
}

.index-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.index-name {
  font-size: 16px;
  font-weight: bold;
}

.index-body p {
  margin: 10px 0;
  line-height: 1.6;
  font-size: 14px;
  color: #606266;
}

.index-stats {
  margin-top: 15px;
}

.section-title {
  margin: 20px 0 10px;
  font-size: 14px;
  color: #303133;
  border-left: 4px solid #409eff;
  padding-left: 8px;
}

.cycle-summary {
  margin-top: 10px;
  font-size: 13px;
  color: #67c23a;
  font-style: italic;
}

.category-main-card {
  border-left: 4px solid #409eff;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sub-category-collapse {
  margin-top: 15px;
  border: none;
}

.detail-content {
  padding: 0 10px;
}

.detail-desc {
  font-size: 14px;
  color: #303133;
  margin-bottom: 10px;
  font-weight: bold;
}

.detail-list {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
}

.detail-list li {
  font-size: 13px;
  color: #606266;
  margin-bottom: 5px;
}

.strategy-steps-card {
  background-color: #f0f9eb;
}

.strategy-content p {
  margin-bottom: 10px;
  line-height: 1.6;
}

.mr-10 {
  margin-right: 10px;
}

:deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 500;
}

:deep(.el-collapse-item__header) {
  font-size: 15px;
  font-weight: bold;
}
</style>
