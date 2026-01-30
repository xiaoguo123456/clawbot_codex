import type { Report } from '../../core/src/report';
import { getUsQuoteYahoo } from '../../data-sources/src/us/yahoo';
import { getCnQuoteEastmoney } from '../../data-sources/src/cn/eastmoney';

export async function analyzeStock(
  market: 'us' | 'cn',
  symbol: string,
  style: 'research' | 'trading' | 'both' = 'both'
): Promise<Report> {
  const quote = market === 'us'
    ? await getUsQuoteYahoo(symbol)
    : await getCnQuoteEastmoney(symbol);

  const price = quote.price ?? null;
  const chgPct = quote.changePercent ?? null;

  const bullets: string[] = [];
  const risks: string[] = [];
  const catalysts: string[] = [];
  const watch: string[] = [];

  // Research-style
  if (style === 'research' || style === 'both') {
    bullets.push('这是一个基于公开数据源的“快速体检”版本：后续可以接入财报/估值/业务结构/行业对比。');
    if (price != null) bullets.push(`当前价格：${price}${market === 'cn' ? ' 元' : ''}。`);
    if (chgPct != null) bullets.push(`相对昨收涨跌幅：${Number(chgPct).toFixed(2)}%。`);

    risks.push('免费数据源可能存在延迟、字段口径不一致，结论仅供参考。');
    watch.push('补充：近4季度营收/利润、毛利率、现金流、资产负债表关键项。');
    watch.push('补充：同业对比（估值与增长匹配度）。');
  }

  // Trading-style
  if (style === 'trading' || style === 'both') {
    bullets.push('交易视角：短期关注“价格行为 + 催化剂 + 情绪/热点”三件事。');
    catalysts.push('财报/业绩预告/指引变化（若有）');
    catalysts.push('政策与行业景气变化（尤其是A股）');
    catalysts.push('重大订单、产品发布、监管事件');
    watch.push('盘口：成交量放大/缩小、跳空、关键价位（后续可加K线与均线）。');
    risks.push('热点驱动行情波动大，追高回撤风险高；建议设置止损与仓位控制。');
  }

  const summary = (price == null)
    ? '已获取到标的基础信息，但当前无法解析到最新价格。'
    : `已获取到${quote.name ? quote.name + ' ' : ''}${quote.symbol}最新报价：${price}${market === 'cn' ? '元' : ''}（${chgPct == null ? '涨跌幅未知' : (Number(chgPct).toFixed(2) + '%')}）。`;

  return {
    kind: 'stock',
    market,
    symbol: quote.symbol,
    title: `${quote.name ?? quote.symbol} 分析` ,
    summary,
    bullets,
    dataPoints: [
      { name: 'symbol', value: quote.symbol },
      { name: 'name', value: quote.name ?? null },
      { name: 'price', value: quote.price ?? null },
      { name: 'change', value: quote.change ?? null },
      { name: 'changePercent', value: quote.changePercent ?? null, unit: '%' },
      { name: 'source', value: quote.source },
    ],
    risks,
    catalysts,
    watch,
    confidence: 0.55,
    sources: [
      { title: market === 'us' ? 'Yahoo Finance (chart)' : 'Eastmoney (push2)', vendor: quote.source },
    ],
    generatedAt: new Date().toISOString(),
  };
}
