function updateThemeUI() {
  const theme = window.__blogThemeGet();
  const btn = document.getElementById('btn-theme');
  if (!(btn instanceof HTMLElement)) return;

  const isDark = theme === 'dark';

  btn.classList.toggle('is-dark', isDark);
  btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  btn.setAttribute('aria-label', isDark ? '切换到白天模式' : '切换到黑夜模式');
  btn.setAttribute('title', isDark ? '当前夜间模式，点击切换白天' : '当前白天模式，点击切换夜间');
}

document.getElementById('btn-theme')?.addEventListener('click', (event) => {
  const btn = event.currentTarget;
  const html = document.documentElement;

  if (btn instanceof HTMLElement) {
    btn.classList.remove('is-toggling');
    void btn.offsetWidth;
    btn.classList.add('is-toggling');
    window.setTimeout(() => {
      btn.classList.remove('is-toggling');
    }, 420);
  }

  html.classList.add('is-theme-changing');
  window.__blogThemeToggle();
  updateThemeUI();

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      html.classList.remove('is-theme-changing');
    }, 80);
  });
});

updateThemeUI();
