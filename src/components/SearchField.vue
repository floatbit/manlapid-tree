<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
const root = ref(null), hasText = ref(false);
let input, timer;
function sync() { hasText.value = !!input?.value; }
function clear() {
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  sync(); input.focus();
}
onMounted(() => {
  input = root.value.querySelector('input');
  input.addEventListener('input', sync); sync();
  // Legacy controllers also restore search values directly when changing views.
  timer = setInterval(sync, 250);
});
onBeforeUnmount(() => { clearInterval(timer); input?.removeEventListener('input', sync); });
</script>
<template>
  <span ref="root" class="clearable-search">
    <slot />
    <button v-if="hasText" type="button" class="search-clear-button" aria-label="Clear search" @click="clear">×</button>
  </span>
</template>
