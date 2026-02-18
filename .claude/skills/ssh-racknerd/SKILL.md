---
name: ssh-racknerd
description: 登录到 RackNerd VPS 服务器（Scratch 平台生产环境）
user-invocable: true
argument-hint: [command]
---

使用 SSH 登录到 RackNerd VPS 服务器。

## 服务器信息

| 项目 | 值 |
|-----|-----|
| 服务器 IP | 64.188.29.162 |
| SSH 用户 | root |
| SSH 密钥 | `~/.ssh/id_ed25519`（自动使用） |
| 项目部署路径 | /opt/scratch |
| 前端地址 | http://64.188.29.162 |
| 后端 API | http://64.188.29.162/api |

## 执行

请执行 SSH 命令连接服务器：

```bash
ssh root@64.188.29.162
```

如果用户提供了参数 `$ARGUMENTS`，则在服务器上执行该命令：

```bash
ssh root@64.188.29.162 "$ARGUMENTS"
```

## 部署更新流程

当用户要求部署最新代码到服务器时，按以下步骤执行：

1. **对比版本**：分别查看本地和服务器的 `git log --oneline -5`，确认差异
2. **拉取代码**：
   ```bash
   ssh root@64.188.29.162 "cd /opt/scratch && git pull origin main"
   ```
   如果有本地改动冲突，先 `git checkout <file>` 丢弃后再 pull
3. **重新构建**（仅构建有改动的服务）：
   ```bash
   ssh root@64.188.29.162 "cd /opt/scratch && docker compose build --no-cache frontend backend"
   ```
4. **重启服务**：
   ```bash
   ssh root@64.188.29.162 "cd /opt/scratch && docker compose up -d frontend backend"
   ```
5. **验证**：确认 `git log` 版本一致，`docker ps` 容器正常运行

**注意**：服务器使用 `docker compose`（v2 插件），不是 `docker-compose`。

## 常用操作

- 查看容器状态：`docker ps`
- 查看日志：`cd /opt/scratch && docker compose logs -f`
- 重启服务：`cd /opt/scratch && docker compose restart`
- 进入后端容器：`docker exec -it scratch-backend bash`
