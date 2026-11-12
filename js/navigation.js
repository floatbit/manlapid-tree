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
  const addFamily = $('#details .tree-profile-add');
  if (addFamily) $('#details').append(addFamily);
}
function renderDetailsContent() {
  ui.unmountPersonPhotos('tree');
  ui.sync(data);
  const p = person(data.selected);
  if (!p) {
    renderSuggestions();
    return;
  }
  const birth = p.dateDetails?.birth || p.birthday || '';
  let age = null;
  if (!p.deceased && /^\d{4}-\d{2}-\d{2}$/.test(birth) && validFamilyDate(birth)) {
    const [year, month, day] = birth.split('-').map(Number),
      today = new Date();
    age =
      today.getFullYear() -
      year -
      (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)
        ? 1
        : 0);
    if (age < 0) age = null;
  }
  const relatives = connections(p.id);
  const relativeCard = (member, label = '') =>
    `<button type="button" class="connection map-profile-relative" data-id="${esc(
      member.id,
    )}">${avatar(member)}<span><strong>${esc(displayName(member))}</strong>${viewerBadge(member.id)}${
      label ? `<small>${esc(label)}</small>` : ''
    }</span><span class="map-profile-arrow" aria-hidden="true">${uiIcon('arrowRight')}</span></button>`;
  const grouped = [
    ['parent', 'Parents'],
    ['sibling', 'Siblings'],
    ['spouse', 'Spouse'],
    ['child', 'Children'],
  ]
    .map(([kind, title]) => {
      const members = relatives.filter((relative) => relative.type === kind);
      return members.length
        ? `<section class="map-profile-family-group"><h4>${title} <span>${
            members.length
          }</span></h4>${members
            .map((relative) => relativeCard(person(relative.id)))
            .join('')}</section>`
        : '';
    })
    .join('');
  $('#details').innerHTML = `<div class="map-profile-header">${avatar(p)}<div><h2>${esc(
    p.name,
  )}</h2>${
    p.deceased
      ? '<span class="deceased-badge">Deceased</span>'
      : age !== null
      ? `<span class="map-profile-age">${age} years old</span>`
      : ''
  }${birth ? `<p>Born · ${esc(familyDateLabel(birth))}</p>` : ''}${
    p.deceased && p.dateDetails?.death
      ? `<p>Died · ${esc(familyDateLabel(p.dateDetails.death))}</p>`
      : ''
  }${viewerBadge(p.id)}</div></div>
    ${
      p.nicknames?.length ? `<p class="hint">Also known as: ${esc(p.nicknames.join(', '))}</p>` : ''
    }
    <div class="map-profile-actions"><button id="editSelected" type="button">Edit Person ${uiIcon('arrowRight')}</button><button id="sharePerson" type="button">Copy Person Link ${uiIcon('arrowRight')}</button></div>
    <p class="label-context" data-viewer-context>${ui.viewerId ? 'Tree labels show each person’s relationship to you.' : 'Tree labels are relative to this person.'}</p>
    <div class="person-view-actions tree-profile-tools"><button id="traceSelected" ${
      !data.root || data.root === p.id ? 'hidden' : ''
    }>Show Path from Starting Person</button><button id="centerSelected">◎ Center Person</button><button id="collapseSelected" ${
    data.expanded.includes(p.id) ? '' : 'disabled'
  }>− Collapse Branch</button></div>
    <section class="map-profile-family"><h3>Family Connections <span>${
      relatives.length
    }</span></h3>${grouped || '<p class="hint">No connections added yet.</p>'}</section>
    <section class="map-profile-locations tree-location-history"><h3>Locations</h3><ol class="migration-stops">${migrationStopsForPerson(p).map((stop, i) => `<li><button type="button" data-tree-stop="${i}"><strong>${esc(locationStopLabel(stop))}</strong><span>${esc(stop.location)}</span></button></li>`).join('')}</ol><button type="button" id="treePersonPlaces">View Places Lived ${uiIcon('arrowRight')}</button></section>
    <div id="treePersonPhotos"></div>
    ${
      p.bio?.trim()
        ? `<section class="map-profile-story"><h3>About</h3><p>${esc(p.bio)}</p></section>`
        : ''
    }
    <section class="tree-profile-add"><h3>Add to ${esc(
      p.firstName || p.name.split(/\s+/)[0],
    )}’s Family</h3><div class="quick-add">${['parent', 'sibling', 'spouse', 'child']
    .map((type) => `<button type="button" data-add-family="${type}">＋ Add ${type}</button>`)
    .join('')}</div></section>
`;
  ui.mountPersonPhotos($('#treePersonPhotos'),p.id,'tree');
  const openPlaces = index => openPersonPlaces(p.id, index);
  $('#treePersonPlaces').onclick = () => openPlaces();
  document.querySelectorAll('[data-tree-stop]').forEach(button => button.onclick = () => openPlaces(Number(button.dataset.treeStop)));
  document.querySelectorAll('#details .connection').forEach((b) => (b.onclick = () => { expand(b.dataset.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  $('#editSelected').onclick = () => {
    tab(true);
    edit(p.id);
  };
  const revealTree = () => { if (window.matchMedia('(max-width: 760px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#traceSelected').onclick = () => { showSelectedPersonPath(p.id); revealTree(); };
  $('#sharePerson').onclick = () => copyDirectLink({ person: p.id });
  $('#centerSelected').onclick = () => { centerPerson(p.id); revealTree(); };
  $('#collapseSelected').onclick = () => { collapseBranch(p.id); revealTree(); };
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
    suggestedPeople = ids.slice(0, 17);
  }
  $('#details').innerHTML =
    '<p class="eyebrow">A CLOSER LOOK</p><div class="sidebar-welcome"><div class="welcome-heart" aria-hidden="true">' + uiIcon('heart') + '</div><h2>Meet Your People.</h2><p>Select a person to see their story and family connections.</p></div>';
  $('#emptySuggestions').innerHTML = `<div class="suggested-people">${
    suggestedPeople
      .map((id) => {
        const p = person(id);
        return `<button data-suggested="${id}">${avatar(p)}<span>${esc(
          displayName(p),
        )}${viewerBadge(p.id)}</span><span aria-hidden="true">${uiIcon('arrowRight')}</span></button>`;
      })
      .join('') || '<p>Add a person to begin your family tree.</p>'
  }${data.people.length ? `<button id="shufflePeople" type="button"><span>Show other people</span>${uiIcon('shuffle')}</button>` : ''}</div>`;
  document
    .querySelectorAll('[data-suggested]')
    .forEach((button) => (button.onclick = () => start(button.dataset.suggested)));
  if ($('#shufflePeople')) $('#shufflePeople').onclick = () => renderSuggestions(true);
}
function setupSuggestionSearch() {
  const input = $('#suggestionSearch'),
    list = $('#suggestionMatches');
  const clear = document.createElement('button');
  clear.type = 'button'; clear.className = 'search-clear-button'; clear.textContent = '×';
  clear.setAttribute('aria-label', 'Clear search'); clear.hidden = !input.value;
  input.parentElement.classList.add('clearable-suggestion-search');
  input.insertAdjacentElement('afterend', clear);
  clear.onclick = () => { input.value = ''; search(); input.focus(); };
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
    clear.hidden = !input.value;
    const query = input.value.trim().toLocaleLowerCase();
    active = -1;
    input.removeAttribute('aria-activedescendant');
    if (!query) {
      matches = [];
      close();
      return;
    }
    matches = data.people
      .filter((p) => personMatchesQuery(p, query))
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
function personSearchScore(p, query) {
  const score = Math.min(
    ...[p.name, displayName(p), ...(p.nicknames || [])].map((name) => similarity(name, query)),
  );
  return personMatchesQuery(p, query) ? Math.min(score, 0.5) : 1;
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
      exact = data.people.filter((p) =>
        [p.name, ...(p.nicknames || [])].some((name) => name.toLowerCase() === q),
      );
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
    .map((p) => ({ p, score: personSearchScore(p, query) }))
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
          }">${esc(m.p.name)} ${viewerBadge(m.p.id)} ${uiIcon('arrowRight')}</button>`,
      )
      .join('') +
    '</div>' +
    `<p>${
      matches.length ? 'Someone missing?' : 'No matching people yet.'
    }</p><button id="request">Request “${esc(query)}” by email ${uiIcon('arrowRight')}</button>`;
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
    return [
      'overview',
      'tree',
      'people',
      'timeline',
      'families',
      'relationships',
      'map',
      'albums',
      'recipes',
    ].includes(section)
      ? section
      : 'overview';
  } catch {
    return 'overview';
  }
}
function rememberSection(section) {
  try {
    localStorage.setItem('kinfolk-section-v1', section);
  } catch {}
}
function showSection(section, { replace = false } = {}) {
  if (section === 'people' && !document.body.classList.contains('is-editor')) section = 'tree';
  if (section === 'relationships') {
    showSection('tree', { replace });
    openRelationshipFinder();
    return;
  }
  if ($('#relationships').open) $('#relationships').close();
  if (!$('#timeline').hidden) saveTimelinePosition();
  if (
    ![
      'overview',
      'tree',
      'people',
      'timeline',
      'families',
      'relationships',
      'map',
      'albums',
      'recipes',
    ].includes(section)
  )
    section = 'tree';
  rememberSection(section);
  ui.setSection(section);
  if (!restoringPageHistory) updatePageUrl(section, { replace });
  $('#familiesPage').hidden = section !== 'families';
  $('#familiesTab').classList.toggle('active', section === 'families');
  $('#overviewPage').hidden = section !== 'overview';
  $('#overviewTab').classList.toggle('active', section === 'overview');
  $('#recipesPage').hidden = section !== 'recipes';
  $('#recipesTab').classList.toggle('active', section === 'recipes');
  $('#albumsPage').hidden = section !== 'albums';
  $('#albumsTab').classList.toggle('active', section === 'albums');
  $('#familyMapPage').hidden = section !== 'map';
  $('#mapTab').classList.toggle('active', section === 'map');
  $('#editor').hidden = section !== 'people';
  $('#explore').hidden = section !== 'tree';
  $('#timeline').hidden = section !== 'timeline';
  $('#treeTab').classList.toggle('active', section === 'tree');
  $('#peopleTab').classList.toggle('active', section === 'people');
  $('#timelineTab').classList.toggle('active', section === 'timeline');
  if (section === 'overview') renderOverview();
  else if (section === 'people') {
    directory();
    resetLocationFinder();
    setupBirthplaceFinder();
  } else if (section === 'timeline') {
    renderTimeline();
    restoreTimelinePosition();
  } else if (section === 'recipes') renderRecipes();
  else if (section === 'albums') renderAlbums();
  else if (section === 'map') renderFamilyMap();
  else if (section === 'families') ui.sync(data);
  else {
    render();
    fitGraph();
  }
}
function openRelationshipFinder() {
  if (!sharedReady) {
    notify('Wait for the family database to load.');
    return;
  }
  if ($('#explore').hidden) showSection('tree');
  populateRelationshipFinder();
  if (!$('#relationships').open) $('#relationships').showModal();
  $('#relationshipFromPicker input').focus();
}
function tab(editor) {
  showSection(editor ? 'people' : 'tree');
}

let restoringPageHistory = false,
  lastRestoredPageUrl = null;
function sectionFromUrl(url = new URL(location.href)) {
  const params = new URLSearchParams(url.hash.slice(1));
  for (const [key, section] of [
    ['editPerson', 'people'],
    ['person', 'tree'],
    ['photosOf', 'tree'],
    ['album', 'albums'],
    ['recipe', 'recipes'],
    ['milestone', 'timeline'],
  ])
    if (params.has(key)) return section;
  const page = params.get('page');
  if (page === 'reports') return 'overview';
  return [
    'tree',
    'families',
    'people',
    'timeline',
    'relationships',
    'map',
    'albums',
    'recipes',
  ].includes(page)
    ? page
    : null;
}
function updatePageUrl(section, { replace = false } = {}) {
  lastRestoredPageUrl = null;
  const url = new URL(location.href);
  const params =
    sectionFromUrl(url) === section
      ? new URLSearchParams(url.hash.slice(1))
      : new URLSearchParams();
  params.set('page', section === 'overview' ? 'reports' : section);
  url.hash = params.toString();
  if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState'](null, '', url);
}
function restorePageFromUrl() {
  if (!sharedReady || restoringPageHistory || lastRestoredPageUrl === location.href) return;
  lastRestoredPageUrl = location.href;
  restoringPageHistory = true;
  try {
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    showSection(sectionFromUrl() || 'tree');
    openSharedLink();
  } finally {
    restoringPageHistory = false;
  }
}
window.addEventListener('popstate', restorePageFromUrl);
