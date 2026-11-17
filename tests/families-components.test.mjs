import assert from 'node:assert/strict';
import { nextTick } from 'vue';
import { mount, flushPromises } from './mount-component.mjs';
import FamilyTimeline from '../src/components/FamilyTimeline.vue';
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
  start:id=>calls.push('tree-person:'+id),
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
  ['Tree', 'Timeline', 'Families', 'People'],
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
await page.find('.family-person-sidebar .map-profile-actions button').trigger('click');
assert.equal(calls.at(-1),'tree-person:p','Sidebar Tree link opens the selected person rather than choosing a family parent');
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

{
 const opened=[], selected=[];
 const relatives=Array.from({length:8},(_,i)=>({id:'r'+i,name:'Relative '+i,birthday:String(1950+i)}));
 family.value={people:relatives,links:[{type:'child',a:'r1',b:'r7'}],milestones:[{id:'w',title:'Family wedding',date:'1970-01-01',participants:['r0'],photos:['wedding.jpg']}],albums:[]};
 bindRuntime({displayName:p=>p.name,initials:p=>p.name[0],familyDateYear:d=>Number(String(d).slice(0,4)),familyDateLabel:d=>d,openPhotoLightbox:(...args)=>opened.push(args)});
 const timeline=mount(FamilyTimeline,{props:{group:{id:'f',parents:['r0'],children:relatives.slice(1,7).map(p=>p.id)},visibleIds:['r7'],onSelect:id=>selected.push(id)}});
 assert.equal(timeline.findAll('.family-mini-events li').length,6);
 await timeline.find('.family-mini-more').trigger('click');
 assert.equal(timeline.findAll('.family-mini-events li').length,9,'Visible grandchildren are included in the timeline');
 await timeline.findAll('.family-mini-event').at(-1).trigger('click');
 assert.deepEqual(opened[0],[['wedding.jpg'],0,'Family wedding']);
 await timeline.find('.family-mini-portraits button').trigger('click');
 assert.deepEqual(selected,['r0']);
 await timeline.findAll('.family-mini-scope button')[1].trigger('click');
 assert.equal(timeline.findAll('.family-mini-more').length,0,'All generations needs no expansion button');
 assert.equal(timeline.findAll('.family-mini-events li').length,9,'All generations includes recorded descendants');
 timeline.unmount();
 console.log('Passed: compact family timeline scope, expansion, portrait selection and album opening.');
}
