import crypto from 'node:crypto';
import { truncate } from './format.js';

export type NotifyChannel = 'dingtalk' | 'feishu' | 'wechat';

export interface NotifyOptions {
  title: string;
  markdown: string;
  channels?: NotifyChannel[];
}

function signedDingTalkUrl(webhook: string, secret?: string): string {
  if (!secret) return webhook;
  const timestamp = Date.now();
  const stringToSign = `${timestamp}\n${secret}`;
  const sign = encodeURIComponent(
    crypto.createHmac('sha256', secret).update(stringToSign).digest('base64'),
  );
  const sep = webhook.includes('?') ? '&' : '?';
  return `${webhook}${sep}timestamp=${timestamp}&sign=${sign}`;
}

async function postJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { errcode?: number; errmsg?: string; code?: number; msg?: string };
  if (data.errcode !== undefined && data.errcode !== 0) {
    throw new Error(`DingTalk/WeChat error ${data.errcode}: ${data.errmsg}`);
  }
  if (data.code !== undefined && data.code !== 0) {
    throw new Error(`Feishu error ${data.code}: ${data.msg}`);
  }
}

export async function sendDingTalk(
  webhook: string,
  secret: string | undefined,
  title: string,
  markdown: string,
): Promise<void> {
  const url = signedDingTalkUrl(webhook, secret);
  const text = truncate(markdown, 18000);
  await postJson(url, {
    msgtype: 'markdown',
    markdown: { title, text },
  });
}

export async function sendWeChatWork(webhook: string, markdown: string): Promise<void> {
  const content = truncate(markdown, 3800);
  await postJson(webhook, {
    msgtype: 'markdown',
    markdown: { content },
  });
}

export async function sendFeishu(webhook: string, title: string, markdown: string): Promise<void> {
  const text = truncate(markdown, 28000);
  await postJson(webhook, {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: title },
        template: 'blue',
      },
      elements: [
        {
          tag: 'div',
          text: { tag: 'lark_md', content: text },
        },
      ],
    },
  });
}

export async function sendNotifications(opts: NotifyOptions): Promise<string[]> {
  const channels = opts.channels ?? detectChannels();
  const sent: string[] = [];

  for (const ch of channels) {
    if (ch === 'dingtalk') {
      const webhook = process.env.DINGTALK_WEBHOOK;
      if (!webhook) {
        console.warn('[notify] DINGTALK_WEBHOOK 未配置，跳过钉钉');
        continue;
      }
      await sendDingTalk(webhook, process.env.DINGTALK_SECRET, opts.title, opts.markdown);
      sent.push('dingtalk');
    }
    if (ch === 'feishu') {
      const webhook = process.env.FEISHU_WEBHOOK;
      if (!webhook) {
        console.warn('[notify] FEISHU_WEBHOOK 未配置，跳过飞书');
        continue;
      }
      await sendFeishu(webhook, opts.title, opts.markdown);
      sent.push('feishu');
    }
    if (ch === 'wechat') {
      const webhook = process.env.WECHAT_WORK_WEBHOOK;
      if (!webhook) {
        console.warn('[notify] WECHAT_WORK_WEBHOOK 未配置，跳过企业微信');
        continue;
      }
      await sendWeChatWork(webhook, opts.markdown);
      sent.push('wechat');
    }
  }

  return sent;
}

function detectChannels(): NotifyChannel[] {
  const raw = process.env.NOTIFY_CHANNELS ?? 'dingtalk,feishu,wechat';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is NotifyChannel => s === 'dingtalk' || s === 'feishu' || s === 'wechat');
}
