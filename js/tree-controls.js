let addingFamily = null;
function openFamilyDialog(id, type) {
  addingFamily = { id, type };
  const p = person(id);
  $('#familyTitle').textContent = `Add ${displayName(p)}’s ${type}`;
  $('#familyContext').textContent = `Who is ${displayName(p)}’s ${type}?`;
  $('#familyForm').reset();
  $('#familyError').textContent = '';
  const current = new Set(connections(id).map((c) => c.id));
  $('#existingFamily').innerHTML =
    '<option value="">Choose someone…</option>' +
    data.people
      .filter((p) => p.id !== id && !current.has(p.id))
      .map((p) => `<option value="${p.id}">${esc(displayName(p))}</option>`)
      .join('');
  setupRelationshipSearch('existingFamily', {
    required: false,
    label: 'Someone already in your directory',
  });
  $('#familyDialog').showModal();
  $('#familyName').focus();
}
$('#familyCancel').onclick = () => $('#familyDialog').close();
$('#familyForm').onsubmit = async (e) => {
  e.preventDefault();
  if (!addingFamily) return;
  const { id, type } = addingFamily;
  const existing = $('#existingFamily').value,
    name = $('#familyName').value.trim();
  if (!existing && !name) {
    $('#familyError').textContent = 'Enter a name or choose an existing person.';
    return;
  }
  if (existing && name) {
    $('#familyError').textContent =
      'Choose an existing person or enter a new name, then leave the other field blank.';
    return;
  }
  if (name && data.people.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    $('#familyError').textContent =
      'Someone with this name is already in the directory. Choose them below, or use a more specific name.';
    return;
  }
  const previous = JSON.stringify(data);
  const newId = existing || crypto.randomUUID();
  if (!existing)
    data.people.push({ id: newId, name, photo: '', bio: '', birthday: '', location: '' });
  data.links.push({ a: id, b: newId, type });
  if (!(await saveShared())) {
    data = JSON.parse(previous);
    return;
  }
  $('#familyDialog').close();
  expand(id);
  notify(`${displayName(person(newId))} added as ${displayName(person(id))}’s ${type}`);
};
let treeDrag = null;
function startTreeDrag(event) {
  if (
    event.button !== 0 ||
    event.isPrimary === false ||
    event.pointerType === 'touch' ||
    !graphLayout ||
    event.target.closest('button,a,input,textarea,select')
  )
    return;
  const graph = $('#graph');
  treeDrag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, active: false };
  graph.setPointerCapture(event.pointerId);
  event.preventDefault();
}
function moveTreeDrag(event) {
  if (!treeDrag || treeDrag.pointerId !== event.pointerId) return;
  const graph = $('#graph'),
    dx = event.clientX - treeDrag.x,
    dy = event.clientY - treeDrag.y;
  if (!treeDrag.active) {
    if (Math.hypot(dx, dy) < 4) return;
    // Add camera space without moving the picture, so even a fitted tree can pan.
    const scene = $('#scene'),
      before = new DOMMatrixReadOnly(getComputedStyle(scene).transform),
      left = graph.scrollLeft,
      top = graph.scrollTop;
    cameraPadded = true;
    setGraphScale(before.a, { animate: false });
    const after = new DOMMatrixReadOnly(getComputedStyle(scene).transform);
    graph.scrollTo({
      left: left + after.e - before.e,
      top: top + after.f - before.f,
      behavior: 'instant',
    });
    treeDrag.left = graph.scrollLeft;
    treeDrag.top = graph.scrollTop;
    treeDrag.active = true;
    graph.classList.add('is-panning');
  }
  graph.scrollTo({ left: treeDrag.left - dx, top: treeDrag.top - dy, behavior: 'instant' });
  event.preventDefault();
}
function endTreeDrag(event) {
  if (!treeDrag || treeDrag.pointerId !== event.pointerId) return;
  const graph = $('#graph');
  treeDrag = null;
  graph.classList.remove('is-panning');
  if (graph.hasPointerCapture(event.pointerId)) graph.releasePointerCapture(event.pointerId);
}
$('#graph').addEventListener('pointerdown', startTreeDrag);
$('#graph').addEventListener('pointermove', moveTreeDrag);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
  $('#graph').addEventListener(type, endTreeDrag);
function handleTreeWheel(event) {
  if (!(event.metaKey || event.shiftKey) || !graphLayout || $('#graph').hidden) return;
  const graph = $('#graph'),
    scene = $('#scene');
  const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  if (!delta) return;
  event.preventDefault();
  const pixels =
    delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? graph.clientHeight : 1);
  const rect = graph.getBoundingClientRect(),
    x = event.clientX - rect.left,
    y = event.clientY - rect.top;
  // Read the current camera so scrolling can interrupt a zoom animation smoothly.
  const before = new DOMMatrixReadOnly(getComputedStyle(scene).transform);
  const worldX = (x + graph.scrollLeft - before.e) / before.a,
    worldY = (y + graph.scrollTop - before.f) / before.d;
  const next = Math.max(
    0.2,
    Math.min(2, before.a * Math.exp(-Math.max(-180, Math.min(180, pixels)) * 0.0025)),
  );
  treeCenterRequest++;
  setGraphScale(next, { animate: false, manual: true });
  const after = new DOMMatrixReadOnly(getComputedStyle(scene).transform);
  graph.scrollTo({
    left: worldX * next + after.e - x,
    top: worldY * next + after.f - y,
    behavior: 'instant',
  });
}
$('#graph').addEventListener('wheel', handleTreeWheel, { passive: false });
function showEntireTree() {
  if (!data.people.length) {
    notify('Add a person to begin your family tree.');
    return;
  }
  relationshipTrace = null;
  data.root = person(data.root) ? data.root : data.people[0].id;
  data.selected = person(data.selected) ? data.selected : data.root;
  data.visible = data.people.map((p) => p.id);
  data.expanded = [...data.visible];
  save();
  render();
  fitGraph();
}
$('#showEntireTree').onclick = showEntireTree;
$('#zoomSlider').oninput = (event) => {
  if (!graphLayout) return;
  setGraphZoomLocked(false);
  treeCenterRequest++;
  const graph = $('#graph'),
    scene = $('#scene');
  const before = new DOMMatrixReadOnly(getComputedStyle(scene).transform);
  const x = graph.clientWidth / 2,
    y = graph.clientHeight / 2;
  const worldX = (graph.scrollLeft + x - before.e) / graphScale;
  const worldY = (graph.scrollTop + y - before.f) / graphScale;
  const next = Number(event.target.value) / 100;
  setGraphScale(next, { animate: false });
  const after = new DOMMatrixReadOnly(getComputedStyle(scene).transform);
  graph.scrollTo({
    left: worldX * next + after.e - x,
    top: worldY * next + after.f - y,
    behavior: 'instant',
  });
};
$('#lockZoom').onclick = () => setGraphZoomLocked(!zoomLocked);
$('#fitGraph').onclick = () => {
  setGraphZoomLocked(false);
  fitGraph();
};
$('#backToStart').onclick = () => centerPerson(data.root);
