<script setup lang="js">
import {showWorldEvents} from '../ui/timeline-history.js';
import {openMobileSidebar} from '../ui/mobile-sidebar.js';
import {timelinePeriod,useRuntime} from '../ui/runtime.js';
import MobileSidebar from '../components/MobileSidebar.vue';
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { PhArrowRight } from '@phosphor-icons/vue';
import SearchField from '../components/SearchField.vue';
import TimelineEvents from '../components/TimelineEvents.vue';
import UpcomingAnniversaries from '../components/UpcomingAnniversaries.vue';
import OnThisDay from '../components/OnThisDay.vue';
const page = ref(null),timelinePanel=ref('anniversaries');
function openDates(panel){timelinePanel.value=panel;openMobileSidebar('timeline');}
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
        <button id="addBirthdays">Add birthdays <PhArrowRight :size="16" class="arrow-link-icon ui-icon" aria-hidden="true" /></button
        ><button id="addMilestone" class="primary">＋ Add milestone</button>
      </div>
    </div>
    <div class="timeline-mobile-date-actions">
      <button type="button" @click="openDates('history')">Moments in History</button>
      <button type="button" @click="openDates('anniversaries')">Dates to Remember</button>
    </div>
    <SearchField class="timeline-search"><input id="timelineSearch" type="search" aria-label="Search timeline" placeholder="Search people, events, places, or years…" /></SearchField>
    <label class="timeline-history-toggle"><input type="checkbox" v-model="showWorldEvents" aria-controls="timelineEvents" /><span>Show world events</span></label>
    <p v-if="showWorldEvents" class="timeline-history-hint">Selected world and Philippine landmarks from the same calendar year, limited to two per decade. These notes provide context, not an exact date match to a family milestone.</p>
    <p v-if="timelinePeriod" class="timeline-period"><strong>{{timelinePeriod.from}}–{{timelinePeriod.to}}</strong> <button type="button" @click="useRuntime().clearInsightTimelinePeriod()">Show all years</button></p>
    <p id="timelineSummary" class="hint" role="status"></p>
        <TimelineEvents />
      </section>
      <MobileSidebar sidebar-key="timeline" label="Timeline details"><aside :data-mobile-view="timelinePanel" class="timeline-sidebar-stack" tabindex="0" aria-label="Family dates and upcoming anniversaries">
        <OnThisDay show-empty />
        <UpcomingAnniversaries force-open />
      </aside></MobileSidebar>
    </div>
  </main>
</template>
