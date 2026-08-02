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
  // 🦆風城入門=賊鴨教學關:每次攻擊偷走盤面已放的格(peck),沒格可偷→攻擊翻倍。turns:1→baby(dt+2) interval=2(=技能CD2)。tier=賊鴨星級貼圖
  'wind:baby': [
    // S1:1星賊鴨 ×1(偷1格)→先認識「偷方塊」
    { es: [ { el: 'wind', hp: 500, atk: 70, turns: 1, tier: 1, peck: 1 } ] },
    // S2:1星賊鴨 ×2(各偷1格)
    { es: [ { el: 'wind', hp: 480, atk: 68, turns: 1, tier: 1, peck: 1 },
            { el: 'wind', hp: 480, atk: 68, turns: 1, tier: 1, peck: 1 } ] },
    // S3:1星賊鴨 ×2(護衛,偷1) + 2星賊鴨=魔王(中間,偷2格,boss→吃其他城S3同款陣型:1.4×放大站後、兩側護衛在前)
    { es: [ { el: 'wind', hp: 460, atk: 66, turns: 1, tier: 1, peck: 1 },
            { el: 'wind', hp: 620, atk: 76, turns: 1, tier: 2, boss: true, peck: 2 },
            { el: 'wind', hp: 460, atk: 66, turns: 1, tier: 1, peck: 1 } ] },
  ],
  // 🦆風城初級:賊鴨教學升級版——非魔王只偷盤面格,魔王加碼偷拖盤拼圖格(peckTray)。tier=星級貼圖(魔王S3=3星,吃king圖)。turns:2(→CD2)
  'wind:beginner': [
    // S1:2星賊鴨 ×1(偷盤面2格)
    { es: [ { el:'wind', hp:560, atk:90, turns:2, tier:2, peck:2 } ] },
    // S2:2星賊鴨 ×2
    { es: [ { el:'wind', hp:540, atk:88, turns:2, tier:2, peck:2 },
            { el:'wind', hp:540, atk:88, turns:2, tier:2, peck:2 } ] },
    // S3:1星護衛 ×2 + 3星賊鴨=魔王(中,偷盤面+拖盤共3格)
    { es: [ { el:'wind', hp:520, atk:85, turns:2, tier:1, peck:1 },
            { el:'wind', hp:640, atk:98, turns:2, tier:3, boss:true, peck:3, peckTray:true },
            { el:'wind', hp:520, atk:85, turns:2, tier:1, peck:1 } ] },
  ],
  // 🦆風城中級:賊鴨魔王再加碼——4星賊鴨王偷盤面+拖盤 + 額外輪流吃卡上屬塊(stealStored,重用魔女魔王消屬塊機制)。魔王不設tier→用king貼圖。turns:3(→CD2)
  'wind:normal': [
    // S1:2星賊鴨 ×2
    { es: [ { el:'wind', hp:640, atk:100, turns:3, tier:2, peck:2 },
            { el:'wind', hp:640, atk:100, turns:3, tier:2, peck:2 } ] },
    // S2:1星 ×2 + 2星(中)
    { es: [ { el:'wind', hp:600, atk:95, turns:3, tier:1, peck:1 },
            { el:'wind', hp:660, atk:100, turns:3, tier:2, peck:2 },
            { el:'wind', hp:600, atk:95, turns:3, tier:1, peck:1 } ] },
    // S3:1星(左) + 4星賊鴨王=魔王(中,偷盤面+拖盤共3格 + 透明塊詠唱整消) + 補師(右)
    { es: [ { el:'wind', hp:600, atk:95, turns:3, tier:1, peck:1 },
            { el:'wind', hp:1900, atk:200, turns:3, boss:true, peck:3, peckTray:true, stealStored:true },
            { el:'wind', hp:580, atk:90, turns:3, beh:'healAlly' } ] },
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
  'earth:baby': [
    { es: [ { el:'earth', hp:600, atk:80, turns:2, tier:1, beh:'shield', shieldKind:'hit', hitGate:12 } ] },
    { es: [ { el:'earth', hp:580, atk:78, turns:2, tier:1, beh:'shield', shieldKind:'hit', hitGate:12 },
            { el:'earth', hp:580, atk:78, turns:2, tier:1, beh:'shield', shieldKind:'hit', hitGate:12 } ] },
    { es: [ { el:'earth', hp:580, atk:78, turns:2, tier:1, beh:'shield', shieldKind:'hit', hitGate:12 },
            { el:'earth', hp:700, atk:88, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 },
            { el:'earth', hp:580, atk:78, turns:2, tier:1, beh:'shield', shieldKind:'hit', hitGate:12 } ] },
  ],
  'earth:beginner': [
    { es: [ { el:'earth', hp:700, atk:92, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 },
            { el:'earth', hp:700, atk:92, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 } ] },
    { es: [ { el:'earth', hp:620, atk:85, turns:2, tier:1, beh:'shield', shieldKind:'hit', hitGate:12 },
            { el:'earth', hp:700, atk:92, turns:2, tier:2, beh:'shield', shieldKind:'combo', comboGate:2 },
            { el:'earth', hp:620, atk:85, turns:2, tier:1, beh:'shield', shieldKind:'hit', hitGate:12 } ] },
    { es: [ { el:'earth', hp:620, atk:85, turns:2, tier:1, beh:'shield', shieldKind:'hit', hitGate:12 },
            { el:'earth', hp:800, atk:100, turns:2, tier:3, beh:'shield', shieldKind:'hit', hitGate:15 },
            { el:'earth', hp:620, atk:85, turns:2, tier:1, beh:'shield', shieldKind:'hit', hitGate:12 } ] },
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

// 生成某 (dungeon, 難度, 第 stageIdx 關;0 起) 的敵人模型陣列。timer 寬限:開局第1關(stageIdx0)+2。
function spawnStage(dungeonId, diffKey, stageIdx){
  const dungeon=DUNGEONS[dungeonId]; if(!dungeon) return [];
  const df=DIFFS_BY[diffKey]||DIFFS_BY.normal;
  const defs=resolveStages(dungeon, diffKey)[stageIdx].es;
  let pun=null; if(df.counter&&dungeon.el){const C=counterOf(dungeon.el); pun=counterOf(C);} let punished=false;   // 反制混搭:上級↑元素關塞一隻懲罰屬
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
    }
    // 🔥火城畜力技統一 CD式(CD4、倒數CD3/2/1顯示蓄力):中級雜兵(S1右/S2中)+魔王都套;地獄雜兵(full 非魔王)維持原樣。雜兵給2星哥布林貼圖,魔王維持自身貼圖(中級↑=4星酋長、初級=3星戰士)。||=OVERRIDE 明確值優先
    let tierV=d.tier||0, finCDV=d.finCD||0, finStagesV=d.finStages||0;
    if(dEl==='fire' && g.finisher>0 && !phases && (!full || d.boss)){ finCDV=finCDV||4; finStagesV=finStagesV||3; if(!d.boss) tierV=tierV||2; }
    const ival=(finCDV>0)?finCDV:(d.healCD>0)?d.healCD:((g.healAlly>0||(g.eatStored>0&&d.boss)||(g.paralyze>0&&d.boss))?1:turns);   // 🩹healCD=史萊姆補血CD(=2,蓋過補師預設CD1)   // 🔥finCD=CD式畜力技的總CD(蓋過 turns);💚補師 CD=1;🌀消塊魔王 CD=1;⚡麻痺魔王 CD=1;術士 CD=turns(=2)
    return {el,max:hp,hp:hp,atk:atk,interval:ival,timer:Math.max(2,ival),burn:0,dead:false,boss:!!d.boss,guard:(!d.boss&&stageHasBoss),...g,phases,phaseIdx:0,arch:d.arch||null,tier:tierV,finStages:finStagesV,finAnyHit:!!d.finAnyHit,finCD:finCDV,peck:d.peck||0,peckTray:!!d.peckTray,stealStored:!!d.stealStored,iron:d.iron||0,ironPunish:!!d.ironPunish};   // 每關初始 timer≥2;tier=星級貼圖;finStages=蓄力段數;finCD>0=CD式畜力;peck>0=🦆賊鴨偷盤面格;iron>0=🤖鐵機人放n連體鐵塊卡位(避開湊滿宮/線、盤面太緊停放;ironPunish=沒清掉下輪2倍打)
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
  if(e._reviveCharges==null)e._reviveCharges=2;
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DUNGEONS, STAGES, ELEM_DUNGEONS, DIFFS, DIFFS_BY, counterOf, ARCH, DIFF_RULES, OVERRIDES, resolveStages,
    BOSS_ATK_MUL, ENEMY_HP_MUL, ENEMY_ATK_MUL, behGates, spawnStage, phaseCheck, enemyTurn };
}
