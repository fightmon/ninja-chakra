/* ===== data-stages.js — 關卡 / 難度 / 敵種「內容資料」(與引擎分離)=====
 * 動機(#22 關卡資料化):改關卡只動這檔、不碰邏輯;為「按需載入 / 後端發關卡」鋪路。
 * 瀏覽器:classic script,在 battle-core.js 之後、主 script 之前載入(counterOf 需要 EL)。
 * Node:require('./data-stages.js') 取得同一份(未來伺服器發關卡 / sim 用)。 */
const _ELref = (typeof EL !== 'undefined') ? EL : require('./battle-core.js').EL;   // 瀏覽器用 battle-core 全域 EL;Node 則 require

// 地下城:序章(教學)+ 五元素關 + 最終塔;turns 以「手」為單位;線性解鎖
const DUNGEONS = {
  prologue:{id:'prologue',name:'序章·召喚之章',emoji:'🏯',cost:10,stages:[
      {es:[{el:'wind',hp:450,atk:90,turns:2}]},
      {es:[{el:'earth',hp:380,atk:80,turns:2},{el:'earth',hp:380,atk:80,turns:2}]},
      {es:[{el:'thunder',hp:340,atk:70,turns:2},{el:'fire',hp:1500,atk:190,turns:3,boss:true},{el:'thunder',hp:340,atk:70,turns:2}]},
    ],drops:[[{rank:'genin',rate:0.6}],[{rank:'genin',rate:1.0},{rank:'chunin',rate:0.25}],[{rank:'chunin',rate:1.0}]]},   // 掉落上限2星(關卡只到中級;3★/4★只出轉蛋,2026-07-11定案)
  fire:{id:'fire',name:'火之火山',emoji:'🌋',el:'fire',cost:12,stages:[
      {es:[{el:'fire',hp:650,atk:100,turns:2}]},
      {es:[{el:'fire',hp:560,atk:90,turns:2},{el:'fire',hp:560,atk:90,turns:2}]},
      {es:[{el:'fire',hp:480,atk:90,turns:2,arch:'artillery'},{el:'fire',hp:1900,atk:200,turns:3,boss:true},{el:'fire',hp:480,atk:90,turns:2,arch:'healer'}]},
    ],drops:[[{el:'fire',rate:0.8}],[{el:'fire',rate:1.0}],[{el:'fire',rate:1.0}]]},
  water:{id:'water',name:'水之深淵',emoji:'🌊',el:'water',cost:12,stages:[
      {es:[{el:'water',hp:700,atk:110,turns:3}]},
      {es:[{el:'water',hp:600,atk:100,turns:2},{el:'water',hp:600,atk:100,turns:2}]},
      {es:[{el:'water',hp:520,atk:100,turns:2,arch:'caster'},{el:'water',hp:2000,atk:210,turns:3,boss:true},{el:'water',hp:520,atk:100,turns:2,arch:'artillery'}]},
    ],drops:[[{el:'water',rate:0.8}],[{el:'water',rate:1.0}],[{el:'water',rate:1.0}]]},
  thunder:{id:'thunder',name:'雷之高原',emoji:'⚡',el:'thunder',cost:12,stages:[
      {es:[{el:'thunder',hp:720,atk:110,turns:3}]},
      {es:[{el:'thunder',hp:600,atk:100,turns:2},{el:'thunder',hp:600,atk:100,turns:2}]},
      {es:[{el:'thunder',hp:500,atk:100,turns:2},{el:'thunder',hp:2000,atk:210,turns:3,boss:true},{el:'thunder',hp:500,atk:100,turns:2}]},
    ],drops:[[{el:'thunder',rate:0.8}],[{el:'thunder',rate:1.0}],[{el:'thunder',rate:1.0}]]},
  earth:{id:'earth',name:'土之山岳',emoji:'⛰️',el:'earth',cost:12,stages:[
      {es:[{el:'earth',hp:700,atk:100,turns:2}]},
      {es:[{el:'earth',hp:580,atk:90,turns:2,arch:'artillery'},{el:'earth',hp:580,atk:90,turns:2}]},
      {es:[{el:'earth',hp:520,atk:90,turns:2,arch:'archmage'},{el:'earth',hp:2000,atk:200,turns:3,boss:true},{el:'earth',hp:520,atk:90,turns:2,arch:'healer'}]},
    ],drops:[[{el:'earth',rate:0.8}],[{el:'earth',rate:1.0}],[{el:'earth',rate:1.0}]]},
  wind:{id:'wind',name:'風之峽谷',emoji:'🌪️',el:'wind',cost:12,stages:[
      {es:[{el:'wind',hp:680,atk:100,turns:2}]},
      {es:[{el:'wind',hp:580,atk:90,turns:2},{el:'wind',hp:580,atk:90,turns:2}]},
      {es:[{el:'wind',hp:500,atk:90,turns:2},{el:'wind',hp:1900,atk:200,turns:3,boss:true},{el:'wind',hp:500,atk:90,turns:2}]},
    ],drops:[[{el:'wind',rate:0.8}],[{el:'wind',rate:1.0}],[{el:'wind',rate:1.0}]]},
  tower:{id:'tower',name:'召喚之塔',emoji:'🗼',cost:20,stages:[
      {es:[{el:'fire',hp:800,atk:120,turns:2},{el:'water',hp:800,atk:120,turns:2}]},
      {es:[{el:'thunder',hp:750,atk:110,turns:2,arch:'archmage'},{el:'earth',hp:750,atk:110,turns:2},{el:'wind',hp:750,atk:110,turns:2}]},
      {es:[{el:'fire',hp:3200,atk:210,turns:3,boss:true,phases:[{el:'fire',beh:'burn'},{el:'water',beh:'regen'},{el:'thunder',beh:'paralyze'},{el:'earth',beh:'hit'},{el:'wind',beh:'combo'}]}]},   // 魔王:五屬階段變身(每 20% 血換屬+換招牌行為,逼平衡隊);血砍3200讓強隊在超級/地獄打得死(模擬5000時連★3LV20都0%)
    ],drops:[[{rank:'chunin',rate:1.0}],[{rank:'chunin',rate:1.0}],[{rank:'chunin',rate:1.0}]]},   // 塔3★100%+4★20%已移除:掉落上限2星,4★只出轉蛋(2026-07-11定案;伺服器端掉落做好後改由後台配卡)
};
// ===== 每日修煉(初始島) — 15 關:5屬 × 1★/2★/3★(見習/修行/極意)。規格見 docs/spec-daily-island.md。
//   2026-08-16 企劃定案修訂:改「機制怪守門＋金屬經驗怪當獎品」(PAD 曜日城模式)。
//   drops 一律不填:掉落走後端 run/complete 依當日型態(經驗日=擊殺的金屬怪本體入包/多金日=金屬怪原位換金錢怪)發放,見規格§4,
//   data-stages.js 的 drops 表本身未接線,填了也不會生效,真相一律在後端。
//   難度固定用 normal(×1.0),以下 hp/atk 即設計值,不吃 DIFFS 倍率也不吃五屬城的 stageCounts/OVERRIDES。
//   pieceSet=拖盤好解塊池(通用參數,遊戲端接線另案,目前只帶欄位)。
const _DAILY_PIECE_SET = ['2x2','1x3','3x1','2x3','3x2','1x2','2x1'];
// 🔩💰金屬經驗怪(皮納塔,血厚攻低出手慢,無屬性通用,不做元素換色):el:'neutral'+cardId 沿用 index.html
//   spawnBonusEnemies() 的既有寫法(rewardMon: el:'neutral', cardId:bc,見 index.html L3527-3530);
//   c71小金屬/c72大金屬/c73金屬王 卡定義在 index.html L525-527(BASE_NAMES 對照也在 stages-overview.html 內建)。
//   beh:'none' 是刻意的非機制值(behGates 對未知 beh 字串一律回傳全零 gate,見 data-stages.js behGates()):
//   純為擋掉 spawnStage() 對「該屬城 specialIdx 自動注入簽名招」的預設行為(myBeh 分支只擋 d.iron/d.peck/d.beh 已設,
//   金屬怪本身沒有 iron/peck,若不擋會被誤套上該屬簽名招),不代表金屬怪真的有機制。
// 🆕2026-09-03 金屬怪 per-tier 配血(hp 參數覆蓋,同守門怪「越難的關怪越硬」邏輯;跟玩家戰力無關,固定值):
//   目標=各 tier 的目標客群都「小2宮/大3宮/王4-5宮」(sim:LV1-20一宮259-368、LV20-30~530、LV40+~800,金屬無屬吃不到相剋)。
//   t1 帶 _metalMini(300)=戰鬥540(新手2宮);t2 小用預設500=900、_metalBig(800)=1440;t3 大用預設1300=2340、王2200=3960。
//   多金日金錢怪共用本組定義只換 cardId,血量自動同步。改血別動後端(dailyMetalSpawns 只管卡種數量)。
const _metalMini  = (hp)=>({el:'neutral', hp:hp||500,  atk:10, turns:4, cardId:'c71', beh:'none'});   // 小金屬
const _metalBig   = (hp)=>({el:'neutral', hp:hp||1300, atk:15, turns:4, cardId:'c72', beh:'none'});   // 大金屬
const _metalKing  = (hp)=>({el:'neutral', hp:hp||2200, atk:30, turns:4, cardId:'c73', beh:'none'});   // 金屬王(別超過t3魔王(1400×1.8)太多免得同場搶戲)
// 2026-08-16 企劃二次修訂:①移除「副機制怪」概念(灼燒/封鎖/麻痺/自回/連段盾等技能遊戲尚未定義,不出場),只留五屬主機制。
//   ②星級上限★3:所有 boss 顯式帶 tier:3(不靠 KING_NAME 4星王貼圖/命名 fallback)。
// 2026-08-16 三次修訂:星級階梯統一——修煉關星級＝場內最高怪星級,S1→S3 遞增,五屬同構,機制怪 tier 顯式指定(不再抄模板值):
//   ★1(1★S2 弱檔) hp380 atk45 turns4;★1(標準檔,2★S1/S2×2/3★S1) hp420 atk55 turns4;★2 hp700 atk85 turns3;★3小王 hp1400 atk150 turns3 boss:true(沿用現值)。
//   1★S1小金屬×2/S2★1弱檔+小金屬×1;2★S1★1+小金屬×2/S2★1×2+大金屬/S3★2+大金屬;3★S1★1+大金屬/S2★2+大金屬×2/S3★3小王+金屬王。
//   金屬怪全日總量五屬各自:小×5(1★S1×2+S2×1=3、2★S1×2=2)、大×5(2★S2×1+S3×1=2、3★S1×1+S2×2=3)、王×1(3★S3)。
const DAILY_DUNGEONS = {
  daily_fire_1:{id:'daily_fire_1',el:'fire',name:'火之修煉·見習',emoji:'🔥',cost:5,daily:true,pieceSet:_DAILY_PIECE_SET,stages:[
      {es:[_metalMini(300),_metalMini(300)]},
      {es:[{el:'fire',hp:380,atk:45,turns:4,tier:1,beh:'finisher',finCD:4,finStages:3,finPct:0.12,finAnyHit:true},_metalMini(300)]},
    ]},
  daily_fire_2:{id:'daily_fire_2',el:'fire',name:'火之修煉·修行',emoji:'🔥',cost:10,daily:true,pieceSet:_DAILY_PIECE_SET,stages:[
      {es:[{el:'fire',hp:1000,atk:1400,turns:4,tier:1,beh:'finisher',finCD:4,finStages:3,finPct:0.12,finAnyHit:true},_metalMini(),_metalMini()]},
      {es:[{el:'fire',hp:1000,atk:1400,turns:4,tier:1,beh:'finisher',finCD:4,finStages:3,finPct:0.12,finAnyHit:true},{el:'fire',hp:1000,atk:1400,turns:4,tier:1,beh:'finisher',finCD:4,finStages:3,finPct:0.12,finAnyHit:true},_metalBig(800)]},
      {es:[{el:'fire',hp:1800,atk:2400,turns:3,tier:2,beh:'finisher',finCD:4,finStages:3,finPct:0.20,finAnyHit:true},_metalBig(800)]},
    ]},
  daily_fire_3:{id:'daily_fire_3',el:'fire',name:'火之修煉·極意',emoji:'🔥',cost:15,daily:true,stages:[
      {es:[{el:'fire',hp:600,atk:1500,turns:4,tier:1,beh:'finisher',finCD:4,finStages:3,finPct:0.12,finAnyHit:true},_metalBig()]},
      {es:[{el:'fire',hp:1000,atk:2800,turns:3,tier:2,beh:'finisher',finCD:4,finStages:3,finPct:0.20,finAnyHit:true},_metalBig(),_metalBig()]},
      {es:[{el:'fire',hp:2000,atk:2300,turns:3,boss:true,tier:3,beh:'finisher',finCD:4,finStages:3,finPct:0.25,finAnyHit:true},_metalKing()]},
    ]},

  daily_water_1:{id:'daily_water_1',el:'water',name:'水之修煉·見習',emoji:'💧',cost:5,daily:true,pieceSet:_DAILY_PIECE_SET,stages:[
      {es:[_metalMini(300),_metalMini(300)]},
      {es:[{el:'water',hp:380,atk:45,turns:4,tier:1,beh:'healAlly',healPct:0.20,healCD:2},_metalMini(300)]},
    ]},
  daily_water_2:{id:'daily_water_2',el:'water',name:'水之修煉·修行',emoji:'💧',cost:10,daily:true,pieceSet:_DAILY_PIECE_SET,stages:[
      {es:[{el:'water',hp:1000,atk:1400,turns:4,tier:1,beh:'healAlly',healPct:0.20,healCD:2},_metalMini(),_metalMini()]},
      {es:[{el:'water',hp:1000,atk:1400,turns:4,tier:1,beh:'healAlly',healPct:0.20,healCD:2},{el:'water',hp:1000,atk:1400,turns:4,tier:1,beh:'healAlly',healPct:0.20,healCD:2},_metalBig(800)]},
      {es:[{el:'water',hp:1800,atk:2400,turns:3,tier:2,beh:'healAlly',healPct:0.35,healCD:2},_metalBig(800)]},
    ]},
  daily_water_3:{id:'daily_water_3',el:'water',name:'水之修煉·極意',emoji:'💧',cost:15,daily:true,stages:[
      {es:[{el:'water',hp:600,atk:1500,turns:4,tier:1,beh:'healAlly',healPct:0.20,healCD:2},_metalBig()]},
      {es:[{el:'water',hp:1000,atk:2800,turns:3,tier:2,beh:'healAlly',healPct:0.35,healCD:2},_metalBig(),_metalBig()]},
      {es:[{el:'water',hp:2000,atk:2300,turns:3,boss:true,tier:3,beh:'healAlly',healPct:0.5,healCD:2,reviveMax:1},_metalKing()]},
    ]},

  daily_thunder_1:{id:'daily_thunder_1',el:'thunder',name:'雷之修煉·見習',emoji:'⚡',cost:5,daily:true,pieceSet:_DAILY_PIECE_SET,stages:[
      {es:[_metalMini(300),_metalMini(300)]},
      {es:[{el:'thunder',hp:380,atk:45,turns:4,tier:1,iron:1,ironPunish:true},_metalMini(300)]},
    ]},
  daily_thunder_2:{id:'daily_thunder_2',el:'thunder',name:'雷之修煉·修行',emoji:'⚡',cost:10,daily:true,pieceSet:_DAILY_PIECE_SET,stages:[
      {es:[{el:'thunder',hp:1000,atk:1400,turns:4,tier:1,iron:1,ironPunish:true},_metalMini(),_metalMini()]},
      {es:[{el:'thunder',hp:1000,atk:1400,turns:4,tier:1,iron:1,ironPunish:true},{el:'thunder',hp:1000,atk:1400,turns:4,tier:1,iron:1,ironPunish:true},_metalBig(800)]},
      {es:[{el:'thunder',hp:1800,atk:2400,turns:3,tier:2,iron:2,ironPunish:true},_metalBig(800)]},
    ]},
  daily_thunder_3:{id:'daily_thunder_3',el:'thunder',name:'雷之修煉·極意',emoji:'⚡',cost:15,daily:true,stages:[
      {es:[{el:'thunder',hp:600,atk:1500,turns:4,tier:1,iron:1,ironPunish:true},_metalBig()]},
      {es:[{el:'thunder',hp:1000,atk:2800,turns:3,tier:2,iron:2,ironPunish:true},_metalBig(),_metalBig()]},
      {es:[{el:'thunder',hp:2000,atk:2300,turns:3,boss:true,tier:3,iron:3,ironPunish:true},_metalKing()]},
    ]},

  daily_earth_1:{id:'daily_earth_1',el:'earth',name:'土之修煉·見習',emoji:'🪨',cost:5,daily:true,pieceSet:_DAILY_PIECE_SET,stages:[
      {es:[_metalMini(300),_metalMini(300)]},
      {es:[{el:'earth',hp:380,atk:45,turns:4,tier:1,beh:'shield',shieldKind:'hit',hitGate:12},_metalMini(300)]},
    ]},
  daily_earth_2:{id:'daily_earth_2',el:'earth',name:'土之修煉·修行',emoji:'🪨',cost:10,daily:true,pieceSet:_DAILY_PIECE_SET,stages:[
      {es:[{el:'earth',hp:1000,atk:1400,turns:4,tier:1,beh:'shield',shieldKind:'hit',hitGate:12},_metalMini(),_metalMini()]},
      {es:[{el:'earth',hp:1000,atk:1400,turns:4,tier:1,beh:'shield',shieldKind:'hit',hitGate:12},{el:'earth',hp:1000,atk:1400,turns:4,tier:1,beh:'shield',shieldKind:'hit',hitGate:12},_metalBig(800)]},
      {es:[{el:'earth',hp:1800,atk:2400,turns:3,tier:2,beh:'shield',shieldKind:'hit',hitGate:15},_metalBig(800)]},
    ]},
  daily_earth_3:{id:'daily_earth_3',el:'earth',name:'土之修煉·極意',emoji:'🪨',cost:15,daily:true,stages:[
      {es:[{el:'earth',hp:600,atk:1500,turns:4,tier:1,beh:'shield',shieldKind:'hit',hitGate:12},_metalBig()]},
      {es:[{el:'earth',hp:1000,atk:2800,turns:3,tier:2,beh:'shield',shieldKind:'hit',hitGate:15},_metalBig(),_metalBig()]},
      {es:[{el:'earth',hp:2000,atk:2300,turns:3,boss:true,tier:3,beh:'shield',shieldRandom:true},_metalKing()]},
    ]},

  daily_wind_1:{id:'daily_wind_1',el:'wind',name:'風之修煉·見習',emoji:'🌪',cost:5,daily:true,pieceSet:_DAILY_PIECE_SET,stages:[
      {es:[_metalMini(300),_metalMini(300)]},
      {es:[{el:'wind',hp:380,atk:45,turns:4,tier:1,peck:1},_metalMini(300)]},
    ]},
  daily_wind_2:{id:'daily_wind_2',el:'wind',name:'風之修煉·修行',emoji:'🌪',cost:10,daily:true,pieceSet:_DAILY_PIECE_SET,stages:[
      {es:[{el:'wind',hp:1000,atk:1400,turns:4,tier:1,peck:1},_metalMini(),_metalMini()]},
      {es:[{el:'wind',hp:1000,atk:1400,turns:4,tier:1,peck:1},{el:'wind',hp:1000,atk:1400,turns:4,tier:1,peck:1},_metalBig(800)]},
      {es:[{el:'wind',hp:1800,atk:2400,turns:3,tier:2,peck:1},_metalBig(800)]},
    ]},
  daily_wind_3:{id:'daily_wind_3',el:'wind',name:'風之修煉·極意',emoji:'🌪',cost:15,daily:true,stages:[
      {es:[{el:'wind',hp:600,atk:1500,turns:4,tier:1,peck:1},_metalBig()]},
      {es:[{el:'wind',hp:1000,atk:2800,turns:3,tier:2,peck:1},_metalBig(),_metalBig()]},
      {es:[{el:'wind',hp:2000,atk:2300,turns:3,boss:true,tier:3,peck:1,peckTray:true},_metalKing()]},
    ]},
};

// ===== 塔·50層(TOWER_FLOORS) — 2026-08-16 企劃定案。與舊 DUNGEONS.tower 資料共存,不刪不改、不互相引用——
//   舊塔遊戲還在用,替換上線是之後接遊戲端的事。50層=5區塊(各屬×8層,照曜日相剋環順序)+混合段9層(F41-49)+畢業王1層(F50)。
//   一層一戰:每個 dungeon 只有 1 個 stage,id=`tower_f1`~`tower_f50`,cost 一律5,daily 不設,額外掛 tower:true。
//   機制參數(finPct/healPct/hitGate/iron/peck)照 docs/spec-daily-stages.md §2,與 DAILY_DUNGEONS 逐字同一組值;
//   hp/atk 走塔自己的基準×區塊倍率(m_b)/混合段倍率(m)公式,是獨立的數值曲線,不是抄 daily 的 hp/atk 數字。
//   雜兵(filler,無機制)與金屬怪比照掛 beh:'none' 守門,擋 spawnStage() 對單/少怪關的簽名招自動注入(見上方 _metalMini 註解)。
const TOWER_MECH = {   // 五屬主機制參數三檔(★1弱檔與標準同參數,只有 hp/atk 不同;★2;★3小王),直接照抄 DAILY_DUNGEONS 用過的欄位組合
  fire:   { 1:{beh:'finisher',finCD:4,finStages:3,finPct:0.12,finAnyHit:true},
            2:{beh:'finisher',finCD:4,finStages:3,finPct:0.20,finAnyHit:true},
            3:{beh:'finisher',finCD:4,finStages:3,finPct:0.25,finAnyHit:true} },
  water:  { 1:{beh:'healAlly',healPct:0.20,healCD:2},
            2:{beh:'healAlly',healPct:0.35,healCD:2},
            3:{beh:'healAlly',healPct:0.5,healCD:2,reviveMax:1} },
  thunder:{ 1:{iron:1,ironPunish:true}, 2:{iron:2,ironPunish:true}, 3:{iron:3,ironPunish:true} },
  earth:  { 1:{beh:'shield',shieldKind:'hit',hitGate:12}, 2:{beh:'shield',shieldKind:'hit',hitGate:15}, 3:{beh:'shield',shieldRandom:true} },
  wind:   { 1:{peck:1}, 2:{peck:1}, 3:{peck:1,peckTray:true} },
};
function _twMech(el, tier, hp, atk, turns, extra){ return Object.assign({el,hp,atk,turns,tier}, TOWER_MECH[el][tier], extra||{}); }   // 機制怪:hp/atk/turns 顯式傳入(各檔位×倍率算好的值),機制欄位查表帶入
function _twMob(el, hp, atk){ return {el,hp,atk,turns:3,tier:1,beh:'none'}; }   // 雜兵素體:無機制欄位,beh:'none' 純守門(不是真的有機制)
const TOWER_EL_NAME = {fire:'火',water:'水',thunder:'雷',earth:'土',wind:'風'};

const TOWER_BLOCKS = ['fire','wind','thunder','earth','water'];   // 5區塊,照曜日相剋環順序(B1火F1-8/B2風F9-16/B3雷F17-24/B4土F25-32/B5水F33-40)
const TOWER_BASE = { weak:[300,35], std:[380,45], t2:[550,70], mob:[280,30], boss:[1000,110] };   // B1(m_b=1.0) 基準值(raw,turns 不吃倍率)
function _twMb(b){ return 1 + 0.25*(b-1); }   // 區塊倍率:B1=1.0、B2=1.25、B3=1.5、B4=1.75、B5=2.0
function _twScaled(key, m){ const [hp,atk]=TOWER_BASE[key]; return [Math.round(hp*m), Math.round(atk*m)]; }

const TOWER_FLOORS = {};
const TOWER_BONUS_CHANCE = 0.12;   // 🆕2026-08-26 驚喜關(S2-S3間)插入機率,比照五屬城 run/start.ts 的 12%;純資料佔位——
                                    //   插入邏輯(伺服器擲骰/ELEM_BONUS 白名單/spawnBonusEnemies 接線)之後接塔進遊戲時再做,目前不影響任何現有行為。
const TOWER_FLOOR_SPIKE = { 4: 1.3, 7: 1.1 };   // 期中考(F4)/王前熟練尾聲(F7)整層數值加成;其餘=1.0(F5 藉此「降回基準」)
const TOWER_BOSS_SPIKE = 1.4;      // F8 樓主(4★王)專屬加成,疊在區塊倍率之上,只套樓主本體,不套 S1/S2 或護衛
const TOWER_S3_BOOST = 1.15;       // 星級沒升等的「原地強化」倍率——目前只有 F3 的 S3 用到(2★→2★强,靠數值撐出關內曲線,而非跳星)

// 🆕2026-08-26 星級曲線改版:星級(1-4★)與「機制強度檔」解耦——貼圖星等/顯示星數可以比機制強度先升一階,
//   照 docs/spec-tower-curve.md §2.5 定案表:1★=art1/mech1/weak檔、2★=art2/mech1/std檔(貼圖先進化,機制強度暫不變)、
//   3★=art3/mech2/t2檔、4★=art0(不帶tier→enemyArtUrl 無tier的boss 走 king 圖)/mech3/boss檔。
const TOWER_STAR = {
  1: { art: 1, mech: 1, key: 'weak' },
  2: { art: 2, mech: 1, key: 'std'  },
  3: { art: 3, mech: 2, key: 't2'   },
  4: { art: 0, mech: 3, key: 'boss' },
};
// 🆕2026-08-26 修正:塔的機制怪/雜兵一律用「該 block 的種族」貼圖,只換屬性色——不是換種族/換機制。
//   種族與機制固定用 block 自己的元素(raceEl);dmgEl 只決定相剋計算與 cardId 的屬性色(可以是 F4/F8 的剋屬、offEl 雜兵變化屬)。
//   cardId 強制指定(不再讓 stageTablePerEnemy 靠 e.el 反推 dungeonId/種族——e.el=剋屬時會反推出錯的種族,例如水會被推成c56護理而不是哥布林)。
const TOWER_RACE_BASE = { fire:41, wind:51, thunder:36, earth:46, water:56 };   // block 種族 base cardId(火哥布林/風賊鴨/雷鐵機人/土牆/水護理),同 stages-overview.html 的 CITY_BASE
const TOWER_EL_IDX = { fire:0, water:1, thunder:2, earth:3, wind:4 };            // 屬性→cardId index(cardId=種族base+此index)
function _twCardId(raceEl, dmgEl){ return 'c' + (TOWER_RACE_BASE[raceEl] + TOWER_EL_IDX[dmgEl]); }
function _twStar(raceEl, dmgEl, star, fm, extra){   // 星級生怪:raceEl=block種族(決定機制查表+cardId種族),dmgEl=相剋用屬性(決定cardId屬性色+e.el);hp/atk=該星數值檔×fm;turns=1★2★慢(4手)、3★4★快(3手)
  const s = TOWER_STAR[star], [hp, atk] = _twScaled(s.key, fm), turns = star <= 2 ? 4 : 3;
  const o = Object.assign({el: dmgEl, hp, atk, turns, tier: s.art}, TOWER_MECH[raceEl][s.mech], extra || {});
  if (s.art > 0) o.cardId = _twCardId(raceEl, dmgEl);   // 1-3★:強制種族+屬性 cardId;4★王(art=0)不設 cardId→enemyArtUrl 走 king 圖分支(dmgEl 恆=raceEl,CITY_KING 對得上)
  return o;
}
const TOWER_MOB_BASE = 66;   // 🆕2026-08-26 主題調整:雜兵改用「方塊怪」家族(c66-70,五屬×base/_e/_e2,無king)——塔叫「方塊塔」,雜兵拿方塊怪比哥布林更搭主題
function _twMobR(raceEl, dmgEl, hp, atk){ return { el: dmgEl, hp, atk, turns: 3, tier: 1, beh: 'none', cardId: 'c' + (TOWER_MOB_BASE + TOWER_EL_IDX[dmgEl]) }; }   // 塔區塊專用雜兵:cardId=方塊怪base+屬index(raceEl 參數保留供呼叫端統一介面,雜兵不吃種族);無機制(beh:'none')

// 每關 3 小關·星級曲線(照 docs/spec-tower-curve.md §2.5 定案表逐關硬寫,8 關骨架彼此不同,非單一公式套用):
//   F1:1★→1★x2→2★  F2:1★+雜兵→1★+2★→2★  F3:2★→2★+雜兵→2★强(原地強化)  F4測:剋E2★→剋E2★x2→剋E3★
//   F5:2★→2★x2→2★(降回=F3基準,不強化)  F6:2★+雜兵→2★x2→3★  F7:3★→2★+3★→3★  F8終:3★x2→3★x2→4★王+剋E護衛
//   雜兵可能摻非本屬(offEl,固定對照非RNG,做屬性變化);主機制怪維持本屬(或 F4 的剋E岔屬)。
TOWER_BLOCKS.forEach((el, bi) => {
  const b = bi + 1, m = _twMb(b), floorBase = (b - 1) * 8;
  const cEl = counterOf(el);                        // 岔屬=剋本屬(B1火→水/B2風→火/B3雷→風/B4土→雷/B5水→土),固定對照非RNG
  const offEl = TOWER_BLOCKS[(bi + 2) % 5];          // 雜兵變化屬:環上隔兩格的第三屬,5屬環下必然≠本屬也≠岔屬
  const easyPS = { pieceSet: _DAILY_PIECE_SET, pieceSetChance: 1.0 };   // 好解池:100% 從池內抽
  const midPS  = { pieceSet: _DAILY_PIECE_SET, pieceSetChance: 0.5 };   // 過渡池:50% 機率從池內抽,否則一般隨機

  for (let n = 1; n <= 8; n++) {
    const f = floorBase + n;
    const fm = m * (TOWER_FLOOR_SPIKE[n] || 1.0);
    const [mobHp, mobAtk] = _twScaled('mob', fm);
    const mob = (dmgEl) => _twMobR(el, dmgEl, mobHp, mobAtk);                              // 雜兵:種族固定=block(el),屬性=dmgEl(offEl 或剋E護衛)
    const star = (dmgEl, s, fmArg, extra) => _twStar(el, dmgEl, s, fmArg == null ? fm : fmArg, extra);   // 機制怪:種族/機制固定=block(el),屬性=dmgEl(本屬或F4剋屬)

    let stages, extra, dispEl = el, examTag = '', mixName = null;
    if (n === 8) {
      // 期末考:S1-S2 本屬E(3★x2)、S3=3隻=本屬4★王(boss,×1.4,種族king圖)＋本屬3★護衛(finisher)＋剋E護衛(1★純雜兵)
      stages = [
        { es: [ star(el, 3), star(el, 3) ] },
        { es: [ star(el, 3), star(el, 3) ] },
        { es: [ star(el, 4, fm * TOWER_BOSS_SPIKE, { boss: true }), star(el, 3), mob(cEl) ] },
      ];
      examTag = '·期末考';
      // n8 拖盤=全隨機,不設 pieceSet
    } else if (n === 4) {
      // 🆕2026-08-26 期中考改「本屬＋剋屬混場」(不再整關純剋屬):同場放本屬(el)＋剋屬(cEl)哥布林,都 finisher,都吃 fm(=m×1.3尖峰)
      stages = [
        { es: [ star(el, 2), star(cEl, 2) ] },                                          // S1:1本屬+1剋屬,都2★
        { es: [ star(el, 2), star(cEl, 2), star(cEl, 2) ] },                            // S2:1本屬+2剋屬
        { es: [ star(cEl, 3, null, { boss: true }), star(el, 2) ] },                    // S3(2隻):剋屬3★(王)+本屬2★(伴),混火水
      ];
      examTag = '·期中考';
      mixName = TOWER_EL_NAME[el] + '+' + TOWER_EL_NAME[cEl];   // 混屬樓層,名稱比照 F41-49 的「A+B」慣例
      extra = midPS;
      // F4 混場不設 dun.el(比照 F8/F41-50 混屬樓層慣例,交由各敵人 e.el 決定)
    } else {
      if (n === 1) {
        stages = [
          { es: [ star(el, 1) ] },
          { es: [ star(el, 1), star(el, 1) ] },
          { es: [ star(el, 2, null, { boss: true }) ] },
        ];
      } else if (n === 2) {
        stages = [
          { es: [ star(el, 1), mob(offEl) ] },
          { es: [ star(el, 1), star(el, 2) ] },
          { es: [ star(el, 2, null, { boss: true }) ] },
        ];
      } else if (n === 3) {
        stages = [
          { es: [ star(el, 2) ] },
          { es: [ star(el, 2), mob(offEl) ] },
          { es: [ star(el, 2, fm * TOWER_S3_BOOST, { boss: true }) ] },   // 2★强:同星,靠數值撐出關內曲線
        ];
      } else if (n === 5) {
        stages = [
          { es: [ star(el, 2) ] },
          { es: [ star(el, 2), star(el, 2) ] },
          { es: [ star(el, 2, null, { boss: true }), star(el, 2) ] },   // S3改2隻:降回=F3基準(同星、同fm、不強化)
        ];
      } else if (n === 6) {
        stages = [
          { es: [ star(el, 2), mob(offEl) ] },
          { es: [ star(el, 2), star(el, 2) ] },
          { es: [ star(el, 3, null, { boss: true }), star(el, 2) ] },   // S3改2隻:3★(王)+2★(伴)
        ];
      } else {   // n === 7
        stages = [
          { es: [ star(el, 3) ] },
          { es: [ star(el, 2), star(el, 3) ] },
          { es: [ star(el, 3, null, { boss: true }), star(el, 3), star(el, 2) ] },   // S3改3隻:3★(王)+3★(伴)+2★(伴)
        ];
      }
      if (n <= 2) extra = easyPS;
      else if (n <= 4) extra = midPS;
      // n5-7 拖盤=全隨機,不設 pieceSet
    }

    const dun = {
      id: 'tower_f' + f, name: '塔 第' + f + '層·' + (mixName || TOWER_EL_NAME[dispEl]) + examTag,
      emoji: '🗼', cost: 5, tower: true, stages,
      bonusSlot: true, bonusChance: TOWER_BONUS_CHANCE,   // 🆕S2-S3 間驚喜關插槽(資料佔位,見上方常數註解)
    };
    if (n !== 8 && n !== 4) dun.el = dispEl;   // 單一屬性樓層才設 dungeon 級 el;F4(本屬+剋屬混場)/F8(王+雙護衛混屬)比照 F41-49/F50 慣例不設,交由各敵人 e.el 決定
    if (n === 4) dun.examMid = true;
    if (n === 8) dun.examFinal = true;
    if (extra) Object.assign(dun, extra);
    TOWER_FLOORS[dun.id] = dun;
  }
});

// ===== F41-49 混合段(一般拖盤,不設 pieceSet):四組跨屬對(照曜日相剋環相鄰) + F49 王前三機制怪關 =====
// 倍率 m:F41-43=2.1、F44-46=2.2、F47-48=2.3、F49=2.4(只套 hp/atk,turns 不變:★2=3、雜兵=3)。
// 2026-08-26 改 3 小關:S3=原本(唯一)那個 stage 的內容原封不動(數值不動,維持既有曲線),S1/S2 是新增的漸進鋪陳(較少敵人)——
//   不改動任何既有數值,只是把原本「一戰打完」拆成「先見過招式、最後一次全上」。
(() => {
  const pairs = [['fire','wind'], ['wind','thunder'], ['thunder','earth'], ['earth','water']];   // [A,B]:低樓層=A★2+B★2+B雜兵;高樓層=A★2×2+B★2(A 從1隻→2隻遞增)
  const mLow = [2.1, 2.1, 2.2, 2.3], mHigh = [2.1, 2.2, 2.2, 2.3];   // 對應 F41/43/45/47(低) 與 F42/44/46/48(高) 的倍率
  pairs.forEach(([A, B], i) => {
    const fLow = 41 + i * 2, fHigh = fLow + 1;
    const [t2LoHp, t2LoAtk] = _twScaled('t2', mLow[i]), [mobLoHp, mobLoAtk] = _twScaled('mob', mLow[i]);
    const [t2HiHp, t2HiAtk] = _twScaled('t2', mHigh[i]);
    TOWER_FLOORS['tower_f'+fLow] = { id:'tower_f'+fLow, name:'塔 第'+fLow+'層·'+TOWER_EL_NAME[A]+'+'+TOWER_EL_NAME[B], emoji:'🗼', cost:5, tower:true, bonusSlot:true, bonusChance:TOWER_BONUS_CHANCE, stages:[
      { es:[ _twStar(A,A,1,mLow[i]) ] },                                                                     // S1:A 1★先亮相(比 S3 主戰力矮一階,鋪星級曲線)
      { es:[ _twStar(A,A,2,mLow[i]), _twStar(B,B,1,mLow[i]) ] },                                             // S2:A 升 2★(=S3 主戰力星級)、B 以 1★先登場
      { es:[ _twMech(A,2,t2LoHp,t2LoAtk,3), _twMech(B,2,t2LoHp,t2LoAtk,3), _twMob(B,mobLoHp,mobLoAtk) ] },   // S3:原內容不變
    ] };
    TOWER_FLOORS['tower_f'+fHigh] = { id:'tower_f'+fHigh, name:'塔 第'+fHigh+'層·'+TOWER_EL_NAME[A]+'+'+TOWER_EL_NAME[B], emoji:'🗼', cost:5, tower:true, bonusSlot:true, bonusChance:TOWER_BONUS_CHANCE, stages:[
      { es:[ _twStar(A,A,2,mHigh[i]) ] },                                                                    // S1:A 2★單隻
      { es:[ _twStar(A,A,2,mHigh[i]), _twStar(A,A,3,mHigh[i]) ] },                                           // S2:敵數×2,其中一隻先跳 3★做星級變化
      { es:[ _twMech(A,2,t2HiHp,t2HiAtk,3), _twMech(A,2,t2HiHp,t2HiAtk,3), _twMech(B,2,t2HiHp,t2HiAtk,3) ] },// S3:原內容不變
    ] };
  });
  // F49:水+火,三機制怪(水★2×1＋火★2×2),王前最難雜兵關,無填充雜兵,m=2.4
  const [t2F49Hp, t2F49Atk] = _twScaled('t2', 2.4);
  TOWER_FLOORS['tower_f49'] = { id:'tower_f49', name:'塔 第49層·水+火', emoji:'🗼', cost:5, tower:true, bonusSlot:true, bonusChance:TOWER_BONUS_CHANCE, stages:[
    { es:[ _twStar('water','water',1,2.4) ] },                                                                                       // S1:水 1★單隻
    { es:[ _twStar('water','water',2,2.4), _twStar('fire','fire',1,2.4) ] },                                                         // S2:水升 2★、火以 1★先登場
    { es:[ _twMech('water',2,t2F49Hp,t2F49Atk,3), _twMech('fire',2,t2F49Hp,t2F49Atk,3), _twMech('fire',2,t2F49Hp,t2F49Atk,3) ] },     // S3:原內容不變
  ] };
})();

// F50:畢業王。S3=照抄 DUNGEONS.tower.stages[2](五階段變身王,原欄位原數值整份複製,不吃 m 倍率,與舊塔原始定義一致);
//   S1/S2 為新增鋪陳(風→火,呼應 F49「相剋環閉合」收尾、銜接王的火階開場),數值比照 F49 的 m=2.4 檔。
//   ⚠️本層 S1/S2 為企劃判斷(spec 未精算具體敵組),數值曲線待 sim 驗證;dungeon 級不設 el(舊塔本尊也沒設,魔王靠 phases 自己決定屬性)。
(() => {
  const [t2F50Hp, t2F50Atk] = _twScaled('t2', 2.4);
  TOWER_FLOORS['tower_f50'] = { id:'tower_f50', name:'塔 第50層·畢業王', emoji:'🗼', cost:5, tower:true, bonusSlot:true, bonusChance:TOWER_BONUS_CHANCE, stages:[
    { es:[ _twStar('wind','wind',1,2.4) ] },                                                                  // S1:風 1★,呼應相剋環閉合前的最後鋪陳
    { es:[ _twStar('wind','wind',2,2.4), _twStar('fire','fire',1,2.4) ] },                                    // S2:風升 2★、火以 1★先登場,銜接王的火階開場
    { es:[ { el:'fire', hp:3200, atk:210, turns:3, boss:true, phases:[
        {el:'fire',beh:'burn'}, {el:'water',beh:'regen'}, {el:'thunder',beh:'paralyze'}, {el:'earth',beh:'hit'}, {el:'wind',beh:'combo'}
      ] } ] },
  ] };
})();

const STAGES = DUNGEONS.prologue.stages;   // 相容舊引用
const ELEM_DUNGEONS=['fire','water','earth','thunder','wind'];   // 地圖五邊形順時針=相剋環(各被順時針鄰居剋:水剋火→土剋水→雷剋土→風剋雷→火剋風)
// ===== 難度(P&D 式:同一基準表 × 倍率;中級=基準。staM=體力倍率、rwd=獎勵倍率、dt=詠唱手數增減、counter=摻反制屬敵) =====
const DIFFS=[
  {key:'baby',     name:'入門',emoji:'👶',hp:0.7, atk:0.3, dt:+2, staM:0.5, rwd:0.3, rec:'亂玩都過',baby:true,    col:0xff9ec4},
  {key:'beginner', name:'初級',emoji:'🌱',hp:0.7, atk:0.7, dt:+1, staM:0.7, rwd:0.7, rec:'別全帶被剋',           col:0x8fd16a},
  {key:'normal',   name:'中級',emoji:'⚔️',hp:1.0, atk:1.0, dt:0,  staM:1.0, rwd:1.0, rec:'對屬 2 張',            col:0x6ab0e0},
  {key:'advanced', name:'上級',emoji:'🔥',hp:1.35,atk:1.35,dt:0,  staM:1.3, rwd:1.5, rec:'卡 LV5+', counter:true, col:0xe0a64a},
  {key:'super',    name:'超級',emoji:'💀',hp:1.65,atk:1.45,dt:-1, staM:1.6, rwd:2.2, rec:'卡 LV10+',counter:true, col:0xe0653a},
  {key:'hell',     name:'地獄',emoji:'☠️',hp:2.4, atk:1.8, dt:-1, staM:2.0, rwd:3.5, rec:'卡 LV20', counter:true, col:0xb44ae0},
];
const DIFFS_BY={}; DIFFS.forEach(d=>DIFFS_BY[d.key]=d);
function counterOf(el){return Object.keys(_ELref).find(k=>_ELref[k].beats===el);}   // 回傳「剋 el」的屬性(x.beats===el)
// 敵人兵種(敵種變化):atkM/hpM=數值倍率(永遠套),beh=招牌行為(上級↑才開);元素只管相剋+屬區,兵種管行為+數值
const ARCH={
  grunt:    {n:'雜兵',  atkM:0.7, hpM:0.7, beh:null},
  artillery:{n:'重炮兵',atkM:1.7, hpM:0.7, beh:null},        // 高攻低血→要速殺
  heavy:    {n:'重甲',  atkM:0.7, hpM:1.8, beh:'hit'},       // 高血+HIT護盾
  guard:    {n:'守衛',  atkM:0.85,hpM:1.4, beh:'combo'},     // combo護盾
  caster:   {n:'術士',  atkM:0.9, hpM:0.9, beh:'paralyze'},  // 盤面技:麻痺鎖塊
  healer:   {n:'補師',  atkM:0.7, hpM:1.2, beh:'healAlly'},  // 治療全體友軍→先秒它
  hexer:    {n:'咒術士',atkM:0.95,hpM:0.95,beh:'burn'},      // 灼燒 DoT
  archmage: {n:'大術士',atkM:0.9, hpM:1.3, beh:'junk'},      // 封鎖:在盤面塞詛咒塊(填滿不能放,清線才除)
};

// ===== (b) 難度「結構」修飾引擎:base stages 套規則 → 各難度連「關數/每關怪數」都不同,不只 hp/atk 倍率 =====
// 數值倍率(hp/atk/dt)仍在 DIFFS;這裡只管「結構」。base = DUNGEONS[x].stages(= 中級基準)。
// ⚠️ slice1:DIFF_RULES 全 identity(stageDelta/swarmAdd=0)→ resolveStages 回傳 = base 全等,行為不變;slice2 再填真規則。
const DIFF_RULES = {
  baby:     { stageDelta:0, swarmAdd:0 },                      // 維持 base(序章固定走這,S1=1 S2=2)
  beginner: { stageDelta:0, swarmAdd:0 },                      // 維持 base
  normal:   { stageDelta:0, swarmAdd:0, stageCounts:[2,3,null] },  // 中級:S1=2雜兵、S2=3雜兵、S3(王關)不變
  advanced: { stageDelta:0, swarmAdd:0, stageCounts:[2,5,null] },  // 上級:S1=2雜兵、S2=5雜兵、S3(王關)不變
  super:    { stageDelta:0, swarmAdd:0 },                      // 先不變
  hell:     { stageDelta:0, swarmAdd:0 },                      // 先不變
};
// 單關覆寫逃生口:OVERRIDES['dungeonId:diffKey'] = 完整 stages 陣列 → 完全取代(特例手調用,九成關卡用不到)
const OVERRIDES = {
  // 召喚之塔·初級:第一關改成 5 隻敵(前3後2陣型展示);S2、S3(魔王)沿用 base。塔不在 ELEM_DUNGEONS,stageCounts 對它無效→用覆寫
  'tower:beginner': [
    { es: [
      { el: 'fire',    hp: 800, atk: 120, turns: 2 },
      { el: 'water',   hp: 800, atk: 120, turns: 2 },
      { el: 'thunder', hp: 800, atk: 120, turns: 2 },
      { el: 'earth',   hp: 800, atk: 120, turns: 2 },
      { el: 'wind',    hp: 800, atk: 120, turns: 2 },
    ] },
    ...DUNGEONS.tower.stages.slice(1),
  ],
  // 火之火山·初級=哥布林畜力技教學關(把中級的「終結蓄力」機制下放到初級,讓玩家先學打斷)。tier=哥布林星級貼圖(1/2/3星),beh:'finisher'+finStages:3(CD4→倒數CD3/2/1顯示蓄力)+finPct 直接指定(繞過初級 noSkill),finAnyHit:任何屬性打到牠都能中止(初級寬鬆)。四屬酋長只放火城,魔王(酋長)留給中級↑
  'fire:beginner': [
    // S1:2星青年哥布林 ×1,CD式畜力(總CD4→倒數2顯示蓄力1階、1顯示2階、0放招)→教玩家「看CD倒數抓攻擊時機並打斷」
    { es: [ { el: 'fire', hp: 560, atk: 90, turns: 2, tier: 2, beh: 'finisher', finCD: 4, finStages: 3, finPct: 0.15, finAnyHit: true } ] },
    // S2:2星青年哥布林 ×2,都會畜力→兩隻同時倒數,得選一隻先斷
    { es: [ { el: 'fire', hp: 540, atk: 88, turns: 2, tier: 2, beh: 'finisher', finCD: 4, finStages: 3, finPct: 0.15, finAnyHit: true },
            { el: 'fire', hp: 540, atk: 88, turns: 2, tier: 2, beh: 'finisher', finCD: 4, finStages: 3, finPct: 0.15, finAnyHit: true } ] },
    // S3:1星哥布林(護衛) + 3星戰士哥布林=魔王(畜力,傷害略高,boss→1.4×放大站後排) + 1星哥布林(護衛)→中間戰士是魔王主威脅
    { es: [ { el: 'fire', hp: 520, atk: 85, turns: 2, tier: 1 },
            { el: 'fire', hp: 640, atk: 98, turns: 2, tier: 3, boss: true, beh: 'finisher', finCD: 4, finStages: 3, finPct: 0.18, finAnyHit: true },
            { el: 'fire', hp: 520, atk: 85, turns: 2, tier: 1 } ] },
  ],
  // 🦆風城=賊鴨:偷盤面已放的格,沒得偷→攻擊翻倍。★偷取量+CD 依星級固定(1★偷1/CD3、2★偷1/CD2、3★偷2/CD3、4★偷2/CD2);peck:1=賊鴨標記(實際量/CD 由星級推導,見 spawnStage;boss 無 tier=4★王)。魔王附加 peckTray(叼拖盤)/stealStored(吞屬塊)。中級↑跨屬護衛(方塊怪填充/補師/哥布林)靠 cardId 出對應貼圖,王關 noPun=關自動剋屬混搭避免多冒一隻
  'wind:baby': [
    { es: [ { el:'wind', hp:500, atk:70, turns:2, tier:1, peck:1 } ] },
    { es: [ { el:'wind', hp:480, atk:68, turns:2, tier:1, peck:1 },
            { el:'wind', hp:480, atk:68, turns:2, tier:1, peck:1 } ] },
    { es: [ { el:'wind', hp:460, atk:66, turns:2, tier:1, peck:1 },
            { el:'wind', hp:620, atk:80, turns:2, tier:2, boss:true, peck:1 },
            { el:'wind', hp:460, atk:66, turns:2, tier:1, peck:1 } ] },
  ],
  // 初級:王 3★＋叼盤
  'wind:beginner': [
    { es: [ { el:'wind', hp:560, atk:90, turns:2, tier:2, peck:1 } ] },
    { es: [ { el:'wind', hp:540, atk:88, turns:2, tier:2, peck:1 },
            { el:'wind', hp:540, atk:88, turns:2, tier:2, peck:1 } ] },
    { es: [ { el:'wind', hp:520, atk:85, turns:2, tier:1, peck:1 },
            { el:'wind', hp:660, atk:100, turns:2, tier:3, boss:true, peck:1, peckTray:true },
            { el:'wind', hp:520, atk:85, turns:2, tier:1, peck:1 } ] },
  ],
  // 中級:王 4★＋叼盤＋吞屬塊;右側2★方塊怪(填充,無機制)、左側1★賊鴨
  'wind:normal': [
    { es: [ { el:'wind', hp:640, atk:100, turns:2, tier:2, peck:1 },
            { el:'wind', hp:640, atk:100, turns:2, tier:2, peck:1 } ] },
    { es: [ { el:'wind', hp:600, atk:95, turns:2, tier:1, peck:1 },
            { el:'wind', hp:660, atk:100, turns:2, tier:2, peck:1 },
            { el:'wind', hp:600, atk:95, turns:2, tier:1, peck:1 } ] },
    { noPun:true, es: [ { el:'wind', hp:600, atk:95, turns:2, tier:1, peck:1 },
            { el:'wind', hp:1900, atk:200, turns:2, boss:true, peck:1, peckTray:true, stealStored:true },
            { el:'wind', hp:700, atk:100, turns:3, tier:2, cardId:'c70' } ] },
  ],
  // 上級:王 4★＋叼盤＋吞屬塊;右側2★方塊怪、左側2★賊鴨(補上級洞,不再退化成消屬塊)
  'wind:advanced': [
    { es: [ { el:'wind', hp:760, atk:118, turns:2, tier:3, peck:1 },
            { el:'wind', hp:760, atk:118, turns:2, tier:3, peck:1 } ] },
    { es: [ { el:'wind', hp:720, atk:112, turns:2, tier:2, peck:1 },
            { el:'wind', hp:760, atk:118, turns:2, tier:3, peck:1 },
            { el:'wind', hp:720, atk:112, turns:2, tier:2, peck:1 } ] },
    { noPun:true, es: [ { el:'wind', hp:760, atk:115, turns:2, tier:2, peck:1 },
            { el:'wind', hp:2100, atk:205, turns:2, boss:true, peck:1, peckTray:true, stealStored:true },
            { el:'wind', hp:800, atk:118, turns:3, tier:2, cardId:'c70' } ] },
  ],
  // 🤖雷城=鐵機人:放鐵塊卡位+清了不計攻擊。1星iron1無懲罰(教學)、2星iron1+2倍懲罰、3星連體iron2、4星連體iron3。turns→CD2。S3中間=boss站後
  'thunder:baby': [
    // S1:1星鐵機人 ×1(放1格,不懲罰→純認識鐵塊)
    { es: [ { el:'thunder', hp:500, atk:70, turns:1, tier:1, iron:1 } ] },
    // S2:1星 ×2
    { es: [ { el:'thunder', hp:480, atk:68, turns:1, tier:1, iron:1 },
            { el:'thunder', hp:480, atk:68, turns:1, tier:1, iron:1 } ] },
    // S3:1星護衛 ×2 + 2星大鐵機=魔王(中,放1格+2倍懲罰)
    { es: [ { el:'thunder', hp:460, atk:66, turns:1, tier:1, iron:1 },
            { el:'thunder', hp:620, atk:80, turns:1, tier:2, boss:true, iron:1, ironPunish:true },
            { el:'thunder', hp:460, atk:66, turns:1, tier:1, iron:1 } ] },
  ],
  'thunder:beginner': [
    // S1:2星大鐵機 ×1(放1格+2倍懲罰)
    { es: [ { el:'thunder', hp:560, atk:90, turns:2, tier:2, iron:1, ironPunish:true } ] },
    // S2:2星 ×2
    { es: [ { el:'thunder', hp:540, atk:88, turns:2, tier:2, iron:1, ironPunish:true },
            { el:'thunder', hp:540, atk:88, turns:2, tier:2, iron:1, ironPunish:true } ] },
    // S3:1星護衛 ×2 + 3星邪惡鐵機=魔王(中,連體2格鐵塊)
    { es: [ { el:'thunder', hp:520, atk:85, turns:2, tier:1, iron:1 },
            { el:'thunder', hp:640, atk:98, turns:2, tier:3, boss:true, iron:2, ironPunish:true },
            { el:'thunder', hp:520, atk:85, turns:2, tier:1, iron:1 } ] },
  ],
  'thunder:normal': [
    // S1:2星 ×2
    { es: [ { el:'thunder', hp:640, atk:100, turns:3, tier:2, iron:1, ironPunish:true },
            { el:'thunder', hp:640, atk:100, turns:3, tier:2, iron:1, ironPunish:true } ] },
    // S2:2星 ×2 + 3星(中,連體2格)
    { es: [ { el:'thunder', hp:640, atk:100, turns:3, tier:2, iron:1, ironPunish:true },
            { el:'thunder', hp:700, atk:105, turns:3, tier:3, iron:2, ironPunish:true },
            { el:'thunder', hp:640, atk:100, turns:3, tier:2, iron:1, ironPunish:true } ] },
    // S3:2星護衛 ×2 + 4星惡鐵王=魔王(中,連體3格)
    { es: [ { el:'thunder', hp:660, atk:100, turns:3, tier:2, iron:1, ironPunish:true },
            { el:'thunder', hp:1900, atk:200, turns:3, boss:true, iron:3, ironPunish:true },
            { el:'thunder', hp:660, atk:100, turns:3, tier:2, iron:1, ironPunish:true } ] },
  ],
  'thunder:advanced': [
    // S1:3星邪惡鐵機 ×2(連體2格,盤面壓力大)
    { es: [ { el:'thunder', hp:640, atk:100, turns:3, tier:3, iron:2, ironPunish:true },
            { el:'thunder', hp:640, atk:100, turns:3, tier:3, iron:2, ironPunish:true } ] },
    // S2:3星 ×2 + 2星 ×1(上級自動混入1隻風屬剋敵)
    { es: [ { el:'thunder', hp:640, atk:100, turns:3, tier:3, iron:2, ironPunish:true },
            { el:'thunder', hp:640, atk:100, turns:3, tier:3, iron:2, ironPunish:true },
            { el:'thunder', hp:600, atk:95, turns:3, tier:2, iron:1, ironPunish:true } ] },
    // S3:3星護衛 ×2 + 4星惡鐵王=魔王(中,連體3格)
    { es: [ { el:'thunder', hp:680, atk:100, turns:3, tier:3, iron:2, ironPunish:true },
            { el:'thunder', hp:1900, atk:200, turns:3, boss:true, iron:3, ironPunish:true },
            { el:'thunder', hp:680, atk:100, turns:3, tier:3, iron:2, ironPunish:true } ] },
  ],
  // 🩹水城=史萊姆醫療隊:全員都會補(隊友<½→補,補量依星級 1星¼/2星⅓/3星+½),CD2→逼玩家集火秒殺(用土剋屬爆一隻,趁CD空檔)。4星博士=補+復活(2次)。3隻關前2後1(中間站後)
  'water:baby': [
    { es: [ { el:'water', hp:520, atk:78, turns:2, tier:1, beh:'healAlly', healPct:0.25, healCD:2 },
            { el:'water', hp:520, atk:78, turns:2, tier:1, beh:'healAlly', healPct:0.25, healCD:2 } ] },
    { es: [ { el:'water', hp:500, atk:76, turns:2, tier:1, beh:'healAlly', healPct:0.25, healCD:2 },
            { el:'water', hp:500, atk:76, turns:2, tier:1, beh:'healAlly', healPct:0.25, healCD:2 },
            { el:'water', hp:500, atk:76, turns:2, tier:1, beh:'healAlly', healPct:0.25, healCD:2 } ] },
    { es: [ { el:'water', hp:500, atk:76, turns:2, tier:1, beh:'healAlly', healPct:0.25, healCD:2 },
            { el:'water', hp:600, atk:85, turns:2, tier:2, beh:'healAlly', healPct:0.33, healCD:2 },
            { el:'water', hp:500, atk:76, turns:2, tier:1, beh:'healAlly', healPct:0.25, healCD:2 } ] },
  ],
  'water:beginner': [
    { es: [ { el:'water', hp:560, atk:88, turns:2, tier:2, beh:'healAlly', healPct:0.33, healCD:2 },
            { el:'water', hp:560, atk:88, turns:2, tier:2, beh:'healAlly', healPct:0.33, healCD:2 } ] },
    { es: [ { el:'water', hp:540, atk:85, turns:2, tier:1, beh:'healAlly', healPct:0.25, healCD:2 },
            { el:'water', hp:600, atk:90, turns:2, tier:2, beh:'healAlly', healPct:0.33, healCD:2 },
            { el:'water', hp:540, atk:85, turns:2, tier:1, beh:'healAlly', healPct:0.25, healCD:2 } ] },
    { es: [ { el:'water', hp:540, atk:85, turns:2, tier:1, beh:'healAlly', healPct:0.25, healCD:2 },
            { el:'water', hp:680, atk:98, turns:2, tier:3, beh:'healAlly', healPct:0.5, healCD:2 },
            { el:'water', hp:540, atk:85, turns:2, tier:1, beh:'healAlly', healPct:0.25, healCD:2 } ] },
  ],
  'water:normal': [
    { es: [ { el:'water', hp:640, atk:100, turns:2, tier:2, beh:'healAlly', healPct:0.33, healCD:2 },
            { el:'water', hp:640, atk:100, turns:2, tier:2, beh:'healAlly', healPct:0.33, healCD:2 } ] },
    { es: [ { el:'water', hp:640, atk:100, turns:2, tier:2, beh:'healAlly', healPct:0.33, healCD:2 },
            { el:'water', hp:720, atk:108, turns:2, tier:3, beh:'healAlly', healPct:0.5, healCD:2 },
            { el:'water', hp:640, atk:100, turns:2, tier:2, beh:'healAlly', healPct:0.33, healCD:2 } ] },
    { es: [ { el:'water', hp:640, atk:100, turns:2, tier:2, beh:'healAlly', healPct:0.33, healCD:2 },
            { el:'water', hp:1900, atk:190, turns:2, boss:true, beh:'healAlly', healPct:0.5, healCD:2 },
            { el:'water', hp:640, atk:100, turns:2, tier:2, beh:'healAlly', healPct:0.33, healCD:2 } ] },
  ],
  'water:advanced': [
    { es: [ { el:'water', hp:760, atk:115, turns:2, tier:3, beh:'healAlly', healPct:0.5, healCD:2 },
            { el:'water', hp:760, atk:115, turns:2, tier:3, beh:'healAlly', healPct:0.5, healCD:2 } ] },
    { es: [ { el:'water', hp:760, atk:115, turns:2, tier:3, beh:'healAlly', healPct:0.5, healCD:2 },
            { el:'water', hp:760, atk:115, turns:2, tier:3, beh:'healAlly', healPct:0.5, healCD:2 },
            { el:'water', hp:700, atk:110, turns:2, tier:2, beh:'healAlly', healPct:0.33, healCD:2 } ] },
    { es: [ { el:'water', hp:760, atk:115, turns:2, tier:3, beh:'healAlly', healPct:0.5, healCD:2 },
            { el:'water', hp:2100, atk:200, turns:2, boss:true, beh:'healAlly', healPct:0.5, healCD:2 },
            { el:'water', hp:760, atk:115, turns:2, tier:3, beh:'healAlly', healPct:0.5, healCD:2 } ] },
  ],
  // 🧱土城=牆怪:每隻帶盾(擋傷),清到門檻破盾+當手加成傷;破盾後花CD2詠唱重建盾、雷(剋土)可中止重建。大清(HIT15+)一次破多面盾。門檻:1星HIT12/2星COMBO2/3星HIT15/4星隨機。3隻關前2後1
  // 入門/初級=教學梯度:S1/S2 全 combo 盾(教「連續清破盾」),S3 中間魔王才是 HIT 盾(教「爆發破盾」)。門檻 入門HIT12<初級HIT15
  'earth:baby': [
    { es: [ { el:'earth', hp:600, atk:80, turns:2, tier:1, beh:'shield', shieldKind:'combo', comboGate:2 } ] },
    { es: [ { el:'earth', hp:580, atk:78, turns:2, tier:1, beh:'shield', shieldKind:'combo', comboGate:2 },
            { el:'earth', hp:580, atk:78, turns:2, tier:1, beh:'shield', shieldKind:'combo', comboGate:2 } ] },
    { es: [ { el:'earth', hp:580, atk:78, turns:2, tier:1, beh:'shield', shieldKind:'combo', comboGate:2 },
            { el:'earth', hp:700, atk:88, turns:2, tier:2, beh:'shield', shieldKind:'hit', hitGate:12 },
            { el:'earth', hp:580, atk:78, turns:2, tier:1, beh:'shield', shieldKind:'combo', comboGate:2 } ] },
  ],
  'earth:beginner': [
    { es: [ { el:'earth', hp:700, atk:92, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 },
            { el:'earth', hp:700, atk:92, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 } ] },
    { es: [ { el:'earth', hp:620, atk:85, turns:2, tier:1, beh:'shield', shieldKind:'combo', comboGate:2 },
            { el:'earth', hp:700, atk:92, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 },
            { el:'earth', hp:620, atk:85, turns:2, tier:1, beh:'shield', shieldKind:'combo', comboGate:2 } ] },
    { es: [ { el:'earth', hp:620, atk:85, turns:2, tier:1, beh:'shield', shieldKind:'combo', comboGate:2 },
            { el:'earth', hp:800, atk:100, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:15 },
            { el:'earth', hp:620, atk:85, turns:2, tier:1, beh:'shield', shieldKind:'combo', comboGate:2 } ] },
  ],
  'earth:normal': [
    { es: [ { el:'earth', hp:760, atk:100, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 },
            { el:'earth', hp:760, atk:100, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 } ] },
    { es: [ { el:'earth', hp:760, atk:100, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 },
            { el:'earth', hp:860, atk:110, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:15 },
            { el:'earth', hp:760, atk:100, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 } ] },
    { es: [ { el:'earth', hp:760, atk:100, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 },
            { el:'earth', hp:2200, atk:180, turns:2, boss:true, beh:'shield', shieldRandom:true },
            { el:'earth', hp:760, atk:100, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 } ] },
  ],
  'earth:advanced': [
    { es: [ { el:'earth', hp:920, atk:122, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:15 },
            { el:'earth', hp:920, atk:122, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:15 } ] },
    { es: [ { el:'earth', hp:920, atk:122, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:15 },
            { el:'earth', hp:920, atk:122, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:15 },
            { el:'earth', hp:820, atk:112, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 } ] },
    { es: [ { el:'earth', hp:920, atk:122, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:15 },
            { el:'earth', hp:2500, atk:195, turns:2, boss:true, beh:'shield', shieldRandom:true },
            { el:'earth', hp:920, atk:122, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:15 } ] },
  ],
  // ========== 超級/地獄:招牌機制頂配(hp/atk 再吃 df.hp 1.65/2.4、dt-1 更快)。設計:加機制強度不加血牆;超級拆輔助輪、地獄多頭+全員機制 ==========
  // 🔥火·超級:蓄力更快(finCD3)、finAnyHit關(只剩水剋屬能中止)、雜兵也蓄力。攻擊大幅拉高→弱隊撐不住(sim:原atk太軟連STARTER都輾過)
  'fire:super': [
    { es: [ { el:'fire', hp:820, atk:172, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.30 },
            { el:'fire', hp:820, atk:172, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.30 } ] },
    { es: [ { el:'fire', hp:800, atk:168, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.30 },
            { el:'fire', hp:800, atk:168, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.30 },
            { el:'fire', hp:800, atk:168, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.30 } ] },
    { es: [ { el:'fire', hp:820, atk:172, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.28 },
            { el:'fire', hp:2600, atk:300, turns:2, boss:true, beh:'finisher', finCD:3, finStages:3, finPct:0.38 },
            { el:'fire', hp:820, atk:172, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.28 } ] },
  ],
  // 🔥火·地獄:多頭蓄力全開、傷害再↑、finAnyHit關
  'fire:hell': [
    { es: [ { el:'fire', hp:900, atk:226, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.38 },
            { el:'fire', hp:900, atk:226, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.38 } ] },
    { es: [ { el:'fire', hp:880, atk:222, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.38 },
            { el:'fire', hp:880, atk:222, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.38 },
            { el:'fire', hp:880, atk:222, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.38 } ] },
    { es: [ { el:'fire', hp:900, atk:226, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.34 },
            { el:'fire', hp:2800, atk:378, turns:2, boss:true, beh:'finisher', finCD:3, finStages:3, finPct:0.52 },
            { el:'fire', hp:900, atk:226, turns:2, tier:3, beh:'finisher', finCD:3, finStages:3, finPct:0.34 } ] },
  ],
  // 🤖雷·超級:鐵塊更大(雜兵iron2、王iron3)、全員2倍懲罰。攻擊拉高。turns4→放置間隔2(避免灌爆盤)
  'thunder:super': [
    { es: [ { el:'thunder', hp:800, atk:172, turns:4, tier:3, iron:2, ironPunish:true },
            { el:'thunder', hp:800, atk:172, turns:4, tier:3, iron:2, ironPunish:true } ] },
    { es: [ { el:'thunder', hp:800, atk:172, turns:4, tier:3, iron:2, ironPunish:true },
            { el:'thunder', hp:800, atk:172, turns:4, tier:3, iron:2, ironPunish:true },
            { el:'thunder', hp:800, atk:172, turns:4, tier:3, iron:2, ironPunish:true } ] },
    { es: [ { el:'thunder', hp:820, atk:174, turns:4, tier:3, iron:2, ironPunish:true },
            { el:'thunder', hp:2600, atk:300, turns:4, boss:true, iron:3, ironPunish:true },
            { el:'thunder', hp:820, atk:174, turns:4, tier:3, iron:2, ironPunish:true } ] },
  ],
  // 🤖雷·地獄:雜兵iron3、王iron4(L型大塊),全員懲罰,攻擊再↑
  'thunder:hell': [
    { es: [ { el:'thunder', hp:880, atk:196, turns:4, tier:3, iron:3, ironPunish:true },
            { el:'thunder', hp:880, atk:196, turns:4, tier:3, iron:3, ironPunish:true } ] },
    { es: [ { el:'thunder', hp:880, atk:196, turns:4, tier:3, iron:3, ironPunish:true },
            { el:'thunder', hp:920, atk:200, turns:4, tier:3, iron:3, ironPunish:true },
            { el:'thunder', hp:880, atk:196, turns:4, tier:3, iron:3, ironPunish:true } ] },
    { es: [ { el:'thunder', hp:900, atk:198, turns:4, tier:3, iron:3, ironPunish:true },
            { el:'thunder', hp:2800, atk:330, turns:4, boss:true, iron:4, ironPunish:true },
            { el:'thunder', hp:900, atk:198, turns:4, tier:3, iron:3, ironPunish:true } ] },
  ],
  // 🦆風·超級:雜兵3★(偷2/CD3)、王4★＋叼盤＋吞屬塊;右側2★補師(水,逼你先爆補師/秒王)、左側2★賊鴨。noPun 關自動剋屬
  'wind:super': [
    { es: [ { el:'wind', hp:800, atk:230, turns:2, tier:3, peck:1 },
            { el:'wind', hp:800, atk:230, turns:2, tier:3, peck:1 } ] },
    { es: [ { el:'wind', hp:800, atk:230, turns:2, tier:3, peck:1 },
            { el:'wind', hp:800, atk:230, turns:2, tier:3, peck:1 },
            { el:'wind', hp:800, atk:230, turns:2, tier:3, peck:1 } ] },
    { noPun:true, es: [ { el:'wind', hp:800, atk:230, turns:2, tier:2, peck:1 },
            { el:'wind', hp:2600, atk:370, turns:2, boss:true, peck:1, peckTray:true, stealStored:true },
            { el:'water', hp:860, atk:175, turns:2, tier:2, cardId:'c57', beh:'healAlly', healPct:0.33, healCD:2 } ] },
  ],
  // 🦆風·地獄:雜兵3★、王4★＋叼盤＋吞屬塊;右側2★補師(水)、左側2★哥布林(火·蓄力→水打斷)。偷塊+補血+蓄力三機制同台。noPun
  'wind:hell': [
    { es: [ { el:'wind', hp:900, atk:270, turns:2, tier:3, peck:1 },
            { el:'wind', hp:900, atk:270, turns:2, tier:3, peck:1 } ] },
    { es: [ { el:'wind', hp:900, atk:270, turns:2, tier:3, peck:1 },
            { el:'wind', hp:900, atk:270, turns:2, tier:3, peck:1 },
            { el:'wind', hp:900, atk:270, turns:2, tier:3, peck:1 } ] },
    { noPun:true, es: [ { el:'fire', hp:900, atk:270, turns:2, tier:2, cardId:'c41', beh:'finisher', finCD:3, finStages:3, finPct:0.28 },
            { el:'wind', hp:2800, atk:420, turns:2, boss:true, peck:1, peckTray:true, stealStored:true },
            { el:'water', hp:940, atk:195, turns:2, tier:2, cardId:'c57', beh:'healAlly', healPct:0.35, healCD:2 } ] },
  ],
  // 🧱土·超級:雜兵門檻升 HIT18(大清才破)、王隨機盾(HIT15/COMBO3 每次重建換)
  'earth:super': [
    { es: [ { el:'earth', hp:980, atk:128, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:18 },
            { el:'earth', hp:980, atk:128, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:18 } ] },
    { es: [ { el:'earth', hp:980, atk:128, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:18 },
            { el:'earth', hp:900, atk:120, turns:2, tier:3, beh:'shield', shieldKind:'combo', comboGate:3 },
            { el:'earth', hp:980, atk:128, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:18 } ] },
    { es: [ { el:'earth', hp:980, atk:128, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:18 },
            { el:'earth', hp:2600, atk:200, turns:2, boss:true, beh:'shield', shieldRandom:true },
            { el:'earth', hp:980, atk:128, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:18 } ] },
  ],
  // 🧱土·地獄:全員隨機盾(每次重建盾型隨機,難預判),王高血隨機盾
  'earth:hell': [
    { es: [ { el:'earth', hp:1040, atk:136, turns:2, tier:3, beh:'shield', shieldRandom:true },
            { el:'earth', hp:1040, atk:136, turns:2, tier:3, beh:'shield', shieldRandom:true } ] },
    { es: [ { el:'earth', hp:1040, atk:136, turns:2, tier:3, beh:'shield', shieldRandom:true },
            { el:'earth', hp:1040, atk:136, turns:2, tier:3, beh:'shield', shieldRandom:true },
            { el:'earth', hp:1040, atk:136, turns:2, tier:3, beh:'shield', shieldRandom:true } ] },
    { es: [ { el:'earth', hp:1040, atk:136, turns:2, tier:3, beh:'shield', shieldRandom:true },
            { el:'earth', hp:2800, atk:210, turns:2, boss:true, beh:'shield', shieldRandom:true },
            { el:'earth', hp:1040, atk:136, turns:2, tier:3, beh:'shield', shieldRandom:true } ] },
  ],
  // 🩹水·超級:超級只有魔王自動補(covered=boss)→做「攻擊手+1補師+會補會復活的王」,先清補師再爆王的DPS check。攻擊拉高
  'water:super': [
    { es: [ { el:'water', hp:820, atk:170, turns:2, tier:3 },
            { el:'water', hp:880, atk:130, turns:2, tier:3, beh:'healAlly', healPct:0.33, healCD:2 } ] },
    { es: [ { el:'water', hp:820, atk:170, turns:2, tier:3 },
            { el:'water', hp:880, atk:130, turns:2, tier:3, beh:'healAlly', healPct:0.33, healCD:2 },
            { el:'water', hp:820, atk:170, turns:2, tier:3 } ] },
    { es: [ { el:'water', hp:820, atk:170, turns:2, tier:3, beh:'healAlly', healPct:0.33, healCD:2 },
            { el:'water', hp:2300, atk:270, turns:2, boss:true, beh:'healAlly', healPct:0.40, healCD:2, reviveMax:1 },
            { el:'water', hp:820, atk:170, turns:2, tier:3 } ] },
  ],
  // 🩹水·地獄:地獄全員自動補(covered=all)→補量從0.55砍到0.28、王血砍低,不然對AI是無限牆(sim原本只5~33%)。王仍復活
  'water:hell': [
    { es: [ { el:'water', hp:900, atk:185, turns:2, tier:3, beh:'healAlly', healPct:0.28, healCD:2 },
            { el:'water', hp:900, atk:185, turns:2, tier:3, beh:'healAlly', healPct:0.28, healCD:2 } ] },
    { es: [ { el:'water', hp:900, atk:185, turns:2, tier:3, beh:'healAlly', healPct:0.28, healCD:2 },
            { el:'water', hp:940, atk:190, turns:2, tier:3, beh:'healAlly', healPct:0.28, healCD:2 },
            { el:'water', hp:900, atk:185, turns:2, tier:3, beh:'healAlly', healPct:0.28, healCD:2 } ] },
    { es: [ { el:'water', hp:900, atk:185, turns:2, tier:3, beh:'healAlly', healPct:0.28, healCD:2 },
            { el:'water', hp:2200, atk:290, turns:2, boss:true, beh:'healAlly', healPct:0.32, healCD:2, reviveMax:2 },
            { el:'water', hp:900, atk:185, turns:2, tier:3, beh:'healAlly', healPct:0.28, healCD:2 } ] },
  ],
};

function _cloneStages(stages){ return stages.map(st=>({...st, es:st.es.map(e=>({...e}))})); }   // 深拷貝,避免改到原始 base
function _bossIndex(stages){ for(let i=stages.length-1;i>=0;i--) if(stages[i].es.some(e=>e.boss)) return i; return stages.length-1; }

// 解析某 (dungeon, 難度) 的有效 stages:① 覆寫優先 → ② 否則 base 深拷貝套 DIFF_RULES
function resolveStages(dungeon, diffKey){
  const ov = OVERRIDES[dungeon.id + ':' + diffKey];
  if(ov) return _cloneStages(ov);
  const rule = DIFF_RULES[diffKey] || {};
  let stages = _cloneStages(dungeon.stages);
  // ① 群怪追加:標 swarm:true 的關,每關 +swarmAdd 隻(複製該關非王雜兵)
  if(rule.swarmAdd>0) stages.forEach(st=>{ if(st.swarm){ const proto=st.es.find(e=>!e.boss)||st.es[0]; for(let i=0;i<rule.swarmAdd;i++) st.es.push({...proto}); } });
  // ② 關數:>0 在王關前插「群怪關」(複製最後一個非王關);<0 移除最前面的非王關(王關永留)
  const bi=_bossIndex(stages);
  if(rule.stageDelta>0){ const tmpl=stages[Math.max(0,bi-1)]; const extra=[]; for(let i=0;i<rule.stageDelta;i++) extra.push(_cloneStages([tmpl])[0]); stages.splice(bi,0,...extra); }
  else if(rule.stageDelta<0){ let rm=-rule.stageDelta; for(let i=0;i<stages.length&&rm>0;){ if(!stages[i].es.some(e=>e.boss)&&stages.length>1){ stages.splice(i,1); rm--; } else i++; } }
  // ③ 每關「雜兵數」(僅標準五屬關):stageCounts[i]=該關非王總雜兵數(null=不變)。
  //    保留原本兵種安排(含重炮兵/術士等 arch),只「補純雜兵」到目標數;王關不動。
  if(rule.stageCounts && ELEM_DUNGEONS.indexOf(dungeon.id)>=0){
    stages.forEach((st,i)=>{
      const want=rule.stageCounts[i]; if(want==null) return;
      const bosses=st.es.filter(e=>e.boss);
      const mobs=st.es.filter(e=>!e.boss);                          // 保留原本雜兵(含 arch)
      if(mobs.length<want){
        const ref=mobs.find(e=>!e.arch)||mobs[0]||st.es[0];          // 純雜兵原型(優先無 arch 那隻)
        const plain={el:ref.el, hp:ref.hp, atk:ref.atk, turns:ref.turns};   // 只複製數值,不帶 arch
        for(let k=mobs.length;k<want;k++) mobs.push({...plain});      // 補純雜兵到目標數
      }
      st.es=[...mobs, ...bosses];
    });
  }
  // 🔥火城魔王貼圖分級:入門(baby)=2星青年哥布林、初級=3星戰士(OVERRIDE 內設)、中級↑無 tier→4星酋長→難度越高魔王越大。tier 只影響貼圖,不改數值/sim
  if(dungeon.id==='fire' && diffKey==='baby') stages.forEach(st=>st.es.forEach(e=>{ if(e.boss){ if(!e.tier) e.tier=2; e.beh='finisher'; e.finCD=4; e.finStages=3; e.finPct=0.12; e.finAnyHit=true; } }));   // 入門魔王=畜力教學:同CD4、倒數CD3/2/1顯示蓄力、低傷、任何攻擊可打斷→讓新手提早習慣畜力技(beh 直接指定→繞過 baby noSkill)
  return stages;
}

// ===== headless 生敵(#16 ④):與場景 spawnEnemies 同一份 model 數學(無 Phaser)→ 場景與 sim 共用同一份生敵 =====
const BOSS_ATK_MUL = 1.3;    // 魔王攻擊額外倍率(魔王一拳更痛)
const ENEMY_HP_MUL = 1.8;    // 全域敵 HP 倍率(敵更耐打)
const ENEMY_ATK_MUL = 1.0;   // 全域敵 atk 倍率(1.0=純資料值×難度,不灌水;高難靠 df.atk 疊)
// 🔩分層鐵塊(lock)階梯:只有雷城鐵機人(d.iron>0)吃這張表,依難度 dk × 是否魔王(d.boss)決定該顆鐵塊要清幾次才真的消
//   入門/初級/中級=雜兵魔王都 1 層(維持現況);上級=雜兵1/魔王2;超級/地獄=雜兵2/魔王3(只有魔王吃高層)。ironPunish 現況不動,由各關卡定義自己的 ironPunish 決定要不要罰
const IRON_LOCK_LADDER = {
  baby:      { grunt: 1, boss: 1 },
  beginner:  { grunt: 1, boss: 1 },
  normal:    { grunt: 1, boss: 1 },
  advanced:  { grunt: 1, boss: 2 },
  super:     { grunt: 2, boss: 3 },
  hell:      { grunt: 2, boss: 3 },
};

// 招牌行為 → 護盾/DoT 數值(依難度 dk);spawnStage 與 phaseCheck 共用同一份
// beh → 敵人數值旗標。full=true 完整版(魔王),false 輕鬆版(小關雜兵);率型再吃難度倍率 dm。
function behGates(beh, dk, full){
  const g={hitGate:0,comboGate:0,dot:0,regen:0,paralyze:0,healAlly:0,junk:0,finisher:0,eatStored:0};
  if(!beh) return g;
  const lite=!full, dm={baby:0.6,beginner:0.8,normal:1,advanced:1.3,super:1.5,hell:1.8}[dk]||1;
  if(beh==='hit')          g.hitGate  = lite? 8 : 15;
  else if(beh==='combo')   g.comboGate= lite? 2 : 3;
  else if(beh==='burn')    g.dot      = (lite?0.015:0.03)*dm;
  else if(beh==='regen')   g.regen    = (lite?0.03:0.06)*dm;
  else if(beh==='paralyze')g.paralyze = 1;                 // ⚡麻痺:值=每塊被鎖的回合數(中級=1);CD(術士2/魔王1)由 applyParalyze 依 boss 決定
  else if(beh==='healAlly')g.healAlly = (lite?0.10:0.20)*dm;        // 補師:回全體比例(雜兵 10% / 完整=魔王 20%)
  else if(beh==='junk')    g.junk     = lite? 4 : 2;                 // 封鎖:間隔(越小越頻;lite 較少)
  else if(beh==='finisher')g.finisher = (lite?0.4:0.6)*dm;          // 🔥終結:大招傷害佔 maxHP(要有感;lite≈40%、full≈60%)
  else if(beh==='eatStored')g.eatStored= lite? 1 : 99;              // 🌪️消屬塊:1=−1LV、99=整個消掉
  else if(beh==='shield')   g.shield   = 1;                        // 🛡土護盾:標記(實際盾型 hit/combo 由 spawnStage 依關卡設)
  return g;
}

// ===== 每日修煉(daily_*)專用生敵 — 2026-08-17 新增 =====
// spec-daily-stages.md 檔頭:「每日關固定以 normal 難度評估,不吃 DIFFS 倍率、不吃五屬城 stageCounts/OVERRIDES」,
// 「引擎會再套 ENEMY_HP_MUL×1.8、boss 另×BOSS_ATK_MUL 1.3」。DAILY_DUNGEONS 的每隻怪定義已是「顯式完整」
// (tier/beh/finCD/finPct/healPct/shieldKind/hitGate/iron/peck/cardId 全部直接寫在 data-stages.js),
// 不需要 spawnStage() 給五屬城 base 資料用的那套「myBeh 自動注入/pun 反制混搭/noSkill/covered」推導,
// 所以獨立一份精簡版生敵,不呼叫 resolveStages(daily 走 GameScene.this.dungeon=DAILY_DUNGEONS[id] 時,
// resolveStages 對不在 ELEM_DUNGEONS/OVERRIDES 的 id 本來就是 no-op,兩邊對得上,只是這裡不繞這條路更直接)。
function spawnDailyStage(dungeonId, stageIdx, moneyDay){   // 🆕2026-08-20 moneyDay=true:多金日金屬怪原位換金錢怪(c71→c74/c72→c75/c73→c76,見 spec-daily-island §4),killEnemy 收集後 run/complete 發金錢卡、玩家分解換金幣
  const dungeon=DAILY_DUNGEONS[dungeonId]; if(!dungeon) return [];
  const stg=dungeon.stages[stageIdx]; if(!stg) return [];
  const dk='normal';
  return stg.es.map((d)=>{
    const hp=Math.max(1,Math.round(d.hp*ENEMY_HP_MUL)),
          atk=Math.max(1,Math.round(d.atk*(d.boss?BOSS_ATK_MUL:1)*ENEMY_ATK_MUL)),
          turns=Math.max(1,d.turns||1);
    const beh=d.beh||null;   // 'none'(金屬怪守門值)→ behGates 對未知字串回全零 gate,等同無 beh
    const g=behGates(beh, dk, true);
    if(d.finPct!=null) g.finisher=d.finPct;
    if(d.healPct!=null) g.healAlly=d.healPct;
    if(g.shield){
      if(d.shieldRandom){ g.shieldRandom=true; g.shieldKind='hit'; g.hitGate=15; g.comboGate=0; }
      else if(d.shieldKind){ g.shieldKind=d.shieldKind; if(d.shieldKind==='combo'){ g.comboGate=d.comboGate||2; g.hitGate=0; } else { g.hitGate=d.hitGate||15; g.comboGate=0; } }
      const _lk=({1:0.4,2:0.25,3:0.1})[d.tier]; g.shieldLeak=(d.shieldLeak!=null)?d.shieldLeak:(d.boss?0:((_lk!=null)?_lk:0));
    }
    let tierV=d.tier||0, finCDV=d.finCD||0, finStagesV=d.finStages||0;
    let peckN=d.peck||0, peckCD=0;
    if(d.peck>0){ const st=d.boss?(tierV||4):(tierV||1); const P=({1:[1,3],2:[1,2],3:[2,3],4:[2,2]})[st]||[1,2]; peckN=P[0]; peckCD=P[1]; }
    const ival=(finCDV>0)?finCDV:(peckCD>0)?peckCD:(d.healCD>0)?d.healCD:((g.healAlly>0||(g.eatStored>0&&d.boss)||(g.paralyze>0&&d.boss))?1:turns);
    const ironLockV=(d.iron>0)?((d.lock!=null)?d.lock:(IRON_LOCK_LADDER.normal[d.boss?'boss':'grunt'])):0;
    const stageHasBoss=stg.es.some(x=>x.boss);
    return {el:d.el,max:hp,hp:hp,atk:atk,interval:ival,timer:Math.max(2,ival),burn:0,dead:false,boss:!!d.boss,guard:(!d.boss&&stageHasBoss),
      ...g,phases:null,phaseIdx:0,arch:null,tier:tierV,finStages:finStagesV,finAnyHit:!!d.finAnyHit,finCD:finCDV,
      cardId:((moneyDay&&d.cardId)?(({c71:'c74',c72:'c75',c73:'c76'})[d.cardId]||d.cardId):(d.cardId||null)),peck:peckN,peckTray:!!d.peckTray,stealStored:!!d.stealStored,iron:d.iron||0,ironPunish:!!d.ironPunish,
      ...(d.iron>0?{lock:ironLockV}:{}),reviveMax:(d.reviveMax!=null?d.reviveMax:2)};
  });
}

// 生成某 (dungeon, 難度, 第 stageIdx 關;0 起) 的敵人模型陣列。timer 寬限:開局第1關(stageIdx0)+2。
function spawnStage(dungeonId, diffKey, stageIdx, moneyDay){
  if(typeof dungeonId==='string' && dungeonId.indexOf('daily_')===0) return spawnDailyStage(dungeonId, stageIdx, moneyDay);   // 🆕每日修煉(daily_*):固定敵組,不吃 DIFFS/stageCounts/OVERRIDES,見 spawnDailyStage 註解;moneyDay 轉傳(多金日換金錢怪)
  const dungeon=DUNGEONS[dungeonId]; if(!dungeon) return [];
  const df=DIFFS_BY[diffKey]||DIFFS_BY.normal;
  const _stg=resolveStages(dungeon, diffKey)[stageIdx], defs=_stg.es;
  let pun=null; if(df.counter&&dungeon.el&&!_stg.noPun){const C=counterOf(dungeon.el); pun=counterOf(C);} let punished=false;   // 反制混搭:上級↑元素關塞一隻懲罰屬;⚠️_stg.noPun=該關已手動指定跨屬護衛(如風城王關)→關掉自動混搭,免得多冒一隻/元素打架
  const dk=df.key, dEl=dungeon.el, SIG={fire:'finisher',water:'healAlly',thunder:'paralyze',earth:'shield',wind:'eatStored'}, myBeh=SIG[dEl];   // 五屬城中級招定案(火終結/水補師/雷麻痺/土護盾/風消屬塊)
  const covered=(d)=>{ if(dk==='advanced'||dk==='super')return !!d.boss; if(dk==='hell')return true; return false; };   // 上級/超級僅魔王(完整版),地獄全敵。中級的梯度另在下方 beh 指派處理
  const noSkill=(dk==='baby'||dk==='beginner');   // 嬰兒/初級:純數值,無技
  const stageHasBoss=defs.some(x=>x.boss);
  const specialIdx = stageHasBoss ? -1 : (stageIdx===0 ? defs.length-1 : Math.floor(defs.length/2));   // 城內梯度:小關(無魔王)哪隻雜兵帶特殊技→第1關(S1)最右、其餘小關(S2…)中間
  return defs.map((d,idx)=>{
    let el=d.el; if(pun&&!punished&&d.el===dEl&&!d.boss){el=pun;punished=true;}
    const A=(d.arch&&ARCH[d.arch])||null;
    const hp=Math.max(1,Math.round(d.hp*df.hp*(A?A.hpM:1)*ENEMY_HP_MUL)),
          atk=Math.max(1,Math.round(d.atk*df.atk*(A?A.atkM:1)*(d.boss?BOSS_ATK_MUL:1)*ENEMY_ATK_MUL)),
          turns=Math.max(1,d.turns+(df.dt||0)-1);
    const phases=d.phases||null;
    let beh=null, full=false;
    if(phases){ el=phases[0].el; beh=phases[0].beh; full=true; }                          // 魔王變身:完整版
    else if(d.beh){ beh=d.beh; full=(d.full===true); }                                    // 🔧OVERRIDE 直接指定行為→繞過嬰兒/初級 noSkill(特例手調用):初級也能掛畜力技等
    else if(A){ full=covered(d); beh=full?A.beh:null; }                                   // 兵種行為:covered(上級魔王/地獄)才開
    else if(myBeh && !noSkill && !d.peck && !d.iron){                                     // 屬城招:中級起開(嬰兒/初級無);⚠️d.peck(🦆賊鴨)、d.iron(🤖鐵機人)排除→避免自動注入的屬城招(風=eatStored/雷=paralyze)蓋過牠們自己的 peck/iron 派工(endHand 判斷順序 eatStored 排在 peck 前面,兩者都非0會讓 _eatAct 搶走本該給 _peckAct 的手,連帶 interval 算式也會被 eatStored 分支劫走)
      if(d.boss){ beh=myBeh; full=true; }                                                 // 魔王 = 完整版
      else if(covered(d)){ beh=myBeh; full=true; }                                        // 地獄雜兵 = 完整
      else if(!stageHasBoss && idx===specialIdx){ beh=myBeh; full=false; }    // 小關:指定位置的雜兵帶輕鬆版(S1右/S2中)
    }
    else if(dk==='hell'&&dEl&&!myBeh){ beh='hit'; full=true; }
    const g=behGates(beh, dk, full);
    if(d.finPct!=null) g.finisher=d.finPct;   // 🔧OVERRIDE 直接指定終結傷害佔 maxHP 比例(初級低傷教學用,蓋掉 behGates 的 0.4/0.6)
    if(d.healPct!=null) g.healAlly=d.healPct;   // 🩹史萊姆:補血量佔隊友 maxHP 比例(1星0.25/2星0.33/3星+0.5),蓋掉 behGates 預設
    if(g.shield){   // 🛡盾型:優先吃 OVERRIDE(shieldRandom/shieldKind/門檻),否則舊預設(S1連段2、S2+HIT15)
      if(d.shieldRandom){ g.shieldRandom=true; g.shieldKind='hit'; g.hitGate=15; g.comboGate=0; }   // 4星城牆王:每次重建隨機 HIT15/COMBO3(初始hit15,重建時 _shieldAct 擲)
      else if(d.shieldKind){ g.shieldKind=d.shieldKind; if(d.shieldKind==='combo'){ g.comboGate=d.comboGate||2; g.hitGate=0; } else { g.hitGate=d.hitGate||15; g.comboGate=0; } }
      else { const kind=(stageIdx===0)?'combo':'hit'; if(kind==='combo'){g.comboGate=2;g.hitGate=0;}else{g.hitGate=15;g.comboGate=0;} g.shieldKind=kind; }
      // 減傷盾(hybrid,全難度):盾住時「放行」部分傷害(不再全擋),星越高漏越少(1★漏50%/2★漏30%/3★漏10%);
      //   魔王(4★石頭王)漏0=全擋、非破盾打不動。仍保留破盾(達 HIT/combo 門檻→該手全額+50%)。
      { const _lk=({1:0.4,2:0.25,3:0.1})[d.tier]; g.shieldLeak=(d.shieldLeak!=null)?d.shieldLeak:(d.boss?0:((_lk!=null)?_lk:0)); }
    }
    // 🔥火城畜力技統一 CD式(CD4、倒數CD3/2/1顯示蓄力):中級雜兵(S1右/S2中)+魔王都套;地獄雜兵(full 非魔王)維持原樣。雜兵給2星哥布林貼圖,魔王維持自身貼圖(中級↑=4星酋長、初級=3星戰士)。||=OVERRIDE 明確值優先
    let tierV=d.tier||0, finCDV=d.finCD||0, finStagesV=d.finStages||0;
    if(dEl==='fire' && g.finisher>0 && !phases && (!full || d.boss)){ finCDV=finCDV||4; finStagesV=finStagesV||3; if(!d.boss) tierV=tierV||2; }
    // 🦆賊鴨:偷取量+CD 依星級固定(1★偷1/CD3、2★偷1/CD2、3★偷2/CD3、4★偷2/CD2;boss=4星)。d.peck>0=標記為賊鴨,實際量/CD 由星級推導(不看 d.peck 的值)
    let peckN=d.peck||0, peckCD=0;
    if(d.peck>0){ const st=d.boss?(tierV||4):(tierV||1); const P=({1:[1,3],2:[1,2],3:[2,3],4:[2,2]})[st]||[1,2]; peckN=P[0]; peckCD=P[1]; }   // boss 有 tier 用 tier(入門2★/初級3★),沒 tier=4★賊鴨王
    const ival=(finCDV>0)?finCDV:(peckCD>0)?peckCD:(d.healCD>0)?d.healCD:((g.healAlly>0||(g.eatStored>0&&d.boss)||(g.paralyze>0&&d.boss))?1:turns);   // 🦆peckCD=賊鴨星級CD(蓋過 turns)   // 🩹healCD=史萊姆補血CD(=2,蓋過補師預設CD1)   // 🔥finCD=CD式畜力技的總CD(蓋過 turns);💚補師 CD=1;🌀消塊魔王 CD=1;⚡麻痺魔王 CD=1;術士 CD=turns(=2)
    // 🔩分層鐵塊:只有放鐵塊的敵人(d.iron>0)才吃 IRON_LOCK_LADDER,依難度×是否魔王決定該顆要清幾次;非鐵機人/非雷城敵人完全不帶 lock 欄位(閘門=d.iron>0)
    const ironLockV = (d.iron>0) ? ((d.lock!=null) ? d.lock : ((IRON_LOCK_LADDER[dk]||IRON_LOCK_LADDER.normal)[d.boss?'boss':'grunt'])) : 0;
    return {el,max:hp,hp:hp,atk:atk,interval:ival,timer:Math.max(2,ival),burn:0,dead:false,boss:!!d.boss,guard:(!d.boss&&stageHasBoss),...g,phases,phaseIdx:0,arch:d.arch||null,tier:tierV,finStages:finStagesV,finAnyHit:!!d.finAnyHit,finCD:finCDV,cardId:(d.cardId||null),peck:peckN,peckTray:!!d.peckTray,stealStored:!!d.stealStored,iron:d.iron||0,ironPunish:!!d.ironPunish,...(d.iron>0?{lock:ironLockV}:{}),reviveMax:(d.reviveMax!=null?d.reviveMax:2)};   // 每關初始 timer≥2;tier=星級貼圖;finStages=蓄力段數;finCD>0=CD式畜力;peck>0=🦆賊鴨偷盤面格;iron>0=🤖鐵機人放n連體鐵塊卡位(避開湊滿宮/線、盤面太緊停放;ironPunish=沒清掉下輪依 lock 算倍率打);lock=每顆鐵塊要清幾次(見 IRON_LOCK_LADDER,d.iron===0 的敵人不帶這欄位)
  });
}

// 魔王變身:血量過門檻 → 換屬 + 換招牌行為(回傳是否變身)。與場景 bossTransform 的 model 部分等價。
function phaseCheck(e, dk){
  if(!e.phases || e.hp<=0) return false;
  const idx=Math.min(e.phases.length-1, Math.max(0, Math.floor((1-e.hp/e.max)*e.phases.length)));
  if(idx>e.phaseIdx){
    e.phaseIdx=idx; const ph=e.phases[idx]; e.el=ph.el;
    Object.assign(e, {hitGate:0,comboGate:0,dot:0,regen:0,paralyze:0,healAlly:0,junk:0,finisher:0,eatStored:0}, behGates(ph.beh, dk, true));
    return true;
  }
  return false;
}

// headless 敵回合(一手):我方燒傷DoT → 敵出手 → 灼燒光環 → 自我回血 → 補師全體 → 變身檢查。
// state={enemies,playerHP,maxHP};就地改 state 並回傳。無 immune/armor 時敵傷=e.atk(與場景 enemyAttack 一致)。
function medicBossTurn(state, e){   // 🌊水魔王詠唱制(與遊戲端 _medicAct 一致):一手只做一件事,不再邊打邊補
  const E=state.enemies, others=E.filter(x=>x!==e);
  if(e._reviveIn>0){ if(--e._reviveIn<=0)others.forEach(m=>{ if(m.dead||m.hp<=0){m.dead=false;m.hp=m.max;} }); return; }   // 復活詠唱中(不攻擊)→ 2CD,歸0才復活小兵回滿
  if(e._healIn>0){ if(--e._healIn<=0){ const r=e.healAlly||0.2; E.forEach(a=>{ if(!a.dead&&a.hp>0)a.hp=Math.min(a.max,a.hp+Math.max(1,Math.round(a.max*r))); }); } return; }   // 補血詠唱中(不攻擊)→ 1CD,下手回全體
  if(e._reviveCharges==null)e._reviveCharges=(e.reviveMax!=null?e.reviveMax:2);   // 🆕復活次數改資料驅動(spawnStage 帶 reviveMax,預設2)
  if(others.length>0 && others.every(x=>x.dead||x.hp<=0) && e._reviveCharges>0){ e._reviveCharges--; e._reviveIn=2; return; }   // 小兵全滅→起手詠唱復活(2CD,共2次,不攻擊)
  if(E.some(x=>!x.dead&&x.hp>0&&x.hp<x.max)){ e._healIn=1; return; }   // 有人受損→起手詠唱補血(1CD,不攻擊)
  state.playerHP=Math.max(0,state.playerHP-e.atk);   // 都不需要→攻擊
}
function enemyTurn(state, dk){
  const E=state.enemies;
  E.forEach(e=>{ if(!e.dead&&e.burn>0){ e.hp=Math.max(0,e.hp-e.burn); if(e.hp<=0)e.dead=true; } });   // 我方燒傷 DoT(endHand 開頭)
  const anyDmg=()=>E.some(x=>!x.dead&&x.hp>0&&x.hp<x.max);
  E.forEach(e=>{ if(e.dead||e.hp<=0)return; if((e.sealed||0)>0)e.sealed--; e.timer--; if(e.timer<=0){   // 敵出手
    if(e.healAlly>0&&e.boss){ medicBossTurn(state,e); }                                                   // 🌊水魔王詠唱制
    else if(e.healAlly>0){ if(anyDmg()){ const r=e.healAlly; E.forEach(a=>{if(!a.dead&&a.hp>0)a.hp=Math.min(a.max,a.hp+Math.max(1,Math.round(a.max*r)));}); } else state.playerHP=Math.max(0,state.playerHP-e.atk); }   // 補師雜兵雙模式(受損補/滿血攻)
    else state.playerHP=Math.max(0,state.playerHP-e.atk);                                                 // 一般敵攻擊
    e.timer=e.interval; e.burn=0;
  } });
  const dotRate=Math.max(0,...E.filter(e=>!e.dead&&e.hp>0).map(e=>e.dot||0));   // 灼燒光環(取最大、不疊)
  if(dotRate>0) state.playerHP=Math.max(0,state.playerHP-Math.max(1,Math.round(state.maxHP*dotRate)));
  E.forEach(e=>{ if(!e.dead&&e.hp>0&&e.regen>0) e.hp=Math.min(e.max,e.hp+Math.max(1,Math.round(e.max*e.regen))); });   // 自我回血
  E.forEach(e=>{ if(e.hp<=0)e.dead=true; phaseCheck(e, dk); });   // 變身(自我回血/燒傷後血量也可能跨門檻)
  return state;
}

// ===== 遭遇表(五屬城「龍族拼圖式」隨機出怪)P1 — 2026-11-05 新增 =====
// 規格:docs/spec-stage-encounters.md v1.5(§3 資料模型/§4.1 抽法/§4.2 魔王/§4.4 蓄力檔/§4.5 串場/§4.6 異屬)+ docs/spec-fire-encounter-pool.md v1.3(火城 18 張槽位表)。
// ⚠️ 尚未接進遊戲:spawnStage / resolveStages / OVERRIDES 的既有路徑一行未動(遊戲目前不呼叫 drawEncounter / buildEncounterEnemies;E1 才接 index.html / run/start)。
// 【E0 2026-11-06】五城資料層就位:ENC_STATS 五城 / ENC_CITY_CFG(城設定)+ ENC_TEMPLATE(6 難度×3 關共用槽位模板)→ _encCitySpec 生成 90 張表(ENCOUNTER_DEFAULT 五城各 18);sim(nbsim2.mjs)與遊戲共用這一份。
//   蓄力檔三檔(速攻/標準/重砲)整套刪除:哥布林機制由 enemy-core.js 依 mon/star 決定(規格 §4.4),這裡 gob 只給「核心會覆蓋」的占位旗標。
// 這一段只新增名字(ENC_* / _enc* / drawEncounter / buildEncounterEnemies / encounterSig / getEncounterSpec / ENCOUNTER_DEFAULT),不覆寫任何既有識別字。
const ENC_EL_IDX = {fire:0,water:1,thunder:2,earth:3,wind:4};                      // 屬性→卡號偏移(cardId = 怪種 base + 此值)
const ENC_MON_CARD = { gob:41, cube:66, healer:56, iron:36, rock:46, duck:51, jewel:61 };     // 怪種 base 卡號(火屬);哥布林 c41~45 / 方塊怪 c66~70 / 補師 c56~60 / 鐵機人 c36~40 / 石頭怪 c46~50 / 賊鴨 c51~55 / 寶玉怪 c61~65(2026-11-09:關內亂入,掉該屬寶玉卡)
const ENC_GUEST_KINDS = ['healer','iron','rock','duck'];                            // 【舊預設】串場池 fallback:spec 沒帶 guestPool(舊格式/D1 舊表)時才用;E0 起各城表自帶 spec.guestPool(=其他四城招牌,含 gob、不含自家招牌)
// 哥布林占位旗標(E0):蓄力檔已刪;gob 的實際機制(猛擊/終結猛擊/餘火/酋長)由 enemy-core.js 依 mon+star 決定並覆蓋 interval/timer。
//   這三個值只讓「依旗標判斷怪種」的舊路徑認得這是哥布林(finisher>0 且 finCD>0)。finisher 取 0.15(≈舊速攻檔上緣):若有路徑沒接核心也不會一發秒人。
const ENC_GOB_PLACEHOLDER = { finisher:0.15, finCD:4, finStages:3 };
const ENC_CUBE_CD = { 1:[3,5], 2:[2,4], 3:[2,4], 4:[2,3] };   // 【2026-11-10 atk 收窄:原 1★4~7/2★3~6/3★2~5/4★2~4,為增加與怪互動】方塊怪出手間隔(CD)由星數決定,每隻生成時在範圍內均勻抽整數;再疊 ENC_CUBE_CD_OFF_BY_DIFF(入門~中級平移);串場怪不套此表
const ENC_DROP_RATE = { 1:0.60, 2:0.50, 3:0.40, 4:0.30, boss4:0.10 };   // 逐隻掉率「星數基準」(母規格 §6.2 預設;1★60/2★50/3★40/4★30);boss4=4★魔王獨立 10%(定案,不受難度係數影響)
// 【定案 2026-11-05 第三輪】掉率「越難越多」:每隻怪的掉率只看星數(ENC_DROP_RATE),不分難度;全難度共用同一個全域係數 0.88(讓入門維持 ≈2.8 張/趟,越難每趟怪越多→自然掉越多)。
//   製作人原話:「越難本來就越花時間解盤,獲得也要一樣多,才會想要挑戰難的關卡」。第二輪的難度係數(0.88/0.63/0.79/0.91/0.67/0.57)是為了把六難度每趟都壓在 2.8 張,結果同一隻 2★ 方塊怪地獄掉率(0.285)比入門(0.44)還低,與「難=多賺」相反,故撤回。
//   結構保留(六個值全 0.88),未來還要調再改這張表;4★ 魔王仍固定 10%(encDropRate 對 boss4 直接回傳,不乘係數)。基準 2.8 張=現行內建預設 RUN_DROP_DEFAULT.fire(S1 0.8+S2 1.0+S3 1.0,不含 S3 的 c61 寶玉——寶玉改由寶玉怪掉,P4 移除)。
const ENC_DROP_DIFF_MUL = { baby:0.88, beginner:0.88, normal:0.88, advanced:0.88, super:0.88, hell:0.88 };
function encDropRate(star,isBoss,diffKey){ if(isBoss&&star>=4) return ENC_DROP_RATE.boss4; const r=ENC_DROP_RATE[star]||0, m=(diffKey&&ENC_DROP_DIFF_MUL[diffKey]!=null)?ENC_DROP_DIFF_MUL[diffKey]:1; return Math.round(r*m*1000)/1000; }
function encMonDropRate(mon,star,isBoss,diffKey){ return mon==='jewel' ? 1 : encDropRate(star,isBoss,diffKey); }   // 【2026-11-09 拍板】寶玉怪(關內亂入)被打倒必掉該屬寶玉卡(rate 1),不吃星數掉率/全域係數;其餘怪照 encDropRate
const ENC_CUBE_CD_OFF_BY_DIFF = { baby: -2, beginner: -1, normal: -1 };   // 2026-11-10 atk:方塊怪出手間隔依難度平移量(整數,負=縮短;抽籤不變、只平移結果,最低 2);沒列=0
const ENC_STAR_STEP = { hp:1.09, atk:1.05 };   // 每升一星的數值倍率:取現行 OVERRIDES「同城同難度內相鄰星級(非魔王、非指定 cardId)」平均 hp/atk 比的中位數(18 組:hp 1.089 / atk 1.053)
// 數值底盤(raw=還沒乘 DIFFS 與全域倍率,與 OVERRIDES/DUNGEONS 的 def 同一層級;之後走與 spawnStage 完全相同的公式):
//   unit[難度][關]={star,hp,atk}:該難度該關「現行火城標準雜兵」的 raw 值與其星級(入門雜兵貼圖=1★;初級 S1/S2=2★、S3 護衛=1★;中級/上級哥布林=2★;超級/地獄=3★);其他星級以 ENC_STAR_STEP 往上下推。
//   【E0】wind/thunder/earth/water 同結構、同推法(S1/S2=該城標準招牌怪、S3=護衛的 raw;魔王=現行 S3 魔王 raw)。入門/初級魔王沿用「各城現行值」(不用火城 P1 校準的 1400/200、1600/98),試玩期值、待 sim 校準。
//   boss[難度]=[hp,atk,turns]:現行火城魔王 raw 值(星階由槽位表決定,數值沿用現行,不另造);mobTurns=現行火城雜兵 raw turns=2;ironTurns=現行雷城鐵機人各難度 raw turns(讓最終 interval=2~3)。
const ENC_STATS = { fire:{
  unit:{
    baby:    [{star:1,hp:650,atk:100},{star:1,hp:560,atk:90 },{star:1,hp:480,atk:90 }],
    beginner:[{star:2,hp:560,atk:90 },{star:2,hp:540,atk:88 },{star:1,hp:520,atk:85 }],
    normal:  [{star:2,hp:650,atk:100},{star:2,hp:560,atk:90 },{star:2,hp:480,atk:90 }],
    advanced:[{star:2,hp:650,atk:100},{star:2,hp:560,atk:90 },{star:2,hp:480,atk:90 }],
    super:   [{star:3,hp:820,atk:172},{star:3,hp:800,atk:168},{star:3,hp:820,atk:172}],
    hell:    [{star:3,hp:900,atk:226},{star:3,hp:880,atk:222},{star:3,hp:900,atk:226}],
  },
  boss:{ baby:[1400,200,3], beginner:[1600,98,2], normal:[1900,200,3], advanced:[1900,200,3], super:[2600,300,2], hell:[2800,378,2] },   // 【第二輪定案方向,sim 校準】魔王 raw hp 入門→地獄單調遞增(最終 hp×df×1.8:1764/2016/3420/4617/7722/12096)。第一輪沿用現行 baby 1900(最終2394)/beginner 640(最終806)是倒過來的;新值取兩者「平均擊殺手數」(約 9 手)的折衷再拉開
  mobTurns:2,
  ironTurns:{ baby:1, beginner:2, normal:3, advanced:3, super:4, hell:4 },
},
  wind:{   // 風城(招牌=賊鴨);【試玩期值,待 sim 校準】unit=現行 resolveStages(OVERRIDES/DUNGEONS)該難度該關標準雜兵 raw(S1/S2=標準招牌怪、S3=護衛),魔王=現行 S3 魔王 raw
    unit:{
      baby:     [{star:1,hp:500,atk:70 },{star:1,hp:480,atk:68 },{star:1,hp:460,atk:66 }],
      beginner: [{star:2,hp:560,atk:90 },{star:2,hp:540,atk:88 },{star:1,hp:520,atk:85 }],
      normal:   [{star:2,hp:640,atk:100},{star:2,hp:660,atk:100},{star:2,hp:700,atk:100}],
      advanced: [{star:3,hp:760,atk:118},{star:3,hp:760,atk:118},{star:2,hp:800,atk:118}],
      super:    [{star:3,hp:800,atk:230},{star:3,hp:800,atk:230},{star:2,hp:800,atk:230}],
      hell:     [{star:3,hp:900,atk:270},{star:3,hp:900,atk:270},{star:3,hp:900,atk:270}],
    },
    boss:{ baby:[620,80,2], beginner:[660,100,2], normal:[1900,200,2], advanced:[2100,205,2], super:[2600,370,2], hell:[2800,420,2] },
    mobTurns:2,
    ironTurns:{ baby:1, beginner:2, normal:3, advanced:3, super:4, hell:4 },
  },
  thunder:{   // 雷城(招牌=鐵機人);【試玩期值,待 sim 校準】unit=現行 resolveStages(OVERRIDES/DUNGEONS)該難度該關標準雜兵 raw(S1/S2=標準招牌怪、S3=護衛),魔王=現行 S3 魔王 raw
    unit:{
      baby:     [{star:1,hp:500,atk:70 },{star:1,hp:480,atk:68 },{star:1,hp:460,atk:66 }],
      beginner: [{star:2,hp:560,atk:90 },{star:2,hp:540,atk:88 },{star:1,hp:520,atk:85 }],
      normal:   [{star:2,hp:640,atk:100},{star:2,hp:640,atk:100},{star:2,hp:660,atk:100}],
      advanced: [{star:3,hp:640,atk:100},{star:3,hp:640,atk:100},{star:3,hp:680,atk:100}],
      super:    [{star:3,hp:800,atk:172},{star:3,hp:800,atk:172},{star:3,hp:820,atk:174}],
      hell:     [{star:3,hp:880,atk:196},{star:3,hp:880,atk:196},{star:3,hp:900,atk:198}],
    },
    boss:{ baby:[620,80,1], beginner:[640,98,2], normal:[1900,200,3], advanced:[1900,200,3], super:[2600,300,4], hell:[2800,330,4] },
    mobTurns:2,
    ironTurns:{ baby:1, beginner:2, normal:3, advanced:3, super:4, hell:4 },
  },
  earth:{   // 土城(招牌=石頭怪);【試玩期值,待 sim 校準】unit=現行 resolveStages(OVERRIDES/DUNGEONS)該難度該關標準雜兵 raw(S1/S2=標準招牌怪、S3=護衛),魔王=現行 S3 魔王 raw
    unit:{
      baby:     [{star:1,hp:600,atk:80 },{star:1,hp:580,atk:78 },{star:1,hp:580,atk:78 }],
      beginner: [{star:2,hp:700,atk:92 },{star:2,hp:700,atk:92 },{star:1,hp:620,atk:85 }],
      normal:   [{star:2,hp:760,atk:100},{star:2,hp:760,atk:100},{star:2,hp:760,atk:100}],
      advanced: [{star:3,hp:920,atk:122},{star:3,hp:920,atk:122},{star:3,hp:920,atk:122}],
      super:    [{star:3,hp:980,atk:128},{star:3,hp:980,atk:128},{star:3,hp:980,atk:128}],
      hell:     [{star:3,hp:1040,atk:136},{star:3,hp:1040,atk:136},{star:3,hp:1040,atk:136}],
    },
    boss:{ baby:[700,88,2], beginner:[800,100,2], normal:[2200,180,2], advanced:[2500,195,2], super:[2600,200,2], hell:[2800,210,2] },
    mobTurns:2,
    ironTurns:{ baby:1, beginner:2, normal:3, advanced:3, super:4, hell:4 },
  },
  water:{   // 水城(招牌=補師);【試玩期值,待 sim 校準】unit=現行 resolveStages(OVERRIDES/DUNGEONS)該難度該關標準雜兵 raw(S1/S2=標準招牌怪、S3=護衛),魔王=現行 S3 魔王 raw
    unit:{
      baby:     [{star:1,hp:520,atk:78 },{star:1,hp:500,atk:76 },{star:1,hp:500,atk:76 }],
      beginner: [{star:2,hp:560,atk:88 },{star:2,hp:600,atk:90 },{star:1,hp:540,atk:85 }],
      normal:   [{star:2,hp:640,atk:100},{star:2,hp:640,atk:100},{star:2,hp:640,atk:100}],
      advanced: [{star:3,hp:760,atk:115},{star:3,hp:760,atk:115},{star:3,hp:760,atk:115}],
      super:    [{star:3,hp:880,atk:130},{star:3,hp:880,atk:130},{star:3,hp:820,atk:170}],
      hell:     [{star:3,hp:900,atk:185},{star:3,hp:940,atk:190},{star:3,hp:900,atk:185}],
    },
    boss:{ baby:[600,85,2], beginner:[680,98,2], normal:[1900,190,2], advanced:[2100,200,2], super:[2300,270,2], hell:[2200,290,2] },
    mobTurns:2,
    ironTurns:{ baby:1, beginner:2, normal:3, advanced:3, super:4, hell:4 },
  },
};

// ── 抽籤(純函式,rng 外部注入:()=>[0,1))──
function _encInt(rng,a,b){ return a+Math.floor(rng()*(b-a+1)); }
function _encPickW(rng,keys,w){ let sum=0; keys.forEach(k=>{sum+=w[k];}); let r=rng()*sum; for(let i=0;i<keys.length;i++){ r-=w[keys[i]]; if(r<0) return keys[i]; } return keys[keys.length-1]; }
function _encShuffle(a,rng){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function _encEl(spec,rule,rng){   // 槽 el 規則(母規格 §3.3/§4.6):self 本屬/lock 初級鎖屬/all 全屬(spec.elw 權重)/off 異屬(spec.off 順序權重)/其他=指定屬
  if(rule==='self') return spec.el;
  if(rule==='lock') return spec.lock;
  if(rule==='off') return _encPickW(rng,Object.keys(spec.off),spec.off);
  if(rule==='all') return _encPickW(rng,Object.keys(spec.elw),spec.elw);
  return rule;
}
function _encIsSig(slot,spec){ return slot.el==='self' && (slot.mon==='sig' || slot.mon===((spec&&spec.sig)||'gob')); }   // 招牌槽=本城本屬招牌怪(槽的 mon 用抽象名 'sig',由 spec.sig 解析;舊格式直接寫 mon:'gob' 的火城表仍認得)
function _encMake(spec,slot,rng,usedGuest){   // 第 5 步「逐隻具現化」:星數→屬性→(招牌解析/串場抽種,同一關不重複)→(方塊怪 CD)。蓄力檔抽籤已刪(E0)
  const star=_encInt(rng,slot.star[0],slot.star[1]);
  const el=_encEl(spec,slot.el,rng);
  let mon=slot.mon, guest=false;
  if(mon==='sig') mon=spec.sig||'gob';   // 招牌怪抽象名 → 本城招牌(火 gob/風 duck/雷 iron/土 rock/水 healer);不消耗 rng
  else if(mon==='guest'){   // 串場怪同一關不重複(2026-11-05 第二輪定案):已出現過的種類排除;池用盡(>4 隻)才允許重複。池=spec.guestPool(其他四城招牌,含 gob、不含自家招牌)
    const pool=spec.guestPool||ENC_GUEST_KINDS, used=usedGuest||[]; let keys=pool.filter(k=>used.indexOf(k)<0); if(!keys.length) keys=pool.slice();
    const w={}; keys.forEach(k=>{ w[k]=(spec.guestW&&spec.guestW[k]!=null)?spec.guestW[k]:1; });
    mon=_encPickW(rng,keys,w); guest=true; used.push(mon); }
  const m={slot:slot.id,mon,el,star,role:slot.role||null,guest,cd:0};
  if(mon==='cube'){ const R=ENC_CUBE_CD[star]||ENC_CUBE_CD[3]; m.cd=_encInt(rng,R[0],R[1]); }   // 方塊怪 CD:星數決定、每隻各自抽(不吃難度 dt)
  return m;
}
function encounterSig(lineup){ return lineup.map(m=>m.safe?('safe:'+(m.mon||'')+':'+m.el+':'+m.star):(m.mon+':'+m.el+':'+m.star)).sort().join(','); }   // 陣容簽名(ban 比對用;不含站位/蓄力檔)
function _encDrawSlots(spec,rng){
  const slots=spec.slots, out=[], usedGuest=[];
  // 1. 方塊海特例(僅有 spec.sea 的表):獨立擲 sea.p;命中=整關替換成 sea.n 隻同型方塊怪(cap 放寬、招牌保底與其餘槽一併不出)→ 直接進第 8 步站位
  if(spec.sea && rng()<spec.sea.p){
    const sea=spec.sea; let els=null;
    if(sea.mix){   // 異屬方塊海「同屬/混屬」變化(2026-11-05 第二輪定案):先等機率抽 1/2/3 種屬性→從屬性池(預設=spec.off 異屬池,可由 sea.pool 改)依順序權重不重複抽出→5 隻隨機分配、每種至少 1 隻
      const pool=sea.pool||spec.off, keys=Object.keys(pool), k=Math.min(_encInt(rng,sea.mix[0],sea.mix[1]),keys.length), chosen=[], left=keys.slice();
      for(let i=0;i<k;i++){ const w={}; left.forEach(x=>{w[x]=pool[x];}); const e=_encPickW(rng,left,w); chosen.push(e); left.splice(left.indexOf(e),1); }
      els=chosen.slice(); while(els.length<sea.n) els.push(chosen[Math.floor(rng()*chosen.length)]);
    }
    for(let i=0;i<sea.n;i++) out.push(_encMake(spec,{id:'sea',mon:'cube',el:els?els[i]:sea.el,star:[sea.star,sea.star]},rng));
    return _encShuffle(out,rng);
  }
  // 2. 逐槽骰隻數(魔王槽有 dual:以機率 dual 出 2 隻、否則 1 隻,§4.2)
  const ns=slots.map(s=>{ if(s.role==='boss' && s.dual!=null) return rng()<s.dual?2:1; return _encInt(rng,s.n[0],s.n[1]); });
  const mins=slots.map(s=>s.n[0]);   // 保證槽=隻數下限≥1;填充槽=0
  // 3. 招牌保底(sigGuard 開):骰完本屬招牌怪總數為 0 → 把表中第一個招牌槽改 1 隻(該槽視為保證槽)。表中沒有招牌槽的關=保底為「關」
  if(spec.sigGuard){
    let sigN=0, firstSig=-1; slots.forEach((s,i)=>{ if(_encIsSig(s,spec)){ sigN+=ns[i]; if(firstSig<0) firstSig=i; } });
    if(firstSig>=0 && sigN===0){ ns[firstSig]=1; mins[firstSig]=1; }
  }
  // 4. 裁切(Σn>cap):三輪、同輪內表序由上而下——①保證槽下限 ②保證槽超出下限部分 ③填充槽
  let take=ns.slice();
  if(ns.reduce((a,b)=>a+b,0)>spec.cap){
    take=ns.map(()=>0); let left=spec.cap;
    slots.forEach((s,i)=>{ if(mins[i]>=1){ const t=Math.min(mins[i],ns[i],left); take[i]+=t; left-=t; } });
    slots.forEach((s,i)=>{ if(mins[i]>=1){ const t=Math.min(ns[i]-take[i],left); take[i]+=t; left-=t; } });
    slots.forEach((s,i)=>{ if(mins[i]<1){ const t=Math.min(ns[i],left); take[i]+=t; left-=t; } });
  }
  // 5. 逐隻具現化
  slots.forEach((s,i)=>{ for(let k=0;k<take[i];k++) out.push(_encMake(spec,s,rng,usedGuest)); });
  // 6. 每關最少 1 隻:裁切後為 0 → 表中第一個槽補成 1 隻
  if(out.length===0) out.push(_encMake(spec,slots[0],rng,usedGuest));
  // 8. 站位(2026-11-05 第二輪定案):魔王固定站中間 C 位(索引 floor((n-1)/2));雙魔王=第一隻站 C 位、第二隻站 C 位旁一格(左或右隨機,同一 rng;n=2 時只有右邊);其餘怪隨機
  const bosses=out.filter(m=>m.role==='boss'), others=_encShuffle(out.filter(m=>m.role!=='boss'),rng), n=out.length, c=Math.floor((n-1)/2), pos=new Array(n).fill(null);
  if(bosses.length>=1) pos[c]=bosses[0];
  if(bosses.length>=2){ const sides=[]; if(c-1>=0) sides.push(c-1); if(c+1<n) sides.push(c+1); const sd=sides.length>1?sides[Math.floor(rng()*2)]:sides[0]; pos[sd]=bosses[1]; }
  let oi=0; for(let i=0;i<n;i++) if(pos[i]===null) pos[i]=others[oi++];
  return pos;
}
// 7. ban/pinned:pinned=[{w:機率,lineup:[...]}](w 為獨立機率質量,Σw<1;命中即回該手排陣容);ban=[encounterSig 字串](命中→重抽最多 20 次,仍失敗用 safe)
function drawEncounter(spec,rng){
  const pin=spec.pinned||[];
  if(pin.length){ const tot=pin.reduce((a,p)=>a+p.w,0), r=rng(); if(r<tot){ let acc=0; for(const p of pin){ acc+=p.w; if(r<acc) return p.lineup.map(m=>Object.assign({},m)); } } }
  const ban=spec.ban||[]; let l=null;
  for(let t=0;t<20;t++){ l=_encDrawSlots(spec,rng); if(!ban.length || ban.indexOf(encounterSig(l))<0) return l; }
  return (spec.safe && spec.safe.length) ? spec.safe.map(m=>Object.assign({},m)) : l;
}

// ── 稀有怪亂入(2026-11-09 寶玉怪 P4-1;與伺服器 encounter.ts 的 VERBATIM D 逐字同源,test-encounter-server-sync.cjs 會比對)──
// 規則(母規格 §5.1-2/§5.4、製作人 2026-11-09 拍板):S1/S2 才有、入門與首次保護關(safe)不出、每關最多 1 隻、換掉一隻「填充槽」怪(保證槽/魔王不換),沒有填充槽怪就額外加 1 隻;該關已 5 隻則不亂入。
// 本期只開寶玉;金屬/金錢在表裡 rate 0 留接點(之後把 base/day/weekend 填數字、補 ENC_MON_CARD 即可,不必動 injectRare)。
// 寶玉星數:初級 1★/中級 2★/上級↑ 3★(5★ 開放前最高 3★,不產 4★)。
const ENC_RARE_ORDER = ['jewel','metal','money'];                                                          // 依序擲(寶玉→金屬→金錢),中一個即停
const ENC_RARE_STAR = { jewel:{ baby:1, beginner:1, normal:2, advanced:3, super:3, hell:3 }, metal:{ baby:1, beginner:1, normal:2, advanced:2, super:3, hell:3 }, money:{ baby:1, beginner:1, normal:2, advanced:2, super:3, hell:3 } };
const ENC_RARE_RULES = {                                                                                   // base=平時保底、day=曜日加倍(僅 dayCity 命中的城)、weekend=週末全城;入門一律 0(injectRare 與 encRareRate 皆擋)
  jewel:{ base:0.06, day:0.18, weekend:0.12 },                                                             // 寶玉:保底 6%、寶玉日當城 18%(≈保底 3 倍)、週末祭全城 12%
  metal:{ base:0, day:0, weekend:0 },                                                                      // 接點:金銀(金屬/金錢)曜日規則另議,目前亂入關閉(驚喜關另走 run/start bonus)
  money:{ base:0, day:0, weekend:0 },
};
const ENC_JEWEL_CITIES = ['fire','water','thunder','earth','wind'];
function _encMulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }   // 自帶 PRNG(不依賴 battle-core,前後端同源)
function _encTwDays(ms){ return Math.floor((ms+28800000)/86400000); }                                      // 台灣時區(UTC+8)的「自 1970-01-01 起第幾天」(換日 00:00 台灣時間)
function jewelWeekOrder(weekIdx){   // 第 weekIdx 週(台灣時區、週一起算)週一~週五的寶玉日城:五屬隨機排列、同週不重複;全體玩家同一份(純函式,只吃週序號)
  const a=ENC_JEWEL_CITIES.slice(), r=_encMulberry((Math.imul((weekIdx|0)+1,0x9E3779B1)^0x5EED1234)>>>0);
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; }
  return a;
}
function jewelDayCity(date){   // 今日寶玉日的城(週一~五各一屬);週末(台灣時區)回 null。date=Date 或 epoch 毫秒,省略=現在。前後端共用(大廳「今日寶玉城」用)
  const ms=(date instanceof Date)?date.getTime():(typeof date==='number'?date:Date.now());
  const d=_encTwDays(ms), mon=(((d+3)%7)+7)%7;   // 1970-01-01 是週四 → (d+3)%7:0=週一…6=週日
  if(mon>4) return null;
  return jewelWeekOrder(Math.floor((d+3)/7))[mon];
}
// ── 金銀日(2026-11-11 大毛拍板):金銀怪(驚喜關)也有「每日城」,與寶玉城錯開 ──
// 週一~五每天一座城(每週把五城隨機排一次、同週不重複,且每天 ≠ 當天寶玉城);週六日五城全算。當日金銀城的驚喜關(run/start bonus)機率 ×2,其餘 ×1。純函式、全體玩家同一份、前後端同源。
function metalWeekOrder(weekIdx){   // 第 weekIdx 週週一~週五的金銀日城:用另一組種子洗牌五屬;只要有任一天撞到寶玉城就換下一組種子(salt+1)重洗,直到五天都不同(上限 64 次,極端兜底取 jewel 順序輪移 1 格——必不撞)
  const J=jewelWeekOrder(weekIdx);
  for(let salt=0;salt<64;salt++){
    const a=ENC_JEWEL_CITIES.slice(), r=_encMulberry((Math.imul((weekIdx|0)+1,0x85EBCA6B)^0xA11CE777^Math.imul(salt,0x27D4EB2F))>>>0);
    for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; }
    if(a.every((c,i)=>c!==J[i])) return a;
  }
  return J.map((_,i)=>J[(i+1)%J.length]);
}
function metalDayCity(date){   // 今日金銀日的城;週末(台灣時區)回 null(=五城全算)。date=Date 或 epoch 毫秒,省略=現在
  const ms=(date instanceof Date)?date.getTime():(typeof date==='number'?date:Date.now());
  const d=_encTwDays(ms), mon=(((d+3)%7)+7)%7;
  if(mon>4) return null;
  return metalWeekOrder(Math.floor((d+3)/7))[mon];
}
function isJewelDay(city,date){ const ms=(date instanceof Date)?date.getTime():(typeof date==='number'?date:Date.now()); const d=_encTwDays(ms), mon=(((d+3)%7)+7)%7; return mon>4 || jewelDayCity(ms)===city; }   // 該城今天是不是寶玉日(週末五城全是)
function isMetalDay(city,date){ const ms=(date instanceof Date)?date.getTime():(typeof date==='number'?date:Date.now()); const d=_encTwDays(ms), mon=(((d+3)%7)+7)%7; return mon>4 || metalDayCity(ms)===city; }   // 該城今天是不是金銀日(週末五城全是)
function surpriseRateMul(city,date){ return isMetalDay(city,date)?2:1; }   // 該城今天「驚喜關(金銀怪)」機率倍率:金銀日 2、其餘 1(基準 econ.bonusRate=12% → 24%);run/start 擲 bonus 時乘上去
function encRareRate(kind,city,diffKey,ms){   // 該種稀有怪在「城 × 難度 × 時間」的亂入機率(每關擲一次);入門/未知種=0
  const R=ENC_RARE_RULES[kind]; if(!R||diffKey==='baby') return 0;
  const d=_encTwDays(typeof ms==='number'?ms:Date.now()), mon=(((d+3)%7)+7)%7;
  if(mon>4) return R.weekend||0;                                    // 週末祭:全城
  if(kind==='jewel' && jewelDayCity(ms)===city) return R.day||0;    // 寶玉日:當日屬城加倍
  return R.base||0;
}
function injectRare(lineup,spec,city,diffKey,si,rng,ms){   // 回新陣容(不改原陣列);沒中/不合條件回原陣列。只對 drawEncounter 抽出的一般陣容用——保護關(safe)伺服器根本不呼叫
  if(!lineup||!lineup.length||diffKey==='baby'||si>1||lineup.length>=5||lineup.some(m=>m&&m.safe)) return lineup;
  let kind=null;
  for(let i=0;i<ENC_RARE_ORDER.length;i++){ const k=ENC_RARE_ORDER[i], p=encRareRate(k,city,diffKey,ms); if(p>0 && rng()<p){ kind=k; break; } }
  if(!kind) return lineup;
  const slots=(spec&&spec.slots)||[], fill=[];
  lineup.forEach((m,i)=>{ const sl=slots.find(x=>x.id===m.slot); if(sl && sl.n[0]===0 && m.role!=='boss') fill.push(i); });   // 填充槽=n 下限 0 且非魔王(方塊海 'sea' 不在 spec.slots → 不算填充槽)
  const re={slot:'rare',mon:kind,el:(kind==='jewel')?city:'neutral',star:ENC_RARE_STAR[kind][diffKey],role:null,guest:false,cd:0};
  const nl=lineup.slice(); if(fill.length) nl[fill[Math.floor(rng()*fill.length)]]=re; else nl.push(re);
  return nl;
}
// ── 稀有怪亂入 END ──

// ── 陣容描述 → 敵人物件(與 spawnStage 回傳同格式,多帶 mon/star/guest/chargeTier/dropCard 供 P2 掉落用)──
// hp/atk/turns 公式與 spawnStage 完全相同:hp=round(raw×df.hp×ENEMY_HP_MUL)、atk=round(raw×df.atk×(魔王?BOSS_ATK_MUL:1)×ENEMY_ATK_MUL)、turns=max(1,raw+df.dt−1);
// 顯式陣容路徑(母規格 §7.2):不做 pun/SIG/specialIdx/covered/noSkill 自動注入。safe 條目(m.safe)=現行陣容的最終敵人物件(+mon/star/guest 三欄),原封複製。
// 前端轉接欄位(E1 用):每隻帶 mon/star/guest/el/cardId/tier(=星數;4★ 魔王 tier 0、cardId null → 沿用 king 圖分支)/boss/dropCard/dropRate。
// 非火城招牌怪(duck/iron/rock/healer)帶「串場 1★ 近似」舊旗標(peck 1/CD3、iron 1 格 1 層、shield combo2 漏 40%、healAlly 0.25/CD2)當核心未接線時的保底;核心接線後一律由 enemy-core.js 依 mon+star 覆蓋。
const ENC_JEWEL_HP_MUL = { baby:1, beginner:1, normal:1, advanced:1, super:1, hell:0.8 };   // 寶玉怪 HP 難度乘數(nbsim2 RHP_DK.jewel:盾破後約 1~2 手打倒;地獄 0.8)
function buildEncounterEnemies(dungeonId,diffKey,stageIdx,lineup){
  const S=ENC_STATS[dungeonId]; if(!S||!lineup) return [];
  const df=DIFFS_BY[diffKey]||DIFFS_BY.normal, dk=df.key;
  const hasBoss=lineup.some(m=>m.safe?(m.enemy&&m.enemy.boss):m.role==='boss');
  return lineup.map(m=>{
    if(m.safe) return Object.assign({},m.enemy);
    const isBoss=m.role==='boss';
    let hpRaw,atkRaw,turnsRaw;
    if(isBoss){ const B=S.boss[dk]; hpRaw=B[0]; atkRaw=B[1]; turnsRaw=B[2]; }
    else { const u=S.unit[dk][Math.min(stageIdx,2)], k=m.star-u.star; hpRaw=u.hp*Math.pow(ENC_STAR_STEP.hp,k); atkRaw=u.atk*Math.pow(ENC_STAR_STEP.atk,k); turnsRaw=(m.mon==='iron')?S.ironTurns[dk]:S.mobTurns; }
    const hp=Math.max(1,Math.round(hpRaw*df.hp*ENEMY_HP_MUL)),
          atk=Math.max(1,Math.round(atkRaw*df.atk*(isBoss?BOSS_ATK_MUL:1)*ENEMY_ATK_MUL)),
          turns=Math.max(1,turnsRaw+(df.dt||0)-1);
    let beh=null;
    if(m.mon==='gob') beh='finisher'; else if(m.mon==='healer') beh='healAlly'; else if(m.mon==='rock') beh='shield';
    const g=behGates(beh,dk,isBoss);
    let finCDV=0,finStagesV=0,finAnyHitV=false,peckN=0,peckCD=0,ironN=0,healCD=0;
    if(m.mon==='gob'){ g.finisher=ENC_GOB_PLACEHOLDER.finisher; finCDV=ENC_GOB_PLACEHOLDER.finCD; finStagesV=ENC_GOB_PLACEHOLDER.finStages; finAnyHitV=!(isBoss&&m.star>=4); }   // 占位旗標(核心依 mon+star 覆蓋,見 ENC_GOB_PLACEHOLDER);打斷旗標沿用:1~3★ 任何攻擊可斷,4★ 魔王需剋屬
    if(beh==='healAlly'){ g.healAlly=0.25; healCD=2; }                                                                           // 串場補師:補 25%、CD2(§4.5)
    if(beh==='shield'){ g.shieldKind='combo'; g.comboGate=2; g.hitGate=0; g.shieldLeak=0.4; }                                    // 串場石頭怪:盾 60% 減傷(漏 40%)、破盾 COMBO 2(入門級)
    if(m.mon==='duck'){ peckN=1; peckCD=3; }                                                                                     // 串場賊鴨:偷 1 格、CD3
    if(m.mon==='iron'){ ironN=1; }                                                                                               // 串場鐵機人:鐵塊 1 格、1 層、免罰
    const cubeCD=(m.mon==='cube'&&m.cd>0)?Math.max(2,m.cd+(ENC_CUBE_CD_OFF_BY_DIFF[dk]||0)):0;                                                                            // 方塊怪 CD:星數表抽出的值直接當出手間隔,不套難度 dt(第二輪定案);沒帶 cd 的舊陣容退回 turns
    const ival=(finCDV>0)?finCDV:(peckCD>0)?peckCD:(healCD>0)?healCD:(cubeCD>0)?cubeCD:turns;
    const bigBoss=(isBoss&&m.star>=4);                                                                                           // 4★ 魔王:無 cardId、tier 0 → 沿用現行 king 圖分支;掉落卡走 dropCard
    const dropCard='c'+(ENC_MON_CARD[m.mon]+ENC_EL_IDX[m.el]);
    const jw=(m.mon==='jewel');   // 寶玉怪(2026-11-09,照 nbsim2 mkRare):HP=同城同難度同關同星數方塊怪模板 × ENC_JEWEL_HP_MUL[難度](地獄 0.8、其餘 1);ATK=同模板(核心再乘 enemy-core TUNING.JEWEL_K);行為由 enemy-core 依 mon='jewel' 的核心盾決定
    const hpF=jw?Math.max(1,Math.round(hp*(ENC_JEWEL_HP_MUL[dk]!=null?ENC_JEWEL_HP_MUL[dk]:1))):hp;
    return Object.assign({el:m.el,max:hpF,hp:hpF,atk:atk,interval:ival,timer:Math.max(2,ival),burn:0,dead:false,boss:isBoss,guard:(!isBoss&&hasBoss)},
      g,{phases:null,phaseIdx:0,arch:null,tier:bigBoss?0:m.star,finStages:finStagesV,finAnyHit:finAnyHitV,finCD:finCDV,cardId:bigBoss?null:dropCard,peck:peckN,peckTray:false,stealStored:false,iron:ironN,ironPunish:false,reviveMax:2},
      ironN>0?{lock:1}:{},
      jw?{hitGate:0,comboGate:0,shield:false,healAlly:0,finCD:0,finisher:0,peck:0,iron:0,burn:0,boss:false,guard:false}:{},
      {mon:m.mon,star:m.star,guest:!!m.guest,dropCard:dropCard,dropRate:encMonDropRate(m.mon,m.star,isBoss,dk)});
  });
}

// ── 五城共用槽位模板 + 城設定(E0 2026-11-06)──
// 五城 90 張表結構相同,只差:招牌怪(sig)、初級鎖屬(lock)、異屬順序(off)、串場池(guestPool)、水城補師上限(sigMax)。
// 規格:docs/spec-{fire,wind,thunder,earth,water}-encounter-pool.md §3.2 屬性 / §3.3 串場池 / §3.4 槽位表;母規格 spec-stage-encounters.md §3.3/§4.5/§4.6/§7.3。
// 模板的槽用抽象名:sig=本城招牌怪(spec.sig 解析)/cube=方塊怪/guest=他城機制怪(spec.guestPool 抽)/boss=魔王(招牌怪 role:'boss')。
// slot:{id,role?,mon:'sig'|'cube'|'guest',el:'self'|'lock'|'all'|'off',star:[min,max],n:[min,max],dual?};n.min≥1=保證槽、0=填充槽(裁切優先序,表序即優先序)。
const ENC_CITY_CFG = {
  fire:   { sig:'gob',    lock:'wind',    off:['wind','thunder','water','earth'],  guestPool:['healer','iron','rock','duck'] },   // 異屬順序:風→雷→水→土
  wind:   { sig:'duck',   lock:'thunder', off:['thunder','earth','fire','water'],  guestPool:['healer','iron','rock','gob']  },   // 雷→土→火→水
  thunder:{ sig:'iron',   lock:'earth',   off:['earth','water','wind','fire'],     guestPool:['healer','gob','rock','duck']  },   // 土→水→風→火
  earth:  { sig:'rock',   lock:'water',   off:['water','fire','thunder','wind'],   guestPool:['healer','iron','gob','duck']  },   // 水→火→雷→風
  water:  { sig:'healer', lock:'fire',    off:['fire','wind','earth','thunder'],   guestPool:['gob','iron','rock','duck'],        // 火→風→土→雷
            sigMax:{ baby:1, beginner:1, normal:1, advanced:1, super:2, hell:2 } },   // 水城補師上限(spec-water §1-8/§3.1):S1、S2 的招牌槽隻數上限(入門~上級 1/超級・地獄 2);魔王關 S3 不套
};   // guestPool=其他四城招牌(含 gob、不含自家),四種等權重;排列依舊 ENC_GUEST_KINDS 順序、自家招牌原位換 gob(讓 sim 同種子抽出的陣容與 E0 前逐場對得上)
const _ENC_SELF_W = { normal:0.75, advanced:0.70, super:0.70, hell:0.65 };                                                  // 方塊怪「全屬」權重:本屬(中級起;§3.2/母規格 §4.6)
const _ENC_OFF_W  = { normal:[0.10,0.075,0.05,0.025], advanced:[0.12,0.09,0.06,0.03], super:[0.12,0.09,0.06,0.03], hell:[0.14,0.105,0.07,0.035] };   // 依各城 off 順序的異屬權重
const ENC_TEMPLATE = (function(){
  const boss=(star,n,dual)=>Object.assign({id:'boss',role:'boss',mon:'sig',el:'self',star:[star,star],n:n},dual!=null?{dual:dual}:{});
  const sig=(star,n)=>({id:'sig',mon:'sig',el:'self',star:star,n:n});
  const cube=(id,el,star,n)=>({id:id,mon:'cube',el:el,star:star,n:n});
  const guest=(id,el,star,n)=>({id:id,mon:'guest',el:el,star:star,n:n});
  return {   // [難度][關 0~2] = {cap,sg(招牌保底),sea?,slots};sea.pool:'elw' = 用該城全屬權重
    baby: [
      { cap:2, sg:false, slots:[cube('cube','self',[1,2],[1,2])] },
      { cap:3, sg:false, slots:[cube('cube','self',[1,2],[1,3])] },
      { cap:3, sg:true,  slots:[boss(1,[1,2],0.2), cube('cube','self',[1,1],[0,2])] },
    ],
    beginner: [
      { cap:3, sg:true, slots:[sig([1,1],[0,1]), cube('cube','self',[1,2],[0,2]), cube('cubeLock','lock',[1,1],[0,1])] },
      { cap:4, sg:true, slots:[sig([1,1],[0,2]), cube('cube','self',[1,3],[0,3]), cube('cubeLock','lock',[1,2],[0,2])] },
      { cap:3, sg:true, slots:[boss(2,[1,2],0.2), cube('cube','self',[1,2],[0,2]), cube('cubeLock','lock',[1,2],[0,1])] },
    ],
    normal: [
      { cap:3, sg:true, slots:[sig([1,2],[0,2]), cube('cube','all',[1,2],[0,2])] },
      { cap:4, sg:true, slots:[sig([1,2],[0,2]), cube('cube','all',[1,3],[0,2])] },
      { cap:3, sg:true, slots:[boss(3,[1,1]), sig([1,2],[0,1]), cube('cube','all',[1,3],[0,2])] },
    ],
    advanced: [
      { cap:3, sg:true, sea:{p:0.10,n:5,star:1,el:'self'}, slots:[sig([1,2],[1,2]), cube('cube','all',[2,3],[0,2])] },
      { cap:4, sg:true, slots:[sig([2,3],[0,2]), cube('cube','all',[2,3],[0,2])] },
      { cap:3, sg:true, slots:[boss(4,[1,1]), sig([1,2],[0,2])] },
    ],
    super: [
      { cap:3, sg:true, slots:[sig([1,2],[1,1]), guest('guest','self',[1,1],[1,1]), cube('cube','all',[1,2],[0,2])] },
      { cap:4, sg:true, slots:[sig([2,3],[1,2]), guest('guest','self',[1,1],[1,1]), cube('cube','all',[2,3],[0,2])] },
      { cap:3, sg:true, slots:[boss(4,[1,1]), guest('guest','self',[1,1],[1,1]), sig([1,2],[0,1])] },
    ],
    hell: [
      { cap:4, sg:true, sea:{p:0.10,n:5,star:2,el:'off',mix:[1,3],pool:'elw'}, slots:[sig([2,3],[0,2]), guest('guest','self',[2,2],[1,1]), cube('cube','all',[2,3],[0,4])] },
      { cap:4, sg:true, slots:[sig([2,3],[1,2]), guest('guest','self',[2,2],[1,2]), cube('cube','all',[2,3],[0,2])] },
      { cap:4, sg:true, slots:[boss(4,[1,1]), guest('guest','self',[2,2],[1,1]), guest('guestOff','off',[2,2],[1,1]), sig([2,2],[0,2])] },
    ],
  };
})();
function _encCitySpec(city,diff,si){   // 城 × 難度 × 關 → spec(與 E0 前火城表同形;slots 保留抽象名 sig/cube/guest,抽籤時由 spec.sig / spec.guestPool 解析)。safe/ban/pinned 由 ENCOUNTER_DEFAULT 補
  const C=ENC_CITY_CFG[city], t=ENC_TEMPLATE[diff]&&ENC_TEMPLATE[diff][si]; if(!C||!t) return null;
  const off={}; [0.4,0.3,0.2,0.1].forEach((x,i)=>{ off[C.off[i]]=x; });   // 異屬槽:非本屬四屬 40/30/20/10(依 off 順序)
  const ow=_ENC_OFF_W[diff]; let elw=null; if(ow){ elw={}; elw[city]=_ENC_SELF_W[diff]; C.off.forEach((el,i)=>{ elw[el]=ow[i]; }); }
  const slots=JSON.parse(JSON.stringify(t.slots));
  if(C.sigMax && si<2){ const cap=C.sigMax[diff]; slots.forEach(sl=>{ if(sl.id==='sig') sl.n=[Math.min(sl.n[0],cap),Math.min(sl.n[1],cap)]; }); }   // 水城補師上限(S1/S2)
  const spec={mode:'slots',el:city,lock:C.lock,off:off,sig:C.sig,guestPool:C.guestPool.slice(),cap:t.cap,sigGuard:t.sg,slots:slots};
  if(elw) spec.elw=elw;
  if(slots.some(s=>s.mon==='guest')){ const w={}; C.guestPool.forEach(k=>{ w[k]=1; }); spec.guestW=w; }   // 串場池等權重【預設,sim 調】
  if(t.sea){ spec.sea=JSON.parse(JSON.stringify(t.sea)); if(spec.sea.pool==='elw') spec.sea.pool=Object.assign({},elw); }
  return spec;
}
function _encSafeFromCurrent(dungeonId,diffKey,stageIdx){   // safe=現行 spawnStage 陣容原封轉入(最終敵人物件)。【2026-11-05 第二輪定案】撤回「上級↑ pun 土屬那隻改回火屬」的例外:一個字都不改
  // E0:依旗標判怪種(peck→賊鴨/iron→鐵機人/healAlly→補師/shield→石頭怪/finisher+finCD→哥布林,其餘=方塊怪),並在敵人物件上補 mon/star/guest 三欄讓核心認得(其餘欄位一字不動)
  return spawnStage(dungeonId,diffKey,stageIdx).map(e=>{ const o=Object.assign({},e), star=o.boss?(o.tier||4):(o.tier||1); let mon='cube';
    if(o.peck>0) mon='duck'; else if(o.iron>0) mon='iron'; else if(o.healAlly>0) mon='healer'; else if(o.shield) mon='rock'; else if(o.finisher>0&&o.finCD>0) mon='gob';
    Object.assign(o,{mon:mon,star:star,guest:false});
    return {safe:true,mon:mon,el:o.el,star:star,role:o.boss?'boss':null,enemy:o}; });
}
const ENCOUNTER_DEFAULT = (function(){   // 五城各 18 張(6 難度 × S1~S3),首次保護 safe 由現行陣容轉入
  try{
    const R={};
    Object.keys(ENC_CITY_CFG).forEach(city=>{ const F={};
      DIFFS.forEach(df=>{ F[df.key]=[0,1,2].map(si=>{ const spec=_encCitySpec(city,df.key,si); spec.safe=_encSafeFromCurrent(city,df.key,si); spec.safeFirstTime=(si<2); spec.ban=[]; spec.pinned=[]; return spec; }); });   // 首次保護只保 S1/S2(§6、母規格 §7.3);S3 的 safe 僅供 ban 重抽失敗的兜底
      R[city]=F; });
    return R;
  }catch(err){ if(typeof console!=='undefined') console.warn('ENCOUNTER_DEFAULT build failed',err); return {}; }
})();
function getEncounterSpec(dungeonId,diffKey,stageIdx){ const d=ENCOUNTER_DEFAULT[dungeonId]; return (d&&d[diffKey]&&d[diffKey][stageIdx])||null; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DUNGEONS, STAGES, ELEM_DUNGEONS, DIFFS, DIFFS_BY, counterOf, ARCH, DIFF_RULES, OVERRIDES, resolveStages,
    BOSS_ATK_MUL, ENEMY_HP_MUL, ENEMY_ATK_MUL, IRON_LOCK_LADDER, behGates, spawnStage, spawnDailyStage, phaseCheck, enemyTurn,
    DAILY_DUNGEONS, TOWER_FLOORS,
    drawEncounter, buildEncounterEnemies, encounterSig, getEncounterSpec, ENCOUNTER_DEFAULT, ENC_STATS, ENC_STAR_STEP, ENC_CUBE_CD, ENC_CUBE_CD_OFF_BY_DIFF, ENC_DROP_RATE, ENC_DROP_DIFF_MUL, encDropRate, encMonDropRate,
    injectRare, ENC_RARE_RULES, ENC_RARE_STAR, ENC_RARE_ORDER, encRareRate, jewelDayCity, jewelWeekOrder, metalDayCity, metalWeekOrder, isJewelDay, isMetalDay, surpriseRateMul, ENC_JEWEL_HP_MUL,
    ENC_CITY_CFG, ENC_TEMPLATE, _encCitySpec, ENC_GOB_PLACEHOLDER };   // 遭遇表 P1(2026-11-05);E0(2026-11-06)加城設定/模板/生成器
}
