<script setup lang="js">
import { ref, watch } from 'vue';
import { nicknameDraft, useRuntime } from '../ui/runtime.js';
const pending=ref(''), input=ref(null);
watch(nicknameDraft,()=>{pending.value='';});
function read() {
  return [...new Map([...nicknameDraft.value,...pending.value.split(',')].map((n)=>[n.trim().toLocaleLowerCase(),n.trim()]).filter(([k])=>k)).values()];
}
function commit() { nicknameDraft.value=read();pending.value='';document.querySelector('#nicknames').value=JSON.stringify(nicknameDraft.value);useRuntime()?.updatePersonUnsaved(); }
function remove(index) {nicknameDraft.value=nicknameDraft.value.filter((_,i)=>i!==index);document.querySelector('#nicknames').value=JSON.stringify(nicknameDraft.value);useRuntime()?.updatePersonUnsaved();input.value.focus();}
function keydown(event) {if(!event.isComposing && ['Enter',','].includes(event.key)) {event.preventDefault();commit();}}
</script>
<template>
  <label for="nicknameInput">Nicknames / Also Known As</label>
  <input id="nicknames" type="hidden" :value="JSON.stringify(nicknameDraft)" />
  <div class="nickname-editor">
    <span id="nicknameTags"
      ><button
        v-for="(name, i) in nicknameDraft"
        :key="name.toLocaleLowerCase()"
        type="button"
        :aria-label="'Remove nickname ' + name"
        @click="remove(i)"
      >
        {{ name }} ×
      </button></span
    ><input
      id="nicknameInput"
      ref="input"
      v-model="pending"
      placeholder="Type a nickname and press Enter"
      maxlength="120"
      autocomplete="off"
      @keydown="keydown"
      @blur="commit"
    />
  </div>
  <p class="hint">
    Press Enter or comma to add a nickname. Nicknames are included in person searches.
  </p>
</template>
