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
function openSharedLink() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.has('recipe')) {
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
$('#shareLightbox').onclick = () => {
  const media = lightboxPhotos[lightboxIndex],
    album = (data.albums || []).find((item) => item.photos?.includes(media));
  if (album) copyDirectLink({ album: album.id, media });
  else {
    const recipe = (data.recipes || []).find((r) => r.photos.includes(media));
    if (recipe) copyDirectLink({ recipe: recipe.id, media });
  }
};
window.addEventListener('hashchange', () => {
  if (!sharedReady) return;
  if ($('#photoLightbox').open) $('#photoLightbox').close();
  if ($('#milestoneDialog').open) $('#milestoneDialog').close();
  openSharedLink();
});
