<script setup lang="js">
import ContributionQueues from '../components/ContributionQueues.vue';
import { PhShuffle } from '@phosphor-icons/vue';
import { computed, nextTick, ref, watch } from 'vue';
import { family, activePage, useRuntime } from '../ui/runtime.js';
import PhotoPeopleTags from '../components/PhotoPeopleTags.vue';
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

</script>
<template>
  <main id="overviewPage" hidden>
    <div class="intro"><div>
      <p class="eyebrow">HELP COMPLETE OUR FAMILY STORY</p>
      <h1>Family Contributions</h1>
      <p>Find missing details and help fill the gaps in our family records.</p>
    </div></div>
    <div id="overviewSummary">
      <section id="reportRandomPhoto" class="report-random-photo" tabindex="-1" @keydown.capture="photoKeyboard">
        <div class="report-photo-heading"><div><h2>Who’s in This Photo?</h2><p class="hint">Help identify people in an untagged family photo.</p></div><div class="report-photo-actions"><span v-if="randomPhoto">{{ randomPhoto.album.title }}</span><button type="button" :disabled="loadingRandomPhoto || randomPhotoTagger?.saving" @click="chooseRandomPhoto">Load Another Photo <PhShuffle :size="16" class="ui-icon" aria-hidden="true" /></button></div></div>
        <p v-if="loadingRandomPhoto" role="status">Loading a photo…</p>
        <p v-else-if="randomPhotoError" role="alert">{{ randomPhotoError }}</p>
        <template v-else-if="randomPhoto"><PhotoPeopleTags ref="randomPhotoTagger" :key="randomPhoto.photo" :photo="randomPhoto.photo" prefix="reportPhotoPeople" /><button class="report-random-image" type="button" aria-label="Open photo in lightbox" @click="api.openPhotoLightbox(randomPhoto.album.photos,randomPhoto.album.photos.indexOf(randomPhoto.photo),randomPhoto.album.title)"><img :src="randomPhoto.photo" :alt="randomPhoto.album.title" /></button></template>
        <p v-else>No untagged photos available.</p>
      </section>
      <ContributionQueues />
    </div>
  </main>
</template>
