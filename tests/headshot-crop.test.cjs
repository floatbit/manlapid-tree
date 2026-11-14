const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/people.js','utf8');
const fn=source.match(/function headshotCropRect\([^]*?\n}/)[0];
const crop=vm.runInNewContext('('+fn+')');
for(const [w,h] of [[4000,3000],[1000,4000],[550,550]])for(const z of [1,2,4,10])for(const p of [0,0.5,1]){
 const r=crop(w,h,z,p,p);
 assert.ok(r.x<=0&&r.y<=0);
 assert.ok(r.x+r.width>=550-1e-8&&r.y+r.height>=550-1e-8,'Crop always fills fixed frame');
 assert.ok(Math.abs(r.width/r.height-w/h)<1e-8,'Original never stretched');
}
console.log('Passed: fixed headshot crop coverage, zoom, positioning, and source aspect ratio.');
