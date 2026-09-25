/* Earth-to-campus navigation. Geographic geometry: Natural Earth; hypothetical Shanghai anchor. */
(function(root){
'use strict';
const R=6371000,ANCHOR={lon:121.6,lat:31.2,name:'上海 · 青岚科技园'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function geometry(width,height,level){
 const baseRadius=Math.min(width*.39,height*.33),campusScale=Math.min(width/1510,height/1130);
 const campusLevel=Math.log2(R*campusScale/baseRadius);
 const z=clamp(level,0,campusLevel+1.25),transition=smooth(campusLevel-2,campusLevel-.15,z);
 return{level:z,baseRadius,radius:baseRadius*2**z,campusLevel,maxLevel:campusLevel+1.25,campusZoom:2**(z-campusLevel),transition,bearingFactor:smooth(campusLevel-3,campusLevel-.4,z),tilt:1-.43*smooth(campusLevel-3,campusLevel-.4,z)};
}
function localToGeo(x,y){return[ANCHOR.lon+(x-500)/R*180/Math.PI/Math.cos(ANCHOR.lat*Math.PI/180),ANCHOR.lat-(y-500)/R*180/Math.PI];}
function stage(level,campusLevel){return level<2?'earth':level<7?'region':level<campusLevel-1?'city':'campus';}
class GlobeNavigation{
 constructor(options){
  this.options=options;this.canvas=options.canvas;this.earth=document.getElementById('earthCanvas');this.context=this.earth.getContext('2d');this.wrap=this.canvas.parentElement;
  this.level=0;this.target=0;this.lon=108;this.lat=24;this.animation=null;this.raf=0;this.previous=0;this.dirty=true;this.frozen=false;this.pointerMap=new Map();this.drag=null;this.pinch=null;this.reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.projection=root.d3.geoOrthographic().precision(.5);this.graticule=root.d3.geoGraticule10();this.landMask=document.createElement('canvas');
  this.campusBoundary={type:'LineString',coordinates:[[0,0],[1000,0],[1000,1000],[0,1000],[0,0]].map(p=>localToGeo(...p))};
  this.bind();this.render();
 }
 state(){const {width,height}=this.options.dimensions(),m=geometry(width,height,this.level);return{view:stage(this.level,m.campusLevel),zoomLevel:+this.level.toFixed(3),campusLevel:+m.campusLevel.toFixed(3),campusOpacity:+m.transition.toFixed(3),animating:!!this.animation||Math.abs(this.target-this.level)>.002,anchor:{...ANCHOR,hypothetical:true}};}
 metrics(){const {width,height}=this.options.dimensions();return geometry(width,height,this.level);}
 frame(now){this.raf=0;const elapsed=this.previous?Math.min(64,now-this.previous):16;this.previous=now;
  if(this.animation){const a=this.animation,t=clamp((now-a.start)/a.duration,0,1),e=t*t*(3-2*t);this.level=a.from+(a.to-a.from)*e;const focus=smooth(0,.38,t);this.lon=a.lon+(ANCHOR.lon-a.lon)*focus;this.lat=a.lat+(ANCHOR.lat-a.lat)*focus;if(t===1){this.level=a.to;this.animation=null;}}
  else {this.level+=(this.target-this.level)*(1-Math.exp(-elapsed/110));if(Math.abs(this.target-this.level)<.002)this.level=this.target;if(this.target>1.5&&!this.drag){const f=1-Math.exp(-elapsed/120);this.lon+=(ANCHOR.lon-this.lon)*f;this.lat+=(ANCHOR.lat-this.lat)*f;}}
  this.dirty=true;this.render();if(this.animation||Math.abs(this.target-this.level)>.002||(this.target>1.5&&(Math.abs(this.lon-ANCHOR.lon)+Math.abs(this.lat-ANCHOR.lat)>.000001)))this.request();else this.previous=0;
 }
 request(){if(!this.raf)this.raf=requestAnimationFrame(t=>this.frame(t));}
 setLevel(value){if(!Number.isFinite(value))throw Error('缩放值必须为有限数值');const m=this.metrics();this.animation=null;this.target=clamp(value,0,m.maxLevel);if(this.reduceMotion){this.level=this.target;if(this.target>1.5){this.lon=ANCHOR.lon;this.lat=ANCHOR.lat;}this.dirty=true;this.render();}else this.request();}
 fly(view){if(!['earth','region','city','campus'].includes(view))throw Error('未知视图');const m=this.metrics(),to={earth:0,region:5.7,city:9,campus:m.campusLevel}[view];if(this.reduceMotion){this.setLevel(to);return this.state();}this.target=to;this.animation={from:this.level,to,lon:this.lon,lat:this.lat,start:performance.now(),duration:clamp(Math.abs(to-this.level)*430,900,6500)};this.request();return this.state();}
 bind(){
  document.querySelectorAll('[data-geo-view]').forEach(b=>b.onclick=()=>this.fly(b.dataset.geoView));
  document.getElementById('focusCampus').onclick=()=>this.fly('campus');document.getElementById('regionPin').onclick=()=>this.fly('campus');
  document.getElementById('geoZoom').oninput=e=>this.setLevel(Number(e.target.value)/100*this.metrics().maxLevel);
  document.getElementById('zoomIn').onclick=()=>this.setLevel((this.animation?this.level:this.target)+1.1);document.getElementById('zoomOut').onclick=()=>this.setLevel((this.animation?this.level:this.target)-1.1);
  document.getElementById('homeView').onclick=()=>{this.options.setAngle(-.60);this.fly('campus');};
  document.getElementById('rotate').onclick=()=>{this.animation=null;if(this.metrics().transition>.1)this.options.setAngle(this.options.angle()+Math.PI/2);else this.lon-=30;this.dirty=true;this.render();};
  this.wrap.addEventListener('wheel',e=>{e.preventDefault();const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?300:1);this.setLevel((this.animation?this.level:this.target)-clamp(pixels*.006,-1.4,1.4));},{passive:false});
  this.canvas.addEventListener('keydown',e=>{if(['+','=','ArrowUp','-','_','ArrowDown','Home','Escape'].includes(e.key)){e.preventDefault();if(e.key==='Home')this.fly('earth');else if(e.key==='Escape'){this.animation=null;this.target=this.level;this.render();}else this.setLevel(this.target+(['+','=','ArrowUp'].includes(e.key)?1.1:-1.1));}});
  this.canvas.addEventListener('pointerdown',e=>{this.animation=null;this.target=this.level;this.canvas.setPointerCapture(e.pointerId);this.pointerMap.set(e.pointerId,[e.clientX,e.clientY]);this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,lon:this.lon,lat:this.lat,angle:this.options.angle(),moved:false};if(this.pointerMap.size===2){const pts=[...this.pointerMap.values()];this.pinch={distance:Math.hypot(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1]),level:this.level};this.drag=null;}});
  this.canvas.addEventListener('pointermove',e=>{if(!this.pointerMap.has(e.pointerId))return;this.pointerMap.set(e.pointerId,[e.clientX,e.clientY]);if(this.pointerMap.size===2&&this.pinch){const pts=[...this.pointerMap.values()],distance=Math.hypot(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1]);this.setLevel(this.pinch.level+Math.log2(Math.max(1,distance)/Math.max(1,this.pinch.distance)));return;}if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.hypot(dx,dy)>5)this.drag.moved=true;if(!this.drag.moved)return;
   if(this.metrics().transition>.1)this.options.setAngle(this.drag.angle+dx*.006);else{const sensitivity=100/this.metrics().radius;this.lon=this.drag.lon-dx*sensitivity;this.lat=clamp(this.drag.lat+dy*sensitivity,-80,80);}this.dirty=true;this.render();});
  const release=e=>{const d=this.drag;this.pointerMap.delete(e.pointerId);this.drag=null;this.pinch=null;if(e.type==='pointerup'&&d&&!d.moved){const r=this.canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(this.metrics().transition>.8)this.options.selectAt(x,y);else if(this.pinPoint&&Math.hypot(this.pinPoint[0]-x,this.pinPoint[1]-y)<50)this.fly('campus');}};
  this.canvas.addEventListener('pointerup',release);this.canvas.addEventListener('pointercancel',release);this.canvas.addEventListener('lostpointercapture',e=>{this.pointerMap.delete(e.pointerId);if(!this.pointerMap.size){this.drag=null;this.pinch=null;}});
 }
 render(){const {width:w,height:h,dpr}=this.options.dimensions();if(w<=0||h<=0)return;const m=geometry(w,h,this.level);this.level=m.level;this.target=clamp(this.target,0,m.maxLevel);this.canvas.style.opacity=m.transition;this.earth.style.opacity=this.options.visuals?.earthReady?1:1-smooth(.6,1,m.transition);
  if(m.transition>0)this.options.drawCampus(m.campusZoom,m.tilt,this.options.angle()*m.bearingFactor);else this.options.clearCampus();
  const current=stage(this.level,m.campusLevel);this.wrap.dataset.geoStage=current;
  if(this.earth.width!==Math.round(w*dpr)||this.earth.height!==Math.round(h*dpr)){this.earth.width=Math.round(w*dpr);this.earth.height=Math.round(h*dpr);this.dirty=true;}
  if(this.lastAngle!==this.options.angle()){this.lastAngle=this.options.angle();this.dirty=true;}
  if(this.dirty){this.drawMap(w,h,dpr,m);this.dirty=false;}
  const titles={earth:'地球视角',region:'上海所在区域',city:'上海 · 园区定位',campus:'青岚科技园'};
  document.getElementById('geoStage').textContent=titles[current];document.getElementById('geoHint').textContent=this.animation?'正在沿地理锚点平滑缩放…':current==='campus'?'继续缩小可返回地球 · 点击终端查看 MAC':current==='earth'?'滚轮放大，或点击上海标记进入园区':'影像风格示意底图 · 继续放大进入合成园区';
  document.getElementById('geoZoom').value=String(this.level/m.maxLevel*100);document.getElementById('geoZoom').setAttribute('aria-valuetext',titles[current]);
  document.querySelectorAll('[data-geo-view]').forEach(b=>{const on=b.dataset.geoView===current||(b.dataset.geoView==='city'&&current==='region');b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  document.getElementById('geoStatus').textContent=current==='campus'?'园区 · 1 km²':'上海假设锚点 · WGS84';
  document.querySelector('.scene-meta').textContent=current==='campus'?(this.options.visuals?.ready?'3D · 午后日光 · 假设场景':'2.5D · 兼容模式'):'地球 → 上海 → 园区';
  this.canvas.setAttribute('aria-label','地球与上海园区导航，当前'+titles[current]+'。加减键缩放，Home 返回地球，Escape 停止飞行。');
 }
 drawMap(w,h,dpr,m){const g=this.context,cx=w/2,cy=h*.50,tilt=m.tilt,rotation=this.options.angle()*m.bearingFactor;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  this.projection.rotate([-this.lon,-this.lat,0]).translate([0,0]).scale(m.radius).clipExtent([[-w*2,-h*3],[w*2,h*3]]);const path=root.d3.geoPath(this.projection,g);
  // Glow follows the actual sphere limb and disappears naturally as it leaves the viewport.
  if(this.level<1.5){const glow=g.createRadialGradient(cx,cy,m.radius*.93,cx,cy,m.radius*1.10);glow.addColorStop(0,'#4688ae00');glow.addColorStop(.6,'#62bfff24');glow.addColorStop(1,'#62bfff00');g.fillStyle=glow;g.fillRect(0,0,w,h);}
  g.save();g.translate(cx,cy);g.scale(1,tilt);g.rotate(rotation);
  const ocean=g.createRadialGradient(-m.radius*.4,-m.radius*.4,m.radius*.05,0,0,m.radius);ocean.addColorStop(0,'#1c4964');ocean.addColorStop(.7,'#10354f');ocean.addColorStop(1,'#081c32');g.beginPath();path({type:'Sphere'});g.fillStyle=this.level<2?ocean:'#173646';g.fill();
  const margin=Math.max(w,h)/m.radius*180/Math.PI*.72;
  const availableMargin=Math.min(this.lon-117,126-this.lon,this.lat-27,36-this.lat);
  const regionBlend=availableMargin>0?smooth(0,.4,1-margin/availableMargin)*smooth(5,7,this.level):0;
  const regional=regionBlend>0;
  const data=regional?root.AirViewGeo.region:root.AirViewGeo.world;
  g.beginPath();path(data);g.fillStyle=this.level<2?'#416e72':'#294e4e';g.fill();g.strokeStyle=this.level<2?'#78b2b684':'#71b1a18a';g.lineWidth=.75;g.stroke();
  if(this.level<2){g.beginPath();path(this.graticule);g.strokeStyle='#8ab9d21f';g.lineWidth=.65;g.stroke();const shade=g.createRadialGradient(-m.radius*.35,-m.radius*.35,m.radius*.25,m.radius*.18,m.radius*.13,m.radius*1.07);shade.addColorStop(0,'#bfd7ef08');shade.addColorStop(.60,'#010c1b00');shade.addColorStop(1,'#000813b5');g.beginPath();path({type:'Sphere'});g.fillStyle=shade;g.fill();g.strokeStyle='#83d4fa73';g.lineWidth=1;g.stroke();}
  if(this.level>=2&&!this.options.visuals?.earthReady){const span=Math.min(16,Math.max(.008,650/m.radius*180/Math.PI)),step=this.level<5?5:this.level<8?1:this.level<11?.1:.01;const lines=[];for(let lat=Math.floor((this.lat-span)/step)*step;lat<=this.lat+span;lat+=step)lines.push([[this.lon-span,lat],[this.lon+span,lat]]);for(let lon=Math.floor((this.lon-span)/step)*step;lon<=this.lon+span;lon+=step)lines.push([[lon,this.lat-span],[lon,this.lat+span]]);g.beginPath();path({type:'MultiLineString',coordinates:lines});g.strokeStyle='#92c6b818';g.lineWidth=.6;g.stroke();}
  if(this.level>5){g.beginPath();path(this.campusBoundary);g.fillStyle='#64e4b114';g.fill();g.strokeStyle='#91ffd9';g.lineWidth=1.3;g.setLineDash([5,4]);g.stroke();g.setLineDash([]);}
  g.restore();
  // The mask refines coastlines; NASA supplies the same global palette at every scale.
  const mask=this.landMask;if(mask.width!==Math.round(w)||mask.height!==Math.round(h)){mask.width=Math.round(w);mask.height=Math.round(h);}
  const mg=mask.getContext('2d');
  const paintMask=(target,features)=>{const c=target.getContext('2d');c.setTransform(1,0,0,1,0,0);c.fillStyle='#000';c.fillRect(0,0,w,h);c.save();c.translate(cx,cy);c.scale(1,tilt);c.rotate(rotation);c.beginPath();root.d3.geoPath(this.projection,c)(features);c.fillStyle='#fff';c.fill();c.restore();};
  paintMask(mask,root.AirViewGeo.world);
  if(regionBlend>0){this.regionMask??=document.createElement('canvas');const rm=this.regionMask;if(rm.width!==mask.width||rm.height!==mask.height){rm.width=mask.width;rm.height=mask.height;}paintMask(rm,root.AirViewGeo.region);mg.globalAlpha=regionBlend;mg.drawImage(rm,0,0);mg.globalAlpha=1;}
  this.options.visuals?.earth(g,w,h,dpr,this.lon,this.lat,m.radius,1,this.level,tilt,rotation,mask);
  if(this.level>5){g.save();g.translate(cx,cy);g.scale(1,tilt);g.rotate(rotation);g.beginPath();path(this.campusBoundary);g.strokeStyle='#c5e3b4';g.lineWidth=1.1;g.setLineDash([5,4]);g.stroke();g.restore();}
  const credit=document.querySelector('.geo-credit');credit.textContent=this.options.visuals?.earthReady?(this.level<4?'NASA Blue Marble · 历史合成影像':'NASA / Natural Earth · 纹理化示意底图'):'Natural Earth · 示意底图';credit.href=this.level<4&&this.options.visuals?.earthReady?'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/':'https://www.naturalearthdata.com/about/terms-of-use/';
  const project=p=>{const v=this.projection(p),a=rotation;return[cx+v[0]*Math.cos(a)-v[1]*Math.sin(a),cy+(v[0]*Math.sin(a)+v[1]*Math.cos(a))*tilt];};
  const visible=root.d3.geoDistance([this.lon,this.lat],[ANCHOR.lon,ANCHOR.lat])<Math.PI/2-.01;
  const point=project([ANCHOR.lon,ANCHOR.lat]);this.pinPoint=visible?point:null;const pin=document.getElementById('regionPin'),shown=visible&&point[0]>20&&point[0]<w-20&&point[1]>85&&point[1]<h-60&&m.transition<.85;
  pin.hidden=!shown;pin.style.left=point[0]+'px';pin.style.top=point[1]+'px';pin.classList.toggle('label-left',point[0]+190>w-12);
  if(shown){g.strokeStyle='#b6ffeabd';g.lineWidth=1;for(const r of [12,20]){g.beginPath();g.arc(point[0],point[1],r,0,Math.PI*2);g.stroke();}}
  const labels=this.level<2?[['亚洲',90,43],['太平洋',157,7],['印度洋',75,-20]]:this.level<5?[['中国',107,34],['东海',125,27.5]]:this.level<8?[['长江口',122.05,31.5],['东海',122.7,30.7],['杭州湾',121,30.5]]:[];
  for(const [name,lon,lat]of labels){if(root.d3.geoDistance([this.lon,this.lat],[lon,lat])>Math.PI/2-.1)continue;const [x,y]=project([lon,lat]);if(x<30||x>w-30||y<130||y>h-50)continue;g.fillStyle='#a8c6d1b3';g.font='13px "Microsoft YaHei",sans-serif';g.textAlign='center';g.fillText(name,x,y);}
  const metersPerPixel=R/m.radius,power=10**Math.floor(Math.log10(metersPerPixel*95)),units=[1,2,5,10].filter(n=>n*power<=metersPerPixel*120),distance=units.at(-1)*power,pixels=distance/metersPerPixel;
  document.getElementById('geoScaleLine').style.width=pixels+'px';document.getElementById('geoScaleText').textContent=distance>=1000?`${distance/1000} km`:`${distance} m`;
 }
}
root.AirViewGlobe={GlobeNavigation,geometry,localToGeo,stage,ANCHOR,R};if(typeof module!=='undefined')module.exports=root.AirViewGlobe;
})(typeof window!=='undefined'?window:globalThis);
