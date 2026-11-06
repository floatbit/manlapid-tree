<script setup lang="js">
import { computed, nextTick, ref } from 'vue';
const props = defineProps({
  options: { type: Function, required: true },
  label: { type: String, default: 'Find a person' },
  inputId: { type: String, required: true },
  listId: { type: String, required: true },
  initialQuery: { type: String, default: '' },
  required: Boolean,
  disabled: Boolean,
  clearOnSelect: Boolean,
  inputClass: String,
  listClass: String,
  keepResults: Boolean,
  showClear: Boolean,
  validateSelection: { type: Boolean, default: true },
  placeholder: { type: String, default: 'Search for a person…' },
  matches: { type: Function, required: true },
  display: { type: Function, required: true },
});
const emit = defineEmits(['select', 'query']);
const query = ref(props.initialQuery), open = ref(props.keepResults && !!props.initialQuery.trim()), active = ref(-1), input = ref(null), list = ref(null);
const optionsVersion=ref(0);
const results = computed(() => { optionsVersion.value; return query.value.trim() ? props.options().filter((p) => props.matches(p,query.value)).sort((a,b) => a.name.localeCompare(b.name)) : []; });
function close() { open.value=false;active.value=-1; }
function search() { optionsVersion.value++; active.value=-1;open.value=!!query.value.trim();emit('query',query.value); }
function changed() {
  if(props.validateSelection) input.value.setCustomValidity(query.value.trim() ? 'Select a person from the matches.' : '');
  search();
}
function choose(p) {
  if(!p) return;
  input.value.setCustomValidity('');
  if(!props.keepResults) { query.value=props.display(p);close(); }
  emit('select',p);
  if(props.clearOnSelect){query.value='';close();}
  optionsVersion.value++;
  input.value.focus();
}
function clear() { query.value='';input.value.setCustomValidity('');search();input.value.focus(); }
async function keydown(event) {
  if(event.isComposing) return;
  if(event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault(); open.value=!!query.value.trim();
    if(!results.value.length) return;
    active.value=active.value<0 ? (event.key === 'ArrowDown' ? 0 : results.value.length-1) : (active.value+(event.key === 'ArrowDown' ? 1 : -1)+results.value.length)%results.value.length;
    await nextTick();list.value?.children[active.value]?.scrollIntoView?.({block:'nearest'});
  } else if(event.key === 'Enter' && open.value) { event.preventDefault();choose(results.value[Math.max(0,active.value)]); }
  else if(event.key === 'Escape' && open.value) {event.preventDefault();event.stopPropagation();close();}
  else if(event.key === 'Tab') close();
}
defineExpose({input,close});
</script>
<template>
  <div
    class="person-autocomplete"
    @focusout="
      (event) => {
        if (!keepResults && !event.currentTarget.contains(event.relatedTarget)) close();
      }
    "
  >
    <div :class="showClear ? 'directory-search-field' : undefined">
      <input
        :id="inputId"
        ref="input"
        :class="inputClass"
        v-model="query"
        type="search"
        :required="required"
        :disabled="disabled"
        :aria-label="label"
        :placeholder="placeholder"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open"
        :aria-controls="listId"
        :aria-activedescendant="active >= 0 ? listId + 'Option' + active : undefined"
        @input="changed"
        @focus="
          () => {
            if (keepResults || !query) search();
          }
        "
        @keydown="keydown"
      />
      <button
        v-if="showClear"
        id="clearDirectorySearch"
        type="button"
        aria-label="Clear people search"
        :hidden="!query"
        @click="clear"
      >
        ×
      </button>
    </div>
    <div :id="listId" ref="list" :class="listClass" role="listbox" :hidden="!open">
      <button
        v-for="(p, i) in results"
        :id="listId + 'Option' + i"
        :key="p.id"
        type="button"
        role="option"
        :aria-selected="active === i"
        :class="{ 'search-active': active === i }"
        @mousedown.prevent
        @click="choose(p)"
      >
        {{ display(p) }}
      </button>
      <p v-if="!results.length">No matching people.</p>
    </div>
  </div>
</template>
