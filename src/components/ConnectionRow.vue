<script setup lang="js">
import { computed, nextTick, ref } from 'vue';
import { family, useRuntime } from '../ui/runtime.js';
import PersonAutocomplete from './PersonAutocomplete.vue';
const props=defineProps({id:String,type:{type:String,default:'parent'},pickerId:String,owner:Function});
const emit=defineEmits(['changed','remove']);
const api=computed(useRuntime), selected=ref(props.id || ''), relationship=ref(props.type), hidden=ref(null);
const initial=family.value.people.find((p)=>p.id === selected.value);
async function changed(id) {selected.value=id;hidden.value.value=id;await nextTick();emit('changed');}
</script>
<template>
  <div class="relation-person-picker">
    <input ref="hidden" type="hidden" class="relation-person-id" :value="selected" />
    <PersonAutocomplete
      :input-id="pickerId + 'Search'"
      :list-id="pickerId"
      label="Family member"
      input-class="relation-person-search"
      list-class="relation-person-matches"
      :initial-query="initial ? api.displayName(initial) : ''"
      :options="() => family.people.filter((p) => p.id !== owner())"
      :matches="api.personMatchesQuery"
      :display="api.displayName"
      @query="changed('')"
      @select="(p) => changed(p.id)"
    />
  </div>
  <span class="relation-phrase">is their</span
  ><select v-model="relationship" aria-label="Relationship">
    <option v-for="kind in ['parent', 'child', 'sibling', 'spouse']" :key="kind">
      {{ kind }}
    </option></select
  ><button
    type="button"
    class="remove-relation"
    aria-label="Remove connection"
    @click="emit('remove')"
  >
    ×
  </button>
</template>
