import { truncate } from './format.js';

/** 将 GitHub 风格 MD 转为钉钉/飞书更易渲染的 IM Markdown */
export function prepareImMarkdown(fullMarkdown: string, htmlUrl?: string): string {
  let md = fullMarkdown.replace(/\r\n/g, '\n').trim();

  md = md.replace(/^---\s*$/gm, '\n');
  md = convertPipeTables(md);
  md = headingsToBold(md);
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  if (htmlUrl) {
    md += `\n\n**完整 HTML 版（浏览器排版）**\n\n[点击查看完整 HTML 日报](${htmlUrl})\n`;
  }

  const maxLen = Number(process.env.NOTIFY_IM_MAX_CHARS ?? 28000);
  if (md.length > maxLen) {
    const cut = truncate(md, maxLen - 80);
    md = `${cut}\n\n…（正文过长已截断，请点击下方 HTML 链接查看完整版）`;
  }

  return md;
}

/** ATX 标题 → 加粗行（钉钉/飞书部分场景会原样显示 #，故不用 # 语法） */
function headingsToBold(md: string): string {
  return md.replace(/^(#{1,6})\s+(.+)$/gm, (_m, hashes: string, raw: string) => {
    const level = hashes.length;
    const title = raw.trim();
    const inner = title.match(/^\*\*(.+)\*\*$/)?.[1] ?? title;
    const line = `**${inner}**`;
    // 一级主标题前后多空一行，章节/小节用加粗区分层级（IM 无字号时靠空行）
    if (level === 1) return `\n\n${line}\n\n`;
    if (level === 2) return `\n\n${line}\n\n`;
    return `\n${line}\n`;
  });
}

function convertPipeTables(md: string): string {
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
      out.push(formatTableAsMarkdownList(headerCells, rows));
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

function formatTableAsMarkdownList(headers: string[], rows: string[][]): string {
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

/** 超长正文按章节拆成多条（可选，飞书/钉钉分条发送） */
export function splitImMarkdown(md: string, maxChunk = 12000): string[] {
  if (md.length <= maxChunk) return [md];

  const sections = md.split(/(?=\n\*\*[一二三四五六七]、[^*\n]+\*\*\n)/);
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
