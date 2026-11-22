<script setup>
import {computed,ref,watch,nextTick,onMounted,onBeforeUnmount} from 'vue';
import {timelineAll,timelineView,timelineQuery,timelinePeriod,activePage} from '../ui/runtime.js';
import {timelineEras} from '../domain/timeline-eras.js';
const rail=ref(null),strip=ref(null),active=ref(null),preview=ref(null);
const eras=computed(()=>timelineEras(timelineAll.value,timelineView.value));
const filtered=computed(()=>!!timelineQuery.value || !!timelinePeriod.value);
let frame=0,observer;
const count=(n,singular,plural=singular+'s')=>`${n} ${n===1?singular:plural}`;
const summary=era=>[count(era.births,'birth'),count(era.milestones,'milestone'),...(era.remembrances?[count(era.remembrances,'remembrance')]:[])].join(' · ');
function measure(){const page=rail.value?.closest('#timeline');if(page)page.style.setProperty('--timeline-era-height',(eras.value.length?rail.value.getBoundingClientRect().height:0)+'px');}
function offset(){const header=document.querySelector('#app > header')?.getBoundingClientRect().height || 0;return header+(rail.value?.getBoundingClientRect().height || 0)+16;}
function updateActive(){frame=0;if(activePage.value!=='timeline')return;const sections=[...(document.querySelectorAll('#timelineEvents [data-timeline-year]'))].filter(el=>Number.isFinite(Number(el.dataset.timelineYear)));let current=sections[0];for(const section of sections){if(section.getBoundingClientRect().top<=offset()+2)current=section;else break;}active.value=current?Math.floor(Number(current.dataset.timelineYear)/10)*10:null;}
function schedule(){preview.value=null;if(!frame)frame=requestAnimationFrame(updateActive);}
function showPreview(era,event){const rect=event.currentTarget.getBoundingClientRect();preview.value={era,left:Math.max(8,Math.min(window.innerWidth-228,rect.left)),top:rect.bottom+8};}
async function jump(era){if(!era.matches)return;preview.value=null;const target=[...document.querySelectorAll('#timelineEvents [data-timeline-year]')].find(el=>Math.floor(Number(el.dataset.timelineYear)/10)*10===era.start);if(!target)return;active.value=era.start;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;window.scrollTo({top:Math.max(0,window.scrollY+target.getBoundingClientRect().top-offset()),behavior:reduced?'instant':'smooth'});}
watch(active,async value=>{await nextTick();const button=strip.value?.querySelector(`[data-era="${value}"]`);if(!button)return;const parent=strip.value.getBoundingClientRect(),rect=button.getBoundingClientRect();if(rect.left<parent.left || rect.right>parent.right)strip.value.scrollTo?.({left:strip.value.scrollLeft+rect.left-parent.left-(parent.width-rect.width)/2,behavior:'smooth'});});
watch([timelineView,timelineAll,activePage],async()=>{await nextTick();measure();schedule();});
onMounted(()=>{measure();schedule();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});if(window.ResizeObserver){observer=new window.ResizeObserver(()=>{measure();schedule();});observer.observe(rail.value);}});
onBeforeUnmount(()=>{window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);observer?.disconnect();if(frame)cancelAnimationFrame(frame);});
</script>
<template>
 <nav v-show="eras.length" ref="rail" class="timeline-era-rail" aria-label="Jump to a timeline decade">
  <div ref="strip" class="timeline-era-strip" @scroll="preview=null">
   <button v-for="era in eras" :key="era.start" type="button" :data-era="era.start" :class="{'era-active':active===era.start,'era-empty':!era.matches}" :aria-current="active===era.start?'location':undefined" :aria-disabled="!era.matches" :aria-label="`${era.label}: ${summary(era)}${filtered?', '+count(era.matches,'match','matches'):''}`" @click="jump(era)" @mouseenter="showPreview(era,$event)" @mouseleave="preview=null" @focus="showPreview(era,$event)" @blur="preview=null" @keydown.escape="preview=null">
    <span class="era-label">{{era.label}}<span v-if="filtered && era.matches" class="era-match-count">{{era.matches}}</span></span>
    <span class="era-density" aria-hidden="true"><i v-for="dot in era.density" :key="dot"></i></span>
   </button>
  </div>
  <Teleport to="body"><div v-if="preview" class="timeline-era-preview" role="tooltip" :style="{left:preview.left+'px',top:preview.top+'px'}"><strong>{{preview.era.label}} · {{preview.era.chapter}}</strong><span>{{summary(preview.era)}}</span><small v-if="filtered">{{count(preview.era.matches,'matching event')}}</small></div></Teleport>
 </nav>
</template>
