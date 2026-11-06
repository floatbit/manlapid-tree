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
  const input = $('#childrenGroupSearch'),
    list = $('#childrenGroupMatches');
  let matches = [],
    active = -1;
  function close() {
    list.hidden = true;
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function choose(id) {
    if (!childrenGroupIds.includes(id)) childrenGroupIds.push(id);
    refreshChildrenGroupTags();
    input.focus();
    search();
  }
  function highlight() {
    [...list.querySelectorAll('button')].forEach((button, i) => {
      button.classList.toggle('search-active', i === active);
      button.setAttribute('aria-selected', String(i === active));
    });
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', 'children-match-' + active);
      list.children[active]?.scrollIntoView({ block: 'nearest' });
    }
  }
  function search() {
    const query = input.value.trim().toLocaleLowerCase();
    active = -1;
    input.removeAttribute('aria-activedescendant');
    if (!query) {
      close();
      return;
    }
    matches = data.people
      .filter(
        (p) =>
          p.id !== $('#childrenGroupParent').value &&
          !childrenGroupIds.includes(p.id) &&
          personMatchesQuery(p, query),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 12);
    list.innerHTML =
      matches
        .map(
          (p, i) =>
            `<button type="button" role="option" aria-selected="false" id="children-match-${i}">${esc(
              displayName(p),
            )}</button>`,
        )
        .join('') || '<p>No matching people.</p>';
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    list
      .querySelectorAll('button')
      .forEach((button, i) => (button.onclick = () => choose(matches[i].id)));
  }
  input.oninput = search;
  input.onfocus = search;
  input.onkeydown = (event) => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.hidden) search();
      if (matches.length && !list.hidden) {
        active =
          active < 0
            ? event.key === 'ArrowDown'
              ? 0
              : matches.length - 1
            : (active + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
        highlight();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!list.hidden && matches.length) choose(matches[Math.max(0, active)].id);
    } else if (event.key === 'Escape' && !list.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') close();
  };
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
