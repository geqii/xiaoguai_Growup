# 小乖成长记录

一个面向家庭局域网使用的成长记录应用，包含以下模块：

- 错题记录：语文、数学、英语错题录入、OCR、筛选、导出 Word
- 周计划：按周维护多条计划项，支持勾选完成
- 学期目标：按学期留档，在周计划页顶部展示
- 积分制度：日打卡、考试积分、独立加扣分、分页明细与汇总
- 英语音标：元音/辅音复习、示例单词、自定义单词、本地音频发音
- 备份恢复：创建 SQLite 备份并从备份恢复

## 技术栈

- 前端：React + Vite
- 后端：Node.js + Express
- 数据库：SQLite（`better-sqlite3`）
- 测试：Vitest + Supertest

## 项目结构

```text
.
├── src/
│   ├── client/          # 前端
│   ├── server/          # 后端与数据库
│   ├── shared/          # 前后端共享常量/配置
│   └── uploads/         # 上传图片（运行时目录）
├── test/                # 接口测试
├── logs/                # 日志（运行时目录）
├── backups/             # 备份（运行时目录）
├── Dockerfile
└── docker-compose.yml
```

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动前后端开发环境

```bash
npm run dev
```

启动后默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

### 3. 运行测试

```bash
npm test
```

### 4. 构建前端

```bash
npm run build:client
```

构建结果输出到 `dist/`。

## 数据说明

- 默认数据库文件：`src/server/db/mistakes.db`
- 运行时会生成：
  - `logs/`
  - `backups/`
  - `src/uploads/`
- 这些目录和文件已加入 `.gitignore`，不建议提交到仓库

## Docker 部署

当前仓库包含可直接使用的容器文件：

- `Dockerfile`
- `docker-compose.yml`

### 1. 先在本机构建前端

```bash
npm install
npm run build:client
```

### 2. 构建镜像

```bash
docker build -t mistake-notebook:latest .
```

### 3. 运行容器

```bash
docker run -d \
  --name mistake-notebook \
  --restart unless-stopped \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e MISTAKE_DB_PATH=/app/data/mistakes.db \
  -e MISTAKE_BACKUP_DIR=/app/backups \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/src/uploads:/app/src/uploads \
  mistake-notebook:latest
```

访问地址：

- `http://你的主机IP:3001`

## 极空间 NAS 最终部署步骤

这一套步骤适合当前项目，也适合你现在不再走在线平台、只在 NAS 内网运行的场景。

### 1. 在本机准备好部署内容

在本机项目目录执行：

```bash
npm install
npm run build:client
```

确认这些内容存在：

- `Dockerfile`
- `.dockerignore`
- `package.json`
- `package-lock.json`
- `dist/`
- `src/`

### 2. 上传到极空间 NAS

把整个项目目录上传到 NAS，例如：

```text
/tmp/zfsv3/sata1/18117021215/data/app/mistake_notebook
```

### 3. 连接 NAS

开启 NAS 的 SSH 后，登录：

```bash
ssh root@你的NAS_IP
```

进入项目目录：

```bash
cd /tmp/zfsv3/sata1/18117021215/data/app/mistake_notebook
```

### 4. 准备持久化目录

```bash
mkdir -p data backups logs src/uploads
```

如果要把现有数据库带进去：

```bash
cp -f src/server/db/mistakes.db data/mistakes.db
```

### 5. 构建镜像

```bash
docker build -t mistake-notebook:latest .
```

### 6. 启动容器

```bash
docker rm -f mistake-notebook 2>/dev/null || true

docker run -d \
  --name mistake-notebook \
  --restart unless-stopped \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e MISTAKE_DB_PATH=/app/data/mistakes.db \
  -e MISTAKE_BACKUP_DIR=/app/backups \
  -v /tmp/zfsv3/sata1/18117021215/data/app/mistake_notebook/data:/app/data \
  -v /tmp/zfsv3/sata1/18117021215/data/app/mistake_notebook/backups:/app/backups \
  -v /tmp/zfsv3/sata1/18117021215/data/app/mistake_notebook/logs:/app/logs \
  -v /tmp/zfsv3/sata1/18117021215/data/app/mistake_notebook/src/uploads:/app/src/uploads \
  mistake-notebook:latest
```

### 7. 检查容器状态

```bash
docker ps
docker logs -f mistake-notebook
```

### 8. 访问应用

浏览器打开：

```text
http://你的NAS局域网IP:3001
```

如果 `3001` 被占用，可以把 `-p 3001:3001` 改成例如：

```bash
-p 8088:3001
```

然后访问：

```text
http://你的NAS局域网IP:8088
```

## 更新部署

代码有更新后，在本机重新构建前端并上传最新项目文件到 NAS，然后在 NAS 上执行：

```bash
cd /tmp/zfsv3/sata1/18117021215/data/app/mistake_notebook
docker rm -f mistake-notebook
docker build -t mistake-notebook:latest .
docker run -d \
  --name mistake-notebook \
  --restart unless-stopped \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e MISTAKE_DB_PATH=/app/data/mistakes.db \
  -e MISTAKE_BACKUP_DIR=/app/backups \
  -v /tmp/zfsv3/sata1/18117021215/data/app/mistake_notebook/data:/app/data \
  -v /tmp/zfsv3/sata1/18117021215/data/app/mistake_notebook/backups:/app/backups \
  -v /tmp/zfsv3/sata1/18117021215/data/app/mistake_notebook/logs:/app/logs \
  -v /tmp/zfsv3/sata1/18117021215/data/app/mistake_notebook/src/uploads:/app/src/uploads \
  mistake-notebook:latest
```

## 仓库清理说明

本仓库已按“源码入库、运行数据不入库”的原则整理：

- 保留：代码、测试、音标静态资源、部署脚本
- 排除：数据库、日志、备份、导出文件、上传图片、构建产物

如果本地已有这些运行文件，不会被自动删除，只是不再继续纳入 Git 追踪。
