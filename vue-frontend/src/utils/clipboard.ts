/**
 * 剪贴板工具
 *
 * 为什么不用直接写 navigator.clipboard：
 * - 非安全上下文（如通过 http://192.168.x.x 访问）下 navigator.clipboard 为 undefined
 * - 浏览器可能因权限或文档失焦拒绝异步剪贴板写入
 * 因此优先使用异步 API，失败时回退到临时 textarea + execCommand 方案。
 */

/**
 * 复制文本到剪贴板。
 * 参数：text 需要复制的文本。
 * 返回值：是否复制成功。
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (error) {
    console.warn('[clipboard] 异步剪贴板不可用，回退到 execCommand:', error)
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-1000px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch (error) {
    console.warn('[clipboard] 复制失败:', error)
    return false
  }
}
