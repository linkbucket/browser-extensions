# Linkbucket Chrome Extension

Save the current page (or any URL you paste) directly into your Linkbucket account with a single click. Designed for fast research capture, bookmarking, and link organization without friction or tracking.

## Table of Contents
1. Overview
2. Features
3. How It Works
4. Installation (Development)
5. Building / Packaging (If Applicable)
6. Permissions Rationale
7. Data & Privacy
8. Security Measures
9. Managing API Keys
10. Troubleshooting
11. FAQ (Seed)
12. Roadmap (Planned Ideas)
13. Contributing (Future Possibility)
14. License
15. Third-Party Assets / Notices
16. Support & Contact
17. Changelog

---

## 1. Overview
The Linkbucket Chrome Extension streamlines adding links to your Linkbucket account. It auto-fills the current tab's URL (after you click the extension icon) and lets you manually edit or replace the URL before saving.

## 2. Features
- One-click capture of the active tab's URL.
- Manual URL entry/editing.
- Local, secure storage of your API key + secret (never sent to third parties).
- Clear success and error states.
- "Change API keys" flow to rotate or remove credentials.
- Zero analytics / tracking scripts.
- Local bundled font (Work Sans) to avoid external requests.

## 3. How It Works
1. You click the extension icon.
2. The popup loads and (if permissions allow) reads the current tab's URL.
3. You can keep or change the URL.
4. The extension sends a secure HTTPS request to `https://linkbucket.app/api/` with the necessary authentication.
5. Success or error feedback is displayed.

## 4. Installation (Development)
1. Clone the repository (private/in-house).
2. Open Chrome: `chrome://extensions`
3. Enable "Developer mode".
4. Click "Load unpacked" and select the extension directory root (where `manifest.json` resides).
5. The extension icon should appear in your toolbar (pin it if needed).

## 5. Permissions Rationale
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

## 6. Data & Privacy
- API key + secret stored **locally** via `chrome.storage.local`.
- Not synced, sold, or shared.
- Only transmitted to `linkbucket.app` (for authenticated link save calls).
- No page contents, browsing history, or analytics captured.
- Privacy Policies:
  - Extension: https://linkbucket.app/chrome-extension-privacy
  - General: https://linkbucket.app/privacy

## 7. Security Measures
- No `eval`, dynamic code injection, or remote script loading.
- Fonts are bundled (Work Sans) - no external font/CDN calls.
- HTTPS enforced for API.
- Minimal permission surface.
- No console logging of credentials.
- Simple, review-friendly code structure.

## 8. Managing API Keys
- Use the "Change API keys" button in the popup to rotate or clear the stored credentials.
- Uninstalling the extension removes all local stored data.

## 9. Troubleshooting
| Symptom | Possible Cause | Action |
|---------|----------------|--------|
| "Unauthorized" / 401 | Invalid or expired API key | Click "Change API keys" and re‑enter. |
| No URL auto-filled | `activeTab` context not granted yet | Re-open the popup after focusing the desired tab. |
| Network error | Offline or API outage | Check connection / status page. |
| Popup closes immediately | Chrome focus loss | Re-pin the extension and retry. |

## 10. FAQ
**Q:** Does the extension track what I browse?
**A:** No. It only grabs the current tab URL at the moment you click the icon.

**Q:** Are my API credentials encrypted?
**A:** Chrome stores extension data in its internal storage. For additional protection, rotate keys periodically from your Linkbucket account.

**Q:** Can I use multiple Linkbucket accounts?
**A:** Not simultaneously; you can swap credentials using "Change API keys".

## 11. License
Currently: Proprietary (All rights reserved).
Considering open-sourcing under MIT or Apache-2.0. (To proceed: add LICENSE file + adjust notices.)

## 12. Third-Party Assets / Notices
- Work Sans font (SIL Open Font License 1.1). See `fonts/NOTICE` and `fonts/OFL-1.1.txt`.

## 13. Support & Contact
- Homepage: https://linkbucket.app
- Privacy (Extension): https://linkbucket.app/chrome-extension-privacy
- Email: hello@linkbucket.app

## 14. Changelog
- 0.1.0: Initial release.

---

If you are a reviewer: thank you. See the top-of-file comment in `src/popup/popup.js` for a concise justification of each permission and design choice.
