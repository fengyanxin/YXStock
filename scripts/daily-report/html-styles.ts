export const HTML_STYLES = `
    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --surface2: #1c2128;
      --border: #30363d;
      --text: #e6edf3;
      --muted: #8b949e;
      --up: #f85149;
      --down: #3fb950;
      --accent: #58a6ff;
      --warn: #d29922;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2rem 1.5rem 3rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      max-width: 920px;
      margin-left: auto;
      margin-right: auto;
    }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    h1 { font-size: 1.85rem; margin: 0 0 0.75rem; color: var(--accent); font-weight: 600; }
    .meta { color: var(--muted); font-size: 0.92rem; line-height: 1.8; }
    .meta strong { color: var(--text); }
    .weekday { color: var(--warn); }
    h2 {
      font-size: 1.2rem;
      margin: 2.25rem 0 1rem;
      padding-bottom: 0.45rem;
      border-bottom: 1px solid var(--border);
      color: var(--text);
      font-weight: 600;
    }
    h3 {
      font-size: 1.02rem;
      margin: 1.5rem 0 0.75rem;
      color: var(--accent);
      font-weight: 600;
    }
    p { margin: 0.85rem 0; }
    strong { color: #fff; font-weight: 600; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
      margin: 1rem 0 1.25rem;
      background: var(--surface);
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    th, td {
      padding: 0.6rem 0.8rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th { color: var(--muted); font-weight: 500; background: var(--surface2); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(88, 166, 255, 0.06); }
    .up { color: var(--up); font-weight: 600; }
    .down { color: var(--down); font-weight: 600; }
    .lead {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin: 1rem 0;
    }
    .note {
      font-size: 0.88rem;
      color: var(--muted);
      border-left: 3px solid var(--border);
      padding: 0.5rem 0 0.5rem 1rem;
      margin: 1rem 0;
    }
    .block {
      background: var(--surface);
      border-left: 3px solid var(--accent);
      padding: 1rem 1.25rem;
      margin: 1rem 0;
      border-radius: 0 8px 8px 0;
    }
    .block.warn { border-left-color: var(--warn); }
    ul, ol { padding-left: 1.35rem; margin: 0.75rem 0; }
    li { margin: 0.4rem 0; }
    ul.bullets li::marker { color: var(--accent); }
    hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
    footer {
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      font-size: 0.88rem;
      color: var(--muted);
    }
    footer em { font-style: normal; color: var(--muted); }
    @media print {
      body { background: #fff; color: #111; padding: 1rem; }
      .up { color: #c00; } .down { color: #060; }
      table { border: 1px solid #ccc; }
      th { background: #f5f5f5; }
    }
`;
