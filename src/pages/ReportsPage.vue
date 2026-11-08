<script setup lang="js">
import { computed, nextTick, ref, watch } from 'vue';
import { family, activePage, useRuntime } from '../ui/runtime.js';
import { overviewGenerations } from '../domain/reports.js';
import PhotoPeopleTags from '../components/PhotoPeopleTags.vue';
import MediaPreview from '../components/MediaPreview.vue';
const api = computed(useRuntime);
const randomPhotoTagger=ref(null), randomPhoto=ref(null), randomPhotoError=ref(''), loadingRandomPhoto=ref(false);
let photoVisit=0, previousRandomPhoto=null;
async function photoKeyboard(event) {
  const typing=event.target.closest('input,textarea,[contenteditable=true]');
  if(event.key==='Escape' && typing) {
    event.preventDefault();event.stopPropagation();
    randomPhotoTagger.value?.closeSearch();
    event.target.blur();event.currentTarget.focus({preventScroll:true});
  } else if(event.key==='ArrowRight' && !typing && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && !loadingRandomPhoto.value) {
    event.preventDefault();event.stopPropagation();
    await chooseRandomPhoto();await nextTick();
    document.getElementById('reportPhotoPeopleSearch')?.focus({preventScroll:true});
  }
}
async function chooseRandomPhoto() {
  if(randomPhotoTagger.value?.saving)return;
  const visit=++photoVisit;
  loadingRandomPhoto.value=true;randomPhotoError.value='';randomPhoto.value=null;
  try {
    await api.value?.loadFamilyAlbums?.();
    if(visit!==photoVisit || activePage.value!=='overview')return;
    const unique=new Map();
    for(const album of family.value.albums || []) for(const photo of album.photos || []) {
      if(!/\.(mp4|mov)$/i.test(photo) && !photo.startsWith('data:') && !(family.value.photoTags?.[photo]?.length))unique.set(photo,{photo,album});
    }
    const available=[...unique.values()];
    const choices=available.length>1 ? available.filter(item=>item.photo!==previousRandomPhoto) : available;
    randomPhoto.value=choices[Math.floor(Math.random()*choices.length)] || null;
    previousRandomPhoto=randomPhoto.value?.photo || null;
  } catch(e){if(visit===photoVisit)randomPhotoError.value=e.message;}
  finally{if(visit===photoVisit)loadingRandomPhoto.value=false;}
}
watch(activePage,page=>{if(page==='overview')chooseRandomPhoto();else photoVisit++;},{immediate:true});
watch(()=>family.value.albums,()=>{if(activePage.value==='overview' && randomPhoto.value && !(family.value.albums || []).some(a=>a.photos?.includes(randomPhoto.value.photo)))chooseRandomPhoto();});
const people = computed(() => family.value.people);
const albums = computed(() => family.value.albums || []);
const milestones = computed(() => family.value.milestones || []);
const located = computed(() => people.value.filter((p) => p.location?.trim()));
const locations = computed(() => {
  const counts = new Map();
  for (const p of located.value) counts.set(p.location.trim(), (counts.get(p.location.trim()) || 0) + 1);
  return [...counts].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]));
});
const stats = computed(() => [
  [people.value.length, 'People', 'people'],
  [overviewGenerations(people.value, family.value.links), 'Known Generations', 'tree'],
  [locations.value.length, 'Current Locations', 'map'],
  [milestones.value.length, 'Milestones', 'timeline'],
  [albums.value.length, 'Albums', 'albums'],
  [albums.value.reduce((sum,a) => sum + (a.photos || []).length, 0), 'Album Photos & Videos', 'albums'],
]);
const upcoming = computed(() => api.value?.upcomingAnniversaries(people.value, milestones.value).slice(0,5) || []);
const recent = computed(() => [...milestones.value].filter((m) => m.date).sort((a,b) => b.date.localeCompare(a.date)).slice(0,4));
const recentAlbums = computed(() => api.value?.sortedAlbums([...albums.value]).slice(0,4) || []);
const reports = computed(() => {
  const connected = new Set(family.value.links.flatMap((link) => [link.a, link.b]));
  return [
    ['No Birthday','birthday',p => !(p.dateDetails?.birth || p.birthday) || p.dateDetails?.birth === 'Date unknown'],
    ['No Birthplace','birthplace',p => !p.birthplace?.location?.trim()],
    ['No Current Location','location',p => !p.location?.trim()],
    ['Missing Headshots','photo',p => !p.photo?.trim()],
    ['No Connections','connections',p => !connected.has(p.id)],
  ].map(([title,kind,filter]) => ({title,kind, people:people.value.filter(filter).sort((a,b)=>a.name.localeCompare(b.name))}));
});
function editPerson(p, kind) {
  api.value.showSection('people'); api.value.selectPersonFromDirectory(p.id);
  if (kind === 'birthday') document.querySelector('#birthday').focus({preventScroll:true});
}
function milestone(event) { api.value.showSection('timeline'); api.value.openMilestone(event.id); }
function openUpcoming(event) { if(event.personId) editPerson({id:event.personId}); else milestone({id:event.milestoneId}); }
function album(item) {
  if(item.photos?.length) api.value.openPhotoLightbox(item.photos,0,item.title);
  else api.value.notify('This album has no photos or videos yet.');
}
</script>
<template>
  <main id="overviewPage" hidden>
    <div class="intro">
      <div>
        <p class="eyebrow">OUR FAMILY AT A GLANCE</p>
        <h1>Family Reports</h1>
        <p>
          Explore our family, upcoming anniversaries, shared memories, and the details still to
          discover.
        </p>
      </div>
    </div>
    <div id="overviewSummary">
      <div class="overview-stats">
        <button
          v-for="[count, label, page] in stats"
          :key="page + label"
          type="button"
          @click="api.showSection(page)"
        >
          <strong>{{ count }}</strong
          ><span>{{ label }}</span>
        </button>
      </div>
      <section id="reportRandomPhoto" class="report-random-photo" tabindex="-1" @keydown.capture="photoKeyboard">
        <div class="report-photo-heading"><div><h2>Who’s in This Photo?</h2><p class="hint">Help identify people in an untagged family photo.</p></div><div class="report-photo-actions"><span v-if="randomPhoto">{{ randomPhoto.album.title }}</span><button type="button" :disabled="loadingRandomPhoto || randomPhotoTagger?.saving" @click="chooseRandomPhoto">Load Another Photo ↻</button></div></div>
        <p v-if="loadingRandomPhoto" role="status">Loading a photo…</p>
        <p v-else-if="randomPhotoError" role="alert">{{ randomPhotoError }}</p>
        <template v-else-if="randomPhoto"><PhotoPeopleTags ref="randomPhotoTagger" :key="randomPhoto.photo" :photo="randomPhoto.photo" prefix="reportPhotoPeople" /><button class="report-random-image" type="button" aria-label="Open photo in lightbox" @click="api.openPhotoLightbox(randomPhoto.album.photos,randomPhoto.album.photos.indexOf(randomPhoto.photo),randomPhoto.album.title)"><img :src="randomPhoto.photo" :alt="randomPhoto.album.title" /></button></template>
        <p v-else>No untagged photos available.</p>
      </section>
      <h2>Missing Details</h2>
      <div id="overviewReports" class="overview-reports">
        <section v-for="report in reports" :key="report.kind" class="directory-missing">
          <h3>
            {{ report.title }} <span>{{ report.people.length }}</span>
          </h3>
          <div class="directory-missing-list">
            <button
              v-for="p in report.people"
              :key="p.id"
              type="button"
              @click="editPerson(p, report.kind)"
            >
              {{ api?.displayName(p) || p.name }} ↗
            </button>
            <p v-if="!report.people.length">Everyone is up to date.</p>
          </div>
        </section>
      </div>
      <div class="overview-panels">
        <section>
          <h2>Upcoming Anniversaries</h2>
          <p class="hint">Next 90 days · Dates with a known month and day</p>
          <button
            v-for="event in upcoming"
            :key="event.personId || event.milestoneId"
            class="overview-item"
            type="button"
            @click="openUpcoming(event)"
          >
            <small
              >{{ event.kind }} · {{ event.days ? 'In ' + event.days + ' days' : 'Today' }}</small
            ><strong>{{ event.title }}</strong
            ><span>{{
              event.next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
            }}</span>
          </button>
          <p v-if="!upcoming.length">No upcoming anniversaries with known dates.</p>
          <button type="button" @click="api.showSection('timeline')">View Timeline ↗</button>
        </section>
        <section>
          <h2>Family Locations</h2>
          <p class="hint">
            {{ located.length }} of {{ people.length }} people have a current location
          </p>
          <button
            v-for="[name, count] in locations.slice(0, 6)"
            :key="name"
            class="overview-item"
            type="button"
            @click="api.showSection('map')"
          >
            <strong>{{ name }}</strong
            ><span>{{ count }} {{ count === 1 ? 'person' : 'people' }}</span>
          </button>
          <p v-if="!locations.length">Add current locations to explore your family on the map.</p>
          <button type="button" @click="api.showSection('map')">Explore Map ↗</button>
        </section>
        <section>
          <h2>Latest Milestones</h2>
          <p class="hint">Most recent event dates</p>
          <button
            v-for="event in recent"
            :key="event.id"
            class="overview-item"
            type="button"
            @click="milestone(event)"
          >
            <strong>{{ event.title }}</strong
            ><span>{{ api.familyDateLabel(event.date) }}</span>
          </button>
          <p v-if="!recent.length">No dated milestones yet.</p>
          <button type="button" @click="api.showSection('timeline')">View Timeline ↗</button>
        </section>
        <section>
          <h2>Latest Albums</h2>
          <p class="hint">Newest album dates first</p>
          <button
            v-for="item in recentAlbums"
            :key="item.id"
            class="overview-item overview-album"
            type="button"
            @click="album(item)"
          >
            <MediaPreview
              v-if="item.photos?.length"
              :src="item.photos[0]"
              :alt="item.title"
              class-name="overview-thumb"
            /><span
              ><strong>{{ item.title }}</strong
              ><small
                >{{ item.date ? api.familyDateLabel(item.date) + ' · ' : ''
                }}{{ item.photos?.length || 0 }} photos and videos</small
              ></span
            >
          </button>
          <p v-if="!recentAlbums.length">No albums yet.</p>
          <button type="button" @click="api.showSection('albums')">View Albums ↗</button>
        </section>
      </div>
    </div>
  </main>
</template>
