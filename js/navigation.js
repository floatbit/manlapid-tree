function renderDetails() {
  renderDetailsContent();
  if (relationshipTrace && !relationshipTrace.immediate && data.selected === relationshipTrace.to) {
    const path = document.createElement('div');
    path.className = 'selected-person-path';
    path.innerHTML = `<h3>Path from ${esc(
      displayName(person(relationshipTrace.from)),
    )}</h3><p>${esc(relationshipTrace.label)}</p><ol>${relationshipTrace.ids
      .map(
        (id, i) =>
          `<li>${i ? `<small>${esc(relationshipTrace.edges[i - 1].type)} → </small>` : ''}${esc(
            displayName(person(id)),
          )}</li>`,
      )
      .join('')}</ol>`;
    $('#details').append(path);
  }
}
function renderDetailsContent() {
  const p = person(data.selected);
  if (!p) {
    renderSuggestions();
    return;
  }
  $('#details').innerHTML = `<p class="eyebrow">A CLOSER LOOK</p>${avatar(p)}<h2>${esc(
    p.name,
  )}</h2>${
    p.deceased ? '<span class="deceased-badge">Deceased</span>' : ''
  }<p class="label-context">Tree labels are relative to this person.</p><div class="person-view-actions"><button id="sharePerson">Copy person link</button><button id="traceSelected" ${
    !data.root || data.root === p.id ? 'hidden' : ''
  }>Show path from starting person</button><button id="centerSelected">◎ Center person</button><button id="collapseSelected" ${
    data.expanded.includes(p.id) ? '' : 'disabled'
  }>− Collapse branch</button></div><p>${esc(p.bio || 'Their story is waiting to be told.')}</p>${
    p.dateDetails?.birth || p.birthday
      ? `<p>Born · ${esc(familyDateLabel(p.dateDetails?.birth || p.birthday))}</p>`
      : ''
  }${p.dateDetails?.death ? `<p>Died · ${esc(familyDateLabel(p.dateDetails.death))}</p>` : ''}${
    p.location ? `<p>⌖ ${esc(p.location)}</p>` : ''
  }<h3>Add to ${esc(p.name.split(/\s+/)[0])}’s family</h3><div class="quick-add">${[
    'parent',
    'sibling',
    'spouse',
    'child',
  ]
    .map((type) => `<button data-add-family="${type}">＋ Add ${type}</button>`)
    .join('')}</div><h3>Family Connections</h3>${
    connections(p.id)
      .map(
        (c) =>
          `<button class="connection" data-id="${c.id}">${esc(person(c.id).name)} <span>· ${
            c.type
          }</span></button>`,
      )
      .join('') || '<p>No connections added yet.</p>'
  }<button id="editSelected">Edit person ↗</button>`;
  document.querySelectorAll('.connection').forEach((b) => (b.onclick = () => expand(b.dataset.id)));
  $('#editSelected').onclick = () => {
    tab(true);
    edit(p.id);
  };
  $('#traceSelected').onclick = () => showSelectedPersonPath(p.id);
  $('#sharePerson').onclick = () => copyDirectLink({ person: p.id });
  $('#centerSelected').onclick = () => centerPerson(p.id);
  $('#collapseSelected').onclick = () => collapseBranch(p.id);
  document
    .querySelectorAll('[data-add-family]')
    .forEach((b) => (b.onclick = () => openFamilyDialog(p.id, b.dataset.addFamily)));
}
let suggestedPeople = [];
function renderSuggestions(reshuffle = false) {
  if (reshuffle || !suggestedPeople.length || suggestedPeople.some((id) => !person(id))) {
    const ids = data.people.map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    suggestedPeople = ids.slice(0, 14);
  }
  $('#details').innerHTML =
    '<p class="eyebrow">A CLOSER LOOK</p><div class="sidebar-welcome"><div class="welcome-heart" aria-hidden="true">♡</div><h2>Meet Your People.</h2><p>Select a person to see their story and family connections.</p></div>';
  $('#emptySuggestions').innerHTML = `<div class="suggested-people">${
    suggestedPeople
      .map((id) => {
        const p = person(id);
        return `<button data-suggested="${id}">${avatar(p)}<span>${esc(
          displayName(p),
        )}</span><span aria-hidden="true">↗</span></button>`;
      })
      .join('') || '<p>Add a person to begin your family tree.</p>'
  }<div class="suggestion-search"><input id="suggestionSearch" type="search" placeholder="Find someone else…" aria-label="Find someone in the family" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggestionMatches" autocomplete="off"><div id="suggestionMatches" role="listbox" hidden></div></div></div>${
    data.people.length ? '<button id="shufflePeople">↻ Show other people</button>' : ''
  }`;
  document
    .querySelectorAll('[data-suggested]')
    .forEach((button) => (button.onclick = () => start(button.dataset.suggested)));
  if ($('#shufflePeople')) $('#shufflePeople').onclick = () => renderSuggestions(true);
  setupSuggestionSearch();
}
function setupSuggestionSearch() {
  const input = $('#suggestionSearch'),
    list = $('#suggestionMatches');
  let matches = [],
    active = -1;
  function close() {
    list.hidden = true;
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function highlight() {
    [...list.querySelectorAll('button')].forEach((button, i) => {
      button.classList.toggle('search-active', i === active);
      button.setAttribute('aria-selected', String(i === active));
    });
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', 'suggestion-match-' + active);
      list.children[active]?.scrollIntoView({ block: 'nearest' });
    }
  }
  function search() {
    const query = input.value.trim().toLocaleLowerCase();
    active = -1;
    input.removeAttribute('aria-activedescendant');
    if (!query) {
      matches = [];
      close();
      return;
    }
    matches = data.people
      .filter(
        (p) =>
          p.name.toLocaleLowerCase().includes(query) ||
          displayName(p).toLocaleLowerCase().includes(query),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10);
    list.innerHTML =
      matches
        .map(
          (p, i) =>
            `<button type="button" role="option" id="suggestion-match-${i}" aria-selected="false">${esc(
              displayName(p),
            )}</button>`,
        )
        .join('') || '<p>No matching people.</p>';
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    list
      .querySelectorAll('button')
      .forEach((button, i) => (button.onclick = () => start(matches[i].id)));
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
      if (!list.hidden && matches.length) start(matches[Math.max(0, active)].id);
    } else if (event.key === 'Escape' || event.key === 'Tab') close();
  };
  input.parentElement.onfocusout = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };
}
function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a.includes(b) || b.includes(a)) return 0;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] !== b[j - 1]));
    row = next;
  }
  return row[b.length] / Math.max(a.length, b.length);
}
let activeSearchIndex = -1;
function closeSearch() {
  activeSearchIndex = -1;
  $('#results').innerHTML = '';
  $('#search').setAttribute('aria-expanded', 'false');
  $('#search').removeAttribute('aria-activedescendant');
}
function highlightSearch(index) {
  const options = [...document.querySelectorAll('[data-match]')];
  if (!options.length) return;
  activeSearchIndex = (index + options.length) % options.length;
  options.forEach((option, i) => {
    option.classList.toggle('search-active', i === activeSearchIndex);
    option.setAttribute('aria-selected', String(i === activeSearchIndex));
  });
  const active = options[activeSearchIndex];
  $('#search').setAttribute('aria-activedescendant', active.id);
  active.scrollIntoView({ block: 'nearest' });
}
function handleSearchKey(event) {
  if (event.isComposing) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeSearch();
    return;
  }
  if (event.key === 'Tab') {
    closeSearch();
    return;
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!$('#results').children.length) search();
    const options = [...document.querySelectorAll('[data-match]')];
    if (!options.length) return;
    highlightSearch(
      activeSearchIndex < 0
        ? event.key === 'ArrowDown'
          ? 0
          : options.length - 1
        : activeSearchIndex + (event.key === 'ArrowDown' ? 1 : -1),
    );
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    const options = [...document.querySelectorAll('[data-match]')];
    if (activeSearchIndex >= 0 && options[activeSearchIndex]) {
      start(options[activeSearchIndex].dataset.match);
      return;
    }
    const q = $('#search').value.trim().toLowerCase(),
      exact = data.people.filter((p) => p.name.toLowerCase() === q);
    if (exact.length === 1) start(exact[0].id);
    else if (options.length) start(options[0].dataset.match);
    else search();
  }
}
function search() {
  activeSearchIndex = -1;
  $('#search').removeAttribute('aria-activedescendant');
  const query = $('#search').value.trim();
  if (!query) {
    closeSearch();
    return;
  }
  const matches = data.people
    .map((p) => ({ p, score: similarity(p.name, query) }))
    .filter((m) => m.score < 0.65)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
  $('#search').setAttribute('aria-expanded', 'true');
  $('#results').innerHTML =
    '<div id="searchMatches" role="listbox" aria-label="Matching people">' +
    matches
      .map(
        (m, i) =>
          `<button id="search-option-${i}" role="option" aria-selected="false" tabindex="-1" data-match="${
            m.p.id
          }">${esc(m.p.name)} ↗</button>`,
      )
      .join('') +
    '</div>' +
    `<p>${
      matches.length ? 'Someone missing?' : 'No matching people yet.'
    }</p><button id="request">Request “${esc(query)}” by email ↗</button>`;
  document.querySelectorAll('[data-match]').forEach((b, i) => {
    b.onclick = () => start(b.dataset.match);
    b.onmouseenter = () => highlightSearch(i);
  });
  $('#request').onclick = () => {
    if (!data.email) {
      notify('Set the requests recipient email in the People section.');
      tab(true);
      $('#requestEmail').focus();
      return;
    }
    window.location.href = `mailto:${encodeURIComponent(data.email)}?subject=${encodeURIComponent(
      'Family tree: add ' + query,
    )}&body=${encodeURIComponent(
      'Hello,\n\nPlease add ' +
        query +
        ' to our family tree.\n\nRelationship and other details:\n\nThank you!',
    )}`;
  };
}
function savedSection() {
  try {
    const section = localStorage.getItem('kinfolk-section-v1');
    return ['tree', 'people', 'timeline', 'relationships', 'map', 'albums', 'recipes'].includes(
      section,
    )
      ? section
      : 'tree';
  } catch {
    return 'tree';
  }
}
function rememberSection(section) {
  try {
    localStorage.setItem('kinfolk-section-v1', section);
  } catch {}
}
function showSection(section) {
  if (!$('#timeline').hidden) saveTimelinePosition();
  if (
    !['tree', 'people', 'timeline', 'relationships', 'map', 'albums', 'recipes'].includes(section)
  )
    section = 'tree';
  rememberSection(section);
  for (const [param, page] of [
    ['recipe', 'recipes'],
    ['album', 'albums'],
  ])
    if (section !== page && new URLSearchParams(location.hash.slice(1)).has(param)) {
      const url = new URL(location.href);
      url.hash = '';
      history.replaceState(null, '', url);
    }
  if (section !== 'people' && new URLSearchParams(location.hash.slice(1)).has('editPerson')) {
    const url = new URL(location.href);
    url.hash = '';
    history.replaceState(null, '', url);
  }
  $('#recipesPage').hidden = section !== 'recipes';
  $('#recipesTab').classList.toggle('active', section === 'recipes');
  $('#albumsPage').hidden = section !== 'albums';
  $('#albumsTab').classList.toggle('active', section === 'albums');
  $('#familyMapPage').hidden = section !== 'map';
  $('#mapTab').classList.toggle('active', section === 'map');
  $('#editor').hidden = section !== 'people';
  $('#explore').hidden = section !== 'tree';
  $('#timeline').hidden = section !== 'timeline';
  $('#relationships').hidden = section !== 'relationships';
  $('#treeTab').classList.toggle('active', section === 'tree');
  $('#peopleTab').classList.toggle('active', section === 'people');
  $('#timelineTab').classList.toggle('active', section === 'timeline');
  $('#openRelationshipFinder').classList.toggle('active', section === 'relationships');
  if (section === 'people') {
    directory();
    resetLocationFinder();
    setupBirthplaceFinder();
  } else if (section === 'timeline') {
    renderTimeline();
    restoreTimelinePosition();
  } else if (section === 'recipes') renderRecipes();
  else if (section === 'albums') renderAlbums();
  else if (section === 'map') renderFamilyMap();
  else if (section === 'relationships') populateRelationshipFinder();
  else {
    render();
    fitGraph();
  }
}
function openRelationshipFinder() {
  showSection('relationships');
}
function tab(editor) {
  showSection(editor ? 'people' : 'tree');
}
