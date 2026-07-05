# 打板分析页面 - 行业涨跌幅数据展示

## 修改时间
2026-07-05

## 修改内容

### 1. 接口类型定义更新 (`src/services/limitBoardStrategyApi.ts`)

更新 `IndustryTrendDailyIndustry` 类型，新增字段：
- `industry_pct_change?: number` - 该行业当日涨跌幅百分比（仅在使用东财板块映射方式时返回）

### 2. 组件功能更新 (`src/components/LimitBoardIndustryTrendMatrix.vue`)

#### 新增辅助函数
- `industryPctChange(date, industry)`: 获取指定交易日和行业的涨跌幅百分比
- `formatPctChange(value)`: 格式化涨跌幅百分比，添加正负号前缀
- `pctChangeClass(value)`: 根据涨跌幅值返回对应的CSS类名

#### UI更新
在交叉块（矩阵单元格）的涨停数量按钮下方新增行业涨跌幅展示区域：
```vue
<div v-if="industryPctChange(date, industry) !== null" class="industry-pct-change">
  <span class="pct-change-value" :class="pctChangeClass(industryPctChange(date, industry))">
    {{ formatPctChange(industryPctChange(date, industry)) }}
  </span>
</div>
```

#### 样式更新
新增样式类：
- `.industry-pct-change`: 行业涨跌幅容器，居中显示
- `.pct-change-value`: 涨跌幅数值，粗体
- `.pct-positive`: 上涨（红色）
- `.pct-negative`: 下跌（绿色）
- `.pct-neutral`: 平盘（深灰色）

## 数据来源
根据后端接口文档 `/Users/huangchuang/stock_data_service/docs/limit_board_strategy_api.md` 第391行说明：
- `industry_pct_change` 仅在使用东财板块映射方式时返回
- 即 `industry_mapping` 参数为 `dc_concept`、`dc_region`、`dc_l1`、`dc_l2`、`dc_l3` 时有效
- 使用 `default` 映射方式时此字段不返回

## 显示位置
在交叉块单元格中的显示顺序（从上到下）：
1. **昨日涨停溢价**（如果存在）：浅灰色背景卡片，显示 `昨日X家 +Y.YY%`
2. **当日涨停数量**（如果存在）：彩色热度按钮，显示涨停家数和状态
3. **行业涨跌幅**（如果存在）：居中显示，格式 `+X.XX%` 或 `-X.XX%`
4. **个股列表**（如果开启且存在）：个股标签列表

## 显示效果
- 当使用东财板块映射方式且该行业有涨跌幅数据时，在涨停数量按钮下方显示行业涨跌幅
- 格式：`+X.XX%` 或 `-X.XX%`
- 颜色：上涨红色，下跌绿色，平盘灰色
- 不存在数据时不显示该区域，保持界面简洁

## 使用建议
- 使用 `default` 行业映射方式时，该字段不会显示（接口不返回）
- 推荐使用东财二级或三级行业板块映射（`dc_l2` 或 `dc_l3`）获取更准确的行业涨跌幅数据
- 东财概念板块（`dc_concept`）可能存在一只股票属于多个概念的情况，涨跌幅计算可能有重复

## 兼容性
- 后端接口可选字段，不影响已有功能
- 前端条件渲染，仅在数据存在时显示
- 类型安全，使用 TypeScript 类型定义保证数据结构正确
- 向下兼容，使用 `default` 映射方式时不显示行业涨跌幅
