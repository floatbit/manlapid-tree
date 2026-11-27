<script setup>
import { computed, ref, watch } from 'vue';
import { family, useRuntime } from '../ui/runtime.js';
import { familyGenerationBands } from '../domain/family-view.js';
import TimelineIcon from './TimelineIcon.vue';
import PersonAvatar from './PersonAvatar.vue';
const props = defineProps({ group: { type: Object, required: true }, visibleIds: { type: Array, default: () => [] } });
const emit = defineEmits(['select']);
const scope = ref('immediate'), hovered = ref(null), hoverYear = ref(null);
const api = computed(useRuntime);
watch(() => props.group.id, () => { scope.value = 'immediate'; hovered.value = null; });
watch(() => props.group.id, async () => {
  try { await api.value?.loadFamilyTimeline?.(); } catch (error) { api.value?.notify?.(error.message); }
}, { immediate:true });
watch(scope, () => { hovered.value = null; hoverYear.value = null; });
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
    if (birth) result.push({id:'birth-'+p.id, type:'birth', date:birth, title:api.value.displayName(p)+' was born', people:[p], person:p, albumId:p.birthAlbumId});
    if (p.deceased && p.dateDetails?.death) result.push({id:'death-'+p.id,type:'death',date:p.dateDetails.death,title:api.value.displayName(p)+' · In remembrance',people:[p],person:p});
  }
  for (const event of family.value.milestones || []) {
    if (!(event.participants || []).some(id => ids.value.has(id))) continue;
    result.push({...event,people:(event.participants || []).map(id => family.value.people.find(p => p.id === id)).filter(Boolean)});
  }
  return result.filter(e => api.value?.familyDateYear(e.date) != null).sort((a,b) => api.value.familyDateYear(a.date)-api.value.familyDateYear(b.date) || String(a.date).localeCompare(String(b.date)) || a.id.localeCompare(b.id));
});
const chart = computed(() => {
  if (!events.value.length) return {points:[],ticks:[],height:180,width:640};
  const years=events.value.map(e=>api.value.familyDateYear(e.date));
  const first=Math.min(...years), last=Math.max(...years), span=Math.max(1,last-first);
  const width=Math.max(640,Math.min(1200,events.value.length*18));
  const lanes=[];
  const points=events.value.map((event,index)=>{
    const year=years[index], x=36+(year-first)/span*(width-72);
    let lane=lanes.findIndex(previous=>x-previous>=68);
    if(lane<0) lane=lanes.length;
    lanes[lane]=x;
    return {event,year,x,lane};
  });
  const step=span>100?50:span>40?20:span>15?10:span>5?5:1;
  const ticks=[first];
  for(let year=Math.ceil(first/step)*step;year<last;year+=step) if(year>first && year-first>span*.07 && last-year>span*.07) ticks.push(year);
  if(last!==first) ticks.push(last);
  return {points,ticks:ticks.map(year=>({year,x:36+(year-first)/span*(width-72)})),width,height:Math.max(180,lanes.length*68+90),first,last};
});
function trackYear(event) {
  const rect=event.currentTarget.getBoundingClientRect();
  const fraction=Math.max(0,Math.min(1,((event.clientX-rect.left)/rect.width*chart.value.width-36)/(chart.value.width-72)));
  hoverYear.value=Math.round(chart.value.first+fraction*(chart.value.last-chart.value.first));
}
const yearX=computed(()=>36+(hoverYear.value-chart.value.first)/Math.max(1,chart.value.last-chart.value.first)*(chart.value.width-72));
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
    <div v-if="events.length" class="family-years-scroll">
      <div class="family-years-chart" :style="{minWidth:chart.width+'px',height:chart.height+'px'}" @pointermove="trackYear" @pointerleave="hoverYear=null;hovered=null">
        <div v-for="tick in chart.ticks" :key="tick.year" class="family-years-tick" :class="{ 'is-near-cursor': hoverYear!==null && Math.abs(tick.x-yearX)<40 }" :style="{left:(tick.x/chart.width*100)+'%'}"><span>{{tick.year}}</span><span>{{tick.year}}</span></div>
        <div v-if="hoverYear!==null" class="family-years-cursor" :style="{left:(yearX/chart.width*100)+'%'}"><span>{{hoverYear}}</span><span>{{hoverYear}}</span></div>
        <button v-for="point in chart.points" :key="point.event.id" type="button" class="family-year-event" :class="{'is-matching':hoverYear===point.year,'is-couple':point.event.type==='marriage' && point.event.people?.length>1}" :style="{left:(point.x/chart.width*100)+'%',bottom:(42+point.lane*68)+'px'}" :title="api.familyDateLabel(point.event.date)+' — '+point.event.title" :aria-label="api.familyDateLabel(point.event.date)+' — '+point.event.title" @mouseenter="hovered=point.event" @focus="hovered=point.event;hoverYear=point.year" @blur="hovered=null;hoverYear=null" @click="open(point.event)"><span v-if="point.event.type==='marriage' && point.event.people?.length>1" class="family-year-couple"><PersonAvatar v-for="person in point.event.people.slice(0,2)" :key="person.id" :person="person" /></span><PersonAvatar v-else-if="point.event.people?.length" :person="point.event.people[0]" /><TimelineIcon v-else :type="point.event.type" :size="26" /><span v-if="point.event.people?.length" class="family-year-icon-badge"><TimelineIcon :type="point.event.type" :size="14" /></span></button>
      </div>
    </div>
    <p v-else class="hint">No dated moments recorded for this family yet.</p>
    <div v-if="events.length" class="family-years-details">
      <div v-for="event in events" :key="event.id" class="family-years-preview" :class="{'is-visible':hovered?.id===event.id}" :aria-hidden="hovered?.id!==event.id"><strong>{{event.title}}</strong><span>{{api.familyDateLabel(event.date)}}</span></div>
      <p class="hint family-years-help" :class="{'is-visible':!hovered}" :aria-hidden="!!hovered">{{events.length}} moments · Hover or focus an icon for details. Select it to view the person, milestone, or photos.</p>
    </div>
  </section>
</template>
