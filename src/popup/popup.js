import { isValidUrl, savedAgo, apiErrorMessage } from "./utils.js";
import { storage } from "./storage.js";
import { apiFetch, lookupUrl } from "./api.js";
import {
  initTagsSelect,
  getSelectedTags,
  setTagValues,
  blurTagSelect,
  destroyTagSelect,
} from "./tags.js";
import {
  initPlacements,
  hydratePlacements,
  getPlacements,
  placementCount,
  destroyPlacements,
} from "./placements.js";

async function getActiveTab() {
  const tabs = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (tabs?.[0]?.url) return tabs[0];

  const fallbackTabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  return fallbackTabs?.[0] || null;
}

const $ = {
  keyForm: null,
  urlForm: null,
  pageTitle: null,
  pageUrl: null,
  savedStatus: null,
  savedStatusText: null,
  resultDiv: null,
  resetKeysBtn: null,
  tagsSelect: null,
  saveButton: null,
  myLinksCard: null,
  myLinksCheck: null,
  myLinksMeta: null,
  accessKeyId: null,
  secretKey: null,
};

let existingUrlRecord = null;

let currentUrl = "";

let initPending = false;

async function showUrlForm() {
  $.keyForm.style.display = "none";

  // The catch keeps the reveal below unconditional: an unexpected
  // rejection would otherwise leave the popup permanently blank.
  const ready = prepareUrlForm().catch((error) => {
    console.error("Popup init failed:", error);
  });

  // Reveal only once the lookup has composed the final layout, so the
  // saved header and folder cards never pop into place after first
  // paint. The cap keeps a slow network from holding the popup blank -
  // then late data pops in, the rare case instead of every open.
  await Promise.race([ready, sleep(400)]);
  $.urlForm.style.display = "block";
  await ready;
  persistPopupHeight();

  // Prevent tag input from stealing focus on popup open —
  // deferred because the browser autofocuses the first editable
  // input (the readonly URL field is skipped) after our code runs.
  setTimeout(() => blurTagSelect(), 0);
}

async function prepareUrlForm() {
  // Gates Save while the lookup is pending: the reveal cap can show the
  // form early, and a save before the lookup lands would POST instead of
  // updating (and the late lookup would rewrite the form mid-save)
  initPending = true;
  try {
    await composeUrlForm();
  } finally {
    initPending = false;
    refreshSaveButton();
  }
}

async function composeUrlForm() {
  const [tab] = await Promise.all([
    getActiveTab(),
    initTagsSelect($.tagsSelect, apiFetch),
  ]);
  currentUrl = tab?.url || "";
  showPageInfo(tab?.title || "", currentUrl);

  existingUrlRecord = null;
  destroyPlacements();
  setMyLinks(true);
  showSavedStatus(null);

  if (currentUrl && isValidUrl(currentUrl)) {
    const record = await lookupUrl(currentUrl);
    if (record && record.id) {
      existingUrlRecord = record;

      if (Array.isArray(record.tags)) {
        setTagValues(record.tags);
      }

      hydratePlacements(record.placements);
      setMyLinks(record.my_links !== false);
      showSavedStatus(record);
    }
  }

  showResult("");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showKeyForm(message = "") {
  $.keyForm.style.display = "block";
  $.urlForm.style.display = "none";
  $.resultDiv.textContent = message;
  persistPopupHeight();
}

// Counterpart to restore-height.js: drop the pre-paint min-height and
// store the natural height for the next open. Runs on every form
// reveal, so a stale height corrects itself once, with content visible.
function persistPopupHeight() {
  document.documentElement.style.minHeight = "";
  try {
    localStorage.setItem(
      "popupHeight",
      String(document.documentElement.offsetHeight),
    );
  } catch {
    // No storage access: the next open just starts small.
  }
}

function showPageInfo(title, url) {
  $.pageTitle.textContent = title || url;
  $.pageUrl.textContent = url;
  // With no title the URL takes its place; don't repeat it below
  $.pageUrl.style.display = title ? "" : "none";
}

function showSavedStatus(record) {
  const saved = Boolean(record?.id);
  $.savedStatus.style.display = saved ? "" : "none";
  $.savedStatusText.textContent = saved ? savedAgo(record.saved_at) : "";
  refreshSaveButton();
}

function setMyLinks(checked) {
  $.myLinksCheck.checked = checked;
  syncMyLinksState();
}

// Unchecked = folder-only save; the hidden tag field keeps its selections
function syncMyLinksState() {
  const on = $.myLinksCheck.checked;
  $.myLinksCard.classList.toggle("placement-card--off", !on);
  $.myLinksMeta.textContent = on ? "private" : "not saved here";
  refreshSaveButton();
}

function nothingSelected() {
  return !$.myLinksCheck.checked && placementCount() === 0;
}

// Deselecting everything on a saved link is an explicit removal (the
// button offers "Move to trash"); on a new link there is nothing to do
function removalIntent() {
  return Boolean(existingUrlRecord?.id) && nothingSelected();
}

function updateSaveGuard() {
  $.saveButton.disabled =
    saveBusy || initPending || (!existingUrlRecord?.id && nothingSelected());
}

function showResult(message) {
  $.resultDiv.textContent = message;
}

async function handleKeySubmit(e) {
  e.preventDefault();

  const accessKeyId = $.accessKeyId.value.trim();
  const secretKey = $.secretKey.value.trim();

  if (!accessKeyId || !secretKey) {
    showResult("Please enter both keys.");
    return;
  }

  await storage.set({ accessKeyId, secretKey });
  $.resultDiv.textContent = "";
  await showUrlForm();
}

async function handleUrlSubmit(e) {
  e.preventDefault();

  if (!isValidUrl(currentUrl)) {
    showResult("This page cannot be saved (HTTPS required).");
    return;
  }

  showResult("");
  const removing = removalIntent();
  setSaveBusy(true);

  try {
    const my_links = $.myLinksCheck.checked;
    // A folder-only save must not send the hidden field's tags - the API
    // would create the user tags without attaching them to anything.
    const { user_tag_ids, tag_names } = my_links
      ? getSelectedTags($.tagsSelect)
      : { user_tag_ids: [], tag_names: [] };

    // Full desired state: a removed card removes that placement
    // server-side, and my_links false trashes the personal save.
    const payload = {
      user_tag_ids,
      tag_names,
      my_links,
      placements: getPlacements(),
    };

    const response = existingUrlRecord?.id
      ? await apiFetch(`/user_bookmarks/${existingUrlRecord.id}`, {
          method: "PATCH",
          body: JSON.stringify({ user_bookmark: payload }),
        })
      : await apiFetch("/urls", {
          method: "POST",
          body: JSON.stringify({ url: { url: currentUrl, ...payload } }),
        });

    if (response.ok) {
      if (removing) {
        // The link is in trash everywhere now; the popup becomes a fresh
        // save form so a change of heart re-saves via POST (which also
        // restores a trashed My Links save).
        existingUrlRecord = null;
        setMyLinks(true);
        showSavedStatus(null);
      } else if (!existingUrlRecord?.id) {
        // Switch a first save to update mode: POST is additive, so a
        // follow-up save could never remove a card without the bookmark
        // id. Deferred saves (no bookmark yet) stay in create mode, where
        // additive is the only possible semantics anyway.
        const record = await lookupUrl(currentUrl);
        if (record?.id) {
          existingUrlRecord = record;
          showSavedStatus(record);
        }
      }
      flashSaved(removing);
    } else {
      const body = await response.text().catch(() => "");
      showResult(
        `Error ${response.status}: ${apiErrorMessage(body, response.statusText)}`,
      );
      setSaveBusy(false);
    }
  } catch (error) {
    showResult(`Network error: ${error?.message || String(error)}`);
    setSaveBusy(false);
  }
}

// Save feedback lives in the button so the popup never grows on success;
// the result area below is for errors only
let saveBusy = false;

function saveIdleLabel() {
  if (removalIntent()) return "Move to trash";
  return existingUrlRecord?.id ? "Save changes" : "Save";
}

function refreshSaveButton() {
  $.saveButton.textContent = saveBusy
    ? removalIntent()
      ? "Removing…"
      : "Saving…"
    : saveIdleLabel();
  updateSaveGuard();
}

function setSaveBusy(busy) {
  saveBusy = busy;
  refreshSaveButton();
}

function flashSaved(removed) {
  $.saveButton.textContent = removed ? "Removed ✓" : "Saved ✓";
  setTimeout(() => setSaveBusy(false), 1600);
}

async function handleResetKeys() {
  await storage.remove(["accessKeyId", "secretKey"]);
  existingUrlRecord = null;
  currentUrl = "";
  destroyTagSelect();
  destroyPlacements();
  setMyLinks(true);

  $.accessKeyId.value = "";
  $.secretKey.value = "";
  showPageInfo("", "");

  showKeyForm("Keys cleared. Please enter new API keys.");
}

document.addEventListener("DOMContentLoaded", async () => {
  $.keyForm = document.getElementById("key-form");
  $.urlForm = document.getElementById("url-form");
  $.pageTitle = document.getElementById("pageTitle");
  $.pageUrl = document.getElementById("pageUrl");
  $.savedStatus = document.getElementById("savedStatus");
  $.savedStatusText = document.getElementById("savedStatusText");
  $.resultDiv = document.getElementById("result");
  $.resetKeysBtn = document.getElementById("resetKeys");
  $.tagsSelect = document.getElementById("tags");
  $.saveButton = document.getElementById("saveButton");
  $.myLinksCard = document.getElementById("my-links-card");
  $.myLinksCheck = document.getElementById("myLinksCheck");
  $.myLinksMeta = document.getElementById("myLinksMeta");
  $.accessKeyId = document.getElementById("accessKeyId");
  $.secretKey = document.getElementById("secretKey");

  initPlacements({
    stack: document.getElementById("folder-cards"),
    template: document.getElementById("folder-card-template"),
    addButton: document.getElementById("addFolder"),
    picker: document.getElementById("folderPicker"),
    changed: refreshSaveButton,
  });

  $.myLinksCheck.addEventListener("change", syncMyLinksState);

  const { accessKeyId, secretKey } = await storage.get([
    "accessKeyId",
    "secretKey",
  ]);
  if (accessKeyId && secretKey) {
    await showUrlForm();
  } else {
    // Restore any partially-entered key so the user can continue
    // after the popup closes mid-setup (e.g., switching apps to copy
    // the second key).
    if (accessKeyId) $.accessKeyId.value = accessKeyId;
    if (secretKey) $.secretKey.value = secretKey;
    showKeyForm();
  }

  // Persist each key field on input so progress survives popup close
  $.accessKeyId.addEventListener("input", () => {
    storage.set({ accessKeyId: $.accessKeyId.value.trim() });
  });
  $.secretKey.addEventListener("input", () => {
    storage.set({ secretKey: $.secretKey.value.trim() });
  });

  $.keyForm.addEventListener("submit", handleKeySubmit);
  $.urlForm.addEventListener("submit", handleUrlSubmit);
  $.resetKeysBtn.addEventListener("click", handleResetKeys);
});
