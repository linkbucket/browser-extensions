export const storage = {
  get: (keys) => browser.storage.local.get(keys),
  set: (obj) => browser.storage.local.set(obj),
  remove: (keys) => browser.storage.local.remove(keys),
};
