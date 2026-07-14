<template>
  <Teleport to="body">
    <Transition name="cm-fade">
      <div v-if="visible" class="cm-overlay">
        <div class="cm-dialog">
          <div class="cm-header">
            <h3>{{ mode === 'copy' ? '复制壁纸' : '移动壁纸' }}</h3>
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
            <div class="cm-form-item">
              <label class="cm-form-label">目录名称</label>
              <div class="cm-form-control">
                <input
                  v-model="localDirName"
                  type="text"
                  placeholder="输入目录名称"
                  :disabled="processing"
                  @input="handleInput"
                  @keyup.enter="onEnter"
                />
              </div>
              <div v-if="nameExists && localDirName.trim()" class="cm-conflict-box">
                <div class="cm-conflict-title">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#3b82f6" stroke-width="2">
                  <path d="M12 8v4m0 4h.01"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                  <span>目标目录已存在同名文件夹</span>
                </div>
                <div class="cm-conflict-options">
                  <label class="cm-option-item" :class="{ active: conflictMode === 'replace' }">
                    <input type="radio" v-model="conflictMode" value="replace" :disabled="processing" />
                    <div class="cm-option-radio"></div>
                    <div class="cm-option-content">
                      <div class="cm-option-label">替换</div>
                      <div class="cm-option-desc">清空目标文件夹后覆盖</div>
                    </div>
                  </label>
                  <label class="cm-option-item" :class="{ active: conflictMode === 'merge' }">
                    <input type="radio" v-model="conflictMode" value="merge" :disabled="processing" />
                    <div class="cm-option-radio"></div>
                    <div class="cm-option-content">
                      <div class="cm-option-label">合并</div>
                      <div class="cm-option-desc">保留原有文件并追加新文件</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div class="cm-form-item">
              <label class="cm-form-label">目标位置</label>
              <div class="cm-form-control cm-target-control">
                <div class="cm-target-display">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7a2 2 0 012-2h4l2 3h8a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  </svg>
                  <span>{{ targetDirName || '未选择目录' }}</span>
                </div>
                <button class="cm-change-btn" @click="$emit('changeDirectory')" :disabled="processing">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4"/>
                    <path d="M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                  <span>更改目录</span>
                </button>
              </div>
            </div>

            <div v-if="processing" class="cm-processing">
              <svg class="cm-spinner" viewBox="0 0 20 20" width="16" height="16" fill="none">
                <circle cx="10" cy="10" r="8" stroke="var(--border)" stroke-width="2" opacity="0.2"/>
                <circle cx="10" cy="10" r="8" stroke="var(--accent)" stroke-width="2" stroke-dasharray="35" stroke-linecap="round" class="cm-spinner-arc"/>
              </svg>
              <span>{{ mode === 'copy' ? '正在复制' : '正在移动' }} {{ progress.current }}/{{ progress.total }} 个文件</span>
            </div>
          </div>

          <div class="cm-footer">
            <button class="cm-btn cm-btn-cancel" @click="$emit('cancel')" :disabled="processing">取消</button>
            <button
              class="cm-btn cm-btn-confirm"
              @click="onConfirm"
              :disabled="processing || !localDirName.trim() || !targetDirName || (nameExists && !conflictMode)"
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
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  visible: boolean
  mode: 'copy' | 'move'
  wallpaperName: string
  targetDirName: string
  targetDirHandle: FileSystemDirectoryHandle | null
  processing: boolean
  progress: { current: number; total: number }
}>()

const emit = defineEmits<{
  confirm: [dirName: string, conflictMode: 'replace' | 'merge' | 'none']
  cancel: []
  changeDirectory: []
}>()

const localDirName = ref('')
const nameExists = ref(false)
const conflictMode = ref<'replace' | 'merge' | 'none'>('none')
let validateTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.visible, async (v) => {
  if (v) {
    localDirName.value = props.wallpaperName
    nameExists.value = false
    conflictMode.value = 'none'
    await nextTick()
    validateName(localDirName.value)
  }
})

watch(() => props.targetDirHandle, () => {
  validateName(localDirName.value)
})

function handleInput() {
  validateName(localDirName.value)
}

function validateName(name: string) {
  if (validateTimer) clearTimeout(validateTimer)
  validateTimer = setTimeout(async () => {
    const trimmed = name.trim()
    if (!trimmed || !props.targetDirHandle) {
      nameExists.value = false
      conflictMode.value = 'none'
      return
    }
    try {
      await props.targetDirHandle.getDirectoryHandle(trimmed)
      nameExists.value = true
      if (conflictMode.value === 'none') conflictMode.value = 'replace'
    } catch {
      nameExists.value = false
      conflictMode.value = 'none'
    }
  }, 200)
}

function onConfirm() {
  if (props.processing) return
  if (!localDirName.value.trim() || !props.targetDirName) return
  if (nameExists.value && !conflictMode.value) return
  emit('confirm', localDirName.value, nameExists.value ? conflictMode.value as 'replace' | 'merge' : 'none')
}

function onEnter() {
  onConfirm()
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
  width: 480px;
  max-width: 90vw;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.cm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);

  h3 {
    margin: 0;
    font-size: 16px;
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
  padding: 10px 24px;
  background: rgba(59, 130, 246, 0.08);

  span {
    white-space: nowrap;
  }
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);

  svg {
    flex-shrink: 0;
    color: #3b82f6;
  }

  span {
    font-size: 12px;
    color: #3b82f6;
    line-height: 1.4;
  }
}

.cm-body {
  padding: 24px;
}

.cm-form-item {
  margin-bottom: 20px;

  &:last-of-type {
    margin-bottom: 0;
  }
}

.cm-form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.cm-form-control {
  width: 100%;

  input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: all 0.15s ease;
    box-sizing: border-box;

    &:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.1);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.cm-conflict-box {
  margin-top: 10px;
  padding: 12px 14px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
}

.cm-conflict-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #3b82f6;
  margin-bottom: 12px;
}

.cm-conflict-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cm-option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  &.active {
    background: rgba(59, 130, 246, 0.12);
    border-color: rgba(59, 130, 246, 0.3);
  }

  input {
    display: none;
  }
}

.cm-option-radio {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;
  transition: all 0.15s ease;

  .cm-option-item.active & {
    border-color: #3b82f6;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 8px;
      height: 8px;
      background: #3b82f6;
      border-radius: 50%;
    }
  }
}

.cm-option-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cm-option-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.cm-option-desc {
  font-size: 11px;
  color: var(--text-muted);
}

.cm-target-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cm-target-display {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-hover-dark);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-secondary);
  overflow: hidden;

  svg {
    flex-shrink: 0;
    opacity: 0.5;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.cm-change-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-light);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.cm-processing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 0;
  margin-top: 8px;

  span {
    font-size: 13px;
    color: var(--text-secondary);
  }
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
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}

.cm-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
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
    width: 92vw;
    max-width: 92vw;
  }

  .cm-warning-bar {
    padding: 8px 16px;

    span {
      font-size: 11px;
    }
  }

  .cm-body {
    padding: 16px;
  }

  .cm-header,
  .cm-warning-bar {
    padding-left: 16px;
    padding-right: 16px;
  }

  .cm-header {
    padding-top: 14px;
    padding-bottom: 14px;
  }

  .cm-footer {
    padding: 12px 16px;
  }

  .cm-btn {
    flex: 1;
    padding: 12px;
  }

  .cm-target-control {
    flex-direction: column;
    align-items: stretch;
  }

  .cm-change-btn {
    justify-content: center;
  }
}
</style>
