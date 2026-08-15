// Restores the last rendered height before first paint so the popup
// doesn't open header-only and snap to full size at reveal (#84).
// Classic script: a module would be deferred past first paint.
try {
  const height = parseInt(localStorage.getItem("popupHeight"), 10);
  if (height > 0) {
    document.documentElement.style.minHeight = `${height}px`;
  }
} catch {
  // No storage access: the popup just opens small, as before.
}
