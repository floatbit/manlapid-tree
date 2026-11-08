let bulkLocationKind = 'current',
  bulkLocation = null,
  bulkLocationPeople = [],
  bulkLocationRemoved = [],
  bulkLocationSession = 0,
  bulkLocationPending = false,
  bulkLocationSaving = false,
  bulkLocationExisting = false;
function toggleBulkLocationResident(id) {
  bulkLocationRemoved = bulkLocationRemoved.includes(id) ? bulkLocationRemoved.filter(value => value !== id) : [...bulkLocationRemoved,id];
  updateBulkLocationSelection();
}
function updateBulkLocationResidents() {
  $('#bulkLocationResidentNames').innerHTML = bulkLocationExisting
    ? data.people.filter(p => sameBulkLocation(p, bulkLocation)).map(p => {
      const removed=bulkLocationRemoved.includes(p.id);
      return `<button type="button" data-location-resident="${esc(p.id)}" class="${removed ? 'pending-removal' : ''}" aria-label="${removed ? 'Undo removal of' : 'Remove'} ${esc(displayName(p))}">${esc(displayName(p))} ${removed ? '↶ Undo' : '×'}</button>`;
    }).join('') : '';
  $('#bulkLocationResidentNames').querySelectorAll('[data-location-resident]').forEach(button => {
    button.onclick = () => toggleBulkLocationResident(button.dataset.locationResident);
  });
}
function updateBulkLocationSelection() {
  updateBulkLocationResidents();
  $('#bulkLocationTags').innerHTML = bulkLocationPeople
    .map(
      (id) =>
        `<button type="button" data-remove-location-person="${esc(id)}" aria-label="Remove ${esc(
          displayName(person(id)),
        )}">${esc(displayName(person(id)))} ×</button>`,
    )
    .join('');
  $('#bulkLocationTags')
    .querySelectorAll('button')
    .forEach(
      (button) =>
        (button.onclick = () => {
          bulkLocationPeople = bulkLocationPeople.filter(
            (id) => id !== button.dataset.removeLocationPerson,
          );
          updateBulkLocationSelection();
          $('#bulkLocationSearch').dispatchEvent(new Event('input'));
          $('#bulkLocationSearch').focus();
        }),
    );
  $('#bulkLocationSummary').textContent = `${bulkLocationPeople.length} ${
    bulkLocationPeople.length === 1 ? 'person' : 'people'
  } selected${bulkLocationRemoved.length ? ` · ${bulkLocationRemoved.length} to remove` : ''}`;
  $('#saveBulkLocation').disabled =
    !bulkLocation || (!bulkLocationPeople.length && !bulkLocationRemoved.length) || bulkLocationPending || bulkLocationSaving;
}
function setupBulkLocationSearch() {
  ui.mountSearch({
    inputId: 'bulkLocationSearch',
    listId: 'bulkLocationMatches',
    options: () => data.people.filter((p) => !bulkLocationPeople.includes(p.id) && !(bulkLocationExisting && sameBulkLocation(p, bulkLocation))),
    display: displayName,
    matches: personMatchesQuery,
    keepResults: true,
    onSelect: (p) => {
      if (!bulkLocationPeople.includes(p.id)) bulkLocationPeople.push(p.id);
      updateBulkLocationSelection();
    },
  });
}
function sameBulkLocation(p, location) {
  return !!location && p.location && Number.isFinite(Number(p.locationLat)) && Number.isFinite(Number(p.locationLng)) && p.locationLat !== null && p.locationLat !== '' && p.locationLng !== null && p.locationLng !== '' && Number(p.locationLat).toFixed(5) === Number(location.locationLat).toFixed(5) && Number(p.locationLng).toFixed(5) === Number(location.locationLng).toFixed(5);
}
async function openBulkLocation(kind = 'current', existingLocation = null) {
  if (bulkLocationSaving) return;
  bulkLocationKind = kind;
  $('#bulkLocationTitle').textContent =
    kind === 'birthplace' ? 'Set Birthplace' : 'Set Current Location';
  $('#bulkLocationDescription').textContent =
    kind === 'birthplace'
      ? 'Choose one Google location, then select everyone born there. Saving replaces their Birthplace.'
      : 'Choose one Google location, then select everyone who lives there. Saving replaces their Current Location.';
  const session = ++bulkLocationSession;
  bulkLocationExisting = kind === 'current' && !!existingLocation;
  bulkLocation = bulkLocationExisting ? {...existingLocation} : null;
  bulkLocationPeople = [];
  bulkLocationRemoved = [];
  bulkLocationPending = false;
  $('#bulkLocationForm').reset();
  $('#bulkLocationError').textContent = '';
  $('#bulkLocationSelected').textContent = bulkLocation?.location || '';
  $('#bulkLocationFinder').hidden = bulkLocationExisting;
  $('#bulkLocationResidents').hidden = !bulkLocationExisting;
  $('#bulkLocationPeopleHeading').textContent = bulkLocationExisting ? 'Add People' : 'People at This Location';
  $('#saveBulkLocation').textContent = bulkLocationExisting ? 'Save Changes' : 'Save location for selected people';
  $('#bulkLocationFinder').replaceChildren();
  $('#bulkLocationMatches').hidden = true;
  $('#bulkLocationSearch').setAttribute('aria-expanded', 'false');
  updateBulkLocationSelection();
  setupBulkLocationSearch();
  $('#bulkLocationDialog').showModal();
  if (bulkLocationExisting) {
    $('#bulkLocationTitle').textContent = 'Update People';
    $('#bulkLocationDescription').textContent = 'Add people or remove them with ×. Saving clears the Current Location of anyone removed; adding someone replaces their Current Location.';
    $('#bulkLocationStatus').textContent = 'People already at this location are excluded from the search.';
    $('#bulkLocationSearch').focus();
    return;
  }
  $('#bulkLocationStatus').textContent = 'Loading Google location search…';
  try {
    const { PlaceAutocompleteElement } = await loadPlacesLibrary();
    if (session !== bulkLocationSession || !$('#bulkLocationDialog').open) return;
    const finder = new PlaceAutocompleteElement();
    finder.setAttribute('placeholder', 'Search for a city, country, or address');
    finder.setAttribute(
      'aria-label',
      kind === 'birthplace' ? 'Find a shared birthplace' : 'Find a shared current location',
    );
    $('#bulkLocationFinder').append(finder);
    $('#bulkLocationStatus').textContent = 'Choose a city, region, country, or address.';
    let version = 0;
    finder.addEventListener('gmp-select', async ({ placePrediction }) => {
      const selection = ++version;
      bulkLocationPending = true;
      updateBulkLocationSelection();
      $('#bulkLocationStatus').textContent = 'Looking up location…';
      try {
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ['formattedAddress', 'displayName', 'location'] });
        if (session !== bulkLocationSession || selection !== version) return;
        bulkLocation = {
          location: place.formattedAddress || place.displayName || '',
          locationPlaceId: place.id,
          locationLat: place.location?.lat(),
          locationLng: place.location?.lng(),
        };
        $('#bulkLocationSelected').textContent = bulkLocation.location;
        $('#bulkLocationStatus').textContent = 'Location selected. Choose people below.';
      } catch {
        if (session === bulkLocationSession && selection === version) {
          bulkLocation = null;
          $('#bulkLocationSelected').textContent = '';
          $('#bulkLocationStatus').textContent =
            'Could not look up this place. Please choose another suggestion.';
        }
      } finally {
        if (session === bulkLocationSession && selection === version) {
          bulkLocationPending = false;
          updateBulkLocationSelection();
        }
      }
    });
    finder.addEventListener(
      'gmp-error',
      () =>
        ($('#bulkLocationStatus').textContent =
          'Google location search is unavailable. Please check the API settings.'),
    );
  } catch {
    if (session === bulkLocationSession)
      $('#bulkLocationStatus').textContent = 'Google location search could not load.';
  }
}
$('#openBulkLocation').onclick = () => openBulkLocation('current');
$('#openBulkBirthplace').onclick = () => openBulkLocation('birthplace');
$('#cancelBulkLocation').onclick = () => $('#bulkLocationDialog').close();
$('#bulkLocationDialog').addEventListener('cancel', (e) => {
  if (bulkLocationSaving) e.preventDefault();
});
$('#bulkLocationDialog').addEventListener('close', () => {
  bulkLocationSession++;
});
$('#bulkLocationForm').onsubmit = async (event) => {
  event.preventDefault();
  if (bulkLocationSaving || bulkLocationPending || !bulkLocation || (!bulkLocationPeople.length && !bulkLocationRemoved.length))
    return;
  const selected = new Set(bulkLocationPeople),
    removed = new Set(bulkLocationRemoved),
    previous = data.people;
  bulkLocationSaving = true;
  $('#bulkLocationForm').inert = true;
  const birthplace = {
    location: bulkLocation.location,
    placeId: bulkLocation.locationPlaceId,
    lat: bulkLocation.locationLat,
    lng: bulkLocation.locationLng,
  };
  data.people = data.people.map((p) =>
    selected.has(p.id)
      ? bulkLocationKind === 'birthplace'
        ? { ...p, birthplace }
        : { ...p, ...bulkLocation }
      : removed.has(p.id) && sameBulkLocation(p, bulkLocation)
        ? {...p, location:'',locationPlaceId:'',locationLat:null,locationLng:null}
        : p,
  );
  try {
    if (!(await saveShared())) {
      data.people = previous;
      $('#bulkLocationError').textContent =
        'Locations were not saved. Resolve the database notice and try again.';
      return;
    }
    // Keep the open form in sync without discarding unrelated unsaved profile edits.
    if (selected.has($('#personId').value) && bulkLocationKind === 'birthplace') {
      renderBirthplace(birthplace);
    } else if (selected.has($('#personId').value) || removed.has($('#personId').value)) {
      const updated = person($('#personId').value);
      $('#location').value = updated.location || '';
      $('#locationPlaceId').value = updated.locationPlaceId || '';
      $('#locationLat').value = updated.locationLat ?? '';
      $('#locationLng').value = updated.locationLng ?? '';
      resetLocationFinder();
      updatePlacesLivedCurrent();
    }
    $('#bulkLocationDialog').close();
    render();
    if (!$('#familyMapPage').hidden) await renderFamilyMap({ fit: false });
    notify(bulkLocationExisting ? 'People at this location updated.' :
      `${bulkLocationKind === 'birthplace' ? 'Birthplace' : 'Current Location'} saved for ${
        selected.size
      } ${selected.size === 1 ? 'person' : 'people'}.`,
    );
  } finally {
    bulkLocationSaving = false;
    $('#bulkLocationForm').inert = false;
    updateBulkLocationSelection();
  }
};
