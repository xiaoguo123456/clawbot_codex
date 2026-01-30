import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { getUsQuoteYahoo } from '../../../packages/data-sources/src/us/yahoo';
import { getCnQuoteEastmoney } from '../../../packages/data-sources/src/cn/eastmoney';
import { analyzeStock } from '../../../packages/analyzers/src/stockAnalyzer';
import { getHotTopics } from '../../../packages/analyzers/src/hotTopics';
import { getMarketHotSectors } from '../../../packages/analyzers/src/marketHotSectors';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get('/health', async () => ({ ok: true }));

app.get('/quote', async (req, reply) => {
  const q = z
    .object({
      market: z.enum(['us', 'cn']).default('us'),
      symbol: z.string().min(1),
    })
    .parse((req as any).query);

  try {
    const quote = q.market === 'us'
      ? await getUsQuoteYahoo(q.symbol)
      : await getCnQuoteEastmoney(q.symbol);

    return { ok: true, data: quote };
  } catch (e: any) {
    req.log.error(e);
    return reply.status(500).send({ ok: false, error: e?.message ?? 'quote_failed' });
  }
});

app.get('/analyze/stock', async (req, reply) => {
  const q = z
    .object({
      market: z.enum(['us', 'cn']).default('us'),
      symbol: z.string().min(1),
      style: z.enum(['research', 'trading', 'both']).default('both'),
    })
    .parse((req as any).query);

  try {
    const report = await analyzeStock(q.market, q.symbol, q.style);
    return { ok: true, data: report };
  } catch (e: any) {
    req.log.error(e);
    return reply.status(500).send({ ok: false, error: e?.message ?? 'analyze_failed' });
  }
});

app.get('/hot', async (req, reply) => {
  const q = z
    .object({
      scope: z.enum(['policy', 'tech', 'market', 'all']).default('all'),
      limit: z.coerce.number().int().min(1).max(50).default(10),
    })
    .parse((req as any).query);

  try {
    // market scope: use dedicated market hot sectors
    if (q.scope === 'market') {
      const data = await getMarketHotSectors(Math.min(3, q.limit));
      return { ok: true, data };
    }

    const hot = await getHotTopics(q.scope, q.limit);
    return { ok: true, data: hot };
  } catch (e: any) {
    req.log.error(e);
    return reply.status(500).send({ ok: false, error: e?.message ?? 'hot_failed' });
  }
});

app.get('/hot/market', async (req, reply) => {
  const q = z
    .object({
      limit: z.coerce.number().int().min(1).max(10).default(3),
    })
    .parse((req as any).query);

  try {
    const data = await getMarketHotSectors(q.limit);
    return { ok: true, data };
  } catch (e: any) {
    req.log.error(e);
    return reply.status(500).send({ ok: false, error: e?.message ?? 'hot_market_failed' });
  }
});

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';

app.listen({ port, host }).then(() => {
  app.log.info(`api listening on http://${host}:${port}`);
});
