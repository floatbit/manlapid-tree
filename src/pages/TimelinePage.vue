<script setup lang="js">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { PhArrowRight } from '@phosphor-icons/vue';
import SearchField from '../components/SearchField.vue';
import TimelineEvents from '../components/TimelineEvents.vue';
import UpcomingAnniversaries from '../components/UpcomingAnniversaries.vue';
import OnThisDay from '../components/OnThisDay.vue';
const page = ref(null);
let headerObserver;
onMounted(() => {
  const header = document.querySelector('#app > header');
  if (!header) return;
  const measure = () => page.value?.style.setProperty('--timeline-header-height', header.getBoundingClientRect().height + 'px');
  measure();
  if (window.ResizeObserver) { headerObserver = new window.ResizeObserver(measure); headerObserver.observe(header); }
});
onBeforeUnmount(() => headerObserver?.disconnect());
</script>
<template>
  <main id="timeline" ref="page" hidden>
    <div class="timeline-workspace">
      <section class="timeline-main" aria-label="Family timeline">
    <div class="timeline-heading">
      <div>
        <p class="eyebrow">THE YEARS THAT CONNECT US</p>
        <h1>Our Family Timeline.</h1>
        <p>
          Every person has a beginning. Explore births, celebrations, and milestones through the
          years.
        </p>
      </div>
      <div class="timeline-actions">
        <button id="addBirthdays">Add birthdays <PhArrowRight :size="16" class="ui-icon" aria-hidden="true" /></button
        ><button id="addMilestone" class="primary">＋ Add milestone</button>
      </div>
    </div>
    <SearchField class="timeline-search"><input id="timelineSearch" type="search" aria-label="Search timeline" placeholder="Search people, events, places, or years…" /></SearchField>
    <p id="timelineSummary" class="hint" role="status"></p>
        <TimelineEvents />
      </section>
      <aside class="timeline-sidebar-stack" tabindex="0" aria-label="Family dates and upcoming anniversaries">
        <OnThisDay />
        <UpcomingAnniversaries />
      </aside>
    </div>
  </main>
</template>
