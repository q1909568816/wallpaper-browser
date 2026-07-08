<template>
  <div class="wallpaper-card" ref="cardRef" :class="{ selected: selected }" @click="handleClick" @dblclick="handleDoubleClick">
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
import { ref, onMounted, onUnmounted } from 'vue'
import type { WallpaperItem } from '../utils/wallpaperScanner'

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
  if (!props.wallpaper.coverFileHandle) return
  try {
    const file = await props.wallpaper.coverFileHandle.getFile()
    props.wallpaper.coverUrl = URL.createObjectURL(file)
    loadedCover.value = true
  } catch {
    // ignore
  }
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

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})

function handleClick() {
  showFiles.value = false
  emit('select', props.wallpaper)
}

function handleDoubleClick() {
  emit('preview', props.wallpaper)
}

function onImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" fill="%23f2f2f2"><rect width="400" height="250"/><text x="200" y="130" text-anchor="middle" fill="%238a8a8a" font-size="16" font-family="sans-serif">无封面</text></svg>')
}
</script>

<style scoped>
.wallpaper-card {
  position: relative;
  background: var(--bg-card);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 2px solid transparent;
}

.wallpaper-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border-color: var(--border);
}

.wallpaper-card.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.2);
}

.card-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--bg-tertiary);
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
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 40%);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.wallpaper-card:hover .card-overlay {
  opacity: 1;
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
}

.file-list-header button {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 4px;
}

.file-list-header button:hover {
  color: var(--text-primary);
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
  background: var(--border);
  border-radius: 2px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.file-item:hover {
  background: var(--bg-hover);
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