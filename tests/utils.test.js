import { describe, it, expect } from "vitest";
import {
  isValidUrl,
  normalizeTags,
  splitSelectedTags,
  normalizeFolders,
  folderLabel,
  folderMeta,
  buildPlacementsPayload,
} from "../src/popup/utils.js";

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

describe("normalizeFolders", () => {
  it("normalizes a folder response", () => {
    const input = [
      {
        id: "f-1",
        title: "Recipes",
        shared: false,
        owner_name: "User One",
        member_count: 1,
      },
      {
        id: "f-2",
        title: "Research",
        shared: true,
        owner_name: "User Two",
        member_count: 3,
      },
    ];

    expect(normalizeFolders(input)).toEqual([
      {
        id: "f-1",
        title: "Recipes",
        shared: false,
        owner_name: "User One",
        member_count: 1,
      },
      {
        id: "f-2",
        title: "Research",
        shared: true,
        owner_name: "User Two",
        member_count: 3,
      },
    ]);
  });

  it("drops entries without an id and defaults missing fields", () => {
    const input = [{ title: "No id" }, { id: "f-3" }, null, "junk"];

    expect(normalizeFolders(input)).toEqual([
      {
        id: "f-3",
        title: "Untitled",
        shared: false,
        owner_name: "",
        member_count: 1,
      },
    ]);
  });

  it("returns an empty array for non-array input", () => {
    expect(normalizeFolders(null)).toEqual([]);
    expect(normalizeFolders({ error: "nope" })).toEqual([]);
  });
});

describe("folderLabel", () => {
  it("uses the bare title for the user's own folder", () => {
    expect(folderLabel({ title: "Recipes", shared: false })).toBe("Recipes");
  });

  it("appends the owner for shared folders", () => {
    expect(
      folderLabel({ title: "Research", shared: true, owner_name: "User Two" }),
    ).toBe("Research (User Two's)");
  });
});

describe("folderMeta", () => {
  it("describes a private folder", () => {
    expect(folderMeta({ member_count: 1 })).toBe("private");
  });

  it("describes a shared folder with its member count", () => {
    expect(folderMeta({ member_count: 3 })).toBe("shared · 3 people");
  });
});

describe("buildPlacementsPayload", () => {
  it("splits each card's values into ids and new names", () => {
    const payload = buildPlacementsPayload([
      { folderId: "f-1", values: ["ft-1", "new:reading"] },
      { folderId: "f-2", values: [] },
    ]);

    expect(payload).toEqual([
      { folder_id: "f-1", folder_tag_ids: ["ft-1"], tag_names: ["reading"] },
      { folder_id: "f-2", folder_tag_ids: [], tag_names: [] },
    ]);
  });

  it("returns an empty array for no cards", () => {
    expect(buildPlacementsPayload([])).toEqual([]);
  });
});
