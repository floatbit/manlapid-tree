<script setup>
import { computed } from 'vue';
import { PhArrowRight } from '@phosphor-icons/vue';
import { family, canEdit, useRuntime } from '../ui/runtime.js';
import PersonAvatar from './PersonAvatar.vue';
import PersonPhotos from './PersonPhotos.vue';
import ViewerRelation from './ViewerRelation.vue';
const props=defineProps({person:{type:Object,required:true}});
const emit=defineEmits(['select','tree']);
const api=computed(useRuntime);
const relatives=computed(()=>{family.value.links;return api.value?.connections?.(props.person.id) || [];});
const groups=computed(()=>[['parent','Parents'],['sibling','Siblings'],['spouse','Spouse'],['child','Children']].map(([type,title])=>({title,members:relatives.value.filter(r=>r.type===type).map(r=>family.value.people.find(p=>p.id===r.id)).filter(Boolean)})).filter(g=>g.members.length));
const stops=computed(()=>api.value?.migrationStopsForPerson?.(props.person) || []);
const birth=computed(()=>props.person.dateDetails?.birth || props.person.birthday);
const age=computed(()=>{if(props.person.deceased || !/^\d{4}-\d{2}-\d{2}$/.test(birth.value || ''))return null;const [y,m,d]=birth.value.split('-').map(Number),today=new Date();const years=today.getFullYear()-y-(today.getMonth()+1<m || (today.getMonth()+1===m && today.getDate()<d)?1:0);return years>=0?years:null;});
const display=p=>api.value?.displayName(p) || p.name;
function edit(){api.value.showSection('people');api.value.selectPersonFromDirectory(props.person.id);}
</script>
<template>
<div class="insights-person-details">
  <div class="map-profile-header"><PersonAvatar :person="person"/><div><h2>{{person.name}}</h2><span v-if="person.deceased" class="deceased-badge">Deceased</span><span v-else-if="age!==null" class="map-profile-age">{{age}} years old</span><p v-if="birth">Born · {{api.familyDateLabel(birth)}}</p><p v-if="person.deceased && person.dateDetails?.death">Died · {{api.familyDateLabel(person.dateDetails.death)}}</p><ViewerRelation :person-id="person.id"/></div></div>
  <p v-if="person.nicknames?.length" class="hint">Also known as: {{person.nicknames.join(', ')}}</p>
  <div class="map-profile-actions"><button v-if="canEdit" type="button" @click="edit">Edit Person <PhArrowRight :size="14"/></button><button type="button" @click="api.copyDirectLink({person:person.id})">Copy Person Link <PhArrowRight :size="14"/></button></div>
  <section class="map-profile-family"><h3>Family Connections <span>{{relatives.length}}</span></h3><section v-for="group in groups" :key="group.title" class="map-profile-family-group"><h4>{{group.title}} <span>{{group.members.length}}</span></h4><button v-for="p in group.members" :key="p.id" type="button" class="connection map-profile-relative" @click="emit('select',p)"><PersonAvatar :person="p"/><span><strong>{{display(p)}}</strong><ViewerRelation :person-id="p.id"/></span><PhArrowRight :size="16" class="map-profile-arrow"/></button></section><p v-if="!relatives.length" class="hint">No connections added yet.</p></section>
  <section class="map-profile-locations tree-location-history"><h3>Locations</h3><p v-if="!stops.length" class="hint">No places recorded yet.</p><ol class="migration-stops"><li v-for="(stop,index) in stops" :key="stop.id || index"><button type="button" @click="api.openPersonPlaces(person.id,index)"><strong>{{api.locationStopLabel(stop)}}</strong><span>{{stop.location}}</span></button></li></ol><button v-if="stops.length" type="button" class="insight-places-link" @click="api.openPersonPlaces(person.id)">View Places Lived <PhArrowRight :size="14"/></button></section>
  <PersonPhotos :person-id="person.id" in-sidebar/>
  <section v-if="person.bio?.trim()" class="map-profile-story"><h3>About</h3><p>{{person.bio}}</p></section>
  <button type="button" @click="emit('tree',person)">Open Family Tree <PhArrowRight :size="16"/></button>
  <section v-if="canEdit" class="tree-profile-add"><h3>Add to {{person.firstName || person.name.split(/\s+/)[0]}}’s Family</h3><div class="quick-add"><button v-for="type in ['parent','sibling','spouse','child']" :key="type" type="button" @click="api.openFamilyDialog(person.id,type)">＋ Add {{type}}</button></div></section>
</div>
</template>
