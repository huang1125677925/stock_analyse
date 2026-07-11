---
name: mobile-optimization
description: 本项目（Vue 3 + Element Plus + ECharts 股票分析前端）的移动端适配规范与改造流程。当需要优化任意页面/组件在手机（≤768px）上的展示、处理图表标签重叠、表格溢出、筛选器/弹窗布局，或新增页面要保证移动端可用时使用。
---

# 移动端适配规范（Vue 3 + Element Plus + ECharts）

## 两条核心原则

1. **内容密度高**：小屏尽量多展示。收窄外边距、图表满宽、表格列紧凑、摘要卡片多列。
2. **绝不遮挡**：ECharts 轴标签/图例不重叠不裁切；表格横滑不出现固定列覆盖；悬浮元素（tooltip/toolbox/dataZoom/visualMap）不压数据。

断点统一用 **768px**（手机）与 959/992px（平板过渡）。

---

## 1. 断点检测：统一用 `useIsMobile`

CSS `@media` 改不到的地方（ECharts option、`el-dialog` 宽度、`el-table` 列 `:fixed`/`:min-width`、`el-descriptions` 列数、图表高度）必须用 JS 响应式判断。**不要**每个组件各写一份 `window.innerWidth` + resize 监听。

```ts
// src/composables/useIsMobile.ts —— 已存在，直接复用
import { useIsMobile } from '@/composables/useIsMobile'
const { isMobile } = useIsMobile()   // 基于 matchMedia('(max-width: 768px)') 的只读响应式 ref
```

组件里凡是 option 依赖 `isMobile` 的，用 `computed` 或在 `watch(isMobile, ...)` 里重算 + `nextTick(() => chart?.resize())`。

---

## 2. 全局 CSS（已在 `src/assets/main.css` 落地，新组件自动继承）

`@media (max-width: 959px)` / `(max-width: 480px)` 已统一处理，**新页面通常无需重复写**：

- `el-main.main-content` 去掉默认 20px 内边距；子元素内边距 8px（≤480 为 4px）——外框窄、内容贴边。
- `el-card__header/__body` 内边距收窄（10px / ≤480 为 8px）。
- `el-table` 字号 12px，单元格 `.cell` padding `0 4px`，行 padding `6px 0`；横滑 `-webkit-overflow-scrolling: touch`。
- `el-form--inline` 在移动端变单列栅格，`el-select/el-input/...` 宽度 100%。
- `el-dialog:not(.is-fullscreen)` 强制 `width:100%` 贴顶——**超宽弹窗（如 `width="1400px"`）无需单独改，全局兜底为全屏**。
- 弹窗内 `el-row > el-col` 自动堆叠为整宽。
- `el-pagination` 隐藏 sizes/jumper/total，仅留翻页。

页面根节点自定义 padding 会被全局 `!important` 覆盖，不用纠结各页 padding 值。

---

## 3. ECharts 图表：消除遮挡（最重要）

`chart.resize()` 只缩放画布，**不会**重算 option，所以旋转/间隔/图例问题必须在 option 层按 `isMobile` 重算。每个图表都要做：

```ts
const mobile = isMobile.value
option = {
  tooltip: { confine: true, /* ... */ },              // 防 tooltip 溢出屏幕
  legend: { type: 'scroll', top: mobile ? 26 : 40 },  // 多系列不换行压图
  grid: mobile
    ? { left: 6, right: 10, top: 48, bottom: 56, containLabel: true }  // 收紧边距
    : { /* 桌面原值 */ },
  xAxis: {
    axisLabel: {
      rotate: mobile ? 45 : 0,
      hideOverlap: true,          // 关键：自动隐藏重叠标签
      interval: 'auto',
      fontSize: mobile ? 10 : 12,
      // 日期去年份省宽：'2026-07-11' -> '07-11'
      formatter: mobile ? (v) => (v?.length >= 10 ? v.slice(5) : v) : undefined,
    },
  },
  yAxis: { name: mobile ? '' : '原轴名', axisLabel: { fontSize: mobile ? 10 : 12 } }, // 移动端省略长轴名
  toolbox: { show: !mobile },     // 移动端隐藏 toolbox，避免压 legend
  dataZoom: mobile
    ? [{ type: 'inside' }, { type: 'slider', height: 14, bottom: 4 }]  // 滑块独立留高，不压 x 轴标签
    : [/* 桌面原值 */],
}
watch(isMobile, () => { if (chart) { /* 重建 option */ ; nextTick(() => chart.resize()) } })
```

**图表高度**：折线/柱状移动端降到 ~300px（`isMobile ? '300px' : '420px'`），单屏能同时看到图和下方表格。

**热力图专项**（最易遮挡）：
- grid 左右边距在移动端大幅收紧（桌面 `left:140` 之类会吃掉大半屏）。
- `visualMap` 移动端改 `orient:'horizontal'` 放底部 `{ left:'center', bottom:2, itemWidth:12, itemHeight:70 }`，为矩阵腾横向空间。
- 隐藏格内数字 `series.label.show = !mobile`，数值改由 tooltip 展示。
- 长行业名 `yAxis.axisLabel: { width: 52, overflow: 'truncate' }`。
- 去掉桌面用的顶部/右侧镜像轴（移动端只保留主轴）。

**通用图表容器**（如 `HeatmapChart.vue`）：用 `ResizeObserver` 观察容器而非只监听 `window.resize`，这样侧栏收起、Tab 切换、弹窗列堆叠导致的宽度变化也能重排。

**易踩坑**：不要把 `window.addEventListener('resize', ...)` 写在 `loadData()` 里（每次拉数据重复注册），放 `onMounted`。

---

## 4. 表格：横滑 + 紧凑，**移动端不要固定列**

> 教训：`fixed="left"` 在移动端横滑时会与滚动内容重叠。**移动端一律取消固定列**，改为纯横向滚动。

```vue
<!-- 固定列：桌面固定，移动端取消 -->
<el-table-column type="index" label="#" :width="isMobile ? 34 : 50" :fixed="isMobile ? false : 'left'" />
<el-table-column prop="name" label="名称" :min-width="isMobile ? 92 : 180" :fixed="isMobile ? false : 'left'" />
<!-- 右侧操作列同理 :fixed="isMobile ? false : 'right'" -->
```

**列宽收窄**（让一屏多显示几列，对齐 legulegu 观感）：所有 `min-width` 按 `isMobile` 给更小值。经验值：序号 34、名称/代码类 ~92、纯数值 ~68-78、带进度条的 RPS 单元 ~118。

```vue
<el-table-column :min-width="isMobile ? 78 : 140" />
<el-table :height="isMobile ? undefined : 640" :max-height="isMobile ? 560 : undefined" />
```

- 表格高度：移动端 `height` 设 `undefined`（或用 `max-height`），避免与页面双重滚动。
- 单元格若有 `.rps-cell` 之类，不要设死 `min-width`，让其随列收缩。
- 组件里的表格（非 view）同样适用；确认没有遗留的硬编码 `fixed="left"`。

---

## 5. 筛选器 / 头部 / 工具栏

- `el-form :inline` → 全局已处理为堆叠；写死 `style="width:200px"` 的 select 会被全局 100% 覆盖，但**新代码尽量别写死宽度**。
- 标题 + 筛选器并排的 `.header-controls`（`justify-content:space-between`）必须加移动端堆叠：
  ```scss
  @media (max-width: 768px) {
    .header-controls { flex-direction: column; align-items: stretch; gap: 8px; }
  }
  ```
- 复用组件里写死 `min-width:220px` 的下拉（如 `IndustryFilter`），移动端要 `min-width:0; width:100%`。
- 快捷按钮组（时间范围等）移动端 `flex-wrap` 或网格 `grid-template-columns: repeat(3,1fr)`，不要 `justify-content:flex-end` 右挤。
- 摘要卡片网格移动端用 2 列（`repeat(2,minmax(0,1fr))`）提升密度，别用单列。
- 为单行布局调的负 margin（如 `margin-bottom:-18px`）在换行后会遮挡，移动端要归零。

---

## 6. K 线 / 趋势弹窗规范

点击名称弹出的趋势 K 线图，统一：
1. **去外框**：包裹图表的 `el-card` 换成普通 `<div>`（`v-loading` 照常可用），去掉卡片边框/阴影/内边距，图表铺满。
2. **默认最近 2 个月**：快捷区间加「最近2月」并设为默认；区间计算按月而非按年：
   ```ts
   type TrendShortcut = '2m' | '1y' | '3y' | '5y'
   const monthMap = { '2m': 2, '1y': 12, '3y': 36, '5y': 60 }
   start.setMonth(end.getMonth() - monthMap[range])
   const trendShortcut = ref<TrendShortcut>('2m')  // 默认值 + 打开弹窗时的 reset 都用 '2m'
   ```
3. 图表高度 `:height="isMobile ? '300px' : '420px'"`。
4. 弹窗宽度不用手动改，全局已强制移动端全屏。

参考实现：`StockSwingPracticeView.vue`（内联弹窗）、`components/MajorIndexTrendDialog.vue`（独立弹窗组件）。

---

## 7. 改造流程（对现有页面做移动端优化时）

1. **排查**：文件多时用子 agent 并行审计，产出「问题 + 修复建议」清单，避免占用主上下文。重点找：图表 option 是否随 `isMobile` 重算、`fixed` 列、写死的 px 宽度、`header-controls` 是否换行、弹窗宽度、内联表单。
2. **分层改**：基础设施（`useIsMobile`/全局 CSS）→ 图表遮挡 → 视图布局。每层改完验证。
3. **验证**：每批改动后跑
   ```bash
   npx vue-tsc --build          # 类型检查
   npm run build                # 生产构建（chunk-size 警告是既有的，非错误）
   ```
   无法真机截图，改完提示用户在 DevTools 375/390px + 真机确认：图表标签是否重叠、表格横滑无固定列覆盖、一屏列数、外边距、横竖屏切换重排。

## 参考文件
- 断点：`src/composables/useIsMobile.ts`
- 全局样式：`src/assets/main.css`
- 折线/柱状图范例：`src/components/TrendChart.vue`、`IndexVolumeTrend.vue`、`AdlTrend.vue`
- 热力图范例：`src/components/IndustryBreadthAnalysis.vue`、`TurnoverHeatmap.vue`、`FundFlowHeatmap.vue`、`HeatmapChart.vue`（ResizeObserver）
- 表格/弹窗范例：`src/views/strategy/IndexRpsView.vue`、`src/views/markt_data/MajorIndexRpsView.vue`、`src/views/indival_stock_data/StockSwingPracticeView.vue`
