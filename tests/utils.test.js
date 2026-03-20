import { describe, it, expect } from "vitest";
import { isValidUrl, normalizeTags, splitSelectedTags } from "../src/popup/utils.js";

describe("isValidUrl", () => {
  it("accepts a valid HTTPS URL", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
  });

  it("accepts HTTPS URL with path and query", () => {
    expect(isValidUrl("https://example.com/path?q=1#hash")).toBe(true);
  });

  it("rejects HTTP URLs", () => {
    expect(isValidUrl("http://example.com")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });

  it("rejects non-URL strings", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });

  it("rejects URL without protocol", () => {
    expect(isValidUrl("example.com")).toBe(false);
  });

  it("rejects ftp URLs", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
  });

  it("rejects chrome:// URLs", () => {
    expect(isValidUrl("chrome://extensions")).toBe(false);
  });
});

describe("normalizeTags", () => {
  it("handles a direct array of {id, title} objects", () => {
    const input = [
      { id: "1", title: "javascript" },
      { id: "2", title: "css" },
    ];
    expect(normalizeTags(input)).toEqual([
      { id: "1", title: "javascript" },
      { id: "2", title: "css" },
    ]);
  });

  it("unwraps {data: [...]} response", () => {
    const input = { data: [{ id: "1", title: "tag" }] };
    expect(normalizeTags(input)).toEqual([{ id: "1", title: "tag" }]);
  });

  it("unwraps {user_tags: [...]} response", () => {
    const input = { user_tags: [{ id: "1", title: "tag" }] };
    expect(normalizeTags(input)).toEqual([{ id: "1", title: "tag" }]);
  });

  it("unwraps {tags: [...]} response", () => {
    const input = { tags: [{ id: "1", title: "tag" }] };
    expect(normalizeTags(input)).toEqual([{ id: "1", title: "tag" }]);
  });

  it("maps uuid field to id", () => {
    const input = [{ uuid: "abc", title: "tag" }];
    expect(normalizeTags(input)).toEqual([{ id: "abc", title: "tag" }]);
  });

  it("maps value field to id", () => {
    const input = [{ value: "abc", title: "tag" }];
    expect(normalizeTags(input)).toEqual([{ id: "abc", title: "tag" }]);
  });

  it("maps name field to title", () => {
    const input = [{ id: "1", name: "tag" }];
    expect(normalizeTags(input)).toEqual([{ id: "1", title: "tag" }]);
  });

  it("maps label field to title", () => {
    const input = [{ id: "1", label: "tag" }];
    expect(normalizeTags(input)).toEqual([{ id: "1", title: "tag" }]);
  });

  it("coerces numeric id to string", () => {
    const input = [{ id: 42, title: "tag" }];
    expect(normalizeTags(input)).toEqual([{ id: "42", title: "tag" }]);
  });

  it("filters out entries with missing id", () => {
    const input = [{ title: "no-id" }];
    expect(normalizeTags(input)).toEqual([]);
  });

  it("filters out non-object entries", () => {
    const input = [null, "string", 42, { id: "1", title: "valid" }];
    expect(normalizeTags(input)).toEqual([{ id: "1", title: "valid" }]);
  });

  it("returns empty array for empty input", () => {
    expect(normalizeTags([])).toEqual([]);
  });

  it("returns empty array for null input", () => {
    expect(normalizeTags(null)).toEqual([]);
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeTags(undefined)).toEqual([]);
  });
});

describe("splitSelectedTags", () => {
  it("separates existing tag IDs from new tag names", () => {
    const values = ["id-1", "id-2", "new:javascript", "new:css"];
    expect(splitSelectedTags(values)).toEqual({
      user_tag_ids: ["id-1", "id-2"],
      tag_names: ["javascript", "css"],
    });
  });

  it("handles only existing tags", () => {
    expect(splitSelectedTags(["id-1", "id-2"])).toEqual({
      user_tag_ids: ["id-1", "id-2"],
      tag_names: [],
    });
  });

  it("handles only new tags", () => {
    expect(splitSelectedTags(["new:javascript"])).toEqual({
      user_tag_ids: [],
      tag_names: ["javascript"],
    });
  });

  it("wraps a single string value in an array", () => {
    expect(splitSelectedTags("id-1")).toEqual({
      user_tag_ids: ["id-1"],
      tag_names: [],
    });
  });

  it("skips empty and falsy values", () => {
    expect(splitSelectedTags(["id-1", "", null, undefined, "new:tag"])).toEqual({
      user_tag_ids: ["id-1"],
      tag_names: ["tag"],
    });
  });

  it("returns empty arrays for empty input", () => {
    expect(splitSelectedTags([])).toEqual({
      user_tag_ids: [],
      tag_names: [],
    });
  });
});
