<template>
  <div class="technical-learning-page">
    <el-card class="page-card" shadow="never">
      <template #header>
        <div class="page-header">
          <div>
            <h2>技术学习</h2>
            <span class="repo-label">{{ repoLabel }}</span>
          </div>
          <el-button :loading="treeLoading" @click="loadTree">刷新目录</el-button>
        </div>
      </template>

      <div class="learning-layout">
        <aside class="tree-panel">
          <el-input v-model="keyword" clearable placeholder="搜索文件" class="search-input" />
          <el-scrollbar height="calc(100vh - 250px)">
            <el-tree
              v-loading="treeLoading"
              :data="filteredTree"
              :props="{ label: 'label', children: 'children' }"
              node-key="key"
              default-expand-all
              highlight-current
              empty-text="暂无目录"
              @node-click="handleNodeClick"
            >
              <template #default="{ node, data }">
                <span class="tree-node" :class="{ file: data.type === 'blob' }">
                  <el-icon><Folder v-if="data.type === 'tree'" /><Document v-else /></el-icon>
                  <span>{{ node.label }}</span>
                </span>
              </template>
            </el-tree>
          </el-scrollbar>
        </aside>

        <main class="content-panel" v-loading="fileLoading">
          <div v-if="selectedFile" class="file-header">
            <div>
              <h3>{{ selectedFile.name }}</h3>
              <span>{{ selectedFile.path }}</span>
            </div>
            <el-tag effect="plain">{{ formatSize(selectedFile.size) }}</el-tag>
          </div>

          <el-empty v-if="!selectedFile && !fileLoading" description="请选择左侧文件" />
          <article v-else-if="isMarkdownFile(selectedFile?.name)" class="markdown-body" v-html="renderedContent"></article>
          <pre v-else class="plain-content">{{ fileContent }}</pre>
        </main>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Folder } from '@element-plus/icons-vue'
import { marked } from 'marked'
import {
  decodeGithubContent,
  fetchMybookFile,
  fetchMybookTree,
  getGithubRepoLabel,
  type GithubContentResponse,
  type GithubTreeItem
} from '@/services/githubMybookApi'

interface TreeNode {
  key: string
  label: string
  path: string
  type: 'tree' | 'blob'
  children?: TreeNode[]
  item?: GithubTreeItem
}

const repoLabel = getGithubRepoLabel()
const treeLoading = ref(false)
const fileLoading = ref(false)
const keyword = ref('')
const treeNodes = ref<TreeNode[]>([])
const selectedFile = ref<GithubContentResponse | null>(null)
const fileContent = ref('')

const renderedContent = computed(() => marked.parse(fileContent.value) as string)
const filteredTree = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return treeNodes.value
  return filterNodes(treeNodes.value, kw)
})

function buildTree(items: GithubTreeItem[]): TreeNode[] {
  const root: TreeNode[] = []
  const dirMap = new Map<string, TreeNode[]>()
  dirMap.set('', root)

  items
    .filter(item => item.type === 'tree')
    .sort((a, b) => a.path.localeCompare(b.path))
    .forEach(item => {
      const parts = item.path.split('/')
      const name = parts[parts.length - 1]
      const parentPath = parts.slice(0, -1).join('/')
      const parent = dirMap.get(parentPath) || root
      const node: TreeNode = {
        key: item.path,
        label: name,
        path: item.path,
        type: 'tree',
        children: [],
        item
      }
      parent.push(node)
      dirMap.set(item.path, node.children!)
    })

  items
    .filter(item => item.type === 'blob')
    .sort((a, b) => a.path.localeCompare(b.path))
    .forEach(item => {
      const parts = item.path.split('/')
      const name = parts[parts.length - 1]
      const parentPath = parts.slice(0, -1).join('/')
      const parent = dirMap.get(parentPath) || root
      parent.push({
        key: item.path,
        label: name,
        path: item.path,
        type: 'blob',
        item
      })
    })

  sortNodes(root)
  return root
}

function sortNodes(nodes: TreeNode[]) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1
    return a.label.localeCompare(b.label)
  })
  nodes.forEach(node => {
    if (node.children) sortNodes(node.children)
  })
}

function filterNodes(nodes: TreeNode[], kw: string): TreeNode[] {
  return nodes.flatMap(node => {
    const children = node.children ? filterNodes(node.children, kw) : []
    const matched = node.label.toLowerCase().includes(kw) || node.path.toLowerCase().includes(kw)
    if (matched || children.length) {
      return [{ ...node, children }]
    }
    return []
  })
}

async function loadTree() {
  treeLoading.value = true
  try {
    const items = await fetchMybookTree()
    treeNodes.value = buildTree(items)
  } catch (error: any) {
    ElMessage.error(error?.message || 'GitHub 目录加载失败')
  } finally {
    treeLoading.value = false
  }
}

async function handleNodeClick(node: TreeNode) {
  if (node.type !== 'blob') return
  fileLoading.value = true
  try {
    selectedFile.value = await fetchMybookFile(node.path)
    fileContent.value = decodeGithubContent(selectedFile.value.content || '')
  } catch (error: any) {
    ElMessage.error(error?.message || '文件内容加载失败')
  } finally {
    fileLoading.value = false
  }
}

function isMarkdownFile(name = '') {
  return /\.(md|markdown)$/i.test(name)
}

function formatSize(size?: number) {
  if (!size) return '0 B'
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${size} B`
}

onMounted(() => {
  loadTree()
})
</script>

<style scoped>
.technical-learning-page {
  padding: 12px;
}

.page-card {
  min-height: calc(100vh - 120px);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header h2 {
  margin: 0 0 4px;
}

.repo-label,
.file-header span {
  color: #606266;
  font-size: 13px;
}

.learning-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
}

.tree-panel {
  border-right: 1px solid #ebeef5;
  padding-right: 12px;
}

.search-input {
  margin-bottom: 12px;
}

.tree-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.tree-node.file {
  color: #303133;
}

.content-panel {
  min-width: 0;
}

.file-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 16px;
  padding-bottom: 12px;
}

.file-header h3 {
  margin: 0 0 4px;
}

.markdown-body {
  color: #303133;
  line-height: 1.75;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 20px 0 12px;
}

.markdown-body :deep(pre),
.plain-content {
  background: #f6f8fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: auto;
  padding: 12px;
}

.markdown-body :deep(code) {
  background: #f6f8fa;
  border-radius: 3px;
  padding: 2px 4px;
}

.plain-content {
  min-height: 360px;
  white-space: pre-wrap;
}

@media (max-width: 960px) {
  .learning-layout {
    grid-template-columns: 1fr;
  }

  .tree-panel {
    border-right: none;
    border-bottom: 1px solid #ebeef5;
    padding: 0 0 12px;
  }
}
</style>
