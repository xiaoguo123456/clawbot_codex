export type NewsItem = {
  source: string;
  title: string;
  url: string;
  publishedAt?: string;
};

export type NewsSource = {
  id: string;
  title: string;
  kind: 'rss' | 'atom' | 'html';
  url: string;
};
