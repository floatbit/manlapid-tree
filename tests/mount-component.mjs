import { createApp, nextTick } from 'vue';
import assert from 'node:assert/strict';
export const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
function elementWrapper(element) {
  return {
    element,
    find(selector) {
      const found = element.querySelector(selector);
      assert(found, `Missing element: ${selector}`);
      return elementWrapper(found);
    },
    findAll(selector) {
      return [...element.querySelectorAll(selector)].map(elementWrapper);
    },
    text() {
      return element.textContent;
    },
    attributes(name) {
      return element.getAttribute(name) ?? undefined;
    },
    async setValue(value) {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await nextTick();
    },
    async trigger(type, options = {}) {
      const Constructor = type.startsWith('key') ? window.KeyboardEvent : window.Event;
      element.dispatchEvent(new Constructor(type, { bubbles: true, cancelable: true, ...options }));
      await nextTick();
    },
  };
}
export function mount(component, { props = {} } = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp(component, props);
  app.mount(host);
  const wrapper = elementWrapper(host);
  wrapper.element = host.firstElementChild;
  wrapper.trigger = (type, options = {}) =>
    elementWrapper(host.firstElementChild).trigger(type, options);
  wrapper.unmount = () => {
    app.unmount();
    host.remove();
  };
  return wrapper;
}
