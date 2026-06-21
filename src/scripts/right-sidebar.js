function initCarousel() {
  const carousel = document.querySelector('[data-carousel]');
  if (!(carousel instanceof HTMLElement)) return;
  if (carousel.dataset.bound === 'true') return;
  carousel.dataset.bound = 'true';

  const scheduleCarouselInit = window.requestIdleCallback
    ? (cb) => window.requestIdleCallback(cb, { timeout: 1200 })
    : (cb) => window.setTimeout(cb, 0);

  const imgs = [...carousel.querySelectorAll('img')].filter((img) => img instanceof HTMLImageElement);
  let current = 0;
  let timerId = 0;
  let observer = null;
  let carouselStarted = false;
  const onVisibilityChange = () => {
    if (document.hidden) stopCarousel();
    else startCarousel();
  };

  function loadImageByIndex(index) {
    const img = imgs[index];
    if (!(img instanceof HTMLImageElement)) return;
    if (!img.dataset.src) return;
    img.src = img.dataset.src;
    delete img.dataset.src;
  }

  function setActive(index) {
    imgs[current]?.classList.remove('active');
    current = index;
    loadImageByIndex(current);
    imgs[current]?.classList.add('active');

    const next = (current + 1) % imgs.length;
    loadImageByIndex(next);
  }

  function startCarousel() {
    if (timerId || imgs.length <= 1 || !carouselStarted) return;
    timerId = window.setInterval(() => {
      const next = (current + 1) % imgs.length;
      setActive(next);
    }, 3000);
  }

  function stopCarousel() {
    if (!timerId) return;
    clearInterval(timerId);
    timerId = 0;
  }

  scheduleCarouselInit(() => {
    if (imgs.length > 0) {
      setActive(0);
    }

    carouselStarted = true;

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) startCarousel();
          else stopCarousel();
        });
      }, { threshold: 0.15 });
      observer.observe(carousel);
    } else {
      startCarousel();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);

    window.addEventListener('pagehide', () => {
      stopCarousel();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    });
  });
}

function initCalendar() {
  const calendarRoot = document.getElementById('calendar-root');
  if (!calendarRoot) return;
  if (calendarRoot.dataset.bound === 'true') return;
  calendarRoot.dataset.bound = 'true';

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const labels = ['日', '一', '二', '三', '四', '五', '六'];
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push('<span></span>');
  for (let day = 1; day <= daysInMonth; day++) {
    const active = day === today ? 'today' : '';
    cells.push(`<span class="${active}"${active === 'today' ? ' aria-label="今天"' : ''}>${day}</span>`);
  }

  calendarRoot.innerHTML = `
    <p class="month-title">${monthNames[month]}</p>
    <div class="weekday-row" aria-hidden="true">${labels.map((d) => `<span>${d}</span>`).join('')}</div>
    <div class="day-grid" role="grid" aria-label="日历">${cells.join('')}</div>
  `;
}

function init() {
  initCarousel();
  initCalendar();
}

init();
document.addEventListener('astro:page-load', init);
