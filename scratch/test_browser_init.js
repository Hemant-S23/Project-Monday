import fs from 'fs';

const html = fs.readFileSync('terminal.html', 'utf8');

// Extract all id="..." from terminal.html
const ids = new Set();
const regex = /id=["']([^"']+)["']/g;
let match;
while ((match = regex.exec(html)) !== null) {
  ids.add(match[1]);
}

console.log(`Found ${ids.size} unique element IDs in terminal.html`);

// Build mock document
const elementMap = {};

function createMockElement(id = '') {
  return {
    id,
    tagName: 'DIV',
    style: {},
    classList: {
      _classes: new Set(),
      add(...c) { c.forEach(x => this._classes.add(x)); },
      remove(...c) { c.forEach(x => this._classes.delete(x)); },
      contains(c) { return this._classes.has(c); },
      toggle(c) { this.contains(c) ? this.remove(c) : this.add(c); }
    },
    dataset: {},
    children: [],
    childNodes: [],
    setAttribute() {},
    getAttribute() { return null; },
    removeAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    removeChild() {},
    querySelector() { return createMockElement(); },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 800, height: 600, bottom: 600, right: 800 }; },
    focus() {},
    blur() {},
    matches() { return false; },
    scrollIntoView() {},
    contains() { return false; },
    textContent: '',
    innerHTML: '',
    value: ''
  };
}

ids.forEach(id => {
  elementMap[id] = createMockElement(id);
});

globalThis.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener() {},
  removeEventListener() {},
  speechSynthesis: {
    getVoices: () => [],
    speak: () => {},
    cancel: () => {},
    speaking: false,
    paused: false
  },
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] || null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; },
    clear() { this._s = {}; }
  },
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval
};

const domListeners = [];
globalThis.document = {
  documentElement: createMockElement('html'),
  body: createMockElement('body'),
  getElementById(id) {
    if (!elementMap[id]) {
      elementMap[id] = createMockElement(id);
    }
    return elementMap[id];
  },
  querySelector(sel) {
    if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
    return createMockElement();
  },
  querySelectorAll() { return []; },
  createElement(tag) { return createMockElement(tag); },
  addEventListener(event, cb) {
    if (event === 'DOMContentLoaded') domListeners.push(cb);
  },
  removeEventListener() {},
  hidden: false
};

globalThis.localStorage = globalThis.window.localStorage;
try {
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true, clipboard: { writeText: () => Promise.resolve() } }, writable: true });
} catch (e) {}
globalThis.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
globalThis.WebSocket = class {
  constructor() {}
  addEventListener() {}
  send() {}
  close() {}
};

// Now import app.js
try {
  await import('../js/app.js');
  console.log('app.js imported. Triggering DOMContentLoaded...');
  for (const cb of domListeners) {
    await cb();
  }
  console.log('DOMContentLoaded fired! Waiting for window.mondayApp...');
  const app = globalThis.window.mondayApp;
  if (!app) {
    console.error('window.mondayApp not found!');
  } else {
    console.log('>>> APP INITIALIZED SUCCESSFULLY <<<');
  }
} catch (err) {
  console.error('>>> FATAL ERROR DURING APP INIT <<<');
  console.error(err.stack || err);
}
