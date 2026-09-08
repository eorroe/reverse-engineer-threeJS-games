/* All models, scenery, collectibles and animation are built from original geometry. */
'use strict';
(() => {
  const {Node,G,color,lerp,clamp}=PP;
  const C={cream:0xfff8e8,white:0xfffdf4,ink:0x203d43,dark:0x173d42,mint:0x59c9b1,teal:0x2b8f87,orange:0xff9450,yellow:0xffd875,coral:0xea795f,sand:0xebd9b2,pink:0xeab3a2,road:0xe7bf97,water:0x43b8b8};
  const geo={box:G.box(),sphere:G.sphere(16,10),low:G.sphere(9,6,true),cyl:G.cylinder(12),cone:G.cylinder(10,0,1),wedge:G.wedge(),tire:G.torus(.56,.073,24,7),rim:G.torus(.485,.018,24,5),ring:G.torus(.48,.045,20,6),plane:G.plane(1),water:G.plane(420,60)};
  function mesh(g,c,p=[0,0,0],s=[1,1,1],r=[0,0,0],cast=true){const n=new Node(typeof g==='string'?geo[g]:g,c);n.pos=p;n.scale=s;n.rot=r;n.cast=cast;return n;}
  function tube(a,b,r,c,parent){const v=b.map((x,i)=>x-a[i]),len=Math.hypot(...v),n=mesh('cyl',c,a.map((x,i)=>(x+b[i])/2),[r,len,r]);n.rot=[Math.atan2(v[2],v[1]),0,-Math.asin(clamp(v[0]/len,-1,1))];if(parent)parent.add(n);return n;}
  function updateTube(n,a,b,r){const v=b.map((x,i)=>x-a[i]),len=Math.hypot(...v);n.pos=a.map((x,i)=>(x+b[i])/2);n.scale=[r,len,r];n.rot=[Math.atan2(v[2],v[1]),0,-Math.asin(clamp(v[0]/len,-1,1))];}
  const leafGeo=G.sphere(6,4,true);
  function palm(height=6,lean=.3){
    const root=new Node();const brown=0xb9946e;
    for(let i=0;i<5;i++)tube([lean*(i/5)**2,height*i/5,0],[lean*((i+1)/5)**2,height*(i+1)/5,0],.18-i*.021,brown,root);
    const crown=new Node().at(lean,height,0);root.add(crown);
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2,leaf=new Node().turn(0,a,0);leaf.add(mesh(leafGeo,i%2?0x79b18b:0x438f79,[0,-.12,1.07],[.35,.115,1.47],[.23,0,0]));leaf.add(mesh(leafGeo,0x70a681,[0,-.58,2.13],[.19,.075,.82],[.63,0,0]));crown.add(leaf);}
    for(let i=0;i<3;i++)crown.add(mesh('low',0x897255,[Math.cos(i*2.1)*.24,-.15,Math.sin(i*2.1)*.24],[.19,.23,.19]));return root;
  }
  function umbrella(c=0xf2a17e){const root=new Node();tube([0,0,0],[0,2.3,0],.045,0xe8d7b4,root);const top=mesh(G.cylinder(10,.04,1),c,[0,2.35,0],[1.35,.55,1.35]);root.add(top);root.add(mesh('sphere',0xffe6bd,[0,2.66,0],[.08,.08,.08]));return root;}
  function building(index=0){
    const root=new Node(),palette=[0xf7e5bf,0xe99b80,0xa7c5b3,0xf2d1a4,0xd7b7a4],w=3.5+(index%3)*.45,h=3.5+(index%4)*.75,d=4.6,c=palette[index%palette.length];
    root.add(mesh('box',c,[0,h/2,0],[w,h,d]));root.add(mesh('box',0xfff1d4,[0,h+.08,0],[w+.25,.2,d+.28]));root.add(mesh('box',0xc88568,[0,h+.28,0],[w-.18,.3,d-.15]));
    for(let floor=0;floor<Math.floor(h/1.6);floor++)for(const z of [-1.35,1.25]){
      root.add(mesh('box',0xfef0cf,[-w/2-.04,1.35+floor*1.55,z],[.13,1.1,.85]));root.add(mesh('box',0x487b7d,[-w/2-.12,1.35+floor*1.55,z],[.05,.88,.65]));root.add(mesh('box',0xfbe6c2,[-w/2-.16,1.35+floor*1.55,z],[.04,.035,.67]));
      for(const dz of [-.45,.45])root.add(mesh('box',index%2?0x68a49b:0xbc7964,[-w/2-.1,1.35+floor*1.55,z+dz],[.09,1.1,.19]));
    }
    root.add(mesh('box',0x427b77,[-w/2-.08,.8,0],[.1,1.55,.75]));root.add(mesh('sphere',0xf4ca74,[-w/2-.16,.8,.25],[.05,.05,.05]));
    for(let i=0;i<7;i++)root.add(mesh('box',i%2?0xfef4d9:(index%2?0xee976a:0x65b2a0),[-w/2-.52,2.05,(i-3)*.42],[1.15,.1,.415],[0,0,-.15]));
    root.add(mesh('box',0xf4e8cf,[-w/2-.68,.35,-1.2],[.65,.7,.75]));root.add(mesh('low',0x6eaa83,[-w/2-.68,.94,-1.2],[.4,.56,.42]));
    if(index%2===0){root.add(mesh('box',0xf9e6c6,[0,h+.6,.7],[.6,.9,.65]));root.add(mesh('box',0xdbb798,[0,h+1.1,.7],[.8,.12,.82]));}
    return root;
  }
  function lighthouse(){const r=new Node();for(let i=0;i<5;i++)r.add(mesh(G.cylinder(14,.88-i*.06,.94-i*.06),i%2?C.coral:C.cream,[0,.95+i*1.65,0],[1,1.65,1]));r.add(mesh('cyl',C.ink,[0,8.4,0],[1,.15,1]));r.add(mesh('cyl',0xffdf90,[0,8.95,0],[.68,.9,.68]));r.add(mesh('cone',C.coral,[0,9.75,0],[1.03,.85,1.03]));r.add(mesh('cyl',C.cream,[0,.13,0],[1.55,.3,1.55]));for(let i=0;i<6;i++){const a=i/6*Math.PI*2;tube([Math.cos(a)*.74,8.3,Math.sin(a)*.74],[Math.cos(a)*.74,9.4,Math.sin(a)*.74],.045,C.ink,r);}return r;}
  function sailboat(c=0xe9a786){const r=new Node();r.add(mesh('sphere',C.cream,[0,.12,0],[.85,.28,2.05]));r.add(mesh('box',0xb89677,[0,.3,0],[1.1,.12,2.5]));tube([0,.25,0],[0,4.5,0],.04,C.cream,r);r.add(mesh('wedge',c,[.05,2.25,-.45],[.07,10.0,3.2],[0,0,0]));r.children[r.children.length-1].mode=2;r.add(mesh('wedge',C.cream,[-.05,2.05,.75],[.07,8.6,1.8],[0,Math.PI,0]));r.children[r.children.length-1].mode=2;return r;}
  function makePelican(){
    const root=new Node(),bike=new Node(),bird=new Node().at(0,1.32,.15);root.add(bike,bird);const wheels=[];
    for(const z of [-.97,.88]){const wheel=new Node().at(0,.63,z);wheel.add(mesh('tire',C.ink));wheel.add(mesh('rim',0xffecc7));wheel.add(mesh('cyl',0xe7caa0,[0,0,0],[.1,.2,.1],[0,0,Math.PI/2]));for(let i=0;i<10;i++){const a=i/10*Math.PI*2;tube([0,0,0],[0,Math.sin(a)*.48,Math.cos(a)*.48],.009,0xe1d7bc,wheel).cast=false;}bike.add(wheel);wheels.push(wheel);}
    const A=[0,1.26,.33],B=[0,.66,0],R=[0,.63,.88],H=[0,1.29,-.69],F=[0,.63,-.97];
    for(const [a,b] of [[A,B],[B,R],[R,A],[A,H],[H,B],[H,F]])tube(a,b,.046,C.mint,bike);
    tube([-.12,.66,0],[-.12,.63,.88],.02,C.ink,bike);tube([.12,.66,0],[.12,.63,.88],.02,C.ink,bike);
    tube(A,[0,1.46,.37],.04,0xd8d6c4,bike);bike.add(mesh('sphere',0xb17f62,[0,1.47,.36],[.21,.09,.31]));tube(H,[0,1.58,-.79],.035,C.cream,bike);tube([-.4,1.58,-.79],[.4,1.58,-.79],.033,C.cream,bike);for(const x of [-.41,.41])tube([x,1.57,-.79],[x,1.54,-.54],.048,C.ink,bike);
    bike.add(mesh('sphere',C.yellow,[.18,1.63,-.78],[.065,.045,.065]));bike.add(mesh('sphere',C.cream,[0,1.27,-.95],[.11,.11,.11]));
    const basket=new Node().at(0,1.25,-1.16);basket.add(mesh('box',0xd1a67b,[0,0,0],[.56,.35,.38]));for(let j=0;j<3;j++)basket.add(mesh('box',0xf3c897,[0,-.12+j*.1,-.202],[.58,.025,.025]));for(let j=0;j<5;j++)basket.add(mesh('box',0xebc192,[-.25+j*.125,0,-.215],[.025,.37,.025]));bike.add(basket);
    bird.add(mesh('sphere',C.cream,[0,.61,.22],[.51,.65,.69],[.22,0,0]));bird.add(mesh('sphere',0xe8eadd,[0,.48,-.09],[.38,.49,.48]));
    for(let i=-1;i<=1;i++)bird.add(mesh('sphere',i?0xf8f3df:0xe1e6d7,[i*.14,.41,.81],[.16,.12,.43],[-.15,i*.17,0]));
    const neck=new Node().at(0,.84,-.19);neck.add(mesh('sphere',C.cream,[0,.4,-.1],[.27,.66,.28],[-.23,0,0]));const head=new Node().at(0,.98,-.27);neck.add(head);bird.add(neck);
    head.add(mesh('sphere',C.white,[0,.03,0],[.35,.36,.4]));head.add(mesh('sphere',0xeec488,[0,-.19,-.39],[.29,.22,.56],[.09,0,0]));head.add(mesh('sphere',C.orange,[0,-.06,-.65],[.27,.085,.73],[.02,0,0]));head.add(mesh('sphere',0xf6b251,[0,-.085,-1.22],[.09,.08,.18],[.18,0,0]));
    for(const x of [-.303,.303]){head.add(mesh('sphere',0xf7db99,[x,.11,-.14],[.08,.125,.135]));head.add(mesh('sphere',C.ink,[x*1.18,.135,-.177],[.052,.069,.068]));head.add(mesh('sphere',C.white,[x*1.25,.164,-.203],[.017,.022,.02]));}
    const cap=new Node().at(0,.27,.03);cap.add(mesh('sphere',0xe87d55,[0,0,0],[.31,.16,.34]));cap.add(mesh('sphere',0xf19868,[0,-.035,-.28],[.31,.04,.23]));cap.add(mesh('sphere',0xffd6aa,[0,.16,0],[.04,.04,.04]));head.add(cap);
    const wings=[];for(const side of [-1,1]){const w=new Node().at(side*.38,.78,.09).turn(.12,0,side*.12);w.add(mesh('sphere',C.white,[side*.11,-.09,-.1],[.17,.39,.47],[.65,0,side*.1]));for(let j=0;j<3;j++)w.add(mesh('sphere',0xe1e7da,[side*.09,-.32,.12+j*.105],[.1,.17,.22],[-.5,0,0]));bird.add(w);wings.push(w);}
    const scarf=new Node().at(0,1.17,-.21);scarf.add(mesh('sphere',C.teal,[0,0,0],[.285,.125,.3]));const tail=new Node().at(.17,-.015,.16);tail.add(mesh('box',C.mint,[0,-.02,.27],[.15,.06,.65],[-.18,-.13,0]));tail.add(mesh('box',0x8cdbc0,[0,.045,.52],[.16,.025,.09],[-.18,-.13,0]));scarf.add(tail);bird.add(scarf);
    const crank=new Node().at(0,.67,0);tube([-.32,0,-.17],[.32,0,.17],.025,0xd0c9b2,crank);for(const s of [-1,1])crank.add(mesh('box',C.ink,[s*.36,0,s*.17],[.2,.07,.15]));bike.add(crank);
    const legs=[];for(const side of [-1,1]){const leg=tube([side*.22,1.6,.27],[side*.35,.76,side*.17],.049,C.orange,bike);legs.push(leg);}
    const foot=[];for(const s of [-1,1]){const f=mesh('sphere',C.orange,[s*.36,.73,s*.17],[.11,.06,.2]);bike.add(f);foot.push(f);}
    const animate=(t,speed,jump,duck,boost,laneTilt)=>{
      const a=t*(speed>1?Math.min(speed*.65,15):2);wheels.forEach(w=>w.rot[0]=-a);crank.rot[0]=-a;root.rot[2]=laneTilt;root.rot[0]=jump>0?-.10:0;bird.pos[1]=lerp(bird.pos[1],duck?.89:1.32,.18);bird.rot[0]=duck?-.57:Math.sin(t*2)*.025;bird.pos[2]=duck?.29:.15;head.rot[1]=Math.sin(t*.7)*.04;tail.rot[0]=Math.sin(t*12)*.22;tail.rot[1]=Math.sin(t*8)*.13;wings.forEach((w,i)=>{w.rot[2]=(i?1:-1)*(boost?.62:jump>.3?.7:.12);});
      for(let i=0;i<2;i++){const s=i?1:-1,pp=[s*.36,.72+Math.sin(a)*s*.17,Math.cos(a)*s*.17];updateTube(legs[i],[s*.22,duck?1.37:1.62,.28],pp,.05);foot[i].pos=pp;}
    };
    return {root,animate,bird,wheels};
  }
  function obstacle(kind){const r=new Node();
    if(kind==='crate'){r.add(mesh('box',0xd39769,[0,.54,0],[1.3,1.08,.92]));for(const x of [-.53,.53])r.add(mesh('box',0xf0c48d,[x,.54,.485],[.12,1.07,.055]));for(const y of [.12,.53,.95])r.add(mesh('box',0xf1c58e,[0,y,.48],[1.31,.08,.05]));r.add(mesh('box',0xeabb86,[0,.54,.52],[.13,1.33,.06],[0,0,.79]));r.add(mesh('box',0xf5d6a3,[0,1.1,0],[1.37,.08,1]));}
    if(kind==='barrier'){for(const x of [-.77,.77]){tube([x,0,0],[x,1,0],.065,C.cream,r);r.add(mesh('box',C.ink,[x,.06,0],[.4,.12,.6]));}const b=mesh('box',C.orange,[0,.79,0],[1.85,.38,.19]);b.mode=4;r.add(b);r.add(mesh('sphere',C.yellow,[0,1.04,0],[.10,.09,.08]));}
    if(kind==='arch'){for(const x of [-.99,.99]){tube([x,0,0],[x,3.8,0],.07,C.teal,r);r.add(mesh('box',C.sand,[x,.06,0],[.35,.12,.6]));}r.add(mesh('box',C.teal,[0,3.75,0],[2.13,.16,.2]));r.add(mesh('box',C.orange,[0,3.06,0],[1.87,1.13,.14]));r.add(mesh('box',C.cream,[0,3.0,.09],[1.45,.09,.02]));for(const x of [-.4,0,.4])r.add(mesh('wedge',C.cream,[x,2.81,.10],[.17,.02,.3],[Math.PI/2,0,0]));}
    if(kind==='van'){r.add(mesh('box',C.mint,[0,1.05,0],[1.65,1.85,2.6]));r.add(mesh('box',C.cream,[0,2,0],[1.76,.16,2.75]));r.add(mesh('box',0x497d81,[0,1.49,1.315],[1.4,.53,.035]));r.add(mesh('box',0xebf1d8,[0,.4,1.39],[1.8,.15,.2]));for(const x of [-.88,.88])for(const z of [-.85,.85])r.add(mesh('cyl',C.ink,[x,.4,z],[.33,.18,.33],[0,0,Math.PI/2]));for(const x of [-.6,.6])r.add(mesh('box',C.coral,[x,.79,1.33],[.19,.21,.03]));r.add(mesh('box',C.yellow,[0,.62,1.335],[.45,.15,.03]));}
    return r;
  }
  function fish(){const root=new Node();root.add(mesh('sphere',0xffce65,[0,0,0],[.3,.16,.11]));root.add(mesh('wedge',0xffbc49,[-.32,0,0],[.37,.16,.32],[0,Math.PI/2,Math.PI/2]));root.add(mesh('sphere',0xa16b31,[.17,.035,.107],[.025,.025,.012]));root.add(mesh('sphere',0xffefb0,[0,.056,.091],[.19,.048,.023]));for(const n of root.children)n.mode=3;return root;}
  function powerup(type='shield'){const root=new Node(),c=type==='shield'?0x8be1d5:0xebacff;const core=mesh('low',c,[0,0,0],[.4,.46,.4]);core.mode=3;root.add(core);const ring=mesh('ring',C.cream,[0,0,0],[1.35,1.35,1.35],[0,0,Math.PI/2]);ring.mode=3;root.add(ring);return root;}
  function createWorld(){
    const root=new Node(),scenery=new Node(),track=new Node(),objects=new Node(),particles=new Node();root.add(scenery,track,objects,particles);
    const water=mesh('water',C.water,[-45,-.66,-115]);water.mode=1;water.cast=false;root.add(water);
    const beach=mesh('box',0xead6ac,[20,-.6,-115],[31,1.0,370]);root.add(beach);
    const segments=[];for(let i=0;i<19;i++){const r=new Node().at(0,0,20-i*16);r.add(mesh('box',C.road,[0,-.17,0],[8,.34,16]));for(const x of [-1.35,1.35])for(const z of [-6,-2,2,6])r.add(mesh('box',0xffe9c6,[x,.012,z],[.055,.017,1.25],undefined,false));
      for(const x of [-4.22,4.22]){r.add(mesh('box',0xf6e4bd,[x,-.02,0],[.38,.3,16]));for(const z of [-6,-2,2,6])r.add(mesh('box',0xc88973,[x,.142,z],[.38,.03,1.5]));}
      r.add(mesh('box',0xe2c9a1,[5.3,-.035,0],[1.78,.2,16]));for(let z=-7;z<8;z+=2)r.add(mesh('box',0xd6ba91,[5.3,.068,z],[1.75,.015,.023],undefined,false));
      for(const z of [-6,2]){tube([-4.43,.06,z],[-4.43,.92,z],.053,0xf9e7c7,r);r.add(mesh('sphere',0xf9e7c7,[-4.43,.94,z],[.082,.065,.082]));}tube([-4.43,.71,-8],[-4.43,.71,8],.035,0xf4dfba,r);
      track.add(r);segments.push(r);
    }
    const decor=[];for(let i=0;i<13;i++){
      const r=new Node().at(0,0,10-i*24);const p=palm(5+(i%3)*.8,i%2?.48:-.35).at(i%3===0?-5.6:6.1,0,0);r.add(p);
      if(i%3!==0)r.add(building(i).at(9+(i%2)*.8,0,-7).turn(0,.02*(i%3),0));
      else{r.add(umbrella(i%2?0xe8ab82:0x8bbeb1).at(8,0,-4));r.add(mesh('box',0xf7e6c9,[8,.08,-3.7],[1.3,.12,2.1]));r.add(mesh('box',0xea9f7e,[8,.15,-3.7],[.92,.025,1.8]));}
      if(i%2===0){for(let j=0;j<3;j++)r.add(mesh('low',j%2?0x9cae9e:0xc2bda5,[-5.6-j*.7,-.33,-5+j*.7],[.8+j*.14,.5+j*.13,1]));}
      const lamp=new Node().at(5.92,0,7);tube([0,0,0],[0,3.8,0],.048,0x587f78,lamp);tube([0,3.8,0],[-.5,3.8,0],.04,0x587f78,lamp);lamp.add(mesh('cone',0x527f73,[-.52,3.73,0],[.26,.16,.26]));const glow=mesh('sphere',0xffe1a0,[-.52,3.6,0],[.17,.13,.17]);glow.mode=2;lamp.add(glow);r.add(lamp);
      scenery.add(r);decor.push(r);
    }
    const far=new Node();root.add(far);const tower=lighthouse().at(-27,-.45,-92);far.add(tower);for(let j=0;j<7;j++)far.add(mesh('low',0x9eae9e,[-27+(j-3)*2,-.8,-92+Math.sin(j)*2],[2.7,1.6,3.3]));
    const boats=[];for(let i=0;i<4;i++){const boat=sailboat(i%2?0xecad8e:0xffe0a9).at(-17-i*13,-.36,-32-i*42).turn(0,.4+i*.5,0);far.add(boat);boats.push(boat);}
    for(let i=0;i<9;i++){const hill=mesh('low',i%2?0x95b9ae:0xa9c3b3,[-70-i*9,1+i%4,-145-i*8],[12+i%3*4,5+i%4*2,10]);hill.cast=false;far.add(hill);}
    const clouds=[];for(let i=0;i<12;i++){const cloud=new Node().at(-100+i*19,26+(i%3)*8,-145-(i%4)*23);for(let j=0;j<5;j++)cloud.add(mesh('low',0xfff5de,[(j-2)*2.6,Math.sin(j*2)*.7,Math.sin(j)*1],[3.7,1.65+(j%2),2.7],undefined,false));cloud.children.forEach(n=>n.mode=2);far.add(cloud);clouds.push(cloud);}
    const birds=[];for(let i=0;i<8;i++){const bird=new Node().at(-16+i*2,11+Math.sin(i)*1.2,-45-i*4);for(const s of [-1,1])bird.add(mesh('sphere',C.cream,[s*.34,0,0],[.43,.035,.12],[0,0,s*.24],false));far.add(bird);birds.push(bird);}
    const balloon=new Node().at(-42,20,-125);balloon.add(mesh('sphere',0xe69775,[0,0,0],[2.5,3.2,2.5]));for(const x of [-.55,.55])tube([x,-2,0],[x,-4.2,0],.025,0xf7e6c9,balloon);balloon.add(mesh('box',0xc19670,[0,-4.2,0],[1.35,.8,1.05]));far.add(balloon);
    const pelican=makePelican();root.add(pelican.root);
    const shield=new Node();for(let i=0;i<8;i++){const f=mesh('sphere',0xa3ead6,[Math.cos(i*.785)*1.05,1.15+Math.sin(i*.785)*1.25,0],[.045,.045,.045]);f.mode=3;shield.add(f);}pelican.root.add(shield);shield.visible=false;
    const baseEnv={top:[.46,.76,.79],fog:[.97,.85,.66],sun:PP.norm([-0.45,.28,-.8]),night:0};
    const update=(dt,speed,t,distance)=>{
      for(const s of segments){s.pos[2]+=speed*dt;if(s.pos[2]>36)s.pos[2]-=304;}
      for(const s of decor){s.pos[2]+=speed*dt;if(s.pos[2]>36)s.pos[2]-=312;}
      boats.forEach((b,i)=>{b.pos[1]=-.4+Math.sin(t*.6+i)*.08;b.rot[2]=Math.sin(t*.7+i)*.025;});clouds.forEach((c,i)=>{c.pos[0]+=dt*.17;if(c.pos[0]>140)c.pos[0]=-140;});birds.forEach((b,i)=>{b.pos[1]=11+Math.sin(t*.6+i)*.9;b.children.forEach((w,j)=>w.rot[2]=(j?1:-1)*Math.sin(t*3+i)*.28);});balloon.pos[1]=20+Math.sin(t*.25)*1.2;
      const cycle=(distance%2400)/2400;let a,b,f;
      const day={top:[.43,.74,.79],fog:[.98,.85,.67],water:[.22,.65,.66,1],night:0};
      const sunset={top:[.64,.54,.69],fog:[1,.65,.42],water:[.37,.57,.64,1],night:.18};
      const night={top:[.055,.12,.23],fog:[.23,.37,.45],water:[.08,.31,.39,1],night:.92};
      if(cycle<.32){a=day;b=sunset;f=cycle/.32;}else if(cycle<.67){a=sunset;b=night;f=(cycle-.32)/.35;}else{a=night;b=day;f=(cycle-.67)/.33;}
      f=f*f*(3-2*f);baseEnv.top=a.top.map((v,i)=>lerp(v,b.top[i],f));baseEnv.fog=a.fog.map((v,i)=>lerp(v,b.fog[i],f));baseEnv.night=lerp(a.night,b.night,f);water.color=a.water.map((v,i)=>lerp(v,b.water[i],f));
      shield.rot[1]=t*2;return baseEnv;
    };
    return {root,objects,particles,pelican,shield,update,env:baseEnv,segments,decor};
  }
  PP.World={create:createWorld,obstacle,fish,powerup,mesh,geo,C,tube};
})();