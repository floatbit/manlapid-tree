<script setup lang="js">
import { PhArrowRight } from '@phosphor-icons/vue';
import { computed, nextTick } from 'vue';
import { albumView, useRuntime } from '../ui/runtime.js';
import MediaPreview from './MediaPreview.vue';
const api=computed(useRuntime);
const years=computed(()=>{
 const groups=new Map();
 for(const item of albumView.value){const year=item.date ? item.date.slice(0,4) : 'Undated';if(!groups.has(year))groups.set(year,[]);groups.get(year).push(item);}
 return [...groups];
});
function view(album) { if(album.photos.length) api.value.openPhotoLightbox(album.photos,0,album.title);else api.value.openAlbum(album.id); }
async function showMilestone(album) {
  try {
    await api.value.loadFamilyTimeline();
    api.value.showSection('timeline');
    const search=document.getElementById('timelineSearch');
    if(search?.value){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}
    await nextTick();
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const entry=document.getElementById('timeline-milestone-'+album.milestoneId);
    if(!entry){api.value.notify('This timeline entry is not available.');return;}
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const headerHeight=document.querySelector('#app > header')?.getBoundingClientRect().height || 0;
    entry.focus({preventScroll:true});
    window.scrollTo({top:Math.max(0,window.scrollY+entry.getBoundingClientRect().top-headerHeight-24),behavior:reduced?'instant':'smooth'});
    document.querySelectorAll('.anniversary-highlight').forEach(item=>item.classList.remove('anniversary-highlight'));
    entry.classList.add('anniversary-highlight');
    if(!reduced)entry.animate([{boxShadow:'0 0 0 4px #91aa7b99'},{boxShadow:'0 0 0 8px #91aa7b00'}],{duration:1800,iterations:2});
  } catch(error){api.value.notify(error.message);}
}
</script>
<template>
  <div id="albumsGrid">
    <section v-for="[year, items] in years" :key="year" class="album-year">
      <h2>{{ year }}</h2>
      <div class="album-grid">
        <article v-for="album in items" :key="album.id" class="album-card">
          <div class="album-cover-wrap"><button
            type="button"
            class="album-cover"
            :aria-label="'View ' + album.title"
            @click="view(album)"
          >
            <MediaPreview
              v-if="album.photos.length"
              :src="album.photos[0]"
              :alt="album.title"
            /><span v-else class="empty-album-cover">▧</span>
          </button><button v-if="album.milestoneId" type="button" class="album-milestone-badge" :aria-label="'View milestone for '+album.title" title="View milestone in Timeline" @click="showMilestone(album)"><span></span></button></div>
          <div class="album-card-details">
            <button type="button" class="album-card-title" @click="api.openAlbum(album.id)">
              {{ album.title }}
            </button>
            <p>
              {{ album.date ? api.familyDateLabel(album.date) + ' · ' : ''
              }}{{ api.milestoneMediaCount(album.photos) || 'No photos yet' }}
            </p>
            <small>{{ album.milestoneId ? 'Linked to a milestone' : 'Independent album' }}</small
            ><button type="button" @click="api.openAlbum(album.id)">Edit Album <PhArrowRight :size="16" class="arrow-link-icon ui-icon" aria-hidden="true" /></button>
          </div>
        </article>
      </div>
    </section>
    <p v-if="!years.length">
      No albums found. Create an album to collect your family photos and videos.
    </p>
  </div>
</template>
