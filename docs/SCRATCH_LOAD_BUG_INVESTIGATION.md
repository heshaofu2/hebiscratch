# Scratch 编辑器项目加载不完整问题调查报告

## 问题描述

用户报告：在私有化部署的 Scratch 编程平台上，项目保存后再次编辑时，编辑器显示的角色（Sprite）数量不稳定。

### 具体现象

- 一个包含 2 个角色的项目（MinIO 存储验证）
- 多次刷新页面后，角色显示数量随机变化：1个、2个 或 3个
- **问题始终在服务器上被发现，本地起 Docker 目前没有发现类似问题**

---

## 服务器访问信息

| 项目 | 值 |
|-----|-----|
| 服务器 IP | 120.26.7.208 |
| SSH 密钥 | 当前目录下的 `hsf.pem` |
| SSH 用户 | root |
| 前端地址 | http://120.26.7.208:3000 |
| 后端 API | http://120.26.7.208:3001 |
| 项目部署路径 | /root/scratch |

### SSH 登录命令

```bash
ssh -i hsf.pem root@120.26.7.208
```

### 测试项目

- 项目 ID：`697edb2f728b06bfb3607b29`
- 访问 URL：`http://120.26.7.208:3000/projects/697edb2f728b06bfb3607b29/edit`
- MinIO 存储路径：`scratch-projects/projects/697edb2f728b06bfb3607b29/project.sb3`

---

## 环境差异分析

### 为什么服务器出问题，本地 Docker 不出问题？

| 因素 | 本地 Docker | 服务器 |
|-----|------------|--------|
| 网络延迟 | 极低（localhost） | 较高（公网） |
| 资源加载速度 | 快 | 慢 |
| 默认项目加载时机 | 用户项目加载前完成 | 与用户项目重叠 |
| 竞态条件概率 | 低 | 高 |

**结论**：服务器网络延迟导致默认项目加载和用户项目加载的时间窗口重叠，触发竞态条件

---

## 额外发现的问题

### 问题：保存到电脑的文件无法重新导入

**复现步骤**：
1. 在服务器上打开项目 `697edb2f728b06bfb3607b29`
2. 使用 Scratch 自带的"保存到电脑"功能，下载 .sb3 文件
3. 新建一个项目或刷新页面
4. 使用 Scratch 自带的"从电脑导入"功能，尝试打开刚下载的文件
5. **结果**：无法打开，提示解析失败

**可能原因**：
1. 保存时由于 targets 状态不一致，导出的 sb3 文件本身就是损坏的
2. 存在重复的 Stage 或其他非法结构
3. 资源引用不完整（costume 或 sound 的 MD5 哈希指向不存在的资源）

**验证方法**：
```bash
# 检查下载的 sb3 文件结构
unzip -l downloaded_project.sb3
unzip -p downloaded_project.sb3 project.json | python3 -m json.tool > /dev/null && echo "JSON valid" || echo "JSON invalid"
```

**这个问题与加载不完整问题可能有关**：
- 如果编辑器中的 targets 状态已经混乱（重复 Stage、多余角色）
- 那么保存时会把这个混乱状态写入 sb3 文件
- 导致保存的文件本身就是无效的

**修复关系**：
- 修复加载问题后，这个保存问题应该也会随之解决
- 但已经损坏的项目可能需要从 MinIO 原始文件恢复

### 影响范围

- 影响用户体验，编辑器显示内容与实际保存内容不一致
- 可能导致用户对数据完整性产生疑虑

---

## 系统架构

```
浏览器
  └── Next.js 前端 (ScratchEditor 组件)
        └── iframe (Scratch GUI - embedded.html)
              └── postMessage 通信
                    ├── LOAD_PROJECT: 父页面 → iframe
                    └── PROJECT_LOADED: iframe → 父页面
```

### 关键文件

| 文件 | 职责 |
|-----|------|
| `frontend/src/components/ScratchEditor.tsx` | 前端组件，发送 LOAD_PROJECT 消息 |
| `scratch-gui-build/src/playground/embedded.jsx` | 嵌入式编辑器入口，处理消息通信 |
| `scratch-vm/src/virtual-machine.js` | VM 核心，loadProject() 方法 |
| `scratch-vm/src/serialization/sb3.js` | sb3 文件反序列化 |

---

## 调查过程

### 第一阶段：初步排查

**假设**：`vm.loadProject()` 返回的 Promise 在资源完全加载前就 resolve 了。

**验证**：查看 scratch-vm 源码，发现：
- `loadProject()` 确实在 JSON 解析完成后就 resolve
- 但资源（图片、声音）是异步加载的
- 每个 costume 有 `skinId` 属性，只在资源加载完成后才设置为数字

**初步修复**：添加轮询逻辑，检查所有 costume 的 `skinId` 是否已设置。

**结果**：问题仍然存在。

### 第二阶段：添加调试日志

增加详细日志输出：

```javascript
console.log(`[Scratch] Project JSON parsed, targets: ${initialTargets.length}`);
initialTargets.forEach((t, i) => {
    console.log(`[Scratch] Target ${i}: ${t.getName()}, costumes: ${costumes.length}`);
});
```

**发现**：
- 项目解析后 targets 数量正确（如 3 个）
- 但在轮询过程中，targets 数量会**变化**（增加或减少）

### 第三阶段：验证 MinIO 存储

通过命令行检查 MinIO 中存储的项目文件：

```bash
# 在服务器上
mc cat myminio/scratch-projects/projects/697edb2f728b06bfb3607b29/project.sb3 > /tmp/project.sb3
unzip -l /tmp/project.sb3
unzip -p /tmp/project.sb3 project.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Targets: {len(d[\"targets\"])}')"
```

**结果**：MinIO 中的文件确实只有 3 个 targets（1 个 Stage + 2 个 Sprites）。

### 第四阶段：发现竞态条件

在无痕模式下测试，发现关键日志：

```
[Scratch] Project JSON parsed, targets: 3   ← 用户项目正确加载
[Scratch] All 8 costumes loaded, 5 targets  ← targets 增加到 5！
```

**分析**：
- 初始加载 3 个 targets
- 最终变成 5 个 targets
- 多出的 2 个是重复的 Stage 和猫咪角色

---

## 根本原因分析

### 问题 A：targets 数量增加（2 → 3 或更多）

**原因**：默认项目与用户项目的竞态条件

Scratch GUI 启动流程：
1. GUI 组件挂载
2. 自动加载**默认项目**（包含 Stage + 默认猫咪角色）
3. 我们通过 `LOAD_PROJECT` 消息加载用户项目
4. 由于时序问题，两个项目的 targets 被**合并**而非替换

**证据**：
- 多余的 targets 包含默认项目的资源（相同的 MD5 哈希）
- 出现重复的 Stage（isStage = true 的 targets 有多个）

### 问题 B：targets 数量减少（2 → 1）

**可能原因**：

1. **清理时机问题**：`vm.loadProject()` 内部调用 `clear()` 时，如果默认项目正在加载，可能产生竞态

2. **资源加载失败**：某些资源加载失败导致对应的 target 被跳过

3. **GUI 渲染时机**：GUI 组件在 targets 完全加载前就渲染了快照

### 为什么本地难以复现？

- 本地网络更快，默认项目加载完成后用户项目才开始加载
- 服务器网络延迟导致两个加载过程重叠

---

## 解决方案

### 方案概述

在 `LOAD_PROJECT` 处理中：
1. **加载前清理**：调用 `vm.clear()` 确保 VM 状态干净
2. **记录期望状态**：保存 `loadProject()` 后的 targets 列表
3. **轮询验证**：检测并处理 targets 数量异常
4. **最终清理**：移除重复的 Stage

### 关键代码修改

```javascript
case 'LOAD_PROJECT':
    if (isLoadingProject) return;

    isLoadingProject = true;

    // 关键修复：加载前清理
    vm.clear();

    vm.loadProject(projectData)
        .then(() => {
            // 记录期望的 targets
            const expectedTargets = vm.runtime.targets.map(t => ({
                id: t.id,
                name: t.getName()
            }));

            return new Promise((resolve) => {
                const checkLoaded = () => {
                    const currentTargets = vm.runtime.targets;

                    // 检测竞态条件：targets 增加
                    if (currentTargets.length > expectedTargets.length) {
                        const expectedIds = new Set(expectedTargets.map(t => t.id));
                        vm.runtime.targets = currentTargets.filter(t => expectedIds.has(t.id));
                    }

                    // 检测 targets 减少
                    if (currentTargets.length < expectedTargets.length) {
                        console.warn('[Scratch] Targets lost!');
                    }

                    // ... 检查 skinId 加载完成 ...
                };
                setTimeout(checkLoaded, 50);
            });
        })
        .then(() => {
            this.cleanupDuplicateStages(vm);
            notifyParent('PROJECT_LOADED', { success: true });
        });
```

---

## 验证计划

1. 修改 `scratch-gui-build/src/playground/embedded.jsx`
2. 运行 `npm run build`
3. 复制构建产物到 `frontend/public/scratch/`
4. 部署到服务器
5. 测试验证：
   - 无痕模式打开项目
   - 刷新 10+ 次
   - 确认角色数量稳定
   - 检查控制台无异常警告

---

## 备选方案

如果主方案仍有问题：

1. **禁用默认项目**：修改 GUI 配置，嵌入模式不加载默认项目
2. **延迟就绪通知**：等待 VM 完全稳定后再发送 EDITOR_READY
3. **使用 VM 事件**：监听 TARGETS_UPDATE 事件确保同步

---

## 最终解决方案（2026-02-08 实施）

### 方案 A：同步模式控制

**核心思路**：通过 URL 参数 `?mode=edit|new` 在 iframe 初始化时就告知 Scratch GUI 是编辑模式还是新建模式，从而决定是否加载默认项目。

```
新建模式 (mode=new)：加载默认项目（猫咪）
编辑模式 (mode=edit)：不加载默认项目，等待 LOAD_PROJECT
```

### 修改的文件

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/components/ScratchEditor.tsx` | 新增 `mode` prop，iframe src 添加 `?mode=edit\|new` 参数 |
| `frontend/src/app/editor/[[...id]]/page.tsx` | 根据 `projectId` 传入正确的 mode |
| `scratch-gui-build/src/lib/hash-parser-hoc.jsx` | `handleHashChange` 中检测 mode 参数，编辑模式跳过默认项目 |
| `scratch-gui-build/src/playground/embedded.jsx` | 添加调试日志记录编辑器初始化模式 |

### 关键代码改动

**1. ScratchEditor.tsx - 传递 mode 参数**

```typescript
interface ScratchEditorProps {
  projectData?: string;
  mode?: 'new' | 'edit'; // 新增
  // ...
}

export default function ScratchEditor({ projectData, mode, ... }) {
  const editorMode = mode ?? (projectData ? 'edit' : 'new');

  return (
    <iframe
      src={`/scratch/embedded.html?mode=${editorMode}`}
      // ...
    />
  );
}
```

**2. EditorPage - 根据 projectId 决定 mode**

```typescript
<ScratchEditor
  projectData={projectData}
  mode={projectId ? 'edit' : 'new'}  // 关键：基于 projectId 而非 projectData
  onSave={handleSave}
/>
```

**3. hash-parser-hoc.jsx - 阻止默认项目加载**

```javascript
handleHashChange () {
    const hashMatch = window.location.hash.match(/#(\d+)/);

    // 检查是否为编辑模式
    const urlParams = new URLSearchParams(window.location.search);
    const isEditMode = urlParams.get('mode') === 'edit';

    if (isEditMode && hashMatch === null) {
        // 编辑模式且没有 hash 项目 ID：不设置默认项目
        console.log('[Scratch] Edit mode: skipping default project');
        return; // 不调用 setProjectId，阻止默认项目加载
    }

    const hashProjectId = hashMatch === null ? defaultProjectId : hashMatch[1];
    this.props.setProjectId(hashProjectId.toString());
}
```

### 为什么使用 URL 参数

| 方式 | 优点 | 缺点 |
|-----|------|------|
| URL 参数 | iframe 初始化时就可用，无时序问题 | 无 |
| postMessage | 灵活 | 有时序问题，消息可能在 DOM 就绪前丢失 |
| Props 传递 | React 标准方式 | 需要修改多层组件，复杂 |

### 数据流对比

**修复前**：
```
iframe 加载 → HashParserHOC 设置 defaultProjectId → 状态机 FETCHING_NEW_DEFAULT
           ↘                                              ↗
              EDITOR_READY → LOAD_PROJECT → vm.loadProject()
                    (竞态条件：两个项目同时加载)
```

**修复后**：
```
iframe 加载 (?mode=edit) → HashParserHOC 检测 mode=edit → 跳过 setProjectId
                                                               ↓
                         EDITOR_READY → LOAD_PROJECT → vm.loadProject()
                                    (只加载用户项目，无竞态)
```

### Git 提交

| 仓库 | Commit | 描述 |
|------|--------|------|
| hebiscratch (主项目) | `7211e3c` | fix: pass editor mode via URL param to prevent default project race condition |
| scratch-gui | `c0275d1` | fix: skip default project loading in edit mode to prevent race condition |

### 验证步骤

1. 编辑现有项目时，检查 iframe src 包含 `?mode=edit`
2. 控制台应显示 `[Scratch] Edit mode: skipping default project`
3. 刷新 10+ 次，确认角色数量始终正确
4. 新建项目时，检查 iframe src 包含 `?mode=new`，默认显示猫咪

### Dockerfile 修改

由于阿里云服务器访问 GitHub 不稳定，修改了 `frontend/Dockerfile`，移除了在 Docker 构建时克隆 scratch-gui 的步骤。

**修改前**（scratch-builder 阶段会从 GitHub 克隆并构建）：
```dockerfile
# ========== 阶段 1: 构建 scratch-gui ==========
FROM base AS scratch-builder
WORKDIR /scratch-gui
RUN git clone --depth 1 --branch develop https://github.com/xxx/scratch-gui.git . && \
    npm ci --ignore-scripts && \
    npm run build

# 后续阶段
COPY --from=scratch-builder /scratch-gui/build ./public/scratch
```

**修改后**（使用预构建产物）：
```dockerfile
# scratch-gui 构建产物需要预先放在 public/scratch/ 目录中
# 本地构建方法：./build-scratch.sh pull

# 阶段 2: 构建前端
FROM base AS builder
COPY . .  # 包括 public/scratch/ 中的预构建产物
```

### 部署流程

由于 Dockerfile 变更，部署流程调整为：

```bash
# 1. 本地构建 scratch-gui（包含最新修复）
cd scratch-gui-build
npm run build

# 2. 复制构建产物
cp -r build/* ../frontend/public/scratch/

# 3. 上传到服务器
scp -i hsf.pem -r frontend/public/scratch/* root@120.26.7.208:/opt/scratch/frontend/public/scratch/

# 4. 重新构建前端 Docker 镜像
ssh -i hsf.pem root@120.26.7.208 "cd /opt/scratch && docker compose build --no-cache frontend && docker compose up -d frontend"
```

**优点**：
- 避免服务器 GitHub 网络问题
- 构建更快（不需要在容器内 npm ci scratch-gui）
- 更可控（明确知道部署的是哪个版本）

---

## 时间线

| 日期 | 事件 |
|-----|------|
| 2026-02-07 | 用户报告问题 |
| 2026-02-07 | 初步分析：skinId 检查不足 |
| 2026-02-07 | 添加轮询等待机制 |
| 2026-02-07 | 发现竞态条件 |
| 2026-02-07 | 确定根本原因：默认项目与用户项目合并 |
| 2026-02-07 | 制定完整修复方案 |
| 2026-02-08 | 实施方案 A：URL 参数同步模式控制 |
| 2026-02-08 | 修改 Dockerfile，改用预构建产物 |
| 2026-02-08 | 部署到生产服务器验证 |

---

## 相关链接

- 项目 ID：697edb2f728b06bfb3607b29
- MinIO 存储路径：`projects/697edb2f728b06bfb3607b29/project.sb3`
- 计划文件：`.claude/plans/iterative-sprouting-forest.md`
