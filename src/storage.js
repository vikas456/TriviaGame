// Simple in-memory storage fallback for environments without window.storage
class StorageAdapter {
  constructor() {
    this.data = new Map();
  }

  async get(key, shared = false) {
    const fullKey = shared ? `shared:${key}` : key;
    const value = this.data.get(fullKey);
    return value ? { key, value, shared } : null;
  }

  async set(key, value, shared = false) {
    const fullKey = shared ? `shared:${key}` : key;
    this.data.set(fullKey, value);
    return { key, value, shared };
  }

  async delete(key, shared = false) {
    const fullKey = shared ? `shared:${key}` : key;
    this.data.delete(fullKey);
    return { key, deleted: true, shared };
  }

  async list(prefix = "", shared = false) {
    const keys = [];
    const fullPrefix = shared ? `shared:${prefix}` : prefix;
    for (const key of this.data.keys()) {
      if (key.startsWith(fullPrefix)) {
        keys.push(key.replace(/^shared:/, ""));
      }
    }
    return { keys, prefix, shared };
  }
}

// Initialize storage
if (typeof window !== "undefined" && !window.storage) {
  window.storage = new StorageAdapter();
}

export default window.storage;
