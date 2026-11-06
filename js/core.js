const $ = (s) => document.querySelector(s);
const KEY = 'kinfolk-v1';
const hadBrowserData = !!localStorage.getItem(KEY);
let data = {
  people: [],
  links: [],
  milestones: [],
  visible: [],
  expanded: [],
  selected: null,
  root: null,
  email: '',
};
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && Array.isArray(saved.people) && Array.isArray(saved.links))
    data = { ...data, ...saved };
} catch {}
if (!localStorage.getItem(KEY)) {
  data.people = [
    ['chris', 'Chris Manlapid'],
    ['james', 'James Manlapid'],
    ['mercedes', 'Mercedes Manlapid'],
    ['luis', 'Luis T. Manlapid'],
    ['christy', 'Christy'],
    ['kaylin', 'Kaylin'],
    ['kyle', 'Kyle'],
  ].map(([id, name]) => ({ id, name, photo: '', bio: '', birthday: '', location: '' }));
  data.links = [
    { a: 'chris', b: 'james', type: 'sibling' },
    { a: 'chris', b: 'mercedes', type: 'parent' },
    { a: 'chris', b: 'luis', type: 'parent' },
    { a: 'james', b: 'mercedes', type: 'parent' },
    { a: 'james', b: 'luis', type: 'parent' },
    { a: 'chris', b: 'christy', type: 'spouse' },
    { a: 'chris', b: 'kaylin', type: 'child' },
    { a: 'chris', b: 'kyle', type: 'child' },
    { a: 'christy', b: 'kaylin', type: 'child' },
    { a: 'christy', b: 'kyle', type: 'child' },
  ];
  if (hadBrowserData)
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
}
// Repair the original example once, without replacing browser-saved family edits.
if (!data.exampleSpouseConnectionV1) {
  const luis = data.people.find((p) => p.id === 'luis' && p.name === 'Luis T. Manlapid');
  const mercedes = data.people.find((p) => p.id === 'mercedes' && p.name === 'Mercedes Manlapid');
  if (
    luis &&
    mercedes &&
    !data.links.some(
      (l) => (l.a === luis.id && l.b === mercedes.id) || (l.a === mercedes.id && l.b === luis.id),
    )
  )
    data.links.push({ a: luis.id, b: mercedes.id, type: 'spouse' });
  data.exampleSpouseConnectionV1 = true;
  if (hadBrowserData)
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
}
const initialFamily = JSON.parse(JSON.stringify(data));
let draftPhoto = '';
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
const person = (id) => data.people.find((p) => p.id === id);
const inverse = { parent: 'child', child: 'parent', sibling: 'sibling', spouse: 'spouse' };
const nameParts = (p) => {
  const parts = (p?.name || '').trim().split(/\s+/);
  return {
    firstName: p?.firstName ?? parts[0] ?? '',
    middleName: p?.middleName ?? parts.slice(1, -1).join(' '),
    lastName: p?.lastName ?? (parts.length > 1 ? parts.at(-1) : ''),
  };
};
const firstLastName = (p) => {
  const n = nameParts(p);
  return [n.firstName, n.lastName].filter(Boolean).join(' ');
};
const displayName = (p) => {
  const n = nameParts(p);
  const middle = n.middleName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/\.+$/, '')[0]?.toUpperCase() + '.')
    .join(' ');
  return [n.firstName, middle, n.lastName].filter(Boolean).join(' ');
};
const initials = (p) => {
  const n = nameParts(p);
  return ((n.firstName[0] || '') + (n.lastName[0] || '')).toUpperCase();
};
const avatar = (p) =>
  p.photo
    ? `<img class="avatar" src="${esc(p.photo)}" alt="${esc(displayName(p))}">`
    : `<span class="avatar">${esc(initials(p))}</span>`;
function notify(message) {
  ui.notify(message);
}
const VIEW_KEY = 'kinfolk-view-v1';
let sharedReady = false,
  sharedRevision = 0,
  csrfToken = '',
  savingShared = false;
try {
  const view = JSON.parse(localStorage.getItem(VIEW_KEY));
  if (view && Array.isArray(view.visible)) {
    for (const key of ['visible', 'expanded', 'selected', 'root'])
      if (key in view) data[key] = view[key];
  }
} catch {}
function save() {
  try {
    localStorage.setItem(
      VIEW_KEY,
      JSON.stringify({
        visible: data.visible,
        expanded: data.expanded,
        selected: data.selected,
        root: data.root,
      }),
    );
    return true;
  } catch {
    notify('The tree view could not be saved in this browser.');
    return false;
  }
}
function sharedPayload(action) {
  return {
    action,
    revision: sharedRevision,
    people: data.people,
    links: data.links,
    milestones: data.milestones || [],
    albums: data.albums || [],
    recipes: data.recipes || [],
    email: data.email,
  };
}
function syncStatus(message, failed = false) {
  $('.saved').textContent = message;
  $('.saved').classList.toggle('sync-error', failed);
}
function showDatabaseError(message) {
  $('#databaseMessage').textContent = message;
  $('#databaseNotice').hidden = false;
  syncStatus('● Database unavailable', true);
}
async function requestDatabase(body) {
  const response = await fetch('api.php', {
    method: body ? 'PUT' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      'This app needs a PHP server. Open it through PHP or MAMP, rather than a static file server.',
    );
  }
  if (!response.ok) throw new Error(result.error || 'Could not save the family data.');
  return result;
}
let personAliases = {},
  mapsApiKey = '';
function applyShared(result) {
  mapsApiKey = result.mapsApiKey || '';
  personAliases = Object.fromEntries(
    (result.personAliases || []).map((row) => [row.old_id, row.person_id]),
  );
  const resolve = (id) => personAliases[id] || id;
  data.visible = data.visible.map(resolve);
  data.expanded = data.expanded.map(resolve);
  data.root = resolve(data.root);
  data.selected = resolve(data.selected);
  data.people = result.people;
  data.links = result.links;
  data.milestones = result.milestones || [];
  data.albums = result.albums || [];
  data.recipes = result.recipes || [];
  data.email = result.email;
  ui.sync(data);
  sharedRevision = result.revision;
  csrfToken = result.csrf;
  data.visible = data.visible.filter((id) => person(id));
  data.expanded = data.expanded.filter((id) => person(id));
  if (!person(data.selected)) data.selected = null;
  if (!person(data.root)) data.root = null;
  save();
}
function ancestryCyclePerson(people, links) {
  const children = new Map(people.map((p) => [p.id, []])),
    state = new Map();
  for (const link of links) {
    const parent = link.type === 'parent' ? link.b : link.type === 'child' ? link.a : null,
      child = link.type === 'parent' ? link.a : link.b;
    if (parent !== null && children.has(parent) && children.has(child))
      children.get(parent).push(child);
  }
  for (const root of children.keys()) {
    if (state.has(root)) continue;
    state.set(root, 1);
    const stack = [{ id: root, next: 0 }];
    while (stack.length) {
      const frame = stack.at(-1),
        descendants = children.get(frame.id);
      if (frame.next >= descendants.length) {
        state.set(frame.id, 2);
        stack.pop();
        continue;
      }
      const child = descendants[frame.next++];
      if (state.get(child) === 1) return child;
      if (!state.has(child)) {
        state.set(child, 1);
        stack.push({ id: child, next: 0 });
      }
    }
  }
  return null;
}
async function saveShared() {
  const cycle = ancestryCyclePerson(data.people, data.links);
  if (cycle !== null) {
    const message = `These connections would make ${displayName(
      person(cycle),
    )} their own ancestor. Correct the parent/child relationships and try again.`;
    notify(message);
    if (!$('#editor').hidden) $('#formError').textContent = message;
    if ($('#familyDialog').open) $('#familyError').textContent = message;
    return false;
  }
  if (!sharedReady || savingShared) {
    notify('Please wait for the database connection.');
    return false;
  }
  savingShared = true;
  syncStatus('● Saving to MySQL…');
  $('#editor').inert = true;
  $('#details').inert = true;
  $('#familyForm').inert = true;
  $('#milestoneForm').inert = true;
  $('#albumForm').inert = true;
  $('#recipeForm').inert = true;
  $('#timeline').inert = true;
  try {
    const result = await requestDatabase(sharedPayload('save'));
    applyShared(result);
    syncStatus('● Saved to MySQL');
    $('#setupNotice').hidden = true;
    save();
    return true;
  } catch (error) {
    showDatabaseError(error.message);
    notify('Changes were not saved. ' + error.message);
    return false;
  } finally {
    savingShared = false;
    $('#editor').inert = false;
    $('#details').inert = false;
    $('#familyForm').inert = false;
    $('#milestoneForm').inert = false;
    $('#albumForm').inert = false;
    $('#recipeForm').inert = false;
    $('#timeline').inert = false;
  }
}
async function refreshShared() {
  if (
    !sharedReady ||
    savingShared ||
    !$('#editor').hidden ||
    $('#familyDialog').open ||
    !$('#relationships').hidden ||
    $('#milestoneDialog').open ||
    $('#photoLightbox').open ||
    $('#siblingGroupDialog').open ||
    $('#bulkLocationDialog').open ||
    $('#albumDialog').open ||
    $('#recipeDialog').open ||
    document.activeElement?.matches('input,textarea,select')
  )
    return;
  try {
    const result = await requestDatabase();
    if (result.revision !== sharedRevision) {
      applyShared(result);
      render();
      if (!$('#overviewPage').hidden) renderOverview();
      if (!$('#timeline').hidden) renderTimeline();
      if (!$('#familyMapPage').hidden) renderFamilyMap({ fit: false });
      if (!$('#albumsPage').hidden) renderAlbums();
      if (!$('#recipesPage').hidden) renderRecipes();
    }
    syncStatus('● Saved to MySQL');
    $('#databaseNotice').hidden = true;
  } catch (error) {
    showDatabaseError(error.message);
  }
}
async function connectDatabase() {
  for (const el of document.querySelectorAll('main')) el.inert = true;
  syncStatus('● Connecting to MySQL…');
  try {
    let result = await requestDatabase();
    csrfToken = result.csrf;
    if (result.revision === 0 && hadBrowserData)
      result = await requestDatabase(sharedPayload('bootstrap'));
    applyShared(result);
    sharedReady = true;
    $('#setupNotice').hidden = result.revision !== 0;
    $('#databaseNotice').hidden = true;
    syncStatus('● Saved to MySQL');
    edit();
    showSection(sectionFromUrl() || savedSection(), { replace: true });
    if (data.root) $('#search').value = person(data.root) ? displayName(person(data.root)) : '';
    openSharedLink();
  } catch (error) {
    showDatabaseError(error.message + ' Your browser’s previous data is still preserved.');
  } finally {
    for (const el of document.querySelectorAll('main')) el.inert = !sharedReady;
  }
}

function familyDateYear(value) {
  const match = /^(?:About )?(\d{4})(?:-\d{2}-\d{2})?$/.exec(value || '');
  return match ? Number(match[1]) : null;
}
function validFamilyDate(value) {
  if (!value || value === 'Date unknown') return true;
  const raw = value.replace(/^About /, '');
  if (/^\d{4}$/.test(raw)) return Number(raw) > 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number(raw.slice(0, 4)) < 1) return false;
  const parsed = new Date(raw + 'T12:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === raw;
}
function familyDateLabel(value) {
  if (!value) return 'Date unknown';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value + 'T12:00:00Z'));
}

function personMatchesQuery(p, query) {
  const q = query.trim().toLocaleLowerCase();
  return [p.name, displayName(p), firstLastName(p), ...(p.nicknames || [])].some((name) =>
    name.toLocaleLowerCase().includes(q),
  );
}
