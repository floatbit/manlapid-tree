<script setup lang="js">
import { computed, nextTick, ref, watch } from 'vue';
import { family, lightbox, useRuntime } from '../ui/runtime.js';
const dialog=ref(null), video=ref(null), failed=ref(false);
const media=computed(()=>lightbox.value.photos[lightbox.value.index]);
const isVideo=computed(()=>/\.(mp4|mov)$/i.test(media.value || '') || /^data:video\/(mp4|quicktime)[;,]/i.test(media.value || ''));
const owner=computed(()=>{
  const album=(family.value.albums || []).find((a)=>a.photos?.includes(media.value));
  if(album) return {album:album.id,media:media.value};
  const recipe=(family.value.recipes || []).find((r)=>r.photos?.includes(media.value));
  return recipe ? {recipe:recipe.id,media:media.value} : null;
});
watch(media, async()=>{failed.value=false;await nextTick();video.value?.load();});
function step(amount) {const total=lightbox.value.photos.length;if(total) lightbox.value={...lightbox.value,index:(lightbox.value.index+amount+total)%total};}
function keydown(event) {if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();event.stopPropagation();step(event.key==='ArrowLeft' ? -1 : 1);}}
function close() {dialog.value.close();}
function closed() {video.value?.pause();const focus=lightbox.value.returnFocus;lightbox.value={...lightbox.value,photos:[]};if(focus?.isConnected)focus.focus({preventScroll:true});}
</script>
<template>
  <dialog
    id="photoLightbox"
    ref="dialog"
    aria-labelledby="lightboxTitle"
    @keydown="keydown"
    @close="closed"
  >
    <div class="lightbox-heading">
      <h2 id="lightboxTitle">{{ lightbox.title }}</h2>
      <button
        id="shareLightbox"
        type="button"
        :hidden="!owner"
        @click="useRuntime().copyDirectLink(owner)"
      >
        Copy link</button
      ><span id="lightboxCounter" aria-live="polite" aria-atomic="true"
        >{{ lightbox.index + 1 }} / {{ lightbox.photos.length }}</span
      ><button id="lightboxClose" type="button" aria-label="Close photo viewer" @click="close">
        ×
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
      ‹
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
      ›
    </button>
    <p class="lightbox-help">← → to browse · Esc to close</p>
  </dialog>
</template>
