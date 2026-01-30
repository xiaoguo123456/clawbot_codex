import { request } from 'undici';

export type UsQuote = {
  market: 'us';
  symbol: string;
  name?: string;
  currency?: string;
  price?: number;
  prevClose?: number;
  change?: number;
  changePercent?: number;
  timestamp?: number;
  closes?: number[];
  source: 'yahoo';
};

export async function getUsQuoteYahoo(symbol: string): Promise<UsQuote> {
  // Yahoo chart endpoint is free but rate-limited.
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
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
  const prevClose = meta.chartPreviousClose as number | undefined;
  const change = (price != null && prevClose != null) ? price - prevClose : undefined;
  const changePercent = (change != null && prevClose) ? (change / prevClose) * 100 : undefined;

  const closesRaw = r?.indicators?.quote?.[0]?.close;
  const closes: number[] | undefined = Array.isArray(closesRaw)
    ? closesRaw.filter((x: any) => typeof x === 'number')
    : undefined;

  return {
    market: 'us',
    symbol: meta.symbol ?? symbol,
    name: meta.shortName ?? meta.longName,
    currency: meta.currency,
    price,
    prevClose,
    change,
    changePercent,
    timestamp: meta.regularMarketTime,
    closes,
    source: 'yahoo',
  };
}
