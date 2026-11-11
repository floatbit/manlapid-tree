<script setup lang="js">
import { computed } from 'vue';
import { albumView, useRuntime } from '../ui/runtime.js';
import MediaPreview from './MediaPreview.vue';
const api=computed(useRuntime);
const years=computed(()=>{
 const groups=new Map();
 for(const item of albumView.value){const year=item.date ? item.date.slice(0,4) : 'Undated';if(!groups.has(year))groups.set(year,[]);groups.get(year).push(item);}
 return [...groups];
});
function view(album) { if(album.photos.length) api.value.openPhotoLightbox(album.photos,0,album.title);else api.value.openAlbum(album.id); }
</script>
<template>
  <div id="albumsGrid">
    <section v-for="[year, items] in years" :key="year" class="album-year">
      <h2>{{ year }}</h2>
      <div class="album-grid">
        <article v-for="album in items" :key="album.id" class="album-card">
          <button
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
          </button>
          <div class="album-card-details">
            <button type="button" class="album-card-title" @click="api.openAlbum(album.id)">
              {{ album.title }}
            </button>
            <p>
              {{ album.date ? api.familyDateLabel(album.date) + ' · ' : ''
              }}{{ api.milestoneMediaCount(album.photos) || 'No photos yet' }}
            </p>
            <small>{{ album.milestoneId ? 'Linked to a milestone' : 'Independent album' }}</small
            ><button type="button" @click="api.openAlbum(album.id)">Edit Album →</button>
          </div>
        </article>
      </div>
    </section>
    <p v-if="!years.length">
      No albums found. Create an album to collect your family photos and videos.
    </p>
  </div>
</template>
