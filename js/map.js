const MAP_VIEW_KEY = 'kinfolk-map-view-v1';
function validMapCamera(camera) {
  return (
    camera &&
    Number.isFinite(camera.center?.lat) &&
    Math.abs(camera.center.lat) <= 90 &&
    Number.isFinite(camera.center?.lng) &&
    Math.abs(camera.center.lng) <= 180 &&
    Number.isFinite(camera.zoom) &&
    camera.zoom >= 0 &&
    camera.zoom <= 24
  );
}
function readMapView() {
  try {
    return JSON.parse(localStorage.getItem(MAP_VIEW_KEY) || 'null') || {};
  } catch {
    return {};
  }
}
const savedMapView = readMapView();
let currentLocationsCamera = validMapCamera(savedMapView.current) ? savedMapView.current : null,
  currentLocationsPopupPersonId =
    typeof savedMapView.popupPersonId === 'string' ? savedMapView.popupPersonId : null;
const historyMapCameras = new Map(
  Object.entries(savedMapView.history || {}).filter(([, camera]) => validMapCamera(camera)),
);
let familyMapMode = savedMapView.mode === 'history' ? 'history' : 'current',
  migrationLines = [],
  migrationPersonId = typeof savedMapView.personId === 'string' ? savedMapView.personId : null;
let familyMap = null,
  familyMapMarkers = [],
  familyMapPopup = null,
  familyMapRenderVersion = 0,
  familyMapGroups = [],
  familyMapMarkerLibrary = null,
  mapSelectedPersonId = null,
  mapCameraReady = false;
function persistMapView() {
  try {
    localStorage.setItem(
      MAP_VIEW_KEY,
      JSON.stringify({
        mode: familyMapMode,
        personId: migrationPersonId,
        current: currentLocationsCamera,
        history: Object.fromEntries(historyMapCameras),
        popupPersonId: currentLocationsPopupPersonId,
      }),
    );
  } catch {}
}
function rememberMapCamera() {
  if (!familyMap || !mapCameraReady) return;
  const center = familyMap.getCenter(),
    zoom = familyMap.getZoom();
  if (!center || !Number.isFinite(zoom)) return;
  const camera = { center: { lat: center.lat(), lng: center.lng() }, zoom };
  if (familyMapMode === 'current') currentLocationsCamera = camera;
  else if (migrationPersonId) historyMapCameras.set(migrationPersonId, camera);
  persistMapView();
}
function restoreMapCamera(camera) {
  familyMap.setCenter(camera.center);
  familyMap.setZoom(camera.zoom);
}
function mapLocationGroups(people) {
  const groups = new Map(),
    missing = [];
  for (const p of people) {
    const lat = p.locationLat === null || p.locationLat === '' ? NaN : Number(p.locationLat),
      lng = p.locationLng === null || p.locationLng === '' ? NaN : Number(p.locationLng);
    if (
      !p.location ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      missing.push(p);
      continue;
    }
    const key = lat.toFixed(5) + ',' + lng.toFixed(5);
    if (!groups.has(key)) groups.set(key, { position: { lat, lng }, people: [] });
    groups.get(key).people.push(p);
  }
  return { groups: [...groups.values()], missing };
}
function clusterFamilyLocations(groups, zoom) {
  const size = 256 * Math.pow(2, zoom),
    clusters = [];
  const project = (position) => {
    const sin = Math.sin((Math.max(-85.0511, Math.min(85.0511, position.lat)) * Math.PI) / 180);
    return {
      x: ((position.lng + 180) / 360) * size,
      y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
    };
  };
  for (const group of groups) {
    const point = project(group.position);
    let cluster = clusters.find((c) => {
      const dx = Math.abs(point.x - c.x);
      return Math.hypot(Math.min(dx, size - dx), point.y - c.y) < 64;
    });
    if (!cluster) {
      cluster = { x: point.x, y: point.y, groups: [], people: [], position: group.position };
      clusters.push(cluster);
    }
    cluster.groups.push(group);
    cluster.people.push(...group.people);
  }
  return clusters;
}
function fitFamilyMap() {
  if (familyMapMode === 'history') {
    fitMigrationPath();
    return;
  }
  if (!familyMap || !familyMapGroups.length) return;
  const bounds = new google.maps.LatLngBounds();
  familyMapGroups.forEach((group) => bounds.extend(group.position));
  if (familyMapGroups.length === 1) {
    familyMap.setCenter(familyMapGroups[0].position);
    familyMap.setZoom(7);
  } else familyMap.fitBounds(bounds, 48);
}
function drawFamilyMapClusters() {
  if (familyMapMode === 'history') return;
  if (!familyMapMarkerLibrary) return;
  familyMapPopup.close();
  for (const marker of familyMapMarkers) marker.map = null;
  familyMapMarkers = [];
  const { AdvancedMarkerElement, PinElement } = familyMapMarkerLibrary;
  for (const cluster of clusterFamilyLocations(familyMapGroups, familyMap.getZoom() || 2)) {
    const multiple = cluster.groups.length > 1;
    const pin = new PinElement({
      background: multiple ? '#b47528' : '#38634e',
      borderColor: '#263c36',
      glyphColor: '#ffffff',
      glyphText: String(cluster.people.length),
      scale: multiple ? 1.2 : 1,
    });
    const marker = new AdvancedMarkerElement({
      map: familyMap,
      position: cluster.position,
      content: pin,
      title: multiple
        ? `${cluster.people.length} people in ${cluster.groups.length} locations — click to zoom`
        : cluster.people.map((p) => displayName(p)).join(', '),
    });
    marker.familyPeople = cluster.people;
    marker.familyLocationGroup = multiple ? null : cluster.groups[0];
    marker.addListener('click', () => {
      if (!multiple) {
        openFamilyMapGroup(cluster.groups[0], marker);
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      cluster.groups.forEach((group) => bounds.extend(group.position));
      const previousZoom = familyMap.getZoom();
      familyMap.fitBounds(bounds, 60);
      google.maps.event.addListenerOnce(familyMap, 'idle', () => {
        if (familyMap.getZoom() <= previousZoom) familyMap.setZoom(Math.min(21, previousZoom + 2));
      });
    });
    familyMapMarkers.push(marker);
  }
  if (currentLocationsPopupPersonId) {
    const marker = familyMapMarkers.find(
      (item) =>
        item.familyLocationGroup &&
        item.familyPeople.some((p) => p.id === currentLocationsPopupPersonId),
    );
    if (marker) openFamilyMapGroup(marker.familyLocationGroup, marker, { restore: true });
    else currentLocationsPopupPersonId = null;
  }
}
function openFamilyMapGroup(group, marker, { restore = false } = {}) {
  currentLocationsPopupPersonId = group.people[0].id;
  const content = document.createElement('div');
  content.className = 'map-person-popup';
  const heading = document.createElement('h3');
  heading.textContent = group.people[0].location;
  content.append(heading);
  for (const p of group.people) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-popup-person-heading';
    button.innerHTML = `${avatar(p)}<span>${esc(displayName(p))}</span>`;
    button.onclick = () => showMapPerson(p.id);
    const entry = document.createElement('div');
    entry.className = 'map-popup-person';
    entry.append(button);
    const actions = document.createElement('div');
    actions.className = 'map-popup-person-actions';
    for (const [label, action] of [
      [
        'View Places Lived',
        () => {
          migrationPersonId = p.id;
          setFamilyMapMode('history');
        },
      ],
      ['View Details', () => showMapPerson(p.id)],
      [
        'Open Family Tree',
        () => {
          familyMapPopup.close();
          start(p.id);
        },
      ],
    ]) {
      const link = document.createElement('button');
      link.type = 'button';
      const text = document.createElement('span');
      text.textContent = label;
      const arrow = document.createElement('span');
      arrow.className = 'map-popup-link-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      link.append(text, arrow);
      link.setAttribute('aria-label', label + ' — ' + displayName(p));
      link.onclick = action;
      actions.append(link);
    }
    entry.append(actions);
    content.append(entry);
  }
  if (!restore && group.people.length === 1) showMapPerson(group.people[0].id);
  familyMapPopup.setContent(content);
  familyMapPopup.setOptions({ disableAutoPan: restore });
  familyMapPopup.open({ map: familyMap, anchor: marker, shouldFocus: !restore });
  if (!restore) familyMap.panTo(group.position);
  persistMapView();
}
function showMapPerson(id) {
  if (familyMapMode === 'history') {
    migrationPersonId = id;
    renderMigrationView();
    return;
  }
  const p = person(id);
  if (!p) {
    closeMapPerson();
    return;
  }
  mapSelectedPersonId = id;
  $('#mapLocationDirectory').hidden = true;
  const details = $('#mapSelectedPerson');
  details.hidden = false;
  $('#familyMapPeople').classList.add('showing-person');
  const birth = p.dateDetails?.birth || p.birthday || '';
  let age = null;
  if (!p.deceased && /^\d{4}-\d{2}-\d{2}$/.test(birth) && validFamilyDate(birth)) {
    const [year, month, day] = birth.split('-').map(Number),
      today = new Date();
    age =
      today.getFullYear() -
      year -
      (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)
        ? 1
        : 0);
    if (age < 0) age = null;
  }
  const relatives = connections(id);
  const shared = (
    mapLocationGroups(data.people).groups.find((g) => g.people.some((member) => member.id === id))
      ?.people || []
  ).filter((member) => member.id !== id);
  const personButton = (member, label = '') =>
    `<button type="button" class="map-profile-relative" data-map-relative="${esc(
      member.id,
    )}">${avatar(member)}<span><strong>${esc(displayName(member))}</strong>${
      label ? `<small>${esc(label)}</small>` : ''
    }</span><span class="map-profile-arrow" aria-hidden="true">↗</span></button>`;
  const grouped = [
    ['parent', 'Parents'],
    ['sibling', 'Siblings'],
    ['spouse', 'Spouse'],
    ['child', 'Children'],
  ]
    .map(([kind, title]) => {
      const members = relatives.filter((relative) => relative.type === kind);
      return members.length
        ? `<section class="map-profile-family-group"><h4>${title} <span>${
            members.length
          }</span></h4>${members
            .map((relative) => personButton(person(relative.id)))
            .join('')}</section>`
        : '';
    })
    .join('');
  const homes = p.locationHistory?.length || 0;
  details.innerHTML = `<button type="button" id="mapBackToLocations">← All Locations</button>
    <div class="map-profile-header">${avatar(p)}<div><h2>${esc(p.name)}</h2>${
    p.deceased
      ? '<span class="deceased-badge">Deceased</span>'
      : age !== null
      ? `<span class="map-profile-age">${age} years old</span>`
      : ''
  }${birth ? `<p>Born · ${esc(familyDateLabel(birth))}</p>` : ''}${
    p.deceased && p.dateDetails?.death
      ? `<p>Died · ${esc(familyDateLabel(p.dateDetails.death))}</p>`
      : ''
  }</div></div>
    <div class="map-profile-actions"><button type="button" id="mapPersonTree">Open Family Tree ↗</button><button type="button" id="mapPersonEdit">Edit Person ↗</button></div>
    <section class="map-profile-locations"><h3>Locations</h3><dl><div><dt>Current Location</dt><dd>${esc(
      p.location || 'Not added yet',
    )}</dd></div><div><dt>Birthplace</dt><dd>${esc(
    p.birthplace?.location || 'Not added yet',
  )}</dd></div><div><dt>Places Lived</dt><dd>${homes} ${
    homes === 1 ? 'past home' : 'past homes'
  }</dd></div></dl><button type="button" id="mapPersonPlaces">View Places Lived ↗</button></section>
    <section class="map-profile-shared"><h3>At This Location <span>${shared.length}</span></h3>${
    shared
      .map((member) =>
        personButton(member, relatives.find((relative) => relative.id === member.id)?.type || ''),
      )
      .join('') || '<p class="hint">No other family members have this mapped location.</p>'
  }</section>
    <section class="map-profile-family"><h3>Family Connections <span>${
      relatives.length
    }</span></h3>${grouped || '<p class="hint">No connections added yet.</p>'}</section>
    ${
      p.bio?.trim()
        ? `<section class="map-profile-story"><h3>About</h3><p>${esc(p.bio)}</p></section>`
        : ''
    }`;
  $('#mapPersonPlaces').onclick = () => {
    migrationPersonId = id;
    setFamilyMapMode('history');
  };
  $('#mapBackToLocations').onclick = closeMapPerson;
  $('#mapPersonTree').onclick = () => start(id);
  $('#mapPersonEdit').onclick = () => {
    showSection('people');
    edit(id);
  };
  details.querySelectorAll('[data-map-relative]').forEach(
    (button) =>
      (button.onclick = () => {
        const relative = person(button.dataset.mapRelative),
          group = familyMapGroups.find((g) => g.people.some((p) => p.id === relative.id));
        if (group && familyMap) {
          familyMap.setCenter(group.position);
          familyMap.setZoom(12);
        }
        showMapPerson(relative.id);
      }),
  );
  $('#familyMapPeople').scrollTop = 0;
}
function closeMapPerson() {
  mapSelectedPersonId = null;
  $('#familyMapPeople').classList.remove('showing-person');
  $('#mapSelectedPerson').hidden = true;
  $('#mapSelectedPerson').replaceChildren();
  $('#mapLocationDirectory').hidden = false;
}
async function renderFamilyMap({ fit = true } = {}) {
  rememberMapCamera();
  mapCameraReady = false;
  $('#mapCurrentView').setAttribute('aria-pressed', String(familyMapMode === 'current'));
  $('#mapHistoryView').setAttribute('aria-pressed', String(familyMapMode === 'history'));
  $('#fitFamilyMap').textContent = familyMapMode === 'history' ? 'Fit path' : 'Fit everyone';
  const version = ++familyMapRenderVersion,
    { groups, missing } = mapLocationGroups(data.people),
    mapped = groups.reduce((n, g) => n + g.people.length, 0);
  $('#familyMapSummary').textContent = `${mapped} ${mapped === 1 ? 'person' : 'people'} · ${
    groups.length
  } ${groups.length === 1 ? 'location' : 'locations'} · ${
    missing.length
  } without a mapped location`;
  $('#fitFamilyMap').disabled = !groups.length;
  $('#mappedPeople').innerHTML =
    groups
      .map(
        (g, i) =>
          `<div class="map-location-card"><button type="button" data-map-group="${i}"><strong>${esc(
            g.people[0].location,
          )}</strong><span>${esc(g.people.map((p) => displayName(p)).join(', '))}</span></button><button type="button" class="map-add-people" data-add-map-people="${i}">＋ Add People ↗</button></div>`,
      )
      .join('') || '<p>No locations added yet.</p>';
  $('#mappedPeople').querySelectorAll('[data-add-map-people]').forEach(button => {
    button.onclick = () => {
      const group=groups[Number(button.dataset.addMapPeople)], source=group.people[0];
      openBulkLocation('current', {location:source.location,locationPlaceId:source.locationPlaceId || '',locationLat:group.position.lat,locationLng:group.position.lng});
    };
  });
  const missingReport = document.createElement('a');
  missingReport.href = '#page=reports';
  missingReport.className = 'map-missing-report';
  missingReport.textContent = `${missing.length} ${
    missing.length === 1 ? 'person needs' : 'people need'
  } locations — View Report ↗`;
  missingReport.onclick = (event) => {
    event.preventDefault();
    showSection('overview');
  };
  $('#unmappedPeople').replaceChildren(missingReport);
  if (mapSelectedPersonId) showMapPerson(mapSelectedPersonId);
  $('#familyMapStatus').textContent = 'Loading map…';
  try {
    await loadPlacesLibrary();
    const [{ Map, InfoWindow }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
      google.maps.importLibrary('maps'),
      google.maps.importLibrary('marker'),
    ]);
    if (version !== familyMapRenderVersion || $('#familyMapPage').hidden) return;
    if (!familyMap) {
      familyMap = new Map($('#familyMapCanvas'), {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        mapId: 'DEMO_MAP_ID',
        mapTypeControl: false,
        streetViewControl: false,
        gestureHandling: 'cooperative',
      });
      familyMapPopup = new InfoWindow({ maxHeight: 560 });
      familyMapPopup.addListener('closeclick', () => {
        if (familyMapMode === 'current') {
          currentLocationsPopupPersonId = null;
          persistMapView();
        }
      });
      familyMap.addListener('zoom_changed', () => drawFamilyMapClusters());
      familyMap.addListener('idle', rememberMapCamera);
    }
    familyMapGroups = groups;
    familyMapMarkerLibrary = { AdvancedMarkerElement, PinElement };
    if (familyMapMode === 'history') {
      renderMigrationView();
      return;
    }
    drawFamilyMapClusters();
    groups.forEach((group, i) => {
      const button = $('#mappedPeople').querySelector(`[data-map-group="${i}"]`);
      button.onclick = () => {
        familyMap.setCenter(group.position);
        familyMap.setZoom(14);
        const marker = familyMapMarkers.find((marker) =>
          marker.familyPeople.some((p) => p.id === group.people[0].id),
        );
        if (marker) openFamilyMapGroup(group, marker);
      };
    });
    $('#familyMapStatus').textContent = groups.length
      ? 'Click a numbered cluster to zoom in, or a location to see who lives there.'
      : 'Add Current Locations in People to place your family on the map.';
    if (currentLocationsCamera) restoreMapCamera(currentLocationsCamera);
    else if (fit) fitFamilyMap();
    mapCameraReady = true;
    persistMapView();
  } catch (error) {
    if (version === familyMapRenderVersion)
      $('#familyMapStatus').textContent =
        'The map could not load. Check your connection and Google Maps API settings, then try again.';
  }
}
$('#fitFamilyMap').onclick = fitFamilyMap;

function setFamilyMapMode(mode) {
  if (mode === familyMapMode) return;
  if (familyMapMode === 'current' && familyMap) {
    const center = familyMap.getCenter(),
      zoom = familyMap.getZoom();
    if (center && Number.isFinite(zoom))
      currentLocationsCamera = { center: { lat: center.lat(), lng: center.lng() }, zoom };
  }
  rememberMapCamera();
  mapCameraReady = false;
  // Invalidate a current-locations render that was awaiting the Maps library.
  familyMapRenderVersion++;
  familyMapMode = mode;
  $('#mapCurrentView').setAttribute('aria-pressed', String(mode === 'current'));
  $('#mapHistoryView').setAttribute('aria-pressed', String(mode === 'history'));
  for (const line of migrationLines) line.setMap(null);
  migrationLines = [];
  familyMapPopup?.close();
  if (mode === 'history') {
    migrationPersonId = migrationPersonId || mapSelectedPersonId || data.selected;
    renderMigrationView();
  } else {
    closeMapPerson();
    if (familyMap && currentLocationsCamera) {
      familyMap.setCenter(currentLocationsCamera.center);
      familyMap.setZoom(currentLocationsCamera.zoom);
    }
    renderFamilyMap({ fit: !currentLocationsCamera });
  }
  persistMapView();
}
function migrationStopsForPerson(p) {
  const homes = [...(p?.locationHistory || [])].sort(
    (a, b) =>
      (familyDateYear(a.date) ?? 9999) - (familyDateYear(b.date) ?? 9999) ||
      a.date.localeCompare(b.date),
  );
  const same = (a, b) =>
    (a.placeId && a.placeId === b.placeId) ||
    (Math.abs(Number(a.lat) - Number(b.lat)) < 0.00001 &&
      Math.abs(Number(a.lng) - Number(b.lng)) < 0.00001);
  let stops = homes;
  if (p?.birthplace) {
    const birth = {
      ...p.birthplace,
      id: 'birthplace',
      date: p.dateDetails?.birth || p.birthday || 'Date unknown',
      note: 'Birthplace',
    };
    if (homes[0] && same(homes[0], birth)) {
      birth.note +=
        ' · First home recorded ' + homes[0].date + (homes[0].note ? ' · ' + homes[0].note : '');
      homes.shift();
    }
    stops = [birth, ...homes];
  }
  if (
    p?.location &&
    p.locationLat !== null &&
    p.locationLat !== undefined &&
    p.locationLng !== null &&
    p.locationLng !== undefined &&
    Number.isFinite(Number(p.locationLat)) &&
    Number.isFinite(Number(p.locationLng))
  ) {
    const current = {
      id: 'current-location',
      location: p.location,
      placeId: p.locationPlaceId,
      lat: Number(p.locationLat),
      lng: Number(p.locationLng),
      date: 'Current',
      note: 'Current Location',
    };
    const last = stops.at(-1);
    if (last && same(last, current))
      stops = [
        ...stops.slice(0, -1),
        {
          ...last,
          note: last.note ? last.note + ' · Current Location' : 'Current Location',
          current: true,
        },
      ];
    else stops = [...stops, current];
  }
  return stops;
}
function migrationStops() {
  return migrationStopsForPerson(person(migrationPersonId));
}
function fitMigrationPath() {
  if (!familyMap) return;
  const stops = migrationStops();
  if (!stops.length) return;
  if (stops.every((stop) => stop.lat === stops[0].lat && stop.lng === stops[0].lng)) {
    familyMap.setCenter({ lat: stops[0].lat, lng: stops[0].lng });
    familyMap.setZoom(7);
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  stops.forEach((stop) => bounds.extend({ lat: stop.lat, lng: stop.lng }));
  familyMap.fitBounds(bounds, 60);
}
async function renderMigrationView() {
  $('#familyMapPeople').classList.add('showing-person');
  if (migrationPersonId && !person(migrationPersonId)) migrationPersonId = null;
  const savedCamera = historyMapCameras.get(migrationPersonId);
  mapCameraReady = false;
  $('#mapLocationDirectory').hidden = true;
  const details = $('#mapSelectedPerson');
  details.hidden = false;
  const p = person(migrationPersonId),
    stops = migrationStops();
  details.innerHTML = `<h2>Places Lived</h2><label for="migrationPerson">Choose a person</label><select id="migrationPerson"><option value="">Choose someone…</option>${[
    ...data.people,
  ]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (item) =>
        `<option value="${esc(item.id)}" ${p?.id === item.id ? 'selected' : ''}>${esc(
          displayName(item),
        )}${
          migrationStopsForPerson(item).length
            ? ' · ' + migrationStopsForPerson(item).length + ' places'
            : ''
        }</option>`,
    )
    .join('')}</select>${
    p
      ? `${avatar(p)}<h3>${esc(p.name)}</h3><ol class="migration-stops">${stops
          .map(
            (stop, i) =>
              `<li><button type="button" data-migration-stop="${i}"><strong>${
                i === 0 && p.birthplace ? 'Born · ' : ''
              }${esc(familyDateLabel(stop.date))}${
                stop.current ? ' · Current' : ''
              }</strong><span>${esc(stop.location)}</span>${
                stop.note ? `<small>${esc(stop.note)}</small>` : ''
              }</button></li>`,
          )
          .join('')}</ol>${
          !stops.length ? '<p>No places lived recorded yet.</p>' : ''
        }<button type="button" id="editMigrationPerson">Edit places lived ↗</button>`
      : '<p>Choose a person to explore their moves.</p>'
  }`;
  $('#migrationPerson').onchange = (e) => {
    rememberMapCamera();
    mapCameraReady = false;
    migrationPersonId = e.target.value;
    renderMigrationView();
  };
  ui.mountPersonPicker($('#migrationPerson'), {
    required: false,
    label: 'Choose a person',
    people: () => data.people,
    display: (item) => {
      const count = migrationStopsForPerson(item).length;
      return `${displayName(item)} · ${count} ${count === 1 ? 'place' : 'places'}`;
    },
    matches: personMatchesQuery,
    notifyOnQuery: false,
  });
  if (p)
    $('#editMigrationPerson').onclick = () => {
      showSection('people');
      edit(p.id);
      $('#placesLivedRows').parentElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
  $('#familyMapStatus').textContent =
    'Numbered stops show moves in date order. Lines connect places; they do not show an actual travel route.';
  $('#fitFamilyMap').disabled = !stops.length;
  $('#fitFamilyMap').textContent = 'Fit path';
  if (!familyMap || !familyMapMarkerLibrary) return;
  for (const marker of familyMapMarkers) marker.map = null;
  familyMapMarkers = [];
  for (const line of migrationLines) line.setMap(null);
  migrationLines = [];
  familyMapPopup.close();
  const { AdvancedMarkerElement, PinElement } = familyMapMarkerLibrary;
  stops.forEach((stop, i) => {
    const pin = new PinElement({
      background: '#38634e',
      borderColor: '#263c36',
      glyphColor: '#fff',
      glyphText: String(i + 1),
    });
    const marker = new AdvancedMarkerElement({
      map: familyMap,
      position: { lat: stop.lat, lng: stop.lng },
      content: pin,
      title: familyDateLabel(stop.date) + ' · ' + stop.location,
    });
    marker.addListener('click', () => {
      const content = document.createElement('div');
      content.className = 'map-person-popup';
      content.innerHTML = `<h3>${esc(stop.location)}</h3><p>${esc(
        familyDateLabel(stop.date),
      )}</p><p>${esc(stop.note)}</p>`;
      familyMapPopup.setContent(content);
      familyMapPopup.open({ map: familyMap, anchor: marker });
    });
    familyMapMarkers.push(marker);
  });
  const { Polyline } = await google.maps.importLibrary('maps');
  if (familyMapMode !== 'history' || person(migrationPersonId) !== p) return;
  if (stops.length > 1)
    migrationLines.push(
      new Polyline({
        map: familyMap,
        path: stops.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
        geodesic: false,
        strokeColor: '#b47528',
        strokeOpacity: 0.9,
        strokeWeight: 3,
        icons: [
          {
            icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
            offset: '50%',
            repeat: '120px',
          },
        ],
      }),
    );
  details.querySelectorAll('[data-migration-stop]').forEach(
    (button) =>
      (button.onclick = () => {
        const i = Number(button.dataset.migrationStop);
        familyMap.setCenter({ lat: stops[i].lat, lng: stops[i].lng });
        familyMap.setZoom(9);
        google.maps.event.trigger(familyMapMarkers[i], 'click');
      }),
  );
  if (savedCamera) restoreMapCamera(savedCamera);
  else fitMigrationPath();
  mapCameraReady = !!stops.length;
  persistMapView();
}
$('#mapCurrentView').onclick = () => {
  $('#fitFamilyMap').textContent = 'Fit everyone';
  setFamilyMapMode('current');
};
$('#mapHistoryView').onclick = () => setFamilyMapMode('history');

async function openFamilyMapLocation(personId) {
  const group = mapLocationGroups(data.people).groups.find((location) =>
    location.people.some((p) => p.id === personId),
  );
  if (!group) {
    notify('Choose a Google location for this person before opening it on the map.');
    return;
  }
  rememberMapCamera();
  mapCameraReady = false;
  familyMapMode = 'current';
  for (const line of migrationLines) line.setMap(null);
  migrationLines = [];
  currentLocationsPopupPersonId = personId;
  closeMapPerson();
  showSection('map');
  await renderFamilyMap({ fit: false });
  if (!familyMap || familyMapMode !== 'current' || $('#familyMapPage').hidden) return;
  familyMap.setCenter(group.position);
  familyMap.setZoom(14);
  drawFamilyMapClusters();
  const marker = familyMapMarkers.find(
    (item) => item.familyLocationGroup && item.familyPeople.some((p) => p.id === personId),
  );
  if (marker) openFamilyMapGroup(group, marker);
  rememberMapCamera();
}
