/* ЭЛИЗИУМ. Landing behaviour.
   Three jobs: quantized scroll reveals, sticky-nav state, mobile menu.
   No scroll listeners anywhere. IntersectionObserver only. */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------------
     Reveals. The .js class is what arms the hidden start state in CSS, so if
     this script never runs, or motion is reduced, every element stays visible.
     ---------------------------------------------------------------------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js');

    var targets = document.querySelectorAll('[data-reveal]');

    /* Motion must never be the reason content is unreadable. When the document
       animation clock is stalled (a throttled background tab, some embedded
       webviews) a transition can park an element on its start frame and leave
       it at opacity 0 for good. This watchdog checks each element after its own
       delay has elapsed and drops the transition if it never ran, which lets
       the CSS end state apply at once.
       The brand watermark settles at 0.13, not 1, so it gets its own floor
       rather than being forced opaque. */
    var settle = function (el) {
      var i = parseInt(el.style.getPropertyValue('--i'), 10) || 0;
      var floor = el.getAttribute('data-reveal') === 'mark' ? 0.05 : 0.99;
      window.setTimeout(function () {
        if (parseFloat(window.getComputedStyle(el).opacity) < floor) {
          el.classList.add('is-settled');
        }
      }, 1000 + i * 90);
    };

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

    var reveal = function (el) {
      if (el.classList.contains('is-in')) return;
      el.classList.add('is-in');
      revealObserver.unobserve(el);
      settle(el);
    };

    targets.forEach(function (el) { revealObserver.observe(el); });

    /* Second half of the same guarantee. An observer callback can be coalesced
       or dropped when the tab is throttled, and a hash deep-link or an in-page
       anchor can land the reader past a region without one ever firing. So
       sweep whatever is already on screen: on the first frame, once shortly
       after load, and every time the document becomes visible again. Anything
       still below the fold is left to the observer, so the reveal is never
       spent before the reader gets there. */
    var sweep = function () {
      targets.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) reveal(el);
      });
    };

    requestAnimationFrame(sweep);
    window.setTimeout(sweep, 2500);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) sweep();
    });
  }

  /* ----------------------------------------------------------------------
     Sticky nav hairline. Driven by a 1px sentinel, not by scroll position.
     ---------------------------------------------------------------------- */
  var nav = document.getElementById('nav');
  var sentinel = document.querySelector('.nav-sentinel');

  if (nav && sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      nav.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(sentinel);
  }

  /* ----------------------------------------------------------------------
     Mobile menu.
     ---------------------------------------------------------------------- */
  var burger = document.querySelector('.nav__burger');
  var panel = document.getElementById('nav-mobile');

  if (burger && panel) {
    var setOpen = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
    };

    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });

    panel.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        burger.focus();
      }
    });

    /* Leaving the mobile breakpoint must not strand the panel open. */
    var wide = window.matchMedia('(min-width: 768px)');
    var syncBreakpoint = function (event) { if (event.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', syncBreakpoint);
    else wide.addListener(syncBreakpoint);
  }
})();
