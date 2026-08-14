import { normalizeTags, splitSelectedTags } from "./utils.js";

// Creates a Tom Select tag control on selectElement. `load` is called with
// the typed query and must resolve to a tag options array ({id, title}).
// Returns a handle, or null when Tom Select is unavailable.
export function createTagSelect(selectElement, load) {
  if (!selectElement || !window.TomSelect) return null;

  const instance = new window.TomSelect(selectElement, {
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
    maxOptions: 50, // perf cap - Tom Select renders all options as DOM nodes
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

    // Fill the room between the field and the popup's bottom edge,
    // quantized to whole rows so the list never ends mid-option. The
    // three-row floor is what the tightest layout (My Links only, no
    // folder cards) has room for.
    onDropdownOpen(dropdown) {
      const room =
        window.innerHeight - this.control.getBoundingClientRect().bottom - 12;
      const rows = Math.max(3, Math.floor(room / 38));
      const content = dropdown.querySelector(".ts-dropdown-content");
      if (content) content.style.maxHeight = `${rows * 38}px`;
    },

    load: async (query, callback) => {
      try {
        callback(await load(query || ""));
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

  return {
    getValues() {
      return instance.getValue();
    },
    setValues(tags) {
      const tagIds = tags.map((t) => String(t.id));

      // Make sure options exist in Tom Select before setting value
      tags.forEach((t) => {
        const id = String(t.id);
        if (!instance.options[id]) {
          instance.addOption({ id, title: t.title });
        }
      });

      instance.setValue(tagIds, true);
    },
    blur() {
      instance.blur();
    },
    destroy() {
      instance.destroy();
    },
  };
}

// Loader for a tag endpoint returning [{id, title}]: /tags for the user's
// own tags, /folders/:id/tags for a folder's.
export function tagLoader(apiFetchFn, path) {
  return async (query) => {
    const q = encodeURIComponent(query);
    const response = await apiFetchFn(`${path}?query=${q}`);
    if (!response.ok) {
      console.error(
        "Failed to load tags:",
        response.status,
        response.statusText,
      );
      return undefined;
    }
    return normalizeTags(await response.json());
  };
}

// The My Links tag control (module-level singleton, one per popup)
let tagSelect = null;

export async function initTagsSelect(selectElement, apiFetchFn) {
  tagSelect?.destroy();
  tagSelect = createTagSelect(selectElement, tagLoader(apiFetchFn, "/tags"));
}

export function getSelectedTags(selectElement) {
  const values =
    tagSelect?.getValues() ??
    Array.from(selectElement?.selectedOptions || []).map((o) => o.value);

  return splitSelectedTags(values);
}

export function setTagValues(tags) {
  tagSelect?.setValues(tags);
}

export function blurTagSelect() {
  tagSelect?.blur();
}

export function destroyTagSelect() {
  tagSelect?.destroy();
  tagSelect = null;
}
