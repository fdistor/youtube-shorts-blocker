# Chrome Web Store — remaining human steps

In-repo listing assets and a packable zip are ready. **Do not publish until the items below are done.** This checklist is for Francis (developer account holder).

## Blockers before first submit

| # | Step | Status / notes |
|---|---|---|
| 1 | **Chrome Web Store developer account** | Requires Google’s one-time **$5** registration fee. Not available from automation. |
| 2 | **Screenshots** (shot list in [`LISTING.md`](LISTING.md)) | Capture live YouTube UI with the extension loaded. Prefer **1280×800** (or 640×400). At least 1 required; up to 5 recommended. **Do not invent fake screenshots.** |
| 3 | **Small promo tile 440×280** | Required graphic. Simple brand + “Hide & block Shorts”. Create in any image editor; not generated in this repo. |
| 4 | **Privacy policy URL** | Host [`PRIVACY.md`](PRIVACY.md) somewhere public (GitHub Pages, raw GitHub URL that CWS accepts, or site page) and paste that HTTPS URL into the Dashboard privacy field. |
| 5 | **Dashboard category** | Set primary category to **Workflow & Planning** (fallback: Tools). |
| 6 | **Upload zip** | Build with `npm run pack` (or `./scripts/pack-extension.sh`), then upload `dist/block-youtube-shorts-v*.zip` in the Developer Dashboard. |
| 7 | **Paste listing copy** | Short description + detailed description from [`LISTING.md`](LISTING.md); name **Block YouTube Shorts**; language **English (en)**. |
| 8 | **Store icon** | Use `icons/icon128.png` (or a refined 128×128 mark). |
| 9 | **Review & submit** | Complete permissions justifications if asked; submit for review. **Publishing is a human action**—do not automate publish. |

## Optional later

- Marquee **1400×560** (homepage feature eligibility)
- Promo video (YouTube URL)
- Support / homepage URLs on the listing
- Additional locales (`_locales/`)

## Pack command (reminder)

```bash
npm run pack
# or:
./scripts/pack-extension.sh
```

Output: `dist/block-youtube-shorts-v<version>.zip` (gitignored via `*.zip` / keep `dist/` local).

## Explicitly out of scope for automation

- Paying the $5 developer fee
- Live screenshot capture of YouTube
- Creating fake marketing screenshots
- Clicking **Publish** / **Submit for review** in the Dashboard
