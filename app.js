import * as THREE from './vendor/three.module.js';
import {Cloth,clamp} from './simulation.js';

const $=id=>document.getElementById(id),cloth=new Cloth();
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}
catch(error){$('error').hidden=false;$('error').textContent='The 3D viewer needs WebGL. Please enable hardware acceleration or try a browser with WebGL support.';throw error;}
const viewport=$('viewport');viewport.appendChild(renderer.domElement);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setClearColor(0xeeedf0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xeeedf0,12,23);
const camera=new THREE.PerspectiveCamera(35,1,.1,60);
const target=new THREE.Vector3(0,1.6,.25);let azimuth=.43,elevation=.19,distance=7.7;
function placeCamera(){camera.position.set(target.x+distance*Math.sin(azimuth)*Math.cos(elevation),target.y+distance*Math.sin(elevation),target.z+distance*Math.cos(azimuth)*Math.cos(elevation));camera.lookAt(target);}
placeCamera();scene.add(new THREE.HemisphereLight(0xffffff,0xa4a0b2,2.6));
const key=new THREE.DirectionalLight(0xffffff,3.4);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-4,right:4,top:5,bottom:-4,near:.1,far:20});key.shadow.bias=-.0005;scene.add(key);
const rim=new THREE.DirectionalLight(0xd3b9ff,2);rim.position.set(4,3,-3);scene.add(rim);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xeeedf0,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(7,28,0xcac5d2,0xdfdbe4);grid.position.y=.003;grid.material.transparent=true;grid.material.opacity=.48;scene.add(grid);
const mannequin=new THREE.Group();scene.add(mannequin);
const bodyMaterial=new THREE.MeshStandardMaterial({color:0xd2cbd7,roughness:.58,metalness:.12});
function ellipsoid(name,pos,scale){const m=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),bodyMaterial);m.name=name;m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;mannequin.add(m);return m;}
ellipsoid('Torso',[0,1.92,0],[.43,.75,.26]);ellipsoid('Head',[0,2.98,0],[.29,.34,.27]);ellipsoid('Neck',[0,2.63,0],[.14,.23,.14]);
const left=ellipsoid('Left shoulder',[-.47,2.29,0],[.17,.45,.17]);left.rotation.z=-.28;
const right=ellipsoid('Right shoulder',[.47,2.29,0],[.17,.45,.17]);right.rotation.z=.28;
ellipsoid('Stand',[0,.67,0],[.045,.67,.045]);
const base=new THREE.Mesh(new THREE.CylinderGeometry(.38,.44,.06,48),bodyMaterial);base.position.y=.035;base.receiveShadow=true;mannequin.add(base);
const geometry=new THREE.BufferGeometry(),positions=new Float32Array(cloth.positions.length*3),colors=new Float32Array(positions.length);
geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(cloth.faces.flat());
const material=new THREE.MeshStandardMaterial({color:0xb197dd,side:THREE.DoubleSide,roughness:.78,metalness:.06,vertexColors:false});
const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;scene.add(mesh);
const ghostGeometry=new THREE.BufferGeometry();ghostGeometry.setAttribute('position',new THREE.Float32BufferAttribute(cloth.rest.flat(),3));ghostGeometry.setIndex(cloth.faces.flat());
const ghost=new THREE.Mesh(ghostGeometry,new THREE.MeshBasicMaterial({color:0x65577e,wireframe:true,transparent:true,opacity:.17,depthWrite:false}));ghost.visible=false;scene.add(ghost);
const pinGeometry=new THREE.BufferGeometry();pinGeometry.setAttribute('position',new THREE.Float32BufferAttribute(cloth.rest.slice(0,cloth.nx+1).filter((_,i)=>i%3===0).flat(),3));scene.add(new THREE.Points(pinGeometry,new THREE.PointsMaterial({color:0x544264,size:.045})));
function updateMesh(){for(let i=0;i<cloth.positions.length;i++)positions.set(cloth.positions[i],i*3);geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();}
const dark=new THREE.Color(0x554073),light=new THREE.Color(0xe6d8ff),color=new THREE.Color();
function updateColors(){cloth.weights.forEach((w,i)=>{color.copy(dark).lerp(light,w);colors.set([color.r,color.g,color.b],i*3);});geometry.attributes.color.needsUpdate=true;}
updateColors();updateMesh();
const resize=()=>{const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(viewport);resize();
let drag=null;
renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;azimuth-=(e.clientX-drag.x)*.007;elevation=clamp(elevation+(e.clientY-drag.y)*.005,-.30,1.1);drag={x:e.clientX,y:e.clientY};placeCamera();});
renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('pointercancel',()=>drag=null);
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance*Math.exp(e.deltaY*.001),3.5,13);placeCamera();},{passive:false});
$('home').onclick=()=>{azimuth=.43;elevation=.19;distance=7.7;placeCamera();};
let running=!matchMedia('(prefers-reduced-motion: reduce)').matches;
function playState(){$('pause').textContent=running?'Ⅱ Pause':'▶ Play';$('state').textContent=running?'SIMULATING':'PAUSED';$('step').disabled=running;}
playState();$('pause').onclick=()=>{running=!running;playState();};$('reset').onclick=()=>{cloth.reset();updateMesh();};$('step').onclick=()=>{cloth.step(+$('wind').value,+$('gravity').value);updateMesh();};
function syncBlend(){cloth.alpha=+$('alpha').value;cloth.beta=+$('beta').value;cloth.profile=$('profile').checked;$('alphaValue').value=cloth.alpha.toFixed(2);$('betaValue').value=cloth.beta.toFixed(2);cloth.rebuild();document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('selected'));drawPanel();}
for(const id of ['alpha','beta','profile'])$(id).addEventListener('input',syncBlend);
document.querySelectorAll('[data-preset]').forEach(button=>button.onclick=()=>{
 const preset=button.dataset.preset,value=preset==='sculpted'?0:preset==='panel'?1:.65;
 $('alpha').value=value;$('beta').value=value;$('profile').checked=preset==='blend';syncBlend();button.classList.add('selected');cloth.reset();updateMesh();
});
for(const id of ['wind','gravity'])$(id).oninput=()=>$(id+'Value').value=(+$(id).value).toFixed(1);
$('wire').onchange=()=>material.wireframe=$('wire').checked;
$('heat').onchange=()=>{material.vertexColors=$('heat').checked;material.color.set($('heat').checked?0xffffff:0xb197dd);material.needsUpdate=true;};
$('ghost').onchange=()=>ghost.visible=$('ghost').checked;
const panel=$('pattern'),ctx=panel.getContext('2d');let panelWidth=0,panelHeight=0;
function panelPoint(u,v){return [panelWidth/2+(u-.5)*(panelWidth*.44+panelWidth*.32*v),15+v*(panelHeight-30)];}
function drawPanel(){
 const ratio=Math.min(devicePixelRatio,2),rect=panel.getBoundingClientRect();panelWidth=rect.width;panelHeight=rect.height;panel.width=rect.width*ratio;panel.height=rect.height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,panelWidth,panelHeight);
 for(const face of cloth.faces){ctx.beginPath();face.forEach((k,i)=>{const j=Math.floor(k/(cloth.nx+1)),u=(k%(cloth.nx+1))/cloth.nx,v=j/cloth.ny,p=panelPoint(u,v);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();const w=face.reduce((s,i)=>s+cloth.weights[i],0)/3;ctx.fillStyle=`rgb(${91+w*135},${72+w*140},${126+w*124})`;ctx.fill();ctx.strokeStyle='#17131d28';ctx.lineWidth=.4;ctx.stroke();}
 ctx.strokeStyle='#d8c8f4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(...panelPoint(0,0));ctx.lineTo(...panelPoint(1,0));ctx.stroke();ctx.fillStyle='#8d829e';ctx.font='8px system-ui';ctx.fillText('PINNED',9,18);ctx.fillText('2D PANEL',9,panelHeight-11);
}
new ResizeObserver(drawPanel).observe(panel);
let painting=false;
function paint(e){const r=panel.getBoundingClientRect(),v=clamp((e.clientY-r.top-15)/(panelHeight-30)),width=panelWidth*(.44+.32*v),u=clamp((e.clientX-r.left-panelWidth/2)/width+.5);$('profile').checked=true;cloth.profile=true;cloth.paint(u,v,.17,+$('brush').value);document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('selected'));updateColors();drawPanel();}
panel.onpointerdown=e=>{painting=true;panel.setPointerCapture(e.pointerId);paint(e);};panel.onpointermove=e=>{if(painting)paint(e);};panel.onpointerup=()=>painting=false;panel.onpointercancel=()=>painting=false;
// Keyboard-accessible alternative: paint one selected panel row at a time.
let keyboardRow=.5;
panel.onkeydown=e=>{if(['ArrowUp','ArrowDown','Enter',' '].includes(e.key)){e.preventDefault();if(e.key==='ArrowUp')keyboardRow=clamp(keyboardRow-.1);else if(e.key==='ArrowDown')keyboardRow=clamp(keyboardRow+.1);else{cloth.paint(.5,keyboardRow,.24,+$('brush').value);$('profile').checked=true;cloth.profile=true;cloth.rebuild();updateColors();}drawPanel();ctx.strokeStyle='white';ctx.strokeRect(panelWidth/2-6,15+keyboardRow*(panelHeight-30)-6,12,12);}};
panel.title='Drag to paint. Keyboard: Up/Down select row, Enter paints center of row.';
$('restore').onclick=()=>{cloth.weights=cloth.weights.map((_,k)=>clamp((Math.floor(k/(cloth.nx+1))/cloth.ny-.13)/.64));cloth.rebuild();updateColors();drawPanel();};
$('vertices').textContent=cloth.positions.length;
let last=performance.now(),accumulator=0,frames=0,reportTime=last;
function animate(now){requestAnimationFrame(animate);const elapsed=Math.min((now-last)/1000,.05);last=now;if(running&&!document.hidden){accumulator+=elapsed;let steps=0;while(accumulator>=1/60&&steps<3){cloth.step(+$('wind').value,+$('gravity').value);accumulator-=1/60;steps++;}if(steps)updateMesh();}else accumulator=0;renderer.render(scene,camera);frames++;if(now-reportTime>600){$('fps').textContent=Math.round(frames*1000/(now-reportTime));$('strain').textContent=(cloth.strain()*100).toFixed(1)+'%';frames=0;reportTime=now;}}
requestAnimationFrame(animate);
