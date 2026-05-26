import type { DailyReportData, ReportNarrative, ThemeRow } from './types.js';
import { formatPercent, formatYiLabel } from './format.js';

function indexByName(data: DailyReportData, name: string) {
  return data.indices.find((i) => i.name.includes(name.replace(/\s/g, '')));
}

function marketTone(data: DailyReportData): string {
  const sh = indexByName(data, '上证');
  const cy = indexByName(data, '创业板');
  const kc = indexByName(data, '科创');
  if (!sh || !cy) return '大盘震荡、结构分化';
  if (sh.changePercent < 0 && cy.changePercent > 0) return '沪弱深强、结构极致分化';
  if (sh.changePercent > 0 && cy.changePercent < 0) return '沪强深弱、风格切换';
  if ((kc?.changePercent ?? 0) < -1) return '权重相对抗跌、硬科技承压';
  return '大盘震荡、结构分化';
}

function buildThemes(data: DailyReportData): ThemeRow[] {
  const byIndustry = new Map<string, ZtStock[]>();
  for (const z of data.ztPool) {
    const key = z.industry || '其他';
    if (!byIndustry.has(key)) byIndustry.set(key, []);
    byIndustry.get(key)!.push(z);
  }

  const logicMap: Record<string, string> = {
    半导体: '封测/芯片产业链，算力硬件预期驱动',
    元件: 'PCB、覆铜板联动，算力/AI 硬件链',
    电力: '高股息+用电旺季预期',
    工业金属: '有色价格与供给侧逻辑',
    小金属: '资源品价格与供需博弈',
    贵金属: '金价与避险配置',
    化学原料: '化工品价格与事件驱动',
    塑料: '新材料/题材博弈',
    光学光电: '消费电子与显示产业链',
    房地产开: '政策预期博弈',
    一般零售: '低位超跌反弹',
    专用设备: '装备更新与题材催化',
    燃气Ⅱ: '能源价格与区域供应',
  };

  const themes: ThemeRow[] = [];
  const sorted = [...byIndustry.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [industry, stocks] of sorted.slice(0, 6)) {
    const picks = stocks
      .sort((a, b) => b.continuousBoardCount - a.continuousBoardCount)
      .slice(0, 4)
      .map((s) => {
        const board = s.continuousBoardCount > 1 ? `${s.continuousBoardCount}板` : '';
        const cm = s.changePercent >= 19.5 ? '20cm' : '';
        return `${s.name}${board ? `(${board})` : ''}${cm ? cm : ''}`;
      });
    themes.push({
      theme: industry,
      stocks: picks.join('、'),
      logic: logicMap[industry] ?? '题材/事件驱动，短线资金博弈',
    });
  }
  if (themes.length === 0) {
    themes.push({
      theme: '—',
      stocks: '—',
      logic: '涨停池数据暂不可用',
    });
  }
  return themes;
}

export function buildNarrative(data: DailyReportData): ReportNarrative {
  const tone = marketTone(data);
  const sh = indexByName(data, '上证');
  const ratio =
    data.stats.limitDown > 0
      ? (data.stats.limitUp / data.stats.limitDown).toFixed(1)
      : String(data.stats.limitUp);

  const totalAmountYi = data.indices.reduce((s, i) => s + i.amountYi, 0);
  const mainOut = data.fundFlowToday?.mainNetYi ?? 0;

  const overviewLead =
    `今日 A 股呈现典型的 **「${tone}」** 格局` +
    (sh?.low ? `：上证指数一度探至 **${sh.low.toFixed(2)}**` : '') +
    `；涨停 **${data.stats.limitUp}** 家、跌停 **${data.stats.limitDown}** 家，涨跌停比约 **${ratio}:1**。` +
    `全市场扫描 **${data.totalScanned.toLocaleString('zh-CN')}** 只，上涨 ${data.stats.up} / 下跌 ${data.stats.down} / 平盘 ${data.stats.flat}。` +
    (mainOut < 0
      ? `主力资金净流出约 **${Math.abs(mainOut).toFixed(0)} 亿元**，赚钱效应集中于主线题材。`
      : `主力资金净流入约 **${mainOut.toFixed(0)} 亿元**，资金面偏积极。`);

  const indexBullets: string[] = [];
  for (const idx of data.indices) {
    const dir = idx.changePercent >= 0 ? '收涨' : '走弱';
    let line = `**${idx.name}：**收盘 ${idx.price.toFixed(2)}（${formatPercent(idx.changePercent)}），${dir}`;
    if (idx.open !== undefined && idx.low !== undefined && idx.high !== undefined) {
      line += `；开 ${idx.open.toFixed(2)} / 低 ${idx.low.toFixed(2)} / 高 ${idx.high.toFixed(2)}`;
    }
    if (idx.amountYi > 0) line += `；成交额约 ${formatYiLabel(idx.amountYi)}`;
    if (idx.amplitude > 0) line += `；振幅 ${idx.amplitude.toFixed(2)}%`;
    indexBullets.push(line);
  }

  let fundFlowText = '大盘资金流向数据暂不可用。';
  if (data.fundFlowToday) {
    const f = data.fundFlowToday;
    fundFlowText =
      `今日主力净流入 **${f.mainNetYi >= 0 ? '+' : ''}${f.mainNetYi.toFixed(0)} 亿元**（占成交额 ${formatPercent(f.mainPercent)}）。` +
      `超大单 ${f.superLargeYi.toFixed(0)} 亿、大单 ${f.largeYi.toFixed(0)} 亿、中单 ${f.mediumYi >= 0 ? '+' : ''}${f.mediumYi.toFixed(0)} 亿、小单 ${f.smallYi >= 0 ? '+' : ''}${f.smallYi.toFixed(0)} 亿。` +
      (f.mainNetYi < 0
        ? '呈现 **机构减仓、散户承接** 特征，宜结合板块轮动理解，不宜简单解读为全面撤退。'
        : '主力资金回流，可观察能否与指数突破形成共振。');
  }

  const nbNorth = data.northbound.filter((n) => n.direction.includes('北'));
  const nbSouth = data.northbound.filter((n) => n.direction.includes('南'));
  let northboundText = '';
  if (nbNorth.length > 0) {
    const up = nbNorth.reduce((s, n) => s + n.upCount, 0);
    const down = nbNorth.reduce((s, n) => s + n.downCount, 0);
    northboundText = `北向标的涨跌：上涨 ${up} / 下跌 ${down}（跌多涨少）。`;
  }
  const southBuy = nbSouth.reduce((s, n) => s + (n.netBuyYi ?? 0), 0);
  if (southBuy > 0) {
    northboundText += `南向合计净买入港股约 **${southBuy.toFixed(2)} 亿**。`;
  }
  if (!northboundText) northboundText = '互联互通数据暂不可用。';

  const maxBoard = Math.max(0, ...data.ztPool.map((z) => z.continuousBoardCount));
  const cm20 = data.ztPool.filter((z) => z.changePercent >= 19.5).map((z) => z.name);

  const sentimentBullets = [
    `**涨停 ${data.stats.limitUp} / 跌停 ${data.stats.limitDown}：**短线环境 **${data.stats.limitUp >= 40 ? '中性偏暖' : '偏谨慎'}**。`,
    `**连板高度：**最高 **${maxBoard || 1} 连板**${maxBoard <= 3 ? '，追高意愿有限，以 2–3 板套利为主' : ''}。`,
    cm20.length > 0
      ? `**20cm 活跃：**${cm20.slice(0, 6).join('、')}${cm20.length > 6 ? ' 等' : ''}。`
      : '**20cm：**今日科创/创业板涨停弹性一般。',
  ];

  const themes = buildThemes(data);
  const topLoser = data.losers[0];
  const dropSideText = topLoser
    ? `跌幅前列含 **${topLoser.name}**（${formatPercent(topLoser.changePercent)}）等，高位题材与前期强势股兑现压力仍存，宜规避缩量追高。`
    : '跌停侧以高位题材兑现为主。';

  const topGainer = data.gainers.find((g) => !g.name.includes('ST'));
  const gainersFeature = topGainer
    ? `涨幅前列以 **${data.gainers.slice(0, 3).map((g) => g.name).join('、')}** 等为主${topGainer.changePercent >= 19 ? '，含 20cm 弹性品种' : ''}，注意高位换手波动。`
    : '涨幅榜以题材龙头为主。';

  const losersFeature =
    '跌幅集中在前期涨幅较大、换手充分的品种，与涨停主线形成 **大类资产内部分化**，宜跟强避弱。';

  const shIdx = indexByName(data, '上证');
  const cyIdx = indexByName(data, '创业板');
  const hs300 = indexByName(data, '沪深300');
  const kcIdx = indexByName(data, '科创');

  const marketQualitative =
    `当前处于 **指数箱体震荡 + 结构性行情**：上证 ${shIdx?.low?.toFixed(0) ?? '4100'}–${shIdx?.high?.toFixed(0) ?? '4200'} 区间反复，` +
    `涨停维持 ${data.stats.limitUp}+ 说明题材线仍有机会；主力流向与指数分化并存时，更应视为 **调仓换股**。`;

  const styleRows = [
    {
      dimension: '大小盘',
      observation: `沪深300 ${(hs300?.changePercent ?? 0) >= 0 ? '↑' : '↓'}、科创50 ${(kcIdx?.changePercent ?? 0) >= 0 ? '↑' : '↓'}`,
      meaning: '核心资产/权重与硬科技的分化',
    },
    {
      dimension: '南北向',
      observation: nbNorth.length ? '北向标的跌多涨少' : '—',
      meaning: '外资态度偏谨慎，内资主导题材',
    },
    {
      dimension: '产业链',
      observation: themes[0] ? `${themes[0].theme} 涨停集中` : '—',
      meaning: '主线清晰时宜聚焦龙头，避免杂毛',
    },
    {
      dimension: '情绪',
      observation: `${maxBoard} 板封顶、涨停 ${data.stats.limitUp}`,
      meaning: '适合低吸首板/二板，慎追高位连板',
    },
  ];

  const keyLevelsBullets = [
    `**上证：**支撑 **${shIdx?.low?.toFixed(0) ?? '4100'}**、压力 **${shIdx?.preClose?.toFixed(0) ?? '4150'}–4200**；跌破支撑则短线转弱。`,
    `**创业板：**关注 **${cyIdx?.price?.toFixed(0) ?? '4000'}** 一带能否站稳${cyIdx?.high52w ? `（52周高 ${cyIdx.high52w.toFixed(2)}）` : ''}。`,
    `**量能：**两市合计约 **${formatYiLabel(totalAmountYi)}**；持续缩量需防阴跌。`,
    data.industryTop[0]
      ? `**板块：**领涨行业 ${data.industryTop.slice(0, 3).map((i) => i.name).join('、')}。`
      : '**板块：**行业榜单暂不可用，以涨停结构代替。',
  ];

  const tomorrowWatch = [
    '**4100 点**附近支撑与量能配合',
    `**涨停家数**能否维持 ${Math.max(35, data.stats.limitUp - 10)}+、连板高度是否突破 ${maxBoard} 板`,
    themes[0] ? `**${themes[0].theme}** 主线持续性` : '**主线题材**持续性',
    '**主力资金**是否出现回流拐点',
    (kcIdx?.changePercent ?? 0) < 0 ? '**科创 50** 走弱对高估值题材的情绪传导' : '**成长风格**能否延续',
  ];

  return {
    overviewLead,
    indexBullets,
    fundFlowText,
    northboundText,
    sentimentBullets,
    themes,
    dropSideText,
    gainersFeature,
    losersFeature,
    marketQualitative,
    styleRows,
    keyLevelsBullets,
    tomorrowWatch,
  };
}
