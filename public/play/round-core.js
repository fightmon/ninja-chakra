/* ===== round-core.js — 三輪(第一/二/三輪)共用核心(2026-11-06 階段 (a) 前端) =====
 * 同一座五屬城、同六難度,分三輪:
 *   第一輪=簡單拖盤池 + 怪 ×0.65 / 第二輪=標準池 + ×1.0(恆等) / 第三輪=困難池 + ×1.34。
 * 純函式、無副作用;只依賴 battle-core.js 的 SHAPES 與 brnd(種子亂數流,同 pickShape)。
 * 瀏覽器:classic script,battle-core.js 之後載入,全域 RoundCore;Node:require('./round-core.js')。
 * 三池定義「本檔為唯一來源,003_plan/nbsim2.mjs 直接 require 本檔的 boardPool(2026-11-08 起)」(格座標從 SHAPES 查表、不手抄,權重按規格覆寫):
 *   easy = 5 條目等權重(1×2/2×1/2×2/2×3/3×2;【定案 2026-11-08 試玩回饋】移除 1×1/1×3/3×1,不加 3×3);
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
  const _EASY = [[[0, 0], [0, 1]], [[0, 0], [1, 0]], [[0, 0], [0, 1], [1, 0], [1, 1]], _R23, _R32];   // 1×2/2×1/2×2/2×3/3×2(全在 battle-core SHAPES 內,_shapeOf 查表)
  function _shapeOf(c) { const s = _SHAPES().find(x => _ck(x.c) === _ck(c)); if (!s) throw new Error('RoundCore: SHAPES 查無形狀 ' + _ck(c)); return s; }
  const _cache = {};
  function boardPool(mode) {   // → [{w, c}](快取;條目順序=抽法的扣減順序,與 nbsim2 boardPool 同序)
    if (!BOARD_MODES.includes(mode)) mode = 'std';
    if (_cache[mode]) return _cache[mode];
    let P;
    if (mode === 'easy') P = _EASY.map(c => { const s = _shapeOf(c); return { w: 1, c: s.c }; });
    else if (mode === 'std') P = _SHAPES().filter(s => !s.hard).map(s => ({ w: s.w, c: s.c }));
    else P = _SHAPES().map(s => ({ w: (_ck(s.c) === _ck(_R23) || _ck(s.c) === _ck(_R32)) ? 1 : (_ck(s.c) === _ck(_CROSS) ? 1 : s.w), c: s.c }));
    _cache[mode] = { list: P, sum: P.reduce((a, s) => a + s.w, 0) };
    return _cache[mode];
  }
  function pickBoardShape(mode) {   // 單次 brnd(權重和),依表序扣減(同 pickShape / nbsim2 pickFrom);回傳深拷貝座標
    const p = boardPool(mode); let r = _brnd(p.sum);
    for (const s of p.list) { r -= s.w; if (r < 0) return s.c.map(x => x.slice()); }
    return p.list[0].c.map(x => x.slice());
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

  const RoundCore = { ROUND_DEFAULT, LEVELS, BOARD_MODES, boardPool, pickBoardShape, tuneEnemies, mergeTuning, _isRare, _isJewelAtk, MINION_HP_MUL_BY_STAGE, minionHpMul, applyMinionHp, PLAIN_ATK_MUL_BY_DIFF, plainAtkMul, applyPlainAtk };
  root.RoundCore = RoundCore;
  if (typeof module !== 'undefined' && module.exports) module.exports = RoundCore;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
