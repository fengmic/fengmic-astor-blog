// Reading progress bar — scaleX driven, scoped to the article.
(function initReadingProgress() {
  const article = document.querySelector('.post-detail');
  const fill = document.querySelector('.reading-progress-fill');
  if (!(article instanceof HTMLElement) || !(fill instanceof HTMLElement)) return;

  let ticking = false;

  function update() {
    ticking = false;
    const rect = article.getBoundingClientRect();
    const articleTop = rect.top + window.scrollY;
    const total = Math.max(1, article.offsetHeight);
    const viewportBottom = window.scrollY + window.innerHeight;
    const progress = Math.max(0, Math.min(1, (viewportBottom - articleTop) / total));
    fill.style.transform = `scaleX(${progress})`;
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  document.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  update();
})();

// Auto TOC — generate from h2/h3 inside .prose-zone; hide block if too few.
(function initToc() {
  const toc = document.querySelector('.post-toc');
  const list = document.querySelector('.post-toc-list');
  const prose = document.querySelector('.prose-zone');
  if (!(toc instanceof HTMLElement) || !(list instanceof HTMLElement) || !(prose instanceof HTMLElement)) return;

  const headings = [...prose.querySelectorAll('h2, h3')];
  if (headings.length < 2) {
    toc.remove();
    return;
  }

  headings.forEach((heading, index) => {
    if (!heading.id) {
      const text = (heading.textContent || `heading-${index}`)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w一-龥-]/g, '');
      heading.id = text || `heading-${index}`;
    }
    const li = document.createElement('li');
    li.className = heading.tagName === 'H3' ? 'toc-item toc-item-h3' : 'toc-item toc-item-h2';
    const a = document.createElement('a');
    a.href = `#${heading.id}`;
    a.textContent = heading.textContent || '';
    li.appendChild(a);
    list.appendChild(li);
  });
})();

// Code copy — appends a copy button to every <pre> inside the prose zone.
(function initCodeCopy() {
  const blocks = document.querySelectorAll('.prose-zone pre');
  if (!blocks.length) return;

  const COPY_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const DONE_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  blocks.forEach((pre) => {
    if (!(pre instanceof HTMLElement)) return;
    const code = pre.querySelector('code');
    if (!code) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy-btn';
    btn.setAttribute('aria-label', '复制代码');
    btn.innerHTML = COPY_SVG;

    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent || '');
        btn.classList.add('is-copied');
        btn.innerHTML = DONE_SVG;
        btn.setAttribute('aria-label', '已复制');
        setTimeout(() => {
          btn.classList.remove('is-copied');
          btn.innerHTML = COPY_SVG;
          btn.setAttribute('aria-label', '复制代码');
        }, 1500);
      } catch {
        // Clipboard API blocked — leave UI as-is.
      }
    });

    pre.appendChild(btn);
  });
})();

// Back to top — visible after a scroll threshold.
(function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!(btn instanceof HTMLElement)) return;

  const THRESHOLD = 600;
  let ticking = false;

  function toggle() {
    ticking = false;
    if (window.scrollY > THRESHOLD) btn.classList.add('is-visible');
    else btn.classList.remove('is-visible');
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(toggle);
  }

  document.addEventListener('scroll', schedule, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  toggle();
})();
