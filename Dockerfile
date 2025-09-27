#############################################
# syntax=docker/dockerfile:1.7
# Optimized multi-stage build with deterministic caching
#############################################

ARG BUN_VERSION=1.1.21
ARG GO_VERSION=1.22-alpine

#############################################
# Frontend deps layer (cacheable)
#############################################
FROM oven/bun:${BUN_VERSION} AS fe_deps
WORKDIR /frontend
ENV CI=1 NODE_ENV=production
COPY web/package.json ./
# If later you add bun.lockb, COPY it here before install to improve cache hits
RUN --mount=type=cache,target=/root/.cache/bun bun install --no-save

#############################################
# Frontend build layer
#############################################
FROM oven/bun:${BUN_VERSION} AS fe_build
WORKDIR /frontend
ENV CI=1 NODE_ENV=production
ARG VERSION=unset
ENV VITE_REACT_APP_VERSION=${VERSION}
COPY --from=fe_deps /frontend/node_modules ./node_modules
COPY web/ .
# If VERSION not provided in build context, create one from ARG VERSION
RUN if [ ! -f VERSION ]; then echo "${VERSION}" > VERSION; fi
RUN --mount=type=cache,target=/root/.cache/bun \
    export VITE_REACT_APP_VERSION="$(cat VERSION)"; \
    bun run build

#############################################
# Go modules (deps) layer
#############################################
FROM golang:${GO_VERSION} AS go_deps
WORKDIR /src
ENV GO111MODULE=on CGO_ENABLED=0 GOOS=linux
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

#############################################
# Go build layer
#############################################
FROM golang:${GO_VERSION} AS go_build
WORKDIR /src
ENV GO111MODULE=on CGO_ENABLED=0 GOOS=linux
ARG VERSION=dev
COPY --from=go_deps /go/pkg/mod /go/pkg/mod
COPY . .
COPY --from=fe_build /frontend/dist ./web/dist
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    go build -trimpath -ldflags "-s -w -X 'one-api/common.Version=${VERSION}'" -o /out/one-api

#############################################
# Final minimal runtime image
#############################################
FROM alpine:3.20
ENV NODE_ENV=production
RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates tzdata ffmpeg \
    && update-ca-certificates
COPY --from=go_build /out/one-api /one-api
EXPOSE 3000
WORKDIR /data
ENTRYPOINT ["/one-api"]
