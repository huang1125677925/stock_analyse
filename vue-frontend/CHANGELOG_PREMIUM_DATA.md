# 打板分析页面 - 昨日涨停平均溢价数据展示

## 修改时间
2026-07-05

## 修改内容

### 1. 接口类型定义更新 (`src/services/limitBoardStrategyApi.ts`)

新增类型定义：
- `YesterdayLimitUpStock`: 昨日涨停股今日溢价详情接口
  - `ts_code`: 股票代码
  - `name`: 股票名称
  - `prev_close`: 昨日收盘价
  - `today_open`: 今日开盘价
  - `premium_pct`: 今日开盘溢价百分比

更新 `IndustryTrendDailyIndustry` 类型，新增字段：
- `yesterday_limit_up_count?: number` - 昨日该行业涨停股数量
- `yesterday_limit_up_stocks?: YesterdayLimitUpStock[]` - 昨日该行业涨停股的今日溢价详情列表
- `avg_premium_pct?: number` - 昨日该行业涨停股今日平均溢价百分比

### 2. 组件功能更新 (`src/components/LimitBoardIndustryTrendMatrix.vue`)

#### 新增计算属性
- `dailyIndustryPremium`: 快速查表，按交易日和行业获取昨日涨停平均溢价数据

#### 新增辅助函数
- `yesterdayPremium(date, industry)`: 判断指定交易日和行业是否有昨日涨停溢价数据
- `yesterdayCount(date, industry)`: 获取昨日该行业涨停股数量
- `yesterdayAvgPremium(date, industry)`: 获取昨日涨停股今日平均溢价百分比
- `formatPremium(value)`: 格式化溢价百分比，添加正负号前缀
- `premiumClass(value)`: 根据溢价值返回对应的CSS类名

#### UI更新
在交叉块（矩阵单元格）的 `.cell-count` 按钮上方新增昨日涨停平均溢价数据展示区域：
```vue
<div v-if="yesterdayPremium(date, industry)" class="yesterday-premium">
  <span class="premium-label">昨日{{ yesterdayCount(date, industry) }}家</span>
  <span class="premium-value" :class="premiumClass(yesterdayAvgPremium(date, industry))">
    {{ formatPremium(yesterdayAvgPremium(date, industry)) }}
  </span>
</div>
```

#### 样式更新
新增样式类：
- `.yesterday-premium`: 昨日溢价数据容器，浅灰色背景
- `.premium-label`: 左侧标签文字，灰色
- `.premium-value`: 右侧溢价数值，粗体
- `.premium-positive`: 正溢价（红色）
- `.premium-negative`: 负溢价（绿色）
- `.premium-neutral`: 零溢价（深灰色）

## 数据来源
根据后端接口文档 `/Users/huangchuang/stock_data_service/docs/limit_board_strategy_api.md` 第387-411行说明：
- 仅当存在前一交易日数据时，接口才会返回 `yesterday_limit_up_count`、`yesterday_limit_up_stocks` 和 `avg_premium_pct` 字段
- 溢价计算公式：`(今日开盘价 - 昨日收盘价) / 昨日收盘价 × 100`

## 显示效果
- 当某个交易日的某个行业存在昨日涨停数据时，在涨停数量按钮上方显示一行紧凑的溢价信息
- 格式：`昨日X家 +Y.YY%` 或 `昨日X家 -Y.YY%`
- 颜色：正溢价红色，负溢价绿色，零溢价灰色
- 不存在数据时不显示该区域，保持界面简洁

## 兼容性
- 后端接口可选字段，不影响已有功能
- 前端条件渲染，仅在数据存在时显示
- 类型安全，使用 TypeScript 类型定义保证数据结构正确
