<template>
  <el-dialog
    :model-value="props.modelValue"
    width="640px"
    top="6vh"
    :close-on-click-modal="false"
    append-to-body
    class="ai-config-dialog"
    @update:model-value="emit('update:modelValue', $event)"
    @open="onOpen"
  >
    <template #header>
      <div class="config-header">
        <el-icon class="config-header-icon"><Setting /></el-icon>
        <div>
          <div class="config-title">DeepSeek 分析设置</div>
          <div class="config-subtitle">全局生效，所有页面的数据分析共用这份配置</div>
        </div>
      </div>
    </template>

    <el-form label-position="top" class="config-form" @submit.prevent>
      <el-form-item label="API Key">
        <el-input
          v-model="form.apiKey"
          type="password"
          show-password
          clearable
          placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          autocomplete="off"
        >
          <template #prefix>
            <el-icon><Key /></el-icon>
          </template>
        </el-input>
        <div class="field-hint">
          在
          <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer"
            >DeepSeek 开放平台</a
          >
          创建。Key 只保存在本机浏览器 localStorage，请求由浏览器直接发往 DeepSeek，不经过本站服务器；请勿在公共设备上保存。
          <span v-if="savedKeyMasked" class="saved-key">当前已保存：{{ savedKeyMasked }}</span>
        </div>
      </el-form-item>

      <el-form-item label="模型名称">
        <el-select
          v-model="form.model"
          filterable
          allow-create
          default-first-option
          placeholder="deepseek-chat"
          class="model-select"
        >
          <el-option
            v-for="option in DEEPSEEK_MODEL_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <div class="field-hint">
          {{ modelHint }}
        </div>
      </el-form-item>

      <el-form-item label="API 基址">
        <el-input v-model="form.baseUrl" clearable :placeholder="DEFAULT_DEEPSEEK_BASE_URL">
          <template #prefix>
            <el-icon><Link /></el-icon>
          </template>
        </el-input>
        <div class="field-hint">
          默认官方地址 {{ DEFAULT_DEEPSEEK_BASE_URL }}；使用中转网关时填网关地址（需自行开启 CORS）。
        </div>
      </el-form-item>

      <div class="config-row">
        <el-form-item label="采样温度" class="config-row-item">
          <el-slider v-model="form.temperature" :min="0" :max="2" :step="0.1" show-input />
          <div class="field-hint">数值越低越稳定保守，越高越发散。推理模型会忽略该参数。</div>
        </el-form-item>
      </div>

      <div class="config-row">
        <el-form-item label="最大输出长度（tokens）" class="config-row-item">
          <el-input-number v-model="form.maxTokens" :min="0" :max="8192" :step="512" />
          <div class="field-hint">0 表示使用服务端默认值；长报告可设为 4096 以上。</div>
        </el-form-item>
        <el-form-item label="流式输出" class="config-row-item config-row-switch">
          <el-switch v-model="form.stream" active-text="逐字返回" inactive-text="一次返回" />
          <div class="field-hint">流式可实时看到分析过程，推荐开启。</div>
        </el-form-item>
      </div>

      <el-collapse class="advanced-collapse">
        <el-collapse-item name="advanced">
          <template #title>
            <span class="advanced-title">高级：系统提示词</span>
          </template>
          <el-input
            v-model="form.systemPrompt"
            type="textarea"
            :rows="8"
            resize="vertical"
            placeholder="约束模型的分析口径"
          />
          <div class="advanced-actions">
            <el-button link type="primary" @click="restoreDefaultPrompt">恢复默认提示词</el-button>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <el-alert
      v-if="testResult"
      :type="testResult.type"
      :title="testResult.title"
      :description="testResult.description"
      :closable="false"
      show-icon
      class="test-result"
    />

    <template #footer>
      <div class="config-footer">
        <div class="config-footer-left">
          <el-button
            :loading="testing"
            :disabled="!form.apiKey.trim()"
            @click="handleTestConnection"
          >
            <el-icon v-if="!testing"><Connection /></el-icon>
            测试连接
          </el-button>
          <el-button link type="danger" @click="handleClearKey">清空 Key</el-button>
        </div>
        <div>
          <el-button @click="emit('update:modelValue', false)">取消</el-button>
          <el-button type="primary" @click="handleSave">保存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 组件：AiConfigDialog
 * 功能：全局配置 DeepSeek 直连参数（API Key、模型名、基址、采样参数、系统提示词），支持连通性测试。
 * 参数（Props）：
 *  - modelValue: boolean 弹窗显隐（v-model）
 * 返回值：无
 * 事件（Emits）：
 *  - update:modelValue: 显隐变化
 *  - saved: 配置保存成功后触发，携带最新配置
 */
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Key, Link, Setting } from '@element-plus/icons-vue'
import {
  DEEPSEEK_MODEL_OPTIONS,
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_SYSTEM_PROMPT,
  deepseekConfig,
  maskApiKey,
  saveDeepSeekConfig,
} from '@/services/deepseekConfig'
import { testDeepSeekConnection } from '@/services/deepseekApi'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

/** 表单本地副本，避免编辑过程中直接改动全局配置 */
const form = reactive({
  apiKey: '',
  model: deepseekConfig.model,
  baseUrl: deepseekConfig.baseUrl,
  temperature: deepseekConfig.temperature,
  maxTokens: deepseekConfig.maxTokens,
  stream: deepseekConfig.stream,
  systemPrompt: deepseekConfig.systemPrompt,
})

const testing = ref(false)
const testResult = ref<{ type: 'success' | 'error' | 'warning'; title: string; description: string } | null>(
  null,
)

/** 已保存 Key 的脱敏展示 */
const savedKeyMasked = computed(() => maskApiKey())

/** 当前模型的说明文案 */
const modelHint = computed(() => {
  const matched = DEEPSEEK_MODEL_OPTIONS.find((option) => option.value === form.model.trim())
  if (matched) return matched.description
  return '可填写内置模型名，也可填写中转网关提供的自定义模型名。'
})

/** 打开弹窗时用全局配置刷新表单 */
function onOpen() {
  form.apiKey = deepseekConfig.apiKey
  form.model = deepseekConfig.model
  form.baseUrl = deepseekConfig.baseUrl
  form.temperature = deepseekConfig.temperature
  form.maxTokens = deepseekConfig.maxTokens
  form.stream = deepseekConfig.stream
  form.systemPrompt = deepseekConfig.systemPrompt
  testResult.value = null
}

function restoreDefaultPrompt() {
  form.systemPrompt = DEFAULT_SYSTEM_PROMPT
}

/**
 * 保存配置（测试连接前也会先落盘，保证测试使用的是当前表单值）。
 * 参数：silent 为 true 时不弹成功提示。
 * 返回值：是否保存成功。
 */
function persist(silent = false): boolean {
  if (!form.model.trim()) {
    ElMessage.warning('请填写模型名称')
    return false
  }
  saveDeepSeekConfig({ ...form })
  if (!silent) {
    ElMessage.success(
      deepseekConfig.apiKey ? 'DeepSeek 配置已保存' : '配置已保存，但未填写 API Key，暂时无法分析',
    )
  }
  emit('saved')
  return true
}

function handleSave() {
  if (!persist()) return
  emit('update:modelValue', false)
}

async function handleTestConnection() {
  if (!persist(true)) return
  testing.value = true
  testResult.value = null
  try {
    const result = await testDeepSeekConnection()
    testResult.value = {
      type: 'success',
      title: `连接成功（${result.model}，${result.latencyMs} ms）`,
      description: result.reply ? `模型回复：${result.reply}` : '模型已正常响应，可以开始使用数据分析功能。',
    }
  } catch (error) {
    testResult.value = {
      type: 'error',
      title: '连接失败',
      description: error instanceof Error ? error.message : String(error),
    }
  } finally {
    testing.value = false
  }
}

async function handleClearKey() {
  try {
    await ElMessageBox.confirm('将清除本机保存的 DeepSeek API Key，确定继续？', '清空 API Key', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  form.apiKey = ''
  saveDeepSeekConfig({ apiKey: '' })
  testResult.value = null
  ElMessage.success('API Key 已清除')
}
</script>

<style scoped>
.config-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.config-header-icon {
  font-size: 20px;
  color: var(--el-color-primary);
}

.config-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.config-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}

.config-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.field-hint {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #909399;
}

.field-hint a {
  color: var(--el-color-primary);
}

.saved-key {
  margin-left: 6px;
  color: #606266;
}

.model-select {
  width: 100%;
}

.config-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.config-row-item {
  flex: 1 1 240px;
  min-width: 0;
}

.config-row-switch {
  flex: 0 1 200px;
}

.advanced-collapse {
  border-top: 1px solid #ebeef5;
  border-bottom: none;
}

.advanced-title {
  font-size: 13px;
  color: #606266;
}

.advanced-actions {
  margin-top: 6px;
  text-align: right;
}

.test-result {
  margin-top: 4px;
}

.config-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.config-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 768px) {
  .config-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .config-footer-left {
    justify-content: space-between;
  }
}
</style>
