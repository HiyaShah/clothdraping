import test from 'node:test';
import assert from 'node:assert/strict';
import {Cloth,triangleMetric} from '../simulation.js';
const norm=a=>Math.hypot(...a),diff=(a,b)=>a.map((v,i)=>v-b[i]);
test('metric endpoints reproduce exact 3D and panel edge lengths',()=>{
 const p=[[0,0,0],[2,0,0],[.6,1.3,.8]],uv=[[0,0],[1.7,.2],[.8,2.1]];
 for(const weights of [[0,0],[1,1]]){const metric=triangleMetric(p,uv,...weights);for(const [a,b] of [[0,1],[1,2],[2,0]]){const expected=norm(diff(weights[0]?uv[b]:p[b],weights[0]?uv[a]:p[a]));assert.ok(Math.abs(metric(diff(p[b],p[a]))-expected)<1e-9);}}
});
test('scale and anisotropy controls affect their independent log components',()=>{
 const p=[[0,0,0],[1,0,0],[0,1,0]],uv=[[0,0],[4,0],[0,1]];
 const scale=triangleMetric(p,uv,1,0),anisotropy=triangleMetric(p,uv,0,1);
 assert.ok(Math.abs(scale([1,0,0])-2)<1e-9);assert.ok(Math.abs(scale([0,1,0])-2)<1e-9);
 assert.ok(Math.abs(anisotropy([1,0,0])-2)<1e-9);assert.ok(Math.abs(anisotropy([0,1,0])-.5)<1e-9);
});
test('simulation stays finite, pins shoulders, and resolves floor contact in all presets',()=>{
 for(const w of [0,.65,1]){const cloth=new Cloth(12,16);cloth.alpha=cloth.beta=w;cloth.profile=false;cloth.rebuild();for(let i=0;i<360;i++)cloth.step(8);assert.ok(cloth.positions.flat().every(Number.isFinite));for(let i=0;i<=cloth.nx;i++)assert.deepEqual(cloth.positions[i],cloth.rest[i]);assert.ok(cloth.positions.every(p=>p[1]>=.079));assert.ok(cloth.strain()<.25);}
});
test('painting is local, bounded, changes rest lengths, and reset preserves authored weights',()=>{
 const c=new Cloth(12,16),before=c.edges.map(e=>e[2]),weights=c.weights.slice();c.paint(.5,.5,.2,0);assert.equal(c.weights[0],weights[0]);assert.ok(c.weights.some((w,i)=>w!==weights[i]));assert.ok(c.weights.every(w=>w>=0&&w<=1));assert.ok(c.edges.some((e,i)=>Math.abs(e[2]-before[i])>1e-6));const painted=c.weights.slice();c.step();c.reset();assert.deepEqual(c.positions,c.rest);assert.deepEqual(c.weights,painted);
});
