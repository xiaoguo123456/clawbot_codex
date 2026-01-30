import type { NewsItem, NewsSource } from './types';
import { globalCache } from '../../../shared/src/cache';

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
}

function extractTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return undefined;
  return stripCdata(m[1]);
}

function extractLink(block: string): string | undefined {
  // RSS: <link>https://...</link>
  const linkText = extractTag(block, 'link');
  if (linkText && /^https?:\/\//i.test(linkText)) return linkText;

  // Atom: <link href="..." />
  const m = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  if (m?.[1]) return m[1];

  // Some feeds use guid as URL
  const guid = extractTag(block, 'guid');
  if (guid && /^https?:\/\//i.test(guid)) return guid;

  return undefined;
}

function extractItemsFromText(xml: string, limit: number): Array<{ title: string; url: string; publishedAt?: string }> {
  const items: Array<{ title: string; url: string; publishedAt?: string }> = [];
  let buf = xml;

  // RSS <item>
  while (items.length < limit) {
    const s = buf.indexOf('<item');
    if (s === -1) break;
    const e = buf.indexOf('</item>', s);
    if (e === -1) break;
    const block = buf.slice(s, e + '</item>'.length);
    buf = buf.slice(e + '</item>'.length);

    const title = extractTag(block, 'title') ?? '';
    const url = extractLink(block) ?? '';
    const publishedAt = extractTag(block, 'pubDate');
    if (title && url) items.push({ title, url, publishedAt });
  }

  // Atom <entry>
  while (items.length < limit) {
    const s = buf.indexOf('<entry');
    if (s === -1) break;
    const e = buf.indexOf('</entry>', s);
    if (e === -1) break;
    const block = buf.slice(s, e + '</entry>'.length);
    buf = buf.slice(e + '</entry>'.length);

    const title = extractTag(block, 'title') ?? '';
    const url = extractLink(block) ?? '';
    const publishedAt = extractTag(block, 'updated') ?? extractTag(block, 'published');
    if (title && url) items.push({ title, url, publishedAt });
  }

  return items;
}

async function streamExtractItems(res: Response, limit: number): Promise<Array<{ title: string; url: string; publishedAt?: string }>> {
  const reader = (res as any).body?.getReader?.();
  if (!reader) {
    const xml = await res.text();
    return extractItemsFromText(xml, limit);
  }

  const decoder = new TextDecoder('utf-8');
  let buf = '';
  let received = 0;
  const maxBytes = 4 * 1024 * 1024;
  const start = Date.now();
  const timeoutMs = 12_000;

  const items: Array<{ title: string; url: string; publishedAt?: string }> = [];

  while (items.length < limit && received < maxBytes && Date.now() - start < timeoutMs) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;

    received += value.byteLength;
    buf += decoder.decode(value, { stream: true });

    // Keep extracting until we can't.
    const before = items.length;
    const extracted = extractItemsFromText(buf, limit - items.length);
    if (extracted.length) {
      items.push(...extracted);
      // crude buffer trimming: keep only tail after last extracted closing tag
      // (safe enough for our use-case)
      const lastItemEnd = Math.max(buf.lastIndexOf('</item>'), buf.lastIndexOf('</entry>'));
      if (lastItemEnd !== -1) buf = buf.slice(lastItemEnd + 7);
    }

    if (items.length === before && buf.length > 2 * 1024 * 1024) {
      // prevent unbounded growth
      buf = buf.slice(-512 * 1024);
    }
  }

  return items.slice(0, limit);
}

async function fetchWithRetry(url: string, attempts: number): Promise<Response> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent': 'Mozilla/5.0',
          accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
        redirect: 'follow',
        signal: ctrl.signal,
      });
      clearTimeout(t);
      return res;
    } catch (e: any) {
      clearTimeout(t);
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 + i * 400));
    }
  }
  throw lastErr;
}

export async function fetchRss(source: NewsSource, limit: number): Promise<NewsItem[]> {
  const cacheKey = `rss:${source.id}:${limit}`;
  const cached = globalCache.get<NewsItem[]>(cacheKey);
  if (cached) return cached;

  const res = await fetchWithRetry(source.url, 2);

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`news_rss_http_${res.status}: ${source.id}: ${txt.slice(0, 200)}`);
  }

  const extracted = await streamExtractItems(res, limit);

  const merged = extracted
    .filter((x) => x.title && x.url)
    .slice(0, limit)
    .map(
      (x) =>
        ({
          source: source.title,
          title: x.title,
          url: x.url,
          publishedAt: x.publishedAt,
        }) as NewsItem
    );

  globalCache.set(cacheKey, merged, 5 * 60 * 1000);
  return merged;
}
