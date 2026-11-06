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
  easter: '✿',
  mothers_day: '❀',
  memorial_day: '★',
  fathers_day: '★',
  independence_day: '✦',
  labor_day: '★',
  halloween: '🎃',
  thanksgiving: '❧',
  hanukkah: '✦',
  christmas: '🎄',
  new_years_eve: '✦',
  holiday: '✦',
  birthday_party: '🎂',
  marriage: '♡',
  move: '⌂',
  graduation: '◇',
  reunion: '✳',
  other: '★',
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
function renderTimeline() {
  renderUpcomingAnniversaries();
  const births = birthEvents(data.people),
    events = timelineItems(),
    missing = data.people.length - births.length,
    years = new Map();
  for (const event of events) {
    const year = familyDateYear(event.date) || 'Date Unknown';
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(event);
  }
  $('#timelineSummary').textContent = `${births.length} ${
    births.length === 1 ? 'birth' : 'births'
  } · ${(data.milestones || []).length} ${
    (data.milestones || []).length === 1 ? 'milestone' : 'milestones'
  }${missing ? ` · ${missing} ${missing === 1 ? 'person needs' : 'people need'} a birthday` : ''}`;
  const dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  $('#timelineEvents').innerHTML = events.length
    ? [...years]
        .map(
          ([year, items]) =>
            `<section class="birth-year" aria-label="Family events in ${year}"><h2>${year}</h2><div class="birth-cards">${items
              .map((event) => {
                if (event.kind === 'birth' || event.kind === 'death') {
                  const p = event.person;
                  return `<button class="birth-event" data-birth-person="${p.id}">${avatar(
                    p,
                  )}<span><small>${
                    event.kind === 'death' ? 'IN REMEMBRANCE' : 'WELCOME TO THE FAMILY'
                  }</small><strong>${esc(displayName(p))} ${
                    event.kind === 'death' ? 'passed away' : 'was born'
                  }</strong><time>${esc(
                    familyDateLabel(event.date),
                  )}</time></span><span class="birth-arrow" aria-hidden="true">↗</span></button>`;
                }
                const names = (event.participants || [])
                  .map((id) => (person(id) ? displayName(person(id)) : ''))
                  .filter(Boolean);
                return `<article class="birth-event milestone-event">${
                  event.photos?.length
                    ? `<button class="milestone-gallery" data-gallery="${
                        event.id
                      }" aria-label="View ${event.photos.length} media items from ${esc(
                        event.title,
                      )}">${milestoneMediaPreview(
                        event.photos[0],
                        'avatar milestone-cover',
                        event.title,
                      )}</button>`
                    : `<span class="avatar milestone-icon">${
                        milestoneIcons[event.type] || '★'
                      }</span>`
                }<button class="milestone-details" data-milestone="${event.id}"><span><small>${
                  milestoneTypes[event.type] || 'Milestone'
                }</small><strong>${esc(event.title)}</strong><time datetime="${
                  event.date
                }">${dateFormat.format(new Date(event.date + 'T12:00:00Z'))}${
                  event.location ? ' · ' + esc(event.location) : ''
                }</time>${
                  names.length
                    ? `<span class="milestone-people">${esc(names.join(', '))}</span>`
                    : ''
                }${
                  event.photos?.length
                    ? `<span class="milestone-photo-count">▧ ${milestoneMediaCount(
                        event.photos,
                      )}</span>`
                    : ''
                }</span><span class="birth-arrow" aria-hidden="true">↗</span></button></article>`;
              })
              .join('')}</div></section>`,
        )
        .join('')
    : '<div class="timeline-empty"><span>✳</span><h2>A Lifetime of Stories Starts Here.</h2><p>Add birthdays in People or record your first family milestone.</p></div>';
  document
    .querySelectorAll('[data-birth-person]')
    .forEach((button) => (button.onclick = () => start(button.dataset.birthPerson)));
  document.querySelectorAll('[data-gallery]').forEach(
    (button) =>
      (button.onclick = () => {
        const event = data.milestones.find((event) => event.id === button.dataset.gallery);
        openPhotoLightbox(event.photos, 0, event.title);
      }),
  );
  document
    .querySelectorAll('[data-milestone]')
    .forEach((button) => (button.onclick = () => openMilestone(button.dataset.milestone)));
}
let draftMilestonePhotos = [],
  milestonePhotoSession = 0,
  processingMilestonePhotos = false;
let draftMilestonePeople = [];
function renderMilestonePeople() {
  $('#milestonePeople').innerHTML =
    '<div id="milestonePersonTags"></div><input id="milestonePersonSearch" type="text" placeholder="Type a name to add people…" autocomplete="off" role="combobox" aria-label="Search people involved" aria-autocomplete="list" aria-expanded="false" aria-controls="milestonePersonMatches"><div id="milestonePersonMatches" role="listbox" hidden></div>';
  const input = $('#milestonePersonSearch'),
    matches = $('#milestonePersonMatches');
  let active = -1,
    results = [];
  function tags() {
    $('#milestonePersonTags').innerHTML = draftMilestonePeople
      .filter((id) => person(id))
      .map(
        (id) =>
          `<button type="button" class="person-tag" data-remove-participant="${esc(
            id,
          )}" aria-label="Remove ${esc(firstLastName(person(id)))}">${esc(
            firstLastName(person(id)),
          )} <span aria-hidden="true">×</span></button>`,
      )
      .join('');
    document.querySelectorAll('[data-remove-participant]').forEach(
      (button) =>
        (button.onclick = () => {
          draftMilestonePeople = draftMilestonePeople.filter(
            (id) => id !== button.dataset.removeParticipant,
          );
          tags();
          suggest();
          input.focus();
        }),
    );
  }
  function choose(id) {
    if (!draftMilestonePeople.includes(id)) draftMilestonePeople.push(id);
    input.value = '';
    tags();
    suggest();
    input.focus();
  }
  function highlight() {
    [...matches.querySelectorAll('[role="option"]')].forEach((button, i) => {
      button.classList.toggle('search-active', i === active);
      button.setAttribute('aria-selected', String(i === active));
    });
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', 'milestone-person-' + active);
      matches.children[active]?.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }
  function suggest() {
    const query = input.value.trim().toLocaleLowerCase();
    active = -1;
    if (!query) {
      results = [];
      matches.replaceChildren();
      close();
      return;
    }
    results = data.people
      .filter((p) => !draftMilestonePeople.includes(p.id) && personMatchesQuery(p, query))
      .sort((a, b) => firstLastName(a).localeCompare(firstLastName(b)))
      .slice(0, 10);
    matches.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    matches.innerHTML =
      results
        .map(
          (p, i) =>
            `<button type="button" role="option" id="milestone-person-${i}" aria-selected="false" data-participant="${esc(
              p.id,
            )}">${esc(firstLastName(p))}</button>`,
        )
        .join('') +
      '<p class="picker-status">' +
      (results.length ? '' : 'No matching people.') +
      '</p>';
    matches
      .querySelectorAll('[data-participant]')
      .forEach((button) => (button.onclick = () => choose(button.dataset.participant)));
    highlight();
  }
  function close() {
    matches.hidden = true;
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  input.oninput = suggest;
  input.onfocus = suggest;
  input.onkeydown = (event) => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (matches.hidden) suggest();
      if (results.length) {
        active =
          (active + (event.key === 'ArrowDown' ? 1 : active < 0 ? 0 : -1) + results.length) %
          results.length;
        highlight();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!matches.hidden && results.length) choose(results[Math.max(0, active)].id);
    } else if (event.key === 'Escape' && !matches.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') close();
  };
  $('#milestonePeople').onfocusout = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };
  tags();
}
function openMilestone(id) {
  milestonePhotoSession++;
  processingMilestonePhotos = false;
  $('#milestoneSave').disabled = false;
  const event = (data.milestones || []).find((event) => event.id === id);
  $('#milestoneForm').reset();
  $('#milestoneId').value = event?.id || '';
  $('#milestoneHeading').textContent = event ? 'Edit Milestone' : 'Add a Family Milestone';
  for (const field of ['title', 'type', 'date', 'location', 'description'])
    $('#milestone' + field[0].toUpperCase() + field.slice(1)).value =
      event?.[field] || (field === 'type' ? 'marriage' : '');
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
  $('#milestoneTitle').focus();
}
$('#addMilestone').onclick = () => openMilestone();
$('#milestoneCancel').onclick = () => $('#milestoneDialog').close();
$('#milestoneDialog').addEventListener('close', () => {
  milestonePhotoSession++;
});
$('#milestoneForm').onsubmit = async (event) => {
  event.preventDefault();
  if (savingShared || processingMilestonePhotos) return;
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
$('#timelineTab').onclick = () => showSection('timeline');
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
function renderUpcomingAnniversaries() {
  const events = upcomingAnniversaries(data.people, data.milestones || []);
  $('#upcomingAnniversaries').innerHTML =
    '<h2>Upcoming Anniversaries</h2><p class="hint">Next 90 days · February 29 is observed on February 28 in non-leap years.</p>' +
    (events
      .map(
        (event, i) =>
          `<button type="button" data-upcoming="${i}"><small>${esc(event.kind)} · ${
            event.days === 0 ? 'Today' : 'In ' + event.days + ' days'
          }</small><strong>${esc(event.title)}</strong><span>${esc(
            event.next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
          )}${event.years ? ' · ' + event.years + ' years' : ''}</span></button>`,
      )
      .join('') || '<p>No anniversaries with a known month and day in the next 90 days.</p>');
  $('#upcomingAnniversaries')
    .querySelectorAll('[data-upcoming]')
    .forEach(
      (button) =>
        (button.onclick = () => {
          const event = events[Number(button.dataset.upcoming)];
          if (event.personId) {
            showSection('people');
            edit(event.personId);
          } else openMilestone(event.milestoneId);
        }),
    );
}
