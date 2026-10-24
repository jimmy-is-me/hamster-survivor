'use strict';
// TATA theme keeps the original survival mechanics and legacy save keys.
const TATA_ART={};
for(const [key,file,cols,rows] of [['friends','characters-v4.png',4,2],['monsters','monsters-v4.png',4,5],['bosses','bosses-v4.png',4,1],['items','items-v4.png',4,3],['costumes','costumes.png',2,2]]){const img=new Image();img.src='assets/'+file;TATA_ART[key]={img,cols,rows};}
function tataSprite(key,index,x,y,size){const a=TATA_ART[key];if(!a?.img.complete||!a.img.naturalWidth)return;let w=a.img.naturalWidth/a.cols,h=a.img.naturalHeight/a.rows,sx=index%a.cols*w,sy=Math.floor(index/a.cols)*h;if(key==='monsters'){const cuts=[0,.219,.422,.609,.789,1],row=Math.floor(index/4);sy=cuts[row]*a.img.naturalHeight;h=(cuts[row+1]-cuts[row])*a.img.naturalHeight;}if(key==='bosses'){const cuts=[0,.28,.49,.75,1];sx=cuts[index]*a.img.naturalWidth;w=(cuts[index+1]-cuts[index])*a.img.naturalWidth;}const scale=size/Math.max(w,h);ctx.drawImage(a.img,sx,sy,w,h,x-w*scale/2,y-h*scale/2,w*scale,h*scale);}
function tataIcon(key,index){const a=TATA_ART[key];return `<span class="tata-icon" style="background-image:url(${a.img.src});background-size:${a.cols*100}% ${a.rows*100}%;background-position:${index%a.cols/(a.cols-1)*100}% ${a.rows===1?0:Math.floor(index/a.cols)/(a.rows-1)*100}%"></span>`;}
const tataCharacters=[['hamster','塔塔醬','friends',0],['rabbit','比偷','friends',1],['cat','卡薰','friends',2],['unicorn','愛神丘比偷','friends',3],['bear','探險塔塔','costumes',0],['fox','星光魔法塔塔','costumes',1],['penguin','雨天塔塔','costumes',2],['frog','花園塔塔','costumes',3]];
for(const [key,name,sheet,cell] of tataCharacters)Object.assign(CHARS[key],{name,sheet,cell});
// The four original friends are available from the first journey; outfits retain achievement unlocks.
delete UNLOCK.chars.unicorn;
const mobIds=Object.keys(MOBS),mobNames=['芽芽蝸牛','圍巾蜜蜂','晚安雲朵貓','花園石頭人','星帽水母','泡泡魚','薄荷海龍','南瓜小蝠','迷路飛碟','瞌睡星星'];
const mobCells=[0,2,11,10,5,18,7,17,9,19];
mobIds.forEach((k,i)=>Object.assign(MOBS[k],{name:mobNames[i],art:mobCells[i]}));
Object.assign(BOSSES.donutb,{name:'草帽塔塔・塔可風暴',art:1});Object.assign(BOSSES.queen,{name:'魔女塔塔・花花魔法',art:0});Object.assign(BOSSES.sundae,{name:'南瓜塔塔・糖果派對',art:2});
const names={seed:'花瓣飛鏢',gum:'守護星環',pop:'花花爆破',fw:'星光煙火',chili:'暖陽光環',berry:'愛心追蹤箭',bolt:'卡薰星電鏈',cookie:'塔可迴旋',nova:'晚安星霜',honey:'花蜜小池',turret:'太空扭蛋砲台',cheese:'微風小短靴',magnet:'許願星磁鐵',heart:'暖心護符',power:'花語力量',clover:'幸運花瓣',milk:'野餐花茶',lens:'星空望遠鏡',watch:'星砂沙漏',helmet:'獨角仙護盾',ring:'幸運星戒指',boots:'探險小靴',cape:'花花披風',glasses:'冒險手帳',scarf:'暖心小圍巾',amulet:'丘比偷祝福',torn:'花瓣龍捲風',blade:'花杖旋舞',met:'塔塔流星雨',scope:'星光瞄準器',gloves:'採集手套',badge:'獨角仙徽章',crown:'花園王冠'};
for(const [k,n] of Object.entries(names))WEAPONS[k].name=n;
const itemCells={seed:10,gum:1,pop:10,fw:3,chili:10,berry:1,bolt:3,cookie:4,nova:11,honey:10,turret:5,cheese:2,magnet:3,heart:1,power:0,clover:10,milk:4,lens:6,watch:11,helmet:9,ring:1,boots:2,cape:8,glasses:6,scarf:8,amulet:1,torn:10,blade:10,met:3,scope:6,gloves:9,badge:9,crown:10};
const replacements={'倉鼠球破裂了':'塔塔醬需要休息了','傳說倉鼠':'傳說塔塔醬','壞壞甜點':'搗蛋小怪','暴走巨無霸甜甜圈':'草帽塔塔','蛋糕女王':'魔女塔塔','超級草莓巨無霸聖代':'南瓜塔塔','甜甜圈終結者':'草帽冒險家','弒后者':'魔女的朋友','聖代剋星':'南瓜派對王','幸運餅乾':'瞌睡星星','葵花子':'花瓣','玉米粒':'花苞','草莓':'愛心','餅乾':'塔可','起司':'花瓣','杯子蛋糕':'太空扭蛋'};
function tataText(s){for(const [a,b] of Object.entries(replacements))s=s.replaceAll(a,b);return s;}
ACH.forEach(a=>{a.name=tataText(a.name);a.desc=tataText(a.desc)});for(const w of Object.values(WEAPONS)){const desc=w.desc;w.desc=l=>tataText(desc(l));}
const menuOriginal=buildMenu;buildMenu=function(){menuOriginal();[...$('chars').children].forEach((el,i)=>{const k=Object.keys(CHARS)[i],c=CHARS[k];el.querySelector('.ic').innerHTML=tataIcon(c.sheet,c.cell);el.setAttribute('role','button');el.tabIndex=0;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}};if(!charOK(k))el.querySelector('b').textContent='🔒 '+c.name;});[...$('weps').children].forEach((el,i)=>{el.querySelector('.ic').innerHTML=tataIcon('items',itemCells[START_WEAPONS[i]]);});};
const cardsOriginal=renderCards;renderCards=function(){cardsOriginal();document.querySelectorAll('#cards .ic').forEach(el=>{const match=Object.keys(WEAPONS).find(k=>WEAPONS[k].ic===el.textContent);if(match)el.innerHTML=tataIcon('items',itemCells[match]);});};
function tataHero(p){tataSprite(S.ch.sheet,S.ch.cell+(S.ch.sheet==='friends'&&Math.sin(S.t*7)>.5?4:0),p.x,p.y-8,86);}
function tataEnemy(e){const index=e.boss?BOSSES[e.kind].art:((MOBS[e.type]?.art||0)+Math.floor(S.t/60)*4)%20;tataSprite(e.boss?'bosses':'monsters',index,e.x,e.y,e.boss?e.r*3.8:e.r*3.5);}
const emojiOriginal=emoji;const symbols={'🌻':10,'🍓':1,'🍪':4,'🧁':5,'🍿':10,'🌽':10,'🍯':10,'🧀':10,'🍴':10,'🧲':3,'🛡️':9,'⏳':11,'💖':1};emoji=function(t,x,y,s){if(Object.hasOwn(symbols,t))tataSprite('items',symbols[t],x,y,s*1.4);else emojiOriginal(t,x,y,s)};

buildMenu();
window.TataAdventure={ready:()=>Object.values(TATA_ART).every(a=>a.img.complete&&a.img.naturalWidth>0),snapshot:()=>({state,title:document.title,characters:Object.values(CHARS).map(c=>c.name),monsters:Object.values(MOBS).map(m=>m.name),bosses:Object.values(BOSSES).map(b=>b.name),player:S?{...S.player}:null,enemyCount:S?.enemies.length||0,level:S?.lv||0})};
const startTata=startGame;
startGame=function(){if(!TataAdventure.ready()){toast('塔塔醬正在準備行李，請等插圖載入後再出發。');return;}startTata();};
function refreshTataLoading(){const ready=TataAdventure.ready();$('startBtn').disabled=!ready;$('startBtn').textContent=ready?'一起出發！':'插圖載入中…';}
for(const a of Object.values(TATA_ART)){a.img.addEventListener('load',refreshTataLoading);a.img.addEventListener('error',()=>{$('startBtn').textContent='插圖載入失敗，請重新整理';});}refreshTataLoading();
