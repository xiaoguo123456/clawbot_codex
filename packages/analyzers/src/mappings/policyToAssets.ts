export type AssetHint = {
  market: 'cn' | 'us';
  symbol: string;
  name?: string;
  why: string;
};

export type TopicAssetMap = {
  topicKey: string;
  topicTitle: string;
  keywords: string[];
  sectors: string[];
  assets: AssetHint[];
};

// 说明：V1 版本先做“可解释的规则映射”（稳定优先、易维护）。
// 后续再升级为：主题→行业→股票池（自动化）+ 历史命中统计。
export const POLICY_TOPIC_ASSET_MAP: TopicAssetMap[] = [
  {
    topicKey: 'macro',
    topicTitle: '宏观与金融政策',
    keywords: ['货币政策', '利率', '信贷', '社融', '通胀', '汇率', '外汇', '财政', '专项债'],
    sectors: ['银行', '券商', '保险', '基建', '地产链'],
    assets: [
      { market: 'cn', symbol: '601398', name: '工商银行', why: '利率/信贷周期对银行息差与资产质量敏感' },
      { market: 'cn', symbol: '601318', name: '中国平安', why: '利率与资本市场影响险资投资收益与估值' },
      { market: 'cn', symbol: '600030', name: '中信证券', why: '资本市场活跃度与政策预期影响券商' },
      { market: 'us', symbol: 'SPY', name: 'S&P500 ETF', why: '宏观与流动性对风险资产有系统性影响' },
    ],
  },
  {
    topicKey: 'industry',
    topicTitle: '产业政策与科技方向',
    keywords: ['新质生产力', '制造业', '设备更新', '算力', '数据', '人工智能', '半导体', '新能源', '机器人'],
    sectors: ['半导体', 'AI/算力', '高端制造', '机器人', '新能源'],
    assets: [
      { market: 'cn', symbol: '688981', name: '中芯国际', why: '半导体产业政策与国产替代' },
      { market: 'cn', symbol: '300308', name: '中际旭创', why: 'AI算力/光模块景气度' },
      { market: 'cn', symbol: '300750', name: '宁德时代', why: '新能源产业链政策与需求' },
      { market: 'us', symbol: 'NVDA', name: 'NVIDIA', why: 'AI算力产业景气与资本开支' },
      { market: 'us', symbol: 'SOXX', name: 'Semiconductor ETF', why: '半导体板块景气' },
    ],
  },
  {
    topicKey: 'reg',
    topicTitle: '监管与合规',
    keywords: ['监管', '合规', '处罚', '安全', '数据安全', '反垄断', '审查'],
    sectors: ['互联网平台', '金融科技', '教育', '医药合规'],
    assets: [
      { market: 'cn', symbol: '0700', name: '腾讯控股', why: '平台监管与内容/数据合规影响估值' },
      { market: 'us', symbol: 'BABA', name: 'Alibaba', why: '跨境/平台监管预期变化' },
    ],
  },
  {
    topicKey: 'capital',
    topicTitle: '资本市场制度与改革',
    keywords: ['资本市场', '上市', '并购重组', '退市', '再融资', '注册制', '交易制度'],
    sectors: ['券商', '创投', '并购链'],
    assets: [
      { market: 'cn', symbol: '601066', name: '中信建投', why: '投行/承销与制度改革相关' },
      { market: 'cn', symbol: '300059', name: '东方财富', why: '交易活跃度与券商业务相关' },
    ],
  },
];

export function assetsForTopic(topicKey: string): TopicAssetMap | undefined {
  return POLICY_TOPIC_ASSET_MAP.find((x) => x.topicKey === topicKey);
}
