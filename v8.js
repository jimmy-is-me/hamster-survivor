'use strict';
(() => {
 const baseStart=startGame,baseUpdate=update,baseDraw=draw,baseDmg=dmg,baseDie=die,baseMk=mk,baseLevel=levelUp;
 const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 Object.assign(BAL,{xpBase:8,xpLin:5,xpQuad:.35});
 const additions={
 torn:{ic:'🌪️',name:'棉花糖龍捲風',type:'weapon',desc:l=>`每 5 秒釋出 ${l} 道龍捲風，持續 4 秒，每 0.35 秒造成 2 傷害並拉近小怪`},
 blade:{ic:'🍴',name:'刀叉旋舞',type:'weapon',desc:l=>`${l+1} 把刀叉在半徑 130 外圈旋轉，命中造成 ${2+l} 傷害`},
 met:{ic:'☄️',name:'流星糖雨',type:'weapon',desc:l=>`每 4 秒落下 ${2+l} 顆流星，0.7 秒後造成 8 範圍傷害`},
 scope:{ic:'🎯',name:'精準瞄具',type:'passive',desc:l=>`飛鏢、煙火及砲台子彈額外穿透 ${l} 次`},
 gloves:{ic:'🧤',name:'吸力手套',type:'equip',max:3,desc:l=>`額外吸取 ${l*35}px 內經驗，並吸取附近特殊道具`},
 badge:{ic:'🔰',name:'守護徽章',type:'equip',max:3,desc:l=>`每 ${25-l*5} 秒獲得 2 秒無敵護盾`},
 crown:{ic:'👑',name:'甜點皇冠',type:'equip',max:3,desc:l=>`傷害與經驗獲取各增加 ${l*10}%`}
 };
 Object.assign(WEAPONS,additions);WKEYS.push(...Object.keys(additions));START_WEAPONS.push('torn','blade','met');
 Object.assign(UNLOCK.items,{met:'win',crown:'boss3'});
 ACH.push({id:'endless',ic:'♾️',name:'無盡挑戰者',desc:'通關困難後繼續挑戰無盡模式'});
 const label=document.createElement('div');label.className='stageLabel';label.hidden=true;$('wrap').appendChild(label);
 let baseDifficulty=0,round=1,total=0,banked=0,counted=false,canContinue=false,phase=0,badgeTimer=0,tornadoes=[],meteors=[],blades=[],timers={},seen=new WeakSet(),bladeHits=new WeakMap(),oldChoices=[];
 const clearInput=()=>{S.keys={};Object.assign(S.joy,{on:false,id:null,dx:0,dy:0})};
 function difficulty(){const raw=baseDifficulty+round-1,extra=Math.max(0,raw-2),d=DIFFS[Math.min(2,raw)],m=1+.25*extra;return {...d,n:d.n+(extra?` 無盡+${extra}`:''),hp:d.hp*m,dm:d.dm*m,sp:d.sp/(1+.08*extra)}}
 function refreshLabel(){label.textContent=`第 ${round} 輪 · ${S.D.n} · 總存活 ${Math.floor(total)} 秒`;label.hidden=state!=='play'&&state!=='hold'}
 startGame=function(){baseStart();if(state!=='play')return;baseDifficulty=diffIdx;round=1;total=0;banked=0;counted=false;canContinue=false;phase=0;badgeTimer=0;timers={torn:2,met:2};tornadoes=[];meteors=[];blades=[];seen=new WeakSet();bladeHits=new WeakMap();oldChoices=[];S.D=difficulty();S.need=needFor(S.lv);refreshLabel()};
 mk=function(type,x,y){if(S.enemies.filter(e=>!e.dead).length>=MAX_ENEMY)return;baseMk(type,x,y)};
 dmg=function(e,n){const p=1+.2*S.w.power;baseDmg(e,n*(p+.1*S.w.crown)/p)};
 die=function(e){if(e.dead||state!=='play')return;baseDie(e)};
 finish=function(win){
  if(state==='end'||!S)return;state='end';clearInput();canContinue=win;
  SAVE.tot.kills+=S.kills-banked;banked=S.kills;if(!counted){counted=true;SAVE.tot.games++}
  SAVE.tot.best=Math.max(SAVE.tot.best||0,round);
  if(win){SAVE.tot.wins++;ach('win');if(speedIdx===5)ach('speed3')}
  if(SAVE.tot.kills>=2000)ach('total2000');persist();AU.mode='menu';AU.sfx(win?'win':'lose');
  $('endT').textContent=win?`🎉 第 ${round} 輪通關`:'💥 倉鼠球破裂了';
  $('endS').textContent=`${S.ch.name}｜${S.D.n}｜總存活 ${Math.floor(total)} 秒｜擊殺 ${S.kills}｜Lv.${S.lv}`;
  $('endA').textContent=S.newAch.map(a=>`${a.ic} ${a.name}`).join('、');
  $('nextBtn').hidden=!win;const raw=baseDifficulty+round;
  $('nextBtn').textContent=raw<3?`繼續挑戰 ${DIFFS[raw].n}（保留等級與裝備）`:'繼續無盡模式（保留等級與裝備）';
  $('end').classList.add('show');label.hidden=true;
 };
 $('nextBtn').onclick=()=>{
  if(state!=='end'||!canContinue)return;canContinue=false;round++;S.D=difficulty();S.t=0;S.waves={};S.bossDone={};S.spawnT=2;
  for(const k of ['enemies','gems','shots','ebul','pops','trail','fx','missiles','cookies','bolts','novas','puddles','turrets','drops'])S[k]=[];
  S.gums=[];tornadoes=[];meteors=[];blades=[];bladeHits=new WeakMap();clearInput();S.freeze=0;S.slow=0;S.rage=0;
  heal(S.player.maxhp*.5);S.shield=3;S.warn={txt:`第 ${round} 輪 · ${S.D.n}`,t:3.5};
  if(baseDifficulty+round-1>2)ach('endless');SAVE.tot.best=Math.max(SAVE.tot.best||0,round);persist();
  $('end').classList.remove('show');state='play';levelUp(true);last=performance.now();
 };
 rollChoices=function(free){
  const available=WKEYS.filter(k=>S.w[k]<(WEAPONS[k].max||5)&&itemOK(k)),pool=shuffle(available),out=[];
  const types=free?['equip','weapon','passive']:shuffle(['weapon','passive','equip']);
  for(const t of types){const group=pool.filter(k=>WEAPONS[k].type===t),fresh=group.filter(k=>!oldChoices.includes(k));const k=(fresh.length?fresh:group)[0];if(k)out.push(k)}
  for(const k of pool)if(out.length<3&&!out.includes(k))out.push(k);oldChoices=out;return out;
 };
 levelUp=function(free){if(state==='end')return;clearInput();baseLevel(free);$('lvlT').textContent=free?'🎁 寶箱：3 選 1':'🌻 升級：3 選 1';$('lvl').scrollTop=0};
 function ready(k,dt,cd){timers[k]=(timers[k]||0)-dt;if(S.w[k]&&timers[k]<=0){timers[k]=cd*S.ch.cdm*(1-.08*S.w.watch)*(S.rage>0?.6:1);return true}return false}
 function extraUpdate(dt){
  const p=S.player,w=S.w,ar=1+.1*w.lens;phase+=dt;
  if(w.badge){badgeTimer+=dt;if(badgeTimer>=25-5*w.badge){badgeTimer=0;S.shield=Math.max(S.shield,2)}}
  if(ready('torn',dt,5)){const e=nearest(p.x,p.y),a=e?Math.atan2(e.y-p.y,e.x-p.x):0;for(let i=0;i<w.torn;i++){const b=a+(i-(w.torn-1)/2)*.7;tornadoes.push({x:p.x,y:p.y,vx:Math.cos(b)*90,vy:Math.sin(b)*90,t:4,tick:0,r:(60+10*w.torn)*ar})}}
  for(const o of tornadoes){o.t-=dt;o.x+=o.vx*dt;o.y+=o.vy*dt;o.tick-=dt;const hit=o.tick<=0;if(hit)o.tick=.35;for(const e of S.enemies){if(e.dead)continue;const dx=o.x-e.x,dy=o.y-e.y,d=Math.hypot(dx,dy)||1;if(d<o.r+e.r){if(!e.boss){e.x+=dx/d*90*dt;e.y+=dy/d*90*dt}if(hit)dmg(e,2);if(state!=='play')return}}}tornadoes=tornadoes.filter(o=>o.t>0);
  blades=[];if(w.blade){for(let i=0;i<w.blade+1;i++){const a=-phase*3+i*Math.PI*2/(w.blade+1),b={x:p.x+Math.cos(a)*130*ar,y:p.y+Math.sin(a)*130*ar};blades.push(b);for(const e of S.enemies)if(!e.dead&&(bladeHits.get(e)||0)<=total&&Math.hypot(e.x-b.x,e.y-b.y)<e.r+18){bladeHits.set(e,total+.35);dmg(e,2+w.blade);if(state!=='play')return}}}
  if(ready('met',dt,4)){const es=visible();for(let i=0;i<2+w.met;i++){const e=es[Math.floor(Math.random()*es.length)];meteors.push({x:e?e.x:p.x+rnd(-180,180),y:e?e.y:p.y+rnd(-180,180),t:.7+i*.12,r:(40+6*w.met)*ar,boom:false})}}
  for(const o of meteors){o.t-=dt;if(!o.boom&&o.t<=0){o.boom=true;o.t=.3;AU.sfx('boom');for(const e of S.enemies)if(!e.dead&&Math.hypot(e.x-o.x,e.y-o.y)<o.r+e.r){dmg(e,8);if(state!=='play')return}}}meteors=meteors.filter(o=>o.t>0);
  const mag=80+40*w.magnet+S.ch.mag+35*w.gloves;for(const g of S.gems)if(Math.hypot(g.x-p.x,g.y-p.y)<mag)g.fly=true;
  if(w.gloves)for(const o of S.drops){const d=Math.hypot(o.x-p.x,o.y-p.y);if(d<110+35*w.gloves&&d>0){const f=Math.min(1,260*dt/d);o.x+=(p.x-o.x)*f;o.y+=(p.y-o.y)*f}}
 }
 update=function(dt){
  total+=dt;extraUpdate(dt);if(state!=='play')return;
  for(const s of S.shots)if(!seen.has(s)){seen.add(s);s.pierce+=S.w.scope}
  const xp=S.ch.xp;S.ch={...S.ch,xp:xp*(1+.1*S.w.crown/(1+.15*S.w.glasses))};
  try{baseUpdate(dt)}finally{S.ch={...S.ch,xp}}
  refreshLabel();
 };
 draw=function(){
  baseDraw();if(!S||state!=='play')return;const p=S.player,z=zoom();ctx.save();ctx.translate(W/2,desk?H*.5:H*.4);ctx.scale(z,z);ctx.translate(-p.x,-p.y);
  for(const o of tornadoes){circ(o.x,o.y,o.r,'rgba(180,220,255,.12)','#408cc9',2);emoji('🌪️',o.x,o.y,52)}
  for(const b of blades){circ(b.x,b.y,20,'#d7efff','#fff',2);emoji('🍴',b.x,b.y,34)}
  for(const o of meteors){circ(o.x,o.y,o.r,o.boom?'rgba(255,180,50,.35)':'rgba(70,160,255,.10)',o.boom?'#ecaa2a':'#408cc9',3);emoji(o.boom?'💥':'☄️',o.x,o.y,34)}
  ctx.restore();
 };
 addEventListener('keydown',e=>{if(state==='pause'&&['4','5'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation()}if(state==='end'&&e.key==='Enter'&&canContinue){e.preventDefault();e.stopImmediatePropagation();$('nextBtn').click()}},true);
 const back=$('againBtn').onclick;$('againBtn').onclick=e=>{canContinue=false;label.hidden=true;back(e)};
 buildMenu();
})();
