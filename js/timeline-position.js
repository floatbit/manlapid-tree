let restoringTimelinePosition = false,
  timelinePositionFrame = 0;
function saveTimelinePosition() {
  if (restoringTimelinePosition || $('#timeline').hidden || !sharedReady) return;
  try {
    localStorage.setItem('kinfolk-timeline-position-v1', JSON.stringify({ y: window.scrollY }));
  } catch {}
}
function restoreTimelinePosition() {
  let position;
  try {
    position = JSON.parse(localStorage.getItem('kinfolk-timeline-position-v1') || 'null');
  } catch {}
  if (!position || !Number.isFinite(position.y)) return;
  restoringTimelinePosition = true;
  requestAnimationFrame(() => {
    if (!$('#timeline').hidden)
      window.scrollTo({ top: Math.max(0, position.y), behavior: 'instant' });
    requestAnimationFrame(() => {
      restoringTimelinePosition = false;
    });
  });
}
window.addEventListener(
  'scroll',
  () => {
    if (timelinePositionFrame) return;
    timelinePositionFrame = requestAnimationFrame(() => {
      timelinePositionFrame = 0;
      saveTimelinePosition();
    });
  },
  { passive: true },
);
window.addEventListener('pagehide', saveTimelinePosition);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveTimelinePosition();
});

// Sibling groups create ordinary reciprocal relationships, usable by every browser.
