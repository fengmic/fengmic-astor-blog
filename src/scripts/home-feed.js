const searchInput = document.getElementById('search-input');
const searchForm = document.getElementById('search-form');
const resultBar = document.getElementById('result-bar');
const emptyTips = document.getElementById('empty-tips');
const quotePanel = document.getElementById('quote-panel');
const postList = document.getElementById('post-list');
const postListTemplate = document.getElementById('post-list-template');

const quotesNode = document.getElementById('home-feed-quotes');
let quotes = [];
try {
  quotes = quotesNode && quotesNode.textContent ? JSON.parse(quotesNode.textContent) : [];
} catch {
  quotes = [];
}

let selectedTag = '';
let keyword = '';
let debounceTimer = null;
let renderRafId = 0;
let quoteTypeTimer = 0;
let quoteRotateTimer = 0;
let postListMounted = false;
let activeHighlightQuery = '';
let lastAppliedHighlightQuery = null;

const QUOTE_TYPE_SPEED = 70;
const QUOTE_LINE_BREAK_DELAY = 180;
const QUOTE_HOLD_DELAY = 2200;
const QUOTE_ROTATE_DELAY = 7000;

function getQueryParams() {
  const p = new URLSearchParams(window.location.search);
  return { q: p.get('q') || '', tag: p.get('tag') || '' };
}

function setQueryParams(q, tag) {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  if (tag) p.set('tag', tag);
  const qs = p.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

function clearQuoteTimers() {
  clearTimeout(quoteTypeTimer);
  clearTimeout(quoteRotateTimer);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderResultBar(bar, tag, kw, visible) {
  if (!tag && !kw) {
    bar.innerHTML = '';
    return;
  }

  const parts = ['<span class="filter-summary">当前筛选</span>'];
  if (tag) {
    parts.push(
      `<button class="filter-chip" type="button" data-clear="tag" aria-label="清除标签筛选 ${escapeHtml(tag)}">` +
        `#${escapeHtml(tag)}<span class="filter-chip-close" aria-hidden="true">✕</span>` +
      `</button>`
    );
  }
  if (kw) {
    parts.push(
      `<button class="filter-chip" type="button" data-clear="keyword" aria-label="清除关键词 ${escapeHtml(kw)}">` +
        `&ldquo;${escapeHtml(kw)}&rdquo;<span class="filter-chip-close" aria-hidden="true">✕</span>` +
      `</button>`
    );
  }
  parts.push(`<span class="filter-count">共 ${visible} 篇</span>`);
  if (tag && kw) {
    parts.push(`<button class="filter-clear-all" type="button" data-clear="all">清除全部</button>`);
  }

  bar.innerHTML = parts.join('');
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);

  const exactPattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactMatcher = new RegExp(exactPattern, 'gi');

  if (text.match(exactMatcher)) {
    let lastIndex = 0;
    let output = '';

    for (const match of text.matchAll(exactMatcher)) {
      if (typeof match.index !== 'number') continue;
      const start = match.index;
      const matchedText = match[0];

      output += escapeHtml(text.slice(lastIndex, start));
      output += `<mark class="search-highlight">${escapeHtml(matchedText)}</mark>`;
      lastIndex = start + matchedText.length;
    }

    output += escapeHtml(text.slice(lastIndex));
    return output;
  }

  const queryChars = [...query.replace(/\s+/g, '').toLowerCase()];
  if (!queryChars.length) return escapeHtml(text);

  const normalizedText = [...text];
  const matches = [];
  let cursor = 0;

  for (const queryChar of queryChars) {
    let foundIndex = -1;
    for (let i = cursor; i < normalizedText.length; i += 1) {
      const currentChar = normalizedText[i];
      if (/\s/.test(currentChar)) continue;
      if (currentChar.toLowerCase() === queryChar) {
        foundIndex = i;
        cursor = i + 1;
        break;
      }
    }

    if (foundIndex === -1) return escapeHtml(text);
    matches.push(foundIndex);
  }

  const mergedRanges = [];
  let rangeStart = matches[0];
  let rangeEnd = matches[0] + 1;

  for (let i = 1; i < matches.length; i += 1) {
    const index = matches[i];
    if (index === rangeEnd) {
      rangeEnd += 1;
    } else {
      mergedRanges.push([rangeStart, rangeEnd]);
      rangeStart = index;
      rangeEnd = index + 1;
    }
  }
  mergedRanges.push([rangeStart, rangeEnd]);

  let output = '';
  let lastIndex = 0;

  mergedRanges.forEach(([start, end]) => {
    output += escapeHtml(text.slice(lastIndex, start));
    output += `<mark class="search-highlight">${escapeHtml(text.slice(start, end))}</mark>`;
    lastIndex = end;
  });

  output += escapeHtml(text.slice(lastIndex));
  return output;
}

function mountPostList() {
  if (postListMounted) return;
  if (!(postList instanceof HTMLElement) || !(postListTemplate instanceof HTMLTemplateElement)) return;

  postListMounted = true;
  postList.innerHTML = '';
  postList.appendChild(postListTemplate.content.cloneNode(true));
  postList.setAttribute('aria-busy', 'false');

  initializeFilters();
}

function initializeFilters() {
  const cards = [...document.querySelectorAll('[data-post-card]')];
  const cardMeta = cards.map((card) => {
    const titleEl = card.querySelector('.post-card-title-link') || card.querySelector('h3');
    const tagEls = [...card.querySelectorAll('.post-tags > *')];
    return {
      card,
      tags: new Set((card.getAttribute('data-tags') || '').split('|').filter(Boolean)),
      text: card.getAttribute('data-search') || '',
      title: titleEl,
      excerpt: card.querySelector('p'),
      tagNodes: tagEls,
      originalTitle: titleEl?.textContent || '',
      originalExcerpt: card.querySelector('p')?.textContent || '',
      originalTags: tagEls.map((node) => node.textContent || ''),
    };
  });
  const tagButtons = [...document.querySelectorAll('[data-tag-filter]')];

  function applyHighlights(query, visibleSet) {
    if (query === lastAppliedHighlightQuery) return;
    lastAppliedHighlightQuery = query;

    cardMeta.forEach((item) => {
      if (visibleSet && !visibleSet.has(item)) return;
      if (item.title) item.title.innerHTML = highlightText(item.originalTitle, query);
      if (item.excerpt) item.excerpt.innerHTML = highlightText(item.originalExcerpt, query);

      item.tagNodes.forEach((node, index) => {
        const originalTag = item.originalTags[index] || node.textContent || '';
        node.innerHTML = highlightText(originalTag, query);
      });
    });
  }

  const render = () => {
    let visible = 0;
    const selectedTagLower = selectedTag.toLowerCase();
    const fuzzyKeyword = keyword.replace(/\s+/g, '').toLowerCase();
    const visibleItems = [];
    const visibleSet = new Set();

    cardMeta.forEach((item) => {
      const hitTag = !selectedTagLower || item.tags.has(selectedTagLower);
      const hitKeyword = !fuzzyKeyword || fuzzyIncludes(item.text, fuzzyKeyword);
      const show = hitTag && hitKeyword;

      item.card.classList.toggle('hidden', !show);
      if (show) {
        visible += 1;
        visibleItems.push(item);
        visibleSet.add(item);
      }
    });

    if (!activeHighlightQuery) {
      lastAppliedHighlightQuery = null;
    }

    applyHighlights(activeHighlightQuery, visibleSet);

    if (activeHighlightQuery) {
      cardMeta.forEach((item) => {
        if (visibleItems.includes(item)) return;
        if (item.title) item.title.innerHTML = escapeHtml(item.originalTitle);
        if (item.excerpt) item.excerpt.innerHTML = escapeHtml(item.originalExcerpt);
        item.tagNodes.forEach((node, index) => {
          const originalTag = item.originalTags[index] || node.textContent || '';
          node.innerHTML = escapeHtml(originalTag);
        });
      });
    }

    if (resultBar) {
      renderResultBar(resultBar, selectedTag, keyword, visible);
    }

    if (emptyTips) {
      emptyTips.classList.toggle('hidden', visible > 0);
    }

    setQueryParams(keyword, selectedTag);
  };

  function clearTagState() {
    selectedTag = '';
    tagButtons.forEach((node) => {
      node.classList.remove('active');
      node.setAttribute('aria-pressed', 'false');
    });
  }

  function clearKeywordState() {
    keyword = '';
    activeHighlightQuery = '';
    lastAppliedHighlightQuery = null;
    if (searchInput instanceof HTMLInputElement) searchInput.value = '';
  }

  if (resultBar) {
    resultBar.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const trigger = target.closest('[data-clear]');
      if (!(trigger instanceof HTMLElement)) return;

      const what = trigger.getAttribute('data-clear');
      if (what === 'tag' || what === 'all') clearTagState();
      if (what === 'keyword' || what === 'all') clearKeywordState();
      scheduleRender();
    });
  }

  function scheduleRender() {
    cancelAnimationFrame(renderRafId);
    renderRafId = requestAnimationFrame(render);
  }

  function fuzzyIncludes(text, query) {
    if (!query) return true;

    const textChars = [...text];
    const queryChars = [...query];
    let cursor = 0;

    for (const queryChar of queryChars) {
      let found = false;

      while (cursor < textChars.length) {
        const currentChar = textChars[cursor];
        cursor += 1;

        if (/\s/.test(currentChar)) continue;
        if (currentChar.toLowerCase() === queryChar) {
          found = true;
          break;
        }
      }

      if (!found) return false;
    }

    return true;
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        keyword = searchInput.value.trim();
        activeHighlightQuery = keyword;
        scheduleRender();
      }, 300);
    });
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearTimeout(debounceTimer);
      keyword = searchInput?.value?.trim() || '';
      activeHighlightQuery = keyword;
      scheduleRender();
    });
  }

  tagButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = btn.getAttribute('data-tag-filter') || '';
      selectedTag = selectedTag === tag ? '' : tag;
      tagButtons.forEach((node) => {
        node.classList.remove('active');
        node.setAttribute('aria-pressed', 'false');
      });
      if (selectedTag) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      }
      scheduleRender();
    });
  });

  const initParams = getQueryParams();
  if (initParams.q) {
    keyword = initParams.q;
    activeHighlightQuery = keyword;
    if (searchInput) searchInput.value = keyword;
  }
  if (initParams.tag) {
    selectedTag = initParams.tag;
    tagButtons.forEach((btn) => {
      if (btn.getAttribute('data-tag-filter') === selectedTag) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  scheduleRender();
}

function typeQuote(text, onDone) {
  if (!(quotePanel instanceof HTMLElement)) return;

  clearTimeout(quoteTypeTimer);
  quotePanel.classList.add('typing');
  quotePanel.textContent = '';

  let cursor = 0;

  const tick = () => {
    if (!(quotePanel instanceof HTMLElement)) return;

    if (cursor >= text.length) {
      quotePanel.classList.remove('typing');
      if (typeof onDone === 'function') onDone();
      return;
    }

    const nextChar = text[cursor];
    quotePanel.textContent += nextChar;
    cursor += 1;

    quoteTypeTimer = window.setTimeout(
      tick,
      nextChar === '\n' ? QUOTE_LINE_BREAK_DELAY : QUOTE_TYPE_SPEED,
    );
  };

  tick();
}

function startQuoteRotation() {
  if (!(quotePanel instanceof HTMLElement) || !Array.isArray(quotes) || quotes.length === 0) return;

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let idx = 0;
  let isPaused = false;

  function bindHoverPause(resume) {
    const onEnter = () => {
      if (isPaused) return;
      isPaused = true;
      clearQuoteTimers();
      // Reveal the full current quote so the panel doesn't sit half-typed.
      if (quotePanel.classList.contains('typing')) {
        quotePanel.classList.remove('typing');
        quotePanel.textContent = quotes[idx];
      }
    };
    const onLeave = () => {
      if (!isPaused) return;
      isPaused = false;
      if (quotes.length > 1) {
        clearQuoteTimers();
        quoteRotateTimer = window.setTimeout(resume, QUOTE_HOLD_DELAY);
      }
    };
    quotePanel.addEventListener('mouseenter', onEnter);
    quotePanel.addEventListener('mouseleave', onLeave);
    quotePanel.addEventListener('focusin', onEnter);
    quotePanel.addEventListener('focusout', onLeave);
  }

  if (prefersReducedMotion) {
    quotePanel.classList.remove('typing');
    quotePanel.textContent = quotes[0];

    if (quotes.length > 1) {
      const rotateStatic = () => {
        if (isPaused) return;
        quoteRotateTimer = window.setTimeout(() => {
          idx = (idx + 1) % quotes.length;
          quotePanel.textContent = quotes[idx];
          rotateStatic();
        }, QUOTE_ROTATE_DELAY);
      };
      rotateStatic();
      bindHoverPause(() => {
        idx = (idx + 1) % quotes.length;
        quotePanel.textContent = quotes[idx];
        rotateStatic();
      });
    }
    return;
  }

  const play = () => {
    if (isPaused) return;
    typeQuote(quotes[idx], () => {
      if (quotes.length <= 1 || isPaused) return;

      quoteRotateTimer = window.setTimeout(() => {
        idx = (idx + 1) % quotes.length;
        play();
      }, QUOTE_HOLD_DELAY);
    });
  };

  play();
  if (quotes.length > 1) {
    bindHoverPause(() => {
      idx = (idx + 1) % quotes.length;
      play();
    });
  }
}

const scheduleMount = window.requestIdleCallback
  ? (cb) => window.requestIdleCallback(cb, { timeout: 1200 })
  : (cb) => window.setTimeout(cb, 0);

scheduleMount(() => {
  mountPostList();
  startQuoteRotation();
});

window.addEventListener('pagehide', () => {
  clearQuoteTimers();
  if (quotePanel instanceof HTMLElement) {
    quotePanel.classList.remove('typing');
  }
});
