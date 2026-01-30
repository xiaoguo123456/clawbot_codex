import { request } from 'undici';

export type UsQuote = {
  market: 'us';
  symbol: string;
  name?: string;
  currency?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  timestamp?: number;
  source: 'yahoo';
};

export async function getUsQuoteYahoo(symbol: string): Promise<UsQuote> {
  // Yahoo chart endpoint is free but rate-limited.
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const res = await request(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      'accept': 'application/json,text/plain,*/*',
    },
  });

  if (res.statusCode >= 400) {
    const txt = await res.body.text();
    throw new Error(`yahoo_http_${res.statusCode}: ${txt.slice(0, 200)}`);
  }

  const json: any = await res.body.json();
  const r = json?.chart?.result?.[0];
  const meta = r?.meta;
  if (!meta) throw new Error('yahoo_bad_response');

  const price = meta.regularMarketPrice as number | undefined;
  const prev = meta.chartPreviousClose as number | undefined;
  const change = (price != null && prev != null) ? price - prev : undefined;
  const changePercent = (change != null && prev) ? (change / prev) * 100 : undefined;

  return {
    market: 'us',
    symbol: meta.symbol ?? symbol,
    name: meta.shortName ?? meta.longName,
    currency: meta.currency,
    price,
    change,
    changePercent,
    timestamp: meta.regularMarketTime,
    source: 'yahoo',
  };
}
