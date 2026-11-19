<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import {PhMapPin,PhPath,PhGlobeHemisphereWest,PhCornersOut} from '@phosphor-icons/vue';
import MobileSidebar from '../components/MobileSidebar.vue';
const page = ref(null);
let headerObserver;
onMounted(() => {
  const header = document.querySelector('#app > header');
  if (!header) return;
  const measure = () => page.value?.style.setProperty('--map-header-height', header.getBoundingClientRect().height + 'px');
  measure();
  if (window.ResizeObserver) {
    headerObserver = new window.ResizeObserver(measure);
    headerObserver.observe(header);
  }
});
onBeforeUnmount(() => headerObserver?.disconnect());
</script>
<template>
  <main id="familyMapPage" ref="page" hidden>
    <div class="family-map-workspace">
      <div class="family-map-stage">
        <div id="familyMapCanvas" aria-label="Map of family members’ current locations"></div>
        <div class="map-view-controls">
          <div class="map-view-toggle" role="group" aria-label="Map view">
            <button id="mapCurrentView" type="button" aria-pressed="true" title="Current locations"><PhMapPin :size="16" aria-hidden="true"/><span>Current locations</span></button
            ><button id="mapHistoryView" type="button" aria-pressed="false" title="Places lived"><PhPath :size="16" aria-hidden="true"/><span>Places lived</span></button><button id="mapMigrationsView" type="button" aria-pressed="false" title="Migrations"><PhGlobeHemisphereWest :size="16" aria-hidden="true"/><span>Migrations</span></button>
          </div>
          <button id="fitFamilyMap" type="button" title="Fit the current map view"><PhCornersOut :size="16" aria-hidden="true"/><span id="fitFamilyMapLabel">Fit everyone</span></button>
        </div>
      </div>
      <MobileSidebar sidebar-key="map" label="Map details"><aside id="familyMapPeople">
        <p class="eyebrow">OUR FAMILY, AROUND THE WORLD</p>
        <h1>Family Map.</h1>
        <p id="familyMapSummary">Current locations of your people.</p>
        <p id="familyMapStatus" role="status"></p>
        <div id="mapSelectedPerson" hidden></div>
        <div id="mapLocationDirectory">
          <h2>People on the Map</h2>
          <div id="mappedPeople"></div>
          <h3>Location Needed</h3>
          <div id="unmappedPeople"></div>
        </div>
      </aside></MobileSidebar>
    </div>
  </main>
</template>
