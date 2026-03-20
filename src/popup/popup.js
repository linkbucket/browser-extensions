import { isValidUrl } from "./utils.js";
import { storage } from "./storage.js";
import { apiFetch, lookupUrl } from "./api.js";
import {
  initTagsSelect,
  getSelectedTags,
  setTagValues,
  destroyTagSelect,
} from "./tags.js";

// Get active tab URL
async function getActiveTabUrl() {
  const tabs = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (tabs?.[0]?.url) return tabs[0].url;

  const fallbackTabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  return fallbackTabs?.[0]?.url || "";
}

// DOM element cache
const $ = {
  keyForm: null,
  urlForm: null,
  urlInput: null,
  resultDiv: null,
  resetKeysBtn: null,
  tagsSelect: null,
  accessKeyId: null,
  secretKey: null,
  submitButton: null,
};

// Track current URL record (if already saved for this user)
let existingUrlRecord = null;

// UI state management
async function showUrlForm() {
  $.keyForm.style.display = "none";
  $.urlForm.style.display = "block";

  const tabUrl = await getActiveTabUrl();
  if (tabUrl) {
    $.urlInput.value = tabUrl;
  }

  await initTagsSelect($.tagsSelect, apiFetch);

  // Reset previous lookup state
  existingUrlRecord = null;

  // If we have a sensible URL, try to see if it already exists
  if (tabUrl && isValidUrl(tabUrl)) {
    const record = await lookupUrl(tabUrl);
    if (record && record.id) {
      existingUrlRecord = record;

      // Pre-select existing tags, if any
      if (Array.isArray(record.tags)) {
        setTagValues(record.tags);
      }

      showResult("");
    } else {
      showResult(""); // clear any old message
    }
  } else {
    showResult(""); // clear if URL is invalid or missing
  }
}

function showKeyForm(message = "") {
  $.keyForm.style.display = "block";
  $.urlForm.style.display = "none";
  $.resultDiv.textContent = message;
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

  const url = $.urlInput.value.trim();
  if (!isValidUrl(url)) {
    showResult("This page cannot be saved (HTTPS required).");
    return;
  }

  showResult("Saving...");

  try {
    const { user_tag_ids, tag_names } = getSelectedTags($.tagsSelect);

    let response;

    if (existingUrlRecord && existingUrlRecord.id) {
      // Update existing link
      response = await apiFetch(`/user_bookmarks/${existingUrlRecord.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          url: {
            user_tag_ids,
            tag_names,
          },
        }),
      });
    } else {
      // Create new link
      response = await apiFetch("/urls", {
        method: "POST",
        body: JSON.stringify({
          url: {
            url,
            user_tag_ids,
            tag_names,
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
  destroyTagSelect();

  $.accessKeyId.value = "";
  $.secretKey.value = "";
  $.urlInput.value = "";

  showKeyForm("Keys cleared. Please enter new API keys.");
}

// Initialize app
document.addEventListener("DOMContentLoaded", async () => {
  // Cache DOM elements
  $.keyForm = document.getElementById("key-form");
  $.urlForm = document.getElementById("url-form");
  $.urlInput = document.getElementById("url");
  $.resultDiv = document.getElementById("result");
  $.resetKeysBtn = document.getElementById("resetKeys");
  $.tagsSelect = document.getElementById("tags");
  $.accessKeyId = document.getElementById("accessKeyId");
  $.secretKey = document.getElementById("secretKey");
  $.submitButton = $.urlForm.querySelector('button[type="submit"]');

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
