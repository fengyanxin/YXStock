import type { DailyReportData } from './types.js';
import { formatPercent } from './format.js';
import { resolveHtmlReportUrl } from './html-url.js';

export interface PushPayload {
  title: string;
  htmlUrl?: string;
  htmlFileName: string;
  teaser: string;
  /** markdown 摘要（html 模式作备用） */
  markdown: string;
}

export function buildTeaser(data: DailyReportData): string {
  const indices = data.indices
    .map((i) => `${i.name} ${i.price.toFixed(2)} (${formatPercent(i.changePercent)})`)
    .join(' · ');
  return [
    `涨停 ${data.stats.limitUp} / 跌停 ${data.stats.limitDown} · 扫描 ${data.totalScanned} 只`,
    indices || '指数数据加载中',
    '点击下方按钮在浏览器中查看完整 HTML 日报（含全部章节与表格）。',
  ].join('\n');
}

export function buildPushPayload(
  data: DailyReportData,
  htmlFileName: string,
  fallbackMarkdown: string,
): PushPayload {
  const title = data.weekdayLabel
    ? `日报 | YXStock A股行情 ${data.tradeDate}（${data.weekdayLabel}）`
    : `日报 | YXStock A股行情 ${data.tradeDate}`;

  const htmlUrl = resolveHtmlReportUrl(htmlFileName);
  const teaser = buildTeaser(data);

  let markdown = teaser;
  if (htmlUrl) {
    markdown = `${teaser}\n\n**完整 HTML 日报：** ${htmlUrl}`;
  } else {
    markdown =
      `${teaser}\n\n（未配置 HTML 公网地址，请在 Secrets 设置 REPORT_HTML_BASE_URL 或开启推送前 commit reports）\n\n` +
      fallbackMarkdown.slice(0, 6000);
  }

  return { title, htmlUrl, htmlFileName, teaser, markdown };
}
