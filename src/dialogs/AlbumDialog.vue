<template>
  <dialog id="albumDialog" aria-labelledby="albumHeading">
    <form id="albumForm">
      <h2 id="albumHeading">Create Album</h2>
      <input id="albumId" type="hidden" /><label
        >Album title<input id="albumTitle" required maxlength="200" /></label
      ><label>Date (optional)<input id="albumDate" type="date" /></label
      ><label
        >Story or description<textarea id="albumDescription" rows="3" maxlength="20000"></textarea>
      </label>
      <p id="albumMilestoneLink"></p>
      <div
        id="albumDrop"
        class="photo-dropzone"
        tabindex="0"
        role="group"
        aria-label="Album photo and video drop area"
      >
        <p>Drop photos, MP4 or MOV videos here</p>
        <label
          >or choose files<input
            id="albumFiles"
            type="file"
            multiple
            accept="image/*,video/mp4,video/quicktime,.mp4,.mov"
        /></label>
      </div>
      <p class="hint">Images are resized for sharing. Videos: up to 100 MB each.</p>
      <div id="albumPhotoPreview"></div>
      <p id="albumStatus" role="status" class="hint"></p>
      <p id="albumError" role="alert"></p>
      <div class="form-actions">
        <button id="saveAlbum" type="submit" class="primary">Save album</button
        ><button id="shareAlbum" type="button">Copy link</button
        ><button id="closeAlbum" type="button">Cancel</button
        ><button id="deleteAlbum" type="button">Delete album</button>
      </div>
    </form>
  </dialog>
</template>
