'use strict';
const cv=document.getElementById('c'),ctx=cv.getContext('2d'),$=id=>document.getElementById(id);
let W,H,DPR,desk=false;
function resize(){
 desk=matchMedia('(hover:hover) and (pointer:fine)').matches;$('wrap').classList.toggle('desk',desk);
 DPR=Math.min(devicePixelRatio||1,2);const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
const GAME_TIME=180,MAX_ENEMY=80;
let S=null,state='menu',last=0;

/* ===== 平衡參數(想調難度改這裡)===== */
const BAL={
 hpGrow:220,      // 小怪血量隨時間成長:x(1+t/hpGrow)
 dmgGrow:600,     // 小怪傷害隨時間成長:x(1+t/dmgGrow)
 spawnStart:1.8,  // 初始生怪間隔(秒)
 spawnMin:.45,    // 最短生怪間隔
 spawnDecay:200,  // 間隔縮短速度
 invBase:.8,      // 受傷後基礎無敵秒數
 levelHeal:8,     // 升級回復血量
 xpBase:5,xpLin:3,xpQuad:.1,
 dropRate:.09
};
const needFor=lv=>Math.floor(BAL.xpBase+BAL.xpLin*(lv-1)+BAL.xpQuad*(lv-1)*(lv-1));

/* ===== 難度選擇 ===== */
const DIFFS=[
 {n:'😊 簡單',dm:.7,hp:.8,sp:1.25,d:'怪物傷害 -30%、血量 -20%、出怪較慢'},
 {n:'🙂 普通',dm:1,hp:1,sp:1,d:'標準難度'},
 {n:'😈 困難',dm:1.4,hp:1.3,sp:.8,d:'怪物傷害 +40%、血量 +30%、出怪更快'}
];
let diffIdx=0;
try{const v=+localStorage.getItem('hs_diff');diffIdx=v>=0&&v<DIFFS.length?v:0}catch(e){}
function setDiff(i){diffIdx=(i+DIFFS.length)%DIFFS.length;try{localStorage.setItem('hs_diff',diffIdx)}catch(e){}buildMenu()}

/* ===== 存檔 ===== */
const SAVE={ach:{},tot:{kills:0,games:0,wins:0}};
try{const o=JSON.parse(localStorage.getItem('hs_save2')||'{}');Object.assign(SAVE.ach,o.ach);Object.assign(SAVE.tot,o.tot)}catch(e){}
function persist(){try{localStorage.setItem('hs_save2',JSON.stringify(SAVE))}catch(e){}}
function toast(msg){const d=document.createElement('div');d.className='toast';d.textContent=msg;$('toast').appendChild(d);setTimeout(()=>d.remove(),3200)}

/* ===== 音效與背景音樂(WebAudio 合成,無需音檔)===== */
const AU={c:null,mute:false,mg:null,last:{},combo:0,gt:0,mode:'menu',step:0,nextT:0,timer:null};
try{AU.mute=localStorage.getItem('hs_mute')==='1'}catch(e){}
AU.init=()=>{
 if(AU.c){if(AU.c.state==='suspended')AU.c.resume();return}
 const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
 AU.c=new C();AU.mg=AU.c.createGain();AU.mg.gain.value=AU.mute?0:.5;AU.mg.connect(AU.c.destination);
};
AU.tone=(f,d,type,vol,when,slide)=>{
 if(!AU.c)return;const t=AU.c.currentTime+(when||0),o=AU.c.createOscillator(),g=AU.c.createGain();
 o.type=type||'square';o.frequency.setValueAtTime(f,t);
 if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
 g.gain.setValueAtTime(vol||.1,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
 o.connect(g);g.connect(AU.mg);o.start(t);o.stop(t+d+.02);
};
AU.noise=(d,vol)=>{
 if(!AU.c)return;const n=Math.floor(AU.c.sampleRate*d),b=AU.c.createBuffer(1,n,AU.c.sampleRate),a=b.getChannelData(0);
 for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);
 const s=AU.c.createBufferSource(),g=AU.c.createGain();s.buffer=b;g.gain.value=vol||.1;s.connect(g);g.connect(AU.mg);s.start();
};
AU.sfx=n=>{
 if(!AU.c||AU.mute)return;
 const now=performance.now(),lim={shoot:80,hit:45,kill:35,gem:25,zap:120}[n]||0;
 if(now-(AU.last[n]||0)<lim)return;AU.last[n]=now;
 const T=AU.tone,seq=(arr,d,type,vol,gap)=>arr.forEach((f,i)=>T(f,d,type,vol,i*gap));
 switch(n){
  case 'shoot':T(520,.07,'square',.035,0,300);break;
  case 'hit':T(200,.05,'square',.035,0,-80);break;
  case 'kill':T(300,.12,'triangle',.07,0,-150);break;
  case 'gem':AU.combo=now-AU.gt<450?Math.min(AU.combo+1,14):0;AU.gt=now;T(700+AU.combo*45,.08,'sine',.06);break;
  case 'hurt':T(160,.25,'sawtooth',.14,0,-100);AU.noise(.15,.08);break;
  case 'boom':AU.noise(.35,.18);T(110,.3,'sine',.15,0,-60);break;
  case 'zap':T(900,.12,'sawtooth',.05,0,-600);break;
  case 'nova':T(300,.4,'sine',.1,0,600);break;
  case 'level':seq([523,659,784,1047],.18,'triangle',.12,.09);break;
  case 'drop':seq([880,1175],.12,'sine',.1,.07);break;
  case 'chest':seq([392,523,659,784,1047],.2,'triangle',.12,.08);break;
  case 'boss':seq([110,110,98],.4,'sawtooth',.16,.35);break;
  case 'win':seq([523,659,784,1047,1319],.25,'triangle',.13,.12);break;
  case 'lose':seq([392,330,262,196],.3,'triangle',.13,.2);break;
  case 'ach':seq([784,988,1319],.18,'sine',.12,.1);break;
  case 'ui':T(660,.05,'square',.05);break;
 }
};
const PENT=[0,2,4,7,9],MINOR=[0,3,5,7,10],MEL=[0,2,4,2,3,1,2,0,4,3,2,4,5,4,2,-1],BASS=[0,3,2,4];
const noteSemi=(d,sc)=>12*Math.floor(d/5)+sc[((d%5)+5)%5],freq=n=>261.63*Math.pow(2,n/12);
AU.tick=()=>{
 const c=AU.c;if(!c)return;
 if(AU.nextT<c.currentTime)AU.nextT=c.currentTime+.05;
 const bpm={menu:96,game:124,boss:152}[AU.mode]||110,sd=60/bpm/2,sc=AU.mode==='boss'?MINOR:PENT;
 while(AU.nextT<c.currentTime+.3){
  const s=AU.step%16,w=AU.nextT-c.currentTime;
  if(!AU.mute){
   const m=MEL[s];if(m>=0&&(AU.mode!=='menu'||s%2===0))AU.tone(freq(noteSemi(m+5,sc)),sd*.9,'triangle',.05,w);
   if(s%4===0)AU.tone(freq(noteSemi(BASS[s/4|0],sc)-12),sd*3.5,'sine',.09,w);
   if(AU.mode!=='menu'&&s%2===1)AU.tone(1800,.03,'square',.012,w);
  }
  AU.step++;AU.nextT+=sd;
 }
};
AU.start=()=>{if(!AU.timer&&AU.c)AU.timer=setInterval(AU.tick,100)};
function setMute(m){
 AU.mute=m;if(AU.mg)AU.mg.gain.value=m?0:.5;$('muteBtn').textContent=m?'🔇':'🔊';
 try{localStorage.setItem('hs_mute',m?'1':'0')}catch(e){}
}
$('muteBtn').onclick=e=>{AU.init();AU.start();setMute(!AU.mute);e.target.blur()};
setMute(AU.mute);
const gesture=()=>{AU.init();AU.start()};
addEventListener('pointerdown',gesture);addEventListener('keydown',gesture);

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

/* ===== 角色(hp 為血量點數)===== */
const CH0={hp:120,spd:1,dm:1,cdm:1,inv:1,xp:1,crit:0,mag:0,aura:false,regen:0};
const CHARS={
 hamster:{ic:'🐹',name:'圓滾滾倉鼠',xp:1.1,desc:'均衡型。血量 120,經驗值獲取 +10%。'},
 rabbit:{ic:'🐰',name:'疾風兔兔',hp:100,spd:1.15,inv:1.5,desc:'血量 100、移速 +15%,受傷後無敵時間 x1.5。'},
 bear:{ic:'🐻',name:'壯壯熊熊',hp:170,spd:.9,dm:1.15,desc:'血量 170、傷害 +15%,但移動較慢。'},
 cat:{ic:'🐱',name:'機靈小貓',spd:1.05,cdm:.85,desc:'所有武器冷卻 -15%,移速 +5%。'},
 fox:{ic:'🦊',name:'暴擊狐狸',crit:.15,desc:'天生 15% 暴擊率。'},
 frog:{ic:'🐸',name:'吸力青蛙',spd:1.05,mag:50,desc:'經驗值吸附範圍 +50px,移速 +5%。'},
 penguin:{ic:'🐧',name:'冰霜企鵝',hp:150,spd:.95,aura:true,desc:'血量 150,身邊 110px 內的敵人移速 -30%。'},
 unicorn:{ic:'🦄',name:'夢幻獨角獸',dm:1.05,regen:.6,desc:'每秒自動回復 0.6 HP,傷害 +5%。'}
};
for(const k in CHARS)CHARS[k]=Object.assign({},CH0,CHARS[k]);

/* ===== 武器 / 被動 / 裝備 ===== */
const WEAPONS={
 seed:{ic:'🌻',name:'葵花子飛鏢',type:'weapon',desc:l=>`朝最近敵人發射 ${l} 顆,穿透 ${l+1} 次`},
 gum:{ic:'🎈',name:'環繞泡泡糖',type:'weapon',desc:l=>`${[2,3,4,5,6][l-1]} 個泡泡護盾,旋轉更快並彈開敵人`},
 pop:{ic:'🍿',name:'爆裂爆米花',type:'weapon',desc:l=>`每 3 秒落下 ${l} 顆玉米粒,爆炸範圍 ${50+l*15}px`},
 fw:{ic:'🎆',name:'彩虹煙火',type:'weapon',desc:l=>`每 1.6 秒朝四面八方射出 ${[4,6,8,10,12][l-1]} 發彩虹彈,穿透 2 次`},
 chili:{ic:'🌶️',name:'辣椒光環',type:'weapon',desc:l=>`身邊 ${60+l*12}px 火圈持續灼傷敵人(每 0.5 秒 ${(1+l*.6).toFixed(1)} 傷害)`},
 berry:{ic:'🍓',name:'草莓追蹤彈',type:'weapon',desc:l=>`發射 ${l} 顆追蹤草莓,命中範圍爆炸(半徑 ${20+l*8}px)`},
 bolt:{ic:'🍭',name:'棒棒糖閃電',type:'weapon',desc:l=>`每 ${(2.6-l*.25).toFixed(2)} 秒電擊 ${l+1} 隻敵人並彈跳`},
 cookie:{ic:'🍪',name:'迴力餅乾',type:'weapon',desc:l=>`擲出 ${l} 片餅乾,去程回程都會傷敵(射程 ${150+l*30}px)`},
 nova:{ic:'🍦',name:'冰淇淋新星',type:'weapon',desc:l=>`每 ${(4.4-l*.4).toFixed(1)} 秒爆出半徑 ${90+l*25}px 冰環,傷敵並冰凍 2 秒`},
 honey:{ic:'🍯',name:'蜂蜜陷阱',type:'weapon',desc:l=>`留下半徑 ${40+l*8}px 蜂蜜地,持續 ${4+l} 秒,敵人減速並持續受傷`},
 turret:{ic:'🧁',name:'杯子蛋糕砲台',type:'weapon',desc:l=>`每 8 秒放置 ${1+(l>=3)+(l>=5)} 座砲台,存活 ${6+l} 秒自動射擊`},
 cheese:{ic:'🧀',name:'起司加速跑鞋',type:'passive',desc:l=>`移速 +${l*15}%`+(l>=5?',並留下減速起司軌跡':'')},
 magnet:{ic:'🧲',name:'蜂蜜磁鐵',type:'passive',desc:l=>`葵花子吸附範圍 ${80+l*40}px`},
 heart:{ic:'💖',name:'愛心糖果',type:'passive',desc:l=>`最大血量 +15(累計 +${l*15}),並回復 15 HP`},
 power:{ic:'🍬',name:'甜蜜力量',type:'passive',desc:l=>`所有武器傷害 +${l*20}%`},
 clover:{ic:'🍀',name:'幸運四葉草',type:'passive',desc:l=>`暴擊率 +${l*8}%,特殊掉落率 +${l*20}%`},
 milk:{ic:'🥛',name:'營養牛奶',type:'passive',desc:l=>`每秒回復 ${(l*.4).toFixed(1)} HP`},
 lens:{ic:'🔍',name:'放大鏡',type:'passive',desc:l=>`範圍型武器(泡泡、爆米花、冰環、蜂蜜、光環)範圍 +${l*10}%`},
 watch:{ic:'⏱️',name:'精準懷錶',type:'passive',desc:l=>`所有武器冷卻 -${l*8}%`},
 helmet:{ic:'⛑️',name:'安全帽',type:'equip',max:3,desc:l=>`受到傷害 -${l*12}%`},
 ring:{ic:'💍',name:'暴擊戒指',type:'equip',max:3,desc:l=>`暴擊率 +${l*5}%,暴擊傷害 +${l*25}%`},
 boots:{ic:'🥾',name:'彈力靴',type:'equip',max:3,desc:l=>`移速 +${l*5}%,受傷後無敵 +${(l*.15).toFixed(2)} 秒`},
 cape:{ic:'🧥',name:'反擊披風',type:'equip',max:3,desc:l=>`受傷時震退周圍敵人並造成 ${l*6} 傷害`},
 glasses:{ic:'🕶️',name:'貪婪眼鏡',type:'equip',max:3,desc:l=>`經驗值 +${l*15}%`},
 scarf:{ic:'🧣',name:'吸血圍巾',type:'equip',max:3,desc:l=>`每擊殺一隻敵人回復 ${(l*.2).toFixed(1)} HP`},
 amulet:{ic:'📿',name:'復活護符',type:'equip',max:2,desc:l=>`額外復活 ${l} 次(回復 50% 血量並短暫無敵)`}
};
const WKEYS=Object.keys(WEAPONS),START_WEAPONS=WKEYS.filter(k=>WEAPONS[k].type==='weapon');
const TAG={weapon:['升級','up'],passive:['升級','pas'],equip:['升級','eq']};

/* ===== 小怪圖鑑(dm=碰撞傷害,bd=子彈傷害)===== */
const MOBS={
 pudding:{hp:3,sp:50,r:14,e:'🍮',dm:6},
 donut:{hp:2,sp:100,r:12,e:'🍩',dm:5},
 marsh:{hp:3,sp:45,r:13,e:'☁️',dm:6,rng:1,bd:5},
 mochi:{hp:10,sp:32,r:19,e:'🍡',dm:10,gems:2},
 snow:{hp:4,sp:55,r:14,e:'🍧',dm:6,split:1},
 ice:{hp:1,sp:85,r:9,e:'💠',dm:4},
 choc:{hp:4,sp:60,r:15,e:'🍫',dm:9,dash:1},
 cherry:{hp:2,sp:90,r:12,e:'🍒',dm:12,bomb:1},
 mage:{hp:5,sp:40,r:15,e:'🍰',dm:6,mage:1,bd:5},
 lucky:{hp:5,sp:90,r:13,e:'🥠',dm:0,flee:1,life:12}
};

/* ===== Boss ===== */
const BOSSES={
 donutb:{e:'🍩',name:'暴走巨無霸甜甜圈',hp:160,r:38,sp:55,dm:14},
 queen:{e:'🎂',name:'蛋糕女王',hp:260,r:40,sp:35,dm:14},
 sundae:{e:'🍓',name:'超級草莓巨無霸聖代',hp:520,r:50,sp:28,dm:16}
};
const BOSS_TIMELINE=[[60,'donutb'],[120,'queen'],[170,'sundae']];

/* ===== 特殊掉落物 ===== */
const DROPS=[['heart','💖',3],['chicken','🍗',2],['magnet','🧲',2],['bomb','💣',2],['freeze','❄️',2],['shield','🛡️',2],['star','⭐',2],['slow','⏳',1.5],['rage','⚡',1.5]];
const DROP_TOTAL=DROPS.reduce((a,d)=>a+d[2],0);

/* ===== 成就與解鎖 ===== */
const ACH=[
 {id:'first',ic:'🍬',name:'初次嘗鮮',desc:'擊殺第一隻壞壞甜點'},
 {id:'kill100',ic:'⚔️',name:'小試身手',desc:'單局擊殺 100 隻'},
 {id:'kill500',ic:'🔥',name:'割草達人',desc:'單局擊殺 500 隻'},
 {id:'lv10',ic:'🌟',name:'茁壯成長',desc:'單局達到 Lv.10'},
 {id:'lv20',ic:'👑',name:'傳說倉鼠',desc:'單局達到 Lv.20'},
 {id:'boss1',ic:'🍩',name:'甜甜圈終結者',desc:'擊敗暴走巨無霸甜甜圈'},
 {id:'boss2',ic:'🎂',name:'弒后者',desc:'擊敗蛋糕女王'},
 {id:'boss3',ic:'🍓',name:'聖代剋星',desc:'擊敗超級草莓巨無霸聖代'},
 {id:'win',ic:'🏆',name:'倖存者',desc:'通關一次'},
 {id:'weapons5',ic:'🎒',name:'武器大亨',desc:'同時擁有 5 種武器'},
 {id:'max5',ic:'💎',name:'登峰造極',desc:'任一武器或被動升到 Lv.5'},
 {id:'equip3',ic:'🧢',name:'全副武裝',desc:'同時擁有 3 件裝備'},
 {id:'lucky',ic:'🥠',name:'手氣不錯',desc:'擊殺幸運餅乾'},
 {id:'drops20',ic:'🎁',name:'收藏家',desc:'單局拾取 20 個特殊道具'},
 {id:'speed3',ic:'⚡',name:'極速傳說',desc:'以 x3 速度通關'},
 {id:'total2000',ic:'🌾',name:'千里割草',desc:'累計擊殺 2000 隻'}
];
const UNLOCK={
 chars:{bear:'kill100',fox:'boss1',frog:'lv10',penguin:'boss2',unicorn:'win'},
 items:{berry:'kill100',bolt:'kill500',cookie:'boss1',nova:'boss2',honey:'weapons5',turret:'win',amulet:'boss2'}
};
const charOK=k=>!UNLOCK.chars[k]||SAVE.ach[UNLOCK.chars[k]];
const itemOK=k=>!UNLOCK.items[k]||SAVE.ach[UNLOCK.items[k]];
const achText=id=>{const a=ACH.find(x=>x.id===id);return a?`${a.ic}${a.name}(${a.desc})`:id};
function ach(id){
 if(SAVE.ach[id])return;SAVE.ach[id]=1;persist();
 const a=ACH.find(x=>x.id===id);toast(`🏆 成就解鎖:${a.ic} ${a.name}`);AU.sfx('ach');if(S)S.newAch.push(a);
 const un=[];
 for(const k in UNLOCK.chars)if(UNLOCK.chars[k]===id)un.push(CHARS[k].name);
 for(const k in UNLOCK.items)if(UNLOCK.items[k]===id)un.push(WEAPONS[k].name);
 if(un.length)toast('🔓 新解鎖:'+un.join('、'));
}
function checkBuild(){
 const ks=WKEYS.filter(k=>S.w[k]>0);
 if(ks.filter(k=>WEAPONS[k].type==='weapon').length>=5)ach('weapons5');
 if(ks.some(k=>WEAPONS[k].type!=='equip'&&S.w[k]>=5))ach('max5');
 if(ks.filter(k=>WEAPONS[k].type==='equip').length>=3)ach('equip3');
}
function showAch(){
 const box=$('achList');box.innerHTML='';
 const n=ACH.filter(a=>SAVE.ach[a.id]).length;
 $('achCount').textContent=`已達成 ${n} / ${ACH.length}|累計擊殺 ${SAVE.tot.kills}|遊玩 ${SAVE.tot.games} 局|通關 ${SAVE.tot.wins} 次`;
 ACH.forEach(a=>{
  const rw=[];
  for(const k in UNLOCK.chars)if(UNLOCK.chars[k]===a.id)rw.push('角色 '+CHARS[k].name);
  for(const k in UNLOCK.items)if(UNLOCK.items[k]===a.id)rw.push(WEAPONS[k].name);
  const d=document.createElement('div');d.className='achItem'+(SAVE.ach[a.id]?'':' off');
  d.innerHTML=`<span class='ic'>${SAVE.ach[a.id]?a.ic:'🔒'}</span><div><b>${a.name}</b><small>${a.desc}</small>${rw.length?`<small>🔓 解鎖:${rw.join('、')}</small>`:''}</div>`;
  box.appendChild(d);
 });
}
$('achBtn').onclick=()=>{AU.sfx('ui');showAch();$('start').classList.remove('show');$('ach').classList.add('show');state='ach'};
$('achBack').onclick=e=>{e.target.blur();AU.sfx('ui');$('ach').classList.remove('show');$('start').classList.add('show');state='menu';buildMenu()};

/* ===== 選角介面 ===== */
let selChar='hamster',selWep='seed';
function buildMenu(){
 const ch=$('chars'),wp=$('weps'),df=$('diffs');ch.innerHTML='';wp.innerHTML='';df.innerHTML='';
 for(const k in CHARS){const c=CHARS[k],lock=!charOK(k),d=document.createElement('div');d.className='opt'+(k===selChar?' sel':'')+(lock?' lock':'');
  d.innerHTML=`<span class='ic'>${lock?'🔒':c.ic}</span><b>${c.name}</b>`;d.onclick=()=>{AU.sfx('ui');selChar=k;buildMenu()};ch.appendChild(d)}
 START_WEAPONS.forEach(k=>{const w=WEAPONS[k],lock=!itemOK(k),d=document.createElement('div');d.className='opt'+(k===selWep?' sel':'')+(lock?' lock':'');
  d.innerHTML=`<span class='ic'>${lock?'🔒':w.ic}</span><b>${w.name}</b>`;d.onclick=()=>{AU.sfx('ui');selWep=k;buildMenu()};wp.appendChild(d)});
 DIFFS.forEach((x,i)=>{const [ic,nm]=x.n.split(' '),d=document.createElement('div');d.className='opt'+(i===diffIdx?' sel':'');
  d.innerHTML=`<span class='ic'>${ic}</span><b>${nm}</b>`;d.onclick=()=>{AU.sfx('ui');setDiff(i)};df.appendChild(d)});
 const msg=[];
 if(!charOK(selChar))msg.push(`🔒 ${CHARS[selChar].name} 解鎖條件:${achText(UNLOCK.chars[selChar])}`);
 else msg.push(`${CHARS[selChar].name}:${CHARS[selChar].desc}`);
 if(!itemOK(selWep))msg.push(`🔒 ${WEAPONS[selWep].name} 解鎖條件:${achText(UNLOCK.items[selWep])}`);
 else msg.push(`${WEAPONS[selWep].name}:${WEAPONS[selWep].desc(1)}`);
 msg.push(`難度 ${DIFFS[diffIdx].n}:${DIFFS[diffIdx].d}`);
 $('desc').innerHTML=msg.join('<br>');
}
buildMenu();
$('startBtn').onclick=e=>{e.target.blur();startGame()};
$('againBtn').onclick=e=>{e.target.blur();AU.sfx('ui');$('end').classList.remove('show');$('start').classList.add('show');$('speedBtn').style.display='none';state='menu';AU.mode='menu';buildMenu()};

function startGame(){
 if(!charOK(selChar)||!itemOK(selWep)){buildMenu();return}
 AU.sfx('ui');
 const c=CHARS[selChar],w={};WKEYS.forEach(k=>w[k]=0);w[selWep]=1;
 S={t:0,ch:c,D:DIFFS[diffIdx],player:{x:0,y:0,r:18,hp:c.hp,maxhp:c.hp,inv:0},w,
  cd:{seed:0,pop:1,berry:.5,bolt:1,cookie:.5,nova:1,honey:1,turret:2,fw:1},chiliT:0,fwA:0,gumAng:0,gums:[],
  enemies:[],gems:[],shots:[],ebul:[],pops:[],trail:[],fx:[],missiles:[],cookies:[],bolts:[],novas:[],puddles:[],turrets:[],drops:[],
  xp:0,lv:1,need:needFor(1),kills:0,spawnT:0,waves:{},bossDone:{},freeze:0,shield:0,slow:0,rage:0,rev:0,dropsGot:0,newAch:[],warn:null,rerolls:2,free:false,
  joy:{on:false,id:null,sx:0,sy:0,dx:0,dy:0},keys:{}};
 $('start').classList.remove('show');$('speedBtn').style.display='block';state='play';last=performance.now();AU.mode='game';
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
 if(k==='m')setMute(!AU.mute);
 if(k==='q')setSpeed(speedIdx-1);
 if(k==='e')setSpeed(speedIdx+1);
 if(state==='menu'){
  if(k==='enter')startGame();
  else if(k==='arrowleft'||k==='arrowright'){selChar=cyc(Object.keys(CHARS).filter(charOK),selChar,k==='arrowright'?1:-1);AU.sfx('ui');buildMenu()}
  else if(k==='arrowup'||k==='arrowdown'){selWep=cyc(START_WEAPONS.filter(itemOK),selWep,k==='arrowdown'?1:-1);AU.sfx('ui');buildMenu()}
  else if(k==='d'){AU.sfx('ui');setDiff(diffIdx+1)}
  else if(k==='t')$('achBtn').click();
 }else if(state==='ach'){
  if(k==='escape'||k==='enter'||k==='t')$('achBack').click();
 }else if(state==='pause'){
  const i=parseInt(k);if(i>=1&&i<=3){const c=$('cards').children[i-1];if(c)c.click()}
  else if(k==='r')$('rerollBtn').click();
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
 const T=MOBS[type],hp=T.hp*(1+S.t/BAL.hpGrow)*S.D.hp;
 S.enemies.push({...T,type,x,y,hp,mhp:hp,kx:0,ky:0,hit:0,gh:0,fz:0,st:'walk',cdT:rnd(1,3)});
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
 const B=BOSSES[kind],p=S.player,a=rnd(0,6.283),d=Math.hypot(W,H)/2+80,hp=B.hp*S.D.hp;
 S.enemies.push({type:'boss',boss:true,kind,x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,hp,mhp:hp,sp:B.sp,r:B.r,e:B.e,dm:B.dm,kx:0,ky:0,hit:0,gh:0,fz:0,tm:0,st:'walk',cdT:3,sh:2,sm:6,sa:0});
 S.warn={txt:'⚠️ '+B.name+' 來襲!',t:3.5};AU.sfx('boss');
}
function heal(n,quiet){const p=S.player,h=Math.min(p.maxhp,p.hp+n)-p.hp;p.hp+=h;if(h>0&&!quiet)S.fx.push({x:p.x,y:p.y-30,t:.7,txt:'+'+Math.round(h),c:'#2ecc71'})}
function hurt(n){
 const p=S.player,w=S.w;
 if(p.inv>0||S.shield>0||state!=='play')return;
 const dm=Math.max(1,Math.round(n*(1+S.t/BAL.dmgGrow)*S.D.dm*(1-.12*w.helmet)));
 p.hp-=dm;p.inv=BAL.invBase*S.ch.inv+.15*w.boots;
 S.fx.push({x:p.x,y:p.y-30,t:.7,txt:'-'+dm,c:'#ff3b30'});AU.sfx('hurt');
 if(w.cape){for(const e of S.enemies){if(e.dead)continue;const d=Math.hypot(e.x-p.x,e.y-p.y);
  if(d<90+e.r){dmg(e,6*w.cape);if(!e.boss){e.kx=(e.x-p.x)/(d||1)*320;e.ky=(e.y-p.y)/(d||1)*320}}}}
 if(p.hp<=0){
  if(S.rev>0){S.rev--;p.hp=p.maxhp*.5;S.shield=3;S.fx.push({x:p.x,y:p.y-34,t:1,txt:'📿'});AU.sfx('chest')}
  else{p.hp=0;finish(false)}
 }
}
function dmg(e,n){
 if(e.dead)return;
 const w=S.w;let m=(1+.2*w.power)*S.ch.dm,c=false;
 if(S.rage>0)m*=1.8;
 if(Math.random()<S.ch.crit+.08*w.clover+.05*w.ring){m*=2+.25*w.ring;c=true}
 e.hp-=n*m;e.hit=.1;AU.sfx('hit');if(c)S.fx.push({x:e.x,y:e.y-e.r,t:.4,txt:'💢'});
 if(e.hp<=0)die(e);
}
function die(e){
 e.dead=true;S.kills++;AU.sfx('kill');
 if(S.kills===1)ach('first');if(S.kills===100)ach('kill100');if(S.kills===500)ach('kill500');
 if(S.w.scarf)heal(.2*S.w.scarf,true);
 const k=e.boss?15:(e.gems||1),p=S.player;
 for(let i=0;i<k;i++)S.gems.push({x:e.x+(k>1?rnd(-25,25):0),y:e.y+(k>1?rnd(-25,25):0),v:1,fly:false,s:4});
 S.fx.push({x:e.x,y:e.y,t:.4,txt:'✨'});
 if(e.split){mk('ice',e.x-14,e.y);mk('ice',e.x+14,e.y)}
 if(e.bomb){S.fx.push({x:e.x,y:e.y,t:.6,txt:'💥'});AU.sfx('boom');if(Math.hypot(e.x-p.x,e.y-p.y)<70)hurt(e.dm)}
 if(e.boss){S.drops.push({x:e.x,y:e.y,k:'chest',ic:'🎁',life:90,big:true});
  if(e.kind==='donutb')ach('boss1');
  if(e.kind==='queen')ach('boss2');
  if(e.kind==='sundae'){ach('boss3');return finish(true)}
  S.warn={txt:'🎉 擊敗 '+BOSSES[e.kind].name+'!拾取寶箱 🎁',t:3}}
 else if(e.type==='lucky'){ach('lucky');rollDrop(e.x,e.y)}
 else if(Math.random()<BAL.dropRate*(1+.2*S.w.clover))rollDrop(e.x,e.y);
}
function rollDrop(x,y){let r=Math.random()*DROP_TOTAL;for(const d of DROPS){r-=d[2];if(r<=0){S.drops.push({x,y,k:d[0],ic:d[1],life:15});return}}}
function applyDrop(k){
 const p=S.player;
 if(k==='chest'){AU.sfx('chest');levelUp(true);return}
 AU.sfx('drop');S.dropsGot++;if(S.dropsGot>=20)ach('drops20');
 if(k==='heart')heal(20);
 else if(k==='chicken')heal(40);
 else if(k==='magnet')S.gems.forEach(g=>g.fly=true);
 else if(k==='bomb'){visible().forEach(e=>dmg(e,10));S.fx.push({x:p.x,y:p.y,t:.5,txt:'💥'});AU.sfx('boom')}
 else if(k==='freeze')S.freeze=3;
 else if(k==='shield')S.shield=6;
 else if(k==='star')S.xp+=S.need*.5;
 else if(k==='slow')S.slow=6;
 else if(k==='rage')S.rage=8;
}
function finish(win){
 if(state==='end')return;state='end';
 SAVE.tot.kills+=S.kills;SAVE.tot.games++;
 if(win){SAVE.tot.wins++;ach('win');if(speedIdx===5)ach('speed3')}
 if(SAVE.tot.kills>=2000)ach('total2000');
 persist();AU.mode='menu';AU.sfx(win?'win':'lose');
 $('endT').textContent=win?'🎉 通關成功!':'💥 倉鼠球破裂了…';
 $('endS').textContent=`${S.ch.name}|${S.D.n}|存活 ${Math.floor(S.t)} 秒|擊殺 ${S.kills}|等級 ${S.lv}`;
 $('endA').innerHTML=S.newAch.length?'🏆 本局新成就<br>'+S.newAch.map(a=>`${a.ic} ${a.name}`).join('<br>'):'';
 $('end').classList.add('show');
}

/* ===== 升級 / 寶箱(三張卡盡量涵蓋 武器/被動/裝備,可重抽)===== */
function rollChoices(free){
 const keys=WKEYS.filter(k=>S.w[k]<(WEAPONS[k].max||5)&&itemOK(k)).sort(()=>Math.random()-.5);
 const types=free?['equip','weapon','passive']:['weapon','passive','equip'].sort(()=>Math.random()-.5);
 const pick=[];
 for(const t of types){const k=keys.find(x=>WEAPONS[x].type===t&&!pick.includes(x));if(k)pick.push(k)}
 for(const k of keys){if(pick.length>=3)break;if(!pick.includes(k))pick.push(k)}
 return pick.slice(0,3);
}
function renderCards(){
 const box=$('cards');box.innerHTML='';
 const addCard=(ic,title,desc,tag,cls,fn)=>{const d=document.createElement('div');d.className='card';
  const no=desk?`[${box.children.length+1}] `:'';
  d.innerHTML=`<span class='ic'>${ic}</span><div><b>${no}${title}</b><span class='tag ${cls}'>${tag}</span><br>${desc}</div>`;
  d.onclick=()=>{AU.sfx('ui');$('lvl').classList.remove('show');fn();state='play';last=performance.now();if(S.xp>=S.need)levelUp()};box.appendChild(d)};
 rollChoices(S.free).forEach(k=>{const w=WEAPONS[k],l=S.w[k]+1,isNew=l===1,tg=TAG[w.type];
  addCard(w.ic,`${w.name} Lv.${l}`,w.desc(l),isNew?'NEW':tg[0],isNew?'':tg[1],()=>{
   S.w[k]=l;
   if(k==='heart'){S.player.maxhp+=15;heal(15)}
   if(k==='amulet')S.rev++;
   checkBuild();
  })});
 while(box.children.length<3)addCard('🍗','烤雞腿','回復 40 HP','補給','pas',()=>heal(40));
 const rb=$('rerollBtn');rb.style.display=S.rerolls>0?'block':'none';
 rb.textContent=`🎲 重抽 (剩 ${S.rerolls} 次${desk?',按 R':''})`;
}
function levelUp(free){
 state='pause';if(!free)AU.sfx('level');
 S.free=!!free;
 if(!free){
  S.lv++;S.xp-=S.need;S.need=needFor(S.lv);heal(BAL.levelHeal);
  if(S.lv%5===0)S.rerolls++;
  if(S.lv===10)ach('lv10');if(S.lv===20)ach('lv20');
 }
 $('lvlT').textContent=free?'🎁 寶箱!免費獲得一個天賦':'🌻 升級!選一個天賦';
 renderCards();$('lvl').classList.add('show');
}
$('rerollBtn').onclick=e=>{e.target.blur();if(state==='pause'&&S.rerolls>0){S.rerolls--;AU.sfx('ui');renderCards()}};

/* ===== 衝刺 / Boss AI ===== */
function dashAI(e,dt,ux,uy,v,iv,spd,wt,dur){
 if(e.st==='walk'){e.cdT-=dt;if(e.cdT<=0){e.st='wind';e.wT=wt}}
 else if(e.st==='wind'){v=0;e.wT-=dt;if(e.wT<=0){e.st='dash';e.dT=dur;e.lx=ux;e.ly=uy}}
 else{v=spd;ux=e.lx;uy=e.ly;e.dT-=dt;if(e.dT<=0){e.st='walk';e.cdT=iv}}
 return[v,ux,uy];
}
function bossAI(e,dt,ux,uy,v){
 const dash=(iv,spd)=>{[v,ux,uy]=dashAI(e,dt,ux,uy,v,iv,spd,.6,.8)};
 const ring=(n,sp,off)=>{if(S.ebul.length>300)return;for(let i=0;i<n;i++){const a=(off||0)+i*6.283/n;S.ebul.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:6,r:8,d:7})}};
 const summon=(t,n)=>{for(let i=0;i<n;i++){const a=i*6.283/n;mk(t,e.x+Math.cos(a)*(e.r+30),e.y+Math.sin(a)*(e.r+30))}};
 if(e.kind==='donutb')dash(3.5,430);
 else if(e.kind==='queen'){
  e.sh-=dt;if(e.sh<=0){e.sh=3;ring(10,140,e.tm)}
  e.sm-=dt;if(e.sm<=0){e.sm=8;summon('pudding',4)}
 }else{
  const r=e.hp/e.mhp;
  if(r>.6){e.sh-=dt;if(e.sh<=0){e.sh=2.5;ring(12,130)}}
  else if(r>.3){
   e.sh-=dt;if(e.sh<=0){e.sh=.25;e.sa+=.55;S.ebul.push({x:e.x,y:e.y,vx:Math.cos(e.sa)*150,vy:Math.sin(e.sa)*150,life:6,r:8,d:7})}
   e.sm-=dt;if(e.sm<=0){e.sm=7;summon('donut',3)}
  }else{e.sh-=dt;if(e.sh<=0){e.sh=2;ring(16,150,e.tm)}dash(4,380)}
 }
 e.tm+=dt;
 return[v,ux,uy];
}

/* ===== 更新 ===== */
function update(dt){
 const p=S.player,w=S.w,cdm=S.ch.cdm*(S.rage>0?.6:1)*(1-.08*w.watch),ar=1+.1*w.lens;
 S.t+=dt;p.inv=Math.max(0,p.inv-dt);
 S.freeze=Math.max(0,S.freeze-dt);S.shield=Math.max(0,S.shield-dt);S.slow=Math.max(0,S.slow-dt);S.rage=Math.max(0,S.rage-dt);
 if(S.warn){S.warn.t-=dt;if(S.warn.t<=0)S.warn=null}
 AU.mode=S.enemies.some(e=>e.boss)?'boss':'game';

 let mx=S.joy.dx,my=S.joy.dy;const k=S.keys;
 if(k.a||k.arrowleft)mx-=1;if(k.d||k.arrowright)mx+=1;if(k.w||k.arrowup)my-=1;if(k.s||k.arrowdown)my+=1;
 const ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml}
 const spd=160*S.ch.spd*(1+.15*w.cheese+.05*w.boots);p.x+=mx*spd*dt;p.y+=my*spd*dt;
 if(w.cheese>=5&&ml>.1){const t=S.trail[S.trail.length-1];if(!t||Math.hypot(t.x-p.x,t.y-p.y)>20)S.trail.push({x:p.x,y:p.y,t:2.5})}
 S.trail.forEach(t=>t.t-=dt);S.trail=S.trail.filter(t=>t.t>0);

 const rg=S.ch.regen+.4*w.milk;
 if(rg>0&&p.hp<p.maxhp)p.hp=Math.min(p.maxhp,p.hp+rg*dt);

 /* 時間軸 */
 S.spawnT-=dt;
 const rate=Math.max(BAL.spawnMin,BAL.spawnStart-S.t/BAL.spawnDecay)*S.D.sp;
 if(S.spawnT<=0){S.spawnT=rate;
  spawnEnemy(pickType());
  if(S.t>90&&Math.random()<.4)spawnEnemy('pudding')}
 [[30,6],[45,8],[80,10],[100,14],[130,18],[155,22]].forEach(([t,n])=>{if(S.t>=t&&!S.waves[t]){S.waves[t]=1;const a=rnd(0,6.283);
  for(let i=0;i<n;i++)spawnEnemy('donut',a+rnd(-.4,.4),Math.hypot(W,H)/2+40+rnd(0,60))}});
 BOSS_TIMELINE.forEach(([t,kind])=>{if(S.t>=t&&!S.bossDone[kind]){S.bossDone[kind]=1;mkBoss(kind)}});
 if(S.t>=GAME_TIME)return finish(true);

 /* 葵花子 */
 S.cd.seed-=dt;if(S.cd.seed<=0&&w.seed){S.cd.seed=1.2*cdm;const t=nearest(p.x,p.y);
  if(t){const n=w.seed,base=Math.atan2(t.y-p.y,t.x-p.x);AU.sfx('shoot');
   for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*.2;S.shots.push({x:p.x,y:p.y,vx:Math.cos(a)*320,vy:Math.sin(a)*320,pierce:w.seed+1,life:2,hitSet:new Set(),rot:0,dm:3})}}}

 /* 彩虹煙火 */
 S.cd.fw-=dt;if(S.cd.fw<=0&&w.fw){S.cd.fw=1.6*cdm;const n=[4,6,8,10,12][w.fw-1];S.fwA+=.4;AU.sfx('shoot');
  for(let i=0;i<n;i++){const a=S.fwA+i*6.283/n;S.shots.push({x:p.x,y:p.y,vx:Math.cos(a)*260,vy:Math.sin(a)*260,pierce:2,life:1.2,hitSet:new Set(),rot:0,dm:2,ic:'🌈'})}}

 S.shots.forEach(s=>{s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;s.rot+=dt*12;
  for(const e of S.enemies){if(s.pierce<=0)break;if(e.dead||s.hitSet.has(e))continue;
   if(Math.hypot(e.x-s.x,e.y-s.y)<e.r+7){s.hitSet.add(e);s.pierce--;dmg(e,s.dm)}}});
 S.shots=S.shots.filter(s=>s.life>0&&s.pierce>0);

 /* 辣椒光環 */
 S.chiliT-=dt;if(w.chili&&S.chiliT<=0){S.chiliT=.5;const R=(60+w.chili*12)*ar;
  for(const e of S.enemies)if(!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<R+e.r)dmg(e,1+w.chili*.6)}

 /* 泡泡糖 */
 if(w.gum){S.gumAng+=dt*(2+w.gum*.5);const n=[2,3,4,5,6][w.gum-1];S.gums=[];
  for(let i=0;i<n;i++){const a=S.gumAng+i*6.283/n;S.gums.push({x:p.x+Math.cos(a)*65*ar,y:p.y+Math.sin(a)*65*ar,r:12})}
  for(const g of S.gums)for(const e of S.enemies){if(e.dead)continue;const dx=e.x-g.x,dy=e.y-g.y,d=Math.hypot(dx,dy)||1;
   if(d<e.r+g.r&&e.gh<=0){e.gh=.4;dmg(e,2);if(!e.boss){e.kx=dx/d*260;e.ky=dy/d*260}}}
 }else S.gums=[];

 /* 爆米花 */
 S.cd.pop-=dt;if(S.cd.pop<=0&&w.pop){S.cd.pop=3*cdm;const vis=visible();
  for(let i=0;i<w.pop&&vis.length;i++){const e=vis[Math.floor(Math.random()*vis.length)];S.pops.push({x:e.x,y:e.y,t:.6,R:(50+w.pop*15)*ar,boom:false})}}
 S.pops.forEach(o=>{o.t-=dt;if(o.t<=0&&!o.boom){o.boom=true;o.t=.35;AU.sfx('boom');
  for(const e of S.enemies)if(!e.dead&&Math.hypot(e.x-o.x,e.y-o.y)<o.R+e.r)dmg(e,6)}});
 S.pops=S.pops.filter(o=>o.t>0||!o.boom);

 /* 草莓追蹤彈 */
 S.cd.berry-=dt;if(S.cd.berry<=0&&w.berry){S.cd.berry=2*cdm;AU.sfx('shoot');
  for(let i=0;i<w.berry;i++){const a=rnd(0,6.283);S.missiles.push({x:p.x,y:p.y,vx:Math.cos(a)*200,vy:Math.sin(a)*200,life:3.5,delay:i*.15})}}
 S.missiles.forEach(m=>{if(m.delay>0){m.delay-=dt;m.x=p.x;m.y=p.y;return}
  m.life-=dt;const t=nearest(m.x,m.y);
  if(t){const a=Math.atan2(t.y-m.y,t.x-m.x),cur=Math.atan2(m.vy,m.vx);let df=a-cur;while(df>Math.PI)df-=6.283;while(df<-Math.PI)df+=6.283;
   const na=cur+Math.max(-5*dt,Math.min(5*dt,df));m.vx=Math.cos(na)*240;m.vy=Math.sin(na)*240}
  m.x+=m.vx*dt;m.y+=m.vy*dt;
  for(const e of S.enemies){if(e.dead)continue;if(Math.hypot(e.x-m.x,e.y-m.y)<e.r+8){
    const R=(20+w.berry*8)*ar;for(const q of S.enemies)if(!q.dead&&Math.hypot(q.x-m.x,q.y-m.y)<R+q.r)dmg(q,q===e?4:2);
    S.fx.push({x:m.x,y:m.y,t:.3,txt:'💥'});AU.sfx('boom');m.life=0;break}}});
 S.missiles=S.missiles.filter(m=>m.life>0);

 /* 棒棒糖閃電 */
 S.cd.bolt-=dt;if(S.cd.bolt<=0&&w.bolt){S.cd.bolt=(2.6-w.bolt*.25)*cdm;
  const vis=visible().sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).slice(0,w.bolt+1);
  if(vis.length)AU.sfx('zap');
  vis.forEach(t=>{const pts=[{x:p.x,y:p.y},{x:t.x,y:t.y}];dmg(t,5);
   const nx=S.enemies.filter(e=>!e.dead&&e!==t&&Math.hypot(e.x-t.x,e.y-t.y)<110).sort((a,b)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y))[0];
   if(nx){dmg(nx,3);pts.push({x:nx.x,y:nx.y})}
   S.bolts.push({pts,t:.2})})}
 S.bolts.forEach(b=>b.t-=dt);S.bolts=S.bolts.filter(b=>b.t>0);

 /* 迴力餅乾 */
 S.cd.cookie-=dt;if(S.cd.cookie<=0&&w.cookie){S.cd.cookie=2.2*cdm;AU.sfx('shoot');
  const t=nearest(p.x,p.y),base=t?Math.atan2(t.y-p.y,t.x-p.x):rnd(0,6.283);
  for(let i=0;i<w.cookie;i++){const a=base+(i-(w.cookie-1)/2)*.5;
   S.cookies.push({x:p.x,y:p.y,a,out:true,dist:0,max:150+w.cookie*30,rot:0,hitT:new Map()})}}
 S.cookies.forEach(c=>{c.rot+=dt*10;const sp=300;
  if(c.out){c.x+=Math.cos(c.a)*sp*dt;c.y+=Math.sin(c.a)*sp*dt;c.dist+=sp*dt;if(c.dist>=c.max)c.out=false}
  else{const dx=p.x-c.x,dy=p.y-c.y,d=Math.hypot(dx,dy)||1;c.x+=dx/d*sp*1.2*dt;c.y+=dy/d*sp*1.2*dt;if(d<20)c.done=true}
  for(const e of S.enemies){if(e.dead)continue;if((c.hitT.get(e)||0)>S.t)continue;
   if(Math.hypot(e.x-c.x,e.y-c.y)<e.r+10){c.hitT.set(e,S.t+.35);dmg(e,3)}}});
 S.cookies=S.cookies.filter(c=>!c.done);

 /* 冰淇淋新星 */
 S.cd.nova-=dt;if(S.cd.nova<=0&&w.nova){S.cd.nova=(4.4-w.nova*.4)*cdm;const R=(90+w.nova*25)*ar;AU.sfx('nova');
  for(const e of S.enemies)if(!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<R+e.r){dmg(e,3);e.fz=2}
  S.novas.push({x:p.x,y:p.y,t:.5,R})}
 S.novas.forEach(n=>n.t-=dt);S.novas=S.novas.filter(n=>n.t>0);

 /* 蜂蜜陷阱 */
 S.cd.honey-=dt;if(S.cd.honey<=0&&w.honey){S.cd.honey=3*cdm;S.puddles.push({x:p.x,y:p.y,r:(40+w.honey*8)*ar,t:4+w.honey,tk:0})}
 S.puddles.forEach(q=>{q.t-=dt;q.tk-=dt;if(q.tk<=0){q.tk=.5;for(const e of S.enemies)if(!e.dead&&Math.hypot(e.x-q.x,e.y-q.y)<q.r+e.r)dmg(e,1)}});
 S.puddles=S.puddles.filter(q=>q.t>0);

 /* 杯子蛋糕砲台 */
 S.cd.turret-=dt;if(S.cd.turret<=0&&w.turret){S.cd.turret=8*cdm;const n=1+(w.turret>=3)+(w.turret>=5);
  for(let i=0;i<n;i++)S.turrets.push({x:p.x+rnd(-60,60),y:p.y+rnd(-60,60),t:6+w.turret,cd:0})}
 S.turrets.forEach(t=>{t.t-=dt;t.cd-=dt;if(t.cd<=0){const e=nearest(t.x,t.y);
  if(e&&Math.hypot(e.x-t.x,e.y-t.y)<240){t.cd=.6;const a=Math.atan2(e.y-t.y,e.x-t.x);AU.sfx('shoot');
   S.shots.push({x:t.x,y:t.y,vx:Math.cos(a)*340,vy:Math.sin(a)*340,pierce:1,life:1,hitSet:new Set(),rot:0,dm:2})}}});
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
  if(S.slow>0)sl*=.5;
  let v=e.sp*sl,ux=dx/d,uy=dy/d;
  if(e.rng){if(d<200)v=0;e.shootT=(e.shootT??rnd(1,4))-dt;
   if(e.shootT<=0){e.shootT=4;S.ebul.push({x:e.x,y:e.y,vx:ux*160,vy:uy*160,life:5,r:6,d:e.bd})}}
  if(e.mage){
   if(d<240)v=0;
   if(d<150){ux=-ux;uy=-uy;v=e.sp*sl*.8}
   e.shootT=(e.shootT??rnd(1,3.5))-dt;
   if(e.shootT<=0){e.shootT=3.5;const b=Math.atan2(dy,dx);
    for(const o of[-.28,0,.28])S.ebul.push({x:e.x,y:e.y,vx:Math.cos(b+o)*150,vy:Math.sin(b+o)*150,life:5,r:6,d:e.bd})}}
  if(e.dash){[v,ux,uy]=dashAI(e,dt,ux,uy,v,3,300,.5,.5)}
  if(e.flee){ux=-ux;uy=-uy;e.life-=dt;if(e.life<=0)e.gone=true}
  if(e.boss){[v,ux,uy]=bossAI(e,dt,ux,uy,v)}
  e.x+=ux*v*dt+e.kx*dt;e.y+=uy*v*dt+e.ky*dt;e.kx*=.9;e.ky*=.9;
  if(!e.flee&&d<e.r+p.r){if(e.bomb)die(e);else hurt(e.dm)}
 }
 for(let i=0;i<S.enemies.length;i++){const a=S.enemies[i];for(let j=i+1;j<Math.min(i+8,S.enemies.length);j++){const b=S.enemies[j];
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),m=a.r+b.r;if(d>0&&d<m){const f=(m-d)/2/d;
   if(!a.boss){a.x-=dx*f;a.y-=dy*f}if(!b.boss){b.x+=dx*f;b.y+=dy*f}}}}
 S.enemies=S.enemies.filter(e=>!e.dead&&!e.gone&&(e.boss||Math.hypot(e.x-p.x,e.y-p.y)<1200));
 S.ebul.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-p.x,b.y-p.y)<b.r+p.r){b.life=0;hurt(b.d||5)}});
 S.ebul=S.ebul.filter(b=>b.life>0);

 /* 掉落物 */
 for(const o of S.drops){o.life-=dt;if(Math.hypot(o.x-p.x,o.y-p.y)<p.r+(o.big?26:18)){o.got=true;applyDrop(o.k)}}
 S.drops=S.drops.filter(o=>!o.got&&o.life>0);

 /* 經驗磁鐵 */
 const mag=80+40*w.magnet+S.ch.mag,xpm=S.ch.xp*(1+.15*w.glasses);
 for(const g of S.gems){const dx=p.x-g.x,dy=p.y-g.y,d=Math.hypot(dx,dy);
  if(d<mag)g.fly=true;
  if(g.fly){g.s+=dt*16;const k2=Math.min(1,g.s*dt);g.x+=dx*k2;g.y+=dy*k2}
  if(d<p.r+6){g.got=true;S.xp+=g.v*xpm;AU.sfx('gem')}}
 S.gems=S.gems.filter(g=>!g.got);
 if(state==='play'&&S.xp>=S.need)levelUp();
 S.fx.forEach(f=>{f.t-=dt;f.y-=20*dt});S.fx=S.fx.filter(f=>f.t>0);
}

/* ===== 繪製 ===== */
function emoji(t,x,y,s){ctx.font=s+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x,y)}
function draw(){
 const p=S.player,ox=W/2-p.x,oy=(desk?H*.5:H*.4)-p.y;
 ctx.fillStyle='#cdeebf';ctx.fillRect(0,0,W,H);
 const g=120,x0=Math.floor(-ox/g),y0=Math.floor(-oy/g);ctx.fillStyle='#c3e8b4';
 for(let ix=x0;ix*g+ox<W;ix++)for(let iy=y0;iy*g+oy<H;iy++)if(((ix+iy)&1)===0)ctx.fillRect(ix*g+ox,iy*g+oy,g,g);
 ctx.save();ctx.translate(ox,oy);
 if(S.w.chili){const R=(60+S.w.chili*12)*(1+.1*S.w.lens);ctx.fillStyle='rgba(255,90,40,.16)';ctx.strokeStyle='rgba(255,90,40,.55)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,R,0,6.283);ctx.fill();ctx.stroke()}
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
 for(const s of S.shots){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rot);emoji(s.ic||'🌻',0,0,16);ctx.restore()}
 for(const m of S.missiles){if(m.delay>0)continue;ctx.save();ctx.translate(m.x,m.y);ctx.rotate(Math.atan2(m.vy,m.vx));emoji('🍓',0,0,20);ctx.restore()}
 for(const c of S.cookies){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.rot);emoji('🍪',0,0,24);ctx.restore()}
 for(const b of S.bolts){ctx.strokeStyle='#fff35e';ctx.lineWidth=4;ctx.shadowColor='#ffb300';ctx.shadowBlur=10;ctx.beginPath();
  b.pts.forEach((q,i)=>{if(i===0)ctx.moveTo(q.x,q.y);else{const a=b.pts[i-1],mx=(a.x+q.x)/2+rnd(-12,12),my=(a.y+q.y)/2+rnd(-12,12);ctx.lineTo(mx,my);ctx.lineTo(q.x,q.y)}});
  ctx.stroke();ctx.shadowBlur=0}
 if(S.ch.aura){ctx.strokeStyle='rgba(120,200,255,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,110,0,6.283);ctx.stroke()}
 if(S.rage>0){ctx.strokeStyle='rgba(255,60,60,.7)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.r+16,0,6.283);ctx.stroke()}
 ctx.globalAlpha=p.inv>0&&Math.floor(S.t*12)%2?.4:1;
 ctx.fillStyle='rgba(200,235,255,.45)';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.r+4,0,6.283);ctx.fill();ctx.stroke();
 emoji(S.ch.ic,p.x,p.y,p.r*1.5);ctx.globalAlpha=1;
 if(S.shield>0){ctx.strokeStyle='rgba(255,215,0,.8)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,p.r+12,0,6.283);ctx.stroke()}
 for(const gm of S.gums){ctx.fillStyle='rgba(255,150,200,.8)';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(gm.x,gm.y,gm.r,0,6.283);ctx.fill();ctx.stroke()}
 for(const f of S.fx){if(f.c){ctx.globalAlpha=Math.min(1,f.t*2);ctx.fillStyle=f.c;ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText(f.txt,f.x,f.y);ctx.globalAlpha=1}else emoji(f.txt,f.x,f.y,22)}
 ctx.restore();
 if(S.freeze>0){ctx.fillStyle='rgba(150,220,255,.2)';ctx.fillRect(0,0,W,H)}
 if(S.slow>0){ctx.fillStyle='rgba(180,140,255,.12)';ctx.fillRect(0,0,W,H)}

 if(!desk){
  ctx.fillStyle='rgba(255,182,209,.18)';ctx.fillRect(0,H*.8,W,H*.2);
  if(!S.joy.on){ctx.fillStyle='#fff9';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('👇 在此按住拖曳移動',W/2,H*.9)}
  else{const j=S.joy;ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(j.sx,j.sy,50,0,6.283);ctx.fill();emoji('🐾',j.sx+j.dx*50,j.sy+j.dy*50,44)}
 }else{
  ctx.fillStyle='#8a4b6a99';ctx.font='13px sans-serif';ctx.textAlign='center';
  ctx.fillText('WASD 移動  |  Q/E 調整速度  |  P 暫停  |  M 靜音  |  F 全螢幕',W/2,H-10);
 }

 /* HUD:經驗條 + 血條 */
 ctx.fillStyle='#fff8';ctx.fillRect(0,0,W,16);ctx.fillStyle='#ff7eb0';ctx.fillRect(0,0,W*Math.min(1,S.xp/S.need),16);
 ctx.fillStyle='#8a4b6a';ctx.font='bold 12px sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('Lv.'+S.lv,6,9);
 const bw=Math.min(190,W*.45),hr=Math.max(0,p.hp/p.maxhp);
 ctx.fillStyle='#0005';ctx.fillRect(8,22,bw,18);
 ctx.fillStyle=hr>.5?'#4cd964':hr>.25?'#ffcc00':'#ff3b30';ctx.fillRect(8,22,bw*hr,18);
 ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(8,22,bw,18);
 ctx.font='bold 12px sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#0008';ctx.strokeText(`❤️ ${Math.ceil(p.hp)} / ${p.maxhp}`,14,32);ctx.fillStyle='#fff';ctx.fillText(`❤️ ${Math.ceil(p.hp)} / ${p.maxhp}`,14,32);
 let buf='';if(S.rev>0)buf+=`📿x${S.rev} `;if(S.shield>0)buf+=`🛡️${Math.ceil(S.shield)} `;if(S.rage>0)buf+=`⚡${Math.ceil(S.rage)} `;if(S.slow>0)buf+=`⏳${Math.ceil(S.slow)} `;if(S.freeze>0)buf+=`❄️${Math.ceil(S.freeze)} `;
 if(buf){ctx.font='13px sans-serif';ctx.fillStyle='#8a4b6a';ctx.textAlign='left';ctx.fillText(buf,8,52)}
 const rem=Math.max(0,Math.ceil(GAME_TIME-S.t)),m=Math.floor(rem/60),s=String(rem%60).padStart(2,'0');
 ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillStyle='#8a4b6a';ctx.fillText(`${m}:${s}`,W/2,70);
 ctx.font='13px sans-serif';ctx.textAlign='right';ctx.fillText(`怪 ${S.enemies.length}/${MAX_ENEMY}  擊殺 ${S.kills}`,W-8,30);
 const bo=S.enemies.find(e=>e.boss);
 if(bo){const bw2=Math.min(W*.8,600),bx=(W-bw2)/2;ctx.fillStyle='#0004';ctx.fillRect(bx,86,bw2,12);ctx.fillStyle='#e0306a';ctx.fillRect(bx,86,bw2*Math.max(0,bo.hp/bo.mhp),12);
  ctx.fillStyle='#8a4b6a';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(BOSSES[bo.kind].name,W/2,110)}
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
 if(S&&state!=='menu'&&state!=='ach')draw();
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
