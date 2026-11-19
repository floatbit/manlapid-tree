<script setup>
defineProps({cards:{type:Array,required:true},label:{type:String,required:true}});
defineEmits(['select']);
</script>
<template>
  <div class="insights-stats" role="group" :aria-label="label">
    <article v-for="card in cards" :key="card.eyebrow" role="button" tabindex="0" :aria-label="card.eyebrow+': '+card.headline" @click="$emit('select',card)" @keydown.enter.prevent="$emit('select',card)" @keydown.space.prevent="$emit('select',card)">
      <p class="eyebrow">{{card.eyebrow}}</p><h2>{{card.headline}}</h2><p>{{card.subtext}}</p><small>{{card.footnote}}</small>
    </article>
  </div>
</template>
