# 打板分析选股页面 - 行业趋势图集成与涨跌幅数据优化

## 修改时间
2026-07-05

## 功能说明

### 1. 点击行业名称打开趋势图
用户可以点击左侧行业列的任意行业名称，打开该行业的趋势看板K线图，查看历史走势。

### 2. 利用行情数据填充涨跌幅
当用户点击行业名称打开趋势图后，系统会：
1. 请求该行业的完整历史行情数据（通过 `dc_daily` 接口）
2. 缓存该行业所有日期的涨跌幅数据
3. 在交叉块中显示这些涨跌幅数据

这样可以解决以下问题：
- ✅ 即使某个行业某天没有涨停，只要用户点击过该行业，就能看到其涨跌幅
- ✅ 数据来源于专门的行业行情接口，更准确、更完整
- ✅ 按需加载，减少初始页面加载压力

## 修改内容

### 1. IndustryTrendDialog 组件 (`src/components/IndustryTrendDialog.vue`)

#### 新增事件定义
```typescript
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'data-loaded': [data: { sectorCode: string; records: Array<{ trade_date: string; pct_change: number }> }]
}>()
```

#### 数据加载完成后触发事件
```typescript
emit('data-loaded', {
  sectorCode: props.sectorCode,
  records: response.records?.map(item => ({
    trade_date: item.trade_date,
    pct_change: getNumericValue(item.pct_change)
  })) || []
})
```

### 2. LimitBoardIndustryTrendMatrix 组件 (`src/components/LimitBoardIndustryTrendMatrix.vue`)

#### 行业名称改为可点击按钮
```vue
<button type="button" class="industry-name-btn" @click="openIndustryTrendDialog(industry)">
  <span class="industry-name">{{ industry }}</span>
  <span class="industry-total">{{ industryRangeTotal(industry) }}</span>
</button>
```

#### 添加行业趋势弹窗
```vue
<IndustryTrendDialog
  v-model="industryTrendDialogVisible"
  :sector-code="selectedIndustryCode"
  :sector-name="selectedIndustryName"
  @data-loaded="handleIndustryDataLoaded"
/>
```

#### 新增数据缓存结构
```typescript
/** 行业行情数据缓存：行业代码 -> (日期 -> 涨跌幅) */
const industryPctChangeCache = ref(new Map<string, Map<string, number>>())

/** 行业代码到行业名称的映射 */
const industryCodeToName = computed(...)

/** 行业名称到行业代码的映射 */
const industryNameToCode = computed(...)
```

#### 处理数据加载事件
```typescript
function handleIndustryDataLoaded(data: { sectorCode: string; records: Array<{ trade_date: string; pct_change: number }> }) {
  const dateMap = new Map<string, number>()
  data.records.forEach(record => {
    dateMap.set(record.trade_date, record.pct_change)
  })
  industryPctChangeCache.value.set(data.sectorCode, dateMap)
}
```

#### 优化涨跌幅获取逻辑
```typescript
function industryPctChange(date: string, industry: string): number | null {
  // 1. 优先使用缓存的行情数据（用户点击过的行业）
  // 2. 其次从接口返回的数据中获取（有涨停的行业）
  // 3. 降级方案：直接查找（兜底）
}
```

#### 样式优化
```css
.industry-name-btn {
  /* 可点击样式，悬停时背景色变化 */
}

.industry-name-btn:hover .industry-name {
  color: #409eff; /* 悬停时文字变蓝 */
}
```

## 数据获取优先级

交叉块中行业涨跌幅的数据来源（按优先级）：

1. **缓存的行情数据**（最优）
   - 来源：用户点击行业名称后，从 `dc_daily` 接口获取
   - 特点：数据完整，包含所有日期
   - 适用：用户点击过的行业

2. **接口返回的涨跌幅**（次优）
   - 来源：`/limit-board/industry-trend-strength/` 接口的 `industry_pct_change` 字段
   - 特点：仅包含有涨停的行业
   - 适用：未点击但有涨停的行业

3. **直接查找**（兜底）
   - 来源：当前日期的 `industries` 数组
   - 特点：实时数据
   - 适用：上述方式都失败时

## 使用方式

1. **查看行业涨跌幅**：页面加载后，有涨停的行业会显示涨跌幅（来源于接口）

2. **查看行业趋势图**：点击左侧任意行业名称，打开K线图弹窗

3. **获得完整涨跌幅**：关闭弹窗后，该行业所有日期的涨跌幅会显示在交叉块中（来源于缓存）

## 优势

✅ **按需加载**：只有用户关注的行业才会请求完整数据
✅ **数据完整**：涨跌幅数据覆盖所有日期，不受是否有涨停的限制
✅ **性能优化**：避免初始加载时请求所有行业的行情数据
✅ **用户体验**：点击行业名称即可查看趋势图，操作直观
✅ **数据准确**：来源于专门的行业行情接口

## 兼容性

- ✅ TypeScript 类型检查通过
- ✅ Vite 构建成功
- ✅ 向下兼容，不影响现有功能
- ✅ 适用于所有东财板块映射方式
