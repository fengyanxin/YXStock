# YXStock

基于 [Stock SDK](https://chengzuopeng.github.io/stock-sdk/api/) 的 A 股行情展示与分析 Web 应用。

## 功能

- **大盘**：主要指数、涨跌家数、行业/概念 TOP、北向与涨停池概览
- **行情**：全 A 列表排序、筛选、分页（服务端缓存）
- **个股**：实时报价、日/周/月 K 线 + MA/MACD/KDJ/RSI、分时、资金/分红分析摘要
- **选股**：按涨跌幅、成交额、换手率、PE 等条件筛选
- **板块**：行业 / 概念列表与成分股
- **自选**：分组管理；同一股票可加入多个分组；分组与个股拖拽排序（`localStorage`，预留云端同步）

## 技术栈

| 包 | 说明 |
|----|------|
| `apps/web` | React 19 + Vite 7 + Tailwind 4 + TanStack Query + ECharts |
| `apps/server` | Hono BFF + stock-sdk（限流 / 重试 / 熔断） |
| `packages/shared` | 共享类型与常量 |

## 快速开始

```bash
# 安装依赖
npm install

# 构建共享包
npm run build -w @yxstock/shared

# 同时启动 BFF (3001) 与前端 (5173)
npm run dev
```

- 前端：http://localhost:5173  
- BFF：http://localhost:3001/api/health  

仅启动某一端：

```bash
npm run dev:server
npm run dev:web
```

## 环境变量（可选）

在 `apps/server` 下创建 `.env`：

```env
PORT=3001
```

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/market/overview` | 大盘概览 |
| GET | `/api/quotes?codes=` | 批量实时行情 |
| GET | `/api/quotes/market` | 全市场分页列表 |
| GET | `/api/quotes/screener` | 条件选股 |
| GET | `/api/stocks/:code/quote` | 个股报价 |
| GET | `/api/stocks/:code/kline` | K 线 + 指标 |
| GET | `/api/stocks/:code/timeline` | 分时 |
| GET | `/api/stocks/:code/analysis` | 资金 / 北向 / 分红 |
| GET | `/api/search?q=` | 搜索 |
| GET | `/api/sector/industry` | 行业列表 |
| GET | `/api/sector/concept` | 概念列表 |
| GET | `/api/sector/industry/:code/constituents` | 行业成分 |
| GET | `/api/sector/concept/:code/constituents` | 概念成分 |

## 部署说明

1. **生产构建**

   ```bash
   npm run build
   ```

2. **运行 BFF**：`npm run start -w @yxstock/server`（需 Node 18+）

3. **静态前端**：将 `apps/web/dist` 部署到 CDN / EdgeOne Pages；`/api` 请求需反向代理到 BFF 所在域名。

4. **同源部署（推荐）**：在 Hono 中增加静态文件中间件，由同一 Node 进程托管 `web/dist` 与 `/api`。

## 免责声明

本应用展示的数据来自 Stock SDK 所对接的公开行情接口，**仅供学习与参考，不构成任何投资建议**。使用方需自行承担因数据延迟、缺失或接口变更导致的风险。

## 后续扩展（已预留）

- `AuthContext` / `ProtectedRoute`：账号登录
- `IWatchlistRepository`：`RemoteWatchlistRepository` 云端自选股
- BFF `authSlot` 中间件：JWT 校验插槽

## 参考

- [Stock SDK 文档](https://chengzuopeng.github.io/stock-sdk/api/)
- [快速开始](https://chengzuopeng.github.io/stock-sdk/guide/getting-started.html)
