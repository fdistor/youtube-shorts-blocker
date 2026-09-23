# Privacy Policy — YouTube Shorts Blocker

**Last updated:** 2026-09-23

This privacy policy describes how the **YouTube Shorts Blocker** Chrome extension (“the Extension”) handles information.

## Summary

The Extension does **not** collect personal information, does **not** use analytics, does **not** require an account, and does **not** sell or share data with third parties. It only remembers your on/off preference and runs on YouTube pages to hide Shorts UI and stop `/shorts/` navigation.

## What we store

| Data | Where | Purpose |
|---|---|---|
| `enabled` (boolean ON/OFF toggle) | Chrome `storage.sync` (falls back to `storage.local`) | Remember whether Shorts blocking is enabled |

That preference may sync across your signed-in Chrome browsers via Chrome’s own sync, which is controlled by Google/Chrome—not by us. We do not operate a server that receives this value.

We do **not** store browsing history, watch history, search queries, cookies, account credentials, or any other page content.

## Permissions (plain language)

- **storage** — save the Block Shorts toggle only.
- **webNavigation** — detect navigations to `/shorts/` URLs on YouTube so the Extension can redirect you away when blocking is on.
- **Host access** (`youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`) — inject scripts/CSS that hide Shorts UI and intercept Shorts links on those sites only.

## What we do not do

- No analytics, telemetry, crash reporting, or advertising SDKs
- No user accounts, sign-in, or remote backend operated by us
- No selling, renting, or sharing of personal data
- No reading or transmitting the content of your YouTube activity beyond the local logic needed to detect Shorts URLs/UI and apply your toggle
- No network requests to third-party domains for tracking or data collection

## Children’s privacy

The Extension is a local browser tool and does not knowingly collect personal information from anyone, including children.

## Changes

If the Extension’s data practices change, this policy will be updated in the repository (`store/PRIVACY.md`) and any privacy URL you publish for the Chrome Web Store listing should point to the current version.

## Contact

Questions about this policy: use the support / contact method listed on the Chrome Web Store item page once published, or open an issue on the project’s GitHub repository: [fdistor/youtube-shorts-blocker](https://github.com/fdistor/youtube-shorts-blocker).
