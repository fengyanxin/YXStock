import type { DailyReportData } from './types.js';
import { resolveHtmlReportUrl } from './html-url.js';
import { prepareImMarkdown } from './im-markdown.js';

export interface PushPayload {
  title: string;
  htmlUrl?: string;
  htmlFileName: string;
  /** 与 reports/*.md 一致的完整正文 */
  fullMarkdown: string;
  /** 钉钉/飞书兼容后的完整 MD 正文（用于推送预览） */
  imMarkdown: string;
  /** @deprecated 使用 imMarkdown */
  markdown: string;
}

export function buildPushPayload(
  data: DailyReportData,
  htmlFileName: string,
  fullMarkdown: string,
): PushPayload {
  const title = data.weekdayLabel
    ? `日报 | YXStock A股行情 ${data.tradeDate}（${data.weekdayLabel}）`
    : `日报 | YXStock A股行情 ${data.tradeDate}`;

  const htmlUrl = resolveHtmlReportUrl(htmlFileName);
  const imMarkdown = prepareImMarkdown(fullMarkdown, htmlUrl);

  return {
    title,
    htmlUrl,
    htmlFileName,
    fullMarkdown,
    imMarkdown,
    markdown: imMarkdown,
  };
}
