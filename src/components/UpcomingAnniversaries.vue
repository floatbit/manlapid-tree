<script setup lang="js">
import { computed, nextTick } from 'vue';
import { CalendarDays } from '@lucide/vue';
import { family, useRuntime } from '../ui/runtime.js';
const api = computed(useRuntime);
const events = computed(() => api.value?.upcomingAnniversaries(family.value.people, family.value.milestones || []) || []);
const icon = (event) => event.kind === 'Birthday' ? '🎂' : event.kind === 'Wedding Anniversary' ? '♡' : '🕯';
async function open(event) {
  if ((event.kind === 'Birthday' && event.personId) || (event.kind === 'Wedding Anniversary' && event.milestoneId)) {
    await nextTick();
    const entry = document.getElementById(event.kind === 'Birthday' ? 'timeline-birth-' + event.personId : 'timeline-milestone-' + event.milestoneId);
    if (!entry) { api.value.notify('This timeline entry is not available.'); return; }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const headerHeight = document.querySelector('#app > header')?.getBoundingClientRect().height || 0;
    entry.focus({ preventScroll: true });
    window.scrollTo({ top: Math.max(0, window.scrollY + entry.getBoundingClientRect().top - headerHeight - 24), behavior: reduced ? 'instant' : 'smooth' });
    if (!reduced) entry.animate([
      { boxShadow: '0 0 0 4px #91aa7b99' },
      { boxShadow: '0 0 0 8px #91aa7b00' },
    ], { duration: 1800, iterations: 2 });
    return;
  }
  if (event.personId) { api.value.showSection('people'); api.value.edit(event.personId); }
  else api.value.openMilestone(event.milestoneId);
}
</script>
<template>
  <aside id="upcomingAnniversaries" class="upcoming-anniversaries">
    <div class="anniversaries-heading">
      <span class="anniversaries-heading-icon" aria-hidden="true"><CalendarDays :size="21" /></span>
      <div>
        <p class="anniversaries-eyebrow">DATES TO REMEMBER</p>
        <h2>Upcoming Anniversaries</h2>
      </div>
    </div>
    <p class="anniversaries-window">
      Next 90 days
      <span>{{ events.length }} {{ events.length === 1 ? 'occasion' : 'occasions' }}</span>
    </p>
    <button
      v-for="event in events"
      :key="event.personId || event.milestoneId"
      type="button"
      :title="
        event.kind === 'Birthday'
          ? 'Jump to birth entry'
          : event.kind === 'Wedding Anniversary'
          ? 'Jump to wedding entry'
          : undefined
      "
      class="anniversary-card"
      :class="{ 'anniversary-soon': event.days <= 7 }"
      @click="open(event)"
    >
      <span
        class="anniversary-date"
        :aria-label="event.next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })"
      >
        <small>{{ event.next.toLocaleDateString('en-US', { month: 'short' }) }}</small
        ><strong>{{ event.next.getDate() }}</strong>
      </span>
      <span class="anniversary-info">
        <span class="anniversary-kind"
          ><span aria-hidden="true" class="anniversary-event-icon">{{ icon(event) }}</span
          >{{ event.kind }}</span
        >
        <strong class="anniversary-name">{{ event.title }}</strong>
        <span class="anniversary-footer"
          ><span v-if="event.years"
            >{{ event.years }} {{ event.kind === 'Birthday' ? 'years old' : 'years' }}</span
          ><span class="anniversary-countdown">{{
            event.days === 0
              ? 'Today'
              : event.days === 1
              ? 'Tomorrow'
              : 'In ' + event.days + ' days'
          }}</span></span
        >
      </span>
    </button>
    <p v-if="!events.length" class="anniversaries-empty">
      No upcoming dates yet. Add birthdays and wedding dates to bring this space to life.
    </p>
  </aside>
</template>
