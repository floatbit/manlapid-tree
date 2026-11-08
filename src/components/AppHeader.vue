<script setup lang="js">
import SearchField from './SearchField.vue';
import { Search } from '@lucide/vue';
import { activePage, ready, useRuntime } from '../ui/runtime.js';
const links=[['treeTab','tree','Tree'],['familiesTab','families','Family'],['peopleTab','people','People'],['timelineTab','timeline','Timeline'],['mapTab','map','Map'],['albumsTab','albums','Album'],['recipesTab','recipes','Recipes'],['overviewTab','overview','Reports']];
</script>
<template>
  <header>
    <a class="brand" href="#" aria-label="Family tree home">✳</a>
    <nav>
      <button
        v-for="[id, page, label] in links"
        :id="id"
        :disabled="!ready"
        :key="id"
        :class="{ active: activePage === page }"
        @click="useRuntime()?.showSection(page)"
      >
        {{ label }}
      </button>
    </nav>
    <div class="search">
      <label for="search">Find someone in your family</label>
      <div class="searchbox">
        <Search class="main-search-icon" :size="20" aria-hidden="true" />
        <SearchField><input
          role="combobox"
          aria-autocomplete="list"
          aria-controls="searchMatches"
          aria-expanded="false"
          id="search"
          placeholder="Type a name to begin…"
          autocomplete="off"
        /></SearchField><button id="searchGo">Search ↗</button>
      </div>
      <div id="results"></div>
    </div>
    <span class="saved" hidden aria-live="polite"></span>
  </header>
</template>
