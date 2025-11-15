// Node.js polyfills for missing Web APIs
// This file must be loaded before any packages that depend on Web APIs

// Polyfill for File API
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(fileBits, fileName, options = {}) {
      this.name = fileName;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
      this.size = Array.isArray(fileBits) ? fileBits.reduce((acc, bit) => acc + (bit.length || 0), 0) : 0;
      this.stream = () => new ReadableStream();
      this.text = () => Promise.resolve('');
      this.arrayBuffer = () => Promise.resolve(new ArrayBuffer(0));
    }
  };
}

// Polyfill for FormData API
if (typeof globalThis.FormData === 'undefined') {
  globalThis.FormData = class FormData {
    constructor() {
      this._data = new Map();
    }
    append(name, value, filename) {
      if (!this._data.has(name)) {
        this._data.set(name, []);
      }
      this._data.get(name).push({ value, filename });
    }
    delete(name) {
      this._data.delete(name);
    }
    get(name) {
      const values = this._data.get(name);
      return values ? values[0].value : null;
    }
    getAll(name) {
      const values = this._data.get(name);
      return values ? values.map(v => v.value) : [];
    }
    has(name) {
      return this._data.has(name);
    }
    set(name, value, filename) {
      this._data.set(name, [{ value, filename }]);
    }
    entries() {
      const entries = [];
      for (const [name, values] of this._data) {
        for (const { value } of values) {
          entries.push([name, value]);
        }
      }
      return entries[Symbol.iterator]();
    }
    keys() {
      return this._data.keys();
    }
    values() {
      const values = [];
      for (const [, valueArray] of this._data) {
        for (const { value } of valueArray) {
          values.push(value);
        }
      }
      return values[Symbol.iterator]();
    }
    [Symbol.iterator]() {
      return this.entries();
    }
  };
}

// Polyfill for Blob API
if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = class Blob {
    constructor(blobParts = [], options = {}) {
      this.size = 0;
      this.type = options.type || '';
      this.stream = () => new ReadableStream();
      this.text = () => Promise.resolve('');
      this.arrayBuffer = () => Promise.resolve(new ArrayBuffer(0));
    }
  };
}

// Polyfill for ReadableStream (basic implementation)
if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = class ReadableStream {
    constructor(underlyingSource = {}) {
      this.locked = false;
    }
    getReader() {
      return {
        read: () => Promise.resolve({ done: true, value: undefined }),
        releaseLock: () => {},
        closed: Promise.resolve()
      };
    }
  };
}

console.log('[polyfills] Node.js Web API polyfills loaded successfully');
