# Wallpaper Browser - Code Wiki

## 项目概述

**Wallpaper Browser** 是一个基于 Vue 3 + TypeScript 的本地壁纸浏览器应用，专门用于浏览和管理从 Wallpaper Engine 创意工坊下载的本地壁纸资源。应用利用浏览器的 File System Access API 实现本地目录访问，无需上传即可浏览壁纸。

### 核心特性

- 📁 本地目录扫描与壁纸发现
- 🏷️ 智能分类系统（基于文件夹名称自动分类）
- 🔍 实时搜索与多维度筛选
- 📊 分页浏览与多种排序方式
- 🖼️ 高清预览与缩略图导航
- 📋 右键菜单与路径复制
- 🎨 深色主题设计，致敬 Wallpaper Engine

---

## 项目架构

### 目录结构

```
wallpaper-browser/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages 部署流程
├── public/
│   ├── favicon.svg             # 网站图标
│   └── icons.svg               # 图标资源
├── src/
│   ├── components/
│   │   ├── Sidebar.vue         # 侧边栏组件（目录切换、分类导航）
│   │   ├── WallpaperCard.vue   # 壁纸卡片组件（封面展示、文件列表）
│   │   └── PreviewModal.vue    # 预览模态框组件（大图浏览、缩略图切换）
│   ├── utils/
│   │   └── wallpaperScanner.ts # 核心业务逻辑（状态管理、扫描算法、分类系统）
│   ├── App.vue                 # 主应用组件（布局、搜索、排序、分页）
│   ├── main.ts                 # 应用入口
│   ├── style.css               # 全局样式
│   └── env.d.ts                # TypeScript 环境声明
├── index.html                  # HTML 模板
├── package.json                # 依赖配置
├── tsconfig.json               # TypeScript 配置
└── vite.config.js              # Vite 构建配置
```

### 模块职责

| 模块 | 职责 | 状态管理 |
|------|------|----------|
| **utils/wallpaperScanner.ts** | 核心业务逻辑：目录扫描、分类映射、状态管理、筛选排序 | 集中式响应式状态 |
| **components/Sidebar.vue** | 侧边栏：Logo、当前目录显示、分类导航、目录切换按钮 | 纯展示组件（props） |
| **components/WallpaperCard.vue** | 壁纸卡片：封面图、悬浮操作、文件列表弹窗 | 局部状态（showFiles） |
| **components/PreviewModal.vue** | 预览模态框：大图浏览、缩略图导航、键盘操作 | 局部状态（currentFileIndex） |
| **App.vue** | 主布局：搜索栏、排序下拉、分页控制、右键菜单、Toast | 组合式API管理 |

### 数据流架构

```
用户操作 → App.vue → wallpaperScanner (状态更新) → 响应式状态变化 → 组件重新渲染

┌─────────────────────────────────────────────────────────────────┐
│                        App.vue                                  │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  ┌──────────┐  │
│  │  搜索栏   │  │  排序    │  │    分页控制      │  │ 右键菜单 │  │
│  └────┬─────┘  └────┬─────┘  └────────┬────────┘  └────┬─────┘  │
│       │             │                  │                │       │
└───────┼─────────────┼──────────────────┼────────────────┼───────┘
        │             │                  │                │
        ▼             ▼                  ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│              wallpaperScanner.ts (useWallpaperStore)             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ state: wallpapers, categories, searchQuery, sortBy, ...  │   │
│  │ openDirectory() → scanDirectory() → scanWallpaperDir()   │   │
│  │ filteredWallpapers() → filter + sort                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
        │             │                  │                │
        ▼             ▼                  ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      子组件                                      │
│  ┌──────────────┐   ┌─────────────────┐   ┌──────────────────┐  │
│  │  Sidebar     │   │ WallpaperCard   │   │   PreviewModal   │  │
│  │ (分类导航)    │   │ (卡片渲染)       │   │  (大图预览)       │  │
│  └──────────────┘   └─────────────────┘   └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心模块详解

### 1. utils/wallpaperScanner.ts

这是项目的**核心业务逻辑模块**，包含状态管理、目录扫描算法、分类系统和筛选排序功能。

#### 接口定义

```typescript
interface WallpaperItem {
  id: string                    // 唯一标识
  name: string                  // 格式化后的壁纸名称
  folderName: string            // 原始文件夹名称
  coverUrl: string              // 封面图片 URL（Object URL）
  category: string              // 分类名称
  folderHandle: FileSystemDirectoryHandle  // 文件系统目录句柄
  files: { name: string; handle: FileSystemFileHandle }[]  // 文件列表
  lastModified: number          // 最后修改时间戳
}

interface CategoryInfo {
  name: string                  // 分类名称
  count: number                 // 该分类下壁纸数量
  icon: string                  // 分类图标（emoji）
}

type SortKey = 'name' | 'date' | 'category'  // 排序字段类型
```

#### 状态管理

```typescript
const state = reactive({
  wallpapers: [] as WallpaperItem[],   // 壁纸列表
  categories: [] as CategoryInfo[],    // 分类列表（含计数）
  currentCategory: '全部',             // 当前选中分类
  searchQuery: '',                     // 搜索关键词
  loading: false,                      // 加载状态
  rootDirName: '',                     // 根目录名称
  error: '',                           // 错误信息
  sortBy: 'name' as SortKey,           // 排序字段
  sortAsc: true                        // 升序/降序
})
```

#### 核心函数

| 函数名 | 功能说明 | 参数 | 返回值 |
|--------|----------|------|--------|
| `openDirectory()` | 打开目录选择器，触发扫描 | 无 | `void` |
| `scanDirectory(dirHandle)` | 扫描目录，收集子目录作为壁纸 | `dirHandle: FileSystemDirectoryHandle` | `Promise<WallpaperItem[]>` |
| `scanWallpaperDir(folderName, dirHandle, isRoot)` | 扫描单个壁纸目录，提取媒体文件和封面 | `folderName: string`, `dirHandle: FileSystemDirectoryHandle`, `isRoot?: boolean` | `Promise<WallpaperItem \| null>` |
| `getCategory(folderName)` | 根据文件夹名称推断分类 | `folderName: string` | `string` |
| `getFolderModifiedTime(dirHandle)` | 获取目录修改时间（优先读取 project.json） | `dirHandle: FileSystemDirectoryHandle` | `Promise<number>` |
| `buildCategories(wallpapers)` | 从壁纸列表构建分类统计 | `wallpapers: WallpaperItem[]` | `CategoryInfo[]` |
| `filteredWallpapers()` | 根据分类和搜索条件筛选并排序壁纸 | 无 | `WallpaperItem[]` |

#### 分类映射系统

应用通过文件夹名称中的关键词自动推断分类：

```typescript
const CATEGORY_MAP: Record<string, string> = {
  'scene': '场景', 'scenes': '场景', 'nature': '自然',
  'animals': '动物', 'anime': '动漫', 'abstract': '抽象',
  'minimalist': '极简', 'minimal': '极简', 'space': '太空',
  'cyberpunk': '赛博朋克', 'game': '游戏', 'movies': '影视',
  // ... 更多映射
}
```

**匹配逻辑**：将文件夹名称转为小写，检查是否包含关键词，匹配成功返回对应分类，否则返回"其他"。

#### 封面图片优先级

应用按以下优先级选择封面图片：

1. `cover.png/jpg` (优先级 10)
2. `preview.png/jpg` (优先级 9)
3. `thumbnail.png/jpg` (优先级 8)
4. `folder.png/jpg` (优先级 7)
5. 包含 `poster` 的文件 (优先级 6)
6. 包含 `screenshot` 的文件 (优先级 5)
7. 包含 `banner` 的文件 (优先级 4)
8. 其他图片文件 (优先级 1)

---

### 2. App.vue

主应用组件，负责整体布局和交互逻辑。

#### 主要功能

- **搜索功能**：实时过滤壁纸（支持名称、文件夹名、分类）
- **排序功能**：支持按名称、日期、分类排序，可切换升降序
- **分页功能**：支持 12/24/48/96 条每页，智能页码导航
- **右键菜单**：复制路径、复制名称、预览壁纸
- **Toast通知**：复制成功提示

#### 关键计算属性

```typescript
filteredAndSorted = computed(() => filteredWallpapers())  // 筛选排序后的列表
totalPages = computed(() => Math.ceil(filteredAndSorted.length / pageSize))  // 总页数
pagedWallpapers = computed(() => filteredAndSorted.slice(start, start + pageSize))  // 当前页壁纸
visiblePages = computed(() => { /* 智能页码显示逻辑 */ })  // 可见页码（省略号处理）
```

#### 响应式数据

| 数据项 | 类型 | 用途 |
|--------|------|------|
| `previewWallpaper` | `WallpaperItem \| null` | 当前预览的壁纸 |
| `showSortDropdown` | `boolean` | 排序下拉框显示状态 |
| `currentPage` | `number` | 当前页码 |
| `pageSize` | `number` | 每页条数 |
| `contextMenu` | `{ visible, x, y, wallpaper }` | 右键菜单状态 |
| `toast` | `{ visible, message, timer }` | Toast 通知状态 |

---

### 3. components/Sidebar.vue

侧边栏组件，负责展示分类导航和目录信息。

#### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `categories` | `CategoryInfo[]` | 分类列表 |
| `currentCategory` | `string` | 当前选中分类 |
| `rootDirName` | `string` | 根目录名称 |
| `wallpaperCount` | `number` | 壁纸总数 |

#### Emits

| Event | 参数 | 说明 |
|-------|------|------|
| `selectCategory` | `cat: string` | 选择分类 |
| `openDirectory` | 无 | 打开目录选择器 |

---

### 4. components/WallpaperCard.vue

壁纸卡片组件，展示壁纸封面和基本信息。

#### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `wallpaper` | `WallpaperItem` | 壁纸数据 |

#### 功能特性

- **懒加载**：图片使用 `loading="lazy"` 延迟加载
- **悬浮效果**：悬停时显示操作按钮，封面放大
- **文件列表弹窗**：点击文件按钮展开文件列表
- **错误处理**：封面加载失败时显示占位图

---

### 5. components/PreviewModal.vue

预览模态框组件，支持大图浏览和缩略图导航。

#### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `wallpaper` | `WallpaperItem` | 当前预览的壁纸 |

#### Emits

| Event | 参数 | 说明 |
|-------|------|------|
| `close` | 无 | 关闭模态框 |

#### 功能特性

- **多图片切换**：支持左右箭头和键盘方向键切换
- **缩略图导航**：底部缩略图条，点击快速切换
- **键盘支持**：`ArrowLeft`/`ArrowRight` 切换，`Escape` 关闭
- **资源清理**：组件卸载时释放 Object URL

---

## 技术实现细节

### File System Access API

应用使用浏览器的 File System Access API 实现本地文件系统访问：

```typescript
const dirHandle = await window.showDirectoryPicker({ mode: 'read' })
```

**兼容性**：需要 Chrome/Edge 86+ 或 Opera 72+。不支持的浏览器会显示错误提示。

### Object URL 管理

应用使用 `URL.createObjectURL()` 创建图片预览链接，并在适当时候释放资源：

- **创建**：扫描目录时为封面和缩略图创建 Object URL
- **释放**：`PreviewModal` 组件卸载时调用 `URL.revokeObjectURL()`

### 响应式状态管理

使用 Vue 3 的 `reactive()` 创建集中式状态，通过 `provide/inject` 在组件间共享预览功能：

```typescript
// App.vue
provide('previewWallpaper', previewWallpaper)
provide('setPreview', (wp: WallpaperItem | null) => {
  previewWallpaper.value = wp
})

// WallpaperCard.vue
const setPreview = inject<(wp: WallpaperItem | null) => void>('setPreview')!
```

---

## 依赖关系

### 生产依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `vue` | ^3.5.39 | Vue 3 框架 |

### 开发依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `vite` | ^8.1.1 | 构建工具 |
| `@vitejs/plugin-vue` | ^6.0.7 | Vue 插件 |
| `typescript` | ~6.0.2 | TypeScript 支持 |
| `vue-tsc` | ^3.3.6 | Vue + TypeScript 类型检查 |
| `@vue/compiler-sfc` | ^3.5.39 | Vue 单文件组件编译 |

---

## 运行方式

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

开发服务器默认运行在 `http://localhost:5173/wallpaper-browser/`

### 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

### 预览生产版本

```bash
npm run preview
```

### GitHub Pages 部署

项目配置了 GitHub Actions 自动部署：

- 推送代码到 `main` 分支自动触发部署
- 部署到 GitHub Pages，访问路径为 `/wallpaper-browser/`

---

## 浏览器兼容性

| 浏览器 | 最低版本 | 说明 |
|--------|----------|------|
| Chrome | 86+ | 完全支持 |
| Edge | 86+ | 完全支持 |
| Opera | 72+ | 完全支持 |
| Firefox | ❌ | 不支持 File System Access API |
| Safari | ❌ | 不支持 File System Access API |

---

## 核心算法

### 目录扫描算法

```
scanDirectory(dirHandle)
  ├── 遍历所有子目录，收集到 subdirs 数组
  ├── 对每个 subdir 调用 scanWallpaperDir()
  ├── 如果子目录包含媒体文件，创建 WallpaperItem
  └── 特殊情况：根目录直接包含媒体文件（无子目录），也作为壁纸处理
```

### 分类推断算法

```
getCategory(folderName)
  ├── 将文件夹名称转为小写
  ├── 遍历 CATEGORY_MAP，检查是否包含关键词
  ├── 匹配成功返回对应分类名称
  └── 无匹配返回 "其他"
```

### 筛选排序算法

```
filteredWallpapers()
  ├── 第一步：按分类筛选（currentCategory !== '全部'）
  ├── 第二步：按搜索关键词筛选（name/folderName/category）
  ├── 第三步：按 sortBy 排序
  │   ├── 'name': 按 folderName 字典序
  │   ├── 'date': 按 lastModified 时间戳
  │   └── 'category': 按 category 中文排序
  └── 返回排序后的数组
```

---

## 设计规范

### 颜色主题

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--bg-primary` | `#0d1b2a` | 主背景色 |
| `--bg-secondary` | `#1b2838` | 次要背景色 |
| `--bg-card` | `#1e3048` | 卡片背景 |
| `--text-primary` | `#c7d5e0` | 主文字色 |
| `--text-secondary` | `#8f98a0` | 次要文字色 |
| `--accent` | `#4a90d9` | 强调色（蓝色） |
| `--border` | `#2a3f55` | 边框色 |

### 动画效果

- **卡片入场**：交错淡入动画（`fadeIn`），延迟 0-300ms
- **下拉菜单**：从上滑入动画（`dropIn`）
- **右键菜单**：缩放淡入动画（`ctxIn`）
- **Toast 通知**：从底部滑入/滑出

---

## 扩展建议

### 潜在功能扩展

1. **批量操作**：批量选择壁纸进行复制/删除
2. **收藏功能**：标记喜欢的壁纸
3. **标签系统**：自定义标签和过滤
4. **导出功能**：导出壁纸列表为 JSON
5. **壁纸信息编辑**：修改壁纸名称和分类
6. **性能优化**：虚拟滚动支持大量壁纸
7. **视频预览**：支持视频壁纸播放预览
8. **深色/浅色主题切换**

### 代码优化建议

1. **虚拟滚动**：当壁纸数量超过 1000 时，使用虚拟滚动提升性能
2. **缓存策略**：对已扫描的目录进行缓存，避免重复扫描
3. **Web Worker**：将目录扫描放入 Web Worker，避免阻塞主线程
4. **类型安全**：增加更多 TypeScript 类型约束
5. **错误边界**：添加全局错误处理
