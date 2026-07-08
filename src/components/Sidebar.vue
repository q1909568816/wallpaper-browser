<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <rect x="2" y="3" width="20" height="15" rx="2" fill="#4a90d9"/>
          <rect x="6" y="18" width="4" height="3" rx="0.5" fill="#3a7bc8"/>
          <rect x="14" y="18" width="4" height="3" rx="0.5" fill="#3a7bc8"/>
          <rect x="5" y="21" width="14" height="1" rx="0.5" fill="#2a5a99"/>
          <path d="M7 10l3-3 2 2 4-4 3 3v3H7v-1z" fill="#5db85d" opacity="0.8"/>
          <circle cx="9" cy="7.5" r="1.5" fill="#ffcc33"/>
        </svg>
        <span class="logo-text">壁纸浏览器</span>
      </div>
    </div>

    <div class="sidebar-section" v-if="rootDirName">
      <div class="section-label">当前目录</div>
      <div class="current-dir" :title="rootDirName">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        </svg>
        <span>{{ rootDirName }}</span>
      </div>
    </div>

    <nav class="sidebar-nav" v-if="categories.length > 0">
      <div class="section-label">分类</div>
      <button
        v-for="cat in categories"
        :key="cat.name"
        class="nav-item"
        :class="{ active: currentCategory === cat.name }"
        @click="$emit('selectCategory', cat.name)"
      >
        <span class="nav-icon">{{ cat.icon }}</span>
        <span class="nav-label">{{ cat.name }}</span>
        <span class="nav-count">{{ cat.count }}</span>
      </button>
    </nav>

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
import type { CategoryInfo } from '../utils/wallpaperScanner'

defineProps<{
  categories: CategoryInfo[]
  currentCategory: string
  rootDirName: string
  wallpaperCount: number
}>()

defineEmits<{
  selectCategory: [cat: string]
  openDirectory: []
}>()
</script>

<style scoped>
.sidebar {
  width: 260px;
  min-width: 260px;
  height: 100vh;
  background: #1b2838;
  border-right: 1px solid #2a3f55;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid #2a3f55;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #c7d5e0;
  letter-spacing: 0.5px;
}

.sidebar-section {
  padding: 16px 16px 8px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: #6c7a96;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 0 8px;
}

.current-dir {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #8f98a0;
  padding: 8px 10px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-dir svg {
  flex-shrink: 0;
  opacity: 0.6;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px;
}

.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: #2a3f55;
  border-radius: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  background: transparent;
  color: #8f98a0;
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
  text-align: left;
}

.nav-item:hover {
  background: rgba(255,255,255,0.06);
  color: #c7d5e0;
}

.nav-item.active {
  background: rgba(74, 144, 217, 0.15);
  color: #4a90d9;
}

.nav-icon {
  width: 22px;
  text-align: center;
  font-size: 14px;
}

.nav-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-count {
  font-size: 11px;
  color: #6c7a96;
  background: rgba(255,255,255,0.05);
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.nav-item.active .nav-count {
  color: #4a90d9;
  background: rgba(74, 144, 217, 0.15);
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #2a3f55;
}

.btn-open-dir {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border: 1px solid #2a3f55;
  background: rgba(255,255,255,0.03);
  color: #8f98a0;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-open-dir:hover {
  background: rgba(74, 144, 217, 0.1);
  border-color: #4a90d9;
  color: #4a90d9;
}
</style>
