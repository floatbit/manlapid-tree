import {ref,watch} from 'vue';
const key='kinfolk-timeline-world-events-v1';
function remembered(){try{return localStorage.getItem(key)==='true';}catch{return false;}}
export const showWorldEvents=ref(remembered());
watch(showWorldEvents,value=>{try{localStorage.setItem(key,String(value));}catch{}});
