<script setup>
import { PhArrowRight } from '@phosphor-icons/vue';
import {computed,ref} from 'vue';
import {family,useRuntime} from '../ui/runtime.js';
const props=defineProps({personId:{type:String,required:true},showEmpty:Boolean,showName:Boolean,inSidebar:Boolean,limit:{type:Number,default:6},columns:{type:Number,default:3}});
const loading=ref(false);
const person=computed(()=>family.value.people.find(p=>p.id===props.personId));
const name=computed(()=>person.value ? useRuntime()?.displayName(person.value) || person.value.name : 'This Person');
const photos=computed(()=>Object.entries(family.value.photoTags || {}).filter(([photo,ids])=>ids.includes(props.personId) && !/\.(mp4|mov)$/i.test(photo)).map(([photo])=>photo));
async function open(photo) {
  if(loading.value)return;
  loading.value=true;
  try {
    await useRuntime().loadFamilyAlbums?.();
    const index=Math.max(0,photos.value.indexOf(photo));
    if(photos.value.length)useRuntime().openPhotoLightbox(photos.value,index,'Photos of ' + name.value,props.personId);
  }catch(e){useRuntime().notify(e.message);}finally{loading.value=false;}
}
</script>
<template>
  <section v-if="photos.length || showEmpty" class="person-tagged-photos" :aria-label="'Photos of ' + name">
    <h3>{{ showName ? name : 'PHOTOS' }} <span v-if="!showName">{{ photos.length }}</span></h3>
    <p v-if="!photos.length" class="hint">No photos tagged yet.</p>
    <div class="person-photos-grid" :style="{gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`}">
      <button v-for="(photo,index) in photos.slice(0,limit)" :key="photo" type="button" :disabled="loading" :aria-label="'View photo ' + (index+1) + ' of ' + name" @click="open(photo)"><img :src="photo" loading="lazy" :alt="'Tagged photo of ' + name" /></button>
    </div>
    <button v-if="photos.length" class="person-photos-all" type="button" :disabled="loading" @click="open(photos[0])">{{ loading ? 'Loading…' : (inSidebar ? 'View All Photos' : 'View All Photos (' + photos.length + ')') }} <PhArrowRight :size="14" class="ui-icon" aria-hidden="true" /></button>
  </section>
</template>
