<script setup>
import { computed, ref, watch } from 'vue';
import { PhArrowRight } from '@phosphor-icons/vue';
import { family, useRuntime } from '../ui/runtime.js';
import { familyGenerationBands } from '../domain/family-view.js';
import PersonAvatar from './PersonAvatar.vue';
const props = defineProps({ group: { type: Object, required: true }, visibleIds: { type: Array, default: () => [] } });
const emit = defineEmits(['select']);
const scope = ref('immediate'), expanded = ref(false);
const api = computed(useRuntime);
watch(() => props.group.id, () => { scope.value = 'immediate'; expanded.value = false; });
watch(() => props.group.id, async () => {
  try { await api.value?.loadFamilyTimeline?.(); } catch (error) { api.value?.notify?.(error.message); }
}, { immediate:true });
watch(scope, () => { expanded.value = false; });
const ids = computed(() => {
  if (scope.value === 'immediate') return new Set([...props.group.parents, ...props.group.children, ...props.visibleIds]);
  const bands = familyGenerationBands(props.group, family.value.people, family.value.links || [], { above:'all', below:'all' });
  const result = new Set(bands.flatMap(b => b.ids));
  for (const link of family.value.links || []) if (link.type === 'spouse' && (result.has(link.a) || result.has(link.b))) { result.add(link.a); result.add(link.b); }
  return result;
});
const events = computed(() => {
  const result = [];
  for (const p of family.value.people.filter(p => ids.value.has(p.id))) {
    const birth = p.dateDetails?.birth || p.birthday;
    if (birth) result.push({id:'birth-'+p.id, date:birth, title:api.value.displayName(p)+' was born', people:[p], person:p, albumId:p.birthAlbumId});
    if (p.deceased && p.dateDetails?.death) result.push({id:'death-'+p.id,date:p.dateDetails.death,title:api.value.displayName(p)+' · In remembrance',people:[p],person:p});
  }
  for (const event of family.value.milestones || []) {
    if (!(event.participants || []).some(id => ids.value.has(id))) continue;
    result.push({...event,people:(event.participants || []).map(id => family.value.people.find(p => p.id === id)).filter(Boolean)});
  }
  return result.filter(e => api.value?.familyDateYear(e.date) != null).sort((a,b) => api.value.familyDateYear(a.date)-api.value.familyDateYear(b.date) || String(a.date).localeCompare(String(b.date)) || a.id.localeCompare(b.id));
});
const shown = computed(() => scope.value === 'all' || expanded.value ? events.value : events.value.slice(0,6));
async function open(event) {
  if (event.albumId) {
    await api.value.loadFamilyAlbums();
    const album = (family.value.albums || []).find(a => a.id === event.albumId);
    if (album?.photos?.length) { api.value.openPhotoLightbox(album.photos,0,album.title); return; }
  }
  if (event.photos?.length) api.value.openPhotoLightbox(event.photos,0,event.title);
  else if (event.person) emit('select',event.person.id);
  else api.value.openMilestone(event.id);
}
</script>
<template>
  <section class="family-mini-timeline" aria-label="Family timeline">
    <div class="family-mini-heading"><div><p class="eyebrow">THE MOMENTS THAT CONNECT US</p><h2>Through the Years</h2></div><div class="family-mini-scope" role="group" aria-label="Timeline scope"><button type="button" :aria-pressed="scope==='immediate'" @click="scope='immediate'">Immediate family</button><button type="button" :aria-pressed="scope==='all'" @click="scope='all'">All generations</button></div></div>
    <ol v-if="shown.length" class="family-mini-events"><li v-for="(event,index) in shown" :key="event.id"><time class="family-mini-year">{{index===0 || api.familyDateYear(event.date)!==api.familyDateYear(shown[index-1].date) ? api.familyDateYear(event.date) : ''}}</time><div class="family-mini-entry"><div v-if="event.people.length" class="family-mini-portraits"><button v-for="p in event.people.slice(0,2)" :key="p.id" type="button" :aria-label="'View '+api.displayName(p)" @click="emit('select',p.id)"><PersonAvatar :person="p"/></button></div><button type="button" class="family-mini-event" @click="open(event)"><strong>{{event.title}}</strong><span>{{api.familyDateLabel(event.date)}}</span><small v-if="event.photos?.length || event.albumId">View Album <PhArrowRight :size="14"/></small></button></div></li></ol>
    <p v-else class="hint">No dated moments recorded for this family yet.</p>
    <button v-if="scope==='immediate' && events.length>6" type="button" class="family-mini-more" :aria-expanded="expanded" @click="expanded=!expanded">{{expanded?'Show less':'Show more ('+(events.length-6)+')'}} <PhArrowRight :size="16"/></button>
  </section>
</template>
