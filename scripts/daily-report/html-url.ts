/**
 * 解析日报 HTML 的公网访问地址（用于 IM 推送「打开完整 HTML」）
 */
export function resolveHtmlReportUrl(fileName: string): string | undefined {
  const explicit = process.env.REPORT_HTML_URL?.trim();
  if (explicit) return explicit;

  const base = process.env.REPORT_HTML_BASE_URL?.trim();
  if (base) {
    return `${base.replace(/\/$/, '')}/${fileName}`;
  }

  const repo = process.env.GITHUB_REPOSITORY?.trim();
  const branch = process.env.GITHUB_REF_NAME?.trim() || 'main';
  if (repo && process.env.REPORT_USE_GITHUB_RAW === 'true') {
    const raw = `https://raw.githubusercontent.com/${repo}/${branch}/reports/${fileName}`;
    return `https://htmlpreview.github.io/?${encodeURIComponent(raw)}`;
  }

  return undefined;
}
