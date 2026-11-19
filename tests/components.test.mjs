import assert from 'node:assert/strict';
import { mount, flushPromises } from './mount-component.mjs';
import { nextTick } from 'vue';
import PersonDetailsSidebar from '../src/components/PersonDetailsSidebar.vue';
import TimelineEvents from '../src/components/TimelineEvents.vue';
import UpcomingAnniversaries from '../src/components/UpcomingAnniversaries.vue';
import PersonPhotos from '../src/components/PersonPhotos.vue';
import PersonAutocomplete from '../src/components/PersonAutocomplete.vue';
import NicknameTags from '../src/components/NicknameTags.vue';
import ReportsPage from '../src/pages/ReportsPage.vue';
import PhotoLightbox from '../src/dialogs/PhotoLightbox.vue';
import ConnectionRow from '../src/components/ConnectionRow.vue';
import MilestonePeople from '../src/components/MilestonePeople.vue';
import RecipeDetail from '../src/components/RecipeDetail.vue';
import RelationshipDialog from '../src/dialogs/RelationshipDialog.vue';
import AppHeader from '../src/components/AppHeader.vue';
import AccessControls from '../src/components/AccessControls.vue';
import TreePage from '../src/pages/TreePage.vue';
import { bindRuntime, ui, family, activePage, nicknameDraft, lightbox, sidebarPersonId, showPersonDetails, timelineView } from '../src/ui/runtime.js';
const people = [
  { id: 'melissa', name: 'Melissa Manlapig', nicknames: ['Mimi'], photo: '' },
  { id: 'chris', name: 'Chris Manlapid', photo: 'portrait.jpg', birthday: '1980-12-25' },
];
const display = (p) => p.name;
const matches = (p, q) =>
  [p.name, ...(p.nicknames || [])].some((n) => n.toLowerCase().includes(q.trim().toLowerCase()));
const calls = [];
bindRuntime({
  initials:p=>p.name[0],
  displayName: display,
  firstLastName: display,
  recipeCategories: { main: 'Main dishes' },
  personMatchesQuery: matches,
  updatePersonUnsaved: () => calls.push('dirty'),
  upcomingAnniversaries: () => [],
  sortedAlbums: (a) => a,
  familyDateLabel: (v) => v,
  showSection: (page) => calls.push(page),
  selectPersonFromDirectory: (id) => calls.push(id),
  openPhotoLightbox: (...args) => calls.push(args),
  notify: (m) => calls.push(m),
  copyDirectLink: (args) => calls.push(args),
  savePhotoPeople: async (photo, ids) => {ui.sync({...family.value,photoTags:{...family.value.photoTags,[photo]:ids}});},
  openTaggedPerson: id => calls.push(id),
  deletePhotoFromLightbox: async photo => {calls.push(['delete',photo]);ui.sync({...family.value,albums:family.value.albums.map(a=>({...a,photos:a.photos.filter(item=>item!==photo)}))});},
});
ui.setEditing(true);
ui.sync({
  people,
  links: [],
  albums: [
    { id: 'a', title: 'Christmas', date: '2025-12-25', photos: ['photo1.jpg', 'photo2.jpg'] },
  ],
  milestones: [],
  recipes: [],
});
{
  const chosen = [];
  const wrapper = mount(PersonAutocomplete, {
    attachTo: document.body,
    props: {
      options: () => people,
      label: 'Person',
      inputId: 'testSearch',
      listId: 'testMatches',
      matches,
      display,
      onSelect: (p) => chosen.push(p),
    },
  });
  await wrapper.find('input').setValue('MIMI');
  assert(wrapper.text().includes('Melissa Manlapig'));
  await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' });
  await wrapper.find('input').trigger('keydown', { key: 'Enter' });
  assert.equal(chosen[0].id, 'melissa');
  await wrapper.find('.search-clear-button').trigger('click');
  assert.equal(wrapper.find('input').element.value, '');
  assert(wrapper.find('[role="listbox"]').element.hidden);
  assert(wrapper.find('.search-clear-button').element.hidden);
  assert.equal(wrapper.find('[role="listbox"]').attributes('hidden'), '');
  wrapper.unmount();
}
{
  const selected = [];
  const wrapper = mount(PersonAutocomplete, {
    attachTo: document.body,
    props: {
      options: () => people.filter((p) => !selected.includes(p.id)),
      inputId: 'multiSearch',
      listId: 'multiMatches',
      matches,
      display,
      keepResults: true,
      validateSelection: false,
      onSelect: (p) => selected.push(p.id),
    },
  });
  await wrapper.find('input').setValue('m');
  await wrapper
    .findAll('[role="option"]')
    .find((option) => option.text() === 'Melissa Manlapig')
    .trigger('click');
  assert.equal(wrapper.find('input').element.value, 'm');
  assert(!wrapper.find('[role="listbox"]').element.hidden);
  assert(!wrapper.findAll('[role="option"]').some((o) => o.text() === 'Melissa Manlapig'));
  wrapper.unmount();
}
{
  nicknameDraft.value = ['Mimi'];
  const wrapper = mount(NicknameTags, { attachTo: document.body });
  await wrapper.find('#nicknameInput').setValue('mimi');
  await wrapper.find('#nicknameInput').trigger('keydown', { key: 'Enter' });
  assert.equal(nicknameDraft.value.length, 1);
  await wrapper.find('#nicknameInput').setValue('Mel');
  await wrapper.find('#nicknameInput').trigger('keydown', { key: ',' });
  assert.deepEqual(nicknameDraft.value, ['mimi', 'Mel']);
  assert(calls.includes('dirty'));
  wrapper.unmount();
}
{
  const wrapper = mount(ReportsPage, { attachTo: document.body });
  assert.equal(wrapper.findAll('.directory-missing').length, 1);
  assert.equal(wrapper.findAll('#reportRandomPhoto').length, 1);
  assert(wrapper.find('.contribution-portraits').text().includes('Melissa'));
  assert.equal(wrapper.findAll('.overview-panels, .overview-stats').length, 0, 'Contribute omits overview panels and stats');
  wrapper.unmount();
}
{
  const wrapper = mount(PhotoLightbox, { attachTo: document.body });
  await ui.openLightbox(['photo1.jpg', 'photo2.jpg'], 0, 'Christmas');
  await flushPromises();
  assert(wrapper.element.open);
  assert.equal(wrapper.find('#lightboxCounter').text(), '1 / 2');
  await wrapper.find('#lightboxNext').trigger('click');
  assert.equal(wrapper.find('#lightboxCounter').text(), '2 / 2');
  await wrapper.trigger('keydown', { key: 'ArrowRight' });
  assert.equal(wrapper.find('#lightboxCounter').text(), '1 / 2');
  await wrapper.find('#shareLightbox').trigger('click');
  assert.equal(calls.at(-1).album, 'a');
  await ui.openLightbox(['photo1.jpg','photo2.jpg'],1,'Photos of Melissa','melissa');
  await flushPromises();
  await wrapper.find('#shareLightbox').trigger('click');
  assert.deepEqual(calls.at(-1),{photosOf:'melissa',media:'photo2.jpg'});
  await wrapper.find('#lightboxPrevious').trigger('click');
  await wrapper.find('#shareLightbox').trigger('click');
  assert.deepEqual(calls.at(-1),{photosOf:'melissa',media:'photo1.jpg'});
  await ui.openLightbox(['photo1.jpg','photo2.jpg'],0,'Christmas');
  await flushPromises();
  assert(wrapper.find('#photoPeopleSearch').element,'Tag search is available immediately');
  await wrapper.find('#photoPeopleSearch').setValue('mimi');
  await wrapper.find('#photoPeopleSearch').trigger('keydown',{key:'ArrowRight'});
  assert.equal(lightbox.value.index,0,'Typing in the tag picker must not navigate photos');
  await wrapper.find('#photoPeopleSearch').trigger('keydown',{key:'ArrowDown'});
  assert.equal(wrapper.find('#photoPeopleMatches [role=option]').attributes('aria-selected'),'true');
  await wrapper.find('#photoPeopleSearch').trigger('keydown',{key:'Enter'});
  await flushPromises();
  assert(!wrapper.text().includes('Save Tags'),'Tags save automatically');
  assert.deepEqual(family.value.photoTags['photo1.jpg'],['melissa']);
  assert(wrapper.find('.lightbox-person-tags').text().includes('Melissa'));
  await wrapper.find('#lightboxNext').trigger('click');
  assert(!wrapper.find('.lightbox-person-tags').text().includes('Melissa'),'Tags belong only to their photo');
  await wrapper.find('#lightboxPrevious').trigger('click');
  assert(wrapper.find('.lightbox-person-tags').text().includes('Melissa'));
  await wrapper.find('#lightboxClose').trigger('click');
  await nextTick();
  assert.equal(lightbox.value.photos.length, 0);
  wrapper.unmount();
}
{
  const wrapper = mount(ConnectionRow, {
    props: {
      id: 'melissa',
      type: 'sibling',
      pickerId: 'connectionTest',
      owner: () => 'chris',
      onChanged: () => calls.push('connection'),
    },
  });
  assert.equal(wrapper.find('.relation-person-id').element.value, 'melissa');
  assert.equal(wrapper.find('select').element.value, 'sibling');
  await wrapper.find('input[type="search"]').setValue('chris');
  assert.equal(
    wrapper.findAll('[role="option"]').length,
    0,
    'The edited person cannot select themselves',
  );
  await wrapper.find('input[type="search"]').setValue('mimi');
  await wrapper.find('[role="option"]').trigger('click');
  assert.equal(wrapper.find('.relation-person-id').element.value, 'melissa');
  assert(calls.includes('connection'));
  wrapper.unmount();
}
{
  let participants = [];
  ui.setMilestonePeople([], (ids) => {
    participants = ids;
  });
  const wrapper = mount(MilestonePeople);
  await wrapper.find('input').setValue('mimi');
  await wrapper.find('[role="option"]').trigger('click');
  assert.deepEqual(participants, ['melissa']);
  assert.equal(wrapper.find('input').element.value, '');
  assert(wrapper.text().includes('Melissa'));
  wrapper.unmount();
}
{
  ui.setRecipeDetail({
    id: 'r',
    title: 'Family dish',
    category: 'main',
    personId: 'chris',
    servings: '4',
    prepMinutes: 10,
    cookMinutes: 20,
    ingredients: 'Rice\nSalt',
    instructions: 'Rinse\nCook',
    story: 'A memory',
    photos: [],
  });
  const wrapper = mount(RecipeDetail);
  assert.equal(wrapper.findAll('ul li').length, 2);
  assert.equal(wrapper.findAll('ol li').length, 2);
  assert(wrapper.text().includes('From Chris Manlapid'));
  wrapper.unmount();
}
{
  const select = document.createElement('select');
  select.id = 'migrationPickerTest';
  select.innerHTML = '<option value=""></option><option value="melissa">Melissa</option>';
  document.body.append(select);
  let changes = 0;
  select.addEventListener('change', () => changes++);
  ui.mountPersonPicker(select, {
    required: false,
    label: 'Choose a person',
    people: () => people,
    display: (p) => p.name + ' · 3 places',
    matches,
    notifyOnQuery: false,
  });
  const input = document.querySelector('#migrationPickerTestSearch');
  input.value = 'mimi';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  assert.equal(changes, 0, 'Typing must not redraw the map sidebar');
  const option = document.querySelector('#migrationPickerTestMatches [role="option"]');
  assert.equal(option.textContent, 'Melissa Manlapig · 3 places');
  option.click();
  await nextTick();
  assert.equal(changes, 1);
  assert.equal(select.value, 'melissa');
  assert.equal(input.value, 'Melissa Manlapig · 3 places');
}
{
  const header = mount(AppHeader);
  assert.equal(header.findAll('.auth-link').length,0,'Login is accessed directly, not from the header');
  assert(!header.findAll('nav button').some((button) => button.text() === 'Relationships'));
  header.unmount();
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = query => ({matches:true,media:query,addEventListener(){},removeEventListener(){}});
  const mobileHeader = mount(AppHeader,{attachTo:document.body});
  await nextTick();
  assert.equal(document.querySelectorAll('#search').length,1,'Shared search keeps a single input');
  assert(document.querySelector('#mobileMainMenu #search'),'Mobile search moves into the menu');
  await mobileHeader.find('.mobile-menu-toggle').trigger('click');
  assert(document.querySelector('#mobileMainMenu').open,'Mobile menu opens as a modal');
  assert.equal(document.querySelectorAll('#mobileMainMenu nav button').length,13);
  ui.closeMobileMenu();
  assert(!document.querySelector('#mobileMainMenu').open,'Selecting a person can close the menu');
  mobileHeader.unmount();window.matchMedia=originalMatchMedia;
  const tree = mount(TreePage);
  assert.equal(tree.find('#openRelationshipFinder').text(), 'Relationship');
  assert.equal(tree.find('#openRelationshipFinder').findAll('svg[aria-hidden="true"]').length, 1);
  tree.unmount();
  const modal = mount(RelationshipDialog);
  modal.element.showModal();
  assert(modal.element.open);
  await modal.find('.relationship-dialog-close').trigger('click');
  assert(!modal.element.open);
  modal.unmount();
}
{
  const wrapper=mount(PhotoLightbox);
  const originalConfirm=globalThis.confirm;
  let confirmation;
  globalThis.confirm=text=>{confirmation=text;return false;};
  await ui.openLightbox(['uploads/test1.jpg','uploads/test2.jpg'],0,'Delete test');await flushPromises();
  await wrapper.find('.lightbox-delete').trigger('click');
  assert.equal(confirmation,'Do you really want to delete this photo?');
  assert.equal(lightbox.value.photos.length,2,'Cancel preserves photos');
  globalThis.confirm=()=>true;
  await wrapper.find('.lightbox-delete').trigger('click');await flushPromises();
  assert.equal(lightbox.value.photos.length,1);
  assert.equal(lightbox.value.photos[0],'uploads/test2.jpg');
  await wrapper.find('.lightbox-delete').trigger('click');await flushPromises();
  assert.equal(lightbox.value.photos.length,0);
  assert(!wrapper.element.open,'Deleting the last photo closes the lightbox');
  globalThis.confirm=originalConfirm;wrapper.unmount();
}
{
  const tagged=Object.fromEntries(Array.from({length:13},(_,index)=>['person-photo-'+index+'.jpg',['melissa']]));
  tagged['someone-else.jpg']=['chris'];
  ui.sync({...family.value,people,photoTags:tagged});
  const wrapper=mount(PersonPhotos,{props:{personId:'melissa'}});
  assert.equal(wrapper.findAll('.person-photos-grid img').length,6);
  const familyPhotos=mount(PersonPhotos,{props:{personId:'melissa',limit:12,columns:4}});
  assert.equal(familyPhotos.findAll('.person-photos-grid img').length,12);
  assert.match(familyPhotos.find('.person-photos-grid').element.style.gridTemplateColumns,/repeat\(4,/);
  familyPhotos.unmount();
  assert(wrapper.find('h3').text().includes('PHOTOS'));
  assert(!wrapper.find('h3').text().includes('Melissa'));
  assert(wrapper.text().includes('View All Photos (13)'));
  await wrapper.findAll('.person-photos-grid button')[1].trigger('click');await flushPromises();
  assert.equal(calls.at(-1)[0].length,13);
  assert.equal(calls.at(-1)[1],1);
  assert.equal(calls.at(-1)[3],'melissa','Photo collection retains person context');
  assert(!calls.at(-1)[0].includes('someone-else.jpg'));
  ui.sync({...family.value,photoTags:{'remaining.jpg':['melissa']}});await nextTick();
  assert.equal(wrapper.findAll('.person-photos-grid img').length,1);
  assert(wrapper.text().includes('View All Photos (1)'));
  wrapper.unmount();
}
{
  const host=document.createElement('div');host.id='app';host.innerHTML='<button>Edit Person</button><button>Copy Link</button><dialog><h2>Example</h2></dialog>';document.body.append(host);
  const controls=mount(AccessControls,{attachTo:document.body});await nextTick();
  assert(host.querySelector('button').hasAttribute('data-editor-only'));
  assert(!host.querySelectorAll('button')[1].hasAttribute('data-editor-only'));
  const dialog=host.querySelector('dialog');dialog.showModal();dialog.querySelector('.dialog-close-x').click();
  assert(!dialog.open,'Close X dismisses the dialog');
  ui.setEditing(false);assert(!document.body.classList.contains('is-editor'));
  controls.unmount();host.remove();ui.setEditing(true);
}
console.log(
  'Passed: Vue keyboard autocomplete, repeated selection, nickname tags, reports, and lightbox navigation/share.',
);

{
  window.sessionStorage.removeItem('anniversaries-expanded');
  const accordion = mount(UpcomingAnniversaries);
  assert.equal(accordion.find('.anniversaries-toggle').attributes('aria-expanded'), 'false');
  assert(accordion.find('#anniversaryEntries').element.classList.contains('mobile-collapsed'));
  await accordion.find('.anniversaries-toggle').trigger('click');
  assert.equal(accordion.find('.anniversaries-toggle').attributes('aria-expanded'), 'true');
  accordion.unmount();
  const restored = mount(UpcomingAnniversaries);
  assert.equal(restored.find('.anniversaries-toggle').attributes('aria-expanded'), 'true');
  await restored.find('.anniversaries-toggle').trigger('click');
  restored.unmount();
  const closed = mount(UpcomingAnniversaries);
  assert.equal(closed.find('.anniversaries-toggle').attributes('aria-expanded'), 'false');
  closed.unmount();
  console.log('Passed: anniversaries default closed and retain both open and closed states across remounts.');
}

{
  const originalScroll = window.scrollTo;
  const originalMedia = window.matchMedia;
  window.matchMedia = () => ({ matches: true });
  const scrolls = [];
  window.scrollTo = options => scrolls.push(options);
  const target = document.createElement('article');
  target.id = 'timeline-death-chris'; target.tabIndex = 0;
  target.getBoundingClientRect = () => ({ top: 240 });
  const birth = document.createElement('article'); birth.id = 'timeline-birth-chris';
  document.body.append(target, birth);
  const opened = [];
  bindRuntime({ openPersonDetails: id => opened.push(id), upcomingAnniversaries: () => [{ kind: 'Remembrance', personId: 'chris', title: 'Chris', next: new Date(), days: 0, years: 1 }] });
  const wrapper = mount(UpcomingAnniversaries);
  await wrapper.find('.anniversary-card').trigger('click'); await flushPromises();
  assert(target.classList.contains('anniversary-highlight'), 'Remembrance highlights its timeline entry');
  assert.equal(document.activeElement,target);
  assert.equal(scrolls.length,1,'Sidebar selection scrolls to the timeline entry');
  assert.deepEqual(opened,[],'Date links stay in the timeline');
  wrapper.unmount(); target.remove(); birth.remove();
  window.scrollTo = originalScroll; window.matchMedia = originalMedia;
  console.log('Passed: sidebar remembrance scrolls to and highlights its timeline entry.');
}

{
  const directory = mount(PersonAutocomplete, { props: { options: () => people, display, matches, inputId: 'fullDirectory', listId: 'fullDirectoryMatches', showAll: true, keepResults: true, validateSelection: false } });
  assert.equal(directory.findAll('[role="option"]').length, people.length, 'Directory lists everyone before searching');
  await directory.find('input').setValue('Mimi');
  assert.equal(directory.findAll('[role="option"]').length, 1, 'Directory filters by nickname');
  await directory.find('input').setValue('');
  assert.equal(directory.findAll('[role="option"]').length, people.length, 'Clearing restores everyone');
  directory.unmount();
  console.log('Passed: full directory shows everyone, filters searches, and restores the full list when cleared.');
}

{
  const selected = [], tree = [], copies = [];
  family.value = { people, links: [], photoTags: {} };
  activePage.value = 'timeline';
  bindRuntime({ displayName: display, initials: p => p.name[0], familyDateYear: () => 1980,
    familyDateLabel: v => v, connections: () => [], migrationStopsForPerson: () => [],
    openPersonDetails: id => { selected.push(id); showPersonDetails(id); },
    start: id => tree.push(id), copyDirectLink: value => copies.push(value) });
  timelineView.value = [{ id: 'birth-chris', kind: 'birth', person: people[1], date: '1980-12-25' }];
  const entries = mount(TimelineEvents);
  await entries.find('.birth-event').trigger('click');
  assert.deepEqual(selected, ['chris']);
  assert.equal(activePage.value, 'timeline');
  const sidebar = mount(PersonDetailsSidebar);
  assert(sidebar.text().includes('Chris Manlapid'));
  const actions = sidebar.findAll('.map-profile-actions button');
  await actions.find(b => b.text().includes('Copy Person Link')).trigger('click');
  assert.deepEqual(copies, [{ person: 'chris' }]);
  await actions.find(b => b.text().includes('Open Family Tree')).trigger('click');
  assert.deepEqual(tree, ['chris']);
  sidebarPersonId.value = null;
  entries.unmount(); sidebar.unmount();
  console.log('Passed: Timeline people open sidebar details in place with explicit Tree and Copy actions.');
}

{
  const { default: PhotoPeopleTags } = await import('../src/components/PhotoPeopleTags.vue');
  const { recentPhotoTags, rememberPhotoTags } = await import('../src/ui/recent-photo-tags.js');
  const saved=[];
  family.value={people,links:[],photoTags:{}};
  recentPhotoTags.value=[];
  rememberPhotoTags(Array.from({length:20},(_,i)=>'id'+i));
  assert.equal(recentPhotoTags.value.length,12,'Recent names are capped at 12');
  rememberPhotoTags(['melissa','chris']);
  rememberPhotoTags(['melissa']);
  assert.equal(recentPhotoTags.value[0],'melissa','Reused names move to the front');
  ui.setEditing(true);
  bindRuntime({displayName:display,initials:p=>p.name[0],personMatchesQuery:matches,
    savePhotoPeople:async(photo,ids)=>{saved.push([...ids]);family.value={...family.value,photoTags:{...family.value.photoTags,[photo]:ids}};}});
  const tags=mount(PhotoPeopleTags,{props:{photo:'test.jpg',showRecent:true}});
  assert.deepEqual(tags.findAll('.recent-photo-tag-list button').map(b=>b.element.getAttribute('aria-label')),['Tag Chris Manlapid','Tag Melissa Manlapig'],'Recent names display alphabetically');
  await tags.findAll('.recent-photo-tag-list button')[1].trigger('click');await flushPromises();
  assert.deepEqual(saved,[['melissa']],'Clicking a recent name saves the photo tag');
  assert(tags.findAll('.recent-photo-tag-list button')[1].element.disabled,'Already tagged suggestions cannot be added twice');
  assert(tags.find('.lightbox-person-tags').text().includes('Melissa'));
  tags.unmount();
  console.log('Passed: recent photo names are limited, ordered and saved with one click.');
}

{
 const edits=[],albums=[];
 family.value={people:[],links:[]};ui.setEditing(true);
 timelineView.value=[{id:'party',kind:'milestone',type:'birthday_party',date:'2020-01-01',title:'Birthday party',photos:['party.jpg'],participants:[]}];
 bindRuntime({familyDateYear:()=>2020,familyDateLabel:d=>d,milestoneMediaCount:p=>p.length+' photos',editMilestone:id=>edits.push(id),openPhotoLightbox:(...args)=>albums.push(args)});
 const entries=mount(TimelineEvents);
 await entries.find('.birth-album-edit').trigger('click');
 assert.deepEqual(edits,['party'],'Edit Milestone opens editor for the selected event');
 assert.equal(albums.length,0,'Editing does not open the album');
 await entries.find('.milestone-event').trigger('click');
 assert.equal(albums.length,1,'Card still opens the album');
 entries.unmount();
 console.log('Passed: explicit milestone editing stays separate from card album action.');
}

{
 const {readFileSync}=await import('node:fs');
 const {default:vm}=await import('node:vm');
 const {default:MilestoneDialog}=await import('../src/dialogs/MilestoneDialog.vue');
 bindRuntime({displayName:display,firstLastName:display,personMatchesQuery:matches});
 const modal=mount(MilestoneDialog,{attachTo:document.body});
 const source=readFileSync('js/milestones.js','utf8');
 const functions=source.slice(source.indexOf('async function editMilestone('),source.indexOf("$('#addMilestone').onclick"));
 const albumSource=readFileSync('js/albums.js','utf8');
 const populate=albumSource.slice(albumSource.indexOf('function populateMilestoneAlbums('),albumSource.indexOf("$('#milestoneAlbum').onchange"));
 const selected={id:'saved-event',title:'The correct wedding',type:'marriage',date:'2010-12-04',location:'New York',description:'Our story',participants:['chris'],photos:['wedding.jpg'],albumId:'album'};
 const loaded=[];
 const context=vm.createContext({document,$:s=>document.querySelector(s),data:{milestones:[selected],albums:[]},collectionRevisions:new Map([['albums',3]]),sharedRevision:3,
   ensureCollection:async kind=>{assert.equal(kind,'albums','Milestones must never use the lazy collections endpoint');loaded.push(kind);context.data.albums=[{id:'album',title:'Wedding',milestoneId:selected.id}];},
   ui:{sync:()=>{}},applyShared:result=>{context.data.milestones=result.milestones;},requestDatabase:async()=>({milestones:[selected]}),
   milestonePhotoSession:0,processingMilestonePhotos:false,renderMilestonePeople:()=>{},renderMilestonePhotos:()=>{},setupMilestoneLocationFinder:()=>{},esc:s=>s});
 document.body.classList.add('is-editor');
 const familySource=readFileSync('js/family-groups.js','utf8');
 const loader=familySource.slice(familySource.indexOf('async function loadFamilyTimeline()'));
 vm.runInContext(loader+'\n'+populate+'\n'+functions,context);
 await context.editMilestone('saved-event');
 assert.deepEqual(loaded,['albums']);
 assert.equal(document.querySelector('#milestoneId').value,'saved-event');
 assert.equal(document.querySelector('#milestoneTitle').value,'The correct wedding');
 assert.equal(document.querySelector('#milestoneDate').value,'2010-12-04');
 assert.equal(document.querySelector('#milestoneAlbum').value,'album');
 assert(document.querySelector('#milestoneDialog').open,'Actual milestone editor opens for requested saved record');
 document.querySelector('#milestoneDialog').close();
 context.data.milestones=undefined;
 await context.editMilestone('saved-event');
 assert.equal(document.querySelector('#milestoneId').value,'saved-event','Missing milestone state recovers from core snapshot');
 document.querySelector('#milestoneDialog').close();
 modal.unmount();
 console.log('Passed: real milestone editor loads collections and opens the clicked milestone with its saved fields.');
}

{
 let landing=0;
 bindRuntime({openTreeLanding:()=>landing++,displayName:display,personMatchesQuery:matches});
 const header=mount(AppHeader);
 await header.find('#treeTab').trigger('click');
 assert.equal(landing,1,'Tree menu returns to Tree without resetting its state');
 header.unmount();
 console.log('Passed: Tree menu returns to the existing Tree view.');
}

{
 const {default:PhotoPeopleTags}=await import('../src/components/PhotoPeopleTags.vue');
 const saved=[];
 family.value={people,links:[],photoTags:{'lightbox.jpg':['melissa']}};
 ui.setEditing(true);
 bindRuntime({displayName:display,personMatchesQuery:matches,
   savePhotoPeople:async(photo,ids)=>{saved.push(ids);family.value={...family.value,photoTags:{[photo]:ids}};}});
 const tagger=mount(PhotoPeopleTags,{props:{photo:'lightbox.jpg'}});
 await tagger.find('input').setValue('chris');
 assert.equal(tagger.findAll('[role="option"]').length,1,'Lightbox name search finds matching untagged people');
 await tagger.find('[role="option"]').trigger('click');await flushPromises();
 assert.deepEqual(saved,[['melissa','chris']]);
 assert(tagger.find('.lightbox-person-tags').text().includes('Chris Manlapid'));
 tagger.unmount();
 console.log('Passed: lightbox tag search selects and saves a person alongside existing tags.');
}

{
 const {default:EventAges}=await import('../src/components/EventAges.vue');
 family.value={people:Array.from({length:4},(_,i)=>({id:'age'+i,name:'Person '+i,birthday:'2000-06-01'}))};
 const ages=mount(EventAges,{props:{event:{id:'wedding',type:'marriage',date:'2020-06-01',participants:['age0','age1','age2','age3']}}});
 assert(ages.text().includes('20 years old'));
 assert(!ages.text().includes('Person 3'));
 await ages.find('button').trigger('click');
 assert(ages.text().includes('Person 3'),'Additional participant ages are available on demand');
 ages.unmount();
 console.log('Passed: Timeline event ages show three participants with expansion for larger groups.');
}
