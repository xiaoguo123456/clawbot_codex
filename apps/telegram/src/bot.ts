import { Telegraf } from 'telegraf';
import { z } from 'zod';
import { analyzeStock } from '../../../packages/analyzers/src/stockAnalyzer';
import { getHotTopics } from '../../../packages/analyzers/src/hotTopics';
import { getUsQuoteYahoo } from '../../../packages/data-sources/src/us/yahoo';
import { getCnQuoteEastmoney } from '../../../packages/data-sources/src/cn/eastmoney';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN');
}

const bot = new Telegraf(token);

function fmtPct(n?: number) {
  if (n == null || Number.isNaN(n)) return 'N/A';
  return `${n.toFixed(2)}%`;
}

bot.start(async (ctx) => {
  await ctx.reply(
    [
      '我已上线（金融助手框架版）。',
      '',
      '指令：',
      '/quote us AAPL',
      '/quote cn 600519',
      '/analyze us AAPL',
      '/analyze cn 600519',
      '/hot',
      '',
      '说明：当前为第一版骨架，后续会接入新闻源、财报与更严谨的投研输出。',
    ].join('\n')
  );
});

bot.command('quote', async (ctx) => {
  const parts = ctx.message.text.split(/\s+/).slice(1);
  const q = z
    .tuple([z.enum(['us', 'cn']), z.string().min(1)])
    .parse([parts[0] ?? 'us', parts[1] ?? 'AAPL']);

  const quote = q[0] === 'us' ? await getUsQuoteYahoo(q[1]) : await getCnQuoteEastmoney(q[1]);
  const line1 = `${quote.name ?? ''} ${quote.symbol}`.trim();
  const line2 = `价格：${quote.price ?? 'N/A'}${q[0] === 'cn' ? ' 元' : ''}  涨跌幅：${fmtPct(quote.changePercent)}`;
  await ctx.reply([line1, line2, `数据源：${quote.source}`].join('\n'));
});

bot.command('analyze', async (ctx) => {
  const parts = ctx.message.text.split(/\s+/).slice(1);
  const market = (parts[0] === 'cn' ? 'cn' : 'us') as 'cn' | 'us';
  const symbol = parts[1] ?? (market === 'cn' ? '600519' : 'AAPL');
  const report = await analyzeStock(market, symbol, 'both');

  const text = [
    report.title,
    '',
    `结论：${report.summary}`,
    '',
    '要点：',
    ...report.bullets.map((b: string) => `- ${b}`),
    '',
    '风险：',
    ...report.risks.map((r: string) => `- ${r}`),
    '',
    '催化剂：',
    ...report.catalysts.map((c: string) => `- ${c}`),
  ].join('\n');

  await ctx.reply(text.slice(0, 3800));
});

bot.command('hot', async (ctx) => {
  const hot = await getHotTopics('all', 5);

  const lines: string[] = [
    hot.report.title,
    hot.report.summary,
    '',
  ];

  for (const t of hot.topics) {
    lines.push(`${t.title}（score ${t.score.toFixed(2)}）`);
    lines.push(`- 解释：${t.why}`);
    if (t.sources?.length) {
      lines.push('- 参考：');
      for (const s of t.sources.slice(0, 3)) {
        const title = (s.title ?? '').trim();
        const url = (s.url ?? '').trim();
        if (title && url) lines.push(`  - ${title} ${url}`);
        else if (url) lines.push(`  - ${url}`);
      }
    }
    lines.push('');
  }

  await ctx.reply(lines.join('\n').slice(0, 3800));
});

bot.launch().then(() => {
  // eslint-disable-next-line no-console
  console.log('telegram bot started');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
