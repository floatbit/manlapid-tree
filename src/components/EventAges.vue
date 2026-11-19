<script setup>
import {computed,ref,watch} from 'vue';
import {family} from '../ui/runtime.js';
import {eventAges} from '../domain/event-ages.js';
const props=defineProps({event:{type:Object,required:true}});
const expanded=ref(false);
watch(()=>props.event.id,()=>{expanded.value=false;});
const ages=computed(()=>eventAges(props.event,family.value.people));
const visible=computed(()=>expanded.value?ages.value:ages.value.slice(0,3));
</script>
<template>
  <div v-if="ages.length" class="timeline-event-ages" aria-label="Ages at this event">
    <span>{{visible.map(age=>age.label).join(' · ')}}</span>
    <button v-if="ages.length>3" type="button" :aria-expanded="expanded" @click.stop="expanded=!expanded">{{expanded?'Show fewer ages':'Show '+(ages.length-3)+' more'}}</button>
  </div>
</template>
