/* ===== battle-core.js — 戰鬥數學核心(純資料 + 純函式;無 Phaser/DOM/localStorage)=====
 * 瀏覽器:當 classic script 在 index.html 主 script 之前載入 → 定義為共用全域(EL/CONFIG/computeClears…)
 * Node:require('./battle-core.js') 取得同一份(回放驗證/headless 用)
 * #16 階段1「搬常數+種子亂數」:把出塊/相剋傷害/種子亂數抽成單一真相,客戶端與伺服器跑同一份。 */
const N = 9;
const EL = {
  fire:   {name:'火', color:0xe8513a, dark:0x4a2a24, beats:'wind',    face:'👹', fx:'🔥'},
  wind:   {name:'風', color:0x4caf72, dark:0x23402f, beats:'thunder', face:'👺', fx:'🌀'},
  thunder:{name:'雷', color:0xe6c12f, dark:0x473f1d, beats:'earth',   face:'🐲', fx:'⚡'},
  earth:  {name:'土', color:0xc8803a, dark:0x43331f, beats:'water',   face:'🗿', fx:'🪨'},
  water:  {name:'水', color:0x3a9be8, dark:0x1f3447, beats:'fire',    face:'🐙', fx:'💧'},
  junk:   {name:'封', color:0x35323a, dark:0x1c1a20, beats:'',        face:'⬛', fx:'🔒'},   // 詛咒塊:敵人塞的封鎖塊(填滿不能放、清線才除)
};
const ELEMENT_BOXES = [0,2,4,6,8];
const NEUTRAL_FILL = 0xc8a06a, NEUTRAL_DARK = 0x2c2114;
const SHAPES = [
  {w:2,c:[[0,0]]},
  {w:7,c:[[0,0],[0,1]]},{w:7,c:[[0,0],[1,0]]},
  {w:8,c:[[0,0],[0,1],[0,2]]},{w:8,c:[[0,0],[1,0],[2,0]]},
  {w:5,c:[[0,0],[0,1],[0,2],[0,3]]},{w:5,c:[[0,0],[1,0],[2,0],[3,0]]},
  {w:3,c:[[0,0],[0,1],[0,2],[0,3],[0,4]]},{w:3,c:[[0,0],[1,0],[2,0],[3,0],[4,0]]},
  {w:9,c:[[0,0],[0,1],[1,0],[1,1]]},
  {w:6,c:[[0,0],[1,0],[1,1]]},{w:6,c:[[0,0],[0,1],[1,0]]},{w:6,c:[[0,0],[0,1],[1,1]]},{w:6,c:[[0,1],[1,0],[1,1]]},
  {w:6,c:[[0,0],[0,1],[0,2],[1,1]]},{w:6,c:[[0,1],[1,0],[1,1],[1,2]]},{w:6,c:[[0,0],[1,0],[1,1],[2,0]]},{w:6,c:[[0,1],[1,0],[1,1],[2,1]]},
  {w:5,c:[[0,0],[1,0],[2,0],[2,1]]},{w:5,c:[[0,0],[0,1],[0,2],[1,0]]},{w:5,c:[[0,1],[1,1],[2,1],[2,0]]},{w:5,c:[[0,0],[1,0],[1,1],[1,2]]},
  {w:5,c:[[0,1],[0,2],[1,0],[1,1]]},{w:5,c:[[0,0],[1,0],[1,1],[2,1]]},{w:5,c:[[0,0],[0,1],[1,1],[1,2]]},{w:5,c:[[0,1],[1,0],[1,1],[2,0]]},
  {w:3,c:[[0,1],[1,0],[1,1],[1,2],[2,1]]},
  {w:3,c:[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]]},{w:3,c:[[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]]},
];   // ※ 3×3 九格塊已移除:太肥難放,且 3×3 留給水/風 LV7 工具塊(WILD_SHAPES[7])專用
const WSUM = SHAPES.reduce((a,s)=>a+s.w,0);
const CONFIG = {
  ADV_MULT:1.6, WEAK_MULT:0.7, NORM_MULT:1.0,   // 相剋軟化(原2.0/0.5硬牆→1.6/0.7,讓手控能逆轉小劣勢)
  NEUTRAL_BOX_BASE:40, LINE_BASE:30, LINE_SAME_RATE:0.5,
  HIT_BASE:16, ELEM_RATE:0.08,   // 逐格傷害:每個被清的格(含中性)都給 HIT_BASE;屬區格再額外 +卡攻擊×相剋×ELEM_RATE。※底傷×1.33 補回「拿掉鬥志(舊平均×1.465)」的缺口,combo 改當技術加成
  PLAYER_HP_BASE:1000, RESHUFFLE_COST:120,
  ATTR:{ fire_burn_rate:0.4, wind_immune:1, earth_dr:0.3, yang_heal_rate:0.25, yin_amp:1.5 },   // 陽回血砍到已驗證平衡值(1.2→0.5→0.25);陰改傷害×2(見 fireAttr)
};
// === combo / 傷害倍率(resolve 與風主動技共用的同一套數學;伺服器重算傷害靠這些)===
const COMBO_K = 0.25;            // combo 傷害係數(線性段斜率)。也乘回血
const COMBO_RAMP = 0.5;          // combo「越高越爆」二次加速:sim 實測 combo 真實頂在 3~4(6幾乎不出現)→ 把獎勵堆到 3~4,6 當傳說 jackpot
const AOE_HIT = 15;              // 單次清格數 ≥ 此值 → 該次攻擊變全體(全額打每隻)
const WIND_SKILL_MUL = 1.8;     // 風主動技傷害倍率:(底傷+卡攻段)×combo ×此值。1.8 讓風@combo3≈火單發、又抬高開局地板(火主動技=atk×3,風靠這個追)
const NEUTRAL_HEAL_MUL = 0.8;    // 清無屬區回血倍率(回血=隊伍RCV總和×此值×combo)。0.5→0.8:無屬改成「= 屬·普通傷害 + 回血」,要讓清無屬有感(配合未來清無屬關)
// 連段倍率(傷害+回血共用):1 + ck×[ (c-1) + RAMP×(c-1)(c-2)/2 ]。線性段給基礎、二次段讓 3↑ 越疊越猛。
// 對照:c1=×1.0 c2=×1.25 c3=×1.625 c4=×2.125 c5=×2.75 c6=×3.5(隊長技 comboBoost 再加大 ck)
function comboMultiplier(combo, lead){
  const ck = COMBO_K + ((lead && lead.type==='comboBoost') ? lead.v : 0);
  const c = Math.max(1, combo);
  return 1 + ck*((c-1) + COMBO_RAMP*(c-1)*(c-2)/2);
}
function leadDamageMult(lead, fx, hitN, combo){       // 隊長技傷害加成(家族扛):allAtk=全體;其餘多為「該屬有參戰才吃」
  if(!lead)return 1;
  if(lead.type==='allAtk')return lead.v;
  if((lead.type==='elemAtk'||lead.type==='dog') && fx && fx[lead.el])return lead.v;   // 🐱貓/🐶犬:同屬有清→×v(犬另在 maxHP 加血)
  if(lead.type==='hitAtk' && fx && fx[lead.el] && (hitN||0)>=(lead.gate||15))return lead.v;   // 🐭鼠:HIT≥gate 且同屬有清→×v
  if(lead.type==='comboAtk' && fx && fx[lead.el] && (combo||0)>=(lead.gate||2))return lead.v; // (舊)combo 條件型
  if(lead.type==='famAtk')return 1 + (lead.v-1)*(lead.famFrac==null?1:lead.famFrac);   // 🐭鼠/🐟魚/🐰兔:同家族攻×v(famFrac=隊中同家族比例,純家族隊=1=吃滿)
  return 1;
}
// resolve 的純傷害計畫:給 computeClears 結果 + 戰鬥情境(隊長技/RCV/combo)→ 全部傷害數字。
// 場景只「照計畫演」(誰被打、怎麼演留給場景);伺服器重算靠同一份。
function planResolve(data, lead, teamRcv, combo){
  const comboMult = comboMultiplier(combo, lead);          // combo 倍率(不封頂)
  const hitN      = data.cells.length;                      // 本次清的格數
  const leadMult  = leadDamageMult(lead, data.fx, hitN, combo);   // 隊長技傷害加成(條件型 鼠HIT/魚combo 需 hitN/combo)
  const dmgMul    = comboMult * leadMult;                   // 每段傷害總倍率
  const aoe        = hitN >= AOE_HIT;                        // ≥AOE_HIT → 全體
  const hits      = (data.hits||[]).map(h => ({ b:h.b, el:h.el, cells:h.cells, dmg: Math.round(h.dmg*dmgMul) }));   // 各宮最終傷害
  const heal      = Math.max(1, Math.round(teamRcv * NEUTRAL_HEAL_MUL * comboMult));   // 清無屬「每3格」回血基準(combo加成);實際每宮回 heal×格數/3 → 同攻擊按格數,拆不拆宮一樣多
  return { comboMult, leadMult, dmgMul, hitN, aoe, hits, heal };
}
const SHAPES_BY_EL = {
  water:  {1:[[0,0]], 2:[[0,0],[1,0]], 3:[[0,0],[1,0],[2,0]], 4:[[0,0],[1,0],[2,0],[3,0]], 5:[[0,0],[1,0],[2,0],[3,0],[4,0]]},   // 直落
  wind:   {1:[[0,0]], 2:[[0,0],[0,1]], 3:[[0,0],[0,1],[0,2]], 4:[[0,0],[0,1],[0,2],[0,3]], 5:[[0,0],[0,1],[0,2],[0,3],[0,4]]},   // 橫吹
  fire:   {1:[[0,0]], 2:[[0,0],[0,1]], 3:[[0,0],[1,0],[1,1]], 4:[[0,0],[0,1],[0,2],[1,1]], 5:[[0,1],[1,0],[1,1],[1,2],[2,1]]},   // 可轉:■/■■/L/T/十
  earth:  {1:[[0,0]], 2:[[0,0],[1,1]], 3:[[0,0],[1,1],[2,2]], 4:[[0,0],[0,1],[1,0],[1,1]], 5:[[0,0],[0,2],[1,0],[1,1],[1,2]]},   // 斜→2×2→U(■·■/■■■)
  thunder:{1:[[0,0]], 2:[[0,0],[1,1]], 3:[[0,0],[1,0],[1,1]], 4:[[0,1],[0,2],[1,0],[1,1]], 5:[[0,0],[0,1],[1,1],[2,1],[2,2]]},   // 鋸齒/閃電(N)
};
function chakraShape(el,lv){const m=SHAPES_BY_EL[el]||SHAPES_BY_EL.fire;return (m[Math.max(1,Math.min(5,lv))]||m[1]).map(x=>x.slice());}
function normCells(cells){const mr=Math.min(...cells.map(c=>c[0])),mc=Math.min(...cells.map(c=>c[1]));return cells.map(([r,c])=>[r-mr,c-mc]);}
function rot90(cells){return normCells(cells.map(([r,c])=>[c,-r]));}
// 火/土/雷=生成時就隨機旋轉+鏡像(玩家不必手動轉);水/風=固定方向(直落/橫吹,可預測)
function randOrient(cells,el){if(el==='water'||el==='wind')return cells;
  let out=cells.map(x=>x.slice());const t=brnd(4);for(let k=0;k<t;k++)out=rot90(out);
  if(brnd(2))out=normCells(out.map(([r,c])=>[r,-c]));   // 隨機鏡像(走戰鬥種子流)
  return out;}
function rnd(n){return Math.floor(Math.random()*n);}   // 一般/視覺隨機(非決定性,用在 UI/gacha)
// === 種子亂數:回放驗證地基。同種子→同序列。BRNG=戰鬥隨機流(每場開始播種),brnd=整數版。影響戰鬥結果的隨機(出塊/轉向/敵技)走它;純視覺仍用 rnd/Math.random ===
function mulberry32(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let BRNG=Math.random;   // 預設真隨機;開戰時 startBattleSeed() 換成種子版
function brnd(n){return Math.floor(BRNG()*n);}
function startBattleSeed(seed){seed=(seed!=null)?(seed>>>0):((Math.random()*4294967296)>>>0);BRNG=mulberry32(seed);return seed;}   // 回傳實際種子(存起來給回放)
function pickShape(){let r=brnd(WSUM);for(const s of SHAPES){r-=s.w;if(r<0)return s.c.map(x=>x.slice());}}
function boxOf(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
function canPlace(board,cells,r,c,kind,allowJunk){
  const inB=cells.every(([dr,dc])=>{const rr=r+dr,cc=c+dc;return rr>=0&&rr<N&&cc>=0&&cc<N;});
  if(!inB)return false;
  if(kind==='water')return cells.some(([dr,dc])=>{const cell=board[r+dr][c+dc];return !cell||(allowJunk&&cell.el==='junk');});   // 水/卡片屬塊:界內 + 至少一格空(可填)或鐵塊(allowJunk→可抵銷);全鐵塊也能放→一次消多個鐵塊
  if(kind==='wind') return cells.some(([dr,dc])=> board[r+dr][c+dc]);   // 風刃:界內 + 至少一格有方塊(可消)
  if(kind==='earth')return cells.some(([dr,dc])=> board[r+dr][c+dc]);   // 土塊:界內 + 至少一格有方塊(可抓取搬移)
  return cells.every(([dr,dc])=>{const cell=board[r+dr][c+dc];return !cell||(allowJunk&&cell.el==='junk');});   // 一般塊:每格空;只有屬塊(allowJunk)才可蓋鐵塊(放上去抵銷碰到的那格)
}
function computeClears(board, boxElement, boxCard, enemyEl, ampMult, neutralAtk){
  neutralAtk = neutralAtk||0;   // 無屬攻擊基準(= 隊伍最高攻);0=不給無屬傷害(向後相容/偵測用)
  let rows=[],cols=[],boxes=[];
  const filled=(x)=>x&&x.el!=='junk';   // 鐵塊(封鎖)不算「填滿」→ 含鐵塊的線/宮永遠不能消(不給玩家攻擊)
  for(let r=0;r<N;r++)if(board[r].every(filled))rows.push(r);
  for(let c=0;c<N;c++){let f=true;for(let r=0;r<N;r++)if(!filled(board[r][c]))f=false;if(f)cols.push(c);}
  for(let b=0;b<9;b++){const br=Math.floor(b/3)*3,bc=(b%3)*3;let f=true;
    for(let r=br;r<br+3;r++)for(let c=bc;c<bc+3;c++)if(!filled(board[r][c]))f=false;if(f)boxes.push(b);}
  const groups=rows.length+cols.length+boxes.length;
  if(groups===0)return null;
  const cellSet=new Set();
  rows.forEach(r=>{for(let c=0;c<N;c++)cellSet.add(r+'_'+c);});
  cols.forEach(c=>{for(let r=0;r<N;r++)cellSet.add(r+'_'+c);});
  boxes.forEach(b=>{const br=Math.floor(b/3)*3,bc=(b%3)*3;for(let r=br;r<br+3;r++)for(let c=bc;c<bc+3;c++)cellSet.add(r+'_'+c);});
  const mult=(el)=> el==='neutral'?1 : (EL[el].beats===enemyEl?CONFIG.ADV_MULT : (EL[enemyEl].beats===el?CONFIG.WEAK_MULT:CONFIG.NORM_MULT));
  // 逐格屬性傷害:不論宮清/線清,「每個被清的屬區格」都算該屬攻擊(card.atk × 相剋 × CELL_RATE);中性格每格固定底。cellSet 已去重→不會重複計
  const elemCells={};
  cellSet.forEach(k=>{const p=k.split('_');const e=boxElement[boxOf(+p[0],+p[1])];if(e)elemCells[e]=(elemCells[e]||0)+1;});   // 各屬區被清格數
  let total=Math.round(cellSet.size*CONFIG.HIT_BASE), hitWeak=false, parts=[];   // 基礎:每個被清的格(含中性)都算 HIT_BASE → 清越多越強
  ELEMENT_BOXES.forEach(b=>{const card=boxCard[b], e=boxElement[b]; if(!card||e==null)return; const n=elemCells[e]||0; if(!n)return;
    const d=Math.round(card.atk*mult(e)*ampMult*CONFIG.ELEM_RATE*n); total+=d;   // 屬區格再額外加:n × 卡攻擊 × 相剋 × ELEM_RATE
    if(EL[e].beats===enemyEl)hitWeak=true;
    const br=Math.floor(b/3)*3,bc=(b%3)*3; parts.push({el:e,d,r:br+1,c:bc+1});});
  if(neutralAtk>0){ const nC=cellSet.size-Object.values(elemCells).reduce((a,b)=>a+b,0);   // 無屬格數=清除總格-屬區格
    if(nC>0)total+=Math.round(neutralAtk*CONFIG.NORM_MULT*ampMult*CONFIG.ELEM_RATE*nC); }   // 無屬傷害 = 隊伍最高攻×普通×0.08(=屬·普通公式)
  const fx={};
  ELEMENT_BOXES.forEach(b=>{const card=boxCard[b];if(!card)return;const br=Math.floor(b/3)*3,bc=(b%3)*3;
    let hit=false;for(let r=br;r<br+3&&!hit;r++)for(let c=bc;c<bc+3;c++)if(cellSet.has(r+'_'+c))hit=true;
    if(!hit)return;const e=card.el;const o=fx[e]||(fx[e]={atk:0,attrs:[]});
    o.atk=Math.max(o.atk,card.atk);card.attrs.forEach(a=>{if(o.attrs.indexOf(a)<0)o.attrs.push(a);});});
  Object.keys(fx).forEach(e=>{fx[e].level=Math.min(7,Math.floor((elemCells[e]||0)/3))||1;});
  const hits=[];   // 各「有清到的 3×3 宮」=一段攻擊:該宮被清格數 + 傷害(基礎+屬性);Σdmg=total
  for(let b=0;b<9;b++){const br=Math.floor(b/3)*3,bc=(b%3)*3;let cn=0;
    for(let r=br;r<br+3;r++)for(let c=bc;c<bc+3;c++)if(cellSet.has(r+'_'+c))cn++;
    if(!cn)continue;
    const el=boxElement[b],card=boxCard[b];let d=cn*CONFIG.HIT_BASE,hel='neutral';
    if(el!=null&&card){d+=Math.round(card.atk*mult(el)*ampMult*CONFIG.ELEM_RATE*cn);hel=el;}
    else if(neutralAtk>0){d+=Math.round(neutralAtk*CONFIG.NORM_MULT*ampMult*CONFIG.ELEM_RATE*cn);}   // 無屬宮:= 屬·普通(隊伍最高攻×1.0)
    hits.push({b,el:hel,cells:cn,dmg:Math.round(d)});}
  return {groups,cells:[...cellSet].map(k=>k.split('_').map(Number)),parts,total,hitWeak,fx,hits};
}
// Node(headless/回放)用:export 同一份。瀏覽器 classic script 無 module → 跳過,定義仍是共用全域。
// ===== BattleSim:headless 戰鬥模型(純狀態 + 同步運算,無 Phaser)=====
// #16-2b③:把「狀態 + 放塊/resolve」收成一個可在 Node/Worker 重跑的類別。
// 範圍(③):玩家清除這條 authoritative 路徑 — combo 推進 / 每宮傷害(逐宮累加,_blocked 擋下=0)/
//           AoE / 陰陽(yin amp×2、yang 回血)/ 無屬區回血 / 死亡 / 清盤。
// 尚未收(留 ③b/④):storeBlock(影響未來形狀)、endHand 敵回合、技能(water/wind/earth)、勝負/獎勵。
// 敵人用「純模型」物件(無 sprite):{hp,max,atk,el,timer,interval,dead,hitGate,comboGate,...}。
class BattleSim {
  constructor(s){
    s = s || {};
    this.board = s.board;                 // 9×9,格 = {el} 或 null
    this.boxElement = s.boxElement || {};
    this.boxCard = s.boxCard || {};
    this.enemies = s.enemies || [];
    this.target = s.target || 0;
    this.playerHP = s.playerHP|0;
    this.maxHP = s.maxHP|0;
    this.teamRcv = s.teamRcv|0;
    this.lead = s.lead || null;
    this.amp = s.amp || 1;
    this.combo = s.combo || 0;
  }
  targetEnemy(){
    let e = this.enemies[this.target];
    if (e && !e.dead) return e;
    const i = this.enemies.findIndex(x=>!x.dead); this.target = i;
    return i < 0 ? null : this.enemies[i];
  }
  // 同步套用一次「放塊後的清除」。回傳事件包(給 view 演動畫);無清除回 null。與場景 resolve() 的狀態效果等價。
  applyResolve(){
    const tgt = this.targetEnemy(); if(!tgt) return null;
    const data = computeClears(this.board, this.boxElement, this.boxCard, tgt.el, this.amp);
    if(!data) return null;
    this.combo += 1;                                            // 逐塊 combo:這塊有清→+1
    const plan = planResolve(data, this.lead, this.teamRcv, this.combo);
    const n = data.cells.length, aoe = plan.aoe;
    const victims = aoe ? this.enemies.filter(e=>!e.dead) : [tgt];
    // 陰陽子屬性(fireAttr):yang 回血、yin 本手起傷害×2(amp 給下一手用)
    let yangHeal = 0;
    Object.keys(data.fx).forEach(el=>{ const f = data.fx[el]; (f.attrs||[]).forEach(a=>{
      if(a==='yang'){ const v=Math.round(f.atk*CONFIG.ATTR.yang_heal_rate*f.level); this.playerHP=Math.min(this.maxHP,this.playerHP+v); yangHeal+=v; }
      else if(a==='yin'){ this.amp=Math.max(this.amp,2); }
    });});
    { const atkEls=Object.keys(data.fx); victims.forEach(en=>{ if(!en.dead && atkEls.some(e=>EL[e]&&EL[e].beats===en.el)) en.timer+=1; }); }   // 相剋打弱點→該敵延後出手:AoE(15HIT↑)對每隻被剋敵生效,單體只判鎖定目標
    data.cells.forEach(([r,c])=>{ this.board[r][c]=null; });   // 立即清盤
    // 護盾門檻:本手 HIT/連段沒達標的 victim 這手不扣血
    this.enemies.forEach(e=>{ e._blocked=false; });
    victims.forEach(v=>{ v._blocked = ((v.hitGate&&n<v.hitGate)||(v.comboGate&&this.combo<v.comboGate)); });
    // 傷害:每宮 dmg 對每個未被擋的 victim 逐宮累加
    const perVictim = plan.hits.reduce((s,h)=>s+h.dmg, 0);
    victims.forEach(v=>{ if(!v._blocked) v.hp=Math.max(0, v.hp-perVictim); });
    // 無屬區回血:每個 neutral 宮按「被清格數」回血(heal×格數/3),teamRcv>0 才有
    let neutralHeal = 0;
    if(this.teamRcv>0) plan.hits.forEach(h=>{ if(h.el==='neutral'){ const hv=Math.max(1,Math.round(plan.heal*h.cells/3)); this.playerHP=Math.min(this.maxHP,this.playerHP+hv); neutralHeal+=hv; } });
    // 死亡標記(獎勵留 ④)
    const deaths=[];
    this.enemies.forEach((e,idx)=>{ if(!e.dead && e.hp<=0){ e.dead=true; deaths.push(idx); } });
    return { data, plan, combo:this.combo, n, aoe,
             victims: victims.map(v=>this.enemies.indexOf(v)),
             perVictim, neutralHeal, yangHeal, deaths,
             playerHP:this.playerHP, amp:this.amp };
  }
  snapshot(){ return { combo:this.combo, amp:this.amp, playerHP:this.playerHP,
    enemies:this.enemies.map(e=>({hp:e.hp,dead:!!e.dead,timer:e.timer})) }; }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { N, EL, ELEMENT_BOXES, NEUTRAL_FILL, NEUTRAL_DARK, SHAPES, WSUM, CONFIG, SHAPES_BY_EL,
    COMBO_K, COMBO_RAMP, AOE_HIT, WIND_SKILL_MUL, NEUTRAL_HEAL_MUL, comboMultiplier, leadDamageMult, planResolve, BattleSim,
    chakraShape, normCells, rot90, randOrient, rnd, mulberry32, brnd, startBattleSeed, pickShape, boxOf, canPlace, computeClears,
    _setBRNG:(fn)=>{BRNG=fn;} };
}
