/**
 * Content script: hide Shorts UI on youtube.com / m.youtube.com / youtu.be,
 * intercept SPA navigations to /shorts/, respect popup toggle.
 */
(function () {
  'use strict';

  const SD = globalThis.ShortsDetect;
  if (!SD) {
    console.warn('[ysb] ShortsDetect missing');
    return;
  }

  const STATE = { enabled: true, observer: null, scheduled: false };

  function storageGet() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get({ enabled: true }, (data) => {
          if (chrome.runtime.lastError) {
            chrome.storage.local.get({ enabled: true }, (d2) => resolve(d2.enabled !== false));
            return;
          }
          resolve(data.enabled !== false);
        });
      } catch (_) {
        resolve(true);
      }
    });
  }

  function showBlockedBanner() {
    if (document.getElementById('ysb-block-banner')) return;
    const params = new URLSearchParams(location.search);
    if (params.get('ysb_blocked') !== 'shorts') return;
    const el = document.createElement('div');
    el.id = 'ysb-block-banner';
    el.textContent = 'Block YouTube Shorts: Shorts navigation was blocked.';
    (document.body || document.documentElement).appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function guardCurrentUrl() {
    if (!STATE.enabled) return;
    if (!SD.isShortsUrl(location.href)) return;
    // Blank/block: navigate away from Shorts player
    const dest = location.origin + '/?ysb_blocked=shorts';
    if (location.href !== dest) {
      location.replace(dest);
    }
  }

  function sweep() {
    if (!STATE.enabled) return;
    if (!document.documentElement) return;
    try {
      SD.processRoot(document.documentElement);
    } catch (e) {
      console.warn('[ysb] sweep error', e);
    }
    // Extra: hide guide items whose link text/title is Shorts
    try {
      document.querySelectorAll('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytm-pivot-bar-item-renderer').forEach((entry) => {
        const a = entry.querySelector('a');
        const label =
          (a && (a.getAttribute('title') || a.getAttribute('aria-label'))) ||
          (entry.textContent || '').trim();
        const href = (a && a.getAttribute('href')) || '';
        if (SD.hrefLooksLikeShorts(href) || /^shorts$/i.test(label.trim()) || /\bshorts\b/i.test(label)) {
          SD.hideNode(entry);
        }
      });
    } catch (_) {}
  }

  function scheduleSweep() {
    if (STATE.scheduled || !STATE.enabled) return;
    STATE.scheduled = true;
    requestAnimationFrame(() => {
      STATE.scheduled = false;
      sweep();
    });
  }

  function interceptClicks(e) {
    if (!STATE.enabled) return;
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || a.href || '';
    if (!SD.hrefLooksLikeShorts(href) && !SD.isShortsUrl(a.href || '')) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    location.assign(location.origin + '/?ysb_blocked=shorts');
  }

  function patchHistory() {
    const wrap = (fnName) => {
      const orig = history[fnName];
      if (typeof orig !== 'function') return;
      history[fnName] = function () {
        const url = arguments[2];
        if (STATE.enabled && url && SD.isShortsUrl(String(url))) {
          return orig.call(this, arguments[0], arguments[1], '/?ysb_blocked=shorts');
        }
        const ret = orig.apply(this, arguments);
        scheduleSweep();
        guardCurrentUrl();
        return ret;
      };
    };
    wrap('pushState');
    wrap('replaceState');
    window.addEventListener('popstate', () => {
      guardCurrentUrl();
      scheduleSweep();
    });
  }

  function startObserver() {
    if (STATE.observer) return;
    STATE.observer = new MutationObserver(() => scheduleSweep());
    const start = () => {
      if (!document.documentElement) return;
      STATE.observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    };
    start();
  }

  function onYtNavigate() {
    guardCurrentUrl();
    scheduleSweep();
    // YouTube fires multiple navigate events; sweep after settle
    setTimeout(sweep, 100);
    setTimeout(sweep, 500);
    setTimeout(sweep, 1500);
  }

  function bindYtEvents() {
    document.addEventListener('yt-navigate-start', onYtNavigate, true);
    document.addEventListener('yt-navigate-finish', onYtNavigate, true);
    document.addEventListener('yt-page-data-updated', onYtNavigate, true);
  }

  async function setEnabled(on) {
    STATE.enabled = !!on;
    if (!STATE.enabled) {
      // Do not unhide already-hidden nodes aggressively (would fight SPA);
      // user can reload. Optionally clear our marks:
      document.querySelectorAll('[data-ysb-hidden="1"]').forEach((el) => {
        el.style.removeProperty('display');
        el.removeAttribute('hidden');
        el.removeAttribute('aria-hidden');
        delete el.dataset.ysbHidden;
      });
      return;
    }
    guardCurrentUrl();
    sweep();
  }

  async function init() {
    STATE.enabled = await storageGet();
    guardCurrentUrl();
    showBlockedBanner();
    patchHistory();
    bindYtEvents();
    document.addEventListener('click', interceptClicks, true);
    startObserver();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        showBlockedBanner();
        sweep();
      });
    } else {
      sweep();
    }
    // Periodic light sweep for late SPA injects
    setInterval(() => {
      if (STATE.enabled) sweep();
    }, 3000);

    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync' && area !== 'local') return;
        if (changes.enabled) setEnabled(changes.enabled.newValue !== false);
      });
    } catch (_) {}
  }

  init();
})();
