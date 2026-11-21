<script setup>
import {PhGlobeHemisphereWest,PhArrowUpRight} from '@phosphor-icons/vue';
defineProps({events:{type:Array,required:true}});
const dateLabel=date=>date.length===4?date:new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long',...(date.length===10?{day:'numeric'}:{})}).format(new Date((date.length===7?date+'-01':date)+'T00:00:00'));

</script>
<template>
 <aside class="timeline-world-events" aria-label="Historical context">
  <h3><PhGlobeHemisphereWest :size="17" aria-hidden="true"/> Meanwhile, in the World</h3>
  <article v-for="event in events" :key="event.id" class="timeline-world-event">
   <time :datetime="event.date">{{dateLabel(event.date)}}</time><span aria-hidden="true"> — </span><a :href="event.url" target="_blank" rel="noopener noreferrer" :title="event.source">{{event.title}} <PhArrowUpRight :size="13" aria-hidden="true"/></a>
  </article>
 </aside>
</template>
