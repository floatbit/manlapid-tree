function birthEvents(people) {
  return people
    .filter((p) => {
      const value = p.dateDetails?.birth || p.birthday;
      return !!value && validFamilyDate(value);
    })
    .sort(
      (a, b) =>
        (familyDateYear(a.dateDetails?.birth || a.birthday) ?? 9999) -
          (familyDateYear(b.dateDetails?.birth || b.birthday) ?? 9999) ||
        a.name.localeCompare(b.name),
    );
}
function isMilestoneVideo(media) {
  return /^data:video\/(mp4|quicktime)[;,]/i.test(media) || /\.(mp4|mov)$/i.test(media);
}
function milestoneMediaCount(items) {
  const videos = items.filter(isMilestoneVideo).length,
    photos = items.length - videos;
  return [
    photos ? `${photos} ${photos === 1 ? 'photo' : 'photos'}` : '',
    videos ? `${videos} ${videos === 1 ? 'video' : 'videos'}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
function milestoneMediaPreview(media, className = '', alt = '') {
  return isMilestoneVideo(media)
    ? `<span class="video-preview ${className}"><video src="${esc(
        media,
      )}" preload="metadata" muted playsinline></video><span class="video-play-badge" aria-hidden="true">▶</span></span>`
    : `<img class="${className}" src="${esc(media)}" alt="${esc(alt)}">`;
}
function readVideoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(
        (/\.mov$/i.test(file.name) ? 'data:video/quicktime;base64,' : 'data:video/mp4;base64,') +
          String(reader.result).split(',')[1],
      );
    reader.onerror = () => reject(new Error('Could not read this video file.'));
    reader.readAsDataURL(file);
  });
}
const milestoneTypes = {
  new_year: 'New Year’s Day',
  valentines_day: 'Valentine’s Day',
  easter: 'Easter',
  mothers_day: 'Mother’s Day',
  memorial_day: 'Memorial Day',
  fathers_day: 'Father’s Day',
  independence_day: 'Independence Day',
  labor_day: 'Labor Day',
  halloween: 'Halloween',
  thanksgiving: 'Thanksgiving',
  hanukkah: 'Hanukkah',
  christmas: 'Christmas',
  new_years_eve: 'New Year’s Eve',
  holiday: 'Other holiday',
  birthday_party: 'Birthday Party',
  marriage: 'Marriage',
  move: 'Move',
  graduation: 'Graduation',
  reunion: 'Family reunion',
  other: 'Milestone',
};
const milestoneIcons = {
  new_year: '✦',
  valentines_day: '♡',
  easter: '🥚',
  mothers_day: '❀',
  memorial_day: '★',
  fathers_day: '★',
  independence_day: '✦',
  labor_day: '★',
  halloween: '🎃',
  thanksgiving: '🦃',
  hanukkah: '✦',
  christmas: '🎄',
  new_years_eve: '✦',
  holiday: '✦',
  birthday_party: '🎂',
  marriage: '♡',
  move: '⌂',
  graduation: '◇',
  reunion: '✳',
  other: '●',
};
function timelineItems() {
  return [
    ...birthEvents(data.people).map((p) => ({
      kind: 'birth',
      id: p.id,
      date: p.dateDetails?.birth || p.birthday,
      person: p,
    })),
    ...data.people
      .filter((p) => p.deceased && p.dateDetails?.death)
      .map((p) => ({ kind: 'death', id: p.id + '-death', person: p, date: p.dateDetails.death })),
    ...(data.milestones || []).map((event) => ({ ...event, kind: 'milestone' })),
  ].sort(
    (a, b) =>
      (familyDateYear(a.date) ?? 9999) - (familyDateYear(b.date) ?? 9999) ||
      a.date.localeCompare(b.date) ||
      a.id.localeCompare(b.id),
  );
}
function timelineEventMatches(event, query) {
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const people = event.person ? [event.person] : (event.participants || []).map(id => data.people.find(p => p.id === id)).filter(Boolean);
  const text = normalize([event.title, event.description, event.location, event.type?.replaceAll('_', ' '), event.kind, event.date, familyDateLabel(event.date), ...people.map(p => [p.name, p.firstName, p.middleName, p.lastName, ...(p.nicknames || [])].join(' '))].join(' '));
  return normalize(query).split(/\s+/).every(word => text.includes(word));
}
const timelineSearch = $('#timelineSearch');
try { timelineSearch.value = localStorage.getItem('kinfolk-timeline-search-v1') || ''; } catch {}
timelineSearch.addEventListener('input', () => {
  try { localStorage.setItem('kinfolk-timeline-search-v1', timelineSearch.value); } catch {}
  renderTimeline();
});
function renderTimeline() {
  renderUpcomingAnniversaries();
  const births = birthEvents(data.people),
    query = $('#timelineSearch').value.trim(),
    events = timelineItems().filter(event => timelineEventMatches(event, query)),
    missing = data.people.length - births.length;
  $('#timelineSummary').textContent = query ? `${events.length} matching ${events.length === 1 ? 'event' : 'events'}` : `${births.length} ${
    births.length === 1 ? 'birth' : 'births'
  } · ${(data.milestones || []).length} ${
    (data.milestones || []).length === 1 ? 'milestone' : 'milestones'
  }${missing ? ` · ${missing} ${missing === 1 ? 'person needs' : 'people need'} a birthday` : ''}`;
  ui.sync(data);
  ui.setTimeline(events, query);
}
let draftMilestonePhotos = [],
  milestonePhotoSession = 0,
  processingMilestonePhotos = false;
let draftMilestonePeople = [];
function renderMilestonePeople() {
  ui.setMilestonePeople(draftMilestonePeople, (ids) => {
    draftMilestonePeople = ids;
  });
}
let milestoneLocationSession = 0,
  milestoneLocationPending = false;
function updateMilestoneLocationAddress() {
  const value = $('#milestoneLocation').value;
  $('#milestoneLocationAddress').textContent = value;
  $('#milestoneSelectedLocation').hidden = !value;
}
async function setupMilestoneLocationFinder() {
  const session = ++milestoneLocationSession;
  milestoneLocationPending = false;
  updateMilestoneLocationAddress();
  $('#milestoneLocationFinder').replaceChildren();
  $('#milestoneLocationStatus').textContent = '';
  try {
    const { PlaceAutocompleteElement } = await loadPlacesLibrary();
    if (session !== milestoneLocationSession || !$('#milestoneDialog').open) return;
    const finder = new PlaceAutocompleteElement();
    finder.setAttribute('placeholder', 'Search for a city, country, or address');
    finder.setAttribute('aria-label', 'Search milestone location');
    $('#milestoneLocationFinder').append(finder);
    let version = 0;
    finder.addEventListener('gmp-select', async ({ placePrediction }) => {
      const selection = ++version;
      milestoneLocationPending = true;
      $('#milestoneLocationStatus').textContent = 'Looking up location…';
      try {
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ['formattedAddress', 'displayName'] });
        if (session !== milestoneLocationSession || selection !== version) return;
        const address = place.formattedAddress || place.displayName || '';
        if (!address || address.length > 255) throw new Error('Choose a shorter location.');
        $('#milestoneLocation').value = address;
        updateMilestoneLocationAddress();
        $('#milestoneLocationStatus').textContent = '';
      } catch {
        if (session === milestoneLocationSession && selection === version)
          $('#milestoneLocationStatus').textContent =
            'Could not select this location. Please choose another Google suggestion.';
      } finally {
        if (session === milestoneLocationSession && selection === version)
          milestoneLocationPending = false;
      }
    });
    finder.addEventListener('gmp-error', () => {
      if (session === milestoneLocationSession)
        $('#milestoneLocationStatus').textContent =
          'Google location search is unavailable. Please try again.';
    });
  } catch {
    if (session === milestoneLocationSession)
      $('#milestoneLocationStatus').textContent =
        'Google location search could not load. Your saved location is preserved.';
  }
}
$('#clearMilestoneLocation').onclick = () => {
  milestoneLocationSession++;
  $('#milestoneLocation').value = '';
  setupMilestoneLocationFinder();
};
function openMilestone(id) {
  if (collectionRevisions.get('albums') !== sharedRevision)
    return withCollection('albums', () => openMilestone(id));
  if (!document.body.classList.contains('is-editor')) { const event=(data.milestones || []).find(e=>e.id===id);if(event?.photos?.length)openPhotoLightbox(event.photos,0,event.title);return; }
  milestonePhotoSession++;
  processingMilestonePhotos = false;
  $('#milestoneSave').disabled = false;
  const event = (data.milestones || []).find((event) => event.id === id);
  $('#milestoneForm').reset();
  $('#milestoneId').value = event?.id || '';
  $('#milestoneHeading').textContent = event ? 'Edit Milestone' : 'Add a Family Milestone';
  for (const field of ['title', 'type', 'date', 'location', 'description'])
    $('#milestone' + field[0].toUpperCase() + field.slice(1)).value = event?.[field] || '';
  $('#shareMilestone').hidden = !event;
  draftMilestonePeople = [...(event?.participants || [])];
  renderMilestonePeople();
  populateMilestoneAlbums(event);
  draftMilestonePhotos = [...(event?.photos || [])];
  $('#milestonePhotoStatus').textContent = '';
  renderMilestonePhotos();
  $('#milestoneDelete').hidden = !event;
  $('#milestoneError').textContent = '';
  $('#milestoneDialog').showModal();
  setupMilestoneLocationFinder();
  $('#milestoneTitle').focus();
}
$('#addMilestone').onclick = () => openMilestone();
$('#milestoneCancel').onclick = () => $('#milestoneDialog').close();
$('#milestoneDialog').addEventListener('close', () => {
  milestoneLocationSession++;
  milestoneLocationPending = false;
  milestonePhotoSession++;
});
$('#milestoneForm').onsubmit = async (event) => {
  event.preventDefault();
  if (savingShared || processingMilestonePhotos) return;
  if (milestoneLocationPending) {
    $('#milestoneError').textContent = 'Wait for the location lookup to finish.';
    return;
  }
  const title = $('#milestoneTitle').value.trim();
  if (!title) {
    $('#milestoneError').textContent = 'Enter a title for this milestone.';
    return;
  }
  const entry = {
    id: $('#milestoneId').value || crypto.randomUUID(),
    title,
    type: $('#milestoneType').value,
    date: $('#milestoneDate').value,
    location: $('#milestoneLocation').value.trim(),
    description: $('#milestoneDescription').value.trim(),
    participants: [...draftMilestonePeople],
    albumId: $('#milestoneAlbum').value || null,
    photos: [...draftMilestonePhotos],
  };
  const previous = data.milestones || [];
  data.milestones = previous.filter((event) => event.id !== entry.id).concat(entry);
  if (!(await saveShared())) {
    data.milestones = previous;
    $('#milestoneError').textContent =
      'This milestone was not saved. See the database notice for details.';
    return;
  }
  $('#milestoneDialog').close();
  renderTimeline();
  notify('Milestone saved');
};
async function setMilestoneCover(index) {
  if (savingShared || processingMilestonePhotos || !draftMilestonePhotos[index]) return;
  const previousDraft = [...draftMilestonePhotos],
    cover = draftMilestonePhotos[index];
  draftMilestonePhotos.splice(index, 1);
  draftMilestonePhotos.unshift(cover);
  renderMilestonePhotos();
  const id = $('#milestoneId').value,
    event = (data.milestones || []).find((event) => event.id === id);
  if (!event) {
    if ($('#milestoneForm').reportValidity()) $('#milestoneForm').requestSubmit();
    else
      $('#milestoneError').textContent =
        'Add a title and date to save this new milestone and its cover.';
    return;
  }
  const previous = data.milestones,
    photos = [...(event.photos || [])],
    oldIndex = photos.indexOf(cover);
  if (oldIndex >= 0) photos.splice(oldIndex, 1);
  photos.unshift(cover);
  data.milestones = previous.map((item) => (item.id === id ? { ...item, photos } : item));
  $('#milestonePhotoStatus').textContent = 'Saving cover…';
  if (!(await saveShared())) {
    data.milestones = previous;
    draftMilestonePhotos = previousDraft;
    renderMilestonePhotos();
    $('#milestonePhotoStatus').textContent = '';
    $('#milestoneError').textContent =
      'Cover was not saved. Please retry after resolving the database notice.';
    return;
  }
  draftMilestonePhotos[0] = data.milestones.find((item) => item.id === id).photos[0];
  renderMilestonePhotos();
  renderTimeline();
  $('#milestoneError').textContent = '';
  $('#milestonePhotoStatus').textContent = 'Cover saved';
}
function renderMilestonePhotos() {
  $('#milestonePhotoPreview').innerHTML = draftMilestonePhotos
    .map(
      (photo, i) =>
        `<div class="milestone-photo"><button type="button" class="open-gallery-photo" data-preview-photo="${i}" aria-label="View milestone item ${
          i + 1
        }">${milestoneMediaPreview(
          photo,
          '',
          `Milestone item ${i + 1}`,
        )}</button><button type="button" data-remove-photo="${i}" aria-label="Remove item ${
          i + 1
        }">×</button>${
          i === 0
            ? '<span class="cover-badge">Cover</span>'
            : `<button type="button" class="set-photo-cover" data-cover-photo="${i}" aria-label="Set photo ${
                i + 1
              } as cover">Set as cover</button>`
        }</div>`,
    )
    .join('');
  document
    .querySelectorAll('[data-cover-photo]')
    .forEach(
      (button) => (button.onclick = () => setMilestoneCover(Number(button.dataset.coverPhoto))),
    );
  document
    .querySelectorAll('[data-preview-photo]')
    .forEach(
      (button) =>
        (button.onclick = () =>
          openPhotoLightbox(
            draftMilestonePhotos,
            Number(button.dataset.previewPhoto),
            $('#milestoneTitle').value || 'Milestone pictures',
          )),
    );
  document.querySelectorAll('[data-remove-photo]').forEach(
    (button) =>
      (button.onclick = () => {
        draftMilestonePhotos.splice(Number(button.dataset.removePhoto), 1);
        renderMilestonePhotos();
      }),
  );
}
async function addMilestonePhotos(files) {
  if (processingMilestonePhotos || savingShared) {
    notify('Wait for the current photos to finish processing.');
    return;
  }
  const session = milestonePhotoSession;
  $('#milestoneError').textContent = '';
  processingMilestonePhotos = true;
  $('#milestoneSave').disabled = true;
  try {
    for (const file of files) {
      const video = /\.(mp4|mov)$/i.test(file.name);
      if (video ? file.size > 100000000 : !file.type.startsWith('image/') || file.size > 20000000)
        throw new Error('Choose images under 20 MB, or MP4/MOV videos under 100 MB.');
      const photo = video ? await readVideoFile(file) : await resizePhoto(file, 1600);
      if (session !== milestonePhotoSession) return;
      draftMilestonePhotos.push(photo);
      renderMilestonePhotos();
    }
  } catch (error) {
    if (session === milestonePhotoSession)
      $('#milestoneError').textContent = error.message || 'Could not open this image.';
  } finally {
    if (session === milestonePhotoSession) {
      processingMilestonePhotos = false;
      $('#milestoneSave').disabled = false;
      $('#milestonePhotos').value = '';
    }
  }
}
$('#milestonePhotos').onchange = (event) => addMilestonePhotos([...event.target.files]);
$('#milestoneDelete').onclick = async () => {
  if (savingShared || !confirm('Delete this timeline milestone?')) return;
  const previous = data.milestones;
  data.milestones = previous.filter((event) => event.id !== $('#milestoneId').value);
  if (!(await saveShared())) {
    data.milestones = previous;
    return;
  }
  $('#milestoneDialog').close();
  renderTimeline();
  notify('Milestone deleted');
};
$('#addBirthdays').onclick = () => {
  tab(true);
  const missing = data.people.find(
    (p) => !(p.dateDetails?.birth || p.birthday) || p.dateDetails?.birth === 'Date unknown',
  );
  edit(missing?.id);
  $('#birthday').focus();
};

function upcomingAnniversaries(people, milestones, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const candidates = [];
  for (const p of people) {
    if (!p.deceased)
      candidates.push({
        date: p.dateDetails?.birth || p.birthday,
        title: displayName(p),
        kind: 'Birthday',
        personId: p.id,
      });
    if (p.deceased)
      candidates.push({
        date: p.dateDetails?.death,
        title: displayName(p),
        kind: 'Remembrance',
        personId: p.id,
      });
  }
  for (const event of milestones)
    if (event.type === 'marriage')
      candidates.push({
        date: event.date,
        title: event.title,
        kind: 'Wedding Anniversary',
        milestoneId: event.id,
      });
  return candidates
    .flatMap((event) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date || '') || !validFamilyDate(event.date)) return [];
      const [year, month, day] = event.date.split('-').map(Number);
      const occurrence = (y) =>
        new Date(y, month - 1, Math.min(day, new Date(y, month, 0).getDate()));
      let next = occurrence(start.getFullYear());
      if (next < start) next = occurrence(start.getFullYear() + 1);
      const days = Math.round((next - start) / 86400000);
      if (days > 90 || next.getFullYear() < year) return [];
      return [{ ...event, next, days, years: next.getFullYear() - year }];
    })
    .sort((a, b) => a.next - b.next || a.title.localeCompare(b.title));
}
function onThisDayEvents(people, milestones, today = new Date()) {
  const targetMonth = today.getMonth() + 1;
  const targetDay = today.getDate();
  const currentYear = today.getFullYear();
  const candidates = [];
  for (const p of people) {
    if (p.dateDetails?.birth || p.birthday)
      candidates.push({
        date: p.dateDetails?.birth || p.birthday,
        title: displayName(p),
        kind: 'Birthday',
        type: 'birth',
        personId: p.id,
        deceased: p.deceased,
      });
    if (p.deceased && p.dateDetails?.death)
      candidates.push({
        date: p.dateDetails.death,
        title: displayName(p),
        kind: 'Remembrance',
        type: 'death',
        personId: p.id,
      });
  }
  for (const event of milestones)
    if (event.date)
      candidates.push({
        date: event.date,
        title: event.title,
        kind: event.type === 'marriage' ? 'Wedding Anniversary' : (milestoneTypes[event.type] || 'Milestone'),
        type: event.type,
        milestoneId: event.id,
      });
  return candidates
    .flatMap((event) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date || '') || !validFamilyDate(event.date)) return [];
      const [year, month, day] = event.date.split('-').map(Number);
      const isLeapDay = month === 2 && day === 29;
      const isLeapYearNow = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0;
      const matches = (month === targetMonth && day === targetDay) ||
        (isLeapDay && targetMonth === 2 && targetDay === 28 && !isLeapYearNow);
      if (!matches) return [];
      const yearsAgo = currentYear - year;
      if (yearsAgo < 0) return [];
      return [{ ...event, year, yearsAgo }];
    })
    .sort((a, b) => b.yearsAgo - a.yearsAgo || a.title.localeCompare(b.title));
}
function renderUpcomingAnniversaries() {
  ui.sync(data);
}
