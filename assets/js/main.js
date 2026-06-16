/* ============================================================
   The Dopamine Reset — UI-Logik
   ============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Nav scroll state ── */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Scroll reveal ── */
  const reveals = document.querySelectorAll('.reveal');
  if (reduceMotion) {
    reveals.forEach(el => el.classList.add('in'));
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* ── FAQ accordion ── */
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const answer = item.querySelector('.faq-a');
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item.open').forEach(o => {
        o.classList.remove('open');
        o.querySelector('.faq-a').style.maxHeight = null;
        o.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ── Hero parallax (mousemove, throttled via rAF) ── */
  const brainZone = document.querySelector('.brain-zone');
  if (brainZone && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    let raf = null, tx = 0, ty = 0;
    window.addEventListener('mousemove', (e) => {
      const cx = (e.clientX / window.innerWidth) - 0.5;
      const cy = (e.clientY / window.innerHeight) - 0.5;
      tx = cx * 18; ty = cy * 18;
      if (!raf) raf = requestAnimationFrame(() => {
        brainZone.style.transform = `translate(${tx}px, ${ty}px)`;
        raf = null;
      });
    }, { passive: true });
  }

  /* ── Sticky mobile CTA: zeigt sich nach Hero, versteckt sich an der Kaufsektion ── */
  const sticky = document.getElementById('stickyCta');
  const buySection = document.getElementById('kaufen');
  const hero = document.querySelector('.hero');
  if (sticky && hero && 'IntersectionObserver' in window) {
    let pastHero = false, atBuy = false;
    const update = () => sticky.classList.toggle('show', pastHero && !atBuy);
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; update(); },
      { threshold: 0 }).observe(hero);
    if (buySection) {
      new IntersectionObserver(([e]) => { atBuy = e.isIntersecting; update(); },
        { threshold: 0 }).observe(buySection);
    }
  }

  /* ── Cookie banner ──
     Hinweis: Auf echtem Hosting Auswahl in Cookie/localStorage persistieren
     und Analytics erst NACH Zustimmung laden (DSGVO). */
  let cookieConsent = null;
  const cookieEl = document.getElementById('cookie');
  if (cookieEl) {
    setTimeout(() => { if (cookieConsent === null) cookieEl.classList.add('show'); }, 1200);
    window.cookieChoice = function (acceptAll) {
      cookieConsent = acceptAll;
      cookieEl.classList.remove('show');
      if (acceptAll) {
        /* ▼ HIER Analytics laden (z.B. Plausible — cookielos & DSGVO-freundlich). */
      }
    };
  }

  /* ── Rechtliches: Tab-Umschaltung ── */
  function showLegal(id) {
    document.querySelectorAll('.legal-block').forEach(b => b.classList.toggle('active', b.id === id));
    document.querySelectorAll('.legal-tab').forEach(t => t.classList.toggle('active', t.dataset.legal === id));
  }
  document.querySelectorAll('.legal-tab').forEach(tab => {
    tab.addEventListener('click', () => showLegal(tab.dataset.legal));
  });
  document.querySelectorAll('a[href^="#impressum"], a[href^="#datenschutz"], a[href^="#widerruf"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      if (document.getElementById(id)) {
        e.preventDefault();
        showLegal(id);
        document.getElementById('rechtliches').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });
  });
})();
