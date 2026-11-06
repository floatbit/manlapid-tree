<script setup lang="js">
import { toast } from '../ui/runtime.js';
</script>
<template>
  <div id="toast" role="status" :style="{ display: toast ? 'block' : 'none' }">{{ toast }}</div>
</template>
