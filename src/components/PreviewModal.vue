<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content">
        <!-- Close button -->
        <button class="modal-close" @click="$emit('close')">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <!-- Preview area -->
        <div class="preview-area">
          <img
            :src="currentPreviewUrl || wallpaper.coverUrl"
            :alt="wallpaper.name"
            class="preview-image"
            @error="onPreviewError"
          />
          <!-- Navigation arrows -->
          <button
            v-if="wallpaper.files.length > 1 && currentFileIndex > 0"
            class="nav-arrow nav-prev"
            @click="prevFile"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <button
            v-if="wallpaper.files.length > 1 && currentFileIndex < imageFiles.length - 1"
            class="nav-arrow nav-next"
            @click="nextFile"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <!-- Info panel -->
        <div class="info-panel">
          <div class="info-header">
            <div>
              <h2 class="preview-title">{{ wallpaper.name }}</h2>
              <span class="preview-category">{{ wallpaper.category }}</span>
            </div>
            <div class="info-stats">
              <span>{{ imageFiles.length }} 张图片</span>
              <span>{{ wallpaper.files.length }} 个文件</span>
            </div>
          </div>

          <!-- File thumbnails -->
          <div class="thumb-strip" v-if="imageFiles.length > 1">
            <button
              v-for="(file, idx) in imageFiles"
              :key="file.name"
              class="thumb-item"
              :class="{ active: idx === currentFileIndex }"
              @click="previewFile(file, idx)"
            >
              <img
                :src="thumbUrlMap.get(file.name) || ''"
                :alt="file.name"
                loading="lazy"
              />
            </button>
          </div>

          <!-- File list -->
          <div class="modal-file-list">
            <div class="modal-file-item" v-for="file in wallpaper.files" :key="file.name">
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
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { WallpaperItem } from '../utils/wallpaperScanner'

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg']

const props = defineProps<{
  wallpaper: WallpaperItem
}>()

defineEmits<{
  close: []
}>()

const currentFileIndex = ref(0)
const currentPreviewUrl = ref('')
const thumbUrlMap = ref<Map<string, string>>(new Map())

const imageFiles = computed(() => {
  return props.wallpaper.files.filter(f =>
    IMAGE_EXTS.some(ext => f.name.toLowerCase().endsWith(ext))
  )
})

function isImageFile(name: string): boolean {
  const lower = name.toLowerCase()
  return IMAGE_EXTS.some(ext => lower.endsWith(ext))
}

async function loadThumbnails() {
  thumbUrlMap.value.clear()
  for (const file of imageFiles.value) {
    try {
      const blob = await file.handle.getFile()
      thumbUrlMap.value.set(file.name, URL.createObjectURL(blob))
    } catch {
      // Skip failed thumbnails
    }
  }
}

function previewFile(file: { name: string; handle: FileSystemFileHandle }, idx: number) {
  currentFileIndex.value = idx
  currentPreviewUrl.value = thumbUrlMap.value.get(file.name) || ''
}

function nextFile() {
  if (currentFileIndex.value < imageFiles.value.length - 1) {
    currentFileIndex.value++
    currentPreviewUrl.value = thumbUrlMap.value.get(imageFiles.value[currentFileIndex.value].name) || ''
  }
}

function prevFile() {
  if (currentFileIndex.value > 0) {
    currentFileIndex.value--
    currentPreviewUrl.value = thumbUrlMap.value.get(imageFiles.value[currentFileIndex.value].name) || ''
  }
}

function onPreviewError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" fill="%231b2838"><rect width="800" height="500"/><text x="400" y="260" text-anchor="middle" fill="%236c7a96" font-size="20" font-family="sans-serif">无法预览此文件</text></svg>')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    // Parent handles close
  } else if (e.key === 'ArrowRight') {
    nextFile()
  } else if (e.key === 'ArrowLeft') {
    prevFile()
  }
}

onMounted(() => {
  loadThumbnails()
  document.addEventListener('keydown', handleKeydown)
})

watch(() => props.wallpaper.id, () => {
  currentFileIndex.value = 0
  currentPreviewUrl.value = ''
  loadThumbnails()
})

import { onUnmounted } from 'vue'
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  thumbUrlMap.value.forEach(url => URL.revokeObjectURL(url))
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 1100px;
  max-height: 90vh;
  background: #1b2838;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  color: #c7d5e0;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-close:hover {
  background: rgba(220, 50, 50, 0.6);
  color: #fff;
}

.preview-area {
  position: relative;
  background: #0d1b2a;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  max-height: 60vh;
}

.preview-image {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
}

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  color: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  z-index: 5;
}

.nav-arrow:hover {
  background: rgba(74, 144, 217, 0.8);
}

.nav-prev { left: 12px; }
.nav-next { right: 12px; }

.info-panel {
  padding: 16px 20px;
  overflow-y: auto;
  max-height: 30vh;
}

.info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.preview-title {
  font-size: 18px;
  font-weight: 600;
  color: #e1e8ed;
  margin: 0 0 4px;
}

.preview-category {
  font-size: 12px;
  color: #4a90d9;
  background: rgba(74, 144, 217, 0.12);
  padding: 2px 8px;
  border-radius: 4px;
}

.info-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6c7a96;
  flex-shrink: 0;
  padding-top: 4px;
}

.thumb-strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 8px 0;
  margin-bottom: 8px;
}

.thumb-strip::-webkit-scrollbar {
  height: 4px;
}

.thumb-strip::-webkit-scrollbar-thumb {
  background: #2a3f55;
  border-radius: 2px;
}

.thumb-item {
  width: 56px;
  height: 36px;
  flex-shrink: 0;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  background: #0d1b2a;
  padding: 0;
  transition: border-color 0.15s ease;
}

.thumb-item.active {
  border-color: #4a90d9;
}

.thumb-item:hover {
  border-color: #6c7a96;
}

.thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal-file-list {
  border-top: 1px solid #2a3f55;
  padding-top: 8px;
}

.modal-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 12px;
  color: #8f98a0;
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
