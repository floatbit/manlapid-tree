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

// Keep each timeline rail exactly between its first and last visible markers.
let dotRailFrame = 0;
function scheduleDotRails() {
  if (!dotRailFrame) dotRailFrame = requestAnimationFrame(updateDotRails);
}
function updateDotRails() {
  dotRailFrame = 0;
  for (const [selector, markers] of [
    ['.location-life-timeline', '.location-timeline-stop, #placesLivedRows .place-lived-row'],
    ['.migration-stops', ':scope > li'],
  ]) {
    for (const container of document.querySelectorAll(selector)) {
      let rail = container.querySelector(':scope > .dot-connector');
      if (!rail) {
        rail = document.createElement('span');
        rail.className = 'dot-connector';
        rail.setAttribute('aria-hidden', 'true');
        container.append(rail);
      }
      const items = [...container.querySelectorAll(markers)].filter(
        (item) => item.getClientRects().length,
      );
      if (rail.hidden !== items.length < 2) rail.hidden = items.length < 2;
      if (items.length < 2) continue;
      const bounds = container.getBoundingClientRect();
      const center = (item) => {
        const rect = item.getBoundingClientRect(),
          dot = getComputedStyle(item, '::before');
        const radius =
          (parseFloat(dot.width) +
            parseFloat(dot.borderLeftWidth) +
            parseFloat(dot.borderRightWidth)) /
          2;
        return {
          x: rect.left - bounds.left + item.clientLeft + parseFloat(dot.left) + radius,
          y: rect.top - bounds.top + item.clientTop + parseFloat(dot.top) + radius,
        };
      };
      const first = center(items[0]),
        last = center(items[items.length - 1]);
      rail.style.left = `${first.x - 1}px`;
      rail.style.top = `${first.y}px`;
      const end =
        selector === '.location-life-timeline'
          ? items[items.length - 1].getBoundingClientRect().bottom - bounds.top - 16
          : last.y + 24;
      rail.style.height = `${Math.max(0, end - first.y)}px`;
      dotRailResize.observe(container);
    }
  }
}
const dotRailResize = new ResizeObserver(scheduleDotRails);
dotRailResize.observe(document.body);
new MutationObserver(scheduleDotRails).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['hidden', 'open'],
});
window.addEventListener('resize', scheduleDotRails);
document.fonts.ready.then(scheduleDotRails);
scheduleDotRails();
