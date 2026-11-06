<script setup lang="js">
import MilestonePeople from '../components/MilestonePeople.vue';
</script>
<template>
  <dialog id="milestoneDialog" aria-labelledby="milestoneHeading">
    <form id="milestoneForm">
      <p class="eyebrow">A MOMENT TO REMEMBER</p>
      <h2 id="milestoneHeading">Add a Family Milestone</h2>
      <input type="hidden" id="milestoneId" /><label
        >Title<input
          id="milestoneTitle"
          required
          maxlength="200"
          placeholder="Name this family milestone"
      /></label>
      <div class="milestone-fields">
        <label
          >Event type<select id="milestoneType">
            <optgroup label="Family milestones">
              <option value="marriage">Marriage</option>
              <option value="birthday_party">Birthday Party</option>
              <option value="move">Move</option>
              <option value="graduation">Graduation</option>
              <option value="reunion">Family reunion</option>
              <option value="other">Other milestone</option>
            </optgroup>
            <optgroup label="Holidays">
              <option value="new_year">New Year’s Day</option>
              <option value="valentines_day">Valentine’s Day</option>
              <option value="easter">Easter</option>
              <option value="mothers_day">Mother’s Day</option>
              <option value="memorial_day">Memorial Day</option>
              <option value="fathers_day">Father’s Day</option>
              <option value="independence_day">Independence Day</option>
              <option value="labor_day">Labor Day</option>
              <option value="halloween">Halloween</option>
              <option value="thanksgiving">Thanksgiving</option>
              <option value="hanukkah">Hanukkah</option>
              <option value="christmas">Christmas</option>
              <option value="new_years_eve">New Year’s Eve</option>
              <option value="holiday">Other holiday</option>
            </optgroup>
          </select></label
        ><label>Date<input id="milestoneDate" type="date" required /></label>
      </div>
      <label>Location (optional)<input id="milestoneLocation" maxlength="255" /></label
      ><label
        >Story or details (optional)<textarea
          id="milestoneDescription"
          rows="3"
          maxlength="20000"
        ></textarea>
      </label>
      <fieldset>
        <legend>People Involved (Optional)</legend>
        <MilestonePeople />
      </fieldset>
      <label>Photo album<select id="milestoneAlbum"></select></label>
      <p class="hint">
        Choose an existing album, or upload photos below to create one named after this milestone.
        Albums are also available on the Albums page.
      </p>
      <div
        id="milestonePhotoDrop"
        class="photo-dropzone"
        role="group"
        tabindex="0"
        aria-label="Milestone photos and videos drop area"
      >
        <p class="dropzone-instructions">Drag pictures, MP4 or MOV videos here</p>
        <label
          >or choose pictures and videos<input
            id="milestonePhotos"
            type="file"
            accept="image/*,video/mp4,video/quicktime,.mp4,.mov"
            multiple
        /></label>
      </div>
      <p class="hint">
        Images are resized for sharing. MP4 and MOV videos: up to 100 MB each. MOV files are
        converted to MP4 when saved. Add large collections in smaller batches.
      </p>
      <div id="milestonePhotoPreview"></div>
      <p id="milestonePhotoStatus" class="hint" role="status"></p>
      <p class="hint">Milestones appear on the timeline. They don’t change family connections.</p>
      <p id="milestoneError" role="alert"></p>
      <div class="form-actions">
        <button id="shareMilestone" type="button">Copy link</button
        ><button id="milestoneSave" type="submit" class="primary">Save milestone</button
        ><button type="button" id="milestoneCancel">Cancel</button
        ><button type="button" id="milestoneDelete" hidden>Delete</button>
      </div>
    </form>
  </dialog>
</template>
