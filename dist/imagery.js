/* Global texture-styled overview. Fine patterns are illustrative, not satellite detail. */
(function(root){
'use strict';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function styleWeights(level){return{flat:smooth(1.8,3.8,level),illustrated:smooth(4,7,level)};}
function surfacePoint(x,y,lon,lat,radius,tilt=1,rotation=0){
 const a=lon*Math.PI/180,b=lat*Math.PI/180,sy=y/tilt;
 const u=(x*Math.cos(rotation)+sy*Math.sin(rotation))/radius,v=(-x*Math.sin(rotation)+sy*Math.cos(rotation))/radius;
 if(u*u+v*v>1)return null;const z=Math.sqrt(1-u*u-v*v);
 const nx=z*Math.cos(b)*Math.cos(a)-u*Math.sin(a)+v*Math.sin(b)*Math.cos(a);
 const ny=z*Math.sin(b)-v*Math.cos(b);
 const nz=-z*Math.cos(b)*Math.sin(a)-u*Math.cos(a)-v*Math.sin(b)*Math.sin(a);
 return[Math.atan2(-nz,nx)*180/Math.PI,Math.asin(Math.max(-1,Math.min(1,ny)))*180/Math.PI];
}
class ImagerySurface{
 constructor(T){this.T=T;}
 init(base,mask){const T=this.T;this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1,1,1,-1,0,2);this.camera.position.z=1;
  this.mask=new T.CanvasTexture(mask);this.mask.minFilter=T.LinearFilter;this.mask.generateMipmaps=false;
  const uniforms={base:{value:base},landMask:{value:this.mask},size:{value:new T.Vector2()},center:{value:new T.Vector2()},radius:{value:1},tilt:{value:1},rotation:{value:0},level:{value:0}};
  const fragment=`precision highp float;
   varying vec2 vUv;uniform sampler2D base,landMask;
   uniform vec2 size,center;uniform float radius,tilt,rotation,level;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0)),f.x),f.y);}
   void main(){
    vec2 pixel=(vUv-0.5)*size;pixel.y=-pixel.y/tilt;
    float c=cos(rotation),s=sin(rotation);
    vec2 p=vec2(c*pixel.x+s*pixel.y,-s*pixel.x+c*pixel.y)/radius;
    float distance2=dot(p,p);if(distance2>1.0)discard;
    float a=center.x,b=center.y,z=sqrt(max(0.0,1.0-distance2));
    vec3 front=vec3(cos(b)*cos(a),sin(b),-cos(b)*sin(a));
    vec3 east=vec3(-sin(a),0.0,-cos(a));
    vec3 north=vec3(-sin(b)*cos(a),cos(b),sin(b)*sin(a));
    vec3 n=normalize(front*z+east*p.x-north*p.y);
    vec2 location=vec2(atan(-n.z,n.x),asin(clamp(n.y,-1.0,1.0)))*57.295779513;
    vec3 photo=texture2D(base,vec2(location.x/360.0+0.5,location.y/180.0+0.5)).rgb;
    float land=texture2D(landMask,vUv).r;
    // Fine texture conveys a material, never roads or measured relief.
    float oceanPixel=smoothstep(0.0,0.035,photo.b-max(photo.r,photo.g));
    vec3 landColor=mix(max(photo,vec3(0.023,0.025,0.018)),vec3(0.065,0.12,0.061),0.15+0.85*oceanPixel);
    // Apply the spring material only to dark, vegetation-like hues; keep desert and snow palettes.
    float vegetation=smoothstep(0.65,0.98,photo.g/max(photo.r,0.001))*(1.0-smoothstep(0.25,0.55,max(photo.r,photo.g)))*(1.0-oceanPixel);
    landColor=mix(landColor,landColor*vec3(0.64,1.46,1.08),vegetation*0.9);
    vec3 oceanColor=mix(vec3(0.009,0.022,0.049),photo,0.45*oceanPixel);
    landColor=mix(landColor,vec3(0.043,0.11,0.042),0.22*smoothstep(0.3,0.8,noise(location*18.0))*smoothstep(5.0,8.0,level));
    float grain=(noise(location*5.0)-0.5)*0.55;
    grain+=(noise(location*36.0)-0.5)*0.30*smoothstep(6.0,9.0,level);
    grain+=(noise(location*240.0)-0.5)*0.18*smoothstep(9.0,12.0,level);
    vec3 styled=mix(oceanColor*(1.0+grain*0.3),landColor*(1.0+grain),land);
    vec3 color=mix(photo,styled,smoothstep(4.0,7.0,level));
    gl_FragColor=vec4(color,1.0);
    #include <colorspace_fragment>
   }`;
  this.material=new T.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:fragment,depthTest:false,depthWrite:false,toneMapped:false});
  this.scene.add(new T.Mesh(new T.PlaneGeometry(2,2),this.material));
 }
 render(renderer,base,mask,w,h,lon,lat,radius,level,tilt,rotation){if(!this.scene)this.init(base,mask);
  if(this.mask.image!==mask)this.mask.image=mask;this.mask.needsUpdate=true;
  const u=this.material.uniforms;u.size.value.set(w,h);u.center.value.set(lon*Math.PI/180,lat*Math.PI/180);u.radius.value=radius;u.tilt.value=tilt;u.rotation.value=rotation;u.level.value=level;
  renderer.render(this.scene,this.camera);
 }
}
root.AirViewImagery={styleWeights,surfacePoint,ImagerySurface,smooth};
if(typeof module!=='undefined')module.exports=root.AirViewImagery;
})(typeof window!=='undefined'?window:globalThis);
