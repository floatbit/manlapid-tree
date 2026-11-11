<script setup lang="js">
import MediaPreview from '../components/MediaPreview.vue';
import SearchField from '../components/SearchField.vue';
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { family, activePage, useRuntime, canEdit } from '../ui/runtime.js';
import { defaultFamilyView, familyGenerationBands, familyGenerationTitle } from '../domain/family-view.js';
import PersonPhotos from '../components/PersonPhotos.vue';
import PersonAvatar from '../components/PersonAvatar.vue';
import PersonAutocomplete from '../components/PersonAutocomplete.vue';
const FAMILY_LAST_VIEW_KEY = 'kinfolk-family-last-view-v1';
function rememberedFamily() { try { return localStorage.getItem(FAMILY_LAST_VIEW_KEY); } catch { return null; } }
const api = computed(useRuntime), query = ref(''), selectedId = ref(rememberedFamily()), personId = ref(null);
watch(selectedId, (id) => {try {if(id) localStorage.setItem(FAMILY_LAST_VIEW_KEY,id);else localStorage.removeItem(FAMILY_LAST_VIEW_KEY);}catch {}});
const editSession = ref(0);
const dialog = ref(null), draftId = ref(''), name = ref(''), parents = ref([]), children = ref([]), error = ref(''), saving = ref(false);
const people = computed(() => family.value.people || []);
const groups = computed(() => family.value.familyGroups || []);
const selected = computed(() => groups.value.find((g) => g.id === selectedId.value));
const savingView = ref(false), albumId = ref(''), draftPhotos = ref([]), photosDirty = ref(false), processingPhotos = ref(false), loadingPhotos = ref(false), photosLoaded = ref(false), photoInput = ref(null);
function chooseAlbum() {draftPhotos.value=[...((family.value.albums || []).find(a => a.id===albumId.value)?.photos || [])];photosDirty.value=false;}
async function addPhotos(files) {
  if(processingPhotos.value || loadingPhotos.value || !photosLoaded.value || saving.value) return;
  const session=editSession.value; processingPhotos.value=true; error.value='';
  try {for(const file of files) {
    if(!file.type.startsWith('image/') || file.size>20000000) throw new Error('Choose images under 20 MB each.');
    const photo=await api.value.resizePhoto(file,1600);
    if(session!==editSession.value) return;
    draftPhotos.value.push(photo);photosDirty.value=true;
  }} catch(e){if(session===editSession.value)error.value=e.message;}finally{if(session===editSession.value)processingPhotos.value=false;if(photoInput.value)photoInput.value.value='';}
}
function removePhoto(index) {draftPhotos.value.splice(index,1);photosDirty.value=true;}
function setCover(index) {const [photo]=draftPhotos.value.splice(index,1);draftPhotos.value.unshift(photo);photosDirty.value=true;}
const album = computed(() => (family.value.albums || []).find(a => a.id === selected.value?.albumId));
watch(selectedId, () => { if (selectedId.value) api.value?.loadFamilyAlbums?.().catch(e => api.value.notify(e.message)); });
watch(activePage, page => { if (page === 'families') api.value?.loadFamilyAlbums?.().catch(e => api.value.notify(e.message)); });

const view = computed(() => {const options={...defaultFamilyView(),...selected.value?.viewOptions};if(options.below==='none')options.below='children';if(options.below==='children')options.expandedChildren=[];return options;});
const bands = computed(() => familyGenerationBands(selected.value, people.value, family.value.links || [], view.value));
const visibleIds = computed(() => [...new Set([...bands.value.flatMap((band) => band.ids), ...(view.value.below === 'none' ? [] : view.value.expandedChildren.flatMap((id) => spouses(id).map((p) => p.id)))])]);
function spouses(id) { return (family.value.links || []).filter((link) => link.type === 'spouse' && (link.a === id || link.b === id)).map((link) => person(link.a === id ? link.b : link.a)).filter(Boolean); }
function canExpand(id) {return recordedChildren([id]).length || spouses(id).length;}
async function changeView(key, value) {
  if (!selected.value || savingView.value) return;
  savingView.value=true;
  try {await api.value.saveFamilyGroup({...selected.value,viewOptions:{...view.value,[key]:value,...(key==='below' && value==='children' ? {expandedChildren:[]} : {}),...(key==='expandedChildren' && value.length && view.value.below==='children' ? {below:'grandchildren'} : {})}});}
  catch(e){api.value.notify(e.message);} finally {savingView.value=false;}
}
function toggleChild(id) {changeView('expandedChildren',view.value.expandedChildren.includes(id) ? view.value.expandedChildren.filter((child) => child!==id) : [...view.value.expandedChildren,id]);}
const selectedPerson = computed(() => people.value.find((p) => p.id === personId.value));
const person = (id) => people.value.find((p) => p.id === id);
const members = (ids) => ids.map(person).filter(Boolean);
const filtered = computed(() => groups.value.filter((g) => [g.name, ...members([...g.parents,...g.children]).map((p) => p.name)].join(' ').toLowerCase().includes(query.value.trim().toLowerCase())));
function recordedChildren(ids) {
  const found = new Set();
  for (const link of family.value.links || []) {
    if (link.type === 'parent' && ids.includes(link.b)) found.add(link.a);
    if (link.type === 'child' && ids.includes(link.a)) found.add(link.b);
  }
  return [...found].filter((id) => person(id) && !ids.includes(id));
}
const suggestions = computed(() => recordedChildren(parents.value).filter((id) => !children.value.includes(id)));
const newChildren = computed(() => selected.value ? recordedChildren(selected.value.parents).filter((id) => !selected.value.children.includes(id)) : []);
const locations = computed(() => selected.value ? [...new Set(members(visibleIds.value).map((p) => p.location).filter(Boolean))] : []);
const parentOptions = () => people.value.filter((p) => !parents.value.includes(p.id) && !children.value.includes(p.id));
const childOptions = () => people.value.filter((p) => !parents.value.includes(p.id) && !children.value.includes(p.id));
function addParent(p) {
  if (parents.value.length >= 2) return;
  parents.value = [...parents.value, p.id];
  children.value = [...new Set([...children.value, ...recordedChildren(parents.value)])];
}
function edit(group = null) {
  if (!canEdit.value) return;
  editSession.value++;
  draftId.value = group?.id || ''; name.value = group?.name || ''; albumId.value = group?.albumId || '';
  draftPhotos.value=[];photosDirty.value=false;processingPhotos.value=false;
  const session=editSession.value;
  loadingPhotos.value=true;photosLoaded.value=false;
  Promise.resolve(api.value?.loadFamilyAlbums?.()).then(() => {if(session===editSession.value) {photosLoaded.value=true;if(!photosDirty.value)chooseAlbum();}}).catch(e => {if(session===editSession.value)error.value=e.message;}).finally(() => {if(session===editSession.value)loadingPhotos.value=false;});
  parents.value = [...(group?.parents || [])]; children.value = [...(group?.children || [])];
  error.value = ''; dialog.value.showModal();
}
function select(group) {
  selectedId.value = group?.id || null; personId.value = null;
  const url = new URL(location.href);
  url.hash = new URLSearchParams(group ? {page:'families',group:group.id} : {page:'families'}).toString();
  if (url.href !== location.href) history.pushState(null, '', url);
}
function readRoute(event) {
  if (activePage.value !== 'families') return;
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.has('group')) selectedId.value = params.get('group');
  else if (event?.type === 'popstate' || event?.type === 'hashchange') selectedId.value = null;
}

watch(activePage, readRoute);
onMounted(() => {readRoute(); window.addEventListener('popstate',readRoute); window.addEventListener('hashchange',readRoute);});
onBeforeUnmount(() => {window.removeEventListener('popstate',readRoute); window.removeEventListener('hashchange',readRoute);});
async function save() {
  if (!canEdit.value) return;
  if (saving.value || processingPhotos.value || loadingPhotos.value) return;
  if (!parents.value.length) {error.value='Choose at least one parent.';return;}
  saving.value=true; error.value='';
  try {
    const group={id:draftId.value || crypto.randomUUID(),name:name.value.trim(),parents:[...parents.value],children:[...children.value],albumId:albumId.value || null,viewOptions: groups.value.find((g) => g.id === draftId.value)?.viewOptions || defaultFamilyView()};
    let albumUpdate=null;
    if(photosDirty.value) {
      const existing=(family.value.albums || []).find(a => a.id===albumId.value);
      group.albumId=albumId.value || crypto.randomUUID();
      albumUpdate={id:group.albumId,title:existing?.title || group.name,date:existing?.date || '',description:existing?.description || '',photos:[...draftPhotos.value]};
    }
    await api.value.saveFamilyGroup(group,albumUpdate); dialog.value.close(); select(group); api.value.notify('Family saved');
  } catch(e) {error.value=e.message;} finally {saving.value=false;}
}
async function remove() {
  if (!canEdit.value) return;
  if (!selected.value || !confirm('Delete this saved family group? People and relationships will remain.')) return;
  try {await api.value.deleteFamilyGroup(selected.value.id);select(null);api.value.notify('Family deleted');}catch(e){api.value.notify(e.message);}
}
function openLocation(place) {
  const member = members(visibleIds.value).find((p) => p.location === place);
  if (member) api.value.openFamilyMapLocation(member.id);
}
function editPerson() {api.value.showSection('people');api.value.edit(selectedPerson.value.id);}
</script>
<template>
  <main id="familiesPage" hidden>
    <div v-if="!selected" class="intro families-intro">
      <div>
        <p class="eyebrow">THE FAMILIES THAT CONNECT US</p>
        <h1>Our Families.</h1>
        <p>Parents, children, and the generations that connect them.</p>
      </div>
      <button v-if="canEdit" type="button" class="primary" @click="edit()" :disabled="!api">
        ＋ Create Family
      </button>
    </div>
    <template v-if="!selected">
      <label class="families-search"
        >Find a family<SearchField><input
          v-model="query"
          type="search"
          placeholder="Search by family or person’s name…"
      /></SearchField></label>
      <p class="hint">{{ groups.length }} {{ groups.length === 1 ? 'family' : 'families' }}</p>
      <div class="families-grid">
        <button
          v-for="group in filtered"
          :key="group.id"
          type="button"
          class="family-directory-card"
          @click="select(group)"
        >
          <MediaPreview v-if="group.cover" :src="group.cover" :alt="group.name" class-name="family-cover" />
          <span v-else class="family-card-portraits"
            ><PersonAvatar
              v-for="p in members([...group.parents, ...group.children]).slice(0, 4)"
              :key="p.id"
              :person="p"
          /></span>
          <strong>{{ group.name }} <span aria-hidden="true">→</span></strong>
          <span>{{
            members(group.parents)
              .map((p) => api.displayName(p))
              .join(' & ') || 'Parents not available'
          }}</span>
          <small
            >{{ group.parents.length }} {{ group.parents.length === 1 ? 'parent' : 'parents' }} ·
            {{ group.children.length }}
            {{ group.children.length === 1 ? 'child' : 'children' }}</small
          >
        </button>
      </div>
      <div v-if="!groups.length" class="families-empty">
        <span aria-hidden="true">⌂</span>
        <h2>Every Family Has a Story.</h2>
        <p>Create a family group by choosing its parents and children.</p>
        <button v-if="canEdit" type="button" @click="edit()">Create Your First Family →</button>
      </div>
      <p v-else-if="!filtered.length" class="hint">No families match that search.</p>
    </template>
    <template v-else>
      <MediaPreview v-if="selected.cover" :src="selected.cover" :alt="selected.name" class-name="family-detail-cover" />
      <button type="button" class="family-back" @click="select(null)">← All Families</button>
      <div class="family-detail-heading">
        <div>
          <p class="eyebrow">{{ bands.length }} GENERATIONS</p>
          <h2>{{ selected.name }}</h2>
        </div>
        <div class="family-detail-actions">
          <button type="button" @click="api.openSavedFamilyTree(selected, visibleIds)">
            Open in Tree →</button
          ><button v-if="canEdit" type="button" @click="edit(selected)">Edit Family</button
          ><button v-if="canEdit" type="button" @click="remove()">Delete Group</button>
        </div>
      </div>
      <p v-if="newChildren.length" class="family-new-children">
        {{ newChildren.length }} recorded
        {{ newChildren.length === 1 ? 'child is' : 'children are' }} available to include.
        <button v-if="canEdit" type="button" @click="edit(selected)">Review Family →</button>
      </p>
      <div class="family-detail-layout">
        <div class="family-generations">
          <div class="family-view-controls">
            <div class="family-generation-choice"><span>↑ Ancestors</span><div role="group" aria-label="Show ancestors">
              <button v-for="option in [{value:'none',label:'None'},{value:'parents',label:'Grandparents'},{value:'all',label:'All'}]" :key="option.value" type="button" :data-above="option.value" :aria-pressed="view.above===option.value" :disabled="savingView" @click="changeView('above',option.value)">{{ option.label }}</button>
            </div></div>
            <div class="family-generation-choice"><span>↓ Descendants</span><div role="group" aria-label="Show descendants">
              <button v-for="option in [{value:'children',label:'Children'},{value:'grandchildren',label:'+ Grandchildren'},{value:'all',label:'All'}]" :key="option.value" type="button" :data-below="option.value" :aria-pressed="view.below===option.value" :disabled="savingView" @click="changeView('below',option.value)">{{ option.label }}</button>
            </div></div>
            <span v-if="savingView" role="status">Saving…</span>
          </div>
          <template v-for="(band, index) in bands" :key="band.level">
            <div v-if="index" class="family-generation-connector" aria-hidden="true"></div>
            <section class="family-generation" :class="{ 'family-parents': band.level === 0 }">
              <h3>
                {{ familyGenerationTitle(band.level) }} <span>{{ band.ids.length }}</span>
              </h3>
              <div class="family-member-grid">
                <div v-for="p in members(band.ids)" :key="p.id" class="family-member-unit">
                  <button
                    type="button"
                    class="family-member"
                    :class="{ active: personId === p.id }"
                    @click="personId = p.id"
                  >
                    <PersonAvatar :person="p" /><span class="family-member-info"><strong>{{ api.displayName(p) }}</strong><small v-if="p.dateDetails?.birth || p.birthday">Born {{ api.familyDateLabel(p.dateDetails?.birth || p.birthday) }}</small><small v-if="p.deceased">Deceased</small></span><span class="family-member-arrow" aria-hidden="true">→</span></button
                  ><button
                    v-if="band.level === 1 && canExpand(p.id)"
                    type="button"
                    class="family-expand-child"
                    :disabled="savingView"
                    :aria-expanded="view.expandedChildren.includes(p.id)"
                    @click="toggleChild(p.id)"
                  >
                    {{
                      view.expandedChildren.includes(p.id) ? '− Collapse Family' : '+ Expand Family'
                    }}
                  </button>
                  <div
                    v-if="
                      band.level === 1 &&
                      view.expandedChildren.includes(p.id) &&
                      spouses(p.id).length
                    "
                    class="family-child-spouses"
                  >
                    <small>Spouse</small
                    ><button
                      v-for="spouse in spouses(p.id)"
                      :key="spouse.id"
                      type="button"
                      @click="personId = spouse.id"
                    >
                      {{ api.displayName(spouse) }} →
                    </button>
                  </div>
                </div>
              </div>
              <p v-if="!band.ids.length" class="hint">
                No {{ familyGenerationTitle(band.level).toLowerCase() }} included yet.
              </p>
            </section>
          </template>
          <p v-if="view.above !== 'none' && !bands.some((band) => band.level < 0)" class="hint">
            No ancestors are recorded for these parents yet.
          </p>
          <p
            v-if="
              view.below !== 'none' &&
              view.below !== 'children' &&
              !bands.some((band) => band.level > 1)
            "
            class="hint"
          >
            No further descendants are recorded for these children yet.
          </p>
          <section class="family-photos">
            <div class="family-photos-heading"><h3>Family Photos <span v-if="selected.photoCount">({{ selected.photoCount }})</span></h3>
              <button v-if="canEdit" type="button" @click="edit(selected)">{{ selected.albumId ? 'Add / Manage Photos' : 'Create Family Album' }} →</button>
            </div>
            <p v-if="!selected.photoCount" class="hint">Keep family photos together in an album. Its cover also appears on this family.</p>
            <div v-if="album?.photos.length" class="family-photo-grid">
              <button v-for="(photo,index) in album.photos.slice(0,6)" :key="photo" type="button" @click="api.openPhotoLightbox(album.photos,index,album.title)"><MediaPreview :src="photo" :alt="album.title" /></button>
            </div>
            <button v-if="album?.photos.length" type="button" @click="api.openPhotoLightbox(album.photos,0,album.title)">View Album →</button>
          </section>
          <section class="family-member-photos"><h3>Photos by Family Member</h3>
            <div class="family-member-photo-grid"><PersonPhotos v-for="member in members([...selected.parents, ...selected.children])" :key="member.id" :person-id="member.id" show-empty /></div>
          </section>
          <section v-if="locations.length" class="family-locations">
            <h3>Family Locations</h3>
            <button
              v-for="place in locations"
              :key="place"
              type="button"
              @click="openLocation(place)"
            >
              ⌖ {{ place }} <span aria-hidden="true">→</span>
            </button>
          </section>
        </div>
        <aside class="family-person-sidebar" aria-label="Family member details">
          <template v-if="selectedPerson"
            ><div class="map-profile-header">
              <PersonAvatar :person="selectedPerson" />
              <div>
                <h2>{{ selectedPerson.name }}</h2>
                <span v-if="selectedPerson.deceased" class="deceased-badge">Deceased</span>
              </div>
            </div>
            <p v-if="selectedPerson.dateDetails?.birth || selectedPerson.birthday">
              Born ·
              {{
                api.familyDateLabel(selectedPerson.dateDetails?.birth || selectedPerson.birthday)
              }}
            </p>
            <section class="map-profile-locations tree-location-history">
              <h3>Locations</h3>
              <ol class="migration-stops"><li v-for="(stop,index) in api.migrationStopsForPerson?.(selectedPerson) || []" :key="stop.id || index"><button type="button" @click="api.openPersonPlaces(selectedPerson.id,index)"><strong>{{ api.locationStopLabel(stop) }}</strong><span>{{ stop.location }}</span></button></li></ol>
            </section>
            <p v-if="selectedPerson.bio">{{ selectedPerson.bio }}</p>
            <PersonPhotos :person-id="selectedPerson.id" />
            <div class="family-person-actions">
              <button type="button" @click="api.openSavedFamilyTree(selected, visibleIds)">
                Open Family Tree →</button
              ><button v-if="canEdit" type="button" @click="editPerson">Edit Person →</button>
            </div></template
          ><template v-else
            ><span class="family-sidebar-symbol" aria-hidden="true">♡</span>
            <h2>Meet the Family.</h2>
            <p>Select a parent or child to see their details.</p></template
          >
        </aside>
      </div>
    </template>
    <dialog
      ref="dialog"
      id="familyGroupDialog"
      aria-labelledby="familyGroupTitle"
      @cancel="(saving || processingPhotos) && $event.preventDefault()"
    >
      <form @submit.prevent="save" :inert="saving">
        <h2 id="familyGroupTitle">{{ draftId ? 'Edit Family' : 'Create Family' }}</h2>
        <p class="hint">
          Choose the parents and children at the heart of this family. It doesn’t change
          parent/child relationships in the tree.
        </p>
        <label
          >Family Name<input
            v-model="name"
            required
            maxlength="200"
            placeholder="e.g. Cordellier Family"
        /></label>
        <fieldset>
          <legend>Parents <span class="hint">Choose one or two</span></legend>
          <div class="family-member-tags">
            <button
              v-for="id in parents"
              :key="id"
              type="button"
              @click="parents = parents.filter((v) => v !== id)"
              :aria-label="'Remove parent ' + person(id)?.name"
            >
              {{ person(id) ? api.displayName(person(id)) : id }} ×
            </button>
          </div>
          <PersonAutocomplete
            v-if="api && parents.length < 2"
            :key="'parents-' + editSession"
            input-id="familyParentsSearch"
            list-id="familyParentsMatches"
            label="Find a parent"
            :options="parentOptions"
            :matches="api.personMatchesQuery"
            :display="api.displayName"
            clear-on-select
            @select="addParent"
          />
        </fieldset>
        <fieldset>
          <legend>Children</legend>
          <p class="hint">
            Recorded children are suggested when you choose a parent. Review the tags before saving.
          </p>
          <div class="family-member-tags">
            <button
              v-for="id in children"
              :key="id"
              type="button"
              @click="children = children.filter((v) => v !== id)"
              :aria-label="'Remove child ' + person(id)?.name"
            >
              {{ person(id) ? api.displayName(person(id)) : id }} ×
            </button>
          </div>
          <PersonAutocomplete
            v-if="api"
            :key="'children-' + editSession"
            input-id="familyChildrenSearch"
            list-id="familyChildrenMatches"
            label="Find a child"
            :options="childOptions"
            :matches="api.personMatchesQuery"
            :display="api.displayName"
            clear-on-select
            @select="(p) => (children = [...children, p.id])"
          /><button
            v-if="suggestions.length"
            type="button"
            class="family-include-children"
            @click="children = [...children, ...suggestions]"
          >
            Include Recorded Children ({{ suggestions.length }})
          </button>
        </fieldset>
        <label>Family Album<select v-model="albumId" :disabled="processingPhotos || loadingPhotos || !photosLoaded" @change="chooseAlbum"><option value="">No Album</option><option v-for="a in family.albums || []" :key="a.id" :value="a.id">{{ a.title }}</option></select></label>
        <p class="hint">Choose an existing album or add photos below to create one named after this family. The first photo is the family cover.</p>
        <section class="family-edit-photos" aria-label="Family photos">
          <h3>Family Photos</h3>
          <div class="photo-dropzone" @dragover.prevent @drop.prevent="addPhotos([...$event.dataTransfer.files])">
            <p>Drop family photos here</p>
            <label>or choose photos<input ref="photoInput" type="file" accept="image/*" multiple :disabled="processingPhotos || loadingPhotos || !photosLoaded" @change="addPhotos([...$event.target.files])" /></label>
          </div>
          <p v-if="loadingPhotos || processingPhotos" role="status">{{ loadingPhotos ? 'Loading photos…' : 'Preparing photos…' }}</p>
          <div class="family-edit-photo-grid">
            <div v-for="(photo,index) in draftPhotos" :key="index" class="family-edit-photo">
              <MediaPreview :src="photo" alt="Family album photo" />
              <span v-if="index===0" class="cover-badge">Cover</span>
              <div class="family-photo-actions"><button type="button" :disabled="processingPhotos || loadingPhotos || !photosLoaded" :aria-label="'Remove photo ' + (index+1)" @click="removePhoto(index)">×</button><button v-if="index" type="button" :disabled="processingPhotos || loadingPhotos || !photosLoaded" @click="setCover(index)">Set as Cover</button></div>
            </div>
          </div>
        </section>
        <p v-if="error" role="alert" class="sync-error">{{ error }}</p>
        <div class="form-actions">
          <button type="submit" class="primary" :disabled="saving || processingPhotos || loadingPhotos">
            {{ saving ? 'Saving…' : 'Save Family' }}</button
          ><button type="button" @click="dialog.close()" :disabled="saving || processingPhotos || loadingPhotos">Cancel</button>
        </div>
      </form>
    </dialog>
  </main>
</template>
