<template>
  <div class="app">
    <Sidebar
      :categories="state.categories"
      :tags="state.tags"
      :contentRatings="state.contentRatings"
      :selectedCategories="state.selectedCategories"
      :selectedTags="state.selectedTags"
      :selectedTypes="state.selectedTypes"
      :selectedContentRatings="state.selectedContentRatings"
      :rootDirName="state.rootDirName"
      :typeCounts="typeCounts"
      :collapsed="sidebarCollapsed"
      @select-category="handleSelectCategories"
      @select-type="handleSelectTypes"
      @select-tag="handleSelectTags"
      @select-content-rating="handleSelectContentRatings"
      @open-directory="openDirectory"
      @toggle="toggleSidebar"
    />

    <main class="main-content">
      <header class="top-bar">
        <button class="sidebar-toggle-btn" @click="toggleSidebar" :title="sidebarCollapsed ? '展开侧栏' : '收起侧栏'">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 3v18"/>
          </svg>
        </button>
        <div class="search-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            class="search-input"
            placeholder="搜索壁纸..."
            :value="state.searchQuery"
            @input="handleSearch(($event.target as HTMLInputElement).value)"
          />
          <button
            v-if="state.searchQuery"
            class="search-clear"
            @click="handleSearch('')"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <button class="filter-results-btn" @click="toggleSidebar">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          筛选结果
          <span class="result-count">{{ filteredAndSorted.length }}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="filter-arrow" :class="{ rotated: sidebarCollapsed }">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <div class="sort-wrapper" v-if="state.rootDirName" ref="sortDropdownRef">
          <button class="sort-btn" @click="showSortDropdown = !showSortDropdown">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M3 12h12M3 18h6"/>
            </svg>
            <span>{{ sortLabels[state.sortBy] }}</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="sort-arrow" :class="{ rotated: state.sortAsc }">
              <path d="M7 10l5 5 5-5"/>
            </svg>
          </button>
          <div class="sort-dropdown" v-if="showSortDropdown">
            <button
              v-for="(label, key) in sortLabels"
              :key="key"
              class="sort-option"
              :class="{ active: state.sortBy === key }"
              @click="setSort(key as SortKey)"
            >
              <svg v-if="state.sortBy === key" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--accent)" stroke-width="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <span v-else class="sort-check-empty"></span>
              {{ label }}
            </button>
          </div>
        </div>

        <button v-if="state.rootDirName && !state.loadingMore && state.loadedCount >= state.totalSubdirs" class="top-refresh-btn" @click="handleRefresh" title="检查新增和删除的壁纸">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
          </svg>
        </button>

        <div v-if="state.rootDirName && (state.loadingMore || state.loadedCount < state.totalSubdirs)" class="top-bar-loading">
          <svg class="loading-spinner" viewBox="0 0 20 20" width="13" height="13" fill="none">
            <circle cx="10" cy="10" r="8" stroke="var(--text-muted)" stroke-width="2" opacity="0.15"/>
            <circle cx="10" cy="10" r="8" stroke="var(--accent)" stroke-width="2" stroke-dasharray="35" stroke-linecap="round" class="spinner-arc"/>
          </svg>
          <span>{{ state.loadedCount }} / {{ state.totalSubdirs }}</span>
        </div>

      </header>

      <div class="content-area" v-if="state.rootDirName" ref="contentAreaRef">
        <div v-if="state.loading" class="loading-overlay">
          <div class="loading-spinner"></div>
          <p>正在扫描壁纸目录...</p>
        </div>

        <div v-else-if="state.error" class="error-message">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <p>{{ state.error }}</p>
        </div>

        <div v-else-if="filteredAndSorted.length === 0 && state.wallpapers.length > 0" class="empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <p>未找到匹配的壁纸</p>
        </div>

        <template v-else>
          <div class="wallpaper-grid">
            <WallpaperCard
              v-for="wallpaper in pagedWallpapers"
              :key="wallpaper.id"
              :wallpaper="wallpaper"
              :selected="selectedWallpaper?.id === wallpaper.id"
              @select="selectWallpaper"
              @preview="previewWallpaper"
              @contextmenu.prevent="onContextMenu($event, wallpaper)"
            />
          </div>

          <div class="pagination" v-if="state.wallpapers.length > 0">
            <template v-if="totalPages > 1">
            <button
              class="page-btn"
              :disabled="currentPage === 1"
              @click="goToPage(1)"
              title="首页"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>
            </button>
            <button
              class="page-btn"
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
              title="上一页"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <template v-for="page in visiblePages" :key="page">
              <span v-if="page === '...'" class="page-ellipsis">...</span>
              <button
                v-else
                class="page-btn page-num"
                :class="{ active: page === currentPage }"
                @click="goToPage(page as number)"
              >
                {{ page }}
              </button>
            </template>
            <button
              class="page-btn"
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
              title="下一页"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <button
              class="page-btn"
              :disabled="currentPage === totalPages"
              @click="goToPage(totalPages)"
              title="末页"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
            </button>
            </template>
            <div class="page-jumper" v-if="totalPages > 1">
              <span>前往</span>
              <input
                v-model.number="jumpInput"
                class="jump-input"
                type="number"
                :min="1"
                :max="totalPages"
                :placeholder="String(currentPage)"
                @keyup.enter="handleJump"
                @blur="handleJump"
              />
              <span>页</span>
            </div>
            <div class="page-size-selector">
              <span>每页</span>
              <select v-model.number="pageSize" @change="onPageSizeChange">
                <option :value="12">12</option>
                <option :value="24">24</option>
                <option :value="30">30</option>
                <option :value="48">48</option>
                <option :value="96">96</option>
              </select>
              <span>个</span>
            </div>
          </div>
        </template>
      </div>

      <div v-else class="welcome-state">
        <div class="welcome-icon">
          <svg viewBox="0 0 64 64" width="80" height="80" fill="none" stroke="var(--text-muted)" stroke-width="2">
            <rect x="6" y="10" width="52" height="38" rx="4"/>
            <path d="M6 38l14-14 10 10 8-8 20 20"/>
            <circle cx="22" cy="24" r="4"/>
          </svg>
        </div>
        <h2>Steam 壁纸浏览器</h2>
        <p>浏览和管理你从 Wallpaper Engine 创意工坊下载的本地壁纸</p>
        <button class="btn-primary" @click="openDirectory">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          选择 steamapps 目录
        </button>
        <p class="hint">请选择 Steam 库文件夹下的 steamapps 目录<br/>
        (例如 <code>H:\SteamLibrary\steamapps</code>)<br/><br/>
        程序会自动读取壁纸的年龄分级、评分等信息</p>
        <div v-if="state.error" class="error-message welcome-error">
          <p>{{ state.error }}</p>
        </div>
      </div>
    </main>

    <DetailPanel
      :wallpaper="selectedWallpaper"
      @copy-path="copyWallpaperPathFromDetail"
      @copy-name="copyWallpaperNameFromDetail"
      @preview-file="previewFile"
      @keep-toast="keepToast"
      @release-toast="releaseToast"
    />

    <PreviewModal
      :visible="previewVisible"
      :wallpaper="previewingWallpaper"
      :file="previewingFile"
      @close="previewVisible = false"
    />

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click="contextMenu.visible = false"
        @mouseenter="keepToast"
        @mouseleave="releaseToast"
      >
        <div class="context-menu-header">
          <span class="ctx-wallpaper-name">{{ contextMenu.wallpaper?.name }}</span>
          <span class="ctx-wallpaper-cat">{{ contextMenu.wallpaper?.category }}</span>
        </div>
        <div class="context-divider"></div>
        <button class="context-item" @click="copyWallpaperPath">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          <span>复制壁纸目录路径</span>
        </button>
        <button class="context-item" @click="copyWallpaperName">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7V4a2 2 0 012-2h8.5L20 7.5V20a2 2 0 01-2 2H6a2 2 0 01-2-2v-3"/>
            <path d="M14 2v6h6"/>
          </svg>
          <span>复制文件夹名称</span>
        </button>
        <button class="context-item" @click="openInWorkshop">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            <path d="M14 10V7a2 2 0 00-2-2H5"/>
          </svg>
          <span>在创意工坊打开</span>
        </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.visible" class="copy-toast">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useWallpaperStore, restoreSavedDirectory, forceRefresh, loadPageHandles } from './utils/wallpaperScanner'
import type { WallpaperItem, SortKey, WallpaperType } from './utils/wallpaperScanner'
import Sidebar from './components/Sidebar.vue'
import WallpaperCard from './components/WallpaperCard.vue'
import DetailPanel from './components/DetailPanel.vue'
import PreviewModal from './components/PreviewModal.vue'

const {
  state,
  openDirectory,
  setSelectedCategories,
  setSelectedTags,
  setSelectedTypes,
  setSelectedContentRatings,
  getTypeCounts,
  setSearch,
  filteredWallpapers,
  setSortBy,
  setSortAsc
} = useWallpaperStore()

const typeCounts = computed(() => getTypeCounts())

const selectedWallpaper = ref<WallpaperItem | null>(null)
const isMobile = ref(window.innerWidth <= 768)
const sidebarCollapsed = ref(isMobile.value)

const sortLabels: Record<string, string> = {
  'name': '名称',
  'date': '订阅日期',
  'category': '分类'
}
const showSortDropdown = ref(false)
const sortDropdownRef = ref<HTMLElement | null>(null)

function setSort(key: SortKey) {
  if (state.sortBy === key) {
    setSortAsc(!state.sortAsc)
  } else {
    setSortBy(key)
  }
  showSortDropdown.value = false
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function onResize() {
  isMobile.value = window.innerWidth <= 768
  if (isMobile.value) {
    sidebarCollapsed.value = true
  }
}

async function handleRefresh() {
  if (!state.rootDirName) return
  try {
    const result = await forceRefresh()
    if (result.added > 0 || result.removed > 0 || result.updated > 0) {
      showToast(`已同步：新增 ${result.added}，移除 ${result.removed}，更新 ${result.updated}`)
    } else {
      showToast('数据已是最新')
    }
  } catch {
    showToast('刷新失败')
  }
}

function onDocumentClick(e: MouseEvent) {
  if (sortDropdownRef.value && !sortDropdownRef.value.contains(e.target as Node)) {
    showSortDropdown.value = false
  }
  if (contextMenu.visible) {
    contextMenu.visible = false
  }
}

onMounted(async () => {
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('resize', onResize)
  const restored = await restoreSavedDirectory()
  if (!restored) {
    state.loading = false
  }
  await loadCurrentPageHandles()
})
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('resize', onResize)
})

const currentPage = ref(1)
const pageSize = ref(30)
const jumpInput = ref<number | null>(null)
const contentAreaRef = ref<HTMLElement | null>(null)

function resetPage() {
  currentPage.value = 1
}

function handleSelectCategories(cats: string[]) {
  setSelectedCategories(cats)
  resetPage()
  loadCurrentPageHandles()
}

function handleSelectTypes(types: (WallpaperType | 'all')[]) {
  setSelectedTypes(types)
  resetPage()
  loadCurrentPageHandles()
}

function handleSelectTags(tags: string[]) {
  setSelectedTags(tags)
  resetPage()
  loadCurrentPageHandles()
}

function handleSelectContentRatings(ratings: string[]) {
  setSelectedContentRatings(ratings)
  resetPage()
  loadCurrentPageHandles()
}

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

function handleSearch(query: string) {
  setSearch(query)
  resetPage()
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    loadCurrentPageHandles()
  }, 300)
}

const filteredAndSorted = computed(() => {
  return filteredWallpapers()
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAndSorted.value.length / pageSize.value)))

const pagedWallpapers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredAndSorted.value.slice(start, start + pageSize.value)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages: (number | string)[] = []

  if (total <= 11) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }

  const visibleCount = 11
  let start = Math.max(1, current - Math.floor(visibleCount / 2))
  let end = Math.min(total, start + visibleCount - 1)
  
  if (end - start + 1 < visibleCount) {
    start = Math.max(1, end - visibleCount + 1)
  }

  if (start > 1) {
    pages.push(1)
    if (start > 2) pages.push('...')
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (end < total) {
    if (end < total - 1) pages.push('...')
    pages.push(total)
  }

  return pages
})

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  jumpInput.value = null
  loadCurrentPageHandles()
}

function handleJump() {
  if (jumpInput.value == null) return
  const page = Math.round(jumpInput.value)
  if (page < 1 || page > totalPages.value) {
    jumpInput.value = null
    return
  }
  goToPage(page)
}

async function loadCurrentPageHandles() {
  const wallpapers = pagedWallpapers.value
  const folderNames = wallpapers.map(w => w.folderName)
  await loadPageHandles(folderNames)
}

function onPageSizeChange() {
  resetPage()
  loadCurrentPageHandles()
}

watch([() => state.sortBy, () => state.sortAsc], () => {
  resetPage()
  loadCurrentPageHandles()
})

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  wallpaper: null as WallpaperItem | null
})

function onContextMenu(e: MouseEvent, wallpaper: WallpaperItem) {
  e.preventDefault()
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.wallpaper = wallpaper

  requestAnimationFrame(() => {
    const menuEl = document.querySelector('.context-menu') as HTMLElement
    if (menuEl) {
      const rect = menuEl.getBoundingClientRect()
      if (rect.right > window.innerWidth) {
        contextMenu.x = e.clientX - rect.width
      }
      if (rect.bottom > window.innerHeight) {
        contextMenu.y = e.clientY - rect.height
      }
    }
  })
}

const toast = reactive({
  visible: false,
  message: '',
  timer: null as ReturnType<typeof setTimeout> | null,
  keep: false
})

function showToast(message: string) {
  if (toast.timer) clearTimeout(toast.timer)
  toast.message = message
  toast.visible = true
  toast.keep = false
  scheduleToastClose()
}

function scheduleToastClose() {
  if (toast.timer) clearTimeout(toast.timer)
  toast.timer = setTimeout(() => {
    if (!toast.keep) {
      toast.visible = false
    } else {
      scheduleToastClose()
    }
  }, 2000)
}

function keepToast() {
  toast.keep = true
}

function releaseToast() {
  toast.keep = false
  if (toast.visible) {
    scheduleToastClose()
  }
}

function selectWallpaper(wallpaper: WallpaperItem) {
  selectedWallpaper.value = wallpaper
}

const previewVisible = ref(false)
const previewingWallpaper = ref<WallpaperItem | null>(null)
const previewingFile = ref<FileSystemFileHandle | null>(null)

function previewWallpaper(wallpaper: WallpaperItem) {
  previewingWallpaper.value = wallpaper
  previewingFile.value = null
  previewVisible.value = true
}

function previewFile(file: FileSystemFileHandle) {
  if (selectedWallpaper.value) {
    previewingWallpaper.value = selectedWallpaper.value
    previewingFile.value = file
    previewVisible.value = true
  }
}

async function copyWallpaperPath() {
  if (!contextMenu.wallpaper?.folderHandle) {
    showToast('目录尚未加载，请稍后再试')
    return
  }
  const wp = contextMenu.wallpaper
  try {
    const handle = wp.folderHandle
    const path = await getFullPath(handle)
    await navigator.clipboard.writeText(path)
    showToast('壁纸目录路径已复制到剪贴板')
  } catch {
    showToast('复制失败，请手动复制')
  }
}

async function copyWallpaperName() {
  if (!contextMenu.wallpaper) return
  try {
    await navigator.clipboard.writeText(contextMenu.wallpaper.folderName)
    showToast('文件夹名称已复制到剪贴板')
  } catch {
    showToast('复制失败')
  }
}

async function copyWallpaperPathFromDetail() {
  if (!selectedWallpaper.value?.folderHandle) {
    showToast('目录尚未加载，请稍后再试')
    return
  }
  try {
    const handle = selectedWallpaper.value.folderHandle
    const path = await getFullPath(handle)
    await navigator.clipboard.writeText(path)
    showToast('壁纸目录路径已复制到剪贴板')
  } catch {
    showToast('复制失败')
  }
}

async function copyWallpaperNameFromDetail() {
  if (!selectedWallpaper.value) return
  try {
    await navigator.clipboard.writeText(selectedWallpaper.value.folderName)
    showToast('文件夹名称已复制到剪贴板')
  } catch {
    showToast('复制失败')
  }
}

async function getFullPath(handle: FileSystemDirectoryHandle): Promise<string> {
  return `steamapps\\workshop\\content\\431960\\${handle.name}`
}

function openInWorkshop() {
  if (!contextMenu.wallpaper) return
  const wp = contextMenu.wallpaper
  const workshopId = wp.workshopId || wp.folderName
  window.open(`https://steamcommunity.com/sharedfiles/filedetails/?id=${workshopId}`, '_blank')
}
</script>