async function inlineBackupImage(photo) {
  if (!photo || photo.startsWith('data:')) return photo;
  const response = await fetch(photo, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('A photo could not be downloaded. Backup was not created.');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read a backup image.'));
    reader.readAsDataURL(blob);
  });
}
async function exportFamily() {
  $('#exportFamily').disabled = true;
  notify('Preparing backup, including photos…');
  try {
    await Promise.all(['albums', 'recipes'].map(ensureCollection));
    const backup = JSON.parse(
        JSON.stringify({
          format: 'kinfolk-v1',
          familyGroups: data.familyGroups || [],
          photoTagAssignments: ['album','recipe','milestone'].flatMap(type => (data[type === 'album' ? 'albums' : type === 'recipe' ? 'recipes' : 'milestones'] || []).flatMap(owner => (type==='milestone' && owner.albumId ? [] : (owner.photos || []).flatMap((photo,index) => data.photoTags?.[photo]?.length ? [{type,owner:owner.id,index,fingerprint:photo.split('/').pop(),people:data.photoTags[photo]}] : [])))),
          people: data.people,
          links: data.links,
          milestones: data.milestones || [],
          albums: data.albums || [],
          recipes: data.recipes || [],
          email: data.email,
        }),
      ),
      jobs = [];
    for (const p of backup.people)
      if (p.photo) jobs.push(async () => (p.photo = await inlineBackupImage(p.photo)));
    for (const recipe of backup.recipes || [])
      for (let i = 0; i < recipe.photos.length; i++)
        jobs.push(async () => (recipe.photos[i] = await inlineBackupImage(recipe.photos[i])));
    for (const album of backup.albums || [])
      for (let i = 0; i < album.photos.length; i++)
        jobs.push(async () => (album.photos[i] = await inlineBackupImage(album.photos[i])));
    for (const event of backup.milestones) {
      if (event.albumId) {
        event.photos = null;
        continue;
      }
      for (let i = 0; i < (event.photos || []).length; i++)
        jobs.push(async () => (event.photos[i] = await inlineBackupImage(event.photos[i])));
    }
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, jobs.length) }, async () => {
        while (next < jobs.length) await jobs[next++]();
      }),
    );
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'kinfolk-family-backup.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Backup downloaded with photos');
  } catch (error) {
    notify(error.message);
  } finally {
    $('#exportFamily').disabled = false;
  }
}
$('#exportFamily').onclick = exportFamily;
$('#importFamily').onclick = () => $('#familyBackup').click();
$('#setupImport').onclick = () => $('#familyBackup').click();
$('#useExample').onclick = async () => {
  const previous = JSON.stringify(data);
  data.people = initialFamily.people;
  data.links = initialFamily.links;
  if (!(await saveShared())) {
    data = JSON.parse(previous);
    return;
  }
  directory();
  edit();
  render();
  notify('Example family saved to MySQL');
};
$('#familyBackup').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const previous = JSON.stringify(data);
  try {
    await Promise.all(['albums', 'recipes'].map(ensureCollection));
    if (file.size > 160000000) throw new Error('Backup file is too large.');
    const incoming = JSON.parse(await file.text());
    if (!Array.isArray(incoming.people) || !Array.isArray(incoming.links))
      throw new Error('Choose a Kinfolk family backup.');
    if(incoming.photoTagAssignments !== undefined) {
      if(!Array.isArray(incoming.photoTagAssignments)) throw new Error('Invalid photo tags.');
      data.pendingPhotoTagImports=incoming.photoTagAssignments;
    }
    const ids = new Set(data.people.map((p) => p.id));
    for (const p of incoming.people) {
      if (!p || typeof p.id !== 'string') throw new Error('Invalid person in backup.');
      if (!ids.has(p.id)) {
        data.people.push(p);
        ids.add(p.id);
      }
    }
    if (incoming.familyGroups !== undefined) {
      if (!Array.isArray(incoming.familyGroups)) throw new Error('Invalid family groups.');
      const existing = new Set((data.familyGroups || []).map((g) => g.id));
      data.familyGroups = [
        ...(data.familyGroups || []),
        ...incoming.familyGroups.filter((g) => !existing.has(g.id)),
      ];
    }
    const pairs = new Set(data.links.map((l) => [l.a, l.b].sort().join('|')));
    for (const l of incoming.links) {
      const pair = [l.a, l.b].sort().join('|');
      if (!pairs.has(pair)) {
        data.links.push(l);
        pairs.add(pair);
      }
    }
    if (incoming.recipes !== undefined) {
      if (!Array.isArray(incoming.recipes)) throw new Error('Invalid recipes in backup.');
      const recipeIds = new Set((data.recipes || []).map((r) => r.id));
      data.recipes = data.recipes || [];
      for (const recipe of incoming.recipes)
        if (!recipeIds.has(recipe.id)) {
          data.recipes.push(recipe);
          recipeIds.add(recipe.id);
        }
    }
    if (incoming.albums !== undefined) {
      if (!Array.isArray(incoming.albums)) throw new Error('Invalid albums in backup.');
      const albumIds = new Set((data.albums || []).map((a) => a.id));
      data.albums = data.albums || [];
      for (const album of incoming.albums)
        if (!albumIds.has(album.id)) {
          data.albums.push(album);
          albumIds.add(album.id);
        }
    }
    if (incoming.milestones !== undefined) {
      if (!Array.isArray(incoming.milestones)) throw new Error('Invalid milestones in backup.');
      const eventIds = new Set((data.milestones || []).map((event) => event.id));
      for (const event of incoming.milestones)
        if (!eventIds.has(event.id)) {
          data.milestones.push(event);
          eventIds.add(event.id);
        }
    }
    if (!data.email && typeof incoming.email === 'string') data.email = incoming.email;
    if (!(await saveShared())) {
      data = JSON.parse(previous);
      return;
    }
    directory();
    edit();
    render();
    notify('Family backup imported. Existing database records were kept.');
  } catch (error) {
    data = JSON.parse(previous);
    notify(error.message);
  } finally {
    e.target.value = '';
  }
};
