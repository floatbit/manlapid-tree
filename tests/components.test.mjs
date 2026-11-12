import assert from 'node:assert/strict';
import { mount, flushPromises } from './mount-component.mjs';
import { nextTick } from 'vue';
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
import { bindRuntime, ui, family, activePage, nicknameDraft, lightbox } from '../src/ui/runtime.js';
const people = [
  { id: 'melissa', name: 'Melissa Manlapig', nicknames: ['Mimi'], photo: '' },
  { id: 'chris', name: 'Chris Manlapid', photo: 'portrait.jpg', birthday: '1980-12-25' },
];
const display = (p) => p.name;
const matches = (p, q) =>
  [p.name, ...(p.nicknames || [])].some((n) => n.toLowerCase().includes(q.trim().toLowerCase()));
const calls = [];
bindRuntime({
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
  assert.equal(wrapper.findAll('.directory-missing').length, 5);
  assert(
    wrapper
      .findAll('.directory-missing')
      .find((s) => s.text().includes('Missing Headshots'))
      .text()
      .includes('Melissa'),
  );
  await wrapper.find('.overview-album').trigger('click');
  assert(Array.isArray(calls.at(-1)) && calls.at(-1)[2] === 'Christmas');
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
  assert.equal(document.querySelectorAll('#mobileMainMenu nav button').length,9);
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
  activePage.value='tree';
  ui.sync({people,links:[],milestones:[],recipes:[],albums:[{id:'random',title:'Random Album',photos:['tagged.jpg','video.mp4','untagged1.jpg','untagged2.jpg']}],photoTags:{'tagged.jpg':['melissa']}});
  const wrapper=mount(ReportsPage);
  activePage.value='overview';await flushPromises();await nextTick();
  let first=wrapper.find('.report-random-image img').attributes('src');
  assert(['untagged1.jpg','untagged2.jpg'].includes(first),'Reports chooses only untagged photos');
  const tagInput=wrapper.find('#reportPhotoPeopleSearch');tagInput.element.focus();
  await tagInput.trigger('keydown',{key:'Escape'});
  assert.equal(document.activeElement,wrapper.find('#reportRandomPhoto').element,'Escape moves focus out of the tag input');
  await wrapper.find('#reportRandomPhoto').trigger('keydown',{key:'ArrowRight'});await flushPromises();await nextTick();
  assert.notEqual(wrapper.find('.report-random-image img').attributes('src'),first,'Right arrow loads another photo');
  assert.equal(document.activeElement,wrapper.find('#reportPhotoPeopleSearch').element,'Next photo focuses tag search');
  first=wrapper.find('.report-random-image img').attributes('src');
  ui.sync({...family.value,photoTags:{...family.value.photoTags,[first]:['melissa']}});await nextTick();
  assert.equal(wrapper.find('.report-random-image img').attributes('src'),first,'Tagging keeps the current photo in place');
  activePage.value='tree';await nextTick();activePage.value='overview';await flushPromises();await nextTick();
  assert.notEqual(wrapper.find('.report-random-image img').attributes('src'),first,'Next visit selects another untagged photo');
  wrapper.unmount();activePage.value='tree';
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
  bindRuntime({ upcomingAnniversaries: () => [{ kind: 'Remembrance', personId: 'chris', title: 'Chris', next: new Date(), days: 0, years: 1 }] });
  const wrapper = mount(UpcomingAnniversaries);
  await wrapper.find('.anniversary-card').trigger('click'); await flushPromises();
  assert(target.classList.contains('anniversary-highlight'), 'Remembrance highlights the death entry');
  assert(!birth.classList.contains('anniversary-highlight'));
  assert.equal(document.activeElement, target, 'Timeline entry receives keyboard focus');
  assert(scrolls.length > 0, 'Remembrance scrolls to its timeline entry');
  wrapper.unmount(); target.remove(); birth.remove();
  window.scrollTo = originalScroll; window.matchMedia = originalMedia;
  console.log('Passed: remembrance focuses, scrolls to, and highlights the death entry.');
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
