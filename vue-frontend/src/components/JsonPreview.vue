<template>
  <div class="json-preview-inline">
    <pre class="json-pre">{{ prettyJson }}</pre>
    <div class="actions" v-if="showCopy">
      <el-button size="small" type="primary" @click="copyJson">复制JSON</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件：JsonPreview
 * 功能：在表格单元格中直接展示完整格式化 JSON，支持复制。
 * 参数（Props）：
 *  - value: any | string | Record<string, any> 需要展示的值，支持字符串或对象。
 *  - showCopy?: boolean 是否显示复制按钮，默认 true。
 * 返回值：无
 * 事件（Emits）：
 *  - copy: 当用户点击“复制JSON”按钮时触发，携带已复制的字符串。
 */
import { computed } from 'vue'
import { ElMessage } from 'element-plus'

interface Props {
  value: unknown
  showCopy?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showCopy: true,
})

const emit = defineEmits<{
  (e: 'copy', text: string): void
}>()

function safeParse(val: unknown): unknown {
  if (val === null || val === undefined) return val
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(trimmed)
      } catch {
        return val
      }
    }
    return val
  }
  return val
}

const normalized = computed(() => safeParse(props.value))

const prettyJson = computed(() => {
  try {
    if (typeof normalized.value === 'object') {
      return JSON.stringify(normalized.value as any, null, 2)
    }
    if (typeof normalized.value === 'string') {
      return normalized.value as string
    }
    return String(normalized.value)
  } catch {
    return String(props.value ?? '')
  }
})

// 行内展示不再需要摘要与弹层宽度

const copyJson = async () => {
  try {
    const text = prettyJson.value
    await navigator.clipboard.writeText(text)
    emit('copy', text)
    ElMessage.success('已复制 JSON')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.json-preview-inline {
  display: block;
}

.json-pre {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}
</style>