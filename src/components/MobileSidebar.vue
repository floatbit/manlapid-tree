<script setup>
import {computed,ref,watch,nextTick,onMounted,onBeforeUnmount} from 'vue';
import {PhX} from '@phosphor-icons/vue';
import {mobileSidebar,closeMobileSidebar,isMobileSidebar,mobileSidebarHeight,saveMobileSidebarHeight} from '../ui/mobile-sidebar.js';
const props=defineProps({sidebarKey:{type:String,required:true},label:{type:String,default:'Details'}});
const height=mobileSidebarHeight,scrolled=ref(false);
const body=ref(null),dragging=ref(false),offset=ref(0),mobile=ref(false);
const open=computed(()=>mobileSidebar.value.key===props.sidebarKey);
let drag=null,media,contentObserver;
function resetScroll(){
  if(!body.value)return;
  body.value.scrollTop=0;
  for(const sidebar of body.value.children)sidebar.scrollTop=0;
  scrolled.value=false;
}
const close=()=>closeMobileSidebar(props.sidebarKey);
watch(()=>mobileSidebar.value,async value=>{if(value.key===props.sidebarKey){await nextTick();resetScroll();}});
function start(event){if(event.button!==undefined&&event.button!==0)return;drag={y:event.clientY,height:height.value,start:event.timeStamp,lastY:event.clientY};dragging.value=true;event.currentTarget.setPointerCapture?.(event.pointerId);}
function move(event){if(!drag)return;drag.lastY=event.clientY;const target=drag.height-(event.clientY-drag.y)/window.innerHeight*100;height.value=Math.min(90,Math.max(22,target));offset.value=target<22?(22-target)*window.innerHeight/100:0;}
function end(event){
 if(!drag)return;
 const quickSwipe=drag.lastY-drag.y>80 && event.timeStamp-drag.start<350;
 const dismiss=event.type!=='pointercancel' && (offset.value>65||quickSwipe);
 if(dismiss||event.type==='pointercancel')height.value=drag.height;
 else saveMobileSidebarHeight();
 drag=null;dragging.value=false;offset.value=0;if(dismiss)close();
}
function keyboard(event){if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();height.value=Math.min(90,Math.max(22,height.value+(event.key==='ArrowUp'?5:-5)));saveMobileSidebarHeight();}else if(event.key==='Escape'){event.preventDefault();close();}}
const update=()=>{mobile.value=isMobileSidebar();};
onMounted(()=>{media=window.matchMedia('(max-width: 760px)');update();media.addEventListener?.('change',update);
  contentObserver=new window.MutationObserver(resetScroll);
  if(body.value)contentObserver.observe(body.value,{childList:true,subtree:true,characterData:true});});
onBeforeUnmount(()=>{media?.removeEventListener?.('change',update);contentObserver?.disconnect();});
</script>
<template>
  <div class="mobile-sidebar-shell" :class="{'is-open':open,'is-dragging':dragging,'is-scrolled':scrolled}" :style="{'--sheet-height':height+'dvh','--sheet-drag':offset+'px'}" :aria-hidden="mobile&&!open?true:undefined" :inert="mobile&&!open?true:undefined">
    <div class="mobile-sidebar-chrome">
      <div class="mobile-sidebar-grip" role="separator" aria-orientation="horizontal" :aria-label="'Resize '+label" tabindex="0" :aria-valuenow="Math.round(height)" aria-valuemin="22" aria-valuemax="90" @pointerdown="start" @pointermove="move" @pointerup="end" @pointercancel="end" @keydown="keyboard"><span></span></div>
      <button type="button" class="mobile-sidebar-close" :aria-label="'Close '+label" @click="close"><PhX :size="20"/></button>
    </div>
    <div ref="body" class="mobile-sidebar-body" @scroll="scrolled=$event.target.scrollTop>4"><slot/></div>
  </div>
  <div v-if="mobile&&open" class="mobile-sidebar-clearance" :style="{height:height+'dvh'}" aria-hidden="true"></div>
</template>
