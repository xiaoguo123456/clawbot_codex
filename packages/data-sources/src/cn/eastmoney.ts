// uses built-in fetch

export type CnQuote = {
  market: 'cn';
  symbol: string; // e.g. 600519 / 000001
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  timestamp?: number;
  source: 'eastmoney';
};

function guessSecid(symbol: string): string {
  // Eastmoney secid: 1.600519 (SH) or 0.000001 (SZ)
  const s = symbol.trim();
  if (/^6\d{5}$/.test(s)) return `1.${s}`;
  if (/^(0|3)\d{5}$/.test(s)) return `0.${s}`;
  // fallback: try SZ
  return `0.${s}`;
}

export async function getCnQuoteEastmoney(symbol: string): Promise<CnQuote> {
  const secid = guessSecid(symbol);
  const fields = [
    'f43', // 最新价 * 1000 ? actually f43 in 0.001 yuan for some endpoints; we'll treat as raw and scale when needed.
    'f44', // 最高
    'f45', // 最低
    'f46', // 今开
    'f47', // 成交量
    'f48', // 成交额
    'f57', // 代码
    'f58', // 名称
    'f60', // 昨收
    'f170', // 涨跌幅
    'f169', // 涨跌额
    'f71', // 时间(可能)
  ].join(',');

  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${encodeURIComponent(secid)}&fields=${encodeURIComponent(fields)}`;

  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      'accept': 'application/json,text/plain,*/*',
      'referer': 'https://quote.eastmoney.com/',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`eastmoney_http_${res.status}: ${txt.slice(0, 200)}`);
  }

  const json: any = await res.json();
  const d = json?.data;
  if (!d) throw new Error('eastmoney_bad_response');

  // Many fields are in "yuan" already for this endpoint.
  const price = (typeof d.f43 === 'number') ? d.f43 / 100 : undefined;
  const prevClose = (typeof d.f60 === 'number') ? d.f60 / 100 : undefined;
  const change = (typeof d.f169 === 'number') ? d.f169 / 100 : (price != null && prevClose != null ? price - prevClose : undefined);
  const changePercent = (typeof d.f170 === 'number') ? d.f170 / 100 : undefined;

  return {
    market: 'cn',
    symbol: String(d.f57 ?? symbol),
    name: d.f58,
    price,
    change,
    changePercent,
    timestamp: Date.now(),
    source: 'eastmoney',
  };
}
