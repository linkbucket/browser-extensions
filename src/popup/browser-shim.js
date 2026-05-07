// Alias chrome.* to browser.* on Chromium browsers. Firefox already exposes
// `browser` natively; modern Chrome (MV3) exposes Promise-returning chrome.*
// APIs, so a one-line alias replaces the webextension-polyfill.
globalThis.browser ??= globalThis.chrome;
