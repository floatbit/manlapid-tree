<script setup lang="js">
import { computed } from 'vue';
import { family, useRuntime } from '../ui/runtime.js';
import PersonAutocomplete from './PersonAutocomplete.vue';
const api = computed(useRuntime);
let initialQuery='';try {initialQuery=localStorage.getItem('kinfolk-people-search-v1') || '';} catch {}
function remember(value) {try {localStorage.setItem('kinfolk-people-search-v1',value);}catch {}}
</script>
<template>
  <div id="peopleList">
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
