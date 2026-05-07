# Contributing to Linkbucket Browser Extension

Thanks for your interest in contributing! This guide will help you get set up and make your first contribution.

## Prerequisites

- [Node.js](https://nodejs.org/) (v22 or later)
- A Chromium-based browser (Chrome, Edge, Brave, etc.) and/or Firefox
- A [Linkbucket](https://linkbucket.app) account with API keys (for manual testing) — sign in and open **API Keys** in the main navigation to create a key pair

> **Heads-up:** The extension only talks to production (`linkbucket.app`). Manual testing during development hits real production data, so use a test account or be careful what you save.

## Getting Started

```sh
# Clone the repository
git clone https://github.com/linkbucket/browser-extensions.git
cd browser-extensions

# Install dependencies
npm install

# Build for both browsers
npm run build
```

## Loading the Extension for Development

### Chrome / Chromium

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/chrome/` directory
4. The extension icon should appear in your toolbar

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select `dist/firefox/manifest.json`

> **Note:** Temporary add-ons in Firefox do not persist across restarts. Reload from `about:debugging` after each restart.

## Development Workflow

1. Make your changes in `src/`
2. Run `npm run build` (or `npm run build:chrome` / `npm run build:firefox`)
3. Reload the extension in your browser to see changes
4. Run `npm test` to make sure existing tests pass
5. Run `npm run lint` and `npm run format:check` before committing

## Code Style

This project uses [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/) to enforce consistent code style.

```sh
npm run lint        # Check for lint errors
npm run lint:fix    # Auto-fix lint errors
npm run format      # Format all source files
npm run format:check # Check formatting without modifying files
```

Please ensure your changes pass both checks before opening a pull request.

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
├── assets/                 # Icons, images, fonts
├── manifest.chrome.json    # Chrome manifest (MV3)
├── manifest.firefox.json   # Firefox manifest (MV3)
├── scripts/build.sh        # Build script
└── dist/                   # Build output (not committed)
```

The `tom-select` vendor library is installed via npm and copied into the build output by the build script. Do not add files to a `vendor/` directory manually.

## Submitting Changes

1. Fork the repository and create a branch from `main`
2. Make your changes
3. Ensure `npm test`, `npm run lint`, and `npm run format:check` all pass
4. Open a pull request with a clear description of what you changed and why

## Reporting Bugs

Please [open an issue](https://github.com/linkbucket/browser-extensions/issues/new?template=bug_report.md) with:

- Browser name and version
- Steps to reproduce
- Expected vs. actual behavior

## Requesting Features

[Open a feature request](https://github.com/linkbucket/browser-extensions/issues/new?template=feature_request.md) describing the use case and what you'd like to see.

## Releases

Releases are cut by maintainers — see [RELEASING.md](RELEASING.md) for the full process.
