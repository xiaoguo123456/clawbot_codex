---
name: clawbot-codex-finance-api
description: Call the local clawbot_codex finance HTTP API for stock quotes, structured stock analysis (A股/美股), and policy/tech hot topics. Use whenever the user asks to query prices, analyze a stock, summarize market hot topics, or wants evidence-linked news/announcements; respond using API results instead of re-implementing logic.
---

# clawbot_codex finance API skill

目的：当用户问“查行情/分析股票/热点/公告”等问题时，优先调用本项目本地 API（而不是在对话里重新写一套逻辑）。项目变动（接口/字段/端口）时，同步更新本 skill。

本地 API 默认：
- Base URL: http://127.0.0.1:8787

一、启动/健康检查
1）检查是否已启动
- GET /health

2）未启动则启动（仓库根目录 clawbot_codex）
- npm run start:api

注意：如果 8787 端口被占用，先停掉旧进程或换 PORT。

二、常用接口（直接用这些）
1）查行情
- GET /quote?market=cn&symbol=600519
- GET /quote?market=us&symbol=AAPL

2）个股分析（结构化 Report）
- GET /analyze/stock?market=cn&symbol=600519&style=both
- GET /analyze/stock?market=us&symbol=NVDA&style=both

style 参数：research | trading | both

3）热点
- GET /hot?scope=all&limit=5
scope：policy | tech | market | all

4）市场热点板块（A股，独立来源）
- GET /hot/market?limit=3
说明：按“涨跌幅 / 主力净流入 / 成交额”输出行业板块+概念板块榜单（默认Top3）

三、输出策略（对话里怎么用）
- 先用 /analyze/stock（比单独 quote 信息更全：行情+新闻/公告+风险/催化剂）
- 用户只问“现在多少钱/涨跌多少”再用 /quote
- 用户问“今天热点/政策在交易什么”用 /hot

四、变更同步规则（必须遵守）
- 当 apps/api/src/server.ts 路由变更、返回字段变更、默认端口变更时：同步更新本 SKILL.md + references/api.md（若存在）。
- 若增加新能力（例如 watchlist、定时简报）：在此 skill 增加对应 endpoint 与输出规则。

## Resources

- references/api.md：接口清单与返回字段说明
- scripts/ensure_api.sh：检查 /health，不通则启动 API（可选）
- scripts/call_api.sh：用 curl 快速调用并打印结果（可选）
