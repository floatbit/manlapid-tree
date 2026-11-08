<script setup lang="js">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { family, useRuntime } from '../ui/runtime.js';
import PersonAutocomplete from './PersonAutocomplete.vue';
const api = computed(useRuntime);
const headerOffset = ref(100);
let headerObserver;
onMounted(() => {
  const header = document.querySelector('#app > header');
  if (!header) return;
  const update = () => { headerOffset.value = header.getBoundingClientRect().height + 12; };
  update();
  headerObserver = new ResizeObserver(update);
  headerObserver.observe(header);
});
onBeforeUnmount(() => headerObserver?.disconnect());
let initialQuery='';try {initialQuery=localStorage.getItem('kinfolk-people-search-v1') || '';} catch {}
function remember(value) {try {localStorage.setItem('kinfolk-people-search-v1',value);}catch {}}
</script>
<template>
  <div id="peopleList" :style="{ '--people-header-offset': headerOffset + 'px' }">
    <h3>{{ family.people.length }} people</h3>
    <label for="directorySearch">Find a person to edit</label>
    <PersonAutocomplete
      v-if="api"
      input-id="directorySearch"
      list-id="directoryMatches"
      label="Find a person to edit"
      placeholder="Search by name…"
      :initial-query="initialQuery"
      :options="() => family.people"
      :matches="api.personMatchesQuery"
      :display="api.displayName"
      keep-results
      show-clear
      :validate-selection="false"
      @query="remember"
      @select="(p) => api.selectPersonFromDirectory(p.id)"
    />
  </div>
</template>
