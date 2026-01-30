接口总览（clawbot_codex）

Base URL
- http://127.0.0.1:8787

Health
- GET /health
  - 返回：{ ok: true }

Quote
- GET /quote?market=us&symbol=AAPL
- GET /quote?market=cn&symbol=600519
  - 返回：{ ok: true, data: { market, symbol, name, price, change, changePercent, source } }

Analyze (stock)
- GET /analyze/stock?market=us&symbol=NVDA&style=both
- GET /analyze/stock?market=cn&symbol=600519&style=both
  - 返回：{ ok: true, data: Report }
  - Report 重点字段：
    - title / summary
    - bullets[]（给 Telegram 展示用）
    - risks[] / catalysts[] / watch[]
    - dataPoints[]（结构化数据点）
    - sources[]（证据链链接：新闻/公告）

Hot topics
- GET /hot?scope=all&limit=5
  - 返回：{ ok: true, data: { scope, topics, report } }
  - topics[]：title/score/why + sectors/assets（若有）

Market hot sectors (A股板块热点，独立来源)
- GET /hot/market?limit=5
- GET /hot?scope=market&limit=5
  - 返回：{ ok: true, data: { industry, concept, report } }
  - industry/concept：分别包含 change/money/amount 三个榜单

备注
- 端口：默认 8787，可通过环境变量 PORT 覆盖
- 路由定义位置：apps/api/src/server.ts
