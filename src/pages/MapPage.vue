<template>
  <main id="familyMapPage" hidden>
    <div class="family-map-workspace">
      <div class="family-map-stage">
        <div id="familyMapCanvas" aria-label="Map of family members’ current locations"></div>
        <div class="map-view-controls">
          <div class="map-view-toggle" role="group" aria-label="Map view">
            <button id="mapCurrentView" type="button" aria-pressed="true">Current locations</button
            ><button id="mapHistoryView" type="button" aria-pressed="false">Places lived</button>
          </div>
          <button id="fitFamilyMap" type="button">Fit everyone</button>
        </div>
      </div>
      <aside id="familyMapPeople">
        <p class="eyebrow">OUR FAMILY, AROUND THE WORLD</p>
        <h1>Family Map.</h1>
        <p id="familyMapSummary">Current locations of your people.</p>
        <p id="familyMapStatus" role="status"></p>
        <div id="mapSelectedPerson" hidden></div>
        <div id="mapLocationDirectory">
          <h2>People on the Map</h2>
          <div id="mappedPeople"></div>
          <h3>Location Needed</h3>
          <div id="unmappedPeople"></div>
        </div>
      </aside>
    </div>
  </main>
</template>
