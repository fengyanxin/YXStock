import type { DailyReportData, ReportNarrative } from './types.js';
import { formatPercent, formatTradeDateCn, formatYiLabel } from './format.js';

export function renderMarkdown(data: DailyReportData, narrative: ReportNarrative): string {
  const dateCn = formatTradeDateCn(data.tradeDate);
  const totalAmountYi = data.indices.reduce((s, i) => s + i.amountYi, 0);
  const mainOut = data.fundFlowToday?.mainNetYi ?? 0;

  const sectorNote = data.sectorDataOk
    ? ''
    : '\n> 注：行业/概念板块 TOP10 数据源本次拉取失败，板块强弱以下文涨停结构、指数分化及个股榜单综合研判。\n';

  let md = `# YXStock A 股行情日报

**交易日：** ${dateCn}（**${data.weekdayLabel}**）  
**数据时间：** ${data.dataTimeLabel}  
**数据来源：** Stock SDK · 全市场扫描约 ${data.totalScanned.toLocaleString('zh-CN')} 只  

---

## 一、市场总览

${narrative.overviewLead}

| 指标 | 数值 |
|------|------|
| 涨停家数 | ${data.stats.limitUp} |
| 跌停家数 | ${data.stats.limitDown} |
| 扫描标的 | ${data.totalScanned.toLocaleString('zh-CN')} |
| 两市成交额（约） | ${data.indices.map((i) => `${i.name.replace(/指数|成指/g, '')} ${formatYiLabel(i.amountYi)}`).join(' + ')} ≈ **${formatYiLabel(totalAmountYi)}** |
| 大盘主力资金 | ${mainOut < 0 ? `净流出约 **${Math.abs(mainOut).toFixed(0)} 亿元**` : `净流入约 **${mainOut.toFixed(0)} 亿元**`}${data.fundFlowToday ? `（${formatPercent(data.fundFlowToday.mainPercent)}）` : ''} |
${sectorNote}
---

## 二、主要指数

| 指数 | 收盘 | 涨跌 | 涨跌幅 | 成交额（约） | 振幅 |
|------|------|------|--------|--------------|------|
`;

  for (const idx of data.indices) {
    const ch = idx.change >= 0 ? `+${idx.change.toFixed(2)}` : idx.change.toFixed(2);
    md += `| ${idx.name} | ${idx.price.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} | ${ch} | ${formatPercent(idx.changePercent)} | ${formatYiLabel(idx.amountYi)} | ${idx.amplitude.toFixed(2)}% |\n`;
  }

  md += `\n**盘中结构：**\n\n`;
  for (const b of narrative.indexBullets) {
    md += `- ${b}\n`;
  }

  md += `\n---\n\n## 三、资金面\n\n### 3.1 大盘资金流向（上证+深证综合）\n\n`;
  if (data.fundFlowToday) {
    const f = data.fundFlowToday;
    md += `| 日期 | 主力净流入 | 超大单 | 大单 | 中单 | 小单 |
|------|------------|--------|------|------|------|
| ${f.date} | **${f.mainNetYi.toFixed(0)} 亿** | ${f.superLargeYi.toFixed(0)} 亿 | ${f.largeYi.toFixed(0)} 亿 | ${f.mediumYi >= 0 ? '+' : ''}${f.mediumYi.toFixed(0)} 亿 | ${f.smallYi >= 0 ? '+' : ''}${f.smallYi.toFixed(0)} 亿 |

${narrative.fundFlowText}
`;
  } else {
    md += `${narrative.fundFlowText}\n`;
  }

  md += `\n### 3.2 北向与互联互通\n\n`;
  if (data.northbound.length > 0) {
    md += `| 通道 | 上涨 | 平盘 | 下跌 | 备注 |
|------|------|------|------|------|
`;
    for (const n of data.northbound) {
      const note =
        n.netBuyYi !== undefined && n.direction.includes('南')
          ? `净买入约 **${n.netBuyYi.toFixed(2)} 亿**`
          : n.upCount + n.downCount > 0
            ? n.upCount < n.downCount
              ? '跌多涨少'
              : '涨多跌少'
            : '—';
      md += `| ${n.boardName} | ${n.upCount || '—'} | ${n.flatCount || '—'} | ${n.downCount || '—'} | ${note} |\n`;
    }
    md += `\n${narrative.northboundText}\n`;
  } else {
    md += `${narrative.northboundText}\n`;
  }

  md += `\n---\n\n## 四、涨跌停与短线情绪\n\n### 4.1 情绪指标\n\n`;
  for (const s of narrative.sentimentBullets) {
    md += `- ${s}\n`;
  }

  md += `\n### 4.2 涨停主线（按行业归类）\n\n| 主线 | 代表标的 | 逻辑简述 |
|------|----------|----------|
`;
  for (const t of narrative.themes) {
    md += `| **${t.theme}** | ${t.stocks} | ${t.logic} |\n`;
  }
  md += `\n**跌停侧：** ${narrative.dropSideText}\n`;

  if (data.industryTop.length > 0) {
    md += `\n### 4.3 行业涨幅 TOP5\n\n`;
    for (const [i, ind] of data.industryTop.slice(0, 5).entries()) {
      md += `${i + 1}. ${ind.name} ${formatPercent(ind.changePercent)}\n`;
    }
  }

  md += `\n---\n\n## 五、涨幅榜 TOP10\n\n| # | 代码 | 名称 | 现价 | 涨跌幅 |
|---|------|------|------|--------|
`;
  for (const g of data.gainers) {
    md += `| ${g.rank} | ${g.code} | ${g.name} | ${g.price.toFixed(2)} | ${formatPercent(g.changePercent)} |\n`;
  }
  md += `\n**特征：** ${narrative.gainersFeature}\n`;

  md += `\n---\n\n## 六、跌幅榜 TOP10\n\n| # | 代码 | 名称 | 现价 | 涨跌幅 |
|---|------|------|------|--------|
`;
  for (const l of data.losers) {
    md += `| ${l.rank} | ${l.code} | ${l.name} | ${l.price.toFixed(2)} | ${formatPercent(l.changePercent)} |\n`;
  }
  md += `\n**特征：** ${narrative.losersFeature}\n`;

  md += `\n---\n\n## 七、专业研判与策略提示\n\n### 7.1 市场定性\n\n${narrative.marketQualitative}\n\n### 7.2 风格与配置\n\n| 维度 | 观察 | 含义 |
|------|------|------|
`;
  for (const row of narrative.styleRows) {
    md += `| ${row.dimension} | ${row.observation} | ${row.meaning} |\n`;
  }

  md += `\n### 7.3 关键价位与变量\n\n`;
  for (const b of narrative.keyLevelsBullets) {
    md += `- ${b}\n`;
  }

  md += `\n### 7.4 明日关注清单\n\n`;
  narrative.tomorrowWatch.forEach((item, i) => {
    md += `${i + 1}. ${item}  \n`;
  });

  md += `\n### 7.5 风险提示\n\n本报告基于公开行情接口生成，数据可能存在延迟；**ST、20cm、北交所** 品种波动极大；文中分析仅供学习研究，**不构成任何投资建议**。\n\n---\n\n*报告由 YXStock 自动生成 · ${data.tradeDate}（${data.weekdayLabel}）*\n`;

  return md;
}

export function renderPushMarkdown(data: DailyReportData, narrative: ReportNarrative): string {
  const sh = data.indices.find((i) => i.name.includes('上证'));
  const lines = [
    `日报 | YXStock A股行情 ${data.tradeDate}（${data.weekdayLabel}）`,
    '',
    narrative.overviewLead.replace(/\*\*/g, ''),
    '',
    '### 主要指数',
    ...data.indices.map(
      (i) => `- ${i.name} ${i.price.toFixed(2)} ${formatPercent(i.changePercent)}`,
    ),
    '',
    `涨停 ${data.stats.limitUp} / 跌停 ${data.stats.limitDown} | 扫描 ${data.totalScanned} 只`,
    '',
    '### 研判摘要',
    narrative.marketQualitative.replace(/\*\*/g, ''),
    '',
    '### 明日关注',
    ...narrative.tomorrowWatch.map((t, i) => `${i + 1}. ${t.replace(/\*\*/g, '')}`),
  ];
  if (sh?.low) {
    lines.splice(4, 0, `上证低点 ${sh.low.toFixed(2)}`);
  }
  return lines.join('\n');
}
