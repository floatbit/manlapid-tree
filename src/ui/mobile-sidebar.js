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

export const MOBILE_SIDEBAR_HEIGHT_KEY='kinfolk-mobile-sidebar-height-v1';
export function readMobileSidebarHeight(){
  try {
    const saved=localStorage.getItem(MOBILE_SIDEBAR_HEIGHT_KEY);
    const value=saved===null?NaN:Number(saved);
    return Number.isFinite(value)&&value>=22&&value<=90?value:40;
  } catch { return 40; }
}
export const mobileSidebarHeight=shallowRef(readMobileSidebarHeight());
export function saveMobileSidebarHeight(){
  try {localStorage.setItem(MOBILE_SIDEBAR_HEIGHT_KEY,String(mobileSidebarHeight.value));} catch {}
}
