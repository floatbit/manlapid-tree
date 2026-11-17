<script setup>
import {sortPeople,comparePeople} from '../domain/people-order.js';
import MobileSidebar from '../components/MobileSidebar.vue';
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { PhArrowRight, PhX } from '@phosphor-icons/vue';
import { family, useRuntime, viewerRelation } from '../ui/runtime.js';
import { familyInsights, locationLabel, agePyramid, migrationDisplayLabel, compareMigrationBirthplaces, migrationColumn } from '../domain/insights.js';
import { insightSuperlatives } from '../domain/insight-superlatives.js';
import {openMobileSidebar,isMobileSidebar} from '../ui/mobile-sidebar.js';
import InsightStatGroup from '../components/InsightStatGroup.vue';
import InsightPersonDetails from '../components/InsightPersonDetails.vue';
import PersonAvatar from '../components/PersonAvatar.vue';
import PersonAutocomplete from '../components/PersonAutocomplete.vue';
const api=computed(useRuntime), selected=ref(null), overlapId=ref(''), flow=ref(null), month=ref(null);
const page=ref(null), sidebar=ref(null), panel=ref(''), context=ref(null), highlightedRoutes=ref([]);
const routeKey=r=>JSON.stringify([r.from,r.to]);
const routeSelected=r=>highlightedRoutes.value.includes(routeKey(r));
let headerObserver;
onMounted(()=>{const header=document.querySelector('#app > header');if(!header)return;const measure=()=>page.value?.style.setProperty('--insights-header-height',header.getBoundingClientRect().height+'px');measure();if(window.ResizeObserver){headerObserver=new window.ResizeObserver(measure);headerObserver.observe(header);}});
onBeforeUnmount(()=>headerObserver?.disconnect());
async function revealPanel(){await nextTick();if(sidebar.value)sidebar.value.scrollTop=0;if(isMobileSidebar())openMobileSidebar('insights');else if(window.matchMedia('(max-width: 900px)').matches)sidebar.value?.scrollIntoView?.({behavior:'smooth',block:'start'});}
function showPerson(person){selected.value=person;panel.value='person';revealPanel();}
function showFlow(value){highlightedRoutes.value=[routeKey(value)];flow.value=value;context.value={title:migrationDisplayLabel(value.from)+' → '+migrationDisplayLabel(value.to),people:value.people,routes:[value]};selected.value=null;panel.value='people';revealPanel();}
function showBracket(value){highlightedRoutes.value=[];flow.value=value;context.value={title:value.from+' · '+value.to,people:value.people};selected.value=null;panel.value='people';revealPanel();}
function showPlace(place,side){const matches=routes.value.filter(r=>r[side]===place);highlightedRoutes.value=matches.map(routeKey);context.value={title:migrationDisplayLabel(place),routes:matches,people:[...new Map(matches.flatMap(r=>r.people).map(p=>[p.id,p])).values()]};selected.value=null;panel.value='people';revealPanel();}
function showMonth(value){highlightedRoutes.value=[];month.value=value;selected.value=null;panel.value='month';revealPanel();}
function clearPanel(){highlightedRoutes.value=[];panel.value='';selected.value=null;context.value=null;}
const hoveredBirth=ref(null);
const now=new Date().getFullYear();
const pyramid=computed(()=>agePyramid(family.value.people));
const pyramidMax=computed(()=>Math.max(1,...pyramid.value.rows.flatMap(r=>[r.living.length,r.historical.length])));
const data=computed(()=>familyInsights(family.value.people,family.value.milestones));
const superlatives=computed(()=>insightSuperlatives(family.value.people,family.value.links,family.value.milestones));
const weddingPeople=event=>(event.participants || []).map(id=>family.value.people.find(p=>p.id===id)).filter(Boolean).slice(0,2);
const name=p=>api.value?.displayName(p) || p.name;
const monthName=i=>new Date(2000,i,1).toLocaleString('en-US',{month:'long'});
const busiestCount=computed(()=>Math.max(0,...data.value.months.map(m=>m.birthdays.length)));
const busiest=computed(()=>data.value.months.filter(m=>busiestCount.value>0 && m.birthdays.length===busiestCount.value));
const minimum=computed(()=>data.value.lives[0]?.birth.year || now);
const lifespanTicks=computed(()=>[...new Set([minimum.value,...[1900,1950,2000].filter(y=>y>minimum.value && y<now),now])]);
const yearPosition=year=>(year-minimum.value)/Math.max(1,now-minimum.value)*100;
const shortPlace=place=>{const label=place;return label.length>34?label.slice(0,32)+'…':label;};
const x=year=>40+(year-minimum.value)/Math.max(1,now-minimum.value)*920;
const swarm=computed(()=>{const placed=[];for(const life of data.value.lives){let row=0;while(placed.some(p=>p.row===row && Math.abs(p.x-x(life.birth.year))<26))row++;placed.push({...life,x:x(life.birth.year),row});}return placed;});
const swarmHeight=computed(()=>Math.max(120,...swarm.value.map(p=>80+p.row*26)));
const lives=computed(()=>data.value.lives.filter(p=>!p.person.deceased || p.death).map(p=>({...p,end:p.person.deceased?p.death.year:now})).filter(p=>p.end>=p.birth.year));
const chosen=computed(()=>lives.value.find(p=>p.person.id===overlapId.value));
watch(overlapId,id=>{if(!id){if(panel.value==='overlap')clearPanel();return;}highlightedRoutes.value=[];selected.value=null;panel.value='overlap';revealPanel();});
function showOverlap(id){const unchanged=overlapId.value===id;overlapId.value=id;if(unchanged){panel.value='overlap';revealPanel();}}
const overlaps=p=>!chosen.value || (p.birth.year<=chosen.value.end && p.end>=chosen.value.birth.year);
const routes=computed(()=>data.value.flows);
const drawnRoutes=computed(()=>[...routes.value.filter(r=>!routeSelected(r)),...routes.value.filter(routeSelected)]);
const placeSelected=(place,side)=>routes.value.some(r=>routeSelected(r) && r[side]===place);
const sources=computed(()=>[...new Set(routes.value.map(f=>f.from))].sort(compareMigrationBirthplaces));
const destinations=computed(()=>[...new Set(routes.value.map(f=>f.to))]);
const sourceColumn=computed(()=>migrationColumn(sources.value));
const destinationColumn=computed(()=>migrationColumn(destinations.value));
const routeHeight=computed(()=>Math.max(180,sourceColumn.value.height,destinationColumn.value.height));
const tooltip=p=>`${name(p.person)} · ${p.birth.approximate?'About ':''}${p.birth.year}${viewerRelation(p.person.id)?' · '+viewerRelation(p.person.id):''}`;
const statGroups=computed(()=>{
  const cards=[...superlatives.value,
    {eyebrow:'A FAMILY ACROSS TIME',headline:data.value.lives.length?minimum.value+' — '+data.value.lives.at(-1).birth.year:'Still to Discover',subtext:data.value.lives.length?name(data.value.lives[0].person)+' to '+name(data.value.lives.at(-1).person):'Add recorded birth years',footnote:'Earliest and latest recorded births'},
    {eyebrow:'WHERE WE GATHER',headline:data.value.current[0]?.[0] || 'Locations Awaiting',subtext:data.value.current.length?data.value.current[0][1]+' relatives live here':'Add current locations',footnote:'Top birthplace: '+(data.value.birthplaces[0]?.[0] || 'Not recorded yet')},
    {eyebrow:'BIRTHDAY SEASON',headline:busiest.value.length?busiest.value.map(m=>monthName(m.month)).join(' & '):'Dates Awaiting',subtext:busiestCount.value+' recorded birthdays'+(busiest.value.length>1?' each':''),footnote:'Based on birthdays with a known month'},
    {eyebrow:'GENERATIONS TODAY',headline:data.value.average===null?'—':data.value.average+' years',subtext:'Average age of living relatives with birth years',footnote:'Year-based estimate · '+data.value.lives.filter(p=>!p.person.deceased).length+' people'}
  ];
  const byEyebrow=new Map(cards.map(card=>[card.eyebrow,card]));
  return [
    ['A FAMILY ACROSS TIME','ACROSS THE MAP','WHERE WE BEGAN','PEAK BIRTH DECADE'],
    ['GENERATIONS TODAY','GROWING ROOTS','GROWING BRANCHES','FULL HOUSE'],
    ['LIVING WISDOM','LASTING LOVE','FAMILY HUB','FARTHEST REACH'],
    ['WHERE WE GATHER','BIRTHDAY SEASON','STAYED CLOSE','DOTS ON THE MAP']
  ].map(group=>group.map(key=>byEyebrow.get(key)));
});
</script>
<template>
<main id="insightsPage" ref="page" hidden>
<div class="insights-workspace"><div class="insights-main">
  <div class="intro"><div><p class="eyebrow">OUR FAMILY IN PATTERNS</p><h1>Family Insights</h1><p>Discover generational waves, global migrations, and the shared milestones that connect us across time.</p></div></div>
  <InsightStatGroup :cards="statGroups[0]" label="Time, Span &amp; Roots" />
  <section class="insights-section"><p class="eyebrow">FROM THERE TO HERE</p><h2>Our Migration Connections</h2><p>Birthplaces on the left, current homes or last recorded places lived on the right. Wider lines represent more relatives; these connect recorded locations, not travel routes. On active paths, each moving pill represents one relative.</p>
    <p v-if="!routes.length">Add birthplaces and current or past homes to reveal connections.</p>
    <div v-else class="insights-chart-scroll"><svg :viewBox="`0 -35 1000 ${routeHeight+35}`" class="insights-flow" role="group" aria-label="Birthplace to current or last recorded location connections">
      <text x="0" y="-14" class="migration-column-heading">Birthplace</text><text x="800" y="-14" class="migration-column-heading">Current / Last Location</text>
      <path v-for="r in drawnRoutes" :key="routeKey(r)" :class="{'migration-route-selected':routeSelected(r)}" :aria-pressed="routeSelected(r)" :d="`M 205 ${sourceColumn.positions.get(r.from)} C 425 ${sourceColumn.positions.get(r.from)},585 ${destinationColumn.positions.get(r.to)},785 ${destinationColumn.positions.get(r.to)}`" fill="none" stroke="#8da77c" :stroke-width="Math.min(20,2+r.people.length*2)+(routeSelected(r)?4:0)" opacity=".65" tabindex="0" role="button" :aria-label="`${migrationDisplayLabel(r.from)} to ${migrationDisplayLabel(r.to)}: ${r.people.length} relatives`" @click="showFlow(r)" @keydown.enter.prevent="showFlow(r)" @keydown.space.prevent="showFlow(r)"><title>{{migrationDisplayLabel(r.from)}} → {{migrationDisplayLabel(r.to)}} · {{r.people.length}} relatives</title></path>
      <g v-for="r in drawnRoutes.filter(routeSelected)" :key="'flow-'+routeKey(r)" class="migration-route-motion" aria-hidden="true">
        <rect v-for="(person,index) in r.people" :key="person.id" class="migration-person-pill" x="-3.5" y="-3.5" width="7" height="7" rx="3.5">
          <animateMotion dur="1.8s" repeatCount="indefinite" rotate="auto" :begin="(-index*Math.min(0.03,0.3/Math.max(1,r.people.length-1)))+'s'" :path="`M 205 ${sourceColumn.positions.get(r.from)} C 425 ${sourceColumn.positions.get(r.from)},585 ${destinationColumn.positions.get(r.to)},785 ${destinationColumn.positions.get(r.to)}`" />
        </rect>
      </g>
      <template v-for="group in sourceColumn.groups" :key="'source-'+group.country">
        <text x="0" :y="group.y" class="migration-country-heading">{{group.country}}</text>
        <text v-for="place in group.places" :key="place.value" :class="{'migration-place-selected':placeSelected(place.value,'from')}" role="button" tabindex="0" :aria-label="'Relatives born in '+migrationDisplayLabel(place.value)" @click="showPlace(place.value,'from')" @keydown.enter.prevent="showPlace(place.value,'from')" @keydown.space.prevent="showPlace(place.value,'from')" x="0" :y="place.y">{{shortPlace(place.label)}}<title>{{migrationDisplayLabel(place.value)}}</title></text>
      </template>
      <template v-for="group in destinationColumn.groups" :key="'destination-'+group.country">
        <text x="800" :y="group.y" class="migration-country-heading">{{group.country}}</text>
        <text v-for="place in group.places" :key="place.value" :class="{'migration-place-selected':placeSelected(place.value,'to')}" role="button" tabindex="0" :aria-label="'Relatives connected to '+migrationDisplayLabel(place.value)" @click="showPlace(place.value,'to')" @keydown.enter.prevent="showPlace(place.value,'to')" @keydown.space.prevent="showPlace(place.value,'to')" x="800" :y="place.y">{{shortPlace(place.label)}}<title>{{migrationDisplayLabel(place.value)}}</title></text>
      </template>
    </svg></div>

  </section>
  <InsightStatGroup :cards="statGroups[1]" label="Generations &amp; Families" />
  <section class="insights-section"><p class="eyebrow">OUR FAMILY, THEN AND NOW</p><h2>Living &amp; Historical Age Pyramid</h2><p>Living relatives by approximate age today; historical relatives by approximate age at passing.</p><div class="pyramid-legend"><span>Living</span><span>Historical</span></div>
    <div class="pyramid-row" v-for="r in pyramid.rows" :key="r.label"><span>{{r.label}}</span><div><button class="pyramid-living" :style="{width:Math.max(4,r.living.length/pyramidMax*100)+'%'}" :aria-label="r.label+': '+r.living.length+' living relatives'" @click="showBracket({from:r.label,to:'Living',people:r.living})">{{r.living.length}}</button><button class="pyramid-historical" :style="{width:Math.max(4,r.historical.length/pyramidMax*100)+'%'}" :aria-label="r.label+': '+r.historical.length+' historical relatives'" @click="showBracket({from:r.label,to:'Historical',people:r.historical})">{{r.historical.length}}</button></div></div>
    <small>{{pyramid.unknown}} relatives excluded because birth or death years are missing. Ages use year estimates. Select a bar to see relatives in the sidebar.</small>

  </section>
  <InsightStatGroup :cards="statGroups[2]" label="Milestones, Love &amp; Elders" />
  <section class="insights-section"><p class="eyebrow">THE WAVES THAT MADE US</p><h2>Every Birth, One Shared Story</h2><p>Each portrait marks a recorded birth. Hover or focus for details; select a portrait to meet them.</p>
    <p v-if="!swarm.length">No birth years recorded yet.</p>
    <div v-else class="insights-chart-scroll"><svg class="insights-swarm" :viewBox="`0 -34 1000 ${swarmHeight+79}`" role="group" aria-label="Family birth years">
      <line x1="40" x2="960" :y1="swarmHeight" :y2="swarmHeight" stroke="var(--line)" />
      <g v-for="year in lifespanTicks" :key="year" class="insights-swarm-year" aria-hidden="true">
        <line :x1="x(year)" :x2="x(year)" y1="30" :y2="swarmHeight" :stroke="year===now?'#38634e66':'#80917624'" />
        <text :x="x(year)" y="18" :text-anchor="year===minimum?'start':year===now?'end':'middle'">{{year===now?'Today · '+year:year}}</text>
        <text :x="x(year)" :y="swarmHeight+28" :text-anchor="year===minimum?'start':year===now?'end':'middle'">{{year===now?'Today · '+year:year}}</text>
      </g>
      <g v-if="hoveredBirth" class="insights-birth-hover" aria-hidden="true" pointer-events="none">
        <line :x1="hoveredBirth.x" :x2="hoveredBirth.x" y1="-6" :y2="swarmHeight" stroke="var(--green)" stroke-width="1" vector-effect="non-scaling-stroke" />
        <rect :x="Math.min(918,Math.max(4,hoveredBirth.x-39))" y="-32" width="78" height="26" rx="5" fill="var(--green)" />
        <text :x="Math.min(957,Math.max(43,hoveredBirth.x))" y="-14" text-anchor="middle" style="fill:white;font-size:12px;font-weight:600">{{hoveredBirth.birth.approximate?'c. ':''}}{{hoveredBirth.birth.year}}</text>
      </g>
      <g v-for="p in swarm" :key="p.person.id" role="button" tabindex="0" :aria-label="tooltip(p)" @click="showPerson(p.person)" @keydown.enter.prevent="showPerson(p.person)" @keydown.space.prevent="showPerson(p.person)" class="insights-dot" @mouseenter="hoveredBirth=p" @mouseleave="hoveredBirth=null" @focus="hoveredBirth=p" @blur="hoveredBirth=null"><title>{{tooltip(p)}}</title><circle :cx="p.x" :cy="swarmHeight-24-p.row*26" r="11" fill="#e4ecd9" stroke="#8ca677"/><svg :x="p.x-10" :y="swarmHeight-34-p.row*26" width="20" height="20" viewBox="0 0 28 28"><image v-if="p.person.photo" :href="p.person.photo" width="28" height="28" preserveAspectRatio="xMidYMid slice" style="clip-path:circle(50%)"/><text v-else x="14" y="18" text-anchor="middle" font-size="9">{{api?.initials(p.person)}}</text></svg></g>
    </svg></div><small>{{data.lives.length}} recorded birth years · {{family.people.length-data.lives.length}} unavailable · Year-only and approximate dates are marked in tooltips.</small>
  </section>
  <InsightStatGroup :cards="statGroups[3]" label="Local Presence &amp; Gatherings" />
  <section class="insights-section"><p class="eyebrow">LIVES THAT TOUCHED</p><h2>Who Overlapped?</h2><p>Choose a relative to highlight recorded lifetimes that overlap theirs. Years show possible overlap, rather than exact dates.</p>
    <PersonAutocomplete v-if="api" input-id="insightsOverlapSearch" list-id="insightsOverlapMatches" :options="()=>lives.map(p=>p.person)" :matches="api.personMatchesQuery" :display="name" placeholder="Choose a relative…" :validate-selection="false" @select="showOverlap($event.id)" @query="!$event && (overlapId='')" />
    <div class="insights-lifespans"><div class="insights-life-axis" aria-hidden="true"><span></span><div><span v-for="year in lifespanTicks" :key="year" :style="{left:yearPosition(year)+'%'}" :class="{'life-tick-first':year===minimum,'life-tick-last':year===now}">{{year===now?'Today · '+year:year}}</span></div></div><div class="insights-life-guides" aria-hidden="true"><span v-for="year in lifespanTicks" :key="year" :class="{'life-guide-today':year===now}" :style="{left:yearPosition(year)+'%'}"></span></div><button v-for="p in lives" :key="p.person.id" class="insights-life" :class="{'insights-life-muted':!overlaps(p), 'insights-life-selected':p.person.id===overlapId}" @click="showOverlap(p.person.id)" :aria-label="tooltip(p)+' to '+p.end"><span>{{name(p.person)}}</span><span class="insights-life-track"><span :style="{left:((p.birth.year-minimum)/(now-minimum||1)*100)+'%',width:Math.max(1,(p.end-p.birth.year)/(now-minimum||1)*100)+'%'}"></span></span><small>{{p.birth.approximate?'c. ':''}}{{p.birth.year}}–{{p.person.deceased?p.end:'Present'}}</small></button><div class="insights-life-axis" aria-hidden="true"><span></span><div><span v-for="year in lifespanTicks" :key="year" :style="{left:yearPosition(year)+'%'}" :class="{'life-tick-first':year===minimum,'life-tick-last':year===now}">{{year===now?'Today · '+year:year}}</span></div></div></div>
    <small>Deceased relatives without a recorded death year are omitted. Select a name or a bar to see overlapping lifetimes in the sidebar.</small>
  </section>

  <section class="insights-section"><p class="eyebrow">A YEAR OF CELEBRATIONS</p><h2>Our Celebration Calendar</h2><p>Birthdays and recorded wedding anniversaries, grouped by month.</p><div class="insights-calendar"><button v-for="m in data.months" :key="m.month" :style="{'--month-strength':Math.min(.65,.08+(m.birthdays.length+m.weddings.length)*.055)}" @click="showMonth(m)" :aria-label="`${monthName(m.month)}: ${m.birthdays.length} birthdays and ${m.weddings.length} anniversaries`"><strong>{{monthName(m.month)}}</strong><b>{{m.birthdays.length+m.weddings.length}}</b><small>{{m.birthdays.length}} birthdays · {{m.weddings.length}} anniversaries</small></button></div>

  </section>
</div>
<MobileSidebar sidebar-key="insights" label="Insights details"><aside ref="sidebar" class="insights-sidebar" aria-label="Insight details" tabindex="0">
  <div class="insights-sidebar-heading"><p class="eyebrow">A CLOSER LOOK</p><button v-if="panel" type="button" aria-label="Clear insight selection" @click="clearPanel"><PhX :size="20"/></button></div>
  <template v-if="panel==='person' && selected">
    <InsightPersonDetails :person="selected" @select="showPerson" @tree="api.start($event.id)" />
  </template>
  <template v-else-if="panel==='people' && context">
    <template v-if="!context.routes"><h2>{{context.title}}</h2><p v-if="context.description">{{context.description}}</p><p>{{context.people.length}} relatives</p></template>
    <div v-if="context.routes" class="insights-sidebar-routes"><section v-for="route in context.routes" :key="routeKey(route)" class="insights-sidebar-route"><h3>{{migrationDisplayLabel(route.from)}} <PhArrowRight class="arrow-link-icon" :size="14" aria-hidden="true"/> {{migrationDisplayLabel(route.to)}}</h3><p>{{route.people.length}} {{route.people.length===1?'relative':'relatives'}}</p><div class="insights-sidebar-people"><button v-for="p in sortPeople(route.people)" :key="p.id" @click="showPerson(p)"><PersonAvatar :person="p"/><span>{{name(p)}}<small v-if="viewerRelation(p.id)">{{viewerRelation(p.id)}}</small></span><PhArrowRight class="arrow-link-icon" :size="16"/></button></div></section></div>
    <div v-else class="insights-sidebar-people"><button v-for="p in sortPeople(context.people)" :key="p.id" @click="showPerson(p)"><PersonAvatar :person="p"/><span>{{name(p)}}<small v-if="viewerRelation(p.id)">{{viewerRelation(p.id)}}</small></span><PhArrowRight class="arrow-link-icon" :size="16"/></button></div><p v-if="!context.people.length">No relatives in this group.</p>
  </template>
  <template v-else-if="panel==='month' && month">
    <h2>{{monthName(month.month)}}</h2><p>Birthdays &amp; Wedding Anniversaries</p>
    <div class="insights-sidebar-people"><button v-for="p in sortPeople(month.birthdays)" :key="p.id" @click="showPerson(p)"><PersonAvatar :person="p"/><span>{{name(p)}}<small>Birthday · {{api.familyDateLabel(p.dateDetails?.birth || p.birthday)}}</small></span><PhArrowRight class="arrow-link-icon" :size="16"/></button></div>
    <article v-for="w in month.weddings" :key="w.id" class="insights-sidebar-event insights-wedding-event"><div v-if="weddingPeople(w).length" class="insights-wedding-portraits"><button v-for="p in weddingPeople(w)" :key="p.id" type="button" :aria-label="'View '+name(p)" @click="showPerson(p)"><PersonAvatar :person="p"/></button></div><div><strong>{{w.title}}</strong><p>Wedding Anniversary · {{api.familyDateLabel(w.date)}}</p></div></article>
    <p v-if="!month.birthdays.length && !month.weddings.length">No celebrations recorded for this month.</p>
  </template>
  <template v-else-if="panel==='overlap' && chosen">
    <h2>Lifetimes Overlapping {{name(chosen.person)}}</h2><p>{{lives.filter(overlaps).length}} recorded lifetimes · year-based estimates</p>
    <div class="insights-sidebar-people"><button v-for="p in lives.filter(overlaps).slice().sort((a,b)=>comparePeople(a.person,b.person))" :key="p.person.id" @click="showPerson(p.person)"><PersonAvatar :person="p.person"/><span>{{name(p.person)}}<small>{{p.birth.year}}–{{p.person.deceased?p.end:'Present'}}</small></span><PhArrowRight class="arrow-link-icon" :size="16"/></button></div>
  </template>
  <template v-else><h2>Explore Your Family</h2><p>Select a portrait, age bracket, lifespan, location, or calendar month. Its details will appear here.</p></template>
</aside></MobileSidebar>
</div>
</main>
</template>
