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
    headshotOriginal: draftHeadshotOriginal,
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
  if (!document.body.classList.contains('is-editor')) { start(id); return; }
  const selected = person(id);
  if (!selected) return;
  edit(id);
  if (window.matchMedia('(max-width: 760px)').matches) {
    const top = $('#personForm').getBoundingClientRect().top + window.scrollY - document.querySelector('header').getBoundingClientRect().height - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  } else window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  notify(`Editing ${displayName(selected)}`);
}

function renderOverview() {
  if (collectionRevisions.get('albums') !== sharedRevision)
    return withCollection('albums', () => renderOverview());
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

let draftHeadshotOriginal = '', pendingHeadshotOriginal = '', cropImage = null;
let droppedPortraitFile = null,
  portraitPreviewVersion = 0;
function edit(id, { updateUrl = true } = {}) {
  if (!document.body.classList.contains('is-editor')) return;
  personEditBaseline = '';
  clearTimeout(personPulseTimer);
  $('#personForm').classList.remove('has-unsaved-changes', 'save-person-pulse');
  droppedPortraitFile = null;
  portraitPreviewVersion++;
  const p = person(id);
  $('#personForm').reset();
  $('#currentSpouse').innerHTML = '<option value="">Automatic</option>' + (p ? connectionsDirect(id).filter(c => c.type === 'spouse').map(c => `<option value="${esc(c.id)}">${esc(displayName(person(c.id)))}</option>`).join('') : '');
  $('#currentSpouse').value = p?.currentSpouseId || '';
  $('#personId').value = p?.id || '';
  ui.setEditorPerson(p?.id || '');
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
  draftHeadshotOriginal = p?.headshotOriginal || '';
  $('#cropHeadshot').hidden = !draftPhoto;
  $('#headshotCropDialog').close();
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
  const p = {
    id,
    name,
    firstName,
    nicknames: readPersonNicknames(),
    birthAlbumId: person(id)?.birthAlbumId || '',
    currentSpouseId: $('#currentSpouse').value,
    middleName,
    lastName,
    photo,
    headshotOriginal: draftHeadshotOriginal,
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
function headshotCropRect(width,height,zoom,x,y) {
  const scale=Math.max(550/width,580/height)*zoom;
  return {x:-(width*scale-550)*x,y:-(height*scale-580)*y,width:width*scale,height:height*scale};
}
function drawHeadshotCrop() {
  if (!cropImage) return;
  const canvas=$('#headshotCropCanvas'), zoom=Number($('#headshotCropZoom').value);
  const rect=headshotCropRect(cropImage.width,cropImage.height,zoom,Number($('#headshotCropX').value),Number($('#headshotCropY').value));
  canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
  canvas.getContext('2d').drawImage(cropImage,rect.x,rect.y,rect.width,rect.height);
}
async function openHeadshotCrop(source, version=portraitPreviewVersion) {
  const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Could not open this headshot.'));image.src=source;});
  if(version!==portraitPreviewVersion)return;
  cropImage=image;pendingHeadshotOriginal=source;
  for(const id of ['headshotCropX','headshotCropY'])$('#'+id).value='0.5';
  $('#headshotCropZoom').value='1';drawHeadshotCrop();
  $('#headshotCropDialog').showModal();
}
async function previewPortrait(file) {
  const version=++portraitPreviewVersion;
  if(!file)return;
  try {
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20000000)throw new Error('Choose a JPEG, PNG, or WebP image under 20 MB.');
    const source=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read this image.'));reader.readAsDataURL(file);});
    await openHeadshotCrop(source,version);
  } catch(error){if(version===portraitPreviewVersion)$('#formError').textContent=error.message;}
}
for(const id of ['headshotCropZoom','headshotCropX','headshotCropY'])$('#'+id).oninput=drawHeadshotCrop;
$('#cropHeadshot').onclick=()=>openHeadshotCrop(draftHeadshotOriginal||draftPhoto).catch(error=>{$('#formError').textContent=error.message;});
$('#applyHeadshotCrop').onclick=()=>{
  draftPhoto=$('#headshotCropCanvas').toDataURL('image/jpeg',0.92);
  draftHeadshotOriginal=pendingHeadshotOriginal;
  $('#personPhotoPreview').innerHTML=`<img src="${esc(draftPhoto)}" alt="Portrait preview">`;
  $('#cropHeadshot').hidden=false;$('#headshotCropDialog').close();updatePersonUnsaved();
};
$('#cancelHeadshotCrop').onclick=()=>$('#headshotCropDialog').close();
$('#headshotCropDialog').addEventListener('close',()=>{droppedPortraitFile=null;$('#photo').value='';updatePersonUnsaved();});
let cropDrag;
$('#headshotCropCanvas').onpointerdown=event=>{cropDrag={x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);};
$('#headshotCropCanvas').onpointermove=event=>{
  if(!cropDrag||!cropImage)return;
  const canvas=event.currentTarget,scale=Math.max(550/cropImage.width,580/cropImage.height)*Number($('#headshotCropZoom').value),rect=canvas.getBoundingClientRect();
  const dx=(event.clientX-cropDrag.x)*550/rect.width,dy=(event.clientY-cropDrag.y)*580/rect.height;
  const move=(id,delta,overflow)=>{if(overflow>0)$('#'+id).value=Math.max(0,Math.min(1,Number($('#'+id).value)-delta/overflow));};
  move('headshotCropX',dx,cropImage.width*scale-550);move('headshotCropY',dy,cropImage.height*scale-580);
  cropDrag={x:event.clientX,y:event.clientY};drawHeadshotCrop();
};
$('#headshotCropCanvas').onpointerup=$('#headshotCropCanvas').onpointercancel=()=>{cropDrag=null;};
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
