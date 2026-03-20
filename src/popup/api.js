import { storage } from "./storage.js";

const API_BASE = "https://linkbucket.app/api/v1";

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

export async function apiFetch(path, options = {}) {
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

export async function lookupUrl(url) {
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
