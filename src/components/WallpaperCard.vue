<template>
  <div class="wallpaper-card" @click="openPreview">
    <div class="card-cover">
      <img
        :src="wallpaper.coverUrl"
        :alt="wallpaper.name"
        loading="lazy"
        @error="onImageError"
      />
      <div class="card-overlay">
        <div class="card-actions">
          <button class="card-btn preview-btn" title="预览">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="card-btn files-btn" title="查看文件" @click.stop="showFiles = !showFiles">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="card-category" v-if="wallpaper.category !== '其他'">
        {{ wallpaper.category }}
      </div>
    </div>
    <div class="card-info">
      <h3 class="card-title" :title="wallpaper.name">{{ wallpaper.name }}</h3>
      <div class="card-meta">
        <span class="file-count">{{ wallpaper.files.length }} 个文件</span>
      </div>
    </div>
    <!-- File list popup -->
    <div class="file-list-popup" v-if="showFiles" @click.stop>
      <div class="file-list-header">
        <span>文件列表</span>
        <button @click="showFiles = false">&times;</button>
      </div>
      <div class="file-list-body">
        <div v-for="file in wallpaper.files" :key="file.name" class="file-item">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="file-icon">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          <span class="file-name">{{ file.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import type { WallpaperItem } from '../utils/wallpaperScanner'

const props = defineProps<{
  wallpaper: WallpaperItem
}>()

const showFiles = ref(false)
const setPreview = inject<(wp: WallpaperItem | null) => void>('setPreview')!

function openPreview() {
  showFiles.value = false
  setPreview(props.wallpaper)
}

function onImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" fill="%231b2838"><rect width="400" height="250"/><text x="200" y="130" text-anchor="middle" fill="%236c7a96" font-size="16" font-family="sans-serif">无封面</text></svg>')
}
</script>

<style scoped>
.wallpaper-card {
  position: relative;
  background: #1e3048;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.wallpaper-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.4);
}

.card-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: #162236;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.wallpaper-card:hover .card-cover img {
  transform: scale(1.05);
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.2s ease;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 10px;
}

.wallpaper-card:hover .card-overlay {
  opacity: 1;
}

.card-actions {
  display: flex;
  gap: 6px;
}

.card-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  color: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(8px);
}

.card-btn:hover {
  background: rgba(74, 144, 217, 0.8);
  transform: scale(1.1);
}

.card-category {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  font-size: 11px;
  color: #fff;
  background: rgba(0,0,0,0.6);
  border-radius: 4px;
  backdrop-filter: blur(4px);
}

.card-info {
  padding: 10px 12px 12px;
}

.card-title {
  font-size: 13px;
  font-weight: 500;
  color: #c7d5e0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.card-meta {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-count {
  font-size: 11px;
  color: #6c7a96;
}

.file-list-popup {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  background: #1b2838;
  border: 1px solid #2a3f55;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  max-height: 200px;
  overflow: hidden;
}

.file-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 12px;
  color: #8f98a0;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid #2a3f55;
}

.file-list-header button {
  background: none;
  border: none;
  color: #6c7a96;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0 4px;
}

.file-list-header button:hover {
  color: #c7d5e0;
}

.file-list-body {
  overflow-y: auto;
  max-height: 160px;
  padding: 4px 0;
}

.file-list-body::-webkit-scrollbar {
  width: 4px;
}

.file-list-body::-webkit-scrollbar-thumb {
  background: #2a3f55;
  border-radius: 2px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: #8f98a0;
}

.file-item:hover {
  background: rgba(255,255,255,0.03);
}

.file-icon {
  flex-shrink: 0;
  opacity: 0.5;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
