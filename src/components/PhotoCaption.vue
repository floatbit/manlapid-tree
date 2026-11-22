<script setup>
import {computed,ref,watch,nextTick} from 'vue';
import {PhPencilSimple} from '@phosphor-icons/vue';
import {family,canEdit,useRuntime} from '../ui/runtime.js';
const props=defineProps({photo:{type:String,required:true}});
const editing=ref(false),draft=ref(''),saving=ref(false),error=ref(''),input=ref(null);
const caption=computed(()=>family.value.photoCaptions?.[props.photo] || '');
const dirty=computed(()=>editing.value && draft.value.trim()!==caption.value);
watch(()=>props.photo,()=>{editing.value=false;draft.value='';error.value='';});
async function edit(){draft.value=caption.value;error.value='';editing.value=true;await nextTick();input.value?.focus();}
function cancel(){if(saving.value)return;editing.value=false;error.value='';}
async function save(){
 if(!canEdit.value || saving.value)return;
 saving.value=true;error.value='';
 try{await useRuntime().savePhotoCaption(props.photo,draft.value.trim());editing.value=false;}
 catch(e){error.value='Caption was not saved. '+e.message;}
 finally{saving.value=false;}
}
function canLeave(){if(saving.value)return false;if(dirty.value && !window.confirm('Discard your unsaved caption?'))return false;cancel();return true;}
defineExpose({saving,canLeave});
</script>
<template>
 <section v-if="caption || canEdit" class="photo-caption" aria-label="Photo caption">
  <div v-if="editing" class="photo-caption-editor">
   <label>Caption<textarea ref="input" v-model="draft" rows="3" maxlength="2000" :disabled="saving" placeholder="What’s the story behind this photo?" @keydown.escape.stop.prevent="cancel" @keydown.ctrl.enter.prevent="save" @keydown.meta.enter.prevent="save" /></label>
   <div class="photo-caption-actions"><button type="button" class="primary" :disabled="saving" @click="save">{{saving?'Saving…':'Save caption'}}</button><button type="button" :disabled="saving" @click="cancel">Cancel</button><small>{{draft.length}} / 2,000</small></div>
   <p v-if="error" role="alert">{{error}}</p>
  </div>
  <template v-else><p v-if="caption" class="photo-caption-text">{{caption}}</p><button v-if="canEdit" type="button" class="photo-caption-edit" :aria-label="caption?'Edit photo caption':'Add a photo caption'" @click="edit"><PhPencilSimple v-if="caption" :size="15" aria-hidden="true"/><span v-else>Add a caption…</span></button></template>
 </section>
</template>
