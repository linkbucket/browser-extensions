// URL validation
export function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

// Normalize backend tag response - expects array of {id, title, tag_id?}
export function normalizeTags(json) {
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

// Normalize backend folder response - expects array of
// {id, title, shared, owner_name, member_count}
export function normalizeFolders(json) {
  const list = Array.isArray(json) ? json : [];

  return list
    .filter((f) => f && typeof f === "object")
    .map((f) => ({
      id: String(f.id ?? ""),
      title: String(f.title ?? "Untitled"),
      shared: Boolean(f.shared),
      owner_name: String(f.owner_name ?? ""),
      member_count: Number(f.member_count) || 1,
    }))
    .filter((f) => f.id);
}

// "Name (Owner's)" for folders shared with the user, matching the web app's
// folder picker labels
export function folderLabel(folder) {
  return folder.shared
    ? `${folder.title} (${folder.owner_name}'s)`
    : folder.title;
}

export function folderMeta(folder) {
  return folder.member_count > 1
    ? `shared · ${folder.member_count} people`
    : "private";
}

// Case-insensitive filter for the destination list's folder search,
// matching the folder name or (for shared folders) the owner's name
export function filterFolders(folders, query) {
  const q = query.trim().toLowerCase();
  if (!q) return folders;

  return folders.filter(
    (folder) =>
      folder.title.toLowerCase().includes(q) ||
      (folder.shared && folder.owner_name.toLowerCase().includes(q)),
  );
}

// Build the API placements payload from per-row selections:
// [{folderId, values}] where values are a tag select's raw values
// (existing folder_tag ids and "new:name" entries)
export function buildPlacementsPayload(cardSelections) {
  return cardSelections.map(({ folderId, values }) => {
    const { user_tag_ids, tag_names } = splitSelectedTags(values);
    return {
      folder_id: folderId,
      folder_tag_ids: user_tag_ids,
      tag_names,
    };
  });
}

// Split selected tag values into existing IDs and new tag names
export function splitSelectedTags(values) {
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
