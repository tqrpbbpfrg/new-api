### --- Frontend Build Stage (Node) ---
# 说明：原先使用 bun 在 CI 多架构（buildx）环境下触发 Rollup parseAst 报错（无源码行信息，疑似 bun+rollup 的解析兼容问题或 alpha 插件触发 bug）。
# 为保证稳定发布，这里切换为官方 Node 20 Alpine 构建。若未来需要恢复 bun，可保留下方注释的 bun 版本片段快速回滚。

FROM node:20-alpine AS frontend
WORKDIR /build
ENV CI=1 \
    NODE_ENV=production \
    VITE_REACT_APP_VERSION="unset"

# 仅复制 package.json（无 lock 文件情况下 npm 将生成 package-lock.json；可在后续提交以固定版本）
COPY web/package.json ./
RUN npm install --no-audit --no-fund

COPY ./web .
COPY ./VERSION .
RUN VITE_REACT_APP_VERSION=$(cat VERSION) npm run build

## --- 若需回退 bun，请恢复此段并注释掉上面 Node 段 ---
# FROM oven/bun:1.1.21 AS frontend
# WORKDIR /build
# COPY web/package.json .
# RUN bun install
# COPY ./web .
# COPY ./VERSION .
# ENV NODE_ENV=production VITE_REACT_APP_VERSION="unset"
# RUN VITE_REACT_APP_VERSION=$(cat VERSION) bun run build

FROM golang:alpine AS builder2

ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOOS=linux

WORKDIR /build

ADD go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=frontend /build/dist ./web/dist
RUN go build -ldflags "-s -w -X 'one-api/common.Version=$(cat VERSION)'" -o one-api

FROM alpine

RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates tzdata ffmpeg \
    && update-ca-certificates

COPY --from=builder2 /build/one-api /
EXPOSE 3000
WORKDIR /data
ENTRYPOINT ["/one-api"]
