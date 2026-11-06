<script setup lang="js">
import { computed } from 'vue';
import { family, milestoneParticipants, ui, useRuntime } from '../ui/runtime.js';
import PersonAutocomplete from './PersonAutocomplete.vue';
const api=computed(useRuntime);
const selected=computed(()=>milestoneParticipants.value.map((id)=>family.value.people.find((p)=>p.id===id)).filter(Boolean));
function choose(p) {ui.changeMilestonePeople([...new Set([...milestoneParticipants.value,p.id])]);}
function remove(id) {ui.changeMilestonePeople(milestoneParticipants.value.filter((item)=>item!==id));document.querySelector('#milestonePersonSearch').focus();}
</script>
<template>
  <div id="milestonePeople">
    <div id="milestonePersonTags">
      <button
        v-for="p in selected"
        :key="p.id"
        type="button"
        class="person-tag"
        :aria-label="'Remove ' + api.firstLastName(p)"
        @click="remove(p.id)"
      >
        {{ api.firstLastName(p) }} <span aria-hidden="true">×</span>
      </button>
    </div>
    <PersonAutocomplete
      v-if="api"
      class="inline-person-picker"
      input-id="milestonePersonSearch"
      list-id="milestonePersonMatches"
      label="Search people involved"
      placeholder="Type a name to add people…"
      :options="() => family.people.filter((p) => !milestoneParticipants.includes(p.id))"
      :matches="api.personMatchesQuery"
      :display="api.firstLastName"
      :validate-selection="false"
      clear-on-select
      @select="choose"
    />
  </div>
</template>
