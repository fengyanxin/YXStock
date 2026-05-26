import crypto from 'node:crypto';
import { truncate } from './format.js';
import type { PushPayload } from './push-payload.js';

export type NotifyChannel = 'dingtalk' | 'feishu' | 'wechat';
export type NotifyFormat = 'html' | 'markdown';

export interface NotifyOptions {
  payload: PushPayload;
  channels?: NotifyChannel[];
}

export interface NotifyResult {
  sent: NotifyChannel[];
  skipped: { channel: NotifyChannel; reason: string }[];
  errors: { channel: NotifyChannel; error: string }[];
}

function getNotifyFormat(): NotifyFormat {
  const f = (process.env.NOTIFY_FORMAT ?? 'html').trim().toLowerCase();
  return f === 'markdown' ? 'markdown' : 'html';
}

function signedDingTalkUrl(webhook: string, secret?: string): string {
  if (!secret?.trim()) return webhook.trim();
  const timestamp = Date.now();
  const stringToSign = `${timestamp}\n${secret.trim()}`;
  const sign = encodeURIComponent(
    crypto.createHmac('sha256', secret.trim()).update(stringToSign).digest('base64'),
  );
  const sep = webhook.includes('?') ? '&' : '?';
  return `${webhook.trim()}${sep}timestamp=${timestamp}&sign=${sign}`;
}

function withKeyword(text: string, keyword?: string): string {
  const kw = keyword?.trim();
  if (!kw || text.includes(kw)) return text;
  return `${kw}\n\n${text}`;
}

function parseApiResponse(text: string): Record<string, unknown> {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { _raw: text };
  }
}

function assertApiOk(data: Record<string, unknown>, label: string): void {
  const errcode = data.errcode;
  if (errcode !== undefined && Number(errcode) !== 0) {
    throw new Error(`${label} errcode=${errcode}: ${data.errmsg ?? data.message ?? JSON.stringify(data)}`);
  }
  const code = data.code;
  if (code !== undefined && Number(code) !== 0) {
    throw new Error(`${label} code=${code}: ${data.msg ?? JSON.stringify(data)}`);
  }
  const statusCode = data.StatusCode;
  if (statusCode !== undefined && Number(statusCode) !== 0) {
    throw new Error(`${label} StatusCode=${statusCode}: ${data.StatusMessage ?? JSON.stringify(data)}`);
  }
}

async function postJson(url: string, body: unknown, label: string): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${label} HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = parseApiResponse(text);
  assertApiOk(data, label);
}

/** 钉钉：打开完整 HTML（链接卡片，含关键词） */
export async function sendDingTalkHtml(
  webhook: string,
  secret: string | undefined,
  payload: PushPayload,
): Promise<void> {
  const url = signedDingTalkUrl(webhook, secret);
  const keyword = process.env.DINGTALK_KEYWORD?.trim();
  const title = withKeyword(payload.title, keyword);
  const htmlUrl = payload.htmlUrl;

  if (!htmlUrl) {
    await sendDingTalkText(webhook, secret, title, payload.markdown);
    return;
  }

  const cardText = withKeyword(
    `${payload.teaser}\n\n请在浏览器中打开查看完整 HTML 排版（与本地生成的 .html 文件一致）。`,
    keyword,
  );

  const tryActionCard = () =>
    postJson(
      url,
      {
        msgtype: 'actionCard',
        actionCard: {
          title,
          text: truncate(cardText, 8000),
          btnOrientation: '0',
          singleTitle: '查看完整 HTML 日报',
          singleURL: htmlUrl,
        },
      },
      'DingTalk-actionCard',
    );

  const tryLink = () =>
    postJson(
      url,
      {
        msgtype: 'link',
        link: {
          title,
          text: truncate(cardText, 500),
          messageUrl: htmlUrl,
          picUrl: process.env.REPORT_PREVIEW_IMAGE_URL?.trim() || '',
        },
      },
      'DingTalk-link',
    );

  try {
    await tryActionCard();
    return;
  } catch (e1) {
    console.warn('[notify] 钉钉 actionCard 失败，尝试 link:', e1 instanceof Error ? e1.message : e1);
  }

  try {
    await tryLink();
    return;
  } catch (e2) {
    const msg = e2 instanceof Error ? e2.message : String(e2);
    if (msg.includes('310000') || msg.includes('关键词')) {
      await sendDingTalkText(webhook, secret, title, `${cardText}\n\n${htmlUrl}`);
      return;
    }
    throw e2;
  }
}

async function sendDingTalkText(
  webhook: string,
  secret: string | undefined,
  title: string,
  body: string,
): Promise<void> {
  const url = signedDingTalkUrl(webhook, secret);
  const keyword = process.env.DINGTALK_KEYWORD?.trim();
  const content = truncate(withKeyword(`${title}\n\n${body}`, keyword), 18000);
  await postJson(url, { msgtype: 'text', text: { content } }, 'DingTalk-text');
}

/** 飞书：交互卡片 + 打开 HTML 按钮 */
export async function sendFeishuHtml(webhook: string, payload: PushPayload): Promise<void> {
  const url = webhook.trim();
  const title = payload.title;
  const htmlUrl = payload.htmlUrl;
  const text = withKeyword(
    truncate(`${title}\n\n${payload.teaser}${htmlUrl ? `\n\n${htmlUrl}` : ''}`, 28000),
    process.env.FEISHU_KEYWORD,
  );

  if (htmlUrl && (url.includes('open.feishu.cn') || url.includes('open.larksuite.com'))) {
    try {
      await postJson(
        url,
        {
          msg_type: 'interactive',
          card: {
            header: {
              title: { tag: 'plain_text', content: title.slice(0, 100) },
              template: 'blue',
            },
            elements: [
              {
                tag: 'div',
                text: { tag: 'lark_md', content: payload.teaser },
              },
              {
                tag: 'action',
                actions: [
                  {
                    tag: 'button',
                    text: { tag: 'plain_text', content: '查看完整 HTML 日报' },
                    type: 'primary',
                    url: htmlUrl,
                  },
                ],
              },
              {
                tag: 'note',
                elements: [
                  {
                    tag: 'plain_text',
                    content: '将在浏览器打开完整 HTML 页面（深色排版、全部章节）',
                  },
                ],
              },
            ],
          },
        },
        'Feishu-interactive',
      );
      return;
    } catch (e) {
      console.warn('[notify] 飞书 interactive 失败，降级 text:', e instanceof Error ? e.message : e);
    }
  }

  await postJson(url, { msg_type: 'text', content: { text } }, 'Feishu-text');
}

/** 企业微信：图文链接打开 HTML */
export async function sendWeChatWorkHtml(webhook: string, payload: PushPayload): Promise<void> {
  const htmlUrl = payload.htmlUrl;
  if (!htmlUrl) {
    await postJson(
      webhook.trim(),
      { msgtype: 'markdown', markdown: { content: truncate(payload.markdown, 3800) } },
      'WeChatWork',
    );
    return;
  }

  await postJson(
    webhook.trim(),
    {
      msgtype: 'news',
      news: {
        articles: [
          {
            title: payload.title.slice(0, 128),
            description: truncate(payload.teaser, 512),
            url: htmlUrl,
            picurl: process.env.REPORT_PREVIEW_IMAGE_URL?.trim() || '',
          },
        ],
      },
    },
    'WeChatWork-news',
  );
}

export async function sendDingTalkMarkdown(
  webhook: string,
  secret: string | undefined,
  title: string,
  markdown: string,
): Promise<void> {
  await sendDingTalkText(webhook, secret, title, markdown);
}

export async function sendFeishuMarkdown(
  webhook: string,
  title: string,
  markdown: string,
): Promise<void> {
  const url = webhook.trim();
  const text = withKeyword(truncate(`${title}\n\n${markdown}`, 28000), process.env.FEISHU_KEYWORD);
  await postJson(url, { msg_type: 'text', content: { text } }, 'Feishu-text');
}

export function resolveChannels(): NotifyChannel[] {
  const raw = (process.env.NOTIFY_CHANNELS ?? '').trim();
  if (raw) {
    const parsed = raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is NotifyChannel => s === 'dingtalk' || s === 'feishu' || s === 'wechat');
    if (parsed.length > 0) return parsed;
  }
  const auto: NotifyChannel[] = [];
  if (process.env.DINGTALK_WEBHOOK?.trim()) auto.push('dingtalk');
  if (process.env.FEISHU_WEBHOOK?.trim()) auto.push('feishu');
  if (process.env.WECHAT_WORK_WEBHOOK?.trim()) auto.push('wechat');
  return auto;
}

export function logNotifyEnv(): void {
  const mask = (v: string | undefined) => (v?.trim() ? `已配置(${v.trim().slice(0, 28)}…)` : '未配置');
  console.log('[notify] NOTIFY_FORMAT =', getNotifyFormat());
  console.log('[notify] NOTIFY_CHANNELS =', process.env.NOTIFY_CHANNELS ?? '(自动推断)');
  console.log('[notify] resolveChannels =', resolveChannels().join(', ') || '(无)');
  console.log('[notify] REPORT_HTML_URL =', mask(process.env.REPORT_HTML_URL));
  console.log('[notify] REPORT_HTML_BASE_URL =', mask(process.env.REPORT_HTML_BASE_URL));
  console.log('[notify] REPORT_USE_GITHUB_RAW =', process.env.REPORT_USE_GITHUB_RAW ?? 'false');
  console.log('[notify] DINGTALK_WEBHOOK =', mask(process.env.DINGTALK_WEBHOOK));
  console.log('[notify] FEISHU_WEBHOOK =', mask(process.env.FEISHU_WEBHOOK));
}

export async function sendNotifications(opts: NotifyOptions): Promise<NotifyResult> {
  const channels = opts.channels ?? resolveChannels();
  const format = getNotifyFormat();
  const result: NotifyResult = { sent: [], skipped: [], errors: [] };
  const { payload } = opts;

  if (channels.length === 0) {
    console.error('[notify] 没有可推送的渠道');
    return result;
  }

  if (format === 'html' && !payload.htmlUrl) {
    console.warn(
      '[notify] NOTIFY_FORMAT=html 但未解析到 HTML 公网 URL，将推送 Markdown 摘要。请配置 REPORT_HTML_BASE_URL 或开启 workflow 中的 commit-reports',
    );
  }

  for (const ch of channels) {
    try {
      if (ch === 'dingtalk') {
        const webhook = process.env.DINGTALK_WEBHOOK?.trim();
        if (!webhook) {
          result.skipped.push({ channel: ch, reason: 'DINGTALK_WEBHOOK 未配置' });
          continue;
        }
        if (format === 'html' && payload.htmlUrl) {
          await sendDingTalkHtml(webhook, process.env.DINGTALK_SECRET, payload);
        } else {
          await sendDingTalkMarkdown(webhook, process.env.DINGTALK_SECRET, payload.title, payload.markdown);
        }
        result.sent.push('dingtalk');
        console.log('[notify] 钉钉推送成功');
      } else if (ch === 'feishu') {
        const webhook = process.env.FEISHU_WEBHOOK?.trim();
        if (!webhook) {
          result.skipped.push({ channel: ch, reason: 'FEISHU_WEBHOOK 未配置' });
          continue;
        }
        if (format === 'html' && payload.htmlUrl) {
          await sendFeishuHtml(webhook, payload);
        } else {
          await sendFeishuMarkdown(webhook, payload.title, payload.markdown);
        }
        result.sent.push('feishu');
        console.log('[notify] 飞书推送成功');
      } else if (ch === 'wechat') {
        const webhook = process.env.WECHAT_WORK_WEBHOOK?.trim();
        if (!webhook) {
          result.skipped.push({ channel: ch, reason: 'WECHAT_WORK_WEBHOOK 未配置' });
          continue;
        }
        await sendWeChatWorkHtml(webhook, payload);
        result.sent.push('wechat');
        console.log('[notify] 企业微信推送成功');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ channel: ch, error: msg });
      console.error(`[notify] ${ch} 推送失败:`, msg);
    }
  }

  if (payload.htmlUrl) {
    console.log('[notify] HTML 日报链接:', payload.htmlUrl);
  }

  return result;
}
