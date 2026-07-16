<template>
  <aside class="detail-panel" :class="{ expanded: isExpanded }">
    <div class="mobile-handle" @click="togglePanel">
      <div class="mobile-handle-bar"></div>
    </div>
    <div v-if="wallpaper" class="panel-content">
      <div class="panel-cover">
        <img
          :src="wallpaper.coverUrl"
          :alt="wallpaper.name"
          class="cover-image"
          @error="onImageError"
        />
        <div class="cover-overlay"></div>
      </div>

      <div class="panel-info">
        <h2 class="panel-title">{{ wallpaper.name }}</h2>
        <div class="panel-meta">
          <span class="meta-category">{{ wallpaper.category }}</span>
          <span class="meta-type">{{ typeLabel }}</span>
        </div>

        <div v-if="wallpaper.authorSteamId" class="panel-author-inline" @click="$emit('openAuthor')" title="点击查看作者主页">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span class="author-label">作者</span>
          <span class="author-name">{{ wallpaper.authorName || '未知作者' }}</span>
          <svg class="author-link-icon" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <path d="M15 3h6v6M10 14L21 3"/>
          </svg>
        </div>

        <div class="panel-stats">
          <div class="stat-item">
            <span class="stat-value">{{ wallpaper.files.length }}</span>
            <span class="stat-label">文件数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ imageCount }}</span>
            <span class="stat-label">图片</span>
          </div>
        </div>

        <div v-if="wallpaper.description" class="panel-description">
          <div class="section-title">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
            描述
          </div>
          <p class="description-text">{{ wallpaper.description }}</p>
        </div>

        <div v-if="wallpaper.schemeColor" class="panel-scheme-color">
          <div class="section-title">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="13.5" cy="6.5" r=".5"/>
              <circle cx="17.5" cy="10.5" r=".5"/>
              <circle cx="8.5" cy="7.5" r=".5"/>
              <circle cx="6.5" cy="12.5" r=".5"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
            主题色
          </div>
          <div class="scheme-color-preview">
            <div class="color-block" :style="{ backgroundColor: schemeColorCss }"></div>
            <span class="color-value">{{ schemeColorHex }}</span>
          </div>
        </div>

        <div class="panel-tags">
          <span
            v-for="tag in tags"
            :key="tag"
            class="tag-item"
          >
            {{ tag }}
          </span>
        </div>

        <div class="panel-actions panel-actions-auto">
          <button v-if="protocolAvailable" class="action-btn primary" @click="setWallpaper">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span>设为壁纸</span>
          </button>
          <button v-if="protocolAvailable" class="action-btn" @click="$emit('addToPlaylist')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>加入播放列表</span>
          </button>
          <button class="action-btn" @click="$emit('openInWorkshop')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              <path d="M14 10V7a2 2 0 00-2-2H5"/>
            </svg>
            <span>在创意工坊打开</span>
          </button>
        </div>
        <div class="panel-actions">
          <button class="action-btn" @click="$emit('copyPath')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            <span>复制路径</span>
          </button>
          <button class="action-btn" @click="$emit('copyName')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 7V4a2 2 0 012-2h8.5L20 7.5V20a2 2 0 01-2 2H6a2 2 0 01-2-2v-3"/>
              <path d="M14 2v6h6"/>
            </svg>
            <span>复制名称</span>
          </button>
        </div>
        <div class="panel-actions">
          <button v-if="protocolAvailable" class="action-btn" @click="$emit('openFolder')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 7a2 2 0 012-2h4l2 3h8a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            <span>打开目录</span>
          </button>
          <button class="action-btn" @click="$emit('copyWallpaper')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            <span>复制壁纸</span>
          </button>
          <button class="action-btn" @click="$emit('moveWallpaper')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
            </svg>
            <span>移动壁纸</span>
          </button>
        </div>

        <div class="file-section">
          <div class="section-title">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
            文件系统
            <span class="file-count">{{ currentPath.length === 1 ? wallpaper.files.length : currentFiles.length }} 项</span>
          </div>
          
          <div class="file-breadcrumb" v-if="currentPath.length > 1">
            <button class="breadcrumb-item" @click="navigateUp">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              返回上级
            </button>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item">{{ currentPath[currentPath.length - 1] }}</span>
          </div>

          <div class="file-list">
            <div
              v-for="item in currentFiles"
              :key="item.name"
              class="file-item"
              :class="{ 'is-directory': item.kind === 'directory', 'is-selected': selectedFiles.has(item.name) }"
              @click="handleFileClick($event, item)"
              @dblclick="handleFileDoubleClick(item)"
              @pointerdown="onPointerDown($event, item)"
              @pointerup="onPointerUp"
              @pointercancel="onPointerCancel"
              @contextmenu.prevent="showFileContextMenu($event, item)"
            >
              <svg v-if="item.kind === 'directory'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="file-icon folder-icon">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="file-icon" :class="getFileIconClass(item.name)">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <span class="file-name">{{ item.name }}</span>
              <span v-if="item.kind === 'directory'" class="file-indicator">→</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-panel">
      <svg viewBox="0 0 64 64" width="60" height="60" fill="none" stroke="var(--text-muted)" stroke-width="1.5" opacity="0.4">
        <rect x="6" y="10" width="52" height="38" rx="4"/>
        <path d="M6 38l14-14 10 10 8-8 20 20"/>
        <circle cx="22" cy="24" r="4"/>
      </svg>
      <p>选择一个壁纸查看详情</p>
    </div>

    <Teleport to="body">
      <div
        v-if="fileContextMenu.visible"
        class="context-menu file-context-menu"
        :style="{ left: fileContextMenu.x + 'px', top: fileContextMenu.y + 'px' }"
        @click="fileContextMenu.visible = false"
        @mouseenter="emit('keepToast')"
        @mouseleave="emit('releaseToast')"
      >
        <div class="context-menu-header">
          <span class="ctx-wallpaper-name">{{ fileContextMenu.item?.name }}</span>
        </div>
        <div class="context-divider"></div>
        <button class="context-item" @click="copyFilePath">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          <span>复制文件路径</span>
        </button>
        <div class="context-divider"></div>
        <button class="context-item" @click="copySelectedFiles">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          <span>复制{{ selectedFiles.size > 1 ? `(${selectedFiles.size})` : '' }}</span>
        </button>
        <button class="context-item" @click="moveSelectedFiles">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
          </svg>
          <span>移动{{ selectedFiles.size > 1 ? `(${selectedFiles.size})` : '' }}</span>
        </button>
        <div class="context-divider"></div>
        <button v-if="canPreview(fileContextMenu.item)" class="context-item" @click="previewFile">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>{{ isVideoFile(fileContextMenu.item?.name) ? '播放' : '预览' }}</span>
        </button>
        <button v-if="protocolAvailable" class="context-item" @click="openFileFolder">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7a2 2 0 012-2h4l2 3h8a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
          <span>打开本地目录</span>
        </button>
      </div>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import type { WallpaperItem, WallpaperType } from '../utils/wallpaperScanner'
import { TYPE_LIST } from '../utils/wallpaperScanner'

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg']
const VIDEO_EXTS = ['.mp4', '.mkv', '.webm', '.avi', '.mov']
const WEB_EXTS = ['.html', '.htm']
const TEXT_EXTS = ['.json', '.txt', '.md', '.xml', '.csv', '.css', '.js', '.ts']

function isImageMimeType(type: string): boolean {
  return type.startsWith('image/')
}

function isVideoMimeType(type: string): boolean {
  return type.startsWith('video/')
}

function isWebMimeType(type: string): boolean {
  return type.startsWith('text/html') || type.startsWith('application/xhtml')
}

function isTextMimeType(type: string): boolean {
  return type.startsWith('text/') || 
         type === 'application/json' || 
         type === 'application/xml' ||
         type === 'application/javascript' ||
         type === 'application/typescript'
}

const TAG_TRANSLATION: Record<string, string> = {
  '4k': '4K',
  '720p': '720P',
  '1080p': '1080P',
  '2k': '2K',
  '60fps': '60FPS',
  '30fps': '30FPS',
  'animation': '动画',
  'anime': '动漫',
  'mute': '静音',
  'music': '音乐',
  'rainy': '雨天',
  'rain': '雨',
  'cyberpunk': '赛博朋克',
  'game': '游戏',
  'girl': '女性角色',
  'boy': '男性角色',
  'live': '动态',
  'audio': '音频响应',
  'audio-responsive': '音频响应',
  'customizable': '可自定义',
  'mobile': '兼容移动设备',
  'favorite': '收藏',
  'popular': '广受好评',
  'landscape': '风景',
  'nature': '自然',
  'abstract': '抽象',
  'space': '太空',
  'sci-fi': '科幻',
  'scifi': '科幻',
  'fantasy': '奇幻',
  'city': '城市',
  'night': '夜景',
  'dark': '暗色',
  'light': '亮色',
  'minimal': '极简',
  'minimalist': '极简',
  '3d': '3D',
  '3d-model': '3D模型',
  '2d': '2D',
  'particles': '粒子',
  'fire': '火焰',
  'water': '水',
  'smoke': '烟雾',
  'neon': '霓虹',
  'retro': '复古',
  'pixel': '像素',
  'pixel-art': '像素艺术',
  'vaporwave': '蒸汽波',
  'outrun': '合成波',
  'technology': '科技',
  'mecha': '机甲',
  'robot': '机器人',
  'car': '汽车',
  'vehicle': '载具',
  'cat': '猫',
  'dog': '狗',
  'animal': '动物',
  'flower': '花',
  'sunset': '日落',
  'sunrise': '日出',
  'ocean': '海洋',
  'mountain': '山脉',
  'forest': '森林',
  'snow': '雪',
  'winter': '冬季',
  'summer': '夏季',
  'spring': '春季',
  'autumn': '秋季',
  'fantasy art': '奇幻艺术',
  'digital art': '数字艺术',
  'photography': '摄影',
  'illustration': '插画',
  'painting': '绘画',
  'vector': '矢量',
  'gradient': '渐变',
  'blue': '蓝色',
  'red': '红色',
  'green': '绿色',
  'purple': '紫色',
  'pink': '粉色',
  'orange': '橙色',
  'white': '白色',
  'black': '黑色',
  'everyone': '大众级',
  'questionable': '家长指导级',
  'mature': '限制级',
  'hd': '高清',
  'hdr': 'HDR',
  'ultrawide': '超宽屏',
  'portrait': '竖屏',
  'dual-monitor': '双屏',
  'triple-monitor': '三屏',
  'multi-monitor': '多屏',
  'web': '网页',
  'application': '应用程序',
  'clock': '时钟',
  'calendar': '日历',
  'clock-and-date': '时钟与日期',
  'system-monitor': '系统监控',
  'equalizer': '均衡器',
  'visualizer': '可视化',
  'interactive': '可交互',
  'loop': '循环',
  'seamless': '无缝',
  'glitch': '故障艺术',
  'glass': '玻璃',
  'metal': '金属',
  'wood': '木纹',
  'leaves': '树叶',
  'stars': '星空',
  'galaxy': '银河',
  'planet': '星球',
  'moon': '月亮',
  'sun': '太阳',
  'clouds': '云',
  'lightning': '闪电',
  'storm': '暴风雨',
  'wind': '风',
  'fog': '雾',
  'fantasy-world': '奇幻世界',
  'medieval': '中世纪',
  'futuristic': '未来主义',
  'dystopian': '反乌托邦',
  'utopian': '乌托邦',
  'apocalyptic': '末世',
  'post-apocalyptic': '后末日',
  'steampunk': '蒸汽朋克',
  'dieselpunk': '柴油朋克',
  'biopunk': '生化朋克',
  'synthwave': '合成波',
  'chillwave': '冷波',
  'low-poly': '低多边形',
  'isometric': '等距',
  'top-down': '俯视',
  'side-scroll': '横版',
  'parallax': '视差',
  'cinematic': '电影级',
  'realistic': '写实',
  'cartoon': '卡通',
  'comic': '漫画',
  'manga': '漫画',
  'hand-drawn': '手绘',
  'sketch': '素描',
  'watercolor': '水彩',
  'oil-painting': '油画',
  'cgi': 'CGI',
  'render': '渲染',
  'blender': 'Blender',
  'unreal': '虚幻引擎',
  'unity': 'Unity',
  'after-effects': 'AE',
  'problem': '有问题',
  'vision': '视觉',
}

const props = defineProps<{
  wallpaper: WallpaperItem | null
  protocolAvailable?: boolean
}>()

const emit = defineEmits<{
  copyPath: []
  copyName: []
  setWallpaper: []
  addToPlaylist: []
  openFolder: [subPath?: string]
  openInWorkshop: []
  openAuthor: []
  previewFile: [file: FileSystemFileHandle]
  keepToast: []
  releaseToast: []
  showToast: [message: string]
  copyWallpaper: []
  moveWallpaper: []
}>()

interface FileSystemItem {
  name: string
  kind: 'file' | 'directory'
  handle: FileSystemFileHandle | FileSystemDirectoryHandle
  type?: string
}

const isExpanded = ref(false)
const currentPath = ref<string[]>(['壁纸目录'])
const currentFiles = ref<FileSystemItem[]>([])
const currentDirHandle = ref<FileSystemDirectoryHandle | null>(null)
const dirHandleStack = ref<FileSystemDirectoryHandle[]>([])
const selectedFiles = ref<Set<string>>(new Set())
const lastSelectedIndex = ref(-1)

function togglePanel() {
  isExpanded.value = !isExpanded.value
}

function expandPanel() {
  isExpanded.value = true
}

const typeLabel = computed(() => {
  if (!props.wallpaper) return ''
  const type = TYPE_LIST.find(t => t.key === props.wallpaper?.type)
  return type?.name || ''
})

const imageCount = computed(() => {
  if (!props.wallpaper) return 0
  return props.wallpaper.files.filter(f =>
    IMAGE_EXTS.some(ext => f.name.toLowerCase().endsWith(ext))
  ).length
})

const tags = computed(() => {
  if (!props.wallpaper) return []
  if (props.wallpaper.tags.length > 0) {
    return props.wallpaper.tags
      .filter(t => !['Everyone', 'Questionable', 'Mature', 'everyone', 'questionable', 'mature'].includes(t))
      .map(t => TAG_TRANSLATION[t.toLowerCase()] || t)
  }
  const name = props.wallpaper.name.toLowerCase()
  const tagList: string[] = []
  if (name.includes('4k')) tagList.push('4K')
  if (name.includes('60fps') || name.includes('fps')) tagList.push('60FPS')
  if (name.includes('hd') || name.includes('hdr')) tagList.push('HD')
  if (name.includes('live')) tagList.push('动态')
  if (name.includes('audio') || name.includes('音乐')) tagList.push('音频响应')
  return tagList
})

const schemeColorCss = computed(() => {
  if (!props.wallpaper?.schemeColor) return '#ccc'
  const parts = props.wallpaper.schemeColor.trim().split(/\s+/)
  if (parts.length >= 3) {
    const r = Math.round(parseFloat(parts[0]) * 255)
    const g = Math.round(parseFloat(parts[1]) * 255)
    const b = Math.round(parseFloat(parts[2]) * 255)
    return `rgb(${r}, ${g}, ${b})`
  }
  return '#ccc'
})

const schemeColorHex = computed(() => {
  if (!props.wallpaper?.schemeColor) return ''
  const parts = props.wallpaper.schemeColor.trim().split(/\s+/)
  if (parts.length >= 3) {
    const toHex = (v: string) => {
      const n = Math.min(255, Math.max(0, Math.round(parseFloat(v) * 255)))
      return n.toString(16).padStart(2, '0')
    }
    return `#${toHex(parts[0])}${toHex(parts[1])}${toHex(parts[2])}`.toUpperCase()
  }
  return props.wallpaper.schemeColor
})

async function loadFiles(dirHandle: FileSystemDirectoryHandle) {
  currentDirHandle.value = dirHandle
  const items: FileSystemItem[] = []
  
  for await (const [name, handle] of dirHandle.entries()) {
    items.push({
      name,
      kind: handle.kind as 'file' | 'directory',
      handle
    })
  }
  
  items.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'directory' ? -1 : 1
    }
    return a.name.localeCompare(b.name, 'zh-CN')
  })
  
  currentFiles.value = items
}

function handleFileClick(e: MouseEvent, item: FileSystemItem) {
  expandPanel()
  const currentIndex = currentFiles.value.findIndex(i => i.name === item.name)

  if (e.shiftKey && lastSelectedIndex.value !== -1) {
    const start = Math.min(lastSelectedIndex.value, currentIndex)
    const end = Math.max(lastSelectedIndex.value, currentIndex)
    selectedFiles.value.clear()
    currentFiles.value.slice(start, end + 1).forEach(i => {
      selectedFiles.value.add(i.name)
    })
  } else if (e.ctrlKey || e.metaKey) {
    if (selectedFiles.value.has(item.name)) {
      selectedFiles.value.delete(item.name)
    } else {
      selectedFiles.value.add(item.name)
    }
    lastSelectedIndex.value = currentIndex
  } else if (item.kind === 'directory') {
    selectedFiles.value.clear()
    lastSelectedIndex.value = -1
    const dirHandle = item.handle as FileSystemDirectoryHandle
    if (currentDirHandle.value) {
      dirHandleStack.value.push(currentDirHandle.value)
    }
    currentPath.value.push(item.name)
    loadFiles(dirHandle)
  } else {
    selectedFiles.value.clear()
    selectedFiles.value.add(item.name)
    lastSelectedIndex.value = currentIndex
  }
}

function handleFileDoubleClick(item: FileSystemItem) {
  expandPanel()
  if (item.kind === 'file' && canPreview(item)) {
    emit('previewFile', item.handle as FileSystemFileHandle)
  }
}

function navigateUp() {
  if (currentPath.value.length <= 1) return
  currentPath.value.pop()
  selectedFiles.value.clear()
  lastSelectedIndex.value = -1
  if (currentPath.value.length === 1 && props.wallpaper?.folderHandle) {
    dirHandleStack.value = []
    loadFiles(props.wallpaper.folderHandle)
  } else if (dirHandleStack.value.length > 0) {
    const parentHandle = dirHandleStack.value.pop()!
    loadFiles(parentHandle)
  }
}

function getFileIconClass(name: string): string {
  const lower = name.toLowerCase()
  if (IMAGE_EXTS.some(e => lower.endsWith(e))) return 'image-icon'
  if (VIDEO_EXTS.some(e => lower.endsWith(e))) return 'video-icon'
  if (WEB_EXTS.some(e => lower.endsWith(e))) return 'web-icon'
  if (lower.endsWith('.json')) return 'json-icon'
  return ''
}

function canPreview(item: FileSystemItem | null): boolean {
  if (!item || item.kind !== 'file') return false
  if (item.type) {
    return isImageMimeType(item.type) || isVideoMimeType(item.type) || 
           isWebMimeType(item.type) || isTextMimeType(item.type)
  }
  const lower = item.name.toLowerCase()
  return IMAGE_EXTS.some(e => lower.endsWith(e)) || 
         VIDEO_EXTS.some(e => lower.endsWith(e)) || 
         WEB_EXTS.some(e => lower.endsWith(e)) ||
         TEXT_EXTS.some(e => lower.endsWith(e))
}

function isVideoFile(name: string | undefined): boolean {
  if (!name) return false
  return VIDEO_EXTS.some(e => name.toLowerCase().endsWith(e))
}

const fileContextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  item: null as FileSystemItem | null
})

const LONG_PRESS_DURATION = 500
let pressTimer: ReturnType<typeof setTimeout> | null = null
let pressStartX = 0
let pressStartY = 0
let pressTargetItem: FileSystemItem | null = null

function onPointerDown(e: PointerEvent, item: FileSystemItem) {
  e.preventDefault()
  pressTargetItem = item
  pressStartX = e.clientX
  pressStartY = e.clientY
  pressTimer = setTimeout(() => {
    if (pressTargetItem) {
      showFileContextMenuAt(pressStartX, pressStartY, pressTargetItem)
    }
    pressTimer = null
  }, LONG_PRESS_DURATION)
}

function onPointerUp() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
  pressTargetItem = null
}

function onPointerCancel() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
  pressTargetItem = null
}

function showFileContextMenuAt(x: number, y: number, item: FileSystemItem) {
  expandPanel()
  fileContextMenu.visible = true
  fileContextMenu.x = x
  fileContextMenu.y = y
  fileContextMenu.item = item

  requestAnimationFrame(() => {
    const menuEl = document.querySelector('.file-context-menu') as HTMLElement
    if (menuEl) {
      const rect = menuEl.getBoundingClientRect()
      if (rect.right > window.innerWidth) {
        fileContextMenu.x = Math.max(0, x - rect.width)
      }
      if (rect.bottom > window.innerHeight) {
        fileContextMenu.y = Math.max(0, y - rect.height)
      }
    }
  })
}

function showFileContextMenu(e: MouseEvent, item: FileSystemItem) {
  if (!selectedFiles.value.has(item.name)) {
    selectedFiles.value.clear()
    selectedFiles.value.add(item.name)
    lastSelectedIndex.value = currentFiles.value.findIndex(i => i.name === item.name)
  }
  showFileContextMenuAt(e.clientX, e.clientY, item)
}

function setWallpaper() {
  if (!props.wallpaper) return
  emit('setWallpaper')
}

async function copyFilePath() {
  if (!fileContextMenu.item || !props.wallpaper) return
  try {
    const segments = ['steamapps', 'workshop', 'content', '431960', props.wallpaper.folderName, ...currentPath.value.slice(1), fileContextMenu.item.name]
    const path = segments.join('\\')
    await navigator.clipboard.writeText(path)
    emit('showToast', '文件路径已复制到剪贴板')
  } catch {
    emit('showToast', '复制失败')
  }
}

function previewFile() {
  if (fileContextMenu.item && fileContextMenu.item.kind === 'file') {
    emit('previewFile', fileContextMenu.item.handle as FileSystemFileHandle)
  }
}

function openFileFolder() {
  if (!props.wallpaper) return
  const item = fileContextMenu.item
  if (item) {
    const parts = currentPath.value.slice(1)
    if (item.kind === 'directory') {
      parts.push(item.name)
    }
    emit('openFolder', parts.join('/'))
  } else {
    emit('openFolder')
  }
  fileContextMenu.visible = false
}

async function copyFile(fileHandle: FileSystemFileHandle, targetDir: FileSystemDirectoryHandle, fileName: string) {
  const file = await fileHandle.getFile()
  const targetHandle = await targetDir.getFileHandle(fileName, { create: true })
  const writable = await targetHandle.createWritable()
  try {
    await file.stream().pipeTo(writable)
  } catch (err) {
    try { await writable.close() } catch { /* ignore */ }
    throw err
  }
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

async function copyDirectoryRecursive(sourceDir: FileSystemDirectoryHandle, targetDir: FileSystemDirectoryHandle, dirName: string) {
  const newDir = await targetDir.getDirectoryHandle(dirName, { create: true })
  const tasks: CopyTask[] = []
  await collectCopyTasks(sourceDir, newDir, tasks)
  await mapWithConcurrency(tasks, COPY_CONCURRENCY, async (task) => {
    await copyFile(task.sourceHandle, task.targetDir, task.name)
  })
}

async function tryMoveEntry(handle: FileSystemHandle, targetDir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  const moveFn = (handle as any).move
  if (typeof moveFn !== 'function') return false
  try {
    await moveFn.call(handle, targetDir, name)
    return true
  } catch {
    return false
  }
}

async function copySelectedFiles() {
  if (selectedFiles.value.size === 0) {
    fileContextMenu.visible = false
    return
  }
  try {
    const targetDir = await window.showDirectoryPicker({ mode: 'readwrite' })
    const selectedItems = currentFiles.value.filter(i => selectedFiles.value.has(i.name))

    await mapWithConcurrency(selectedItems, COPY_CONCURRENCY, async (item) => {
      if (item.kind === 'directory') {
        await copyDirectoryRecursive(
          item.handle as FileSystemDirectoryHandle,
          targetDir,
          item.name
        )
      } else {
        await copyFile(item.handle as FileSystemFileHandle, targetDir, item.name)
      }
    })

    emit('showToast', `已复制 ${selectedItems.length} 个文件/目录`)
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      const msg = (err as Error).message || (err as Error).name || '未知错误'
      emit('showToast', `复制失败: ${msg}`)
    }
  } finally {
    fileContextMenu.visible = false
  }
}

async function deleteEntry(parentDir: FileSystemDirectoryHandle, name: string, kind: 'file' | 'directory') {
  if (kind === 'directory') {
    await parentDir.removeEntry(name, { recursive: true })
  } else {
    await parentDir.removeEntry(name)
  }
}

async function moveSelectedFiles() {
  if (selectedFiles.value.size === 0 || !currentDirHandle.value) {
    fileContextMenu.visible = false
    return
  }
  try {
    const targetDir = await window.showDirectoryPicker({ mode: 'readwrite' })
    const selectedItems = currentFiles.value.filter(i => selectedFiles.value.has(i.name))
    const movedItems: FileSystemItem[] = []
    const copiedItems: FileSystemItem[] = []

    for (const item of selectedItems) {
      const moved = await tryMoveEntry(item.handle as FileSystemHandle, targetDir, item.name)
      if (moved) {
        movedItems.push(item)
      } else {
        copiedItems.push(item)
      }
    }

    for (const item of copiedItems) {
      try {
        if (item.kind === 'directory') {
          await copyDirectoryRecursive(
            item.handle as FileSystemDirectoryHandle,
            targetDir,
            item.name
          )
        } else {
          await copyFile(item.handle as FileSystemFileHandle, targetDir, item.name)
        }
      } catch (err) {
        const msg = (err as Error).message || (err as Error).name || '未知错误'
        emit('showToast', `移动失败: ${item.name} - ${msg}`)
        throw err
      }
    }

    for (const item of copiedItems) {
      try {
        await deleteEntry(currentDirHandle.value!, item.name, item.kind)
      } catch {
        // 删除失败不影响整体结果，文件已复制成功
      }
    }

    selectedFiles.value.clear()
    lastSelectedIndex.value = -1
    await loadFiles(currentDirHandle.value!)

    const total = movedItems.length + copiedItems.length
    const moveHint = movedItems.length > 0 ? `（${movedItems.length} 个秒移）` : ''
    emit('showToast', `已移动 ${total} 个文件/目录${moveHint}`)
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      const msg = (err as Error).message || (err as Error).name || '未知错误'
      emit('showToast', `移动失败: ${msg}`)
    }
  } finally {
    fileContextMenu.visible = false
  }
}

function onDocumentClick() {
  fileContextMenu.visible = false
}

watch(() => props.wallpaper, (newWallpaper) => {
  dirHandleStack.value = []
  selectedFiles.value.clear()
  lastSelectedIndex.value = -1
  if (newWallpaper?.folderHandle) {
    currentPath.value = ['壁纸目录']
    loadFiles(newWallpaper.folderHandle)
    expandPanel()
  } else {
    currentPath.value = ['壁纸目录']
    currentFiles.value = []
  }
}, { immediate: true })

// folderHandle 异步加载后重新加载文件列表
watch(() => props.wallpaper?.folderHandle, (newHandle, oldHandle) => {
  if (newHandle && !oldHandle && props.wallpaper) {
    currentPath.value = ['壁纸目录']
    loadFiles(newHandle)
  }
})

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

function onImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" fill="#f2f2f2"><rect width="400" height="250"/><text x="200" y="130" text-anchor="middle" fill="#8a8a8a" font-size="16" font-family="sans-serif">无封面</text></svg>')
}
</script>

<style scoped lang="scss">
.detail-panel {
  width: 360px;
  min-width: 360px;
  height: 100vh;
  background: var(--bg-tertiary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &.expanded {
    // handled in media query
  }
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;

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

.panel-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  flex-shrink: 0;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(14, 20, 27, 0.9) 0%, rgba(14, 20, 27, 0.5) 60%, transparent 100%);
}

.panel-info {
  padding: 14px 16px;
  flex: 1;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 6px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.panel-meta {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.meta-category {
  font-size: 12px;
  color: var(--accent-dark);
  background: rgba(0, 120, 212, 0.12);
  padding: 3px 8px;
  border-radius: 3px;
}

.meta-type {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-hover-dark);
  padding: 3px 8px;
  border-radius: 3px;
}

.panel-author-inline {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-hover-dark);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 12px;
  max-width: 100%;
  min-width: 0;
}

.panel-author-inline:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
}

.panel-author-inline svg:first-child {
  flex-shrink: 0;
  color: var(--text-muted);
}

.author-label {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.panel-author-inline .author-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--accent-dark);
  font-weight: 500;
}

.panel-author-inline .author-link-icon {
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0.4;
  transition: all 0.15s ease;
}

.panel-author-inline:hover .author-link-icon {
  color: var(--accent);
  opacity: 0.8;
}

.panel-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
}

.tag-item {
  font-size: 11px;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.03);
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid var(--border);
}

.panel-description {
  margin-bottom: 10px;
}

.description-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-top: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-height: 120px;
  overflow-y: auto;
  overflow-x: hidden;
}

.panel-scheme-color {
  margin-bottom: 10px;
}

.scheme-color-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.color-block {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.color-value {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
}

.panel-actions {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;

  &.panel-actions-auto {
    .action-btn {
      flex: auto;
    }
  }
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-light);
  }

  &.primary {
    background: rgba(0, 120, 212, 0.08);
    border-color: var(--accent);
    color: var(--accent);

    &:hover {
      background: rgba(0, 120, 212, 0.15);
    }
  }
}

.file-section {
  border-top: 1px solid var(--border);
  padding-top: 10px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.file-count {
  margin-left: auto;
  font-weight: normal;
  text-transform: none;
  letter-spacing: normal;
}

.file-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  padding: 6px 8px;
  background: var(--bg-hover-dark);
  border-radius: 4px;
  font-size: 12px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;

  &:hover {
    text-decoration: underline;
  }
}

.breadcrumb-separator {
  color: var(--text-muted);
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 480px;
  overflow-y: auto;

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
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.15s ease;
  cursor: pointer;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  border: 1px solid transparent;

  &:hover {
    background: var(--bg-hover);
  }

  &.is-directory {
    font-weight: 500;
  }

  &.is-selected {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.4);

    &:hover {
      background: rgba(59, 130, 246, 0.2);
    }
  }
}

.file-icon {
  flex-shrink: 0;
  opacity: 0.6;
}

.folder-icon {
  color: #ffaa44;
}

.image-icon {
  color: #107c10;
}

.video-icon {
  color: #d13438;
}

.web-icon {
  color: #0078d4;
}

.json-icon {
  color: #7c4dff;
}

.file-name {
  flex: 1;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-indicator {
  font-size: 12px;
  color: var(--text-muted);
}

.empty-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  text-align: center;

  p {
    font-size: 13px;
    color: var(--text-muted);
  }
}

.file-context-menu {
  min-width: 180px;
}

.mobile-handle {
  display: none;
}

// Tablet
@media (max-width: 1024px) {
  .detail-panel {
    width: 320px;
    min-width: 320px;
  }
}

// Mobile
@media (max-width: 768px) {
  .detail-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    min-width: 100%;
    height: 70vh;
    border-left: none;
    border-top: 1px solid var(--border);
    border-radius: 16px 16px 0 0;
    transform: translateY(calc(100% - 52px));
    transition: transform 0.3s ease;
    z-index: 900;
    background: var(--bg-secondary);
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);

    &.expanded {
      transform: translateY(0);
    }
  }

  .mobile-handle {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 28px;
    padding: 12px 0 4px;
    cursor: pointer;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .mobile-handle-bar {
    width: 40px;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
  }

  .panel-content {
    padding-top: 16px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .panel-cover {
    display: none;
  }

  .panel-info {
    padding: 10px 14px;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .panel-title {
    font-size: 15px;
    margin-bottom: 6px;
  }

  .panel-meta {
    margin-bottom: 8px;
  }

  .panel-author-inline {
    margin-bottom: 8px;
  }

  .panel-stats {
    gap: 16px;
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 18px;
  }

  .panel-tags {
    margin-bottom: 8px;
  }

  .panel-description {
    margin-bottom: 8px;
  }

  .panel-scheme-color {
    margin-bottom: 8px;
  }

  .action-btn {
    padding: 6px;
    font-size: 12px;
  }

  .file-section {
    flex: 1;
    min-height: 150px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .file-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    max-height: none;
  }

  .empty-panel {
    padding: 24px;

    svg {
      width: 40px;
      height: 40px;
    }

    p {
      font-size: 12px;
    }
  }
}
</style>