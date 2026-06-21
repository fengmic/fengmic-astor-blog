const BREAKPOINT_TABLET = 1080;
const BREAKPOINT_MOBILE = 640;

function init() {
  const wall = document.getElementById('album-wall');
  const modal = document.getElementById('album-modal');
  if (!(wall instanceof HTMLElement) || wall.dataset.bound === 'true') return;
  wall.dataset.bound = 'true';

  const closeBtn = document.getElementById('close-modal');
  const image = document.getElementById('modal-image');
  const desc = document.getElementById('modal-desc');
  const date = document.getElementById('modal-date');

  let layoutRafId = 0;
  let lazyObserver = null;
  let lazyLoaderInitialized = false;
  let resizeTimerId = 0;
  let albumItemsCache = [];
  let currentAlbumIndex = -1;

  function refreshAlbumItemsCache() {
    albumItemsCache = Array.from(wall.querySelectorAll('.album-item')).filter((item) => item instanceof HTMLElement);
  }

  function getEffectiveColumns(configuredColumns) {
    if (window.innerWidth <= BREAKPOINT_MOBILE) return 1;
    if (window.innerWidth <= BREAKPOINT_TABLET) return Math.min(2, configuredColumns);
    return configuredColumns;
  }

  function scheduleMasonryLayout() {
    clearTimeout(resizeTimerId);
    resizeTimerId = window.setTimeout(() => {
      cancelAnimationFrame(layoutRafId);
      layoutRafId = requestAnimationFrame(applyMasonryLayout);
    }, 80);
  }

  function loadImageIfNeeded(img) {
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.loaded === 'true' || img.dataset.loading === 'true') return;

    const realSrc = img.dataset.src;
    if (!realSrc) return;

    img.dataset.loading = 'true';
    img.src = realSrc;
  }

  function initViewportLazyLoader() {
    if (lazyLoaderInitialized) return;
    lazyLoaderInitialized = true;

    const items = Array.from(wall.querySelectorAll('.album-item')).filter((item) => item instanceof HTMLElement);
    const configuredColumns = Math.max(1, Number(wall.dataset.columns || 3));
    const eagerCount = Math.min(items.length, getEffectiveColumns(configuredColumns) * 2);

    items.slice(0, eagerCount).forEach((item) => {
      const img = item.querySelector('img');
      loadImageIfNeeded(img);
    });

    if ('IntersectionObserver' in window) {
      lazyObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const item = entry.target;
          if (!(item instanceof HTMLElement)) return;
          const img = item.querySelector('img');

          loadImageIfNeeded(img);
          lazyObserver?.unobserve(item);
        });
      }, {
        root: null,
        rootMargin: '200px 0px',
        threshold: 0.01,
      });

      items.forEach((item) => lazyObserver?.observe(item));
    } else {
      wall.querySelectorAll('img').forEach((img) => loadImageIfNeeded(img));
    }

    window.setTimeout(() => {
      const loadedCount = wall.querySelectorAll('img[data-loaded="true"]').length;
      if (loadedCount > 0) return;

      items.slice(0, Math.min(items.length, 8)).forEach((item) => {
        const img = item.querySelector('img');
        loadImageIfNeeded(img);
      });
    }, 800);
  }

  function applyMasonryLayout() {
    const items = Array.from(wall.querySelectorAll('.album-item')).filter((item) => item instanceof HTMLElement);
    if (!items.length) {
      wall.style.height = '';
      return;
    }

    const computed = getComputedStyle(wall);
    const configuredColumns = Math.max(1, Number(wall.dataset.columns || 3));
    const columns = getEffectiveColumns(configuredColumns);
    const gapX = Number.parseFloat(computed.getPropertyValue('--album-gap-x')) || 14;
    const gapY = Number.parseFloat(computed.getPropertyValue('--album-gap-y')) || 0;
    const containerWidth = wall.clientWidth;
    const itemWidth = (containerWidth - gapX * (columns - 1)) / columns;

    if (!(itemWidth > 0)) return;

    const columnHeights = new Array(columns).fill(0);

    items.forEach((item) => {
      item.style.width = `${itemWidth}px`;

      let targetColumn = 0;
      for (let i = 1; i < columnHeights.length; i++) {
        if (columnHeights[i] < columnHeights[targetColumn]) {
          targetColumn = i;
        }
      }

      const left = targetColumn * (itemWidth + gapX);
      const top = columnHeights[targetColumn];

      item.style.left = `${left}px`;
      item.style.top = `${top}px`;

      columnHeights[targetColumn] += item.offsetHeight + gapY;
    });

    const maxHeight = Math.max(...columnHeights);
    wall.style.height = `${Math.max(0, maxHeight - gapY)}px`;

    if (!lazyLoaderInitialized) {
      initViewportLazyLoader();
    }
  }

  function openModal(url, text, createdAt) {
    if (image instanceof HTMLImageElement) {
      image.src = url;
      image.alt = text;
    }
    modal?.style.setProperty('--album-preview-bg', `url("${url.replace(/"/g, '%22')}")`);
    if (desc) desc.textContent = text;
    if (date) {
      date.textContent = createdAt;
      date.setAttribute('datetime', createdAt);
    }
    modal?.classList.remove('hidden');
    modal?.setAttribute('aria-hidden', 'false');
    closeBtn?.focus();
    document.body.style.overflow = 'hidden';
  }

  function openModalForItem(item) {
    if (!(item instanceof HTMLElement)) return;
    if (!albumItemsCache.length) refreshAlbumItemsCache();
    currentAlbumIndex = albumItemsCache.indexOf(item);
    openModal(item.dataset.image || '', item.dataset.desc || '', item.dataset.date || '');
  }

  function stepAlbum(delta) {
    if (!albumItemsCache.length) refreshAlbumItemsCache();
    if (!albumItemsCache.length) return;
    const next = (currentAlbumIndex + delta + albumItemsCache.length) % albumItemsCache.length;
    const item = albumItemsCache[next];
    if (!(item instanceof HTMLElement)) return;
    currentAlbumIndex = next;
    openModal(item.dataset.image || '', item.dataset.desc || '', item.dataset.date || '');
  }

  function closeModal() {
    modal?.classList.add('hidden');
    modal?.setAttribute('aria-hidden', 'true');
    modal?.style.removeProperty('--album-preview-bg');
    document.body.style.overflow = '';
    const restoreTarget = albumItemsCache[currentAlbumIndex];
    currentAlbumIndex = -1;
    if (restoreTarget instanceof HTMLElement) restoreTarget.focus();
  }

  wall.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const item = target.closest('.album-item');
    if (!(item instanceof HTMLElement)) return;
    openModalForItem(item);
  });

  wall.querySelectorAll('img').forEach((img) => {
    img.addEventListener('load', () => {
      img.dataset.loaded = 'true';
      delete img.dataset.loading;
      scheduleMasonryLayout();
    });
    img.addEventListener('error', () => {
      delete img.dataset.loading;
      scheduleMasonryLayout();
    });
  });

  initViewportLazyLoader();

  window.addEventListener('resize', scheduleMasonryLayout, { passive: true });

  scheduleMasonryLayout();

  wall.addEventListener('keydown', (event) => {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const item = target.closest('.album-item');
    if (!(item instanceof HTMLElement)) return;

    event.preventDefault();
    openModalForItem(item);
  });

  closeBtn?.addEventListener('click', () => closeModal());

  modal?.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!modal || modal.classList.contains('hidden')) return;
    if (event.key === 'Escape') {
      closeModal();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepAlbum(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepAlbum(1);
    }
  });

  refreshAlbumItemsCache();
}

init();
document.addEventListener('astro:page-load', init);
