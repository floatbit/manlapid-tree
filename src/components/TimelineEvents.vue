<script setup lang="js">
import { computed } from 'vue';
import { family, timelineView, timelineQuery, useRuntime } from '../ui/runtime.js';
import PersonAvatar from './PersonAvatar.vue';
import MediaPreview from './MediaPreview.vue';
import { ageAtPassing } from '../ui/age.js';
const api=computed(useRuntime);
const years=computed(()=>{
 const groups=new Map();
 for(const event of timelineView.value){const year=api.value.familyDateYear(event.date) || 'Date Unknown';if(!groups.has(year))groups.set(year,[]);groups.get(year).push(event);}
 return [...groups];
});
function yearGap(index) {
  const current = years.value[index]?.[0], previous = years.value[index - 1]?.[0];
  return typeof current === 'number' && typeof previous === 'number' ? current - previous : 0;
}
function names(event) {return (event.participants || []).map((id)=>family.value.people.find((p)=>p.id === id)).filter(Boolean).map((p)=>api.value.displayName(p)).join(', ');}
function marriagePeople(event) {
  return event.type === 'marriage'
    ? (event.participants || []).map(id => family.value.people.find(p => p.id === id)).filter(Boolean).slice(0, 2)
    : [];
}
</script>
<template>
  <div id="timelineEvents">
    <template v-for="([year, items], index) in years" :key="year">
      <div v-if="yearGap(index) > 1" class="timeline-year-gap">
        <span>{{ yearGap(index) }} years later</span>
      </div>
      <section class="birth-year" :aria-label="'Family events in ' + year">
        <h2>{{ year }}</h2>
        <div class="birth-cards">
          <template v-for="event in items" :key="event.id">
            <button
              v-if="event.kind === 'birth' || event.kind === 'death'"
              class="birth-event"
              :id="event.kind === 'birth' ? 'timeline-birth-' + event.person.id : undefined"
              :data-timeline-icon="event.kind === 'birth' ? '🌱' : '🕯️'"
              :class="{ 'welcome-birth-event': event.kind === 'birth' }"
              @click="api.start(event.person.id)"
            >
              <PersonAvatar :person="event.person" /><span
                ><small>{{
                  event.kind === 'death' ? 'IN REMEMBRANCE' : 'WELCOME TO THE FAMILY'
                }}</small
                ><strong
                  >{{ api.displayName(event.person) }}
                  {{ event.kind === 'death' ? 'passed away' : 'was born' }}</strong
                ><time>{{ api.familyDateLabel(event.date) }}<template v-if="event.kind === 'death' && ageAtPassing(event.person.dateDetails?.birth || event.person.birthday, event.date)"> · {{ ageAtPassing(event.person.dateDetails?.birth || event.person.birthday, event.date) }}</template></time></span
              ><span class="birth-arrow" aria-hidden="true">↗</span>
            </button>
            <article
              v-else
              class="birth-event milestone-event"
              :id="'timeline-milestone-' + event.id"
              tabindex="-1"
              :class="{
                'marriage-event': event.type === 'marriage',
                'easter-event': event.type === 'easter',
                'birthday-party-event': event.type === 'birthday_party',
                'smaller-holiday-icon': [
                  'thanksgiving',
                  'christmas',
                  'easter',
                  'halloween',
                ].includes(event.type),
              }"
              :data-timeline-icon="api.milestoneIcons[event.type] || '★'"
            >
              <span v-if="marriagePeople(event).length === 2" class="marriage-portraits">
                <PersonAvatar v-for="person in marriagePeople(event)" :key="person.id" :person="person" />
              </span>
              <button
                v-else-if="event.photos?.length"
                class="milestone-gallery"
                :aria-label="`View ${event.photos.length} media items from ${event.title}`"
                @click="api.openPhotoLightbox(event.photos, 0, event.title)"
              >
                <MediaPreview
                  :src="event.photos[0]"
                  class-name="avatar milestone-cover"
                  :alt="event.title"
                /></button
              ><span v-else class="avatar milestone-icon">{{
                api.milestoneIcons[event.type] || '★'
              }}</span
              ><button class="milestone-details" @click="api.openMilestone(event.id)">
                <span
                  ><strong>{{ event.title }}</strong
                  ><time :datetime="event.date"
                    >{{ api.familyDateLabel(event.date)
                    }}{{ event.location ? ' · ' + event.location : '' }}</time
                  ><span v-if="names(event)" class="milestone-people">{{ names(event) }}</span
                  ><span v-if="event.photos?.length" class="milestone-photo-count"
                    >▧ {{ api.milestoneMediaCount(event.photos) }}</span
                  ></span
                ><span class="birth-arrow" aria-hidden="true">↗</span>
              </button>
            </article>
          </template>
        </div>
      </section>
    </template>
    <div v-if="!years.length" class="timeline-empty">
      <span>✳</span>
      <h2>{{ timelineQuery ? 'No Matching Events.' : 'A Lifetime of Stories Starts Here.' }}</h2>
      <p>{{ timelineQuery ? 'Try another name, event, place, or year.' : 'Add birthdays in People or record your first family milestone.' }}</p>
    </div>
  </div>
</template>
