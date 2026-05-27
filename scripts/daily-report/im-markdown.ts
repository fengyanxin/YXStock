import { truncate } from './format.js';

type TableRowFormatter = (headers: string[], rows: string[][]) => string;

/** A 股：涨红跌绿（钉钉 font 需双引号色值） */
const COLOR_UP = '#f85149';
const COLOR_DOWN = '#3fb950';

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

type DingTalkTableFormat = 'grid' | 'md' | 'rows' | 'html';

function getDingTalkTableFormat(): DingTalkTableFormat {
  const v = process.env.DINGTALK_TABLE_FORMAT?.trim().toLowerCase();
  if (v === 'md' || v === 'html' || v === 'rows') return v;
  return 'grid';
}

/**
 * 钉钉 markdown：框线表格（默认可见）+ 涨红跌绿
 */
export function prepareDingTalkMarkdown(fullMarkdown: string, htmlUrl?: string): string {
  let md = normalizeSource(fullMarkdown);
  md = md.replace(/^# (.+)$/m, '## $1');
  md = formatDingTalkTables(md);
  md = simplifyForDingTalk(md);
  md = colorizeDingTalkBody(md);
  md = collapseBlankLines(md);

  if (htmlUrl) {
    md += `\n\n### 完整 HTML 版\n\n[点击查看浏览器排版](${htmlUrl})`;
  }

  return capLength(md);
}

function formatDingTalkTables(md: string): string {
  const mode = getDingTalkTableFormat();
  if (mode === 'html') return convertPipeTables(md, formatTableAsDingTalkHtml);
  if (mode === 'rows') return convertPipeTables(md, formatTableAsDingTalkRows);
  if (mode === 'md') return colorizePipeTablesInPlace(md);
  return convertPipeTables(md, formatTableAsDingTalkGrid);
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

/** 保留原 | 表格 |，仅给单元格加颜色（钉钉 PC 端通常可渲染 pipe 表） */
function colorizePipeTablesInPlace(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1] ?? '';

    if (line.trim().startsWith('|') && /^\|[\s\-:|]+\|$/.test(next.trim())) {
      const headers = parseTableRow(line);
      out.push(line);
      out.push(next);
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        out.push(formatPipeDataRow(lines[i], headers));
        i++;
      }
      out.push('');
      continue;
    }

    out.push(line);
    i++;
  }

  return out.join('\n');
}

function formatPipeDataRow(line: string, headers: string[]): string {
  const cells = parseTableRow(line);
  const colored = cells.map((cell, idx) => {
    const header = headers[idx] ?? '';
    const plain = stripBold(cell);
    if (!plain) return cell;
    return colorizeByHeaderOrValue(plain, header);
  });
  return `| ${colored.join(' | ')} |`;
}

/** 框线表格：不依赖钉钉 HTML/MD 表格渲染，手机端也能看到「表」形 */
function formatTableAsDingTalkGrid(headers: string[], rows: string[][]): string {
  const cols = headers.length;
  if (cols === 0) return '';

  const plainHeaders = headers.map(stripBold);
  const plainRows = rows.map((r) => r.map((c, i) => stripBold(c ?? '')));

  const widths = Array.from({ length: cols }, (_, i) => {
    const w = Math.max(
      displayWidth(plainHeaders[i] ?? ''),
      ...plainRows.map((r) => displayWidth(r[i] ?? '')),
      4,
    );
    return Math.min(w, 12);
  });

  const totalWidth = widths.reduce((a, b) => a + b, 0) + (cols + 1) * 2;
  if (cols > 8 || totalWidth > 120) return formatTableAsDingTalkRows(headers, rows);

  const border = (left: string, mid: string, right: string, ch: string) =>
    left + widths.map((w) => ch.repeat(w + 2)).join(mid) + right;

  const top = border('┌', '┬', '┐', '─');
  const sep = border('├', '┼', '┤', '─');
  const bottom = border('└', '┴', '┘', '─');

  const line = (cells: string[], isHeader: boolean) => {
    const parts = cells.map((cell, i) => {
      const w = widths[i];
      if (isHeader) {
        const p = stripBold(cell);
        return ` ${p}${' '.repeat(Math.max(0, w - displayWidth(p)))} `;
      }
      const plain = stripBold(cell);
      const colored = colorizeByHeaderOrValue(plain, headers[i] ?? '');
      return ` ${colored}${' '.repeat(Math.max(0, w - displayWidth(plain)))} `;
    });
    return `│${parts.join('│')}│`;
  };

  return ['', top, line(headers, true), sep, ...rows.map((r) => line(r, false)), bottom, ''].join('\n');
}

function displayWidth(s: string): number {
  const plain = stripTags(stripBold(s));
  let w = 0;
  for (const ch of plain) {
    w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? 2 : 1;
  }
  return w;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

/** 移动端兜底：每行一条，带列名（超宽表自动降级） */
function formatTableAsDingTalkRows(headers: string[], rows: string[][]): string {
  const parts: string[] = ['', `**${headers.map(stripBold).join('　|　')}**`, ''];
  for (const row of rows) {
    const cells = row.map((cell, idx) => {
      const h = stripBold(headers[idx] ?? '');
      const v = colorizeByHeaderOrValue(stripBold(cell), headers[idx] ?? '');
      return `**${h}** ${v}`;
    });
    parts.push(cells.join('　'));
    parts.push('');
  }
  return parts.join('\n');
}

/** HTML table（移动端需在 tr 间加空行，仅 DINGTALK_TABLE_FORMAT=html） */
function formatTableAsDingTalkHtml(headers: string[], rows: string[][]): string {
  const lines: string[] = ['', '<table>', '', '<tr>', ''];
  for (const h of headers) {
    lines.push(`<td><b>${escapeHtml(stripBold(h))}</b></td>`);
  }
  lines.push('', '</tr>', '');

  for (const row of rows) {
    lines.push('<tr>', '');
    row.forEach((cell, idx) => {
      const header = headers[idx] ?? '';
      lines.push(`<td>${formatDingTalkTableCell(cell, header)}</td>`);
    });
    lines.push('', '</tr>', '');
  }

  lines.push('</table>', '');
  return lines.join('\n');
}

function formatDingTalkTableCell(cell: string, header: string): string {
  const plain = stripBold(cell);
  const colored = colorizeByHeaderOrValue(plain, header);
  return colored;
}

function stripBold(s: string): string {
  return s.replace(/\*\*/g, '').trim();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isChangeColumn(header: string): boolean {
  return /涨跌|涨幅|跌幅|涨跌幅|变化/.test(header);
}

function colorizeByHeaderOrValue(text: string, header = ''): string {
  if (!text || /<font\s/i.test(text)) return text;

  const changeCol = isChangeColumn(header);
  const trimmed = text.trim();

  if (changeCol || /^[+-]\d/.test(trimmed)) {
    if (/^\+/.test(trimmed)) return fontColor(trimmed, COLOR_UP);
    if (/^-/.test(trimmed)) return fontColor(trimmed, COLOR_DOWN);
  }

  return colorizeSignedNumbersInText(text);
}

function colorizeSignedNumbersInText(text: string): string {
  if (/<font\s/i.test(text)) return text;
  let out = text;
  out = out.replace(/(\+[\d.,]+%)/g, (_, n) => fontColor(n, COLOR_UP));
  out = out.replace(/(-[\d.,]+%)/g, (_, n) => fontColor(n, COLOR_DOWN));
  out = out.replace(/\*\*(\+[\d.,]+)\*\*/g, (_, n) => `**${fontColor(n, COLOR_UP)}**`);
  out = out.replace(/\*\*(-[\d.,]+)\*\*/g, (_, n) => `**${fontColor(n, COLOR_DOWN)}**`);
  return out;
}

function fontColor(text: string, color: string): string {
  const inner = escapeHtml(stripBold(text));
  return `<font color="${color}">${inner}</font>`;
}

/** 段落、列表行着色（跳过 | 表格 | 与 HTML 表格行） */
function colorizeDingTalkBody(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inHtmlTable = false;

  for (const line of lines) {
    const t = line.trim();
    if (t === '<table>') inHtmlTable = true;
    if (inHtmlTable) {
      out.push(line);
      if (t === '</table>') inHtmlTable = false;
      continue;
    }
    if (t.startsWith('|') || /^[│┌├└┬┴┼]/.test(t)) {
      out.push(line);
      continue;
    }
    if (t.startsWith('##') || t.startsWith('###') || t.startsWith('[')) {
      out.push(line);
      continue;
    }
    if (t.startsWith('>')) {
      out.push(colorizeSignedNumbersInText(line));
      continue;
    }
    if (t.startsWith('- ')) {
      out.push(colorizeSignedNumbersInText(line));
      continue;
    }
    if (t.startsWith('**') || t.length > 0) {
      out.push(colorizeSignedNumbersInText(line));
      continue;
    }
    out.push(line);
  }

  return out.join('\n');
}

export function splitImMarkdown(md: string, maxChunk = 12000): string[] {
  return splitMarkdownChunks(md, /(?=\n\*\*[一二三四五六七]、[^*\n]+\*\*\n)/, maxChunk);
}

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

export function plainTextFromDingTalkMarkdown(md: string): string {
  return md
    .replace(/<font color="[^"]*">([^<]*)<\/font>/gi, '$1')
    .replace(/<\/?(table|tr|td|b)[^>]*>/gi, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^- /gm, '· ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
