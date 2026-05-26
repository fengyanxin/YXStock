import { serve } from '@hono/node-server';
import { getPort } from './config.js';
import { createApp } from './app.js';

const { app, staticOk } = createApp({ withStatic: true });

const port = getPort();
console.log(`YXStock server http://localhost:${port}`);
if (staticOk) {
  console.log('  · 前端静态资源已挂载（同源访问 /api）');
} else {
  console.log('  · 未找到 apps/web/dist，仅提供 API（请先 npm run build）');
}
serve({ fetch: app.fetch, port });
