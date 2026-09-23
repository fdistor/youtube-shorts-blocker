# Chrome Web Store listing — Block YouTube Shorts

Copy fields below into the Chrome Web Store Developer Dashboard when you publish.
**Status:** listing assets prepared in-repo; **not published** on the Chrome Web Store yet.

Official references (2025–2026 guidance):

- [Discovery on the Chrome Web Store](https://developer.chrome.com/docs/webstore/discovery)
- [Creating a great listing page](https://developer.chrome.com/docs/webstore/best-listing)
- [Complete your listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Listing / Keyword Spam policy](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements)
- [Spam policy FAQ](https://developer.chrome.com/docs/webstore/program-policies/spam-faq)
- [Manifest limits](https://developer.chrome.com/docs/extensions/reference/manifest) (`name` ≤75, `description` ≤132)

---

## Recommended store item name

**Block YouTube Shorts**

- Matches `manifest.json` `"name"` (20 / 75 characters).
- Verb-led and matches common search phrasing (*block youtube shorts*).
- Avoid title stuffing (e.g. “Hide Block Remove Disable YouTube Shorts…”); that risks Keyword Spam rejection.

See `store/promo-copy.md` for ranked A/B name alternatives.

---

## Short description (summary)

**Limit:** 132 characters (plain text). Shown in search results, category pages, and homepage tiles. Same string as `manifest.json` `"description"`.

```
Hide and block YouTube Shorts on home, search, subscriptions, and watch. One-click toggle; stops /shorts/ links.
```

Character count: **112 / 132**.

---

## Full detailed description

Paste into the Dashboard **Detailed description** field. CWS does not render Markdown; use plain paragraphs and simple bullets as shown. Do **not** paste the short description again at the top (CWS already shows it above this field).

Keep any single keyword (including “Shorts”) under ~5 natural uses to stay comfortably within Keyword Spam guidance.

```
Take back focus on YouTube. This extension hides Shorts shelves and UI across the site and stops navigation to /shorts/ links—so your home feed, search, subscriptions, and watch page stay oriented toward regular videos.

What it does
• Hides Shorts shelves and cards on Home
• Hides the Shorts item in the left guide / mini-guide
• Hides Shorts shelves and the Shorts filter chip in Search
• Hides Shorts items in Subscriptions
• Hides related Shorts on the Watch page
• Hides channel Shorts tabs and shelves
• Hides Shorts on Trending / Explore where they appear
• Hides the Shorts item on the mobile pivot bar
• Blocks direct /shorts/ URLs and Shorts-style links (redirects you away with a brief notice)
• Keeps working as YouTube’s UI updates (re-scans dynamic content)

Easy control
• Toolbar popup with a single Block Shorts toggle (on by default)
• Preference syncs via Chrome storage when available
• Reload YouTube after turning the toggle off for a fully clean restore

What we do not do
• We do not block normal (non-Shorts) videos
• We do not change your subscriptions, playlists, or account
• We do not show ads, sell data, or require an account
• We only run on YouTube domains (youtube.com, m.youtube.com, youtu.be)

Permissions in plain language
• storage — remember your on/off preference
• webNavigation — detect and stop /shorts/ navigations
• Host access — only YouTube sites listed above, so the UI can be cleaned up

Limitations
• YouTube changes its layout often; rare experimental UI variants may need a follow-up update
• After disabling the toggle, reload the page to restore every previously hidden element

Feedback and updates welcome via the support / homepage links on this listing once published.
```

---

## Category recommendation

**Primary:** **Workflow & Planning**

Rationale (official category guidance after the mid-2023 revision): this category covers extensions that help users perform tasks more efficiently and **stay focused**—a strong fit for reducing Shorts distraction while watching longer-form YouTube.

**Fallback:** **Tools** (general utilities that don’t fit a narrower category). Prefer Workflow & Planning first.

Do **not** use Misleading / non-descriptive categories; inaccurate category metadata violates listing requirements.

---

## Language / locale notes

| Field | Recommendation |
|---|---|
| Primary language | **English (`en`)** |
| Manifest i18n | Not required for v1; add `_locales/` later if translating |
| Dashboard locales | Start with English only; keep localized copy feature-consistent if you add locales |
| Distribution regions | Default “all regions” unless you intentionally restrict |
| Mature content | **No** (not applicable) |

Search is language-aware: users searching in their language see listings tagged for that language. English-first is correct for the current README and UI strings.

---

## Screenshot shot list

Provide **at least 1**, preferably **up to 5** screenshots.

| Spec | Value |
|---|---|
| Size | **1280×800** preferred (or 640×400) |
| Style | Square corners, full bleed, no padding; crisp, upright |
| Content | Real product UI—not mockups of fake ratings or “#1” claims |

### Recommended five shots

1. **Home without Shorts** — YouTube Home with Shorts shelf gone; optional thin caption: “Shorts shelf hidden on Home”.
2. **Search cleaned up** — Search results without Shorts shelf / Shorts chip; caption: “No Shorts in Search”.
3. **Watch page focus** — Watch + related column without Shorts lockups; caption: “Related Shorts hidden”.
4. **Blocked /shorts/ navigation** — After visiting a Shorts URL, home/banner state showing navigation was blocked; caption: “/shorts/ links blocked”.
5. **Popup toggle** — Extension popup with “Block Shorts” enabled; caption: “One-click on/off”.

### Also prepare (Dashboard graphic assets)

| Asset | Size | Notes |
|---|---|---|
| Store icon | 128×128 | Use `icons/icon128.png` (or refined brand mark) |
| Small promo tile | **440×280** (required) | Simple brand + “Hide & block Shorts”—avoid clutter/text walls |
| Marquee | **1400×560** (optional) | Needed only if aiming for homepage marquee feature |
| Promo video | YouTube URL (optional) | 30–60s: before/after Home + toggle |

Do not put keyword lists, competitor names, or unattributed testimonials in screenshots.

---

## SEO explanation summary

### How Chrome Web Store discoverability works (today)

1. **Search ranking** uses listing **metadata** (item name/title, summary/short description, detailed description, category, language) plus **quality signals**: user ratings, download vs uninstall trends, and broader “quality item” heuristics (clear purpose, pleasant design, easy onboarding).
2. **There is no separate keywords field.** Historical free-form keyword metadata was removed years ago; relevant terms must appear **naturally in context** in the title, summary, and description. Keyword lists, irrelevant brands, location spam, or repeating the same word **more than ~5 times** can trigger **Keyword Spam** enforcement (suspension risk).
3. **Summary (≤132 chars)** is the primary snippet in search/category tiles—front-load the benefit.
4. **Title (≤75 chars in manifest)** should be clear, concise, and unique—not stuffed.
5. **Category + language** affect browse surfaces and language-filtered search.
6. **Screenshots / promo images** affect conversion and “quality” impression; poor or missing graphics hurt prominence and can block publish (icon + screenshot + small promo are required).
7. **Ratings, install retention, policy compliance, and update freshness** influence ranking and eligibility for collections / badges (e.g. Established Publisher). You cannot pay for home-page featuring.
8. **New publishes** may take a few hours to appear in search; check Distribution regions if missing.

### What we changed in this repo (and why)

| Change | Why |
|---|---|
| Set name **Block YouTube Shorts** | Verb-led; matches high-intent “block youtube shorts” queries without stuffing; unique and memorable per Google’s title guidance |
| Rewrote manifest / store **summary** | Lead with “Hide and block”, name key surfaces users care about, mention toggle + `/shorts/` stop—within 132 chars |
| Added this **detailed description** | Benefit-first overview + feature list + explicit non-goals + plain-language permissions—keywords used in context only |
| Category **Workflow & Planning** | Aligns with focus / stay-on-task use case after 2023 category revision |
| Screenshot shot list + promo sizes | Completes the listing quality checklist before first publish |
| Explicit **not published** note | Avoids implying a live CWS presence |

When you publish, paste the short + detailed copy into the Dashboard, upload screenshots/promo tile, set category and English locale, and keep metadata accurate as the product evolves.

---

## Privacy policy

Honest policy matching the shipped code: [`PRIVACY.md`](PRIVACY.md) (ON/OFF toggle in Chrome storage only; YouTube host permissions; no analytics, accounts, or data selling). Host a public HTTPS URL of that document before Dashboard submit.

## Pack zip for upload

```bash
npm run pack
# or: ./scripts/pack-extension.sh
```

Produces `dist/block-youtube-shorts-v<version>.zip` with extension files only (no `test/`, `.git`, or store drafts). See [`STORE_CHECKLIST.md`](STORE_CHECKLIST.md) for remaining human steps before publish.
