import { globalCache } from '../../../shared/src/cache';

export type CnNoticeDetail = {
  artCode: string;
  title?: string;
  noticeDate?: string;
  content?: string;
  pdfUrl?: string;
  source: 'eastmoney_notice';
};

async function fetchJsonWithRetry(url: string, referer: string, attempts: number): Promise<any> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent': 'Mozilla/5.0',
          accept: 'application/json,text/plain,*/*',
          referer,
        },
        redirect: 'follow',
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`eastmoney_notice_http_${res.status}: ${txt.slice(0, 200)}`);
      }
      return await res.json();
    } catch (e: any) {
      clearTimeout(t);
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 + i * 400));
    }
  }
  throw lastErr;
}

export async function getCnNoticeDetailEastmoney(artCode: string): Promise<CnNoticeDetail> {
  const code = String(artCode ?? '').trim();
  if (!code) throw new Error('eastmoney_notice_missing_art_code');

  const cacheKey = `eastmoney_notice:${code}`;
  const cached = globalCache.get<CnNoticeDetail>(cacheKey);
  if (cached) return cached;

  const url = `https://np-cnotice-stock.eastmoney.com/api/content/ann?art_code=${encodeURIComponent(code)}&client_source=web`;
  const referer = `https://np-info.eastmoney.com/pc/notice/?art_code=${encodeURIComponent(code)}`;

  const json = await fetchJsonWithRetry(url, referer, 2);
  const d = json?.data;
  if (!d) throw new Error('eastmoney_notice_bad_response');

  const title = d.notice_title ? String(d.notice_title).trim() : undefined;
  const noticeDate = d.notice_date ? String(d.notice_date) : undefined;
  const content = d.notice_content ? String(d.notice_content).trim() : undefined;
  const pdfUrl = d?.attach_list?.[0]?.attach_url ? String(d.attach_list[0].attach_url) : undefined;

  const out: CnNoticeDetail = { artCode: code, title, noticeDate, content, pdfUrl, source: 'eastmoney_notice' };

  // Cache 30 minutes
  globalCache.set(cacheKey, out, 30 * 60 * 1000);
  return out;
}
