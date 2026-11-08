<script setup lang="js">
import SearchField from '../components/SearchField.vue';
import AlbumGrid from '../components/AlbumGrid.vue';
</script>
<template>
  <main id="albumsPage" hidden>
    <div class="albums-heading">
      <div>
        <p class="eyebrow">MEMORIES TO KEEP</p>
        <h1>Family Albums.</h1>
        <p id="albumsSummary"></p>
      </div>
      <button id="newAlbum" class="primary">＋ Create album</button>
    </div>
    <div class="albums-toolbar">
      <label
        >Search albums<SearchField><input id="albumSearch" type="search" placeholder="Search by title…" /></SearchField></label
      ><label
        >Order<select id="albumOrder">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select></label
      >
    </div>
    <AlbumGrid />
  </main>
</template>
