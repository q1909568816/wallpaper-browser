<template>
  <Teleport to="body">
    <Transition name="help-fade">
      <div v-if="visible" class="help-overlay">
        <div class="help-dialog">
          <div class="help-header">
            <div class="help-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3>系统使用说明</h3>
            <button class="help-close" @click="$emit('close')">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="help-body">
            <div class="help-section">
              <div class="help-section-icon">📂</div>
              <div class="help-section-content">
                <h4>选择壁纸目录</h4>
                <p>点击底部「切换目录」按钮，选择 Steam 库下的 <code>steamapps</code> 目录，程序会自动定位到 <code>workshop/content/431960</code> 目录读取壁纸。也可直接选择任意包含壁纸的容器目录。</p>
              </div>
            </div>

            <div class="help-section">
              <div class="help-section-icon">🎨</div>
              <div class="help-section-content">
                <h4>浏览和筛选</h4>
                <p>左侧面板可按分类、标签、类型、年龄分级筛选壁纸，支持关键词搜索。点击顶部排序按钮可按名称、日期等排序。</p>
              </div>
            </div>

            <div class="help-section">
              <div class="help-section-icon">✨</div>
              <div class="help-section-content">
                <h4>快捷操作</h4>
                <p>点击壁纸卡片查看详情，右侧面板提供「设为壁纸」「加入播放列表」「在创意工坊打开」等快捷操作（需安装协议助手）。</p>
              </div>
            </div>

            <div class="help-section">
              <div class="help-section-icon">📋</div>
              <div class="help-section-content">
                <h4>批量管理</h4>
                <p>鼠标悬停壁纸卡片显示复选框，支持批量选择后进行复制、移动操作。按住 <kbd>Shift</kbd> 连续选择，按住 <kbd>Ctrl</kbd> 单独选择。</p>
              </div>
            </div>

            <div class="help-section">
              <div class="help-section-icon">🔄</div>
              <div class="help-section-content">
                <h4>复制与移动</h4>
                <p>支持在壁纸目录之间复制或移动壁纸。移动操作优先使用系统级移动（秒完成），失败时自动回退到复制后删除源文件。</p>
              </div>
            </div>

            <div class="help-section">
              <div class="help-section-icon">⭐</div>
              <div class="help-section-content">
                <h4>创意工坊</h4>
                <p>点击「在创意工坊打开」优先唤起 Steam 客户端，若未安装 Steam 则自动在浏览器中打开创意工坊页面。</p>
              </div>
            </div>
          </div>

          <div class="help-footer">
            <button class="help-btn-primary" @click="$emit('close')">知道了</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

defineEmits<{
  close: []
}>()
</script>

<style scoped>
.help-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.help-dialog {
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.help-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 100%);
}

.help-icon {
  color: white;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.help-header h3 {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
  text-align: left;
}

.help-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.help-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.help-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.help-section {
  display: flex;
  gap: 14px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}

.help-section:last-child {
  border-bottom: none;
}

.help-section-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.help-section-content h4 {
  margin: 0 0 8px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.help-section-content p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.help-section-content code {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--accent);
}

.help-section-content kbd {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid var(--border);
  font-family: inherit;
}

.help-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
}

.help-btn-primary {
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: white;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.help-btn-primary:hover {
  background: var(--accent-hover);
}

.help-fade-enter-active,
.help-fade-leave-active {
  transition: opacity 0.25s ease;
}

.help-fade-enter-active .help-dialog,
.help-fade-leave-active .help-dialog {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.help-fade-enter-from,
.help-fade-leave-to {
  opacity: 0;
}

.help-fade-enter-from .help-dialog,
.help-fade-leave-to .help-dialog {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
</style>