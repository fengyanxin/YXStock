import crypto from 'node:crypto';
import { truncate } from './format.js';

export type NotifyChannel = 'dingtalk' | 'feishu' | 'wechat';

export interface NotifyOptions {
  title: string;
  markdown: string;
  channels?: NotifyChannel[];
}

export interface NotifyResult {
  sent: NotifyChannel[];
  skipped: { channel: NotifyChannel; reason: string }[];
  errors: { channel: NotifyChannel; error: string }[];
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

function applyKeyword(text: string, keyword: string | undefined): string {
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

export async function sendDingTalk(
  webhook: string,
  secret: string | undefined,
  title: string,
  markdown: string,
): Promise<void> {
  const url = signedDingTalkUrl(webhook, secret);
  const text = applyKeyword(truncate(markdown, 18000), process.env.DINGTALK_KEYWORD);
  await postJson(
    url,
    {
      msgtype: 'markdown',
      markdown: { title: applyKeyword(title, process.env.DINGTALK_KEYWORD), text },
    },
    'DingTalk',
  );
}

export async function sendWeChatWork(webhook: string, markdown: string): Promise<void> {
  const content = truncate(markdown, 3800);
  await postJson(
    webhook.trim(),
    { msgtype: 'markdown', markdown: { content } },
    'WeChatWork',
  );
}

/** 飞书自定义机器人：优先 text（兼容性最好），失败时不再抛二次错误 */
export async function sendFeishu(webhook: string, title: string, markdown: string): Promise<void> {
  const url = webhook.trim();
  const text = applyKeyword(truncate(`${title}\n\n${markdown}`, 28000), process.env.FEISHU_KEYWORD);

  // 方式 1：纯文本（绝大多数群机器人可用）
  try {
    await postJson(url, { msg_type: 'text', content: { text } }, 'Feishu-text');
    return;
  } catch (e1) {
    console.warn('[notify] Feishu text 失败，尝试 post:', e1 instanceof Error ? e1.message : e1);
  }

  // 方式 2：富文本 post
  const lines = text.split('\n').slice(0, 40);
  await postJson(
    url,
    {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: title.slice(0, 100),
            content: lines.map((line) => [{ tag: 'text', text: line || ' ' }]),
          },
        },
      },
    },
    'Feishu-post',
  );
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
  // 未设置或无效时：按已配置的 Webhook 自动推断
  const auto: NotifyChannel[] = [];
  if (process.env.DINGTALK_WEBHOOK?.trim()) auto.push('dingtalk');
  if (process.env.FEISHU_WEBHOOK?.trim()) auto.push('feishu');
  if (process.env.WECHAT_WORK_WEBHOOK?.trim()) auto.push('wechat');
  return auto;
}

export function logNotifyEnv(): void {
  const mask = (v: string | undefined) => (v?.trim() ? `已配置(${v.trim().slice(0, 28)}…)` : '未配置');
  console.log('[notify] NOTIFY_CHANNELS =', process.env.NOTIFY_CHANNELS ?? '(自动推断)');
  console.log('[notify] resolveChannels =', resolveChannels().join(', ') || '(无)');
  console.log('[notify] DINGTALK_WEBHOOK =', mask(process.env.DINGTALK_WEBHOOK));
  console.log('[notify] DINGTALK_SECRET =', process.env.DINGTALK_SECRET?.trim() ? '已配置' : '未配置');
  console.log('[notify] FEISHU_WEBHOOK =', mask(process.env.FEISHU_WEBHOOK));
  console.log('[notify] WECHAT_WORK_WEBHOOK =', mask(process.env.WECHAT_WORK_WEBHOOK));
}

export async function sendNotifications(opts: NotifyOptions): Promise<NotifyResult> {
  const channels = opts.channels ?? resolveChannels();
  const result: NotifyResult = { sent: [], skipped: [], errors: [] };

  if (channels.length === 0) {
    console.error('[notify] 没有可推送的渠道：请在 Secrets 中配置 DINGTALK_WEBHOOK / FEISHU_WEBHOOK 等');
    return result;
  }

  for (const ch of channels) {
    try {
      if (ch === 'dingtalk') {
        const webhook = process.env.DINGTALK_WEBHOOK?.trim();
        if (!webhook) {
          result.skipped.push({ channel: ch, reason: 'DINGTALK_WEBHOOK 未配置' });
          continue;
        }
        await sendDingTalk(webhook, process.env.DINGTALK_SECRET, opts.title, opts.markdown);
        result.sent.push('dingtalk');
        console.log('[notify] 钉钉推送成功');
      } else if (ch === 'feishu') {
        const webhook = process.env.FEISHU_WEBHOOK?.trim();
        if (!webhook) {
          result.skipped.push({ channel: ch, reason: 'FEISHU_WEBHOOK 未配置' });
          continue;
        }
        if (!webhook.includes('open.feishu.cn') && !webhook.includes('open.larksuite.com')) {
          console.warn('[notify] FEISHU_WEBHOOK 域名异常，请确认来自飞书群机器人');
        }
        await sendFeishu(webhook, opts.title, opts.markdown);
        result.sent.push('feishu');
        console.log('[notify] 飞书推送成功');
      } else if (ch === 'wechat') {
        const webhook = process.env.WECHAT_WORK_WEBHOOK?.trim();
        if (!webhook) {
          result.skipped.push({ channel: ch, reason: 'WECHAT_WORK_WEBHOOK 未配置' });
          continue;
        }
        await sendWeChatWork(webhook, opts.markdown);
        result.sent.push('wechat');
        console.log('[notify] 企业微信推送成功');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ channel: ch, error: msg });
      console.error(`[notify] ${ch} 推送失败:`, msg);
    }
  }

  return result;
}
