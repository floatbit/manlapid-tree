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
async function loadFamilyTimeline() {
  // Milestones belong to the core snapshot, not the lazy collections endpoint.
  if (!Array.isArray(data.milestones)) applyShared(await requestDatabase());
  ui.sync(data);
}

function openInsightFamily(group = null) {
 const match=group && (data.familyGroups || []).find(f=>group.parents.every(id=>f.parents.includes(id)) && group.children.every(id=>f.children.includes(id)));
 if(group && !match){openSavedFamilyTree(group,[...group.parents,...group.children]);return;}
 showSection('families');
 const url=new URL(location.href);url.hash=new URLSearchParams(match?{page:'families',group:match.id}:{page:'families'}).toString();
 history.pushState(null,'',url);window.dispatchEvent(new Event('hashchange'));
}
function openInsightDescendants(id) {
 const ids=new Set([id]);let changed=true;
 while(changed){changed=false;for(const link of data.links){const parent=link.type==='parent'?link.b:link.type==='child'?link.a:null,child=link.type==='parent'?link.a:link.b;if(parent && ids.has(parent) && !ids.has(child)){ids.add(child);changed=true;}}}
 openSavedFamilyTree({parents:[id],children:[]},[...ids]);
}
