<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <rect x="2" y="3" width="20" height="15" rx="2" fill="#4287f5"/>
          <rect x="6" y="18" width="4" height="3" rx="0.5" fill="#2a475e"/>
          <rect x="14" y="18" width="4" height="3" rx="0.5" fill="#2a475e"/>
          <rect x="5" y="21" width="14" height="1" rx="0.5" fill="#1a3344"/>
          <path d="M7 10l3-3 2 2 4-4 3 3v3H7v-1z" fill="#5db85d" opacity="0.8"/>
          <circle cx="9" cy="7.5" r="1.5" fill="#ffcc33"/>
        </svg>
        <span class="logo-text">壁纸浏览器</span>
      </div>
    </div>

    <div class="sidebar-content">
      <div v-if="rootDirName" class="current-dir-wrap">
        <div class="current-dir" :title="rootDirName">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          <span>{{ rootDirName }}</span>
        </div>
      </div>

      <div class="filter-section">
        <button class="section-header" @click="typeCollapsed = !typeCollapsed">
          <span class="section-label">类型</span>
          <svg
            viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
            :style="{ transform: typeCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div v-show="!typeCollapsed" class="section-items">
          <button
            v-for="t in typeItems"
            :key="t.key"
            class="nav-item"
            :class="{ active: isTypeSelected(t.key) }"
            @click="toggleType(t.key)"
          >
            <span class="nav-icon">{{ t.icon }}</span>
            <span class="nav-label">{{ t.name }}</span>
            <span class="nav-count">{{ t.count }}</span>
          </button>
        </div>
      </div>

      <div class="filter-section">
        <button class="section-header" @click="categoryCollapsed = !categoryCollapsed">
          <span class="section-label">分类</span>
          <svg
            viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
            :style="{ transform: categoryCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div v-show="!categoryCollapsed" class="section-items">
          <button
            v-for="cat in categories"
            :key="cat.name"
            class="nav-item"
            :class="{ active: isCategorySelected(cat.name) }"
            @click="toggleCategory(cat.name)"
          >
            <span class="nav-icon">{{ cat.icon }}</span>
            <span class="nav-label">{{ cat.name }}</span>
            <span class="nav-count">{{ cat.count }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
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
import { ref, computed } from 'vue'
import type { CategoryInfo, WallpaperType } from '../utils/wallpaperScanner'
import { TYPE_LIST } from '../utils/wallpaperScanner'

const props = defineProps<{
  categories: CategoryInfo[]
  selectedCategories: string[]
  selectedTypes: (WallpaperType | 'all')[]
  rootDirName: string
  wallpaperCount: number
  typeCounts: Record<WallpaperType | 'all', number>
}>()

const emit = defineEmits<{
  selectCategory: [cats: string[]]
  selectType: [types: (WallpaperType | 'all')[]]
  openDirectory: []
}>()

const typeCollapsed = ref(false)
const categoryCollapsed = ref(false)

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
</script>

<style scoped>
.sidebar {
  width: 260px;
  min-width: 260px;
  height: 100vh;
  background: var(--bg-tertiary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
}

.sidebar-content::-webkit-scrollbar {
  width: 4px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
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
}

.current-dir svg {
  flex-shrink: 0;
  opacity: 0.6;
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
}

.section-header:hover {
  color: var(--text-secondary);
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: inherit;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.section-header svg {
  transition: transform 0.2s ease;
}

.section-items {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 0 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  text-align: left;
  position: relative;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: rgba(66, 135, 244, 0.15);
  color: var(--accent-light);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  width: 20px;
  text-align: center;
  font-size: 13px;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-hover-dark);
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.nav-item.active .nav-count {
  color: var(--accent-light);
  background: rgba(66, 135, 244, 0.15);
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
}

.btn-open-dir:hover {
  background: rgba(66, 135, 244, 0.1);
  border-color: var(--accent);
  color: var(--accent-light);
}
</style>
