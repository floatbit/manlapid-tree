async function saveContributionUpdates(updates) {
  if (!document.body.classList.contains('is-editor')) throw new Error('Log in to make changes.');
  if (!sharedReady || savingShared) throw new Error('Please wait for the current save to finish.');
  for (const update of updates) {
    if (update.kind === 'birth' || update.kind === 'anniversary') {
      if (!update.value?.trim() || !validFamilyDate(update.value.trim()) || update.value.trim() === 'Date unknown') throw new Error('Enter a date, year, or About 1940. Use YYYY-MM-DD for exact dates.');
    } else if (update.kind !== 'portrait' || !update.value?.startsWith('data:image/')) throw new Error('Choose a portrait image.');
    const exists = update.kind === 'anniversary' ? data.milestones.some(m=>m.id===update.id && m.type==='marriage') : data.people.some(p=>p.id===update.id);
    if (!exists) throw new Error('This record is no longer available. Reload the page.');
  }
  const previous=JSON.stringify(data);
  for (const update of updates) {
    if(update.kind==='anniversary') data.milestones=data.milestones.map(m=>m.id===update.id?{...m,date:update.value.trim()}:m);
    else data.people=data.people.map(p=>{
      if(p.id!==update.id)return p;
      if(update.kind==='portrait')return {...p,photo:update.value};
      const birth=update.value.trim();return {...p,dateDetails:{...p.dateDetails,birth},birthday:/^\d{4}-\d{2}-\d{2}$/.test(birth)?birth:''};
    });
  }
  if(!(await saveShared())) {data=JSON.parse(previous);ui.sync(data);throw new Error('Changes were not saved. Resolve the database notice and try again.');}
  ui.sync(data);notify('Changes saved');
}
async function openContributionLocation(kind, ids) {
  if (!document.body.classList.contains('is-editor')) throw new Error('Log in to make changes.');
  await openBulkLocation(kind);
  bulkLocationPeople=ids.filter(id=>data.people.some(p=>p.id===id));
  updateBulkLocationSelection();
}
