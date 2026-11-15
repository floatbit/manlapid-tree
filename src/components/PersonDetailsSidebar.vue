<script setup>
import { computed } from 'vue';
import { PhX } from '@phosphor-icons/vue';
import { family, sidebarPersonId, showPersonDetails, useRuntime } from '../ui/runtime.js';
import { closeMobileSidebar } from '../ui/mobile-sidebar.js';
import MobileSidebar from './MobileSidebar.vue';
import InsightPersonDetails from './InsightPersonDetails.vue';
const person = computed(() => family.value.people.find(p => p.id === sidebarPersonId.value));
function close() { sidebarPersonId.value = null; closeMobileSidebar('person-details'); }
</script>
<template>
  <div v-if="person" class="person-details-sidebar">
    <MobileSidebar sidebar-key="person-details" label="Person details">
      <aside class="insights-sidebar" aria-label="Person details">
        <div class="insights-sidebar-heading"><p class="eyebrow">A CLOSER LOOK</p><button type="button" aria-label="Close person details" @click="close"><PhX :size="20"/></button></div>
        <InsightPersonDetails :person="person" @select="showPersonDetails($event.id)" @tree="useRuntime().start($event.id)"/>
      </aside>
    </MobileSidebar>
  </div>
</template>
