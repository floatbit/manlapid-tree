<script setup lang="js">
import { computed } from 'vue';
import { family, useRuntime } from '../ui/runtime.js';
const api=computed(useRuntime);
const events=computed(()=>api.value?.upcomingAnniversaries(family.value.people,family.value.milestones || []) || []);
function open(event){if(event.personId){api.value.showSection('people');api.value.edit(event.personId);}else api.value.openMilestone(event.milestoneId);}
</script>
<template>
  <aside id="upcomingAnniversaries" class="upcoming-anniversaries">
    <h2>Upcoming Anniversaries</h2>
    <p class="hint">Next 90 days · February 29 is observed on February 28 in non-leap years.</p>
    <button
      v-for="event in events"
      :key="event.personId || event.milestoneId"
      type="button"
      @click="open(event)"
    >
      <small
        >{{ event.kind }} · {{ event.days === 0 ? 'Today' : 'In ' + event.days + ' days' }}</small
      ><strong>{{ event.title }}</strong
      ><span
        >{{ event.next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        }}{{ event.years ? ' · ' + event.years + ' years' : '' }}</span
      >
    </button>
    <p v-if="!events.length">No anniversaries with a known month and day in the next 90 days.</p>
  </aside>
</template>
