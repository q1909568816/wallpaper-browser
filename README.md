# Wallpaper Browser

一个基于 Vue 3 + TypeScript 的本地壁纸浏览器，专为 Wallpaper Engine 创意工坊壁纸管理而设计。

## 功能特性

- 📁 **本地目录扫描** - 使用 File System Access API 直接访问本地文件系统
- 💾 **IndexedDB 缓存** - 壁纸元数据与目录句柄持久化存储，下次打开秒级恢复
- ⚡ **增量同步** - 自动检测新增/删除壁纸，无需全量扫描
- 🏷️ **智能分类** - 根据文件夹名称自动识别壁纸分类（场景、动漫、游戏、自然等）
- 📂 **类型过滤** - 场景、视频、网页、应用四种类型，自动根据 project.json 推断
- 🔍 **实时搜索** - 支持按名称、文件夹名、分类搜索（300ms 防抖）
- 📊 **多种排序** - 按名称、下载时间、分类排序，支持升序/降序切换
- 🖼️ **高清预览** - 大图浏览、缩略图导航、键盘快捷键支持
- 📋 **详情面板** - 右侧详情面板显示壁纸完整信息，文件系统浏览器
- 🖥️ **一键设置壁纸** - 通过自定义协议静默调用 Wallpaper Engine 设置壁纸
- 📂 **打开本地目录** - 快速定位壁纸所在文件夹，支持文件系统子目录
- ▶️ **加入播放列表** - 直接写入 WE 播放列表配置，支持视频和场景壁纸
- 🎮 **在创意工坊打开** - 通过 `steam://url/CommunityFilePage/<id>` 协议唤起 Steam 客户端打开对应壁纸详情页
- 📋 **复制 / 移动壁纸** - 单个或批量复制/移动壁纸到任意目录，支持同名冲突检测（替换/合并）
- 🗂️ **文件系统右键操作** - 右侧文件系统支持 Shift 连续选择、Ctrl 单选，右键复制/移动文件
- 📱 **移动端适配** - 触摸手势支持，移动端默认显示选择框
- 🎨 **Steam 风格** - 界面设计致敬 Wallpaper Engine 创意工坊风格，柔和配色

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
2. 选择 Wallpaper Engine 创意工坊目录（通常是 `steamapps`）
3. 应用会自动扫描目录并显示所有壁纸，首次扫描后缓存到 IndexedDB
4. 下次打开时从缓存秒级恢复，自动增量同步变化
5. 使用侧边栏「类型」和「分类」栏目多选过滤壁纸
6. 使用搜索框快速查找
7. 点击壁纸卡片预览大图，右侧显示详情面板和文件系统浏览器
8. 右键壁纸卡片或在右侧详情面板可执行以下操作

## 自定义协议功能

通过 Windows 自定义 URL 协议 (`wallpaper-browser://`)，实现网页直接与本地 Wallpaper Engine 交互。

### 安装方法

1. 进入 `protocol` 文件夹
2. 双击运行 `install.bat`（无需管理员权限，写入 HKCU）
3. 提示「Install complete」即可

> 脚本会自动读取 Steam 安装路径，支持多 Steam 库目录，兼容大小写不敏感的 WE 目录名

### 协议说明

| 协议 | 功能 |
|------|------|
| `wallpaper-browser://apply?id=ID` | 静默设置壁纸（不弹出 WE 界面） |
| `wallpaper-browser://open?id=ID` | 打开壁纸本地目录 |
| `wallpaper-browser://open?id=ID&path=sub/dir` | 打开壁纸子目录 |
| `wallpaper-browser://addplaylist?id=ID` | 加入播放列表（写入 config.json） |

### 右键菜单（壁纸卡片）

按功能分组：

- **操作类**：设为壁纸 / 加入播放列表 / 在创意工坊打开
- **复制信息类**：复制路径 / 复制名称
- **文件管理类**：打开目录 / 复制壁纸 / 移动壁纸

### 详情面板按钮

- **第一行**：设为壁纸 / 加入播放列表 / 在创意工坊打开（按钮自适应宽度）
- **第二行**：复制路径 / 复制名称
- **第三行**：打开目录 / 复制壁纸 / 移动壁纸
- **文件系统**：浏览壁纸子目录和文件，支持右键菜单

### 文件系统右键菜单

右侧文件系统区域支持 Windows 风格的多选与操作：

- **单击**：选中单个文件/文件夹
- **Shift + 单击**：连续多选
- **Ctrl / Cmd + 单击**：任意多选
- **右键菜单**：复制文件路径 / 复制选中项 / 移动选中项 / 预览 / 打开本地目录
- 进入子目录时自动清空当前选择

### 批量复制 / 移动

- 壁纸卡片悬停显示选择框，或移动端默认显示
- 顶部出现「全选 / 取消全选 / 复制 / 移动」按钮（支持跨页选择）
- 点击复制/移动后选择目标目录，弹出批量操作对话框
- 对话框显示每项壁纸的名称、类型、年龄分级、源目录、目标位置（可单独编辑）、冲突处理
- 支持分页查看，冲突项高亮显示
- 使用流式传输（`file.stream().pipeTo(writable)`）避免大文件内存溢出
- 逐个壁纸处理，每个壁纸开始前懒加载 `folderHandle`（避免一次性加载导致卡顿）
- 移动操作完成后自动清理本地状态、IndexedDB 缓存和内存中的 Object URL

### 特性

- 完全静默设置壁纸，不弹出 Wallpaper Engine 主界面
- 自动识别 WE 安装目录，支持 `wallpaper_engine` / `Wallpaper Engine` 等命名
- 支持多 Steam 库目录（自定义安装路径）
- PowerShell 5.1 兼容（Windows 10/11 自带，无需升级）
- 自动识别视频（.mp4/.avi 等）和场景（.pkg）壁纸
- 在创意工坊打开通过 Steam 自定义协议唤起 Steam 客户端

### 卸载方法

1. 进入 `protocol` 文件夹
2. 双击运行 `uninstall.bat`
3. 提示「Uninstall complete」即可

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
│   │   ├── Sidebar.vue              # 侧边栏（类型+分类双栏目，多选）
│   │   ├── WallpaperCard.vue        # 壁纸卡片（封面懒加载、选择框）
│   │   ├── PreviewModal.vue         # 预览模态框
│   │   ├── DetailPanel.vue          # 右侧详情面板（含文件系统浏览器）
│   │   ├── CopyMoveDialog.vue       # 单个壁纸复制/移动对话框
│   │   └── BatchCopyMoveDialog.vue  # 批量复制/移动对话框
│   ├── utils/
│   │   ├── wallpaperScanner.ts      # 核心扫描逻辑（增量同步、封面 URL 缓存）
│   │   ├── cache.ts                 # IndexedDB 缓存管理（单例防竞态）
│   │   ├── workshopMetadata.ts      # workshopcache.json 解析
│   │   └── webPreview.ts            # 网页壁纸预览支持
│   ├── App.vue                      # 主应用组件
│   ├── main.ts                      # 入口文件
│   └── style.scss                   # 全局样式（含统一滚动条样式）
├── protocol/
│   ├── install.bat                  # 协议安装脚本
│   ├── uninstall.bat                # 协议卸载脚本
│   ├── handler.ps1                  # 协议处理（设置壁纸/打开目录/加入播放列表）
│   ├── marker.ps1                   # 检测标记写入
│   └── cleanup.ps1                  # 卸载清理辅助脚本
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── manifest.json
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

> 文件类型判断统一使用 MIME 类型，而非文件扩展名

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

## 性能优化

- **封面懒加载** - 使用 IntersectionObserver，仅加载可视区域封面
- **IndexedDB 缓存** - 元数据和目录句柄持久化，无需重新授权；`openDB` 单例模式防止并发竞态
- **增量同步** - 比对磁盘目录变化，仅处理新增/删除项；每扫描一个目录立即写入 IndexedDB
- **workshopcache.json** - 使用 Steam 缓存文件获取下载时间，避免扫描文件
- **封面 URL 缓存** - `coverUrlCache` (Map) 跨页面导航复用，覆盖前 `revokeObjectURL` 旧 URL 防内存泄漏
- **流式文件传输** - 复制/移动使用 `file.stream().pipeTo(writable)`，避免一次性内存加载导致大批量操作失败
- **懒加载目录句柄** - 批量操作时逐个壁纸处理，仅在需要时加载 `folderHandle`
- **搜索防抖** - 300ms 防抖避免过多异步句柄加载

## 部署

项目配置了 GitHub Actions 自动部署：

- 推送到 `main` 分支自动触发
- 部署到 GitHub Pages

## License

MIT

## 作者

Wallpaper Browser
