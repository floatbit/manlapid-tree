<script setup lang="js">
import { ref } from 'vue';
const dialog = ref(null);
</script>
<template>
  <dialog id="relationships" ref="dialog" aria-labelledby="relationshipTitle">
    <button
      type="button"
      class="relationship-dialog-close"
      aria-label="Close relationship finder"
      title="Close"
      @click="dialog.close()"
    >
      ×
    </button>
    <section class="finder-page">
      <form id="relationshipForm">
        <p class="eyebrow">FOLLOW THE FAMILY CONNECTION</p>
        <h1 id="relationshipTitle">How Are They Related?</h1>
        <p>Choose two people to find their relationship and connecting path.</p>
        <label>First person<select id="relationshipFrom" required></select></label
        ><label>Second person<select id="relationshipTo" required></select></label>
        <div class="form-actions">
          <button type="submit" class="primary">Relationship</button>
        </div>
        <div id="relationshipResult" aria-live="polite"></div>
      </form>
    </section>
  </dialog>
</template>
