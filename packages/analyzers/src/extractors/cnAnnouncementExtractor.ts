export type ExtractedAnnouncement = {
  title: string;
  type: string;
  keyPoints: string[];
  numbers: Array<{ name: string; value: string }>; // keep as string for safety
};

function pickType(title: string): string {
  const t = title;
  if (/回购/.test(t)) return '股份回购';
  if (/增持/.test(t)) return '股东增持';
  if (/减持/.test(t)) return '股东减持';
  if (/董事会/.test(t)) return '董事会/治理';
  if (/股东大会/.test(t)) return '股东大会';
  if (/业绩预告|业绩快报/.test(t)) return '业绩预告/快报';
  if (/年报|半年报|季报|一季报|三季报/.test(t)) return '定期报告';
  if (/分红|利润分配/.test(t)) return '分红/利润分配';
  if (/重大事项|提示性公告/.test(t)) return '重大事项';
  return '其他公告';
}

function extractNumbers(text: string): Array<{ name: string; value: string }> {
  const out: Array<{ name: string; value: string }> = [];
  if (!text) return out;

  // 金额（元/万元/亿元）
  const money = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(万|亿)?\s*元/g)].slice(0, 8);
  for (const m of money) {
    out.push({ name: '金额', value: `${m[1]}${m[2] ?? ''}元` });
  }

  // 股份数量（股/万股/亿股）
  const shares = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(万|亿)?\s*股/g)].slice(0, 8);
  for (const m of shares) {
    out.push({ name: '股份数量', value: `${m[1]}${m[2] ?? ''}股` });
  }

  // 比例（%）
  const pct = [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].slice(0, 8);
  for (const m of pct) {
    out.push({ name: '比例', value: `${m[1]}%` });
  }

  // 日期（YYYY年MM月DD日）
  const dates = [...text.matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)].slice(0, 6);
  for (const m of dates) {
    out.push({ name: '日期', value: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` });
  }

  // 去重
  const seen = new Set<string>();
  return out.filter((x) => {
    const k = `${x.name}:${x.value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function extractCnAnnouncement(title: string, content?: string): ExtractedAnnouncement {
  const type = pickType(title);
  const text = (content ?? '').replace(/\s+/g, ' ').trim();

  const keyPoints: string[] = [];
  if (type === '股份回购') {
    keyPoints.push('关注：回购金额上限/下限、价格区间、回购用途、已回购进度。');
  } else if (type === '股东增持') {
    keyPoints.push('关注：增持主体、增持金额/数量、增持期限、资金来源。');
  } else if (type === '定期报告') {
    keyPoints.push('关注：营收/利润增速、毛利率变化、现金流、指引与分红。');
  }

  // 简单摘要：取前 120 字
  if (text) {
    keyPoints.push(`摘要：${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`);
  }

  const numbers = extractNumbers(text);

  return {
    title,
    type,
    keyPoints,
    numbers,
  };
}
