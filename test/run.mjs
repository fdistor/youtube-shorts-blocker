/**
 * Zero-dependency self-test harness for YouTube Shorts Blocker.
 * Builds a minimal DOM from fixture HTML, runs shared/shorts-detect.js,
 * asserts Shorts nodes are hidden and non-Shorts remain.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FIXTURES = path.join(__dirname, 'fixtures');

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (cond) {
    passed++;
    return;
  }
  failed++;
  failures.push(msg);
  console.error('  FAIL:', msg);
}

function assertEq(a, b, msg) {
  assert(a === b, `${msg} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`);
}

/* ---------- Minimal DOM for fixtures ---------- */

class MiniNode {
  constructor(doc) {
    this.ownerDocument = doc;
    this.parentElement = null;
    this.childNodes = [];
    this.nodeType = 1;
  }
  get children() {
    return this.childNodes.filter((c) => c.nodeType === 1);
  }
  appendChild(el) {
    el.parentElement = this;
    el.ownerDocument = this.ownerDocument;
    this.childNodes.push(el);
    return el;
  }
  contains(other) {
    let cur = other;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentElement;
    }
    return false;
  }
}

class MiniEl extends MiniNode {
  constructor(doc, tagName) {
    super(doc);
    this.tagName = String(tagName).toUpperCase();
    this.attributes = Object.create(null);
    this._text = '';
    this.style = {
      _props: Object.create(null),
      setProperty(k, v) {
        this._props[k] = v;
      },
      removeProperty(k) {
        delete this._props[k];
      },
      get display() {
        return this._props.display || '';
      },
    };
    this.dataset = {};
  }
  getAttribute(n) {
    const v = this.attributes[n.toLowerCase()];
    return v === undefined ? null : v;
  }
  setAttribute(n, v) {
    this.attributes[n.toLowerCase()] = String(v);
  }
  removeAttribute(n) {
    delete this.attributes[n.toLowerCase()];
  }
  hasAttribute(n) {
    return n.toLowerCase() in this.attributes;
  }
  get textContent() {
    if (this.childNodes.length === 0) return this._text;
    return this.childNodes.map((c) => c.textContent || '').join('');
  }
  set textContent(v) {
    this.childNodes = [];
    this._text = String(v);
  }
  get id() {
    return this.getAttribute('id') || '';
  }
  matches(selector) {
    return matchesSelector(this, selector);
  }
  closest(selector) {
    let cur = this;
    while (cur) {
      if (cur.matches && cur.matches(selector)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all[0] || null;
  }
  querySelectorAll(sel) {
    const out = [];
    walk(this, (el) => {
      if (el !== this && matchesSelector(el, sel)) out.push(el);
    });
    // include self? querySelectorAll typically does not include root unless it matches —
    // for documentElement we search descendants only from processRoot on documentElement
    // but findShortsNodes calls root.querySelectorAll — descendants only.
    return out;
  }
}

class MiniDoc {
  constructor() {
    this.nodeType = 9;
    this.documentElement = null;
    this.body = null;
  }
  createElement(tag) {
    return new MiniEl(this, tag);
  }
  querySelector(sel) {
    return this.documentElement ? this.documentElement.querySelector(sel) : null;
  }
  querySelectorAll(sel) {
    return this.documentElement ? this.documentElement.querySelectorAll(sel) : [];
  }
}

function walk(el, fn) {
  if (el.nodeType === 1) fn(el);
  for (const c of el.childNodes || []) walk(c, fn);
}

function parseSimpleSelector(part) {
  part = part.trim();
  const m = {
    tag: null,
    id: null,
    classes: [],
    attrs: [],
  };
  // [attr], [attr="val"], [attr*="val"]
  const attrRe = /\[([^\]]+)\]/g;
  let am;
  let rest = part;
  while ((am = attrRe.exec(part))) {
    const raw = am[1];
    const mm = raw.match(/^([^\*$~|^]*)(\*=|=)?"?([^"]*)"?$/) || raw.match(/^([^=]+)$/);
    if (raw.includes('*=')) {
      const [name, val] = raw.split('*=').map((s) => s.replace(/"/g, '').trim());
      m.attrs.push({ name: name.toLowerCase(), op: '*=', value: val });
    } else if (raw.includes('=')) {
      const [name, val] = raw.split('=').map((s) => s.replace(/"/g, '').trim());
      m.attrs.push({ name: name.toLowerCase(), op: '=', value: val });
    } else {
      m.attrs.push({ name: raw.toLowerCase(), op: 'exists', value: null });
    }
    rest = rest.replace(am[0], '');
  }
  const idm = rest.match(/#([A-Za-z0-9_-]+)/);
  if (idm) {
    m.id = idm[1];
    rest = rest.replace(idm[0], '');
  }
  const classRe = /\.([A-Za-z0-9_-]+)/g;
  let cm;
  while ((cm = classRe.exec(rest))) {
    m.classes.push(cm[1]);
  }
  rest = rest.replace(classRe, '').trim();
  if (rest && rest !== '*') m.tag = rest.toUpperCase();
  return m;
}

function matchPart(el, part) {
  const p = parseSimpleSelector(part);
  if (p.tag && el.tagName !== p.tag) return false;
  if (p.id && el.id !== p.id) return false;
  for (const c of p.classes) {
    const cls = (el.getAttribute('class') || '').split(/\s+/);
    if (!cls.includes(c)) return false;
  }
  for (const a of p.attrs) {
    const val = el.getAttribute(a.name);
    if (a.op === 'exists') {
      if (!el.hasAttribute(a.name)) return false;
    } else if (a.op === '=') {
      if (val !== a.value) return false;
    } else if (a.op === '*=') {
      if (!val || !val.includes(a.value)) return false;
    }
  }
  return true;
}

/** Supports simple "a b", "a > b" (treated as descendant), comma lists handled by caller */
function matchesSelector(el, selector) {
  // For multi-part descendant: check last part against el, ancestors for previous
  const parts = selector.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return matchPart(el, parts[0]);
  // Walk: last part must match el
  if (!matchPart(el, parts[parts.length - 1])) return false;
  let cur = el.parentElement;
  for (let i = parts.length - 2; i >= 0; i--) {
    let found = false;
    while (cur) {
      if (matchPart(cur, parts[i])) {
        found = true;
        cur = cur.parentElement;
        break;
      }
      cur = cur.parentElement;
    }
    if (!found) return false;
  }
  return true;
}

function parseHTML(html) {
  const doc = new MiniDoc();
  const root = new MiniEl(doc, 'HTML');
  doc.documentElement = root;
  const body = new MiniEl(doc, 'BODY');
  root.appendChild(body);
  doc.body = body;

  // Strip doctype / html / body wrappers — place content into body
  let inner = html
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<\/?head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
    .trim();

  const tagRe = /<(\/?)([a-zA-Z0-9_-]+)([^>]*)>|([^<]+)/g;
  const stack = [body];
  let m;
  while ((m = tagRe.exec(inner))) {
    if (m[4] != null) {
      const text = m[4];
      if (text.trim()) {
        const parent = stack[stack.length - 1];
        // append as text onto a fake or into textContent of last approach:
        // Store text nodes as MiniEl #text-like
        const t = new MiniEl(doc, '#text');
        t.nodeType = 3;
        t._text = text;
        t.textContent = text;
        parent.childNodes.push(t);
        t.parentElement = parent;
      }
      continue;
    }
    const closing = m[1] === '/';
    const tag = m[2];
    const attrStr = m[3] || '';
    if (closing) {
      // pop until matching
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].tagName === tag.toUpperCase()) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const selfClosing = /\/>\s*$/.test(attrStr) || voidElements.has(tag.toLowerCase());
    const el = new MiniEl(doc, tag);
    const attrRe = /([a-zA-Z_:.-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let am;
    const cleanAttr = attrStr.replace(/\/\s*$/, '');
    while ((am = attrRe.exec(cleanAttr))) {
      const name = am[1];
      const val = am[2] ?? am[3] ?? am[4] ?? '';
      el.setAttribute(name, val);
      if (name === 'style') {
        /* ignore */
      }
    }
    stack[stack.length - 1].appendChild(el);
    if (!selfClosing) stack.push(el);
  }

  // Fix textContent getter for elements with text node children — already handled
  // Make #text contribute via textContent getter on MiniEl — child text nodes have textContent
  // Override: MiniEl textContent already maps childNodes

  // Patch text nodes
  walk(root, () => {});
  // Ensure text node textContent
  function fixText(n) {
    if (n.nodeType === 3) {
      Object.defineProperty(n, 'textContent', {
        get() {
          return this._text || '';
        },
        set(v) {
          this._text = String(v);
        },
      });
    }
    for (const c of n.childNodes || []) fixText(c);
  }
  fixText(root);

  return doc;
}

const voidElements = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/* ---------- Load ShortsDetect via CJS require ---------- */
const require = createRequire(import.meta.url);
const SD = require(path.join(ROOT, 'shared/shorts-detect.js'));

/* ---------- Helpers ---------- */
function isHidden(el) {
  return (
    el.dataset.ysbHidden === '1' ||
    el.style.display === 'none' ||
    el.getAttribute('hidden') !== null ||
    el.getAttribute('aria-hidden') === 'true'
  );
}

function byId(doc, id) {
  let found = null;
  walk(doc.documentElement, (el) => {
    if (el.id === id) found = el;
  });
  return found;
}

function runFixture(name, checks) {
  console.log(`\n▸ ${name}`);
  const html = fs.readFileSync(path.join(FIXTURES, name), 'utf8');
  const doc = parseHTML(html);
  // processRoot expects root with querySelectorAll — use documentElement
  // But findShortsNodes uses root.querySelectorAll — our HTML el only searches descendants.
  // Put body content: documentElement.querySelectorAll should find body descendants.
  // Our walk in querySelectorAll starts from children of root — good.

  // Also need documentElement.querySelectorAll to search entire tree including body.
  // MiniEl.querySelectorAll walks descendants of `this` excluding self — good.

  const result = SD.processRoot(doc.documentElement);
  console.log(`  hidden count: ${result.hidden}`);
  checks(doc, result);
}

/* ---------- URL / navigation tests ---------- */
console.log('▸ URL matching (navigation guard)');
const urlCases = [
  ['https://www.youtube.com/shorts/abc123', true],
  ['https://www.youtube.com/shorts/', true],
  ['https://www.youtube.com/shorts', true],
  ['https://m.youtube.com/shorts/xyz', true],
  ['https://youtu.be/shorts/abc', true],
  ['https://www.youtube.com/watch?v=abc', false],
  ['https://www.youtube.com/', false],
  ['https://www.youtube.com/feed/subscriptions', false],
  ['https://www.youtube.com/channel/UC/shorts', true],
  ['https://www.youtube.com/@user/shorts', true],
  ['/shorts/abc', true],
  ['/watch?v=1', false],
  ['https://www.youtube.com/results?search_query=shorts', false],
];
for (const [url, expect] of urlCases) {
  assertEq(SD.isShortsUrl(url), expect, `isShortsUrl(${url})`);
}
assertEq(SD.hrefLooksLikeShorts('/shorts/foo'), true, 'href /shorts/foo');
assertEq(SD.hrefLooksLikeShorts('/watch?v=1'), false, 'href /watch');

/* ---------- DOM fixture tests ---------- */

runFixture('home-shelf.html', (doc) => {
  const shelf = byId(doc, 'shorts-shelf-section') || doc.querySelector('ytd-reel-shelf-renderer');
  const normal = byId(doc, 'normal-video');
  const another = byId(doc, 'another-video');
  // reel shelf or section should be hidden
  const reel = doc.querySelector('ytd-reel-shelf-renderer');
  assert(reel && isHidden(reel) || (shelf && isHidden(shelf)), 'home Shorts shelf hidden');
  assert(normal && !isHidden(normal), 'home normal video remains');
  assert(another && !isHidden(another), 'home another video remains');
});

runFixture('guide-sidebar.html', (doc) => {
  const shorts = byId(doc, 'shorts-entry');
  const mini = byId(doc, 'mini-shorts');
  const home = byId(doc, 'home-entry');
  const subs = byId(doc, 'subs-entry');
  const miniHome = byId(doc, 'mini-home');
  assert(shorts && isHidden(shorts), 'guide Shorts entry hidden');
  assert(mini && isHidden(mini), 'mini-guide Shorts entry hidden');
  assert(home && !isHidden(home), 'guide Home remains');
  assert(subs && !isHidden(subs), 'guide Subscriptions remains');
  assert(miniHome && !isHidden(miniHome), 'mini-guide Home remains');
});

runFixture('search-results.html', (doc) => {
  const chipShorts = byId(doc, 'chip-shorts');
  const chipAll = byId(doc, 'chip-all');
  const chipVideos = byId(doc, 'chip-videos');
  const regular = byId(doc, 'regular-result');
  const shelf = doc.querySelector('ytd-reel-shelf-renderer');
  assert(chipShorts && isHidden(chipShorts), 'search Shorts chip hidden');
  assert(chipAll && !isHidden(chipAll), 'search All chip remains');
  assert(chipVideos && !isHidden(chipVideos), 'search Videos chip remains');
  assert(regular && !isHidden(regular), 'search regular result remains');
  assert(shelf && isHidden(shelf), 'search Shorts shelf hidden');
});

runFixture('subscriptions.html', (doc) => {
  const normal = byId(doc, 'sub-normal');
  const shorts = byId(doc, 'sub-shorts');
  const lockup = byId(doc, 'sub-shorts-lockup') || doc.querySelector('ytd-shorts-lockup-view-model');
  assert(normal && !isHidden(normal), 'subscriptions normal remains');
  assert(shorts && isHidden(shorts), 'subscriptions Shorts item hidden');
  assert(lockup && isHidden(lockup), 'subscriptions shorts lockup hidden');
});

runFixture('watch-related.html', (doc) => {
  const normal = byId(doc, 'related-normal');
  const shorts = byId(doc, 'related-shorts');
  const shelf = byId(doc, 'related-reel-shelf');
  assert(normal && !isHidden(normal), 'watch related normal remains');
  assert(shorts && isHidden(shorts), 'watch related Shorts item hidden');
  assert(shelf && isHidden(shelf), 'watch related Shorts shelf hidden');
});

runFixture('channel-page.html', (doc) => {
  const tabShorts = byId(doc, 'tab-shorts');
  const paperShorts = byId(doc, 'paper-shorts');
  const tabHome = byId(doc, 'tab-home');
  const tabVideos = byId(doc, 'tab-videos');
  const paperAbout = byId(doc, 'paper-about');
  const video = byId(doc, 'channel-video');
  const shelf = doc.querySelector('ytd-reel-shelf-renderer');
  assert(tabShorts && isHidden(tabShorts), 'channel Shorts tab hidden');
  assert(paperShorts && isHidden(paperShorts), 'channel paper Shorts tab hidden');
  assert(tabHome && !isHidden(tabHome), 'channel Home tab remains');
  assert(tabVideos && !isHidden(tabVideos), 'channel Videos tab remains');
  assert(paperAbout && !isHidden(paperAbout), 'channel About tab remains');
  assert(video && !isHidden(video), 'channel video remains');
  assert(shelf && isHidden(shelf), 'channel Shorts shelf hidden');
});

runFixture('trending-explore.html', (doc) => {
  const normal = byId(doc, 'trending-normal');
  const shelf = doc.querySelector('ytd-reel-shelf-renderer');
  const mShelf = doc.querySelector('ytm-reel-shelf-renderer');
  assert(normal && !isHidden(normal), 'trending normal remains');
  assert(shelf && isHidden(shelf), 'trending Shorts shelf hidden');
  assert(mShelf && isHidden(mShelf), 'mobile explore Shorts shelf hidden');
});

runFixture('mobile-pivot.html', (doc) => {
  const shorts = byId(doc, 'pivot-shorts');
  const home = byId(doc, 'pivot-home');
  const lib = byId(doc, 'pivot-library');
  const lockup = byId(doc, 'm-lockup');
  assert(shorts && isHidden(shorts), 'mobile pivot Shorts hidden');
  assert(home && !isHidden(home), 'mobile pivot Home remains');
  assert(lib && !isHidden(lib), 'mobile pivot Library remains');
  assert(lockup && isHidden(lockup), 'mobile shorts lockup hidden');
});

runFixture('overlay-miniplayer.html', (doc) => {
  const normal = byId(doc, 'normal-mini');
  const reel = byId(doc, 'overlay-reel');
  const overlayLink = doc.querySelector('a[href*="/shorts/"]');
  assert(normal && !isHidden(normal), 'normal miniplayer remains');
  assert(reel && isHidden(reel), 'overlay reel item hidden');
  // The overlay div may not be a known container — link or reel should be hidden
  assert(
    (overlayLink && isHidden(overlayLink)) ||
      (overlayLink && overlayLink.parentElement && isHidden(overlayLink.parentElement)) ||
      (reel && isHidden(reel)),
    'overlay Shorts content hidden'
  );
});

/* ---------- Summary ---------- */
console.log('\n────────────────────────────');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(' -', f);
  process.exit(1);
}
console.log('\nAll tests passed.');
process.exit(0);
