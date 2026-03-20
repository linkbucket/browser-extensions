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
