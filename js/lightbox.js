let lightboxPhotos = [],
  lightboxIndex = 0,
  lightboxReturnFocus = null;
function wrappedPhotoIndex(index, total) {
  return total ? ((index % total) + total) % total : 0;
}
function displayLightboxPhoto(index) {
  lightboxIndex = wrappedPhotoIndex(index, lightboxPhotos.length);
  const media = lightboxPhotos[lightboxIndex],
    image = $('#lightboxImage'),
    video = $('#lightboxVideo'),
    isVideo = isMilestoneVideo(media);
  video.pause();
  video.removeAttribute('src');
  video.load();
  image.removeAttribute('src');
  image.hidden = isVideo;
  video.hidden = !isVideo;
  if (isVideo) {
    video.src = media;
    video.setAttribute(
      'aria-label',
      `${$('#lightboxTitle').textContent} — video ${lightboxIndex + 1} of ${lightboxPhotos.length}`,
    );
  } else {
    image.src = media;
    image.alt = `${$('#lightboxTitle').textContent} — photo ${lightboxIndex + 1} of ${
      lightboxPhotos.length
    }`;
  }
  $('#lightboxCounter').textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  $('#lightboxPrevious').hidden = lightboxPhotos.length < 2;
  $('#lightboxNext').hidden = lightboxPhotos.length < 2;
  $('#shareLightbox').hidden = !(
    (data.albums || []).some((album) => album.photos?.includes(media)) ||
    (data.recipes || []).some((recipe) => recipe.photos?.includes(media))
  );
  $('#lightboxError').hidden = true;
  $('#lightboxError').textContent = 'This item could not be loaded. Try the next one.';
}
function openPhotoLightbox(photos, index = 0, title = 'Family pictures') {
  if (!photos?.length) return;
  lightboxReturnFocus = document.activeElement;
  lightboxPhotos = [...photos];
  $('#lightboxTitle').textContent = title;
  displayLightboxPhoto(index);
  $('#photoLightbox').showModal();
  $('#lightboxClose').focus();
}
$('#lightboxPrevious').onclick = () => displayLightboxPhoto(lightboxIndex - 1);
$('#lightboxNext').onclick = () => displayLightboxPhoto(lightboxIndex + 1);
$('#lightboxClose').onclick = () => $('#photoLightbox').close();
$('#photoLightbox').addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    event.stopPropagation();
    displayLightboxPhoto(lightboxIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
$('#photoLightbox').addEventListener('close', () => {
  lightboxPhotos = [];
  $('#lightboxVideo').pause();
  $('#lightboxVideo').removeAttribute('src');
  $('#lightboxVideo').load();
  $('#lightboxImage').removeAttribute('src');
  if (lightboxReturnFocus?.isConnected) lightboxReturnFocus.focus({ preventScroll: true });
});
$('#lightboxImage').onerror = () => {
  if (!$('#lightboxImage').hidden) $('#lightboxError').hidden = false;
};

$('#lightboxVideo').onerror = () => {
  if ($('#lightboxVideo').hidden) return;
  $('#lightboxError').hidden = false;
  $('#lightboxError').textContent =
    'This video preview could not play. Save MOV files first to convert them for playback.';
};
