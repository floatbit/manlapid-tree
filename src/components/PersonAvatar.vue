<script setup lang="js">
import { computed } from 'vue';
import { useRuntime } from '../ui/runtime.js';
defineProps({ person: {type:Object,required:true} });
const api=computed(useRuntime);
</script>
<template>
  <img
    v-if="person.photo"
    loading="lazy"
    class="avatar"
    :src="person.photo"
    :alt="api.displayName(person)"
  /><span v-else class="avatar">{{ api.initials(person) }}</span>
</template>
