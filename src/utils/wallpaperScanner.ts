import { reactive } from 'vue'

export interface WallpaperItem {
  id: string
  name: string
  folderName: string
  coverUrl: string
  category: string
  folderHandle: FileSystemDirectoryHandle
  files: { name: string; handle: FileSystemFileHandle }[]
  // Sorting metadata
  lastModified: number // last modified timestamp of the wallpaper folder
}

export interface CategoryInfo {
  name: string
  count: number
  icon: string
}

export type SortKey = 'name' | 'date' | 'category'

const state = reactive({
  wallpapers: [] as WallpaperItem[],
  categories: [] as CategoryInfo[],
  currentCategory: '全部',
  searchQuery: '',
  loading: false,
  rootDirName: '',
  error: '',
  sortBy: 'name' as SortKey,
  sortAsc: true
})

// Image extensions to detect covers
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg']
// Video extensions (for video wallpapers)
const VIDEO_EXTS = ['.mp4', '.mkv', '.webm']

// Map common folder patterns to categories
const CATEGORY_MAP: Record<string, string> = {
  'scene': '场景',
  'scenes': '场景',
  'nature': '自然',
  'animals': '动物',
  'anime': '动漫',
  'abstract': '抽象',
  'minimalist': '极简',
  'minimal': '极简',
  'space': '太空',
  'cyberpunk': '赛博朋克',
  'game': '游戏',
  'games': '游戏',
  'gaming': '游戏',
  'movie': '影视',
  'movies': '影视',
  'music': '音乐',
  'technology': '科技',
  'tech': '科技',
  'fantasy': '奇幻',
  'dark': '暗色',
  'light': '明亮',
  'city': '城市',
  'landscape': '风景',
  'mountain': '山脉',
  'ocean': '海洋',
  'forest': '森林',
  'fire': '火焰',
  'water': '水',
  'vehicle': '载具',
  'cars': '汽车',
  'building': '建筑',
  'pixel': '像素',
  'retro': '复古',
  'vintage': '复古',
  'live': '动态壁纸',
  'application': '应用程序',
  'app': '应用程序',
  'apps': '应用程序',
  'web': '网页',
  'clock': '时钟',
  'calendar': '日历',
  'weather': '天气',
  'interactive': '互动',
}

const CATEGORY_ICONS: Record<string, string> = {
  '全部': '🗂️',
  '场景': '🌄',
  '自然': '🌿',
  '动物': '🐾',
  '动漫': '🎨',
  '抽象': '🌀',
  '极简': '◻️',
  '太空': '🚀',
  '赛博朋克': '🌆',
  '游戏': '🎮',
  '影视': '🎬',
  '科技': '💻',
  '奇幻': '🐉',
  '暗色': '🌑',
  '明亮': '☀️',
  '城市': '🏙️',
  '风景': '🏔️',
  '动态壁纸': '🎬',
  '应用程序': '📱',
  '网页': '🌐',
  '时钟': '🕐',
  '日历': '📅',
  '天气': '⛅',
  '互动': '👆',
  '其他': '📂',
}

function getCategory(folderName: string): string {
  const lower = folderName.toLowerCase()
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return cat
  }
  return '其他'
}

function getIcon(cat: string): string {
  return CATEGORY_ICONS[cat] || '📂'
}

function isImageFile(name: string): boolean {
  const lower = name.toLowerCase()
  return IMAGE_EXTS.some(ext => lower.endsWith(ext))
}

function isVideoFile(name: string): boolean {
  const lower = name.toLowerCase()
  return VIDEO_EXTS.some(ext => lower.endsWith(ext))
}

// Priority for cover image: cover.png/jpg > preview.png/jpg > thumbnail > folder.jpg > first image
function coverPriority(name: string): number {
  const lower = name.toLowerCase()
  if (lower === 'cover.png' || lower === 'cover.jpg' || lower === 'cover.jpeg') return 10
  if (lower === 'preview.png' || lower === 'preview.jpg' || lower === 'preview.jpeg') return 9
  if (lower === 'thumbnail.png' || lower === 'thumbnail.jpg') return 8
  if (lower === 'folder.png' || lower === 'folder.jpg') return 7
  if (lower.includes('poster')) return 6
  if (lower.includes('screenshot')) return 5
  if (lower.includes('banner')) return 4
  if (isImageFile(name)) return 1
  return 0
}

let scanCounter = 0

// Try to get last modified time from project.json or file entries
async function getFolderModifiedTime(dirHandle: FileSystemDirectoryHandle): Promise<number> {
  let latestTime = 0

  // First, try to read project.json which Wallpaper Engine uses
  try {
    const projectFile = await (dirHandle as any).getFileHandle('project.json')
    const file = await projectFile.getFile()
    const text = await file.text()
    const data = JSON.parse(text)
    // Wallpaper Engine project.json may have "timeAdded" or "lastModified" or subscription timestamp
    if (data.timeAdded) return data.timeAdded
    if (data.lastModified) return data.lastModified
    if (data.updated) return data.updated
    if (data.subscription) return data.subscription
  } catch {
    // project.json not found or not parseable, fall through
  }

  // Fallback: get the most recent lastModified from files in the directory
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file') {
      try {
        const file = await (handle as FileSystemFileHandle).getFile()
        if (file.lastModified > latestTime) {
          latestTime = file.lastModified
        }
      } catch {
        // Skip inaccessible files
      }
    }
  }

  return latestTime
}

async function scanDirectory(dirHandle: FileSystemDirectoryHandle): Promise<WallpaperItem[]> {
  const wallpapers: WallpaperItem[] = []
  const subdirs: { name: string; handle: FileSystemDirectoryHandle }[] = []
  scanCounter = 0

  // First pass: collect all subdirectories
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory') {
      subdirs.push({ name, handle })
    }
  }

  // Process each subdirectory as a potential wallpaper
  for (const subdir of subdirs) {
    const wallpaper = await scanWallpaperDir(subdir.name, subdir.handle)
    if (wallpaper) {
      wallpapers.push(wallpaper)
    }
  }

  // Also check if root has images (single wallpaper case)
  const rootWallpaper = await scanWallpaperDir(dirHandle.name, dirHandle, true)
  if (rootWallpaper && subdirs.length === 0) {
    wallpapers.push(rootWallpaper)
  }

  return wallpapers
}

async function scanWallpaperDir(
  folderName: string,
  dirHandle: FileSystemDirectoryHandle,
  isRoot = false
): Promise<WallpaperItem | null> {
  const files: { name: string; handle: FileSystemFileHandle; priority: number }[] = []
  let hasMedia = false

  // Collect all files in the directory (non-recursive for now)
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file') {
      const isImage = isImageFile(name)
      const isVideo = isVideoFile(name)
      if (isImage || isVideo) {
        hasMedia = true
        files.push({
          name,
          handle: handle as FileSystemFileHandle,
          priority: isImage ? coverPriority(name) : 0
        })
      }
    }
  }

  // If no media files found, check subdirectories one level deeper for covers
  if (!hasMedia && !isRoot) {
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'directory') {
        const subDirHandle = handle as FileSystemDirectoryHandle
        for await (const [subName, subHandle] of subDirHandle.entries()) {
          if (subHandle.kind === 'file' && isImageFile(subName)) {
            hasMedia = true
            files.push({
              name: subName,
              handle: subHandle as FileSystemFileHandle,
              priority: coverPriority(subName)
            })
            break
          }
        }
        if (hasMedia) break
      }
    }
  }

  if (!hasMedia) return null

  // Sort by priority descending
  files.sort((a, b) => b.priority - a.priority)

  const coverFile = files[0]
  const coverUrl = URL.createObjectURL(await coverFile.handle.getFile())

  const category = getCategory(folderName)
  const lastModified = await getFolderModifiedTime(dirHandle)

  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: formatWallpaperName(folderName),
    folderName,
    coverUrl,
    category,
    folderHandle: dirHandle,
    files: files.map(f => ({ name: f.name, handle: f.handle })),
    lastModified
  }
}

function formatWallpaperName(folderName: string): string {
  let name = folderName
    .replace(/^[\d\[\]\(\)\-_\.]+\s*/, '')
    .replace(/[_-]/g, ' ')
    .trim()
  return name || folderName
}

function buildCategories(wallpapers: WallpaperItem[]): CategoryInfo[] {
  const catMap = new Map<string, number>()
  for (const wp of wallpapers) {
    catMap.set(wp.category, (catMap.get(wp.category) || 0) + 1)
  }

  const cats: CategoryInfo[] = [{ name: '全部', count: wallpapers.length, icon: getIcon('全部') }]
  for (const [name, count] of catMap.entries()) {
    cats.push({ name, count, icon: getIcon(name) })
  }

  return cats
}

export function useWallpaperStore() {
  async function openDirectory() {
    state.error = ''
    state.loading = true

    try {
      if (!('showDirectoryPicker' in window)) {
        state.error = '你的浏览器不支持 File System Access API。请使用 Chrome / Edge 86+ 或 Opera 72+。'
        state.loading = false
        return
      }

      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read'
      })

      state.rootDirName = dirHandle.name
      state.wallpapers = await scanDirectory(dirHandle)
      state.categories = buildCategories(state.wallpapers)
      state.currentCategory = '全部'
      state.searchQuery = ''
      state.sortBy = 'date'
      state.sortAsc = false // Most recent first by default
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        state.error = `读取目录失败: ${err.message}`
      }
    } finally {
      state.loading = false
    }
  }

  function setCategory(cat: string) {
    state.currentCategory = cat
  }

  function setSearch(query: string) {
    state.searchQuery = query
  }

  function setSortBy(key: SortKey) {
    state.sortBy = key
  }

  function setSortAsc(asc: boolean) {
    state.sortAsc = asc
  }

  const filteredWallpapers = () => {
    let result = state.wallpapers

    if (state.currentCategory !== '全部') {
      result = result.filter(wp => wp.category === state.currentCategory)
    }

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase()
      result = result.filter(wp =>
        wp.name.toLowerCase().includes(q) ||
        wp.folderName.toLowerCase().includes(q) ||
        wp.category.toLowerCase().includes(q)
      )
    }

    // Sort
    const sorted = [...result]
    const asc = state.sortAsc ? 1 : -1

    switch (state.sortBy) {
      case 'name':
        // ASCII sort: compare character by character, first char same → second, etc.
        sorted.sort((a, b) => {
          const na = a.folderName
          const nb = b.folderName
          if (na < nb) return -asc
          if (na > nb) return asc
          return 0
        })
        break
      case 'date':
        sorted.sort((a, b) => asc * (a.lastModified - b.lastModified))
        break
      case 'category':
        sorted.sort((a, b) => asc * a.category.localeCompare(b.category, 'zh-CN'))
        break
    }

    return sorted
  }

  return {
    state,
    openDirectory,
    setCategory,
    setSearch,
    setSortBy,
    setSortAsc,
    filteredWallpapers
  }
}
