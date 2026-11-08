async function familyGroupRequest(body) {
  if (!sharedReady || savingShared) throw new Error('Wait for the current save to finish.');
  savingShared = true;
  try {
    const result = await requestDatabase({ ...body, revision: sharedRevision });
    applyShared(result);
  } finally {
    savingShared = false;
  }
}
function saveFamilyGroup(familyGroup, album = null) {
  return familyGroupRequest({ action: 'save_family_group', familyGroup, ...(album ? {album} : {}) });
}
function deleteFamilyGroup(familyGroupId) {
  return familyGroupRequest({ action: 'delete_family_group', familyGroupId });
}
function openSavedFamilyTree(group, visibleMembers = [...group.parents, ...group.children]) {
  const ids = visibleMembers.filter((id) => person(id));
  if (!ids.length) {
    notify('This family has no available members.');
    return;
  }
  data.root = group.parents.find((id) => ids.includes(id)) || ids[0];
  data.selected = data.root;
  data.visible = ids;
  data.expanded = [];
  relationshipTrace = null;
  graphLayout = null;
  renderedRoot = null;
  save();
  showSection('tree');
}

async function loadFamilyAlbums() { await ensureCollection('albums'); ui.sync(data); }