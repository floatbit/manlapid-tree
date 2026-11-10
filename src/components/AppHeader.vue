<script setup lang="js">
import SearchField from './SearchField.vue';
import { Search, Menu, X } from '@lucide/vue';
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { activePage, ready, useRuntime, ui } from '../ui/runtime.js';
const links=[['treeTab','tree','Tree'],['familiesTab','families','Family'],['peopleTab','people','People'],['timelineTab','timeline','Timeline'],['mapTab','map','Map'],['albumsTab','albums','Album'],['recipesTab','recipes','Recipes'],['overviewTab','overview','Reports']];
const menuOpen = ref(false), menuDialog = ref(null), mobile = ref(false);
function closeMenu() { menuDialog.value?.close(); menuOpen.value = false; }
function openMenu() { menuOpen.value = true; menuDialog.value.showModal(); }
watch(activePage, closeMenu);
let media;
function updateMobile() { mobile.value = media.matches; if (!mobile.value) closeMenu(); }
onMounted(() => { media = window.matchMedia('(max-width: 760px)'); updateMobile(); media.addEventListener('change', updateMobile); ui.closeMobileMenu = closeMenu; });
onBeforeUnmount(() => { media?.removeEventListener('change', updateMobile); delete ui.closeMobileMenu; });
</script>
<template>
  <dialog id="mobileMainMenu" ref="menuDialog" aria-labelledby="mobileMenuTitle" @close="menuOpen = false" @click="$event.target === menuDialog && closeMenu()">
    <div class="mobile-menu-heading"><h2 id="mobileMenuTitle">Explore Your Family</h2><button type="button" aria-label="Close menu" @click="closeMenu"><X :size="22" /></button></div>
    <div id="mobileMenuContent"></div>
  </dialog>
  <header>
    <a class="brand" href="#" aria-label="Family tree home">✳</a>
    <button class="mobile-menu-toggle" type="button" :aria-expanded="menuOpen" aria-haspopup="dialog" aria-controls="mobileMainMenu" @click="openMenu"><component :is="menuOpen ? X : Menu" :size="20" aria-hidden="true" />{{ links.find(link => link[1] === activePage)?.[2] || 'Menu' }}</button>
    <Teleport to="#mobileMenuContent" :disabled="!mobile">
    <nav id="mainNavigation" aria-label="Main navigation" :class="{ 'mobile-menu-open': menuOpen }" @keydown.esc="menuOpen = false">
      <button
        v-for="[id, page, label] in links"
        :id="id"
        :disabled="!ready"
        :key="id"
        :class="{ active: activePage === page }"
        @click="closeMenu(); useRuntime()?.showSection(page)"
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
    </Teleport>
    <span class="saved" hidden aria-live="polite"></span>
  </header>
</template>
