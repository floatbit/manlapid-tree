import { shallowRef } from 'vue';
const key = 'kinfolk-recent-photo-tags-v1';
function read() {
  try { const value=JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? [...new Set(value.filter(id=>typeof id==='string'))].slice(0,12) : []; }
  catch { return []; }
}
export const recentPhotoTags = shallowRef(read());
export function rememberPhotoTags(ids) {
  if (!ids.length) return;
  recentPhotoTags.value=[...new Set([...ids.slice().reverse(),...recentPhotoTags.value])].slice(0,12);
  try { localStorage.setItem(key,JSON.stringify(recentPhotoTags.value)); } catch {}
}
