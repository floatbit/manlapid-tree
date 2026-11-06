function wrappedPhotoIndex(index, total) {
  return total ? ((index % total) + total) % total : 0;
}
function openPhotoLightbox(photos, index = 0, title = 'Family pictures') {
  ui.openLightbox(photos, wrappedPhotoIndex(index, photos?.length || 0), title);
}
