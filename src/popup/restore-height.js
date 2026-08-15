// Pre-paint window sizing: both forms start hidden, so the popup would
// open as a header-only strip and snap to full height when the form is
// revealed (#84). Restore the last rendered height before first paint —
// a classic script, because module scripts are deferred past it.
// popup.js releases the min-height and stores a fresh value on reveal.
try {
  const height = parseInt(localStorage.getItem("popupHeight"), 10);
  if (height > 0) {
    document.documentElement.style.minHeight = `${height}px`;
  }
} catch {
  // No storage access: the popup just opens small, as before.
}
