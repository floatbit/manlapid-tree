<script setup lang="js">
import ViewerRelation from './ViewerRelation.vue';
import { PhArrowRight } from '@phosphor-icons/vue';
import { computed, ref } from 'vue';
import { family, timelineView, timelineQuery, useRuntime } from '../ui/runtime.js';
import PersonAvatar from './PersonAvatar.vue';
import MediaPreview from './MediaPreview.vue';
import TimelineIcon from './TimelineIcon.vue';
import { ageAtPassing } from '../ui/age.js';
const api=computed(useRuntime);
const albumDialog = ref(null), albumPerson = ref(null), selectedAlbum = ref(''), albumBusy = ref(false), albumError = ref('');
function birthAlbum(event) { return (family.value.albums || []).find(a => a.id === event.person.birthAlbumId); }
const availableAlbums = computed(() => (family.value.albums || []).filter(a => !a.milestoneId && !(family.value.people || []).some(p => p.id !== albumPerson.value?.id && p.birthAlbumId === a.id)));
async function openBirthAlbum(event) {
  albumPerson.value = event.person;
  selectedAlbum.value = event.person.birthAlbumId || '';
  albumError.value = '';
  try {
    await api.value.loadFamilyAlbums();
    albumDialog.value.showModal();
  } catch { api.value.notify('Albums could not be loaded. Please try again.'); }
}
async function saveBirthAlbum() {
  albumBusy.value = true;
  try {
    if (await api.value.attachBirthEventAlbum(albumPerson.value.id, selectedAlbum.value)) {
      albumDialog.value.close();
      api.value.notify(selectedAlbum.value ? 'Birth album attached' : 'Birth album removed');
    }
    else albumError.value = 'Album could not be attached. Please try again.';
  } finally { albumBusy.value = false; }
}
function createBirthAlbum() {
  const id = albumPerson.value.id;
  albumDialog.value.close();
  api.value.createBirthEventAlbum(id);
}
async function viewBirthAlbum(event) {
  await api.value.loadFamilyAlbums();
  const album = birthAlbum(event);
  if (album?.photos.length) api.value.openPhotoLightbox(album.photos, 0, album.title);
  else if (album) api.value.openAlbum(album.id);
}
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
            <article
              v-if="event.kind === 'birth' || event.kind === 'death'"
              class="birth-event"
              :id="'timeline-' + event.kind + '-' + event.person.id"
              :class="{ 'welcome-birth-event': event.kind === 'birth' }"
              @click="api.start(event.person.id)"
              role="link" tabindex="0"
              @keydown.enter.self="api.start(event.person.id)"
            >
              <PersonAvatar :person="event.person" /><span
                ><small>{{
                  event.kind === 'death' ? 'IN REMEMBRANCE' : 'WELCOME TO THE FAMILY'
                }}</small
                ><strong
                  >{{ api.displayName(event.person) }}
                  {{ event.kind === 'death' ? 'passed away' : 'was born' }}</strong
                ><ViewerRelation :person-id="event.person.id" /><time>{{ api.familyDateLabel(event.date) }}<template v-if="event.kind === 'death' && ageAtPassing(event.person.dateDetails?.birth || event.person.birthday, event.date)"> · {{ ageAtPassing(event.person.dateDetails?.birth || event.person.birthday, event.date) }}</template></time>
                <span v-if="event.kind === 'birth'" class="birth-album-actions" @click.stop>
                  <button v-if="event.person.birthAlbumId" type="button" @click="viewBirthAlbum(event)">View Album<span v-if="birthAlbum(event)"> · {{ birthAlbum(event).photos.length }} photos</span> <PhArrowRight :size="16" class="ui-icon" aria-hidden="true" /></button>
                  <button type="button" class="birth-album-edit" @click="openBirthAlbum(event)">{{ event.person.birthAlbumId ? 'Change Album' : 'Attach Album' }}</button>
                </span></span
              ><span class="birth-arrow" aria-hidden="true"><PhArrowRight :size="16" class="ui-icon" aria-hidden="true" /></span>
              <span class="timeline-rail-icon"><TimelineIcon :type="event.kind" /></span>
            </article>
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
            >
              <span v-if="marriagePeople(event).length === 2" class="marriage-portraits">
                <button v-for="person in marriagePeople(event)" :key="person.id" type="button" :aria-label="'Open ' + api.displayName(person) + ' in Tree'" @click="api.start(person.id)"><PersonAvatar :person="person" /></button>
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
              ><span v-else class="avatar milestone-icon"><TimelineIcon :type="event.type" :size="28" /></span
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
                ><span class="birth-arrow" aria-hidden="true"><PhArrowRight :size="16" class="ui-icon" aria-hidden="true" /></span>
              </button>
              <span class="timeline-rail-icon"><TimelineIcon :type="event.type" /></span>
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
  <dialog ref="albumDialog" class="birth-album-dialog" @cancel="albumBusy && $event.preventDefault()">
    <form @submit.prevent="saveBirthAlbum">
      <h2>Attach Birth Album</h2>
      <p>{{ albumPerson ? api.displayName(albumPerson) : '' }} — Welcome to the Family</p>
      <label>Album<select v-model="selectedAlbum" :disabled="albumBusy"><option value="">No Album</option><option v-for="album in availableAlbums" :key="album.id" :value="album.id">{{ album.title }}</option></select></label>
      <button type="button" @click="createBirthAlbum" :disabled="albumBusy">＋ Create Album with Photos</button>
      <p v-if="albumError" role="alert">{{ albumError }}</p>
      <div class="birth-album-dialog-actions"><button type="submit" class="primary" :disabled="albumBusy">{{ albumBusy ? 'Saving…' : 'Save' }}</button><button type="button" @click="albumDialog.close()" :disabled="albumBusy">Cancel</button></div>
    </form>
  </dialog>
</template>
