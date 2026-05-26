import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authSlot } from './middleware/auth-slot.js';
import { marketRoutes } from './routes/market.js';
import { quotesRoutes } from './routes/quotes.js';
import { stockRoutes } from './routes/stock.js';
import { searchRoutes } from './routes/search.js';
import { sectorRoutes } from './routes/sector.js';
import { registerStatic } from './static.js';
import { getCorsOrigins, isProduction } from './config.js';

export function createApp(options?: { withStatic?: boolean }) {
  const withStatic = options?.withStatic ?? false;
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: getCorsOrigins(),
      allowMethods: ['GET', 'OPTIONS'],
    }),
  );

  app.use('/api/*', authSlot);

  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      ts: new Date().toISOString(),
      mode: isProduction() ? 'production' : 'development',
    }),
  );

  const api = new Hono();
  api.route('/market', marketRoutes);
  api.route('/quotes', quotesRoutes);
  api.route('/stocks', stockRoutes);
  api.route('/search', searchRoutes);
  api.route('/sector', sectorRoutes);
  app.route('/api', api);

  const staticOk = withStatic ? registerStatic(app) : false;

  return { app, staticOk };
}
