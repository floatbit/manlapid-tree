<script setup lang="js">
import { computed, nextTick } from 'vue';
import TimelineIcon from './TimelineIcon.vue';
import { family, useRuntime } from '../ui/runtime.js';

const api = computed(useRuntime);
const today = new Date();
const todayFormatted = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

const events = computed(() => {
  return api.value?.onThisDayEvents?.(family.value.people || [], family.value.milestones || [], today) || [];
});

const iconType = (event) => {
  if (event.kind === 'Birthday') return 'birthday_party';
  if (event.kind === 'Remembrance') return 'remembrance';
  if (event.kind === 'Wedding Anniversary') return 'marriage';
  return event.type || 'other';
};

async function open(event) {
  if (event.personId || event.milestoneId) {
    const search = document.getElementById('timelineSearch');
    if (search?.value) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await nextTick();
    const entryId = event.kind === 'Birthday'
      ? 'timeline-birth-' + event.personId
      : event.kind === 'Remembrance'
      ? 'timeline-death-' + event.personId
      : 'timeline-milestone-' + event.milestoneId;
    const entry = document.getElementById(entryId);
    if (!entry) {
      api.value?.notify('This timeline entry is not available.');
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const headerHeight = document.querySelector('#app > header')?.getBoundingClientRect().height || 0;
    entry.focus({ preventScroll: true });
    window.scrollTo({
      top: Math.max(0, window.scrollY + entry.getBoundingClientRect().top - headerHeight - 24),
      behavior: reduced ? 'instant' : 'smooth'
    });
    document.querySelectorAll('.anniversary-highlight').forEach(item => item.classList.remove('anniversary-highlight'));
    entry.classList.add('anniversary-highlight');
    if (!reduced) {
      entry.animate([
        { boxShadow: '0 0 0 4px #91aa7b99' },
        { boxShadow: '0 0 0 8px #91aa7b00' },
      ], { duration: 1800, iterations: 2 });
    }
    return;
  }
  if (event.personId) {
    api.value?.showSection('people');
    api.value?.edit(event.personId);
  } else if (event.milestoneId) {
    api.value?.openMilestone(event.milestoneId);
  }
}
</script>

<template>
  <div v-if="events.length" class="on-this-day-card">
    <div class="on-this-day-heading">
      <div>
        <p class="on-this-day-eyebrow anniversaries-eyebrow">ON THIS DAY · {{ todayFormatted.toUpperCase() }}</p>
        <h2>Moments in History</h2>
      </div>
    </div>
    <div class="on-this-day-entries">
      <button
        v-for="event in events"
        :key="event.personId || event.milestoneId"
        type="button"
        class="on-this-day-item anniversary-card"
        @click="open(event)"
      >
        <span class="on-this-day-years-badge anniversary-date">
          <strong>{{ event.yearsAgo }}</strong>
          <small>{{ event.yearsAgo === 1 ? 'year' : 'years' }}<br />ago</small>
        </span>
        <span class="on-this-day-info anniversary-info">
          <span class="on-this-day-kind anniversary-kind">
            <span class="anniversary-event-icon" aria-hidden="true">
              <TimelineIcon :type="iconType(event)" :size="14" />
            </span>
            {{ event.kind }} · {{ event.year }}
          </span>
          <strong class="on-this-day-title anniversary-name">{{ event.title }}</strong>
        </span>
      </button>
    </div>
  </div>
</template>
