<script setup lang="js">
import SearchField from './SearchField.vue';
import { Search, Menu, X } from '@lucide/vue';
import { ref, watch } from 'vue';
import { activePage, ready, useRuntime } from '../ui/runtime.js';
const links=[['treeTab','tree','Tree'],['familiesTab','families','Family'],['peopleTab','people','People'],['timelineTab','timeline','Timeline'],['mapTab','map','Map'],['albumsTab','albums','Album'],['recipesTab','recipes','Recipes'],['overviewTab','overview','Reports']];
const menuOpen = ref(false);
watch(activePage, () => { menuOpen.value = false; });
</script>
<template>
  <header>
    <a class="brand" href="#" aria-label="Family tree home">✳</a>
    <button class="mobile-menu-toggle" type="button" :aria-expanded="menuOpen" aria-controls="mainNavigation" @click="menuOpen = !menuOpen"><component :is="menuOpen ? X : Menu" :size="20" aria-hidden="true" />{{ links.find(link => link[1] === activePage)?.[2] || 'Menu' }}</button>
    <nav id="mainNavigation" aria-label="Main navigation" :class="{ 'mobile-menu-open': menuOpen }" @keydown.esc="menuOpen = false">
      <button
        v-for="[id, page, label] in links"
        :id="id"
        :disabled="!ready"
        :key="id"
        :class="{ active: activePage === page }"
        @click="menuOpen = false; useRuntime()?.showSection(page)"
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
