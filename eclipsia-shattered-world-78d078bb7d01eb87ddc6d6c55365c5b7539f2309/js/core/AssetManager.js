/**
 * AssetManager — loads and caches images and JSON. Concurrent requests for the
 * same URL share one promise, so nothing is fetched twice. Procedurally generated
 * placeholder art is registered under string keys alongside real images.
 */
export class AssetManager {
  constructor() {
    this.images = new Map();
    this.data = new Map();
    this.pending = new Map();
  }

  loadImage(key, url) {
    if (this.images.has(key)) return Promise.resolve(this.images.get(key));
    if (this.pending.has(`img:${key}`)) return this.pending.get(`img:${key}`);
    const p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { this.images.set(key, img); resolve(img); };
      img.onerror = () => reject(new Error(`Failed to load image "${url}"`));
      img.src = url;
    }).finally(() => this.pending.delete(`img:${key}`));
    this.pending.set(`img:${key}`, p);
    return p;
  }

  /**
   * Load + validate JSON. `validate(data, url)` must throw on invalid data
   * and may return a normalised copy.
   */
  loadJSON(url, validate) {
    if (this.data.has(url)) return Promise.resolve(this.data.get(url));
    if (this.pending.has(`json:${url}`)) return this.pending.get(`json:${url}`);
    const p = (async () => {
      let res;
      try {
        res = await fetch(url);
      } catch (err) {
        throw new Error(`Network error loading "${url}": ${err.message}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} loading "${url}"`);
      let json;
      try {
        json = await res.json();
      } catch (err) {
        throw new Error(`Invalid JSON in "${url}": ${err.message}`);
      }
      const result = validate ? (validate(json, url) ?? json) : json;
      this.data.set(url, result);
      return result;
    })().finally(() => this.pending.delete(`json:${url}`));
    this.pending.set(`json:${url}`, p);
    return p;
  }

  /** Register a generated canvas/image under a key. */
  register(key, image) {
    this.images.set(key, image);
    return image;
  }

  has(key) { return this.images.has(key); }

  get(key) {
    const img = this.images.get(key);
    if (!img) throw new Error(`Asset "${key}" has not been loaded`);
    return img;
  }
}
