#!/usr/bin/env npx tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectReportData } from './collect-data.js';
import { buildNarrative } from './analysis.js';
import { renderMarkdown, renderPushMarkdown } from './render-markdown.js';
import { renderHtml } from './render-html.js';
import { logNotifyEnv, sendNotifications } from './notify.js';
import type { GeneratedReport } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    notify: args.includes('--notify'),
    notifyOnly: args.includes('--notify-only'),
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
  const { notify, notifyOnly, dryRun, outDir } = parseArgs();
  const now = new Date();

  if (process.env.SKIP_WEEKEND === 'true' && isWeekend(now)) {
    console.log('周末跳过日报生成');
    process.exit(0);
  }

  let report: GeneratedReport;
  let tradeDate: string;
  let weekdayLabel: string;
  let base: string;

  if (notifyOnly) {
    const files = fs.readdirSync(outDir).filter((f) => f.startsWith('YXStock_行情日报_') && f.endsWith('.md'));
    if (files.length === 0) {
      console.error('[daily-report] --notify-only: reports 目录下无日报文件');
      process.exit(1);
    }
    const latest = files.sort().at(-1)!;
    tradeDate = latest.replace('YXStock_行情日报_', '').replace('.md', '');
    weekdayLabel = '';
    base = `YXStock_行情日报_${tradeDate}`;
    const markdown = fs.readFileSync(path.join(outDir, latest), 'utf8');
    report = {
      data: { tradeDate, weekdayLabel: '', dataTimeLabel: '', totalScanned: 0, stats: { limitUp: 0, limitDown: 0, up: 0, down: 0, flat: 0 }, indices: [], northbound: [], ztPool: [], dtPoolCount: 0, gainers: [], losers: [], industryTop: [], conceptTop: [], sectorDataOk: true },
      narrative: {} as GeneratedReport['narrative'],
      markdown,
      html: '',
      pushMarkdown: markdown.slice(0, 3500),
      mdPath: path.join(outDir, latest),
      htmlPath: '',
    };
    console.log(`[daily-report] --notify-only 使用已有报告 ${latest}`);
  } else {
    console.log('[daily-report] 拉取行情数据…');
    report = await generateDailyReport(now);
    tradeDate = report.data.tradeDate;
    weekdayLabel = report.data.weekdayLabel;

    fs.mkdirSync(outDir, { recursive: true });
    base = `YXStock_行情日报_${tradeDate}`;
    report.mdPath = path.join(outDir, `${base}.md`);
    report.htmlPath = path.join(outDir, `${base}.html`);

    fs.writeFileSync(report.mdPath, report.markdown, 'utf8');
    fs.writeFileSync(report.htmlPath, report.html, 'utf8');
    console.log(`[daily-report] 已写入 ${report.mdPath}`);
    console.log(`[daily-report] 已写入 ${report.htmlPath}`);
  }

  const shouldNotify = notify || notifyOnly || process.env.NOTIFY_ON_GENERATE === 'true';
  if (shouldNotify && !dryRun) {
    const title = weekdayLabel
      ? `YXStock A股日报 ${tradeDate}（${weekdayLabel}）`
      : `YXStock A股日报 ${tradeDate}`;
    const repoUrl = process.env.REPORT_REPO_URL;
    let body = report.pushMarkdown;
    if (repoUrl) {
      body += `\n\n---\n完整报告见仓库 \`reports/${base}.md\``;
    }
    console.log('[daily-report] 推送通知…');
    logNotifyEnv();
    const { sent, skipped, errors } = await sendNotifications({ title, markdown: body });
    if (skipped.length > 0) {
      for (const s of skipped) console.warn(`[daily-report] 跳过 ${s.channel}: ${s.reason}`);
    }
    if (sent.length > 0) {
      console.log(`[daily-report] 已推送: ${sent.join(', ')}`);
    }
    if (errors.length > 0) {
      console.error('[daily-report] 部分渠道推送失败:', errors);
      process.exit(1);
    }
    if (sent.length === 0) {
      console.error(
        '[daily-report] 推送失败：未成功发送到任何渠道。请检查 GitHub Secrets 是否配置 DINGTALK_WEBHOOK / FEISHU_WEBHOOK（勿留空 NOTIFY_CHANNELS）',
      );
      process.exit(1);
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
