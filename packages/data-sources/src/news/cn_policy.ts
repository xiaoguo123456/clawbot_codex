import type { NewsItem, NewsSource } from './types';
import { fetchRss } from './rss';

// 说明：你选的是“稳定优先、政策为主”。
// 所以这里优先放“官方/权威网站的 RSS/Atom”，如果后续你同意 B2（覆盖面优先）再加网页抓取。

const sources: NewsSource[] = [
  {
    id: 'stats_zxfb',
    title: '国家统计局-最新发布',
    kind: 'rss',
    url: 'https://www.stats.gov.cn/sj/zxfb/rss.xml',
  },
  {
    id: 'stats_sjjd',
    title: '国家统计局-数据解读',
    kind: 'rss',
    url: 'https://www.stats.gov.cn/sj/sjjd/rss.xml',
  }
];

export async function getCnPolicyNews(limit: number): Promise<NewsItem[]> {
  const per = Math.max(5, Math.ceil(limit / sources.length));
  const lists = await Promise.all(
    sources.map(async (s) => {
      try {
        if (s.kind === 'rss' || s.kind === 'atom') return await fetchRss(s, per);
        return [] as NewsItem[];
      } catch {
        // 稳定优先：某个源临时不可用时，不影响整体。
        return [] as NewsItem[];
      }
    })
  );

  const merged = lists.flat();

  // 去重（url优先，其次title）
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const it of merged) {
    const key = it.url || it.title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }

  return out.slice(0, limit);
}
