<script setup>
import { computed } from 'vue';
import { viewerLabels } from '../ui/runtime.js';
const props = defineProps({ personId: String });
const label = computed(() => viewerLabels.value.get(props.personId));
</script>
<template><span v-if="label" class="viewer-relationship">{{ label }}</span></template>
