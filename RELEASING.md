# Releasing

How to publish a new version of the Linkbucket browser extension.

## Versioning

[Semver](https://semver.org), applied by feel:

- **Patch** (`0.4.1` → `0.4.2`) — bug fixes, dependency bumps, no user-visible changes
- **Minor** (`0.4.x` → `0.5.0`) — new features or UI changes (likely needs fresh screenshots)
- **Major** (`0.x` → `1.x`) — reserved for breaking changes (e.g. new auth scheme that invalidates existing keys)

## Checklist

1. **Bump version** in `package.json`, `manifest.chrome.json`, and `manifest.firefox.json`. `scripts/build.sh` enforces version sync at build time — it errors if any of the three drift.
2. **Update `CHANGELOG.md`** — add a one-line summary under `[Unreleased]`, then rename that heading to the new version (e.g. `[Unreleased]` → `[0.4.2]`) and add a fresh empty `[Unreleased]` section at the top.
3. **Smoke-test locally** in both Chrome and Firefox by loading `dist/chrome/` and `dist/firefox/manifest.json`:
   - Save a new URL
   - Save the same URL again (exercises the lookup + PATCH path)
   - Add an existing tag, create a new tag
   - Reset keys, then enter an invalid key pair to confirm the error path
4. **Run `npm run lint:ext`** — Firefox addons-linter must report 0 errors.
5. Commit, push, open PR, merge to `main`.

## Tag and publish on GitHub

From `main` after the version-bump PR is merged:

```sh
git tag v0.4.2
git push origin v0.4.2
gh release create v0.4.2 --title "v0.4.2" --notes "<paste changelog entry>"
```

Tags are the only durable link between a published extension and the source it was built from — never skip this step.

## Backend coordination

If the release depends on a change to the linkbucket.app backend, deploy the backend **first**. Never remove a backend endpoint until existing installs have had time to update — old versions in users' browsers will keep calling the previous endpoint until the auto-update lands.

## Submit to stores

Build the release zips:

```sh
npm run build
```

This produces `dist/linkbucket-chrome.zip` and `dist/linkbucket-firefox.zip`.

- **Chrome Web Store** — upload `linkbucket-chrome.zip`. Review usually completes within an hour; occasionally longer when flagged for human review.
- **Firefox AMO** — upload `linkbucket-firefox.zip`. Review is typically near-instant. Source is the public GitHub repo; no minification, so no separate source submission is required.

## Store metadata

Description, screenshots, and privacy policy URLs are currently set-and-forget. On a **minor or major** release with UI changes, refresh the screenshots in both stores. Patch releases usually don't need any metadata updates.
