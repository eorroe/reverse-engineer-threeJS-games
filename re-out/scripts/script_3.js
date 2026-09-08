/* Pelican Pedal: endless-runner simulation, input, UI, persistence and effects. */
'use strict';
(() => {
  const $=id=>document.getElementById(id),{lerp,clamp,Node,World}=PP;
  let renderer,world;
  try{renderer=new PP.Renderer($('scene'));world=World.create();}catch(error){$('loading').classList.add('hidden');$('error').classList.remove('hidden');$('error-text').textContent=error.message||String(error);console.error(error);return;}
  const audio=new PP.AudioEngine();
  const storage={get(k,f){try{return localStorage.getItem('pelican-pedal.'+k)||f;}catch(_){return f;}},set(k,v){try{localStorage.setItem('pelican-pedal.'+k,String(v));}catch(_){}}};
  const bests={cruise:Number(storage.get('best.cruise','0'))||0,rush:Number(storage.get('best.rush','0'))||0};
  let state='menu',mode='cruise',time=0,lastTime=0,frame=0,previousPause='running',helpResume=false;
  let small=innerWidth<=760,quality=storage.get('quality','auto'),pixelRatio=1;
  let distance=0,score=0,fishCount=0,life=3,lane=0,playerX=0,playerY=0,velocityY=0,duckTime=0,jumpBuffer=0;
  let speed=0,boost=0,boostTime=0,shieldTime=0,magnetTime=0,invincible=0,combo=0,comboTime=0,maxCombo=1,nearMisses=0;
  let entities=[],spawnTravel=0,row=0,shake=0,toastTime=0,countdownTime=0,countdownPrev='',popTimer=0,uiTimer=0,boostTrail=0,region=-1;
  let sessionSeed=12345,runTime=0,deathTime=0;
  const camera={eye:[7.4,4.7,8.5],target:small?[0,1.9,-.4]:[-2.6,1.4,-.7],fov:small?50:41};
  let oldBest=0,savedSound=storage.get('sound','off'),touchStart=null;
  function random(){sessionSeed=(Math.imul(1664525,sessionSeed)+1013904223)>>>0;return sessionSeed/4294967296;}
  function show(id,on=true){$(id).classList.toggle('hidden',!on);}
  function setMode(value){mode=value;document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});$('menu-best').textContent=String(bests[mode]).padStart(5,'0');}
  function toast(text,duration=2.5){$('toast').textContent=text;$('toast').classList.add('show');toastTime=duration;}
  function pop(text){$('event-pop').textContent=text;$('event-pop').classList.remove('pop');void $('event-pop').offsetWidth;$('event-pop').classList.add('pop');popTimer=1;}
  function resize(){small=innerWidth<=760;pixelRatio=quality==='low'?Math.min(devicePixelRatio,.85):quality==='high'?Math.min(devicePixelRatio,1.7):Math.min(devicePixelRatio,small?1.3:1.5);renderer.shadows=quality!=='low';renderer.resize(innerWidth,innerHeight,pixelRatio);$('quality-btn').firstChild.nodeValue=quality==='low'?'ECO':'HD';$('quality-btn').title=quality==='low'?'节能模式：点击启用阴影':'高清模式：点击切换节能';if(state!=='menu')show('touch-controls',small&&state==='running');else{camera.target=small?[0,1.9,-.4]:[-2.6,1.4,-.7];camera.fov=small?50:41;}}
  window.addEventListener('resize',resize);resize();setMode('cruise');
  const pool=[];for(let i=0;i<140;i++){const node=World.mesh(i%4===0?'sphere':'box',World.C.yellow,[0,-20,0],[.05,.05,.05]);node.visible=false;node.cast=false;node.mode=3;world.particles.add(node);pool.push({node,life:0,max:1,v:[0,0,0],spin:[0,0,0],size:1});}
  let nextParticle=0;
  function burst(x,y,z,c,count=8,feather=false){for(let i=0;i<count;i++){const p=pool[nextParticle++%pool.length];p.node.visible=true;p.node.pos=[x,y,z];p.node.color=PP.color(c);p.max=p.life=.4+Math.random()*.5;p.v=[(Math.random()-.5)*4,Math.random()*3+1,(Math.random()-.5)*4];p.spin=[Math.random()*6,Math.random()*6,Math.random()*6];p.size=.04+Math.random()*.06;p.node.scale=feather?[p.size*.6,p.size*.35,p.size*3]:[p.size,p.size,p.size];}}
  function animateParticles(dt){for(const p of pool){if(p.life<=0)continue;p.life-=dt;if(p.life<=0){p.node.visible=false;continue;}p.v[1]-=dt*5;for(let i=0;i<3;i++){p.node.pos[i]+=p.v[i]*dt;p.node.rot[i]+=p.spin[i]*dt;}const f=Math.min(1,p.life/.18);p.node.scale=p.node.scale.map(v=>v*(.99+f*.01));}}
  function makeEntity(type,l,z,y=0,sub=''){let model;if(type==='fish')model=World.fish();else if(type==='power')model=World.powerup(sub);else model=World.obstacle(type);model.at(l*2.65,y,z);world.objects.add(model);const e={type,lane:l,x:l*2.65,y,z,prevZ:z,node:model,sub,done:false,passed:false,phase:random()*6.28};entities.push(e);return e;}
  function spawnRow(z=-155){
    const lanes=[-1,0,1];let safe=Math.floor(random()*3)-1;let occupied=[];
    if(row<5){const intro=[1,-1,0,1,-1];occupied=[intro[row]];safe=occupied[0]===0?1:0;}else{occupied=lanes.filter(l=>l!==safe);if(random()<.45)occupied.splice(Math.floor(random()*2),1);}
    for(const l of occupied){let type;if(row===0)type='barrier';else if(row===1)type='crate';else if(row===2)type='arch';else{const roll=random();type=roll<.32?'crate':roll<.59?'barrier':roll<.80?'arch':'van';}makeEntity(type,l,z);}
    const fishLane=row<3?0:safe;for(let j=0;j<5;j++)makeEntity('fish',fishLane,z-4-j*2.65,1.25);
    if(row>5&&row%6===0){const l=occupied.length===1?lanes.find(l=>l!==safe&&l!==occupied[0]):safe;makeEntity('power',l,z-17,1.5,row%12===0?'magnet':'shield');}
    if(row>6&&row%5===0){const l=occupied[0];const e=entities.find(e=>e.lane===l&&e.z===z&&e.type!=='fish');if(e&&(e.type==='crate'||e.type==='barrier'))for(let j=0;j<3;j++)makeEntity('fish',l,z+3-j*3,2.75);}
    row++;
  }
  function updateSoundButton(on){$('sound-btn').classList.toggle('sound-off',!on);$('sound-btn').setAttribute('aria-label',on?'关闭声音':'开启声音');}
  async function toggleSound(){const on=await audio.toggle();savedSound=on?'on':'off';storage.set('sound',savedSound);updateSoundButton(on);toast(on?'海风电台已开启 · M 键静音':'海风电台已静音',1.8);}
  async function start(){
    if(state==='countdown')return;audio.init();if(savedSound==='on'){await audio.toggle(true);updateSoundButton(true);}else if(audio.ctx)audio.ctx.resume().catch(()=>{});
    distance=score=fishCount=lane=playerX=playerY=velocityY=duckTime=jumpBuffer=boost=boostTime=shieldTime=magnetTime=invincible=combo=comboTime=nearMisses=runTime=0;maxCombo=1;life=3;speed=mode==='cruise'?13:18;entities=[];world.objects.children=[];spawnTravel=0;row=0;region=-1;oldBest=bests[mode];sessionSeed=(Date.now()&0xffffffff)>>>0;
    for(const p of pool){p.life=0;p.node.visible=false;}
    for(let i=0;i<8;i++)spawnRow(-40-i*(mode==='cruise'?24:22));
    world.pelican.root.visible=true;world.pelican.root.pos=[0,0,0];world.pelican.root.rot=[0,0,0];world.shield.visible=false;
    state='countdown';countdownTime=2.7;countdownPrev='';show('menu',false);show('footer',false);show('hud');show('pause-btn');show('pause-modal',false);show('help-modal',false);show('result-modal',false);show('countdown');show('touch-controls',false);$('speed-lines').classList.remove('on');document.body.classList.add('playing');document.body.classList.remove('night');updateHUD();$('start-btn').blur();
  }
  function beginRunning(){state='running';show('countdown',false);show('touch-controls',small);audio.sfx('start');toast(small?'左右滑动换道 · 上滑跳跃 · 下滑低头':'← → 换道  ·  空格跳跃  ·  ↓ 低头',3.7);}
  function pause(){if(state!=='running'&&state!=='countdown')return;previousPause=state;state='paused';show('pause-modal');show('touch-controls',false);show('countdown',false);$('resume-btn').focus();}
  function resume(){if(state!=='paused')return;state=previousPause;show('pause-modal',false);show('touch-controls',small&&state==='running');show('countdown',state==='countdown');lastTime=performance.now();if(audio.ctx)audio.ctx.resume().catch(()=>{});}
  function home(){state='menu';boostTime=shieldTime=magnetTime=invincible=duckTime=playerY=velocityY=toastTime=0;for(const p of pool){p.life=0;p.node.visible=false;}$('toast').classList.remove('show');$('event-pop').classList.remove('pop');show('menu');show('footer');show('hud',false);show('pause-btn',false);show('pause-modal',false);show('result-modal',false);show('help-modal',false);show('touch-controls',false);show('countdown',false);entities=[];world.objects.children=[];world.pelican.root.visible=true;world.shield.visible=false;playerY=0;world.pelican.root.pos=[0,0,0];world.pelican.root.rot=[0,0,0];$('speed-lines').classList.remove('on');document.body.classList.remove('playing','night');setMode(mode);$('start-btn').focus();}
  function openHelp(){helpResume=state==='running'||state==='countdown';if(helpResume){pause();show('pause-modal',false);}show('help-modal');$('help-close').focus();}
  function closeHelp(){show('help-modal',false);if(helpResume)resume();else if(state==='paused')show('pause-modal');helpResume=false;}
  function move(dir){if(state!=='running')return;const old=lane;lane=clamp(lane+dir,-1,1);if(lane!==old)audio.tone(140+lane*20,.07,'sine',.025);}
  function jump(){if(state!=='running')return;jumpBuffer=.14;if(playerY<.04){velocityY=9.8;playerY=.03;duckTime=0;jumpBuffer=0;audio.sfx('jump');burst(playerX,.2,0,0xf2e2bd,5);}}
  function duck(){if(state!=='running')return;duckTime=.94;if(playerY>.2)velocityY=-13;audio.sfx('duck');}
  function doBoost(){if(state!=='running'||boost<.995||boostTime>0){if(state==='running'&&boostTime<=0)toast('再收集一些小鱼，让顺风蓄满。',1.8);return;}boost=0;boostTime=6;audio.sfx('boost');pop('顺风时刻 · LET IT ROLL');$('speed-lines').classList.add('on');burst(playerX,1.5,0,0xa8e8cc,25);}
  function hit(e){
    if(invincible>0||boostTime>0)return;
    if(shieldTime>0){shieldTime=0;invincible=1.6;e.done=true;e.node.visible=false;burst(playerX,1.5,0,0x99e8d3,18);pop('护盾挡住了碰撞');audio.sfx('fish');return;}
    life--;combo=0;comboTime=0;invincible=2.4;shake=.65;audio.sfx('hit');$('hit-flash').classList.remove('on');void $('hit-flash').offsetWidth;$('hit-flash').classList.add('on');burst(playerX,1.8,0,World.C.cream,19,true);e.done=true;e.node.visible=false;
    if(life<=0){state='dying';deathTime=1;show('touch-controls',false);$('speed-lines').classList.remove('on');}else{toast(life===1?'最后一颗勇气，慢慢来，也很酷。':'小小颠簸，继续迎着风。',2.1);}updateHUD();
  }
  function collect(e){
    e.done=true;e.node.visible=false;
    if(e.type==='fish'){fishCount++;combo++;comboTime=3;const multi=clamp(1+Math.floor(combo/8),1,5);maxCombo=Math.max(maxCombo,multi);score+=25*multi;boost=clamp(boost+.04,0,1);audio.sfx('fish',combo);burst(e.node.pos[0],e.node.pos[1],0,0xffd675,5);if(combo%8===0)pop('小鱼连击 ×'+multi);if(boost>=1&&boostTime<=0&&!$('boost-btn').classList.contains('ready'))toast('顺风已就位！按 Shift 或点击能量条',3);}
    else if(e.type==='power'){if(e.sub==='shield'){shieldTime=12;toast('海盐护盾 · 为你挡住一次碰撞',2.4);}else{magnetTime=10;toast('小鱼磁铁 · 整条海岸都是你的',2.4);}audio.sfx('boost');burst(e.x,1.5,0,e.sub==='shield'?0xa1e6d1:0xd7a4fa,15);}
  }
  function finish(){
    state='result';show('pause-btn',false);world.pelican.root.visible=true;const total=Math.floor(score);const isBest=total>oldBest;if(isBest){bests[mode]=total;storage.set('best.'+mode,total);}storage.set('last.distance',Math.floor(distance));$('final-score').textContent=String(total).padStart(6,'0');$('final-distance').textContent=Math.floor(distance).toLocaleString();$('final-fish').textContent=fishCount;$('final-combo').textContent='×'+maxCombo;show('record-tag',isBest);$('result-message').textContent=distance<200?'才刚认识这片海。下一阵风，一定更默契。':distance<800?'你把普通的一天，骑成了闪闪发光的回忆。':'从晨光到星光，海岸记住了你的名字。';show('result-modal');audio.sfx('over');$('retry-btn').focus();updateHUD();
  }
  function updateHUD(){
    $('distance').textContent=String(Math.floor(distance)).padStart(4,'0');$('score').textContent=String(Math.floor(score)).padStart(6,'0');$('fish-count').textContent=fishCount;$('speed').textContent=Math.round(speed*3.6);const multi=clamp(1+Math.floor(combo/8),1,5);$('combo').textContent='×'+multi;$('combo').classList.toggle('hot',multi>1);$('lives').setAttribute('aria-label','剩余 '+life+' 次机会');[...$('lives').children].forEach((el,i)=>el.classList.toggle('lost',i>=life));$('boost-fill').style.width=(boostTime>0?boostTime/6*100:boost*100)+'%';$('boost-btn').classList.toggle('ready',boost>=.995&&boostTime<=0);$('boost-label').textContent=boostTime>0?'顺风冲刺中 · 无敌 + 自动吸鱼':boost>=.995?(small?'点击这里，迎风加速':'按 SHIFT，让海风推你一把'):'收集小鱼，积攒一阵顺风';
    let status='';if(shieldTime>0)status+='<span>◇ 海盐护盾 '+Math.ceil(shieldTime)+'s</span>';if(magnetTime>0)status+='<span>✦ 小鱼磁铁 '+Math.ceil(magnetTime)+'s</span>';$('power-status').innerHTML=status;
    const d=distance%2400,r=d<768?0:d<1608?1:2;const names=['01 — 晨光浅湾','02 — 落日港口','03 — 星光海岸'],next=['落日港口','星光海岸','晨光浅湾'];$('route-name').textContent=names[r];$('route-next').textContent='下一站 / '+next[r];const starts=[0,768,1608],lengths=[768,840,792];$('route-progress').style.width=((d-starts[r])/lengths[r]*100)+'%';if(region!==r){if(region>=0)toast('欢迎来到 '+names[r].slice(5)+' · 新的风景，新的自由',3.5);region=r;}
  }
  function simulate(dt){
    runTime+=dt;let target=(mode==='cruise'?13:18)+Math.min(distance/(mode==='cruise'?350:230),mode==='cruise'?9:11);if(boostTime>0)target*=1.48;speed=lerp(speed,target,dt*2.8);const travel=speed*dt;distance+=travel;score+=travel*2;spawnTravel+=travel;
    const spacing=mode==='cruise'?24:22;while(spawnTravel>=spacing){spawnTravel-=spacing;spawnRow(-208-spawnTravel);}
    if(jumpBuffer>0){jumpBuffer-=dt;if(playerY<=.001){velocityY=9.8;playerY=.02;jumpBuffer=0;audio.sfx('jump');}}
    velocityY-=25*dt;playerY+=velocityY*dt;if(playerY<0){if(velocityY<-4)burst(playerX,.12,.1,0xeed9ae,4);playerY=0;velocityY=0;}
    duckTime=Math.max(0,duckTime-dt);invincible=Math.max(0,invincible-dt);shieldTime=Math.max(0,shieldTime-dt);magnetTime=Math.max(0,magnetTime-dt);comboTime=Math.max(0,comboTime-dt);if(comboTime===0)combo=0;
    if(boostTime>0){boostTime=Math.max(0,boostTime-dt);if(boostTime===0){$('speed-lines').classList.remove('on');invincible=Math.max(invincible,1.3);}boostTrail+=dt;if(boostTrail>.075){boostTrail=0;burst(playerX,.45,1,0xb4edcd,2);}}
    for(const e of entities){if(e.done)continue;e.prevZ=e.z;e.z+=travel;e.node.pos[2]=e.z;
      if(e.type==='fish'||e.type==='power'){
        e.node.rot[1]=time*(e.type==='fish'?1.65:1.1)+e.phase;e.node.pos[1]=e.y+Math.sin(time*3+e.phase)*.11;
        const magnet=(magnetTime>0||boostTime>0)&&e.type==='fish';if(magnet&&e.z>-15&&e.z<2){const factor=clamp(dt*8,0,1);e.node.pos[0]=lerp(e.node.pos[0],playerX,factor);e.node.pos[1]=lerp(e.node.pos[1],playerY+1.2,factor);}
        const reach=magnet?2.6:.85;if(e.z>-.9&&e.prevZ<1.25&&Math.abs(e.node.pos[0]-playerX)<reach&&Math.abs(e.node.pos[1]-(playerY+1.25))<(magnet?3:1.05))collect(e);
      }else{
        const dx=Math.abs(playerX-e.x),width=e.type==='van'?1.13:.95;
        if(e.z>-.9&&e.prevZ<.85&&dx<width){let safe=false;if(e.type==='arch')safe=duckTime>.02&&playerY<.24;else if(e.type==='crate')safe=playerY>1.03;else if(e.type==='barrier')safe=playerY>.88;
          if(boostTime>0){e.done=true;e.node.visible=false;score+=40;burst(e.x,1,0,0xa7e5cb,12);}else if(!safe)hit(e);
        }
        if(e.z>1.2&&!e.passed){e.passed=true;if(invincible<=0&&(dx<1.7||playerY>.6||duckTime>0)){score+=35;nearMisses++;boost=clamp(boost+.05,0,1);if(nearMisses%3===0)pop('漂亮躲避 +35');}}
      }
      if(e.z>12){e.done=true;e.node.visible=false;}
    }
    if(frame%35===0){entities=entities.filter(e=>!e.done);world.objects.children=entities.map(e=>e.node);}
  }
  function updateCamera(dt){
    let eye,target,fov;
    if(state==='menu'){eye=small?[7.1,4.7,8.5]:[7.4,4.7,8.5];target=small?[0,1.9,-.4]:[-2.6,1.4,-.7];fov=small?50:41;world.pelican.root.scale=[1.08,1.08,1.08];}
    else{eye=small?[playerX*.2,7.2,13.6]:[1.1+playerX*.23,6.4,10.4];target=[playerX*.40,1.22,-11];fov=small?66:57;if(boostTime>0)fov+=7;const s=lerp(world.pelican.root.scale[0],1,Math.min(1,dt*4));world.pelican.root.scale=[s,s,s];}
    const rate=1-Math.exp(-dt*(state==='countdown'?2.6:4));for(let i=0;i<3;i++){camera.eye[i]=lerp(camera.eye[i],eye[i],rate);camera.target[i]=lerp(camera.target[i],target[i],rate);}camera.fov=lerp(camera.fov,fov,rate);if(shake>0){shake=Math.max(0,shake-dt*2);camera.eye[0]+=Math.sin(time*61)*shake*.09;camera.eye[1]+=Math.cos(time*53)*shake*.07;}
  }
  function renderLoop(now){
    try{
      const dt=Math.min((now-(lastTime||now-16.7))/1000,.05);lastTime=now;frame++;const active=state!=='paused'&&state!=='result';if(active)time+=dt;
      if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show');}
      if(state==='countdown'){countdownTime-=dt;const str=countdownTime>1.8?'3':countdownTime>.9?'2':'1';if(str!==countdownPrev){$('countdown').innerHTML='<span>'+str+'</span>';countdownPrev=str;audio.tone(str==='1'?600:440,.12,'sine',.12);}if(countdownTime<=0)beginRunning();}
      if(state==='running'){playerX=lerp(playerX,lane*2.65,1-Math.exp(-dt*13));simulate(dt);}
      if(state==='dying'){deathTime-=dt;speed=lerp(speed,0,dt*3.5);world.pelican.root.rot[2]=lerp(world.pelican.root.rot[2],-.45,dt*3);if(deathTime<=0)finish();}
      const moveSpeed=state==='menu'?2.6:state==='running'||state==='dying'?speed:0;
      const env=world.update(active?dt:0,moveSpeed,time,state==='menu'?130:distance);
      document.body.classList.toggle('night',state!=='menu'&&env.night>.59);
      if(state!=='dying'&&state!=='result'&&state!=='paused'){
        world.pelican.root.rot[1]=state==='menu'?-.57:lerp(world.pelican.root.rot[1],0,Math.min(1,dt*5));const tilt=state==='running'?clamp((lane*2.65-playerX)*-.09,-.21,.21):0;world.pelican.root.pos=[state==='menu'?0:playerX,playerY+Math.sin(time*8)*.012,0];world.pelican.animate(time,moveSpeed,playerY,duckTime>0,boostTime>0,tilt);
      }
      world.pelican.root.visible=!(invincible>0&&state==='running'&&Math.floor(time*12)%2===0);world.shield.visible=shieldTime>0||boostTime>0;if(active)animateParticles(dt);updateCamera(dt);
      renderer.render(world.root,camera,env,time);audio.update(state==='running',boostTime>0);uiTimer+=dt;if(uiTimer>.09&&state!=='menu'){updateHUD();uiTimer=0;}
      if(frame===3){$('loading').style.opacity='0';setTimeout(()=>show('loading',false),650);}
      if(frame===12&&state==='menu'&&quality==='auto'&&dt>.043){quality='low';resize();}
      requestAnimationFrame(renderLoop);
    }catch(error){show('loading',false);show('error');$('error-text').textContent='渲染遇到问题：'+(error.message||error);console.error(error);}
  }
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  $('start-btn').addEventListener('click',start);$('retry-btn').addEventListener('click',start);$('restart-pause').addEventListener('click',start);$('resume-btn').addEventListener('click',resume);$('pause-btn').addEventListener('click',()=>state==='paused'?resume():pause());$('home-btn').addEventListener('click',home);$('result-home').addEventListener('click',home);$('brand').addEventListener('click',e=>{e.preventDefault();if(state==='menu')return;if(state==='running'||state==='countdown')pause();else if(state==='result')home();});$('sound-btn').addEventListener('click',toggleSound);$('quality-btn').addEventListener('click',()=>{quality=quality==='low'?'high':'low';storage.set('quality',quality);resize();toast(quality==='low'?'节能模式 · 关闭阴影，保持轻盈':'高清模式 · 开启海岸光影',2);});$('help-btn').addEventListener('click',openHelp);$('help-close').addEventListener('click',closeHelp);$('help-done').addEventListener('click',closeHelp);$('boost-btn').addEventListener('click',doBoost);
  const actions={left:()=>move(-1),right:()=>move(1),jump,duck,boost:doBoost};document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();actions[b.dataset.action]();}));
  document.addEventListener('keydown',e=>{
    const visibleModal=[...document.querySelectorAll('.modal')].find(m=>!m.classList.contains('hidden'));
    if(e.code==='Tab'&&visibleModal){const f=[...visibleModal.querySelectorAll('button')].filter(b=>!b.disabled),first=f[0],last=f.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
    if(e.repeat)return;if(e.code==='KeyM'){toggleSound();return;}
    if(!$('help-modal').classList.contains('hidden')){if(e.code==='Escape')closeHelp();return;}
    if(e.code==='Escape'||e.code==='KeyP'){if(state==='paused')resume();else pause();return;}
    if(e.code==='KeyF'){if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});else document.documentElement.requestFullscreen?.().catch(()=>{});return;}
    if(state==='menu'&&(e.code==='Space'||e.code==='Enter')){start();return;}
    if(state==='result'&&(e.code==='Space'||e.code==='Enter')){start();return;}
    if(e.code==='KeyA'||e.code==='ArrowLeft')move(-1);if(e.code==='KeyD'||e.code==='ArrowRight')move(1);if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')jump();if(e.code==='ArrowDown'||e.code==='KeyS')duck();if(e.code==='ShiftLeft'||e.code==='ShiftRight')doBoost();
  });
  document.addEventListener('pointerdown',e=>{if(e.target.closest('button,a,.modal')||state!=='running')return;touchStart={x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId};});
  document.addEventListener('pointerup',e=>{if(!touchStart||touchStart.id!==e.pointerId)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y,elapsed=performance.now()-touchStart.t;touchStart=null;if(state!=='running')return;if(Math.max(Math.abs(dx),Math.abs(dy))>24){if(Math.abs(dx)>Math.abs(dy))move(dx>0?1:-1);else dy<0?jump():duck();}else if(elapsed<260)jump();});
  document.addEventListener('pointercancel',()=>touchStart=null);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(state==='running'||state==='countdown'))pause();lastTime=performance.now();});
  window.addEventListener('blur',()=>{if(state==='running'||state==='countdown')pause();});
  $('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();pause();show('error');$('error-text').textContent='图形上下文已丢失。关闭其他占用显卡的页面，然后重新打开游戏；已保存的最高分不受影响。';});
  // Read-only observability is always available; deterministic test controls require ?test=1.
  window.__PELICAN__={version:'1.0.0',snapshot:()=>({state,mode,distance,score,fish:fishCount,life,lane,playerX,playerY,duck:duckTime,boost,boostTime,shieldTime,magnetTime,combo,maxCombo,speed,quality,frames:frame,drawCalls:renderer.calls,entities:entities.filter(e=>!e.done).map(e=>({type:e.type,lane:e.lane,z:e.z,y:e.y,sub:e.sub})),best:{...bests}})};
  if(new URLSearchParams(location.search).get('test')==='1'){
    window.__PELICAN__.test={start,home,pause,resume,settle:()=>updateCamera(5),action:name=>actions[name]?.(),set:(values)=>{if('distance'in values)distance=values.distance;if('boost'in values)boost=values.boost;if('shield'in values)shieldTime=values.shield;if('magnet'in values)magnetTime=values.magnet;if('life'in values)life=values.life;if('invincible'in values)invincible=values.invincible;if('countdown'in values)countdownTime=values.countdown;updateHUD();},clear:()=>{entities=[];world.objects.children=[];spawnTravel=-1e6;},spawn:(type,l,z,y=0,sub='')=>{makeEntity(type,l,z,y,sub);},step:(seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++){playerX=lerp(playerX,lane*2.65,.195);simulate(1/60);}updateHUD();}};
  }
  requestAnimationFrame(renderLoop);
})();