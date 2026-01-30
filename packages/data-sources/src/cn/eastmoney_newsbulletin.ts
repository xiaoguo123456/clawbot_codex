export type CnNewsItem = {
  title: string;
  url: string;
  publishedAt?: string; // ISO-ish
  summary?: string;
  source?: string | null;
};

export type CnAnnouncement = {
  title: string;
  artCode: string;
  noticeDate?: string;
  content?: string;
  url: string;
};

function cnF10Code(symbol: string): string {
  const s = symbol.trim();
  if (/^6\d{5}$/.test(s)) return `SH${s}`;
  if (/^(0|3)\d{5}$/.test(s)) return `SZ${s}`;
  // fallback: assume SZ
  return `SZ${s}`;
}

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
        throw new Error(`eastmoney_f10_http_${res.status}: ${txt.slice(0, 200)}`);
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

export async function getCnNewsAndAnnouncementsEastmoney(
  symbol: string,
  limitNews: number,
  limitAnnouncements: number
): Promise<{ news: CnNewsItem[]; announcements: CnAnnouncement[]; source: string }>{
  const code = cnF10Code(symbol);
  const url = `https://emweb.securities.eastmoney.com/PC_HSF10/NewsBulletin/PageAjax?code=${encodeURIComponent(code)}`;
  const referer = `https://emweb.securities.eastmoney.com/PC_HSF10/NewsBulletin/Index?type=web&code=${encodeURIComponent(code)}`;

  const json = await fetchJsonWithRetry(url, referer, 2);

  const newsItemsRaw = json?.gszx?.data?.items;
  const news: CnNewsItem[] = Array.isArray(newsItemsRaw)
    ? newsItemsRaw
        .map((it: any) => {
          const title = String(it?.title ?? '').trim();
          const url = String(it?.uniqueUrl ?? it?.url ?? '').trim();
          const ts = typeof it?.showDateTime === 'number' ? it.showDateTime : null;
          const publishedAt = ts ? new Date(ts).toISOString() : undefined;
          const summary = String(it?.summary ?? '').trim();
          const source = it?.source ?? null;
          return title && url ? ({ title, url, publishedAt, summary, source } as CnNewsItem) : null;
        })
        .filter((x: any): x is CnNewsItem => Boolean(x))
        .slice(0, limitNews)
    : [];

  const annRaw = json?.gsgg;
  const announcements: CnAnnouncement[] = Array.isArray(annRaw)
    ? annRaw
        .map((it: any) => {
          const artCode = String(it?.art_code ?? '').trim();
          const title = String(it?.title ?? '').trim();
          const noticeDate = it?.notice_date ? String(it.notice_date) : undefined;
          const content = it?.content ? String(it.content).trim() : undefined;
          const url = artCode ? `https://np-info.eastmoney.com/pc/notice/?art_code=${encodeURIComponent(artCode)}` : '';
          return title && artCode ? ({ title, artCode, noticeDate, content, url } as CnAnnouncement) : null;
        })
        .filter((x: any): x is CnAnnouncement => Boolean(x))
        .slice(0, limitAnnouncements)
    : [];

  return { news, announcements, source: 'eastmoney_f10' };
}
