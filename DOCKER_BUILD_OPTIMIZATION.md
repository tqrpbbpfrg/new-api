# Docker 构建优化说明

本文档说明了为加速 Docker 镜像构建所做的优化。

## 已实施的优化措施

### 1. GitHub Actions 缓存 (GHA Cache)

**两个 workflow 文件都已配置:**
- `.github/workflows/docker-image-alpha.yml`
- `.github/workflows/docker-image-arm64.yml`

**缓存配置:**
```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

**优势:**
- `type=gha`: 使用 GitHub Actions 内置缓存后端
- `mode=max`: 导出所有层,不仅仅是最终结果层,最大化缓存效果
- 缓存在 workflow 运行之间共享,大幅减少构建时间

### 2. BuildKit 优化

**配置:**
```yaml
driver-opts: |
  image=moby/buildkit:latest
  network=host
```

**优势:**
- 使用最新版本的 BuildKit,获得最新的性能改进
- `network=host`: 提高网络性能,加速依赖下载

### 3. Dockerfile 层缓存优化

**优化前的问题:**
- 依赖文件和源代码一起复制,任何代码改动都会导致依赖重新安装

**优化后的结构:**

#### 前端构建阶段 (Bun):
```dockerfile
# 先复制依赖文件
COPY web/package.json web/bun.lock ./
RUN bun install

# 后复制源代码
COPY ./web .
```

#### 后端构建阶段 (Go):
```dockerfile
# 先复制 go.mod 和 go.sum
ADD go.mod go.sum ./
RUN go mod download

# 后复制源代码
COPY . .
```

**优势:**
- 依赖安装层会被缓存,只有 `package.json`/`bun.lock` 或 `go.mod`/`go.sum` 变化时才重新安装
- 源代码变化不会触发依赖重装,大幅提升构建速度

### 4. 多架构并行构建

**配置:**
```yaml
platforms: linux/amd64,linux/arm64
```

**优势:**
- 一次性构建多个架构
- 利用 QEMU 和 Buildx 的并行能力
- 配合缓存机制,不同架构可以共享相同的缓存层

## 预期效果

### 首次构建
- 无缓存可用,需要完整构建所有层
- 预计耗时: 10-15 分钟 (取决于项目大小)

### 后续构建 (仅代码变更)
- 依赖层命中缓存
- 仅重新构建变更的代码层
- 预计耗时: 3-5 分钟 (减少 60-70%)

### 后续构建 (依赖变更)
- 需要重新安装依赖
- 但基础镜像层仍可命中缓存
- 预计耗时: 7-10 分钟 (减少 30-40%)

## 缓存存储

GitHub Actions 缓存:
- 自动管理,无需手动清理
- 缓存大小限制: 10GB (GitHub 默认)
- 超过限制时自动清理最旧的缓存
- 7 天未使用的缓存会被自动删除

## 进一步优化建议

如需进一步提升构建速度,可以考虑:

1. **Docker Registry 缓存**
   ```yaml
   cache-from: type=registry,ref=aureon1618/new-api:buildcache
   cache-to: type=registry,ref=aureon1618/new-api:buildcache,mode=max
   ```

2. **本地缓存** (适用于自托管 runner)
   ```yaml
   cache-from: type=local,src=/tmp/.buildx-cache
   cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max
   ```

3. **分离构建 job**
   - 将 amd64 和 arm64 分离为独立 job
   - 最后合并为 multi-arch manifest
   - 可并行构建,进一步减少总时间

4. **Go 模块代理**
   - 配置 `GOPROXY` 使用国内镜像
   - 加速 Go 依赖下载

5. **Node/Bun 包管理优化**
   - 使用 npm/bun 镜像加速依赖下载
   - 考虑使用 pnpm 减少依赖体积

## 监控构建性能

可以通过 GitHub Actions 的 workflow 运行日志查看:
- 每个步骤的耗时
- 缓存命中率
- 构建日志中的 `CACHED` 标记

## 故障排查

如果缓存未生效:
1. 检查 `cache-from` 和 `cache-to` 配置是否正确
2. 确认 GitHub Actions 有足够的权限访问缓存
3. 查看是否超过缓存大小限制
4. 检查 Dockerfile 层顺序是否正确
