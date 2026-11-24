// enemy-fx.js — 敵技演出(EFX)的開關解析與定位純計算。2026-11-24 步 1a 建立。
// 規格:001_website/docs/spec-enemy-skill-fx.md(3.0、3.0.1、3.0.2、3.1、3.4、3.5、3.7.2;參數表 1.0~1.1、1.4、1.6.3)。
// 本檔只定義全域 EnemyFX,沒有任何副作用:不建物件、不載圖、不呼叫 Math.random、不讀寫存檔。
// 遊戲(index.html)與 node 測試(003_plan/test-efx.cjs)共用;遊戲端只留 if (EFX.sN) 的薄鉤子。
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EnemyFX = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── 開關 ────────────────────────────────────────────────────────────────
  // 步號＝規格第 6 節:s1 共用地基、s2 火、s3 土、s4 水、s5 雷、s6 風、s7 表情氣泡、s8 鬥氣、s9 整理。
  const STEPS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'];
  function allOff() { const o = {}; STEPS.forEach(k => { o[k] = false; }); return o; }

  // 解析網址開關。預設全關。
  //   ?efx=1 或 ?efx=all → 全開;?efx=1,2,7 → 只開列出的步(數字＝步號;注意 ?efx=1 是「全開」,只開步 1 請寫 ?efx=s1);
  //   ?efx_off=7 → 從已開的步再關掉(可多個,逗號分隔);開任一步自動帶 s1(地基)。
  //   env.enc / env.newmech / env.feel2 任一為假 → 全部強制關(五城新機制沒開就沒有 core 事件;feel2 關＝整套新演出都不跑)。
  //   不讀不寫 ?lonely(水城孤身只靠 core 事件,lonely 沒開就沒事件、自然不演)。
  function parseFlags(search, env) {
    const o = allOff();
    try {
      env = env || {};
      if (!env.enc || !env.newmech || !env.feel2) return o;
      const q = String(search || '');
      const m = /[?&]efx=([^&#]*)/.exec(q);
      if (!m) return o;
      const v = decodeURIComponent(m[1]).trim().toLowerCase();
      if (v === '' || v === '0') return o;
      const on = (v === '1' || v === 'all') ? STEPS.slice() : v.split(',').map(t => t.trim()).filter(Boolean).map(t => (t[0] === 's' ? t : 's' + t));
      on.forEach(k => { if (Object.prototype.hasOwnProperty.call(o, k)) o[k] = true; });
      const off = /[?&]efx_off=([^&#]*)/.exec(q);
      if (off) decodeURIComponent(off[1]).split(',').map(t => t.trim().toLowerCase()).filter(Boolean).forEach(t => { const k = t[0] === 's' ? t : 's' + t; if (Object.prototype.hasOwnProperty.call(o, k)) o[k] = false; });
      if (STEPS.some(k => k !== 's1' && o[k])) o.s1 = true;   // 地基是前置:開任一步自動帶 s1(即使 efx_off=1)
    } catch (e) { return allOff(); }
    return o;
  }
  function anyOn(flags) { return !!flags && STEPS.some(k => flags[k]); }

  // 每個 EFX 入口包一層:出錯就把該步關掉(Phaser 回呼例外會停住整個主迴圈),只報一次錯,回傳 fallback。
  // onFail(選填):出錯關步之後呼叫一次(例:收掉這一步已建的物件,免得畫面留半套)。
  function guard(flags, step, fn, fallback, onFail) {
    if (!flags || !flags[step]) return fallback;
    try { return fn(); } catch (e) {
      flags[step] = false;
      try { if (typeof console !== 'undefined') console.error('[EFX] ' + step + ' 出錯,本場關閉此步', e); } catch (e2) { }
      if (onFail) { try { onFail(); } catch (e3) { } }
      return fallback;
    }
  }

  // 條件載入骨架:回傳「目前開著的步」要載的圖;各步把清單填進 ASSETS。
  // 每項 {key, url, frame?}(frame=[寬,高] 表示 spritesheet)。key 一律 efx_ 或 fx_en_ / em_ 前綴,避免撞到我方特效。
  // 步 2 火城(批 1):火球、骷髏火球(樣品 enemy_fire_orb8_v2／enemy_fire_orb_skull8_v2,無邊框;每格縮到顯示大小×2 以上、只縮不放)。
  const ASSETS = {
    s1: [],
    s2: [
      { key: 'fx_en_fire_charge8', url: 'art/fx/fx_en_fire_charge8.webp', frame: [256, 256] },
      { key: 'fx_en_fire_skull_charge8', url: 'art/fx/fx_en_fire_skull_charge8.webp', frame: [224, 224] },
    ],
    s3: [], s4: [], s5: [], s6: [], s7: [], s8: [], s9: [],
  };
  function assetsFor(flags) {
    const out = [], seen = {};
    STEPS.forEach(k => { if (flags && flags[k]) (ASSETS[k] || []).forEach(a => { if (!seen[a.key]) { seen[a.key] = 1; out.push(a); } }); });
    return out;
  }
  // scene.load 的薄包裝;全關或清單空時一個 load 都不呼叫。回傳實際排入的數量。
  function preload(scene, flags) {
    const list = assetsFor(flags); let n = 0;
    list.forEach(a => {
      if (scene.textures && scene.textures.exists(a.key)) return;
      if (a.frame) scene.load.spritesheet(a.key, a.url, { frameWidth: a.frame[0], frameHeight: a.frame[1] });
      else scene.load.image(a.key, a.url);
      n++;
    });
    return n;
  }

  // ── 常數(樣品逐字照抄;參數表 1.0.1、1.1.2) ─────────────────────────────
  const CHIN = { g1: 0.56, g2: 0.55, g3: 0.55, king: 0.53 };   // 下巴位置(圖高比例,由上算);樣品五城共用、依星數查
  const CHIN_DEF = 0.55;                                          // 查無 id 時(樣品 `|| .55`)
  const CHIN_TOP = 0.6;                                           // 樣品 chin 公式寫死 0.6(不是 oy);規格的 ballMax 數字就是照這個算的 → 逐字照抄
  const SIZE_OF = { smash: 0.62, skull: 0.84, king: 1, weak: 0.3 };
  const KING_SIZE = [1, 0.74, 0.52];
  const COL_W = { 1: 200, 2: 142, 3: 108 };                       // 樣品欄寬(szc 基準 126/126/108 時)
  const COL_SZC = { 1: 126, 2: 126, 3: 108 };
  const RING_RESERVE = 34;                                        // 2×(8+7+2) 靶環預留
  const BALL_MIN = 28;
  const ART_K = { fx_en_fire_charge8: 0.9755, fx_en_fire_skull_charge8: 0.9596, fx_en_thunder_orb8: 1.019, fx_en_wind_orb8: 0.9629, fx_en_water_bomb8: 1.0569, fx_en_heal_orb8: 1.0511 };
  const ART_FIT = 1.28;
  const CITY = {   // 規格 3.0 城市色表
    fire: { col: 0xff6a2a, deep: 0xa8240e, light: 0xffc070, steam: 0xc4ced8, shard: [0xff8a3a, 0xffb24a, 0xd8421a, 0x8a2a12] },
    earth: { col: 0xb08850, deep: 0x6a4a2a, light: 0xe8cf9e, steam: 0xd8c8b0, shard: [0x8a6038, 0xb08850, 0x5a3e24, 0xd8b888] },
    water: { col: 0x3a9be8, deep: 0x1d5a9a, light: 0xb8e2ff, steam: 0xc4d6e8, shard: [0x3a9be8, 0x7cc4ff, 0x1d5a9a, 0xbfe8ff] },
    thunder: { col: 0xe6c12f, deep: 0x8a6a10, light: 0xfff0a0, steam: 0xc8c8d0, shard: [0xe6c12f, 0xfff0a0, 0x8a6a10, 0x6a6a78] },
    wind: { col: 0x4caf72, deep: 0x24704a, light: 0xc8f0d0, steam: 0xd0e0d4, shard: [0x4caf72, 0x9fdcae, 0x24704a, 0xe8f6e0] },
  };
  const RING_COL = 0xf3e4c4;
  const BADGE = { ICON: 32, NUM_X: 16, NUM_PX: 26 };              // 規格 3.4(大毛 2026-11-24 裁決維持 32px＋Russo 26px)
  const EMOTE = { SIZE: 34, LONELY: 48, SECOND: 28 };             // 規格 3.5
  const BUB = { tip: [46, 220], ctr: [127.5, 115], vw: 230, W: 256, H: 256, NEAR_DY: 38, PAD_ICON: 3, EDGE: 4 };   // 規格 3.7.2、參數表 1.6.2~1.6.3

  // ── fitEnemySprite 的鏡像(遊戲 index.html 的 card_* 分支;給測試逐值比對、也給離線算數用) ──
  // 輸入:natW/natH 圖原尺寸、szc(=e.cardW)、cy、boss、solo(單魔王關)、five(4/5 隻陣型 e._five)、pad(ENEMY_FEET_PAD,查無=0)。
  function fullArtBaseH(natW, natH) { const b = natW * 2 / 3; return Math.abs(natH / b - 1) < 0.02 ? natH : b; }
  function fitMirror(o) {
    const szc = o.szc, solo = !!(o.boss && o.solo);
    const mul = solo ? 1.7 : (o.boss ? 1.4 : 1.25);
    const gOff = solo ? 0.62 : (o.boss ? 0.32 : (o.five ? 0.32 : 0.42));
    const natW = o.natW || 1, natH = o.natH || 1, baseH = fullArtBaseH(natW, natH), oy = 1 - baseH / (2 * natH);
    const scl = szc * mul / baseH, dispH = natH * scl, dispW = natW * scl, pad = o.pad || 0;
    const ground = o.cy + szc * gOff;
    const y = ground - dispH * ((1 - pad) - oy);
    return { mul, gOff, baseH, oy, scl, dispW, dispH, y, ground };
  }

  // ── 定位點(規格 3.0) ─────────────────────────────────────────────────
  // 吃一個「平的」敵人描述:{ x, cy, szc, imgY, oy, dispW, dispH, boss, star, art, ground }。
  // 遊戲端用 readGame(e) 從實際立繪取值(規格 3.0.2:一律用實際立繪現算,不寫死 y)。
  function headUp(cy, szc, boss) { if (!boss || !szc) return 0; const y0 = cy - szc / 2 + 11; return y0 - Math.min(y0, Math.max(40, y0 - Math.round(szc * 0.3))); }   // 與遊戲 _headUp(idx:5528)同式
  function anchor(f) {
    const y0 = f.cy - f.szc / 2 + 11, hu = headUp(f.cy, f.szc, f.boss);
    const turnX = f.x - f.szc / 2 + 12, turnY = y0 - hu;
    return {
      x: f.x, cy: f.cy, szc: f.szc, imgY: f.imgY, dispW: f.dispW, dispH: f.dispH, oy: f.oy,
      headY: f.imgY - f.dispH * f.oy + f.dispH * 0.3,
      y0, headUp: hu,
      turnX, turnY,                                     // 倒數器(怪左上)
      iconX: 2 * f.x - turnX, iconY: turnY,             // 常駐小符號/表情氣泡(倒數器左右鏡像)＝ x + szc/2 − 12
      threatX: f.x, threatY: f.imgY + f.szc * 0.2,      // 威脅體:固定在 restY 上,不跟動作
      ground: f.ground,
    };
  }
  // 從遊戲敵人物件讀定位資料(只讀,不改任何東西)。
  function readGame(e) {
    const sp = e && e.sprite, sc = (e && e.baseScale) || (sp && sp.scaleX) || 1;
    return {
      x: (e.card && e.card.x != null) ? e.card.x : (sp ? sp.x : 0),
      cy: e.cy, szc: e.cardW,
      imgY: e.restY != null ? e.restY : (sp ? sp.y : e.cy),
      oy: sp && sp.originY != null ? sp.originY : 0.5,
      dispW: sp ? (sp.width || 0) * sc : 0, dispH: sp ? (sp.height || 0) * sc : 0,
      boss: !!e.boss, star: e.star, art: (sp && sp.texture && sp.texture.key) || null, ground: e.shadow ? e.shadow.y : null,
    };
  }

  // ── 大小 ───────────────────────────────────────────────────────────────
  function chinId(star, boss) { const s = star | 0; if (s >= 4) return 'king'; if (s >= 1 && s <= 3) return 'g' + s; return null; }   // 3★ 放魔王位仍用 g3(樣品同)
  // 樣品的 CHIN id 其實對應立繪:g1＝cN_full、g2＝cN_e_full、g3＝cN_e2_full、king＝cN_king_full(含 _hot)。遊戲有些怪(一般雜兵)沒有 e.star,
  // 所以先看立繪 key,認不出來再用星數。3★ 放魔王位用的是 _e2_full → g3(與樣品同)。
  function chinIdFromArt(key) { const k = String(key || ''); if (/_king_full/.test(k)) return 'king'; if (/_e2_full/.test(k)) return 'g3'; if (/_e_full/.test(k)) return 'g2'; if (/^card_c\d+_full/.test(k)) return 'g1'; return null; }
  function chinIdOf(f) { return chinIdFromArt(f && f.art) || chinId(f && f.star, f && f.boss); }
  function chinOf(id) { return (id && CHIN[id] != null) ? CHIN[id] : CHIN_DEF; }
  // 欄寬:1~3 隻用樣品表(H 小、szc 縮小時等比縮,規格 3.0.2);有鄰居時再與「實際相鄰間距」取小(4/5 隻、H 小都成立)。
  function colW(n, szc, nbDist) {
    let w = Infinity;
    if (COL_W[n]) w = Math.min(COL_W[n], COL_W[n] * (szc / COL_SZC[n]));
    if (nbDist != null && isFinite(nbDist) && nbDist > 0) w = Math.min(w, nbDist);
    if (!isFinite(w)) w = szc;   // 4/5 隻卻沒給鄰距(不該發生)→ 退回卡寬
    return w;
  }
  function nearestDist(x, xs) { let d = Infinity; (xs || []).forEach(o => { if (o !== x) d = Math.min(d, Math.abs(o - x)); }); return d; }
  // ballMax = max(28, min(欄寬−34, 2×(球心y − 下巴y)));球心 y = imgY + szc×.2;下巴 y = imgY − dispH×.6 + dispH×CHIN。
  function ballMax(a, cid, cw) {
    const by = a.imgY + a.szc * 0.2, chin = a.imgY - a.dispH * CHIN_TOP + a.dispH * chinOf(cid);
    return Math.max(BALL_MIN, Math.min(cw - RING_RESERVE, 2 * (by - chin)));
  }
  // threatSize = SIZE_OF[招式] × ballMax × (酋長未破 ? KING_SIZE[冷卻次數] : 1)
  function threatSize(move, bm, kingCool) {
    const k = SIZE_OF[move] != null ? SIZE_OF[move] : 1;
    const ks = (kingCool != null) ? KING_SIZE[Math.max(0, Math.min(2, kingCool | 0))] : 1;
    return k * bm * ks;
  }
  function artBox(size, artKey) { return size * ART_FIT * (ART_K[artKey] || 1); }   // 手繪球顯示框寬
  // 蓄力:charge = clamp((top−倒數)/(top−1), 0, 1)×0.9 ＋ (倒數為 1 ? 0.1 : 0);top:骷髏重擊與酋長 5、其他 3。
  function charge(cd, top) { const t = top || 3; const c = Math.max(0, Math.min(1, (t - cd) / (t - 1))) * 0.9 + (cd === 1 ? 0.1 : 0); return Math.max(0, Math.min(1, c)); }

  // ── 表情氣泡位置(規格 3.7.2、參數表 1.6.3) ────────────────────────────
  // 本體寬:場上 ≥3 隻 44,否則 48(4/5 隻沿用 3 隻的值,規格 3.0.2)。
  function bubW(n) { return n >= 3 ? 44 : 48; }
  // self/others 都是 anchor() 的結果;W=畫布寬。回傳氣泡本體中心 {x, y, shift}。
  function bubbleCtr(self, others, W, bw) {
    const y = self.iconY, x0 = self.iconX; let cut = 0;
    (others || []).forEach(o => {
      if (!o || o === self || !(o.x > self.x)) return;
      if (Math.abs(o.turnY - self.turnY) < BUB.NEAR_DY) cut = Math.max(cut, (x0 + bw / 2) - (o.turnX - BADGE.ICON / 2 - BUB.PAD_ICON));
    });
    cut = Math.max(cut, x0 + bw / 2 - (W - BUB.EDGE));
    return { x: x0 - Math.max(0, cut), y, shift: Math.round(Math.max(0, cut)) };
  }

  // ── 火城的純計算(規格 4.1;給執行期與測試共用) ─────────────────────────
  const FIRE = {
    ART: 'fx_en_fire_charge8', SKULL: 'fx_en_fire_skull_charge8',
    RING_W: { weak: 4, smash: 4, skull: 6, king: 7 },                 // 規格 3.2 線寬依招式 tier(弱 0、猛擊 1、骷髏 2、酋長 3)
    PULSE: { weak: 0.8, smash: 1, skull: 1.3, king: 1.5 },            // 規格 3.1 脈動幅度的招式係數
    HITS: 3,                                                         // 酋長要打幾下(core TUNING.CHIEF_HITS;遊戲端以 core 為準傳入)
  };
  // 招式:拆除後＝弱球;酋長(rule 4)每擊都是酋長招式;其餘看 core 的 skull 旗標(招式大小 .84 由它決定,球圖另看 isLethal)。
  function fireMove(g) { return !g ? null : g.defused ? 'weak' : g.rule === 4 ? 'king' : g.skull ? 'skull' : 'smash'; }
  function fireTop(g, mv) { return (mv === 'skull' || (g && g.rule === 4)) ? 5 : 3; }                       // 蓄力 top:骷髏重擊與酋長 5、其他 3(樣品 charge())
  function fireCool(g, hits) { return Math.max(0, Math.min(2, (hits || FIRE.HITS) - ((g && g.left) | 0))); }   // 酋長已降溫幾次(0/1/2)
  function fireArt(mv, lethal) { return (lethal && (mv === 'skull' || mv === 'king')) ? FIRE.SKULL : FIRE.ART; }   // 大毛 #2＝B:重擊「會打死」才用骷髏火球
  function fireRingSegs(g) { return g && g.rule === 4 ? 3 : 1; }
  // 靶環(視窗模式)的顏色與半徑:t＝(窗口最初 top − 剩餘)/(top − 1);樣品 TargetRing.radius()/ringCol() 逐字照抄。
  const lerp = (a, b, u) => a + (b - a) * u, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function lerpCol(a, b, u) { u = clamp(u, 0, 1); const ch = q => Math.round((a >> q & 255) + ((b >> q & 255) - (a >> q & 255)) * u); return ch(16) << 16 | ch(8) << 8 | ch(0); }
  function ringCol(t, base) { const c0 = base == null ? RING_COL : base; return t < 0.5 ? lerpCol(c0, 0xffd23a, t * 2) : lerpCol(0xffd23a, 0xff6a3a, (t - 0.5) * 2); }
  function ringT(top, left) { return top <= 1 ? 1 : clamp((top - left) / (top - 1), 0, 1); }
  function ringRadius(r, w, t, a, maxR) { const base = r + 8 + w / 2, room = maxR != null ? Math.max(4, maxR - base) : r * 0.5 + 10; return base + lerp(Math.min(r * 0.5 + 10, room), 0, t) + lerp(4, 1, t) * Math.sin(a); }

  /*EFX-RT-BEGIN*/
  // ════ 執行期元件:只在 index.html 的 if (EFX.sN) 鉤子內被呼叫;這段之後才會建物件、加補間、用 Math.random ════
  const DEP = { line: 33, threat: 34, ring: 35 };   // 規格 3.11 第 7/8/10 層;遊戲 DEPTH 33~37 沒人用(hp30 < 這裡 < abtn38、board40;倒數圖示在 fx+2=68 之上)
  const RING_EDGE = 0x3a2418, RING_GAP = 0.26, LOOP_FPS = 11;
  const ecRef = () => (typeof EnemyCore !== 'undefined' ? EnemyCore : null);

  // 每個場景一個管理器:一支 'update' 監聽驅動所有元件。場景關閉(重開/離開)就作廢——scene 實例欄位會留到下一場,所以每次看 alive。
  // 任何元件 update 丟錯:整步關掉(flags[step]=false)、收掉全部元件(Phaser 回呼例外會停住整個主迴圈,不能讓它冒出去)。
  function rt(scene) {
    let R = scene._efxRt;
    if (R && R.alive && R.scene === scene) return R;
    R = scene._efxRt = { scene, alive: true, parts: new Set(), flags: null, step: null };
    const upd = (time, delta) => {
      if (!R.alive) return; const dt = Math.max(0, Math.min(100, delta || 16.7));
      R.parts.forEach(p => { try { p.update(dt); } catch (err) { fail(R, err); } });
    };
    scene.events.on('update', upd);
    scene.events.once('shutdown', () => { R.alive = false; scene.events.off('update', upd); R.parts.clear(); });
    return R;
  }
  function fail(R, err) {
    if (R.failed) return; R.failed = true;
    try { console.error('[EFX] ' + (R.step || '') + ' 執行期出錯,本場關閉此步', err); } catch (e2) { }
    if (R.flags && R.step) R.flags[R.step] = false;
    try { dropAll(R.scene); } catch (e3) { }
    R.parts.forEach(p => { try { p.kill(); } catch (e4) { } }); R.parts.clear(); R.failed = false;
  }

  // 規格 3.1 steady:手繪表每格實心部分(alpha > 230,2px 步進)的重心偏移,載入後量一次,每幀把圖拉回中心(樣品 frameCtr)。
  const FCT = {};
  function frameCtr(scene, key) {
    if (FCT[key]) return FCT[key]; const out = {};
    try {
      const tx = scene.textures.get(key), src = tx.getSourceImage(), cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
      const g = cv.getContext('2d'); g.drawImage(src, 0, 0); const d = g.getImageData(0, 0, cv.width, cv.height).data;
      tx.getFrameNames().forEach(n => {
        const f = tx.get(n); let sx = 0, sy = 0, k = 0;
        for (let y = f.cutY; y < f.cutY + f.cutHeight; y += 2) for (let x = f.cutX; x < f.cutX + f.cutWidth; x += 2) if (d[(y * cv.width + x) * 4 + 3] > 230) { sx += x; sy += y; k++; }
        if (k > 20) out[n] = [(sx / k - f.cutX) / f.cutWidth - 0.5, (sy / k - f.cutY) / f.cutHeight - 0.5];
      });
    } catch (err) { }
    return (FCT[key] = out);
  }

  // 規格 3.1 威脅體:手繪 8 格循環(11fps,起始相位隨機)、大小＝威力(Back.easeOut 補間)、蓄力越高脈動越快越大、不抖、不跟怪動。
  // o:{art, size, host:()=>{x,y}, pulse, depth, grow}
  function makeThreat(scene, o) {
    const R = rt(scene), c = scene.add.container(0, 0).setDepth(o.depth || DEP.threat), tws = [];
    const self = { c, size: o.size, goal: o.size, sx: o.grow ? 0 : 1, charge: 0, pulse: o.pulse || 1, phase: 0, t: Math.random() * 1000, host: o.host, free: false, alive: true, dead: false, layers: [], art: null, szTw: null };
    const tw = cfg => { const t = scene.tweens.add(cfg); tws.push(t); return t; };
    const layer = (key, a) => { const im = scene.add.image(0, 0, key, 0); c.add(im); const L = { im, key, a, n: Math.max(1, scene.textures.get(key).frameTotal - 1), fct: frameCtr(scene, key), k: ART_K[key] || 1 }; self.layers.push(L); return L; };
    self.setArt = (key, ms) => {   // 換球圖(骷髏火球⇄一般火球):短交叉淡化(規格 3.1【推定 160ms】)
      if (!key || self.art === key || !scene.textures.exists(key)) return;
      const first = !self.art; self.art = key;
      if (first) { layer(key, 1); return; }
      const nL = layer(key, 0);
      self.layers.filter(L => L !== nL).forEach(L => tw({ targets: L, a: 0, duration: ms || 160, onComplete: () => { const i = self.layers.indexOf(L); if (i >= 0) self.layers.splice(i, 1); try { L.im.destroy(); } catch (er) { } } }));
      tw({ targets: nL, a: 1, duration: ms || 160 });
    };
    self.update = dt => {
      if (!c.scene) { self.kill(); return; }
      const lv = self.charge, per = lerp(1100, 380, lv), amp = lerp(0.03, 0.11, lv) * self.pulse;
      self.phase += dt / per * Math.PI * 2; self.t += dt * lerp(1, 1.9, lv);
      const p = 1 + amp * Math.sin(self.phase), d = self.size * self.sx;
      if (!self.free) { const h = self.host && self.host(); if (h) c.setPosition(h.x, h.y); }
      self.layers.forEach(L => {
        const fr = ((self.t / (1000 / LOOP_FPS)) | 0) % L.n; L.im.setFrame(fr);
        L.im.setScale(d * p * ART_FIT * L.k / (L.im.width || 1));
        const fo = L.fct[fr]; L.im.setPosition(fo ? -fo[0] * L.im.displayWidth : 0, fo ? -fo[1] * L.im.displayHeight : 0); L.im.setAlpha(L.a);
      });
    };
    self.sizeTo = (px, ms) => { if (Math.abs(px - self.goal) < 0.01) return; self.goal = px; if (self.szTw) self.szTw.stop(); self.szTw = tw({ targets: self, size: px, duration: ms || 260, ease: 'Back.easeOut' }); };
    self.grow = ms => { self.sx = 0; tw({ targets: self, sx: 1, duration: ms || 420, ease: 'Back.easeOut' }); };
    self.kill = keep => {
      if (self.dead) return; self.dead = true; self.alive = false;
      tws.forEach(t => { if (t !== keep) { try { t.stop(); } catch (er) { } } }); R.parts.delete(self);
      try { if (c.scene) c.destroy(); } catch (er) { }
    };
    self.fade = (ms, shrink) => { if (self.dead) return; self.alive = false; const t = tw({ targets: c, alpha: 0, scaleX: shrink || 1, scaleY: shrink || 1, duration: ms || 220, ease: 'Quad.easeIn', onComplete: () => self.kill(t) }); };
    self.detach = () => { self.free = true; self.alive = false; return c; };   // 交給出手飛行:不再跟定點,容器被銷毀(撞到血條)時 update 自己收
    self.setArt(o.art);
    R.parts.add(self); if (o.grow) self.grow(); self.update(0);
    return self;
  }

  // 規格 3.2 靶環(視窗模式):程式畫奶油色粗弧＋深色細外框,不旋轉,呼吸 1800ms;n 段、段縫 0.26;準心十字;隨剩餘手數收緊變色。
  // o:{depth, color, width, segs, maxR:()=>px, follow:()=>{x,y,r}|null}
  function makeRing(scene, o) {
    const R = rt(scene), g = scene.add.graphics().setDepth(o.depth || DEP.ring), depth = o.depth || DEP.ring;
    const self = { g, on: false, a: 0, alpha: 0, col: o.color || RING_COL, segs: o.segs || 1, left: o.segs || 1, width: o.width || 4, tk: { v: 0 }, top: 0, dead: false, pieces: [] };
    const span = i => { const n = self.segs, seg = Math.PI * 2 / n, a0 = -Math.PI / 2 + i * seg + (n > 1 ? RING_GAP / 2 : 0); return [a0, a0 + seg - (n > 1 ? RING_GAP : 0)]; };
    const arc = (gr, x, y, r, a0, a1, w, col, al) => { gr.lineStyle(w + 3, RING_EDGE, al); gr.beginPath(); gr.arc(x, y, r, a0, a1); gr.strokePath(); gr.lineStyle(w, col, al); gr.beginPath(); gr.arc(x, y, r, a0, a1); gr.strokePath(); };
    const maxR = () => (o.maxR ? o.maxR() : null);
    self.radius = f => ringRadius(f.r, self.width, self.tk.v, self.a, maxR());
    self.setHands = (left, now) => {
      if (!self.top || left > self.top) self.top = left; const t = ringT(self.top, left); scene.tweens.killTweensOf(self.tk);
      if (now || !self.on) self.tk.v = t; else scene.tweens.add({ targets: self.tk, v: t, duration: 520, ease: 'Sine.easeInOut' });
    };
    self.update = dt => {
      if (!g.scene) { self.kill(); return; }
      self.a += dt / 1800 * Math.PI * 2; g.clear(); const f = o.follow && o.follow();
      if (self.alpha <= 0.01 || !f) return;
      const r = self.radius(f), al = self.alpha * (0.9 + 0.1 * Math.sin(self.a)), w = self.width, col = ringCol(self.tk.v, self.col);
      if (self.segs === 1) arc(g, f.x, f.y, r, 0, Math.PI * 2, w, col, al); else for (let k = 0; k < self.left; k++) { const [a0, a1] = span(k); arc(g, f.x, f.y, r, a0, a1, w, col, al); }
      for (let k = 0; k < 4; k++) {   // 準心十字:上下左右各一條短標,從 r−w/2−5 到 r+w/2+10,外框 7/內線 4
        const an = k * Math.PI / 2, ca = Math.cos(an), sa = Math.sin(an), r0 = r - w / 2 - 5, r1 = r + w / 2 + 10;
        g.lineStyle(7, RING_EDGE, al); g.lineBetween(f.x + ca * r0, f.y + sa * r0, f.x + ca * r1, f.y + sa * r1); g.lineStyle(4, col, al); g.lineBetween(f.x + ca * r0, f.y + sa * r0, f.x + ca * r1, f.y + sa * r1);
      }
    };
    self.show = () => { if (self.on) return; self.on = true; scene.tweens.killTweensOf(self); self.alpha = 0; scene.tweens.add({ targets: self, alpha: 1, duration: 260 }); };
    self.hide = ms => { if (!self.on) return; self.on = false; self.top = 0; scene.tweens.killTweensOf(self); scene.tweens.add({ targets: self, alpha: 0, duration: ms || 180 }); };
    self.cut = () => { self.on = false; self.top = 0; scene.tweens.killTweensOf(self); self.alpha = 0; };
    self.reset = n => { self.segs = n || self.segs; self.left = self.segs; };
    // 掉段:最後一段複製後向外飛 r×0.7、下掉 10px、轉 ±25°、淡出(380ms Quad.easeOut);蒸氣圖有載才冒(規格 3.2)
    self.drop = () => {
      const f = o.follow && o.follow(); if (!f || self.left <= 0) return self.left;
      const k = self.left - 1, r = self.radius(f), [a0, a1] = span(k), mid = (a0 + a1) / 2; self.left--;
      const pc = scene.add.graphics().setDepth(depth + 0.2).setPosition(f.x, f.y); arc(pc, 0, 0, r, a0, a1, self.width, ringCol(self.tk.v, self.col), 1); self.pieces.push(pc);
      scene.tweens.add({ targets: pc, x: f.x + Math.cos(mid) * r * 0.7, y: f.y + Math.sin(mid) * r * 0.7 + 10, angle: (Math.random() < 0.5 ? -1 : 1) * 25, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => { const i = self.pieces.indexOf(pc); if (i >= 0) self.pieces.splice(i, 1); pc.destroy(); } });
      return self.left;
    };
    self.kill = () => {
      if (self.dead) return; self.dead = true; R.parts.delete(self); scene.tweens.killTweensOf([self, self.tk].concat(self.pieces));
      self.pieces.forEach(p => { try { p.destroy(); } catch (er) { } }); self.pieces = []; try { if (g.scene) g.destroy(); } catch (er) { }
    };
    self.destroy = self.kill;
    R.parts.add(self);
    return self;
  }

  // 規格 3.3 線:preview(流動虛線,線寬 4、虛 10/隙 8、60px/s、無箭頭)/wait(淡虛線,線寬 2、虛 5/隙 6、靜止、透明度 .5)/
  // zap(雷城電纜,細線 1.5＋光暈 3,11 折點每 125ms 重抽,jolt() 180ms 內每 45ms、振幅×3)/hold(土城守護,外 5 內 2、亮度脈動、3 顆珠)。
  // 火城不用線;這裡先把元件做好給土雷風(步 3/5/6)接。o:{style, color, from:()=>pt, to:()=>pt, depth, w, waitCol, waitA}
  const ZAP = { w: 1.5, glow: 3, core: 0xffe14a, halo: 0xe6c12f, haloA: 0.35, amp: 3, jolt: 3 };
  function makeLine(scene, o) {
    const R = rt(scene), g = scene.add.graphics().setDepth(o.depth || DEP.line);
    const self = { g, style: o.style || 'preview', col: o.color, t: 0, alpha: 0, dead: false, jolt: 0, zt: 0, zo: null, waitCol: o.waitCol, waitA: o.waitA };
    scene.tweens.add({ targets: self, alpha: 1, duration: 220 });
    self.update = dt => {
      if (!g.scene) { self.kill(); return; }
      self.t += dt; g.clear(); if (self.alpha <= 0.01) return; const a = o.from(), b = o.to(); if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      if (self.style === 'preview') {
        const dash = 10, gap = 8, off = (self.t * 0.06) % (dash + gap); g.lineStyle(4, self.col, self.alpha * 0.9);
        for (let s0 = -off; s0 < L; s0 += dash + gap) { const s1 = Math.min(L, s0 + dash), q0 = Math.max(0, s0); if (s1 <= q0) continue; g.beginPath(); g.moveTo(a.x + ux * q0, a.y + uy * q0); g.lineTo(a.x + ux * s1, a.y + uy * s1); g.strokePath(); }
      } else if (self.style === 'wait') {
        const dash = 5, gap = 6; g.lineStyle(2, self.waitCol != null ? self.waitCol : self.col, self.alpha * (self.waitA != null ? self.waitA : 0.5));
        for (let s0 = 0; s0 < L; s0 += dash + gap) { const s1 = Math.min(L, s0 + dash); g.beginPath(); g.moveTo(a.x + ux * s0, a.y + uy * s0); g.lineTo(a.x + ux * s1, a.y + uy * s1); g.strokePath(); }
      } else if (self.style === 'zap') {
        self.zt += dt; const jo = self.jolt > 0; if (jo) self.jolt -= dt;
        if (!self.zo || self.zt > (jo ? 45 : 125)) { self.zt = 0; self.zo = Array.from({ length: 11 }, (_, i) => (i === 0 || i === 10) ? 0 : (Math.random() * 2 - 1) * ZAP.amp * (jo ? ZAP.jolt : 1)); }
        const pts = self.zo.map((j, i) => { const u = i / 10; return [a.x + dx * u - uy * j, a.y + dy * u + ux * j]; });
        [[ZAP.glow, ZAP.halo, ZAP.haloA], [ZAP.w, ZAP.core, 1]].forEach(([w, col, al]) => { g.lineStyle(w, col, self.alpha * al); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.strokePath(); });
      } else {
        const pa = 0.55 + 0.25 * Math.sin(self.t / 300), k = o.w || 1; g.lineStyle(5 * k, self.col, self.alpha * pa * 0.5); g.lineBetween(a.x, a.y, b.x, b.y); g.lineStyle(2 * k, self.col, self.alpha * pa); g.lineBetween(a.x, a.y, b.x, b.y);
        for (let i = 0; i < 3; i++) { const u = ((self.t / 900) + i / 3) % 1; g.fillStyle(self.col, self.alpha); g.fillCircle(a.x + dx * u, a.y + dy * u, 3.5 * k); }
      }
    };
    self.setStyle = st => { self.style = st; };
    self.shock = () => { self.jolt = 180; };
    self.kill = () => { if (self.dead) return; self.dead = true; R.parts.delete(self); scene.tweens.killTweensOf(self); try { if (g.scene) g.destroy(); } catch (er) { } };
    self.destroy = ms => { if (self.dead) return; if (ms === 0) { self.kill(); return; } scene.tweens.killTweensOf(self); scene.tweens.add({ targets: self, alpha: 0, duration: ms || 200, onComplete: () => self.kill() }); };
    R.parts.add(self);
    return self;
  }

  // ── 火城接線(步 2 批 1):遊戲端鉤子只呼叫下面這幾支 ──
  // 每隻怪的演出狀態掛在 e._efx(只有開關開時才會出現;清理鉤子看它在不在)。
  // 排程回呼也是 Phaser 回呼:丟錯一樣走 fail()(關步、收乾淨),不讓例外冒到主迴圈(驗證員抓到的缺口)
  function later(X, scene, ms, fn) { const t = scene.time.delayedCall(Math.max(0, ms), () => { const i = X.tms.indexOf(t); if (i >= 0) X.tms.splice(i, 1); try { fn(); } catch (err) { fail(rt(scene), err); } }); X.tms.push(t); return t; }
  // 鄰距:兩顆威脅體中心的直線距離(1~3 隻同排＝水平間距,與樣品 COL_W 一致;4/5 隻前後排有高低差,只看水平會把球壓到下限 28)
  function fireGeom(scene, e) {
    const f = readGame(e), a = anchor(f), E = (scene.enemies || []).filter(x => x && x.card && x !== e);
    const pts = E.map(x => anchor(readGame(x))), nb = pts.reduce((m, p) => Math.min(m, Math.hypot(p.threatX - a.threatX, p.threatY - a.threatY)), Infinity);
    const cw = colW(E.length + 1, f.szc, nb), bm = ballMax(a, chinIdOf(f), cw);
    return { a, cw, bm, nb };
  }
  // 依 core 狀態同步火球(大小、球圖、蓄力)與窗口靶環。可重複呼叫(idempotent);在 _ecOrbSync 開頭呼叫。
  function fireSync(scene, e, flags) {
    const g = e && e._g; if (!g || e.dead || e.hp <= 0 || !e.sprite || !e.sprite.scene) return false;
    if (!e._efx && !(scene.textures && scene.textures.exists(FIRE.ART))) return false;   // 火球圖沒載到(404 等):不建新球 → 舊球照舊畫(規格 3.1 的「缺圖後備」由舊程式球擔任)
    const R = rt(scene); R.flags = flags; R.step = 's2';
    const X = e._efx || (e._efx = { city: 'fire', tms: [], ball: null, ring: null, regrow: false, holdUntil: 0, fast: false });
    const geo = fireGeom(scene, e); X.host = { x: geo.a.threatX, y: geo.a.threatY }; X.cw = geo.cw; X.bm = geo.bm;
    const EC = ecRef(), hits = (EC && EC.TUNING && EC.TUNING.CHIEF_HITS) || FIRE.HITS;
    const mv = fireMove(g), size = threatSize(mv, geo.bm, mv === 'king' ? fireCool(g, hits) : null);
    const lethal = !!(scene._ecLethal && scene._ecLethal(e)), art0 = fireArt(mv, lethal), art = scene.textures.exists(art0) ? art0 : FIRE.ART, now = scene.time.now || 0;   // 骷髏火球缺圖 → 一般火球
    if (!X.ball) {
      if (X.holdUntil > now) { if (!X.waiting) { X.waiting = true; later(X, scene, X.holdUntil - now + 1, () => { X.waiting = false; if (e._efx === X) fireSync(scene, e, flags); }); } }
      else { X.ball = makeThreat(scene, { art, size, host: () => X.host, pulse: FIRE.PULSE[mv], grow: X.regrow }); X.regrow = false; X.holdUntil = 0; }
    } else { X.ball.sizeTo(size, X.fast ? 180 : 260); X.ball.setArt(art, 160); X.ball.pulse = FIRE.PULSE[mv]; }
    if (X.ball) X.ball.charge = charge(e.timer | 0, fireTop(g, mv));
    if (!X.ring) X.ring = makeRing(scene, { segs: fireRingSegs(g), width: FIRE.RING_W[mv], maxR: () => X.cw / 2 + 10, follow: () => (X.ball && X.ball.alive) ? { x: X.ball.c.x, y: X.ball.c.y, r: X.ball.size * X.ball.sx * 0.5 } : null });
    X.ring.width = FIRE.RING_W[mv];
    if (X.ring.segs !== fireRingSegs(g)) X.ring.reset(fireRingSegs(g));
    if (g.rule === 4 && !g.defused && (g.left | 0) > X.ring.left) X.ring.reset(3);   // 出手後重新計數(只往上補;往下由 fireHit 掉段)
    const open = !g.defused && !!(EC && EC.inWindow && EC.inWindow(e));
    if (open && X.ball) { X.ring.setHands(e.timer | 0); X.ring.show(); } else X.ring.hide();
    return true;
  }
  // 取代舊 _showEnemyOrb(舊邏輯只在窗口內呼叫):放一個看不見的佔位物當 e._finOrb,讓字卡①④、出手判斷、清理全走舊邏輯。
  function fireMarker(scene, e) {
    const X = e._efx, h = X && X.host; if (!h) return false;
    const z = scene.add.zone(h.x, h.y, 1, 1); e._finOrb = z; e._finPos = { x: h.x, y: h.y }; e._finOY = h.y - (e.sprite ? e.sprite.y : h.y); e._finCol = CITY.fire.col; e._finR = (X.ball ? X.ball.size / 2 : 16);
    return true;
  }
  // 出手(批 1 沿用舊彈道):把常駐火球交給 enemyAttack 飛去撞血條;舊佔位物丟掉;靶環立刻消失;新球等命中後 620ms 再長出(F-16)。
  function fireLaunch(scene, e, legacyOrb, dl) {
    const X = e && e._efx; if (!X || !X.ball || !X.ball.alive) return null;
    if (legacyOrb && legacyOrb !== X.ball.c) { try { legacyOrb.destroy(); } catch (er) { } }
    if (X.ring) X.ring.cut();
    const b = X.ball; X.ball = null; X.regrow = true; X.holdUntil = (scene.time.now || 0) + (dl || 0) + 360 + 440 + 620;   // 舊 enemyAttack:集氣 360＋飛行 440＝命中;＋620 重置
    const c = b.detach(); return { obj: c, from: { x: c.x, y: c.y } };
  }
  // 拆除(批 1 簡化版:球淡出縮小;批 2 換成碎裂→爆開→後退):靶環立刻消失,623.75ms 後長出小火球(S-F3(b))。
  function fireDefuse(scene, e, flags) {
    const X = e && e._efx; if (!X) return;
    if (X.ring) X.ring.cut();
    if (X.ball) { X.ball.fade(480, 0.55); X.ball = null; }
    X.regrow = true; X.holdUntil = (scene.time.now || 0) + 624; X.waiting = false;
    later(X, scene, 625, () => { if (e._efx === X) fireSync(scene, e, flags); });
  }
  // 酋長第 1、2 下(降溫,stage＝打完剩幾下 2/1):靶環掉最後一段;220ms 火球縮到下一級(180ms Back.easeOut,S-F3(a))。
  function fireHit(scene, e, stage, flags) {
    const X = e && e._efx; if (!X || !(stage > 0)) return;
    if (X.ring) { if (X.ring.left > stage + 1) X.ring.left = stage + 1; X.ring.drop(); }
    later(X, scene, 220, () => { if (e._efx !== X) return; X.fast = true; try { fireSync(scene, e, flags); } finally { X.fast = false; } });
    // 330ms:致死狀態若因降溫改變,倒數圖示骷髏→沙漏(無裂開)。舊版靠 _ecCoolFx 內的彈跳回呼換圖,開關開時 _ecCoolFx 不演 → 這裡補叫(只換圖、不彈跳)
    later(X, scene, 330, () => { if (e._efx === X && !e.dead && scene._ecGlass) scene._ecGlass(e, false); });
  }
  // 清掉一隻怪的全部新演出物件(換波、死亡、出錯)。ms>0:火球淡出。
  // killing=true(killEnemy):佔位 _finOrb 還在時,照舊 _breakEnemyOrb 的「狀態」部分做(_clearEnemyOrb＋倒數重設),只是不演碎球、不浮「打斷!」
  //   → 開關開與關,死掉那隻的 e.timer 等欄位逐值相同(A/B 實測抓到的差異)。
  function drop(scene, e, ms, killing) {
    const X = e && e._efx; if (!X) return;
    (X.tms || []).forEach(t => { try { t.remove(false); } catch (er) { } }); X.tms = [];
    if (X.ball) { if (ms > 0) X.ball.fade(ms); else X.ball.kill(); X.ball = null; }
    if (X.ring) { X.ring.kill(); X.ring = null; }
    if (e._finOrb && e._finOrb.type === 'Zone') {
      if (killing && scene._clearEnemyOrb) { scene._clearEnemyOrb(e); e.timer = Math.max(1, e.interval || 3); }
      else { try { e._finOrb.destroy(); } catch (er) { } e._finOrb = null; }
    }
    e._efx = null;
  }
  function dropAll(scene) { (scene.enemies || []).forEach(e => { try { drop(scene, e); } catch (er) { } }); }
  /*EFX-RT-END*/

  return {
    STEPS, allOff, parseFlags, anyOn, guard, ASSETS, assetsFor, preload,
    FIRE, fireMove, fireTop, fireCool, fireArt, fireRingSegs, lerpCol, ringCol, ringT, ringRadius,
    rt, frameCtr, makeThreat, makeRing, makeLine, fireGeom, fireSync, fireMarker, fireLaunch, fireDefuse, fireHit, drop, dropAll,
    CHIN, CHIN_DEF, CHIN_TOP, SIZE_OF, KING_SIZE, COL_W, COL_SZC, RING_RESERVE, ART_K, ART_FIT, CITY, RING_COL, BADGE, EMOTE, BUB,
    fullArtBaseH, fitMirror, headUp, anchor, readGame, chinId, chinIdFromArt, chinIdOf, chinOf, colW, nearestDist, ballMax, threatSize, artBox, charge, bubW, bubbleCtr,
  };
});
