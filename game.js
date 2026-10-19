'use strict';
const cv=document.getElementById('c'),ctx=cv.getContext('2d'),$=id=>document.getElementById(id);
let W,H,DPR,desk=false;
function resize(){
 desk=matchMedia('(hover:hover) and (pointer:fine)').matches;$('wrap').classList.toggle('desk',desk);
 DPR=Math.min(devicePixelRatio||1,2);const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
const GAME_TIME=180,MAX_ENEMY=80;
let S=null,state='menu',last=0;

/* ===== 加速器 ===== */
const SPEEDS=[1,1.2,1.5,2,2.5,3];
let speedIdx=0;
try{speedIdx=Math.max(0,SPEEDS.indexOf(+localStorage.getItem('hs_speed')))}catch(e){}
function setSpeed(i){
 speedIdx=Math.max(0,Math.min(SPEEDS.length-1,i));
 $('speedBtn').textContent='⏩ x'+SPEEDS[speedIdx];
 try{localStorage.setItem('hs_speed',SPEEDS[speedIdx])}catch(e){}
}
$('speedBtn').onclick=e=>{setSpeed((speedIdx+1)%SPEEDS.length);e.target.blur()};
setSpeed(speedIdx);

/* ===== 角色 ===== */
const CH0={hp:5,spd:1,dm:1,cdm:1,inv:1,xp:1,crit:0,mag:0,aura:false,regen:0};
const CHARS={
 hamster:{ic:'🐹',name:'圓滾滾倉鼠',xp:1.1,desc:'均衡型。經驗值獲取 +10%。'},
 rabbit:{ic:'🐰',name:'疾風兔兔',hp:4,spd:1.15,inv:1.5,desc:'生命 4、移速 +15%,受傷後無敵 1.5 秒。'},
 bear:{ic:'🐻',name:'壯壯熊熊',hp:7,spd:.9,dm:1.15,desc:'生命 7、傷害 +15%,但移動較慢。'},
 cat:{ic:'🐱',name:'機靈小貓',spd:1.05,cdm:.85,desc:'所有武器冷卻 -15%,移速 +5%。'},
 fox:{ic:'🦊',name:'暴擊狐狸',crit:.15,desc:'天生 15% 暴擊率(傷害 x2)。'},
 frog:{ic:'🐸',name:'吸力青蛙',spd:1.05,mag:50,desc:'經驗值吸附範圍 +50px,移速 +5%。'},
 penguin:{ic:'🐧',name:'冰霜企鵝',hp:6,spd:.95,aura:true,desc:'生命 6,身邊 110px 內的敵人移速 -30%。'},
 unicorn:{ic:'🦄',name:'夢幻獨角獸',dm:1.05,regen:25,desc:'每 25 秒自動回復 1 顆❤️,傷害 +5%。'}
};
for(const k in CHARS)CHARS[k]=Object.assign({},CH0,CHARS[k]);

/* ===== 武器 / 被動 ===== */
const WEAPONS={
 seed:{ic:'🌻',name:'葵花子飛鏢',type:'weapon',desc:l=>`朝最近敵人發射 ${l} 顆,穿透 ${l+1} 次`},
 gum:{ic:'🫧',name:'環繞泡泡糖',type:'weapon',desc:l=>`${[2,3,4,5,6][l-1]} 個泡泡護盾,旋轉更快並彈開敵人`},
 pop:{ic:'🍿',name:'爆裂爆米花',type:'weapon',desc:l=>`每 3 秒落下 ${l} 顆玉米粒,爆炸範圍 ${50+l*15}px`},
 berry:{ic:'🍓',name:'草莓追蹤彈',type:'weapon',desc:l=>`發射 ${l} 顆追蹤草莓,命中範圍爆炸(半徑 ${20+l*8}px)`},
 bolt:{ic:'🍭',name:'棒棒糖閃電',type:'weapon',desc:l=>`每 ${(2.6-l*.25).toFixed(2)} 秒電擊 ${l+1} 隻敵人並彈跳`},
 cookie:{ic:'🍪',name:'迴力餅乾',type:'weapon',desc:l=>`擲出 ${l} 片餅乾,去程回程都會傷敵(射程 ${150+l*30}px)`},
 nova:{ic:'🍦',name:'冰淇淋新星',type:'weapon',desc:l=>`每 ${(4.4-l*.4).toFixed(1)} 秒爆出半徑 ${90+l*25}px 冰環,傷敵並冰凍 2 秒`},
 honey:{ic:'🍯',name:'蜂蜜陷阱',type:'weapon',desc:l=>`留下半徑 ${40+l*8}px 蜂蜜地,持續 ${4+l} 秒,敵人減速並持續受傷`},
 turret:{ic:'🧁',name:'杯子蛋糕砲台',type:'weapon',desc:l=>`每 8 秒放置 ${1+(l>=3)+(l>=5)} 座砲台,存活 ${6+l} 秒自動射擊`},
 cheese:{ic:'🧀',name:'起司加速跑鞋',type:'passive',desc:l=>`移速 +${l*15}%`+(l>=5?',並留下減速起司軌跡':'')},
 magnet:{ic:'🧲',name:'蜂蜜磁鐵',type:'passive',desc:l=>`葵花子吸附範圍 ${80+l*40}px`},
 heart:{ic:'💖',name:'愛心糖果',type:'passive',desc:l=>`生命上限 +1(累計 +${l}),並回復 1 顆❤️`},
 power:{ic:'🍬',name:'甜蜜力量',type:'passive',desc:l=>`所有武器傷害 +${l*20}%`},
 clover:{ic:'🍀',name:'幸運四葉草',type:'passive',desc:l=>`暴擊率 +${l*8}%,特殊掉落率 +${l*20}%`},
 milk:{ic:'🥛',name:'營養牛奶',type:'passive',desc:l=>`每 ${40-l*6} 秒自動回復 1 顆❤️`}
};
const WKEYS=Object.keys(WEAPONS),START_WEAPONS=WKEYS.filter(k=>WEAPONS[k].type==='weapon');

/* ===== 小怪圖鑑 ===== */
const MOBS={
 pudding:{hp:3,sp:50,r:14,e:'🍮'},
 donut:{hp:2,sp:100,r:12,e:'🍩'},
 marsh:{hp:3,sp:45,r:13,e:'☁️',rng:1},
 mochi:{hp:10,sp:32,r:19,e:'🍡',gems:2},
 snow:{hp:4,sp:55,r:14,e:'🍧',split:1},
 ice:{hp:1,sp:85,r:9,e:'🧊'},
 choc:{hp:4,sp:60,r:15,e:'🍫',dash:1},
 cherry:{hp:2,sp:90,r:12,e:'🍒',bomb:1},
 mage:{hp:5,sp:40,r:15,e:'🍰',mage:1},
 lucky:{hp:5,sp:90,r:13,e:'🥠',flee:1,life:12}
};

/* ===== Boss ===== */
const BOSSES={
 donutb:{e:'🍩',name:'暴走巨無霸甜甜圈',hp:140,r:38,sp:55},
 queen:{e:'🎂',name:'蛋糕女王',hp:220,r:40,sp:35},
 sundae:{e:'🍓',name:'超級草莓巨無霸聖代',hp:450,r:50,sp:28}
};
const BOSS_TIMELINE=[[60,'donutb'],[120,'queen'],[170,'sundae']];

/* ===== 特殊掉落物 ===== */
const DROPS=[['heart','💖',3],['magnet','🧲',2],['bomb','💣',2],['freeze','❄️',2],['shield','🛡️',2],['star','⭐',2]];

/* ===== 選角介面 ===== */
let selChar='hamster',selWep='seed';
function buildMenu(){
 const ch=$('chars'),wp=$('weps');ch.innerHTML='';wp.innerHTML='';
 for(const k in CHARS){const c=CHARS[k],d=document.createElement('div');d.className='opt'+(k===selChar?' sel':'');
  d.innerHTML=`<span class='ic'>${c.ic}</span><b>${c.name}</b>`;d.onclick=()=>{selChar=k;buildMenu()};ch.appendChild(d)}
 START_WEAPONS.forEach(k=>{const w=WEAPONS[k],d=document.createElement('div');d.className='opt'+(k===selWep?' sel':'');
  d.innerHTML=`<span class='ic'>${w.ic}</span><b>${w.name}</b>`;d.onclick=()=>{selWep=k;buildMenu()};wp.appendChild(d)});
 $('desc').textContent=`${CHARS[selChar].name}:${CHARS[selChar].desc}|${WEAPONS[selWep].name}:${WEAPONS[selWep].desc(1)}`;
}
buildMenu();
$('startBtn').onclick=e=>{e.target.blur();startGame()};
$('againBtn').onclick=e=>{e.target.blur();$('end').classList.remove('show');$('start').classList.add('show');$('speedBtn').style.display='none';state='menu';buildMenu()};

function startGame(){
 const c=CHARS[selChar],w={};WKEYS.forEach(k=>w[k]=0);w[selWep]=1;
 S={t:0,ch:c,player:{x:0,y:0,r:18,hp:c.hp,maxhp:c.hp,inv:0},w,
  cd:{seed:0,pop:1,berry:.5,bolt:1,cookie:.5,nova:1,honey:1,turret:2},gumAng:0,gums:[],
  enemies:[],gems:[],shots:[],ebul:[],pops:[],trail:[],fx:[],missiles:[],cookies:[],bolts:[],novas:[],puddles:[],turrets:[],drops:[],
  xp:0,lv:1,need:5,kills:0,spawnT:0,waves:{},bossDone:{},freeze:0,shield:0,rg:0,warn:null,
  joy:{on:false,id:null,sx:0,sy:0,dx:0,dy:0},keys:{}};
 $('start').classList.remove('show');$('speedBtn').style.display='block';state='play';last=performance.now();
}

/* ===== 輸入 ===== */
function pos(e){const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||state!=='play'||S.joy.on)return;const[x,y]=pos(e);if(y<H*.8)return;
 cv.setPointerCapture(e.pointerId);Object.assign(S.joy,{on:true,id:e.pointerId,sx:x,sy:y,dx:0,dy:0})});
cv.addEventListener('pointermove',e=>{if(!S||!S.joy.on||e.pointerId!==S.joy.id)return;const[x,y]=pos(e);
 let dx=x-S.joy.sx,dy=y-S.joy.sy;const d=Math.hypot(dx,dy),m=50;if(d>m){dx=dx/d*m;dy=dy/d*m}S.joy.dx=dx/m;S.joy.dy=dy/m});
const up=e=>{if(S&&S.joy.id===e.pointerId){S.joy.on=false;S.joy.dx=S.joy.dy=0}};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
const cyc=(arr,cur,d)=>arr[(arr.indexOf(cur)+d+arr.length)%arr.length];
addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();
 if(S)S.keys[k]=1;
 if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
 if(k==='f'){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()}
 if(k==='q')setSpeed(speedIdx-1);
 if(k==='e')setSpeed(speedIdx+1);
 if(state==='menu'){
  if(k==='enter')startGame();
  else if(k==='arrowleft'||k==='arrowright'){selChar=cyc(Object.keys(CHARS),selChar,k==='arrowright'?1:-1);buildMenu()}
  else if(k==='arrowup'||k==='arrowdown'){selWep=cyc(START_WEAPONS,selWep,k==='arrowdown'?1:-1);buildMenu()}
 }else if(state==='pause'){
  const i=parseInt(k);if(i>=1&&i<=3){const c=$('cards').children[i-1];if(c)c.click()}
 }else if(state==='end'){
  if(k==='enter')$('againBtn').click();
 }else if(k==='p'||k==='escape'){
  state=state==='play'?'hold':'play';last=performance.now();
 }
});
addEventListener('keyup',e=>{if(S)S.keys[e.key.toLowerCase()]=0});
addEventListener('blur',()=>{if(S)S.keys={}});

/* ===== 工具 ===== */
const rnd=(a,b)=>a+Math.random()*(b-a);
function nearest(x,y,list){let b=null,bd=1e9;for(const e of (list||S.enemies)){if(e.dead)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<bd){bd=d;b=e}}return b}
function visible(){const p=S.player;return S.enemies.filter(e=>!e.dead&&Math.abs(e.x-p.x)<W/2+30&&Math.abs(e.y-p.y)<H*.6+30)}
function mk(type,x,y){
 const T=MOBS[type];
 S.enemies.push({...T,type,x,y,mhp:T.hp,kx:0,ky:0,hit:0,gh:0,fz:0,st:'walk',cdT:rnd(1,3)});
}
function pickType(){
 const t=S.t,P=[['pudding',10]];
 if(t>20)P.push(['marsh',2.5]);if(t>35)P.push(['mochi',2]);if(t>45)P.push(['snow',2]);
 if(t>55)P.push(['choc',2]);if(t>70)P.push(['cherry',2]);if(t>85)P.push(['mage',1.5]);
 if(t>40&&!S.enemies.some(e=>e.type==='lucky'))P.push(['lucky',.35]);
 let r=Math.random()*P.reduce((a,b)=>a+b[1],0);
 for(const[n,w]of P){r-=w;if(r<=0)return n}
 return 'pudding';
}
function spawnEnemy(type,ang,dist){
 if(S.enemies.length>=MAX_ENEMY)return;
 const p=S.player,d=dist||Math.hypot(W,H)/2+40,a=ang??rnd(0,6.283);
 mk(type,p.x+Math.cos(a)*d,p.y+Math.sin(a)*d);
}
function mkBoss(kind){
 const B=BOSSES[kind],p=S.player,a=rnd(0,6.283),d=Math.hypot(W,H)/2+80;
 S.enemies.push({type:'boss',boss:true,kind,x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,hp:B.hp,mhp:B.hp,sp:B.sp,r:B.r,e:B.e,kx:0,ky:0,hit:0,gh:0,fz:0,tm:0,st:'walk',cdT:3,sh:2,sm:6,sa:0});
 S.warn={txt:'⚠️ '+B.name+' 來襲!',t:3.5};
}
function hurt(n=1){const p=S.player;if(p.inv>0||S.shield>0)return;p.hp-=n;p.inv=S.ch.inv;S.fx.push({x:p.x,y:p.y-30,t:.8,txt:'💔'});if(p.hp<=0)finish(false)}
function dmg(e,n){
 if(e.dead)return;
 let m=(1+.2*S.w.power)*S.ch.dm,c=false;
 if(Math.random()<S.ch.crit+.08*S.w.clover){m*=2;c=true}
 e.hp-=n*m;e.hit=.1;if(c)S.fx.push({x:e.x,y:e.y-e.r,t:.4,txt:'💢'});
 if(e.hp<=0)die(e);
}
function die(e){
 e.dead=true;S.kills++;
 const k=e.boss?15:(e.gems||1),p=S.player;
 for(let i=0;i<k;i++)S.gems.push({x:e.x+(k>1?rnd(-25,25):0),y:e.y+(k>1?rnd(-25,25):0),v:1,fly:false,s:4});
 S.fx.push({x:e.x,y:e.y,t:.4,txt:'✨'});
 if(e.split){mk('ice',e.x-14,e.y);mk('ice',e.x+14,e.y)}
 if(e.bomb){S.fx.push({x:e.x,y:e.y,t:.6,txt:'💥'});if(Math.hypot(e.x-p.x,e.y-p.y)<70)hurt(1)}
 if(e.boss){S.drops.push({x:e.x,y:e.y,k:'chest',ic:'🎁',life:90,big:true});
  if(e.kind==='sundae')return finish(true);
  S.warn={txt:'🎉 擊敗 '+BOSSES[e.kind].name+'!拾取寶箱 🎁',t:3}}
 else if(e.type==='lucky')rollDrop(e.x,e.y);
 else if(Math.random()<.05*(1+.2*S.w.clover))rollDrop(e.x,e.y);
}
function rollDrop(x,y){let r=Math.random()*13;for(const d of DROPS){r-=d[2];if(r<=0){S.drops.push({x,y,k:d[0],ic:d[1],life:15});return}}}
function applyDrop(k){
 const p=S.player;
 if(k==='heart'){p.hp=Math.min(p.maxhp,p.hp+1)}
 else if(k==='magnet'){S.gems.forEach(g=>g.fly=true)}
 else if(k==='bomb'){visible().forEach(e=>dmg(e,10));S.fx.push({x:p.x,y:p.y,t:.5,txt:'💥'})}
 else if(k==='freeze'){S.freeze=3}
 else if(k==='shield'){S.shield=6}
 else if(k==='star'){S.xp+=S.need*.5}
 else if(k==='chest'){levelUp(true)}
 S.fx.push({x:p.x,y:p.y-34,t:.7,txt:k==='chest'?'🎁':'✨'});
}
function finish(win){
 if(state==='end')return;state='end';
 $('endT').textContent=win?'🎉 通關成功!':'💥 倉鼠球破裂了…';
 $('endS').textContent=`${S.ch.name}|存活 ${Math.floor(S.t)} 秒|擊殺 ${S.kills}|等級 ${S.lv}`;
 $('end').classList.add('show');
}

/* ===== 升級 / 寶箱 ===== */
function levelUp(free){
 state='pause';
 if(!free){S.lv++;S.xp-=S.need;S.need=Math.floor(S.need*1.35+3)}
 $('lvlT').textContent=free?'🎁 寶箱!免費獲得一個天賦':'🌻 升級!選一個天賦';
 const pool=WKEYS.filter(k=>S.w[k]<5).sort(()=>Math.random()-.5).slice(0,3);
 const box=$('cards');box.innerHTML='';
 const addCard=(ic,title,desc,tag,cls,fn)=>{const d=document.createElement('div');d.className='card';
  const no=desk?`[${box.children.length+1}] `:'';
  d.innerHTML=`<span class='ic'>${ic}</span><div><b>${no}${title}</b><span class='tag ${cls}'>${tag}</span><br>${desc}</div>`;
  d.onclick=()=>{$('lvl').classList.remove('show');fn();state='play';last=performance.now();if(S.xp>=S.need)levelUp()};box.appendChild(d)};
 pool.forEach(k=>{const w=WEAPONS[k],l=S.w[k]+1,isNew=l===1;
  addCard(w.ic,`${w.name} Lv.${l}`,w.desc(l),isNew?'NEW':'升級',isNew?'':(w.type==='passive'?'pas':'up'),()=>{
   S.w[k]=l;if(k==='heart'){S.player.maxhp++;S.player.hp=Math.min(S.player.maxhp,S.player.hp+1)}})});
 while(box.children.length<3)addCard('🍰','美味蛋糕','回復 2 顆❤️','補給','pas',()=>{S.player.hp=Math.min(S.player.maxhp,S.player.hp+2)});
 $('lvl').classList.add('show');
}

/* ===== 衝刺 / Boss AI ===== */
function dashAI(e,dt,ux,uy,v,iv,spd,wt,dur){
 if(e.st==='walk'){e.cdT-=dt;if(e.cdT<=0){e.st='wind';e.wT=wt}}
 else if(e.st==='wind'){v=0;e.wT-=dt;if(e.wT<=0){e.st='dash';e.dT=dur;e.lx=ux;e.ly=uy}}
 else{v=spd;ux=e.lx;uy=e.ly;e.dT-=dt;if(e.dT<=0){e.st='walk';e.cdT=iv}}
 return[v,ux,uy];
}
function bossAI(e,dt,ux,uy,v){
 const dash=(iv,spd)=>{[v,ux,uy]=dashAI(e,dt,ux,uy,v,iv,spd,.6,.8)};
 const ring=(n,sp,off)=>{if(S.ebul.length>300)return;for(let i=0;i<n;i++){const a=(off||0)+i*6.283/n;S.ebul.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:6,r:8})}};
 const summon=(t,n)=>{for(let i=0;i<n;i++){const a=i*6.283/n;mk(t,e.x+Math.cos(a)*(e.r+30),e.y+Math.sin(a)*(e.r+30))}};
 if(e.kind==='donutb')dash(3.5,430);
 else if(e.kind==='queen'){
  e.sh-=dt;if(e.sh<=0){e.sh=3;ring(10,140,e.tm)}
  e.sm-=dt;if(e.sm<=0){e.sm=8;summon('pudding',4)}
 }else{
  const r=e.hp/e.mhp;
  if(r>.6){e.sh-=dt;if(e.sh<=0){e.sh=2.5;ring(12,130)}}
  else if(r>.3){
   e.sh-=dt;if(e.sh<=0){e.sh=.25;e.sa+=.55;S.ebul.push({x:e.x,y:e.y,vx:Math.cos(e.sa)*150,vy:Math.sin(e.sa)*150,life:6,r:8})}
   e.sm-=dt;if(e.sm<=0){e.sm=7;summon('donut',3)}
  }else{e.sh-=dt;if(e.sh<=0){e.sh=2;ring(16,150,e.tm)}dash(4,380)}
 }
 e.tm+=dt;
 return[v,ux,uy];
}

/* ===== 更新 ===== */
function update(dt){
 const p=S.player,w=S.w,cdm=S.ch.cdm;
 S.t+=dt;p.inv=Math.max(0,p.inv-dt);S.freeze=Math.max(0,S.freeze-dt);S.shield=Math.max(0,S.shield-dt);
 if(S.warn){S.warn.t-=dt;if(S.warn.t<=0)S.warn=null}

 let mx=S.joy.dx,my=S.joy.dy;const k=S.keys;
 if(k.a||k.arrowleft)mx-=1;if(k.d||k.arrowright)mx+=1;if(k.w||k.arrowup)my-=1;if(k.s||k.arrowdown)my+=1;
 const ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml}
 const spd=150*S.ch.spd*(1+.15*w.cheese);p.x+=mx*spd*dt;p.y+=my*spd*dt;
 if(w.cheese>=5&&ml>.1){const t=S.trail[S.trail.length-1];if(!t||Math.hypot(t.x-p.x,t.y-p.y)>20)S.trail.push({x:p.x,y:p.y,t:2.5})}
 S.trail.forEach(t=>t.t-=dt);S.trail=S.trail.filter(t=>t.t>0);

 const ri=Math.min(S.ch.regen||999,w.milk?40-6*w.milk:999);
 if(ri<999){S.rg+=dt;if(S.rg>=ri){S.rg=0;if(p.hp<p.maxhp){p.hp++;S.fx.push({x:p.x,y:p.y-30,t:.8,txt:'💚'})}}}

 /* 時間軸 */
 S.spawnT-=dt;
 const rate=Math.max(.25,1.1-S.t/220);
 if(S.spawnT<=0){S.spawnT=rate;
  spawnEnemy(pickType());
  if(S.t>90&&Math.random()<.4)spawnEnemy('pudding')}
 [[30,8],[45,10],[80,14],[100,20],[130,25],[155,30]].forEach(([t,n])=>{if(S.t>=t&&!S.waves[t]){S.waves[t]=1;const a=rnd(0,6.283);
  for(let i=0;i<n;i++)spawnEnemy('donut',a+rnd(-.4,.4),Math.hypot(W,H)/2+40+rnd(0,60))}});
 BOSS_TIMELINE.forEach(([t,kind])=>{if(S.t>=t&&!S.bossDone[kind]){S.bossDone[kind]=1;mkBoss(kind)}});
 if(S.t>=GAME_TIME)return finish(true);

 /* 葵花子 */
 S.cd.seed-=dt;if(S.cd.seed<=0&&w.seed){S.cd.seed=1.2*cdm;const t=nearest(p.x,p.y);
  if(t){const n=w.seed,base=Math.atan2(t.y-p.y,t.x-p.x);
   for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*.2;S.shots.push({x:p.x,y:p.y,vx:Math.cos(a)*320,vy:Math.sin(a)*320,pierce:w.seed+1,life:2,hitSet:new Set(),rot:0})}}}
 S.shots.forEach(s=>{s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;s.rot+=dt*12;
  for(const e of S.enemies){if(s.pierce<=0)break;if(e.dead||s.hitSet.has(e))continue;
   if(Math.hypot(e.x-s.x,e.y-s.y)<e.r+7){s.hitSet.add(e);s.pierce--;dmg(e,2)}}});
 S.shots=S.shots.filter(s=>s.life>0&&s.pierce>0);

 /* 泡泡糖 */
 if(w.gum){S.gumAng+=dt*(2+w.gum*.5);const n=[2,3,4,5,6][w.gum-1];S.gums=[];
  for(let i=0;i<n;i++){const a=S.gumAng+i*6.283/n;S.gums.push({x:p.x+Math.cos(a)*65,y:p.y+Math.sin(a)*65,r:12})}
  for(const g of S.gums)for(const e of S.enemies){if(e.dead)continue;const dx=e.x-g.x,dy=e.y-g.y,d=Math.hypot(dx,dy)||1;
   if(d<e.r+g.r&&e.gh<=0){e.gh=.4;dmg(e,1);if(!e.boss){e.kx=dx/d*260;e.ky=dy/d*260}}}
 }else S.gums=[];

 /* 爆米花 */
 S.cd.pop-=dt;if(S.cd.pop<=0&&w.pop){S.cd.pop=3*cdm;const vis=visible();
  for(let i=0;i<w.pop&&vis.length;i++){const e=vis[Math.floor(Math.random()*vis.length)];S.pops.push({x:e.x,y:e.y,t:.6,R:50+w.pop*15,boom:false})}}
 S.pops.forEach(o=>{o.t-=dt;if(o.t<=0&&!o.boom){o.boom=true;o.t=.35;
  for(const e of S.enemies)if(!e.dead&&Math.hypot(e.x-o.x,e.y-o.y)<o.R+e.r)dmg(e,6)}});
 S.pops=S.pops.filter(o=>o.t>0||!o.boom);

 /* 草莓追蹤彈 */
 S.cd.berry-=dt;if(S.cd.berry<=0&&w.berry){S.cd.berry=2*cdm;
  for(let i=0;i<w.berry;i++){const a=rnd(0,6.283);S.missiles.push({x:p.x,y:p.y,vx:Math.cos(a)*200,vy:Math.sin(a)*200,life:3.5,delay:i*.15})}}
 S.missiles.forEach(m=>{if(m.delay>0){m.delay-=dt;m.x=p.x;m.y=p.y;return}
  m.life-=dt;const t=nearest(m.x,m.y);
  if(t){const a=Math.atan2(t.y-m.y,t.x-m.x),cur=Math.atan2(m.vy,m.vx);let df=a-cur;while(df>Math.PI)df-=6.283;while(df<-Math.PI)df+=6.283;
   const na=cur+Math.max(-5*dt,Math.min(5*dt,df));m.vx=Math.cos(na)*240;m.vy=Math.sin(na)*240}
  m.x+=m.vx*dt;m.y+=m.vy*dt;
  for(const e of S.enemies){if(e.dead)continue;if(Math.hypot(e.x-m.x,e.y-m.y)<e.r+8){
    const R=20+w.berry*8;for(const q of S.enemies)if(!q.dead&&Math.hypot(q.x-m.x,q.y-m.y)<R+q.r)dmg(q,q===e?4:2);
    S.fx.push({x:m.x,y:m.y,t:.3,txt:'💥'});m.life=0;break}}});
 S.missiles=S.missiles.filter(m=>m.life>0);

 /* 棒棒糖閃電 */
 S.cd.bolt-=dt;if(S.cd.bolt<=0&&w.bolt){S.cd.bolt=(2.6-w.bolt*.25)*cdm;
  const vis=visible().sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).slice(0,w.bolt+1);
  vis.forEach(t=>{const pts=[{x:p.x,y:p.y},{x:t.x,y:t.y}];dmg(t,5);
   const nx=S.enemies.filter(e=>!e.dead&&e!==t&&Math.hypot(e.x-t.x,e.y-t.y)<110).sort((a,b)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y))[0];
   if(nx){dmg(nx,3);pts.push({x:nx.x,y:nx.y})}
   S.bolts.push({pts,t:.2})})}
 S.bolts.forEach(b=>b.t-=dt);S.bolts=S.bolts.filter(b=>b.t>0);

 /* 迴力餅乾 */
 S.cd.cookie-=dt;if(S.cd.cookie<=0&&w.cookie){S.cd.cookie=2.2*cdm;
  const t=nearest(p.x,p.y),base=t?Math.atan2(t.y-p.y,t.x-p.x):rnd(0,6.283);
  for(let i=0;i<w.cookie;i++){const a=base+(i-(w.cookie-1)/2)*.5;
   S.cookies.push({x:p.x,y:p.y,a,out:true,dist:0,max:150+w.cookie*30,rot:0,hitT:new Map()})}}
 S.cookies.forEach(c=>{c.rot+=dt*10;const sp=300;
  if(c.out){c.x+=Math.cos(c.a)*sp*dt;c.y+=Math.sin(c.a)*sp*dt;c.dist+=sp*dt;if(c.dist>=c.max)c.out=false}
  else{const dx=p.x-c.x,dy=p.y-c.y,d=Math.hypot(dx,dy)||1;c.x+=dx/d*sp*1.2*dt;c.y+=dy/d*sp*1.2*dt;if(d<20)c.done=true}
  for(const e of S.enemies){if(e.dead)continue;if((c.hitT.get(e)||0)>S.t)continue;
   if(Math.hypot(e.x-c.x,e.y-c.y)<e.r+10){c.hitT.set(e,S.t+.35);dmg(e,2)}}});
 S.cookies=S.cookies.filter(c=>!c.done);

 /* 冰淇淋新星 */
 S.cd.nova-=dt;if(S.cd.nova<=0&&w.nova){S.cd.nova=(4.4-w.nova*.4)*cdm;const R=90+w.nova*25;
  for(const e of S.enemies)if(!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<R+e.r){dmg(e,3);e.fz=2}
  S.novas.push({x:p.x,y:p.y,t:.5,R})}
 S.novas.forEach(n=>n.t-=dt);S.novas=S.novas.filter(n=>n.t>0);

 /* 蜂蜜陷阱 */
 S.cd.honey-=dt;if(S.cd.honey<=0&&w.honey){S.cd.honey=3*cdm;S.puddles.push({x:p.x,y:p.y,r:40+w.honey*8,t:4+w.honey,tk:0})}
 S.puddles.forEach(q=>{q.t-=dt;q.tk-=dt;if(q.tk<=0){q.tk=.5;for(const e of S.enemies)if(!e.dead&&Math.hypot(e.x-q.x,e.y-q.y)<q.r+e.r)dmg(e,1)}});
 S.puddles=S.puddles.filter(q=>q.t>0);

 /* 杯子蛋糕砲台 */
 S.cd.turret-=dt;if(S.cd.turret<=0&&w.turret){S.cd.turret=8*cdm;const n=1+(w.turret>=3)+(w.turret>=5);
  for(let i=0;i<n;i++)S.turrets.push({x:p.x+rnd(-60,60),y:p.y+rnd(-60,60),t:6+w.turret,cd:0})}
 S.turrets.forEach(t=>{t.t-=dt;t.cd-=dt;if(t.cd<=0){const e=nearest(t.x,t.y);
  if(e&&Math.hypot(e.x-t.x,e.y-t.y)<240){t.cd=.6;const a=Math.atan2(e.y-t.y,e.x-t.x);
   S.shots.push({x:t.x,y:t.y,vx:Math.cos(a)*340,vy:Math.sin(a)*340,pierce:1,life:1,hitSet:new Set(),rot:0})}}});
 S.turrets=S.turrets.filter(t=>t.t>0);

 /* 敵人 */
 for(const e of S.enemies){
  if(e.dead)continue;e.hit-=dt;e.gh-=dt;
  if(S.freeze>0)continue;
  const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;
  let sl=1;
  for(const t of S.trail)if(Math.hypot(t.x-e.x,t.y-e.y)<28){sl=Math.min(sl,.4);break}
  for(const q of S.puddles)if(Math.hypot(q.x-e.x,q.y-e.y)<q.r+e.r){sl=Math.min(sl,.5);break}
  if(e.fz>0){e.fz-=dt;sl=Math.min(sl,.3)}
  if(S.ch.aura&&d<110)sl=Math.min(sl,.7);
  let v=e.sp*sl,ux=dx/d,uy=dy/d;
  if(e.rng){if(d<200)v=0;e.shootT=(e.shootT??rnd(1,4))-dt;
   if(e.shootT<=0){e.shootT=4;S.ebul.push({x:e.x,y:e.y,vx:ux*160,vy:uy*160,life:5,r:6})}}
  if(e.mage){
   if(d<240)v=0;
   if(d<150){ux=-ux;uy=-uy;v=e.sp*sl*.8}
   e.shootT=(e.shootT??rnd(1,3.5))-dt;
   if(e.shootT<=0){e.shootT=3.5;const b=Math.atan2(dy,dx);
    for(const o of[-.28,0,.28])S.ebul.push({x:e.x,y:e.y,vx:Math.cos(b+o)*150,vy:Math.sin(b+o)*150,life:5,r:6})}}
  if(e.dash){[v,ux,uy]=dashAI(e,dt,ux,uy,v,3,300,.5,.5)}
  if(e.flee){ux=-ux;uy=-uy;e.life-=dt;if(e.life<=0)e.gone=true}
  if(e.boss){[v,ux,uy]=bossAI(e,dt,ux,uy,v)}
  e.x+=ux*v*dt+e.kx*dt;e.y+=uy*v*dt+e.ky*dt;e.kx*=.9;e.ky*=.9;
  if(!e.flee&&d<e.r+p.r){hurt(1);if(e.bomb&&!e.dead)die(e)}
 }
 for(let i=0;i<S.enemies.length;i++){const a=S.enemies[i];for(let j=i+1;j<Math.min(i+8,S.enemies.length);j++){const b=S.enemies[j];
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),m=a.r+b.r;if(d>0&&d<m){const f=(m-d)/2/d;
   if(!a.boss){a.x-=dx*f;a.y-=dy*f}if(!b.boss){b.x+=dx*f;b.y+=dy*f}}}}
 S.enemies=S.enemies.filter(e=>!e.dead&&!e.gone&&(e.boss||Math.hypot(e.x-p.x,e.y-p.y)<1200));
 S.ebul.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-p.x,b.y-p.y)<b.r+p.r){b.life=0;hurt(1)}});
 S.ebul=S.ebul.filter(b=>b.life>0);

 /* 掉落物 */
 for(const o of S.drops){o.life-=dt;if(Math.hypot(o.x-p.x,o.y-p.y)<p.r+(o.big?26:18)){o.got=true;applyDrop(o.k)}}
 S.drops=S.drops.filter(o=>!o.got&&o.life>0);

 /* 經驗磁鐵 */
 const mag=80+40*w.magnet+S.ch.mag;
 for(const g of S.gems){const dx=p.x-g.x,dy=p.y-g.y,d=Math.hypot(dx,dy);
  if(d<mag)g.fly=true;
  if(g.fly){g.s+=dt*16;const k2=Math.min(1,g.s*dt);g.x+=dx*k2;g.y+=dy*k2}
  if(d<p.r+6){g.got=true;S.xp+=g.v*S.ch.xp}}
 S.gems=S.gems.filter(g=>!g.got);
 if(state==='play'&&S.xp>=S.need)levelUp();
 S.fx.forEach(f=>{f.t-=dt;f.y-=20*dt});S.fx=S.fx.filter(f=>f.t>0);
}

/* ===== 繪製 ===== */
function emoji(t,x,y,s){ctx.font=s+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x,y)}
function draw(){
 const p=S.player,ox=W/2-p.x,oy=(desk?H*.5:H*.4)-p.y;
 ctx.fillStyle='#c6ecb8';ctx.fillRect(0,0,W,H);
 const g=80,sx=((ox%g)+g)%g,sy=((oy%g)+g)%g;ctx.fillStyle='#b4e0a4';
 for(let x=sx-g;x<W+g;x+=g)for(let y=sy-g;y<H+g;y+=g){const ix=Math.round((x-ox)/g),iy=Math.round((y-oy)/g);
  if((ix*7+iy*13)%3===0){ctx.beginPath();ctx.arc(x,y,6,0,6.283);ctx.fill()}
  if((ix+iy)%5===0)emoji('🌼',x+20,y+20,14)}
 ctx.save();ctx.translate(ox,oy);
 for(const q of S.puddles){ctx.globalAlpha=.55;ctx.fillStyle='#f6b93b';ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,6.283);ctx.fill();ctx.globalAlpha=1;emoji('🍯',q.x,q.y,20)}
 for(const t of S.trail){ctx.globalAlpha=Math.min(1,t.t);emoji('🧀',t.x,t.y,18)}ctx.globalAlpha=1;
 for(const o of S.pops){if(!o.boom){ctx.strokeStyle='rgba(255,150,50,.7)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(o.x,o.y,o.R*(1-o.t/.6),0,6.283);ctx.stroke();emoji('🌽',o.x,o.y-(o.t*60),18)}
  else{ctx.fillStyle='rgba(255,240,180,.6)';ctx.beginPath();ctx.arc(o.x,o.y,o.R,0,6.283);ctx.fill();emoji('🍿',o.x,o.y,o.R)}}
 for(const n of S.novas){const r=n.R*(1-n.t/.5);ctx.strokeStyle='rgba(120,200,255,.9)';ctx.fillStyle='rgba(180,230,255,.3)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(n.x,n.y,r,0,6.283);ctx.fill();ctx.stroke()}
 for(const q of S.gems)emoji('🌻',q.x,q.y,14);
 for(const o of S.drops){if(o.life<3&&Math.floor(S.t*8)%2)continue;emoji(o.ic,o.x,o.y+Math.sin(S.t*5)*3,o.big?34:24)}
 for(const t of S.turrets)emoji('🧁',t.x,t.y,26);
 for(const e of S.enemies){ctx.globalAlpha=e.hit>0?.5:1;
  if(e.st==='wind'){ctx.strokeStyle='rgba(255,60,60,.7)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(e.x,e.y,e.r+8,0,6.283);ctx.stroke()}
  if(e.flee){ctx.fillStyle='rgba(255,215,0,.35)';ctx.beginPath();ctx.arc(e.x,e.y,e.r+8,0,6.283);ctx.fill()}
  emoji(e.e,e.x,e.y,e.r*2.2);ctx.globalAlpha=1;
  if(e.fz>0||S.freeze>0)emoji('❄️',e.x,e.y-e.r,14);
  if(!e.boss&&e.hp<e.mhp){const w=e.r*2;ctx.fillStyle='#0003';ctx.fillRect(e.x-w/2,e.y-e.r-12,w,5);ctx.fillStyle='#ff5b8a';ctx.fillRect(e.x-w/2,e.y-e.r-12,w*Math.max(0,e.hp/e.mhp),5)}}
 for(const b of S.ebul)emoji('🍬',b.x,b.y,b.r*2.4);
 for(const s of S.shots){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rot);emoji('🌻',0,0,16);ctx.restore()}
 for(const m of S.missiles){if(m.delay>0)continue;ctx.save();ctx.translate(m.x,m.y);ctx.rotate(Math.atan2(m.vy,m.vx));emoji('🍓',0,0,20);ctx.restore()}
 for(const c of S.cookies){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.rot);emoji('🍪',0,0,24);ctx.restore()}
 for(const b of S.bolts){ctx.strokeStyle='#fff35e';ctx.lineWidth=4;ctx.shadowColor='#ffb300';ctx.shadowBlur=10;ctx.beginPath();
  b.pts.forEach((q,i)=>{if(i===0)ctx.moveTo(q.x,q.y);else{const a=b.pts[i-1],mx=(a.x+q.x)/2+rnd(-12,12),my=(a.y+q.y)/2+rnd(-12,12);ctx.lineTo(mx,my);ctx.lineTo(q.x,q.y)}});
  ctx.stroke();ctx.shadowBlur=0}
 if(S.ch.aura){ctx.strokeStyle='rgba(120,200,255,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,110,0,6.283);ctx.stroke()}
 ctx.globalAlpha=p.inv>0&&Math.floor(S.t*12)%2?.4:1;
 ctx.fillStyle='rgba(200,235,255,.45)';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.r+4,0,6.283);ctx.fill();ctx.stroke();
 emoji(S.ch.ic,p.x,p.y,p.r*1.5);ctx.globalAlpha=1;
 if(S.shield>0){ctx.strokeStyle='rgba(255,215,0,.8)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,p.r+12,0,6.283);ctx.stroke()}
 for(const gm of S.gums){ctx.fillStyle='rgba(255,150,200,.8)';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(gm.x,gm.y,gm.r,0,6.283);ctx.fill();ctx.stroke()}
 for(const f of S.fx)emoji(f.txt,f.x,f.y,22);
 ctx.restore();
 if(S.freeze>0){ctx.fillStyle='rgba(150,220,255,.2)';ctx.fillRect(0,0,W,H)}

 if(!desk){
  ctx.fillStyle='rgba(255,182,209,.18)';ctx.fillRect(0,H*.8,W,H*.2);
  if(!S.joy.on){ctx.fillStyle='#fff9';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('👇 在此按住拖曳移動',W/2,H*.9)}
  else{const j=S.joy;ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(j.sx,j.sy,50,0,6.283);ctx.fill();emoji('🐾',j.sx+j.dx*50,j.sy+j.dy*50,44)}
 }else{
  ctx.fillStyle='#8a4b6a99';ctx.font='13px sans-serif';ctx.textAlign='center';
  ctx.fillText('WASD 移動  |  Q/E 調整速度  |  P 暫停  |  F 全螢幕',W/2,H-10);
 }

 ctx.fillStyle='#fff8';ctx.fillRect(0,0,W,16);ctx.fillStyle='#ff7eb0';ctx.fillRect(0,0,W*Math.min(1,S.xp/S.need),16);
 ctx.fillStyle='#8a4b6a';ctx.font='bold 12px sans-serif';ctx.textAlign='left';ctx.fillText('Lv.'+S.lv,6,9);
 let h='';for(let i=0;i<p.maxhp;i++)h+=i<p.hp?'❤️':'🖤';ctx.font='18px serif';ctx.textAlign='left';ctx.fillText(h,8,38);
 const rem=Math.max(0,Math.ceil(GAME_TIME-S.t)),m=Math.floor(rem/60),s=String(rem%60).padStart(2,'0');
 ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillStyle='#8a4b6a';ctx.fillText(`${m}:${s}`,W/2,62);
 ctx.font='13px sans-serif';ctx.textAlign='right';ctx.fillText(`怪 ${S.enemies.length}/${MAX_ENEMY}  擊殺 ${S.kills}`,W-8,30);
 const bo=S.enemies.find(e=>e.boss);
 if(bo){const bw=Math.min(W*.8,600),bx=(W-bw)/2;ctx.fillStyle='#0004';ctx.fillRect(bx,78,bw,12);ctx.fillStyle='#e0306a';ctx.fillRect(bx,78,bw*Math.max(0,bo.hp/bo.mhp),12);
  ctx.fillStyle='#8a4b6a';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(BOSSES[bo.kind].name,W/2,102)}
 const by=desk?H-34:H*.8-16;let ix=8;ctx.textAlign='left';
 for(const k of WKEYS){if(S.w[k]>0){ctx.font='18px serif';ctx.fillText(WEAPONS[k].ic,ix,by);ctx.font='bold 10px sans-serif';ctx.fillText('Lv'+S.w[k],ix-1,by+14);ix+=34}}
 if(S.warn){ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e0306a';ctx.fillText(S.warn.txt,W/2,H*.25)}
 if(state==='hold'){ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('⏸ 暫停中(按 P 繼續)',W/2,H/2)}
}
function loop(now){
 if(state==='play'){
  let tot=Math.min(.05,(now-last)/1000)*SPEEDS[speedIdx];last=now;
  while(tot>1e-4&&state==='play'){const s=Math.min(.033,tot);update(s);tot-=s}
 }else last=now;
 if(S&&state!=='menu')draw();
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
