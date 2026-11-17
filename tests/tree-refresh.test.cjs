const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/core.js','utf8');
const connect=source.slice(source.indexOf('async function connectDatabase()'),source.indexOf('function familyDateYear('));
(async()=>{
 for(const [hash,hasView,expectedClear] of [['#page=tree',true,false],['#page=tree',false,true],['',true,true],['#person=p',false,false]]){
  let cleared=0,focusRestores=0;
  const nodes=new Map();
  const context=vm.createContext({URLSearchParams,location:{hash},hadBrowserData:false,hadBrowserView:hasView,sharedReady:false,
   data:{visible:['p'],expanded:['p'],selected:'p',root:'p'},document:{querySelectorAll:()=>[]},
   $:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},
   requestDatabase:async()=>({revision:1,csrf:'test'}),applyShared:()=>{},save:()=>{},syncStatus:()=>{},edit:()=>{},
   sectionFromUrl:()=>hash.includes('person=')||!hash?'tree':new URLSearchParams(hash.slice(1)).get('page'),
   clearTreeView:()=>{cleared++;context.data.visible=[];context.data.selected=null;context.data.root=null;},
   restoreTreeFocus:()=>focusRestores++,showSection:()=>{},person:()=>({name:'Person'}),displayName:p=>p.name,openSharedLink:()=>{},showDatabaseError:message=>{throw Error(message);}});
  vm.runInContext(connect,context);await context.connectDatabase();
  assert.equal(cleared,expectedClear?1:0,hash+' saved='+hasView);
  assert.equal(focusRestores,hasView&&!hash.includes('person=')?1:0,'Saved Tree focus is restored on startup');
  if(hasView&&!expectedClear){assert.equal(context.data.selected,'p');assert.deepEqual(context.data.visible,['p']);}
 }
 console.log('Passed: Tree refresh restores saved selection; fresh and bare homepage visits show welcome; person links remain explicit.');
})().catch(error=>{console.error(error);process.exitCode=1;});

{
 const peopleSource=fs.readFileSync('js/people.js','utf8');
 const action=peopleSource.slice(peopleSource.indexOf('function openTreeLanding()'),peopleSource.indexOf('function clearTreeView()'));
 const state={visible:['p'],selected:'p',root:'p'};
 const context=vm.createContext({URL,URLSearchParams,location:{href:'http://family.local/#page=timeline'},history:{replaceState(){}},data:state,
  clearTreeView:()=>{throw Error('Returning to Tree must not clear its state');},showSection:section=>assert.equal(section,'tree')});
 vm.runInContext(action,context);context.openTreeLanding();
 assert.equal(state.selected,'p');assert.deepEqual(state.visible,['p']);
 console.log('Passed: returning from another page preserves the loaded Tree selection.');
}

{
 const navigation=fs.readFileSync('js/navigation.js','utf8');
 const elements=new Map(),moves=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{hidden:true,open:false,classList:{toggle(){}},close(){}});return elements.get(id);};
 const graph={scrollLeft:340,scrollTop:270,scrollTo(position){moves.push(position);this.scrollLeft=position.left;this.scrollTop=position.top;}};
 elements.set('#graph',graph);element('#explore').hidden=false;
 const ctx=vm.createContext({$:element,graphLayout:{},graphScale:.65,document:{body:{classList:{contains:()=>true}}},ui:{setSection(){}},rememberSection(){},restoringPageHistory:false,updatePageUrl(){},saveTimelinePosition(){},render(){throw Error('Menu return must not rebuild the tree');},fitGraph(){throw Error('Menu return must not fit the camera');}});
 vm.runInContext(navigation.slice(navigation.indexOf('let lastTreeViewport'),navigation.indexOf('function openRelationshipFinder()')),ctx);
 ctx.showSection('insights');graph.scrollLeft=0;graph.scrollTop=0;
 ctx.showSection('tree',{preserveTreeView:true});
 assert.equal(graph.scrollLeft,340);assert.equal(graph.scrollTop,270);assert.equal(ctx.graphScale,.65);
 assert.equal(moves.length,1);
 console.log('Passed: Tree menu restores exact pan and zoom without rendering or fitting again.');
}
