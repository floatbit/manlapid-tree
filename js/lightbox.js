function wrappedPhotoIndex(index, total) {
  return total ? ((index % total) + total) % total : 0;
}
function openPhotoLightbox(photos, index = 0, title = 'Family pictures') {
  ui.openLightbox(photos, wrappedPhotoIndex(index, photos?.length || 0), title);
}

async function savePhotoPeople(photo, people) {
  if (!sharedReady || savingShared) throw new Error('Please wait for the current save to finish.');
  savingShared = true;
  try {
    const result = await requestDatabase({action:'save_photo_tags',photo,people,revision:sharedRevision});
    applyShared(result);ui.sync(data);
  } finally {savingShared=false;}
}
function openTaggedPerson(id) {
  document.querySelector('#photoLightbox').close();
  start(id);
}

async function deletePhotoFromLightbox(photo) {
  if (!sharedReady || savingShared) throw new Error('Please wait for the current save to finish.');
  savingShared=true;
  try {
    const result=await requestDatabase({action:'delete_photo',photo,revision:sharedRevision});
    applyShared(result);ui.sync(data);
    albumDraftPhotos=albumDraftPhotos.filter(item=>item!==photo);
    recipeDraftPhotos=recipeDraftPhotos.filter(item=>item!==photo);
    draftMilestonePhotos=draftMilestonePhotos.filter(item=>item!==photo);
    if($('#albumDialog').open)renderAlbumPhotos();
    if($('#recipeDialog').open)renderRecipePhotos();
    if($('#milestoneDialog').open)renderMilestonePhotos();
    if(!$('#albumsPage').hidden)renderAlbums();
    if(!$('#timeline').hidden)renderTimeline();
  } finally {savingShared=false;}
}
