### --- Frontend Build Stage (bun) ---
# 恢复使用 bun。为避免旧 bun.lock 锁死 TS 4.x，这里不复制 bun.lock，强制根据当前 package.json 解析并生成新锁文件。
# 如果后续需要固定依赖版本，可在本地生成新的 bun.lock 并提交。
FROM oven/bun:1.1.21 AS frontend
WORKDIR /build
ENV CI=1 \
    NODE_ENV=production \
    VITE_REACT_APP_VERSION="unset"
COPY web/package.json ./
RUN bun install
COPY ./web .
COPY ./VERSION .
# 加 --silent 降低噪音。如再次出现 Rollup parse 错，可尝试移除 --silent 或添加 --debug 分析。
RUN VITE_REACT_APP_VERSION=$(cat VERSION) bun run build --silent

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
ENV NODE_ENV=production

RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates tzdata ffmpeg \
    && update-ca-certificates

COPY --from=builder2 /build/one-api /
EXPOSE 3000
WORKDIR /data
ENTRYPOINT ["/one-api"]
