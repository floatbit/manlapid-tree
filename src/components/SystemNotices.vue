<script setup lang="js">
import ToastNotice from './ToastNotice.vue';
</script>
<template>
  <div id="databaseNotice" role="alert" hidden>
    <span id="databaseMessage"></span><button id="databaseRetry">Reload / retry</button>
  </div>
  <section id="setupNotice" hidden>
    <h2>Your Shared Family Database Is Ready.</h2>
    <p>
      Import your previous family data, add your first person, or start with the seven-person
      example family.
    </p>
    <button id="setupImport">Import family backup</button>
    <button id="useExample">Use example family</button>
    <p class="hint">
      If your saved people are at the old address,
      <a href="http://127.0.0.1:8000/export.html" target="_blank" rel="noopener"
        >download that browser’s backup</a
      >, then import it here.
    </p>
  </section>
  <input id="familyBackup" type="file" accept="application/json,.json" hidden />
  <ToastNotice />
</template>
