<script setup lang="js">
import { PhArrowRight } from '@phosphor-icons/vue';
import SearchField from '../components/SearchField.vue';
import TimelineEvents from '../components/TimelineEvents.vue';
import UpcomingAnniversaries from '../components/UpcomingAnniversaries.vue';
</script>
<template>
  <main id="timeline" hidden>
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
    <div class="timeline-columns">
      <TimelineEvents />
      <UpcomingAnniversaries />
    </div>
  </main>
</template>
