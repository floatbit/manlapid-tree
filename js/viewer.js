// Browser-only perspective; these preferences are never written to family records.
function viewerBadge(id, fallback = '') {
  const label = ui.viewerRelation(id);
  return `<span data-viewer-person="${esc(id)}" data-viewer-fallback="${esc(fallback)}" class="${label ? 'viewer-relationship' : ''}" ${!label && !fallback ? 'hidden' : ''}>${esc(label || fallback)}</span>`;
}
function highlightViewerPath(id) {
  document.getElementById('viewerPathHighlight')?.remove();
  if (!ui.viewerId || !graphLayout?.positions.has(ui.viewerId) || !graphLayout.positions.has(id)) return;
  const path = findRelationship(ui.viewerId, id);
  // Only highlight a complete path already on screen, without moving or expanding the tree.
  if (!path || path.ids.some(personId => !graphLayout.positions.has(personId))) return;
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  overlay.id = 'viewerPathHighlight'; overlay.setAttribute('pointer-events', 'none');
  overlay.innerHTML = relationshipPathLines(graphLayout, path);
  const lines = document.getElementById('lines');
  lines.insertBefore(overlay, lines.querySelector('.spouse-heart'));
}
function clearViewerPath() { document.getElementById('viewerPathHighlight')?.remove(); }
