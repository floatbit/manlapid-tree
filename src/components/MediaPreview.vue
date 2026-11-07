<script setup lang="js">
const props = defineProps({ src: String, alt: { type: String, default: '' }, className: { type: String, default: '' } });
const video = () => /^data:video\/(mp4|quicktime)[;,]/i.test(props.src) || /\.(mp4|mov)$/i.test(props.src);
</script>
<template>
  <span v-if="video()" :class="['video-preview', className]"
    ><video :src="src" preload="metadata" muted playsinline /><span
      class="video-play-badge"
      aria-hidden="true"
      >▶</span
    ></span
  >
  <img v-else loading="lazy" :src="src" :alt="alt" :class="className" />
</template>
