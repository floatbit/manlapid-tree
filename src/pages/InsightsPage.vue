<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { PhArrowRight, PhX } from '@phosphor-icons/vue';
import { family, useRuntime, viewerRelation } from '../ui/runtime.js';
import { familyInsights, locationLabel, agePyramid } from '../domain/insights.js';
import InsightPersonDetails from '../components/InsightPersonDetails.vue';
import PersonAvatar from '../components/PersonAvatar.vue';
import PersonAutocomplete from '../components/PersonAutocomplete.vue';
const api=computed(useRuntime), selected=ref(null), overlapId=ref(''), flow=ref(null), month=ref(null);
const page=ref(null), sidebar=ref(null), panel=ref(''), context=ref(null);
let headerObserver;
onMounted(()=>{const header=document.querySelector('#app > header');if(!header)return;const measure=()=>page.value?.style.setProperty('--insights-header-height',header.getBoundingClientRect().height+'px');measure();if(window.ResizeObserver){headerObserver=new window.ResizeObserver(measure);headerObserver.observe(header);}});
onBeforeUnmount(()=>headerObserver?.disconnect());
async function revealPanel(){await nextTick();if(sidebar.value)sidebar.value.scrollTop=0;if(window.matchMedia('(max-width: 900px)').matches)sidebar.value?.scrollIntoView?.({behavior:'smooth',block:'start'});}
function showPerson(person){selected.value=person;panel.value='person';revealPanel();}
function showFlow(value){flow.value=value;context.value={title:value.from+' → '+value.to,people:value.people};selected.value=null;panel.value='people';revealPanel();}
function showBracket(value){flow.value=value;context.value={title:value.from+' · '+value.to,people:value.people};selected.value=null;panel.value='people';revealPanel();}
function showPlace(place,side){const matches=routes.value.filter(r=>r[side]===place);context.value={title:place,description:side==='from'?'Relatives born here':'Relatives living here',people:[...new Map(matches.flatMap(r=>r.people).map(p=>[p.id,p])).values()]};selected.value=null;panel.value='people';revealPanel();}
function showMonth(value){month.value=value;selected.value=null;panel.value='month';revealPanel();}
function clearPanel(){panel.value='';selected.value=null;context.value=null;}
const now=new Date().getFullYear();
const pyramid=computed(()=>agePyramid(family.value.people));
const pyramidMax=computed(()=>Math.max(1,...pyramid.value.rows.flatMap(r=>[r.living.length,r.historical.length])));
const data=computed(()=>familyInsights(family.value.people,family.value.milestones));
const name=p=>api.value?.displayName(p) || p.name;
const monthName=i=>new Date(2000,i,1).toLocaleString('en-US',{month:'long'});
const busiest=computed(()=>[...data.value.months].sort((a,b)=>b.birthdays.length-a.birthdays.length)[0]);
const minimum=computed(()=>data.value.lives[0]?.birth.year || now);
const x=year=>40+(year-minimum.value)/Math.max(1,now-minimum.value)*920;
const swarm=computed(()=>{const placed=[];for(const life of data.value.lives){let row=0;while(placed.some(p=>p.row===row && Math.abs(p.x-x(life.birth.year))<34))row++;placed.push({...life,x:x(life.birth.year),row});}return placed;});
const swarmHeight=computed(()=>Math.max(120,...swarm.value.map(p=>80+p.row*36)));
const lives=computed(()=>data.value.lives.filter(p=>!p.person.deceased || p.death).map(p=>({...p,end:p.person.deceased?p.death.year:now})).filter(p=>p.end>=p.birth.year));
const chosen=computed(()=>lives.value.find(p=>p.person.id===overlapId.value));
watch(overlapId,id=>{if(!id){if(panel.value==='overlap')clearPanel();return;}selected.value=null;panel.value='overlap';revealPanel();});
const overlaps=p=>!chosen.value || (p.birth.year<=chosen.value.end && p.end>=chosen.value.birth.year);
const routes=computed(()=>data.value.flows);
const sources=computed(()=>[...new Set(routes.value.map(f=>f.from))]);
const destinations=computed(()=>[...new Set(routes.value.map(f=>f.to))]);
const routeHeight=computed(()=>Math.max(180,Math.max(sources.value.length,destinations.value.length)*55));
const tooltip=p=>`${name(p.person)} · ${p.birth.approximate?'About ':''}${p.birth.year}${viewerRelation(p.person.id)?' · '+viewerRelation(p.person.id):''}`;
</script>
<template>
<main id="insightsPage" ref="page" hidden>
<div class="insights-workspace"><div class="insights-main">
  <div class="intro"><div><p class="eyebrow">OUR FAMILY IN PATTERNS</p><h1>Family Insights</h1><p>Discover generational waves, global migrations, and the shared milestones that connect us across time.</p></div></div>
  <div class="insights-stats">
    <article><p class="eyebrow">A FAMILY ACROSS TIME</p><h2>{{ data.lives.length ? minimum+' — '+data.lives.at(-1).birth.year : 'Still to Discover' }}</h2><p v-if="data.lives.length">{{name(data.lives[0].person)}} to {{name(data.lives.at(-1).person)}}</p><small>Earliest and latest recorded births</small></article>
    <article><p class="eyebrow">WHERE WE GATHER</p><h2>{{data.current[0]?.[0] || 'Locations Awaiting'}}</h2><p v-if="data.current.length">{{data.current[0][1]}} relatives live here</p><small>Top birthplace: {{data.birthplaces[0]?.[0] || 'Not recorded yet'}}</small></article>
    <article><p class="eyebrow">BIRTHDAY SEASON</p><h2>{{busiest.birthdays.length ? monthName(busiest.month) : 'Dates Awaiting'}}</h2><p>{{busiest.birthdays.length}} recorded birthdays</p><small>Based on birthdays with a known month</small></article>
    <article><p class="eyebrow">GENERATIONS TODAY</p><h2>{{data.average === null ? '—' : data.average+' years'}}</h2><p>Average age of living relatives with birth years</p><small>Year-based estimate · {{data.lives.filter(p=>!p.person.deceased).length}} people</small></article>
  </div>
  <section class="insights-section"><p class="eyebrow">OUR FAMILY, THEN AND NOW</p><h2>Living &amp; Historical Age Pyramid</h2><p>Living relatives by approximate age today; historical relatives by approximate age at passing.</p><div class="pyramid-legend"><span>Living</span><span>Historical</span></div>
    <div class="pyramid-row" v-for="r in pyramid.rows" :key="r.label"><span>{{r.label}}</span><div><button class="pyramid-living" :style="{width:Math.max(4,r.living.length/pyramidMax*100)+'%'}" :aria-label="r.label+': '+r.living.length+' living relatives'" @click="showBracket({from:r.label,to:'Living',people:r.living})">{{r.living.length}}</button><button class="pyramid-historical" :style="{width:Math.max(4,r.historical.length/pyramidMax*100)+'%'}" :aria-label="r.label+': '+r.historical.length+' historical relatives'" @click="showBracket({from:r.label,to:'Historical',people:r.historical})">{{r.historical.length}}</button></div></div>
    <small>{{pyramid.unknown}} relatives excluded because birth or death years are missing. Ages use year estimates. Select a bar to see relatives in the sidebar.</small>

  </section>
  <section class="insights-section"><p class="eyebrow">THE WAVES THAT MADE US</p><h2>Every Birth, One Shared Story</h2><p>Each portrait marks a recorded birth. Hover or focus for details; select a portrait to meet them.</p>
    <p v-if="!swarm.length">No birth years recorded yet.</p>
    <div v-else class="insights-chart-scroll"><svg class="insights-swarm" :viewBox="`0 0 1000 ${swarmHeight+45}`" role="group" aria-label="Family birth years">
      <line x1="40" x2="960" :y1="swarmHeight" :y2="swarmHeight" stroke="var(--line)" />
      <text v-for="year in [minimum,Math.round((minimum+now)/2),now]" :key="year" :x="x(year)" :y="swarmHeight+28" text-anchor="middle">{{year}}</text>
      <g v-for="p in swarm" :key="p.person.id" role="button" tabindex="0" :aria-label="tooltip(p)" @click="showPerson(p.person)" @keydown.enter.prevent="showPerson(p.person)" @keydown.space.prevent="showPerson(p.person)" class="insights-dot"><title>{{tooltip(p)}}</title><circle :cx="p.x" :cy="swarmHeight-24-p.row*36" r="15" fill="#e4ecd9" stroke="#8ca677"/><svg :x="p.x-14" :y="swarmHeight-38-p.row*36" width="28" height="28" viewBox="0 0 28 28"><image v-if="p.person.photo" :href="p.person.photo" width="28" height="28" preserveAspectRatio="xMidYMid slice" style="clip-path:circle(50%)"/><text v-else x="14" y="18" text-anchor="middle" font-size="9">{{api?.initials(p.person)}}</text></svg></g>
    </svg></div><small>{{data.lives.length}} recorded birth years · {{family.people.length-data.lives.length}} unavailable · Year-only and approximate dates are marked in tooltips.</small>
  </section>
  <section class="insights-section"><p class="eyebrow">LIVES THAT TOUCHED</p><h2>Who Overlapped?</h2><p>Choose a relative to highlight recorded lifetimes that overlap theirs. Years show possible overlap, rather than exact dates.</p>
    <PersonAutocomplete v-if="api" input-id="insightsOverlapSearch" list-id="insightsOverlapMatches" :options="()=>lives.map(p=>p.person)" :matches="api.personMatchesQuery" :display="name" placeholder="Choose a relative…" :validate-selection="false" @select="overlapId=$event.id" @query="!$event && (overlapId='')" />
    <div class="insights-lifespans"><button v-for="p in lives" :key="p.person.id" class="insights-life" :class="{'insights-life-muted':!overlaps(p), 'insights-life-selected':p.person.id===overlapId}" @click="overlapId=p.person.id" :aria-label="tooltip(p)+' to '+p.end"><span>{{name(p.person)}}</span><span class="insights-life-track"><span :style="{left:((p.birth.year-minimum)/(now-minimum||1)*100)+'%',width:Math.max(1,(p.end-p.birth.year)/(now-minimum||1)*100)+'%'}"></span></span><small>{{p.birth.approximate?'c. ':''}}{{p.birth.year}}–{{p.person.deceased?p.end:'Present'}}</small></button></div>
    <small>Deceased relatives without a recorded death year are omitted. Select a name or a bar to see overlapping lifetimes in the sidebar.</small>
  </section>
  <section class="insights-section"><p class="eyebrow">FROM THERE TO HERE</p><h2>Our Migration Connections</h2><p>Birthplaces on the left, current homes on the right. Wider lines represent more relatives; these connect recorded locations, not travel routes.</p>
    <p v-if="!routes.length">Add birthplaces and current locations to reveal connections.</p>
    <div v-else class="insights-chart-scroll"><svg :viewBox="`0 0 1000 ${routeHeight}`" class="insights-flow" role="group" aria-label="Birthplace to current location connections">
      <path v-for="(r,i) in routes" :key="i" :d="`M 270 ${sources.indexOf(r.from)*55+28} C 470 ${sources.indexOf(r.from)*55+28},530 ${destinations.indexOf(r.to)*55+28},730 ${destinations.indexOf(r.to)*55+28}`" fill="none" stroke="#8da77c" :stroke-width="Math.min(20,2+r.people.length*2)" opacity=".65" tabindex="0" role="button" :aria-label="`${r.from} to ${r.to}: ${r.people.length} relatives`" @click="showFlow(r)" @keydown.enter.prevent="showFlow(r)" @keydown.space.prevent="showFlow(r)"><title>{{r.from}} → {{r.to}} · {{r.people.length}} relatives</title></path>
      <text v-for="(place,i) in sources" :key="'s'+place" role="button" tabindex="0" :aria-label="'Relatives born in '+place" @click="showPlace(place,'from')" @keydown.enter.prevent="showPlace(place,'from')" @keydown.space.prevent="showPlace(place,'from')" x="0" :y="i*55+32">{{place.length>34?place.slice(0,32)+'…':place}}<title>{{place}}</title></text><text v-for="(place,i) in destinations" :key="'d'+place" role="button" tabindex="0" :aria-label="'Relatives living in '+place" @click="showPlace(place,'to')" @keydown.enter.prevent="showPlace(place,'to')" @keydown.space.prevent="showPlace(place,'to')" x="745" :y="i*55+32">{{place.length>34?place.slice(0,32)+'…':place}}<title>{{place}}</title></text>
    </svg></div>

  </section>
  <section class="insights-section"><p class="eyebrow">A YEAR OF CELEBRATIONS</p><h2>Our Celebration Calendar</h2><p>Birthdays and recorded wedding anniversaries, grouped by month.</p><div class="insights-calendar"><button v-for="m in data.months" :key="m.month" :style="{'--month-strength':Math.min(.65,.08+(m.birthdays.length+m.weddings.length)*.055)}" @click="showMonth(m)" :aria-label="`${monthName(m.month)}: ${m.birthdays.length} birthdays and ${m.weddings.length} anniversaries`"><strong>{{monthName(m.month)}}</strong><b>{{m.birthdays.length+m.weddings.length}}</b><small>{{m.birthdays.length}} birthdays · {{m.weddings.length}} anniversaries</small></button></div>

  </section>
</div>
<aside ref="sidebar" class="insights-sidebar" aria-label="Insight details" tabindex="0">
  <div class="insights-sidebar-heading"><p class="eyebrow">A CLOSER LOOK</p><button v-if="panel" type="button" aria-label="Clear insight selection" @click="clearPanel"><PhX :size="20"/></button></div>
  <template v-if="panel==='person' && selected">
    <InsightPersonDetails :person="selected" @select="showPerson" @tree="api.openTaggedPerson($event.id);clearPanel()" />
  </template>
  <template v-else-if="panel==='people' && context">
    <h2>{{context.title}}</h2><p v-if="context.description">{{context.description}}</p><p>{{context.people.length}} relatives</p>
    <div class="insights-sidebar-people"><button v-for="p in context.people" :key="p.id" @click="showPerson(p)"><PersonAvatar :person="p"/><span>{{name(p)}}<small v-if="viewerRelation(p.id)">{{viewerRelation(p.id)}}</small></span><PhArrowRight :size="16"/></button></div><p v-if="!context.people.length">No relatives in this group.</p>
  </template>
  <template v-else-if="panel==='month' && month">
    <h2>{{monthName(month.month)}}</h2><p>Birthdays &amp; Wedding Anniversaries</p>
    <div class="insights-sidebar-people"><button v-for="p in month.birthdays" :key="p.id" @click="showPerson(p)"><PersonAvatar :person="p"/><span>{{name(p)}}<small>Birthday · {{api.familyDateLabel(p.dateDetails?.birth || p.birthday)}}</small></span><PhArrowRight :size="16"/></button></div>
    <article v-for="w in month.weddings" :key="w.id" class="insights-sidebar-event"><strong>{{w.title}}</strong><p>Wedding Anniversary · {{api.familyDateLabel(w.date)}}</p></article>
    <p v-if="!month.birthdays.length && !month.weddings.length">No celebrations recorded for this month.</p>
  </template>
  <template v-else-if="panel==='overlap' && chosen">
    <h2>Lifetimes Overlapping {{name(chosen.person)}}</h2><p>{{lives.filter(overlaps).length}} recorded lifetimes · year-based estimates</p>
    <div class="insights-sidebar-people"><button v-for="p in lives.filter(overlaps)" :key="p.person.id" @click="showPerson(p.person)"><PersonAvatar :person="p.person"/><span>{{name(p.person)}}<small>{{p.birth.year}}–{{p.person.deceased?p.end:'Present'}}</small></span><PhArrowRight :size="16"/></button></div>
  </template>
  <template v-else><h2>Explore Your Family</h2><p>Select a portrait, age bracket, lifespan, location, or calendar month. Its details will appear here.</p></template>
</aside>
</div>
</main>
</template>
