const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
let editing=true,success=true,saves=0;
const ctx=vm.createContext({document:{body:{classList:{contains:()=>editing}}},data:{people:[{id:'p',name:'Person',dateDetails:{death:'2020'},bio:'Keep this'}],links:[],milestones:[{id:'m',type:'marriage',title:'Wedding'}]},sharedReady:true,savingShared:false,validFamilyDate:v=>/^\d{4}(-\d{2}-\d{2})?$/.test(v),saveShared:async()=>{saves++;return success;},ui:{sync(){}},notify(){}});
vm.runInContext(fs.readFileSync('js/contributions.js','utf8'),ctx);
await vm.runInContext("saveContributionUpdates([{id:'p',kind:'birth',value:'1980-12-25'},{id:'m',kind:'anniversary',value:'2010'}])",ctx);
assert.equal(ctx.data.people[0].birthday,'1980-12-25');assert.equal(ctx.data.people[0].dateDetails.death,'2020');assert.equal(ctx.data.people[0].bio,'Keep this');assert.equal(ctx.data.milestones[0].date,'2010');
await assert.rejects(vm.runInContext("saveContributionUpdates([{id:'p',kind:'birth',value:'bad'}])",ctx));assert.equal(saves,1);
success=false;await assert.rejects(vm.runInContext("saveContributionUpdates([{id:'p',kind:'portrait',value:'data:image/jpeg;base64,a'}])",ctx));assert.equal(ctx.data.people[0].photo,undefined);
editing=false;await assert.rejects(vm.runInContext("saveContributionUpdates([{id:'p',kind:'birth',value:'2000'}])",ctx),/Log in/);
console.log('Passed: quick contribution dates, preservation of unrelated fields, validation, rollback and login guard.');
})().catch(e=>{console.error(e);process.exit(1)});
