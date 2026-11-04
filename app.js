const $=s=>document.querySelector(s);const KEY='kinfolk-v1';const hadBrowserData=!!localStorage.getItem(KEY);let data={people:[],links:[],milestones:[],visible:[],expanded:[],selected:null,root:null,email:''};try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.people)&&Array.isArray(saved.links))data={...data,...saved};}catch{}if(!localStorage.getItem(KEY)){
 data.people=[['chris','Chris Manlapid'],['james','James Manlapid'],['mercedes','Mercedes Manlapid'],['luis','Luis T. Manlapid'],['christy','Christy'],['kaylin','Kaylin'],['kyle','Kyle']].map(([id,name])=>({id,name,photo:'',bio:'',birthday:'',location:''}));
 data.links=[{a:'chris',b:'james',type:'sibling'},{a:'chris',b:'mercedes',type:'parent'},{a:'chris',b:'luis',type:'parent'},{a:'james',b:'mercedes',type:'parent'},{a:'james',b:'luis',type:'parent'},{a:'chris',b:'christy',type:'spouse'},{a:'chris',b:'kaylin',type:'child'},{a:'chris',b:'kyle',type:'child'},{a:'christy',b:'kaylin',type:'child'},{a:'christy',b:'kyle',type:'child'}];
 if(hadBrowserData)try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}
}
// Repair the original example once, without replacing browser-saved family edits.
if(!data.exampleSpouseConnectionV1){
 const luis=data.people.find(p=>p.id==='luis'&&p.name==='Luis T. Manlapid');
 const mercedes=data.people.find(p=>p.id==='mercedes'&&p.name==='Mercedes Manlapid');
 if(luis&&mercedes&&!data.links.some(l=>(l.a===luis.id&&l.b===mercedes.id)||(l.a===mercedes.id&&l.b===luis.id)))data.links.push({a:luis.id,b:mercedes.id,type:'spouse'});
 data.exampleSpouseConnectionV1=true;
 if(hadBrowserData)try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}
}
const initialFamily=JSON.parse(JSON.stringify(data));let draftPhoto='';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const person=id=>data.people.find(p=>p.id===id);const inverse={parent:'child',child:'parent',sibling:'sibling',spouse:'spouse'};const nameParts=p=>{const parts=(p?.name||'').trim().split(/\s+/);return {firstName:p?.firstName??parts[0]??'',middleName:p?.middleName??parts.slice(1,-1).join(' '),lastName:p?.lastName??(parts.length>1?parts.at(-1):'')}};const firstLastName=p=>{const n=nameParts(p);return [n.firstName,n.lastName].filter(Boolean).join(' ')};const displayName=p=>{const n=nameParts(p);const middle=n.middleName.trim().split(/\s+/).filter(Boolean).map(part=>part.replace(/\.+$/,'')[0]?.toUpperCase()+'.').join(' ');return [n.firstName,middle,n.lastName].filter(Boolean).join(' ')};const initials=p=>{const n=nameParts(p);return ((n.firstName[0]||'')+(n.lastName[0]||'')).toUpperCase()};const avatar=p=>p.photo?`<img class="avatar" src="${esc(p.photo)}" alt="${esc(displayName(p))}">`:`<span class="avatar">${esc(initials(p))}</span>`;
function notify(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').style.display='none',3000)}const VIEW_KEY='kinfolk-view-v1';let sharedReady=false,sharedRevision=0,csrfToken='',savingShared=false;
try{const view=JSON.parse(localStorage.getItem(VIEW_KEY));if(view&&Array.isArray(view.visible)){for(const key of ['visible','expanded','selected','root'])if(key in view)data[key]=view[key]}}catch{}
function save(){try{localStorage.setItem(VIEW_KEY,JSON.stringify({visible:data.visible,expanded:data.expanded,selected:data.selected,root:data.root}));return true}catch{notify('The tree view could not be saved in this browser.');return false}}
function sharedPayload(action){return {action,revision:sharedRevision,people:data.people,links:data.links,milestones:data.milestones||[],email:data.email}}
function syncStatus(message,failed=false){$('.saved').textContent=message;$('.saved').classList.toggle('sync-error',failed)}
function showDatabaseError(message){$('#databaseMessage').textContent=message;$('#databaseNotice').hidden=false;syncStatus('● Database unavailable',true)}
async function requestDatabase(body){const response=await fetch('api.php',{method:body?'PUT':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json','X-CSRF-Token':csrfToken}:{},body:body?JSON.stringify(body):undefined});let result;try{result=await response.json()}catch{throw new Error('This app needs a PHP server. Open it through PHP or MAMP, rather than a static file server.')}if(!response.ok)throw new Error(result.error||'Could not save the family data.');return result}
let personAliases={},mapsApiKey='';
function applyShared(result){mapsApiKey=result.mapsApiKey||'';personAliases=Object.fromEntries((result.personAliases||[]).map(row=>[row.old_id,row.person_id]));const resolve=id=>personAliases[id]||id;data.visible=data.visible.map(resolve);data.expanded=data.expanded.map(resolve);data.root=resolve(data.root);data.selected=resolve(data.selected);data.people=result.people;data.links=result.links;data.milestones=result.milestones||[];data.email=result.email;sharedRevision=result.revision;csrfToken=result.csrf;data.visible=data.visible.filter(id=>person(id));data.expanded=data.expanded.filter(id=>person(id));if(!person(data.selected))data.selected=null;if(!person(data.root))data.root=null;save()}
function ancestryCyclePerson(people,links){
 const children=new Map(people.map(p=>[p.id,[]])),state=new Map();
 for(const link of links){const parent=link.type==='parent'?link.b:link.type==='child'?link.a:null,child=link.type==='parent'?link.a:link.b;if(parent!==null&&children.has(parent)&&children.has(child))children.get(parent).push(child)}
 for(const root of children.keys()){
  if(state.has(root))continue;state.set(root,1);const stack=[{id:root,next:0}];
  while(stack.length){const frame=stack.at(-1),descendants=children.get(frame.id);if(frame.next>=descendants.length){state.set(frame.id,2);stack.pop();continue}const child=descendants[frame.next++];if(state.get(child)===1)return child;if(!state.has(child)){state.set(child,1);stack.push({id:child,next:0})}}
 }
 return null;
}
async function saveShared(){const cycle=ancestryCyclePerson(data.people,data.links);if(cycle!==null){const message=`These connections would make ${displayName(person(cycle))} their own ancestor. Correct the parent/child relationships and try again.`;notify(message);if(!$('#editor').hidden)$('#formError').textContent=message;if($('#familyDialog').open)$('#familyError').textContent=message;return false}if(!sharedReady||savingShared){notify('Please wait for the database connection.');return false}savingShared=true;syncStatus('● Saving to MySQL…');$('#editor').inert=true;$('#details').inert=true;$('#familyForm').inert=true;$('#milestoneForm').inert=true;$('#timeline').inert=true;try{const result=await requestDatabase(sharedPayload('save'));applyShared(result);syncStatus('● Saved to MySQL');$('#setupNotice').hidden=true;save();return true}catch(error){showDatabaseError(error.message);notify('Changes were not saved. '+error.message);return false}finally{savingShared=false;$('#editor').inert=false;$('#details').inert=false;$('#familyForm').inert=false;$('#milestoneForm').inert=false;$('#timeline').inert=false}}
async function refreshShared(){if(!sharedReady||savingShared||!$('#editor').hidden||$('#familyDialog').open||!$('#relationships').hidden||$('#milestoneDialog').open||$('#photoLightbox').open||$('#siblingGroupDialog').open||$('#bulkLocationDialog').open||document.activeElement?.matches('input,textarea,select'))return;try{const result=await requestDatabase();if(result.revision!==sharedRevision){applyShared(result);render();if(!$('#timeline').hidden)renderTimeline();if(!$('#familyMapPage').hidden)renderFamilyMap({fit:false})}syncStatus('● Saved to MySQL');$('#databaseNotice').hidden=true}catch(error){showDatabaseError(error.message)}}
async function connectDatabase(){for(const el of document.querySelectorAll('main'))el.inert=true;syncStatus('● Connecting to MySQL…');try{let result=await requestDatabase();csrfToken=result.csrf;if(result.revision===0&&hadBrowserData)result=await requestDatabase(sharedPayload('bootstrap'));applyShared(result);sharedReady=true;$('#setupNotice').hidden=result.revision!==0;$('#databaseNotice').hidden=true;syncStatus('● Saved to MySQL');edit();showSection(new URLSearchParams(location.hash.slice(1)).has('editPerson')?'people':savedSection());if(data.root)$('#search').value=(person(data.root)?displayName(person(data.root)):'');openSharedLink()}catch(error){showDatabaseError(error.message+' Your browser’s previous data is still preserved.')}finally{for(const el of document.querySelectorAll('main'))el.inert=!sharedReady}}

function connections(id){const out=[];for(const l of data.links){if(l.a===id)out.push({id:l.b,type:l.type});else if(l.b===id)out.push({id:l.a,type:inverse[l.type]});}const parents=out.filter(c=>c.type==='parent').map(c=>c.id);for(const par of parents){for(const c of connectionsDirect(par)){if(c.type==='child'&&c.id!==id&&!out.some(o=>o.id===c.id))out.push({id:c.id,type:'sibling'});}}return out.filter(c=>person(c.id))}function connectionsDirect(id){return data.links.flatMap(l=>l.a===id?[{id:l.b,type:l.type}]:l.b===id?[{id:l.a,type:inverse[l.type]}]:[])}
function relationshipLabels(focusId){
 const parents=new Map(data.people.map(p=>[p.id,new Set()])),children=new Map(data.people.map(p=>[p.id,new Set()])),siblings=new Map(data.people.map(p=>[p.id,new Set()])),partners=new Map(data.people.map(p=>[p.id,new Set()]));
 for(const l of data.links){if(!parents.has(l.a)||!parents.has(l.b))continue;if(l.type==='parent'||l.type==='child'){const child=l.type==='parent'?l.a:l.b,parent=l.type==='parent'?l.b:l.a;parents.get(child).add(parent);children.get(parent).add(child)}else if(l.type==='sibling'){siblings.get(l.a).add(l.b);siblings.get(l.b).add(l.a)}else if(l.type==='spouse'){partners.get(l.a).add(l.b);partners.get(l.b).add(l.a)}}
 const siblingCache=new Map(),ancestorCache=new Map();
 function siblingIds(id){if(!siblingCache.has(id)){const ids=new Set(siblings.get(id));for(const parent of parents.get(id)||[])for(const child of children.get(parent)||[])if(child!==id)ids.add(child);siblingCache.set(id,ids)}return siblingCache.get(id)}
 function ancestors(id){if(!ancestorCache.has(id)){const found=new Map([[id,0]]),queue=[id];for(let i=0;i<queue.length;i++){const child=queue[i],depth=found.get(child);if(depth>=12)continue;for(const parent of parents.get(child)||[])if(!found.has(parent)){found.set(parent,depth+1);queue.push(parent)}}ancestorCache.set(id,found)}return ancestorCache.get(id)}
 function kinship(a,b){
  if(a===b)return 'Selected person';const aa=ancestors(a),bb=ancestors(b);if(aa.has(b)){const n=aa.get(b);return n===1?'Parent':n===2?'Grandparent':`${'Great-'.repeat(n-2)}grandparent`}if(bb.has(a)){const n=bb.get(a);return n===1?'Child':n===2?'Grandchild':`${'Great-'.repeat(n-2)}grandchild`}
  let best=null;const consider=(up,down)=>{if(!best||up+down<best[0]+best[1])best=[up,down]};
  for(const [ancestor,up] of aa){if(bb.has(ancestor))consider(up,bb.get(ancestor));for(const sibling of siblingIds(ancestor))if(bb.has(sibling))consider(up+1,bb.get(sibling)+1)}
  if(!best)return null;const [up,down]=best;
  if(up===1&&down===1)return 'Sibling';
  if(down===1)return up===2?'Aunt / uncle':`${'Great-'.repeat(up-2)}aunt / uncle`;
  if(up===1)return down===2?'Niece / nephew':`${'Great-'.repeat(down-2)}niece / nephew`;
  const degree=Math.min(up,down)-1,removed=Math.abs(up-down),ordinal=degree===1?'':degree===2?'2nd ':degree===3?'3rd ':`${degree}th `;
  return `${ordinal}Cousin${removed===0?'':removed===1?' once removed':removed===2?' twice removed':` ${removed}× removed`}`;
 }
 const labels=new Map();for(const p of data.people){let label=partners.get(focusId)?.has(p.id)?'Spouse':kinship(focusId,p.id);
  if(!label){for(const partner of partners.get(focusId)||[]){const related=kinship(partner,p.id);if(related){label=['Parent','Sibling','Child','Grandparent','Grandchild'].includes(related)?related+'-in-law':related+' by marriage';break}}}
  if(!label){for(const partner of partners.get(p.id)||[]){const related=kinship(focusId,partner);if(related){label=['Parent','Sibling','Child','Grandparent','Grandchild'].includes(related)?related+'-in-law':related+' by marriage';break}}}
  labels.set(p.id,label||'Extended family');
 }return labels;
}
let relationshipTrace=null,lastRelationshipResult=null;
function findRelationship(from,to){
 if(!person(from)||!person(to))return null;
 if(from===to)return {from,to,ids:[from],edges:[],label:'Same person'};
 const label=relationshipLabels(from).get(to),bloodOnly=!/Spouse|in-law|marriage|Extended/.test(label);
 const previous=new Map([[from,null]]),queue=[from];
 for(let i=0;i<queue.length&&!previous.has(to);i++)for(const edge of connections(queue[i])){
  if(previous.has(edge.id)||(bloodOnly&&edge.type==='spouse'))continue;previous.set(edge.id,{from:queue[i],type:edge.type});queue.push(edge.id);if(edge.id===to)break;
 }
 if(!previous.has(to))return null;
 const ids=[to],edges=[];let current=to;
 while(current!==from){const step=previous.get(current);edges.push({from:step.from,to:current,type:step.type});ids.push(step.from);current=step.from}
 return {from,to,ids:ids.reverse(),edges:edges.reverse(),label};
}
function relationshipPathLines(layout){
 if(!relationshipTrace)return '';const {positions,families}=layout,normal=familyRoutes(layout),highlights=[];
 for(const edge of relationshipTrace.edges){
  const a=positions.get(edge.from),b=positions.get(edge.to);if(!a||!b)continue;
  let points,group='relationship-trace';
  if(edge.type==='parent'||edge.type==='child'){
   const parent=edge.type==='parent'?edge.to:edge.from,child=edge.type==='parent'?edge.from:edge.to;
   const family=families.find(f=>f.parents.includes(parent)&&f.children.includes(child));if(!family)continue;
   group='family-'+[...family.parents].sort().join('-');const stem=normal.find(r=>r.key===group+'-stem'),drop=normal.find(r=>r.key===group+'-child-'+child);if(!stem||!drop)continue;
   const par=positions.get(parent);points=family.parents.length>1?[[par.x,par.y+36],...stem.points]:[...stem.points];points.push(...drop.points);
  }else if(edge.type==='sibling'){
   const family=families.find(f=>f.children.includes(edge.from)&&f.children.includes(edge.to));
   if(family){group='family-'+[...family.parents].sort().join('-');const bus=normal.find(r=>r.key===group+'-bus');const y=bus.points[0][1];points=[[a.x,a.y-70],[a.x,y],[b.x,y],[b.x,b.y-70]]}
   else{group='siblings';const y=Math.min(a.y,b.y)-88;points=[[a.x,a.y-70],[a.x,y],[b.x,y],[b.x,b.y-70]]}
  }else points=[[a.x,a.y+36],[b.x,b.y+36]];
  const route={group,points};highlights.push(`<path class="relationship-highlight" d="${connectorPath(route,normal)}" fill="none" stroke="#b47528" stroke-width="4" stroke-linejoin="round" ${edge.type==='sibling'?'stroke-dasharray="5 5"':''}/>`);
 }return highlights.join('');
}
function showSelectedPersonPath(id){
 const result=findRelationship(data.root,id);
 if(!result){notify('No connecting path is recorded for these people.');return}
 relationshipTrace=result;
 data.visible=[...new Set([...data.visible,...result.ids])];
 data.selected=id;save();render();fitGraph();
}
function clearRelationshipPath(){relationshipTrace=null;$('#relationshipBanner').hidden=true;render()}
function showRelationshipPath(result){
 if(!result)return;relationshipTrace=result;data.root=result.from;data.visible=[...result.ids];data.expanded=[];$('#search').value=person(result.from).name;
 data.selected=result.from;save();tab(false);render();fitGraph();
}
function populateRelationshipFinder(){
 if(!sharedReady){notify('Wait for the family database to load.');return}
 const people=[...data.people].sort((a,b)=>a.name.localeCompare(b.name));const options='<option value="">Choose a person…</option>'+people.map(p=>`<option value="${p.id}">${esc(displayName(p))}</option>`).join('');
 const previousFrom=$('#relationshipFrom').value,previousTo=$('#relationshipTo').value;
 $('#relationshipFrom').innerHTML=options;$('#relationshipTo').innerHTML=options;
 $('#relationshipFrom').value=person(previousFrom)?previousFrom:data.selected||data.root||'';$('#relationshipTo').value=person(previousTo)?previousTo:data.root&&data.root!==data.selected?data.root:'';
 setupRelationshipSearch('relationshipFrom');setupRelationshipSearch('relationshipTo');
 $('#relationshipResult').replaceChildren();
}
function visibleFromExpanded(root,expanded){
 const visible=new Set();if(!person(root))return [];const open=new Set(expanded),queue=[root];visible.add(root);
 for(let i=0;i<queue.length;i++){const id=queue[i];if(!open.has(id))continue;for(const c of connections(id))if(!visible.has(c.id)){visible.add(c.id);queue.push(c.id)}}return [...visible];
}
function collapseBranch(id){
 relationshipTrace=null;
 if(!data.expanded.includes(id))return;data.expanded=data.expanded.filter(personId=>personId!==id);data.visible=visibleFromExpanded(data.root,data.expanded);data.expanded=data.expanded.filter(personId=>data.visible.includes(personId));if(!data.visible.includes(data.selected))data.selected=data.root;save();render();notify('Branch collapsed. Shared connections stay visible.');
}
function expand(id){if(!person(id))return;const relatives=connections(id);relationshipTrace=relatives.length?{from:id,to:id,immediate:true,ids:[id,...relatives.map(c=>c.id)],edges:relatives.map(c=>({from:id,to:c.id,type:c.type})),label:'Immediate family'}:null;data.selected=id;if(!data.visible.includes(id))data.visible.push(id);for(const c of connections(id))if(!data.visible.includes(c.id))data.visible.push(c.id);if(relationshipTrace)for(const pathId of relationshipTrace.ids)if(!data.visible.includes(pathId))data.visible.push(pathId);if(!data.expanded.includes(id))data.expanded.push(id);save();render({expanding:true,centerId:id})}
function start(id){if(new URLSearchParams(location.hash.slice(1)).has('editPerson')){const url=new URL(location.href);url.hash='';history.replaceState(null,'',url)}$('#familyMapPage').hidden=true;$('#mapTab').classList.remove('active');rememberSection('tree');$('#relationships').hidden=true;$('#openRelationshipFinder').classList.remove('active');$('#timeline').hidden=true;$('#editor').hidden=true;$('#explore').hidden=false;$('#treeTab').classList.add('active');$('#peopleTab').classList.remove('active');$('#timelineTab').classList.remove('active');relationshipTrace=null;data.visible=[];data.expanded=[];data.root=id;closeSearch();$('#search').value=displayName(person(id));expand(id)}
const familyColors={parent:'#d6b345',child:'#b58bdd',sibling:'#2a9ca5',spouse:'#e7794e',self:'#8b78c5'};
let graphScale=1, graphLayout=null, renderedRoot=null, cameraPadded=false;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const treeAnimations=new Set();
function animateTree(element,frames,options){if(reducedMotion.matches)return;const animation=element.animate(frames,options);treeAnimations.add(animation);animation.finished.catch(()=>{}).finally(()=>treeAnimations.delete(animation));return animation}
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)for(const animation of treeAnimations)animation.cancel()});
function layoutFamily(ids){
 const root=ids.includes(data.root)?data.root:ids[0],visible=new Set(ids),levels=new Map([[root,0]]),branches=new Map(),queue=[root];
 for(let i=0;i<queue.length;i++){const id=queue[i];for(const c of connections(id)){if(!visible.has(c.id)||levels.has(c.id))continue;levels.set(c.id,levels.get(id)+(c.type==='parent'?-1:c.type==='child'?1:0));branches.set(c.id,branches.get(id)||c.type);queue.push(c.id)}}
 for(const id of ids)if(!levels.has(id))levels.set(id,0);
 const families=new Map();for(const child of ids){const parents=connectionsDirect(child).filter(c=>c.type==='parent'&&visible.has(c.id)&&levels.get(c.id)<levels.get(child)).map(c=>c.id).sort();if(!parents.length)continue;const key=parents.join('|');if(!families.has(key))families.set(key,{parents,children:[]});families.get(key).children.push(child)}
 const rows=new Map();for(const id of ids){const level=levels.get(id);if(!rows.has(level))rows.set(level,[]);rows.get(level).push(id)}
 // Group immediate family into a single row block, then keep each relationship short.
 const blocks=new Map();for(const [level,row] of rows){
  const sets=row.map(id=>[id]),edges=new Map();
  function join(a,b,weight){if(a===b||!row.includes(a)||!row.includes(b))return;const key=[a,b].sort().join('|');const old=edges.get(key);if(!old||weight>old.weight)edges.set(key,{a,b,weight});const x=sets.find(g=>g.includes(a)),y=sets.find(g=>g.includes(b));if(x&&y&&x!==y){x.push(...y);sets.splice(sets.indexOf(y),1)}}
  for(const id of row)for(const c of connections(id))if(c.type==='spouse'||c.type==='sibling')join(id,c.id,c.type==='sibling'?4:3);
  for(const f of families.values())for(let i=1;i<f.parents.length;i++)join(f.parents[0],f.parents[i],3);
  for(const group of sets){
   const links=[...edges.values()].filter(e=>group.includes(e.a)&&group.includes(e.b));
   const cost=order=>{const index=new Map(order.map((id,i)=>[id,i]));return links.reduce((sum,e)=>sum+e.weight*Math.abs(index.get(e.a)-index.get(e.b)),0)};
   // Partner units are indivisible: sibling placement cannot split a couple.
   const units=group.map(id=>[id]);
   function unitePartners(a,b){const x=units.find(u=>u.includes(a)),y=units.find(u=>u.includes(b));if(x&&y&&x!==y){x.push(...y);units.splice(units.indexOf(y),1)}}
   const hasSpouse=id=>connectionsDirect(id).some(c=>c.type==='spouse'&&group.includes(c.id));
   for(const id of group)for(const c of connectionsDirect(id))if(c.type==='spouse')unitePartners(id,c.id);
   // Known co-parents without recorded spouses stay paired as well.
   for(const f of families.values())if(f.parents.length===2&&f.parents.every(id=>group.includes(id)&&!hasSpouse(id)))unitePartners(f.parents[0],f.parents[1]);
   let best=cost(units.flat());
   for(let pass=0;pass<group.length;pass++){
    let changed=false;
    // Orient each couple so the sibling is on the side nearest their family.
    for(const unit of units){unit.reverse();const score=cost(units.flat());if(score<best){best=score;changed=true}else unit.reverse()}
    // Move complete units, never individual spouses, when shortening connections.
    for(let i=0;i<units.length-1;i++)for(let j=i+1;j<units.length;j++){
     const candidate=[...units.slice(0,i),...units.slice(i,j+1).reverse(),...units.slice(j+1)];const score=cost(candidate.flat());
     if(score<best){units.splice(0,units.length,...candidate);best=score;changed=true}
    }
    if(!changed)break;
   }
   group.splice(0,group.length,...units.flat());
  }
  blocks.set(level,sets)
 }
 const familyRows=new Map();for(const f of families.values()){const level=levels.get(f.children[0]);familyRows.set(level,(familyRows.get(level)||0)+1)}
 const generationGap=255+Math.max(0,...[...familyRows.values()].map(n=>n-1))*16;
 const min=Math.min(...levels.values()),max=Math.max(...levels.values()),positions=new Map(),rowWidth=Math.max(...[...rows.values()].map(r=>r.length))*210+100;
 function placeRow(level,alignParents=false){
  const groups=blocks.get(level);if(!groups)return;const count=groups.reduce((n,g)=>n+g.length,0);let x=alignParents?100:(rowWidth-(count-1)*210)/2;
  for(const group of groups){
   if(alignParents){const parents=[...new Set(group.flatMap(id=>connectionsDirect(id).filter(c=>c.type==='parent'&&positions.has(c.id)).map(c=>c.id)))];if(parents.length){const center=parents.reduce((sum,id)=>sum+positions.get(id).x,0)/parents.length;const desired=center-(group.length-1)*105;x=Math.max(desired,x)}}
   for(const id of group){positions.set(id,{x,y:(level-min)*generationGap+110});x+=210}
  }
 }
 for(let level=min;level<=max;level++)placeRow(level);
 // Align branches with their parents, without allowing cards to overlap.
 for(let pass=0;pass<4;pass++){for(let level=min+1;level<=max;level++){const groups=blocks.get(level);if(!groups)continue;const score=group=>{const ps=group.flatMap(id=>connectionsDirect(id).filter(c=>c.type==='parent'&&positions.has(c.id)).map(c=>positions.get(c.id).x));return ps.length?ps.reduce((n,x)=>n+x,0)/ps.length:group.reduce((n,id)=>n+positions.get(id).x,0)/group.length};groups.sort((a,b)=>score(a)-score(b));placeRow(level,true)}}
 // Remove unused leading space left behind by parent-aligned rows before fitting.
 const leftEdge=Math.min(...[...positions.values()].map(p=>p.x))-110;
 for(const position of positions.values())position.x-=leftEdge;
 return {positions,branches,root,families:[...families.values()],levels,width:Math.max(...[...positions.values()].map(p=>p.x+110)),height:(max-min)*generationGap+230};
}
function familyRoutes(layout){
 const {positions,families}=layout,routes=[],lanes=new Map(),paired=new Set(),stems=[];
 const add=(key,group,points,dashed=false)=>routes.push({key,group,points,dashed});
 for(const f of families){
  const group='family-'+[...f.parents].sort().join('-'),ps=f.parents.map(id=>positions.get(id)),cs=f.children.map(id=>positions.get(id));
  const left=Math.min(...ps.map(p=>p.x)),right=Math.max(...ps.map(p=>p.x)),center=(left+right)/2,rowY=Math.max(...ps.map(p=>p.y));
  const lane=lanes.get(rowY)||0;lanes.set(rowY,lane+1);const bus=rowY+108+lane*16,start=ps.length===1?ps[0].y+74:rowY+36;
  // A parent's trunk must not lie on another family's child drop.
  const foreignDrops=families.filter(other=>other!==f).flatMap(other=>other.children.map(id=>positions.get(id))).filter(p=>p.y>rowY&&p.y<=Math.min(...cs.map(c=>c.y)));
  let trunk=center;
  const blocked=x=>foreignDrops.some(p=>Math.abs(p.x-x)<14)||stems.some(stem=>stem.rowY===rowY&&Math.abs(stem.x-x)<14);
  for(let offset=1;blocked(trunk)&&offset<40;offset++)trunk=center+(offset%2?1:-1)*Math.ceil(offset/2)*22;
  stems.push({x:trunk,rowY});
  if(ps.length>1){add(group+'-parents',group,[[left,rowY+36],[right,rowY+36]]);for(let i=0;i<f.parents.length;i++)for(let j=i+1;j<f.parents.length;j++)paired.add([f.parents[i],f.parents[j]].sort().join('|'))}
  const stem=trunk===center?[[center,start],[center,bus]]:[[center,start],[center,rowY+90],[trunk,rowY+90],[trunk,bus]];
  add(group+'-stem',group,stem);
  const xs=[trunk,...cs.map(c=>c.x)];add(group+'-bus',group,[[Math.min(...xs),bus],[Math.max(...xs),bus]]);
  cs.forEach((c,i)=>add(group+'-child-'+f.children[i],group,[[c.x,bus],[c.x,c.y-70]]));
 }
 for(const id of data.visible)for(const c of connectionsDirect(id)){
  if(c.type!=='spouse'||!positions.has(c.id))continue;const pair=[id,c.id].sort().join('|');if(paired.has(pair))continue;paired.add(pair);
  const a=positions.get(id),b=positions.get(c.id),key='spouse-'+[id,c.id].sort().join('-');add(key,key,[[a.x,a.y+36],[b.x,a.y+36]]);
 }
 const siblings=new Set();for(const id of data.visible)for(const c of connectionsDirect(id)){
  if(c.type!=='sibling'||!positions.has(c.id))continue;const pair=[id,c.id].sort().join('|');if(siblings.has(pair)||families.some(f=>f.children.includes(id)&&f.children.includes(c.id)))continue;siblings.add(pair);
  const a=positions.get(id),b=positions.get(c.id),y=Math.min(a.y,b.y)-88,key='sibling-'+[id,c.id].sort().join('-');add(key,key,[[a.x,a.y-70],[a.x,y],[b.x,y],[b.x,b.y-70]],true);
 }
 return mergeSiblingRoutes(routes);
}
function mergeSiblingRoutes(routes){
 const solid=routes.filter(route=>!route.dashed),segments=new Map();
 for(const route of routes.filter(route=>route.dashed))for(let i=1;i<route.points.length;i++){
  const [ax,ay]=route.points[i-1],[bx,by]=route.points[i];if(ax===bx&&ay===by)continue;
  const horizontal=ay===by,fixed=horizontal?ay:ax,key=(horizontal?'h':'v')+':'+fixed;
  if(!segments.has(key))segments.set(key,{horizontal,fixed,intervals:[]});
  segments.get(key).intervals.push([Math.min(horizontal?ax:ay,horizontal?bx:by),Math.max(horizontal?ax:ay,horizontal?bx:by)]);
 }
 // Each shared sibling rail/drop is painted once, so dash phases cannot fill gaps.
 for(const {horizontal,fixed,intervals} of segments.values()){
  intervals.sort((a,b)=>a[0]-b[0]);const merged=[];
  for(const interval of intervals){const last=merged.at(-1);if(last&&interval[0]<=last[1])last[1]=Math.max(last[1],interval[1]);else merged.push([...interval])}
  for(const [from,to] of merged)solid.push({key:`siblings-${horizontal?'h':'v'}-${fixed}-${from}-${to}`,group:'siblings',dashed:true,points:horizontal?[[from,fixed],[to,fixed]]:[[fixed,from],[fixed,to]]});
 }
 return solid;
}
function connectorPath(route,routes){
 const commands=[];
 for(let i=1;i<route.points.length;i++){
  const [x1,y1]=route.points[i-1],[x2,y2]=route.points[i];
  if(x1!==x2){commands.push(`M ${x1} ${y1} H ${x2}`);continue}
  const low=Math.min(y1,y2),high=Math.max(y1,y2),cuts=[];
  for(const other of routes){if(other.group===route.group)continue;for(let j=1;j<other.points.length;j++){
   const [ax,ay]=other.points[j-1],[bx,by]=other.points[j];
   if(ay!==by||ax===bx)continue;
   if(x1>=Math.min(ax,bx)&&x1<=Math.max(ax,bx)&&ay>=low&&ay<=high)cuts.push([Math.max(low,ay-7),Math.min(high,ay+7)]);
  }}
  // Gaps indicate crossings, while actual family junctions remain continuous.
  cuts.sort((a,b)=>a[0]-b[0]);let cursor=low;const pieces=[];
  for(const [from,to] of cuts){if(from>cursor)pieces.push([cursor,from]);cursor=Math.max(cursor,to)}if(cursor<high)pieces.push([cursor,high]);
  if(y2<y1)pieces.reverse();for(const [from,to] of pieces)commands.push(`M ${x1} ${y2<y1?to:from} V ${y2<y1?from:to}`);
 }
 return commands.join(' ');
}
function familyLines(layout){
 const routes=familyRoutes(layout);
 return routes.map(route=>`<path data-edge="${route.key}" d="${connectorPath(route,routes)}" fill="none" stroke="#8c9c8c" stroke-width="2" stroke-linejoin="round" ${route.dashed?'stroke-dasharray="5 5"':''}/>`).join('');
}
function setGraphScale(scale,{animate=true,fromTransform=null}={}){
 if(!graphLayout)return;const g=$('#graph'),scene=$('#scene');
 const before=fromTransform||getComputedStyle(scene).transform;
 for(const motion of scene.getAnimations())motion.cancel();
 graphScale=Math.max(.2,Math.min(2,scale));const w=graphLayout.width*graphScale,h=graphLayout.height*graphScale;
 $('#graphSpace').style.width=Math.max(g.clientWidth,w+(cameraPadded?g.clientWidth:0))+'px';$('#graphSpace').style.height=Math.max(g.clientHeight,h+(cameraPadded?g.clientHeight:0))+'px';scene.style.width=graphLayout.width+'px';scene.style.height=graphLayout.height+'px';
 const target=`translate(${cameraPadded?g.clientWidth/2:Math.max(0,(g.clientWidth-w)/2)}px,${cameraPadded?g.clientHeight/2:Math.max(0,(g.clientHeight-h)/2)}px) scale(${graphScale})`;
 scene.style.transform=target;$('#zoomLevel').textContent=Math.round(graphScale*100)+'%';
 if(animate&&before!=='none')animateTree(scene,[{transform:before},{transform:target}],{duration:700,easing:'cubic-bezier(.22,1,.36,1)'});
}
function fitGraph(options={}){if(!graphLayout)return;const {expanding=false,...animationOptions}=options;cameraPadded=false;const fitted=Math.max(.2,Math.min(1,($('#graph').clientWidth-48)/graphLayout.width,($('#graph').clientHeight-96)/graphLayout.height));const scale=expanding?(graphScale<.75?graphScale:Math.max(.75,Math.min(graphScale,fitted))):fitted;setGraphScale(scale,animationOptions);$('#graph').scrollTo({left:0,top:0,behavior:reducedMotion.matches?'instant':'smooth'})}
function centerPerson(id){
 if(!person(id)||!data.visible.includes(id))return;
 data.selected=id;save();render({centerId:id});
}
function centerGraphOnPerson(id,scale,oldTransform){
 const position=graphLayout?.positions.get(id);if(!position)return;
 const graph=$('#graph'),scene=$('#scene'),left=graph.scrollLeft,top=graph.scrollTop;
 cameraPadded=true;setGraphScale(scale,{animate:false});
 graph.scrollTo({left:position.x*graphScale,top:position.y*graphScale,behavior:'instant'});
 // Compensate for the new scroll position so the camera has one continuous transition.
 if(oldTransform!=='none'){
  const before=new DOMMatrixReadOnly(oldTransform);
  const start=`matrix(${before.a},${before.b},${before.c},${before.d},${before.e+graph.scrollLeft-left},${before.f+graph.scrollTop-top})`;
  animateTree(scene,[{transform:start},{transform:scene.style.transform}],{duration:700,easing:'cubic-bezier(.22,1,.36,1)'});
 }
}
function animateFamilyLines(previousLines){
 if(reducedMotion.matches)return;const svg=$('#lines'),ns='http://www.w3.org/2000/svg';let index=0;
 for(const path of [...svg.querySelectorAll('[data-edge]')]){
  const old=previousLines.get(path.dataset.edge);
  if(old){if(old!==path.getAttribute('d'))animateTree(path,[{opacity:.2},{opacity:1}],{duration:500});continue}
  // Reveal through a mask so dashed sibling lines retain their dash pattern.
  const mask=document.createElementNS(ns,'mask'),reveal=document.createElementNS(ns,'path');
  const maskId='connection-reveal-'+(++animateFamilyLines.serial);mask.id=maskId;mask.setAttribute('maskUnits','userSpaceOnUse');mask.setAttribute('x','-10');mask.setAttribute('y','-10');mask.setAttribute('width',graphLayout.width+20);mask.setAttribute('height',graphLayout.height+20);
  reveal.setAttribute('d',path.getAttribute('d'));reveal.setAttribute('fill','none');reveal.setAttribute('stroke','white');reveal.setAttribute('stroke-width','8');reveal.setAttribute('pathLength','1');mask.append(reveal);svg.append(mask);path.setAttribute('mask',`url(#${maskId})`);
  const animation=animateTree(reveal,[{strokeDasharray:'1',strokeDashoffset:'1'},{strokeDasharray:'1',strokeDashoffset:'0'}],{duration:850,delay:Math.min(index++*45,300),easing:'cubic-bezier(.4,0,.2,1)',fill:'backwards'});
  animation?.finished.catch(()=>{}).finally(()=>{path.removeAttribute('mask');mask.remove()});
 }
}
animateFamilyLines.serial=0;
function render({expanding=false,centerId=null}={}){
 if(relationshipTrace?.ids.some(id=>!person(id)))relationshipTrace=null;
 $('#canvas').classList.toggle('showing-relationship',!!relationshipTrace&&!relationshipTrace.immediate);$('#relationshipBanner').hidden=!relationshipTrace||!!relationshipTrace.immediate;
 if(relationshipTrace){$('#relationshipSummary').textContent=relationshipTrace.immediate?`${displayName(person(relationshipTrace.from))} · Immediate family`:`${displayName(person(relationshipTrace.from))} → ${displayName(person(relationshipTrace.to))} · ${relationshipTrace.label}`;}
 const oldRoot=renderedRoot,oldLayout=graphLayout,oldTransform=getComputedStyle($('#scene')).transform;
 const focusedCard=document.activeElement?.closest('.node')?.dataset.id;
 const oldNodes=new Map([...document.querySelectorAll('.node')].map(node=>[node.dataset.id,node]));
 const oldLines=new Map([...document.querySelectorAll('#lines [data-edge]')].map(path=>[path.dataset.edge,path.getAttribute('d')]));
 data.visible=data.visible.filter(id=>person(id));const ids=data.visible;$('#empty').hidden=ids.length>0;$('#graph').hidden=!ids.length;$('#graphTools').hidden=!ids.length;$('#backToStart').hidden=!ids.length;$('#count').textContent=`${ids.length} ${ids.length===1?'person':'people'} in view`;if(!ids.length){graphLayout=null;renderedRoot=null;$('#nodes').replaceChildren();$('#lines').replaceChildren();for(const animation of treeAnimations)animation.cancel();renderDetails();return}
 graphLayout=layoutFamily(ids);const {positions,branches,root,width,height}=graphLayout;
 const focus=person(data.selected)?data.selected:root;const labels=relationshipLabels(focus),sameTree=oldRoot===root&&!!oldLayout;
 const fragment=document.createDocumentFragment();let entering=0;
 for(const id of ids){
  const p=person(id),pos=positions.get(id),isRoot=id===root,kind=isRoot?'self':branches.get(id)||'sibling';
  const relation=labels.get(id)||'Extended family';
  const existing=sameTree?oldNodes.get(id):null,node=existing||document.createElement('button');
  // Reuse cards to keep focus and avoid replaying entrances when selection changes.
  const currentMatrix=existing?new DOMMatrixReadOnly(getComputedStyle(node).transform):null;
  const before=existing?{x:parseFloat(node.style.left)+currentMatrix.e+node.offsetWidth/2,y:parseFloat(node.style.top)+currentMatrix.f+node.offsetHeight/2}:null;
  node.className=`node ${id===data.selected?'selected':''} ${isRoot?'root-node':''} ${relationshipTrace&&!relationshipTrace.immediate?(relationshipTrace.ids.includes(id)?'path-member':'path-muted'):''}`;node.dataset.id=id;node.style.left=pos.x+'px';node.style.top=pos.y+'px';node.style.setProperty('--bubble',familyColors[kind]);node.setAttribute('aria-label',`${displayName(p)}, ${relation}. Reveal connections`);
  const contents=`${avatar(p)}<strong>${esc(displayName(p))}</strong><small>${relation}</small>`;if(node.innerHTML!==contents)node.innerHTML=contents;
  node.onclick=()=>expand(id);node.ondblclick=()=>centerPerson(id);node.title='Click to reveal immediate family and center';fragment.append(node);
  for(const animation of node.getAnimations())animation.cancel();
  if(before&&(before.x!==pos.x||before.y!==pos.y))animateTree(node,[{transform:`translate(calc(-50% + ${before.x-pos.x}px),calc(-50% + ${before.y-pos.y}px))`},{transform:'translate(-50%,-50%)'}],{duration:700,easing:'cubic-bezier(.22,1,.36,1)'});
  else if(!existing)animateTree(node,[{opacity:0,transform:'translate(-50%,calc(-50% + 20px)) scale(.86)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)'}],{duration:650,delay:180+Math.min(entering++*65,390),easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
 }
 $('#nodes').replaceChildren(fragment);
 if(focusedCard){const restored=[...$('#nodes').children].find(node=>node.dataset.id===focusedCard);restored?.focus({preventScroll:true})}
 const svg=$('#lines');svg.setAttribute('width',width);svg.setAttribute('height',height);svg.innerHTML=familyLines(graphLayout)+relationshipPathLines(graphLayout);
 animateFamilyLines(sameTree?oldLines:new Map());
 const layoutChanged=!sameTree||width!==oldLayout.width||height!==oldLayout.height||ids.length!==oldNodes.size;
 if(centerId){
  const fitted=Math.max(.2,Math.min(1,($('#graph').clientWidth-48)/width,($('#graph').clientHeight-96)/height));
  const scale=expanding&&sameTree?(graphScale<.75?graphScale:Math.max(.75,Math.min(graphScale,fitted))):expanding?Math.max(.75,fitted):graphScale;
  centerGraphOnPerson(centerId,scale,oldTransform);
 }else if(layoutChanged){
  // Start a new search slightly closer, then ease out to reveal the full family.
  if(!sameTree){setGraphScale(1.18,{animate:false});fitGraph()}
  else fitGraph({fromTransform:oldTransform,expanding});
 }
 renderedRoot=root;renderDetails()
}
function renderDetails(){
 renderDetailsContent();
 if(relationshipTrace&&!relationshipTrace.immediate&&data.selected===relationshipTrace.to){
  const path=document.createElement('div');path.className='selected-person-path';
  path.innerHTML=`<h3>Path from ${esc(displayName(person(relationshipTrace.from)))}</h3><p>${esc(relationshipTrace.label)}</p><ol>${relationshipTrace.ids.map((id,i)=>`<li>${i?`<small>${esc(relationshipTrace.edges[i-1].type)} → </small>`:''}${esc(displayName(person(id)))}</li>`).join('')}</ol>`;
  $('#details').append(path);
 }
}
function renderDetailsContent(){const p=person(data.selected);if(!p){renderSuggestions();return}$('#details').innerHTML=`<p class="eyebrow">A CLOSER LOOK</p>${avatar(p)}<h2>${esc(p.name)}</h2><p class="label-context">Tree labels are relative to this person.</p><div class="person-view-actions"><button id="sharePerson">Copy person link</button><button id="traceSelected" ${!data.root||data.root===p.id?'hidden':''}>Show path from starting person</button><button id="centerSelected">◎ Center person</button><button id="collapseSelected" ${data.expanded.includes(p.id)?'':'disabled'}>− Collapse branch</button></div><p>${esc(p.bio||'Their story is waiting to be told.')}</p>${p.birthday?`<p>Birthday · ${esc(p.birthday)}</p>`:''}${p.location?`<p>⌖ ${esc(p.location)}</p>`:''}<h3>Add to ${esc(p.name.split(/\s+/)[0])}’s family</h3><div class="quick-add">${["parent","sibling","spouse","child"].map(type=>`<button data-add-family="${type}">＋ Add ${type}</button>`).join("")}</div><h3>Family connections</h3>${connections(p.id).map(c=>`<button class="connection" data-id="${c.id}">${esc(person(c.id).name)} <span>· ${c.type}</span></button>`).join('')||'<p>No connections added yet.</p>'}<button id="editSelected">Edit person ↗</button>`;document.querySelectorAll('.connection').forEach(b=>b.onclick=()=>expand(b.dataset.id));$('#editSelected').onclick=()=>{tab(true);edit(p.id)};$('#traceSelected').onclick=()=>showSelectedPersonPath(p.id);$('#sharePerson').onclick=()=>copyDirectLink({person:p.id});$('#centerSelected').onclick=()=>centerPerson(p.id);$('#collapseSelected').onclick=()=>collapseBranch(p.id);document.querySelectorAll('[data-add-family]').forEach(b=>b.onclick=()=>openFamilyDialog(p.id,b.dataset.addFamily))}
let suggestedPeople=[];
function renderSuggestions(reshuffle=false){
 if(reshuffle||!suggestedPeople.length||suggestedPeople.some(id=>!person(id))){const ids=data.people.map(p=>p.id);for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}suggestedPeople=ids.slice(0,14)}
 $('#details').innerHTML='<p class="eyebrow">A CLOSER LOOK</p><div class="sidebar-welcome"><div class="welcome-heart" aria-hidden="true">♡</div><h2>Meet your people.</h2><p>Select a person to see their story and family connections.</p></div>';
 $('#emptySuggestions').innerHTML=`<div class="suggested-people">${suggestedPeople.map(id=>{const p=person(id);return `<button data-suggested="${id}">${avatar(p)}<span>${esc(displayName(p))}</span><span aria-hidden="true">↗</span></button>`}).join('')||'<p>Add a person to begin your family tree.</p>'}<div class="suggestion-search"><input id="suggestionSearch" type="search" placeholder="Find someone else…" aria-label="Find someone in the family" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggestionMatches" autocomplete="off"><div id="suggestionMatches" role="listbox" hidden></div></div></div>${data.people.length?'<button id="shufflePeople">↻ Show other people</button>':''}`;
 document.querySelectorAll('[data-suggested]').forEach(button=>button.onclick=()=>start(button.dataset.suggested));if($('#shufflePeople'))$('#shufflePeople').onclick=()=>renderSuggestions(true);setupSuggestionSearch();
}
function setupSuggestionSearch(){
 const input=$('#suggestionSearch'),list=$('#suggestionMatches');let matches=[],active=-1;
 function close(){list.hidden=true;active=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant')}
 function highlight(){[...list.querySelectorAll('button')].forEach((button,i)=>{button.classList.toggle('search-active',i===active);button.setAttribute('aria-selected',String(i===active))});if(active>=0){input.setAttribute('aria-activedescendant','suggestion-match-'+active);list.children[active]?.scrollIntoView({block:'nearest'})}}
 function search(){const query=input.value.trim().toLocaleLowerCase();active=-1;input.removeAttribute('aria-activedescendant');if(!query){matches=[];close();return}matches=data.people.filter(p=>p.name.toLocaleLowerCase().includes(query)||displayName(p).toLocaleLowerCase().includes(query)).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,10);list.innerHTML=matches.map((p,i)=>`<button type="button" role="option" id="suggestion-match-${i}" aria-selected="false">${esc(displayName(p))}</button>`).join('')||'<p>No matching people.</p>';list.hidden=false;input.setAttribute('aria-expanded','true');list.querySelectorAll('button').forEach((button,i)=>button.onclick=()=>start(matches[i].id))}
 input.oninput=search;input.onfocus=search;
 input.onkeydown=event=>{if(event.isComposing)return;if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(list.hidden)search();if(matches.length&&!list.hidden){active=active<0?(event.key==='ArrowDown'?0:matches.length-1):(active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;highlight()}}else if(event.key==='Enter'){event.preventDefault();if(!list.hidden&&matches.length)start(matches[Math.max(0,active)].id)}else if(event.key==='Escape'||event.key==='Tab')close()};
 input.parentElement.onfocusout=event=>{if(!event.currentTarget.contains(event.relatedTarget))close()};
}
function similarity(a,b){a=a.toLowerCase();b=b.toLowerCase();if(a.includes(b)||b.includes(a))return 0;let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]!==b[j-1]));row=next}return row[b.length]/Math.max(a.length,b.length)}
let activeSearchIndex=-1;
function closeSearch(){activeSearchIndex=-1;$('#results').innerHTML='';$('#search').setAttribute('aria-expanded','false');$('#search').removeAttribute('aria-activedescendant')}
function highlightSearch(index){const options=[...document.querySelectorAll('[data-match]')];if(!options.length)return;activeSearchIndex=(index+options.length)%options.length;options.forEach((option,i)=>{option.classList.toggle('search-active',i===activeSearchIndex);option.setAttribute('aria-selected',String(i===activeSearchIndex))});const active=options[activeSearchIndex];$('#search').setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest'})}
function handleSearchKey(event){
 if(event.isComposing)return;
 if(event.key==='Escape'){event.preventDefault();closeSearch();return}
 if(event.key==='Tab'){closeSearch();return}
 if(event.key==='ArrowDown'||event.key==='ArrowUp'){
  event.preventDefault();if(!$('#results').children.length)search();
  const options=[...document.querySelectorAll('[data-match]')];if(!options.length)return;
  highlightSearch(activeSearchIndex<0?(event.key==='ArrowDown'?0:options.length-1):activeSearchIndex+(event.key==='ArrowDown'?1:-1));return;
 }
 if(event.key==='Enter'){
  event.preventDefault();const options=[...document.querySelectorAll('[data-match]')];
  if(activeSearchIndex>=0&&options[activeSearchIndex]){start(options[activeSearchIndex].dataset.match);return}
  const q=$('#search').value.trim().toLowerCase(),exact=data.people.filter(p=>p.name.toLowerCase()===q);
  if(exact.length===1)start(exact[0].id);else if(options.length)start(options[0].dataset.match);else search();
 }
}
function search(){activeSearchIndex=-1;$('#search').removeAttribute('aria-activedescendant');const query=$('#search').value.trim();if(!query){closeSearch();return}const matches=data.people.map(p=>({p,score:similarity(p.name,query)})).filter(m=>m.score<.65).sort((a,b)=>a.score-b.score).slice(0,5);$('#search').setAttribute('aria-expanded','true');$('#results').innerHTML='<div id="searchMatches" role="listbox" aria-label="Matching people">'+matches.map((m,i)=>`<button id="search-option-${i}" role="option" aria-selected="false" tabindex="-1" data-match="${m.p.id}">${esc(m.p.name)} ↗</button>`).join('')+'</div>'+`<p>${matches.length?'Someone missing?':'No matching people yet.'}</p><button id="request">Request “${esc(query)}” by email ↗</button>`;document.querySelectorAll('[data-match]').forEach((b,i)=>{b.onclick=()=>start(b.dataset.match);b.onmouseenter=()=>highlightSearch(i)});$('#request').onclick=()=>{if(!data.email){notify('Set the requests recipient email in the People section.');tab(true);$('#requestEmail').focus();return}window.location.href=`mailto:${encodeURIComponent(data.email)}?subject=${encodeURIComponent('Family tree: add '+query)}&body=${encodeURIComponent('Hello,\n\nPlease add '+query+' to our family tree.\n\nRelationship and other details:\n\nThank you!')}`}}
function savedSection(){try{const section=localStorage.getItem('kinfolk-section-v1');return ['tree','people','timeline','relationships','map'].includes(section)?section:'tree'}catch{return 'tree'}}
function rememberSection(section){try{localStorage.setItem('kinfolk-section-v1',section)}catch{}}
function showSection(section){
 if(!$('#timeline').hidden)saveTimelinePosition();
 if(!['tree','people','timeline','relationships','map'].includes(section))section='tree';rememberSection(section);
 if(section!=='people'&&new URLSearchParams(location.hash.slice(1)).has('editPerson')){const url=new URL(location.href);url.hash='';history.replaceState(null,'',url)}
 $('#familyMapPage').hidden=section!=='map';$('#mapTab').classList.toggle('active',section==='map');$('#editor').hidden=section!=='people';$('#explore').hidden=section!=='tree';$('#timeline').hidden=section!=='timeline';$('#relationships').hidden=section!=='relationships';
 $('#treeTab').classList.toggle('active',section==='tree');$('#peopleTab').classList.toggle('active',section==='people');$('#timelineTab').classList.toggle('active',section==='timeline');$('#openRelationshipFinder').classList.toggle('active',section==='relationships');
 if(section==='people'){directory();resetLocationFinder();setupBirthplaceFinder();}else if(section==='timeline'){renderTimeline();restoreTimelinePosition();}else if(section==='map')renderFamilyMap();else if(section==='relationships')populateRelationshipFinder();else{render();fitGraph()}
}
function openRelationshipFinder(){showSection('relationships')}
function tab(editor){showSection(editor?'people':'tree')}
function birthEvents(people){
 return people.filter(p=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(p.birthday||''))return false;const date=new Date(p.birthday+'T12:00:00Z');return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===p.birthday}).sort((a,b)=>a.birthday.localeCompare(b.birthday)||a.name.localeCompare(b.name));
}
function isMilestoneVideo(media){return /^data:video\/(mp4|quicktime)[;,]/i.test(media)||/\.(mp4|mov)$/i.test(media)}
function milestoneMediaCount(items){const videos=items.filter(isMilestoneVideo).length,photos=items.length-videos;return [photos?`${photos} ${photos===1?'photo':'photos'}`:'',videos?`${videos} ${videos===1?'video':'videos'}`:''].filter(Boolean).join(' · ')}
function milestoneMediaPreview(media,className='',alt=''){
 return isMilestoneVideo(media)?`<span class="video-preview ${className}"><video src="${esc(media)}" preload="metadata" muted playsinline></video><span class="video-play-badge" aria-hidden="true">▶</span></span>`:`<img class="${className}" src="${esc(media)}" alt="${esc(alt)}">`;
}
function readVideoFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve((/\.mov$/i.test(file.name)?'data:video/quicktime;base64,':'data:video/mp4;base64,')+String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Could not read this video file.'));reader.readAsDataURL(file)})}
const milestoneTypes={new_year:'New Year’s Day',valentines_day:'Valentine’s Day',easter:'Easter',mothers_day:'Mother’s Day',memorial_day:'Memorial Day',fathers_day:'Father’s Day',independence_day:'Independence Day',labor_day:'Labor Day',halloween:'Halloween',thanksgiving:'Thanksgiving',hanukkah:'Hanukkah',christmas:'Christmas',new_years_eve:'New Year’s Eve',holiday:'Other holiday',birthday_party:'Birthday Party',marriage:'Marriage',move:'Move',graduation:'Graduation',reunion:'Family reunion',other:'Milestone'};
const milestoneIcons={new_year:'✦',valentines_day:'♡',easter:'✿',mothers_day:'❀',memorial_day:'★',fathers_day:'★',independence_day:'✦',labor_day:'★',halloween:'🎃',thanksgiving:'❧',hanukkah:'✦',christmas:'🎄',new_years_eve:'✦',holiday:'✦',birthday_party:'🎂',marriage:'♡',move:'⌂',graduation:'◇',reunion:'✳',other:'★'};
function timelineItems(){return [...birthEvents(data.people).map(p=>({kind:'birth',id:p.id,date:p.birthday,person:p})),...(data.milestones||[]).map(event=>({...event,kind:'milestone'}))].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))}
function renderTimeline(){
 const births=birthEvents(data.people),events=timelineItems(),missing=data.people.length-births.length,years=new Map();
 for(const event of events){const year=event.date.slice(0,4);if(!years.has(year))years.set(year,[]);years.get(year).push(event)}
 $('#timelineSummary').textContent=`${births.length} ${births.length===1?'birth':'births'} · ${(data.milestones||[]).length} ${(data.milestones||[]).length===1?'milestone':'milestones'}${missing?` · ${missing} ${missing===1?'person needs':'people need'} a birthday`:''}`;
 const dateFormat=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
 $('#timelineEvents').innerHTML=events.length?[...years].map(([year,items])=>`<section class="birth-year" aria-label="Family events in ${year}"><h2>${year}</h2><div class="birth-cards">${items.map(event=>{
  if(event.kind==='birth'){const p=event.person;return `<button class="birth-event" data-birth-person="${p.id}">${avatar(p)}<span><small>WELCOME TO THE FAMILY</small><strong>${esc(displayName(p))} was born</strong><time datetime="${p.birthday}">${dateFormat.format(new Date(p.birthday+'T12:00:00Z'))}</time></span><span class="birth-arrow" aria-hidden="true">↗</span></button>`}
  const names=(event.participants||[]).map(id=>person(id)?displayName(person(id)):'').filter(Boolean);
  return `<article class="birth-event milestone-event">${event.photos?.length?`<button class="milestone-gallery" data-gallery="${event.id}" aria-label="View ${event.photos.length} media items from ${esc(event.title)}">${milestoneMediaPreview(event.photos[0],'avatar milestone-cover',event.title)}</button>`:`<span class="avatar milestone-icon">${milestoneIcons[event.type]||'★'}</span>`}<button class="milestone-details" data-milestone="${event.id}"><span><small>${milestoneTypes[event.type]||'Milestone'}</small><strong>${esc(event.title)}</strong><time datetime="${event.date}">${dateFormat.format(new Date(event.date+'T12:00:00Z'))}${event.location?' · '+esc(event.location):''}</time>${names.length?`<span class="milestone-people">${esc(names.join(', '))}</span>`:''}${event.photos?.length?`<span class="milestone-photo-count">▧ ${milestoneMediaCount(event.photos)}</span>`:''}</span><span class="birth-arrow" aria-hidden="true">↗</span></button></article>`;
 }).join('')}</div></section>`).join(''):'<div class="timeline-empty"><span>✳</span><h2>A lifetime of stories starts here.</h2><p>Add birthdays in People or record your first family milestone.</p></div>';
 document.querySelectorAll('[data-birth-person]').forEach(button=>button.onclick=()=>start(button.dataset.birthPerson));
 document.querySelectorAll('[data-gallery]').forEach(button=>button.onclick=()=>{const event=data.milestones.find(event=>event.id===button.dataset.gallery);openPhotoLightbox(event.photos,0,event.title)});
 document.querySelectorAll('[data-milestone]').forEach(button=>button.onclick=()=>openMilestone(button.dataset.milestone));
}
let draftMilestonePhotos=[],milestonePhotoSession=0,processingMilestonePhotos=false;
let draftMilestonePeople=[];
function renderMilestonePeople(){
 $('#milestonePeople').innerHTML='<div id="milestonePersonTags"></div><input id="milestonePersonSearch" type="text" placeholder="Type a name to add people…" autocomplete="off" role="combobox" aria-label="Search people involved" aria-autocomplete="list" aria-expanded="false" aria-controls="milestonePersonMatches"><div id="milestonePersonMatches" role="listbox" hidden></div>';
 const input=$('#milestonePersonSearch'),matches=$('#milestonePersonMatches');let active=-1,results=[];
 function tags(){
  $('#milestonePersonTags').innerHTML=draftMilestonePeople.filter(id=>person(id)).map(id=>`<button type="button" class="person-tag" data-remove-participant="${esc(id)}" aria-label="Remove ${esc(firstLastName(person(id)))}">${esc(firstLastName(person(id)))} <span aria-hidden="true">×</span></button>`).join('');
  document.querySelectorAll('[data-remove-participant]').forEach(button=>button.onclick=()=>{draftMilestonePeople=draftMilestonePeople.filter(id=>id!==button.dataset.removeParticipant);tags();suggest();input.focus()});
 }
 function choose(id){if(!draftMilestonePeople.includes(id))draftMilestonePeople.push(id);input.value='';tags();suggest();input.focus()}
 function highlight(){[...matches.querySelectorAll('[role="option"]')].forEach((button,i)=>{button.classList.toggle('search-active',i===active);button.setAttribute('aria-selected',String(i===active))});if(active>=0){input.setAttribute('aria-activedescendant','milestone-person-'+active);matches.children[active]?.scrollIntoView({block:'nearest'})}else input.removeAttribute('aria-activedescendant')}
 function suggest(){
  const query=input.value.trim().toLocaleLowerCase();active=-1;
  if(!query){results=[];matches.replaceChildren();close();return}
  results=data.people.filter(p=>!draftMilestonePeople.includes(p.id)&&firstLastName(p).toLocaleLowerCase().includes(query)).sort((a,b)=>firstLastName(a).localeCompare(firstLastName(b))).slice(0,10);
  matches.hidden=false;input.setAttribute('aria-expanded','true');
  matches.innerHTML=results.map((p,i)=>`<button type="button" role="option" id="milestone-person-${i}" aria-selected="false" data-participant="${esc(p.id)}">${esc(firstLastName(p))}</button>`).join('')+'<p class="picker-status">'+(results.length?'':'No matching people.')+'</p>';
  matches.querySelectorAll('[data-participant]').forEach(button=>button.onclick=()=>choose(button.dataset.participant));highlight();
 }
 function close(){matches.hidden=true;active=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant')}
 input.oninput=suggest;input.onfocus=suggest;
 input.onkeydown=event=>{
  if(event.isComposing)return;
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(matches.hidden)suggest();if(results.length){active=(active+(event.key==='ArrowDown'?1:active<0?0:-1)+results.length)%results.length;highlight()}}
  else if(event.key==='Enter'){event.preventDefault();if(!matches.hidden&&results.length)choose(results[Math.max(0,active)].id)}
  else if(event.key==='Escape'&&!matches.hidden){event.preventDefault();event.stopPropagation();close()}
  else if(event.key==='Tab')close();
 };
 $('#milestonePeople').onfocusout=event=>{if(!event.currentTarget.contains(event.relatedTarget))close()};tags();
}
function openMilestone(id){
 milestonePhotoSession++;processingMilestonePhotos=false;$('#milestoneSave').disabled=false;
 const event=(data.milestones||[]).find(event=>event.id===id);$('#milestoneForm').reset();$('#milestoneId').value=event?.id||'';$('#milestoneHeading').textContent=event?'Edit milestone':'Add a family milestone';
 for(const field of ['title','type','date','location','description'])$('#milestone'+field[0].toUpperCase()+field.slice(1)).value=event?.[field]||(field==='type'?'marriage':'');
 $('#shareMilestone').hidden=!event;draftMilestonePeople=[...(event?.participants||[])];renderMilestonePeople();
 draftMilestonePhotos=[...(event?.photos||[])];$('#milestonePhotoStatus').textContent='';renderMilestonePhotos();$('#milestoneDelete').hidden=!event;$('#milestoneError').textContent='';$('#milestoneDialog').showModal();$('#milestoneTitle').focus();
}
$('#addMilestone').onclick=()=>openMilestone();$('#milestoneCancel').onclick=()=>$('#milestoneDialog').close();$('#milestoneDialog').addEventListener('close',()=>{milestonePhotoSession++});
$('#milestoneForm').onsubmit=async event=>{
 event.preventDefault();if(savingShared||processingMilestonePhotos)return;
 const title=$('#milestoneTitle').value.trim();if(!title){$('#milestoneError').textContent='Enter a title for this milestone.';return}
 const entry={id:$('#milestoneId').value||crypto.randomUUID(),title,type:$('#milestoneType').value,date:$('#milestoneDate').value,location:$('#milestoneLocation').value.trim(),description:$('#milestoneDescription').value.trim(),participants:[...draftMilestonePeople],photos:[...draftMilestonePhotos]};
 const previous=data.milestones||[];data.milestones=previous.filter(event=>event.id!==entry.id).concat(entry);
 if(!await saveShared()){data.milestones=previous;$('#milestoneError').textContent='This milestone was not saved. See the database notice for details.';return}
 $('#milestoneDialog').close();renderTimeline();notify('Milestone saved');
};
async function setMilestoneCover(index){
 if(savingShared||processingMilestonePhotos||!draftMilestonePhotos[index])return;
 const previousDraft=[...draftMilestonePhotos],cover=draftMilestonePhotos[index];draftMilestonePhotos.splice(index,1);draftMilestonePhotos.unshift(cover);renderMilestonePhotos();
 const id=$('#milestoneId').value,event=(data.milestones||[]).find(event=>event.id===id);
 if(!event){if($('#milestoneForm').reportValidity())$('#milestoneForm').requestSubmit();else $('#milestoneError').textContent='Add a title and date to save this new milestone and its cover.';return}
 const previous=data.milestones,photos=[...(event.photos||[])],oldIndex=photos.indexOf(cover);if(oldIndex>=0)photos.splice(oldIndex,1);photos.unshift(cover);
 data.milestones=previous.map(item=>item.id===id?{...item,photos}:item);$('#milestonePhotoStatus').textContent='Saving cover…';
 if(!await saveShared()){data.milestones=previous;draftMilestonePhotos=previousDraft;renderMilestonePhotos();$('#milestonePhotoStatus').textContent='';$('#milestoneError').textContent='Cover was not saved. Please retry after resolving the database notice.';return}
 draftMilestonePhotos[0]=data.milestones.find(item=>item.id===id).photos[0];renderMilestonePhotos();renderTimeline();$('#milestoneError').textContent='';$('#milestonePhotoStatus').textContent='Cover saved';
}
function renderMilestonePhotos(){
 $('#milestonePhotoPreview').innerHTML=draftMilestonePhotos.map((photo,i)=>`<div class="milestone-photo"><button type="button" class="open-gallery-photo" data-preview-photo="${i}" aria-label="View milestone item ${i+1}">${milestoneMediaPreview(photo,'',`Milestone item ${i+1}`)}</button><button type="button" data-remove-photo="${i}" aria-label="Remove item ${i+1}">×</button>${i===0?'<span class="cover-badge">Cover</span>':`<button type="button" class="set-photo-cover" data-cover-photo="${i}" aria-label="Set photo ${i+1} as cover">Set as cover</button>`}</div>`).join('');
 document.querySelectorAll('[data-cover-photo]').forEach(button=>button.onclick=()=>setMilestoneCover(Number(button.dataset.coverPhoto)));
 document.querySelectorAll('[data-preview-photo]').forEach(button=>button.onclick=()=>openPhotoLightbox(draftMilestonePhotos,Number(button.dataset.previewPhoto),$('#milestoneTitle').value||'Milestone pictures'));
 document.querySelectorAll('[data-remove-photo]').forEach(button=>button.onclick=()=>{draftMilestonePhotos.splice(Number(button.dataset.removePhoto),1);renderMilestonePhotos()});
}
async function addMilestonePhotos(files){
 if(processingMilestonePhotos||savingShared){notify('Wait for the current photos to finish processing.');return}
 const session=milestonePhotoSession;$('#milestoneError').textContent='';
 processingMilestonePhotos=true;$('#milestoneSave').disabled=true;
 try{for(const file of files){const video=/\.(mp4|mov)$/i.test(file.name);if(video?file.size>100000000:!file.type.startsWith('image/')||file.size>20000000)throw new Error('Choose images under 20 MB, or MP4/MOV videos under 100 MB.');const photo=video?await readVideoFile(file):await resizePhoto(file,1600);if(session!==milestonePhotoSession)return;draftMilestonePhotos.push(photo);renderMilestonePhotos()}}
 catch(error){if(session===milestonePhotoSession)$('#milestoneError').textContent=error.message||'Could not open this image.'}
 finally{if(session===milestonePhotoSession){processingMilestonePhotos=false;$('#milestoneSave').disabled=false;$('#milestonePhotos').value=''}}
}
$('#milestonePhotos').onchange=event=>addMilestonePhotos([...event.target.files]);
$('#milestoneDelete').onclick=async()=>{
 if(savingShared||!confirm('Delete this timeline milestone?'))return;const previous=data.milestones;data.milestones=previous.filter(event=>event.id!==$('#milestoneId').value);
 if(!await saveShared()){data.milestones=previous;return}$('#milestoneDialog').close();renderTimeline();notify('Milestone deleted');
};
$('#timelineTab').onclick=()=>showSection('timeline');
$('#addBirthdays').onclick=()=>{tab(true);const missing=data.people.find(p=>!p.birthday);edit(missing?.id);$('#birthday').focus()};

function directory(){
 const connected=new Set(data.links.flatMap(link=>[link.a,link.b]));
 const noConnections=data.people.filter(p=>!connected.has(p.id)).sort((a,b)=>a.name.localeCompare(b.name));
 const noBirthdays=data.people.filter(p=>!p.birthday).sort((a,b)=>a.name.localeCompare(b.name));
 const missingSection=(title,people,kind)=>`<section class="directory-missing"><h3>${title} <span>${people.length}</span></h3><div class="directory-missing-list">${people.map(p=>`<button type="button" data-missing-person="${esc(p.id)}" data-missing-kind="${kind}">${esc(displayName(p))} ↗</button>`).join('')||'<p>Everyone is up to date.</p>'}</div></section>`;
 $('#peopleList').innerHTML=`<h3>${data.people.length} people</h3><label for="directorySearch">Find a person to edit</label><div class="directory-search-field"><input id="directorySearch" type="search" placeholder="Search by name…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="directoryMatches"><button id="clearDirectorySearch" type="button" aria-label="Clear people search" hidden>×</button></div><div id="directoryMatches" role="listbox" hidden></div>${missingSection('No connections',noConnections,'connections')}${missingSection('No birthday',noBirthdays,'birthday')}`;
 $('#peopleList').querySelectorAll('[data-missing-person]').forEach(button=>button.onclick=()=>{edit(button.dataset.missingPerson);if(button.dataset.missingKind==='birthday')$('#birthday').focus({preventScroll:true})});
 const input=$('#directorySearch'),list=$('#directoryMatches');let matches=[],active=-1;
 function close(){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1}
 function select(p){edit(p.id)}
 function highlight(){[...list.children].forEach((button,i)=>{button.classList.toggle('search-active',i===active);button.setAttribute('aria-selected',String(i===active))});if(active>=0){input.setAttribute('aria-activedescendant','directory-match-'+active);list.children[active]?.scrollIntoView({block:'nearest'})}}
 function search(){$('#clearDirectorySearch').hidden=!input.value;try{localStorage.setItem('kinfolk-people-search-v1',input.value)}catch{}const query=input.value.trim().toLocaleLowerCase();active=-1;input.removeAttribute('aria-activedescendant');if(!query){close();return}matches=data.people.filter(p=>p.name.toLocaleLowerCase().includes(query)).sort((a,b)=>a.name.localeCompare(b.name));list.hidden=false;input.setAttribute('aria-expanded','true');list.innerHTML=matches.map((p,i)=>`<button type="button" role="option" aria-selected="false" id="directory-match-${i}">${esc(displayName(p))}</button>`).join('')||'<p>No matching people.</p>';if(matches.length)[...list.children].forEach((button,i)=>button.onclick=()=>select(matches[i]))}
 $('#clearDirectorySearch').onclick=()=>{input.value='';search();input.focus()};
 input.oninput=search;input.onfocus=search;input.onkeydown=event=>{if(event.isComposing)return;if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(list.hidden)search();if(matches.length&&!list.hidden){active=active<0?(event.key==='ArrowDown'?0:matches.length-1):(active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;highlight()}}else if(event.key==='Enter'){event.preventDefault();if(!list.hidden&&matches.length)select(matches[Math.max(0,active)])}else if(event.key==='Escape'||event.key==='Tab')close()};
 $('#peopleList').onfocusout=null;$('#requestEmail').value=data.email;
 try{input.value=localStorage.getItem('kinfolk-people-search-v1')||''}catch{}
 if(input.value.trim())search();
}

let relationPickerSerial=0;
function relationRow(value={}){
 const row=document.createElement('div');row.className='relation-row';const pickerId='relation-picker-'+(++relationPickerSerial);
 row.innerHTML=`<div class="relation-person-picker"><input type="hidden" class="relation-person-id" value="${esc(value.id||'')}"><input class="relation-person-search" aria-label="Family member" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${pickerId}" autocomplete="off" placeholder="Search for a person…" value="${esc(person(value.id)?displayName(person(value.id)):'')}"><div id="${pickerId}" class="relation-person-matches" role="listbox" hidden></div></div><span class="relation-phrase">is their</span><select aria-label="Relationship">${['parent','child','sibling','spouse'].map(t=>`<option ${value.type===t?'selected':''}>${t}</option>`).join('')}</select><button type="button" class="remove-relation" aria-label="Remove connection">×</button>`;
 const input=row.querySelector('.relation-person-search'),hidden=row.querySelector('.relation-person-id'),list=row.querySelector('[role="listbox"]');let matches=[],active=-1;
 function close(){list.hidden=true;active=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant')}
 function choose(p){hidden.value=p.id;input.value=displayName(p);input.setCustomValidity('');close();input.focus()}
 function highlight(){[...list.querySelectorAll('button')].forEach((button,i)=>{button.classList.toggle('search-active',i===active);button.setAttribute('aria-selected',String(i===active))});if(active>=0){input.setAttribute('aria-activedescendant',pickerId+'-'+active);list.children[active]?.scrollIntoView({block:'nearest'})}}
 function search(){const query=input.value.trim().toLocaleLowerCase();if(!query){matches=[];close();return}active=-1;input.removeAttribute('aria-activedescendant');matches=data.people.filter(p=>p.id!==$('#personId').value&&(p.name.toLocaleLowerCase().includes(query)||displayName(p).toLocaleLowerCase().includes(query))).sort((a,b)=>a.name.localeCompare(b.name));list.innerHTML=matches.map((p,i)=>`<button type="button" id="${pickerId}-${i}" role="option" aria-selected="false">${esc(displayName(p))}</button>`).join('')||'<p>No matching people.</p>';list.hidden=false;input.setAttribute('aria-expanded','true');list.querySelectorAll('button').forEach((button,i)=>button.onclick=()=>choose(matches[i]))}
 input.oninput=()=>{hidden.value='';input.setCustomValidity(input.value.trim()?'Select a person from the matches.':'');search()};
 input.onfocus=()=>{if(!hidden.value)search()};
 input.onkeydown=event=>{if(event.isComposing)return;if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(list.hidden)search();if(matches.length&&!list.hidden){active=active<0?(event.key==='ArrowDown'?0:matches.length-1):(active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;highlight()}}else if(event.key==='Enter'&&!list.hidden){event.preventDefault();if(matches.length)choose(matches[Math.max(0,active)])}else if(event.key==='Escape'&&!list.hidden){event.preventDefault();event.stopPropagation();close()}else if(event.key==='Tab')close()};
 row.querySelector('.relation-person-picker').onfocusout=event=>{if(!event.currentTarget.contains(event.relatedTarget))close()};row.querySelector('.remove-relation').onclick=()=>row.remove();$('#relations').append(row);
}

let droppedPortraitFile=null,portraitPreviewVersion=0;
function edit(id,{updateUrl=true}={}){droppedPortraitFile=null;portraitPreviewVersion++;const p=person(id);$('#personForm').reset();$('#personId').value=p?.id||'';$('#formTitle').textContent=p?'Edit '+displayName(p):'Add a person';for(const field of ['firstName','middleName','lastName','bio','birthday','location'])$('#'+field).value=(field.endsWith('Name')?nameParts(p)[field]:p?.[field])||'';$('#locationPlaceId').value=p?.locationPlaceId||'';$('#locationLat').value=p?.locationLat??'';$('#locationLng').value=p?.locationLng??'';resetLocationFinder();draftPhoto=p?.photo||'';$('#personPhotoPreview').innerHTML=draftPhoto?`<img src="${esc(draftPhoto)}" alt="Portrait preview">`:'';$('#relations').innerHTML='';if(p)connectionsDirect(id).forEach(relationRow);$('#delete').hidden=!p;$('#formError').textContent='';renderPlacesLived(p?.locationHistory||[]);renderBirthplace(p?.birthplace||null);if(updateUrl&&!$('#editor').hidden){const url=new URL(location.href);url.hash=p?new URLSearchParams({editPerson:p.id}).toString():'people';history.replaceState(null,'',url)}}
$('#personForm').onsubmit=async event=>{event.preventDefault();if(placesLivedPending()||birthplacePending){ $('#formError').textContent='Wait for the place lookup to finish.';return}if(locationLookupPending){$('#formError').textContent='Please wait for the location lookup to finish.';return}const firstName=$('#firstName').value.trim(),middleName=$('#middleName').value.trim(),lastName=$('#lastName').value.trim(),name=[firstName,middleName,lastName].filter(Boolean).join(' ');if(!name){$('#formError').textContent='Please enter a name.';return}const id=$('#personId').value||crypto.randomUUID();let photo=draftPhoto;const file=droppedPortraitFile||$('#photo').files[0];if(file){try{photo=await resizePhoto(file)}catch{$('#formError').textContent='Please choose a valid image.';return}}const p={id,name,firstName,middleName,lastName,photo,bio:$('#bio').value.trim(),birthday:$('#birthday').value,location:$('#location').value.trim(),locationPlaceId:$('#locationPlaceId').value,locationLat:$('#locationLat').value===''?null:Number($('#locationLat').value),locationLng:$('#locationLng').value===''?null:Number($('#locationLng').value),locationHistory:readPlacesLived(),birthplace:draftBirthplace?{...draftBirthplace}:null};if(!p.locationHistory)return;const links=[];const seen=new Set();for(const row of document.querySelectorAll('.relation-row')){const who=row.querySelector('.relation-person-id'),type=row.querySelector('select');if(!who.value)continue;if(seen.has(who.value)){$('#formError').textContent='Choose each family member only once.';return}seen.add(who.value);links.push({a:id,b:who.value,type:type.value})}const previous=JSON.stringify(data);data.people=data.people.filter(p=>p.id!==id).concat(p);data.links=data.links.filter(l=>l.a!==id&&l.b!==id).concat(links);if(!await saveShared()){data=JSON.parse(previous);return}directory();edit(id);render();notify('Person saved')};
function resizePhoto(file,maxDimension=320){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const canvas=document.createElement('canvas');const ratio=Math.min(1,maxDimension/Math.max(img.width,img.height));canvas.width=img.width*ratio;canvas.height=img.height*ratio;canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);resolve(canvas.toDataURL('image/jpeg',.8))};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not open this image. Choose a JPEG, PNG, or WebP photo.'))};img.src=url})}
async function previewPortrait(file){
 const version=++portraitPreviewVersion;if(!file)return;
 try{if(!file.type.startsWith('image/')||file.size>20000000)throw new Error('Choose one image under 20 MB.');const photo=await resizePhoto(file);if(version===portraitPreviewVersion)$('#personPhotoPreview').innerHTML=`<img src="${esc(photo)}" alt="Portrait preview">`}
 catch(error){if(version===portraitPreviewVersion)$('#formError').textContent=error.message||'Could not open this image.'}
}
$('#photo').onchange=event=>{droppedPortraitFile=null;$('#formError').textContent='';previewPortrait(event.target.files[0])};
function setupPhotoDropZone(zone,input,onFiles){
 const isFileDrag=event=>Array.from(event.dataTransfer?.types||[]).includes('Files');
 zone.addEventListener('dragover',event=>{if(!isFileDrag(event))return;event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='copy';zone.classList.add('is-dragover')});
 zone.addEventListener('dragenter',event=>{if(isFileDrag(event)){event.preventDefault();zone.classList.add('is-dragover')}});
 zone.addEventListener('dragleave',event=>{if(!zone.contains(event.relatedTarget))zone.classList.remove('is-dragover')});
 zone.addEventListener('drop',event=>{event.preventDefault();event.stopPropagation();zone.classList.remove('is-dragover');const files=[...event.dataTransfer.files];if(files.length)onFiles(files)});
 zone.addEventListener('keydown',event=>{if(event.target===zone&&(event.key==='Enter'||event.key===' ')){event.preventDefault();input.click()}});
 zone.addEventListener('click',event=>{if(event.target===zone||event.target.closest('.dropzone-instructions'))input.click()});
}
setupPhotoDropZone($('#milestonePhotoDrop'),$('#milestonePhotos'),addMilestonePhotos);
setupPhotoDropZone($('#personPhotoDrop'),$('#photo'),files=>{
 if(files.length!==1||!files[0].type.startsWith('image/')||files[0].size>20000000){$('#formError').textContent='Drop one image under 20 MB for a portrait.';return}
 droppedPortraitFile=files[0];$('#photo').value='';$('#formError').textContent='';previewPortrait(files[0]);
});
$('#delete').onclick=async()=>{const id=$('#personId').value;if(!confirm('Delete this person and their connections?'))return;const previous=JSON.stringify(data);data.people=data.people.filter(p=>p.id!==id);data.milestones=(data.milestones||[]).map(event=>({...event,participants:event.participants.filter(personId=>personId!==id)}));data.links=data.links.filter(l=>l.a!==id&&l.b!==id);data.visible=data.visible.filter(i=>i!==id);data.expanded=data.expanded.filter(i=>i!==id);if(data.selected===id)data.selected=null;if(data.root===id)data.root=null;if(!await saveShared()){data=JSON.parse(previous);return}directory();edit();render()};$('#treeTab').onclick=()=>tab(false);$('#peopleTab').onclick=()=>tab(true);$('#newPerson').onclick=()=>edit();$('#addFirst').onclick=()=>{tab(true);edit();$('#firstName').focus()};$('#cancel').onclick=()=>edit();$('#addRelation').onclick=()=>relationRow();$('#search').oninput=search;$('#searchGo').onclick=search;$('#search').onkeydown=handleSearchKey;$('#reset').onclick=()=>{relationshipTrace=null;data.visible=[];data.expanded=[];data.selected=null;data.root=null;$('#search').value='';closeSearch();save();render()};$('#requestEmail').onchange=async e=>{if(e.target.validity.valid){const previous=data.email;data.email=e.target.value.trim();if(await saveShared())notify('Requests email saved');else{data.email=previous;e.target.value=previous}}};window.addEventListener('resize',()=>{render();fitGraph()});document.addEventListener('click',e=>{if(!e.target.closest('.search'))$('#results').innerHTML=''});

let addingFamily=null;
function openFamilyDialog(id,type){addingFamily={id,type};const p=person(id);$('#familyTitle').textContent=`Add ${displayName(p)}’s ${type}`;$('#familyContext').textContent=`Who is ${displayName(p)}’s ${type}?`;$('#familyForm').reset();$('#familyError').textContent='';const current=new Set(connections(id).map(c=>c.id));$('#existingFamily').innerHTML='<option value="">Choose someone…</option>'+data.people.filter(p=>p.id!==id&&!current.has(p.id)).map(p=>`<option value="${p.id}">${esc(displayName(p))}</option>`).join('');$('#familyDialog').showModal();$('#familyName').focus()}
$('#familyCancel').onclick=()=>$('#familyDialog').close();
$('#familyForm').onsubmit=async e=>{e.preventDefault();if(!addingFamily)return;const {id,type}=addingFamily;const existing=$('#existingFamily').value,name=$('#familyName').value.trim();if(!existing&&!name){$('#familyError').textContent='Enter a name or choose an existing person.';return}if(existing&&name){$('#familyError').textContent='Choose an existing person or enter a new name, then leave the other field blank.';return}if(name&&data.people.some(p=>p.name.toLowerCase()===name.toLowerCase())){$('#familyError').textContent='Someone with this name is already in the directory. Choose them below, or use a more specific name.';return}const previous=JSON.stringify(data);const newId=existing||crypto.randomUUID();if(!existing)data.people.push({id:newId,name,photo:'',bio:'',birthday:'',location:''});data.links.push({a:id,b:newId,type});if(!await saveShared()){data=JSON.parse(previous);return}$('#familyDialog').close();expand(id);notify(`${displayName(person(newId))} added as ${displayName(person(id))}’s ${type}`)};
let treeDrag=null;
function startTreeDrag(event){
 if(event.button!==0||event.isPrimary===false||event.pointerType==='touch'||!graphLayout||event.target.closest('button,a,input,textarea,select'))return;
 const graph=$('#graph');treeDrag={pointerId:event.pointerId,x:event.clientX,y:event.clientY,active:false};graph.setPointerCapture(event.pointerId);event.preventDefault();
}
function moveTreeDrag(event){
 if(!treeDrag||treeDrag.pointerId!==event.pointerId)return;const graph=$('#graph'),dx=event.clientX-treeDrag.x,dy=event.clientY-treeDrag.y;
 if(!treeDrag.active){
  if(Math.hypot(dx,dy)<4)return;
  // Add camera space without moving the picture, so even a fitted tree can pan.
  const scene=$('#scene'),before=new DOMMatrixReadOnly(getComputedStyle(scene).transform),left=graph.scrollLeft,top=graph.scrollTop;
  cameraPadded=true;setGraphScale(before.a,{animate:false});const after=new DOMMatrixReadOnly(getComputedStyle(scene).transform);
  graph.scrollTo({left:left+after.e-before.e,top:top+after.f-before.f,behavior:'instant'});
  treeDrag.left=graph.scrollLeft;treeDrag.top=graph.scrollTop;treeDrag.active=true;graph.classList.add('is-panning');
 }
 graph.scrollTo({left:treeDrag.left-dx,top:treeDrag.top-dy,behavior:'instant'});event.preventDefault();
}
function endTreeDrag(event){
 if(!treeDrag||treeDrag.pointerId!==event.pointerId)return;const graph=$('#graph');treeDrag=null;graph.classList.remove('is-panning');if(graph.hasPointerCapture(event.pointerId))graph.releasePointerCapture(event.pointerId);
}
$('#graph').addEventListener('pointerdown',startTreeDrag);
$('#graph').addEventListener('pointermove',moveTreeDrag);
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('#graph').addEventListener(type,endTreeDrag);
function handleTreeWheel(event){
 if(!(event.metaKey||event.shiftKey)||!graphLayout||$('#graph').hidden)return;
 const graph=$('#graph'),scene=$('#scene');
 const delta=Math.abs(event.deltaY)>=Math.abs(event.deltaX)?event.deltaY:event.deltaX;
 if(!delta)return;event.preventDefault();
 const pixels=delta*(event.deltaMode===1?16:event.deltaMode===2?graph.clientHeight:1);
 const rect=graph.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
 // Read the current camera so scrolling can interrupt a zoom animation smoothly.
 const before=new DOMMatrixReadOnly(getComputedStyle(scene).transform);
 const worldX=(x+graph.scrollLeft-before.e)/before.a,worldY=(y+graph.scrollTop-before.f)/before.d;
 const next=Math.max(.2,Math.min(2,before.a*Math.exp(-Math.max(-180,Math.min(180,pixels))*.0025)));
 setGraphScale(next,{animate:false});
 const after=new DOMMatrixReadOnly(getComputedStyle(scene).transform);
 graph.scrollTo({left:worldX*next+after.e-x,top:worldY*next+after.f-y,behavior:'instant'});
}
$('#graph').addEventListener('wheel',handleTreeWheel,{passive:false});
function showEntireTree(){
 if(!data.people.length){notify('Add a person to begin your family tree.');return}
 relationshipTrace=null;
 data.root=person(data.root)?data.root:data.people[0].id;
 data.selected=person(data.selected)?data.selected:data.root;
 data.visible=data.people.map(p=>p.id);data.expanded=[...data.visible];
 save();render();fitGraph();
}
$('#showEntireTree').onclick=showEntireTree;
$('#zoomIn').onclick=()=>setGraphScale(graphScale*1.2);$('#zoomOut').onclick=()=>setGraphScale(graphScale/1.2);$('#fitGraph').onclick=()=>fitGraph();$('#backToStart').onclick=()=>centerPerson(data.root);

$('#databaseRetry').onclick=()=>location.reload();
window.addEventListener('DOMContentLoaded',()=>connectDatabase(),{once:true});setInterval(refreshShared,5000);window.addEventListener('focus',refreshShared);

async function inlineBackupImage(photo){
 if(!photo||photo.startsWith('data:'))return photo;const response=await fetch(photo,{credentials:'same-origin'});if(!response.ok)throw new Error('A photo could not be downloaded. Backup was not created.');const blob=await response.blob();
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read a backup image.'));reader.readAsDataURL(blob)});
}
async function exportFamily(){
 $('#exportFamily').disabled=true;notify('Preparing backup, including photos…');
 try{const backup=JSON.parse(JSON.stringify({format:'kinfolk-v1',people:data.people,links:data.links,milestones:data.milestones||[],email:data.email})),jobs=[];
 for(const p of backup.people)if(p.photo)jobs.push(async()=>p.photo=await inlineBackupImage(p.photo));
 for(const event of backup.milestones)for(let i=0;i<(event.photos||[]).length;i++)jobs.push(async()=>event.photos[i]=await inlineBackupImage(event.photos[i]));
 let next=0;await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{while(next<jobs.length)await jobs[next++]()}));
 const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='kinfolk-family-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Backup downloaded with photos');
 }catch(error){notify(error.message)}finally{$('#exportFamily').disabled=false}
}
$('#exportFamily').onclick=exportFamily;
$('#importFamily').onclick=()=>$('#familyBackup').click();$('#setupImport').onclick=()=>$('#familyBackup').click();
$('#useExample').onclick=async()=>{const previous=JSON.stringify(data);data.people=initialFamily.people;data.links=initialFamily.links;if(!await saveShared()){data=JSON.parse(previous);return}directory();edit();render();notify('Example family saved to MySQL')};
$('#familyBackup').onchange=async e=>{const file=e.target.files[0];if(!file)return;const previous=JSON.stringify(data);try{if(file.size>160000000)throw new Error('Backup file is too large.');const incoming=JSON.parse(await file.text());if(!Array.isArray(incoming.people)||!Array.isArray(incoming.links))throw new Error('Choose a Kinfolk family backup.');const ids=new Set(data.people.map(p=>p.id));for(const p of incoming.people){if(!p||typeof p.id!=='string')throw new Error('Invalid person in backup.');if(!ids.has(p.id)){data.people.push(p);ids.add(p.id)}}const pairs=new Set(data.links.map(l=>[l.a,l.b].sort().join('|')));for(const l of incoming.links){const pair=[l.a,l.b].sort().join('|');if(!pairs.has(pair)){data.links.push(l);pairs.add(pair)}}if(incoming.milestones!==undefined){if(!Array.isArray(incoming.milestones))throw new Error('Invalid milestones in backup.');const eventIds=new Set((data.milestones||[]).map(event=>event.id));for(const event of incoming.milestones)if(!eventIds.has(event.id)){data.milestones.push(event);eventIds.add(event.id)}}if(!data.email&&typeof incoming.email==='string')data.email=incoming.email;if(!await saveShared()){data=JSON.parse(previous);return}directory();edit();render();notify('Family backup imported. Existing database records were kept.')}catch(error){data=JSON.parse(previous);notify(error.message)}finally{e.target.value=''}};

$('#openRelationshipFinder').onclick=openRelationshipFinder;
$('#clearRelationshipPath').onclick=clearRelationshipPath;
$('#relationshipForm').onsubmit=event=>{
 event.preventDefault();const from=$('#relationshipFrom').value,to=$('#relationshipTo').value;
 const result=findRelationship(from,to);lastRelationshipResult=result;
 if(!result){$('#relationshipResult').innerHTML='<h3>No connection recorded</h3><p>These people do not have a connecting path in the saved family records.</p>';return}
 if(from===to){$('#relationshipResult').innerHTML='<h3>That’s the same person.</h3><p>Choose two different people to find a relationship.</p>';return}
 const label=result.label.toLowerCase();const sentence=result.label==='Extended family'?`${displayName(person(from))} and ${displayName(person(to))} are connected through extended family.`:`${displayName(person(to))} is ${displayName(person(from))}’s ${label}.`;
 $('#relationshipResult').innerHTML=`<div class="relationship-answer"><p class="eyebrow">THEIR CONNECTION</p><h3>${esc(sentence)}</h3></div><p class="hint">${result.edges.length} ${result.edges.length===1?'connection':'connections'} along the shortest recorded path</p><ol class="relationship-steps">${result.ids.map((id,i)=>`<li>${i?`<small>↓ ${esc(result.edges[i-1].type)}</small>`:''}<span>${avatar(person(id))}<strong>${esc(displayName(person(id)))}</strong></span></li>`).join('')}</ol><button id="showRelationshipPath" class="primary" type="button">Show path in tree ↗</button>`;
 $('#showRelationshipPath').onclick=()=>showRelationshipPath(lastRelationshipResult);
};
for(const select of ['#relationshipFrom','#relationshipTo'])$(select).onchange=()=>{$('#relationshipResult').replaceChildren();lastRelationshipResult=null};

let lightboxPhotos=[],lightboxIndex=0,lightboxReturnFocus=null;
function wrappedPhotoIndex(index,total){return total?((index%total)+total)%total:0}
function displayLightboxPhoto(index){
 lightboxIndex=wrappedPhotoIndex(index,lightboxPhotos.length);const media=lightboxPhotos[lightboxIndex],image=$('#lightboxImage'),video=$('#lightboxVideo'),isVideo=isMilestoneVideo(media);
 video.pause();video.removeAttribute('src');video.load();image.removeAttribute('src');image.hidden=isVideo;video.hidden=!isVideo;
 if(isVideo){video.src=media;video.setAttribute('aria-label',`${$('#lightboxTitle').textContent} — video ${lightboxIndex+1} of ${lightboxPhotos.length}`)}else{image.src=media;image.alt=`${$('#lightboxTitle').textContent} — photo ${lightboxIndex+1} of ${lightboxPhotos.length}`}
 $('#lightboxCounter').textContent=`${lightboxIndex+1} / ${lightboxPhotos.length}`;$('#lightboxPrevious').hidden=lightboxPhotos.length<2;$('#lightboxNext').hidden=lightboxPhotos.length<2;
 $('#shareLightbox').hidden=!data.milestones.some(event=>event.photos?.includes(media));
 $('#lightboxError').hidden=true;$('#lightboxError').textContent='This item could not be loaded. Try the next one.';
}
function openPhotoLightbox(photos,index=0,title='Family pictures'){
 if(!photos?.length)return;lightboxReturnFocus=document.activeElement;lightboxPhotos=[...photos];$('#lightboxTitle').textContent=title;displayLightboxPhoto(index);$('#photoLightbox').showModal();$('#lightboxClose').focus();
}
$('#lightboxPrevious').onclick=()=>displayLightboxPhoto(lightboxIndex-1);
$('#lightboxNext').onclick=()=>displayLightboxPhoto(lightboxIndex+1);
$('#lightboxClose').onclick=()=>$('#photoLightbox').close();
$('#photoLightbox').addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();displayLightboxPhoto(lightboxIndex+(event.key==='ArrowLeft'?-1:1))}});
$('#photoLightbox').addEventListener('close',()=>{lightboxPhotos=[];$('#lightboxVideo').pause();$('#lightboxVideo').removeAttribute('src');$('#lightboxVideo').load();$('#lightboxImage').removeAttribute('src');if(lightboxReturnFocus?.isConnected)lightboxReturnFocus.focus({preventScroll:true})});
$('#lightboxImage').onerror=()=>{if(!$('#lightboxImage').hidden)$('#lightboxError').hidden=false};

$('#lightboxVideo').onerror=()=>{if($('#lightboxVideo').hidden)return;$('#lightboxError').hidden=false;$('#lightboxError').textContent='This video preview could not play. Save MOV files first to convert them for playback.'};

function directLink(values){const url=new URL(location.href);url.hash=new URLSearchParams(values).toString();return url.href}
async function copyDirectLink(values){
 const link=directLink(values);
 try{await navigator.clipboard.writeText(link);notify('Link copied')}catch(error){prompt('Copy this link:',link)}
}
function openSharedLink(){
 const params=new URLSearchParams(location.hash.slice(1));
 if(params.has('editPerson')){showSection('people');const id=params.get('editPerson');if(person(id))edit(id,{updateUrl:false});else notify('This person is no longer available.');return}
 if(params.has('person')){const id=params.get('person');if(person(id))start(id);else notify('This person is no longer available.');return}
 if(params.has('milestone')){
  const event=data.milestones.find(item=>item.id===params.get('milestone'));
  if(!event){notify('This milestone is no longer available.');return}
  showSection('timeline');
  if(params.has('media')){const index=(event.photos||[]).indexOf(params.get('media'));if(index>=0)openPhotoLightbox(event.photos,index,event.title);else{openMilestone(event.id);notify('This photo or video is no longer available.')}}else openMilestone(event.id);
 }
}
$('#shareMilestone').onclick=()=>copyDirectLink({milestone:$('#milestoneId').value});
$('#shareLightbox').onclick=()=>{
 const media=lightboxPhotos[lightboxIndex],event=data.milestones.find(item=>item.photos?.includes(media));
 if(event)copyDirectLink({milestone:event.id,media});
};
window.addEventListener('hashchange',()=>{if(!sharedReady)return;if($('#photoLightbox').open)$('#photoLightbox').close();if($('#milestoneDialog').open)$('#milestoneDialog').close();openSharedLink()});

let restoringTimelinePosition=false,timelinePositionFrame=0;
function saveTimelinePosition(){
 if(restoringTimelinePosition||$('#timeline').hidden||!sharedReady)return;
 try{localStorage.setItem('kinfolk-timeline-position-v1',JSON.stringify({y:window.scrollY}))}catch{}
}
function restoreTimelinePosition(){
 let position;try{position=JSON.parse(localStorage.getItem('kinfolk-timeline-position-v1')||'null')}catch{}
 if(!position||!Number.isFinite(position.y))return;
 restoringTimelinePosition=true;
 requestAnimationFrame(()=>{if(!$('#timeline').hidden)window.scrollTo({top:Math.max(0,position.y),behavior:'instant'});requestAnimationFrame(()=>{restoringTimelinePosition=false})});
}
window.addEventListener('scroll',()=>{if(timelinePositionFrame)return;timelinePositionFrame=requestAnimationFrame(()=>{timelinePositionFrame=0;saveTimelinePosition()})},{passive:true});
window.addEventListener('pagehide',saveTimelinePosition);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveTimelinePosition()});

// Sibling groups create ordinary reciprocal relationships, usable by every browser.
function siblingGroupChanges(ids){
 const unique=[...new Set(ids)],links=[],conflicts=[];
 for(let i=0;i<unique.length;i++)for(let j=i+1;j<unique.length;j++){
  const a=unique[i],b=unique[j],existing=data.links.find(link=>(link.a===a&&link.b===b)||(link.a===b&&link.b===a));
  if(existing){if(existing.type!=='sibling')conflicts.push({a,b,type:existing.type});continue}
  links.push({a,b,type:'sibling'});
 }
 return {links,conflicts};
}
let siblingGroupIds=[],siblingGroupBusy=false;
function refreshSiblingGroupTags(){
 $('#siblingGroupTags').innerHTML=siblingGroupIds.map(id=>`<button type="button" data-remove-sibling="${esc(id)}" aria-label="Remove ${esc(displayName(person(id)))}">${esc(displayName(person(id)))} ×</button>`).join('');
 document.querySelectorAll('[data-remove-sibling]').forEach(button=>button.onclick=()=>{siblingGroupIds=siblingGroupIds.filter(id=>id!==button.dataset.removeSibling);refreshSiblingGroupTags();$('#siblingGroupSearch').focus()});
 const changes=siblingGroupChanges(siblingGroupIds);
 $('#siblingGroupSummary').textContent=`${siblingGroupIds.length} people selected · ${changes.links.length} new sibling connections`;
 $('#siblingGroupError').textContent=changes.conflicts.length?'These people already have a different relationship: '+changes.conflicts.map(c=>displayName(person(c.a))+' and '+displayName(person(c.b))+' ('+c.type+')').join('; ')+'. Remove them from this group or correct their relationship first.':'';
 $('#saveSiblingGroup').disabled=siblingGroupIds.length<2||changes.conflicts.length>0;
}
function setupSiblingGroupSearch(){
 const input=$('#siblingGroupSearch'),list=$('#siblingGroupMatches');let matches=[],active=-1;
 function close(){list.hidden=true;active=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant')}
 function choose(id){if(!siblingGroupIds.includes(id))siblingGroupIds.push(id);refreshSiblingGroupTags();input.focus();search()}
 function highlight(){[...list.querySelectorAll('button')].forEach((button,i)=>{button.classList.toggle('search-active',i===active);button.setAttribute('aria-selected',String(i===active))});if(active>=0){input.setAttribute('aria-activedescendant','sibling-match-'+active);list.children[active]?.scrollIntoView({block:'nearest'})}}
 function search(){const query=input.value.trim().toLocaleLowerCase();active=-1;input.removeAttribute('aria-activedescendant');if(!query){close();return}matches=data.people.filter(p=>!siblingGroupIds.includes(p.id)&&(p.name.toLocaleLowerCase().includes(query)||displayName(p).toLocaleLowerCase().includes(query))).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,12);list.innerHTML=matches.map((p,i)=>`<button type="button" role="option" aria-selected="false" id="sibling-match-${i}">${esc(displayName(p))}</button>`).join('')||'<p>No matching people.</p>';list.hidden=false;input.setAttribute('aria-expanded','true');list.querySelectorAll('button').forEach((button,i)=>button.onclick=()=>choose(matches[i].id))}
 input.oninput=search;input.onfocus=search;input.onkeydown=event=>{if(event.isComposing)return;if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(list.hidden)search();if(matches.length&&!list.hidden){active=active<0?(event.key==='ArrowDown'?0:matches.length-1):(active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;highlight()}}else if(event.key==='Enter'){event.preventDefault();if(!list.hidden&&matches.length)choose(matches[Math.max(0,active)].id)}else if(event.key==='Escape'&&!list.hidden){event.preventDefault();event.stopPropagation();close()}else if(event.key==='Tab')close()};
}
$('#openSiblingGroup').onclick=()=>{
 const current=$('#personId').value;
 siblingGroupIds=person(current)?[...new Set([current,...connections(current).filter(c=>c.type==='sibling').map(c=>c.id)])]:[];
 $('#siblingGroupSearch').value='';$('#siblingGroupMatches').hidden=true;$('#siblingGroupSearch').setAttribute('aria-expanded','false');refreshSiblingGroupTags();setupSiblingGroupSearch();$('#siblingGroupDialog').showModal();$('#siblingGroupSearch').focus();
};
$('#cancelSiblingGroup').onclick=()=>$('#siblingGroupDialog').close();
$('#siblingGroupDialog').addEventListener('cancel',event=>{if(siblingGroupBusy)event.preventDefault()});
$('#siblingGroupForm').onsubmit=async event=>{
 event.preventDefault();if(siblingGroupBusy||siblingGroupIds.length<2)return;
 const changes=siblingGroupChanges(siblingGroupIds);if(changes.conflicts.length){refreshSiblingGroupTags();return}
 if(!changes.links.length){$('#siblingGroupDialog').close();notify('These sibling connections are already saved.');return}
 siblingGroupBusy=true;$('#siblingGroupForm').inert=true;const previous=[...data.links];data.links.push(...changes.links);
 try{
  if(!await saveShared()){data.links=previous;$('#siblingGroupError').textContent='The sibling group was not saved. Please resolve the database notice and try again.';return}
  const current=$('#personId').value;
  for(const link of changes.links){const other=link.a===current?link.b:link.b===current?link.a:null;if(other&&![...document.querySelectorAll('.relation-person-id')].some(input=>input.value===other))relationRow({id:other,type:'sibling'})}
  $('#siblingGroupDialog').close();render();notify(`${changes.links.length} sibling connections saved for everyone in the group.`);
 }finally{siblingGroupBusy=false;$('#siblingGroupForm').inert=false}
};

$('#editSiblingGroup').onclick=()=>$('#openSiblingGroup').click();

let mapsPlacesPromise=null,locationFinderVersion=0,locationLookupPending=false;
function loadPlacesLibrary(){
 if(mapsPlacesPromise)return mapsPlacesPromise;
 mapsPlacesPromise=new Promise((resolve,reject)=>{
  if(!mapsApiKey){reject(new Error('Google location search is not configured.'));return}
  if(window.google?.maps?.importLibrary){google.maps.importLibrary('places').then(resolve,reject);return}
  const script=document.createElement('script');
  window.kinfolkPlacesReady=()=>google.maps.importLibrary('places').then(resolve,reject);
  const url=new URL('https://maps.googleapis.com/maps/api/js');url.search=new URLSearchParams({key:mapsApiKey,loading:'async',v:'weekly',callback:'kinfolkPlacesReady'}).toString();
  script.src=url.href;script.async=true;script.onerror=()=>reject(new Error('Google location search could not load. Please try again later.'));document.head.append(script);
 });return mapsPlacesPromise;
}
function updateLocationPreview(){
 const preview=$('#locationPreview'),placeId=$('#locationPlaceId').value,address=$('#location').value.trim();
 if(!mapsApiKey||!address){preview.hidden=true;preview.removeAttribute('src');return}
 const url=new URL('https://www.google.com/maps/embed/v1/place');url.search=new URLSearchParams({key:mapsApiKey,q:placeId?'place_id:'+placeId:address}).toString();
 preview.src=url.href;preview.hidden=false;
}
async function resetLocationFinder(){
 const version=++locationFinderVersion;locationLookupPending=false;$('#locationFinder').replaceChildren();$('#locationFinderStatus').textContent='';$('#locationPreview').hidden=true;$('#locationPreview').removeAttribute('src');
 // Load Google only when People is visible, rather than on every tree visit.
 if($('#editor').hidden)return;
 $('#locationFinderStatus').textContent='Loading location search…';
 try{
  const {PlaceAutocompleteElement}=await loadPlacesLibrary();if(version!==locationFinderVersion)return;
  const finder=new PlaceAutocompleteElement();finder.setAttribute('aria-label','Search cities, countries, or addresses');finder.setAttribute('placeholder','Search for a city, country, or address');$('#locationFinder').append(finder);$('#locationFinderStatus').textContent='Choose a Google suggestion to set the current location.';
  finder.addEventListener('gmp-error',()=>{$('#locationFinderStatus').textContent='Google location search is unavailable. Check Places API (New) and the API key settings.'});
  finder.addEventListener('gmp-select',async({placePrediction})=>{
   const selectionVersion=++locationFinderVersion;locationLookupPending=true;$('#locationFinderStatus').textContent='Looking up this location…';
   try{
    const place=placePrediction.toPlace();await place.fetchFields({fields:['formattedAddress','displayName','location']});if(selectionVersion!==locationFinderVersion)return;
    $('#location').value=place.formattedAddress||place.displayName||'';$('#locationPlaceId').value=place.id||'';$('#locationLat').value=place.location?.lat()??'';$('#locationLng').value=place.location?.lng()??'';updateLocationPreview();$('#locationFinderStatus').textContent='Location selected. Save person to keep this change.';
   }catch(error){if(selectionVersion===locationFinderVersion)$('#locationFinderStatus').textContent='Could not look up this place. Please choose another Google suggestion.'}
   finally{if(selectionVersion===locationFinderVersion)locationLookupPending=false}
  });
  if($('#location').value.trim())updateLocationPreview();
 }catch(error){if(version===locationFinderVersion)$('#locationFinderStatus').textContent=error.message}
}
$('#location').addEventListener('input',()=>{locationFinderVersion++;locationLookupPending=false;$('#locationPlaceId').value='';$('#locationLat').value='';$('#locationLng').value='';$('#locationPreview').hidden=true;$('#locationPreview').removeAttribute('src')});
$('#location').addEventListener('change',updateLocationPreview);

$('#clearCurrentLocation').onclick=()=>{locationFinderVersion++;locationLookupPending=false;for(const id of ['location','locationPlaceId','locationLat','locationLng'])$('#'+id).value='';resetLocationFinder()};

function setupRelationshipSearch(id){
 const select=$('#'+id);select.hidden=true;select.required=false;
 const prior=$('#'+id+'Picker');if(prior)prior.remove();
 const wrapper=document.createElement('div');wrapper.className='relationship-person-picker';wrapper.id=id+'Picker';
 wrapper.innerHTML=`<input type="search" required aria-label="${id==='relationshipFrom'?'First':'Second'} person" placeholder="Search for a person…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}Matches"><div id="${id}Matches" role="listbox" hidden></div>`;select.after(wrapper);
 const input=wrapper.querySelector('input'),list=wrapper.querySelector('[role="listbox"]');input.value=person(select.value)?displayName(person(select.value)):'';let results=[],active=-1;
 function close(){list.hidden=true;active=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant')}
 function choose(p){select.value=p.id;input.value=displayName(p);input.setCustomValidity('');select.dispatchEvent(new Event('change'));close();input.focus()}
 function highlight(){list.querySelectorAll('button').forEach((button,i)=>{button.classList.toggle('search-active',i===active);button.setAttribute('aria-selected',String(i===active))});if(active>=0){input.setAttribute('aria-activedescendant',id+'Option'+active);list.children[active]?.scrollIntoView({block:'nearest'})}}
 function search(){const query=input.value.trim().toLocaleLowerCase();active=-1;input.removeAttribute('aria-activedescendant');if(!query){results=[];close();return}results=data.people.filter(p=>p.name.toLocaleLowerCase().includes(query)||displayName(p).toLocaleLowerCase().includes(query)).sort((a,b)=>a.name.localeCompare(b.name));list.innerHTML=results.map((p,i)=>`<button type="button" role="option" aria-selected="false" id="${id}Option${i}">${esc(displayName(p))}</button>`).join('')||'<p>No matching people.</p>';list.hidden=false;input.setAttribute('aria-expanded','true');list.querySelectorAll('button').forEach((button,i)=>button.onclick=()=>choose(results[i]))}
 input.oninput=()=>{select.value='';select.dispatchEvent(new Event('change'));input.setCustomValidity(input.value.trim()?'Select a person from the matches.':'');search()};input.onfocus=()=>{if(!select.value)search()};
 input.onkeydown=event=>{if(event.isComposing)return;if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(list.hidden)search();if(results.length&&!list.hidden){active=active<0?(event.key==='ArrowDown'?0:results.length-1):(active+(event.key==='ArrowDown'?1:-1)+results.length)%results.length;highlight()}}else if(event.key==='Enter'&&!list.hidden){event.preventDefault();if(results.length)choose(results[Math.max(0,active)])}else if(event.key==='Escape'&&!list.hidden){event.preventDefault();event.stopPropagation();close()}else if(event.key==='Tab')close()};
 wrapper.onfocusout=event=>{if(!wrapper.contains(event.relatedTarget))close()};
}
