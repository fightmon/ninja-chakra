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
function canPlace(board,cells,r,c,kind){
  const inB=cells.every(([dr,dc])=>{const rr=r+dr,cc=c+dc;return rr>=0&&rr<N&&cc>=0&&cc<N;});
  if(!inB)return false;
  if(kind==='water')return cells.some(([dr,dc])=>!board[r+dr][c+dc]);   // 水塊:界內 + 至少一格空(可填)
  if(kind==='wind') return cells.some(([dr,dc])=> board[r+dr][c+dc]);   // 風刃:界內 + 至少一格有方塊(可消)
  if(kind==='earth')return cells.some(([dr,dc])=> board[r+dr][c+dc]);   // 土塊:界內 + 至少一格有方塊(可抓取搬移)
  return cells.every(([dr,dc])=>!board[r+dr][c+dc]);                    // 一般塊:全空
}
function computeClears(board, boxElement, boxCard, enemyEl, ampMult){
  let rows=[],cols=[],boxes=[];
  for(let r=0;r<N;r++)if(board[r].every(x=>x))rows.push(r);
  for(let c=0;c<N;c++){let f=true;for(let r=0;r<N;r++)if(!board[r][c])f=false;if(f)cols.push(c);}
  for(let b=0;b<9;b++){const br=Math.floor(b/3)*3,bc=(b%3)*3;let f=true;
    for(let r=br;r<br+3;r++)for(let c=bc;c<bc+3;c++)if(!board[r][c])f=false;if(f)boxes.push(b);}
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
    hits.push({b,el:hel,cells:cn,dmg:Math.round(d)});}
  return {groups,cells:[...cellSet].map(k=>k.split('_').map(Number)),parts,total,hitWeak,fx,hits};
}
// Node(headless/回放)用:export 同一份。瀏覽器 classic script 無 module → 跳過,定義仍是共用全域。
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { N, EL, ELEMENT_BOXES, NEUTRAL_FILL, NEUTRAL_DARK, SHAPES, WSUM, CONFIG, SHAPES_BY_EL,
    chakraShape, normCells, rot90, randOrient, rnd, mulberry32, brnd, startBattleSeed, pickShape, boxOf, canPlace, computeClears,
    _setBRNG:(fn)=>{BRNG=fn;} };
}
