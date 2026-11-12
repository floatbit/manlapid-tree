<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
let observer;
const editingIds = new Set(['peopleTab','newPerson','addFirst','addBirthdays','addMilestone','newAlbum','newRecipe','editSelected','mapPersonEdit','delete','setupImport','useExample','openBulkLocation','openBulkBirthplace','openSiblingGroup','openChildrenGroup','exportFamily','importFamily','request']);
function updateControls() {
  for (const button of document.querySelectorAll('button')) {
    if (editingIds.has(button.id) || /^(?:edit\b|delete\b|create\b|add\b|update people\b|review family\b|attach album\b|change album\b|[＋+]\s*(?:add|create)\b)/i.test(button.textContent.trim()) || button.matches('[data-add-family], [data-node-add], .lightbox-delete')) button.dataset.editorOnly = '';
  }
  for (const dialog of document.querySelectorAll('dialog')) {
    if (dialog.querySelector('.dialog-close-x, #lightboxClose, .relationship-dialog-close, [aria-label="Close menu"], [aria-label="Close Select Me"]')) continue;
    const close = document.createElement('button');
    close.type = 'button';close.className = 'dialog-close-x';close.textContent = '×';close.setAttribute('aria-label','Close dialog');
    close.onclick = () => {
      if(dialog.querySelector('form[inert]'))return;
      const cancel = new Event('cancel',{cancelable:true});
      if(dialog.dispatchEvent(cancel))dialog.close();
    };
    dialog.prepend(close);
  }
}
onMounted(() => {updateControls();observer = new MutationObserver(updateControls);observer.observe(document.querySelector('#app') || document.body,{childList:true,subtree:true,characterData:true});});
onBeforeUnmount(()=>observer?.disconnect());
</script>
<template></template>
