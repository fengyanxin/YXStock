import path from 'node:path';

/** 编译后位于 apps/server/dist，静态资源在 apps/web/dist */
export function resolveWebDist(): string {
  return path.resolve(process.cwd(), 'apps/web/dist');
}

export function getPort(): number {
  return Number(process.env.PORT ?? 3001);
}

export function getCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (raw) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return ['http://localhost:5173', 'http://127.0.0.1:5173'];
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
