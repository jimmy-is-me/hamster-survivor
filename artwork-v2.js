'use strict';
// Every gameplay item has its own illustrated cell; no generic icon fallback.
const ART_V2_SHEETS=[['weaponIcons','weapons-v2.png'],['equipmentIcons','equipment-v2.png'],['supplyIcons','supplies-v2.png'],['uiIcons','interface-v2.png'],['friendMotion','friends-motion-v2.png'],['costumeMotion','costumes-motion-v2.png']];
for(const [key,file] of ART_V2_SHEETS){const img=new Image();TATA_ART[key]={img,cols:4,rows:4};img.src='assets/'+file;img.addEventListener('load',()=>{refreshTataLoading();if(state==='menu')buildMenu();});img.addEventListener('error',()=>{$('startBtn').textContent='新插圖尚未載入，請重新整理';});}
const weaponArt={seed:0,gum:1,pop:2,fw:3,chili:4,berry:5,bolt:6,cookie:7,nova:8,honey:9,turret:10,torn:11,blade:12,met:13};
const equipmentArt={cheese:0,magnet:1,heart:2,power:3,clover:4,milk:5,lens:6,watch:7,helmet:8,ring:9,boots:10,cape:11,glasses:12,scarf:13,amulet:14,scope:15};
const supplyArt={gloves:0,badge:1,crown:2};
for(const [key,cell] of Object.entries(weaponArt))itemCells[key]=100+cell;
for(const [key,cell] of Object.entries(equipmentArt))itemCells[key]=116+cell;
for(const [key,cell] of Object.entries(supplyArt))itemCells[key]=132+cell;
const iconReference=index=>index<116?['weaponIcons',index-100]:index<132?['equipmentIcons',index-116]:index<148?['supplyIcons',index-132]:['uiIcons',index-148];
const spriteBeforeV2=tataSprite,iconBeforeV2=tataIcon;
tataSprite=function(key,index,x,y,size){if(key==='items'&&index>=100)[key,index]=iconReference(index);const a=TATA_ART[key],cell=window.TATA_ATLAS_V2?.[key]?.cells[index];if(!cell){spriteBeforeV2(key,index,x,y,size);return;}if(!a.img.complete||!a.img.naturalWidth)return;const [sx,sy,w,h]=cell.rect,scale=size/Math.max(w,h);ctx.drawImage(a.img,sx,sy,w,h,x-w*scale/2,y-h*scale/2,w*scale,h*scale);};
tataIcon=function(key,index){if(key==='items'&&index>=100)[key,index]=iconReference(index);const a=TATA_ART[key],atlas=window.TATA_ATLAS_V2?.[key],cell=atlas?.cells[index];if(!cell)return iconBeforeV2(key,index);return '<span class="tata-icon" aria-hidden="true" data-illustration="'+key+':'+index+'"><svg viewBox="'+cell.rect.join(' ')+'" preserveAspectRatio="xMidYMid meet"><image href="'+a.img.src+'" width="'+atlas.width+'" height="'+atlas.height+'"/></svg></span>';};
function drawItem(key,x,y,size){const ref=itemCells[key];if(ref===undefined)throw new Error('Missing item illustration: '+key);tataSprite('items',ref,x,y,size);}
const dropArt={heart:6,chicken:7,magnet:8,bomb:9,freeze:10,shield:11,star:12,slow:13,rage:14,chest:15};
function drawDrop(key,x,y,size){tataSprite('supplyIcons',dropArt[key],x,y,size);}
const effectArt={'🌻':['weaponIcons',0],'🌈':['weaponIcons',3],'🌽':['weaponIcons',2],'🍿':['weaponIcons',15],'🍯':['weaponIcons',9],'🧀':['equipmentIcons',0],'🧁':['weaponIcons',10],'🍓':['weaponIcons',5],'🍪':['weaponIcons',7],'🍬':['weaponIcons',6],'❄️':['supplyIcons',10],'⭐':['supplyIcons',12],'🌪️':['weaponIcons',11],'☄️':['weaponIcons',13],'🍴':['weaponIcons',12],'💥':['weaponIcons',15],'✨':['weaponIcons',15],'🍗':['supplyIcons',7],'🎁':['supplyIcons',15],'⚡':['supplyIcons',14],'📿':['equipmentIcons',14],'🐾':['uiIcons',12],'❗':['uiIcons',13],'💖':['supplyIcons',6],'🧲':['supplyIcons',8],'🛡️':['supplyIcons',11],'⏳':['supplyIcons',13]};
emoji=function(token,x,y,size){const ref=effectArt[token];if(!ref)return;tataSprite(ref[0],ref[1],x,y,size*1.3);};
for(const [i,[key]] of tataCharacters.entries()){const c=CHARS[key];c.sheet=i<4?'friendMotion':'costumeMotion';c.motionRow=i%4;c.cell=c.motionRow*4;}
function heroFrame(){return pose.attack>0?3:pose.moving?(Math.floor(pose.walk/Math.PI)%2+1):0;}
// Draw complete frames. Never clip the abdomen, replace the feet, or crop attack props.
tataHero=function(p){const frame=heroFrame(),stride=pose.moving?Math.sin(pose.walk):0,attack=pose.attack/.34;ctx.save();ctx.translate(p.x+Math.sin(attack*Math.PI)*pose.face*3,p.y-8-Math.abs(stride)*2);ctx.rotate(stride*.025+(pose.hurt>0?Math.sin(pose.hurt*40)*.05:0));tataSprite(S.ch.sheet,S.ch.motionRow*4+frame,0,0,104);ctx.restore();};
training[0].art=itemCells.heart;training[1].art=itemCells.power;training[2].art=itemCells.cheese;
function uiIcon(index){return tataIcon('uiIcons',index);}
function decorateButton(id,index,text){const b=$(id);if(!b)return;b.innerHTML=uiIcon(index)+'<span>'+text+'</span>';}
function decorateMenu(){[...$('chars').children].forEach((el,i)=>{if(!charOK(Object.keys(CHARS)[i])){const badge=document.createElement('span');badge.className='locked-badge';badge.innerHTML=uiIcon(10);badge.title='尚未解鎖';el.appendChild(badge);}});[...$('diffs').children].forEach((el,i)=>{el.querySelector('.ic').innerHTML=tataIcon('supplyIcons',3+i);});[...$('weps').children].forEach((el,i)=>{el.dataset.itemKey=START_WEAPONS[i];el.querySelector('.ic').innerHTML=tataIcon('items',itemCells[START_WEAPONS[i]]);});decorateButton('growth-button',8,'養成小屋');decorateButton('achBtn',7,'成就卡冊');decorateButton('startBtn',3,TataAdventure.ready()?'一起出發！':'插圖載入中…');}
const menuV2=buildMenu;buildMenu=function(){menuV2();decorateMenu();};
const loadingV2=refreshTataLoading;refreshTataLoading=function(){loadingV2();decorateButton('startBtn',3,TataAdventure.ready()?'一起出發！':'插圖載入中…');};
const speedV2=setSpeed;setSpeed=function(i){speedV2(i);decorateButton('speedBtn',4,'x'+SPEEDS[speedIdx]);};
const muteV2=setMute;setMute=function(m){muteV2(m);decorateButton('muteBtn',m?1:0,m?'音效關':'音效開');};
const levelV2=levelUp;levelUp=function(free){levelV2(free);decorateButton('rerollBtn',6,'重抽 · 剩 '+S.rerolls+' 次');$('lvlT').innerHTML=uiIcon(free?8:7)+'<span>'+(free?'寶箱':'升級')+'：3 選 1</span>';};
const finishV2=finish;finish=function(win){const wasEnd=state==='end';finishV2(win);if(!wasEnd&&state==='end')$('endT').innerHTML=uiIcon(win?14:15)+'<span>'+plainText($('endT').textContent)+'</span>';};
const cardArtCells=Array.from({length:17},(_,i)=>116+i);
const cardsV2=showAch;showAch=function(){cardsV2();[...$('achList').children].forEach((el,i)=>{el.querySelector('.tata-icon').outerHTML=tataIcon('items',cardArtCells[i]);});};
const growthV2=showGrowth;showGrowth=function(){growthV2();growPanel.querySelector('h1').innerHTML=uiIcon(8)+'<span>塔塔的養成小屋</span>';};
$('growth-button').onclick=showGrowth;
// Diagnostics include the exact source rectangle used for each complete motion frame.
TataAdventure.artV2=()=>({items:WKEYS.map(k=>({key:k,cell:itemCells[k],reference:iconReference(itemCells[k])})),hero:S?{sheet:S.ch.sheet,row:S.ch.motionRow,frame:heroFrame(),clipped:false}:null,sheets:ART_V2_SHEETS.map(([key])=>({key,ready:TATA_ART[key].img.complete&&TATA_ART[key].img.naturalWidth>0}))});
buildMenu();setMute(AU.mute);setSpeed(speedIdx);refreshTataLoading();

const rerollV2=$('rerollBtn').onclick;$('rerollBtn').onclick=e=>{rerollV2(e);decorateButton('rerollBtn',6,'重抽 · 剩 '+S.rerolls+' 次');};
