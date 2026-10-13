/* Apartamenty Quorum – efekty motywu „Future” (uruchamiane po main.js) */
(() => {
  'use strict';
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasIO = 'IntersectionObserver' in window;

  /* ---------- Tło, pasek postępu, poświata kursora ---------- */
  const bg = document.createElement('div');
  bg.className = 'fx-bg';
  bg.setAttribute('aria-hidden', 'true');
  bg.innerHTML = '<div class="fx-grid"></div><div class="fx-noise"></div>';
  document.body.prepend(bg);

  const progress = document.createElement('div');
  progress.className = 'fx-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);
  if (!CSS.supports('animation-timeline: scroll()')) {
    const setP = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
    };
    addEventListener('scroll', setP, { passive: true });
    setP();
  }

  // Skaner na zdjęciu w hero
  const heroMedia = document.querySelector('.hero-media');
  if (heroMedia) {
    const scan = document.createElement('span');
    scan.className = 'scan';
    scan.setAttribute('aria-hidden', 'true');
    heroMedia.append(scan);
  }

  // Pasek z hasłami: zdublowana treść daje płynną pętlę
  $$('.marquee-track').forEach((track) => {
    $$(':scope > span', track).forEach((s) => {
      const c = s.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      track.append(c);
    });
  });

  if (reduced) return;

  /* ---------- Nagłówki: słowo po słowie ---------- */
  const observeOnce = (els, cls = 'is-in', margin = '0px 0px -10% 0px') => {
    if (!hasIO) { els.forEach((el) => el.classList.add(cls)); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add(cls); io.unobserve(e.target); } });
    }, { rootMargin: margin });
    els.forEach((el) => io.observe(el));
  };

  const splitWords = (el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement('span');
            w.className = 'w';
            if (node.classList?.contains('accent')) w.classList.add('grad-text');
            w.style.setProperty('--i', i++);
            w.textContent = part;
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    $$('.w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
    el.classList.add('split');
  };
  const headings = $$('main h1, main h2');
  headings.forEach(splitWords);
  // Nagłówek animuje się słowami, więc jego sekcja nie potrzebuje już rozmycia całości
  headings.forEach((h) => h.closest('.section-head, .apartment-head')?.classList.remove('reveal'));
  const accentStyle = document.createElement('style');
  accentStyle.textContent = '.split .accent{background:none;animation:none;color:inherit}';
  document.head.append(accentStyle);
  observeOnce(headings);

  /* ---------- Galerie: zdjęcia odsłaniane kaskadowo ---------- */
  const grids = $$('.gallery, .photo-grid');
  grids.forEach((g) => $$(':scope > a', g).forEach((a, i) => a.style.setProperty('--i', i)));
  observeOnce(grids, 'is-in', '0px 0px -5% 0px');

  /* ---------- Liczniki ---------- */
  const NUM = /\d{1,3}(?:[  ]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;
  const parse = (t) => parseFloat(t.replace(/[  ]/g, '').replace(',', '.'));
  const fmt = (v, tok) => {
    const dec = (tok.split(',')[1] || '').length;
    const grouped = /[  ]/.test(tok);
    const s = v.toFixed(dec).replace('.', ',');
    if (!grouped) return s;
    const [int, frac] = s.split(',');
    return int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (frac ? ',' + frac : '');
  };
  const counters = [];
  $$('.stats dd, .hero-stats strong, .features strong').forEach((el) => {
    const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && /\d/.test(n.textContent));
    if (!node) return;
    const original = node.textContent;
    const tokens = original.match(NUM) || [];
    if (!tokens.length || tokens.every((t) => { const v = parse(t); return v >= 1900 && v <= 2100 && !/[ ,]/.test(t); })) return;
    counters.push({ el, node, original });
  });
  const runCounter = ({ node, original }) => {
    const dur = 1600;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      node.textContent = original.replace(NUM, (tok) => fmt(parse(tok) * ease(p), tok));
      if (p < 1) requestAnimationFrame(frame); else node.textContent = original;
    };
    requestAnimationFrame(frame);
  };
  if (hasIO) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const c = counters.find((x) => x.el === e.target);
        if (c) runCounter(c);
        io.unobserve(e.target);
      });
    }, { threshold: .4 });
    counters.forEach((c) => io.observe(c.el));
  }

  if (!finePointer) return;

  /* ---------- Poświata kursora ---------- */
  const glow = document.createElement('div');
  glow.className = 'fx-cursor';
  glow.setAttribute('aria-hidden', 'true');
  document.body.append(glow);
  let gx = -999, gy = -999, tx = gx, ty = gy, raf = 0;
  const loop = () => {
    gx += (tx - gx) * .12; gy += (ty - gy) * .12;
    glow.style.setProperty('--x', gx + 'px'); glow.style.setProperty('--y', gy + 'px');
    raf = Math.abs(tx - gx) + Math.abs(ty - gy) > .5 ? requestAnimationFrame(loop) : 0;
  };
  addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    glow.classList.add('is-on');
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => glow.classList.remove('is-on'));

  /* ---------- Karty: reflektor + przechylenie 3D ---------- */
  const spotEls = $$('.offer-card-link, .tile, .area-card, .info-grid li, .other-card, .price-box, .stats, .features');
  spotEls.forEach((el) => el.classList.add('spot'));
  const tiltEls = $$('.offer-card-link, .tile, .area-card, .other-card');
  tiltEls.forEach((el) => el.classList.add('tilt'));

  spotEls.forEach((el) => {
    const tilt = el.classList.contains('tilt');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty('--mx', x + 'px');
      el.style.setProperty('--my', y + 'px');
      if (tilt) {
        const rx = ((y / r.height) - .5) * -6;
        const ry = ((x / r.width) - .5) * 6;
        el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
      }
    });
    el.addEventListener('pointerleave', () => { if (tilt) el.style.transform = ''; });
  });

  /* ---------- Magnetyczne przyciski ---------- */
  $$('.btn:not(.btn-block)').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * .25}px, ${y * .35}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
})();
