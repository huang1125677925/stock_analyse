/**
 * Markdown 渲染工具
 *
 * 功能：
 * - 把 DeepSeek 返回的 Markdown 文本渲染为 HTML，供分析结果弹窗展示
 * - 渲染结果经过白名单清洗（标签 + 属性），避免模型输出或页面数据中的脚本被注入执行
 *
 * 说明：markdown 文本来自外部模型，属于不可信内容，必须清洗后再 v-html。
 */
import { marked } from 'marked'

/** 允许保留的标签 */
const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'hr',
  'strong',
  'b',
  'em',
  'i',
  'del',
  's',
  'sup',
  'sub',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'a',
  'span',
])

/** 连同内容一起删除的危险标签 */
const DROP_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'svg',
  'math',
  'base',
])

/** 各标签允许保留的属性 */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
  code: new Set(['class']),
  span: new Set(['class']),
  th: new Set(['align']),
  td: new Set(['align']),
}

/** 允许的链接协议 */
const SAFE_LINK_PATTERN = /^(https?:\/\/|mailto:|tel:|\/|#)/i

const markedInstance = marked

/**
 * 清洗 HTML：白名单标签与属性，移除脚本类节点。
 * 参数：html 待清洗的 HTML 字符串。
 * 返回值：清洗后的 HTML 字符串。
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const isAllowedAttr = (tag: string, name: string): boolean => {
    if (name.startsWith('on')) return false
    const allowed = ALLOWED_ATTRS[tag]
    return Boolean(allowed && allowed.has(name))
  }

  const clean = (parent: Element) => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType !== 1) continue
      const element = node as Element
      const tag = element.tagName.toLowerCase()

      if (DROP_TAGS.has(tag)) {
        element.remove()
        continue
      }

      if (!ALLOWED_TAGS.has(tag)) {
        // 未知标签去掉外壳保留内容，避免整段文本被吞掉
        clean(element)
        const fragment = doc.createDocumentFragment()
        while (element.firstChild) fragment.appendChild(element.firstChild)
        element.replaceWith(fragment)
        continue
      }

      for (const attr of Array.from(element.attributes)) {
        const name = attr.name.toLowerCase()
        if (!isAllowedAttr(tag, name)) {
          element.removeAttribute(attr.name)
          continue
        }
        if (name === 'href' && !SAFE_LINK_PATTERN.test(attr.value.trim())) {
          element.removeAttribute(attr.name)
        }
      }

      if (tag === 'a') {
        element.setAttribute('target', '_blank')
        element.setAttribute('rel', 'noopener noreferrer')
      }

      clean(element)
    }
  }

  clean(doc.body)
  return doc.body.innerHTML
}

/**
 * 渲染 Markdown 为安全的 HTML。
 * 参数：source Markdown 原文（可为空）。
 * 返回值：清洗后的 HTML 字符串，空输入返回空串。
 */
export function renderMarkdown(source: string): string {
  const text = (source || '').trim()
  if (!text) return ''
  try {
    const html = markedInstance.parse(text, {
      gfm: true,
      breaks: true,
      async: false,
    }) as string
    return sanitizeHtml(html)
  } catch (error) {
    console.warn('[markdown] 渲染失败，已回退为纯文本:', error)
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return `<pre>${escaped}</pre>`
  }
}
