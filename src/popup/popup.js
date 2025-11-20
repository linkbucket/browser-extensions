/**
 * Reviewer / Maintainer Note:
 * We use chrome.storage.local to persist the user's Linkbucket API key + secret so
 * they only have to enter them once. No other data (like browsing history) is stored.
 *
 * Why not sync storage? Keys are considered sensitive; keeping them local avoids
 * unintended propagation across devices. Users can remove or rotate credentials
 * via the "Change API keys" UI, which overwrites the stored values (or clears them).
 *
 * Permissions rationale (mirrors manifest + store listing):
 * - "storage": Persist user-supplied API credentials locally.
 * - "activeTab": Only accessed after the user clicks the extension icon; used to
 *   pre-fill the URL field with the current tab's URL as a convenience. We do not
 *   inspect or modify page content.
 * - "host_permissions": Restricted to https://linkbucket.app/api/* ensuring we
 *   only communicate with the official Linkbucket backend over HTTPS.
 *
 * Privacy & Security:
 * - No analytics, tracking scripts, or remote code loading.
 * - No console logging of credentials or saved links.
 * - Fonts (Work Sans) are bundled locally; no external font requests.
 * - Network calls are limited to the Linkbucket API endpoint.
 */

const API_BASE = "https://linkbucket.app/api/v1";

// Storage helpers
const storage = {
  get: (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve)),
  set: (obj) => new Promise((resolve) => chrome.storage.local.set(obj, resolve)),
  remove: (keys) => new Promise((resolve) => chrome.storage.local.remove(keys, resolve)),
};

// Build authentication headers
async function buildAuthHeaders() {
  const { accessKeyId, secretKey } = await storage.get(["accessKeyId", "secretKey"]);
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
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tabs?.[0]?.url) return tabs[0].url;
  
  const fallbackTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return fallbackTabs?.[0]?.url || "";
}

// URL validation
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
};

// Tom Select instance
let tagSelect = null;

// Normalize backend tag response - expects array of {id, title, tag_id?}
function normalizeTags(json) {
  // Handle different response structures
  const list = Array.isArray(json) 
    ? json 
    : json?.data || json?.user_tags || json?.tags || [];

  return list
    .filter((t) => t && typeof t === "object")
    .map((t) => {
      // The API should return {id: userTagId, title: tagTitle}
      const id = t.id ?? t.uuid ?? t.value ?? "";
      const title = t.title ?? t.name ?? t.label ?? "Untitled";
      
      return {
        id: String(id),
        title: String(title),
      };
    })
    .filter((t) => t.id && t.title); // Only include valid tags
}

// Initialize Tom Select for tags (remote search)
async function initTagsSelect() {
  if (!$.tagsSelect || !window.TomSelect) return;

  // Clean up previous instance
  tagSelect?.destroy();
  tagSelect = null;

  // Initialize Tom Select with remote loading
  tagSelect = new window.TomSelect($.tagsSelect, {
    plugins: ["remove_button"],
    persist: false,
    valueField: "id",
    labelField: "title",
    searchField: ["title"],
    placeholder: $.tagsSelect.getAttribute("placeholder") || "Add tags…",
    maxOptions: 2000,
    preload: false,
    load: async (query, callback) => {
      try {
        const q = encodeURIComponent(query || "");
        const response = await apiFetch(`/user_tags?query=${q}`);
        if (!response.ok) {
          console.error("Failed to load tags:", response.status, response.statusText);
          callback();
          return;
        }

        const json = await response.json();
        console.log("tags search response", { query, json }); // temporary debug
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
  const values = tagSelect?.getValue() ?? 
    Array.from($.tagsSelect?.selectedOptions || []).map((o) => o.value);
  
  const selected = Array.isArray(values) ? values : [values];
  const user_tag_ids = [];
  const tag_names = [];

  selected.forEach((value) => {
    if (!value) return;
    if (value.startsWith("new:")) {
      tag_names.push(value.slice(4));
    } else {
      user_tag_ids.push(value);
    }
  });

  return { user_tag_ids, tag_names };
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
    showResult("Please enter a valid URL (http or https).");
    return;
  }

  showResult("Saving...");

  try {
    const { user_tag_ids, tag_names } = getSelectedTags();
    
    const response = await apiFetch("/urls", {
      method: "POST",
      body: JSON.stringify({
        url: {
          url,
          user_tag_ids,
          tag_names,
        },
      }),
    });

    if (response.ok) {
      showResult("Success! Link added.");
    } else {
      const errorText = await response.text().catch(() => "");
      showResult(`Error ${response.status}: ${response.statusText}. ${errorText}`);
    }
  } catch (error) {
    showResult(`Network error: ${error?.message || String(error)}`);
  }
}

async function handleResetKeys() {
  await storage.remove(["accessKeyId", "secretKey"]);
  tagSelect?.destroy();
  tagSelect = null;
  
  $.accessKeyId.value = "";
  $.secretKey.value = "";
  
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

  // Determine initial view
  const { accessKeyId, secretKey } = await storage.get(["accessKeyId", "secretKey"]);
  if (accessKeyId && secretKey) {
    await showUrlForm();
  } else {
    showKeyForm();
  }

  // Attach event listeners
  $.keyForm.addEventListener("submit", handleKeySubmit);
  $.urlForm.addEventListener("submit", handleUrlSubmit);
  $.resetKeysBtn.addEventListener("click", handleResetKeys);
});
