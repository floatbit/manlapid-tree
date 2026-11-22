<script setup>
import {computed,ref,watch} from 'vue';
import {family,useRuntime,canEdit} from '../ui/runtime.js';
import {recentPhotoTags,rememberPhotoTags} from '../ui/recent-photo-tags.js';
import PersonAvatar from './PersonAvatar.vue';
import PersonAutocomplete from './PersonAutocomplete.vue';
const props=defineProps({beforeNavigate:Function,photo:String,showRecent:Boolean,selectedTagsTarget:String,prefix:{type:String,default:'photoPeople'}});
const media=computed(()=>props.photo);
const picker=ref(null), draftPeople=ref([]), savingTags=ref(false), tagError=ref('');
const recentPeople=computed(()=>recentPhotoTags.value.map(id=>family.value.people.find(p=>p.id===id)).filter(Boolean).sort((a,b)=>useRuntime().displayName(a).localeCompare(useRuntime().displayName(b),undefined,{sensitivity:'base'})));
const savedPeople=computed(() => (family.value.photoTags?.[media.value] || []).map(id => family.value.people.find(p=>p.id===id)).filter(Boolean));
const taggable=computed(()=>!!media.value && !media.value.startsWith('data:'));
function openPerson(id) {if(props.beforeNavigate && !props.beforeNavigate())return;if(!savingTags.value)useRuntime().openTaggedPerson(id);}
async function updateTags(ids) {
  draftPeople.value=[...new Set(ids)];
  if(savingTags.value) return;
  const photo=media.value;
  savingTags.value=true;tagError.value='';
  try {
    // Keep accepting selections while saving; send the latest set after each request.
    while([...draftPeople.value].sort().join(',') !== savedPeople.value.map(p=>p.id).sort().join(',')) {
      const snapshot=[...draftPeople.value];
      const added=snapshot.filter(id=>!savedPeople.value.some(p=>p.id===id));
      await useRuntime().savePhotoPeople(photo,snapshot);
      rememberPhotoTags(added);
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
          <div class="photo-tag-primary">
          <h3 v-if="showRecent && canEdit" class="photo-tag-heading">Tag People</h3>

          <PersonAutocomplete v-if="canEdit" ref="picker" :key="media" :input-id="prefix + 'Search'" :list-id="prefix + 'Matches'" label="Find people in this photo" placeholder="Tag people" :options="()=>family.people.filter(p=>!draftPeople.includes(p.id))" :matches="useRuntime().personMatchesQuery" :display="useRuntime().displayName" keep-results clear-when-exhausted :validate-selection="false" @select="p=>updateTags([...draftPeople,p.id])" />
          <Teleport defer :to="selectedTagsTarget || 'body'" :disabled="!selectedTagsTarget"><div class="lightbox-person-tags"><span v-for="id in draftPeople" :key="id" class="lightbox-person-tag"><button type="button" @click="openPerson(id)">{{ useRuntime().displayName(family.people.find(p=>p.id===id)) }}</button><button v-if="canEdit" type="button" :aria-label="'Remove ' + useRuntime().displayName(family.people.find(p=>p.id===id))" @click="updateTags(draftPeople.filter(value=>value!==id))">×</button></span></div></Teleport>
          </div>
          <div v-if="showRecent && canEdit" class="recent-photo-tags">
            <h3>Recently tagged</h3>
            <p class="hint">Reuse names from photos you’ve tagged in this browser.</p>
            <div v-if="recentPeople.length" class="recent-photo-tag-list"><button v-for="p in recentPeople" :key="p.id" type="button" :disabled="draftPeople.includes(p.id)" :aria-label="(draftPeople.includes(p.id)?'Already tagged: ':'Tag ')+useRuntime().displayName(p)" @click="updateTags([...draftPeople,p.id])"><PersonAvatar :person="p"/><span>{{useRuntime().displayName(p)}}</span><span aria-hidden="true">{{draftPeople.includes(p.id)?'✓':'+'}}</span></button></div>
            <p v-else class="hint">Names will appear here as you tag photos.</p>
          </div>
        </div>
        <span v-if="savingTags" class="lightbox-tag-status" role="status">Saving…</span>
        <p v-if="tagError" role="alert">{{ tagError }}</p>
      </div>
      <p v-else class="hint">Save this photo first to tag people.</p>
    </section>
</template>
