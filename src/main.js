import * as THREE from 'three';
import './style.css';

const scene = new THREE.Scene();
const camera = new THREE.Camera();
const renderer = new THREE.WebGLRenderer({ antialias:false, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.querySelector('#app').appendChild(renderer.domElement);

const vertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragment = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
uniform float uZoom;
varying vec2 vUv;

#define PI 3.14159265359

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  f=f*f*(3.0-2.0*f);
  float a=hash21(i), b=hash21(i+vec2(1,0));
  float c=hash21(i+vec2(0,1)), d=hash21(i+vec2(1,1));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}

float fbm(vec2 p){
  float v=0.0, a=.5;
  for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; }
  return v;
}

mat2 rot(float a){ float s=sin(a),c=cos(a); return mat2(c,-s,s,c); }

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uResolution.xy)/uResolution.y;
  vec2 m=(uMouse-.5)*vec2(.55,.35);
  uv -= m*.12;
  uv *= 1.0/uZoom;

  float r=length(uv);
  float ang=atan(uv.y,uv.x);

  // Star field behind the lens.
  vec3 col=vec3(0.002,0.003,0.008);
  vec2 gridUV=uv*17.0;
  vec2 cell=floor(gridUV);
  vec2 gv=fract(gridUV)-.5;
  float star=hash21(cell);
  float starShape=smoothstep(.06,0.0,length(gv-(vec2(hash21(cell+3.1),hash21(cell+8.7))-.5)*.75));
  float stars=step(.992,star)*starShape;
  col += stars*vec3(0.8,0.9,1.0)*(0.7+0.3*sin(uTime*1.7+star*30.0));

  // Soft gravitational halo / lensing ring.
  float lens=exp(-pow(abs(r-.205)/.045,2.0));
  col += lens*vec3(1.0,.42,.10)*.45;

  // Accretion disk with procedural turbulence and rotation.
  float diskRadius=abs(r-.285);
  float disk=smoothstep(.145,.10,diskRadius)*smoothstep(.52,.34,r);
  float swirl=ang + 2.2*log(max(r,.04)) - uTime*.22;
  vec2 dp=vec2(swirl*3.2,r*18.0);
  float turbulence=fbm(dp + vec2(uTime*.08, -uTime*.03));
  float filaments=pow(max(turbulence-.28,0.0),1.6);
  float hot=exp(-pow((r-.23)/.075,2.0));
  float inner=exp(-pow((r-.17)/.035,2.0));
  vec3 diskColor=mix(vec3(1.0,.08,.008),vec3(1.0,.78,.24),hot);
  diskColor=mix(diskColor,vec3(1.0,.97,.78),inner);
  col += disk*filaments*diskColor*(.75+1.5*hot);

  // Shadow / event horizon.
  float horizon=smoothstep(.125,.095,r);
  col *= 1.0-horizon;

  // Photon ring.
  float ring=exp(-pow((r-.128)/.012,2.0));
  col += ring*vec3(1.0,.55,.18)*1.15;

  // Subtle radial vignette.
  col *= 1.0-smoothstep(.38,.9,r)*.5;
  col = 1.0-exp(-col*1.35);
  col = pow(col,vec3(.92));

  gl_FragColor=vec4(col,1.0);
}`;

const material = new THREE.ShaderMaterial({
  vertexShader: vertex,
  fragmentShader: fragment,
  uniforms: {
    uResolution:{value:new THREE.Vector2(innerWidth,innerHeight)},
    uTime:{value:0},
    uMouse:{value:new THREE.Vector2(.5,.5)},
    uZoom:{value:1.0}
  }
});

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2), material);
scene.add(quad);

let targetZoom=1, zoom=1;
let targetMouse=new THREE.Vector2(.5,.5);
let dragging=false, lastX=0, lastY=0;
let offsetX=0, offsetY=0;

renderer.domElement.addEventListener('pointerdown', e=>{
  dragging=true; lastX=e.clientX; lastY=e.clientY;
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e=>{
  targetMouse.x=e.clientX/innerWidth;
  targetMouse.y=1-e.clientY/innerHeight;
  if(dragging){
    offsetX += (e.clientX-lastX)*.0012;
    offsetY += (e.clientY-lastY)*.0012;
    lastX=e.clientX; lastY=e.clientY;
  }
});
renderer.domElement.addEventListener('pointerup', ()=>dragging=false);
renderer.domElement.addEventListener('wheel', e=>{
  e.preventDefault();
  targetZoom=THREE.MathUtils.clamp(targetZoom*Math.exp(-e.deltaY*.0007),.72,1.55);
},{passive:false});

addEventListener('resize',()=>{
  renderer.setSize(innerWidth,innerHeight);
  material.uniforms.uResolution.value.set(innerWidth,innerHeight);
});

const clock=new THREE.Clock();
function animate(){
  const t=clock.getElapsedTime();
  material.uniforms.uTime.value=t;
  material.uniforms.uMouse.value.lerp(targetMouse,.035);
  zoom=THREE.MathUtils.lerp(zoom,targetZoom,.055);
  material.uniforms.uZoom.value=zoom;
  renderer.render(scene,camera);
  requestAnimationFrame(animate);
}
animate();

setTimeout(()=>{
  const el=document.querySelector('#loading');
  el.style.opacity='0';
  setTimeout(()=>el.remove(),750);
},650);
