<template>
  <div class="app">
    <!-- Sidebar -->
    <Sidebar
      :categories="state.categories"
      :currentCategory="state.currentCategory"
      :rootDirName="state.rootDirName"
      :wallpaperCount="state.wallpapers.length"
      @select-category="setCategory"
      @open-directory="openDirectory"
    />

    <!-- Main content -->
    <main class="main-content">
      <!-- Top bar with search + sort -->
      <header class="top-bar">
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
            @input="setSearch(($event.target as HTMLInputElement).value)"
          />
          <button
            v-if="state.searchQuery"
            class="search-clear"
            @click="setSearch('')"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Sort dropdown -->
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

        <div class="top-bar-info" v-if="state.rootDirName">
          <span class="result-count">
            {{ filteredAndSorted().length }} / {{ state.wallpapers.length }} 个壁纸
          </span>
        </div>
      </header>

      <!-- Content area -->
      <div class="content-area" v-if="state.rootDirName" ref="contentAreaRef">
        <!-- Loading -->
        <div v-if="state.loading" class="loading-overlay">
          <div class="loading-spinner"></div>
          <p>正在扫描壁纸目录...</p>
        </div>

        <!-- Error -->
        <div v-else-if="state.error" class="error-message">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <p>{{ state.error }}</p>
        </div>

        <!-- Empty result -->
        <div v-else-if="filteredAndSorted().length === 0 && state.wallpapers.length > 0" class="empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <p>未找到匹配的壁纸</p>
        </div>

        <!-- Wallpaper grid with pagination -->
        <template v-else>
          <div class="wallpaper-grid">
            <WallpaperCard
              v-for="wallpaper in pagedWallpapers"
              :key="wallpaper.id"
              :wallpaper="wallpaper"
              @contextmenu.prevent="onContextMenu($event, wallpaper)"
            />
          </div>

          <!-- Pagination -->
          <div class="pagination" v-if="totalPages > 1">
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
            <div class="page-size-selector">
              <span>每页</span>
              <select v-model.number="pageSize" @change="onPageSizeChange">
                <option :value="12">12</option>
                <option :value="24">24</option>
                <option :value="48">48</option>
                <option :value="96">96</option>
              </select>
              <span>个</span>
            </div>
          </div>
        </template>
      </div>

      <!-- Welcome state -->
      <div v-else class="welcome-state">
        <div class="welcome-icon">
          <svg viewBox="0 0 64 64" width="80" height="80" fill="none" stroke="#6c7a96" stroke-width="2">
            <rect x="6" y="10" width="52" height="38" rx="4"/>
            <path d="M6 38l14-14 10 10 8-8 20 20"/>
            <circle cx="22" cy="24" r="4"/>
          </svg>
        </div>
        <h2>本地壁纸浏览器</h2>
        <p>浏览和管理你从 Wallpaper Engine 创意工坊下载的本地壁纸</p>
        <button class="btn-primary" @click="openDirectory">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          选择壁纸资源目录
        </button>
        <p class="hint">选择 Wallpaper Engine 的创意工坊壁纸存储目录<br/>
        (通常是 <code>steamapps/workshop/content/431960</code>)</p>
      </div>
    </main>

    <!-- Right-click context menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click="contextMenu.visible = false"
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
        <div class="context-divider"></div>
        <button class="context-item" @click="openPreviewFromMenu">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>预览壁纸</span>
        </button>
      </div>
    </Teleport>

    <!-- Copy success toast -->
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

    <!-- Preview modal -->
    <PreviewModal
      v-if="previewWallpaper"
      :wallpaper="previewWallpaper"
      @close="previewWallpaper = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useWallpaperStore } from './utils/wallpaperScanner'
import type { WallpaperItem, SortKey } from './utils/wallpaperScanner'
import Sidebar from './components/Sidebar.vue'
import WallpaperCard from './components/WallpaperCard.vue'
import PreviewModal from './components/PreviewModal.vue'

const { state, openDirectory, setCategory, setSearch, filteredWallpapers, setSortBy, setSortAsc } = useWallpaperStore()

const previewWallpaper = ref<WallpaperItem | null>(null)

// Expose for child components
import { provide } from 'vue'
provide('previewWallpaper', previewWallpaper)
provide('setPreview', (wp: WallpaperItem | null) => {
  previewWallpaper.value = wp
})

// Sort
const sortLabels: Record<string, string> = {
  'name': '名称排序',
  'date': '最近下载',
  'category': '分类排序'
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

// Close sort dropdown on outside click
function onDocumentClick(e: MouseEvent) {
  if (sortDropdownRef.value && !sortDropdownRef.value.contains(e.target as Node)) {
    showSortDropdown.value = false
  }
  if (contextMenu.value.visible) {
    contextMenu.value.visible = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

// Pagination
const currentPage = ref(1)
const pageSize = ref(24)
const contentAreaRef = ref<HTMLElement | null>(null)

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

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }

  pages.push(1)
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)

  return pages
})

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  contentAreaRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

function onPageSizeChange() {
  currentPage.value = 1
}

// Reset page when filters change
watch([() => state.searchQuery, () => state.currentCategory, () => state.sortBy, () => state.sortAsc], () => {
  currentPage.value = 1
})

// Right-click context menu
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

  // Adjust position to keep menu in viewport
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

// Toast notifications
const toast = reactive({
  visible: false,
  message: '',
  timer: null as ReturnType<typeof setTimeout> | null
})

function showToast(message: string) {
  if (toast.timer) clearTimeout(toast.timer)
  toast.message = message
  toast.visible = true
  toast.timer = setTimeout(() => { toast.visible = false }, 2000)
}

async function copyWallpaperPath() {
  if (!contextMenu.wallpaper) return
  const wp = contextMenu.wallpaper
  try {
    // Try to get the full path via the directory handle
    // File System Access API doesn't expose full paths directly,
    // so we construct it from the root dir name + folder name
    const path = `${state.rootDirName}\\${wp.folderName}`
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

function openPreviewFromMenu() {
  if (!contextMenu.wallpaper) return
  previewWallpaper.value = contextMenu.wallpaper
  contextMenu.visible = false
}
</script>
