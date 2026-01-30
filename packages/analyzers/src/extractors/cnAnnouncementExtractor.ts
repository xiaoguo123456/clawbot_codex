export type ExtractedAnnouncement = {
  title: string;
  type: string;
  keyPoints: string[];
  fields: Record<string, string>; // more specific extracted fields
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
  const money = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(万|亿)?\s*元/g)].slice(0, 10);
  for (const m of money) out.push({ name: '金额', value: `${m[1]}${m[2] ?? ''}元` });

  // 股份数量（股/万股/亿股）
  const shares = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(万|亿)?\s*股/g)].slice(0, 10);
  for (const m of shares) out.push({ name: '股份数量', value: `${m[1]}${m[2] ?? ''}股` });

  // 比例（%）
  const pct = [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].slice(0, 10);
  for (const m of pct) out.push({ name: '比例', value: `${m[1]}%` });

  // 日期（YYYY年MM月DD日）
  const dates = [...text.matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)].slice(0, 8);
  for (const m of dates) out.push({ name: '日期', value: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` });

  // 去重
  const seen = new Set<string>();
  return out.filter((x) => {
    const k = `${x.name}:${x.value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function pick(text: string, re: RegExp): string | undefined {
  const m = text.match(re);
  return m?.[1] ? String(m[1]).trim() : undefined;
}

function extractFields(type: string, text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!text) return fields;

  if (type === '股份回购') {
    const amountRange = pick(text, /回购资金总额[^\d]{0,10}(\d+(?:\.\d+)?\s*(?:万|亿)?\s*元\s*[-—~至]\s*\d+(?:\.\d+)?\s*(?:万|亿)?\s*元)/);
    if (amountRange) fields['回购金额区间'] = amountRange;

    const amountMax = pick(text, /回购资金总额[^\d]{0,10}[^\d]*(\d+(?:\.\d+)?\s*(?:万|亿)?\s*元)/);
    if (!fields['回购金额区间'] && amountMax) fields['回购金额'] = amountMax;

    const priceCeil = pick(text, /回购价格[^\d]{0,10}(\d+(?:\.\d+)?)\s*元\/?股/);
    if (priceCeil) fields['回购价格上限'] = `${priceCeil}元/股`;

    const sharesRange = pick(text, /回购股份数量[^\d]{0,10}(\d+(?:\.\d+)?\s*(?:万|亿)?\s*股\s*[-—~至]\s*\d+(?:\.\d+)?\s*(?:万|亿)?\s*股)/);
    if (sharesRange) fields['回购股份区间'] = sharesRange;

    const period = pick(text, /回购期限[^\d]{0,20}([^。；;\n]{2,30})/);
    if (period) fields['回购期限'] = period;

    const progress = pick(text, /(已回购[^。；;\n]{5,80})/);
    if (progress) fields['回购进度'] = progress;
  }

  if (type === '股东增持') {
    const who = pick(text, /(控股股东|实际控制人|一致行动人|公司董事|公司高管)[^。；;\n]{0,20}/);
    if (who) fields['增持主体'] = who;

    const amount = pick(text, /增持[^。；;\n]{0,20}(\d+(?:\.\d+)?\s*(?:万|亿)?\s*元)/);
    if (amount) fields['增持金额'] = amount;

    const shares = pick(text, /增持[^。；;\n]{0,20}(\d+(?:\.\d+)?\s*(?:万|亿)?\s*股)/);
    if (shares) fields['增持数量'] = shares;

    const period = pick(text, /(增持期限|实施期限)[^。；;\n]{0,10}([^。；;\n]{2,40})/);
    if (period) fields['增持期限'] = period;
  }

  if (type === '分红/利润分配') {
    const perShare = pick(text, /(每\s*10\s*股[^。；;\n]{0,20})/);
    if (perShare) fields['每10股分配'] = perShare;

    const record = pick(text, /(股权登记日[^。；;\n]{0,20})/);
    if (record) fields['股权登记日'] = record;
  }

  return fields;
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
  } else if (type === '分红/利润分配') {
    keyPoints.push('关注：每10股分配、股权登记日、派息日、分红率。');
  }

  const fields = extractFields(type, text);

  // 简单摘要：取前 120 字
  if (text) {
    keyPoints.push(`摘要：${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`);
  }

  const numbers = extractNumbers(text);

  return {
    title,
    type,
    keyPoints,
    fields,
    numbers,
  };
}
