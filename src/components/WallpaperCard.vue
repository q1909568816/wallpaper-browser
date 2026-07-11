<template>
  <div class="wallpaper-card" ref="cardRef" :class="{ selected: selected }" @click="handleClick" @dblclick="handleDoubleClick" @pointerdown="onPointerDown" @pointerup="onPointerUp">
    <div class="card-cover">
      <img
        :src="wallpaper.coverUrl"
        :alt="wallpaper.name"
        loading="lazy"
        @error="onImageError"
      />
      <div class="card-category" v-if="wallpaper.category !== '其他'">
        {{ wallpaper.category }}
      </div>
      <div class="card-check" v-if="selected">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--accent)" stroke="white" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>
      <button class="card-preview-btn" @click.stop="handlePreview" title="预览">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      <div class="card-name-overlay">
        <span class="card-title" :title="wallpaper.name">{{ wallpaper.name }}</span>
      </div>
    </div>
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { WallpaperItem } from '../utils/wallpaperScanner'
import { setCoverUrl, clearCoverUrl, getCoverUrl } from '../utils/wallpaperScanner'
import { cacheThumbnail, getCachedThumbnail } from '../utils/cache'

const props = defineProps<{
  wallpaper: WallpaperItem
  selected: boolean
}>()

const emit = defineEmits<{
  select: [wallpaper: WallpaperItem]
  preview: [wallpaper: WallpaperItem]
}>()

const showFiles = ref(false)
const cardRef = ref<HTMLElement>()
const loadedCover = ref(false)
let observer: IntersectionObserver | null = null

async function loadCover() {
  if (loadedCover.value) return
  try {
    // 1. Check in-memory cache (same session)
    const cachedUrl = getCoverUrl(props.wallpaper.folderName)
    if (cachedUrl) {
      props.wallpaper.coverUrl = cachedUrl
      loadedCover.value = true
      return
    }
    // 2. Check IndexedDB cache (survives refresh, works offline)
    const cachedBlob = await getCachedThumbnail(props.wallpaper.folderName)
    if (cachedBlob) {
      const url = URL.createObjectURL(cachedBlob)
      setCoverUrl(props.wallpaper.folderName, url)
      props.wallpaper.coverUrl = url
      loadedCover.value = true
      return
    }
    // 3. Load from file handle and cache Blob in IndexedDB
    if (!props.wallpaper.coverFileHandle) return
    const file = await props.wallpaper.coverFileHandle.getFile()
    const url = URL.createObjectURL(file)
    setCoverUrl(props.wallpaper.folderName, url)
    props.wallpaper.coverUrl = url
    loadedCover.value = true
    // Cache Blob for offline access (fire-and-forget)
    cacheThumbnail(props.wallpaper.folderName, file)
  } catch {
  }
}

function cleanupCover() {
}

onMounted(() => {
  if (props.wallpaper.coverUrl) {
    loadedCover.value = true
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadCover()
        observer?.disconnect()
        observer = null
      }
    },
    { rootMargin: '200px' }
  )
  if (cardRef.value) {
    observer.observe(cardRef.value)
  }
})

watch(() => props.wallpaper.coverFileHandle, (newHandle) => {
  if (newHandle && !loadedCover.value) {
    loadCover()
  }
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
  cleanupCover()
})

function handleClick() {
  showFiles.value = false
  emit('select', props.wallpaper)
}

function handleDoubleClick() {
  emit('preview', props.wallpaper)
}

function handlePreview() {
  emit('preview', props.wallpaper)
}

const DOUBLE_TAP_DURATION = 300
let lastTapTime = 0

function onPointerDown() {
  const now = Date.now()
  if (now - lastTapTime < DOUBLE_TAP_DURATION) {
    emit('preview', props.wallpaper)
    lastTapTime = 0
  } else {
    lastTapTime = now
  }
}

function onPointerUp() {
}

function onImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" fill="%23f2f2f2"><rect width="400" height="250"/><text x="200" y="130" text-anchor="middle" fill="%238a8a8a" font-size="16" font-family="sans-serif">无封面</text></svg>')
}
</script>

<style scoped lang="scss">
.wallpaper-card {
  position: relative;
  background: var(--bg-card);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    border-color: var(--border);

    .card-cover img {
      transform: scale(1.05);
    }

    .card-overlay {
      opacity: 1;
    }

    .card-preview-btn {
      opacity: 1;
    }
  }

  &.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.2);

    .card-preview-btn {
      right: 30px;
      opacity: 1;
    }
  }
}

.card-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--bg-tertiary);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 40%);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.card-category {
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 2px 6px;
  font-size: 10px;
  color: #ffffff;
  background: rgba(0, 120, 212, 0.85);
  border-radius: 2px;
  backdrop-filter: blur(4px);
}

.card-check {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 120, 212, 0.95);
  border-radius: 3px;
  backdrop-filter: blur(4px);
  color: #ffffff;
}

.card-preview-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 4px;
  color: #ffffff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease, background 0.2s ease;

  &:hover {
    background: rgba(0, 120, 212, 0.85);
  }
}

.card-name-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 8px 8px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.6) 60%, transparent 100%);
  max-height: 60%;
  overflow: hidden;
}

.card-title {
  font-size: 12px;
  font-weight: 500;
  color: #ffffff;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.file-list-popup {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px 4px 0 0;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow: hidden;
}

.file-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-hover-dark);
  border-bottom: 1px solid var(--border);

  button {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 4px;

    &:hover {
      color: var(--text-primary);
    }
  }
}

.file-list-body {
  overflow-y: auto;
  max-height: 160px;
  padding: 4px 0;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 2px;
  }
}

.file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-size: 12px;
  color: var(--text-secondary);

  &:hover {
    background: var(--bg-hover);
  }
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

// Mobile - always show preview button
@media (max-width: 768px) {
  .card-preview-btn {
    opacity: 1;
    width: 28px;
    height: 28px;
  }

  .wallpaper-card {
    &.selected .card-preview-btn {
      right: 32px;
    }

    &:hover {
      transform: none;
      box-shadow: none;

      .card-cover img {
        transform: none;
      }
    }
  }
}
</style>