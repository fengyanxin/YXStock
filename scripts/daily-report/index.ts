#!/usr/bin/env npx tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectReportData } from './collect-data.js';
import { buildNarrative } from './analysis.js';
import { renderMarkdown, renderPushMarkdown } from './render-markdown.js';
import { renderHtml } from './render-html.js';
import { sendNotifications } from './notify.js';
import type { GeneratedReport } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    notify: args.includes('--notify'),
    dryRun: args.includes('--dry-run'),
    outDir: getArgValue(args, '--out-dir') ?? path.join(REPO_ROOT, 'reports'),
  };
}

function getArgValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  return args[i + 1];
}

function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

export async function generateDailyReport(now = new Date()): Promise<GeneratedReport> {
  const data = await collectReportData(now);
  const narrative = buildNarrative(data);
  const markdown = renderMarkdown(data, narrative);
  const html = renderHtml(data, narrative);
  const pushMarkdown = renderPushMarkdown(data, narrative);

  return {
    data,
    narrative,
    markdown,
    html,
    pushMarkdown,
    mdPath: '',
    htmlPath: '',
  };
}

async function main() {
  const { notify, dryRun, outDir } = parseArgs();
  const now = new Date();

  if (process.env.SKIP_WEEKEND === 'true' && isWeekend(now)) {
    console.log('周末跳过日报生成');
    process.exit(0);
  }

  console.log('[daily-report] 拉取行情数据…');
  const report = await generateDailyReport(now);
  const { tradeDate, weekdayLabel } = report.data;

  fs.mkdirSync(outDir, { recursive: true });
  const base = `YXStock_行情日报_${tradeDate}`;
  report.mdPath = path.join(outDir, `${base}.md`);
  report.htmlPath = path.join(outDir, `${base}.html`);

  fs.writeFileSync(report.mdPath, report.markdown, 'utf8');
  fs.writeFileSync(report.htmlPath, report.html, 'utf8');
  console.log(`[daily-report] 已写入 ${report.mdPath}`);
  console.log(`[daily-report] 已写入 ${report.htmlPath}`);

  const shouldNotify = notify || process.env.NOTIFY_ON_GENERATE === 'true';
  if (shouldNotify && !dryRun) {
    const title = `YXStock A股日报 ${tradeDate}（${weekdayLabel}）`;
    const repoUrl = process.env.REPORT_REPO_URL;
    let body = report.pushMarkdown;
    if (repoUrl) {
      body += `\n\n---\n完整报告见仓库 \`reports/${base}.md\``;
    }
    console.log('[daily-report] 推送通知…');
    const sent = await sendNotifications({ title, markdown: body });
    if (sent.length === 0) {
      console.warn('[daily-report] 未配置任何 Webhook，跳过推送');
      process.exitCode = 0;
    } else {
      console.log(`[daily-report] 已推送: ${sent.join(', ')}`);
    }
  }

  if (dryRun) {
    console.log('--- push preview ---');
    console.log(report.pushMarkdown.slice(0, 800));
  }
}

main().catch((err) => {
  console.error('[daily-report] 失败:', err);
  process.exit(1);
});
