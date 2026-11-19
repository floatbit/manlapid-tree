import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {migrationDisplayLabel} from '../src/domain/insights.js';
import {migrationMapData} from '../src/domain/map-migrations.js';
document.body.innerHTML='<aside id="familyMapPeople"><div id="mapSelectedPerson"></div><div id="mapLocationDirectory"></div><p id="familyMapStatus"></p></aside><button id="fitFamilyMap"><span id="fitFamilyMapLabel"></span></button>';
const lines=[],markers=[],opened=[],popups=[];
class Polyline {constructor(options){this.options=options;this.listeners={};lines.push(this);}addListener(name,fn){this.listeners[name]=fn;}setOptions(options){Object.assign(this.options,options);}setMap(map){this.map=map;}}
class Marker {constructor(options){Object.assign(this,options);this.listeners={};markers.push(this);}addListener(name,fn){this.listeners[name]=fn;}}
const people=[{id:'a',name:'Amy',birthplace:{location:'Manila',lat:14.6,lng:121},location:'New York',locationLat:40.7,locationLng:-74},{id:'b',name:'Ben',birthplace:{location:'Manila',lat:14.6,lng:121},location:'Paris',locationLat:48.8,locationLng:2.3}];
const context=vm.createContext({document,window,Map,Set,data:{people},familyMapMode:'migrations',familyMapRenderVersion:1,familyMap:{setCenter(){},setZoom(){}},familyMapMarkers:[],migrationLines:[],migrationConnectionLines:[],migrationConnectionsCamera:{center:{lat:0,lng:0},zoom:3},mapCameraReady:false,
 familyMapMarkerLibrary:{AdvancedMarkerElement:Marker,PinElement:class{constructor(options){this.options=options;}}},familyMapPopup:{close(){},setContent(content){popups.push(content);},open(){}},
 ui:{migrationMapData,migrationDisplayLabel,unmountPersonPhotos(){},openSidebar:key=>opened.push(key),closeSidebar(){}},$:selector=>document.querySelector(selector),esc:value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),uiIcon:()=>'',avatar:p=>'<span>'+p.name[0]+'</span>',viewerBadge:()=>'',displayName:p=>p.name,showMapPerson:id=>opened.push(id),restoreMapCamera(){},persistMapView(){},google:{maps:{importLibrary:async()=>({Polyline}),SymbolPath:{FORWARD_CLOSED_ARROW:'arrow'}}}});
const source=fs.readFileSync('js/map.js','utf8');
vm.runInContext(source.slice(source.indexOf('function migrationPlaceLabel(')),context);
await context.renderMigrationConnections(1);
assert.equal(lines.length,2);assert.equal(markers.length,3);
assert.equal(document.querySelectorAll('.map-migration-route').length,2);
lines[0].listeners.click();
assert.equal(document.querySelectorAll('.map-migration-route').length,1,'Route click filters sidebar to its own relatives');
assert.equal(lines[0].options.strokeColor,'#285b44');assert.equal(lines[1].options.strokeOpacity,.2);
assert.equal(opened.at(-1),'map');
document.querySelector('[data-migration-person]').click();assert.equal(opened.at(-1),'a');
context.showMigrationConnections();
markers[0].listeners.click();assert(popups.at(-1).textContent.includes('2 connections'));
popups.at(-1).querySelector('button').click();assert.equal(document.querySelectorAll('.map-migration-route').length,2,'City popup can show all connected paths');
context.familyMapMode='current';await context.renderMigrationConnections(1);assert.equal(lines.length,2,'Stale async draws do not leak into Current Locations');
console.log('Passed: map migrations draw routes and markers, highlight selected paths, open profiles and list every route through a city.');
// Summary navigation opens a selected route, or a birthplace/home directory.
const mapPage=document.createElement('main');mapPage.id='familyMapPage';document.body.append(mapPage);
class Bounds {constructor(){this.points=[];}extend(point){this.points.push(point);}isEmpty(){return !this.points.length;}}
context.google.maps.LatLngBounds=Bounds;
context.rememberMapCamera=()=>{};context.showSection=()=>{};
context.familyMap.fitBounds=bounds=>{context.lastBounds=bounds;};
context.comparePeople=(a,b)=>a.name.localeCompare(b.name);
context.renderFamilyMap=async()=>context.renderMigrationConnections(1);
await context.openInsightMap({personId:'b'});
assert.equal(document.querySelectorAll('.map-migration-route').length,1);
assert(document.querySelector('.map-migration-route').textContent.includes('Paris'));
await context.openInsightMap({kind:'directory',title:'Cities & Towns'});
assert.equal(document.querySelectorAll('.map-migration-route').length,3,'Directory includes unique birthplaces and current homes');
assert.equal(context.lastBounds.points.length,3);
assert(document.querySelector('#mapSelectedPerson').textContent.includes('Cities & Towns'));
await context.openInsightMap({kind:'region',people:[people[0]],title:'Birthplaces in Manila'});
assert.equal(document.querySelectorAll('.map-migration-route').length,1,'Region drilldown shows birthplaces only');
console.log('Passed: summary Map actions select the exact migration and display birthplace/current-home directories.');
