<template>
  <div class="etf-system-container">
    <div class="header">
      <h1>全天候ETF投资指导系统</h1>
      <p class="subtitle">以“价值”为内核、以“概率”为准绳、以“策略”为武装的闭环体系</p>
    </div>

    <el-tabs v-model="activeTab" class="system-tabs">
      <el-tab-pane label="仪表盘 (Dashboard)" name="dashboard">
        <el-row :gutter="20">
          <el-col :span="24">
            <ObservationModule />
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :xs="24" :md="12">
            <AssetAllocationModule />
          </el-col>
          <el-col :xs="24" :md="12">
            <TradeExecutionModule />
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :xs="24" :md="12">
            <RiskModule />
          </el-col>
          <el-col :xs="24" :md="12">
            <MindsetModule />
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="工具箱 (Tools)" name="tools">
        <StrategyCalculator />
      </el-tab-pane>
      
      <el-tab-pane label="详细策略说明" name="docs">
        <div class="docs-container">
          <el-alert
            title="核心目标"
            type="success"
            description="熊市不赔钱，牛市大致跟上。最终通过复利实现资产飞跃。"
            :closable="false"
            class="mb-20"
            show-icon
          />

          <el-collapse v-model="activeDocCollapse" accordion>
            <!-- 1. 投资之“道” -->
            <el-collapse-item title="一、 核心交易思想：投资之“道”" name="1">
              <div class="doc-content">
                <p>这是整个体系的基石，旨在解决“人性”对投资的干扰。</p>
                <ul>
                  <li><strong>反人性与机械化：</strong> 认为投资者最大的敌人是自己（恐惧与贪婪）。主张将自己训练成“没有感情的投资机器”，设定规则并坚定执行。</li>
                  <li><strong>低买高卖的本质：</strong> 遵循“贵出如粪土，贱取如珠玉”的古训。认为买入价格决定是否赚钱，卖出价格决定赚多少。</li>
                  <li><strong>概率思维与模糊正确：</strong> 承认未来不可预测，不赌单边，而是根据胜率（赔率）分布筹码。追求“模糊的正确”而非“精确的错误”。</li>
                  <li><strong>全天候应对：</strong> 体系设计需覆盖上涨、下跌、震荡三种走势，确保在任何环境下都有利可图。</li>
                </ul>
              </div>
            </el-collapse-item>

            <!-- 2. 投资之“眼” -->
            <el-collapse-item title="二、 市场观测系统：投资之“眼”" name="2">
              <div class="doc-content">
                <p>通过多维度数据拨开市场迷雾，确定所处的“季节”。</p>
                <h4>估值维度（左侧核心）</h4>
                <ul>
                  <li><strong>PE/PB 百分位：</strong> 统计过去五年、十年的历史数据，确定当前估值在历史中的百分位排名（如：低于30%为红色低估，高于85%为黑色高估）。</li>
                  <li><strong>钻石底/黄金坑定义：</strong> 全市场PB在2.0-2.5以下进入低估区域，2.0以下为“钻石底”。</li>
                  <li><strong>PEG 衡量法：</strong> 结合利润增速判断估值是否合理，理想标的为 PEG &lt; 1。</li>
                </ul>
                <h4>趋势维度（右侧辅助）</h4>
                <ul>
                  <li><strong>BBI + MACD系统：</strong> 用于判断中长期趋势转折。买入看左侧（价值），卖出看左右结合。</li>
                  <li><strong>关键均线支撑：</strong> 关注20、51、120、250、850日（或周）均线，尤其是850日线作为超长期战略支撑位。</li>
                </ul>
                <h4>情绪与资金维度</h4>
                <ul>
                  <li><strong>年度换手率：</strong> 接近1000%为危险大顶，500%-550%为相对底部。</li>
                  <li><strong>大股东行为：</strong> 监控重要股东的增减持动态。</li>
                </ul>
              </div>
            </el-collapse-item>

            <!-- 3. 投资之“法” -->
            <el-collapse-item title="三、 交易策略矩阵：投资之“法”" name="3">
              <div class="doc-content">
                <p>针对不同市场环境调配不同的“兵种”。</p>
                <el-table :data="strategyTableData" border style="width: 100%">
                  <el-table-column prop="name" label="策略名称" width="140" />
                  <el-table-column prop="scenario" label="适用场景" width="120" />
                  <el-table-column prop="logic" label="核心逻辑" />
                  <el-table-column prop="note" label="备注" />
                </el-table>
              </div>
            </el-collapse-item>

            <!-- 4. 投资之“盾” -->
            <el-collapse-item title="四、 风险管理系统：投资之“盾”" name="4">
              <div class="doc-content">
                <p>确保在极端情况下能够“活下来”。</p>
                <ul>
                  <li><strong>150份资金管理法：</strong> 将可投资总额分为150份，严格控制每一步的投入额度。</li>
                  <li><strong>压力测试：</strong> 任何网格开始前必须模拟该品种下跌60%的情况，确保资金流不断裂。</li>
                  <li><strong>不借钱、不上杠杆：</strong> 拒绝短期借贷和高倍杠杆，尤其是不可长期持有杠杆品种（如分级B、两融）。</li>
                  <li><strong>留足现金流：</strong> 始终在银行保留一部分数年不用的现金，作为危机时刻的“御林军”。</li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ObservationModule from './components/ObservationModule.vue';
import AssetAllocationModule from './components/AssetAllocationModule.vue';
import TradeExecutionModule from './components/TradeExecutionModule.vue';
import RiskModule from './components/RiskModule.vue';
import MindsetModule from './components/MindsetModule.vue';
import StrategyCalculator from './components/StrategyCalculator.vue';

const activeTab = ref('dashboard');
const activeDocCollapse = ref(['1']);

const strategyTableData = [
  { name: '大类资产配置', scenario: '全球/长期', logic: '投资不相关或负相关品种（A股、美欧股、港股、黄金、原油、债券）', note: '降低波动，平滑收益曲线' },
  { name: '仓位管理策略', scenario: '牛熊转换', logic: '根据全市场估值百分位动态调整仓位（25%-75%或15%-85%）', note: '估值越低，加仓越激进；估值越高，配置越保守' },
  { name: '网格交易(1.0-3.5)', scenario: '震荡/横盘', logic: '设定固定波幅（5%-10%），在区间内高抛低吸，收割波动利润', note: '2.0版强调留利润，3.5版引入趋势调间隔' },
  { name: '目标市值策略', scenario: '牛市/长持', logic: '设定预设涨幅（如季度3%），多退少补，强制执行高抛低吸', note: '辅助坚定持仓，防止牛市过早下车' },
  { name: '量化门票股', scenario: '打新辅助', logic: '选股标准：PE<30、连续5年业绩增长、PEG<1、ROE>10%', note: '等权买入一篮子（20-30只），作为打新市值' }
];
</script>

<style scoped>
.etf-system-container {
  padding: 20px;
  background-color: #f0f2f5;
  min-height: 100vh;
}
.header {
  text-align: center;
  margin-bottom: 20px;
}
.subtitle {
  color: #666;
  font-size: 14px;
}
.docs-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
}
.doc-content {
  line-height: 1.6;
}
.doc-content ul {
  padding-left: 20px;
}
.doc-content li {
  margin-bottom: 10px;
}
.mb-20 {
  margin-bottom: 20px;
}
</style>
