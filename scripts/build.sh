#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 安装依赖（若尚未安装）"
npm install

echo "==> 构建 shared"
npm run build -w @yxstock/shared

echo "==> 构建 server"
npm run build -w @yxstock/server

echo "==> 构建 web"
npm run build -w @yxstock/web

echo "==> 完成"
echo "    前端产物: apps/web/dist"
echo "    后端产物: apps/server/dist"
echo "    启动生产: npm run start"
