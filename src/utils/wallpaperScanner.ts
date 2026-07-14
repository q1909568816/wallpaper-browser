import { reactive } from 'vue'
import { getCachedWallpaper, cacheWallpapers, getCachedWallpapers, cacheDirectoryHandles, getCachedDirectoryHandles, deleteCachedWallpaper, deleteCachedDirectoryHandle, cacheSingleWallpaper, cacheSingleDirectoryHandle, setSetting, getSetting, deleteThumbnail } from './cache'

interface FilterState {
  selectedCategories: string[]
  selectedTags: string[]
  selectedTypes: (WallpaperType | 'all')[]
  selectedContentRatings: string[]
  searchQuery: string
  sortBy: SortKey
  sortAsc: boolean
}
import {
  type WorkshopMetadata,
  getAllWorkshopMetadata,
  loadAndCacheWorkshopCacheJson,
  translateContentRating
} from './workshopMetadata'

export type WallpaperType = 'scene' | 'video' | 'web' | 'application'

export interface WallpaperItem {
  id: string
  name: string
  folderName: string
  coverUrl: string
  coverFileHandle?: FileSystemFileHandle
  category: string
  type: WallpaperType
  folderHandle?: FileSystemDirectoryHandle
  files: { name: string; handle?: FileSystemFileHandle; type?: string }[]
  lastModified: number
  tags: string[]
  description: string
  workshopId: string
  previewFile: string
  mainFile: string
  schemeColor: string
  contentRating: string
  visibility: string
  rating?: number
  ratingRounded?: number
  fileSize?: number
  fileSizeLabel?: string
  favorite?: boolean
  subscriptionDate?: number
  updateDate?: number
  youtube?: string
  authorSteamId?: string
  allowMobileUpload?: boolean
  official?: boolean
}

export interface ProjectJson {
  title?: string
  type?: string
  file?: string
  preview?: string
  tags?: string[]
  description?: string
  workshopid?: number | string
  contentrating?: string
  visibility?: string
  general?: {
    properties?: {
      schemecolor?: {
        value?: string
      }
    }
  }
  monetization?: boolean
  version?: number
  workshopurl?: string
}

export const TYPE_LIST: { key: WallpaperType | 'all'; name: string; icon: string }[] = [
  { key: 'all', name: '全部', icon: '🗂️' },
  { key: 'scene', name: '场景', icon: '🌄' },
  { key: 'video', name: '视频', icon: '🎬' },
  { key: 'web', name: '网页', icon: '🌐' },
  { key: 'application', name: '应用', icon: '📱' },
]

export interface CategoryInfo {
  name: string
  count: number
  icon: string
}

export type SortKey = 'name' | 'date' | 'category'

const PAGE_SIZE = 30

const coverUrlCache = new Map<string, string>()

const state = reactive({
  wallpapers: [] as WallpaperItem[],
  categories: [] as CategoryInfo[],
  tags: [] as { name: string; count: number }[],
  contentRatings: [] as { name: string; count: number }[],
  selectedCategories: ['全部'] as string[],
  selectedTags: [] as string[],
  selectedTypes: ['all'] as (WallpaperType | 'all')[],
  selectedContentRatings: ['大众级', '家长指导级', '限制级'] as string[],
  searchQuery: '',
  loading: false,
  loadingMore: false,
  rootDirName: '',
  error: '',
  sortBy: 'date' as SortKey,
  sortAsc: false,
  totalSubdirs: 0,
  loadedCount: 0,
  currentPage: 1,
  protocolAvailable: false
})

let allSubdirs: { name: string; handle?: FileSystemDirectoryHandle; lastModified: number }[] = []
let backgroundLoader: number | null = null
let loadedDirNames = new Set<string>()
let workshopContentHandle: FileSystemDirectoryHandle | null = null
let workshopCache: Map<string, WorkshopMetadata> | null = null
let steamappsDirHandle: FileSystemDirectoryHandle | null = null

async function saveFilterState() {
  const filterState: FilterState = {
    selectedCategories: [...state.selectedCategories],
    selectedTags: [...state.selectedTags],
    selectedTypes: [...state.selectedTypes],
    selectedContentRatings: [...state.selectedContentRatings],
    searchQuery: state.searchQuery,
    sortBy: state.sortBy,
    sortAsc: state.sortAsc
  }
  await setSetting('filterState', filterState)
}

async function loadFilterState() {
  const saved = await getSetting<FilterState>('filterState')
  if (saved) {
    const validCategoryNames = new Set(state.categories.map(c => c.name))
    state.selectedCategories = saved.selectedCategories?.filter(c => validCategoryNames.has(c)) || ['全部']
    if (state.selectedCategories.length === 0) {
      state.selectedCategories = ['全部']
    }
    const validTagNames = new Set(state.tags.map(t => t.name))
    state.selectedTags = saved.selectedTags?.filter(t => validTagNames.has(t)) || []
    const validTypeNames = new Set<(WallpaperType | 'all')>(['all', 'scene', 'video', 'web', 'application'])
    state.selectedTypes = saved.selectedTypes?.filter(t => validTypeNames.has(t)) || ['all']
    if (state.selectedTypes.length === 0) {
      state.selectedTypes = ['all']
    }
    const validRatings = new Set(state.contentRatings.map(r => r.name))
    state.selectedContentRatings = saved.selectedContentRatings?.filter(r => validRatings.has(r)) || []
    if (state.selectedContentRatings.length === 0) {
      state.selectedContentRatings = ['大众级', '家长指导级', '限制级']
    }
    state.searchQuery = saved.searchQuery || ''
    state.sortBy = saved.sortBy || 'date'
    state.sortAsc = saved.sortAsc ?? false
  }
}

async function loadWorkshopMetadata(dirHandle: FileSystemDirectoryHandle): Promise<void> {
  workshopContentHandle = null
  steamappsDirHandle = null

  // 查找 workshop/content/431960 目录
  try {
    const workshopDir = await dirHandle.getDirectoryHandle('workshop')
    const contentDir = await workshopDir.getDirectoryHandle('content')
    workshopContentHandle = await contentDir.getDirectoryHandle('431960')
  } catch { /* ignore */ }

  // 兜底：用户直接选中壁纸容器目录（如 431960 或自定义的 B 目录）
  // 通过检查是否有 project.json 区分"容器目录"和"单个壁纸目录"
  if (!workshopContentHandle) {
    let hasProjectJson = false
    try {
      await dirHandle.getFileHandle('project.json')
      hasProjectJson = true
    } catch { /* 没有 project.json */ }
    // 只有容器目录（无 project.json）才设为 workshopContentHandle
    // 单个壁纸目录（有 project.json）保持 null，让 root fallback 生效
    if (!hasProjectJson) {
      workshopContentHandle = dirHandle
    }
  }

  // 查找 workshopcache.json 并缓存到 IndexedDB
  try {
    const commonDir = await dirHandle.getDirectoryHandle('common')
    const wallpaperEngineDir = await commonDir.getDirectoryHandle('wallpaper_engine')
    const binDir = await wallpaperEngineDir.getDirectoryHandle('bin')
    const cacheFile = await binDir.getFileHandle('workshopcache.json')

    await loadAndCacheWorkshopCacheJson(cacheFile)
  } catch { /* ignore */ }

  // 如果成功找到 workshop 内容目录，记录 steamapps 句柄用于空闲刷新
  if (workshopContentHandle) {
    steamappsDirHandle = dirHandle
  }

  // 检测协议标记文件，判断自定义协议是否已安装
  await detectProtocolMarker(dirHandle)

  // 从 IndexedDB 加载缓存数据
  workshopCache = await getAllWorkshopMetadata()
}

async function detectProtocolMarker(dirHandle: FileSystemDirectoryHandle): Promise<void> {
  const MARKER = '.wpb-protocol'
  const candidates: (FileSystemDirectoryHandle | null)[] = [dirHandle, workshopContentHandle]
  for (const handle of candidates) {
    if (!handle) continue
    try {
      await handle.getFileHandle(MARKER)
      state.protocolAvailable = true
      return
    } catch { /* not found in this handle */ }
  }
  state.protocolAvailable = false
}

function applyWorkshopMetadata(wallpaper: WallpaperItem): void {
  if (!workshopCache || workshopCache.size === 0) return

  const matchKey = getWorkshopMatchKey(wallpaper)
  const meta = matchKey ? workshopCache.get(matchKey) : null

  if (meta) {
    wallpaper.contentRating = translateContentRating(meta.contentRating)
    wallpaper.rating = meta.rating
    wallpaper.ratingRounded = meta.ratingRounded
    wallpaper.fileSize = meta.fileSize
    wallpaper.fileSizeLabel = meta.fileSizeLabel
    wallpaper.favorite = meta.favorite
    wallpaper.subscriptionDate = meta.subscriptionDate
    wallpaper.updateDate = meta.updateDate
    wallpaper.youtube = meta.youtube
    wallpaper.authorSteamId = meta.authorSteamId
    wallpaper.allowMobileUpload = meta.allowMobileUpload
    wallpaper.official = meta.official
    if (meta.tags && meta.tags.length > 0) {
      wallpaper.tags = meta.tags
    }
  }
}

function getWorkshopMatchKey(wallpaper: WallpaperItem): string | null {
  if (wallpaper.workshopId && workshopCache?.has(wallpaper.workshopId)) return wallpaper.workshopId
  if (workshopCache?.has(wallpaper.folderName)) return wallpaper.folderName

  const idNum = Number(wallpaper.folderName)
  if (!isNaN(idNum) && workshopCache?.has(String(idNum))) return String(idNum)

  return null
}

function applyBulkWorkshopMetadata(): void {
  if (!workshopCache || workshopCache.size === 0) return

  for (const wp of state.wallpapers) {
    applyWorkshopMetadata(wp)
  }
}

// Image extensions to detect covers
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg']
// Video extensions (for video wallpapers)
const VIDEO_EXTS = ['.mp4', '.mkv', '.webm', '.avi', '.mov']

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

function isWebFile(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith('.html') || lower.endsWith('.htm') || lower === 'index.html'
}

function isApplicationFile(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith('.exe') || lower.endsWith('.pkg')
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

function createFallbackWallpaper(folderName: string, dirHandle: FileSystemDirectoryHandle): WallpaperItem {
  const workshopMeta = workshopCache?.get(folderName)
  return {
    id: `wp-${folderName}`,
    name: workshopMeta?.title || folderName,
    folderName,
    coverUrl: getCoverUrl(folderName) || '',
    category: getCategory(folderName),
    type: (workshopMeta?.type || 'scene') as WallpaperType,
    folderHandle: dirHandle,
    files: [],
    lastModified: 0,
    tags: workshopMeta?.tags || [],
    description: '',
    workshopId: folderName,
    previewFile: '',
    mainFile: '',
    schemeColor: '',
    contentRating: workshopMeta ? translateContentRating(workshopMeta.contentRating) : '大众级',
    visibility: '',
    rating: workshopMeta?.rating,
    ratingRounded: workshopMeta?.ratingRounded,
    fileSize: workshopMeta?.fileSize,
    fileSizeLabel: workshopMeta?.fileSizeLabel,
    favorite: workshopMeta?.favorite,
    subscriptionDate: workshopMeta?.subscriptionDate,
    updateDate: workshopMeta?.updateDate,
    youtube: workshopMeta?.youtube,
    authorSteamId: workshopMeta?.authorSteamId,
    allowMobileUpload: workshopMeta?.allowMobileUpload,
    official: workshopMeta?.official
  }
}

function sortSubdirsByWorkshopDate(): void {
  if (!workshopCache || workshopCache.size === 0) {
    allSubdirs.sort((a, b) => b.name.localeCompare(a.name))
    return
  }

  for (const subdir of allSubdirs) {
    const meta = workshopCache.get(subdir.name)
    if (meta) {
      subdir.lastModified = meta.subscriptionDate || meta.updateDate || 0
    }
  }

  allSubdirs.sort((a, b) => b.lastModified - a.lastModified)
}

async function scanDirectory(dirHandle: FileSystemDirectoryHandle, allowRootFallback = true): Promise<void> {
  const scanned = new Map<string, WallpaperItem>()
  allSubdirs = []
  loadedDirNames.clear()

  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory') {
      allSubdirs.push({ name, handle, lastModified: 0 })
    }
  }

  state.totalSubdirs = allSubdirs.length

  sortSubdirsByWorkshopDate()

  state.loadedCount = 0
  state.wallpapers = []

  const firstPage = allSubdirs.slice(0, PAGE_SIZE)
  for (const subdir of firstPage) {
    if (!subdir.handle) continue
    try {
        const wallpaper = await scanWallpaperDir(subdir.name, subdir.handle)
        if (wallpaper) {
          scanned.set(wallpaper.folderName, wallpaper)
          state.wallpapers.push(wallpaper)
          loadedDirNames.add(subdir.name)
          saveSingleWallpaperCache(wallpaper)
        } else {
          const fallback = createFallbackWallpaper(subdir.name, subdir.handle)
          scanned.set(fallback.folderName, fallback)
          state.wallpapers.push(fallback)
          loadedDirNames.add(subdir.name)
          saveSingleWallpaperCache(fallback)
        }
      } catch {
        const fallback = createFallbackWallpaper(subdir.name, subdir.handle)
        scanned.set(fallback.folderName, fallback)
        state.wallpapers.push(fallback)
        loadedDirNames.add(subdir.name)
        saveSingleWallpaperCache(fallback)
      } finally {
        state.loadedCount = state.wallpapers.length
        // 第一页有壁纸加载后尽早结束 loading，让用户能看到已加载的内容
        if (state.loading && state.wallpapers.length > 0) {
          state.loading = false
        }
      }
  }

  scheduleBackgroundLoad(scanned)

  if (allowRootFallback && allSubdirs.length === 0) {
    const rootWallpaper = await scanWallpaperDir(dirHandle.name, dirHandle)
    if (rootWallpaper) {
      if (!scanned.has(rootWallpaper.folderName)) {
        scanned.set(rootWallpaper.folderName, rootWallpaper)
        state.wallpapers.push(rootWallpaper)
        loadedDirNames.add(rootWallpaper.folderName)
        state.loadedCount = state.wallpapers.length
      }
    }
  }
}

function scheduleBackgroundLoad(scanned: Map<string, WallpaperItem>) {
  if (backgroundLoader) {
    clearTimeout(backgroundLoader)
    backgroundLoader = null
  }

  let currentIndex = PAGE_SIZE

  const loadNextBatch = async () => {
    if (currentIndex >= allSubdirs.length) {
      backgroundLoader = null
      state.loadingMore = false
      saveWallpaperCache()
      return
    }

    state.loadingMore = true
    const batchSize = 10
    const endIndex = Math.min(currentIndex + batchSize, allSubdirs.length)

    for (let i = currentIndex; i < endIndex; i++) {
      const subdir = allSubdirs[i]
      if (!subdir.handle || loadedDirNames.has(subdir.name) || scanned.has(subdir.name)) {
        continue
      }
      try {
         const wallpaper = await scanWallpaperDir(subdir.name, subdir.handle)
         if (wallpaper) {
           applyWorkshopMetadata(wallpaper)
           scanned.set(wallpaper.folderName, wallpaper)
           state.wallpapers.push(wallpaper)
           loadedDirNames.add(subdir.name)
           saveSingleWallpaperCache(wallpaper)
         } else {
           const fallback = createFallbackWallpaper(subdir.name, subdir.handle)
           applyWorkshopMetadata(fallback)
           scanned.set(fallback.folderName, fallback)
           state.wallpapers.push(fallback)
           loadedDirNames.add(subdir.name)
           saveSingleWallpaperCache(fallback)
         }
       } catch {
         const fallback = createFallbackWallpaper(subdir.name, subdir.handle)
         applyWorkshopMetadata(fallback)
         scanned.set(fallback.folderName, fallback)
         state.wallpapers.push(fallback)
         loadedDirNames.add(subdir.name)
         saveSingleWallpaperCache(fallback)
       } finally {
         state.loadedCount = state.wallpapers.length
       }
    }

    currentIndex = endIndex
    updateCategoriesAndTags()

    backgroundLoader = window.setTimeout(loadNextBatch, 50)
  }

  backgroundLoader = window.setTimeout(loadNextBatch, 50)
}

function updateCategoriesAndTags() {
  state.categories = buildCategories(state.wallpapers)
  state.tags = buildTags(state.wallpapers)
  state.contentRatings = buildContentRatings(state.wallpapers)
  const tagNames = state.tags.map(t => t.name)
  if (state.selectedTags.length === 0) {
    state.selectedTags = tagNames
  } else {
    for (const name of tagNames) {
      if (!state.selectedTags.includes(name)) {
        state.selectedTags.push(name)
      }
    }
  }
}

let cacheSaveScheduled = false
let isSyncing = false

const pendingSingleSaves = new Set<string>()
function saveSingleWallpaperCache(wallpaper: WallpaperItem): void {
  if (pendingSingleSaves.has(wallpaper.folderName)) return
  pendingSingleSaves.add(wallpaper.folderName)
  cacheSingleWallpaper(wallpaper)
    .then(() => {
      if (wallpaper.folderHandle) {
        return cacheSingleDirectoryHandle(wallpaper.folderName, wallpaper.folderHandle)
      }
    })
    .catch(() => { /* ignore */ })
    .finally(() => {
      pendingSingleSaves.delete(wallpaper.folderName)
    })
}

function saveWallpaperCache(): void {
  if (cacheSaveScheduled) return
  cacheSaveScheduled = true
  queueMicrotask(async () => {
    try {
      await cacheWallpapers(state.wallpapers)
      const handleMap = new Map<string, FileSystemDirectoryHandle>()
      for (const wp of state.wallpapers) {
        if (wp.folderHandle) {
          handleMap.set(wp.folderName, wp.folderHandle)
        }
      }
      for (const subdir of allSubdirs) {
        if (subdir.handle && typeof (subdir.handle as any).getDirectoryHandle === 'function') {
          handleMap.set(subdir.name, subdir.handle)
        }
      }
      await cacheDirectoryHandles(handleMap)
    } catch { /* ignore */ }
    cacheSaveScheduled = false

    if (!isSyncing && workshopContentHandle && state.wallpapers.length === allSubdirs.length && allSubdirs.length > 0) {
      const hasRealHandles = allSubdirs.some(s => s.handle && typeof (s.handle as any).getDirectoryHandle === 'function')
      if (hasRealHandles) {
        isSyncing = true
        try {
          await doIncrementalSync(workshopContentHandle)
        } finally {
          isSyncing = false
        }
      }
    }
  })
}

async function scanWallpaperDir(
  folderName: string,
  dirHandle: FileSystemDirectoryHandle,
  forceRefresh = false
): Promise<WallpaperItem | null> {
  let files: { name: string; handle?: FileSystemFileHandle; type?: string }[] = []
  let hasVideo = false
  let hasWeb = false
  let hasApp = false
  let projectJson: ProjectJson | null = null
  let allFiles: { name: string; handle?: FileSystemFileHandle; type?: string }[] = []

  const cached = forceRefresh ? null : await getCachedWallpaper(folderName)

  if (!cached) {
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file') {
        const fileHandle = handle as FileSystemFileHandle
        allFiles.push({ name, handle: fileHandle })

        if (name.toLowerCase() === 'project.json') {
          try {
            const file = await fileHandle.getFile()
            const text = await file.text()
            projectJson = JSON.parse(text)
          } catch {
            projectJson = null
          }
        }
      }
    }
  } else {
    for (const fileName of cached.fileNames) {
      try {
        const handle = await dirHandle.getFileHandle(fileName)
        allFiles.push({ name: fileName, handle })
      } catch {
        allFiles.push({ name: fileName, handle: undefined })
      }
    }
    if (cached.coverFileName && !cached.fileNames.includes(cached.coverFileName)) {
      try {
        const handle = await dirHandle.getFileHandle(cached.coverFileName)
        allFiles.push({ name: cached.coverFileName, handle })
      } catch {
      }
    }
  }

  for (const f of allFiles) {
    const isImage = isImageFile(f.name)
    const isVideo = isVideoFile(f.name)
    if (isImage || isVideo) {
      if (isVideo) hasVideo = true
      files.push({
        name: f.name,
        handle: f.handle
      })
    }
    if (isWebFile(f.name)) hasWeb = true
    if (isApplicationFile(f.name)) hasApp = true
  }

  const workshopMeta = workshopCache?.get(folderName)

  if (projectJson?.preview) {
    const previewLower = projectJson.preview.toLowerCase()
    const previewFile = files.find(f => f.name.toLowerCase() === previewLower)
    if (previewFile) {
      files = [previewFile, ...files.filter(f => f.name.toLowerCase() !== previewLower)]
    }
  }

  files.sort((a, b) => {
    const aIsImage = isImageFile(a.name)
    const bIsImage = isImageFile(b.name)
    if (aIsImage && !bIsImage) return -1
    if (!aIsImage && bIsImage) return 1
    return 0
  })

  const coverFile = files[0]
  const coverFileHandle = coverFile?.handle
  let coverUrl = getCoverUrl(folderName) || ''

  const type = normalizeWallpaperType(projectJson?.type || workshopMeta?.type || cached?.type, hasVideo, hasWeb, hasApp)
  const category = getCategoryFromProject(projectJson) || cached?.category || getCategory(folderName)
  const lastModified = forceRefresh ? await getFolderModifiedTime(dirHandle) : (cached ? cached.lastModified : await getFolderModifiedTime(dirHandle))
  const name = projectJson?.title || workshopMeta?.title || cached?.name || formatWallpaperName(folderName)
  const tags = projectJson?.tags || workshopMeta?.tags || cached?.tags || []
  const description = projectJson?.description || cached?.description || ''
  const workshopId = projectJson?.workshopid ? String(projectJson.workshopid) : cached?.workshopId || folderName
  const previewFile = projectJson?.preview || cached?.previewFile || ''
  const mainFile = projectJson?.file || cached?.mainFile || ''
  const schemeColor = projectJson?.general?.properties?.schemecolor?.value || cached?.schemeColor || ''
  const contentRating = projectJson?.contentrating || cached?.contentRating || ''
  const visibility = projectJson?.visibility || cached?.visibility || ''

  return {
    id: `wp-${folderName}`,
    name,
    folderName,
    coverUrl,
    category,
    type,
    folderHandle: dirHandle,
    files: allFiles,
    lastModified,
    tags,
    description,
    workshopId,
    previewFile,
    mainFile,
    schemeColor,
    contentRating,
    visibility,
    coverFileHandle
  }
}

function normalizeWallpaperType(typeStr: string | undefined, hasVideo: boolean, hasWeb = false, hasApp = false): WallpaperType {
  if (typeStr) {
    const t = typeStr.toLowerCase()
    if (t === 'scene') return 'scene'
    if (t === 'video') return 'video'
    if (t === 'web') return 'web'
    if (t === 'application' || t === 'app') return 'application'
  }
  if (hasApp) return 'application'
  if (hasWeb) return 'web'
  if (hasVideo) return 'video'
  return 'scene'
}

function getCategoryFromProject(project: ProjectJson | null): string {
  if (!project?.tags || project.tags.length === 0) return ''
  const tagMap: Record<string, string> = {
    'landscape': '风景',
    'nature': '自然',
    'anime': '动漫',
    'abstract': '抽象',
    'space': '太空',
    'cyberpunk': '赛博朋克',
    'game': '游戏',
    'games': '游戏',
    'gaming': '游戏',
    'movie': '影视',
    'movies': '影视',
    'music': '音乐',
    'fantasy': '奇幻',
    'animal': '动物',
    'animals': '动物',
    'city': '城市',
    'mountain': '山脉',
    'ocean': '海洋',
    'forest': '森林',
    'vehicle': '载具',
    'cars': '汽车',
    'pixel': '像素',
    'retro': '复古',
    'vintage': '复古',
    'dark': '暗色',
    'light': '明亮',
    'technology': '科技',
    'tech': '科技',
  }
  for (const tag of project.tags) {
    const lower = tag.toLowerCase()
    if (tagMap[lower]) return tagMap[lower]
  }
  return project.tags[0]
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

function buildTags(wallpapers: WallpaperItem[]): { name: string; count: number }[] {
  const tagMap = new Map<string, number>()
  for (const wp of wallpapers) {
    for (const tag of wp.tags) {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
    }
  }
  const tags: { name: string; count: number }[] = []
  for (const [name, count] of tagMap.entries()) {
    tags.push({ name, count })
  }
  tags.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  return tags
}

function buildContentRatings(wallpapers: WallpaperItem[]): { name: string; count: number }[] {
  const ratingMap: Record<string, number> = {
    '大众级': 0,
    '家长指导级': 0,
    '限制级': 0
  }
  for (const wp of wallpapers) {
    const rating = wp.contentRating || '大众级'
    if (rating in ratingMap) {
      ratingMap[rating]++
    } else {
      ratingMap['大众级']++
    }
  }
  return [
    { name: '大众级', count: ratingMap['大众级'] },
    { name: '家长指导级', count: ratingMap['家长指导级'] },
    { name: '限制级', count: ratingMap['限制级'] }
  ]
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    await setSetting('steamappsDir', handle)
  } catch { /* ignore */ }
}

async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return (await getSetting<FileSystemDirectoryHandle | null>('steamappsDir', null)) || null
  } catch {
    return null
  }
}

async function scanDirectoryFromHandle(dirHandle: FileSystemDirectoryHandle): Promise<void> {
  state.error = ''

  if (backgroundLoader) {
    clearTimeout(backgroundLoader)
    backgroundLoader = null
  }

  state.loading = true

  try {
    await loadWorkshopMetadata(dirHandle)

    let scanHandle = dirHandle
    let allowRootFallback = true
    if (workshopContentHandle) {
      scanHandle = workshopContentHandle
      allowRootFallback = false
    }

    state.rootDirName = dirHandle.name
    await scanDirectory(scanHandle, allowRootFallback)

    // 现在匹配并应用 workshop metadata
    applyBulkWorkshopMetadata()

    state.categories = buildCategories(state.wallpapers)
    state.tags = buildTags(state.wallpapers)
    state.contentRatings = buildContentRatings(state.wallpapers)
    await loadFilterState()
    state.currentPage = 1
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      state.error = `读取目录失败: ${err.message}`
    }
  } finally {
    state.loading = false
  }
}

export async function restoreSavedDirectory(): Promise<boolean> {
  if (!('showDirectoryPicker' in window)) return false

  try {
    const savedHandle = await getSavedDirectoryHandle()
    if (!savedHandle) return false

    const permission = await (savedHandle as any).queryPermission({ mode: 'read' })
    if (permission !== 'granted' && permission !== 'prompt') return false

    if (permission === 'prompt') {
      const newPermission = await (savedHandle as any).requestPermission({ mode: 'read' })
      if (newPermission !== 'granted') return false
    }

    // 不再前置检查 workshop/431960：loadWorkshopMetadata 会兜底处理任意壁纸容器目录
    const restored = await restoreFromCache(savedHandle)
    if (restored) {
      return true
    }

    await scanDirectoryFromHandle(savedHandle)
    return true
  } catch {
    await resetState()
    return false
  }
}

async function resetState(): Promise<void> {
  state.wallpapers = []
  state.categories = []
  state.tags = []
  state.contentRatings = []
  state.rootDirName = ''
  state.loading = false
  state.loadingMore = false
  state.totalSubdirs = 0
  state.loadedCount = 0
  state.currentPage = 1
  coverUrlCache.clear()
  allSubdirs = []
  loadedDirNames.clear()
  workshopContentHandle = null
  workshopCache = null
}

async function restoreFromCache(dirHandle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    const cachedList = await getCachedWallpapers()
    if (!cachedList || cachedList.length === 0) return false

    await loadWorkshopMetadata(dirHandle)

    const contentHandle = workshopContentHandle || dirHandle

    const diskNames = new Set<string>()
    const diskHandleMap = new Map<string, FileSystemDirectoryHandle>()
    try {
      for await (const [name, handle] of contentHandle.entries()) {
        if (handle.kind === 'directory') {
          diskNames.add(name)
          diskHandleMap.set(name, handle as FileSystemDirectoryHandle)
        }
      }
    } catch {
      return false
    }

    const staleNames: string[] = []
    const restored: WallpaperItem[] = []
    for (const c of cachedList) {
      if (!diskNames.has(c.folderName)) {
        staleNames.push(c.folderName)
        continue
      }
      restored.push({
        ...c,
        id: `wp-${c.folderName}`,
        type: c.type as WallpaperType,
        folderHandle: undefined,
        files: c.fileNames.map(name => ({ name, handle: undefined })),
        coverUrl: getCoverUrl(c.folderName) || '',
        coverFileHandle: undefined,
        description: c.description || ''
      })
    }

    for (const name of staleNames) {
      await deleteCachedWallpaper(name)
      await deleteCachedDirectoryHandle(name)
      clearCoverUrl(name)
    }

    restored.sort((a, b) => b.lastModified - a.lastModified)

    if (restored.length === 0 && staleNames.length === 0) return false

    state.wallpapers = restored
    state.totalSubdirs = diskNames.size
    state.loadedCount = restored.length
    state.rootDirName = dirHandle.name
    state.categories = buildCategories(state.wallpapers)
    state.tags = buildTags(state.wallpapers)
    state.contentRatings = buildContentRatings(state.wallpapers)

    await loadFilterState()

    state.currentPage = 1
    state.loading = false
    state.loadingMore = false

    allSubdirs = []
    for (const name of diskNames) {
      const handle = diskHandleMap.get(name)
      const wp = restored.find(w => w.folderName === name)
      allSubdirs.push({
        name,
        handle: handle || ({} as FileSystemDirectoryHandle),
        lastModified: wp?.lastModified || 0
      })
    }
    sortSubdirsByWorkshopDate()
    loadedDirNames = new Set(restored.map(wp => wp.folderName))

    const hasMissing = Array.from(diskNames).some(n => !restored.some(w => w.folderName === n))
    if (hasMissing) {
      void continueIncrementalScan()
    } else {
      updateCategoriesAndTags()
    }

    return true
  } catch {
    return false
  }
}

async function continueIncrementalScan(): Promise<void> {
  if (!workshopContentHandle) return

  if (backgroundLoader) {
    clearTimeout(backgroundLoader)
    backgroundLoader = null
  }

  // 枚举磁盘上的实际目录
  const diskNames = new Set<string>()
  const diskHandleMap = new Map<string, FileSystemDirectoryHandle>()
  try {
    for await (const [name, handle] of workshopContentHandle.entries()) {
      if (handle.kind === 'directory') {
        diskNames.add(name)
        diskHandleMap.set(name, handle as FileSystemDirectoryHandle)
      }
    }
  } catch {
    return
  }

  // 已缓存的目录名
  const cachedNames = new Set(state.wallpapers.map(w => w.folderName))

  // 删除缓存中有但磁盘没有的
  const deletedNames: string[] = []
  for (const name of cachedNames) {
    if (!diskNames.has(name)) deletedNames.push(name)
  }
  if (deletedNames.length > 0) {
    state.wallpapers = state.wallpapers.filter(w => !deletedNames.includes(w.folderName))
    for (const name of deletedNames) {
      await deleteCachedWallpaper(name)
      await deleteCachedDirectoryHandle(name)
      clearCoverUrl(name)
    }
  }

  // 重建 allSubdirs（用真实 handle）
  allSubdirs = []
  for (const name of diskNames) {
    const handle = diskHandleMap.get(name)
    const wp = state.wallpapers.find(w => w.folderName === name)
    allSubdirs.push({
      name,
      handle: handle || ({} as FileSystemDirectoryHandle),
      lastModified: wp?.lastModified || 0
    })
  }
  sortSubdirsByWorkshopDate()

  state.totalSubdirs = diskNames.size
  state.loadedCount = state.wallpapers.length

  // 已缓存的视为已加载，不重复扫描
  loadedDirNames = new Set(cachedNames)

  // 检查是否有缺失的目录需要扫描
  const hasMissing = Array.from(diskNames).some(n => !cachedNames.has(n))
  if (!hasMissing) {
    updateCategoriesAndTags()
    return
  }

  // 后台扫描缺失的目录
  state.loadingMore = true
  const scanned = new Map<string, WallpaperItem>()
  for (const wp of state.wallpapers) {
    scanned.set(wp.folderName, wp)
  }

  let currentIndex = 0
  const loadNextBatch = async () => {
    if (currentIndex >= allSubdirs.length) {
      backgroundLoader = null
      state.loadingMore = false
      saveWallpaperCache()
      return
    }

    const batchSize = 10
    const endIndex = Math.min(currentIndex + batchSize, allSubdirs.length)

    for (let i = currentIndex; i < endIndex; i++) {
      const subdir = allSubdirs[i]
      if (!subdir.handle || loadedDirNames.has(subdir.name) || scanned.has(subdir.name)) {
        continue
      }
      try {
        const wallpaper = await scanWallpaperDir(subdir.name, subdir.handle)
        if (wallpaper) {
          applyWorkshopMetadata(wallpaper)
          scanned.set(wallpaper.folderName, wallpaper)
          state.wallpapers.push(wallpaper)
          loadedDirNames.add(subdir.name)
          saveSingleWallpaperCache(wallpaper)
        } else {
          const fallback = createFallbackWallpaper(subdir.name, subdir.handle)
          applyWorkshopMetadata(fallback)
          scanned.set(fallback.folderName, fallback)
          state.wallpapers.push(fallback)
          loadedDirNames.add(subdir.name)
          saveSingleWallpaperCache(fallback)
        }
      } catch {
        const fallback = createFallbackWallpaper(subdir.name, subdir.handle)
        applyWorkshopMetadata(fallback)
        scanned.set(fallback.folderName, fallback)
        state.wallpapers.push(fallback)
        loadedDirNames.add(subdir.name)
        saveSingleWallpaperCache(fallback)
      } finally {
        state.loadedCount = state.wallpapers.length
      }
    }

    currentIndex = endIndex
    updateCategoriesAndTags()

    backgroundLoader = window.setTimeout(loadNextBatch, 50)
  }

  backgroundLoader = window.setTimeout(loadNextBatch, 50)
}

let loadingPageHandles = false
let pendingPageNames: string[] | null = null

export async function loadPageHandles(folderNames: string[]): Promise<void> {
  if (!workshopContentHandle) return

  if (loadingPageHandles) {
    pendingPageNames = folderNames
    return
  }

  loadingPageHandles = true
  try {
    let currentNames = folderNames
    while (currentNames.length > 0) {
      pendingPageNames = null

      for (const folderName of currentNames) {
        const wallpaper = state.wallpapers.find(w => w.folderName === folderName)
        if (!wallpaper || wallpaper.folderHandle) continue

        try {
          const subdirHandle = await workshopContentHandle.getDirectoryHandle(folderName)
          wallpaper.folderHandle = subdirHandle

          const subdirEntry = allSubdirs.find(s => s.name === folderName)
          if (subdirEntry) {
            subdirEntry.handle = subdirHandle
          } else {
            allSubdirs.push({ name: folderName, handle: subdirHandle, lastModified: wallpaper.lastModified })
          }
          loadedDirNames.add(folderName)

          const files: { name: string; handle?: FileSystemFileHandle; type?: string }[] = []
          for await (const [name, handle] of subdirHandle.entries()) {
            if (handle.kind === 'file') {
              files.push({ name, handle: handle as FileSystemFileHandle })
            }
          }
          wallpaper.files = files

          const coverFileName = wallpaper.previewFile || ''
          const coverFile = files.find(f => f.name.toLowerCase() === coverFileName.toLowerCase()) ||
            files.find(f => isImageFile(f.name)) ||
            files.find(f => isVideoFile(f.name))
          wallpaper.coverFileHandle = coverFile?.handle
        } catch {
        }
      }

      if (pendingPageNames) {
        currentNames = pendingPageNames
      } else {
        break
      }
    }
  } finally {
    loadingPageHandles = false
    pendingPageNames = null
  }
}

let idleRefreshScheduled = false

async function doIncrementalSync(dirHandle: FileSystemDirectoryHandle): Promise<{ added: number; removed: number; updated: number }> {
  if (isSyncing) return { added: 0, removed: 0, updated: 0 }
  isSyncing = true
  try {
  const { handleMap } = await getCachedDirectoryHandles()
  const diskNames = new Set<string>()
  const diskHandleMap = new Map<string, FileSystemDirectoryHandle>()

  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory') {
      diskNames.add(name)
      const dirHandle = handle as FileSystemDirectoryHandle
      diskHandleMap.set(name, dirHandle)
      handleMap.set(name, dirHandle)
    }
  }

  for (const name of Array.from(handleMap.keys())) {
    if (!diskNames.has(name)) {
      handleMap.delete(name)
    }
  }
  await cacheDirectoryHandles(handleMap)

  const loadedSet = new Set(state.wallpapers.map(w => w.folderName))

  const newNames: string[] = []
  for (const name of diskNames) {
    if (!loadedSet.has(name)) newNames.push(name)
  }

  const deletedNames: string[] = []
  for (const name of loadedSet) {
    if (!diskNames.has(name)) deletedNames.push(name)
  }

  const updatedNames: string[] = []
  for (const name of diskNames) {
    if (!loadedSet.has(name)) continue
    const wallpaper = state.wallpapers.find(w => w.folderName === name)
    if (!wallpaper) continue
    const folderHandle = wallpaper.folderHandle || diskHandleMap.get(name)
    if (!folderHandle) continue
    try {
      const newModified = await getFolderModifiedTime(folderHandle)
      if (newModified > wallpaper.lastModified) {
        updatedNames.push(name)
      }
    } catch {
    }
  }

  if (deletedNames.length > 0) {
    state.wallpapers = state.wallpapers.filter(w => !deletedNames.includes(w.folderName))
    for (const name of deletedNames) {
      await deleteCachedWallpaper(name)
      await deleteCachedDirectoryHandle(name)
      loadedDirNames.delete(name)
      clearCoverUrl(name)
    }
  }

  if (newNames.length > 0) {
    for (const name of newNames) {
      const handle = diskHandleMap.get(name)
      if (!handle) continue
      try {
        const wallpaper = await scanWallpaperDir(name, handle)
        if (wallpaper) {
          applyWorkshopMetadata(wallpaper)
          state.wallpapers.push(wallpaper)
          loadedDirNames.add(name)
        } else {
          const fallback = createFallbackWallpaper(name, handle)
          applyWorkshopMetadata(fallback)
          state.wallpapers.push(fallback)
          loadedDirNames.add(name)
        }
      } catch {
        const fallback = createFallbackWallpaper(name, handle)
        applyWorkshopMetadata(fallback)
        state.wallpapers.push(fallback)
        loadedDirNames.add(name)
      }
    }
  }

  if (updatedNames.length > 0) {
    for (const name of updatedNames) {
      const wallpaper = state.wallpapers.find(w => w.folderName === name)
      if (!wallpaper) continue
      const folderHandle = wallpaper.folderHandle || diskHandleMap.get(name)
      if (!folderHandle) continue
      try {
        const oldCoverUrl = wallpaper.coverUrl
        const updated = await scanWallpaperDir(name, folderHandle, true)
        if (updated) {
          updated.coverUrl = oldCoverUrl
          applyWorkshopMetadata(updated)
          const index = state.wallpapers.findIndex(w => w.folderName === name)
          if (index !== -1) state.wallpapers[index] = updated
          if (folderHandle) loadedDirNames.add(name)
        }
      } catch {
      }
    }
  }

  state.totalSubdirs = diskNames.size
  state.loadedCount = state.wallpapers.length

  allSubdirs = []
  for (const name of diskNames) {
    const handle = diskHandleMap.get(name) || handleMap.get(name)
    const wp = state.wallpapers.find(w => w.folderName === name)
    allSubdirs.push({
      name,
      handle: handle || ({} as FileSystemDirectoryHandle),
      lastModified: wp?.lastModified || 0
    })
  }
  sortSubdirsByWorkshopDate()

  state.wallpapers.sort((a, b) => b.lastModified - a.lastModified)

  updateCategoriesAndTags()

  if (deletedNames.length > 0 || newNames.length > 0 || updatedNames.length > 0) {
    saveWallpaperCache()
  }

  return { added: newNames.length, removed: deletedNames.length, updated: updatedNames.length }
  } finally {
    isSyncing = false
  }
}

function scheduleIdleRefresh(): void {
  if (idleRefreshScheduled) return
  if (!steamappsDirHandle) return

  idleRefreshScheduled = true

  const doRefresh = async () => {
    idleRefreshScheduled = false
    try { await refreshWorkshopCache() } catch { /* ignore */ }
  }

  if ('requestIdleCallback' in window) {
    ;(window as any).requestIdleCallback(doRefresh, { timeout: 30000 })
  } else {
    setTimeout(doRefresh, 10000)
  }
}

export async function forceRefresh(): Promise<{ added: number; removed: number; updated: number }> {
  if (!steamappsDirHandle) return { added: 0, removed: 0, updated: 0 }

  try { await refreshWorkshopCache() } catch { /* ignore */ }

  let contentDir = steamappsDirHandle
  if (workshopContentHandle) contentDir = workshopContentHandle
  return doIncrementalSync(contentDir!)
}

async function refreshWorkshopCache(): Promise<void> {
  if (!steamappsDirHandle) return

  try {
    const commonDir = await steamappsDirHandle.getDirectoryHandle('common')
    const wallpaperEngineDir = await commonDir.getDirectoryHandle('wallpaper_engine')
    const binDir = await wallpaperEngineDir.getDirectoryHandle('bin')
    const cacheFile = await binDir.getFileHandle('workshopcache.json')

    await loadAndCacheWorkshopCacheJson(cacheFile)
    workshopCache = await getAllWorkshopMetadata()

    // 更新现有壁纸数据
    for (const wp of state.wallpapers) {
      applyWorkshopMetadata(wp)
    }

    // 更新分类和标签
    state.contentRatings = buildContentRatings(state.wallpapers)
    state.tags = buildTags(state.wallpapers)
  } catch { /* ignore */ }
}

export function setCoverUrl(folderName: string, url: string): void {
  const oldUrl = coverUrlCache.get(folderName)
  if (oldUrl && oldUrl !== url) {
    URL.revokeObjectURL(oldUrl)
  }
  coverUrlCache.set(folderName, url)
}

export function clearCoverUrl(folderName: string): void {
  const url = coverUrlCache.get(folderName)
  if (url) {
    URL.revokeObjectURL(url)
    coverUrlCache.delete(folderName)
  }
}

export function getCoverUrl(folderName: string): string | undefined {
  return coverUrlCache.get(folderName)
}

export async function purgeWallpaper(folderName: string, deleteFromDisk = false): Promise<void> {
  if (deleteFromDisk && workshopContentHandle) {
    try {
      await workshopContentHandle.removeEntry(folderName, { recursive: true })
    } catch { /* 目录已不存在或已被 move 移走，忽略 */ }
  }
  state.wallpapers = state.wallpapers.filter(w => w.folderName !== folderName)
  loadedDirNames.delete(folderName)
  const idx = allSubdirs.findIndex(s => s.name === folderName)
  if (idx !== -1) allSubdirs.splice(idx, 1)
  state.totalSubdirs = allSubdirs.length
  state.loadedCount = state.wallpapers.length
  clearCoverUrl(folderName)
  await deleteCachedWallpaper(folderName)
  await deleteCachedDirectoryHandle(folderName)
  await deleteThumbnail(folderName)
  state.categories = buildCategories(state.wallpapers)
  state.tags = buildTags(state.wallpapers)
  state.contentRatings = buildContentRatings(state.wallpapers)
}

export function useWallpaperStore() {
  async function openDirectory(providedHandle?: FileSystemDirectoryHandle) {
    state.error = ''

    if (backgroundLoader) {
      clearTimeout(backgroundLoader)
      backgroundLoader = null
    }

    state.loading = true

    try {
      if (!('showDirectoryPicker' in window)) {
        state.error = '你的浏览器不支持 File System Access API。请使用 Chrome / Edge 86+ 或 Opera 72+。'
        state.loading = false
        return
      }

      let dirHandle: FileSystemDirectoryHandle
      if (providedHandle && 'getDirectoryHandle' in providedHandle) {
        dirHandle = providedHandle
      } else {
        dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' })
        await saveDirectoryHandle(dirHandle)
      }

      await scanDirectoryFromHandle(dirHandle)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        state.error = `读取目录失败: ${err.message}`
      }
    } finally {
      state.loading = false
    }
  }

  function setSelectedContentRatings(ratings: string[]) {
    state.selectedContentRatings = ratings
    saveFilterState()
  }

  function setSelectedCategories(cats: string[]) {
    state.selectedCategories = cats
    saveFilterState()
  }

  function setSelectedTags(tags: string[]) {
    state.selectedTags = tags
    saveFilterState()
  }

  function setSelectedTypes(types: (WallpaperType | 'all')[]) {
    state.selectedTypes = types
    saveFilterState()
  }

  function getTypeCounts(): Record<WallpaperType | 'all', number> {
    const counts: Record<string, number> = {
      all: state.wallpapers.length,
      scene: 0,
      video: 0,
      web: 0,
      application: 0
    }
    for (const wp of state.wallpapers) {
      counts[wp.type] = (counts[wp.type] || 0) + 1
    }
    return counts as Record<WallpaperType | 'all', number>
  }

  function setSearch(query: string) {
    state.searchQuery = query
    saveFilterState()
  }

  function setSortBy(key: SortKey) {
    state.sortBy = key
    saveFilterState()
  }

  function setSortAsc(asc: boolean) {
    state.sortAsc = asc
    saveFilterState()
  }

  const filteredWallpapers = () => {
    let result = state.wallpapers

    if (!state.selectedTypes.includes('all') && state.selectedTypes.length > 0) {
      result = result.filter(wp => state.selectedTypes.includes(wp.type))
    }

    if (!state.selectedCategories.includes('全部') && state.selectedCategories.length > 0) {
      result = result.filter(wp => state.selectedCategories.includes(wp.category))
    }

    if (state.selectedTags.length > 0 && state.selectedTags.length !== state.tags.length) {
      result = result.filter(wp =>
        wp.tags.length === 0 || wp.tags.some(tag => state.selectedTags.includes(tag))
      )
    }

    if (state.selectedContentRatings.length > 0 && state.selectedContentRatings.length < 3) {
      const ratingTranslation: Record<string, string> = {
        '大众级': '大众级',
        '家长指导级': '家长指导级',
        '限制级': '限制级',
        'everyone': '大众级',
        'e': '大众级',
        'g': '大众级',
        'teen': '家长指导级',
        't': '家长指导级',
        'pg-13': '家长指导级',
        'questionable': '家长指导级',
        'mature': '限制级',
        'm': '限制级',
        'r-18': '限制级',
        'ao': '限制级',
        'adults only': '限制级'
      }
      result = result.filter(wp => {
        const lower = wp.contentRating.toLowerCase()
        const rating = ratingTranslation[lower] || '大众级'
        return state.selectedContentRatings.includes(rating)
      })
    }

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase()
      result = result.filter(wp =>
        wp.name.toLowerCase().includes(q) ||
        wp.folderName.toLowerCase().includes(q) ||
        wp.category.toLowerCase().includes(q) ||
        wp.tags.some(tag => tag.toLowerCase().includes(q)) ||
        wp.description.toLowerCase().includes(q)
      )
    }

    const sorted = [...result]
    const asc = state.sortAsc ? 1 : -1

    switch (state.sortBy) {
      case 'name':
        sorted.sort((a, b) => {
          const na = a.name
          const nb = b.name
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
    setSelectedCategories,
    setSelectedTags,
    setSelectedTypes,
    setSelectedContentRatings,
    getTypeCounts,
    setSearch,
    setSortBy,
    setSortAsc,
    filteredWallpapers
  }
}
