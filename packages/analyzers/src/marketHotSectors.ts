import type { Report, ReportSource } from '../../core/src/report';
import { getCnSectorRankEastmoney, type CnSectorMetric, type CnSectorRankItem } from '../../data-sources/src/cn/eastmoney_sector_rank';

function fmtMoney(v: number | undefined): string {
  if (v == null || Number.isNaN(v)) return 'N/A';
  const abs = Math.abs(v);
  if (abs >= 1e8) return `${(v / 1e8).toFixed(2)}亿`;
  if (abs >= 1e4) return `${(v / 1e4).toFixed(0)}万`;
  return String(Math.round(v));
}

function fmtPct(v: number | undefined): string {
  if (v == null || Number.isNaN(v)) return 'N/A';
  return `${v.toFixed(2)}%`;
}

function lineFor(item: CnSectorRankItem, metric: CnSectorMetric): string {
  const leader = item.leaderName
    ? `；领涨：${item.leaderName}${item.leaderCode ? `(${item.leaderCode})` : ''}${item.leaderChangePercent != null ? ` ${fmtPct(item.leaderChangePercent)}` : ''}`
    : '';

  if (metric === 'money') return `${item.name}：主力净流入 ${fmtMoney(item.mainNetInflow)}${leader}`;
  if (metric === 'amount') return `${item.name}：成交额 ${fmtMoney(item.turnover)}${leader}`;
  return `${item.name}：涨跌幅 ${fmtPct(item.changePercent)}${leader}`;
}

export async function getMarketHotSectors(limit = 3): Promise<{
  industry: { change: CnSectorRankItem[]; money: CnSectorRankItem[]; amount: CnSectorRankItem[] };
  concept: { change: CnSectorRankItem[]; money: CnSectorRankItem[]; amount: CnSectorRankItem[] };
  report: Report;
}> {
  const now = new Date().toISOString();

  const industryChange = await getCnSectorRankEastmoney('industry', 'change', limit);
  const industryMoney = await getCnSectorRankEastmoney('industry', 'money', limit);
  const industryAmount = await getCnSectorRankEastmoney('industry', 'amount', limit);

  // 概念板块偶发超时，失败则降级为空数组（不让整体 hot 崩）
  let conceptChange: CnSectorRankItem[] = [];
  let conceptMoney: CnSectorRankItem[] = [];
  let conceptAmount: CnSectorRankItem[] = [];
  try {
    conceptChange = await getCnSectorRankEastmoney('concept', 'change', limit);
    conceptMoney = await getCnSectorRankEastmoney('concept', 'money', limit);
    conceptAmount = await getCnSectorRankEastmoney('concept', 'amount', limit);
  } catch {
    // ignore
  }

  const sources: ReportSource[] = [];
  const addSources = (arr: CnSectorRankItem[]) => {
    for (const it of arr) {
      sources.push({ title: `${it.name}（${it.type}）`, url: it.url, vendor: it.source });
    }
  };
  addSources(industryChange);
  addSources(industryMoney);
  addSources(industryAmount);
  addSources(conceptChange);
  addSources(conceptMoney);
  addSources(conceptAmount);

  const bullets: string[] = [];
  bullets.push('市场热点板块（数据源：东方财富板块排行，按涨跌幅/主力净流入/成交额）：');

  bullets.push('行业板块（按涨跌幅）：');
  industryChange.forEach((x, i) => bullets.push(`${i + 1}. ${lineFor(x, 'change')}`));
  bullets.push('行业板块（按主力净流入）：');
  industryMoney.forEach((x, i) => bullets.push(`${i + 1}. ${lineFor(x, 'money')}`));
  bullets.push('行业板块（按成交额）：');
  industryAmount.forEach((x, i) => bullets.push(`${i + 1}. ${lineFor(x, 'amount')}`));

  bullets.push('概念板块（按涨跌幅）：');
  (conceptChange.length ? conceptChange : [{
    type: 'concept', code: '', name: '（概念板块暂时不可用，可能是源超时，稍后重试）', url: '', source: 'eastmoney_push2'
  } as any]).forEach((x: any, i: number) => {
    if (!x.url) bullets.push(`${i + 1}. ${x.name}`);
    else bullets.push(`${i + 1}. ${lineFor(x, 'change')}`);
  });

  if (conceptMoney.length) {
    bullets.push('概念板块（按主力净流入）：');
    conceptMoney.forEach((x, i) => bullets.push(`${i + 1}. ${lineFor(x, 'money')}`));
  }
  if (conceptAmount.length) {
    bullets.push('概念板块（按成交额）：');
    conceptAmount.forEach((x, i) => bullets.push(`${i + 1}. ${lineFor(x, 'amount')}`));
  }

  const report: Report = {
    kind: 'hot-topics',
    title: '市场热点板块（A股）',
    summary: '已基于东方财富板块排行生成市场热点板块（涨跌幅/主力净流入/成交额）。',
    bullets,
    dataPoints: [
      { name: 'limit', value: limit },
      { name: 'industry.change.count', value: industryChange.length },
      { name: 'industry.money.count', value: industryMoney.length },
      { name: 'industry.amount.count', value: industryAmount.length },
      { name: 'concept.change.count', value: conceptChange.length },
      { name: 'concept.money.count', value: conceptMoney.length },
      { name: 'concept.amount.count', value: conceptAmount.length },
      { name: 'source', value: 'eastmoney_push2' },
    ],
    risks: [
      '板块口径、主力净流入/成交额口径以东方财富为准；不同平台可能存在差异。',
      '免费数据源可能存在超时/限流，已做重试与降级。',
    ],
    catalysts: ['若需要更“交易化”的热点（涨停家数/连板/情绪指标），可在此基础上继续扩展。'],
    watch: ['可按你的偏好加权：涨幅 vs 资金 vs 成交额（或做综合分）。'],
    confidence: 0.6,
    sources,
    generatedAt: now,
  };

  return {
    industry: { change: industryChange, money: industryMoney, amount: industryAmount },
    concept: { change: conceptChange, money: conceptMoney, amount: conceptAmount },
    report,
  };
}
