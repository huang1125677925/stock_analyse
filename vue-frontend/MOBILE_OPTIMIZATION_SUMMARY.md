# IndexRpsView.vue 移动端优化总结

## 优化内容

### 1. 添加响应式屏幕检测
- 新增 `isMobile` 响应式变量，检测屏幕宽度是否 < 768px
- 使用 `window.addEventListener('resize')` 动态监听屏幕变化
- 在组件挂载和卸载时正确管理事件监听器

### 2. 主表格优化（指数RPS表格）

#### 表格高度
- **桌面端**: 固定高度 600px
- **移动端**: 自适应高度（undefined），避免双重滚动

#### 列宽调整
| 列 | 桌面端 | 移动端 |
|---|---|---|
| 序号列 (#) | 50px | 40px |
| 指数名称 | min-width: 180px | min-width: 120px |
| 操作列 | min-width: 210px | min-width: 160px |

#### 固定列处理
- **桌面端**: 
  - 左侧固定: 序号列 + 指数名称列
  - 右侧固定: 操作列
- **移动端**: 取消所有 `fixed` 属性，允许横向滚动查看全部内容

#### 操作按钮优化
- **桌面端**: 
  - 按钮大小: default
  - 文字: "领涨数据详情"
  - 布局: 横向排列
- **移动端**: 
  - 按钮大小: small
  - 文字: "领涨详情" (精简)
  - 布局: 垂直堆叠（通过 `.mobile-actions` 类实现）

### 3. 成分股RPS表格优化

应用了与主表格相同的优化策略：

#### 表格高度
- **桌面端**: 620px
- **移动端**: 自适应

#### 列宽调整
| 列 | 桌面端 | 移动端 |
|---|---|---|
| 序号列 (#) | 50px | 40px |
| ts_code | min-width: 120px | min-width: 100px |
| 名称 | min-width: 150px | min-width: 100px |

#### 固定列处理
- **移动端**: 取消所有固定列

### 4. CSS 样式优化

新增移动端按钮样式：

```css
.action-buttons.mobile-actions {
  flex-direction: column;
  gap: 6px;
}

.action-buttons.mobile-actions .el-button {
  width: 100%;
  margin: 0;
}
```

## 技术实现

### Vue 响应式方案
使用 Vue 3 Composition API 的 `ref` 和生命周期钩子：

```typescript
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
```

### 动态属性绑定
使用 Vue 的动态绑定语法：

```vue
:height="isMobile ? undefined : 600"
:width="isMobile ? 40 : 50"
:fixed="isMobile ? false : 'left'"
:size="isMobile ? 'small' : 'default'"
```

## 用户体验改进

### 移动端 (< 768px)
1. ✅ 用户可以左右滑动查看所有 RPS 数据列
2. ✅ 列宽优化，充分利用小屏幕空间
3. ✅ 按钮垂直堆叠，避免挤压
4. ✅ 自适应高度，避免双重滚动条
5. ✅ 文字精简，提高可读性

### 桌面端 (≥ 768px)
1. ✅ 保持原有固定列行为
2. ✅ 保持原有列宽
3. ✅ 保持原有按钮大小和文字
4. ✅ 不影响现有用户体验

## 测试建议

1. **屏幕尺寸测试**:
   - iPhone SE (375px)
   - iPhone 12/13/14 (390px)
   - iPhone 14 Pro Max (430px)
   - iPad (768px+)
   - Desktop (1024px+)

2. **功能测试**:
   - 横向滚动是否流畅
   - 按钮点击是否正常
   - 排序功能是否正常
   - 筛选功能是否正常
   - 对话框在移动端是否正常显示

3. **响应式测试**:
   - 调整浏览器窗口大小，检查布局是否自动切换
   - 横屏/竖屏切换测试

## 浏览器兼容性

- Chrome/Edge (现代版本)
- Safari (iOS 12+)
- Firefox (现代版本)

使用标准 `window.innerWidth` 和 CSS `@media` 查询，兼容性良好。
