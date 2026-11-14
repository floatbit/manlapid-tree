<script setup>
import { computed, ref, watch } from 'vue';
import { PhPushPin } from '@phosphor-icons/vue';
import { family, editorPersonId, canEdit, useRuntime } from '../ui/runtime.js';
import { photosOfPerson } from '../domain/person-photos.js';
const api=computed(useRuntime), busy=ref(false), error=ref(''), notice=ref(''), dragging=ref(false), fileInput=ref(null);
const person=computed(()=>family.value.people.find(p=>p.id===editorPersonId.value));
const photos=computed(()=>photosOfPerson(family.value,editorPersonId.value));
watch(editorPersonId,()=>{error.value='';notice.value='';dragging.value=false;});
async function add(files){
 if(!canEdit.value || busy.value || !person.value)return;
 const id=person.value.id;busy.value=true;error.value='';notice.value='';
 try{
  if(!files.length)return;
  if(files.length>50)throw new Error('Add up to 50 photos at a time.');
  const uploads=[];
  for(const file of files){if(!file.type.startsWith('image/')||file.size>20000000)throw new Error('Choose images under 20 MB each.');uploads.push(await api.value.resizePhoto(file,1600));}
  if(editorPersonId.value!==id)throw new Error('The selected person changed. Choose the photos again.');
  await api.value.savePersonPhotos(id,uploads);
  if(editorPersonId.value===id){notice.value='Photos saved and tagged.';}
 }catch(e){if(editorPersonId.value===id)error.value=e.message;}finally{busy.value=false;if(fileInput.value)fileInput.value.value='';}
}
function dragOver(event){if(canEdit.value&&!busy.value&&person.value&&Array.from(event.dataTransfer?.types || []).includes('Files')){event.preventDefault();dragging.value=true;event.dataTransfer.dropEffect='copy';}}
function dropped(event){dragging.value=false;add(Array.from(event.dataTransfer?.files || []));}
async function pin(photo){
 if(busy.value)return;
 busy.value=true;error.value='';
 try{await api.value.pinPersonPhoto(person.value.id,photo,!(family.value.photoPins?.[person.value.id] || []).includes(photo));}
 catch(e){error.value=e.message;}finally{busy.value=false;}
}
function isPinned(photo){return (family.value.photoPins?.[person.value?.id] || []).includes(photo);}
function view(photo){api.value.openPhotoLightbox(photos.value,photos.value.indexOf(photo),'Photos of '+api.value.displayName(person.value),person.value.id);}
</script>
<template>
<section class="profile-section person-photo-editor"><h3>Photos <span v-if="photos.length">({{photos.length}})</span></h3><p class="hint">Add photos of this person. Uploads save immediately and tag them automatically. Headshots stay separate.</p>
<p v-if="!person">Save this person first to add photos.</p><template v-else>
<div v-if="canEdit" class="photo-dropzone" :class="{'is-dragover':dragging}" @dragover="dragOver" @dragleave="!$event.currentTarget.contains($event.relatedTarget) && (dragging=false)" @drop.prevent="dropped"><p>Drop photos here</p><label>or choose photos<input ref="fileInput" type="file" accept="image/*" multiple :disabled="busy" @change="add(Array.from($event.target.files || []))"/></label></div>
<p v-if="busy" role="status">Saving photos…</p><p v-if="notice" role="status">{{notice}}</p><div class="person-editor-photo-grid"><div v-for="photo in photos" :key="photo" class="person-editor-photo"><button type="button" :aria-label="'View photo of '+api.displayName(person)" @click="view(photo)"><img :src="photo" alt="Tagged person photo" loading="lazy"/></button><button v-if="canEdit" type="button" class="person-photo-pin" :class="{'is-pinned':isPinned(photo)}" :aria-label="isPinned(photo)?'Unpin photo':'Pin photo'" :aria-pressed="isPinned(photo)" :disabled="busy" @click="pin(photo)"><PhPushPin :size="18" :weight="isPinned(photo)?'fill':'regular'"/>{{isPinned(photo)?'Pinned':'Pin'}}</button></div></div><p v-if="!photos.length">No photos yet.</p></template><p v-if="error" role="alert">{{error}}</p>
</section>
</template>
