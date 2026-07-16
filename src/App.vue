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
      @show-help="showHelp"
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

          <div v-if="selectedWallpapers.size > 0" class="batch-actions">
            <button v-if="pagedWallpapers.some(wp => !selectedWallpapers.has(wp.id))" class="batch-btn" @click="selectAll">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              <span>全选</span>
            </button>
            <button class="batch-btn" @click="clearSelection">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              <span>取消全选</span>
            </button>
            <div class="batch-divider"></div>
            <button class="batch-btn batch-btn-primary" @click="initiateBatchCopy">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              <span>复制 ({{ selectedWallpapers.size }})</span>
            </button>
            <button class="batch-btn batch-btn-primary" @click="initiateBatchMove">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
              </svg>
              <span>移动 ({{ selectedWallpapers.size }})</span>
            </button>
          </div>

        </header>

      <div v-if="state.rootDirName && !state.protocolAvailable" class="protocol-banner">
        <svg class="protocol-banner-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v13M6 9l6 6 6-6M4 20h16"/>
        </svg>
        <div class="protocol-banner-text">
          <strong>启用一键操作</strong>
          <span>下载并运行协议助手后，即可直接「设为壁纸」「加入播放列表」「打开目录」</span>
        </div>
        <a class="protocol-banner-btn" :href="protocolZipUrl" download>下载协议助手</a>
      </div>

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

        <div v-else-if="filteredAndSorted.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <p>{{ state.wallpapers.length === 0 ? '当前目录暂无壁纸' : '未找到匹配的壁纸' }}</p>
        </div>

        <template v-else>
          <div class="wallpaper-grid">
            <WallpaperCard
              v-for="wallpaper in pagedWallpapers"
              :key="wallpaper.id"
              :wallpaper="wallpaper"
              :selected="selectedWallpaper?.id === wallpaper.id"
              :batch-selected="selectedWallpapers.has(wallpaper.id)"
              @select="selectWallpaper"
              @preview="previewWallpaper"
              @batch-toggle="handleBatchToggle"
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
      :protocol-available="state.protocolAvailable"
      @copy-path="copyWallpaperPathFromDetail"
      @copy-name="copyWallpaperNameFromDetail"
      @set-wallpaper="setWallpaperFromDetail"
      @add-to-playlist="addToPlaylistFromDetail"
      @open-folder="openFolderFromDetail"
      @open-in-workshop="openInWorkshopFromDetail"
      @open-author="openAuthorFromDetail"
      @preview-file="previewFile"
      @keep-toast="keepToast"
      @release-toast="releaseToast"
      @show-toast="showToast"
      @copy-wallpaper="copyWallpaperFromDetail"
      @move-wallpaper="moveWallpaperFromDetail"
    />

    <PreviewModal
      :visible="previewVisible"
      :wallpaper="previewingWallpaper"
      :file="previewingFile"
      @close="previewVisible = false"
    />

    <CopyMoveDialog
      :visible="copyMoveState.visible"
      :mode="copyMoveState.mode"
      :wallpaper-name="copyMoveState.wallpaper?.folderName || ''"
      :target-dir-name="copyMoveState.targetDirName"
      :target-dir-handle="copyMoveState.targetDirHandle"
      :processing="copyMoveState.processing"
      :progress="copyMoveState.progress"
      @confirm="confirmCopyMove"
      @cancel="cancelCopyMove"
      @change-directory="changeCopyMoveDirectory"
    />

    <BatchCopyMoveDialog
      :visible="batchCopyMoveState.visible"
      :mode="batchCopyMoveState.mode"
      :wallpapers="batchCopyMoveState.wallpapers"
      :default-target-dir-name="batchCopyMoveState.targetDirName"
      :default-target-dir-handle="batchCopyMoveState.targetDirHandle"
      :processing="batchCopyMoveState.processing"
      :progress="batchCopyMoveState.progress"
      @confirm="confirmBatchCopyMove"
      @cancel="cancelBatchCopyMove"
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
        <button v-if="state.protocolAvailable" class="context-item" @click="setWallpaper">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>设置为壁纸</span>
        </button>
        <button v-if="state.protocolAvailable" class="context-item" @click="addToPlaylist">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>加入播放列表</span>
        </button>
        <button class="context-item" @click="openInWorkshop">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            <path d="M14 10V7a2 2 0 00-2-2H5"/>
          </svg>
          <span>在创意工坊打开</span>
        </button>
        <button v-if="contextMenu.wallpaper?.authorSteamId" class="context-item" @click="openAuthorFromContext">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span class="ctx-author-label">查看作者主页</span>
          <span class="ctx-author-name" :title="contextMenu.wallpaper?.authorName">{{ contextMenu.wallpaper?.authorName || '未知作者' }}</span>
        </button>
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
        <button v-if="state.protocolAvailable" class="context-item" @click="openFolder">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7a2 2 0 012-2h4l2 3h8a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
          <span>打开本地目录</span>
        </button>
        <button class="context-item" @click="copyWallpaperFromContext">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          <span>复制壁纸</span>
        </button>
        <button class="context-item" @click="moveWallpaperFromContext">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
          </svg>
          <span>移动壁纸</span>
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

    <HelpModal
      :visible="showHelpModal"
      @close="closeHelp"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useWallpaperStore, restoreSavedDirectory, forceRefresh, loadPageHandles, purgeWallpaper } from './utils/wallpaperScanner'
import type { WallpaperItem, SortKey, WallpaperType } from './utils/wallpaperScanner'
import Sidebar from './components/Sidebar.vue'
import WallpaperCard from './components/WallpaperCard.vue'
import DetailPanel from './components/DetailPanel.vue'
import PreviewModal from './components/PreviewModal.vue'
import CopyMoveDialog from './components/CopyMoveDialog.vue'
import BatchCopyMoveDialog from './components/BatchCopyMoveDialog.vue'
import HelpModal from './components/HelpModal.vue'

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
const selectedWallpapers = ref<Set<string>>(new Set())
const isMobile = ref(window.innerWidth <= 768)
const sidebarCollapsed = ref(isMobile.value)
const showHelpModal = ref(false)

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

function showHelp() {
  showHelpModal.value = true
}

function closeHelp() {
  showHelpModal.value = false
  localStorage.setItem('wpb-has-seen-help', 'true')
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
  
  const hasSeenHelp = localStorage.getItem('wpb-has-seen-help')
  if (!hasSeenHelp) {
    setTimeout(() => {
      showHelpModal.value = true
    }, 1500)
  }
})
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('resize', onResize)
})

const currentPage = ref(1)
const pageSize = ref(30)
const jumpInput = ref<number | null>(null)
const contentAreaRef = ref<HTMLElement | null>(null)
const protocolZipUrl = import.meta.env.BASE_URL + 'wallpaper-browser-protocol.zip'

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

watch(totalPages, (total) => {
  if (currentPage.value > total) {
    currentPage.value = total
    loadCurrentPageHandles()
  }
})

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  wallpaper: null as WallpaperItem | null
})

function handleBatchToggle(wallpaper: WallpaperItem) {
  if (selectedWallpapers.value.has(wallpaper.id)) {
    selectedWallpapers.value.delete(wallpaper.id)
  } else {
    selectedWallpapers.value.add(wallpaper.id)
  }
}

function selectAll() {
  for (const wp of filteredAndSorted.value) {
    selectedWallpapers.value.add(wp.id)
  }
}

function clearSelection() {
  selectedWallpapers.value.clear()
}

const batchCopyMoveState = reactive({
  visible: false,
  mode: 'copy' as 'copy' | 'move',
  wallpapers: [] as WallpaperItem[],
  targetDirHandle: null as FileSystemDirectoryHandle | null,
  targetDirName: '',
  processing: false,
  progress: { current: 0, total: 0 }
})

async function initiateBatchCopy() {
  await initiateBatchOperation('copy')
}

async function initiateBatchMove() {
  await initiateBatchOperation('move')
}

async function initiateBatchOperation(mode: 'copy' | 'move') {
  const wps: WallpaperItem[] = []
  for (const id of selectedWallpapers.value) {
    const wp = state.wallpapers.find(w => w.id === id)
    if (wp) wps.push(wp)
  }
  if (wps.length === 0) return

  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    batchCopyMoveState.targetDirHandle = handle
    batchCopyMoveState.targetDirName = handle.name
    batchCopyMoveState.mode = mode
    batchCopyMoveState.wallpapers = wps
    batchCopyMoveState.visible = true
  } catch {
    showToast('未选择目录')
  }
}

function cancelBatchCopyMove() {
  batchCopyMoveState.visible = false
}

async function confirmBatchCopyMove(items: { wallpaper: WallpaperItem; dirName: string; conflictMode: 'replace' | 'merge'; targetDirHandle: FileSystemDirectoryHandle }[]) {
  batchCopyMoveState.processing = true
  batchCopyMoveState.progress = { current: 0, total: items.length }

  try {
    for (const item of items) {
      const { wallpaper, dirName, conflictMode, targetDirHandle } = item

      if (!wallpaper.folderHandle) {
        await loadPageHandles([wallpaper.folderName])
        const wp = state.wallpapers.find(w => w.folderName === wallpaper.folderName)
        if (wp?.folderHandle) {
          wallpaper.folderHandle = wp.folderHandle
        }
      }

      if (!wallpaper.folderHandle) {
        throw new Error(`无法获取 "${wallpaper.name}" 的目录句柄`)
      }

      if (batchCopyMoveState.mode === 'move') {
        if (conflictMode === 'replace') {
          try {
            await targetDirHandle.removeEntry(dirName, { recursive: true })
          } catch {}
        }
        const moved = await tryMoveDirectory(wallpaper.folderHandle, targetDirHandle, dirName)
        if (moved) {
          await purgeWallpaper(wallpaper.folderName, true)
          batchCopyMoveState.progress.current++
          continue
        }
      }

      let newDir: FileSystemDirectoryHandle

      if (conflictMode === 'replace') {
        try {
          await targetDirHandle.removeEntry(dirName, { recursive: true })
        } catch {}
        newDir = await targetDirHandle.getDirectoryHandle(dirName, { create: true })
      } else {
        newDir = await targetDirHandle.getDirectoryHandle(dirName, { create: true })
      }

      const counter = { current: 0 }
      await copyDirectoryRecursive(wallpaper.folderHandle, newDir, counter)

      if (batchCopyMoveState.mode === 'move') {
        await purgeWallpaper(wallpaper.folderName, true)
      }

      batchCopyMoveState.progress.current++
    }

    selectedWallpapers.value.clear()
    selectedWallpaper.value = null
    await loadCurrentPageHandles()
    showToast(batchCopyMoveState.mode === 'copy' ? `已复制 ${items.length} 个壁纸` : `已移动 ${items.length} 个壁纸`)
    batchCopyMoveState.visible = false
  } catch (err) {
    const msg = (err as Error).message || (err as Error).name || '未知错误'
    showToast(`${batchCopyMoveState.mode === 'copy' ? '复制失败' : '移动失败'}: ${msg}`)
  } finally {
    batchCopyMoveState.processing = false
  }
}

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
        contextMenu.x = Math.max(0, e.clientX - rect.width)
      }
      if (rect.bottom > window.innerHeight) {
        contextMenu.y = Math.max(0, e.clientY - rect.height)
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

function setWallpaperFromDetail() {
  if (!selectedWallpaper.value) return
  showToast('正在设置壁纸...')
  window.location.href = `wallpaper-browser://apply?id=${encodeURIComponent(selectedWallpaper.value.folderName)}`
}

function addToPlaylistFromDetail() {
  if (!selectedWallpaper.value) return
  showToast('正在加入播放列表...')
  window.location.href = `wallpaper-browser://addplaylist?id=${encodeURIComponent(selectedWallpaper.value.folderName)}`
}

async function getFullPath(handle: FileSystemDirectoryHandle): Promise<string> {
  return `steamapps\\workshop\\content\\431960\\${handle.name}`
}

function setWallpaper() {
  if (!contextMenu.wallpaper) return
  showToast('正在设置壁纸...')
  window.location.href = `wallpaper-browser://apply?id=${encodeURIComponent(contextMenu.wallpaper.folderName)}`
  contextMenu.visible = false
}

function addToPlaylist() {
  if (!contextMenu.wallpaper) return
  showToast('正在加入播放列表...')
  window.location.href = `wallpaper-browser://addplaylist?id=${encodeURIComponent(contextMenu.wallpaper.folderName)}`
  contextMenu.visible = false
}

function openFolder() {
  if (!contextMenu.wallpaper) return
  showToast('正在打开目录...')
  window.location.href = `wallpaper-browser://open?id=${encodeURIComponent(contextMenu.wallpaper.folderName)}`
  contextMenu.visible = false
}

function openFolderFromDetail(subPath?: string) {
  if (!selectedWallpaper.value) return
  showToast('正在打开目录...')
  let url = `wallpaper-browser://open?id=${encodeURIComponent(selectedWallpaper.value.folderName)}`
  if (subPath) {
    url += `&path=${encodeURIComponent(subPath)}`
  }
  window.location.href = url
}

function openInWorkshop() {
  if (!contextMenu.wallpaper) return
  const wp = contextMenu.wallpaper
  const workshopId = wp.workshopId || wp.folderName
  openWorkshopUrl(workshopId)
}

function openInWorkshopFromDetail() {
  if (!selectedWallpaper.value) return
  const wp = selectedWallpaper.value
  const workshopId = wp.workshopId || wp.folderName
  openWorkshopUrl(workshopId)
}

function openAuthorFromContext() {
  if (!contextMenu.wallpaper) return
  const authorId = contextMenu.wallpaper.authorSteamId
  if (!authorId) {
    showToast('该壁纸没有作者信息')
    return
  }
  openAuthorProfile(authorId)
}

function openAuthorFromDetail() {
  if (!selectedWallpaper.value) return
  const authorId = selectedWallpaper.value.authorSteamId
  if (!authorId) {
    showToast('该壁纸没有作者信息')
    return
  }
  openAuthorProfile(authorId)
}

function openAuthorProfile(authorSteamId: string) {
  const steamUrl = `steam://url/Profile/${authorSteamId}`
  const webUrl = `https://steamcommunity.com/profiles/${authorSteamId}`
  openSteamUrlWithFallback(steamUrl, webUrl)
}

function openWorkshopUrl(workshopId: string) {
  const steamUrl = `steam://url/CommunityFilePage/${workshopId}`
  const webUrl = `https://steamcommunity.com/sharedfiles/filedetails/?id=${workshopId}`
  openSteamUrlWithFallback(steamUrl, webUrl)
}

function openSteamUrlWithFallback(steamUrl: string, webUrl: string) {
  window.location.href = steamUrl
  
  const fallbackTimer = setTimeout(() => {
    window.open(webUrl, '_blank')
  }, 500)
  
  const visibilityHandler = () => {
    clearTimeout(fallbackTimer)
    document.removeEventListener('visibilitychange', visibilityHandler)
    window.removeEventListener('blur', visibilityHandler)
  }
  
  document.addEventListener('visibilitychange', visibilityHandler)
  window.addEventListener('blur', visibilityHandler)
  
  setTimeout(() => {
    document.removeEventListener('visibilitychange', visibilityHandler)
    window.removeEventListener('blur', visibilityHandler)
  }, 1000)
}

// ---- 复制/移动壁纸 ----
const copyMoveState = reactive({
  visible: false,
  mode: 'copy' as 'copy' | 'move',
  wallpaper: null as WallpaperItem | null,
  targetDirHandle: null as FileSystemDirectoryHandle | null,
  targetDirName: '',
  processing: false,
  progress: { current: 0, total: 0 }
})

async function initiateCopyMove(mode: 'copy' | 'move', wallpaper: WallpaperItem) {
  copyMoveState.mode = mode
  copyMoveState.wallpaper = wallpaper
  contextMenu.visible = false

  if (!copyMoveState.targetDirHandle) {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
      copyMoveState.targetDirHandle = handle
      copyMoveState.targetDirName = handle.name
    } catch {
      return
    }
  }

  copyMoveState.visible = true
}

async function changeCopyMoveDirectory() {
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
    copyMoveState.targetDirHandle = handle
    copyMoveState.targetDirName = handle.name
  } catch {
    // 用户取消
  }
}

async function confirmCopyMove(dirName: string, conflictMode: 'replace' | 'merge' | 'none') {
  const wp = copyMoveState.wallpaper
  const target = copyMoveState.targetDirHandle
  if (!wp || !target || !dirName.trim()) return

  copyMoveState.processing = true
  copyMoveState.progress = { current: 0, total: 0 }

  try {
    if (!wp.folderHandle) {
      await loadPageHandles([wp.folderName])
      const freshWp = state.wallpapers.find(w => w.folderName === wp.folderName)
      if (freshWp?.folderHandle) {
        wp.folderHandle = freshWp.folderHandle
      }
    }

    if (!wp.folderHandle) {
      throw new Error('无法获取目录句柄')
    }

    if (copyMoveState.mode === 'move') {
      if (conflictMode === 'replace') {
        try {
          await target.removeEntry(dirName, { recursive: true })
        } catch {
          // 目标不存在，忽略
        }
      }
      const moved = await tryMoveDirectory(wp.folderHandle, target, dirName)
      if (moved) {
        showToast('壁纸已移动')
        const folderName = wp.folderName
        selectedWallpaper.value = null
        await purgeWallpaper(folderName, true)
        await loadCurrentPageHandles()
        copyMoveState.visible = false
        return
      }
    }

    let newDir: FileSystemDirectoryHandle
    if (conflictMode === 'replace') {
      try {
        await target.removeEntry(dirName, { recursive: true })
      } catch {
        // 目标不存在，忽略
      }
      newDir = await target.getDirectoryHandle(dirName, { create: true })
    } else {
      newDir = await target.getDirectoryHandle(dirName, { create: true })
    }

    const total = await countFiles(wp.folderHandle)
    copyMoveState.progress.total = total

    const counter = { current: 0 }
    await copyDirectoryRecursive(wp.folderHandle, newDir, counter)

    if (copyMoveState.mode === 'move') {
      showToast('壁纸已移动')
      const folderName = wp.folderName
      selectedWallpaper.value = null
      await purgeWallpaper(folderName, true)
      await loadCurrentPageHandles()
    } else {
      showToast('壁纸已复制')
    }

    copyMoveState.visible = false
  } catch (err) {
    const msg = (err as Error).message || (err as Error).name || '未知错误'
    showToast(`${copyMoveState.mode === 'copy' ? '复制失败' : '移动失败'}: ${msg}`)
  } finally {
    copyMoveState.processing = false
  }
}

function cancelCopyMove() {
  if (copyMoveState.processing) return
  copyMoveState.visible = false
}

async function countFiles(dir: FileSystemDirectoryHandle): Promise<number> {
  let total = 0
  for await (const [, handle] of dir.entries()) {
    if (handle.kind === 'file') {
      total++
    } else {
      total += await countFiles(handle as FileSystemDirectoryHandle)
    }
  }
  return total
}

const COPY_CONCURRENCY = 5

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

interface CopyTask {
  sourceHandle: FileSystemFileHandle
  targetDir: FileSystemDirectoryHandle
  name: string
}

async function collectCopyTasks(
  source: FileSystemDirectoryHandle,
  target: FileSystemDirectoryHandle,
  tasks: CopyTask[]
): Promise<void> {
  const entries: [string, FileSystemHandle][] = []
  for await (const [name, handle] of source.entries()) {
    entries.push([name, handle])
  }
  for (const [name, handle] of entries) {
    if (handle.kind === 'file') {
      tasks.push({ sourceHandle: handle as FileSystemFileHandle, targetDir: target, name })
    } else {
      const newDirHandle = await target.getDirectoryHandle(name, { create: true })
      await collectCopyTasks(handle as FileSystemDirectoryHandle, newDirHandle, tasks)
    }
  }
}

async function copyDirectoryRecursive(
  source: FileSystemDirectoryHandle,
  target: FileSystemDirectoryHandle,
  counter: { current: number }
): Promise<void> {
  const tasks: CopyTask[] = []
  await collectCopyTasks(source, target, tasks)

  await mapWithConcurrency(tasks, COPY_CONCURRENCY, async (task) => {
    const file = await task.sourceHandle.getFile()
    const newFileHandle = await task.targetDir.getFileHandle(task.name, { create: true })
    const writable = await newFileHandle.createWritable()
    try {
      await file.stream().pipeTo(writable)
    } catch (err) {
      try { await writable.close() } catch { /* ignore */ }
      throw err
    }
    counter.current++
    if (copyMoveState.processing) {
      copyMoveState.progress.current = counter.current
    }
  })
}

async function tryMoveDirectory(
  source: FileSystemDirectoryHandle,
  targetParent: FileSystemDirectoryHandle,
  name: string
): Promise<boolean> {
  const moveFn = (source as any).move
  if (typeof moveFn !== 'function') return false
  try {
    await moveFn.call(source, targetParent, name)
    return true
  } catch {
    return false
  }
}

function copyWallpaperFromContext() {
  if (!contextMenu.wallpaper) return
  initiateCopyMove('copy', contextMenu.wallpaper)
}

function moveWallpaperFromContext() {
  if (!contextMenu.wallpaper) return
  initiateCopyMove('move', contextMenu.wallpaper)
}

function copyWallpaperFromDetail() {
  if (!selectedWallpaper.value) return
  initiateCopyMove('copy', selectedWallpaper.value)
}

function moveWallpaperFromDetail() {
  if (!selectedWallpaper.value) return
  initiateCopyMove('move', selectedWallpaper.value)
}
</script>