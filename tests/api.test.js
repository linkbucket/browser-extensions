import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the storage wrapper so api.js never touches browser.storage.local.
vi.mock("../src/popup/storage.js", () => ({
  storage: { get: vi.fn() },
}));

import { storage } from "../src/popup/storage.js";
import { apiFetch, lookupUrl } from "../src/popup/api.js";

describe("apiFetch", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock;
    storage.get.mockReset();
  });

  it("sends empty-string auth headers when keys are not set", async () => {
    storage.get.mockResolvedValue({});

    await apiFetch("/ping");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["X-Access-Key-Id"]).toBe("");
    expect(options.headers["X-Secret-Key"]).toBe("");
  });

  it("merges caller-provided headers without dropping auth", async () => {
    storage.get.mockResolvedValue({
      accessKeyId: "AKID",
      secretKey: "SECRET",
    });

    await apiFetch("/ping", { headers: { "X-Custom": "yes" } });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["X-Custom"]).toBe("yes");
    expect(options.headers["X-Access-Key-Id"]).toBe("AKID");
    expect(options.headers["X-Secret-Key"]).toBe("SECRET");
  });
});

describe("lookupUrl", () => {
  let fetchMock;
  let errorSpy;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    storage.get.mockReset();
    storage.get.mockResolvedValue({});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("returns null on a 404 response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    expect(await lookupUrl("https://example.com")).toBeNull();
  });

  it("returns null and logs on other non-OK responses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    expect(await lookupUrl("https://example.com")).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns parsed JSON on a 200 response", async () => {
    const body = {
      id: "1",
      url: "https://example.com",
      tags: [{ id: "t1", title: "reading" }],
    };
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    });

    expect(await lookupUrl("https://example.com")).toEqual(body);
  });

  it("returns null and logs on a network error instead of throwing", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(lookupUrl("https://example.com")).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});
