<template>
  <el-dialog
    :model-value="props.modelValue"
    width="920px"
    top="5vh"
    :close-on-click-modal="false"
    append-to-body
    class="ai-analysis-dialog"
    @update:model-value="handleVisibleChange"
    @open="handleOpen"
  >
    <template #header>
      <div class="analysis-header">
        <div class="analysis-header-main">
          <el-icon class="analysis-header-icon"><MagicStick /></el-icon>
          <div>
            <div class="analysis-title">DeepSeek 数据分析</div>
            <div class="analysis-subtitle">
              {{ pageTitle }}
              <span class="route-path">{{ payloadRoute }}</span>
            </div>
          </div>
        </div>
        <div class="analysis-header-actions">
          <el-tag v-if="configSummary" type="info" effect="plain" size="small">
            {{ configSummary }}
          </el-tag>
          <el-button link type="primary" :disabled="status === 'running'" @click="configVisible = true">
            <el-icon><Setting /></el-icon>
            设置
          </el-button>
        </div>
      </div>
    </template>

    <div class="analysis-body">
      <el-alert
        v-if="!isDeepSeekConfigured"
        type="warning"
        show-icon
        :closable="false"
        class="config-alert"
        title="尚未配置 DeepSeek API Key"
      >
        <template #default>
          <div class="config-alert-body">
            <span>填写 API Key 与模型名称后即可分析当前页面数据，配置只保存在本机浏览器。</span>
            <el-button type="primary" size="small" @click="configVisible = true">立即配置</el-button>
          </div>
        </template>
      </el-alert>

      <!-- 采集到的数据概览：让用户清楚「送给模型的是什么」 -->
      <section class="data-panel">
        <div class="data-panel-head">
          <div class="data-panel-title">
            <el-icon><Document /></el-icon>
            本次分析数据
            <el-tag v-if="collecting" size="small" type="info" effect="plain">采集中…</el-tag>
            <template v-else-if="sources.length">
              <el-tag size="small" type="success" effect="plain">{{ sources.length }} 项来源</el-tag>
              <el-tag size="small" type="info" effect="plain">约 {{ dataSizeText }}</el-tag>
            </template>
          </div>
          <div class="data-panel-actions">
            <el-button link type="primary" :disabled="collecting || status === 'running'" @click="collectData(true)">
              <el-icon><Refresh /></el-icon>
              重新采集
            </el-button>
            <el-button v-if="sources.length" link type="primary" @click="showData = !showData">
              {{ showData ? '收起数据' : '查看数据' }}
            </el-button>
          </div>
        </div>

        <el-alert
          v-if="!collecting && sources.length === 0"
          type="info"
          show-icon
          :closable="false"
          title="当前页面暂未采集到数据"
          description="页面数据加载完成后会自动采集；也可以直接描述你的分析需求，模型会基于你提供的信息作答。"
        />

        <div v-if="sources.length" class="source-tags">
          <el-tag
            v-for="source in sources"
            :key="source.id"
            size="small"
            :type="source.kind === 'page' ? 'success' : 'info'"
            effect="plain"
            disable-transitions
          >
            {{ source.name }}
          </el-tag>
        </div>

        <el-collapse v-if="showData && sources.length" class="data-collapse">
          <el-collapse-item
            v-for="(source, index) in sources"
            :key="source.id"
            :name="String(index)"
          >
            <template #title>
              <span class="collapse-title">{{ source.name }}</span>
            </template>
            <JsonPreview :value="source.data" :show-copy="false" />
          </el-collapse-item>
        </el-collapse>
      </section>

      <!-- 分析方向输入 -->
      <section class="direction-panel">
        <div class="direction-label">
          <span>分析方向</span>
          <span class="direction-hint">留空则按默认口径分析（状态总结 + 变化 + 异常 + 风险）</span>
        </div>
        <el-input
          v-model="direction"
          type="textarea"
          :rows="3"
          resize="none"
          maxlength="500"
          show-word-limit
          :disabled="status === 'running'"
          placeholder="例如：对比近两周各行业资金流强弱，指出资金持续流入且宽度改善的行业"
          @keydown.enter.ctrl="handleAnalyze"
          @keydown.enter.meta="handleAnalyze"
        />
        <div class="preset-row">
          <el-check-tag
            v-for="preset in ANALYSIS_DIRECTION_PRESETS"
            :key="preset"
            :checked="direction === preset"
            :disabled="status === 'running'"
            class="preset-tag"
            @change="applyPreset(preset)"
          >
            {{ preset }}
          </el-check-tag>
        </div>
      </section>

      <!-- 操作区 -->
      <div class="action-row">
        <el-button
          v-if="status !== 'running'"
          type="primary"
          :loading="status === 'collecting'"
          :disabled="!isDeepSeekConfigured"
          @click="handleAnalyze"
        >
          <el-icon v-if="status !== 'collecting'"><MagicStick /></el-icon>
          {{ hasResult ? '重新分析' : '开始分析' }}
        </el-button>
        <el-button v-else type="danger" plain @click="handleStop">
          <el-icon><VideoPause /></el-icon>
          停止分析
        </el-button>

        <template v-if="hasResult">
          <el-button :disabled="status === 'running'" @click="handleCopy">
            <el-icon><CopyDocument /></el-icon>
            复制结果
          </el-button>
          <el-button :disabled="status === 'running'" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出 Markdown
          </el-button>
        </template>

        <div class="action-meta">
          <span v-if="status === 'running'">已用时 {{ elapsedText }}</span>
          <span v-else-if="metaText">{{ metaText }}</span>
        </div>
      </div>

      <!-- 结果区 -->
      <section class="result-panel">
        <el-alert
          v-if="errorMessage"
          type="error"
          show-icon
          :closable="false"
          :title="errorMessage"
          class="result-error"
        >
          <template #default>
            <div class="error-body">
              <span>{{ errorHint }}</span>
              <el-button v-if="errorNeedsConfig" link type="primary" @click="configVisible = true">
                去设置
              </el-button>
            </div>
          </template>
        </el-alert>

        <el-collapse v-if="reasoning" class="reasoning-collapse">
          <el-collapse-item name="reasoning">
            <template #title>
              <span class="collapse-title">推理过程（{{ reasoning.length }} 字）</span>
            </template>
            <pre class="reasoning-text">{{ reasoning }}</pre>
          </el-collapse-item>
        </el-collapse>

        <div ref="resultBodyRef" class="result-scroll" @scroll="handleResultScroll">
          <div v-if="output" class="markdown-body" v-html="renderedHtml"></div>
          <div v-else-if="status === 'collecting'" class="result-placeholder">正在采集页面数据…</div>
          <div v-else-if="status === 'running'" class="result-placeholder">
            <el-icon class="is-loading"><Loading /></el-icon>
            {{ reasoning ? 'DeepSeek 正在推理，请稍候…' : '正在等待 DeepSeek 返回分析结果…' }}
          </div>
          <el-empty v-else-if="!errorMessage" description="填写分析方向后点击「开始分析」" :image-size="72" />
        </div>
      </section>
    </div>

    <AiConfigDialog v-model="configVisible" @saved="handleConfigSaved" />
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 组件：AiAnalysisDialog
 * 功能：把当前页面采集到的数据与分析方向提交给 DeepSeek，流式展示分析结果，并支持复制与导出。
 * 参数（Props）：
 *  - modelValue: boolean 弹窗显隐（v-model）
 * 返回值：无
 * 事件（Emits）：
 *  - update:modelValue: 显隐变化
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  CopyDocument,
  Document,
  Download,
  Loading,
  MagicStick,
  Refresh,
  Setting,
  VideoPause,
} from '@element-plus/icons-vue'
import JsonPreview from './JsonPreview.vue'
import AiConfigDialog from './AiConfigDialog.vue'
import {
  ANALYSIS_DIRECTION_PRESETS,
  runPageAnalysis,
} from '@/services/aiAnalysis'
import {
  collectAiAnalysisPayload,
  getAiAnalysisPageTitle,
  getAiAnalysisRoutePath,
  onApiDataCaptured,
  type AiAnalysisPayload,
} from '@/services/aiPageDataStore'
import { isDeepSeekConfigured, maskApiKey, deepseekConfig } from '@/services/deepseekConfig'
import { DeepSeekError } from '@/services/deepseekApi'
import { renderMarkdown } from '@/utils/markdown'
import { copyText } from '@/utils/clipboard'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

type Status = 'idle' | 'collecting' | 'running' | 'done' | 'error'

const status = ref<Status>('idle')
const direction = ref('')
const output = ref('')
const reasoning = ref('')
const renderedHtml = ref('')
const errorMessage = ref('')
const errorHint = ref('')
const errorNeedsConfig = ref(false)
const payload = ref<AiAnalysisPayload | null>(null)
const showData = ref(false)
const configVisible = ref(false)
const elapsedMs = ref(0)
const lastMeta = ref<{ model: string; latencyMs: number } | null>(null)
const resultBodyRef = ref<HTMLElement | null>(null)
const autoScroll = ref(true)

let abortController: AbortController | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null
let renderTimer: ReturnType<typeof setTimeout> | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null

/** 当前页面标题 */
const pageTitle = computed(() => payload.value?.pageTitle || getAiAnalysisPageTitle() || '当前页面')
/** 当前路由 */
const payloadRoute = computed(() => payload.value?.routePath || getAiAnalysisRoutePath() || '/')
/** 数据来源列表 */
const sources = computed(() => payload.value?.sources ?? [])
/** 是否正在采集数据 */
const collecting = computed(() => status.value === 'collecting')
/** 是否已有结果文本 */
const hasResult = computed(() => output.value.trim().length > 0)

/** 数据体量的可读展示 */
const dataSizeText = computed(() => {
  const size = payload.value?.charLength ?? 0
  if (size < 1024) return `${size} 字符`
  return `${(size / 1024).toFixed(1)} KB`
})

/** 结果区右上角的模型/耗时信息 */
const metaText = computed(() => {
  if (!lastMeta.value) return ''
  const seconds = (lastMeta.value.latencyMs / 1000).toFixed(1)
  return `${lastMeta.value.model} · 耗时 ${seconds} 秒 · 输出 ${output.value.length} 字`
})

/** 头部展示当前模型与脱敏 Key */
const configSummary = computed(() => {
  if (!isDeepSeekConfigured.value) return ''
  const key = maskApiKey()
  return key ? `${deepseekConfig.model} · ${key}` : deepseekConfig.model
})

/** 运行用时（秒） */
const elapsedText = computed(() => `${(elapsedMs.value / 1000).toFixed(0)} 秒`)

/** 流式输出时按节流刷新 Markdown，避免每个 token 都重新解析 */
watch(output, () => {
  if (renderTimer) return
  renderTimer = setTimeout(() => {
    renderTimer = null
    renderedHtml.value = renderMarkdown(output.value)
    if (autoScroll.value) scrollResultToBottom()
  }, 120)
})

/**
 * 采集当前页面数据。
 * 参数：manual 为 true 表示用户手动点击「重新采集」。
 * 返回值：无
 */
async function collectData(manual = false) {
  status.value = 'collecting'
  errorMessage.value = ''
  errorHint.value = ''
  errorNeedsConfig.value = false
  try {
    payload.value = await collectAiAnalysisPayload()
    status.value = 'idle'
    if (manual) {
      const count = payload.value.sources.length
      ElMessage.success(count ? `已重新采集 ${count} 项数据` : '当前页面暂无可采集数据')
    }
  } catch (error) {
    status.value = 'idle'
    console.error('[ai-analysis] 采集页面数据失败:', error)
    if (manual) ElMessage.error('采集页面数据失败')
  }
}

/**
 * 数据包签名：用来判断自动刷新时数据是否真的发生了变化。
 * 页面加载期间接口会陆续返回，签名不变时保持原对象可避免列表无意义地重渲染。
 */
function payloadSignature(value: AiAnalysisPayload | null): string {
  if (!value) return ''
  return `${value.charLength}|${value.sources.map((source) => source.id).join(',')}`
}

/**
 * 安静地刷新数据包（不改变状态、不弹提示）。
 * 用途：弹窗打开时页面数据还在陆续返回，数据到位后自动更新概览。
 * 返回值：无
 */
async function refreshPayloadQuietly() {
  try {
    const next = await collectAiAnalysisPayload()
    if (payloadSignature(next) === payloadSignature(payload.value)) return
    payload.value = next
  } catch (error) {
    console.warn('[ai-analysis] 自动刷新采集数据失败:', error)
  }
}

// 页面接口数据陆续返回时，若用户尚未开始分析，则自动更新数据概览
const unsubscribeCapture = onApiDataCaptured(() => {
  if (status.value === 'running' || refreshTimer) return
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    refreshPayloadQuietly()
  }, 800)
})

/** 弹窗打开：重置状态并立即采集一次数据 */
function handleOpen() {
  direction.value = ''
  output.value = ''
  reasoning.value = ''
  renderedHtml.value = ''
  errorMessage.value = ''
  errorHint.value = ''
  errorNeedsConfig.value = false
  lastMeta.value = null
  elapsedMs.value = 0
  showData.value = false
  autoScroll.value = true
  collectData()
}

/** 关闭弹窗时中断进行中的请求 */
function handleVisibleChange(value: boolean) {
  if (!value) stopElapsedTimer()
  if (!value && status.value === 'running') abortController?.abort()
  emit('update:modelValue', value)
}

function applyPreset(preset: string) {
  direction.value = direction.value === preset ? '' : preset
}

/** 启动计时器，展示分析用时 */
function startElapsedTimer() {
  stopElapsedTimer()
  elapsedMs.value = 0
  const startedAt = Date.now()
  elapsedTimer = setInterval(() => {
    elapsedMs.value = Date.now() - startedAt
  }, 500)
}

function stopElapsedTimer() {
  if (elapsedTimer) clearInterval(elapsedTimer)
  elapsedTimer = null
}

function scrollResultToBottom() {
  nextTick(() => {
    const element = resultBodyRef.value
    if (element) element.scrollTop = element.scrollHeight
  })
}

/** 用户手动上滑时暂停自动滚动，回到底部附近后恢复 */
function handleResultScroll() {
  const element = resultBodyRef.value
  if (!element) return
  autoScroll.value = element.scrollHeight - element.scrollTop - element.clientHeight < 48
}

/**
 * 生成发送给模型的分析方向，未填写时留空（由服务层使用默认口径）。
 * 返回值：分析方向文本。
 */
function resolveDirection(): string {
  return direction.value.trim()
}

/** 开始分析 */
async function handleAnalyze() {
  if (status.value === 'running') return
  if (!isDeepSeekConfigured.value) {
    configVisible.value = true
    return
  }

  output.value = ''
  reasoning.value = ''
  renderedHtml.value = ''
  errorMessage.value = ''
  errorHint.value = ''
  errorNeedsConfig.value = false
  lastMeta.value = null
  autoScroll.value = true
  status.value = 'running'
  startElapsedTimer()

  abortController = new AbortController()
  try {
    const result = await runPageAnalysis({
      direction: resolveDirection(),
      onDelta: (_delta, full) => {
        output.value = full
      },
      onReasoningDelta: (_delta, full) => {
        reasoning.value = full
      },
      signal: abortController.signal,
    })
    payload.value = result.payload
    output.value = result.content || output.value
    renderedHtml.value = renderMarkdown(output.value)
    lastMeta.value = { model: result.model, latencyMs: result.latencyMs }
    status.value = 'done'
  } catch (error) {
    const isCanceled = error instanceof DeepSeekError && error.canceled
    if (isCanceled) {
      status.value = output.value ? 'done' : 'idle'
      if (output.value) lastMeta.value = lastMeta.value ?? { model: deepseekConfig.model, latencyMs: elapsedMs.value }
      ElMessage.info('已停止分析')
    } else {
      status.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : String(error)
      const status401 =
        error instanceof DeepSeekError && (error.status === 401 || error.status === 402)
      errorNeedsConfig.value = status401
      errorHint.value = status401
        ? '请在设置中检查 API Key、账户余额与模型名称。'
        : '可点击「重新分析」重试，或换个模型（如 deepseek-chat）后再试。'
    }
  } finally {
    stopElapsedTimer()
    abortController = null
  }
}

/** 停止分析 */
function handleStop() {
  abortController?.abort()
}

async function handleCopy() {
  const ok = await copyText(output.value)
  if (ok) {
    ElMessage.success('分析结果已复制')
  } else {
    ElMessage.error('复制失败，请手动选择文本复制')
  }
}

/** 导出结果为 Markdown 文件 */
function handleExport() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
  const lines = [
    `# ${pageTitle.value} · DeepSeek 数据分析`,
    '',
    `- 页面路由：${payloadRoute.value}`,
    `- 分析时间：${now.toLocaleString('zh-CN')}`,
    `- 使用模型：${lastMeta.value?.model ?? deepseekConfig.model}`,
    `- 分析方向：${resolveDirection() || '默认口径（状态总结 + 变化 + 异常 + 风险）'}`,
    `- 数据来源：${sources.value.map((source) => source.name).join('、') || '未采集到数据'}`,
    '',
    '## 分析结果',
    '',
    output.value.trim(),
  ]
  if (reasoning.value.trim()) {
    lines.push('', '## 推理过程', '', reasoning.value.trim())
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `AI分析_${pageTitle.value}_${stamp}.md`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
  ElMessage.success('已导出 Markdown 文件')
}

/** 配置保存后给出反馈；此前若因未配置而无法分析，这里提示可以开始 */
function handleConfigSaved() {
  if (isDeepSeekConfigured.value && status.value !== 'running') {
    ElMessage.success('配置已生效，可以开始分析当前页面数据')
  }
}

onUnmounted(() => {
  abortController?.abort()
  stopElapsedTimer()
  if (renderTimer) clearTimeout(renderTimer)
  if (refreshTimer) clearTimeout(refreshTimer)
  unsubscribeCapture()
})
</script>

<style scoped>
.analysis-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.analysis-header-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.analysis-header-icon {
  font-size: 20px;
  color: var(--el-color-primary);
}

.analysis-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.analysis-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.route-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.analysis-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.analysis-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-alert :deep(.el-alert__content) {
  width: 100%;
}

.config-alert-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.data-panel,
.direction-panel {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 10px 12px;
  background: #fafcff;
}

.data-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.data-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.data-panel-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.source-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.data-collapse {
  margin-top: 8px;
  border-top: none;
  border-bottom: none;
}

.data-collapse :deep(.el-collapse-item__header) {
  height: 32px;
  line-height: 32px;
  background: transparent;
  font-size: 12px;
}

.data-collapse :deep(.el-collapse-item__wrap) {
  background: transparent;
}

.data-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 10px;
  max-height: 260px;
  overflow: auto;
}

.collapse-title {
  font-size: 13px;
  color: #606266;
}

.direction-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  flex-wrap: wrap;
}

.direction-hint {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.preset-tag {
  font-size: 12px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.action-meta {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}

.result-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-error :deep(.el-alert__content) {
  width: 100%;
}

.error-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.reasoning-collapse {
  border-top: none;
  border-bottom: 1px solid #ebeef5;
}

.reasoning-text {
  margin: 0;
  max-height: 220px;
  overflow: auto;
  padding: 8px;
  background: #f7f8fa;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.7;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
}

.result-scroll {
  min-height: 220px;
  max-height: 46vh;
  overflow: auto;
  padding: 12px 14px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
}

.result-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 180px;
  color: #909399;
  font-size: 13px;
}

/* Markdown 结果排版：紧凑、可读，表格在窄屏内横向滚动 */
.markdown-body {
  font-size: 14px;
  line-height: 1.75;
  color: #303133;
  word-break: break-word;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 16px 0 8px;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2d3d;
}

.markdown-body :deep(h1) {
  font-size: 18px;
}

.markdown-body :deep(h2) {
  font-size: 16px;
  padding-left: 8px;
  border-left: 3px solid var(--el-color-primary);
}

.markdown-body :deep(h3) {
  font-size: 14px;
}

.markdown-body :deep(p) {
  margin: 8px 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0;
  padding-left: 22px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(strong) {
  color: #1f2d3d;
}

.markdown-body :deep(code) {
  padding: 1px 5px;
  background: #f2f3f5;
  border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
}

.markdown-body :deep(pre) {
  margin: 8px 0;
  padding: 10px;
  background: #f7f8fa;
  border-radius: 4px;
  overflow: auto;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
}

.markdown-body :deep(blockquote) {
  margin: 8px 0;
  padding: 6px 12px;
  border-left: 3px solid #dcdfe6;
  background: #fafafa;
  color: #606266;
}

.markdown-body :deep(table) {
  width: 100%;
  margin: 10px 0;
  border-collapse: collapse;
  font-size: 13px;
  display: block;
  overflow: auto;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #ebeef5;
  padding: 6px 8px;
  text-align: left;
  white-space: nowrap;
}

.markdown-body :deep(th) {
  background: #f5f7fa;
  font-weight: 600;
}

.markdown-body :deep(hr) {
  margin: 14px 0;
  border: none;
  border-top: 1px solid #ebeef5;
}

.markdown-body :deep(a) {
  color: var(--el-color-primary);
}

@media (max-width: 768px) {
  .analysis-header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .result-scroll {
    max-height: 52vh;
    padding: 10px;
  }

  .action-meta {
    margin-left: 0;
    width: 100%;
  }
}
</style>
