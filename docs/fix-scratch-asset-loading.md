# 修复 Scratch 角色库/背景库资源加载问题

## 问题描述

在私有化部署的 Scratch 平台中，用户无法正常更换舞台背景和角色。点击添加按钮后，库 UI 可以正常显示，但选择具体资源后加载失败，角色/背景无法添加到舞台。

## 根因分析

经过排查，发现以下几个问题：

### 1. assetHost 硬编码为外部 URL

**文件**: `scratch-gui-build/src/lib/project-fetcher-hoc.jsx:138`

```javascript
// 原代码
ProjectFetcherComponent.defaultProps = {
    assetHost: 'https://assets.scratch.mit.edu',
    projectHost: 'https://projects.scratch.mit.edu'
};
```

资源主机地址硬编码为 Scratch 官方服务器，私有化部署无法访问。

### 2. 资源获取 URL 格式不匹配

**文件**: `scratch-gui-build/src/lib/storage.js:61-62`

```javascript
// 原代码
getAssetGetConfig (asset) {
    return `${this.assetHost}/internalapi/asset/${asset.assetId}.${asset.dataFormat}/get/`;
}
```

URL 格式包含 `/internalapi/asset/` 和 `/get/` 路径，与本地静态文件服务不匹配。

### 3. 库图标 URL 硬编码

**文件**: `scratch-gui-build/src/containers/library-item.jsx:108-109`

```javascript
// 原代码
const iconURL = iconMd5 ?
    `https://cdn.assets.scratch.mit.edu/internalapi/asset/${iconMd5}/get/` :
    this.props.iconRawURL;
```

角色/背景库的图标 URL 直接硬编码为 CDN 地址。

### 4. storage 的 assetHost 没有默认值

**文件**: `scratch-gui-build/src/lib/storage.js`

Storage 类没有在构造函数中设置 `assetHost` 的默认值，导致在 `setAssetHost` 被调用之前，`this.assetHost` 为 `undefined`。

### 5. addOfficialScratchWebStores 没有被调用（关键问题）

虽然 `gui.jsx` 的 `defaultProps` 中配置了 `onStorageInit` 回调来调用 `addOfficialScratchWebStores()`，但由于组件初始化顺序问题，这个方法实际上没有被执行。

这导致 `webHelper` 的 stores 没有被注册，storage 不知道如何获取资源，选择角色时没有任何网络请求发出。

**排查过程中的关键发现**：
- `[SpriteLibrary] Adding sprite: xxx` 日志出现
- `[SpriteLibrary] VM runtime storage assetHost: /scratch/assets` 显示配置正确
- 但 `[Storage] getAssetGetConfig:` 日志从未出现
- `[Storage] addOfficialScratchWebStores called` 日志也没有出现

这证明了 web stores 注册函数根本没有被调用。

## 解决方案

### 修改 1: project-fetcher-hoc.jsx

将 `assetHost` 默认值改为本地路径：

```javascript
// 修改后
ProjectFetcherComponent.defaultProps = {
    assetHost: '/scratch/assets',
    projectHost: 'https://projects.scratch.mit.edu'
};
```

### 修改 2: storage.js

1. 简化资源获取 URL 格式
2. 在构造函数中设置默认 assetHost
3. **在构造函数中自动调用 addOfficialScratchWebStores()**

```javascript
class Storage extends ScratchStorage {
    constructor () {
        super();
        // 设置默认资源主机路径（私有化部署使用本地路径）
        this.assetHost = '/scratch/assets';
        this.cacheDefaultProject();
        // 自动注册 web stores（私有化部署）
        this.addOfficialScratchWebStores();
    }

    // ...

    getAssetGetConfig (asset) {
        const url = `${this.assetHost}/${asset.assetId}.${asset.dataFormat}`;
        console.log('[Storage] getAssetGetConfig:', url);  // 调试日志，可在生产环境移除
        return url;
    }
}
```

### 修改 3: library-item.jsx

将图标 URL 改为本地路径：

```javascript
// 修改后
const iconURL = iconMd5 ?
    `/scratch/assets/${iconMd5}` :
    this.props.iconRawURL;
```

## 资源文件下载

创建了 Python 脚本 `scripts/download-scratch-assets.py` 用于下载所有库资源文件。

### 脚本功能

1. 扫描 `scratch-gui-build/src/lib/libraries/` 下的 JSON 文件：
   - `sprites.json` - 角色库
   - `backdrops.json` - 背景库
   - `costumes.json` - 造型库
   - `sounds.json` - 声音库

2. 提取所有 `md5ext` 字段（如 `809d9b47347a6af2860e7a3a35bce057.svg`）

3. 从 Scratch 官方服务器并发下载资源到 `frontend/public/scratch/assets/`

### 使用方法

```bash
# 如果需要代理
export https_proxy=http://127.0.0.1:7890
export http_proxy=http://127.0.0.1:7890

# 运行下载脚本
python3 scripts/download-scratch-assets.py
```

### 下载统计

- 总资源数：1331 个文件
- SVG 文件：约 800 个
- PNG 文件：约 200 个
- WAV 文件：约 300 个
- 总大小：约 50-100MB

## 编译和部署

### 重新编译 Scratch GUI

```bash
cd scratch-gui-build
npm run build
```

### 部署编译产物

```bash
cp scratch-gui-build/build/embedded.* frontend/public/scratch/
```

## 修改的文件清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `scratch-gui-build/src/lib/project-fetcher-hoc.jsx` | 修改 | assetHost 默认值改为 `/scratch/assets` |
| `scratch-gui-build/src/lib/storage.js` | 修改 | 简化 URL 格式，设置默认 assetHost，自动注册 web stores |
| `scratch-gui-build/src/containers/library-item.jsx` | 修改 | 图标 URL 改为本地路径 |
| `scratch-gui-build/src/containers/sprite-library.jsx` | 修改 | 添加调试日志（可选，生产环境可移除） |
| `scratch-gui-build/node_modules/scratch-storage/dist/web/scratch-storage.js` | 修改 | **禁用 FetchWorkerTool**（见下方说明） |
| `scripts/download-scratch-assets.py` | 新建 | 资源下载脚本 |
| `frontend/public/scratch/assets/*` | 新建 | 下载的资源文件 |
| `frontend/public/scratch/embedded.js` | 更新 | 重新编译后的 JS |
| `frontend/public/scratch/embedded.js.map` | 更新 | Source Map |

### 修改 6: scratch-storage 禁用 FetchWorkerTool（关键！）

**文件**: `scratch-gui-build/node_modules/scratch-storage/dist/web/scratch-storage.js`

**问题**: `FetchWorkerTool` 使用 Web Worker 发送资源请求，但在 iframe sandbox 环境中，Worker 的 `postMessage` 回调不会被正确触发，导致请求"悬挂"（Promise 永远不 resolve/reject）。

**解决方案**: 修改 `ProxyTool` 构造函数，禁用 `FetchWorkerTool`，强制使用 `FetchTool`。

找到约第 5296 行的代码：
```javascript
    let tools;
    if (filter === ProxyTool.TOOL_FILTER.READY) {
      tools = [new FetchTool()];
    } else {
      tools = [new PublicFetchWorkerTool(), new FetchTool()];
    }
```

修改为：
```javascript
    let tools;
    // 私有化部署：禁用 FetchWorkerTool，直接使用 FetchTool
    // FetchWorkerTool 在 iframe sandbox 环境中可能无法正常工作
    tools = [new FetchTool()];
```

**注意**: 此修改在 `node_modules` 中，执行 `npm install` 后会被覆盖。建议：
1. 使用 `patch-package` 工具持久化此修改
2. 或在每次 `npm install` 后手动应用此修改
3. 或创建一个 postinstall 脚本自动应用

## 验证方法

1. 启动开发环境
   ```bash
   ./start.sh dev
   cd frontend && npm run dev
   ```

2. 打开编辑器 http://localhost:3000/editor

3. 功能测试
   - 点击右下角"添加角色"按钮
   - 从库中选择任意角色，验证能正确添加到舞台
   - 点击右下角"添加背景"按钮
   - 从库中选择任意背景，验证能正确更换

4. 浏览器控制台检查
   - 打开开发者工具 Network 面板
   - 验证资源请求都指向 `/scratch/assets/...`
   - 验证没有对 `assets.scratch.mit.edu` 的请求
   - Console 中应看到 `[Storage] addOfficialScratchWebStores called`
   - 选择角色时应看到 `[Storage] getAssetGetConfig: /scratch/assets/xxx.svg`

## 排查问题的调试技巧

### 1. 检查 storage 配置

在浏览器 Console 中输入：
```javascript
// 检查 storage 是否正确配置
const vm = document.querySelector('iframe')?.contentWindow?.vm;
console.log('storage:', vm?.runtime?.storage);
console.log('assetHost:', vm?.runtime?.storage?.assetHost);
console.log('webHelper stores:', vm?.runtime?.storage?.webHelper?.stores);
```

### 2. 添加调试日志

在关键位置添加 `console.log` 来追踪执行流程：
- `sprite-library.jsx` 的 `handleItemSelect` 方法
- `storage.js` 的 `getAssetGetConfig` 方法
- `storage.js` 的 `addOfficialScratchWebStores` 方法

### 3. 检查 Network 请求

选择角色后，Network 面板应该显示对 `/scratch/assets/` 的请求。如果没有请求，说明 storage 的 web stores 没有正确注册。

## 注意事项

1. **调试日志**：本次修改中添加了一些 `console.log` 调试日志，在生产环境部署前可以移除。

2. **资源更新**：如果 Scratch 官方更新了库资源，需要重新运行下载脚本。

3. **缓存问题**：修改后如果不生效，请尝试：
   - 强制刷新页面（Cmd+Shift+R 或 Ctrl+Shift+R）
   - 清除浏览器缓存
   - 确保 embedded.js 已更新（检查文件修改时间）

4. **网络隔离测试**：可以断开外网连接后测试，验证完全离线可用。
