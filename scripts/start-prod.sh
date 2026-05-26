#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f apps/web/dist/index.html ]; then
  echo "未找到 apps/web/dist，正在执行构建…"
  bash scripts/build.sh
fi

export NODE_ENV=production
exec npm run start -w @yxstock/server
