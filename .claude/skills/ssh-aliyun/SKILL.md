---
name: ssh-aliyun
description: 登录到阿里云服务器（Scratch 平台生产环境）
user-invocable: true
argument-hint: [command]
---

使用 SSH 登录到阿里云服务器。

## 服务器信息

| 项目 | 值 |
|-----|-----|
| 服务器 IP | 120.26.7.208 |
| SSH 用户 | root |
| SSH 密钥 | `hsf.pem`（项目根目录） |
| 项目部署路径 | /root/scratch |
| 前端地址 | http://120.26.7.208:3000 |
| 后端 API | http://120.26.7.208:3001 |

## 执行

请执行 SSH 命令连接服务器：

```bash
ssh -i hsf.pem root@120.26.7.208
```

如果用户提供了参数 `$ARGUMENTS`，则在服务器上执行该命令：

```bash
ssh -i hsf.pem root@120.26.7.208 "$ARGUMENTS"
```

## 常用操作

- 查看容器状态：`docker ps`
- 查看日志：`cd /root/scratch && docker-compose logs -f`
- 重启服务：`cd /root/scratch && docker-compose restart`
- 进入后端容器：`docker exec -it scratch-backend bash`
