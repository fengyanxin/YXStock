import type { DailyReportData } from './types.js';
import { resolveHtmlReportUrl } from './html-url.js';
import { prepareDingTalkMarkdown, prepareImMarkdown } from './im-markdown.js';

export interface PushPayload {
  title: string;
  htmlUrl?: string;
  htmlFileName: string;
  /** 与 reports/*.md 一致的完整正文 */
  fullMarkdown: string;
  /** 飞书等：完整 MD（表格→列表，标题加粗） */
  imMarkdown: string;
  /** 钉钉：官方 markdown 子集（# 标题、列表、加粗） */
  dingTalkMarkdown: string;
  /** @deprecated 使用 imMarkdown */
  markdown: string;
}

export function buildPushPayload(
  data: DailyReportData,
  htmlFileName: string,
  fullMarkdown: string,
): PushPayload {
  const title = data.weekdayLabel
    ? `热点 · 日报 | YXStock A股行情 ${data.tradeDate}（${data.weekdayLabel}）`
    : `热点 · 日报 | YXStock A股行情 ${data.tradeDate}`;

  const htmlUrl = resolveHtmlReportUrl(htmlFileName);
  const imMarkdown = prepareImMarkdown(fullMarkdown, htmlUrl);
  const dingTalkMarkdown = prepareDingTalkMarkdown(fullMarkdown, htmlUrl);

  return {
    title,
    htmlUrl,
    htmlFileName,
    fullMarkdown,
    imMarkdown,
    dingTalkMarkdown,
    markdown: imMarkdown,
  };
}
