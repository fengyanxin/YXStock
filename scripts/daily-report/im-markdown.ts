import { truncate } from './format.js';

type TableRowFormatter = (headers: string[], rows: string[][]) => string;

/** 飞书等：表格转列表 + 标题改加粗（lark_md 友好） */
export function prepareImMarkdown(fullMarkdown: string, htmlUrl?: string): string {
  let md = normalizeSource(fullMarkdown);
  md = convertPipeTables(md, formatTableAsBulletList);
  md = headingsToBold(md);
  md = collapseBlankLines(md);

  if (htmlUrl) {
    md += `\n\n**完整 HTML 版（浏览器排版）**\n\n[点击查看完整 HTML 日报](${htmlUrl})\n`;
  }

  return capLength(md);
}

/**
 * 钉钉机器人 markdown 子集：保留 # 标题、**加粗**、- 列表、> 引用、[链接](url)
 * 勿用 GitHub 扩展语法（|--- 表格、--- 分隔线等）
 */
export function prepareDingTalkMarkdown(fullMarkdown: string, htmlUrl?: string): string {
  let md = normalizeSource(fullMarkdown);
  md = md.replace(/^# (.+)$/m, '## $1');
  md = convertPipeTables(md, formatTableAsDingTalkList);
  md = simplifyForDingTalk(md);
  md = collapseBlankLines(md);

  if (htmlUrl) {
    md += `\n\n### 完整 HTML 版\n\n[点击查看浏览器排版](${htmlUrl})`;
  }

  return capLength(md);
}

function normalizeSource(fullMarkdown: string): string {
  return fullMarkdown.replace(/\r\n/g, '\n').trim();
}

function collapseBlankLines(md: string): string {
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

function capLength(md: string): string {
  const maxLen = Number(process.env.NOTIFY_IM_MAX_CHARS ?? 28000);
  if (md.length <= maxLen) return md;
  const cut = truncate(md, maxLen - 80);
  return `${cut}\n\n…（正文过长已截断，请点击 HTML 链接查看完整版）`;
}

/** ATX 标题 → 加粗行（飞书 lark_md） */
function headingsToBold(md: string): string {
  return md.replace(/^(#{1,6})\s+(.+)$/gm, (_m, hashes: string, raw: string) => {
    const level = hashes.length;
    const title = raw.trim();
    const inner = title.match(/^\*\*(.+)\*\*$/)?.[1] ?? title;
    const line = `**${inner}**`;
    if (level <= 2) return `\n\n${line}\n\n`;
    return `\n${line}\n`;
  });
}

/** 去掉钉钉不支持的语法，避免回退成“源码感” */
function simplifyForDingTalk(md: string): string {
  return md
    .replace(/^---\s*$/gm, '\n')
    .replace(/^\*([^*\n]+)\*$/gm, '$1')
    .replace(/\n{3,}/g, '\n\n');
}

function convertPipeTables(md: string, formatTable: TableRowFormatter): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1] ?? '';

    if (line.trim().startsWith('|') && /^\|[\s\-:|]+\|$/.test(next.trim())) {
      const headerCells = parseTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      out.push(formatTable(headerCells, rows));
      continue;
    }

    out.push(line);
    i++;
  }

  return out.join('\n');
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function formatTableAsBulletList(headers: string[], rows: string[][]): string {
  const parts: string[] = [''];
  for (const row of rows) {
    const cells = row.map((cell, idx) => {
      const h = headers[idx] ?? '';
      return h ? `**${h}** ${cell}` : cell;
    });
    parts.push(`- ${cells.join(' · ')}`);
  }
  parts.push('');
  return parts.join('\n');
}

function formatTableAsDingTalkList(headers: string[], rows: string[][]): string {
  const parts: string[] = [''];
  for (const row of rows) {
    const cells = row.map((cell, idx) => {
      const h = headers[idx] ?? '';
      const plain = cell.replace(/\*\*/g, '');
      return h ? `**${h}** ${plain}` : plain;
    });
    parts.push(`- ${cells.join('，')}`);
  }
  parts.push('');
  return parts.join('\n');
}

/** 飞书等：按加粗章节拆分 */
export function splitImMarkdown(md: string, maxChunk = 12000): string[] {
  return splitMarkdownChunks(md, /(?=\n\*\*[一二三四五六七]、[^*\n]+\*\*\n)/, maxChunk);
}

/** 钉钉：按 ## 章节拆分 */
export function splitDingTalkMarkdown(md: string, maxChunk = 12000): string[] {
  return splitMarkdownChunks(md, /(?=\n## [一二三四五六七]、)/, maxChunk);
}

function splitMarkdownChunks(md: string, sectionPattern: RegExp, maxChunk: number): string[] {
  if (md.length <= maxChunk) return [md];

  const sections = md.split(sectionPattern);
  const chunks: string[] = [];
  let buf = '';

  for (const sec of sections) {
    if (`${buf}${sec}`.length > maxChunk && buf) {
      chunks.push(buf.trim());
      buf = sec;
    } else {
      buf += sec;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());

  return chunks.length > 0 ? chunks : [truncate(md, maxChunk)];
}

/** text 降级：去掉 MD 标记，避免满屏符号 */
export function plainTextFromDingTalkMarkdown(md: string): string {
  return md
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^- /gm, '· ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
