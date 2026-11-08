const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/map.js', 'utf8');
let center = { lat: 40.7, lng: -74 },
  zoom = 11;
const renders = [];
const context = vm.createContext({
  currentLocationsCamera: null,
  mapCameraReady: true,
  rememberMapCamera() {},
  persistMapView() {},
  familyMapMode: 'current',
  familyMapRenderVersion: 0,
  migrationLines: [],
  familyMapPopup: { close() {} },
  migrationPersonId: null,
  mapSelectedPersonId: 'person',
  data: { selected: null },
  $: () => ({ setAttribute() {} }),
  closeMapPerson() {},
  renderMigrationView() {
    center = { lat: 15, lng: 120 };
    zoom = 4;
  },
  renderFamilyMap: (options) => renders.push(options),
  familyMap: {
    getCenter: () => ({ lat: () => center.lat, lng: () => center.lng }),
    getZoom: () => zoom,
    setCenter: (value) => {
      center = value;
    },
    setZoom: (value) => {
      zoom = value;
    },
  },
});
vm.runInContext(
  source.slice(
    source.indexOf('function setFamilyMapMode('),
    source.indexOf('function migrationStopsForPerson('),
  ),
  context,
);
vm.runInContext(
  "setFamilyMapMode('history'); setFamilyMapMode('history'); setFamilyMapMode('current')",
  context,
);
assert.equal(center.lat, 40.7);
assert.equal(center.lng, -74);
assert.equal(zoom, 11);
assert.equal(renders.at(-1).fit, false);
center = { lat: 48.8, lng: 2.3 };
zoom = 15;
vm.runInContext("setFamilyMapMode('history'); setFamilyMapMode('current')", context);
assert.equal(center.lat, 48.8);
assert.equal(center.lng, 2.3);
assert.equal(zoom, 15);
assert.equal(renders.at(-1).fit, false);
console.log(
  'Passed: Current Locations camera survives Places Lived, repeated toggles, and subsequent pan/zoom changes.',
);

// Restoring the popup uses freshly rebuilt markers and does not pan the map.
const reopened = [];
const group = { position: { lat: 40, lng: -74 }, people: [{ id: 'saved', name: 'Saved' }] };
class Marker {
  constructor(options) {
    Object.assign(this, options);
  }
  addListener() {}
}
const popupContext = vm.createContext({
  familyMapMode: 'current',
  currentLocationsPopupPersonId: 'saved',
  familyMapMarkerLibrary: { AdvancedMarkerElement: Marker, PinElement: class {} },
  familyMap: { getZoom: () => 12 },
  familyMapPopup: { close() {} },
  familyMapMarkers: [],
  familyMapGroups: [group],
  clusterFamilyLocations: () => [
    { groups: [group], people: group.people, position: group.position },
  ],
  displayName: (p) => p.name,
  openFamilyMapGroup: (g, m, options) => reopened.push({ g, m, options }),
});
vm.runInContext(
  source.slice(
    source.indexOf('function drawFamilyMapClusters('),
    source.indexOf('function openFamilyMapGroup('),
  ),
  popupContext,
);
vm.runInContext('drawFamilyMapClusters()', popupContext);
assert.equal(reopened.length, 1);
assert.equal(reopened[0].g, group);
assert.equal(reopened[0].options.restore, true);
vm.runInContext('currentLocationsPopupPersonId=null; drawFamilyMapClusters()', popupContext);
assert.equal(reopened.length, 1, 'A dismissed popup stays closed');
console.log(
  'Passed: open location popups restore on rebuilt markers; dismissed popups remain closed.',
);

let storedView = null;
const persistenceContext = vm.createContext({
  localStorage: {
    getItem: () => storedView,
    setItem: (key, value) => {
      storedView = value;
    },
  },
});
vm.runInContext(source.slice(0, source.indexOf('function mapLocationGroups(')), persistenceContext);
vm.runInContext(
  `familyMap={getCenter:()=>({lat:()=>35,lng:()=>139}),getZoom:()=>10};mapCameraReady=true;rememberMapCamera();`,
  persistenceContext,
);
assert.equal(JSON.parse(storedView).current.zoom, 10);
vm.runInContext(
  `familyMapMode='history';migrationPersonId='person';familyMap={getCenter:()=>({lat:()=>48,lng:()=>2}),getZoom:()=>7};rememberMapCamera();`,
  persistenceContext,
);
assert.equal(JSON.parse(storedView).mode, 'history');
assert.equal(JSON.parse(storedView).personId, 'person');
assert.equal(JSON.parse(storedView).history.person.zoom, 7);
assert.equal(JSON.parse(storedView).current.zoom, 10, 'Each mode keeps its own camera');
const restored = vm.createContext({ localStorage: { getItem: () => storedView } });
vm.runInContext(source.slice(0, source.indexOf('function mapLocationGroups(')), restored);
assert.equal(vm.runInContext('familyMapMode', restored), 'history');
assert.equal(vm.runInContext('migrationPersonId', restored), 'person');
assert.equal(vm.runInContext("historyMapCameras.get('person').zoom", restored), 7);
assert.equal(vm.runInContext('currentLocationsCamera.zoom', restored), 10);
console.log('Passed: independent map cameras, selected person, and active mode survive reload.');
