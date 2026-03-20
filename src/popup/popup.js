import { isValidUrl, normalizeTags, splitSelectedTags } from "./utils.js";

const API_BASE = "https://linkbucket.app/api/v1";

// Storage helpers
const storage = {
  get: (keys) => browser.storage.local.get(keys),
  set: (obj) => browser.storage.local.set(obj),
  remove: (keys) => browser.storage.local.remove(keys),
};

// Build authentication headers
async function buildAuthHeaders() {
  const { accessKeyId, secretKey } = await storage.get([
    "accessKeyId",
    "secretKey",
  ]);
  return {
    "X-Access-Key-Id": accessKeyId || "",
    "X-Secret-Key": secretKey || "",
  };
}

// Generic API fetch wrapper
async function apiFetch(path, options = {}) {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options.headers,
    },
  });
  return response;
}

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

// Tom Select instance
let tagSelect = null;

// Track current URL record (if already saved for this user)
let existingUrlRecord = null;

// Initialize Tom Select for tags (remote search)
async function initTagsSelect() {
  if (!$.tagsSelect || !window.TomSelect) return;

  // Clean up previous instance
  tagSelect?.destroy();
  tagSelect = null;

  // Initialize Tom Select with remote loading
  tagSelect = new window.TomSelect($.tagsSelect, {
    plugins: {
      remove_button: {
        title: "Remove this item",
      },
    },
    persist: false,
    valueField: "id",
    labelField: "title",
    searchField: ["title"],
    placeholder: $.tagsSelect.getAttribute("placeholder") || "Add tags...",
    maxOptions: 50,
    preload: false,
    loadThrottle: 300,
    dropdownParent: "body",

    // Clear textbox and refresh options after adding an item
    onItemAdd: function () {
      this.setTextboxValue("");
      this.refreshOptions();
    },

    // Validate tag format - lowercase alphanumeric with hyphens
    // No leading/trailing hyphens, no consecutive hyphens
    createFilter: "^(?!-)(?!.*-$)(?!.*--)[0-9a-z-]+$",

    // Allow selecting options with Tab key
    selectOnTab: true,

    // Hide placeholder when items are selected
    hidePlaceholder: true,

    // Don't prioritize adding new items over existing matches
    addPrecedence: false,

    load: async (query, callback) => {
      try {
        const q = encodeURIComponent(query || "");
        const response = await apiFetch(`/user_tags?query=${q}`);
        if (!response.ok) {
          console.error(
            "Failed to load tags:",
            response.status,
            response.statusText,
          );
          callback();
          return;
        }

        const json = await response.json();
        const options = normalizeTags(json);
        callback(options);
      } catch (error) {
        console.error("Failed to load tags:", error);
        callback(); // fail silently so user can still create new tags
      }
    },
    create: (input) => ({
      id: `new:${input}`,
      title: input,
    }),
  });
}

// Extract selected tags into separate arrays
function getSelectedTags() {
  const values =
    tagSelect?.getValue() ??
    Array.from($.tagsSelect?.selectedOptions || []).map((o) => o.value);

  return splitSelectedTags(values);
}

// Look up whether the given URL is already saved for the current user
async function lookupUrl(url) {
  try {
    const q = encodeURIComponent(url);
    const response = await apiFetch(`/user_bookmarks/lookup?url=${q}`, {
      method: "GET",
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.error("Lookup failed", response.status, response.statusText);
      return null;
    }

    const json = await response.json();
    // Expected shape from backend: { id, url, tags: [{id, title}, ...] }
    return json;
  } catch (error) {
    console.error("Lookup error", error);
    return null;
  }
}

// UI state management
async function showUrlForm() {
  $.keyForm.style.display = "none";
  $.urlForm.style.display = "block";

  const tabUrl = await getActiveTabUrl();
  if (tabUrl) {
    $.urlInput.value = tabUrl;
  }

  await initTagsSelect();

  // Reset previous lookup state
  existingUrlRecord = null;

  // If we have a sensible URL, try to see if it already exists
  if (tabUrl && isValidUrl(tabUrl)) {
    const record = await lookupUrl(tabUrl);
    if (record && record.id) {
      existingUrlRecord = record;

      // Pre-select existing tags, if any
      if (Array.isArray(record.tags) && tagSelect) {
        const tagIds = record.tags.map((t) => String(t.id));

        // Make sure options exist in Tom Select before setting value
        record.tags.forEach((t) => {
          const id = String(t.id);
          if (!tagSelect.options[id]) {
            tagSelect.addOption({ id, title: t.title });
          }
        });

        tagSelect.setValue(tagIds, true);
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
    const { user_tag_ids, tag_names } = getSelectedTags();

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
  tagSelect?.destroy();
  tagSelect = null;

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
