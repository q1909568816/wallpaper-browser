<template>
  <Teleport to="body">
    <div class="sidebar-overlay" v-if="isMobile && !collapsed" @click="$emit('toggle')"></div>
  </Teleport>
  <aside class="sidebar" :class="{ collapsed: collapsed, 'mobile-open': isMobile && !collapsed }">

    <div class="sidebar-header" v-show="!collapsed">
      <div class="logo">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <rect x="2" y="3" width="20" height="15" rx="2" fill="#0078d4"/>
          <rect x="6" y="18" width="4" height="3" rx="0.5" fill="#005a9e"/>
          <rect x="14" y="18" width="4" height="3" rx="0.5" fill="#005a9e"/>
          <rect x="5" y="21" width="14" height="1" rx="0.5" fill="#004578"/>
          <path d="M7 10l3-3 2 2 4-4 3 3v3H7v-1z" fill="#107c10" opacity="0.8"/>
          <circle cx="9" cy="7.5" r="1.5" fill="#ffaa44"/>
        </svg>
        <span class="logo-text">壁纸浏览器</span>
      </div>
    </div>

    <div class="sidebar-content" v-show="!collapsed">
      <div v-if="rootDirName" class="current-dir-wrap">
        <div class="current-dir" :title="rootDirName">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          <span>{{ rootDirName }}</span>
        </div>
      </div>

      <div class="filter-section">
        <button class="section-header" @click="sections.ratingCollapsed = !sections.ratingCollapsed">
          <span class="section-label">年龄分级</span>
          <svg
            viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
            :style="{ transform: sections.ratingCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div v-show="!sections.ratingCollapsed" class="section-items">
          <label class="filter-item" v-for="rating in contentRatings" :key="rating.name">
            <input
              type="checkbox"
              :checked="isContentRatingSelected(rating.name)"
              @change="toggleContentRating(rating.name)"
            />
            <span class="filter-icon">📋</span>
            <span class="filter-label">{{ rating.name }}</span>
            <span class="filter-count">{{ rating.count }}</span>
          </label>
        </div>
      </div>

      <div class="filter-section">
        <button class="section-header" @click="sections.typeCollapsed = !sections.typeCollapsed">
          <span class="section-label">类型</span>
          <svg
            viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
            :style="{ transform: sections.typeCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div v-show="!sections.typeCollapsed" class="section-items">
          <label class="filter-item" v-for="t in typeItems" :key="t.key">
            <input
              type="checkbox"
              :checked="isTypeSelected(t.key)"
              @change="toggleType(t.key)"
            />
            <span class="filter-icon">{{ t.icon }}</span>
            <span class="filter-label">{{ t.name }}</span>
            <span class="filter-count">{{ t.count }}</span>
          </label>
        </div>
      </div>

      <div class="filter-section">
        <button class="section-header" @click="sections.categoryCollapsed = !sections.categoryCollapsed">
          <span class="section-label">分类</span>
          <svg
            viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
            :style="{ transform: sections.categoryCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div v-show="!sections.categoryCollapsed" class="section-items">
          <label class="filter-item" v-for="cat in categories" :key="cat.name">
            <input
              type="checkbox"
              :checked="isCategorySelected(cat.name)"
              @change="toggleCategory(cat.name)"
            />
            <span class="filter-icon">{{ cat.icon }}</span>
            <span class="filter-label">{{ cat.name }}</span>
            <span class="filter-count">{{ cat.count }}</span>
          </label>
        </div>
      </div>

      <div class="filter-section">
        <button class="section-header" @click="sections.tagCollapsed = !sections.tagCollapsed">
          <span class="section-label">标签</span>
          <svg
            viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
            :style="{ transform: sections.tagCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div v-show="!sections.tagCollapsed" class="section-items">
          <label class="filter-item" v-for="tag in tags" :key="tag.name">
            <input
              type="checkbox"
              :checked="isTagSelected(tag.name)"
              @change="toggleTag(tag.name)"
            />
            <span class="filter-icon">🏷️</span>
            <span class="filter-label">{{ tag.name }}</span>
            <span class="filter-count">{{ tag.count }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="sidebar-footer" v-show="!collapsed">
      <button class="btn-open-dir" @click="$emit('openDirectory')">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        </svg>
        切换目录
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, onUnmounted } from 'vue'
import type { CategoryInfo, WallpaperType } from '../utils/wallpaperScanner'
import { TYPE_LIST } from '../utils/wallpaperScanner'

const props = defineProps<{
  categories: CategoryInfo[]
  tags: { name: string; count: number }[]
  contentRatings: { name: string; count: number }[]
  selectedCategories: string[]
  selectedTags: string[]
  selectedTypes: (WallpaperType | 'all')[]
  selectedContentRatings: string[]
  rootDirName: string
  typeCounts: Record<WallpaperType | 'all', number>
  collapsed: boolean
}>()

const emit = defineEmits<{
  selectCategory: [cats: string[]]
  selectType: [types: (WallpaperType | 'all')[]]
  selectTag: [tags: string[]]
  selectContentRating: [ratings: string[]]
  openDirectory: []
  toggle: []
}>()

const sections = reactive({
  typeCollapsed: false,
  categoryCollapsed: false,
  tagCollapsed: false,
  ratingCollapsed: false
})

const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const typeItems = computed(() => {
  return TYPE_LIST.map(t => ({
    ...t,
    count: props.typeCounts[t.key] ?? 0
  }))
})

function isTypeSelected(key: WallpaperType | 'all'): boolean {
  return props.selectedTypes.includes(key)
}

function isCategorySelected(name: string): boolean {
  return props.selectedCategories.includes(name)
}

function isTagSelected(tag: string): boolean {
  return props.selectedTags.includes(tag)
}

function toggleType(key: WallpaperType | 'all') {
  let next: (WallpaperType | 'all')[]

  if (key === 'all') {
    next = ['all']
  } else {
    const current = props.selectedTypes.filter(t => t !== 'all')
    const idx = current.indexOf(key)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(key)
    }
    if (current.length === 0) {
      next = ['all']
    } else {
      next = current
    }
  }

  emit('selectType', next)
}

function toggleCategory(name: string) {
  let next: string[]

  if (name === '全部') {
    next = ['全部']
  } else {
    const current = props.selectedCategories.filter(c => c !== '全部')
    const idx = current.indexOf(name)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(name)
    }
    if (current.length === 0) {
      next = ['全部']
    } else {
      next = current
    }
  }

  emit('selectCategory', next)
}

function toggleTag(tag: string) {
  const current = [...props.selectedTags]
  const idx = current.indexOf(tag)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(tag)
  }
  emit('selectTag', current)
}

function isContentRatingSelected(name: string): boolean {
  return props.selectedContentRatings.includes(name)
}

function toggleContentRating(name: string) {
  const current = [...props.selectedContentRatings]
  const idx = current.indexOf(name)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(name)
  }
  emit('selectContentRating', current)
}
</script>

<style scoped lang="scss">
.sidebar {
  width: 260px;
  min-width: 260px;
  height: 100vh;
  background: var(--bg-tertiary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  transition: width 0.25s ease, min-width 0.25s ease;

  &.collapsed {
    width: 0;
    min-width: 0;
    border-right: none;
  }

  &.mobile-open {
    // handled in media query
  }
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 2px;
  }
}

.current-dir-wrap {
  margin-bottom: 4px;
}

.current-dir {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 8px 10px;
  background: var(--bg-hover-dark);
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
    opacity: 0.6;
  }
}

.filter-section {
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: color 0.15s ease;

  &:hover {
    color: var(--text-secondary);
  }

  svg {
    transition: transform 0.2s ease;
  }
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: inherit;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.section-items {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 0 4px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s ease;
  user-select: none;

  &:hover {
    background: var(--bg-hover);
  }

  input[type="checkbox"] {
    width: 14px;
    height: 14px;
    cursor: pointer;
    accent-color: var(--accent);
  }
}

.filter-icon {
  width: 16px;
  text-align: center;
  font-size: 12px;
  flex-shrink: 0;
}

.filter-label {
  flex: 1;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-hover-dark);
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
}

.btn-open-dir {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(0, 120, 212, 0.08);
    border-color: var(--accent);
    color: var(--accent);
  }
}

// Mobile Styles
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    min-width: 280px;
    height: 100vh;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    box-shadow: none;

    &.mobile-open {
      transform: translateX(0);
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
    }

    &.collapsed {
      transform: translateX(-100%);
      width: 280px;
      min-width: 280px;
    }
  }

  .sidebar-header {
    padding: 16px;
  }

  .sidebar-content {
    padding: 8px;
  }

  .filter-item {
    padding: 10px 12px;
  }

  .filter-label {
    font-size: 13px;
  }

  .btn-open-dir {
    padding: 12px;
    font-size: 14px;
  }
}
</style>