import { shallowRef } from 'vue';
export const mobileSidebar = shallowRef({key:null,revision:0});
export const isMobileSidebar = () => window.matchMedia('(max-width: 760px)').matches;
export function openMobileSidebar(key){
  if(!isMobileSidebar())return;
  mobileSidebar.value={key,revision:mobileSidebar.value.revision+1};
}
export function closeMobileSidebar(key){
  if(!key||mobileSidebar.value.key===key)mobileSidebar.value={...mobileSidebar.value,key:null};
}
