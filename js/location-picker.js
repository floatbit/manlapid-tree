let mapsPlacesPromise = null,
  locationFinderVersion = 0,
  locationLookupPending = false;
function loadPlacesLibrary() {
  if (!mapsApiKey) return Promise.reject(new Error('Google location search is not configured.'));
  if (mapsPlacesPromise) return mapsPlacesPromise;
  mapsPlacesPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) {
      google.maps.importLibrary('places').then(resolve, reject);
      return;
    }
    const script = document.createElement('script');
    window.kinfolkPlacesReady = () => google.maps.importLibrary('places').then(resolve, reject);
    const url = new URL('https://maps.googleapis.com/maps/api/js');
    url.search = new URLSearchParams({
      key: mapsApiKey,
      loading: 'async',
      v: 'weekly',
      callback: 'kinfolkPlacesReady',
    }).toString();
    script.src = url.href;
    script.async = true;
    script.onerror = () =>
      reject(new Error('Google location search could not load. Please try again later.'));
    document.head.append(script);
  });
  return mapsPlacesPromise;
}
function updateLocationPreview(showMap = false) {
  const preview = $('#locationPreview'),
    placeId = $('#locationPlaceId').value,
    address = $('#location').value.trim();
  $('#selectedCurrentLocation').hidden = !address;
  $('#showLocationMap').hidden = !mapsApiKey;
  $('#showLocationMap').setAttribute('aria-expanded', String(showMap && !!address && !!mapsApiKey));
  if (!showMap || !mapsApiKey || !address) {
    preview.hidden = true;
    preview.removeAttribute('src');
    return;
  }
  const url = new URL('https://www.google.com/maps/embed/v1/place');
  url.search = new URLSearchParams({
    key: mapsApiKey,
    q: placeId ? 'place_id:' + placeId : address,
  }).toString();
  preview.src = url.href;
  preview.hidden = false;
}
async function resetLocationFinder() {
  const version = ++locationFinderVersion;
  locationLookupPending = false;
  $('#locationFinder').replaceChildren();
  $('#locationFinderStatus').textContent = '';
  updateLocationPreview();
  // Load Google only when People is visible, rather than on every tree visit.
  if ($('#editor').hidden) return;
  $('#locationFinderStatus').textContent = 'Loading location search…';
  try {
    const { PlaceAutocompleteElement } = await loadPlacesLibrary();
    if (version !== locationFinderVersion) return;
    const finder = new PlaceAutocompleteElement();
    finder.setAttribute('aria-label', 'Search cities, countries, or addresses');
    finder.setAttribute('placeholder', 'Search for a city, country, or address');
    $('#locationFinder').append(finder);
    $('#locationFinderStatus').textContent = '';
    finder.addEventListener('gmp-error', () => {
      $('#locationFinderStatus').textContent =
        'Google location search is unavailable. Check Places API (New) and the API key settings.';
    });
    finder.addEventListener('gmp-select', async ({ placePrediction }) => {
      const selectionVersion = ++locationFinderVersion;
      locationLookupPending = true;
      $('#locationFinderStatus').textContent = 'Looking up this location…';
      try {
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ['formattedAddress', 'displayName', 'location'] });
        if (selectionVersion !== locationFinderVersion) return;
        $('#location').value = place.formattedAddress || place.displayName || '';
        $('#locationPlaceId').value = place.id || '';
        $('#locationLat').value = place.location?.lat() ?? '';
        $('#locationLng').value = place.location?.lng() ?? '';
        updateLocationPreview();
        updatePlacesLivedCurrent();
        updatePersonUnsaved();
        $('#locationFinderStatus').textContent =
          'Location selected. Save person to keep this change.';
      } catch (error) {
        if (selectionVersion === locationFinderVersion)
          $('#locationFinderStatus').textContent =
            'Could not look up this place. Please choose another Google suggestion.';
      } finally {
        if (selectionVersion === locationFinderVersion) locationLookupPending = false;
      }
    });
    if ($('#location').value.trim()) updateLocationPreview();
  } catch (error) {
    if (version === locationFinderVersion) $('#locationFinderStatus').textContent = error.message;
  }
}
$('#location').addEventListener('input', () => {
  locationFinderVersion++;
  locationLookupPending = false;
  $('#locationPlaceId').value = '';
  $('#locationLat').value = '';
  $('#locationLng').value = '';
  $('#locationPreview').hidden = true;
  $('#locationPreview').removeAttribute('src');
});
$('#location').addEventListener('change', () => updateLocationPreview());
$('#showLocationMap').onclick = () => updateLocationPreview(true);

$('#clearCurrentLocation').onclick = () => {
  locationFinderVersion++;
  locationLookupPending = false;
  for (const id of ['location', 'locationPlaceId', 'locationLat', 'locationLng'])
    $('#' + id).value = '';
  updatePlacesLivedCurrent();
  resetLocationFinder();
  updatePersonUnsaved();
};
