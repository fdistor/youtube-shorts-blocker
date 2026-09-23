/**
 * Pure Shorts detection helpers — used by content script and Node self-tests.
 * No chrome.* APIs; safe in both browser and Node.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.ShortsDetect = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** Paths / hosts that indicate a Shorts destination. */
  function isShortsUrl(urlOrPath) {
    if (!urlOrPath || typeof urlOrPath !== 'string') return false;
    let path = urlOrPath;
    let host = '';
    try {
      if (/^https?:\/\//i.test(urlOrPath) || urlOrPath.startsWith('//')) {
        const u = new URL(urlOrPath.startsWith('//') ? 'https:' + urlOrPath : urlOrPath);
        host = u.hostname.toLowerCase();
        path = u.pathname + u.search + u.hash;
      }
    } catch (_) {
      /* treat as path */
    }
    path = path.toLowerCase();
    host = host || '';

    if (/(?:^|\/)shorts(?:\/|$|\?|#)/.test(path)) return true;
    if (host.includes('youtu.be') && /(?:^|\/)shorts(?:\/|$|\?|#)/.test(path)) return true;
    if (/[?#&](?:feature=)?shorts?\b/.test(path)) return true;

    return false;
  }

  function hrefLooksLikeShorts(href) {
    if (!href) return false;
    if (isShortsUrl(href)) return true;
    if (/^\/shorts(?:\/|$|\?|#)/i.test(href)) return true;
    return false;
  }

  /** Item-level wrappers — prefer these over page-wide columns. */
  const ITEM_TAGS = new Set([
    'YTD-REEL-SHELF-RENDERER',
    'YTM-REEL-SHELF-RENDERER',
    'YTD-RICH-SHELF-RENDERER',
    'YTD-REEL-ITEM-RENDERER',
    'YTD-VIDEO-RENDERER',
    'YTD-GRID-VIDEO-RENDERER',
    'YTD-RICH-ITEM-RENDERER',
    'YTD-COMPACT-VIDEO-RENDERER',
    'YTD-COMPACT-MOVIE-RENDERER',
    'YTD-GUIDE-ENTRY-RENDERER',
    'YTD-MINI-GUIDE-ENTRY-RENDERER',
    'YTM-PIVOT-BAR-ITEM-RENDERER',
    'YTD-TAB-RENDERER',
    'YT-TAB-SHAPE',
    'YT-CHIP-CLOUD-CHIP-RENDERER',
    'TP-YT-PAPER-TAB',
    'YTM-SHORTS-LOCKUP-VIEW-MODEL',
    'YTD-SHORTS-LOCKUP-VIEW-MODEL',
    'YTD-RICH-SECTION-RENDERER',
    'YTM-RICH-SECTION-RENDERER',
    'YTD-ITEM-SECTION-RENDERER',
  ]);

  /** Never hide these — they mix Shorts with normal content. */
  const TOO_BROAD = new Set([
    'YTD-WATCH-NEXT-SECONDARY-RESULTS-RENDERER',
    'YTD-WATCH-FLEXY',
    'YTD-BROWSE',
    'YTD-PAGE-MANAGER',
    'YTD-APP',
    'YTD-RICH-GRID-RENDERER',
    'YTD-GRID-RENDERER',
    'YTD-TWO-COLUMN-SEARCH-RESULTS-RENDERER',
    'YTD-SECTION-LIST-RENDERER',
    'YTD-GUIDE-RENDERER',
    'YTM-PIVOT-BAR-RENDERER',
    'YTD-C4-TABBED-HEADER-RENDERER',
  ]);

  function hasNonShortsWatchLink(el) {
    try {
      const links = el.querySelectorAll('a[href]');
      for (const a of links) {
        const href = a.getAttribute('href') || '';
        if (!href || hrefLooksLikeShorts(href)) continue;
        if (/\/watch\b/i.test(href) || /\/(feed|channel|@|results|gaming|premium)/i.test(href) || href === '/') {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  /**
   * Climb from a node to a reasonable removable container.
   * Prefer item/shelf wrappers; never return mixed page columns.
   */
  function findRemovableContainer(el, doc) {
    if (!el || el === doc.body || el === doc.documentElement) return null;

    let cur = el;
    let best = el;
    let bestShelf = null;
    let bestItem = null;

    for (let i = 0; i < 14 && cur && cur !== doc.body && cur !== doc.documentElement; i++) {
      const tag = (cur.tagName || '').toUpperCase();
      if (TOO_BROAD.has(tag)) break;

      if (ITEM_TAGS.has(tag)) {
        // Shelves / sections / guide entries / tabs / chips — strong targets
        if (
          tag.includes('SHELF') ||
          tag === 'YTD-RICH-SECTION-RENDERER' ||
          tag === 'YTM-RICH-SECTION-RENDERER' ||
          tag === 'YTD-GUIDE-ENTRY-RENDERER' ||
          tag === 'YTD-MINI-GUIDE-ENTRY-RENDERER' ||
          tag === 'YTM-PIVOT-BAR-ITEM-RENDERER' ||
          tag === 'YT-TAB-SHAPE' ||
          tag === 'YTD-TAB-RENDERER' ||
          tag === 'YT-CHIP-CLOUD-CHIP-RENDERER' ||
          tag === 'TP-YT-PAPER-TAB' ||
          tag.includes('SHORTS-LOCKUP')
        ) {
          // Item-section only if it doesn't also hold normal watch results
          if (tag === 'YTD-ITEM-SECTION-RENDERER' && hasNonShortsWatchLink(cur)) {
            cur = cur.parentElement;
            continue;
          }
          // Prefer wrapping rich-item over inner shorts-lockup / reel-item
          if (tag.includes('SHORTS-LOCKUP') || tag === 'YTD-REEL-ITEM-RENDERER') {
            const parent = cur.parentElement;
            const ptag = parent && (parent.tagName || '').toUpperCase();
            if (ptag === 'YTD-RICH-ITEM-RENDERER' || ptag === 'YTM-RICH-ITEM-RENDERER') {
              bestShelf = parent;
              break;
            }
          }
          bestShelf = cur;
          break;
        }
        // Video/grid/compact items
        if (
          tag.includes('VIDEO-RENDERER') ||
          tag.includes('RICH-ITEM') ||
          tag.includes('REEL-ITEM') ||
          tag.includes('MOVIE-RENDERER')
        ) {
          bestItem = cur;
        }
        best = cur;
      }
      cur = cur.parentElement;
    }

    const chosen = bestShelf || bestItem || best;
    if (chosen && TOO_BROAD.has((chosen.tagName || '').toUpperCase())) return el;
    if (chosen && hasNonShortsWatchLink(chosen) && !String(chosen.tagName || '').includes('SHELF')) {
      // Mixed container (e.g. accidentally climbed too far) — fall back to item or el
      return bestItem || el;
    }
    return chosen;
  }

  function isShortsElement(el, doc) {
    if (!el || el.nodeType !== 1) return false;
    const tag = (el.tagName || '').toUpperCase();

    if (
      tag === 'YTD-REEL-SHELF-RENDERER' ||
      tag === 'YTM-REEL-SHELF-RENDERER' ||
      tag === 'YTD-REEL-ITEM-RENDERER' ||
      tag === 'YTM-SHORTS-LOCKUP-VIEW-MODEL' ||
      tag === 'YTD-SHORTS-LOCKUP-VIEW-MODEL' ||
      tag.includes('SHORTS-LOCKUP')
    ) {
      return true;
    }

    if (tag === 'A') {
      const href = el.getAttribute('href') || '';
      if (hrefLooksLikeShorts(href)) return true;
    }

    try {
      const a = el.querySelector && el.querySelector('a[href*="/shorts/"]');
      if (a) return true;
    } catch (_) {}

    const aria = (el.getAttribute && el.getAttribute('aria-label')) || '';
    const title = (el.getAttribute && el.getAttribute('title')) || '';
    if (/^shorts$/i.test(aria.trim()) || /^shorts$/i.test(title.trim())) return true;
    if (/\bshorts\b/i.test(aria) && (tag.includes('GUIDE') || tag.includes('PIVOT') || tag.includes('TAB'))) {
      return true;
    }

    if (
      (tag === 'YT-CHIP-CLOUD-CHIP-RENDERER' ||
        tag.includes('CHIP') ||
        el.getAttribute('role') === 'tab') &&
      /\bshorts\b/i.test(el.textContent || '')
    ) {
      const text = (el.textContent || '').trim();
      if (/^shorts$/i.test(text) || /\bshorts\b/i.test(aria)) return true;
    }

    if (tag === 'YTD-THUMBNAIL-OVERLAY-TIME-STATUS-RENDERER') {
      const overlay = (el.getAttribute('overlay-style') || '') + (el.textContent || '');
      if (/short/i.test(overlay)) return true;
    }

    if (el.getAttribute) {
      if (el.hasAttribute && (el.hasAttribute('is-shorts') || el.hasAttribute('is-reel-item'))) {
        return true;
      }
    }

    return false;
  }

  function findShortsNodes(root) {
    const doc = root.ownerDocument || root;
    const found = new Set();

    const selectors = [
      'a[href*="/shorts/"]',
      'ytd-reel-shelf-renderer',
      'ytm-reel-shelf-renderer',
      'ytd-reel-item-renderer',
      'ytd-shorts-lockup-view-model',
      'ytm-shorts-lockup-view-model',
      '[is-shorts]',
      '[is-reel-item]',
      'ytd-guide-entry-renderer a[title="Shorts"]',
      'ytd-mini-guide-entry-renderer a[title="Shorts"]',
      'ytd-guide-entry-renderer a[aria-label*="Shorts"]',
      'ytd-mini-guide-entry-renderer a[aria-label*="Shorts"]',
      'ytm-pivot-bar-item-renderer a[href*="/shorts"]',
      'yt-chip-cloud-chip-renderer',
      'yt-tab-shape',
      'tp-yt-paper-tab',
    ];

    for (const sel of selectors) {
      let nodes;
      try {
        nodes = root.querySelectorAll(sel);
      } catch (_) {
        continue;
      }
      for (const node of nodes) {
        if (!isShortsElement(node, doc) && sel !== 'a[href*="/shorts/"]') {
          const t = (node.textContent || '').trim();
          const al = (node.getAttribute('aria-label') || '') + (node.getAttribute('title') || '');
          if (!/^shorts$/i.test(t) && !/\bshorts\b/i.test(al)) continue;
          // Channel tabs: href containing /shorts
          try {
            const a = node.querySelector && node.querySelector('a[href]');
            const href = (a && a.getAttribute('href')) || node.getAttribute('href') || '';
            if (!hrefLooksLikeShorts(href) && !/\/shorts(?:\/|$)/i.test(href) && !/^shorts$/i.test(t)) {
              continue;
            }
          } catch (_) {}
        }
        const container = findRemovableContainer(node, doc) || node;
        if (container && container !== doc.body && container !== doc.documentElement) {
          if (TOO_BROAD.has((container.tagName || '').toUpperCase())) {
            found.add(node);
          } else {
            found.add(container);
          }
        }
      }
    }

    let titleNodes = [];
    try {
      titleNodes = root.querySelectorAll(
        '#title, #title-text, h2, span, yt-formatted-string, .title'
      );
    } catch (_) {}
    for (const n of titleNodes) {
      const text = (n.textContent || '').trim();
      if (!/^shorts$/i.test(text)) continue;
      let cur = n;
      for (let i = 0; i < 10 && cur; i++) {
        const tag = (cur.tagName || '').toUpperCase();
        if (TOO_BROAD.has(tag)) break;
        if (
          tag.includes('SHELF') ||
          tag === 'YTD-RICH-SECTION-RENDERER' ||
          tag === 'YTM-RICH-SECTION-RENDERER' ||
          tag === 'YTD-ITEM-SECTION-RENDERER'
        ) {
          if (tag === 'YTD-ITEM-SECTION-RENDERER' && hasNonShortsWatchLink(cur)) {
            cur = cur.parentElement;
            continue;
          }
          found.add(cur);
          break;
        }
        cur = cur.parentElement;
      }
    }

    const list = Array.from(found);
    return list.filter((el) => !list.some((other) => other !== el && other.contains(el)));
  }

  function hideNode(el) {
    if (!el || !el.style) return false;
    if (el.dataset && el.dataset.ysbHidden === '1') return false;
    if (el.dataset) el.dataset.ysbHidden = '1';
    el.style.setProperty('display', 'none', 'important');
    el.setAttribute('hidden', '');
    el.setAttribute('aria-hidden', 'true');
    return true;
  }

  function processRoot(root) {
    const nodes = findShortsNodes(root);
    let hidden = 0;
    for (const n of nodes) {
      if (hideNode(n)) hidden++;
    }
    return { hidden, nodes };
  }

  return {
    isShortsUrl,
    hrefLooksLikeShorts,
    findRemovableContainer,
    isShortsElement,
    findShortsNodes,
    hideNode,
    processRoot,
  };
});
