# Wallpaper Browser

一个基于 Vue 3 + TypeScript 的本地壁纸浏览器，专为 Wallpaper Engine 创意工坊壁纸管理而设计。

## 功能特性

- 📁 **本地目录扫描** - 使用 File System Access API 直接访问本地文件系统
- 💾 **IndexedDB 缓存** - 壁纸元数据与目录句柄持久化存储，下次打开秒级恢复
- ⚡ **增量同步** - 自动检测新增/删除壁纸，无需全量扫描
- 🏷️ **智能分类** - 根据文件夹名称自动识别壁纸分类（场景、动漫、游戏、自然等）
- 📂 **类型过滤** - 场景、视频、网页、应用四种类型，自动根据 project.json 推断
- 🔍 **实时搜索** - 支持按名称、文件夹名、分类搜索
- 📊 **多种排序** - 按名称、下载时间、分类排序，支持升序/降序切换
- 🖼️ **高清预览** - 大图浏览、缩略图导航、键盘快捷键支持
- 📋 **详情面板** - 右侧详情面板显示壁纸完整信息
- 🖥️ **一键设置壁纸** - 通过自定义协议直接调用本地 Wallpaper Engine 静默设置壁纸
- 🎨 **Steam 风格** - 界面设计致敬 Wallpaper Engine 创意工坊风格

## 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **构建工具**: Vite
- **文件系统**: File System Access API
- **缓存**: IndexedDB + workshopcache.json

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
3. 应用会自动扫描目录并显示所有壁纸，首次扫描后缓存到 IndexedDB
4. 下次打开时从缓存秒级恢复，自动增量同步变化
5. 使用侧边栏「类型」和「分类」栏目多选过滤壁纸
6. 使用搜索框快速查找
7. 点击壁纸卡片预览大图，右侧显示详情面板
8. 右键壁纸卡片可复制路径或文件夹名称
9. 右键壁纸卡片或在右侧详情面板点击「设置为壁纸」可一键应用壁纸

## 一键设置壁纸（自定义协议）

### 功能说明

通过 Windows 自定义 URL 协议，实现网页直接调用本地 Wallpaper Engine 静默设置壁纸，全程无弹窗、无界面干扰，桌面壁纸直接切换。

### 安装方法

1. 进入 `protocol` 文件夹
2. 右键以管理员身份运行 `install.bat`
3. 提示「安装完成」即可使用

> 脚本会自动读取 Steam 安装路径，支持多 Steam 库目录，无需手动配置

### 使用方法

- **右键菜单**：在任意壁纸卡片上右键，选择「设置为壁纸」
- **详情面板**：选中壁纸后，在右侧详情面板点击「设置为壁纸」按钮

调用格式：`wallpaper-browser://apply?id=创意工坊ID`

### 特性

- 完全静默设置，不弹出 Wallpaper Engine 主界面
- 自动识别 32/64 位版本
- 支持多 Steam 库目录（自定义安装路径）
- WE 未运行时自动静默启动
- 后台切换壁纸，无任何视觉干扰

### 卸载方法

1. 进入 `protocol` 文件夹
2. 右键以管理员身份运行 `uninstall.bat`
3. 提示「卸载完成」即可清理所有注册表项和本地脚本

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
│   │   ├── Sidebar.vue         # 侧边栏（类型+分类双栏目，多选）
│   │   ├── WallpaperCard.vue   # 壁纸卡片（封面懒加载）
│   │   ├── PreviewModal.vue    # 预览模态框
│   │   └── DetailPanel.vue     # 右侧详情面板
│   ├── utils/
│   │   ├── wallpaperScanner.ts # 核心扫描逻辑（增量同步）
│   │   ├── cache.ts            # IndexedDB 缓存管理
│   │   └── workshopMetadata.ts # workshopcache.json 解析
│   ├── App.vue                 # 主应用组件
│   ├── main.ts                 # 入口文件
│   └── style.css               # 全局样式
├── protocol/
│   ├── install.bat             # 自定义协议安装脚本（一键设置壁纸）
│   └── uninstall.bat           # 自定义协议卸载脚本
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.js
```

## 类型推断

应用会根据 `project.json` 的 `type` 字段和文件内容自动推断壁纸类型：

| 类型 | 推断规则 |
|------|----------|
| 场景 | 默认类型，静态壁纸 |
| 视频 | 包含 `.mp4`/`.mkv`/`.webm` 文件 |
| 网页 | 包含 `.html` 文件或 project.json 指定 `web` |
| 应用 | 包含 `.exe`/`.pkg` 文件 |

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
| cyberpunk | 赞博朋克 |
| animals | 动物 |
| movie, cinema | 影视 |
| music | 音乐 |
| technology, tech | 科技 |

## 性能优化

- **封面懒加载** - 使用 IntersectionObserver，仅加载可视区域封面
- **IndexedDB 缓存** - 元数据和目录句柄持久化，无需重新授权
- **增量同步** - 比对磁盘目录变化，仅处理新增/删除项
- **workshopcache.json** - 使用 Steam 缓存文件获取下载时间，避免扫描文件

## 部署

项目配置了 GitHub Actions 自动部署：

- 推送到 `main` 分支自动触发
- 部署到 GitHub Pages

## License

MIT

## 作者

Wallpaper Browser