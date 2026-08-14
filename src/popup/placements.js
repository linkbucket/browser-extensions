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
  $.picker.addEventListener("change", handlePickerChange);
  // Closing the native dropdown without choosing leaves the picker focused;
  // restore the add button on blur so the row never looks stuck.
  $.picker.addEventListener("blur", closeFolderPicker);
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

  $.picker.replaceChildren(
    new Option("Choose a folder…", "", true, true),
    ...folders.map((folder) => {
      const option = new Option(folderLabel(folder), folder.id);
      option.dataset.folder = JSON.stringify(folder);
      return option;
    }),
  );
  $.picker.options[0].disabled = true;

  $.addButton.style.display = "none";
  $.picker.style.display = "";
  $.picker.focus();
}

function handlePickerChange() {
  const option = $.picker.selectedOptions[0];
  if (option?.dataset.folder) {
    addFolderCard(JSON.parse(option.dataset.folder));
  }
  closeFolderPicker();
}

function closeFolderPicker() {
  if (!$.picker) return;

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
