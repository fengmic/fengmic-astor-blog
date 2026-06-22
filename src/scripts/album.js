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

  function scheduleLayout(delay = 80) {
    clearTimeout(resizeTimerId);
    resizeTimerId = window.setTimeout(() => {
      const configuredColumns = Math.max(1, Number(wall.dataset.columns || 3));
      wall.style.setProperty('--album-columns', String(getEffectiveColumns(configuredColumns)));
      if (!lazyLoaderInitialized) {
        initViewportLazyLoader();
      }
    }, delay);
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
    });
    img.addEventListener('error', () => {
      delete img.dataset.loading;
    });
  });

  initViewportLazyLoader();

  window.addEventListener('resize', () => scheduleLayout(80), { passive: true });

  scheduleLayout(0);

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
