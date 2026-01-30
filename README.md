# clawbot_codex

一个金融类助手项目（A股 + 美股），目标：查询金融信息、结构化分析个股、识别政策/科技热点，并通过 Telegram 对话交互。

目前包含：
- public/：项目主页（静态页面）
- apps/api：HTTP API（给机器人/网页调用）
- apps/telegram：Telegram 机器人（指令交互）
- packages/：数据源、分析器、统一 Report 结构

本项目优先使用免费数据源：
- 美股：Yahoo Finance（chart endpoint）
- A股：东方财富 push2 接口（基础行情）

一、快速开始（本地）
1）安装依赖
npm i

2）启动 API
npm run dev:api
默认监听：http://localhost:8787

二、API 示例
- GET /health
- GET /quote?market=us&symbol=AAPL
- GET /quote?market=cn&symbol=600519
- GET /analyze/stock?market=cn&symbol=600519&style=both
- GET /hot?scope=all&limit=10

三、下一步
看 docs/roadmap.md
