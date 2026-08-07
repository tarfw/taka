document.documentElement.classList.add('js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduceMotion) {
  // ── Reveal on scroll ──
  const viewEls = Array.from(document.querySelectorAll('[data-view]'));

  if ('IntersectionObserver' in window && viewEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('inview');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '-60px 0px -60px 0px', threshold: 0.01 }
    );
    viewEls.forEach((el) => io.observe(el));
  } else {
    viewEls.forEach((el) => el.classList.add('inview'));
  }

  // ── Word splitting ──
  document.querySelectorAll('[data-splitting="words"]').forEach((el) => {
    if (el.dataset.splitDone) return;
    if (el.children.length) return;
    const text = (el.textContent || '').trim();
    if (!text) return;
    el.textContent = '';
    text.split(/\s+/).forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.style.setProperty('--word-index', i);
      span.textContent = word;
      el.appendChild(span);
      el.appendChild(document.createTextNode(' '));
    });
    el.dataset.splitDone = '1';
  });

  // ── Hero parallax zoom ──
  const zoomEl = document.querySelector('[data-parallax="zoom"]');
  if (zoomEl) {
    let raf = 0;
    const update = () => {
      const y = window.scrollY;
      const scale = Math.max(1, 1.15 - 0.15 * (y / window.innerHeight));
      zoomEl.style.transform = `scale(${scale})`;
      raf = 0;
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!raf) raf = requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }
} else {
  // Reduced motion: show everything immediately
  document.querySelectorAll('[data-view]').forEach((el) => el.classList.add('inview'));
}
