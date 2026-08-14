import { apiFetch, fetchFolders } from "./api.js";
import { createTagSelect, tagLoader } from "./tags.js";
import {
  normalizeFolders,
  folderLabel,
  folderMeta,
  filterFolders,
  buildPlacementsPayload,
} from "./utils.js";

// Show the folder search box only when the list is long enough to need it
const SEARCH_THRESHOLD = 6;

// Checked destinations, keyed by folder id. Each entry owns that
// folder's tag row (label + Tom Select instance).
const checked = new Map();

let allFolders = [];

const $ = {
  folderList: null,
  destinationTemplate: null,
  folderTagRows: null,
  tagRowTemplate: null,
  search: null,
};

export function initPlacements({
  folderList,
  destinationTemplate,
  folderTagRows,
  tagRowTemplate,
  search,
}) {
  $.folderList = folderList;
  $.destinationTemplate = destinationTemplate;
  $.folderTagRows = folderTagRows;
  $.tagRowTemplate = tagRowTemplate;
  $.search = search;

  $.search.addEventListener("input", renderFolderList);
}

export async function loadFolders() {
  allFolders = normalizeFolders(await fetchFolders());
  $.search.style.display = allFolders.length > SEARCH_THRESHOLD ? "" : "none";
  renderFolderList();
}

function renderFolderList() {
  $.folderList.replaceChildren(
    ...filterFolders(allFolders, $.search.value).map((folder) => {
      const fragment = $.destinationTemplate.content.cloneNode(true);
      const row = fragment.querySelector(".destination");
      row.querySelector(".destination__name").textContent = folderLabel(folder);
      row.querySelector(".destination__meta").textContent = folderMeta(folder);

      const checkbox = row.querySelector("input");
      checkbox.checked = checked.has(folder.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          addTagRow(folder);
        } else {
          removeTagRow(folder.id);
        }
      });

      return fragment;
    }),
  );
}

function addTagRow(folder, tags = []) {
  if (checked.has(folder.id)) return;

  const fragment = $.tagRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".tag-row");
  row.querySelector(".tag-row__label").textContent = folder.title;

  const select = row.querySelector("select");
  $.folderTagRows.appendChild(fragment);

  const tagSelect = createTagSelect(
    select,
    tagLoader(apiFetch, `/folders/${folder.id}/tags`),
  );
  tagSelect?.setValues(tags);

  checked.set(folder.id, { folder, row, tagSelect });
}

function removeTagRow(folderId) {
  const entry = checked.get(folderId);
  if (!entry) return;

  entry.tagSelect?.destroy();
  entry.row.remove();
  checked.delete(folderId);
}

export function hydratePlacements(placements) {
  destroyPlacements();
  (placements || []).forEach((placement) => {
    const [folder] = normalizeFolders([placement.folder]);
    if (!folder) return;

    // A hydrated folder can be missing from the list (e.g. beyond the
    // API's cap) - add it so its checkbox exists to uncheck.
    if (!allFolders.some((f) => f.id === folder.id)) {
      allFolders.push(folder);
    }
    addTagRow(folder, placement.tags || []);
  });
  renderFolderList();
}

export function getPlacements() {
  return buildPlacementsPayload(
    Array.from(checked.values(), ({ folder, tagSelect }) => ({
      folderId: folder.id,
      values: tagSelect?.getValues() ?? [],
    })),
  );
}

export function destroyPlacements() {
  checked.forEach(({ tagSelect, row }) => {
    tagSelect?.destroy();
    row.remove();
  });
  checked.clear();
  if ($.search) {
    $.search.value = "";
    renderFolderList();
  }
}
