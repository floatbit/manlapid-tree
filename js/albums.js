let birthAlbumPersonId = null;
async function attachBirthEventAlbum(personId, albumId) {
  return albumRequest({ action: 'attach_birth_album', personId, albumId });
}
async function createBirthEventAlbum(personId) {
  await loadFamilyAlbums();
  const p = person(personId);
  if (!p) return;
  openAlbum();
  birthAlbumPersonId = personId;
  $('#albumTitle').value = displayName(p) + ' — Welcome to the Family';
  const birth = p.dateDetails?.birth || p.birthday || '';
  $('#albumDate').value = /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : '';
  $('#albumMilestoneLink').textContent = 'Birth album for ' + displayName(p);
}
let albumDraftPhotos = [],
  albumUploadSession = 0,
  albumUploading = false;
function sortedAlbums(albums, order = 'newest', query = '') {
  return albums
    .filter((a) => a.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => {
      if (!a.date && !b.date) return a.title.localeCompare(b.title);
      if (!a.date) return 1;
      if (!b.date) return -1;
      return (
        (order === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) ||
        a.title.localeCompare(b.title)
      );
    });
}
function renderAlbums() {
  if (collectionRevisions.get('albums') !== sharedRevision)
    return withCollection('albums', () => renderAlbums());
  ui.sync(data);
  const all = data.albums || [];
  document.querySelector('#albumsSummary').textContent = `${all.length} albums · ${all.reduce(
    (sum, a) => sum + a.photos.length,
    0,
  )} photos and videos`;
  ui.setAlbums(
    sortedAlbums(
      all,
      document.querySelector('#albumOrder').value,
      document.querySelector('#albumSearch').value,
    ),
  );
}
function openAlbum(id) {
  if (collectionRevisions.get('albums') !== sharedRevision)
    return withCollection('albums', () => openAlbum(id));
  const album = (data.albums || []).find((a) => a.id === id);
  if (!document.body.classList.contains('is-editor')) { if(album?.photos.length)openPhotoLightbox(album.photos,0,album.title);return; }
  birthAlbumPersonId = null;
  albumUploadSession++;
  albumUploading = false;
  $('#albumForm').reset();
  $('#albumId').value = album?.id || '';
  $('#albumHeading').textContent = album ? 'Edit Album' : 'Create Album';
  $('#albumTitle').value = album?.title || '';
  $('#albumDate').value = album?.date || '';
  $('#albumDescription').value = album?.description || '';
  albumDraftPhotos = [...(album?.photos || [])];
  $('#albumError').textContent = '';
  $('#albumStatus').textContent = '';
  $('#deleteAlbum').hidden = !album;
  $('#shareAlbum').hidden = !album;
  $('#saveAlbum').disabled = false;
  const event = (data.milestones || []).find((e) => e.id === album?.milestoneId),
    link = $('#albumMilestoneLink');
  link.replaceChildren();
  if (event) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Linked milestone: ' + event.title + ' →';
    button.onclick = () => {
      $('#albumDialog').close();
      showSection('timeline');
      openMilestone(event.id);
    };
    link.append(button);
  } else if (album?.birthPersonId && person(album.birthPersonId)) {
    link.textContent = 'Birth album for ' + displayName(person(album.birthPersonId));
  } else if ((data.familyGroups || []).some(g => g.albumId === album?.id)) {
    link.textContent = 'Family album: ' + data.familyGroups.filter(g => g.albumId === album.id).map(g => g.name).join(', ');
  } else
    link.textContent =
      'Independent album. You can attach it to an event using the Photo album field in Edit milestone.';
  renderAlbumPhotos();
  $('#albumDialog').showModal();
  $('#albumTitle').focus();
}
async function albumRequest(body) {
  if (savingShared || !sharedReady) {
    notify('Please wait for the current save to finish.');
    return false;
  }
  savingShared = true;
  $('#albumForm').inert = true;
  $('#editor').inert = true;
  $('#milestoneForm').inert = true;
  try {
    const result = await requestDatabase({ ...body, revision: sharedRevision });
    applyShared(result);
    $('#databaseNotice').hidden = true;
    renderAlbums();
    if (!$('#timeline').hidden) renderTimeline();
    return true;
  } catch (error) {
    $('#albumError').textContent = error.message;
    notify('Album was not saved. ' + error.message);
    return false;
  } finally {
    savingShared = false;
    $('#albumForm').inert = false;
    $('#editor').inert = false;
    $('#milestoneForm').inert = false;
  }
}
$('#albumForm').onsubmit = async (event) => {
  event.preventDefault();
  if (albumUploading || savingShared) return;
  const album = {
    id: $('#albumId').value || crypto.randomUUID(),
    title: $('#albumTitle').value.trim(),
    date: $('#albumDate').value,
    description: $('#albumDescription').value.trim(),
    photos: [...albumDraftPhotos],
  };
  if (await albumRequest({ action: 'save_album', album, ...(birthAlbumPersonId ? { birthPersonId: birthAlbumPersonId } : {}) })) {
    $('#albumDialog').close();
    notify('Album saved');
  }
};
async function setAlbumCover(index) {
  if (albumUploading || savingShared) return;
  const original = [...albumDraftPhotos],
    cover = albumDraftPhotos[index];
  albumDraftPhotos.splice(index, 1);
  albumDraftPhotos.unshift(cover);
  renderAlbumPhotos();
  const album = (data.albums || []).find((a) => a.id === $('#albumId').value);
  if (!album) {
    if ($('#albumForm').reportValidity()) $('#albumForm').requestSubmit();
    return;
  }
  const photos = [...album.photos],
    previousIndex = photos.indexOf(cover);
  if (previousIndex >= 0) photos.splice(previousIndex, 1);
  photos.unshift(cover);
  if (await albumRequest({ action: 'save_album', album: { ...album, photos } })) {
    albumDraftPhotos[0] = data.albums.find((a) => a.id === album.id).photos[0];
    $('#albumStatus').textContent = 'Cover saved';
    renderAlbumPhotos();
  } else {
    albumDraftPhotos = original;
    renderAlbumPhotos();
  }
}
function renderAlbumPhotos() {
  $('#albumPhotoPreview').innerHTML = albumDraftPhotos
    .map(
      (photo, i) =>
        `<div class="milestone-photo"><button type="button" class="open-gallery-photo" data-album-preview="${i}" aria-label="View item ${
          i + 1
        }">${milestoneMediaPreview(
          photo,
          '',
          `Album item ${i + 1}`,
        )}</button><button type="button" data-album-remove="${i}" aria-label="Remove item ${
          i + 1
        }">×</button>${
          i === 0
            ? '<span class="cover-badge">Cover</span>'
            : `<button class="set-photo-cover" type="button" data-album-cover="${i}">Set as cover</button>`
        }</div>`,
    )
    .join('');
  $('#albumPhotoPreview')
    .querySelectorAll('[data-album-preview]')
    .forEach(
      (b) =>
        (b.onclick = () =>
          openPhotoLightbox(
            albumDraftPhotos,
            Number(b.dataset.albumPreview),
            $('#albumTitle').value || 'Album',
          )),
    );
  $('#albumPhotoPreview')
    .querySelectorAll('[data-album-remove]')
    .forEach(
      (b) =>
        (b.onclick = () => {
          albumDraftPhotos.splice(Number(b.dataset.albumRemove), 1);
          renderAlbumPhotos();
        }),
    );
  $('#albumPhotoPreview')
    .querySelectorAll('[data-album-cover]')
    .forEach((b) => (b.onclick = () => setAlbumCover(Number(b.dataset.albumCover))));
}
async function addAlbumFiles(files) {
  if (albumUploading || savingShared) return;
  const session = albumUploadSession;
  albumUploading = true;
  $('#saveAlbum').disabled = true;
  $('#albumError').textContent = '';
  try {
    for (const file of files) {
      const video = /\.(mp4|mov)$/i.test(file.name);
      if (video ? file.size > 100000000 : !file.type.startsWith('image/') || file.size > 20000000)
        throw new Error('Choose images under 20 MB or MP4/MOV videos under 100 MB.');
      const photo = video ? await readVideoFile(file) : await resizePhoto(file, 1600);
      if (session !== albumUploadSession) return;
      albumDraftPhotos.push(photo);
      renderAlbumPhotos();
      $(
        '#albumStatus',
      ).textContent = `${albumDraftPhotos.length} items ready. Save album to keep them.`;
    }
  } catch (error) {
    if (session === albumUploadSession) $('#albumError').textContent = error.message;
  } finally {
    if (session === albumUploadSession) {
      albumUploading = false;
      $('#saveAlbum').disabled = false;
      $('#albumFiles').value = '';
    }
  }
}
function populateMilestoneAlbums(event) {
  $('#milestoneAlbum').innerHTML =
    '<option value="">No album / create one from uploaded photos</option>' +
    (data.albums || [])
      .filter((a) => !a.birthPersonId && (!a.milestoneId || a.milestoneId === event?.id))
      .map((a) => `<option value="${esc(a.id)}">${esc(a.title)}</option>`)
      .join('');
  $('#milestoneAlbum').value = event?.albumId || '';
}
$('#milestoneAlbum').onchange = () => {
  const album = (data.albums || []).find((a) => a.id === $('#milestoneAlbum').value);
  draftMilestonePhotos = [...(album?.photos || [])];
  renderMilestonePhotos();
};
function openSharedAlbum(params) {
  if (collectionRevisions.get('albums') !== sharedRevision)
    return withCollection('albums', () => openSharedAlbum(params));
  const album = (data.albums || []).find((a) => a.id === params.get('album'));
  if (!album) {
    notify('This album is no longer available.');
    return;
  }
  showSection('albums');
  if (params.has('media')) {
    const index = album.photos.indexOf(params.get('media'));
    if (index >= 0) openPhotoLightbox(album.photos, index, album.title);
    else {
      openAlbum(album.id);
      notify('This item is no longer in the album.');
    }
  } else openAlbum(album.id);
}
$('#newAlbum').onclick = () => openAlbum();
$('#albumSearch').oninput = renderAlbums;
$('#albumOrder').onchange = renderAlbums;
$('#closeAlbum').onclick = () => $('#albumDialog').close();
$('#albumDialog').addEventListener('close', () => albumUploadSession++);
$('#albumDialog').addEventListener('cancel', (event) => {
  if (savingShared) event.preventDefault();
});
$('#shareAlbum').onclick = () => copyDirectLink({ album: $('#albumId').value });
$('#deleteAlbum').onclick = async () => {
  if (
    savingShared ||
    !confirm('Delete this album? Its milestone will remain, and uploaded files will be retained.')
  )
    return;
  if (await albumRequest({ action: 'delete_album', albumId: $('#albumId').value })) {
    $('#albumDialog').close();
    notify('Album deleted');
  }
};
$('#albumFiles').onchange = (event) => addAlbumFiles([...event.target.files]);
const albumDrop = $('#albumDrop');
albumDrop.addEventListener('dragover', (event) => {
  event.preventDefault();
  albumDrop.classList.add('drag-over');
});
albumDrop.addEventListener('dragleave', () => albumDrop.classList.remove('drag-over'));
albumDrop.addEventListener('drop', (event) => {
  event.preventDefault();
  albumDrop.classList.remove('drag-over');
  addAlbumFiles([...event.dataTransfer.files]);
});
albumDrop.addEventListener('keydown', (event) => {
  if (event.target === albumDrop && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    $('#albumFiles').click();
  }
});
