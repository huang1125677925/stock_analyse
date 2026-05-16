const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER || 'huang1125677925'
const GITHUB_REPO = import.meta.env.VITE_GITHUB_MYBOOK_REPO || 'mybook'
const GITHUB_BRANCH = import.meta.env.VITE_GITHUB_MYBOOK_BRANCH || ''

export interface GithubTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree' | string
  sha: string
  size?: number
  url: string
}

export interface GithubTreeResponse {
  sha: string
  url: string
  tree: GithubTreeItem[]
  truncated: boolean
}

export interface GithubContentResponse {
  name: string
  path: string
  sha: string
  size: number
  type: string
  content?: string
  encoding?: string
  download_url?: string
}

interface GithubRepoResponse {
  default_branch: string
}

function githubHeaders(): HeadersInit {
  const token = localStorage.getItem('github_token') || import.meta.env.VITE_GITHUB_TOKEN
  return {
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

async function requestGithub<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: githubHeaders() })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || `GitHub 请求失败: ${res.status}`)
  }
  return res.json() as Promise<T>
}

function repoApiBase(): string {
  return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`
}

export function getGithubRepoLabel(): string {
  return `${GITHUB_OWNER}/${GITHUB_REPO}`
}

export async function fetchMybookTree(): Promise<GithubTreeItem[]> {
  const branch = GITHUB_BRANCH || (await requestGithub<GithubRepoResponse>(repoApiBase())).default_branch
  const data = await requestGithub<GithubTreeResponse>(`${repoApiBase()}/git/trees/${branch}?recursive=1`)
  return data.tree
}

export async function fetchMybookFile(path: string): Promise<GithubContentResponse> {
  const ref = GITHUB_BRANCH ? `?ref=${encodeURIComponent(GITHUB_BRANCH)}` : ''
  const safePath = path.split('/').map(part => encodeURIComponent(part)).join('/')
  return requestGithub<GithubContentResponse>(`${repoApiBase()}/contents/${safePath}${ref}`)
}

export function decodeGithubContent(content = ''): string {
  const binary = atob(content.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}
