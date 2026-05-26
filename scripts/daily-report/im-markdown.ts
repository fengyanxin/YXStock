import { truncate } from './format.js';

/** 将 GitHub 风格 MD 转为钉钉/飞书更易渲染的 IM Markdown */
export function prepareImMarkdown(fullMarkdown: string, htmlUrl?: string): string {
  let md = fullMarkdown.replace(/\r\n/g, '\n').trim();

  // 一级标题在 IM 里常显示过大，统一为三级（保留层级感）
  md = md.replace(/^# /gm, '### ');
  md = md.replace(/^## /gm, '#### ');

  md = md.replace(/^---\s*$/gm, '\n');
  md = convertPipeTables(md);
  md = md.replace(/\n{3,}/g, '\n\n');

  if (htmlUrl) {
    md += `\n\n---\n\n#### 完整 HTML 版（浏览器排版）\n\n[点击查看完整 HTML 日报](${htmlUrl})\n`;
  }

  const maxLen = Number(process.env.NOTIFY_IM_MAX_CHARS ?? 28000);
  if (md.length > maxLen) {
    const cut = truncate(md, maxLen - 80);
    md = `${cut}\n\n…（正文过长已截断，请点击下方 HTML 链接查看完整版）`;
  }

  return md;
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

  const sections = md.split(/(?=\n#### )/);
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
