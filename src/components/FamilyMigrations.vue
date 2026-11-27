<script setup>
import {computed,ref,watch} from 'vue';
import {useRuntime} from '../ui/runtime.js';
import {familyMigrationLayout} from '../domain/family-migrations.js';
import PersonAvatar from './PersonAvatar.vue';
const props=defineProps({people:{type:Array,default:()=>[]}});
defineEmits(['select']);
const api=computed(useRuntime), mode=ref('person'), selected=ref(null), hovered=ref(null);
const layout=computed(()=>familyMigrationLayout(props.people));
const active=computed(()=>hovered.value || selected.value);
watch(()=>props.people.map(p=>p.id).join(','),()=>{selected.value=null;hovered.value=null;});
const colors=['#38634e','#ad775e','#819765','#7f8d9e','#ae9565','#6c8e8b'];
const color=id=>colors[Number(id.split('-')[1])%colors.length];
const year=stop=>stop.year ? (stop.approximate?'About ':'')+stop.year : 'Year unknown';
const description=stop=>`${stop.label} · ${stop.kind}${stop.current && stop.kind!=='Current home'?' · Current home':''} · ${year(stop)}`;
function toggle(id){selected.value=selected.value===id?null:id;}
</script>
<template>
  <section class="family-migrations">
    <div class="family-migrations-heading"><h3>Family Migrations</h3><div class="family-mini-scope" role="group" aria-label="Migration view"><button type="button" :aria-pressed="mode==='person'" @click="mode='person'">By Person</button><button type="button" :aria-pressed="mode==='place'" @click="mode='place'">By Place</button></div></div>
    <p class="hint">Explore the places that connect this family. Years mark recorded places; connecting lines show sequence, not confirmed years of residence or travel routes.</p>
    <p v-if="!layout.routes.length" class="hint">No migration paths recorded for these family members yet. Add birthplaces and places lived to build their stories.</p>
    <template v-else>
      <div class="family-migration-hubs" aria-label="Highlight a shared place">
        <button v-for="hub in layout.hubs" :key="hub.id" type="button" :aria-pressed="selected===hub.id" :style="{'--hub-color':color(hub.id)}" @click="toggle(hub.id)" @mouseenter="hovered=hub.id" @mouseleave="hovered=null" @focus="hovered=hub.id" @blur="hovered=null"><i aria-hidden="true"></i>{{hub.label}} <small>{{hub.people.length}} {{hub.people.length===1?'person':'people'}}</small></button>
      </div>
      <div v-if="mode==='person'" class="family-migration-swimlane-scroll">
        <div class="family-migration-swimlanes">
          <div class="family-migration-axis"><span>Family member</span><svg viewBox="0 0 800 40" aria-label="Recorded year axis"><g v-for="tick in layout.ticks" :key="tick.year"><text :x="tick.x" y="25" text-anchor="middle">{{tick.year}}</text></g></svg><span>Undated places</span></div>
          <article v-for="route in layout.routes" :key="route.person.id" class="family-migration-lane" :class="{'is-dimmed':active && !route.stops.some(s=>s.hub===active)}">
            <button type="button" class="family-migration-person" @click="$emit('select',route.person.id)"><PersonAvatar :person="route.person" /><strong>{{api.displayName(route.person)}}</strong></button>
            <svg :viewBox="`0 0 800 ${route.height}`" class="family-migration-track" :aria-label="'Recorded places for '+api.displayName(route.person)">
              <line v-for="tick in layout.ticks" :key="tick.year" :x1="tick.x" :x2="tick.x" y1="0" :y2="route.height" stroke="var(--line)" />
              <template v-for="(stop,index) in route.points" :key="index">
                <line v-if="index" :x1="route.points[index-1].x" :y1="route.points[index-1].y" :x2="stop.x" :y2="stop.y" :stroke="color(route.points[index-1].hub)" stroke-width="6" stroke-linecap="round" opacity=".4" />
                <g role="button" tabindex="0" :aria-label="description(stop)" :aria-pressed="selected===stop.hub" :class="{'is-dimmed':active && active!==stop.hub}" @click="toggle(stop.hub)" @keydown.enter.prevent="toggle(stop.hub)" @keydown.space.prevent="toggle(stop.hub)" @mouseenter="hovered=stop.hub" @mouseleave="hovered=null" @focus="hovered=stop.hub" @blur="hovered=null"><title>{{description(stop)}}</title><circle :cx="stop.x" :cy="stop.y" :r="active===stop.hub?10:7" :fill="color(stop.hub)" stroke="var(--paper)" stroke-width="2" /></g>
              </template>
            </svg>
            <div class="family-migration-undated"><button v-for="(stop,index) in route.unknown" :key="index" type="button" :class="{'is-dimmed':active && active!==stop.hub}" :style="{'--hub-color':color(stop.hub)}" :aria-pressed="selected===stop.hub" @click="toggle(stop.hub)" @mouseenter="hovered=stop.hub" @mouseleave="hovered=null" @focus="hovered=stop.hub" @blur="hovered=null">{{stop.label}}<small>{{stop.kind}} · Year unknown</small></button><small v-if="!route.unknown.length">—</small></div>
          </article>
        </div>
      </div>
      <div v-else class="family-migration-place-grid">
        <article v-for="hub in layout.hubs" :key="hub.id" class="family-migration-place-card" :class="{'is-dimmed':active && active!==hub.id}" :style="{'--hub-color':color(hub.id)}">
          <h4>{{hub.label}}</h4><p class="hint">{{hub.people.length}} family {{hub.people.length===1?'member':'members'}} connected here</p>
          <button v-for="(visit,index) in hub.visits" :key="visit.person.id+'-'+index" type="button" @click="$emit('select',visit.person.id)"><PersonAvatar :person="visit.person" /><span><strong>{{api.displayName(visit.person)}}</strong><small>{{year(visit.stop)}} · {{visit.stop.kind}}{{visit.stop.current && visit.stop.kind!=='Current home'?' · Current home':''}}</small></span></button>
        </article>
      </div>
      <div class="family-migration-shared-details" aria-live="polite"><template v-if="active"><strong>{{layout.hubs.find(h=>h.id===active)?.label}}</strong><span v-for="visit in layout.hubs.find(h=>h.id===active)?.visits || []" :key="visit.person.id+'-'+year(visit.stop)">{{api.displayName(visit.person)}} · {{year(visit.stop)}} · {{visit.stop.kind}}</span></template><span v-else>Select a place to highlight everyone connected to it. Shared places do not necessarily mean people lived there at the same time.</span></div>
    </template>
  </section>
</template>
