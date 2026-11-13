<script setup>
import { computed, ref } from 'vue';
import { PhUploadSimple } from '@phosphor-icons/vue';
import PersonAvatar from './PersonAvatar.vue';
import { family, canEdit, useRuntime } from '../ui/runtime.js';
const api=computed(useRuntime), drafts=ref({}), dragging=ref(''), locationIds=ref([]), locationKind=ref('current'), saving=ref(false), message=ref(''), error=ref('');
const display=p=>api.value?.displayName(p) || p.name;
const nameParts=p=>{const words=(p.name || '').trim().split(/\s+/);return {last:p.lastName || words.at(-1) || '',first:p.firstName || words[0] || ''};};
const nameOrder=(a,b)=>nameParts(a).last.localeCompare(nameParts(b).last,undefined,{sensitivity:'base'}) || nameParts(a).first.localeCompare(nameParts(b).first,undefined,{sensitivity:'base'}) || display(a).localeCompare(display(b));
const missingDate=value=>!value || value==='Date unknown';
const dateRows=computed(()=>family.value.people.filter(p=>missingDate(p.dateDetails?.birth || p.birthday)).sort(nameOrder).map(p=>({id:p.id,kind:'birth',name:display(p)})));
const key=r=>r.kind+':'+r.id;
const isMapped=p=>!!p.location?.trim() && p.locationLat!==null && p.locationLat!==undefined && p.locationLng!==null && p.locationLng!==undefined && Number.isFinite(Number(p.locationLat)) && Number.isFinite(Number(p.locationLng));
const unmapped=computed(()=>family.value.people.filter(p=>locationKind.value==='birthplace'?!p.birthplace?.location:!isMapped(p)).sort(nameOrder));
const disconnected=computed(()=>{const linked=new Set(family.value.links.flatMap(l=>[l.a,l.b]));return family.value.people.filter(p=>!linked.has(p.id));});
function editPerson(p){api.value.showSection('people');api.value.selectPersonFromDirectory(p.id);}
const portraits=computed(()=>family.value.people.filter(p=>!p.photo).sort(nameOrder));
async function saveDates(){
 error.value='';message.value='';const updates=dateRows.value.filter(r=>drafts.value[key(r)]?.trim()).map(r=>({...r,value:drafts.value[key(r)].trim()}));
 if(!updates.length){error.value='Enter at least one date.';return;}
 saving.value=true;
 try{await api.value.saveContributionUpdates(updates);for(const r of updates)delete drafts.value[key(r)];message.value=updates.length+' dates saved.';}catch(e){error.value=e.message;}finally{saving.value=false;}
}
async function assignLocations(){error.value='';try{await api.value.openContributionLocation(locationKind.value,locationIds.value);locationIds.value=[];}catch(e){error.value=e.message;}}
async function uploadFile(p,file){
 if(!file || !canEdit.value || saving.value)return;
 error.value='';message.value='';saving.value=true;
 try{if(!file.type.startsWith('image/') || file.size>20000000)throw new Error('Choose an image under 20 MB.');const photo=await api.value.resizePhoto(file);await api.value.saveContributionUpdates([{id:p.id,kind:'portrait',value:photo}]);message.value='Portrait saved for '+display(p)+'.';}catch(e){error.value=e.message;}finally{saving.value=false;}
}
async function upload(p,event){await uploadFile(p,event.target.files?.[0]);event.target.value='';}
function dragOver(p,event){if(!canEdit.value || saving.value)return;if(Array.from(event.dataTransfer?.types || []).includes('Files')){event.preventDefault();dragging.value=p.id;event.dataTransfer.dropEffect='copy';}}
async function dropPortrait(p,event){event.preventDefault();dragging.value='';if(event.dataTransfer?.files?.length>1){error.value='Drop one portrait at a time.';return;}await uploadFile(p,event.dataTransfer?.files?.[0]);}
</script>
<template>
<section class="contribution-queues">
  <h2>Fill the Gaps Together</h2>
  <p v-if="!canEdit">Log in to add dates, assign Google locations, and upload portraits.</p>
  <p v-if="error" role="alert" class="contribution-error">{{error}}</p><p v-if="message" role="status">{{message}}</p>
  <div class="contribution-queue-grid">
    <section><h3>Missing Birthdays</h3><p>Enter several dates, then save together. Years and “About 1940” are welcome; exact dates use YYYY-MM-DD.</p>
      <form @submit.prevent="saveDates"><div class="contribution-date-group"><label v-for="r in dateRows" :key="key(r)" class="contribution-date-row"><span>{{r.name}}<small>Birth Date</small></span><input :aria-label="r.name+' birth date'" v-model="drafts[key(r)]" :disabled="!canEdit || saving" placeholder="YYYY-MM-DD or year" /></label></div><p v-if="!dateRows.length">Everyone has a birth date recorded.</p><button v-if="canEdit && dateRows.length" type="submit" class="primary" :disabled="saving">{{saving?'Saving…':'Save Dates'}}</button></form>
    </section>
    <section><h3>Unmapped Locations</h3><p>Select relatives, then choose one Google city or address for everyone selected.</p><label>Location to Fill<select v-model="locationKind" @change="locationIds=[]"><option value="current">Current Location</option><option value="birthplace">Birthplace</option></select></label>
      <div class="contribution-location-list"><label v-for="p in unmapped" :key="p.id"><input type="checkbox" :value="p.id" v-model="locationIds" :disabled="!canEdit || saving" /><span>{{display(p)}}</span></label></div><p v-if="!unmapped.length">Everyone has this location recorded.</p><button v-if="canEdit" type="button" :disabled="!locationIds.length || saving" @click="assignLocations">Set Google Location ({{locationIds.length}})</button>
    </section>
    <section class="contribution-portraits"><h3>Missing Headshots · Profile Photo Roll Call <span>{{portraits.length}}</span></h3><p>Give these initials a face. Drop a portrait onto a person’s card, or choose a file. Portraits save immediately.</p><div class="contribution-portrait-grid"><article v-for="p in portraits" :key="p.id" :class="{'portrait-dragging':dragging===p.id}" @dragover="dragOver(p,$event)" @dragleave="!$event.currentTarget.contains($event.relatedTarget) && (dragging='')" @drop="dropPortrait(p,$event)"><PersonAvatar :person="p"/><strong>{{display(p)}}</strong><label v-if="canEdit" class="portrait-upload"><PhUploadSimple :size="16"/> Upload Portrait<input type="file" accept="image/*" :disabled="saving" :aria-label="'Upload portrait for '+display(p)" @change="upload(p,$event)" /></label></article></div><p v-if="!portraits.length">Everyone has a portrait.</p></section>
    <section class="directory-missing"><h3>No Connections <span>{{disconnected.length}}</span></h3><div class="directory-missing-list"><button v-for="p in disconnected" :key="p.id" type="button" @click="editPerson(p)">{{display(p)}}</button><p v-if="!disconnected.length">Everyone has a connection.</p></div></section>
  </div>
</section>
</template>
