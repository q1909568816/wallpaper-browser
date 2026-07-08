# Wallpaper Browser

一个基于 Vue 3 + TypeScript 的本地壁纸浏览器，专为 Wallpaper Engine 创意工坊壁纸管理而设计。

## 功能特性

- 📁 **本地目录扫描** - 使用 File System Access API 直接访问本地文件系统
- 🏷️ **智能分类** - 根据文件夹名称自动识别壁纸分类（场景、动漫、游戏、自然等）
- 🔍 **实时搜索** - 支持按名称、文件夹名、分类搜索
- 📊 **多种排序** - 按名称、下载时间、分类排序，支持升序/降序切换
- 🖼️ **高清预览** - 大图浏览、缩略图导航、键盘快捷键支持
- 📋 **便捷操作** - 右键菜单快速复制路径、文件夹名称
- 🎨 **深色主题** - 界面设计致敬 Wallpaper Engine 风格

## 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **构建工具**: Vite
- **文件系统**: File System Access API

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

开发服务器默认运行在 `http://localhost:5173/wallpaper-browser/`

### 生产构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录

### 预览构建结果

```bash
npm run preview
```

## 使用说明

1. 打开应用后，点击「选择壁纸资源目录」按钮
2. 选择 Wallpaper Engine 创意工坊目录（通常是 `steamapps/workshop/content/431960`）
3. 应用会自动扫描目录并显示所有壁纸
4. 使用侧边栏分类导航筛选壁纸
5. 使用搜索框快速查找
6. 点击壁纸卡片预览大图
7. 右键壁纸卡片可复制路径或文件夹名称

## 浏览器兼容性

| 浏览器 | 支持情况 |
|--------|----------|
| Chrome 86+ | ✅ 完全支持 |
| Edge 86+ | ✅ 完全支持 |
| Opera 72+ | ✅ 完全支持 |
| Firefox | ❌ 不支持 (缺少 File System Access API) |
| Safari | ❌ 不支持 (缺少 File System Access API) |

## 项目结构

```
wallpaper-browser/
├── src/
│   ├── components/
│   │   ├── Sidebar.vue         # 侧边栏（分类导航）
│   │   ├── WallpaperCard.vue   # 壁纸卡片
│   │   └── PreviewModal.vue    # 预览模态框
│   ├── utils/
│   │   └── wallpaperScanner.ts # 核心扫描逻辑
│   ├── App.vue                 # 主应用组件
│   ├── main.ts                 # 入口文件
│   └── style.css               # 全局样式
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.js
```

## 分类映射

应用会根据文件夹名称中的关键词自动分类：

| 关键词 | 分类 |
|--------|------|
| scene, nature, landscape | 场景 |
| anime | 动漫 |
| game, gaming | 游戏 |
| abstract | 抽象 |
| minimalist | 极简 |
| space | 太空 |
| cyberpunk | 赛博朋克 |
| animals | 动物 |
| movie, cinema | 影视 |
| music | 音乐 |
| technology, tech | 科技 |

## 部署

项目配置了 GitHub Actions 自动部署：

- 推送到 `main` 分支自动触发
- 部署到 GitHub Pages

## License

MIT

## 作者

Wallpaper Browser