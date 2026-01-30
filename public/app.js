(function () {
  const $ = (id) => document.getElementById(id);

  // Theme
  const THEME_KEY = 'clawbot_theme';
  function applyTheme(theme) {
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
  }
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) applyTheme(saved);

  const toggle = $('toggleTheme');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const next = isLight ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  }

  // Clock
  function pad(n){return String(n).padStart(2,'0');}
  function tick(){
    const d = new Date();
    const t = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const clock = $('clock');
    if (clock) clock.textContent = t;
  }
  tick();
  setInterval(tick, 1000);

  // Build info
  const build = $('buildInfo');
  if (build) {
    const d = new Date();
    build.textContent = `build: ${d.toISOString().slice(0,10)}`;
  }

  // Copy plan
  const planText = [
    '下一步计划（可选）：',
    '1) 把这个静态页部署到 GitHub Pages',
    '2) 增加一个“需求清单”页面（你想到什么就往里记）',
    '3) 如果要做机器人/服务端：再加 Node.js + API',
  ].join('\n');

  const copyBtn = $('copyPlan');
  const copyResult = $('copyResult');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(planText);
        if (copyResult) copyResult.textContent = '已复制到剪贴板。';
      } catch (e) {
        if (copyResult) copyResult.textContent = '复制失败：你的浏览器可能不允许本地文件使用剪贴板。你可以把页面部署后再试。';
      }
    });
  }
})();
