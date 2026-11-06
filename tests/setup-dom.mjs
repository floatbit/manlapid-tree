import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://family.test/' });
for (const key of [
  'window',
  'document',
  'Document',
  'ShadowRoot',
  'navigator',
  'Element',
  'Node',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLSelectElement',
  'SVGElement',
  'Event',
  'CustomEvent',
  'localStorage',
])
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
  this.dispatchEvent(new Event('close'));
};
dom.window.HTMLMediaElement.prototype.load = function () {};
dom.window.HTMLMediaElement.prototype.pause = function () {};
