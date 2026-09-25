/* Display-only 3D renderer. All buildings and UE positions come from AirView's model. */
(function(root){
'use strict';
const T=root.THREE;
class RealisticView {
 constructor(buildings,bases,onReady){
  this.ready=false;this.earthReady=false;this.batches=new Map();this.materials=new Map();
  if(!T)return;
  try{this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{return;}
  this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;this.earthReady=false;onReady();});
  // The original Canvas renderer remains available if WebGL is lost or unavailable.
  this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-800,800,600,-600,.1,5000);
  this.scene.add(new T.HemisphereLight(0xc8dff1,0x77755c,2.0));
  const sun=new T.DirectionalLight(0xffecd2,3.1);sun.position.set(-420,700,-320);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-830,right:830,top:830,bottom:-830,near:50,far:1900});
  sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0003;sun.shadow.normalBias=.6;sun.shadow.radius=3;
  this.scene.add(sun);this.sun=sun;
  this.makeGround();buildings.forEach((b,i)=>this.makeBuilding(b,i));
  bases.forEach(b=>this.makeBase(b));this.makeLandscape();this.flushBatches();
  this.users=Array.from({length:12},(_,id)=>this.makeUser(id));
  this.heatCanvas=document.createElement('canvas');this.heatCanvas.width=this.heatCanvas.height=250;
  this.heatTexture=new T.CanvasTexture(this.heatCanvas);this.heatTexture.colorSpace=T.SRGBColorSpace;
  const heatMaterial=new T.MeshBasicMaterial({map:this.heatTexture,transparent:true,opacity:.55,depthWrite:false});
  this.heat=new T.Mesh(new T.PlaneGeometry(1000,1000),heatMaterial);this.heat.rotation.x=-Math.PI/2;this.heat.position.y=.85;this.heat.renderOrder=1;this.scene.add(this.heat);
  this.earthScene=new T.Scene();this.earthCamera=new T.OrthographicCamera(-2,2,2,-2,.1,20);
  this.earthScene.add(new T.AmbientLight(0xb7d1ea,.8));this.earthSun=new T.DirectionalLight(0xffffff,2.2);this.earthScene.add(this.earthSun);
  const loader=new T.TextureLoader();loader.load('assets/earth-blue-marble.jpg',texture=>{
   texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());
   this.earthTexture=texture;this.surface=new root.AirViewImagery.ImagerySurface(T);
   this.earthMesh=new T.Mesh(new T.SphereGeometry(1,128,64),new T.MeshPhongMaterial({map:texture,shininess:5,specular:0x1e2836}));
   this.earthScene.add(this.earthMesh);this.earthReady=true;onReady();
  },undefined,()=>{this.earthReady=false;});
  this.ready=true;
 }
 material(color,roughness=.85,metalness=0){const key=[color,roughness,metalness].join(':');if(!this.materials.has(key))this.materials.set(key,new T.MeshStandardMaterial({color,roughness,metalness}));return this.materials.get(key);}
 box(x,y,w,d,h,color,z=0,roughness=.85,metalness=0){
  const mat=this.material(color,roughness,metalness);if(!this.batches.has(mat))this.batches.set(mat,[]);
  this.batches.get(mat).push({x:x-500+w/2,y:z+h/2,z:y-500+d/2,w,h,d});
 }
 flushBatches(){const geo=new T.BoxGeometry(1,1,1),dummy=new T.Object3D();for(const [mat,boxes]of this.batches){const mesh=new T.InstancedMesh(geo,mat,boxes.length);boxes.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;this.scene.add(mesh);}this.batches.clear();}
 plane(x,y,w,d,color,z=0){this.box(x,y,w,d,.25,color,z);}
 makeGround(){
  this.box(-20,-20,1040,1040,7,'#81816f',-7);
  const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=256;
  const g=textureCanvas.getContext('2d');g.fillStyle='#829070';g.fillRect(0,0,256,256);
  let seed=41;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<11000;i++){g.fillStyle=rand()>.5?'#9a9e7730':'#485f4825';g.fillRect(rand()*256,rand()*256,1+rand()*2,1+rand()*2);}
  const tex=new T.CanvasTexture(textureCanvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(12,12);
  const grass=new T.Mesh(new T.PlaneGeometry(1040,1040),new T.MeshStandardMaterial({map:tex,roughness:1}));grass.rotation.x=-Math.PI/2;grass.position.y=.15;grass.receiveShadow=true;this.scene.add(grass);
  // Wide curb, paving, asphalt, then painted markings. Dimensions remain in metres.
  for(const x of [90,630,940]){this.plane(x-27,60,54,900,'#bfc0b6',.25);this.plane(x-20,60,40,900,'#565b5c',.5);for(let y=70;y<950;y+=26)this.plane(x-.65,y,1.3,13,'#d9cf9e',.79);for(const dx of [-18,18])this.plane(x+dx,60,.65,900,'#d5d6c9',.78);}
  for(const y of [90,360,650,930]){this.plane(60,y-26,900,52,'#bfc0b6',.3);this.plane(60,y-18,900,36,'#565b5c',.55);for(let x=70;x<950;x+=26)this.plane(x,y-.6,13,1.2,'#d9cf9e',.8);for(const dy of [-16,16])this.plane(60,y+dy,900,.65,'#d5d6c9',.79);}
  for(const x of [90,630,940])for(const y of [90,360,650,930]){
   this.plane(x-20,y-18,40,36,'#565b5c',.82);
   for(let i=-12;i<=12;i+=6){this.plane(x+i,y+26,3,9,'#e5e4d8',.85);this.plane(x+29,y+i,9,3,'#e5e4d8',.85);}
  }
  this.plane(415,420,180,190,'#c8c3b6',.4);this.plane(437,440,138,149,'#6e8963',.8);
  this.plane(489,420,14,190,'#c9c3ae',1);this.plane(415,508,180,12,'#c9c3ae',1);
  this.plane(470,465,54,27,'#a6b6b3',1);this.plane(474,469,46,19,'#6c9fa7',1.3);
  for(const [x,y]of [[175,308],[700,310],[175,685],[720,687]]){
   this.plane(x-5,y-3,160,28,'#696d6c',.4);
   for(let i=0;i<=15;i++)this.plane(x+i*10,y,.7,20,'#d9d9c9',.8);
   this.plane(x,y+20,150,.7,'#d9d9c9',.8);
   for(let i=0;i<14;i++)if(i%4!==1)this.car(x+i*10+2,y+3,i);
  }
 }
 makeBuilding(b,index){
  const office=b.kind==='office',wall=office?'#c3c1b5':'#b8b5a6',roof=office?'#b0b0a5':'#a6aaa5';
  this.plane(b.x-7,b.y-7,b.w+14,b.d+14,'#bdbdb2',.6);
  this.box(b.x,b.y,b.w,b.d,b.h,wall,1);
  const floors=Math.max(2,Math.floor(b.h/(office?6:9))),floorHeight=b.h/floors;
  // Glazed window bays and structural piers use real geometry with changing reflections.
  for(let f=0;f<floors;f++){
   const z=2+f*floorHeight,wh=office?floorHeight*.62:floorHeight*.40;
   for(let x=b.x+5;x<b.x+b.w-5;x+=11){const c=(Math.floor(x)+f+index)%5===0?'#759298':'#4b6873';this.box(x,b.y-.3,8,.7,wh,c,z,.28,.30);this.box(x,b.y+b.d-.3,8,.7,wh,c,z,.28,.30);}
   for(let y=b.y+5;y<b.y+b.d-5;y+=11){this.box(b.x-.3,y,.7,8,wh,'#557481',z,.26,.25);this.box(b.x+b.w-.3,y,.7,8,wh,'#6b8388',z,.3,.25);}
  }
  this.box(b.x-1,b.y-1,b.w+2,b.d+2,1.4,roof,b.h+1);
  for(const y of [b.y,b.y+b.d-1.5])this.box(b.x,y,b.w,1.5,2.3,'#c9c8bc',b.h+2);
  for(const x of [b.x,b.x+b.w-1.5])this.box(x,b.y,1.5,b.d,2.3,'#c9c8bc',b.h+2);
  if(office){
   this.box(b.x+b.w*.32,b.y+b.d*.30,38,25,9,'#bfc2bb',b.h+2);
   for(let i=0;i<3;i++){const x=b.x+15+i*21;this.box(x,b.y+b.d-35,15,17,5,'#c5c7c1',b.h+2);this.box(x+2,b.y+b.d-33,11,13,.7,'#626f70',b.h+7);}
   this.box(b.x+b.w*.38,b.y+b.d+1,b.w*.24,9,1.5,'#8b9999',8,.4,.25);
  }else{
   for(let x=b.x+12;x<b.x+b.w-8;x+=12)this.box(x,b.y+5,.7,b.d-10,.5,'#d0d2c9',b.h+2.5);
   for(let row=0;row<3;row++)for(let col=0;col<5;col++){const x=b.x+22+col*24,y=b.y+22+row*26;this.box(x,y,20,19,1.1,'#425e73',b.h+3,.34,.35);this.box(x+9.7,y,.5,19,.5,'#a2b0b4',b.h+4.1);}
   for(let i=0;i<3;i++)this.box(b.x+20+i*35,b.y+b.d-.6,22,1.2,13,'#7e8988',1);
  }
 }
 cylinder(x,y,z,height,radius,color){const mesh=new T.Mesh(new T.CylinderGeometry(radius*.72,radius,height,7),this.material(color));mesh.position.set(x-500,z+height/2,y-500);mesh.castShadow=true;this.scene.add(mesh);return mesh;}
 makeBase(b){
  this.box(b.x-6,b.y-6,12,12,2,'#acaeaa',1);this.cylinder(b.x,b.y,2,b.z-2,1.2,'#c5cecb');
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3,x=b.x+Math.cos(a)*3,y=b.y+Math.sin(a)*3;this.box(x-1.2,y-1.2,2.4,2.4,11,'#e5e6df',b.z-11);}
  this.box(b.x+7,b.y-4,5,7,9,'#d6d7cb',1);
 }
 car(x,y,i){const colors=['#e1e0d7','#737f89','#ad7461','#dadbcf'];this.box(x,y,6,14,3,colors[i%4],1,.3,.15);this.box(x+.5,y+3,5,7,2,'#47616a',4,.24,.25);for(const dx of [-.6,5.6])for(const dy of [2,10])this.box(x+dx,y+dy,1,2.5,2.5,'#303536',.7);}
 makeLandscape(){
  const treeLocations=[];
  for(let i=0;i<25;i++){treeLocations.push([135+i*31,393],[135+i*31,965]);}
  for(let i=0;i<21;i++){treeLocations.push([43,125+i*38],[983,125+i*38]);}
  for(let i=0;i<12;i++)treeLocations.push([125+i*39,320],[135+i*39,693]);
  for(const p of [[453,454],[556,460],[455,566],[548,565],[405,798],[665,235],[665,520]])treeLocations.push(p);
  const dummy=new T.Object3D(),geo=new T.IcosahedronGeometry(1,2),foliage=new T.InstancedMesh(geo,this.material('#53744a'),treeLocations.length*3);
  treeLocations.forEach(([x,y],i)=>{const h=11+(i%5)*1.7;this.box(x-1,y-1,2,2,h*.7,'#84725a',.3);for(let j=0;j<3;j++){dummy.position.set(x-500+(j-1)*3,h*.65+j*1.8,y-500+(j%2)*3);dummy.scale.set(6+j,7.5+j,6+j);dummy.updateMatrix();foliage.setMatrixAt(i*3+j,dummy.matrix);foliage.setColorAt(i*3+j,new T.Color(['#8d9e72','#749365','#9b9d73'][i%3]));}});
  foliage.castShadow=true;foliage.receiveShadow=true;this.scene.add(foliage);
  // A few quiet street lights and park benches; no new radio obstructions are implied.
  for(let x=155;x<900;x+=130){this.box(x,401,1,1,17,'#808988',1);this.box(x,399,7,2,1,'#c5c9bf',18);}
  for(const [x,y]of [[442,529],[543,529],[442,495],[543,495]]){this.box(x,y,18,4,1,'#a59070',3);this.box(x,y,1.5,4,3,'#626b67',.5);this.box(x+16,y,1.5,4,3,'#626b67',.5);}
 }
 makeUser(id){const group=new T.Group(),body=new T.Mesh(new T.BoxGeometry(id%4===2?7:4,3,id%4===2?11:5),this.material('#d9d9cc',.55,.15));body.position.y=2.8;body.castShadow=true;group.add(body);const head=new T.Mesh(new T.CylinderGeometry(.8,.8,4,6),this.material('#516269'));head.position.y=6;group.add(head);this.scene.add(group);return group;}
 size(w,h,dpr){const key=[w,h,dpr].join(':');if(key!==this.sizeKey){this.renderer.setPixelRatio(Math.min(dpr,1.5));this.renderer.setSize(w,h,false);this.sizeKey=key;}this.width=w;this.height=h;}
 campus(g,w,h,dpr,angle,zoom,tilt,users,heatVisible,heatCells){
  if(!this.ready)return false;this.size(w,h,dpr);
  const scale=Math.min(w/1510,h/1130)*zoom,t=Math.min(.99999,tilt),horizontal=Math.sqrt(1-t*t),cam=this.camera;
  cam.left=-w/scale/2;cam.right=w/scale/2;cam.top=h/scale/2;cam.bottom=-h/scale/2;
  cam.position.set(Math.sin(angle)*horizontal*1800,t*1800,Math.cos(angle)*horizontal*1800);cam.lookAt(0,0,0);cam.updateProjectionMatrix();cam.updateMatrixWorld();
  users.forEach((u,i)=>{const m=this.users[i],dx=u.x-(m.userData.x??u.x),dy=u.y-(m.userData.y??u.y);if(Math.hypot(dx,dy)>.001)m.rotation.y=Math.atan2(dx,dy);m.position.set(u.x-500,.5,u.y-500);m.userData={x:u.x,y:u.y};});
  this.heat.visible=heatVisible;if(heatVisible&&this.lastHeat!==heatCells){const c=this.heatCanvas.getContext('2d');c.clearRect(0,0,250,250);for(const cell of heatCells){c.fillStyle=cell.color;c.fillRect(cell.x/4,cell.y/4,10,10);}this.heatTexture.needsUpdate=true;this.lastHeat=heatCells;}
  this.renderer.setClearColor(0x000000,0);this.renderer.render(this.scene,cam);g.drawImage(this.renderer.domElement,0,0,w,h);return true;
 }
 project(x,y,z=0){const p=new T.Vector3(x-500,z,y-500).project(this.camera);return{x:(p.x+1)*this.width/2,y:(1-p.y)*this.height/2};}
 earth(g,w,h,dpr,lon,lat,radius,opacity,level=0,tilt=1,rotation=0,mask=null){
  if(!this.ready||!this.earthReady||opacity<=0)return false;this.size(w,h,dpr);
  const cam=this.earthCamera,l=lon*Math.PI/180,a=lat*Math.PI/180;
  cam.left=-w/(2*radius);cam.right=-cam.left;cam.top=h/(2*radius);cam.bottom=-cam.top;
  cam.position.set(Math.cos(a)*Math.cos(l)*4,Math.sin(a)*4,-Math.cos(a)*Math.sin(l)*4);cam.lookAt(0,0,0);cam.updateProjectionMatrix();cam.updateMatrixWorld();
  const right=new T.Vector3().setFromMatrixColumn(cam.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(cam.matrixWorld,1);
  this.earthSun.position.copy(cam.position).addScaledVector(right,-3).addScaledVector(up,2.8);
  this.renderer.setClearColor(0x000000,0);
  const blend=root.AirViewImagery.styleWeights(level).flat;
  if(blend<1){this.renderer.render(this.earthScene,cam);g.save();g.globalAlpha=opacity;g.drawImage(this.renderer.domElement,0,0,w,h);g.restore();}
  if(blend>0&&mask){this.surface.render(this.renderer,this.earthTexture,mask,w,h,lon,lat,radius,level,tilt,rotation);g.save();g.globalAlpha=opacity*blend;g.drawImage(this.renderer.domElement,0,0,w,h);g.restore();}
  return true;
 }
}
root.AirViewRealistic=RealisticView;
})(typeof window!=='undefined'?window:globalThis);
