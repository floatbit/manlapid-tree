<script setup lang="js">
import ViewerIdentity from './ViewerIdentity.vue';
import SearchField from './SearchField.vue';
import { PhMagnifyingGlass as Search, PhList as Menu, PhX as X } from '@phosphor-icons/vue';
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { activePage, ready, canEdit, useRuntime, ui } from '../ui/runtime.js';
const links=[['treeTab','tree','Tree'],['timelineTab','timeline','Timeline'],['familiesTab','families','Families'],['peopleTab','people','People'],['mapTab','map','Map'],['insightsTab','insights','Insights']];
const moreLinks=[['albumsTab','albums','Albums'],['storiesTab','stories','Stories'],['recipesTab','recipes','Recipes'],['overviewTab','overview','Contribute']];
const moreOpen=ref(false), identity=ref(null);
async function selectMe() { closeMenu(); await nextTick(); identity.value?.open(); }
let moreCloseTimer;
function cancelMoreClose() { clearTimeout(moreCloseTimer); moreCloseTimer=undefined; }
function scheduleMoreClose() {
  cancelMoreClose();
  if (moreOpen.value) moreCloseTimer=setTimeout(()=>{moreOpen.value=false;moreCloseTimer=undefined;},1000);
}
watch(moreOpen, cancelMoreClose);
const loginUrl=new URL('login/',document.baseURI).pathname;

const menuOpen = ref(false), menuDialog = ref(null), mobile = ref(false);
function closeMenu() { moreOpen.value=false; menuDialog.value?.close(); menuOpen.value = false; }
function openMenu() { menuOpen.value = true; menuDialog.value.showModal(); }
watch(activePage, closeMenu);
let media;
function updateMobile() { mobile.value = media.matches; if (!mobile.value) closeMenu(); }
onMounted(() => { media = window.matchMedia('(max-width: 1023px)'); updateMobile(); media.addEventListener('change', updateMobile); ui.closeMobileMenu = closeMenu; });
onBeforeUnmount(() => { cancelMoreClose(); media?.removeEventListener('change', updateMobile); delete ui.closeMobileMenu; });
</script>
<template>
  <dialog id="mobileMainMenu" ref="menuDialog" aria-labelledby="mobileMenuTitle" @close="menuOpen = false" @click="$event.target === menuDialog && closeMenu()">
    <div class="mobile-menu-heading"><h2 id="mobileMenuTitle">Explore Your Family</h2><button type="button" aria-label="Close menu" @click="closeMenu"><X :size="22" /></button></div>
    <div id="mobileMenuContent"></div>
  </dialog>
  <header>
    <a class="brand" href="#" aria-label="Family tree home">✳</a>
    <span class="mobile-page-title">{{ [...links,...moreLinks].find(link => link[1] === activePage)?.[2] }}</span>
    <button class="mobile-menu-toggle" type="button" aria-label="Open menu" :aria-expanded="menuOpen" aria-haspopup="dialog" aria-controls="mobileMainMenu" @click="openMenu"><Menu :size="20" aria-hidden="true" /></button>
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
      <div class="header-more" @mouseenter="cancelMoreClose" @mouseleave="scheduleMoreClose" @focusout="!$event.currentTarget.contains($event.relatedTarget) && (moreOpen=false)" @keydown.esc="moreOpen=false">
        <button class="header-more-trigger" type="button" :class="{active:moreLinks.some(link=>link[1]===activePage)}" :aria-expanded="moreOpen" aria-controls="headerMoreLinks" @click="moreOpen=!moreOpen">More...</button>
        <div id="headerMoreLinks" class="header-more-links" :hidden="!moreOpen">
          <button v-for="[id,page,label] in moreLinks" :key="id" :id="id" :class="{active:activePage===page}" :disabled="!ready" @click="closeMenu();useRuntime()?.showSection(page)">{{label}}</button>
          <button type="button" :disabled="!ready" @click="selectMe">Select Me</button>
          <form v-if="canEdit" :action="loginUrl" method="post" class="header-auth-link">
            <input type="hidden" name="csrf" :value="useRuntime()?.csrfToken" />
            <button type="submit" name="logout" value="1">Logout</button>
          </form>
          <a v-else :href="loginUrl" class="header-auth-link">Login</a>
        </div>
      </div>
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
        /></SearchField><button id="searchGo">Search</button>
      </div>
      <div id="results"></div>
    </div>
    <ViewerIdentity ref="identity" />
    </Teleport>
    <span class="saved" hidden aria-live="polite"></span>
  </header>
</template>
