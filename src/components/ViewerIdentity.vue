<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { PhUserCircleDashed, PhUserCircleCheck, PhX } from '@phosphor-icons/vue';
import { family, viewerId, setViewer, ready, canEdit, useRuntime } from '../ui/runtime.js';
import PersonAutocomplete from './PersonAutocomplete.vue';
const picker = ref(null), dialog = ref(null), introduction = ref(false);
const viewer = computed(() => family.value.people.find(p => p.id === viewerId.value));
const api = computed(useRuntime);
const viewerLabel = computed(() => viewer.value ? 'Viewing as: ' + (api.value?.displayName(viewer.value) || viewer.value.name) : 'Select Me');
const PROMPT_KEY = 'kinfolk-viewer-prompted';
function alreadyPrompted() { try { return window.sessionStorage.getItem(PROMPT_KEY) === '1'; } catch { return false; } }
async function open(isIntroduction = false) {
  introduction.value = isIntroduction;
  await nextTick();
  if (!dialog.value?.isConnected) return;
  if (isIntroduction) { try { window.sessionStorage.setItem(PROMPT_KEY, '1'); } catch {} }
  dialog.value.showModal(); await nextTick();
  dialog.value.querySelector('input')?.focus();
}
defineExpose({ open });
function choose(person) { setViewer(person.id); dialog.value.close(); }
function clear() { setViewer(''); }
let offered = false;
watch([ready, canEdit], ([loaded, editing]) => {
  const afterLogin = editing && new URLSearchParams(window.location.search).get('select-me') === '1';
  if (!loaded || offered) return;
  offered = true;
  if (afterLogin) {
    const url = new URL(window.location.href); url.searchParams.delete('select-me');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }
  if (!viewer.value && (afterLogin || !alreadyPrompted())) open(true);
}, { immediate: true, flush: 'post' });
</script>
<template>
  <div class="viewer-identity">
    <button type="button" class="viewer-identity-trigger" :disabled="!ready" :title="viewerLabel" :aria-label="viewerLabel" aria-haspopup="dialog" aria-controls="viewerIdentityDialog" @click="open()">
      <component :is="viewer ? PhUserCircleCheck : PhUserCircleDashed" :size="24" aria-hidden="true" />
    </button>
  </div>
  <Teleport to="body">
    <dialog ref="dialog" id="viewerIdentityDialog" aria-labelledby="viewerIdentityTitle" class="viewer-identity-dialog">
      <button class="viewer-dialog-close" type="button" aria-label="Close Select Me" @click="dialog.close()"><PhX :size="20" /></button>
      <h2 id="viewerIdentityTitle">{{ introduction ? 'Make This Your Family View' : 'Select Me' }}</h2>
      <p>Choose yourself to see how everyone is related to you across the tree, family cards, and people searches. Your choice stays in this browser and can be changed or cleared anytime.</p>
      <p class="hint">Optional. Only your view changes.</p>
      <div v-if="viewer" class="viewer-selected-person">
        <span>{{ api?.displayName(viewer) || viewer.name }}</span>
        <button type="button" :aria-label="'Remove ' + (api?.displayName(viewer) || viewer.name) + ' as Me'" title="Remove Me" @click="clear"><PhX :size="16" aria-hidden="true" /></button>
      </div>
      <PersonAutocomplete v-if="api" :key="viewerId" ref="picker" input-id="viewerIdentitySearch" list-id="viewerIdentityMatches" label="Find yourself" placeholder="Search for your name…" :options="()=>family.people" :matches="api.personMatchesQuery" :display="api.displayName" :validate-selection="false" @select="choose" />
      <div class="viewer-dialog-actions">
        <button v-if="viewer" type="button" @click="clear">Clear Me</button>
        <button type="button" @click="dialog.close()">{{ introduction ? 'Skip for Now' : 'Done' }}</button>
      </div>
    </dialog>
  </Teleport>
</template>
