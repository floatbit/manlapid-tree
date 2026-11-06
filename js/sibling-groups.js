function siblingGroupChanges(ids) {
  const unique = [...new Set(ids)],
    links = [],
    conflicts = [];
  for (let i = 0; i < unique.length; i++)
    for (let j = i + 1; j < unique.length; j++) {
      const a = unique[i],
        b = unique[j],
        existing = data.links.find(
          (link) => (link.a === a && link.b === b) || (link.a === b && link.b === a),
        );
      if (existing) {
        if (existing.type !== 'sibling') conflicts.push({ a, b, type: existing.type });
        continue;
      }
      links.push({ a, b, type: 'sibling' });
    }
  return { links, conflicts };
}
let siblingGroupIds = [],
  siblingGroupBusy = false;
function refreshSiblingGroupTags() {
  $('#siblingGroupTags').innerHTML = siblingGroupIds
    .map(
      (id) =>
        `<button type="button" data-remove-sibling="${esc(id)}" aria-label="Remove ${esc(
          displayName(person(id)),
        )}">${esc(displayName(person(id)))} ×</button>`,
    )
    .join('');
  document.querySelectorAll('[data-remove-sibling]').forEach(
    (button) =>
      (button.onclick = () => {
        siblingGroupIds = siblingGroupIds.filter((id) => id !== button.dataset.removeSibling);
        refreshSiblingGroupTags();
        $('#siblingGroupSearch').focus();
      }),
  );
  const changes = siblingGroupChanges(siblingGroupIds);
  $(
    '#siblingGroupSummary',
  ).textContent = `${siblingGroupIds.length} people selected · ${changes.links.length} new sibling connections`;
  $('#siblingGroupError').textContent = changes.conflicts.length
    ? 'These people already have a different relationship: ' +
      changes.conflicts
        .map(
          (c) =>
            displayName(person(c.a)) + ' and ' + displayName(person(c.b)) + ' (' + c.type + ')',
        )
        .join('; ') +
      '. Remove them from this group or correct their relationship first.'
    : '';
  $('#saveSiblingGroup').disabled = siblingGroupIds.length < 2 || changes.conflicts.length > 0;
}
function setupSiblingGroupSearch() {
  const input = $('#siblingGroupSearch'),
    list = $('#siblingGroupMatches');
  let matches = [],
    active = -1;
  function close() {
    list.hidden = true;
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function choose(id) {
    if (!siblingGroupIds.includes(id)) siblingGroupIds.push(id);
    refreshSiblingGroupTags();
    input.focus();
    search();
  }
  function highlight() {
    [...list.querySelectorAll('button')].forEach((button, i) => {
      button.classList.toggle('search-active', i === active);
      button.setAttribute('aria-selected', String(i === active));
    });
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', 'sibling-match-' + active);
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
      .filter((p) => !siblingGroupIds.includes(p.id) && personMatchesQuery(p, query))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 12);
    list.innerHTML =
      matches
        .map(
          (p, i) =>
            `<button type="button" role="option" aria-selected="false" id="sibling-match-${i}">${esc(
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
$('#openSiblingGroup').onclick = () => {
  const current = $('#personId').value;
  $('#siblingGroupDescription').textContent = person(current)
    ? 'The person you are editing and their existing siblings are included. Add another person to connect them to everyone in the group. You can reuse this whenever the family grows.'
    : 'Select the people who are siblings. Everyone selected will be connected to everyone else in the group. No starting person is required, and the unsaved person in Add Person will not be included.';
  siblingGroupIds = person(current)
    ? [
        ...new Set([
          current,
          ...connections(current)
            .filter((c) => c.type === 'sibling')
            .map((c) => c.id),
        ]),
      ]
    : [];
  $('#siblingGroupSearch').value = '';
  $('#siblingGroupMatches').hidden = true;
  $('#siblingGroupSearch').setAttribute('aria-expanded', 'false');
  refreshSiblingGroupTags();
  setupSiblingGroupSearch();
  $('#siblingGroupDialog').showModal();
  $('#siblingGroupSearch').focus();
};
$('#cancelSiblingGroup').onclick = () => $('#siblingGroupDialog').close();
$('#siblingGroupDialog').addEventListener('cancel', (event) => {
  if (siblingGroupBusy) event.preventDefault();
});
$('#siblingGroupForm').onsubmit = async (event) => {
  event.preventDefault();
  if (siblingGroupBusy || siblingGroupIds.length < 2) return;
  const changes = siblingGroupChanges(siblingGroupIds);
  if (changes.conflicts.length) {
    refreshSiblingGroupTags();
    return;
  }
  if (!changes.links.length) {
    $('#siblingGroupDialog').close();
    notify('These sibling connections are already saved.');
    return;
  }
  siblingGroupBusy = true;
  $('#siblingGroupForm').inert = true;
  const previous = [...data.links];
  data.links.push(...changes.links);
  try {
    if (!(await saveShared())) {
      data.links = previous;
      $('#siblingGroupError').textContent =
        'The sibling group was not saved. Please resolve the database notice and try again.';
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
        relationRow({ id: other, type: 'sibling' });
    }
    $('#siblingGroupDialog').close();
    render();
    notify(`${changes.links.length} sibling connections saved for everyone in the group.`);
  } finally {
    siblingGroupBusy = false;
    $('#siblingGroupForm').inert = false;
  }
};

$('#editSiblingGroup').onclick = () => $('#openSiblingGroup').click();
