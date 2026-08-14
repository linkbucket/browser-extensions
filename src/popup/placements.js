import { apiFetch, fetchFolders } from "./api.js";
import { createTagSelect, tagLoader } from "./tags.js";
import {
  normalizeFolders,
  folderLabel,
  folderMeta,
  buildPlacementsPayload,
} from "./utils.js";

// One card per folder placement, keyed by folder id
const cards = new Map();

// Tom Select instance for the folder picker (exists only while choosing)
let pickerSelect = null;

const $ = {
  stack: null,
  template: null,
  addButton: null,
  picker: null,
};

let onChange = null;

export function initPlacements({
  stack,
  template,
  addButton,
  picker,
  changed,
}) {
  $.stack = stack;
  $.template = template;
  $.addButton = addButton;
  $.picker = picker;
  onChange = changed;

  $.addButton.addEventListener("click", openFolderPicker);
}

export function addFolderCard(folder, tags = []) {
  if (cards.has(folder.id)) return;

  const fragment = $.template.content.cloneNode(true);
  const card = fragment.querySelector(".placement-card");
  card.querySelector(".placement-pill").textContent = folderLabel(folder);
  card.querySelector(".placement-card__meta").textContent = folderMeta(folder);

  const select = card.querySelector("select");
  $.stack.appendChild(fragment);

  const tagSelect = createTagSelect(
    select,
    tagLoader(apiFetch, `/folders/${folder.id}/tags`),
  );
  tagSelect?.setValues(tags);

  card
    .querySelector(".placement-card__remove")
    .addEventListener("click", () => removeFolderCard(folder.id));

  cards.set(folder.id, { folder, card, tagSelect });
  refreshAddButtonLabel();
  onChange?.();
}

function removeFolderCard(folderId) {
  const entry = cards.get(folderId);
  if (!entry) return;

  entry.tagSelect?.destroy();
  entry.card.remove();
  cards.delete(folderId);
  closeFolderPicker(); // the removed folder is addable again
  onChange?.();
}

export function hydratePlacements(placements) {
  destroyPlacements();
  (placements || []).forEach((placement) => {
    const [folder] = normalizeFolders([placement.folder]);
    if (folder) addFolderCard(folder, placement.tags || []);
  });
}

export function getPlacements() {
  return buildPlacementsPayload(
    Array.from(cards.values(), ({ folder, tagSelect }) => ({
      folderId: folder.id,
      values: tagSelect?.getValues() ?? [],
    })),
  );
}

export function placementCount() {
  return cards.size;
}

export function destroyPlacements() {
  cards.forEach(({ card, tagSelect }) => {
    tagSelect?.destroy();
    card.remove();
  });
  cards.clear();
  closeFolderPicker();
  onChange?.();
}

async function openFolderPicker() {
  if (!window.TomSelect) return;

  $.addButton.disabled = true;

  const folders = normalizeFolders(await fetchFolders()).filter(
    (folder) => !cards.has(folder.id),
  );

  if (folders.length === 0) {
    // Nothing to offer (no folders, all placed, or the fetch failed) —
    // say so instead of a button that silently does nothing.
    $.addButton.textContent = "No folders to add";
    return;
  }

  const byId = new Map(folders.map((folder) => [folder.id, folder]));

  $.addButton.style.display = "none";
  $.picker.style.display = "";

  // The same Tom Select as the tag fields, in single mode, so every
  // dropdown in the popup shares one look — and the list is searchable.
  pickerSelect = new window.TomSelect($.picker, {
    options: folders.map((folder) => ({
      id: folder.id,
      title: folderLabel(folder),
    })),
    valueField: "id",
    labelField: "title",
    searchField: ["title"],
    placeholder: "Choose a folder…",
    maxItems: 1,
    create: false,
    openOnFocus: true,
    selectOnTab: true,
    // The picker sits at the popup's bottom with no room below, unlike
    // the tag fields — so instead of fitting the list into that room,
    // extend the body while choosing: the popup window resizes to
    // content, and closeFolderPicker snaps it back.
    onDropdownOpen(dropdown) {
      const listHeight = Math.min(byId.size, 5) * 38;
      const content = dropdown.querySelector(".ts-dropdown-content");
      if (content) content.style.maxHeight = `${listHeight}px`;
      document.body.style.minHeight = `${
        this.control.getBoundingClientRect().bottom + listHeight + 16
      }px`;
    },
    onItemAdd(value) {
      const folder = byId.get(value);
      if (folder) addFolderCard(folder);
      // Deferred: destroying the instance from inside its own event
      // handler would pull internals out from under Tom Select.
      setTimeout(closeFolderPicker, 0);
    },
  });
  pickerSelect.on("blur", closeFolderPicker);
  pickerSelect.focus();
}

function closeFolderPicker() {
  if (!$.picker) return;

  // Null first: destroy() fires a blur that would re-enter this handler
  const instance = pickerSelect;
  pickerSelect = null;
  instance?.destroy();

  document.body.style.minHeight = "";
  $.picker.style.display = "none";
  $.addButton.style.display = "";
  refreshAddButtonLabel();
  $.addButton.disabled = false;
}

function refreshAddButtonLabel() {
  if (!$.addButton) return;

  $.addButton.textContent =
    cards.size > 0 ? "+ Add to another folder" : "+ Add to folder";
}
