<template>
  <Teleport to="body">
    <Transition name="preview">
      <div v-if="visible" class="preview-modal" @click.self="$emit('close')">
        <div class="preview-header">
          <h3 class="preview-title">{{ title }}</h3>
          <div class="preview-controls">
            <button v-if="isImage" class="control-btn" @click="zoomOut" :disabled="scale <= 0.5">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <line x1="12" y1="5" x2="12" y2="19"/>
              </svg>
            </button>
            <span v-if="isImage" class="scale-label">{{ Math.round(scale * 100) }}%</span>
            <button v-if="isImage" class="control-btn" @click="zoomIn" :disabled="scale >= 3">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button v-if="isImage" class="control-btn" @click="resetZoom">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6M9 9l6 6"/>
              </svg>
            </button>
            <button class="control-btn" @click="toggleFullscreen">
              <svg v-if="!isFullscreen" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2"/>
                <path d="M17 10h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-2"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h6a2 2 0 0 1 2 2v6M9 21H3a2 2 0 0 1-2-2v-6"/>
                <path d="M21 15v6a2 2 0 0 1-2 2h-6M3 9H9a2 2 0 0 1 2 2v6"/>
              </svg>
            </button>
            <button class="close-btn" @click="$emit('close')">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="preview-content">
          <div v-if="previewUrl" class="preview-media">
            <div v-if="isImage" class="image-container" @wheel.prevent="handleWheel">
              <img :src="previewUrl" class="preview-image" :style="imageStyle" alt="预览"/>
            </div>
            <iframe v-else-if="isWeb" :src="previewUrl" class="preview-iframe" sandbox="allow-scripts allow-same-origin"/>
            <video v-else-if="isVideo" ref="videoRef" :src="previewUrl" class="preview-video" controls autoplay loop/>
            <div v-else class="preview-unsupported">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
              <p>暂不支持此类型预览</p>
            </div>
          </div>
          <div v-else class="preview-loading">
            <div class="loading-spinner"></div>
            <p>正在加载资源...</p>
          </div>
        </div>
        <div class="preview-footer">
          <span class="preview-type">{{ typeLabel }}</span>
          <span class="preview-file">{{ fileName }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, onUnmounted } from 'vue'
import type { WallpaperItem } from '../utils/wallpaperScanner'
import { TYPE_LIST } from '../utils/wallpaperScanner'

const props = defineProps<{
  visible: boolean
  wallpaper: WallpaperItem | null
  file: FileSystemFileHandle | null
}>()

defineEmits<{
  close: []
}>()

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg']
const VIDEO_EXTS = ['.mp4', '.mkv', '.webm', '.avi', '.mov']
const WEB_EXTS = ['.html', '.htm']

const generatedUrl = ref('')
const scale = ref(1)
const isFullscreen = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
let generateToken = 0

const previewUrl = computed(() => {
  if (generatedUrl.value) return generatedUrl.value
  if (props.wallpaper?.coverUrl) return props.wallpaper.coverUrl
  return ''
})

const imageStyle = computed(() => ({
  transform: `scale(${scale.value})`,
  transformOrigin: 'center center'
}))

const title = computed(() => {
  if (props.file && typeof (props.file as any).getFile === 'function') return props.file.name
  return props.wallpaper?.name || ''
})

const fileName = computed(() => {
  if (props.file && typeof (props.file as any).getFile === 'function') return props.file.name
  return props.wallpaper?.mainFile || props.wallpaper?.previewFile || ''
})

const typeLabel = computed(() => {
  if (!props.wallpaper) return ''
  const type = TYPE_LIST.find(t => t.key === props.wallpaper?.type)
  return type?.name || ''
})

const isImage = computed(() => {
  const ext = fileName.value.toLowerCase()
  return IMAGE_EXTS.some(e => ext.endsWith(e)) || (!props.file && props.wallpaper?.type === 'scene' && !hasSceneHtml)
})

const isVideo = computed(() => {
  const ext = fileName.value.toLowerCase()
  return VIDEO_EXTS.some(e => ext.endsWith(e)) || (!props.file && props.wallpaper?.type === 'video')
})

const isWeb = computed(() => {
  const ext = fileName.value.toLowerCase()
  return WEB_EXTS.some(e => ext.endsWith(e)) || (!props.file && props.wallpaper?.type === 'web') || (!props.file && props.wallpaper?.type === 'scene' && hasSceneHtml)
})

const hasSceneHtml = computed(() => {
  if (!props.wallpaper) return false
  return props.wallpaper.files.some(f => f.name.toLowerCase() === 'scene.html' || f.name.toLowerCase() === 'index.html')
})

async function generateUrl() {
  const token = ++generateToken

  if (!props.visible || !props.wallpaper) {
    if (token === generateToken) {
      cleanup()
      generatedUrl.value = ''
    }
    return
  }

  if (!props.file) {
    if (props.wallpaper.type === 'scene' && hasSceneHtml.value) {
      const sceneFile = props.wallpaper.files.find(f => f.name.toLowerCase() === 'scene.html')?.handle ||
        props.wallpaper.files.find(f => f.name.toLowerCase() === 'index.html')?.handle || null
      if (sceneFile && typeof (sceneFile as any).getFile === 'function') {
        try {
          const file = await (sceneFile as FileSystemFileHandle).getFile()
          if (token !== generateToken) return
          const oldUrl = generatedUrl.value
          generatedUrl.value = URL.createObjectURL(file)
          if (oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl)
          return
        } catch {
        }
      }
    }

    if (props.wallpaper.type === 'web') {
      if (token === generateToken) {
        cleanup()
        generatedUrl.value = props.wallpaper.coverUrl || ''
      }
      return
    }

    const mainFile = props.wallpaper.mainFile || props.wallpaper.previewFile
    if (mainFile) {
      const targetFile = props.wallpaper.files.find(f => f.name.toLowerCase() === mainFile.toLowerCase())?.handle || null
      if (targetFile && typeof (targetFile as any).getFile === 'function') {
        try {
          const file = await (targetFile as FileSystemFileHandle).getFile()
          if (token !== generateToken) return
          const oldUrl = generatedUrl.value
          generatedUrl.value = URL.createObjectURL(file)
          if (oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl)
        } catch {
          if (token === generateToken) {
            generatedUrl.value = props.wallpaper.coverUrl || ''
          }
        }
        return
      }
    }

    if (token === generateToken) {
      cleanup()
      generatedUrl.value = props.wallpaper.coverUrl || ''
    }
    return
  }

  if (props.file && typeof (props.file as any).getFile === 'function') {
    try {
      const file = await props.file.getFile()
      if (token !== generateToken) return
      const oldUrl = generatedUrl.value
      generatedUrl.value = URL.createObjectURL(file)
      if (oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl)
    } catch {
      if (token === generateToken) {
        generatedUrl.value = props.wallpaper.coverUrl || ''
      }
    }
  } else {
    if (token === generateToken) {
      generatedUrl.value = props.wallpaper.coverUrl || ''
    }
  }
}

function zoomIn() {
  scale.value = Math.min(3, scale.value + 0.25)
}

function zoomOut() {
  scale.value = Math.max(0.5, scale.value - 0.25)
}

function resetZoom() {
  scale.value = 1
}

function handleWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  scale.value = Math.min(3, Math.max(0.5, scale.value + delta))
}

async function toggleFullscreen() {
  const container = document.querySelector('.preview-modal')
  if (!container) return
  
  if (!document.fullscreenElement) {
    await container.requestFullscreen()
    isFullscreen.value = true
  } else {
    await document.exitFullscreen()
    isFullscreen.value = false
  }
}

function handleFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

watch(() => [props.visible, props.file, props.wallpaper], () => {
  scale.value = 1
  generateUrl()
}, { immediate: true })

function cleanup() {
  if (generatedUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(generatedUrl.value)
    generatedUrl.value = ''
  }
}

watch(() => props.visible, (val) => {
  if (!val) {
    cleanup()
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
  }
})

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  cleanup()
})
</script>

<style scoped>
.preview-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 1px solid var(--border);
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.control-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scale-label {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 50px;
  text-align: center;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: rgba(255, 67, 67, 0.2);
  color: #ff4343;
}

.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: hidden;
}

.preview-media {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: grab;
}

.image-container:active {
  cursor: grabbing;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.2s ease;
}

.preview-video {
  max-width: 100%;
  max-height: 100%;
  border-radius: 4px;
  background: #000;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 4px;
  background: #fff;
}

.preview-unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.preview-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.8);
  border-top: 1px solid var(--border);
}

.preview-type {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 3px 8px;
  background: var(--bg-hover-dark);
  border-radius: 3px;
}

.preview-file {
  font-size: 12px;
  color: var(--text-muted);
}

.preview-enter-active,
.preview-leave-active {
  transition: opacity 0.25s ease;
}

.preview-enter-from,
.preview-leave-to {
  opacity: 0;
}

:deep(.preview-modal:fullscreen) {
  background: #000;
}

:deep(.preview-modal:fullscreen) .preview-header,
:deep(.preview-modal:fullscreen) .preview-footer {
  background: rgba(0, 0, 0, 0.9);
}
</style>