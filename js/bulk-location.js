let bulkLocation = null,
  bulkLocationPeople = [],
  bulkLocationSession = 0,
  bulkLocationPending = false,
  bulkLocationSaving = false;
function updateBulkLocationSelection() {
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
  } selected`;
  $('#saveBulkLocation').disabled =
    !bulkLocation || !bulkLocationPeople.length || bulkLocationPending || bulkLocationSaving;
}
function setupBulkLocationSearch() {
  ui.mountSearch({
    inputId: 'bulkLocationSearch',
    listId: 'bulkLocationMatches',
    options: () => data.people.filter((p) => !bulkLocationPeople.includes(p.id)),
    display: displayName,
    matches: personMatchesQuery,
    keepResults: true,
    onSelect: (p) => {
      if (!bulkLocationPeople.includes(p.id)) bulkLocationPeople.push(p.id);
      updateBulkLocationSelection();
    },
  });
}
$('#openBulkLocation').onclick = async () => {
  const session = ++bulkLocationSession;
  bulkLocation = null;
  bulkLocationPeople = [];
  bulkLocationPending = false;
  $('#bulkLocationForm').reset();
  $('#bulkLocationError').textContent = '';
  $('#bulkLocationSelected').textContent = '';
  $('#bulkLocationFinder').replaceChildren();
  $('#bulkLocationMatches').hidden = true;
  $('#bulkLocationSearch').setAttribute('aria-expanded', 'false');
  updateBulkLocationSelection();
  setupBulkLocationSearch();
  $('#bulkLocationDialog').showModal();
  $('#bulkLocationStatus').textContent = 'Loading Google location search…';
  try {
    const { PlaceAutocompleteElement } = await loadPlacesLibrary();
    if (session !== bulkLocationSession || !$('#bulkLocationDialog').open) return;
    const finder = new PlaceAutocompleteElement();
    finder.setAttribute('placeholder', 'Search for a city, country, or address');
    finder.setAttribute('aria-label', 'Find a shared current location');
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
};
$('#cancelBulkLocation').onclick = () => $('#bulkLocationDialog').close();
$('#bulkLocationDialog').addEventListener('cancel', (e) => {
  if (bulkLocationSaving) e.preventDefault();
});
$('#bulkLocationDialog').addEventListener('close', () => {
  bulkLocationSession++;
});
$('#bulkLocationForm').onsubmit = async (event) => {
  event.preventDefault();
  if (bulkLocationSaving || bulkLocationPending || !bulkLocation || !bulkLocationPeople.length)
    return;
  const selected = new Set(bulkLocationPeople),
    previous = data.people;
  bulkLocationSaving = true;
  $('#bulkLocationForm').inert = true;
  data.people = data.people.map((p) => (selected.has(p.id) ? { ...p, ...bulkLocation } : p));
  try {
    if (!(await saveShared())) {
      data.people = previous;
      $('#bulkLocationError').textContent =
        'Locations were not saved. Resolve the database notice and try again.';
      return;
    }
    // Keep the open form in sync without discarding unrelated unsaved profile edits.
    if (selected.has($('#personId').value)) {
      $('#location').value = bulkLocation.location;
      $('#locationPlaceId').value = bulkLocation.locationPlaceId;
      $('#locationLat').value = bulkLocation.locationLat;
      $('#locationLng').value = bulkLocation.locationLng;
      resetLocationFinder();
      updatePlacesLivedCurrent();
    }
    $('#bulkLocationDialog').close();
    render();
    notify(
      `Current Location saved for ${selected.size} ${selected.size === 1 ? 'person' : 'people'}.`,
    );
  } finally {
    bulkLocationSaving = false;
    $('#bulkLocationForm').inert = false;
    updateBulkLocationSelection();
  }
};
