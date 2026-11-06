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
  updateDeathDateVisibility();
});
function updateDeathDateVisibility() {
  $('#deathDateField').hidden = !$('#deceased').checked;
  $('#deathDateHint').hidden = !$('#deceased').checked;
}
$('#deceased').addEventListener('change', updateDeathDateVisibility);
$('#personForm').addEventListener('input', updatePersonUnsaved);
$('#personForm').addEventListener('change', updatePersonUnsaved);
function selectPersonFromDirectory(id) {
  const selected = person(id);
  if (!selected) return;
  edit(id);
  window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  notify(`Editing ${displayName(selected)}`);
}

function renderOverview() {
  ui.sync(data);
}

function directory() {
  ui.sync(data);
  $('#requestEmail').value = data.email;
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
  ui.addRelation(
    {
      id: value.id,
      type: value.type || 'parent',
      pickerId: 'relation-picker-' + ++relationPickerSerial,
      owner: () => document.querySelector('#personId').value,
    },
    () => {
      updateConnectionsCount();
      updatePersonUnsaved();
    },
  );
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
  $('#nicknames').value = JSON.stringify(p?.nicknames || []);
  renderNicknameTags();
  $('#formTitle').textContent = p ? 'Edit ' + displayName(p) : 'Add a Person';
  for (const field of ['firstName', 'middleName', 'lastName', 'bio', 'birthday', 'location'])
    $('#' + field).value = (field.endsWith('Name') ? nameParts(p)[field] : p?.[field]) || '';
  $('#locationPlaceId').value = p?.locationPlaceId || '';
  $('#locationLat').value = p?.locationLat ?? '';
  $('#locationLng').value = p?.locationLng ?? '';
  $('#birthday').value = p?.dateDetails?.birth || p?.birthday || '';
  $('#deathDate').value = p?.dateDetails?.death || '';
  updateDeathDateVisibility();
  $('#currentLocationSince').value = p?.dateDetails?.currentSince || '';
  resetLocationFinder();
  draftPhoto = p?.photo || '';
  $('#personPhotoPreview').innerHTML = draftPhoto
    ? `<img src="${esc(draftPhoto)}" alt="Portrait preview">`
    : '';
  ui.clearRelations();
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
    nicknames: readPersonNicknames(),
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

function readPersonNicknames() {
  const names = [
    ...JSON.parse($('#nicknames').value || '[]'),
    ...$('#nicknameInput').value.split(','),
  ];
  return [
    ...new Map(
      names.map((name) => [name.trim().toLocaleLowerCase(), name.trim()]).filter(([key]) => key),
    ).values(),
  ];
}
function renderNicknameTags() {
  ui.setNicknames(JSON.parse(document.querySelector('#nicknames').value || '[]'));
}
