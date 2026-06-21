function init() {
  const root = document.querySelector('[data-archive-root]');
  if (!(root instanceof HTMLElement)) return;
  if (root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';

  const modeTabs = [...root.querySelectorAll('[data-mode-tab]')];
  const sidePanels = [...root.querySelectorAll('[data-panel]')];
  const tagLinks = [...root.querySelectorAll('[data-tag-link]')];
  const articles = [...root.querySelectorAll('[data-article]')];
  const monthGroups = [...root.querySelectorAll('[data-month-group]')];
  const yearGroups = [...root.querySelectorAll('[data-year-group]')];
  const streamTitle = root.querySelector('[data-stream-title]');
  const streamCount = root.querySelector('[data-stream-count]');
  const streamEmpty = root.querySelector('[data-stream-empty]');

  const articleMeta = articles.map((el) => ({
    el,
    tags: new Set((el.getAttribute('data-tags') || '').split('|').filter(Boolean)),
  }));

  const monthMeta = monthGroups.map((el) => ({
    el,
    items: [...el.querySelectorAll('[data-article]')],
  }));

  const yearMeta = yearGroups.map((el) => ({
    el,
    items: [...el.querySelectorAll('[data-article]')],
  }));

  function readState() {
    const params = new URLSearchParams(window.location.search);
    const rawMode = (params.get('mode') || '').toLowerCase();
    const hashHasMonth = /^#archive-\d{4}-\d{2}$/.test(window.location.hash || '');
    const mode = rawMode === 'time' ? 'time' : rawMode === 'tag' ? 'tag' : hashHasMonth ? 'time' : 'tag';
    const tag = (params.get('tag') || '').toLowerCase();
    return { mode, tag };
  }

  function applyTagFilter(tag) {
    let visible = 0;

    articleMeta.forEach(({ el, tags }) => {
      const show = !tag || tags.has(tag);
      el.classList.toggle('hidden', !show);
      if (show) visible += 1;
    });

    monthMeta.forEach(({ el, items }) => {
      const anyVisible = items.some((item) => !item.classList.contains('hidden'));
      el.classList.toggle('hidden', !anyVisible);
    });

    yearMeta.forEach(({ el, items }) => {
      const anyVisible = items.some((item) => !item.classList.contains('hidden'));
      el.classList.toggle('hidden', !anyVisible);
    });

    tagLinks.forEach((link) => {
      const linkTag = (link.getAttribute('data-tag-link') || '').toLowerCase();
      const active = linkTag === tag;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    if (streamTitle) {
      streamTitle.textContent = tag ? `#${tag}` : '全部文章';
    }
    if (streamCount) {
      streamCount.textContent = String(visible);
    }
    if (streamEmpty) {
      streamEmpty.classList.toggle('hidden', visible > 0);
    }
  }

  function resetTimeMode() {
    articleMeta.forEach(({ el }) => el.classList.remove('hidden'));
    monthMeta.forEach(({ el }) => el.classList.remove('hidden'));
    yearMeta.forEach(({ el }) => el.classList.remove('hidden'));
    tagLinks.forEach((link) => {
      link.classList.toggle('is-active', !link.getAttribute('data-tag-link'));
      link.removeAttribute('aria-current');
    });
    if (streamTitle) streamTitle.textContent = '全部文章';
    if (streamCount) streamCount.textContent = String(articleMeta.length);
    if (streamEmpty) streamEmpty.classList.add('hidden');
  }

  function applyMode(mode) {
    root.setAttribute('data-mode', mode);

    modeTabs.forEach((tab) => {
      const tabMode = tab.getAttribute('data-mode-tab');
      const active = tabMode === mode;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    sidePanels.forEach((panel) => {
      const panelMode = panel.getAttribute('data-panel');
      const show = panelMode === mode;
      if (show) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    });
  }

  function maybeScrollToHash() {
    const hash = window.location.hash;
    if (!/^#archive-\d{4}-\d{2}$/.test(hash)) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    requestAnimationFrame(() => {
      const top = target.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  function applyState(state, { scroll = false } = {}) {
    applyMode(state.mode);
    if (state.mode === 'tag') {
      applyTagFilter(state.tag);
    } else {
      resetTimeMode();
      if (scroll) maybeScrollToHash();
    }
  }

  function buildUrl(state) {
    const params = new URLSearchParams();
    params.set('mode', state.mode);
    if (state.mode === 'tag' && state.tag) params.set('tag', state.tag);
    return `?${params.toString()}`;
  }

  modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = tab.getAttribute('data-mode-tab');
      if (mode !== 'tag' && mode !== 'time') return;
      const current = readState();
      const nextTag = mode === 'tag' ? current.tag : '';
      const state = { mode, tag: nextTag };
      window.history.pushState(null, '', buildUrl(state));
      applyState(state);
    });
  });

  tagLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
      event.preventDefault();
      const tag = (link.getAttribute('data-tag-link') || '').toLowerCase();
      const state = { mode: 'tag', tag };
      window.history.pushState(null, '', buildUrl(state));
      applyState(state);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  window.addEventListener('popstate', () => {
    applyState(readState(), { scroll: true });
  });

  window.addEventListener('hashchange', () => {
    const state = readState();
    applyState(state, { scroll: true });
  });

  applyState(readState(), { scroll: true });
}

init();
document.addEventListener('astro:page-load', init);
