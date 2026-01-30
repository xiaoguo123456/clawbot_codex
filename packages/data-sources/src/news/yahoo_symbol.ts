import type { NewsItem } from './types';
import { fetchRss } from './rss';

export async function getYahooSymbolNews(symbol: string, limit: number): Promise<NewsItem[]> {
  // Yahoo RSS headlines (unofficial but widely used)
  // Example: https://finance.yahoo.com/rss/headline?s=AAPL
  const url = `https://finance.yahoo.com/rss/headline?s=${encodeURIComponent(symbol)}`;
  return fetchRss(
    {
      id: `yahoo_${symbol}`,
      title: `Yahoo Finance - ${symbol}`,
      kind: 'rss',
      url,
    },
    limit
  );
}
