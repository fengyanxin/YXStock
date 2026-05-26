import { createApp } from '../../apps/server/dist/app.js';

type NetlifyEvent = {
  path: string;
  httpMethod: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
  rawQuery?: string;
  queryStringParameters?: Record<string, string | undefined>;
};

type NetlifyResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
};

const { app } = createApp({ withStatic: false });

function buildApiPath(eventPath: string): string {
  const prefix = '/.netlify/functions/api';
  if (eventPath.startsWith(prefix)) {
    const rest = eventPath.slice(prefix.length) || '';
    return `/api${rest}`;
  }
  if (eventPath.startsWith('/api/')) return eventPath;
  if (eventPath === '/api') return '/api';
  return `/api${eventPath.startsWith('/') ? eventPath : `/${eventPath}`}`;
}

function buildQuery(event: NetlifyEvent): string {
  if (event.rawQuery) return event.rawQuery;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(event.queryStringParameters ?? {})) {
    if (v !== undefined) query.set(k, v);
  }
  return query.toString();
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResult> {
  const method = event.httpMethod || 'GET';
  const headers = new Headers();
  for (const [k, v] of Object.entries(event.headers ?? {})) {
    if (v !== undefined) headers.set(k, v);
  }

  const path = buildApiPath(event.path);
  const query = buildQuery(event);
  const url = `https://netlify.local${path}${query ? `?${query}` : ''}`;

  const init: RequestInit = { method, headers };
  if (event.body && method !== 'GET' && method !== 'HEAD') {
    init.body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : event.body;
  }

  const response = await app.fetch(new Request(url, init));
  const text = await response.text();
  const outHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    outHeaders[key] = value;
  });

  return {
    statusCode: response.status,
    headers: outHeaders,
    body: text,
  };
}
