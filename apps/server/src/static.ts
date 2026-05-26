import fs from 'node:fs';
import path from 'node:path';
import type { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { resolveWebDist } from './config.js';

export function registerStatic(app: Hono): boolean {
  const root = resolveWebDist();
  const indexPath = path.join(root, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return false;
  }

  app.use('/assets/*', serveStatic({ root }));
  app.use(
    '/*',
    serveStatic({
      root,
      rewriteRequestPath: (p) => (p === '/' ? '/index.html' : p),
    }),
  );
  app.get('*', async (c, next) => {
    if (c.req.path.startsWith('/api')) return next();
    return serveStatic({ path: './index.html', root })(c, next);
  });

  return true;
}
