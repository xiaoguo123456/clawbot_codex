import { globalCache } from '../../../shared/src/cache';

export type CnSectorType = 'industry' | 'concept';
export type CnSectorMetric = 'change' | 'money' | 'amount';

export type CnSectorRankItem = {
  type: CnSectorType;
  code: string; // e.g. BK0433
  name: string;
  changePercent?: number;
  mainNetInflow?: number; // yuan
  turnover?: number; // yuan
  leaderName?: string;
  leaderCode?: string;
  leaderChangePercent?: number;
  url: string;
  source: 'eastmoney_push2';
};

function fsForType(type: CnSectorType): string {
  // Eastmoney板块：行业(t:2)、概念(t:3)
  // f:!50 过滤 ST 等标记（沿用常见用法）
  return type === 'industry' ? 'm:90+t:2+f:!50' : 'm:90+t:3+f:!50';
}

function fidForMetric(metric: CnSectorMetric): string {
  if (metric === 'money') return 'f62';
  if (metric === 'amount') return 'f6';
  return 'f3'; // change
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
        throw new Error(`eastmoney_sector_http_${res.status}: ${txt.slice(0, 200)}`);
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

export async function getCnSectorRankEastmoney(
  type: CnSectorType,
  metric: CnSectorMetric,
  limit: number
): Promise<CnSectorRankItem[]> {
  const pz = Math.max(1, Math.min(50, Math.floor(limit)));
  const cacheKey = `eastmoney_sector_rank:${type}:${metric}:${pz}`;
  const cached = globalCache.get<CnSectorRankItem[]>(cacheKey);
  if (cached) return cached;

  const fs = fsForType(type);
  const fid = fidForMetric(metric);

  const fields = [
    'f12', // 板块代码 BKxxxx
    'f14', // 板块名称
    'f3', // 涨跌幅
    'f62', // 主力净流入(口径以东财为准)
    'f6', // 成交额
    'f128', // 领涨股名称(常见)
    'f140', // 领涨股代码(常见)
    'f136', // 领涨股涨跌幅(常见)
  ].join(',');

  const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${pz}&po=1&np=1&fltt=2&invt=2&fid=${encodeURIComponent(fid)}&fs=${encodeURIComponent(fs)}&fields=${encodeURIComponent(fields)}`;
  const referer = 'https://quote.eastmoney.com/';

  const json = await fetchJsonWithRetry(url, referer, 2);
  const diff = json?.data?.diff;
  if (!Array.isArray(diff)) return [];

  const out: CnSectorRankItem[] = diff
    .map((d: any) => {
      const code = String(d?.f12 ?? '').trim();
      const name = String(d?.f14 ?? '').trim();
      if (!code || !name) return null;
      const item: CnSectorRankItem = {
        type,
        code,
        name,
        changePercent: typeof d.f3 === 'number' ? d.f3 : undefined,
        mainNetInflow: typeof d.f62 === 'number' ? d.f62 : undefined,
        turnover: typeof d.f6 === 'number' ? d.f6 : undefined,
        leaderName: d.f128 ? String(d.f128) : undefined,
        leaderCode: d.f140 ? String(d.f140) : undefined,
        leaderChangePercent: typeof d.f136 === 'number' ? d.f136 : undefined,
        url: `https://quote.eastmoney.com/bk/${encodeURIComponent(code)}.html`,
        source: 'eastmoney_push2',
      };
      return item;
    })
    .filter((x: any): x is CnSectorRankItem => Boolean(x))
    .slice(0, pz);

  // Cache 60 seconds
  globalCache.set(cacheKey, out, 60 * 1000);
  return out;
}
