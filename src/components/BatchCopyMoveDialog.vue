<template>
  <Teleport to="body">
    <Transition name="cm-fade">
      <div v-if="visible" class="cm-overlay">
        <div class="cm-dialog">
          <div class="cm-header">
            <h3>{{ mode === 'copy' ? '批量复制壁纸' : '批量移动壁纸' }}</h3>
            <button class="cm-close" @click="$emit('cancel')" :disabled="processing">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div v-if="mode === 'move'" class="cm-warning-bar">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>移动该壁纸暂时未实现同步在 Wallpaper Engine 中取消订阅，需用户手动操作</span>
          </div>

          <div class="cm-body">
            <div class="cm-table-wrapper custom-scrollbar">
              <table class="cm-table">
                <thead>
                  <tr>
                    <th class="cm-col-name">壁纸名称</th>
                    <th class="cm-col-type">类型</th>
                    <th class="cm-col-rating">分级</th>
                    <th class="cm-col-dir">目录名称</th>
                    <th class="cm-col-target">目标位置</th>
                    <th class="cm-col-conflict">同名操作</th>
                    <th class="cm-col-flag">同名标识</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in pagedItems" :key="item.wallpaper.id">
                    <td class="cm-col-name">
                      <span class="cm-name-label" :title="item.wallpaper.name">{{ item.wallpaper.name }}</span>
                    </td>
                    <td class="cm-col-type">{{ typeLabels[item.wallpaper.type] || item.wallpaper.type }}</td>
                    <td class="cm-col-rating">{{ ratingLabels[item.wallpaper.contentRating] || item.wallpaper.contentRating }}</td>
                    <td class="cm-col-dir">
                      <input
                        v-model="item.dirName"
                        type="text"
                        class="cm-dir-input"
                        :disabled="processing"
                        @input="onDirNameChange(item)"
                      />
                    </td>
                    <td class="cm-col-target">
                      <button class="cm-target-btn" @click="changeItemTargetDir(item)" :disabled="processing">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 7a2 2 0 012-2h4l2 3h8a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                        </svg>
                        <span :title="item.targetDirName || '未选择'">{{ item.targetDirName || '选择' }}</span>
                      </button>
                    </td>
                    <td class="cm-col-conflict">
                      <div v-if="item.hasConflict" class="cm-conflict-group">
                        <label class="cm-conflict-option cm-option-left" :class="{ active: item.conflictMode === 'replace' }">
                          <input type="radio" v-model="item.conflictMode" value="replace" :disabled="processing" />
                          <span>替换</span>
                        </label>
                        <label class="cm-conflict-option cm-option-right" :class="{ active: item.conflictMode === 'merge' }">
                          <input type="radio" v-model="item.conflictMode" value="merge" :disabled="processing" />
                          <span>合并</span>
                        </label>
                      </div>
                    </td>
                    <td class="cm-col-flag">
                      <div v-if="item.hasConflict" class="cm-conflict-badge" :title="item.conflictText">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ef4444" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                      </div>
                      <div v-else class="cm-ok-badge">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#22c55e" stroke-width="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="totalPages > 1" class="cm-pagination">
              <button class="cm-page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div class="cm-page-jump">
                <input
                  ref="pageInput"
                  v-model="jumpPage"
                  type="text"
                  class="cm-page-input"
                  @blur="onJumpBlur"
                  @keyup.enter="onJumpEnter"
                  :disabled="processing"
                />
                <span class="cm-page-sep">/</span>
                <span class="cm-page-total">{{ totalPages }}</span>
              </div>
              <button class="cm-page-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>

            <div v-if="processing" class="cm-processing">
              <svg class="cm-spinner" viewBox="0 0 20 20" width="16" height="16" fill="none">
                <circle cx="10" cy="10" r="8" stroke="var(--border)" stroke-width="2" opacity="0.2"/>
                <circle cx="10" cy="10" r="8" stroke="var(--accent)" stroke-width="2" stroke-dasharray="35" stroke-linecap="round" class="cm-spinner-arc"/>
              </svg>
              <span>{{ mode === 'copy' ? '正在复制' : '正在移动' }} {{ progress.current }}/{{ progress.total }} 个壁纸<span v-if="fileProgress.total > 0" class="cm-file-progress">（{{ fileProgress.current }}/{{ fileProgress.total }} 文件）</span></span>
            </div>
          </div>

          <div class="cm-footer">
            <button class="cm-btn cm-btn-cancel" @click="$emit('cancel')" :disabled="processing">取消</button>
            <button
              class="cm-btn cm-btn-confirm"
              @click="onConfirm"
              :disabled="processing || !canConfirm"
            >
              {{ processing ? '处理中...' : '确定' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { WallpaperItem } from '../utils/wallpaperScanner'

const props = defineProps<{
  visible: boolean
  mode: 'copy' | 'move'
  wallpapers: WallpaperItem[]
  defaultTargetDirName: string
  defaultTargetDirHandle: FileSystemDirectoryHandle | null
  processing: boolean
  progress: { current: number; total: number }
  fileProgress: { current: number; total: number }
}>()

const emit = defineEmits<{
  confirm: [items: { wallpaper: WallpaperItem; dirName: string; conflictMode: 'replace' | 'merge'; targetDirHandle: FileSystemDirectoryHandle }[]]
  cancel: []
}>()

const typeLabels: Record<string, string> = {
  'scene': '场景',
  'video': '视频',
  'web': '网页',
  'application': '应用'
}

const ratingLabels: Record<string, string> = {
  'Everyone': '大众级',
  'Teen': '青少年级',
  'Questionable': '家长指导级',
  'Mature': '限制级',
  'AdultsOnly': '限制级'
}

interface BatchItem {
  wallpaper: WallpaperItem
  dirName: string
  conflictMode: 'replace' | 'merge'
  targetDirHandle: FileSystemDirectoryHandle
  targetDirName: string
  nameExistsInTarget: boolean
  nameExistsInBatch: boolean
  hasConflict: boolean
  conflictText: string
}

const items = ref<BatchItem[]>([])
const currentPage = ref(1)
const pageSize = 10
const jumpPage = ref('1')

watch(() => props.visible, (v) => {
  if (v) {
    currentPage.value = 1
    jumpPage.value = '1'
    items.value = props.wallpapers.map(wp => ({
      wallpaper: wp,
      dirName: wp.folderName,
      conflictMode: 'replace' as const,
      targetDirHandle: props.defaultTargetDirHandle!,
      targetDirName: props.defaultTargetDirName,
      nameExistsInTarget: false,
      nameExistsInBatch: false
    }))
    validateAllNames()
  }
})

async function validateAllNames() {
  for (const item of items.value) {
    if (!item.dirName.trim()) {
      item.nameExistsInTarget = false
      item.nameExistsInBatch = false
      item.hasConflict = false
      item.conflictText = ''
      continue
    }

    try {
      await item.targetDirHandle.getDirectoryHandle(item.dirName.trim())
      item.nameExistsInTarget = true
    } catch {
      item.nameExistsInTarget = false
    }

    const count = items.value.filter(i => i !== item && i.dirName.trim() === item.dirName.trim() && i.targetDirName === item.targetDirName).length
    item.nameExistsInBatch = count > 0

    item.hasConflict = item.nameExistsInTarget || item.nameExistsInBatch
    const parts: string[] = []
    if (item.nameExistsInTarget) parts.push('目标位置存在同名')
    if (item.nameExistsInBatch) parts.push('列表内存在同名')
    item.conflictText = parts.join('; ')
  }
}

async function onDirNameChange(item: BatchItem) {
  const trimmed = item.dirName.trim()
  if (!trimmed) {
    item.nameExistsInTarget = false
    item.nameExistsInBatch = false
    item.hasConflict = false
    item.conflictText = ''
    return
  }

  try {
    await item.targetDirHandle.getDirectoryHandle(trimmed)
    item.nameExistsInTarget = true
  } catch {
    item.nameExistsInTarget = false
  }

  const count = items.value.filter(i => i !== item && i.dirName.trim() === trimmed && i.targetDirName === item.targetDirName).length
  item.nameExistsInBatch = count > 0

  item.hasConflict = item.nameExistsInTarget || item.nameExistsInBatch
  const parts: string[] = []
  if (item.nameExistsInTarget) parts.push('目标位置存在同名')
  if (item.nameExistsInBatch) parts.push('列表内存在同名')
  item.conflictText = parts.join('; ')

  // 重新验证同目标位置下与当前名称相同的其他条目
  for (const other of items.value) {
    if (other === item) continue
    if (other.targetDirName !== item.targetDirName) continue
    const otherCount = items.value.filter(i => i !== other && i.dirName.trim() === other.dirName.trim() && i.targetDirName === other.targetDirName).length
    const wasBatchConflict = other.nameExistsInBatch
    other.nameExistsInBatch = otherCount > 0
    if (wasBatchConflict !== other.nameExistsInBatch) {
      other.hasConflict = other.nameExistsInTarget || other.nameExistsInBatch
      const op: string[] = []
      if (other.nameExistsInTarget) op.push('目标位置存在同名')
      if (other.nameExistsInBatch) op.push('列表内存在同名')
      other.conflictText = op.join('; ')
    }
  }
}

async function changeItemTargetDir(item: BatchItem) {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    item.targetDirHandle = handle
    item.targetDirName = handle.name
    await onDirNameChange(item)
  } catch {
    // cancelled
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize)))

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return items.value.slice(start, start + pageSize)
})

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  jumpPage.value = String(page)
}

function onJumpBlur() {
  const val = parseInt(jumpPage.value)
  if (isNaN(val) || val < 1) {
    jumpPage.value = String(currentPage.value)
    return
  }
  const target = Math.min(val, totalPages.value)
  goToPage(target)
}

function onJumpEnter() {
  onJumpBlur()
}

const canConfirm = computed(() => {
  return items.value.every(item => item.dirName.trim() && item.targetDirHandle) && props.wallpapers.length > 0
})

function onConfirm() {
  const result = items.value.map(item => ({
    wallpaper: item.wallpaper,
    dirName: item.dirName.trim(),
    conflictMode: item.hasConflict ? item.conflictMode : 'replace',
    targetDirHandle: item.targetDirHandle
  }))
  emit('confirm', result)
}
</script>

<style scoped lang="scss">
.cm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.cm-dialog {
  width: 900px;
  max-width: 95vw;
  max-height: 85vh;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.cm-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;

  &:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.cm-warning-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: rgba(59, 130, 246, 0.08);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  flex-shrink: 0;

  span {
    white-space: nowrap;
    font-size: 11px;
    color: #3b82f6;
    line-height: 1.4;
  }

  svg {
    flex-shrink: 0;
    color: #3b82f6;
  }
}

.cm-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.cm-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 6px;
}

.cm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  min-width: 850px;
  table-layout: fixed;
}

.cm-table thead {
  background: var(--bg-hover-dark);

  th {
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
    color: var(--text-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
}

.cm-table tbody {
  tr {
    border-bottom: 1px solid var(--border);

    &:hover {
      background: rgba(0, 0, 0, 0.03);
    }

    &:last-child {
      border-bottom: none;
    }
  }

  td {
    padding: 6px 8px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.cm-col-name {
  width: 150px;
}

.cm-col-type {
  width: 60px;
}

.cm-col-rating {
  width: 60px;
}

.cm-col-dir {
  width: 130px;
}

.cm-col-target {
  width: 110px;
}

.cm-col-conflict {
  width: 100px;
}

.cm-col-flag {
  width: 50px;
}

.cm-cell-name {
  .cm-name-label {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 150px;
    font-size: 12px;
    color: var(--text-primary);
    font-weight: 500;
  }
}

.cm-dir-input {
  width: 110px;
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 11px;
  font-family: inherit;
  outline: none;

  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.cm-cell-target {
  min-width: 100px;
}

.cm-target-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--bg-hover-dark);
    color: var(--text-primary);
    border-color: var(--border-light);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  span {
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.cm-cell-flag {
  width: 40px;
  text-align: center;
}

.cm-conflict-badge,
.cm-ok-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.cm-conflict-badge {
  background: rgba(239, 68, 68, 0.1);
}

.cm-ok-badge {
  background: rgba(34, 197, 94, 0.1);
}

.cm-cell-conflict {
  width: 100px;
}

.cm-conflict-group {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.cm-conflict-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;

  input {
    display: none;
  }

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.08);
  }

  &.active {
    background: var(--accent);
    color: #fff;
  }

  &:not(:disabled).active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    background: #fff;
    border-radius: 50%;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &.cm-option-left {
    border-right: 1px solid var(--border);
  }
}

.cm-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
}

.cm-page-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-hover);
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--bg-hover-dark);
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.cm-page-jump {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.cm-page-input {
  width: 40px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  text-align: center;
  outline: none;

  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.cm-page-sep {
  color: var(--text-muted);
}

.cm-page-total {
  min-width: 16px;
  text-align: left;
}

.cm-processing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 0;
  margin-top: 8px;

  span {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.cm-file-progress {
  color: var(--text-muted);
  font-size: 11px;
}

.cm-spinner {
  flex-shrink: 0;
  animation: cm-spin 1s linear infinite;
}

.cm-spinner-arc {
  animation: cm-spin 1s linear infinite;
  transform-origin: center;
}

@keyframes cm-spin {
  to { transform: rotate(360deg); }
}

.cm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.cm-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.cm-btn-cancel {
  background: var(--bg-hover);
  color: var(--text-secondary);

  &:hover:not(:disabled) {
    background: var(--bg-hover-dark);
    color: var(--text-primary);
  }
}

.cm-btn-confirm {
  background: var(--accent);
  color: #fff;

  &:hover:not(:disabled) {
    background: var(--accent-dark);
  }
}

.cm-fade-enter-active,
.cm-fade-leave-active {
  transition: opacity 0.2s ease;

  .cm-dialog {
    transition: transform 0.2s ease;
  }
}

.cm-fade-enter-from,
.cm-fade-leave-to {
  opacity: 0;

  .cm-dialog {
    transform: scale(0.95);
  }
}

@media (max-width: 768px) {
  .cm-dialog {
    width: 96vw;
    max-height: 90vh;
  }

  .cm-body {
    padding: 10px 12px;
  }

  .cm-header,
  .cm-warning-bar {
    padding: 10px 12px;
  }

  .cm-warning-bar {
    span {
      font-size: 11px;
    }
  }

  .cm-footer {
    padding: 10px 12px;
  }

  .cm-dir-input {
    width: 100%;
  }

  .cm-cell-conflict {
    width: auto;
  }

  .cm-conflict-group {
    flex-direction: column;

    .cm-option-left {
      border-right: none;
      border-bottom: 1px solid var(--border);
    }
  }

  .cm-target-btn span {
    max-width: 60px;
  }

  .cm-cell-name .cm-name-label {
    max-width: 100px;
  }
}
</style>
