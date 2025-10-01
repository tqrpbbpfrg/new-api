FROM oven/bun:latest AS builder

WORKDIR /build

# 先复制依赖文件,利用层缓存
COPY web/package.json web/bun.lock ./
RUN bun install

# 再复制源代码
COPY ./web .
COPY ./VERSION .
RUN DISABLE_ESLINT_PLUGIN='true' VITE_REACT_APP_VERSION=$(cat VERSION) bun run build

FROM golang:alpine AS builder2

ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOOS=linux

WORKDIR /build

# 先复制 go.mod 和 go.sum,利用层缓存
ADD go.mod go.sum ./
RUN go mod download

# 再复制源代码
COPY . .
COPY --from=builder /build/dist ./web/dist
RUN go build -ldflags "-s -w -X 'one-api/common.Version=$(cat VERSION)'" -o one-api

FROM alpine

# 合并 RUN 命令减少层数
RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates tzdata ffmpeg \
    && update-ca-certificates

COPY --from=builder2 /build/one-api /
EXPOSE 3000
WORKDIR /data
ENTRYPOINT ["/one-api"]
