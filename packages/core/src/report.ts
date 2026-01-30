export type ReportSource = {
  title?: string;
  url?: string;
  vendor?: string;
  timestamp?: string;
};

export type DataPoint = {
  name: string;
  value: string | number | null;
  unit?: string;
  asOf?: string;
};

export type Report = {
  kind: 'stock' | 'hot-topics';
  market?: 'cn' | 'us';
  symbol?: string;
  title: string;
  summary: string;
  bullets: string[];
  dataPoints: DataPoint[];
  risks: string[];
  catalysts: string[];
  watch: string[];
  confidence: number; // 0..1
  sources: ReportSource[];
  generatedAt: string;
};
