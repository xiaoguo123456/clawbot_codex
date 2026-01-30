import type { Report } from '../../core/src/report';
import { getCnPolicyNews } from '../../data-sources/src/news/cn_policy';
import type { NewsItem } from '../../data-sources/src/news/types';

export type HotTopic = {
  title: string;
  tags: string[];
  score: number;
  why: string;
  sources: { title?: string; url?: string }[];
};

type Cluster = { key: string; title: string; tags: string[]; items: NewsItem[] };

function classifyPolicyCluster(title: string): { key: string; title: string; tags: string[] } | null {
  const t = title;

  // 简单规则：稳定优先（可解释），后续再升级到向量聚类。
  const rules: Array<{ key: string; re: RegExp; label: string; tags: string[] }> = [
    { key: 'macro', re: /(经济|增长|就业|通胀|物价|金融|货币|利率|汇率|外汇|信贷|社融)/, label: '宏观与金融政策', tags: ['policy', 'market'] },
    { key: 'reg', re: /(监管|规范|整治|执法|合规|反垄断|处罚|问责|安全)/, label: '监管与合规', tags: ['policy'] },
    { key: 'industry', re: /(产业|制造|新质生产力|设备|能源|电力|汽车|半导体|算力|AI|人工智能|数据|数字|通信)/i, label: '产业政策与科技方向', tags: ['policy', 'tech'] },
    { key: 'capital', re: /(资本市场|证券|上市|再融资|并购|重组|退市|交易|期货|基金)/, label: '资本市场制度与改革', tags: ['policy', 'market'] },
    { key: 'trade', re: /(外贸|关税|出口|进口|跨境|国际|制裁)/, label: '外贸与外部环境', tags: ['policy'] },
  ];

  for (const r of rules) {
    if (r.re.test(t)) return { key: r.key, title: r.label, tags: r.tags };
  }
  return { key: 'other', title: '其他政策动态', tags: ['policy'] };
}

function clusterNews(items: NewsItem[]): Cluster[] {
  const map = new Map<string, Cluster>();
  for (const it of items) {
    const c = classifyPolicyCluster(it.title);
    if (!c) continue;
    const existing = map.get(c.key) ?? { key: c.key, title: c.title, tags: c.tags, items: [] };
    existing.items.push(it);
    map.set(c.key, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
}

export async function getHotTopics(
  scope: 'policy' | 'tech' | 'market' | 'all',
  limit: number
): Promise<{ scope: string; topics: HotTopic[]; report: Report }>{
  const now = new Date().toISOString();

  // 你选了 A1/B1：政策为主 + 稳定优先。
  // 所以这里先用“政策新闻源→规则聚类”跑通闭环。
  const news = await getCnPolicyNews(30);
  const clusters = clusterNews(news);

  const topics: HotTopic[] = clusters
    .filter((c) => scope === 'all' ? true : c.tags.includes(scope))
    .slice(0, limit)
    .map((c) => {
      const topItems = c.items.slice(0, 3);
      const score = Math.min(0.9, 0.35 + c.items.length * 0.08);
      return {
        title: c.title,
        tags: c.tags,
        score,
        why: `过去一段时间在权威新闻源中出现 ${c.items.length} 条相关信息，当前按规则聚类为“${c.title}”。`,
        sources: topItems.map((x) => ({ title: x.title, url: x.url })),
      };
    });

  const report: Report = {
    kind: 'hot-topics',
    title: `热点概览（${scope}）`,
    summary: topics.length ? '已基于权威政策新闻源生成热点（规则聚类版）。' : '当前未拉取到可用新闻数据（可能是源暂时不可用）。',
    bullets: [
      '当前版本：稳定优先，使用权威政策 RSS/Atom + 可解释的规则聚类。',
      '下一步：补充更多权威源（监管/部委/科技口径），并升级为“去重+聚类+主题命名+关联标的”。',
    ],
    dataPoints: [
      { name: 'scope', value: scope },
      { name: 'newsCount', value: news.length },
      { name: 'topicCount', value: topics.length },
    ],
    risks: [
      '免费 RSS 源可能临时调整地址或限流，需要做容错与备选源。',
      '规则聚类可解释但可能过于粗糙，后续会引入更强的聚类与主题抽取。',
    ],
    catalysts: ['接入更多权威源后，热点覆盖会显著提升。'],
    watch: ['确认你最关注的政策口径：宏观/监管/产业/资本市场（可加权）。'],
    confidence: 0.55,
    sources: [],
    generatedAt: now,
  };

  return { scope, topics, report };
}
