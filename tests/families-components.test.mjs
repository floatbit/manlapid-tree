import assert from 'node:assert/strict';
import { nextTick } from 'vue';
import { mount, flushPromises } from './mount-component.mjs';
import FamiliesPage from '../src/pages/FamiliesPage.vue';
import AppHeader from '../src/components/AppHeader.vue';
import { ui, family, activePage, bindRuntime } from '../src/ui/runtime.js';
globalThis.location = window.location;
globalThis.history = window.history;
const people = [
  { id: 'p', name: 'Parent One', photo: '' },
  { id: 'c', name: 'Child One', photo: '' },
  { id: 'g', name: 'Grandchild', photo: '' },
];
let saved, savedAlbum;
const calls = [];
bindRuntime({
  displayName: (p) => p.name,
  initials: (p) =>
    p.name
      .split(' ')
      .map((n) => n[0])
      .join(''),
  personMatchesQuery: (p, q) => p.name.toLowerCase().includes(q.toLowerCase()),
  familyDateLabel: (v) => v,
  notify: (m) => calls.push(m),
  loadFamilyAlbums: async () => {},
  resizePhoto: async file => 'data:image/jpeg;base64,' + file.name,
  saveFamilyGroup: async (group, album) => {
    savedAlbum=album;
    saved = group;
    ui.sync({ ...family.value, familyGroups: [group] });
  },
  openSavedFamilyTree: (group) => calls.push(group.id),
});
ui.sync({
  people,
  links: [
    { a: 'c', b: 'p', type: 'parent' },
    { a: 'g', b: 'c', type: 'parent' },
  ],
  familyGroups: [],
});
ui.setEditing(true);
activePage.value = 'families';
const header = mount(AppHeader);
assert.deepEqual(
  header
    .findAll('nav button')
    .slice(0, 4)
    .map((b) => b.text()),
  ['Tree', 'Families', 'People', 'Timeline'],
);
header.unmount();
const page = mount(FamiliesPage, { attachTo: document.body });
await page.find('.families-intro > button').trigger('click');
await nextTick();
await page.find('#familyGroupDialog input[maxlength="200"]').setValue('Example Family');
await page.find('#familyParentsSearch').setValue('Parent');
await page.find('#familyParentsMatches button').trigger('click');
assert(page.find('.family-member-tags').text().includes('Parent One'));
assert(page.findAll('.family-member-tags')[1].text().includes('Child One'));
assert(
  !page.findAll('.family-member-tags')[1].text().includes('Grandchild'),
  'Only direct children are suggested',
);
await page.find('#familyGroupDialog form').trigger('submit');
await flushPromises();
await nextTick();
assert.equal(saved.name, 'Example Family');
assert.deepEqual(saved.parents, ['p']);
assert.deepEqual(saved.children, ['c']);
assert.equal(page.findAll('.family-member').length, 2);
assert.equal(page.findAll('.family-generation').length, 2);
await page.find('.family-member').trigger('click');
assert(page.find('.family-person-sidebar').text().includes('Parent One'));
assert(window.location.hash.includes('group='));
await page.find('[data-below=grandchildren]').trigger('click');
await flushPromises();
await nextTick();
assert.equal(saved.viewOptions.below, 'grandchildren');
assert.equal(page.findAll('.family-generation').length, 3);
assert(page.findAll('.family-generation')[2].text().includes('Grandchild'));
await page.find('[data-below=children]').trigger('click');
await flushPromises();
await nextTick();
assert.equal(page.findAll('.family-generation').length, 2);
assert.equal(
  page.element.querySelector('[data-below=none]'),
  null,
);

history.replaceState(null, '', '#page=tree');
activePage.value = 'tree';
await nextTick();
history.replaceState(null, '', '#page=families');
ui.setEditing(true);
activePage.value = 'families';
await nextTick();
assert.equal(
  page.find('.family-detail-heading h2').text(),
  'Example Family',
  'Menu return keeps selected family',
);
assert(
  page.find('.family-person-sidebar').text().includes('Parent One'),
  'Selected member stays visible',
);
page.unmount();
const reloaded = mount(FamiliesPage, { attachTo: document.body });
await nextTick();
assert.equal(reloaded.find('.family-detail-heading h2').text(), 'Example Family');
assert.equal(reloaded.find('[data-below=children]').attributes('aria-pressed'), 'true');
await reloaded.findAll('button').find(b => b.text()==='Edit Family').trigger('click');
await flushPromises();
const fields=[...reloaded.element.querySelectorAll('#familyGroupDialog fieldset')];
const photoSection=reloaded.find('.family-edit-photos').element;
assert(fields[1].compareDocumentPosition(photoSection) & Node.DOCUMENT_POSITION_FOLLOWING,'Photos follow Children');
const fileInput=reloaded.find('input[type=file]').element;
Object.defineProperty(fileInput,'files',{configurable:true,value:[new File(['image'],'one.jpg',{type:'image/jpeg'}),new File(['image'],'two.jpg',{type:'image/jpeg'})]});
fileInput.dispatchEvent(new Event('change',{bubbles:true}));
await flushPromises();await nextTick();
assert.equal(reloaded.findAll('.family-edit-photo').length,2);
await reloaded.findAll('.family-edit-photo')[1].findAll('button').find(b => b.text()==='Set as Cover').trigger('click');
await reloaded.find('#familyGroupDialog form').trigger('submit');await flushPromises();
assert.equal(savedAlbum.photos[0],'data:image/jpeg;base64,two.jpg');
assert.equal(saved.albumId,savedAlbum.id);
assert.equal(savedAlbum.title,'Example Family');
reloaded.unmount();
ui.setEditing(false);
const visitor = mount(FamiliesPage,{attachTo:document.body});await nextTick();
assert(!visitor.findAll('button').some(b=>/create|edit family|delete group|manage photos|review family/i.test(b.text())), 'Family editing controls are absent for visitors');
assert(!visitor.find('#familyGroupDialog').element.open);
visitor.unmount();ui.setEditing(true);
console.log(
  'Passed: Family menu order, create form, direct-child suggestions, save, two generations, person sidebar and URL restoration.',
);
