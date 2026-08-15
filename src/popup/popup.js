import { isValidUrl, savedAgo } from "./utils.js";
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

// Get the active tab (for its URL and title)
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

// DOM element cache
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

// Track current URL record (if already saved for this user)
let existingUrlRecord = null;

// The page being saved (the readonly URL field became a title display)
let currentUrl = "";

// UI state management
async function showUrlForm() {
  $.keyForm.style.display = "none";
  $.urlForm.style.display = "block";

  const [tab] = await Promise.all([
    getActiveTab(),
    initTagsSelect($.tagsSelect, apiFetch),
  ]);
  currentUrl = tab?.url || "";
  showPageInfo(tab?.title || "", currentUrl);

  // Reset previous lookup state
  existingUrlRecord = null;
  destroyPlacements();
  setMyLinks(true);
  showSavedStatus(null);

  // If we have a sensible URL, try to see if it already exists
  if (currentUrl && isValidUrl(currentUrl)) {
    const record = await lookupUrl(currentUrl);
    if (record && record.id) {
      existingUrlRecord = record;

      // Pre-select existing tags, if any
      if (Array.isArray(record.tags)) {
        setTagValues(record.tags);
      }

      // One card per folder this link already lives in
      hydratePlacements(record.placements);
      setMyLinks(record.my_links !== false);
      showSavedStatus(record);

      showResult("");
    } else {
      showResult(""); // clear any old message
    }
  } else {
    showResult(""); // clear if URL is invalid or missing
  }

  // Prevent tag input from stealing focus on popup open —
  // deferred because the browser autofocuses the first editable
  // input (the readonly URL field is skipped) after our code runs.
  setTimeout(() => blurTagSelect(), 0);
}

function showKeyForm(message = "") {
  $.keyForm.style.display = "block";
  $.urlForm.style.display = "none";
  $.resultDiv.textContent = message;
}

function showPageInfo(title, url) {
  $.pageTitle.textContent = title || url;
  $.pageUrl.textContent = url;
  // With no title the URL takes its place; don't repeat it below
  $.pageUrl.style.display = title ? "" : "none";
}

// The already-saved header ("Saved 3 days ago") - pass null for a new link
function showSavedStatus(record) {
  const saved = Boolean(record?.id);
  $.savedStatus.style.display = saved ? "" : "none";
  $.savedStatusText.textContent = saved ? savedAgo(record.saved_at) : "";
  $.saveButton.textContent = saved ? "Save changes" : "Save";
}

function setMyLinks(checked) {
  $.myLinksCheck.checked = checked;
  syncMyLinksState();
}

// Unchecked = folder-only save: the card greys out and hides its tag field
// (the selections stay, so re-checking restores them)
function syncMyLinksState() {
  const on = $.myLinksCheck.checked;
  $.myLinksCard.classList.toggle("placement-card--off", !on);
  $.myLinksMeta.textContent = on ? "private" : "not saved here";
  updateSaveGuard();
}

// A save must go somewhere: block Save when My Links is off and no folder
// cards exist
function updateSaveGuard() {
  $.saveButton.disabled = !$.myLinksCheck.checked && placementCount() === 0;
}

function showResult(message) {
  $.resultDiv.textContent = message;
}

// Event handlers
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

  showResult("Saving...");

  try {
    const { user_tag_ids, tag_names } = getSelectedTags($.tagsSelect);
    const placements = getPlacements();
    const my_links = $.myLinksCheck.checked;

    let response;

    if (existingUrlRecord && existingUrlRecord.id) {
      // Update existing link. The placements array is the full desired
      // state: a card the user removed means the server removes that
      // folder placement, and my_links false moves the personal save
      // to trash.
      response = await apiFetch(`/user_bookmarks/${existingUrlRecord.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          user_bookmark: {
            user_tag_ids,
            tag_names,
            my_links,
            placements,
          },
        }),
      });
    } else {
      // Create new link
      response = await apiFetch("/urls", {
        method: "POST",
        body: JSON.stringify({
          url: {
            url: currentUrl,
            user_tag_ids,
            tag_names,
            my_links,
            placements,
          },
        }),
      });
    }

    if (response.ok) {
      if (existingUrlRecord && existingUrlRecord.id) {
        showResult("Success! Link updated.");
      } else {
        showResult("Success! Link added.");
      }
    } else {
      const errorText = await response.text().catch(() => "");
      showResult(
        `Error ${response.status}: ${response.statusText}. ${errorText}`,
      );
    }
  } catch (error) {
    showResult(`Network error: ${error?.message || String(error)}`);
  }
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

// Initialize app
document.addEventListener("DOMContentLoaded", async () => {
  // Cache DOM elements
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
    changed: updateSaveGuard,
  });

  $.myLinksCheck.addEventListener("change", syncMyLinksState);

  // Determine initial view
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

  // Attach event listeners
  $.keyForm.addEventListener("submit", handleKeySubmit);
  $.urlForm.addEventListener("submit", handleUrlSubmit);
  $.resetKeysBtn.addEventListener("click", handleResetKeys);
});
