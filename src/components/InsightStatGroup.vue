<script setup>
defineProps({cards:{type:Array,required:true},label:{type:String,required:true}});
</script>
<template>
  <div class="insights-stats" role="group" :aria-label="label">
    <article v-for="card in cards" :key="card.eyebrow">
      <p class="eyebrow">{{card.eyebrow}}</p><h2>{{card.headline}}</h2><p>{{card.subtext}}</p><small>{{card.footnote}}</small>
    </article>
  </div>
</template>
