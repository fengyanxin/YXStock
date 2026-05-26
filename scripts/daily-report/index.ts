#!/usr/bin/env npx tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectReportData } from './collect-data.js';
import { buildNarrative } from './analysis.js';
import { renderMarkdown, renderPushMarkdown } from './render-markdown.js';
import { renderHtml } from './render-html.js';
import { buildPushPayload } from './push-payload.js';
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
  let htmlFileName: string;

  if (notifyOnly) {
    const htmlFiles = fs
      .readdirSync(outDir)
      .filter((f) => f.startsWith('YXStock_行情日报_') && f.endsWith('.html'));
    if (htmlFiles.length === 0) {
      console.error('[daily-report] --notify-only: reports 目录下无 HTML 日报');
      process.exit(1);
    }
    htmlFileName = htmlFiles.sort().at(-1)!;
    const tradeDate = htmlFileName.replace('YXStock_行情日报_', '').replace('.html', '');
    const mdPath = path.join(outDir, `YXStock_行情日报_${tradeDate}.md`);
    const markdown = fs.existsSync(mdPath)
      ? fs.readFileSync(mdPath, 'utf8')
      : fs.readFileSync(path.join(outDir, htmlFileName), 'utf8').slice(0, 2000);
    report = {
      data: {
        tradeDate,
        weekdayLabel: '',
        dataTimeLabel: '',
        totalScanned: 0,
        stats: { limitUp: 0, limitDown: 0, up: 0, down: 0, flat: 0 },
        indices: [],
        northbound: [],
        ztPool: [],
        dtPoolCount: 0,
        gainers: [],
        losers: [],
        industryTop: [],
        conceptTop: [],
        sectorDataOk: true,
      },
      narrative: {} as GeneratedReport['narrative'],
      markdown,
      html: fs.readFileSync(path.join(outDir, htmlFileName), 'utf8'),
      pushMarkdown: markdown.slice(0, 3500),
      mdPath,
      htmlPath: path.join(outDir, htmlFileName),
    };
    console.log(`[daily-report] --notify-only 使用 ${htmlFileName}`);
  } else {
    console.log('[daily-report] 拉取行情数据…');
    report = await generateDailyReport(now);

    fs.mkdirSync(outDir, { recursive: true });
    const base = `YXStock_行情日报_${report.data.tradeDate}`;
    htmlFileName = `${base}.html`;
    report.mdPath = path.join(outDir, `${base}.md`);
    report.htmlPath = path.join(outDir, htmlFileName);

    fs.writeFileSync(report.mdPath, report.markdown, 'utf8');
    fs.writeFileSync(report.htmlPath, report.html, 'utf8');
    console.log(`[daily-report] 已写入 ${report.mdPath}`);
    console.log(`[daily-report] 已写入 ${report.htmlPath}`);

    const publicDir = path.join(REPO_ROOT, 'apps/web/public/reports');
    if (process.env.COPY_REPORT_TO_WEB_PUBLIC === 'true') {
      fs.mkdirSync(publicDir, { recursive: true });
      fs.writeFileSync(path.join(publicDir, htmlFileName), report.html, 'utf8');
      fs.writeFileSync(path.join(publicDir, 'latest.html'), report.html, 'utf8');
      console.log(`[daily-report] 已同步到 ${publicDir}/latest.html`);
    }
  }

  const shouldNotify = notify || notifyOnly || process.env.NOTIFY_ON_GENERATE === 'true';
  if (shouldNotify && !dryRun) {
    const pushPayload = buildPushPayload(report.data, htmlFileName, report.markdown);

    console.log('[daily-report] 推送通知（完整 MD 正文 + HTML 链接）…');
    logNotifyEnv();
    const { sent, skipped, errors } = await sendNotifications({ payload: pushPayload });

    if (skipped.length > 0) {
      for (const s of skipped) console.warn(`[daily-report] 跳过 ${s.channel}: ${s.reason}`);
    }
    if (sent.length > 0) {
      console.log(`[daily-report] 已推送: ${sent.join(', ')}`);
    }
    if (errors.length > 0) {
      console.error('[daily-report] 部分渠道推送失败:', errors);
      if (sent.length === 0) process.exit(1);
      console.warn('[daily-report] 至少一个渠道已成功');
    }
    if (sent.length === 0) {
      console.error('[daily-report] 推送失败：未成功发送到任何渠道');
      process.exit(1);
    }
  }

  if (dryRun) {
    const p = buildPushPayload(report.data, htmlFileName, report.markdown);
    console.log('--- push preview ---');
    console.log('HTML URL:', p.htmlUrl ?? '(未配置)');
    console.log('IM MD 长度:', p.imMarkdown.length);
    console.log(p.imMarkdown.slice(0, 600));
  }
}

main().catch((err) => {
  console.error('[daily-report] 失败:', err);
  process.exit(1);
});
