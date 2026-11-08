<script setup>
import {computed,ref,watch} from 'vue';
import {family,useRuntime} from '../ui/runtime.js';
import PersonAutocomplete from './PersonAutocomplete.vue';
const props=defineProps({photo:String,prefix:{type:String,default:'photoPeople'}});
const media=computed(()=>props.photo);
const picker=ref(null), draftPeople=ref([]), savingTags=ref(false), tagError=ref('');
const savedPeople=computed(() => (family.value.photoTags?.[media.value] || []).map(id => family.value.people.find(p=>p.id===id)).filter(Boolean));
const taggable=computed(()=>!!media.value && !media.value.startsWith('data:'));
function openPerson(id) {if(!savingTags.value)useRuntime().openTaggedPerson(id);}
async function updateTags(ids) {
  draftPeople.value=[...new Set(ids)];
  if(savingTags.value) return;
  const photo=media.value;
  savingTags.value=true;tagError.value='';
  try {
    // Keep accepting selections while saving; send the latest set after each request.
    while([...draftPeople.value].sort().join(',') !== savedPeople.value.map(p=>p.id).sort().join(',')) {
      await useRuntime().savePhotoPeople(photo,[...draftPeople.value]);
    }
  } catch(e){draftPeople.value=savedPeople.value.map(p=>p.id);tagError.value='Tags were not saved. ' + e.message;}
  finally{savingTags.value=false;}
}
watch(media,()=>{draftPeople.value=savedPeople.value.map(p=>p.id);tagError.value='';},{immediate:true});
watch(savedPeople,()=>{if(!savingTags.value)draftPeople.value=savedPeople.value.map(p=>p.id);});
function closeSearch(){picker.value?.close();}
defineExpose({saving:savingTags,closeSearch});
</script>
<template>
    <section v-if="media" class="lightbox-people" aria-label="People in this photo">
      <div v-if="taggable" class="lightbox-tag-editor">
        <div class="lightbox-tag-field">

          <PersonAutocomplete ref="picker" :key="media" :input-id="prefix + 'Search'" :list-id="prefix + 'Matches'" label="Find people in this photo" placeholder="Tag people" :options="()=>family.people.filter(p=>!draftPeople.includes(p.id))" :matches="useRuntime().personMatchesQuery" :display="useRuntime().displayName" keep-results clear-when-exhausted :validate-selection="false" @select="p=>updateTags([...draftPeople,p.id])" />
          <div class="lightbox-person-tags"><span v-for="id in draftPeople" :key="id" class="lightbox-person-tag"><button type="button" @click="openPerson(id)">{{ useRuntime().displayName(family.people.find(p=>p.id===id)) }}</button><button type="button" :aria-label="'Remove ' + useRuntime().displayName(family.people.find(p=>p.id===id))" @click="updateTags(draftPeople.filter(value=>value!==id))">×</button></span></div>
        </div>
        <span v-if="savingTags" class="lightbox-tag-status" role="status">Saving…</span>
        <p v-if="tagError" role="alert">{{ tagError }}</p>
      </div>
      <p v-else class="hint">Save this photo first to tag people.</p>
    </section>
</template>
