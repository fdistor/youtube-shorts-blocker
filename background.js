/**
 * Service worker: keep toggle state, redirect /shorts/ navigations when enabled.
 */
const DEFAULTS = { enabled: true };

async function getEnabled() {
  try {
    const data = await chrome.storage.sync.get(DEFAULTS);
    return data.enabled !== false;
  } catch (_) {
    const data = await chrome.storage.local.get(DEFAULTS);
    return data.enabled !== false;
  }
}

function isShortsNavUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (!/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) return false;
    return /(?:^|\/)shorts(?:\/|$)/i.test(u.pathname);
  } catch (_) {
    return false;
  }
}

function blockedPageUrl(original) {
  // Stay on YouTube origin with a harmless landing so the user isn't stranded.
  try {
    const u = new URL(original);
    return `${u.origin}/?ysb_blocked=shorts`;
  } catch (_) {
    return 'https://www.youtube.com/';
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULTS, (data) => {
    if (typeof data.enabled === 'undefined') {
      chrome.storage.sync.set(DEFAULTS);
    }
  });
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!isShortsNavUrl(details.url)) return;
  if (!(await getEnabled())) return;
  chrome.tabs.update(details.tabId, { url: blockedPageUrl(details.url) }).catch(() => {});
});

chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!isShortsNavUrl(details.url)) return;
  if (!(await getEnabled())) return;
  chrome.tabs.update(details.tabId, { url: blockedPageUrl(details.url) }).catch(() => {});
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' && area !== 'local') return;
  if (!changes.enabled) return;
  // Content scripts listen too; nothing else needed here.
});
