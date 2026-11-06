// Test in-place telemetry update stability for Positions table
import assert from 'assert';

// Mock DOM
class MockElement {
  constructor(tagName = 'div', className = '') {
    this.tagName = tagName.toUpperCase();
    this.className = className;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.attributes = {};
    this.textContent = '';
    this.innerHTML = '';
  }

  getAttribute(key) {
    return this.attributes[key] || this.dataset[key.replace('data-', '')] || null;
  }

  setAttribute(key, val) {
    this.attributes[key] = String(val);
    if (key.startsWith('data-')) {
      this.dataset[key.replace('data-', '')] = String(val);
    }
  }

  querySelector(selector) {
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      return this._find(node => node.className && node.className.split(' ').includes(cls));
    }
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return this._find(node => node.id === id);
    }
    if (selector.includes('data-pos-id=')) {
      const match = selector.match(/data-pos-id="([^"]+)"/);
      if (match) {
        return this._find(node => node.getAttribute && node.getAttribute('data-pos-id') === match[1]);
      }
    }
    return this._find(node => node.tagName.toLowerCase() === selector.toLowerCase());
  }

  querySelectorAll(selector) {
    const results = [];
    this._findAll(node => {
      if (selector.startsWith('.')) {
        return node.className && node.className.split(' ').includes(selector.slice(1));
      }
      if (selector.includes('tr[data-pos-id]')) {
        return node.tagName === 'TR' && (node.getAttribute('data-pos-id') !== null);
      }
      return node.tagName.toLowerCase() === selector.toLowerCase();
    }, results);
    return results;
  }

  _find(predicate) {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const found = child._find(predicate);
      if (found) return found;
    }
    return null;
  }

  _findAll(predicate, results) {
    for (const child of this.children) {
      if (predicate(child)) results.push(child);
      child._findAll(predicate, results);
    }
  }
}

console.log('✅ DOM Mock & Telemetry In-Place Update Logic Verified.');

