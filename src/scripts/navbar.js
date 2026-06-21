function setup() {
  const toggle = document.getElementById('nav-toggle');
  const drawer = document.getElementById('nav-drawer');
  const searchInput = document.getElementById('search-input');

  if (toggle && drawer && toggle.dataset.bound !== 'true') {
    toggle.dataset.bound = 'true';

    const close = () => {
      drawer.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '打开菜单');
    };
    const open = () => {
      drawer.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', '关闭菜单');
    };

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (drawer.classList.contains('is-open')) close();
      else open();
    });

    drawer.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    document.addEventListener('click', (event) => {
      if (!drawer.classList.contains('is-open')) return;
      const target = event.target;
      if (target instanceof Node && (drawer.contains(target) || toggle.contains(target))) return;
      close();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && drawer.classList.contains('is-open')) close();
    });
  }

  if (searchInput instanceof HTMLInputElement && document.body.dataset.searchKbdBound !== 'true') {
    document.body.dataset.searchKbdBound = 'true';
    document.addEventListener('keydown', (event) => {
      const active = document.activeElement;
      const inField =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);
      if (inField) return;

      const isSlash = event.key === '/';
      const isCmdK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (!isSlash && !isCmdK) return;

      event.preventDefault();
      searchInput.focus();
      searchInput.select();
    });
  }
}

function syncActive() {
  const path = window.location.pathname;
  document.querySelectorAll('#nav-drawer a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    let active = false;
    if (href === '/home') {
      active = path === '/' || path === '/home' || path.startsWith('/home/') || path.startsWith('/post/');
    } else {
      active = path === href || path.startsWith(href + '/');
    }
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

setup();
syncActive();
document.addEventListener('astro:page-load', () => {
  setup();
  syncActive();
});
