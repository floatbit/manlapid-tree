function directLink(values) {
  const url = new URL(location.href);
  url.hash = new URLSearchParams(values).toString();
  return url.href;
}
async function copyDirectLink(values) {
  const link = directLink(values);
  try {
    await navigator.clipboard.writeText(link);
    notify('Link copied');
  } catch (error) {
    prompt('Copy this link:', link);
  }
}
async function openSharedLink() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.has('photosOf')) {
    const id = params.get('photosOf'), p = person(id);
    if (!p) { notify('This person is no longer available.'); return; }
    try {
      await loadFamilyAlbums();
      const photos = Object.entries(data.photoTags || {}).filter(([photo, ids]) => ids.includes(id) && !/\.(mp4|mov)$/i.test(photo)).map(([photo]) => photo);
      start(id);
      if (!photos.length) { notify('No tagged photos are available for this person.'); return; }
      const index = photos.indexOf(params.get('media'));
      openPhotoLightbox(photos, Math.max(0,index), 'Photos of ' + displayName(p), id);
      if (params.has('media') && index < 0) notify('The linked photo is no longer available. Showing their other photos.');
    } catch (error) { notify(error.message); }
    return;
  }
  if (params.has('recipe')) {
    try {
      await ensureCollection('recipes');
    } catch (error) {
      notify(error.message);
      return;
    }
    showSection('recipes');
    openRecipe(params.get('recipe'));
    if (params.has('media')) {
      const recipe = (data.recipes || []).find((r) => r.id === params.get('recipe'));
      const index = recipe?.photos.indexOf(params.get('media'));
      if (index >= 0) openPhotoLightbox(recipe.photos, index, recipe.title);
    }
    return;
  }
  if (params.has('album')) {
    openSharedAlbum(params);
    return;
  }
  if (params.has('editPerson')) {
    showSection('people');
    const id = params.get('editPerson');
    if (person(id)) edit(id, { updateUrl: false });
    else notify('This person is no longer available.');
    return;
  }
  if (params.has('person')) {
    const id = params.get('person');
    if (person(id)) start(id);
    else notify('This person is no longer available.');
    return;
  }
  if (params.has('milestone')) {
    const event = data.milestones.find((item) => item.id === params.get('milestone'));
    if (!event) {
      notify('This milestone is no longer available.');
      return;
    }
    showSection('timeline');
    if (params.has('media')) {
      const index = (event.photos || []).indexOf(params.get('media'));
      if (index >= 0) openPhotoLightbox(event.photos, index, event.title);
      else {
        openMilestone(event.id);
        notify('This photo or video is no longer available.');
      }
    } else openMilestone(event.id);
  }
}
$('#shareMilestone').onclick = () => copyDirectLink({ milestone: $('#milestoneId').value });
window.addEventListener('hashchange', restorePageFromUrl);
