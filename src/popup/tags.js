import { normalizeTags, splitSelectedTags } from "./utils.js";

// Module-level Tom Select instance
let tagSelect = null;

export async function initTagsSelect(selectElement, apiFetchFn) {
  if (!selectElement || !window.TomSelect) return;

  // Clean up previous instance
  tagSelect?.destroy();
  tagSelect = null;

  tagSelect = new window.TomSelect(selectElement, {
    plugins: {
      remove_button: {
        title: "Remove this item",
      },
    },
    persist: false,
    valueField: "id",
    labelField: "title",
    searchField: ["title"],
    placeholder: selectElement.getAttribute("placeholder") || "Add tags...",
    maxOptions: 50,
    preload: false,
    loadThrottle: 300,

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
        const response = await apiFetchFn(`/tags?query=${q}`);
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

export function getSelectedTags(selectElement) {
  const values =
    tagSelect?.getValue() ??
    Array.from(selectElement?.selectedOptions || []).map((o) => o.value);

  return splitSelectedTags(values);
}

export function setTagValues(tags) {
  if (!tagSelect) return;

  const tagIds = tags.map((t) => String(t.id));

  // Make sure options exist in Tom Select before setting value
  tags.forEach((t) => {
    const id = String(t.id);
    if (!tagSelect.options[id]) {
      tagSelect.addOption({ id, title: t.title });
    }
  });

  tagSelect.setValue(tagIds, true);
}

export function blurTagSelect() {
  tagSelect?.blur();
}

export function destroyTagSelect() {
  tagSelect?.destroy();
  tagSelect = null;
}
