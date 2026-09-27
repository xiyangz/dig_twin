const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {geometry,localToGeo,stage,panFocus,ANCHOR,R}=require('../dist/globe.js');
const {SCENE}=require('../dist/scene-config.js');
for(const [w,h]of [[700,720],[340,440],[1250,650]]){
 const initial=geometry(w,h,0),near=geometry(w,h,initial.campusLevel);
 assert.equal(initial.transition,0);assert.equal(near.transition,1);assert(Math.abs(near.campusZoom-1)<1e-12);
 assert.equal(stage(0,initial.campusLevel),'earth');assert.equal(stage(near.level,near.campusLevel),'campus');
 assert(Math.abs(near.radius/R-Math.min(w/SCENE.viewWidth,h/SCENE.viewHeight))<1e-9,'Geographic and campus metre scale must agree');
 let previous=0;for(let level=0;level<=initial.maxLevel;level+=.01){const m=geometry(w,h,level);assert(Number.isFinite(m.radius));assert(m.transition>=previous);previous=m.transition;assert(m.tilt>=.57&&m.tilt<=1);}
 assert.equal(geometry(w,h,-100).level,0);assert.equal(geometry(w,h,100).level,initial.maxLevel);
 assert(Math.abs(geometry(w,h,100).radius/R-Math.min(w/1510,h/1130)*2**2.25)<1e-9,'Keep the previous maximum physical magnification after extending the scene');
 for(const zoom of [near.campusLevel-1,near.campusLevel,initial.maxLevel])for(const angle of [-.6,0,Math.PI/2,Math.PI]){
  const m=geometry(w,h,zoom),focus={x:500,y:500},next=panFocus(focus,8,-6,m,angle),a=angle*m.bearingFactor,scale=m.radius/R*m.transition;
  const dx=focus.x-next.x,dy=focus.y-next.y;
  assert(Math.abs((dx*Math.cos(a)-dy*Math.sin(a))*scale-8)<1e-9,'Horizontal pan tracks the pointer at every bearing and zoom');
  assert(Math.abs((dx*Math.sin(a)+dy*Math.cos(a))*scale*m.tilt+6)<1e-9,'Vertical pan compensates for camera tilt');
 }
 const edge=panFocus({x:500,y:500},1e8,1e8,near,0);assert.deepEqual(edge,{x:SCENE.minX,y:SCENE.minY},'Pan center remains within the campus');
}
assert.deepEqual(localToGeo(500,500),[ANCHOR.lon,ANCHOR.lat]);assert(localToGeo(1000,500)[0]>ANCHOR.lon);assert(localToGeo(500,0)[1]>ANCHOR.lat);
const sandbox={};sandbox.window=sandbox;vm.createContext(sandbox);for(const file of ['vendor/d3-array.min.js','vendor/d3-geo.min.js','geo-data.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),sandbox);
const d3=sandbox.d3,data=sandbox.AirViewGeo;assert(d3.geoArea(data.world)>3&&d3.geoArea(data.world)<4.5,'World land should occupy a plausible minority of the globe');
for(const fc of [data.world,data.region])for(const f of fc.features)assert(d3.geoArea(f)<Math.PI*2,'No polygon should render as the whole globe');
assert(d3.geoContains(data.region,[ANCHOR.lon,ANCHOR.lat]),'Hypothetical Shanghai campus is on land');assert(!d3.geoContains(data.region,[124,31]),'East China Sea should remain ocean');
const proj=d3.geoOrthographic().rotate([-ANCHOR.lon,-ANCHOR.lat]).translate([0,0]).scale(R);
for(const p of [[0,0],[1000,1000],[500,500]]){const g=proj(localToGeo(...p));assert(Math.hypot(g[0]-(p[0]-500),g[1]-(p[1]-500))<.1,'Campus boundary remains geographically aligned');}
const {surfacePoint,styleWeights}=require('../dist/imagery.js');
for(const [lon,lat]of [[121.6,31.2],[-74,41],[18,-34],[179,60]]){
 const projection=d3.geoOrthographic().rotate([-lon,-lat]).translate([0,0]).scale(30000);
 for(const [dx,dy]of [[0,0],[.4,.3],[-.6,-.4]])for(const rotation of [0,-.6,1.2])for(const tilt of [1,.57]){
  const expected=[lon+dx,lat+dy],p=projection(expected);
  const screen=[p[0]*Math.cos(rotation)-p[1]*Math.sin(rotation),(p[0]*Math.sin(rotation)+p[1]*Math.cos(rotation))*tilt];
  const point=surfacePoint(...screen,lon,lat,30000,tilt,rotation);
  assert(d3.geoDistance(point,expected)<1e-9,'Image pixels must align with geographic markers worldwide, through camera tilt and rotation');
 }
}
assert.equal(surfacePoint(400,0,0,0,300),null,'Do not sample outside the globe');
let previousStyle=styleWeights(0);
for(let level=0;level<16;level+=.001){const next=styleWeights(level);for(const key of ['flat','illustrated']){assert(next[key]>=previousStyle[key]);assert(next[key]-previousStyle[key]<.002,'No hard style threshold');}previousStyle=next;}
assert.deepEqual(styleWeights(15),{flat:1,illustrated:1});
console.log('Globe: scale continuity, global image/marker alignment, smooth style transitions, zoom limits, anchor orientation and Shanghai placement passed.');
