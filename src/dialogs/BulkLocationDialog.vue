<template>
  <dialog id="bulkLocationDialog" aria-labelledby="bulkLocationTitle">
    <form id="bulkLocationForm">
      <h2 id="bulkLocationTitle">Set Current Location</h2>
      <p>
        Choose one Google location, then select everyone who lives there. Saving replaces their
        Current Location and leaves their birthplace and places lived unchanged.
      </p>
      <div id="bulkLocationFinder"></div>
      <p id="bulkLocationStatus" class="hint" role="status"></p>
      <strong id="bulkLocationSelected"></strong>
      <h3>People at This Location</h3>
      <div id="bulkLocationTags"></div>
      <input
        id="bulkLocationSearch"
        type="search"
        placeholder="Find people…"
        aria-label="Find people at this location"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="false"
        aria-controls="bulkLocationMatches"
        autocomplete="off"
      />
      <div id="bulkLocationMatches" role="listbox" hidden></div>
      <p id="bulkLocationSummary" aria-live="polite"></p>
      <p id="bulkLocationError" role="alert"></p>
      <div class="form-actions">
        <button id="saveBulkLocation" class="primary" type="submit" disabled>
          Save location for selected people</button
        ><button id="cancelBulkLocation" type="button">Cancel</button>
      </div>
    </form>
  </dialog>
</template>
