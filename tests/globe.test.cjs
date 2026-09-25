const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {geometry,localToGeo,stage,ANCHOR,R}=require('../dist/globe.js');
for(const [w,h]of [[700,720],[340,440],[1250,650]]){
 const initial=geometry(w,h,0),near=geometry(w,h,initial.campusLevel);
 assert.equal(initial.transition,0);assert.equal(near.transition,1);assert(Math.abs(near.campusZoom-1)<1e-12);
 assert.equal(stage(0,initial.campusLevel),'earth');assert.equal(stage(near.level,near.campusLevel),'campus');
 assert(Math.abs(near.radius/R-Math.min(w/1510,h/1130))<1e-9,'Geographic and campus metre scale must agree');
 let previous=0;for(let level=0;level<=initial.maxLevel;level+=.01){const m=geometry(w,h,level);assert(Number.isFinite(m.radius));assert(m.transition>=previous);previous=m.transition;assert(m.tilt>=.57&&m.tilt<=1);}
 assert.equal(geometry(w,h,-100).level,0);assert.equal(geometry(w,h,100).level,initial.maxLevel);
}
assert.deepEqual(localToGeo(500,500),[ANCHOR.lon,ANCHOR.lat]);assert(localToGeo(1000,500)[0]>ANCHOR.lon);assert(localToGeo(500,0)[1]>ANCHOR.lat);
const sandbox={};sandbox.window=sandbox;vm.createContext(sandbox);for(const file of ['vendor/d3-array.min.js','vendor/d3-geo.min.js','geo-data.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),sandbox);
const d3=sandbox.d3,data=sandbox.AirViewGeo;assert(d3.geoArea(data.world)>3&&d3.geoArea(data.world)<4.5,'World land should occupy a plausible minority of the globe');
for(const fc of [data.world,data.region])for(const f of fc.features)assert(d3.geoArea(f)<Math.PI*2,'No polygon should render as the whole globe');
assert(d3.geoContains(data.region,[ANCHOR.lon,ANCHOR.lat]),'Hypothetical Shanghai campus is on land');assert(!d3.geoContains(data.region,[124,31]),'East China Sea should remain ocean');
const proj=d3.geoOrthographic().rotate([-ANCHOR.lon,-ANCHOR.lat]).translate([0,0]).scale(R);
for(const p of [[0,0],[1000,1000],[500,500]]){const g=proj(localToGeo(...p));assert(Math.hypot(g[0]-(p[0]-500),g[1]-(p[1]-500))<.1,'Campus boundary remains geographically aligned');}
console.log('Globe: scale continuity, monotonic transitions, zoom limits, anchor orientation, spherical polygons and Shanghai land placement passed.');
