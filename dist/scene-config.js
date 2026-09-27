/* Shared metre-based extent for rendering, navigation and simulation membership. */
(function(root){
'use strict';
const SCENE={minX:0,maxX:1400,minY:-300,maxY:1100,width:1400,height:1400,center:{x:700,y:400},radius:400,viewWidth:2114,viewHeight:1582,stations:[{x:540,y:178},{x:864,y:438}]};
const inside=(x,y)=>x>=SCENE.minX&&x<=SCENE.maxX&&y>=SCENE.minY&&y<=SCENE.maxY;
const OUTDOOR_ROADS={vertical:[90,630,940,1300],horizontal:[-220,90,360,650,930]};
const OPEN_ROUTES=[
 {points:[[-120,360],[1520,360]],entry:[0,360],exit:[1400,360],gate:'西门 → 东门'},
 {points:[[630,-420],[630,1220]],entry:[630,-300],exit:[630,1100],gate:'北门 → 南门'},
 {points:[[1520,650],[-120,650]],entry:[1400,650],exit:[0,650],gate:'东门 → 西门'},
 {points:[[1300,1220],[1300,-420]],entry:[1300,1100],exit:[1300,-300],gate:'南门 → 北门'}
];
const boundary=[[0,-300],[1400,-300],[1400,1100],[0,1100],[0,-300]];
root.AirViewScene={SCENE,inside,OUTDOOR_ROADS,OPEN_ROUTES,boundary};
if(typeof module!=='undefined')module.exports=root.AirViewScene;
})(typeof window!=='undefined'?window:globalThis);
