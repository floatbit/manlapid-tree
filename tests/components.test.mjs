import assert from 'node:assert/strict';
import { mount, flushPromises } from './mount-component.mjs';
import { nextTick } from 'vue';
import PersonAutocomplete from '../src/components/PersonAutocomplete.vue';
import NicknameTags from '../src/components/NicknameTags.vue';
import ReportsPage from '../src/pages/ReportsPage.vue';
import PhotoLightbox from '../src/dialogs/PhotoLightbox.vue';
import ConnectionRow from '../src/components/ConnectionRow.vue';
import MilestonePeople from '../src/components/MilestonePeople.vue';
import RecipeDetail from '../src/components/RecipeDetail.vue';
import { bindRuntime, ui, family, nicknameDraft, lightbox } from '../src/ui/runtime.js';
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
});
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
      .find((s) => s.text().includes('No Photo'))
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
console.log(
  'Passed: Vue keyboard autocomplete, repeated selection, nickname tags, reports, and lightbox navigation/share.',
);
