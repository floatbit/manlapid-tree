<script setup lang="js">
import DirectorySearch from '../components/DirectorySearch.vue';
import NicknameTags from '../components/NicknameTags.vue';
</script>
<template>
  <main id="editor" hidden>
    <div class="intro">
      <div>
        <p class="eyebrow">THE PEOPLE BEHIND THE TREE</p>
        <h1>Your Family Directory.</h1>
        <p>Add a person, tell their story, and connect the dots.</p>
      </div>
      <div class="people-page-actions">
        <details class="multiple-people-tools" @keydown.esc="$event.currentTarget.open = false">
          <summary>Multiple People Tools <span aria-hidden="true">▾</span></summary>
          <div
            class="multiple-people-menu"
            @click="
              ($event) => {
                if ($event.target.closest('button'))
                  $event.currentTarget.parentElement.open = false;
              }
            "
          >
            <button id="openBulkLocation" type="button">Set Current Location</button>
            <button id="openBulkBirthplace" type="button">Set Birthplace</button>
            <button id="openChildrenGroup" type="button">Set Children</button>
            <button id="openSiblingGroup" type="button">Group Siblings</button>
          </div>
        </details>
        <button class="primary" id="newPerson">＋ Add a person</button>
      </div>
    </div>
    <section class="directory">
      <DirectorySearch />
      <form id="personForm">
        <div class="person-editor-heading">
          <h2 id="formTitle">Add a Person</h2>
          <button type="button" id="delete">Delete Person</button>
        </div>
        <input type="hidden" id="personId" />
        <div class="person-form-columns">
          <div class="person-form-column person-form-main">
            <section class="profile-section">
              <h3>Personal Details</h3>
              <div class="person-name-fields">
                <label
                  >First name<input
                    id="firstName"
                    required
                    maxlength="120"
                    autocomplete="given-name" /></label
                ><label
                  >Middle name<input
                    id="middleName"
                    maxlength="120"
                    autocomplete="additional-name" /></label
                ><label
                  >Last name<input id="lastName" maxlength="120" autocomplete="family-name"
                /></label>
              </div>
              <NicknameTags />
              <label
                >Birth Date<input
                  id="birthday"
                  placeholder="1940, About 1940, YYYY-MM-DD, or Date unknown" /></label
              ><label class="deceased-field"
                ><input id="deceased" type="checkbox" /> Deceased</label
              >
              <label id="deathDateField" hidden
                >Death Date (Optional)<input
                  id="deathDate"
                  placeholder="1940, About 1940, YYYY-MM-DD, or Date unknown"
              /></label>
              <p id="deathDateHint" class="hint" hidden>
                Dates accept an exact date, a year, About 1940, or Date unknown.
              </p>
            </section>
            <section class="profile-section">
              <h3>Photo and Story</h3>
              <div
                id="personPhotoDrop"
                class="photo-dropzone"
                role="group"
                tabindex="0"
                aria-label="Portrait photo drop area"
              >
                <p class="dropzone-instructions">Drop a portrait here</p>
                <label>or choose a photo<input id="photo" type="file" accept="image/*" /></label>
                <div id="personPhotoPreview"></div>
              </div>
              <label
                >About<textarea id="bio" rows="3" placeholder="A little of their story…"></textarea>
              </label>
            </section>
            <section class="profile-section">
              <details class="person-connections">
                <summary>
                  <h3>Manage Connections (<span id="connectionsCount">0</span>)</h3>
                </summary>
                <p class="hint">
                  Add only the connections you know. Each relationship works both ways
                  automatically, and siblings with a shared parent are connected for you. You can
                  add more later.
                </p>
                <div id="relations"></div>
                <button type="button" id="addRelation">＋ Add connection</button
                ><button type="button" id="editSiblingGroup">Manage sibling group</button>
              </details>
              <p class="hint">
                An easier way: select someone in Family tree, then choose Add parent, sibling,
                spouse, or child.
              </p>
            </section>
          </div>
          <div class="person-form-column person-form-locations">
            <section class="profile-section locations-section" aria-labelledby="locationsTitle">
              <h3 id="locationsTitle">Locations</h3>
              <p class="hint">
                Follow their journey from birthplace, through past homes, to where they live now.
              </p>
              <div class="location-life-timeline">
                <div class="birthplace-field location-timeline-stop">
                  <h4>Birthplace <span class="optional">Optional</span></h4>
                  <div id="birthplaceFinder"></div>
                  <p id="birthplaceStatus" class="hint" role="status"></p>
                  <div id="selectedBirthplace" hidden>
                    <label for="birthplaceSelected">Selected Google Location</label>
                    <div class="selected-location-row">
                      <input id="birthplaceSelected" readonly />
                      <button type="button" id="clearBirthplace">Clear Location</button>
                    </div>
                    <button
                      id="showBirthplaceMap"
                      type="button"
                      aria-expanded="false"
                      aria-controls="birthplacePreview"
                    >
                      View Map
                    </button>
                  </div>
                  <iframe
                    id="birthplacePreview"
                    title="Birthplace preview"
                    loading="lazy"
                    referrerpolicy="strict-origin-when-cross-origin"
                    hidden
                  ></iframe>
                </div>
                <div class="locations-history">
                  <div id="placesLivedDetails">
                    <div id="placesLivedSummary">
                      <h3>Places Lived (<span id="placesLivedCount">0</span>)</h3>
                    </div>
                    <p class="hint">
                      Record when they moved to a city or country. Enter a year or full date. These
                      places form their migration path.
                    </p>
                    <div class="places-lived-entries">
                      <div id="placesLivedBirthplace" hidden></div>
                      <div id="placesLivedRows"></div>
                      <button type="button" id="addPlaceLived">＋ Add place lived</button>
                      <div id="placesLivedCurrent" hidden></div>
                    </div>
                    <p id="placesLivedStatus" role="status" class="hint"></p>
                  </div>
                </div>
                <div
                  class="current-location-field location-timeline-stop"
                  aria-labelledby="currentLocationLabel"
                >
                  <h3 id="currentLocationLabel">Current Location</h3>
                  <input id="currentLocationSince" type="hidden" />
                  <div id="locationFinder"></div>
                  <p id="locationFinderStatus" class="hint" role="status"></p>
                  <div id="selectedCurrentLocation" hidden>
                    <label for="location">Selected Google Location</label>
                    <div class="selected-location-row">
                      <input id="location" maxlength="255" readonly />
                      <button id="clearCurrentLocation" type="button">Clear Location</button>
                    </div>
                    <button
                      id="showLocationMap"
                      type="button"
                      aria-expanded="false"
                      aria-controls="locationPreview"
                    >
                      View Map
                    </button>
                  </div>
                  <input id="locationPlaceId" type="hidden" /><input
                    id="locationLat"
                    type="hidden"
                  /><input id="locationLng" type="hidden" /><iframe
                    id="locationPreview"
                    title="Current location preview"
                    loading="lazy"
                    referrerpolicy="strict-origin-when-cross-origin"
                    hidden
                  ></iframe>
                </div>
              </div>
            </section>
          </div>
        </div>
        <p id="formError" role="alert"></p>
        <div class="person-floating-actions">
          <button id="cancel" type="button">Cancel</button>
          <button type="submit" class="primary floating-save-person" aria-label="Save person">
            Save Person
          </button>
        </div>
      </form>
    </section>
    <section class="settings">
      <h3>Family Backups</h3>
      <button id="exportFamily">Download family backup</button>
      <button id="importFamily">Import family backup</button>
      <p>Imports add missing people and connections while keeping existing database records.</p>
      <label
        >Requests recipient email<input
          id="requestEmail"
          type="email"
          placeholder="family@example.com"
      /></label>
      <p>
        Missing-person requests open an email draft for review. People, relationships, photos, and
        the requests email are shared through MySQL. Only your expanded tree view stays in this
        browser.
      </p>
    </section>
  </main>
</template>
