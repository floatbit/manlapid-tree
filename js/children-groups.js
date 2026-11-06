let childrenGroupIds = [],
  childrenGroupBusy = false;
function childrenGroupChanges(parent, ids) {
  const links = [],
    conflicts = [];
  for (const child of new Set(ids)) {
    if (child === parent) {
      conflicts.push('A person cannot be their own parent.');
      continue;
    }
    const existing = data.links.find(
      (l) => (l.a === child && l.b === parent) || (l.a === parent && l.b === child),
    );
    if (existing) {
      if (
        !(
          (existing.a === child && existing.type === 'parent') ||
          (existing.a === parent && existing.type === 'child')
        )
      )
        conflicts.push(
          `${displayName(person(child))} already has a different relationship with this parent.`,
        );
    } else links.push({ a: child, b: parent, type: 'parent' });
  }
  if (parent && ancestryCyclePerson(data.people, [...data.links, ...links]) !== null)
    conflicts.push('These connections would create an ancestry loop.');
  return { links, conflicts };
}
function refreshChildrenGroupTags() {
  const tags = $('#childrenGroupTags');
  tags.innerHTML = childrenGroupIds
    .map(
      (id) =>
        `<button type="button" data-id="${esc(id)}" aria-label="Remove ${esc(
          displayName(person(id)),
        )}">${esc(displayName(person(id)))} ×</button>`,
    )
    .join('');
  tags.querySelectorAll('button').forEach(
    (button) =>
      (button.onclick = () => {
        childrenGroupIds = childrenGroupIds.filter((id) => id !== button.dataset.id);
        refreshChildrenGroupTags();
        $('#childrenGroupSearch').dispatchEvent(new Event('input'));
        $('#childrenGroupSearch').focus();
      }),
  );
  const parent = $('#childrenGroupParent').value;
  const changes = childrenGroupChanges(parent, childrenGroupIds);
  $(
    '#childrenGroupSummary',
  ).textContent = `${childrenGroupIds.length} children selected · ${changes.links.length} new parent connections`;
  $('#childrenGroupError').textContent = changes.conflicts.join(' ');
  $('#saveChildrenGroup').disabled =
    !parent || !childrenGroupIds.length || !!changes.conflicts.length || childrenGroupBusy;
  $('#childrenGroupSearch').disabled = !parent;
}
function setupChildrenGroupSearch() {
  ui.mountSearch({
    inputId: 'childrenGroupSearch',
    listId: 'childrenGroupMatches',
    options: () =>
      data.people.filter(
        (p) =>
          p.id !== document.querySelector('#childrenGroupParent').value &&
          !childrenGroupIds.includes(p.id),
      ),
    display: displayName,
    matches: personMatchesQuery,
    keepResults: true,
    onSelect: (p) => {
      if (!childrenGroupIds.includes(p.id)) childrenGroupIds.push(p.id);
      refreshChildrenGroupTags();
    },
  });
}
$('#openChildrenGroup').onclick = () => {
  const select = $('#childrenGroupParent');
  select.innerHTML =
    '<option value="">Choose a parent…</option>' +
    [...data.people]
      .sort((a, b) => displayName(a).localeCompare(displayName(b)))
      .map((p) => `<option value="${esc(p.id)}">${esc(displayName(p))}</option>`)
      .join('');
  select.value = person($('#personId').value) ? $('#personId').value : '';
  select.onchange = () => {
    childrenGroupIds = connectionsDirect(select.value)
      .filter((c) => c.type === 'child')
      .map((c) => c.id);
    $('#childrenGroupSearch').value = '';
    $('#childrenGroupMatches').hidden = true;
    refreshChildrenGroupTags();
  };
  select.onchange();
  setupRelationshipSearch('childrenGroupParent');
  $('#childrenGroupParentPicker input').setAttribute('aria-label', 'Parent');
  setupChildrenGroupSearch();
  $('#childrenGroupDialog').showModal();
};
$('#cancelChildrenGroup').onclick = () => $('#childrenGroupDialog').close();
$('#childrenGroupDialog').addEventListener('cancel', (event) => {
  if (childrenGroupBusy) event.preventDefault();
});
$('#childrenGroupForm').onsubmit = async (event) => {
  event.preventDefault();
  const parent = $('#childrenGroupParent').value;
  if (childrenGroupBusy || !person(parent) || !childrenGroupIds.length) return;
  const changes = childrenGroupChanges(parent, childrenGroupIds);
  if (changes.conflicts.length) {
    refreshChildrenGroupTags();
    return;
  }
  if (!changes.links.length) {
    $('#childrenGroupDialog').close();
    notify('These parent connections are already saved.');
    return;
  }
  childrenGroupBusy = true;
  $('#childrenGroupForm').inert = true;
  const previous = [...data.links];
  data.links.push(...changes.links);
  try {
    if (!(await saveShared())) {
      data.links = previous;
      $('#childrenGroupError').textContent =
        'The children were not saved. Resolve the database notice and try again.';
      return;
    }
    const current = $('#personId').value;
    for (const link of changes.links) {
      const other = link.a === current ? link.b : link.b === current ? link.a : null;
      if (
        other &&
        ![...document.querySelectorAll('.relation-person-id')].some(
          (input) => input.value === other,
        )
      )
        relationRow({ id: other, type: current === link.a ? 'parent' : 'child' });
    }
    $('#childrenGroupDialog').close();
    render();
    notify(`${changes.links.length} parent connections saved.`);
  } finally {
    childrenGroupBusy = false;
    $('#childrenGroupForm').inert = false;
    refreshChildrenGroupTags();
  }
};
