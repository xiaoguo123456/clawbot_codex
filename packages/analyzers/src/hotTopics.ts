import type { Report } from '../../core/src/report';

export type HotTopic = {
  title: string;
  tags: string[];
  score: number;
  why: string;
  sources: { title?: string; url?: string }[];
};

// 说明：热点数据源先做“占位版本”，后续我们会接入：
// - 中文政策/科技/市场新闻 RSS/公开接口
// - 关键词聚类 + 去重 + 热度评分
export async function getHotTopics(
  scope: 'policy' | 'tech' | 'market' | 'all',
  limit: number
): Promise<{ scope: string; topics: HotTopic[]; report: Report }>{
  const now = new Date().toISOString();

  const seed: HotTopic[] = [
    {
      title: '（占位）政策与产业链：关注政策信号与产业验证',
      tags: ['policy'],
      score: 0.62,
      why: '当前为框架版本：后续会用新闻聚合 + 聚类 + 关联标的映射生成真实热点。',
      sources: [],
    },
    {
      title: '（占位）科技主线：AI/算力/半导体/机器人等叙事的轮动',
      tags: ['tech'],
      score: 0.58,
      why: '后续会对“提及频次、扩散速度、关联标的涨跌”做量化评分。',
      sources: [],
    },
  ];

  const topics = seed
    .filter(t => scope === 'all' ? true : t.tags.includes(scope))
    .slice(0, limit);

  const report: Report = {
    kind: 'hot-topics',
    title: `热点概览（${scope}）`,
    summary: '当前为框架版本：热点识别模块已预留接口，下一步接入中文新闻源并做聚类评分。',
    bullets: [
      '目标：每天自动产出“热点主题→为什么热→关联标的→风险/催化剂”。',
      '技术路线：新闻抓取 → 清洗去重 → 向量/关键词聚类 → 主题命名 → 强度评分。',
    ],
    dataPoints: [
      { name: 'scope', value: scope },
      { name: 'topicCount', value: topics.length },
    ],
    risks: ['热点识别依赖新闻源稳定性与文本质量，需做去重与反垃圾处理。'],
    catalysts: ['接入稳定新闻源（RSS/公开接口）后，热点模块即可输出真实数据。'],
    watch: ['确定新闻源名单（A股/美股/宏观/科技）。', '确定“关联标的映射”规则（关键词→行业/股票）。'],
    confidence: 0.35,
    sources: [],
    generatedAt: now,
  };

  return { scope, topics, report };
}
