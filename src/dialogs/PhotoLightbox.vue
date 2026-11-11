<script setup lang="js">
import { PhX, PhCaretLeft, PhCaretRight, PhLink, PhTrash } from '@phosphor-icons/vue';
import { computed, nextTick, ref, watch } from 'vue';
import PhotoPeopleTags from '../components/PhotoPeopleTags.vue';
import { family, lightbox, useRuntime } from '../ui/runtime.js';
const tagPicker=ref(null), dialog=ref(null), video=ref(null), failed=ref(false);
const deleting=ref(false), deleteError=ref('');
const media=computed(()=>lightbox.value.photos[lightbox.value.index]);
const isVideo=computed(()=>/\.(mp4|mov)$/i.test(media.value || '') || /^data:video\/(mp4|quicktime)[;,]/i.test(media.value || ''));
function openPerson(id) {if(canLeave())useRuntime().openTaggedPerson(id);}
function canLeave() {return !deleting.value && !tagPicker.value?.saving;}
const owner=computed(()=>{
  if(lightbox.value.personId) return {photosOf:lightbox.value.personId,media:media.value};
  const album=(family.value.albums || []).find((a)=>a.photos?.includes(media.value));
  if(album) return {album:album.id,media:media.value};
  const recipe=(family.value.recipes || []).find((r)=>r.photos?.includes(media.value));
  return recipe ? {recipe:recipe.id,media:media.value} : null;
});
watch(media, async()=>{deleteError.value='';failed.value=false;await nextTick();video.value?.load();});
function step(amount) {if(!canLeave())return;const total=lightbox.value.photos.length;if(total) lightbox.value={...lightbox.value,index:(lightbox.value.index+amount+total)%total};}
function captureKeydown(event) {
  if(event.key==='Escape' && event.target.closest('.lightbox-people input')) {
    event.preventDefault();event.stopPropagation();
    tagPicker.value?.closeSearch();
    event.target.blur();
    dialog.value.focus({preventScroll:true});
  }
}
function keydown(event) {if(event.target.closest('input,textarea,[role=combobox]'))return;if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();event.stopPropagation();step(event.key==='ArrowLeft' ? -1 : 1);}}
async function deletePhoto() {
  if(!canLeave() || !confirm('Do you really want to delete this photo?'))return;
  const photo=media.value;
  deleting.value=true;deleteError.value='';
  try {
    await useRuntime().deletePhotoFromLightbox(photo);
    const photos=lightbox.value.photos.filter(item=>item!==photo);
    lightbox.value={...lightbox.value,photos,index:Math.min(lightbox.value.index,Math.max(0,photos.length-1))};
    if(!photos.length)dialog.value.close();
    useRuntime().notify('Photo deleted');
  }catch(e){deleteError.value=e.message;}finally{deleting.value=false;}
}
function close() {if(canLeave())dialog.value.close();}
function closed() {video.value?.pause();const focus=lightbox.value.returnFocus;lightbox.value={...lightbox.value,photos:[]};if(focus?.isConnected)focus.focus({preventScroll:true});}
</script>
<template>
  <dialog
    id="photoLightbox"
    ref="dialog"
    aria-labelledby="lightboxTitle"
    @keydown="keydown"
    @keydown.capture="captureKeydown"
    @close="closed"
    @cancel="!canLeave() && $event.preventDefault()"
  >
    <div class="lightbox-heading">
      <h2 id="lightboxTitle">{{ lightbox.title }}</h2>
      <button
        id="shareLightbox"
        type="button"
        :hidden="!owner"
        @click="useRuntime().copyDirectLink(owner)"
      >
        <PhLink :size="16" aria-hidden="true" /> Copy link</button
      ><button v-if="!isVideo && media?.startsWith('uploads/')" type="button" class="lightbox-delete" :disabled="deleting || tagPicker?.saving" @click="deletePhoto"><PhTrash :size="16" aria-hidden="true" /> {{ deleting ? 'Deleting…' : 'Delete Photo' }}</button><span id="lightboxCounter" aria-live="polite" aria-atomic="true"
        >{{ lightbox.index + 1 }} / {{ lightbox.photos.length }}</span
      ><button id="lightboxClose" type="button" aria-label="Close photo viewer" @click="close">
        <PhX :size="20" aria-hidden="true" />
      </button>
    </div>
    <button
      id="lightboxPrevious"
      class="lightbox-arrow"
      type="button"
      aria-label="Previous picture"
      :hidden="lightbox.photos.length < 2"
      @click="step(-1)"
    >
      <PhCaretLeft :size="28" aria-hidden="true" />
    </button>
    <figure>
      <img
        id="lightboxImage"
        :hidden="isVideo"
        :src="!isVideo ? media : undefined"
        :alt="`${lightbox.title} — photo ${lightbox.index + 1} of ${lightbox.photos.length}`"
        @error="failed = true"
      /><video
        id="lightboxVideo"
        ref="video"
        :hidden="!isVideo"
        :src="isVideo ? media : undefined"
        controls
        playsinline
        preload="metadata"
        :aria-label="`${lightbox.title} — video ${lightbox.index + 1} of ${lightbox.photos.length}`"
        @error="
          () => {
            if (isVideo) failed = true;
          }
        "
      />
      <p id="lightboxError" role="status" :hidden="!failed">
        {{
          isVideo
            ? 'This video preview could not play. Save MOV files first to convert them for playback.'
            : 'This item could not be loaded. Try the next one.'
        }}
      </p>
    </figure>
    <button
      id="lightboxNext"
      class="lightbox-arrow"
      type="button"
      aria-label="Next picture"
      :hidden="lightbox.photos.length < 2"
      @click="step(1)"
    >
      <PhCaretRight :size="28" aria-hidden="true" />
    </button>
    <p v-if="deleteError" class="lightbox-delete-error" role="alert">{{ deleteError }}</p>
    <PhotoPeopleTags v-if="!isVideo && media" :inert="deleting" ref="tagPicker" :photo="media" />
    <p class="lightbox-help">← → to browse · Esc to close</p>
  </dialog>
</template>
