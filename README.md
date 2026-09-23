# YouTube Shorts Blocker

Manifest V3 Chrome extension that hides YouTube Shorts across the YouTube UI and blocks navigation to `/shorts/` URLs. Works on `youtube.com`, `m.youtube.com`, and `youtu.be`.

## Load unpacked (Chrome)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this repository folder (the one that contains `manifest.json`)
5. Open YouTube — Shorts surfaces should disappear. Use the toolbar icon to toggle.

## What is blocked

| Surface | Behavior |
|---|---|
| Direct `/shorts/` URLs & Shorts-style links | Redirected to YouTube home with a brief banner |
| Home Shorts / rich shelves | Hidden |
| Left guide & mini-guide “Shorts” item | Hidden |
| Search Shorts shelves & “Shorts” filter chip | Hidden |
| Subscriptions feed Shorts items / lockups | Hidden |
| Watch page related / secondary Shorts | Hidden |
| Channel Shorts tabs & shelves | Hidden |
| Trending / explore Shorts shelves | Hidden |
| Mobile pivot bar Shorts item | Hidden |
| Miniplayer / overlay Shorts nodes | Hidden when detected |
| SPA dynamic injects | MutationObserver + `yt-navigate-*` re-sweeps |

Non-Shorts videos, Home, Subscriptions, and normal watch links are left alone.

## Popup toggle

Click the extension icon → **Block Shorts** checkbox (default **ON**).  
Stored in `chrome.storage.sync` (falls back to `local`). Reload YouTube after disabling for a fully clean restore.

## Self-tests

No YouTube login or network required. Fixtures under `test/fixtures/` mimic Shorts DOM; `shared/shorts-detect.js` is exercised in Node.

```bash
npm test
# or:
node test/run.mjs
```

Exits non-zero on failure.

## Files

```
manifest.json
background.js          # navigation redirect + storage defaults
content.js             # DOM sweep, click intercept, history patch, observers
content.css
shared/shorts-detect.js
popup/
icons/
test/fixtures/
test/run.mjs
package.json
README.md
```

## Limitations

- YouTube changes DOM often; selectors prefer `href*="/shorts/"`, aria labels, and stable `yt-*` elements, but new surfaces may need updates.
- Disabling the toggle does not always restore every already-hidden node until page reload.
- Some experimental or A/B UI variants may use unfamiliar wrappers; the MutationObserver re-sweep mitigates most cases.
- `youtu.be` bare video IDs are normal watch links and are **not** blocked (only `/shorts/` paths).

## License

MIT — personal use.
