# Linkbucket Browser Extension

Save the current page directly into your Linkbucket account with a single click. Designed for fast research capture, bookmarking, and link organization without friction or tracking.

Supports **Google Chrome** (and Chromium-based browsers) and **Mozilla Firefox**.

## Table of Contents
1. Overview
2. Features
3. How It Works
4. Installation (Development)
5. Building / Packaging
6. Permissions Rationale
7. Data & Privacy
8. Security Measures
9. Managing API Keys
10. Troubleshooting
11. FAQ
12. License
13. Third-Party Assets / Notices
14. Support & Contact
15. Changelog

---

## 1. Overview
The Linkbucket Browser Extension streamlines adding links to your Linkbucket account. It captures the current tab's URL when you click the extension icon and saves it to your account.

## 2. Features
- One-click capture of the active tab's URL.
- Local, secure storage of your API key + secret (never sent to third parties).
- Clear success and error states.
- "Change API keys" flow to rotate or remove credentials.
- Zero analytics / tracking scripts.
- Local bundled font (Work Sans) to avoid external requests.

## 3. How It Works
1. You click the extension icon.
2. The popup loads and reads the current tab's URL.
3. The extension sends a secure HTTPS request to `https://linkbucket.app/api/` with the necessary authentication.
4. Success or error feedback is displayed.

## 4. Installation (Development)

First, build the extension for your target browser:

```sh
./scripts/build.sh           # build both Chrome and Firefox
./scripts/build.sh chrome    # build Chrome only
./scripts/build.sh firefox   # build Firefox only
```

### Chrome / Chromium
1. Open `chrome://extensions`
2. Enable "Developer mode".
3. Click "Load unpacked" and select the `dist/chrome/` directory.
4. The extension icon should appear in your toolbar (pin it if needed).

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `dist/firefox/manifest.json`.
4. The extension icon should appear in your toolbar.

> **Note:** Temporary add-ons in Firefox do not persist across restarts. Reload from `about:debugging` after each restart during development.

## 5. Building / Packaging
Run `./scripts/build.sh` to produce distributable zip files in `dist/`:
- `dist/linkbucket-chrome.zip` — ready for the Chrome Web Store
- `dist/linkbucket-firefox.zip` — ready for Firefox Add-ons (AMO)

The build script copies all shared source files and selects the correct browser-specific manifest (`manifest.chrome.json` or `manifest.firefox.json`).

## 6. Permissions Rationale
| Permission / Host | Why It’s Needed | Scope Limitation |
|-------------------|-----------------|------------------|
| `storage` | Persist user API key + secret locally so the user is not prompted every use. | Only the two credential values (and minimal UI state if added later). |
| `activeTab` | Convenience: populate the URL field with the user's current tab upon click. | Only activated by explicit user action (clicking the icon). No background scraping. |
| `https://linkbucket.app/api/*` | Allow network requests strictly to the Linkbucket backend. | No wildcard to unrelated domains. |

### Not Requested (By Design)
- No `<all_urls>` host permission.
- No background page polling.
- No content scripts altering page content.
- No sync storage (avoids spreading credentials to other profiles/devices unintentionally).

## 7. Data & Privacy
- API key + secret stored **locally** via the browser's extension storage API (`browser.storage.local`).
- Not synced, sold, or shared.
- Only transmitted to `linkbucket.app` (for authenticated link save calls).
- No page contents, browsing history, or analytics captured.
- Privacy Policies:
  - Chrome Extension: https://linkbucket.app/chrome-extension-privacy
  - Firefox Extension: https://linkbucket.app/firefox-extension-privacy
  - General: https://linkbucket.app/privacy

## 8. Security Measures
- No `eval`, dynamic code injection, or remote script loading.
- Fonts are bundled (Work Sans) - no external font/CDN calls.
- HTTPS enforced for API.
- Minimal permission surface.
- No console logging of credentials.
- Simple, review-friendly code structure.

## 9. Managing API Keys
- Use the "Change API keys" button in the popup to rotate or clear the stored credentials.
- Uninstalling the extension removes all local stored data.

## 10. Troubleshooting
| Symptom | Possible Cause | Action |
|---------|----------------|--------|
| "Unauthorized" / 401 | Invalid or expired API key | Click "Change API keys" and re‑enter. |
| No URL auto-filled | `activeTab` context not granted yet | Re-open the popup after focusing the desired tab. |
| Network error | Offline or API outage | Check connection / status page. |
| Popup closes during key setup | Browser closes popup on focus loss | Fields are saved automatically — reopen the popup and continue. |

## 11. FAQ
**Q:** Does the extension track what I browse?
**A:** No. It only grabs the current tab URL at the moment you click the icon.

**Q:** Are my API credentials encrypted?
**A:** The browser stores extension data in its internal storage. For additional protection, rotate keys periodically from your Linkbucket account.

**Q:** Can I use multiple Linkbucket accounts?
**A:** Not simultaneously; you can swap credentials using "Change API keys".

## 12. License
Currently: Proprietary (All rights reserved).
Considering open-sourcing under MIT or Apache-2.0. (To proceed: add LICENSE file + adjust notices.)

## 13. Third-Party Assets / Notices
- Work Sans font (SIL Open Font License 1.1). See `assets/fonts/NOTICE` and `assets/fonts/OFL-1.1.txt`.
- [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) (MPL-2.0). Provides the cross-browser `browser.*` API on Chrome.

## 14. Support & Contact
- Homepage: https://linkbucket.app
- Privacy (Chrome Extension): https://linkbucket.app/chrome-extension-privacy
- Privacy (Firefox Extension): https://linkbucket.app/firefox-extension-privacy
- Email: hello@linkbucket.app

## 15. Changelog
- 0.1.0: Initial release.
- 0.2.0: Added tag support.
- 0.2.1: Switch tag loading to remote search-based fetching for improved performance.
- 0.2.2: Support adding existing bookmarks.
- 0.2.3: Align tag input behavior with main Linkbucket app.
- 0.2.4: Improve tag input styling and typing performance.
- 0.2.5: Enforce HTTPS-only URLs and disable URL field editing for better security.
- 0.3.0: Add Firefox support. Cross-browser build system. Auto-persist key fields during setup.

---

If you are a reviewer: thank you. See the top-of-file comment in `src/popup/popup.js` for a concise justification of each permission and design choice.
