// Educational position-based cloth. No render dependencies.
export const clamp = (x, a=0, b=1) => Math.max(a, Math.min(b,x));
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const norm=a=>Math.sqrt(dot(a,a));

// Local 3D triangle basis B, then F = UV * inverse(B).
// Diagonalizing F^T F recovers V and the squared singular values.
export function triangleMetric(p, uv, alpha, beta) {
  const e1=sub(p[1],p[0]),e2=sub(p[2],p[0]),x=norm(e1);
  const t=e1.map(v=>v/x), bx=dot(e2,t),by=Math.sqrt(Math.max(1e-14,dot(e2,e2)-bx*bx));
  const tangent=e2.map((v,k)=>(v-bx*t[k])/by);
  const u=sub(uv[1],uv[0]),v=sub(uv[2],uv[0]);
  const f00=u[0]/x,f10=u[1]/x,f01=(v[0]-u[0]*bx/x)/by,f11=(v[1]-u[1]*bx/x)/by;
  const a=f00*f00+f10*f10,b=f00*f01+f10*f11,d=f01*f01+f11*f11;
  const delta=Math.hypot(a-d,2*b),l1=Math.max(1e-12,(a+d+delta)/2),l2=Math.max(1e-12,(a+d-delta)/2);
  const theta=.5*Math.atan2(2*b,a-d),c=Math.cos(theta),s=Math.sin(theta);
  const log1=.5*Math.log(l1),log2=.5*Math.log(l2),mean=(log1+log2)/2,diff=(log1-log2)/2;
  const s1=Math.exp(alpha*mean+beta*diff),s2=Math.exp(alpha*mean-beta*diff);
  return edge=>{
    const ex=dot(edge,t),ey=dot(edge,tangent);
    return Math.hypot(s1*(c*ex+s*ey),s2*(-s*ex+c*ey));
  };
}

export class Cloth {
  constructor(nx=24,ny=32) {
    this.nx=nx;this.ny=ny;this.rest=[];this.uv=[];this.faces=[];this.weights=[];
    for(let j=0;j<=ny;j++) for(let i=0;i<=nx;i++) {
      const u=i/nx,v=j/ny,angle=(u-.5)*2.65,r=.67+.62*v;
      this.rest.push([r*Math.sin(angle),2.65-2.05*v+.10*Math.cos(angle)*Math.sin(Math.PI*v),.04+r*Math.cos(angle)+.11*Math.sin(u*Math.PI*8)*Math.sin(Math.PI*v)]);
      // A flared flat panel with excess length to make gathers.
      this.uv.push([(u-.5)*(1.85+1.35*v),v*2.36]);
      this.weights.push(clamp((v-.13)/.64));
    }
    for(let j=0;j<ny;j++) for(let i=0;i<nx;i++) {
      const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
      this.faces.push([a,c,b],[b,c,d]);
    }
    this.alpha=.65;this.beta=.65;this.profile=true;
    this.rebuild();this.reset();
  }
  rebuild() {
    const edges=new Map();
    for(const face of this.faces) {
      const w=this.profile?face.reduce((s,i)=>s+this.weights[i],0)/3:1;
      const metric=triangleMetric(face.map(i=>this.rest[i]),face.map(i=>this.uv[i]),this.alpha*w,this.beta*w);
      for(let k=0;k<3;k++) {
        const a=Math.min(face[k],face[(k+1)%3]),b=Math.max(face[k],face[(k+1)%3]),key=a+','+b;
        const l=metric(sub(this.rest[b],this.rest[a]));
        const old=edges.get(key);if(old){old[2]+=l;old[3]++;}else edges.set(key,[a,b,l,1]);
      }
    }
    this.edges=Array.from(edges.values(),e=>[e[0],e[1],e[2]/e[3]]);
  }
  reset(){this.positions=this.rest.map(p=>p.slice());this.previous=this.rest.map(p=>p.slice());this.time=0;}
  paint(u,v,radius,value) {
    for(let j=0;j<=this.ny;j++) for(let i=0;i<=this.nx;i++) {
      const d=Math.hypot(i/this.nx-u,j/this.ny-v);
      if(d<radius){const k=j*(this.nx+1)+i;this.weights[k]+=(value-this.weights[k])*(1-d/radius)*.65;}
    }
    this.rebuild();
  }
  step(wind=0,gravity=9.81) {
    const dt=1/120;
    for(let substep=0;substep<2;substep++) {
      this.time+=dt;
      for(let i=this.nx+1;i<this.positions.length;i++) {
        const p=this.positions[i],old=this.previous[i],save=p.slice();
        for(let k=0;k<3;k++)p[k]+=(p[k]-old[k])*.987;
        p[1]-=gravity*dt*dt;
        p[2]+=wind*(1.5+Math.sin(this.time*2.5+p[0]*3))*dt*dt;
        p[0]+=.25*wind*Math.sin(this.time*1.7)*dt*dt;
        this.previous[i]=save;
      }
      for(let it=0;it<9;it++) {
        for(const [a,b,rest] of this.edges) {
          const pa=this.positions[a],pb=this.positions[b],dx=pb[0]-pa[0],dy=pb[1]-pa[1],dz=pb[2]-pa[2];
          const length=Math.hypot(dx,dy,dz),wa=a>this.nx?1:0,wb=b>this.nx?1:0;
          if(length<1e-10||wa+wb===0)continue;
          const scale=(length-rest)/length*.92/(wa+wb);
          for(let k=0;k<3;k++){const correction=[dx,dy,dz][k]*scale;pa[k]+=wa*correction;pb[k]-=wb*correction;}
        }
        for(let i=this.nx+1;i<this.positions.length;i++) {
          const p=this.positions[i];p[1]=Math.max(.08,p[1]);
          // Ellipsoidal dummy torso; no self-collision or friction.
          const rx=.46,ry=.78,rz=.29,c=[0,1.92,0];
          const q=[p[0]/rx,(p[1]-c[1])/ry,p[2]/rz],len=Math.hypot(...q);
          if(len<1&&len>1e-8){p[0]=q[0]/len*rx;p[1]=c[1]+q[1]/len*ry;p[2]=q[2]/len*rz;}
        }
      }
    }
  }
  strain(){return this.edges.reduce((s,[a,b,l])=>s+Math.abs(norm(sub(this.positions[a],this.positions[b]))/l-1),0)/this.edges.length;}
}
