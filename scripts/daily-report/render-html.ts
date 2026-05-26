import type { DailyReportData, ReportNarrative } from './types.js';
import {
  escapeHtml,
  formatPercent,
  formatTradeDateCn,
  formatYiLabel,
  pctClass,
} from './format.js';
import { HTML_STYLES } from './html-styles.js';

function inlineMd(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function pctCell(n: number, asChange = false): string {
  const cls = pctClass(n);
  const label = asChange
    ? n >= 0
      ? `+${n.toFixed(2)}`
      : n.toFixed(2)
    : formatPercent(n);
  return cls ? `<span class="${cls}">${label}</span>` : label;
}

export function renderHtml(data: DailyReportData, narrative: ReportNarrative): string {
  const dateCn = formatTradeDateCn(data.tradeDate);
  const totalAmountYi = data.indices.reduce((s, i) => s + i.amountYi, 0);
  const mainOut = data.fundFlowToday?.mainNetYi ?? 0;

  const statsRows = `
    <tr><td>涨停家数</td><td class="up">${data.stats.limitUp}</td></tr>
    <tr><td>跌停家数</td><td class="down">${data.stats.limitDown}</td></tr>
    <tr><td>扫描标的</td><td>${data.totalScanned.toLocaleString('zh-CN')}</td></tr>
    <tr><td>两市成交额（约）</td><td>≈ <strong>${formatYiLabel(totalAmountYi)}</strong></td></tr>
    <tr><td>大盘主力资金</td><td class="${mainOut < 0 ? 'down' : 'up'}">${mainOut < 0 ? '净流出' : '净流入'}约 <strong>${Math.abs(mainOut).toFixed(0)} 亿元</strong>${data.fundFlowToday ? `（${formatPercent(data.fundFlowToday.mainPercent)}）` : ''}</td></tr>`;

  const indexRows = data.indices
    .map(
      (idx) =>
        `<tr><td>${escapeHtml(idx.name)}</td><td>${idx.price.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td><td>${pctCell(idx.change, true)}</td><td>${pctCell(idx.changePercent)}</td><td>${formatYiLabel(idx.amountYi)}</td><td>${idx.amplitude.toFixed(2)}%</td></tr>`,
    )
    .join('');

  const indexBullets = narrative.indexBullets
    .map((b) => `<li>${inlineMd(b)}</li>`)
    .join('');

  let fundSection = `<p>${inlineMd(narrative.fundFlowText)}</p>`;
  if (data.fundFlowToday) {
    const f = data.fundFlowToday;
    fundSection =
      `<table><thead><tr><th>日期</th><th>主力</th><th>超大单</th><th>大单</th><th>中单</th><th>小单</th></tr></thead><tbody><tr>
      <td>${f.date}</td><td class="down"><strong>${f.mainNetYi.toFixed(0)} 亿</strong></td>
      <td class="down">${f.superLargeYi.toFixed(0)} 亿</td><td class="down">${f.largeYi.toFixed(0)} 亿</td>
      <td class="up">+${f.mediumYi.toFixed(0)} 亿</td><td class="up">+${f.smallYi.toFixed(0)} 亿</td></tr></tbody></table>
      <p>${inlineMd(narrative.fundFlowText)}</p>`;
  }

  const northRows =
    data.northbound.length > 0
      ? data.northbound
          .map((n) => {
            const note =
              n.netBuyYi !== undefined && n.direction.includes('南')
                ? `净买入约 <strong>${n.netBuyYi.toFixed(2)} 亿</strong>`
                : n.upCount < n.downCount
                  ? '跌多涨少'
                  : '—';
            return `<tr><td>${escapeHtml(n.boardName)}</td><td class="up">${n.upCount || '—'}</td><td>${n.flatCount || '—'}</td><td class="down">${n.downCount || '—'}</td><td>${note}</td></tr>`;
          })
          .join('')
      : '';

  const themeRows = narrative.themes
    .map(
      (t) =>
        `<tr><td><strong>${escapeHtml(t.theme)}</strong></td><td>${escapeHtml(t.stocks)}</td><td>${escapeHtml(t.logic)}</td></tr>`,
    )
    .join('');

  const gainerRows = data.gainers
    .map(
      (g) =>
        `<tr><td>${g.rank}</td><td>${g.code}</td><td>${escapeHtml(g.name)}</td><td>${g.price.toFixed(2)}</td><td class="up">${formatPercent(g.changePercent)}</td></tr>`,
    )
    .join('');

  const loserRows = data.losers
    .map(
      (l) =>
        `<tr><td>${l.rank}</td><td>${l.code}</td><td>${escapeHtml(l.name)}</td><td>${l.price.toFixed(2)}</td><td class="down">${formatPercent(l.changePercent)}</td></tr>`,
    )
    .join('');

  const styleRows = narrative.styleRows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.dimension)}</td><td>${escapeHtml(r.observation)}</td><td>${inlineMd(r.meaning)}</td></tr>`,
    )
    .join('');

  const sectorNote = data.sectorDataOk
    ? ''
    : '<p class="note">注：行业/概念板块 TOP10 数据源本次拉取失败，板块强弱以下文涨停结构、指数分化及个股榜单综合研判。</p>';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YXStock A股行情日报 · ${data.tradeDate}（${data.weekdayLabel}）</title>
  <style>${HTML_STYLES}</style>
</head>
<body>
<header>
  <h1>YXStock A 股行情日报</h1>
  <p class="meta">
    <strong>交易日：</strong>${dateCn}（<span class="weekday">${data.weekdayLabel}</span>）<br />
    <strong>数据时间：</strong>${escapeHtml(data.dataTimeLabel)}<br />
    <strong>数据来源：</strong>Stock SDK · 全市场扫描约 ${data.totalScanned.toLocaleString('zh-CN')} 只
  </p>
</header>

<section>
  <h2>一、市场总览</h2>
  <div class="lead"><p>${inlineMd(narrative.overviewLead)}</p></div>
  <table><thead><tr><th>指标</th><th>数值</th></tr></thead><tbody>${statsRows}</tbody></table>
  ${sectorNote}
</section>

<section>
  <h2>二、主要指数</h2>
  <table><thead><tr><th>指数</th><th>收盘</th><th>涨跌</th><th>涨跌幅</th><th>成交额</th><th>振幅</th></tr></thead><tbody>${indexRows}</tbody></table>
  <h3>盘中结构</h3>
  <ul class="bullets">${indexBullets}</ul>
</section>

<section>
  <h2>三、资金面</h2>
  <h3>3.1 大盘资金流向</h3>
  ${fundSection}
  <h3>3.2 北向与互联互通</h3>
  ${northRows ? `<table><thead><tr><th>通道</th><th>上涨</th><th>平盘</th><th>下跌</th><th>备注</th></tr></thead><tbody>${northRows}</tbody></table>` : ''}
  <p>${inlineMd(narrative.northboundText)}</p>
</section>

<section>
  <h2>四、涨跌停与短线情绪</h2>
  <h3>4.1 情绪指标</h3>
  <ul class="bullets">${narrative.sentimentBullets.map((s) => `<li>${inlineMd(s)}</li>`).join('')}</ul>
  <h3>4.2 涨停主线</h3>
  <table><thead><tr><th>主线</th><th>代表标的</th><th>逻辑</th></tr></thead><tbody>${themeRows}</tbody></table>
  <p><strong>跌停侧：</strong>${inlineMd(narrative.dropSideText)}</p>
</section>

<section>
  <h2>五、涨幅榜 TOP10</h2>
  <table><thead><tr><th>#</th><th>代码</th><th>名称</th><th>现价</th><th>涨跌幅</th></tr></thead><tbody>${gainerRows}</tbody></table>
  <div class="block"><p><strong>特征：</strong>${inlineMd(narrative.gainersFeature)}</p></div>
</section>

<section>
  <h2>六、跌幅榜 TOP10</h2>
  <table><thead><tr><th>#</th><th>代码</th><th>名称</th><th>现价</th><th>涨跌幅</th></tr></thead><tbody>${loserRows}</tbody></table>
  <div class="block"><p><strong>特征：</strong>${inlineMd(narrative.losersFeature)}</p></div>
</section>

<section>
  <h2>七、专业研判与策略提示</h2>
  <h3>7.1 市场定性</h3>
  <p>${inlineMd(narrative.marketQualitative)}</p>
  <h3>7.2 风格与配置</h3>
  <table><thead><tr><th>维度</th><th>观察</th><th>含义</th></tr></thead><tbody>${styleRows}</tbody></table>
  <h3>7.3 关键价位与变量</h3>
  <ul class="bullets">${narrative.keyLevelsBullets.map((b) => `<li>${inlineMd(b)}</li>`).join('')}</ul>
  <h3>7.4 明日关注清单</h3>
  <ol>${narrative.tomorrowWatch.map((t) => `<li>${inlineMd(t)}</li>`).join('')}</ol>
  <h3>7.5 风险提示</h3>
  <div class="block warn"><p>本报告基于公开行情接口生成，数据可能存在延迟；<strong>ST、20cm、北交所</strong> 品种波动极大；仅供学习研究，<strong>不构成任何投资建议</strong>。</p></div>
</section>

<hr />
<footer><p><em>报告由 YXStock 自动生成 · ${data.tradeDate}（${data.weekdayLabel}）</em></p></footer>
</body>
</html>`;
}
