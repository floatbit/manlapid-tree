let personEditBaseline = '',
  personPulseTimer;
function personEditSnapshot() {
  return JSON.stringify({
    fields: [...$('#personForm').querySelectorAll('input, textarea, select')]
      .filter((field) => !field.classList.contains('relation-person-search'))
      .map((field) => [
        field.id || field.className,
        field.type === 'checkbox' ? field.checked : field.value,
      ]),
    photo: droppedPortraitFile
      ? [droppedPortraitFile.name, droppedPortraitFile.size, droppedPortraitFile.lastModified]
      : draftPhoto,
    birthplace: draftBirthplace,
    places: livedDraft,
  });
}
function updatePersonUnsaved() {
  if (!personEditBaseline) return;
  const dirty = personEditSnapshot() !== personEditBaseline;
  const form = $('#personForm');
  form.classList.toggle('has-unsaved-changes', dirty);
  form.classList.remove('save-person-pulse');
  clearTimeout(personPulseTimer);
  if (dirty)
    personPulseTimer = setTimeout(() => {
      form.classList.add('save-person-pulse');
    }, 180);
}
$('#deathDate').addEventListener('input', () => {
  if ($('#deathDate').value.trim()) $('#deceased').checked = true;
});
$('#personForm').addEventListener('input', updatePersonUnsaved);
$('#personForm').addEventListener('change', updatePersonUnsaved);
function selectPersonFromDirectory(id) {
  const selected = person(id);
  if (!selected) return;
  edit(id);
  window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  notify(`Editing ${displayName(selected)}`);
}

function directory() {
  const connected = new Set(data.links.flatMap((link) => [link.a, link.b]));
  const noConnections = data.people
    .filter((p) => !connected.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const noBirthdays = data.people
    .filter((p) => !(p.dateDetails?.birth || p.birthday) || p.dateDetails?.birth === 'Date unknown')
    .sort((a, b) => a.name.localeCompare(b.name));
  const noBirthplaces = data.people
    .filter((p) => !p.birthplace?.location?.trim())
    .sort((a, b) => a.name.localeCompare(b.name));
  const noCurrentLocations = data.people
    .filter((p) => !p.location?.trim())
    .sort((a, b) => a.name.localeCompare(b.name));
  const missingSection = (title, people, kind) =>
    `<section class="directory-missing"><h3>${title} <span>${
      people.length
    }</span></h3><div class="directory-missing-list">${
      people
        .map(
          (p) =>
            `<button type="button" data-missing-person="${esc(
              p.id,
            )}" data-missing-kind="${kind}">${esc(displayName(p))} ↗</button>`,
        )
        .join('') || '<p>Everyone is up to date.</p>'
    }</div></section>`;
  $('#peopleList').innerHTML = `<h3>${
    data.people.length
  } people</h3><label for="directorySearch">Find a person to edit</label><div class="directory-search-field"><input id="directorySearch" type="search" placeholder="Search by name…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="directoryMatches"><button id="clearDirectorySearch" type="button" aria-label="Clear people search" hidden>×</button></div><div id="directoryMatches" role="listbox" hidden></div>${missingSection(
    'No Connections',
    noConnections,
    'connections',
  )}${missingSection('No Birthday', noBirthdays, 'birthday')}${missingSection(
    'No Birthplace',
    noBirthplaces,
    'birthplace',
  )}${missingSection('No Current Location', noCurrentLocations, 'location')}`;
  $('#peopleList')
    .querySelectorAll('[data-missing-person]')
    .forEach(
      (button) =>
        (button.onclick = () => {
          selectPersonFromDirectory(button.dataset.missingPerson);
          if (button.dataset.missingKind === 'birthday')
            $('#birthday').focus({ preventScroll: true });
        }),
    );
  const input = $('#directorySearch'),
    list = $('#directoryMatches');
  let matches = [],
    active = -1;
  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }
  function select(p) {
    selectPersonFromDirectory(p.id);
  }
  function highlight() {
    [...list.children].forEach((button, i) => {
      button.classList.toggle('search-active', i === active);
      button.setAttribute('aria-selected', String(i === active));
    });
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', 'directory-match-' + active);
      list.children[active]?.scrollIntoView({ block: 'nearest' });
    }
  }
  function search() {
    $('#clearDirectorySearch').hidden = !input.value;
    try {
      localStorage.setItem('kinfolk-people-search-v1', input.value);
    } catch {}
    const query = input.value.trim().toLocaleLowerCase();
    active = -1;
    input.removeAttribute('aria-activedescendant');
    if (!query) {
      close();
      return;
    }
    matches = data.people
      .filter((p) => p.name.toLocaleLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    list.innerHTML =
      matches
        .map(
          (p, i) =>
            `<button type="button" role="option" aria-selected="false" id="directory-match-${i}">${esc(
              displayName(p),
            )}</button>`,
        )
        .join('') || '<p>No matching people.</p>';
    if (matches.length)
      [...list.children].forEach((button, i) => (button.onclick = () => select(matches[i])));
  }
  $('#clearDirectorySearch').onclick = () => {
    input.value = '';
    search();
    input.focus();
  };
  input.oninput = search;
  input.onfocus = search;
  input.onkeydown = (event) => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.hidden) search();
      if (matches.length && !list.hidden) {
        active =
          active < 0
            ? event.key === 'ArrowDown'
              ? 0
              : matches.length - 1
            : (active + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
        highlight();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!list.hidden && matches.length) select(matches[Math.max(0, active)]);
    } else if (event.key === 'Escape' || event.key === 'Tab') close();
  };
  $('#peopleList').onfocusout = null;
  $('#requestEmail').value = data.email;
  try {
    input.value = localStorage.getItem('kinfolk-people-search-v1') || '';
  } catch {}
  if (input.value.trim()) search();
}

function updateConnectionsCount() {
  $('#connectionsCount').textContent = new Set(
    [...document.querySelectorAll('#relations .relation-person-id')]
      .map((input) => input.value)
      .filter(Boolean),
  ).size;
}
let relationPickerSerial = 0;
function relationRow(value = {}) {
  const row = document.createElement('div');
  row.className = 'relation-row';
  const pickerId = 'relation-picker-' + ++relationPickerSerial;
  row.innerHTML = `<div class="relation-person-picker"><input type="hidden" class="relation-person-id" value="${esc(
    value.id || '',
  )}"><input class="relation-person-search" aria-label="Family member" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${pickerId}" autocomplete="off" placeholder="Search for a person…" value="${esc(
    person(value.id) ? displayName(person(value.id)) : '',
  )}"><div id="${pickerId}" class="relation-person-matches" role="listbox" hidden></div></div><span class="relation-phrase">is their</span><select aria-label="Relationship">${[
    'parent',
    'child',
    'sibling',
    'spouse',
  ]
    .map((t) => `<option ${value.type === t ? 'selected' : ''}>${t}</option>`)
    .join(
      '',
    )}</select><button type="button" class="remove-relation" aria-label="Remove connection">×</button>`;
  const input = row.querySelector('.relation-person-search'),
    hidden = row.querySelector('.relation-person-id'),
    list = row.querySelector('[role="listbox"]');
  let matches = [],
    active = -1;
  function close() {
    list.hidden = true;
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function choose(p) {
    hidden.value = p.id;
    updateConnectionsCount();
    updatePersonUnsaved();
    input.value = displayName(p);
    input.setCustomValidity('');
    close();
    input.focus();
  }
  function highlight() {
    [...list.querySelectorAll('button')].forEach((button, i) => {
      button.classList.toggle('search-active', i === active);
      button.setAttribute('aria-selected', String(i === active));
    });
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', pickerId + '-' + active);
      list.children[active]?.scrollIntoView({ block: 'nearest' });
    }
  }
  function search() {
    const query = input.value.trim().toLocaleLowerCase();
    if (!query) {
      matches = [];
      close();
      return;
    }
    active = -1;
    input.removeAttribute('aria-activedescendant');
    matches = data.people
      .filter(
        (p) =>
          p.id !== $('#personId').value &&
          (p.name.toLocaleLowerCase().includes(query) ||
            displayName(p).toLocaleLowerCase().includes(query)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    list.innerHTML =
      matches
        .map(
          (p, i) =>
            `<button type="button" id="${pickerId}-${i}" role="option" aria-selected="false">${esc(
              displayName(p),
            )}</button>`,
        )
        .join('') || '<p>No matching people.</p>';
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    list
      .querySelectorAll('button')
      .forEach((button, i) => (button.onclick = () => choose(matches[i])));
  }
  input.oninput = () => {
    hidden.value = '';
    updateConnectionsCount();
    updatePersonUnsaved();
    input.setCustomValidity(input.value.trim() ? 'Select a person from the matches.' : '');
    search();
  };
  input.onfocus = () => {
    if (!hidden.value) search();
  };
  input.onkeydown = (event) => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.hidden) search();
      if (matches.length && !list.hidden) {
        active =
          active < 0
            ? event.key === 'ArrowDown'
              ? 0
              : matches.length - 1
            : (active + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
        highlight();
      }
    } else if (event.key === 'Enter' && !list.hidden) {
      event.preventDefault();
      if (matches.length) choose(matches[Math.max(0, active)]);
    } else if (event.key === 'Escape' && !list.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') close();
  };
  row.querySelector('.relation-person-picker').onfocusout = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };
  row.querySelector('.remove-relation').onclick = () => {
    row.remove();
    updateConnectionsCount();
    updatePersonUnsaved();
  };
  $('#relations').append(row);
  updateConnectionsCount();
}

let droppedPortraitFile = null,
  portraitPreviewVersion = 0;
function edit(id, { updateUrl = true } = {}) {
  personEditBaseline = '';
  clearTimeout(personPulseTimer);
  $('#personForm').classList.remove('has-unsaved-changes', 'save-person-pulse');
  droppedPortraitFile = null;
  portraitPreviewVersion++;
  const p = person(id);
  $('#personForm').reset();
  $('#personId').value = p?.id || '';
  $('#deceased').checked = !!p?.deceased;
  $('#formTitle').textContent = p ? 'Edit ' + displayName(p) : 'Add a Person';
  for (const field of ['firstName', 'middleName', 'lastName', 'bio', 'birthday', 'location'])
    $('#' + field).value = (field.endsWith('Name') ? nameParts(p)[field] : p?.[field]) || '';
  $('#locationPlaceId').value = p?.locationPlaceId || '';
  $('#locationLat').value = p?.locationLat ?? '';
  $('#locationLng').value = p?.locationLng ?? '';
  $('#birthday').value = p?.dateDetails?.birth || p?.birthday || '';
  $('#deathDate').value = p?.dateDetails?.death || '';
  $('#currentLocationSince').value = p?.dateDetails?.currentSince || '';
  resetLocationFinder();
  draftPhoto = p?.photo || '';
  $('#personPhotoPreview').innerHTML = draftPhoto
    ? `<img src="${esc(draftPhoto)}" alt="Portrait preview">`
    : '';
  $('#relations').innerHTML = '';
  if (p) connectionsDirect(id).forEach(relationRow);
  updateConnectionsCount();
  $('#delete').hidden = !p;
  $('#formError').textContent = '';
  renderPlacesLived(p?.locationHistory || []);
  renderBirthplace(p?.birthplace || null);
  personEditBaseline = personEditSnapshot();
  if (updateUrl && !$('#editor').hidden) {
    const url = new URL(location.href);
    url.hash = p ? new URLSearchParams({ editPerson: p.id }).toString() : 'people';
    history.replaceState(null, '', url);
  }
}
$('#personForm').onsubmit = async (event) => {
  event.preventDefault();
  if (placesLivedPending() || birthplacePending) {
    $('#formError').textContent = 'Wait for the place lookup to finish.';
    return;
  }
  if (locationLookupPending) {
    $('#formError').textContent = 'Please wait for the location lookup to finish.';
    return;
  }
  const firstName = $('#firstName').value.trim(),
    middleName = $('#middleName').value.trim(),
    lastName = $('#lastName').value.trim(),
    name = [firstName, middleName, lastName].filter(Boolean).join(' ');
  if (!name) {
    $('#formError').textContent = 'Please enter a name.';
    return;
  }
  const dateDetails = {
    birth: $('#birthday').value.trim(),
    death: $('#deathDate').value.trim(),
    currentSince: $('#currentLocationSince').value.trim(),
  };
  if (!Object.values(dateDetails).every(validFamilyDate)) {
    $('#formError').textContent = 'Use YYYY-MM-DD, 1940, About 1940, or Date unknown.';
    return;
  }
  const id = $('#personId').value || crypto.randomUUID();
  let photo = draftPhoto;
  const file = droppedPortraitFile || $('#photo').files[0];
  if (file) {
    try {
      photo = await resizePhoto(file);
    } catch {
      $('#formError').textContent = 'Please choose a valid image.';
      return;
    }
  }
  const p = {
    id,
    name,
    firstName,
    middleName,
    lastName,
    photo,
    deceased: $('#deceased').checked,
    bio: $('#bio').value.trim(),
    birthday: /^\d{4}-\d{2}-\d{2}$/.test(dateDetails.birth) ? dateDetails.birth : '',
    dateDetails,
    location: $('#location').value.trim(),
    locationPlaceId: $('#locationPlaceId').value,
    locationLat: $('#locationLat').value === '' ? null : Number($('#locationLat').value),
    locationLng: $('#locationLng').value === '' ? null : Number($('#locationLng').value),
    locationHistory: readPlacesLived(),
    birthplace: draftBirthplace ? { ...draftBirthplace } : null,
  };
  if (!p.locationHistory) return;
  const links = [];
  const seen = new Set();
  for (const row of document.querySelectorAll('.relation-row')) {
    const who = row.querySelector('.relation-person-id'),
      type = row.querySelector('select');
    if (!who.value) continue;
    if (seen.has(who.value)) {
      $('#formError').textContent = 'Choose each family member only once.';
      return;
    }
    seen.add(who.value);
    links.push({ a: id, b: who.value, type: type.value });
  }
  const previous = JSON.stringify(data);
  data.people = data.people.filter((p) => p.id !== id).concat(p);
  data.links = data.links.filter((l) => l.a !== id && l.b !== id).concat(links);
  if (!(await saveShared())) {
    data = JSON.parse(previous);
    return;
  }
  directory();
  edit(id);
  render();
  notify('Person saved');
};
function resizePhoto(file, maxDimension = 320) {
  return new Promise((resolve, reject) => {
    const img = new Image(),
      url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(1, maxDimension / Math.max(img.width, img.height));
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not open this image. Choose a JPEG, PNG, or WebP photo.'));
    };
    img.src = url;
  });
}
async function previewPortrait(file) {
  const version = ++portraitPreviewVersion;
  if (!file) return;
  try {
    if (!file.type.startsWith('image/') || file.size > 20000000)
      throw new Error('Choose one image under 20 MB.');
    const photo = await resizePhoto(file);
    if (version === portraitPreviewVersion)
      $('#personPhotoPreview').innerHTML = `<img src="${esc(photo)}" alt="Portrait preview">`;
  } catch (error) {
    if (version === portraitPreviewVersion)
      $('#formError').textContent = error.message || 'Could not open this image.';
  }
}
$('#photo').onchange = (event) => {
  droppedPortraitFile = null;
  $('#formError').textContent = '';
  previewPortrait(event.target.files[0]);
};
function setupPhotoDropZone(zone, input, onFiles) {
  const isFileDrag = (event) => Array.from(event.dataTransfer?.types || []).includes('Files');
  zone.addEventListener('dragover', (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    zone.classList.add('is-dragover');
  });
  zone.addEventListener('dragenter', (event) => {
    if (isFileDrag(event)) {
      event.preventDefault();
      zone.classList.add('is-dragover');
    }
  });
  zone.addEventListener('dragleave', (event) => {
    if (!zone.contains(event.relatedTarget)) zone.classList.remove('is-dragover');
  });
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    zone.classList.remove('is-dragover');
    const files = [...event.dataTransfer.files];
    if (files.length) onFiles(files);
  });
  zone.addEventListener('keydown', (event) => {
    if (event.target === zone && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      input.click();
    }
  });
  zone.addEventListener('click', (event) => {
    if (event.target === zone || event.target.closest('.dropzone-instructions')) input.click();
  });
}
setupPhotoDropZone($('#milestonePhotoDrop'), $('#milestonePhotos'), addMilestonePhotos);
setupPhotoDropZone($('#personPhotoDrop'), $('#photo'), (files) => {
  if (files.length !== 1 || !files[0].type.startsWith('image/') || files[0].size > 20000000) {
    $('#formError').textContent = 'Drop one image under 20 MB for a portrait.';
    return;
  }
  droppedPortraitFile = files[0];
  $('#photo').value = '';
  $('#formError').textContent = '';
  previewPortrait(files[0]);
  updatePersonUnsaved();
});
$('#delete').onclick = async () => {
  const id = $('#personId').value;
  if (!confirm('Delete this person and their connections?')) return;
  const previous = JSON.stringify(data);
  data.people = data.people.filter((p) => p.id !== id);
  data.milestones = (data.milestones || []).map((event) => ({
    ...event,
    participants: event.participants.filter((personId) => personId !== id),
  }));
  data.links = data.links.filter((l) => l.a !== id && l.b !== id);
  data.visible = data.visible.filter((i) => i !== id);
  data.expanded = data.expanded.filter((i) => i !== id);
  if (data.selected === id) data.selected = null;
  if (data.root === id) data.root = null;
  if (!(await saveShared())) {
    data = JSON.parse(previous);
    return;
  }
  directory();
  edit();
  render();
};
$('#treeTab').onclick = () => tab(false);
$('#peopleTab').onclick = () => tab(true);
$('#newPerson').onclick = () => edit();
$('#addFirst').onclick = () => {
  tab(true);
  edit();
  $('#firstName').focus();
};
$('#cancel').onclick = () => edit();
$('#addRelation').onclick = () => relationRow();
$('#search').oninput = search;
$('#searchGo').onclick = search;
$('#search').onkeydown = handleSearchKey;
$('#reset').onclick = () => {
  relationshipTrace = null;
  data.visible = [];
  data.expanded = [];
  data.selected = null;
  data.root = null;
  $('#search').value = '';
  closeSearch();
  save();
  render();
};
$('#requestEmail').onchange = async (e) => {
  if (e.target.validity.valid) {
    const previous = data.email;
    data.email = e.target.value.trim();
    if (await saveShared()) notify('Requests email saved');
    else {
      data.email = previous;
      e.target.value = previous;
    }
  }
};
window.addEventListener('resize', () => {
  render();
  fitGraph();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search')) $('#results').innerHTML = '';
});

function alignPersonActions() {
  const form = $('#personForm');
  if (!form.getClientRects().length) return;
  const box = form.querySelector('.locations-section');
  const edge = box.getBoundingClientRect().right;
  form.style.setProperty(
    '--person-actions-right',
    `${Math.max(12, document.documentElement.clientWidth - edge)}px`,
  );
}
new ResizeObserver(alignPersonActions).observe($('#personForm'));
new ResizeObserver(alignPersonActions).observe($('#personForm .locations-section'));
window.addEventListener('resize', alignPersonActions);
