import crypto from 'node:crypto';
import { truncate } from './format.js';
import type { PushPayload } from './push-payload.js';
import {
  plainTextFromDingTalkMarkdown,
  splitDingTalkMarkdown,
  splitImMarkdown,
} from './im-markdown.js';

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

/** 钉钉机器人自定义关键词（未配置 Secret 时默认「热点」，与本项目钉钉机器人一致） */
export function getDingTalkKeyword(): string {
  return process.env.DINGTALK_KEYWORD?.trim() || '热点';
}

/** 确保关键词出现在正文前部（钉钉只校验 text/markdown.text，标题单独字段也需包含） */
function applyDingTalkKeyword(text: string): string {
  const kw = getDingTalkKeyword();
  if (text.slice(0, 150).includes(kw)) return text;
  return `${kw}\n\n${text}`;
}

export function getDingTalkSecret(): string | undefined {
  const s = process.env.DINGTALK_SECRET?.trim();
  return s || undefined;
}

function withKeyword(text: string, keyword?: string): string {
  const kw = keyword?.trim();
  if (!kw || text.includes(kw)) return text;
  return `${kw}\n\n${text}`;
}

function isDingTalkKeywordError(msg: string): boolean {
  return msg.includes('310000') || msg.includes('关键词');
}

function isDingTalkSignError(msg: string): boolean {
  return /31000[12]|签名|sign/i.test(msg);
}

function formatDingTalkErrorHint(msg: string): string {
  if (isDingTalkKeywordError(msg)) {
    const kw = getDingTalkKeyword();
    if (kw) {
      return `${msg} → 请确认 DINGTALK_KEYWORD 与机器人「自定义关键词」一致（当前: 「${kw}」）`;
    }
    return `${msg} → 机器人已启用「自定义关键词」：在 Secrets 添加 DINGTALK_KEYWORD，或到群设置关闭关键词校验`;
  }
  if (isDingTalkSignError(msg)) {
    return `${msg} → 机器人已启用加签：在 Secrets 配置 DINGTALK_SECRET；未启用加签则勿配置该 Secret`;
  }
  return msg;
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

/** 钉钉 Markdown 消息（完整日报正文）；可选 actionCard 以改善表格展示 */
async function sendDingTalkMarkdownMessage(
  webhook: string,
  secret: string | undefined,
  title: string,
  markdownBody: string,
  htmlUrl?: string,
): Promise<void> {
  const url = signedDingTalkUrl(webhook, secret);
  const mdTitle = applyDingTalkKeyword(title).slice(0, 100);
  const mdText = truncate(applyDingTalkKeyword(markdownBody), 19000);

  const useActionCard =
    process.env.DINGTALK_USE_ACTION_CARD === 'true' && mdText.length <= 18000;

  if (useActionCard) {
    const card: Record<string, unknown> = {
      title: mdTitle,
      text: mdText,
    };
    if (htmlUrl) {
      card.singleTitle = '查看完整 HTML 日报';
      card.singleURL = htmlUrl;
    }
    await postJson(url, { msgtype: 'actionCard', actionCard: card }, 'DingTalk-actionCard');
    return;
  }

  await postJson(
    url,
    {
      msgtype: 'markdown',
      markdown: { title: mdTitle, text: mdText },
    },
    'DingTalk-markdown',
  );
}

async function sendDingTalkText(
  webhook: string,
  secret: string | undefined,
  title: string,
  body: string,
): Promise<void> {
  const url = signedDingTalkUrl(webhook, secret);
  const content = truncate(applyDingTalkKeyword(`${title}\n\n${body}`), 19000);
  await postJson(url, { msgtype: 'text', text: { content } }, 'DingTalk-text');
}

/** 默认 markdown 渲染；仅 DINGTALK_PREFER_TEXT=true 时用纯文本 */
async function sendDingTalkChunk(
  webhook: string,
  secret: string | undefined,
  partTitle: string,
  chunk: string,
  htmlUrl?: string,
): Promise<void> {
  const preferText = process.env.DINGTALK_PREFER_TEXT === 'true';

  if (preferText) {
    await sendDingTalkText(webhook, secret, partTitle, plainTextFromDingTalkMarkdown(chunk));
    return;
  }

  try {
    await sendDingTalkMarkdownMessage(webhook, secret, partTitle, chunk, htmlUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[notify] 钉钉 markdown 失败，降级纯文本:', msg);
    await sendDingTalkText(webhook, secret, partTitle, plainTextFromDingTalkMarkdown(chunk));
  }
}

/** 钉钉：完整 MD 正文 + 可选 HTML 按钮（正文优先 markdown 类型） */
export async function sendDingTalkHtml(
  webhook: string,
  secret: string | undefined,
  payload: PushPayload,
): Promise<void> {
  const body = payload.dingTalkMarkdown;
  const chunks = splitDingTalkMarkdown(body, 12000);

  for (let i = 0; i < chunks.length; i++) {
    const partTitle = chunks.length > 1 ? `${payload.title} (${i + 1}/${chunks.length})` : payload.title;
    const htmlLink = i === chunks.length - 1 ? payload.htmlUrl : undefined;
    await sendDingTalkChunk(webhook, secret, partTitle, chunks[i], htmlLink);
  }

  // 正文末尾已含 HTML 链接；默认不再发第二条 actionCard（设 DINGTALK_HTML_BUTTON=true 可恢复）
  if (payload.htmlUrl && process.env.DINGTALK_HTML_BUTTON === 'true') {
    const url = signedDingTalkUrl(webhook, secret);
    const cardText = applyDingTalkKeyword('在浏览器中打开可查看完整 HTML 排版。');
    try {
      await postJson(
        url,
        {
          msgtype: 'actionCard',
          actionCard: {
            title: applyDingTalkKeyword('HTML 排版版').slice(0, 100),
            text: cardText,
            singleTitle: '打开 HTML 日报',
            singleURL: payload.htmlUrl,
          },
        },
        'DingTalk-actionCard',
      );
    } catch (e) {
      console.warn(
        '[notify] 钉钉 HTML 按钮卡片失败:',
        e instanceof Error ? e.message : e,
      );
    }
  }

  console.log(`[notify] 钉钉已推送 ${chunks.length} 条`);
}

/** 飞书：lark_md 渲染完整日报 + HTML 按钮 */
export async function sendFeishuHtml(webhook: string, payload: PushPayload): Promise<void> {
  const url = webhook.trim();
  const title = payload.title;
  const imMd = truncate(
    withKeyword(payload.imMarkdown, process.env.FEISHU_KEYWORD),
    28000,
  );
  const htmlUrl = payload.htmlUrl;
  const isOpenApiHook =
    url.includes('open.feishu.cn') || url.includes('open.larksuite.com');

  if (isOpenApiHook) {
    const elements: Record<string, unknown>[] = [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: imMd },
      },
    ];
    if (htmlUrl) {
      elements.push({
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '查看完整 HTML 日报' },
            type: 'primary',
            url: htmlUrl,
          },
        ],
      });
    }

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
            elements,
          },
        },
        'Feishu-interactive',
      );
      return;
    } catch (e) {
      console.warn('[notify] 飞书 interactive 失败，降级 text:', e instanceof Error ? e.message : e);
    }
  }

  const chunks = splitImMarkdown(imMd, 15000);
  for (let i = 0; i < chunks.length; i++) {
    const prefix = chunks.length > 1 ? `【${i + 1}/${chunks.length}】\n` : '';
    await postJson(
      url,
      { msg_type: 'text', content: { text: `${title}\n\n${prefix}${chunks[i]}` } },
      `Feishu-text-${i + 1}`,
    );
  }
}

export async function sendFeishuMarkdown(webhook: string, title: string, markdown: string): Promise<void> {
  const payload: PushPayload = {
    title,
    htmlFileName: '',
    fullMarkdown: markdown,
    imMarkdown: markdown,
    dingTalkMarkdown: markdown,
    markdown,
  };
  await sendFeishuHtml(webhook, payload);
}

export async function sendDingTalkMarkdown(
  webhook: string,
  secret: string | undefined,
  title: string,
  markdown: string,
): Promise<void> {
  const chunks = splitImMarkdown(markdown, 12000);
  for (let i = 0; i < chunks.length; i++) {
    const partTitle = chunks.length > 1 ? `${title} (${i + 1}/${chunks.length})` : title;
    await sendDingTalkChunk(webhook, secret, partTitle, chunks[i]);
  }
}

/** 仅发一条测试消息，用于验证 Webhook / 关键词 / 加签 */
export async function sendDingTalkTest(webhook: string, secret?: string): Promise<void> {
  const kw = getDingTalkKeyword();
  await sendDingTalkText(
    webhook,
    secret,
    `${kw} · YXStock 推送测试`,
    `这是一条测试消息（关键词: ${kw}）。时间: ${new Date().toISOString()}`,
  );
}

/** 企业微信：Markdown 摘要 + 图文链 HTML */
export async function sendWeChatWorkHtml(webhook: string, payload: PushPayload): Promise<void> {
  const htmlUrl = payload.htmlUrl;
  const md = truncate(payload.imMarkdown, 3800);

  if (htmlUrl) {
    await postJson(
      webhook.trim(),
      {
        msgtype: 'news',
        news: {
          articles: [
            {
              title: payload.title.slice(0, 128),
              description: md.replace(/[#*`\[\]]/g, '').slice(0, 480),
              url: htmlUrl,
              picurl: process.env.REPORT_PREVIEW_IMAGE_URL?.trim() || '',
            },
          ],
        },
      },
      'WeChatWork-news',
    );
    await postJson(
      webhook.trim(),
      { msgtype: 'markdown', markdown: { content: md } },
      'WeChatWork-markdown',
    );
    return;
  }

  await postJson(
    webhook.trim(),
    { msgtype: 'markdown', markdown: { content: md } },
    'WeChatWork',
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
  const auto: NotifyChannel[] = [];
  if (process.env.DINGTALK_WEBHOOK?.trim()) auto.push('dingtalk');
  if (process.env.FEISHU_WEBHOOK?.trim()) auto.push('feishu');
  if (process.env.WECHAT_WORK_WEBHOOK?.trim()) auto.push('wechat');
  return auto;
}

export function logNotifyEnv(): void {
  const mask = (v: string | undefined) => (v?.trim() ? `已配置(${v.trim().slice(0, 28)}…)` : '未配置');
  const channels = resolveChannels();
  console.log('[notify] NOTIFY_FORMAT =', getNotifyFormat());
  console.log('[notify] NOTIFY_CHANNELS =', process.env.NOTIFY_CHANNELS ?? '(自动推断)');
  console.log('[notify] resolveChannels =', channels.join(', ') || '(无)');
  console.log('[notify] DINGTALK_WEBHOOK =', mask(process.env.DINGTALK_WEBHOOK));
  console.log('[notify] DINGTALK_SECRET =', getDingTalkSecret() ? '已配置' : '未配置（默认不加签）');
  const kw = getDingTalkKeyword();
  console.log(
    '[notify] DINGTALK_KEYWORD =',
    kw,
    process.env.DINGTALK_KEYWORD?.trim() ? '(来自 Secret)' : '(默认「热点」)',
  );
  if (process.env.DINGTALK_WEBHOOK?.trim() && !channels.includes('dingtalk')) {
    console.warn('[notify] 已配置 DINGTALK_WEBHOOK 但 NOTIFY_CHANNELS 未含 dingtalk，将跳过钉钉');
  }
  console.log('[notify] DINGTALK_PREFER_TEXT =', process.env.DINGTALK_PREFER_TEXT === 'true', '(默认 false=markdown 渲染)');
  console.log('[notify] FEISHU_WEBHOOK =', mask(process.env.FEISHU_WEBHOOK));
  console.log('[notify] REPORT_HTML_URL =', mask(process.env.REPORT_HTML_URL));
}

export async function sendNotifications(opts: NotifyOptions): Promise<NotifyResult> {
  const channels = opts.channels ?? resolveChannels();
  const format = getNotifyFormat();
  const result: NotifyResult = { sent: [], skipped: [], errors: [] };
  const { payload } = opts;

  console.log(
    `[notify] 正文长度: 飞书 ${payload.imMarkdown.length} 字 · 钉钉 ${payload.dingTalkMarkdown.length} 字`,
  );

  if (channels.length === 0) {
    console.error('[notify] 没有可推送的渠道');
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
        if (format === 'html' && payload.htmlUrl) {
          await sendDingTalkHtml(webhook, getDingTalkSecret(), payload);
        } else {
          await sendDingTalkMarkdown(
            webhook,
            getDingTalkSecret(),
            payload.title,
            payload.dingTalkMarkdown,
          );
        }
        result.sent.push('dingtalk');
        console.log('[notify] 钉钉推送成功');
      } else if (ch === 'feishu') {
        const webhook = process.env.FEISHU_WEBHOOK?.trim();
        if (!webhook) {
          result.skipped.push({ channel: ch, reason: 'FEISHU_WEBHOOK 未配置' });
          continue;
        }
        await sendFeishuHtml(webhook, payload);
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
      const raw = err instanceof Error ? err.message : String(err);
      const msg = ch === 'dingtalk' ? formatDingTalkErrorHint(raw) : raw;
      result.errors.push({ channel: ch, error: msg });
      console.error(`[notify] ${ch} 推送失败:`, msg);
    }
  }

  if (payload.htmlUrl) {
    console.log('[notify] HTML 日报链接:', payload.htmlUrl);
  }

  return result;
}
