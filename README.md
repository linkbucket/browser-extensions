# Linkbucket Browser Extension

Save the current page directly into your [Linkbucket](https://linkbucket.app) account with a single click. Designed for fast research capture, bookmarking, and link organization without friction or tracking.

Supports **Google Chrome** (and Chromium-based browsers) and **Mozilla Firefox**.

## Features

- One-click capture of the active tab's URL
- Tag support — search existing tags or create new ones inline
- Local, secure storage of your API credentials (never sent to third parties)
- "Change API keys" flow to rotate or remove credentials
- Zero analytics or tracking scripts
- Bundled fonts — no external CDN requests

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A Chromium-based browser and/or Firefox

### Install & Build

```sh
npm install
npm run build
```

### Load the Extension

**Chrome / Chromium:**

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/chrome/` directory

**Firefox:**

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select `dist/firefox/manifest.json`

> Temporary add-ons in Firefox do not persist across restarts.

## How It Works

1. Click the extension icon
2. The popup reads the current tab's URL
3. A secure HTTPS request is sent to `https://linkbucket.app/api/` with your credentials
4. Success or error feedback is displayed

## Project Structure

```
├── src/popup/
│   ├── popup.html          # Extension popup markup
│   ├── popup.css           # Styles
│   ├── popup.js            # Entry point — DOM, UI state, event handlers
│   ├── api.js              # API fetch wrapper and URL lookup
│   ├── storage.js          # browser.storage.local wrapper
│   ├── tags.js             # Tom Select lifecycle (init, get, set, destroy)
│   └── utils.js            # Pure helpers (URL validation, tag normalization)
├── tests/                  # Unit tests
├── assets/                 # Icons, images, bundled fonts
├── manifest.chrome.json    # Chrome manifest (MV3)
├── manifest.firefox.json   # Firefox manifest (MV3)
├── scripts/build.sh        # Build script
└── dist/                   # Build output (not committed)
```

Vendor libraries (`tom-select`, `webextension-polyfill`) are installed via npm and copied into the build output automatically.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build for both Chrome and Firefox |
| `npm run build:chrome` | Build for Chrome only |
| `npm run build:firefox` | Build for Firefox only |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format source files with Prettier |
| `npm run format:check` | Check formatting without modifying files |
| `npm test` | Run unit tests |
| `npm run lint:ext` | Build and validate Firefox extension with addons-linter |

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code style guidelines, and how to submit a pull request.

## Permissions Rationale

| Permission / Host | Why It's Needed |
|-------------------|-----------------|
| `storage` | Persist API credentials locally so the user isn't prompted every time |
| `activeTab` | Populate the URL field with the current tab's URL on click |
| `https://linkbucket.app/api/*` | Network requests strictly to the Linkbucket backend |

**Not requested (by design):** no `<all_urls>`, no background polling, no content scripts, no sync storage.

## Data & Privacy

- Credentials stored **locally** via `browser.storage.local` — never synced or shared
- Only transmitted to `linkbucket.app` for authenticated API calls
- No browsing history, page contents, or analytics captured
- Privacy policies: [Chrome](https://linkbucket.app/chrome-extension-privacy) · [Firefox](https://linkbucket.app/firefox-extension-privacy) · [General](https://linkbucket.app/privacy)

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Unauthorized" / 401 | Invalid or expired API key | Click "Change API keys" and re-enter |
| No URL auto-filled | `activeTab` not yet granted | Re-open the popup after focusing the desired tab |
| Network error | Offline or API outage | Check your connection |
| Popup closes during key setup | Browser closes popup on focus loss | Fields are saved automatically — reopen and continue |

## FAQ

**Does the extension track what I browse?**
No. It only reads the current tab URL when you click the icon.

**Are my API credentials encrypted?**
They're stored in the browser's internal extension storage. Rotate keys periodically from your Linkbucket account for additional security.

**Can I use multiple Linkbucket accounts?**
Not simultaneously. Use "Change API keys" to switch.

## Changelog

- **0.4.1** — Update tag search endpoint from `/user_tags` to `/tags`
- **0.4.0** — Restyle Tom Select tags to match web app; switch to dropup dropdown; fix autofocus and cursor sizing
- **0.3.0** — Add Firefox support; cross-browser build system; auto-persist key fields during setup
- **0.2.5** — Enforce HTTPS-only URLs and disable URL field editing
- **0.2.4** — Improve tag input styling and typing performance
- **0.2.3** — Align tag input behavior with main Linkbucket app
- **0.2.2** — Support adding existing bookmarks
- **0.2.1** — Switch tag loading to remote search-based fetching
- **0.2.0** — Add tag support
- **0.1.0** — Initial release

## License

MIT — see [LICENSE](LICENSE).

## Third-Party Notices

- **Work Sans** font — SIL Open Font License 1.1. See `assets/fonts/NOTICE` and `assets/fonts/OFL-1.1.txt`.
- **[webextension-polyfill](https://github.com/mozilla/webextension-polyfill)** — MPL-2.0. Provides the cross-browser `browser.*` API on Chrome.
- **[Tom Select](https://tom-select.js.org/)** — Apache-2.0. Tag input widget.
