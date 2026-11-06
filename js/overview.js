function overviewGenerations(people, links) {
  const children = new Map(people.map((p) => [p.id, new Set()]));
  const incoming = new Map(people.map((p) => [p.id, 0]));
  const depth = new Map(people.map((p) => [p.id, 1]));
  for (const link of links) {
    const parent = link.type === 'parent' ? link.b : link.type === 'child' ? link.a : null;
    const child = link.type === 'parent' ? link.a : link.b;
    if (!children.has(parent) || !children.has(child) || children.get(parent).has(child)) continue;
    children.get(parent).add(child);
    incoming.set(child, incoming.get(child) + 1);
  }
  const queue = people.filter((p) => incoming.get(p.id) === 0).map((p) => p.id);
  for (let i = 0; i < queue.length; i++)
    for (const child of children.get(queue[i])) {
      depth.set(child, Math.max(depth.get(child), depth.get(queue[i]) + 1));
      incoming.set(child, incoming.get(child) - 1);
      if (!incoming.get(child)) queue.push(child);
    }
  return people.length ? Math.max(...depth.values()) : 0;
}
function renderOverviewSummary() {
  const people = data.people,
    albums = data.albums || [],
    milestones = data.milestones || [];
  const located = people.filter((p) => p.location?.trim());
  const locations = new Map();
  for (const p of located) {
    const label = p.location.trim();
    locations.set(label, (locations.get(label) || 0) + 1);
  }
  const places = [...locations].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6);
  const upcoming = upcomingAnniversaries(people, milestones).slice(0, 5);
  const recent = [...milestones]
    .filter((m) => m.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const recentAlbums = sortedAlbums([...albums]).slice(0, 4);
  const stats = [
    [people.length, 'People', 'people'],
    [overviewGenerations(people, data.links), 'Known Generations', 'tree'],
    [locations.size, 'Current Locations', 'map'],
    [milestones.length, 'Milestones', 'timeline'],
    [albums.length, 'Albums', 'albums'],
    [
      albums.reduce((sum, a) => sum + (a.photos || []).length, 0),
      'Album Photos & Videos',
      'albums',
    ],
  ];
  $('#overviewSummary').innerHTML = `<div class="overview-stats">${stats
    .map(
      ([count, label, page]) =>
        `<button type="button" data-overview-page="${page}"><strong>${count}</strong><span>${label}</span></button>`,
    )
    .join('')}</div>
    <div class="overview-panels">
    <section><h2>Upcoming Anniversaries</h2><p class="hint">Next 90 days · Dates with a known month and day</p>${
      upcoming
        .map(
          (event, i) =>
            `<button class="overview-item" type="button" data-overview-upcoming="${i}"><small>${esc(
              event.kind,
            )} · ${event.days ? 'In ' + event.days + ' days' : 'Today'}</small><strong>${esc(
              event.title,
            )}</strong><span>${esc(
              event.next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
            )}</span></button>`,
        )
        .join('') || '<p>No upcoming anniversaries with known dates.</p>'
    }<button type="button" data-overview-page="timeline">View Timeline ↗</button></section>
    <section><h2>Family Locations</h2><p class="hint">${located.length} of ${
    people.length
  } people have a current location</p>${
    places
      .map(
        ([name, count]) =>
          `<button class="overview-item" type="button" data-overview-page="map"><strong>${esc(
            name,
          )}</strong><span>${count} ${count === 1 ? 'person' : 'people'}</span></button>`,
      )
      .join('') || '<p>Add current locations to explore your family on the map.</p>'
  }<button type="button" data-overview-page="map">Explore Map ↗</button></section>
    <section><h2>Latest Milestones</h2><p class="hint">Most recent event dates</p>${
      recent
        .map(
          (event, i) =>
            `<button class="overview-item" type="button" data-overview-milestone="${i}"><strong>${esc(
              event.title,
            )}</strong><span>${esc(familyDateLabel(event.date))}</span></button>`,
        )
        .join('') || '<p>No dated milestones yet.</p>'
    }<button type="button" data-overview-page="timeline">View Timeline ↗</button></section>
    <section><h2>Latest Albums</h2><p class="hint">Newest album dates first</p>${
      recentAlbums
        .map(
          (album, i) =>
            `<button class="overview-item overview-album" type="button" data-overview-album="${i}">${
              album.photos?.length
                ? milestoneMediaPreview(album.photos[0], 'overview-thumb', album.title)
                : ''
            }<span><strong>${esc(album.title)}</strong><small>${
              album.date ? esc(familyDateLabel(album.date)) + ' · ' : ''
            }${album.photos?.length || 0} photos and videos</small></span></button>`,
        )
        .join('') || '<p>No albums yet.</p>'
    }<button type="button" data-overview-page="albums">View Albums ↗</button></section>
    </div>`;
  const root = $('#overviewSummary');
  root
    .querySelectorAll('[data-overview-page]')
    .forEach((button) => (button.onclick = () => showSection(button.dataset.overviewPage)));
  root.querySelectorAll('[data-overview-upcoming]').forEach(
    (button) =>
      (button.onclick = () => {
        const event = upcoming[Number(button.dataset.overviewUpcoming)];
        if (event.personId) {
          showSection('people');
          selectPersonFromDirectory(event.personId);
        } else {
          showSection('timeline');
          openMilestone(event.milestoneId);
        }
      }),
  );
  root.querySelectorAll('[data-overview-milestone]').forEach(
    (button) =>
      (button.onclick = () => {
        showSection('timeline');
        openMilestone(recent[Number(button.dataset.overviewMilestone)].id);
      }),
  );
  root.querySelectorAll('[data-overview-album]').forEach(
    (button) =>
      (button.onclick = () => {
        const album = recentAlbums[Number(button.dataset.overviewAlbum)];
        if (album.photos?.length) openPhotoLightbox(album.photos, 0, album.title);
        else notify('This album has no photos or videos yet.');
      }),
  );
}
