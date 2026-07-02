/* ===== data-stages.js — 關卡 / 難度 / 敵種「內容資料」(與引擎分離)=====
 * 動機(#22 關卡資料化):改關卡只動這檔、不碰邏輯;為「按需載入 / 後端發關卡」鋪路。
 * 瀏覽器:classic script,在 battle-core.js 之後、主 script 之前載入(counterOf 需要 EL)。
 * Node:require('./data-stages.js') 取得同一份(未來伺服器發關卡 / sim 用)。 */
const _ELref = (typeof EL !== 'undefined') ? EL : require('./battle-core.js').EL;   // 瀏覽器用 battle-core 全域 EL;Node 則 require

// 地下城:序章(教學)+ 五元素關 + 最終塔;turns 以「手」為單位;線性解鎖
const DUNGEONS = {
  prologue:{id:'prologue',name:'序章·結印之章',emoji:'🏯',cost:10,stages:[
      {es:[{el:'wind',hp:450,atk:90,turns:2}]},
      {es:[{el:'earth',hp:380,atk:80,turns:2},{el:'earth',hp:380,atk:80,turns:2}]},
      {es:[{el:'thunder',hp:340,atk:70,turns:2},{el:'fire',hp:1500,atk:190,turns:3,boss:true},{el:'thunder',hp:340,atk:70,turns:2}]},
    ],drops:[[{rank:'genin',rate:0.6}],[{rank:'genin',rate:1.0},{rank:'chunin',rate:0.25}],[{rank:'chunin',rate:1.0},{rank:'jonin',rate:0.18}]]},
  fire:{id:'fire',name:'火之火山',emoji:'🌋',el:'fire',cost:12,stages:[
      {es:[{el:'fire',hp:650,atk:100,turns:2}]},
      {es:[{el:'fire',hp:560,atk:90,turns:2},{el:'fire',hp:560,atk:90,turns:2}]},
      {es:[{el:'fire',hp:480,atk:90,turns:2,arch:'artillery'},{el:'fire',hp:1900,atk:200,turns:3,boss:true},{el:'fire',hp:480,atk:90,turns:2,arch:'healer'}]},
    ],drops:[[{el:'fire',rate:0.8}],[{el:'fire',rate:1.0}],[{el:'fire',rate:1.0},{rank:'jonin',rate:0.2}]]},
  water:{id:'water',name:'水之深淵',emoji:'🌊',el:'water',cost:12,stages:[
      {es:[{el:'water',hp:700,atk:110,turns:3}]},
      {es:[{el:'water',hp:600,atk:100,turns:2},{el:'water',hp:600,atk:100,turns:2}]},
      {es:[{el:'water',hp:520,atk:100,turns:2,arch:'caster'},{el:'water',hp:2000,atk:210,turns:3,boss:true},{el:'water',hp:520,atk:100,turns:2,arch:'artillery'}]},
    ],drops:[[{el:'water',rate:0.8}],[{el:'water',rate:1.0}],[{el:'water',rate:1.0},{rank:'jonin',rate:0.2}]]},
  thunder:{id:'thunder',name:'雷之高原',emoji:'⚡',el:'thunder',cost:12,stages:[
      {es:[{el:'thunder',hp:720,atk:110,turns:3}]},
      {es:[{el:'thunder',hp:600,atk:100,turns:2,arch:'artillery'},{el:'thunder',hp:600,atk:100,turns:2}]},
      {es:[{el:'thunder',hp:500,atk:100,turns:2,arch:'healer'},{el:'thunder',hp:2000,atk:210,turns:3,boss:true},{el:'thunder',hp:500,atk:100,turns:2,arch:'artillery'}]},
    ],drops:[[{el:'thunder',rate:0.8}],[{el:'thunder',rate:1.0}],[{el:'thunder',rate:1.0},{rank:'jonin',rate:0.2}]]},
  earth:{id:'earth',name:'土之山岳',emoji:'⛰️',el:'earth',cost:12,stages:[
      {es:[{el:'earth',hp:700,atk:100,turns:2}]},
      {es:[{el:'earth',hp:580,atk:90,turns:2,arch:'artillery'},{el:'earth',hp:580,atk:90,turns:2}]},
      {es:[{el:'earth',hp:520,atk:90,turns:2,arch:'archmage'},{el:'earth',hp:2000,atk:200,turns:3,boss:true},{el:'earth',hp:520,atk:90,turns:2,arch:'healer'}]},
    ],drops:[[{el:'earth',rate:0.8}],[{el:'earth',rate:1.0}],[{el:'earth',rate:1.0},{rank:'jonin',rate:0.2}]]},
  wind:{id:'wind',name:'風之峽谷',emoji:'🌪️',el:'wind',cost:12,stages:[
      {es:[{el:'wind',hp:680,atk:100,turns:2}]},
      {es:[{el:'wind',hp:580,atk:90,turns:2,arch:'caster'},{el:'wind',hp:580,atk:90,turns:2}]},
      {es:[{el:'wind',hp:500,atk:90,turns:2,arch:'caster'},{el:'wind',hp:1900,atk:200,turns:3,boss:true},{el:'wind',hp:500,atk:90,turns:2,arch:'artillery'}]},
    ],drops:[[{el:'wind',rate:0.8}],[{el:'wind',rate:1.0}],[{el:'wind',rate:1.0},{rank:'jonin',rate:0.2}]]},
  tower:{id:'tower',name:'結印之塔',emoji:'🗼',cost:20,stages:[
      {es:[{el:'fire',hp:800,atk:120,turns:2},{el:'water',hp:800,atk:120,turns:2}]},
      {es:[{el:'thunder',hp:750,atk:110,turns:2,arch:'archmage'},{el:'earth',hp:750,atk:110,turns:2},{el:'wind',hp:750,atk:110,turns:2}]},
      {es:[{el:'fire',hp:3200,atk:210,turns:3,boss:true,phases:[{el:'fire',beh:'burn'},{el:'water',beh:'regen'},{el:'thunder',beh:'paralyze'},{el:'earth',beh:'hit'},{el:'wind',beh:'combo'}]}]},   // 魔王:五屬階段變身(每 20% 血換屬+換招牌行為,逼平衡隊);血砍3200讓強隊在超級/地獄打得死(模擬5000時連★3LV20都0%)
    ],drops:[[{rank:'chunin',rate:1.0}],[{rank:'chunin',rate:1.0}],[{rank:'jonin',rate:1.0},{rank:'kage',rate:0.2}]]},
};
const STAGES = DUNGEONS.prologue.stages;   // 相容舊引用
const ELEM_DUNGEONS=['fire','water','earth','thunder','wind'];   // 地圖五邊形順時針=相剋環(各被順時針鄰居剋:水剋火→土剋水→雷剋土→風剋雷→火剋風)
// ===== 難度(P&D 式:同一基準表 × 倍率;中級=基準。staM=體力倍率、rwd=獎勵倍率、dt=詠唱手數增減、counter=摻反制屬敵) =====
const DIFFS=[
  {key:'baby',     name:'嬰兒',emoji:'👶',hp:0.7, atk:0.3, dt:+2, staM:0.5, rwd:0.3, rec:'亂玩都過',baby:true,    col:0xff9ec4},
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
const OVERRIDES = {};

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
  else if(beh==='paralyze')g.paralyze = lite? 1 : 2;                 // 鎖幾手
  else if(beh==='healAlly')g.healAlly = (lite?0.10:0.20)*dm;        // 補師:回全體比例(雜兵 10% / 完整=魔王 20%)
  else if(beh==='junk')    g.junk     = lite? 4 : 2;                 // 封鎖:間隔(越小越頻;lite 較少)
  else if(beh==='finisher')g.finisher = (lite?0.4:0.6)*dm;          // 🔥終結:大招傷害佔 maxHP(要有感;lite≈40%、full≈60%)
  else if(beh==='eatStored')g.eatStored= lite? 1 : 99;              // 🌪️消屬塊:1=−1LV、99=整個消掉
  return g;
}

// 生成某 (dungeon, 難度, 第 stageIdx 關;0 起) 的敵人模型陣列。timer 寬限:開局第1關(stageIdx0)+2。
function spawnStage(dungeonId, diffKey, stageIdx){
  const dungeon=DUNGEONS[dungeonId]; if(!dungeon) return [];
  const df=DIFFS_BY[diffKey]||DIFFS_BY.normal;
  const defs=resolveStages(dungeon, diffKey)[stageIdx].es;
  let pun=null; if(df.counter&&dungeon.el){const C=counterOf(dungeon.el); pun=counterOf(C);} let punished=false;   // 反制混搭:上級↑元素關塞一隻懲罰屬
  const dk=df.key, dEl=dungeon.el, SIG={fire:'finisher',water:'healAlly',thunder:'paralyze',earth:'junk',wind:'eatStored'}, myBeh=SIG[dEl];   // 五屬城中級魔王技定案(火終結/水補師/雷麻痺/土封鎖/風消屬塊)
  const covered=(d)=>{ if(dk==='advanced'||dk==='super')return !!d.boss; if(dk==='hell')return true; return false; };   // 上級/超級僅魔王(完整版),地獄全敵。中級的梯度另在下方 beh 指派處理
  const noSkill=(dk==='baby'||dk==='beginner');   // 嬰兒/初級:純數值,無技
  const stageHasBoss=defs.some(x=>x.boss);
  let litePicked=false;   // 城內梯度:小關(無魔王)選「一隻雜兵」帶輕鬆版該屬技
  return defs.map(d=>{
    let el=d.el; if(pun&&!punished&&d.el===dEl&&!d.boss){el=pun;punished=true;}
    const A=(d.arch&&ARCH[d.arch])||null;
    const hp=Math.max(1,Math.round(d.hp*df.hp*(A?A.hpM:1)*ENEMY_HP_MUL)),
          atk=Math.max(1,Math.round(d.atk*df.atk*(A?A.atkM:1)*(d.boss?BOSS_ATK_MUL:1)*ENEMY_ATK_MUL)),
          turns=Math.max(1,d.turns+(df.dt||0)-1);
    const phases=d.phases||null;
    let beh=null, full=false;
    if(phases){ el=phases[0].el; beh=phases[0].beh; full=true; }                          // 魔王變身:完整版
    else if(A){ full=covered(d); beh=full?A.beh:null; }                                   // 兵種行為:covered(上級魔王/地獄)才開
    else if(myBeh && !noSkill){                                                           // 屬城招:中級起開(嬰兒/初級無)
      if(d.boss){ beh=myBeh; full=true; }                                                 // 魔王 = 完整版
      else if(covered(d)){ beh=myBeh; full=true; }                                        // 地獄雜兵 = 完整
      else if(!litePicked && !stageHasBoss){ beh=myBeh; full=false; litePicked=true; }    // 小關:一隻雜兵帶輕鬆版
    }
    else if(dk==='hell'&&dEl&&!myBeh){ beh='hit'; full=true; }
    const g=behGates(beh, dk, full);
    return {el,max:hp,hp:hp,atk:atk,interval:turns,timer:Math.max(2,turns),burn:0,dead:false,boss:!!d.boss,guard:(!d.boss&&stageHasBoss),...g,phases,phaseIdx:0,arch:d.arch||null};   // 每關初始 timer≥2:每關開場至少 2 手才挨第一拳(防上關清空盤面、下關一進場就連挨);interval(之後頻率)不變
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
function enemyTurn(state, dk){
  const E=state.enemies;
  E.forEach(e=>{ if(!e.dead&&e.burn>0){ e.hp=Math.max(0,e.hp-e.burn); if(e.hp<=0)e.dead=true; } });   // 我方燒傷 DoT(endHand 開頭)
  E.forEach(e=>{ if(e.dead||e.hp<=0)return; if((e.sealed||0)>0)e.sealed--; e.timer--; if(e.timer<=0){ state.playerHP=Math.max(0,state.playerHP-e.atk); e.timer=e.interval; e.burn=0; } });   // 敵出手
  const dotRate=Math.max(0,...E.filter(e=>!e.dead&&e.hp>0).map(e=>e.dot||0));   // 灼燒光環(取最大、不疊)
  if(dotRate>0) state.playerHP=Math.max(0,state.playerHP-Math.max(1,Math.round(state.maxHP*dotRate)));
  E.forEach(e=>{ if(!e.dead&&e.hp>0&&e.regen>0) e.hp=Math.min(e.max,e.hp+Math.max(1,Math.round(e.max*e.regen))); });   // 自我回血
  const healR=Math.max(0,...E.filter(e=>!e.dead&&e.hp>0&&e.healAlly>0).map(e=>e.healAlly));   // 補師治療全體
  if(healR>0) E.forEach(e=>{ if(!e.dead&&e.hp>0) e.hp=Math.min(e.max,e.hp+Math.max(1,Math.round(e.max*healR))); });
  E.forEach(e=>{ if(e.hp<=0)e.dead=true; phaseCheck(e, dk); });   // 變身(自我回血/燒傷後血量也可能跨門檻)
  return state;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DUNGEONS, STAGES, ELEM_DUNGEONS, DIFFS, DIFFS_BY, counterOf, ARCH, DIFF_RULES, OVERRIDES, resolveStages,
    BOSS_ATK_MUL, ENEMY_HP_MUL, ENEMY_ATK_MUL, behGates, spawnStage, phaseCheck, enemyTurn };
}
