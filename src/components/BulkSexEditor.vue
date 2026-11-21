<script setup>
import {computed,ref} from 'vue';
import {family,canEdit,useRuntime} from '../ui/runtime.js';
import {sortPeople} from '../domain/people-order.js';
const selected=ref([]),query=ref(''),filter=ref('missing'),saving=ref(false),error=ref(''),message=ref('');
const display=p=>useRuntime()?.displayName(p) || p.name;
const rows=computed(()=>sortPeople(family.value.people.filter(p=>(filter.value==='all' || !p.sex) && display(p).toLowerCase().includes(query.value.trim().toLowerCase()))));
function selectVisible(){selected.value=[...new Set([...selected.value,...rows.value.map(p=>p.id)])];}
async function assign(value){
 if(!canEdit.value || saving.value || !selected.value.length)return;
 saving.value=true;error.value='';message.value='';
 const ids=[...selected.value];
 try{await useRuntime().saveContributionUpdates(ids.map(id=>({id,kind:'sex',value})));selected.value=[];message.value=`${ids.length} ${ids.length===1?'person':'people'} marked ${value==='male'?'Male':'Female'}.`;}
 catch(e){error.value=e.message;}finally{saving.value=false;}
}
</script>
<template>
<section class="bulk-sex-editor">
 <h3>Sex · Quick Update</h3><p>Select several people and mark them Male or Female. This makes relationship labels such as Aunt and Uncle more specific.</p>
 <label>Show<select v-model="filter" :disabled="saving"><option value="missing">Not recorded</option><option value="all">Everyone</option></select></label>
 <label>Search people<input v-model="query" type="search" placeholder="Search names…" :disabled="saving" /></label>
 <div v-if="canEdit" class="bulk-sex-actions"><button type="button" :disabled="saving || !rows.length" @click="selectVisible">Select shown</button><button type="button" :disabled="saving || !selected.length" @click="selected=[]">Clear selection</button></div>
 <div class="contribution-location-list"><label v-for="p in rows" :key="p.id"><input type="checkbox" v-model="selected" :value="p.id" :disabled="!canEdit || saving" /><span>{{display(p)}}<small>{{p.sex==='male'?'Male':p.sex==='female'?'Female':'Not recorded'}}</small></span></label></div>
 <p v-if="!rows.length">No people match this view.</p>
 <p role="status">{{selected.length}} selected<span v-if="message"> · {{message}}</span></p>
 <p v-if="error" role="alert">{{error}}</p>
 <div v-if="canEdit" class="bulk-sex-actions"><button type="button" :disabled="saving || !selected.length" @click="assign('male')">Mark Male</button><button type="button" :disabled="saving || !selected.length" @click="assign('female')">Mark Female</button></div>
</section>
</template>
