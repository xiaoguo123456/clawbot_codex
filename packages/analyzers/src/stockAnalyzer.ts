import type { Report, ReportSource } from '../../core/src/report';
import { getUsQuoteYahoo } from '../../data-sources/src/us/yahoo';
import { getCnQuoteEastmoney } from '../../data-sources/src/cn/eastmoney';
import { getCnNewsAndAnnouncementsEastmoney } from '../../data-sources/src/cn/eastmoney_newsbulletin';
import { getHotTopics } from './hotTopics';
import { extractCnAnnouncement } from './extractors/cnAnnouncementExtractor';
import { getYahooSymbolNews } from '../../data-sources/src/news/yahoo_symbol';

function safeFixed(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return 'N/A';
  return Number(n).toFixed(digits);
}

function calcReturnPct(closes: number[] | undefined, days: number): number | null {
  if (!closes || closes.length < days + 1) return null;
  const a = closes[closes.length - 1];
  const b = closes[closes.length - 1 - days];
  if (!a || !b) return null;
  return ((a - b) / b) * 100;
}

function calcHighLow(closes: number[] | undefined, lookback: number): { high: number; low: number } | null {
  if (!closes || closes.length < 2) return null;
  const slice = closes.slice(Math.max(0, closes.length - lookback));
  const nums = slice.filter((x) => typeof x === 'number');
  if (!nums.length) return null;
  return { high: Math.max(...nums), low: Math.min(...nums) };
}

export async function analyzeStock(
  market: 'us' | 'cn',
  symbol: string,
  style: 'research' | 'trading' | 'both' = 'both'
): Promise<Report> {
  const quote = market === 'us' ? await getUsQuoteYahoo(symbol) : await getCnQuoteEastmoney(symbol);

  const price = quote.price ?? null;
  const chgPct = quote.changePercent ?? null;

  const bullets: string[] = [];
  const risks: string[] = [];
  const catalysts: string[] = [];
  const watch: string[] = [];
  const sources: ReportSource[] = [
    { title: market === 'us' ? 'Yahoo Finance (chart)' : 'Eastmoney (push2)', vendor: quote.source },
  ];

  // Evidence-style data points
  const ret5 = market === 'us' ? calcReturnPct((quote as any).closes, 5) : null;
  const ret20 = market === 'us' ? calcReturnPct((quote as any).closes, 20) : null;
  const hl20 = market === 'us' ? calcHighLow((quote as any).closes, 20) : null;

  if (style === 'research' || style === 'both') {
    bullets.push('投研视角（V1）：给出可复核的关键数据点 + 风险/催化剂清单，后续可扩展财报与估值体系。');
    if (price != null) bullets.push(`当前价格：${price}${market === 'cn' ? ' 元' : ''}。`);
    if (chgPct != null) bullets.push(`相对昨收涨跌幅：${safeFixed(chgPct)}%。`);
    if (ret5 != null) bullets.push(`近5个交易日涨跌：${safeFixed(ret5)}%。`);
    if (ret20 != null) bullets.push(`近20个交易日涨跌：${safeFixed(ret20)}%。`);
    if (hl20) bullets.push(`近20日区间：低点 ${safeFixed(hl20.low)} / 高点 ${safeFixed(hl20.high)}。`);

    risks.push('免费数据源可能存在延迟、字段口径不一致；结论仅作参考，重要决策需二次核验。');
    watch.push('补充：近4季度营收/利润、毛利率、现金流、资产负债表关键项。');
    watch.push('补充：同业对比（估值与增长匹配度）。');
  }

  if (style === 'trading' || style === 'both') {
    bullets.push('交易视角（V1）：短期关注“价格行为 + 催化剂 + 情绪/热点”。');
    if (hl20 && price != null) {
      const pos = (price - hl20.low) / Math.max(1e-9, (hl20.high - hl20.low));
      bullets.push(`位置：当前价位于近20日区间的 ${(pos * 100).toFixed(0)}% 分位。`);
    }

    catalysts.push('财报/业绩预告/指引变化（若有）');
    catalysts.push('政策与行业景气变化（尤其是A股）');
    catalysts.push('重大订单、产品发布、监管事件');
    watch.push('关注成交量与关键价位（后续可加K线、均线、支撑/压力位）。');
    risks.push('热点驱动行情波动大，追高回撤风险高；建议设置止损与仓位控制。');
  }

  // News/announcement evidence
  if (market === 'us') {
    try {
      const news = await getYahooSymbolNews(quote.symbol, 3);
      if (news.length) {
        bullets.push('相关新闻（Yahoo RSS）：');
        for (const it of news) {
          bullets.push(`- ${it.title}`);
          sources.push({ title: it.title, url: it.url, vendor: it.source, timestamp: it.publishedAt });
        }
      }
    } catch {
      // ignore
    }
  }

  if (market === 'cn') {
    try {
      const { news, announcements } = await getCnNewsAndAnnouncementsEastmoney(quote.symbol, 3, 3);

      if (news.length) {
        bullets.push('相关新闻（东方财富F10）：');
        for (const it of news) {
          bullets.push(`- ${it.title}`);
          sources.push({ title: it.title, url: it.url, vendor: 'eastmoney_f10', timestamp: it.publishedAt });
        }
      }

      if (announcements.length) {
        bullets.push('近期公告（东方财富F10）：');
        for (const it of announcements) {
          bullets.push(`- ${it.title}`);
          sources.push({ title: it.title, url: it.url, vendor: 'eastmoney_f10', timestamp: it.noticeDate });
        }

        // 结构化提炼（投研证据链）
        bullets.push('公告要点提炼（规则版）：');
        for (const it of announcements) {
          const ex = extractCnAnnouncement(it.title, it.content);
          bullets.push(`- ${ex.type}：${ex.title}`);
          for (const kp of ex.keyPoints.slice(0, 2)) bullets.push(`  - ${kp}`);
          const fieldPairs = Object.entries(ex.fields).slice(0, 3);
          for (const [k, v] of fieldPairs) bullets.push(`  - ${k}：${v}`);

          const nums = ex.numbers.slice(0, 3).map((n) => `${n.name}:${n.value}`).join('，');
          if (nums) bullets.push(`  - 其他数字：${nums}`);
        }
      }

      // 关联宏观/政策热点（给“交易环境”上下文）
      try {
        const hot = await getHotTopics('policy', 3);
        if (hot.topics.length) {
          bullets.push('政策热点背景（当前）：');
          for (const t of hot.topics.slice(0, 2)) {
            bullets.push(`- ${t.title}（score ${t.score.toFixed(2)}）`);
            if (t.sectors?.length) bullets.push(`  - 可能关联行业：${t.sectors.join('、')}`);
          }
          // sources: add a lightweight marker
          sources.push({ title: '政策热点（自动汇总）', vendor: 'hotTopics', timestamp: hot.report.generatedAt });
        }
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  }

  const summary =
    price == null
      ? '已获取到标的基础信息，但当前无法解析到最新价格。'
      : `已获取到${quote.name ? quote.name + ' ' : ''}${quote.symbol}最新报价：${price}${market === 'cn' ? '元' : ''}（${chgPct == null ? '涨跌幅未知' : safeFixed(chgPct) + '%'}）。`;

  return {
    kind: 'stock',
    market,
    symbol: quote.symbol,
    title: `${quote.name ?? quote.symbol} 分析`,
    summary,
    bullets,
    dataPoints: [
      { name: 'symbol', value: quote.symbol },
      { name: 'name', value: quote.name ?? null },
      { name: 'price', value: quote.price ?? null },
      { name: 'prevClose', value: (quote as any).prevClose ?? null },
      { name: 'change', value: quote.change ?? null },
      { name: 'changePercent', value: quote.changePercent ?? null, unit: '%' },
      { name: 'return5d', value: ret5, unit: '%' },
      { name: 'return20d', value: ret20, unit: '%' },
      { name: 'source', value: quote.source },
    ],
    risks,
    catalysts,
    watch,
    confidence: market === 'us' ? 0.62 : 0.58,
    sources,
    generatedAt: new Date().toISOString(),
  };
}
