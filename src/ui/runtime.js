import { shallowRef, createApp, nextTick } from 'vue';
import PersonAutocomplete from '../components/PersonAutocomplete.vue';
import PersonPhotos from '../components/PersonPhotos.vue';
import ConnectionRow from '../components/ConnectionRow.vue';
export const canEdit = shallowRef(false);
export const ready = shallowRef(false);
export const family = shallowRef({
  people: [],
  links: [],
  albums: [],
  recipes: [],
  milestones: [],
});
const runtime = shallowRef(null);
export function bindRuntime(value) {
  runtime.value = value;
}
export function useRuntime() {
  return runtime.value;
}
export const ui = {
  setEditing(allowed) {
    canEdit.value = !!allowed;
    document.body.classList.toggle('is-editor', !!allowed);
    if (!allowed) for (const dialog of document.querySelectorAll('#albumDialog[open], #milestoneDialog[open], #recipeDialog[open], #familyDialog[open], #bulkLocationDialog[open], #siblingGroupDialog[open], #childrenGroupDialog[open], #familyGroupDialog[open], .birth-album-dialog[open]')) dialog.close();
  },
  sync(data) {
    family.value = { ...data };
    ready.value = true;
  },
};

const pickers = new WeakMap();
ui.mountPersonPicker = (
  select,
  { required, label, people, display, matches, notifyOnQuery = true },
) => {
  const previous = pickers.get(select);
  if (previous) {
    previous.app.unmount();
    previous.wrapper.remove();
  }
  select.hidden = true;
  select.required = false;
  const wrapper = document.createElement('div');
  wrapper.className = 'relationship-person-picker';
  wrapper.id = select.id + 'Picker';
  select.after(wrapper);
  const app = createApp(PersonAutocomplete, {
    inputId: select.id + 'Search',
    listId: select.id + 'Matches',
    label,
    required,
    initialQuery: people().find((p) => p.id === select.value)
      ? display(people().find((p) => p.id === select.value))
      : '',
    options: () => people().filter((p) => [...select.options].some((o) => o.value === p.id)),
    display,
    matches,
    onQuery: () => {
      select.value = '';
      if (notifyOnQuery) select.dispatchEvent(new Event('change'));
    },
    onSelect: (p) => {
      select.value = p.id;
      select.dispatchEvent(new Event('change'));
    },
  });
  app.mount(wrapper);
  pickers.set(select, { app, wrapper });
};

export const nicknameDraft = shallowRef([]);
ui.setNicknames = (names) => {
  nicknameDraft.value = [...names];
};

export const lightbox = shallowRef({
  photos: [],
  index: 0,
  title: 'Family Pictures',
  returnFocus: null,
});
ui.openLightbox = async (photos, index, title, personId = null) => {
  if (!photos?.length) return;
  lightbox.value = { photos: [...photos], index, title, personId, returnFocus: document.activeElement };
  await nextTick();
  const dialog = document.querySelector('#photoLightbox');
  if (!dialog.open) dialog.showModal();
  document.querySelector('#lightboxClose').focus();
};

export const albumView = shallowRef([]),
  recipeView = shallowRef([]),
  recipeDetail = shallowRef(null);
ui.setAlbums = (albums) => {
  albumView.value = albums;
};
ui.setRecipes = (recipes) => {
  recipeView.value = recipes;
};
ui.setRecipeDetail = (recipe) => {
  recipeDetail.value = recipe;
};

export const timelineView = shallowRef([]);
export const timelineQuery = shallowRef('');
ui.setTimeline = (events, query = '') => {
  timelineQuery.value = query;
  timelineView.value = events;
};

const searches = new Map();
ui.mountSearch = (options) => {
  const { inputId, listId } = options;
  const input = document.getElementById(inputId),
    list = document.getElementById(listId);
  const prior = searches.get(inputId);
  let wrapper;
  if (prior && prior.wrapper.isConnected) {
    wrapper = prior.wrapper;
    prior.app.unmount();
  } else {
    wrapper = document.createElement('div');
    input.before(wrapper);
    input.remove();
    list.remove();
  }
  const app = createApp(PersonAutocomplete, {
    ...options,
    disabled: input.disabled,
    validateSelection: false,
  });
  app.mount(wrapper);
  searches.set(inputId, { app, wrapper });
};

export const activePage = shallowRef('tree');
ui.setSection = (section) => {
  activePage.value = section;
};

export const toast = shallowRef('');
let toastTimer;
ui.notify = (message) => {
  toast.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = '';
  }, 3000);
};

const connectionApps = new Map();
ui.clearRelations = () => {
  for (const [row, app] of connectionApps) {
    app.unmount();
    row.remove();
  }
  connectionApps.clear();
};
ui.addRelation = (props, onChanged) => {
  const row = document.createElement('div');
  row.className = 'relation-row';
  document.querySelector('#relations').append(row);
  const app = createApp(ConnectionRow, {
    ...props,
    onChanged,
    onRemove: () => {
      app.unmount();
      row.remove();
      connectionApps.delete(row);
      onChanged();
    },
  });
  app.mount(row);
  connectionApps.set(row, app);
};

export const milestoneParticipants = shallowRef([]);
let onMilestonePeopleChange = () => {};
ui.setMilestonePeople = (ids, onChange) => {
  milestoneParticipants.value = [...ids];
  onMilestonePeopleChange = onChange;
};
ui.changeMilestonePeople = (ids) => {
  milestoneParticipants.value = ids;
  onMilestonePeopleChange(ids);
};

const personPhotoApps=new Map();
ui.unmountPersonPhotos = key => {
  const app=personPhotoApps.get(key);
  if(app){app.unmount();personPhotoApps.delete(key);}
};
ui.mountPersonPhotos = (host,personId,key) => {
  ui.unmountPersonPhotos(key);
  if(!host)return;
  const app=createApp(PersonPhotos,{personId,inSidebar:true});app.mount(host);personPhotoApps.set(key,app);
};
