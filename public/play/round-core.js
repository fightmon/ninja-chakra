/* ===== round-core.js — 三輪(第一/二/三輪)共用核心(2026-11-06 階段 (a) 前端) =====
 * 同一座五屬城、同六難度,分三輪:
 *   第一輪=簡單拖盤池 + 怪 ×0.65 / 第二輪=標準池 + ×1.0(恆等) / 第三輪=困難池 + ×1.34。
 * 純函式、無副作用;只依賴 battle-core.js 的 SHAPES 與 brnd(種子亂數流,同 pickShape)。
 * 瀏覽器:classic script,battle-core.js 之後載入,全域 RoundCore;Node:require('./round-core.js')。
 * 三池定義「本檔為唯一來源,003_plan/nbsim2.mjs 直接 require 本檔的 boardPool(2026-11-08 起)」(格座標從 SHAPES 查表、不手抄,權重按規格覆寫):
 *   easy = 【2026-11-20 大毛拍板:看盤面多滿才出手救】三段制,池隨「發這手三塊當下的盤面佔用比例」切換(EASY_TIERS,門檻/權重皆可調):
 *          平常(<MID_AT)七種矩形都出、長條不特別加權;擁擠(≥MID_AT)長條+小塊加重、2×3/3×2 拿掉;快滿(≥HIGH_AT)再加 1×1 救援;無 3×3。
 *          (舊:上一版 1×2/2×1/2×2/2×3/3×2 各 w1 + 1×3/3×1 各 w2;再舊 2026-11-08 五種等權重)
 *          佔用比例=boardOcc(盤面):有東西的格/總格數,鐵塊等敵人放的格也算(一樣擋落點;救援看的是放不放得下)。遊戲 refill 與 sim drawTray 都呼叫 dealTray(mode, 盤面, 難度),本檔是唯一邏輯;
 *          【2026-11-20 第2批】救援依難度分級 EASY_RESCUE_BY_DIFF(超級關擁擠段、地獄全關);
 *          【2026-11-20 晚 大毛拍板】「三塊保證都放得進去」(dealTray)改看 GUARANTEE_BY(塊池×難度):三池都只在入門/初級開,中級以上全關;
 *   std  = SHAPES.filter(!hard)(≡ pickShape(true));
 *   hard = 全 SHAPES,2×3/3×2 降 w1、十字降 w1(1×5/5×1 沿用 w3)。
 * 本檔只管前端;票券/解鎖真相/掉率是階段 (b)(後端)。 */
(function (root) {
  'use strict';
  const BC = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./battle-core.js') : null;
  const _SHAPES = () => BC ? BC.SHAPES : SHAPES;   // 瀏覽器:battle-core 的頂層 const SHAPES(跨 classic script 可直接以名稱取用)
  const _brnd = n => BC ? BC.brnd(n) : brnd(n);                                                                       // 瀏覽器:battle-core 的 brnd(戰鬥種子流)

  const ROUND_DEFAULT = {
    1: { hp: 0.9, atk: 0.65, board: 'easy' },   // 2026-11-09 製作人:第一輪怪血 0.65→0.9(攻擊不變;第一輪易出 12HIT,血厚一點讓玩家熟悉機制;sim 過關率不變、地獄每關約 +3 手,見 003_plan/enc-sim-20261109/r1hp-sweep.md)
    2: { hp: 1, atk: 1, board: 'std' },
    3: { hp: 1.34, atk: 1.34, board: 'hard' },
  };
  // 建議 LV:每難度 [第一輪, 第二輪, 第三輪](預設表,製作人可調)
  const LEVELS = { baby: [1, 20, 40], beginner: [10, 30, 50], normal: [20, 40, 60], advanced: [25, 45, 65], super: [30, 50, 70], hell: [40, 60, 80] };
  const BOARD_MODES = ['easy', 'std', 'hard'];

  // ── 塊池 ──
  const _ck = c => JSON.stringify(c);
  const _CROSS = [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], _R23 = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], _R32 = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]];
  // 簡單池三段制(2026-11-20):座標順序固定=扣減順序 1×2,2×1,2×2,2×3,3×2,1×3,3×1,1×1;各段權重陣列與此一一對應,權重 0=該段不出(不進池);權重須為整數(brnd 抽整數)。
  //   數值出處:scratchpad s2/dl2.cjs 貪婪 bot 5 種子×6000 手——舊五種等權 11.4% / 上一版 7.5% / 本表 7.0% 卡死;平常段長條佔 1/3(上一版 44%)。
  //   平常段 2×3/3×2 權重減半:bot 卡死九成卡在 2×3/3×2(發牌時盤面 40~60%、放完兩塊後第三塊塞不進),而這區間還沒到擁擠門檻。
  const _EASY_CELLS = [[[0, 0], [0, 1]], [[0, 0], [1, 0]], [[0, 0], [0, 1], [1, 0], [1, 1]], _R23, _R32, [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]], [[0, 0]]];
  const EASY_TIERS = {
    MID_AT: 0.6,    // 佔用 ≥ 60%(≥49/81 格)→ 擁擠段
    HIGH_AT: 0.9,   // 佔用 ≥ 90%(≥73/81 格)→ 快滿段
    //          1×2 2×1 2×2 2×3 3×2 1×3 3×1 1×1
    normal: [2, 2, 2, 1, 1, 2, 2, 0],   // 和 12:七種都出,長條 4/12≈33%、小塊 33%、2×3/3×2 各 1/12
    mid:    [3, 3, 1, 0, 0, 3, 3, 0],   // 和 13:長條 46%、小塊 46%、2×2 8%,不出 2×3/3×2
    high:   [3, 3, 1, 0, 0, 2, 2, 6],   // 和 17:1×1 35%(剩 ≤8 空格時真的塞得進)、小塊 35%、長條 24%、2×2 6%
  };
  // 2026-11-20 第2批(大毛拍板):簡單池救援依難度分級。mid=擁擠段(≥MID_AT)、high=快滿段(≥HIGH_AT)。三塊保證不在這張表,見 GUARANTEE_BY。
  //   關掉的段=該佔用區間改用平常段權重;沒給難度/查無難度=全開(=11/20 第1批行為)。只作用 easy 池,std/hard 完全不看。可調:直接改這張表。
  const EASY_RESCUE_BY_DIFF = {
    baby:     { mid: true,  high: true  },   // 入門:完整三段制
    beginner: { mid: true,  high: true  },   // 初級
    normal:   { mid: true,  high: true  },   // 中級
    advanced: { mid: true,  high: true  },   // 上級
    super:    { mid: false, high: true  },   // 超級:六成那段關掉,只留九成以上的快滿段(出 1×1)
    hell:     { mid: false, high: false },   // 地獄:全關,任何盤面都用平常段權重
  };
  const _RESCUE_ALL = { mid: true, high: true };
  function easyRescue(dk) { return (dk && EASY_RESCUE_BY_DIFF[dk]) || _RESCUE_ALL; }
  // 2026-11-20 晚(大毛拍板):三塊保證適用範圍=塊池 × 難度。每種塊池對玩家都是新的拖盤,剛接觸時好解一點 → 三池都只在入門/初級開,中級以上全關。
  //   可調:直接改這張表(true=該池該難度發牌保證三塊都放得下,見 dealTray)。沒給難度/查無難度=不保證。簡單池的三段制救援(EASY_RESCUE_BY_DIFF)與這張表無關。
  const GUARANTEE_BY = {
    //        入門        初級            中級           上級             超級          地獄
    easy: { baby: true, beginner: true, normal: false, advanced: false, super: false, hell: false },
    std:  { baby: true, beginner: true, normal: false, advanced: false, super: false, hell: false },
    hard: { baby: true, beginner: true, normal: false, advanced: false, super: false, hell: false },
  };
  function guaranteeOn(mode, dk) { const t = GUARANTEE_BY[mode]; return !!(t && dk && t[dk] === true); }
  function easyTier(occ, dk) {   // dk=難度 key(可省略=全開);某段關掉→落回下一段(快滿關→看擁擠,擁擠也關→平常)
    occ = +occ; if (!(occ > 0)) return 'normal'; const f = easyRescue(dk);
    if (occ >= EASY_TIERS.HIGH_AT && f.high) return 'high';
    if (occ >= EASY_TIERS.MID_AT && f.mid) return 'mid';
    return 'normal';
  }
  function boardOcc(board) {   // 盤面佔用比例 0~1:有東西(truthy)的格 / 總格數;鐵塊({el:'iron',lock})等敵人放的格也算。沒盤面=0
    if (!board || !board.length) return 0; let f = 0, n = 0;
    for (const row of board) { if (!row) continue; for (let i = 0; i < row.length; i++) { n++; if (row[i]) f++; } }
    return n ? f / n : 0;
  }
  function _shapeOf(c) { const s = _SHAPES().find(x => _ck(x.c) === _ck(c)); if (!s) throw new Error('RoundCore: SHAPES 查無形狀 ' + _ck(c)); return s; }
  const _cache = {};
  function boardPool(mode, occ, dk) {   // → {list:[{w, c}], sum}(快取;條目順序=抽法的扣減順序,與 nbsim2 boardPool 同序);occ=盤面佔用比例、dk=難度 key,只有 easy 看,std/hard 忽略
    if (!BOARD_MODES.includes(mode)) mode = 'std';
    const tw = mode === 'easy' ? EASY_TIERS[easyTier(occ, dk)] : null, ck = mode === 'easy' ? 'easy:' + tw.join(',') : mode;   // easy 快取鍵含權重→EASY_TIERS 被 sim 掃描改值也不會吃到舊池
    if (_cache[ck]) return _cache[ck];
    let P;
    if (mode === 'easy') P = _EASY_CELLS.map((c, i) => ({ w: tw[i] | 0, c: _shapeOf(c).c })).filter(s => s.w > 0);
    else if (mode === 'std') P = _SHAPES().filter(s => !s.hard).map(s => ({ w: s.w, c: s.c }));
    else P = _SHAPES().map(s => ({ w: (_ck(s.c) === _ck(_R23) || _ck(s.c) === _ck(_R32)) ? 1 : (_ck(s.c) === _ck(_CROSS) ? 1 : s.w), c: s.c }));
    _cache[ck] = { list: P, sum: P.reduce((a, s) => a + s.w, 0) };
    return _cache[ck];
  }
  function _pickFrom(p, rn) { let r = rn(p.sum); for (const s of p.list) { r -= s.w; if (r < 0) return s.c.map(x => x.slice()); } return p.list[0].c.map(x => x.slice()); }
  function pickBoardShape(mode, occ, dk) {   // 單次 brnd(權重和),依表序扣減(同 pickShape / nbsim2 pickFrom);回傳深拷貝座標;occ/dk 見 boardPool
    return _pickFrom(boardPool(mode, occ, dk), _brnd);
  }

  // ── 2026-11-20 第2批:「三塊保證都放得進去」(2026-11-20 晚起:三池皆可,看 GUARANTEE_BY[塊池][難度]) ──
  // 以「發牌當下的盤面」為準:存在某種放置順序(含每放一塊後的清行/列/宮)讓三塊都放得下,才發這手。
  //   只從當下段位的池裡挑現成塊型(不產新形狀、不裁切、不拆小):先照常抽 3 塊→不行就重抽(最多 REDRAW 次)→再不行列舉池內所有有序三塊組合、
  //   只留解得開的、按權重乘積一次 brnd 挑(=條件分布,跟無限重抽同分布)→盤面真的塞不下任何組合 / 搜尋超過 NODE_BUDGET → 退回第一次的一般抽法(不卡死迴圈)。
  //   清除模擬取保守:行/列/宮滿(鐵塊算滿、junk 封鎖格不算滿)才清,清掉的格變空但鐵塊格保留(實際上鐵塊可能被剝層清掉→實際空間只會更多,保證不會誤判)。
  //   亂數:第一次 3 抽與舊抽法完全相同;只有保證開且第一次不成立才多耗亂數 → 保證關的格子(GUARANTEE_BY=false)同種子序列不受影響。
  const EASY_GUARANTEE = { REDRAW: 8, NODE_BUDGET: 150000 };   // NODE_BUDGET=每次發牌最多試的「落點」數(含所有重抽/列舉,共用一個額度);實測:bot 3 萬手單次最多用 8.9 萬、對抗盤燒滿 15 萬約 6ms(桌機)
  const _N = 9, _GROUPS = [], _CELL_G = Array.from({ length: 81 }, () => []);
  for (let i = 0; i < 9; i++) { _GROUPS.push(Array.from({ length: 9 }, (_, k) => i * 9 + k)); _GROUPS.push(Array.from({ length: 9 }, (_, k) => k * 9 + i)); const br = ((i / 3) | 0) * 3, bc = (i % 3) * 3, g = []; for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) g.push(r * 9 + c); _GROUPS.push(g); }
  _GROUPS.forEach((g, gi) => g.forEach(x => _CELL_G[x].push(gi)));
  const _plCache = {};
  function _placements(c) {   // 形狀所有界內落點 → 格索引陣列(快取)
    const k = _ck(c); if (_plCache[k]) return _plCache[k];
    const h = Math.max(...c.map(x => x[0])) + 1, w = Math.max(...c.map(x => x[1])) + 1, out = [];
    for (let r = 0; r + h <= _N; r++) for (let q = 0; q + w <= _N; q++) out.push(c.map(([dr, dc]) => (r + dr) * _N + q + dc));
    return (_plCache[k] = out);
  }
  function _encBoard(board) {   // 0=空 1=一般(可清) 2=junk(擋、所在線永不滿) 3=鐵塊(擋、算滿、清除後保守視為還在)
    const b = new Int8Array(81);
    for (let r = 0; r < _N; r++) { const row = board[r]; if (!row) continue; for (let c = 0; c < _N; c++) { const v = row[c]; if (v) b[r * _N + c] = (v.el === 'junk') ? 2 : (v.el === 'iron' ? 3 : 1); } }
    return b;
  }
  function _placeClear(b, P) {
    const n = b.slice(); for (const x of P) n[x] = 1;
    let clr = null;
    for (const x of P) for (const gi of _CELL_G[x]) { const g = _GROUPS[gi]; let full = true; for (const y of g) { const v = n[y]; if (!v || v === 2) { full = false; break; } } if (full) (clr || (clr = [])).push(g); }
    if (clr) for (const g of clr) for (const y of g) if (n[y] !== 3) n[y] = 0;
    return n;
  }
  function _solvable(b, items, budget) {   // items=[{k,pl}];true/false;超過額度回 null(視為不確定→不保證)
    const tried = {};
    for (let i = 0; i < items.length; i++) {
      const it = items[i]; if (tried[it.k]) continue; tried[it.k] = 1;   // 同形狀只當第一塊試一次
      const rest = items.length > 1 ? items.filter((_, j) => j !== i) : null;
      for (const P of it.pl) {
        if (--budget.n < 0) return null;
        let fit = true; for (const x of P) if (b[x]) { fit = false; break; }
        if (!fit) continue;
        if (!rest) return true;
        const r = _solvable(_placeClear(b, P), rest, budget);
        if (r) return true; if (r === null) return null;
      }
    }
    return false;
  }
  function traySolvable(board, shapes, budgetN) {   // 對外(測試/除錯):這組塊在此盤面是否存在放得完的順序;null=超過額度
    return _solvable(_encBoard(board), shapes.map(c => ({ k: _ck(c), pl: _placements(c) })), { n: budgetN || EASY_GUARANTEE.NODE_BUDGET });
  }
  const DEAL_STATS = { deals: 0, firstOk: 0, redrawOk: 0, enumOk: 0, fallback: 0, budgetOut: 0, nodesMax: 0 };   // 只做統計(sim/測試看),不影響結果
  function dealTray(mode, board, dk, rng) {   // 發一手三塊 → [座標×3](深拷貝);rng=整數亂數 n→[0,n)(sim 傳自己的 BC.brnd;省略=battle-core brnd)
    const rn = rng || _brnd, occ = boardOcc(board), p = boardPool(mode, occ, dk);
    const draw = () => [_pickFrom(p, rn), _pickFrom(p, rn), _pickFrom(p, rn)];
    const first = draw();
    if (!guaranteeOn(mode, dk) || !board || !board.length) return first;
    DEAL_STATS.deals++;
    const b = _encBoard(board), budget = { n: EASY_GUARANTEE.NODE_BUDGET }, memo = {};
    const done = (t, kind) => { const used = EASY_GUARANTEE.NODE_BUDGET - Math.max(0, budget.n); if (used > DEAL_STATS.nodesMax) DEAL_STATS.nodesMax = used; DEAL_STATS[kind]++; return t; };
    const ok = t => { const k = t.map(_ck).sort().join('|'); if (k in memo) return memo[k]; return (memo[k] = _solvable(b, t.map(c => ({ k: _ck(c), pl: _placements(c) })), budget)); };
    let r = ok(first); if (r) return done(first, 'firstOk'); if (r === null) { DEAL_STATS.budgetOut++; return done(first, 'fallback'); }
    for (let i = 0; i < EASY_GUARANTEE.REDRAW; i++) { const t = draw(); r = ok(t); if (r) return done(t, 'redrawOk'); if (r === null) { DEAL_STATS.budgetOut++; return done(first, 'fallback'); } }
    const L = p.list, cand = []; let S = 0;
    for (const a of L) for (const b2 of L) for (const c of L) { r = ok([a.c, b2.c, c.c]); if (r === null) { DEAL_STATS.budgetOut++; return done(first, 'fallback'); } if (r) { const w = a.w * b2.w * c.w; cand.push([w, a.c, b2.c, c.c]); S += w; } }
    if (!S) return done(first, 'fallback');   // 盤面真的塞不下任何三塊組合 → 退回一般抽法
    let q = rn(S);
    for (const x of cand) { q -= x[0]; if (q < 0) return done([x[1], x[2], x[3]].map(c => c.map(y => y.slice())), 'enumOk'); }
    return done([cand[0][1], cand[0][2], cand[0][3]].map(c => c.map(y => y.slice())), 'enumOk');
  }

  // ── 怪倍率 ──
  // 稀有/素材怪不乘輪:金屬(c71~73)/金錢(c74~76)/寶玉(c61~65)、neutral 屬、核心帶 _m/_y/_j/rare 旗標者。
  // 例外(2026-11-10):寶玉怪的 ATK 乘輪 atk 倍率(HP 不乘),見 tuneEnemies / _isJewelAtk。
  function _isRare(e) {
    if (!e) return true;
    if (e.rare || e._m || e._y || e._j) return true;
    if (e.el === 'neutral') return true;
    const m = /^c(\d+)$/.exec(e.cardId || ''); if (m) { const n = +m[1]; if ((n >= 61 && n <= 65) || (n >= 71 && n <= 76)) return true; }
    return false;
  }
  // 2026-11-09 minionhpmul:小怪關(高級/超級/地獄 的 S1、S2)非魔王怪「額外」血量倍率旋鈕。格式 { 難度: [[R1S1,R1S2],[R2S1,R2S2],[R3S1,R3S2]] },缺格/0/非數字=1。
  // 出廠 {} = 完全無作用(遊戲與 sim 行為零改變);只作用 advanced/super/hell × stage 1|2 × 非魔王 × 非稀有怪;與輪倍率相乘(hp = base × 輪hp × 此倍率)。sim 掃描用 env MINION_HP_MUL 覆寫此表。
  const MINION_HP_MUL_BY_STAGE = {};
  const _MHM_DK = { advanced: 1, super: 1, hell: 1 };
  function minionHpMul(dk, round, stage) {
    if (!_MHM_DK[dk] || (stage !== 1 && stage !== 2) || !(round >= 1 && round <= 3)) return 1;
    const t = MINION_HP_MUL_BY_STAGE[dk], row = t && t[round - 1], v = row && +row[stage - 1];
    return v > 0 && isFinite(v) ? v : 1;
  }
  function applyMinionHp(enemies, dk, round, stage) {   // 就地乘 hp/max;標 _mhm 防重複;魔王/稀有怪不動;倍率=1 直接 return(物件不變)
    const m = minionHpMul(dk, round, stage);
    if (m === 1 || !enemies) return enemies;
    enemies.forEach(e => {
      if (!e || e.boss || _isRare(e) || e._mhm) return;
      e.max = Math.max(1, Math.round(e.max * m)); e.hp = Math.max(1, Math.round(e.hp * m)); e._mhm = true;
    });
    return enemies;
  }
  // 2026-11-10 atk:普攻傷害係數 PLAIN_ATK_MUL_BY_DIFF = { 難度: [第一輪, 第二輪, 第三輪] },缺格/<=0/非數字=1。
  // 乘在「非金屬/金錢、非 4★ 酋長」的小怪/串場/招牌怪/寶玉怪 e.atk 上(方塊怪、串場、哥布林 1~3★ 的普通出手與拆除後普攻、寶玉怪攻擊),並記 e._pm;
  // 哥布林骷髏/魔王骷髏猛擊在 enemy-core kFor 內抵銷 e._pm → 骷髏絕對傷害不變(K 表與血量檢定都不用重校)。寶玉怪的 ATK 也乘「輪」atk 倍率(2026-11-10,tuneEnemies),HP 不乘;再乘本係數。
  // 目標=每下普攻佔建議隊 HP:入門 5%/初級 5.5%/中級 6%/上級 6.3%/超級 6.6%/地獄 R1 不動;方塊怪 CD 同時縮短(ENC_CUBE_CD),整場普攻總傷變高 → 係數已相應下修。
  const PLAIN_ATK_MUL_BY_DIFF = { baby: [3.3, 2.7, 3.6], beginner: [2.1, 2.6, 3.5], normal: [2.05, 1.9, 2.5], advanced: [2.55, 2.35, 2.35], super: [1.55, 1.5, 1.5], hell: [1, 1.1, 1.1] };
  function plainAtkMul(dk, round) { const row = PLAIN_ATK_MUL_BY_DIFF[dk], v = row && +row[round - 1]; return v > 0 && isFinite(v) ? v : 1; }
  function _isJewelAtk(e) { if (!e) return false; if (e.mon === 'jewel' || e._j) return true; const m = /^c(\d+)$/.exec(e.cardId || ''); return !!(m && +m[1] >= 61 && +m[1] <= 65); }
  function applyPlainAtk(enemies, dk, round) {   // 就地乘 atk;標 _pm 防重複;金屬/金錢怪/4★ 酋長/倍率=1 不動;寶玉怪要乘
    const m = plainAtkMul(dk, round);
    if (m === 1 || !enemies) return enemies;
    enemies.forEach(e => {
      if (!e || e._pm || (_isRare(e) && !_isJewelAtk(e)) || (e.boss && (e.star || e.tier || 0) >= 4) || (e.tier === 0 && e.boss)) return;
      e.atk = Math.max(1, Math.round(e.atk * m)); e._pm = m;
    });
    return enemies;
  }
  function tuneEnemies(enemies, tune, round, opts) {   // 就地修改並回傳;hp×=round.hp、atk×=round.atk;starTable[s].atk 同乘、.max 不乘;標 _tuned 防重複套用
    const t = tune && tune[round];
    if (!enemies || !t) return enemies;
    const mh = +t.hp, ma = +t.atk;
    if ((mh === 1 && ma === 1) || !(mh > 0) || !(ma > 0)) return opts ? applyPlainAtk(applyMinionHp(enemies, opts.dk, round, opts.stage), opts.dk, round) : enemies;   // 第二輪恆等:連 _tuned 都不標,物件逐欄位與現行相同
    enemies.forEach(e => {
      const jw = _isJewelAtk(e);   // 2026-11-10 寶玉怪(c61~65 / mon=jewel / _j):ATK 也乘三輪 atk 倍率,HP 仍不乘;金屬/金錢/其他稀有怪完全不動
      if ((_isRare(e) && !jw) || e._tuned) return;
      if (!jw) {
        e.max = Math.max(1, Math.round(e.max * mh));
        e.hp = Math.max(1, Math.round(e.hp * mh));
      }
      e.atk = Math.max(1, Math.round(e.atk * ma));
      if (e.starTable && typeof e.starTable === 'object') Object.keys(e.starTable).forEach(s => { const r = e.starTable[s]; if (r && r.atk != null) r.atk = Math.max(1, Math.round(r.atk * ma)); });
      e._tuned = true;
    });
    return opts ? applyPlainAtk(applyMinionHp(enemies, opts.dk, round, opts.stage), opts.dk, round) : enemies;
  }
  // 覆寫表合併:只收 {hp>0, atk>0, board∈三池} 的合法欄位;任何不合法/缺漏→該欄回退預設(整份壞掉=回傳預設的拷貝)
  function mergeTuning(base, over) {
    const out = {}; base = base || ROUND_DEFAULT;
    [1, 2, 3].forEach(r => { out[r] = Object.assign({}, base[r] || ROUND_DEFAULT[r]); });
    try {
      if (over && typeof over === 'object') {
        const src = over.rounds || over.round || over;
        [1, 2, 3].forEach(r => {
          const o = src[r]; if (!o || typeof o !== 'object') return;
          if (typeof o.hp === 'number' && isFinite(o.hp) && o.hp > 0) out[r].hp = o.hp;
          if (typeof o.atk === 'number' && isFinite(o.atk) && o.atk > 0) out[r].atk = o.atk;
          if (BOARD_MODES.includes(o.board)) out[r].board = o.board;
        });
      }
    } catch (e) { }
    return out;
  }

  const RoundCore = { ROUND_DEFAULT, LEVELS, BOARD_MODES, EASY_TIERS, EASY_RESCUE_BY_DIFF, easyRescue, GUARANTEE_BY, guaranteeOn, easyTier, boardOcc, boardPool, pickBoardShape, EASY_GUARANTEE, dealTray, traySolvable, DEAL_STATS, tuneEnemies, mergeTuning, _isRare, _isJewelAtk, MINION_HP_MUL_BY_STAGE, minionHpMul, applyMinionHp, PLAIN_ATK_MUL_BY_DIFF, plainAtkMul, applyPlainAtk };
  root.RoundCore = RoundCore;
  if (typeof module !== 'undefined' && module.exports) module.exports = RoundCore;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
