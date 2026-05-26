# YXStock

基于 [Stock SDK](https://chengzuopeng.github.io/stock-sdk/api/) 的 A 股行情展示与分析 Web 应用。

演示地址：https://yxstock.netlify.app

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

### 本地生产模式

1. **生产构建**

   ```bash
   npm run build
   ```

2. **运行同源服务（静态前端 + /api）**

   ```bash
   npm run start
   ```

### Netlify 部署

项目已包含 `netlify.toml` 与 `netlify/functions/api.ts`：

- 静态站点发布目录：`apps/web/dist`
- `/api/*` 会重写到 Netlify Function，并复用 `apps/server/src` 的 Hono 路由

首次部署步骤：

```bash
# 1) 登录 Netlify
npx netlify login

# 2) 关联或新建站点
npx netlify init

# 3) 生产部署
npm run deploy:netlify
```

如果在 CI 中部署，建议设置 `NETLIFY_AUTH_TOKEN` 与 `NETLIFY_SITE_ID` 后执行：

```bash
npx netlify deploy --prod --site $NETLIFY_SITE_ID
```

## A 股行情日报（定时 + 推送）

脚本路径：`scripts/daily-report/`，生成与桌面版相同结构的 **Markdown + HTML** 报告，并支持推送到 **钉钉 / 飞书 / 企业微信**。

### 本地生成

```bash
npm run report:daily              # 写入 reports/
npm run report:daily:push         # 生成并推送（需配置 Webhook）
```

### GitHub Actions 定时任务

工作流：`.github/workflows/daily-report.yml`

- **默认时间**：北京时间周一至周五 **15:35**（A 股收盘后）
- **手动运行**：仓库 Actions → *Daily Market Report* → *Run workflow*
- **产物**：每次运行上传 `reports/YXStock_行情日报_YYYY-MM-DD.md` 与 `.html` Artifacts

在仓库 **Settings → Secrets and variables → Actions** 中配置：

| Secret | 说明 |
|--------|------|
| `DINGTALK_WEBHOOK` | **必填其一**：钉钉机器人完整 URL |
| `FEISHU_WEBHOOK` | **必填其一**：飞书机器人完整 URL（`open.feishu.cn/.../hook/...`） |
| `NOTIFY_CHANNELS` | 可选；**留空则自动**按已配置的 Webhook 推送 |
| `DINGTALK_SECRET` | 钉钉加签 Secret（若启用） |
| `DINGTALK_KEYWORD` | 钉钉机器人「自定义关键词」（若启用） |
| `FEISHU_KEYWORD` | 飞书机器人关键词（若启用） |
| `WECHAT_WORK_WEBHOOK` | 企业微信群机器人 Webhook |

推送失败时工作流会 **直接报错**（不再静默成功）。请在 Actions 日志中查看 `[notify]` 行。

本地仅测推送（不重新拉行情）：

```bash
npm run report:notify-test -- --out-dir reports
```

复制 `.env.example` 中日报相关变量可在本地 `report:daily:push` 时复用同一套配置。

若希望将 `reports/` 自动提交回仓库，在 **Variables** 中设置 `COMMIT_DAILY_REPORTS=true`（需已配置 `contents: write` 权限）。

## 免责声明

本应用展示的数据来自 Stock SDK 所对接的公开行情接口，**仅供学习与参考，不构成任何投资建议**。使用方需自行承担因数据延迟、缺失或接口变更导致的风险。

## 后续扩展（已预留）

- `AuthContext` / `ProtectedRoute`：账号登录
- `IWatchlistRepository`：`RemoteWatchlistRepository` 云端自选股
- BFF `authSlot` 中间件：JWT 校验插槽

## 参考

- [Stock SDK 文档](https://chengzuopeng.github.io/stock-sdk/api/)
- [快速开始](https://chengzuopeng.github.io/stock-sdk/guide/getting-started.html)
