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

  // 解析網址開關。預設＝DEFAULT_ON(2026-11-27 大毛「火城打開,讓所有玩家可以看見」:沒帶 ?efx= 時等同 ?efx=2,只開火城 s2＋地基 s1;其他步仍預設關)。
  //   退路:?efx=0(或 ?efx= 空值)→ 全關＝舊演出(等於改動前沒帶參數);?efx_off=2 也可只關火城(沒帶 ?efx= 時同樣套在預設上)。
  //   ?efx=1 或 ?efx=all → 全開;?efx=1,2,7 → 只開列出的步(數字＝步號;注意 ?efx=1 是「全開」,只開步 1 請寫 ?efx=s1);
  //   ?efx_off=7 → 從已開的步再關掉(可多個,逗號分隔);開任一步自動帶 s1(地基)。
  //   env.enc / env.newmech / env.feel2 任一為假 → 全部強制關(五城新機制沒開就沒有 core 事件;feel2 關＝整套新演出都不跑)。
  //   不讀不寫 ?lonely(水城孤身只靠 core 事件,lonely 沒開就沒事件、自然不演)。
  const DEFAULT_ON = '2';   // 沒帶 ?efx= 時的預設值(寫法同 ?efx=);改回 '0' ＝ 回到預設全關
  function parseFlags(search, env) {
    const o = allOff();
    try {
      env = env || {};
      if (!env.enc || !env.newmech || !env.feel2) return o;
      const q = String(search || '');
      const m = /[?&]efx=([^&#]*)/i.exec(q);   // 參數名不分大小寫(2026-11-27 回修:?EFX=0 也能退回舊演出)
      const v = m ? decodeURIComponent(m[1]).trim().toLowerCase() : DEFAULT_ON;   // 沒帶 → 照預設值走同一條解析(＝帶 ?efx=2)
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
      // 批 2:破裂(4×4)、蒸氣(4×2)、命中圖(4×4)、火尾巴/火星(單張)、餘火(4×2)。每格縮到「最大顯示大小×2」以下、只縮不放
      { key: 'fx_en_break_shatter16', url: 'art/fx/fx_en_break_shatter16.webp', frame: [224, 224] },
      { key: 'fx_en_steam_hiss8', url: 'art/fx/fx_en_steam_hiss8.webp', frame: [256, 256] },
      { key: 'fx_en_fire_burst16', url: 'art/fx/fx_en_fire_burst16.webp', frame: [256, 256] },
      { key: 'fx_en_fire_tail_1', url: 'art/fx/fx_en_fire_tail_1.webp' },
      { key: 'fx_en_fire_tail_2', url: 'art/fx/fx_en_fire_tail_2.webp' },
      { key: 'fx_en_fire_tail_3', url: 'art/fx/fx_en_fire_tail_3.webp' },
      { key: 'fx_en_ember_flame8', url: 'art/fx/fx_en_ember_flame8.webp', frame: [144, 144] },
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
  // ════ 執行期元件:只在 index.html 的 if (EFX.sN) 鉤子內被呼叫;這段之後才會建物件、加補間、用亂數 ════
  // 圖層(規格 3.11 對映遊戲 DEPTH:hp30 < 餘火 31 < 線 33 < 威脅體 34 < 靶環 35 < 碎裂/蒸氣 36 < abtn38、board40 … fx66、倒數圖示 fx+2=68)
  //   暗幕 65.5:蓋住棋盤、托盤、我方彈道(proj60),不蓋 fx66 以上(浮字/扣血數字/倒數圖示,字要讀得到);命中圖 66.5~66.8 在暗幕之上。
  const DEP = { ember: 31, line: 33, threat: 34, ring: 35, burst: 36, steam: 36.5, dim: 65.5, hit: 66.5, badge: 68.2 };
  const RING_EDGE = 0x3a2418, RING_GAP = 0.26, LOOP_FPS = 11, ADD = 1;   // ADD = Phaser.BlendModes.ADD
  const KEY = { shatter: 'fx_en_break_shatter16', steam: 'fx_en_steam_hiss8', burst: 'fx_en_fire_burst16', ember: 'fx_en_ember_flame8', tail: ['fx_en_fire_tail_1', 'fx_en_fire_tail_2', 'fx_en_fire_tail_3'] };
  const ecRef = () => (typeof EnemyCore !== 'undefined' ? EnemyCore : null);

  // 自己的亂數(審查 B2):新演出一律不碰全域 Math.random,補方塊(_pickEasy 等)用的亂數序列不受新演出影響。
  let RS = 0x5eed1234 | 0;
  function rnd() { RS = (RS + 0x6D2B79F5) | 0; let t = RS; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const rr = (a, b) => a + (b - a) * rnd();
  const EZ = { l: u => u, qo: u => 1 - (1 - u) * (1 - u), qi: u => u * u, si: u => -(Math.cos(Math.PI * u) - 1) / 2, bo: u => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); } };

  // 每個場景一個管理器:一支 'update' 監聽驅動所有元件。場景關閉(重開/離開)就作廢——scene 實例欄位會留到下一場,所以每次看 alive。
  // 任何元件 update/補間回呼/排程丟錯:整步關掉(flags[step]=false)、收掉全部元件並把舊演出補回(Phaser 回呼例外會停住整個主迴圈,不能讓它冒出去)。
  function rt(scene) {
    let R = scene._efxRt;
    if (R && R.alive && R.scene === scene) return R;
    R = scene._efxRt = { scene, alive: true, parts: new Set(), fx: new Set(), tms: [], locks: new Set(), flags: null, step: null, dim: null, cam: null, camBack: null, ember: null, seqEnd: 0, oldLand: 0, burnHitAt: 0, emberHitAt: 0, olds: new Set() };   // olds:舊普攻已飛出彈道的收掉把手(火城 A1,oldFx)
    const upd = (time, delta) => {
      if (!R.alive) return; const dt = Math.max(0, Math.min(100, delta || 16.7));
      R.parts.forEach(p => { try { p.update(dt); } catch (err) { fail(R, err); } });
    };
    scene.events.on('update', upd);
    scene.events.once('shutdown', () => { R.alive = false; scene.events.off('update', upd); R.parts.clear(); R.fx.clear(); R.tms = []; R.locks.clear(); R.olds.clear(); R.dim = null; R.cam = null; R.camBack = null; R.ember = null; });
    return R;
  }
  function bind(scene, flags) { const R = rt(scene); if (flags) { R.flags = flags; R.step = 's2'; } return R; }
  // 出錯關步:收演出但不放輸入鎖(補修 A2)——遊戲端的命中計時器照原排程各扣一次,鎖各自到時(最後一筆扣完之後)才放
  function fail(R, err) {
    if (R.failed) return; R.failed = true;
    try { console.error('[EFX] ' + (R.step || '') + ' 執行期出錯,本場關閉此步', err); } catch (e2) { }
    if (R.flags && R.step) R.flags[R.step] = false;
    try { dropAll(R.scene); } catch (e3) { }
    R.failed = false;
  }
  // 補間/排程回呼一律包這層:出錯走 fail(),不冒到 Phaser 主迴圈(審查 B3)
  function cb(scene, fn) { return function () { try { return fn.apply(this, arguments); } catch (err) { fail(rt(scene), err); } }; }
  // 短效物件(碎片火花、火星、命中柔光、餘火飛入方塊、換身煙)登記到場景清單:自己播完銷毀時移出;dropScene(結算/重來/換波)一起收(補修 A5)
  function own(scene, o) { const R = rt(scene); R.fx.add(o); try { o.once('destroy', () => R.fx.delete(o)); } catch (er) { } return o; }
  function tween(scene, cfg) { if (cfg.onComplete) cfg.onComplete = cb(scene, cfg.onComplete); if (cfg.onUpdate) cfg.onUpdate = cb(scene, cfg.onUpdate); return scene.tweens.add(cfg); }
  // 場景層排程(暗幕、鏡頭、出手各段):dropScene 會全部取消
  function rlater(scene, ms, fn) { const R = rt(scene); const t = scene.time.delayedCall(Math.max(0, ms), () => { const i = R.tms.indexOf(t); if (i >= 0) R.tms.splice(i, 1); try { fn(); } catch (err) { fail(R, err); } }); R.tms.push(t); return t; }
  // 輸入鎖(規格 3.10):一律走遊戲的計數鎖 _atkLockOn(看門狗 ms+1500),不自己設 locked;到時放,dropScene 也會放。
  function takeLock(scene, ms) { if (!scene._atkLockOn || !(ms > 0)) return; const R = rt(scene), rel = scene._atkLockOn(ms); R.locks.add(rel); scene.time.delayedCall(ms, () => { if (R.locks.delete(rel)) rel(); }); }
  // 減少動態(規格 3.13)與我方終局特寫(3.9 鏡頭主人):頓幀、鏡頭、震動、暗幕都不做;圖照演、鎖照常
  function reduced() { try { return !!(typeof BattleVFX !== 'undefined' && BattleVFX.reduced && BattleVFX.reduced()); } catch (e) { return false; } }
  function cine(scene) { return !!(scene._f8 || scene.camCine); }
  function quiet(scene) { return reduced() || cine(scene); }
  function shake(scene, px, ms) { if (quiet(scene) || !scene.shakeCam) return; scene.shakeCam(ms, px / 420); }
  function geoOf(scene) { try { return scene._efxGeo ? scene._efxGeo() : null; } catch (e) { return null; } }
  function has(scene, k) { return !!(scene.textures && scene.textures.exists(k)); }
  // 新火城演出的總閘:一般火球圖有載到才接手(缺圖 → 舊程式球、舊骷髏光暈全部照舊,審查 B4)
  function fireReady(scene) { return has(scene, 'fx_en_fire_charge8'); }
  function ready(scene, what) { return fireReady(scene) && (what === 'ember' ? has(scene, KEY.ember) : true); }

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

  // 通用:播一段手繪格(蒸氣、碎裂、命中圖、餘火)。o:{key,x,y,size,fps,loop,depth,origin,frameAt(t)→格或 null 結束,follow(self)}
  function anim(scene, o) {
    if (!has(scene, o.key)) return null;
    const R = rt(scene), im = scene.add.image(o.x, o.y, o.key, 0).setDepth(o.depth || DEP.steam);
    if (o.origin) im.setOrigin(o.origin[0], o.origin[1]);
    const self = { im, t: 0, dead: false, n: Math.max(1, scene.textures.get(o.key).frameTotal - 1), k: 1, size: o.size || im.width };
    const fit = () => im.setScale(self.size * self.k / (im.width || 1));
    self.update = dt => {
      if (!im.scene) { self.kill(); return; }
      self.t += dt; let f;
      if (o.frameAt) f = o.frameAt(self.t); else { f = Math.floor(self.t * (o.fps || 14) / 1000); if (o.loop) f %= self.n; }
      if (f == null || f >= self.n) { self.kill(); return; }
      im.setFrame(f); fit(); if (o.follow) o.follow(self);
    };
    self.kill = () => { if (self.dead) return; self.dead = true; R.parts.delete(self); scene.tweens.killTweensOf([im, self]); try { if (im.scene) im.destroy(); } catch (er) { } };
    R.parts.add(self); self.update(0);
    return self;
  }
  function steam(scene, x, y, size, depth) { return anim(scene, { key: KEY.steam, x, y, size, fps: 14, depth: depth || DEP.steam }); }
  // 方塊碎片火花(規格 3.9 sparks):向外放射 rnd(.6,1)×半徑,320~460ms 淡出;實體類 → 細描邊
  function sparks(scene, x, y, n, rad, depth, cols, sz) {
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2 + rr(-0.3, 0.3), d = rr(0.6, 1) * rad, s = sz || rr(5, 9), q = own(scene, scene.add.rectangle(x, y, s, s, cols[k % cols.length], 1).setStrokeStyle(1.5, 0x2a1208, 0.9).setDepth(depth).setAngle(rr(0, 90)));
      tween(scene, { targets: q, x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d, angle: q.angle + rr(-120, 120), alpha: 0, scale: 0.5, duration: rr(320, 460), ease: 'Quad.easeOut', onComplete: () => q.destroy() });
    }
  }
  // 火星(fire_tail 單張):酋長變身、火球尾跡共用
  function flick(scene, x, y, s, depth, rise, ms) {
    const k = KEY.tail[(rnd() * 3) | 0]; if (!has(scene, k)) return;
    const im = own(scene, scene.add.image(x, y, k).setDepth(depth).setAngle(rr(-25, 25))); im.setScale(s / (im.width || 1)).setAlpha(0.95);
    tween(scene, { targets: im, y: y - (rise || 0), alpha: 0, scale: im.scaleX * 0.6, duration: ms || 260, ease: 'Quad.easeOut', onComplete: () => im.destroy() });
  }

  // 怪的動作(規格 3.8):走遊戲步 4 的偏移層 _fxStOn(本體 x/y/scale 不被改寫,enemyAttack 的 killTweensOf 也殺不到)。
  // keys:[[到達時刻 ms, dx, dy, 角度, sx, sy, 緩動]…],由上一個關鍵格補間到這一格。side 固定 +1(遊戲不讀樣品 anchor,規格 4.1 F10)。
  function motion(scene, e, keys) {
    if (!scene._fxStOn || !e || e.dead || !e.sprite || !e.sprite.active) return null;
    const dur = keys[keys.length - 1][0];
    return scene._fxStOn(e, { kind: 'hit', dur, upd: (st, t) => {
      let p = [0, 0, 0, 0, 1, 1], q = keys[keys.length - 1];
      for (let i = 0; i < keys.length; i++) { if (t <= keys[i][0]) { q = keys[i]; break; } p = keys[i]; }
      const u = q[0] > p[0] ? clamp((t - p[0]) / (q[0] - p[0]), 0, 1) : 1, v = (EZ[q[6]] || EZ.l)(u);
      st.off = { dx: lerp(p[1], q[1], v), dy: lerp(p[2], q[2], v), ang: lerp(p[3], q[3], v), sx: lerp(p[4], q[4], v), sy: lerp(p[5], q[5], v) };
    } });
  }
  const MOVE = {
    strike: tier => { const big = tier / 3, k = 1 + 0.4 * big, bk = 120 + 40 * big, sc = 1.1 + 0.04 * big; return [[bk, -12 * k, -14 * k, -12 * k, 1.04, 1.04, 'qo'], [bk + 90, 10 * k, 18 * k, 10 * k, sc, sc * 0.96, 'qi'], [bk + 90 + 380, 0, 0, 0, 1, 1, 'bo']]; },
    recoil: () => [[110, -16, -16, -16, 0.93, 0.93, 'qo'], [260, 6, 4, 6, 1.02, 1.02, 'si'], [410, -2, -1, -2, 0.995, 0.995, 'si'], [670, 0, 0, 0, 1, 1, 'bo']],
    // 被壓低:先沉 6+5n、縮高 .94(90ms),再回到 3n(420ms);遊戲沒有常駐姿勢層 → 之後 300ms 歸零(回報有寫)
    press: n => [[90, 0, 6 + 5 * n, 0, 1, 0.94, 'qo'], [510, 0, 3 * n, 0, 1, 1, 'si'], [810, 0, 0, 0, 1, 1, 'si']],
    jolt: () => [[35, 0, 5, 0, 1, 1, 'qo'], [70, 0, 0, 0, 1, 1, 'qi']],
    burnIn: () => [[286, 0, -8, 0, 1.09, 1.09, 'qo'], [520, 0, -2, 0, 1.02, 1.02, 'si'], [720, 0, 0, 0, 1, 1, 'si']],
    burnOut: () => [[160, 0, 6, 0, 0.95, 0.95, 'qo'], [580, 0, 0, 0, 1, 1, 'bo']],
  };
  // 頓幀(規格 3.8):暫停怪的動作(本體補間＋步 4 狀態時鐘),用場景計時器到時恢復;減少動態/終局特寫時不做
  function freeze(scene, e, ms) {
    if (!(ms > 0) || quiet(scene) || !e || !e.sprite || !e.sprite.active) return;
    const now = scene.time.now || 0, tws = scene.tweens.getTweensOf(e.sprite).filter(t => t.isPlaying && t.isPlaying()), st = e._fxSt, mine = !!(st && st.frz == null);
    tws.forEach(t => t.pause()); if (mine) st.frz = now;
    scene.time.delayedCall(ms, () => { tws.forEach(t => { try { t.resume(); } catch (er) { } }); if (mine && e._fxSt === st && st.frz === now) { st.t0 += ms; st.end += ms; st.frz = null; } });
  }

  // 規格 3.1 威脅體:手繪 8 格循環(11fps,起始相位隨機)、大小＝威力(Back.easeOut 補間)、蓄力越高脈動越快越大、不抖、不跟怪動。
  // o:{art, size, host:()=>{x,y}, pulse, depth, grow}
  function makeThreat(scene, o) {
    const R = rt(scene), c = scene.add.container(0, 0).setDepth(o.depth || DEP.threat), tws = [];
    const self = { c, size: o.size, goal: o.size, sx: o.grow ? 0 : 1, charge: 0, pulse: o.pulse || 1, phase: 0, t: rnd() * 1000, host: o.host, free: false, alive: true, dead: false, layers: [], art: null, szTw: null };
    const tw = cfg => { const t = tween(scene, cfg); tws.push(t); return t; };
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
    self.detach = () => { self.free = true; self.alive = false; return c; };   // 交給出手飛行:不再跟定點;飛完(或容器被銷毀)自己收
    self.setArt(o.art);
    R.parts.add(self); if (o.grow) self.grow(); self.update(0);
    return self;
  }

  // 規格 3.2 靶環(視窗模式):程式畫奶油色粗弧＋深色細外框,不旋轉,呼吸 1800ms;n 段、段縫 0.26;準心十字;隨剩餘手數收緊變色。
  // o:{depth, color, width, segs, maxR:()=>px, follow:()=>{x,y,r}|null}
  function makeRing(scene, o) {
    const R = rt(scene), g = scene.add.graphics().setDepth(o.depth || DEP.ring), depth = o.depth || DEP.ring;
    const self = { g, on: false, a: 0, alpha: 0, col: o.color || RING_COL, segs: o.segs || 1, left: o.segs || 1, width: o.width || 4, tk: { v: 0 }, top: 0, dead: false, pieces: [], tms: [] };
    const span = i => { const n = self.segs, seg = Math.PI * 2 / n, a0 = -Math.PI / 2 + i * seg + (n > 1 ? RING_GAP / 2 : 0); return [a0, a0 + seg - (n > 1 ? RING_GAP : 0)]; };
    const arc = (gr, x, y, r, a0, a1, w, col, al) => { gr.lineStyle(w + 3, RING_EDGE, al); gr.beginPath(); gr.arc(x, y, r, a0, a1); gr.strokePath(); gr.lineStyle(w, col, al); gr.beginPath(); gr.arc(x, y, r, a0, a1); gr.strokePath(); };
    const maxR = () => (o.maxR ? o.maxR() : null);
    self.radius = f => ringRadius(f.r, self.width, self.tk.v, self.a, maxR());
    self.setHands = (left, now) => {
      if (!self.top || left > self.top) self.top = left; const t = ringT(self.top, left); scene.tweens.killTweensOf(self.tk);
      if (now || !self.on) self.tk.v = t; else tween(scene, { targets: self.tk, v: t, duration: 520, ease: 'Sine.easeInOut' });
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
    self.show = () => { if (self.on) return; self.on = true; scene.tweens.killTweensOf(self); self.alpha = 0; tween(scene, { targets: self, alpha: 1, duration: 260 }); };
    self.hide = ms => { if (!self.on) return; self.on = false; self.top = 0; scene.tweens.killTweensOf(self); tween(scene, { targets: self, alpha: 0, duration: ms || 180 }); };
    self.cut = () => { self.on = false; self.top = 0; scene.tweens.killTweensOf(self); self.alpha = 0; };
    self.reset = n => { self.segs = n || self.segs; self.left = self.segs; };
    // 掉段:最後一段複製後向外飛 r×0.7、下掉 10px、轉 ±25°、淡出(380ms Quad.easeOut);steamMs≥0 → 該段中點延遲冒蒸氣(規格 3.2;S-F3(a) 延 110ms)
    self.drop = steamMs => {
      const f = o.follow && o.follow(); if (!f || self.left <= 0) return self.left;
      const k = self.left - 1, r = self.radius(f), [a0, a1] = span(k), mid = (a0 + a1) / 2; self.left--;
      const pc = scene.add.graphics().setDepth(depth + 0.2).setPosition(f.x, f.y); arc(pc, 0, 0, r, a0, a1, self.width, ringCol(self.tk.v, self.col), 1); self.pieces.push(pc);
      tween(scene, { targets: pc, x: f.x + Math.cos(mid) * r * 0.7, y: f.y + Math.sin(mid) * r * 0.7 + 10, angle: (rnd() < 0.5 ? -1 : 1) * 25, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => { const i = self.pieces.indexOf(pc); if (i >= 0) self.pieces.splice(i, 1); pc.destroy(); } });
      if (steamMs != null && steamMs >= 0) { const sx = f.x + Math.cos(mid) * r, sy = f.y + Math.sin(mid) * r, t = scene.time.delayedCall(steamMs, cb(scene, () => { const i = self.tms.indexOf(t); if (i >= 0) self.tms.splice(i, 1); if (!self.dead) { const s = steam(scene, sx, sy, Math.max(36, r * 0.7), depth + 0.3); if (s && s.im.scene) { const im = s.im; self.pieces.push(im); try { im.once('destroy', () => { const j = self.pieces.indexOf(im); if (j >= 0) self.pieces.splice(j, 1); }); } catch (er) { } } } })); self.tms.push(t); }
      return self.left;
    };
    self.kill = () => {
      if (self.dead) return; self.dead = true; R.parts.delete(self); scene.tweens.killTweensOf([self, self.tk].concat(self.pieces));
      self.tms.forEach(t => { try { t.remove(false); } catch (er) { } }); self.tms = [];
      self.pieces.slice().forEach(p => { try { if (p.scene) p.destroy(); } catch (er) { } }); self.pieces = []; try { if (g.scene) g.destroy(); } catch (er) { }
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
    tween(scene, { targets: self, alpha: 1, duration: 220 });
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
        if (!self.zo || self.zt > (jo ? 45 : 125)) { self.zt = 0; self.zo = Array.from({ length: 11 }, (_, i) => (i === 0 || i === 10) ? 0 : (rnd() * 2 - 1) * ZAP.amp * (jo ? ZAP.jolt : 1)); }
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
    self.destroy = ms => { if (self.dead) return; if (ms === 0) { self.kill(); return; } scene.tweens.killTweensOf(self); tween(scene, { targets: self, alpha: 0, duration: ms || 200, onComplete: () => self.kill() }); };
    R.parts.add(self);
    return self;
  }

  // 規格 3.4 倒數圖示(新模式):圖示 32px、數字 Russo One 26px #eaf3ff 描邊 #1a0d05 粗 6、x=16;數字變化 1.5→1(220ms Back.easeOut);
  // 待機彈跳:週期 n≤1 ? 260 : 700ms、b=|sin|、放大 1+(n≤1 ? .14 : .05)b、上移 (n≤1 ? 4 : 1.5)b(只動圖示)。開關出錯/怪換波時還原線上樣式。
  function makeBadge(scene, e, X) {
    const R = rt(scene), tx0 = e.turnTx, g0 = e.glass;
    const keep = tx0 && tx0.style ? { ff: tx0.style.fontFamily, fs: tx0.style.fontSize, sk: tx0.style.strokeThickness, fst: tx0.style.fontStyle, x: tx0.x } : null;
    const self = { t: 0, last: null, dead: false, styled: false };
    self.update = dt => {
      const g = e.glass, tx = e.turnTx; if (e.dead || !g || !g.scene || !tx || !tx.scene) return;
      if (!self.styled) { self.styled = true; tx.setFontFamily('"Russo One", sans-serif'); tx.setFontSize(BADGE.NUM_PX); tx.setFontStyle(''); tx.setStroke('#1a0d05', 6); }
      if (tx.x !== BADGE.NUM_X) tx.setX(BADGE.NUM_X);
      if (tx.style.color !== '#eaf3ff') tx.setColor('#eaf3ff');   // 規格 3.4 數字一律 #eaf3ff(線上舊版倒數 ≤2 會變黃/紅;規格與舊演出衝突照規格);開關出錯時 updateEnemies 會套回舊色
      if (self.last !== tx.text) { const was = self.last; self.last = tx.text; if (was != null) { scene.tweens.killTweensOf(tx); tx.setScale(1.5); tween(scene, { targets: tx, scale: 1, duration: 220, ease: 'Back.easeOut' }); } }
      const now = scene.time.now || 0; if (now < (X.badgeHold || 0)) return;
      const n = parseInt(tx.text, 10), hot = !(n > 1), per = hot ? 260 : 700; self.t += dt;
      const b = Math.abs(Math.sin(self.t / per * Math.PI)), base = BADGE.ICON / (g.width || BADGE.ICON);
      g.setScale(base * (1 + (hot ? 0.14 : 0.05) * b)); g.y = -(hot ? 4 : 1.5) * b;
    };
    self.kill = () => {
      if (self.dead) return; self.dead = true; R.parts.delete(self);
      const g = e.glass, tx = e.turnTx;
      if (!e.dead) {   // 還活著(出錯關步):還原線上樣式,舊演出接手
        try { if (g && g.scene) { scene.tweens.killTweensOf(g); g.y = 0; g.setAlpha(1); const sz = (e._glassKey && e._glassKey !== 'icon_hourglass') ? ((e._g && e._g.rule === 4) ? 34 : 26) : 22; if (g.setDisplaySize) g.setDisplaySize(sz, sz); } } catch (er) { }
        try { if (tx && tx.scene && keep) { scene.tweens.killTweensOf(tx); tx.setScale(1); tx.setFontFamily(keep.ff); tx.setFontSize(keep.fs); tx.setFontStyle(keep.fst); tx.setStroke('#1a0d05', keep.sk); tx.setX(keep.x); } } catch (er) { }
      }
    };
    R.parts.add(self);
    return self;
  }
  // 骷髏裂開(規格 3.4,只在擊破時、而且當下是骷髏):先拿一張骷髏替身蓋住(真圖示換成沙漏但先隱藏),
  // 爆開時兩半各向外 16px、下掉 30px、轉 ±40°、淡出(420ms Quad.easeIn);560ms 內暫停待機彈跳;240ms 後沙漏從 0 長到 32px(260ms Back.easeOut)。
  function skullSplit(scene, e, X, at) {
    const g = e.glass, tg = e.turnG, key = e._glassKey; if (!g || !g.scene || !tg || !tg.scene || !/skull/.test(key || '') || !has(scene, key)) return;
    const x = tg.x + g.x, y = tg.y, fake = scene.add.image(x, y, key).setDepth(DEP.badge).setDisplaySize(BADGE.ICON, BADGE.ICON); xfx(X, fake);
    g.setAlpha(0); X.badgeHold = (scene.time.now || 0) + at + 560;
    later(X, scene, at, () => {
      const w = fake.width, h = fake.height, sc = fake.scaleX; try { fake.destroy(); } catch (er) { }
      [-1, 1].forEach(s => {
        const im = scene.add.image(x, y, key).setDepth(DEP.badge).setScale(sc); im.setCrop(s < 0 ? 0 : w / 2, 0, w / 2, h); xfx(X, im);
        tween(scene, { targets: im, x: x + s * 16, y: y + 30, angle: s * 40, alpha: 0, duration: 420, ease: 'Quad.easeIn', onComplete: () => im.destroy() });
      });
      later(X, scene, 240, () => {
        const gg = e.glass; if (!gg || !gg.scene || e.dead) return; scene.tweens.killTweensOf(gg); gg.setAngle(0); gg.y = 0; gg.setAlpha(1);
        const base = BADGE.ICON / (gg.width || BADGE.ICON); gg.setScale(0); tween(scene, { targets: gg, scaleX: base, scaleY: base, duration: 260, ease: 'Back.easeOut' });
      });
    });
  }

  // ── 火城接線(步 2):遊戲端鉤子只呼叫下面這幾支 ──
  // 每隻怪的演出狀態掛在 e._efx(只有開關開時才會出現;清理鉤子看它在不在)。
  // 怪身上的演出物件登記到 X.fx:物件自己銷毀(播完/交叉淡化結束)時移出,不累積已銷毀的參照(補修二 4)
  function xfx(X, o) { if (!o) return o; X.fx.push(o); try { o.once('destroy', () => { const i = X.fx.indexOf(o); if (i >= 0) X.fx.splice(i, 1); }); } catch (er) { } return o; }
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
    if (!e._efx && !fireReady(scene)) return false;   // 火球圖沒載到(404 等):不建新球 → 舊球照舊畫(規格 3.1 的「缺圖後備」由舊程式球擔任)
    const R = bind(scene, flags), born = !e._efx;
    const X = e._efx || (e._efx = { city: 'fire', tms: [], fx: [], ball: null, ring: null, badge: null, regrow: false, holdUntil: 0, fast: false, badgeHold: 0, breakAt: 0, mv: null, hot: null });
    const geo = fireGeom(scene, e); X.host = { x: geo.a.threatX, y: geo.a.threatY }; X.cw = geo.cw; X.bm = geo.bm;
    const EC = ecRef(), hits = (EC && EC.TUNING && EC.TUNING.CHIEF_HITS) || FIRE.HITS;
    const mv = fireMove(g), size = threatSize(mv, geo.bm, mv === 'king' ? fireCool(g, hits) : null); X.mv = mv;
    const lethal = !!(scene._ecLethal && scene._ecLethal(e)), art0 = fireArt(mv, lethal), art = has(scene, art0) ? art0 : FIRE.ART, now = scene.time.now || 0;   // 骷髏火球缺圖 → 一般火球
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
    if (born) {
      if (!X.badge && e.turnTx && e.glass) X.badge = makeBadge(scene, e, X);
      if (e._efxHot != null) { const h = e._efxHot; e._efxHot = null; chiefShift(scene, e, h, undefined, true); }   // 開場/重開:立繪狀態等新球建好(進場演完)再 +280ms 進入燃燒
    }
    return true;
  }
  // 取代舊 _showEnemyOrb(舊邏輯只在窗口內呼叫):放一個看不見的佔位物當 e._finOrb,讓字卡①④、出手判斷、清理全走舊邏輯。
  function fireMarker(scene, e) {
    const X = e._efx, h = X && X.host; if (!h) return false;
    const z = scene.add.zone(h.x, h.y, 1, 1); e._finOrb = z; e._finPos = { x: h.x, y: h.y }; e._finOY = h.y - (e.sprite ? e.sprite.y : h.y); e._finCol = CITY.fire.col; e._finR = (X.ball ? X.ball.size / 2 : 16);
    e._orbGrow = false;   // 審查 B5:舊路徑在建球後才重設這個旗標,佔位分支提早 return 會漏掉
    return true;
  }

  // ── 出手(規格 3.9、4.1 S-F5):各 tier 時間表;結算照舊在 enemyAttack 呼叫當下算好,這裡只排演出 ──
  //   [前傾延遲, 後仰, 飛行](前撲固定 90);球出發 L＝前傾＋後仰＋90;命中 I＝L＋飛行;總長＝I＋620(重置)。
  const ATK = [[40, 120, 220], [40, 133.3, 250], [160, 146.7, 420], [260, 160, 480]];
  function atkPlan(tier) { const a = ATK[tier], L = a[0] + a[1] + 90, I = L + a[2]; return { lean: a[0], back: a[1], L, fly: a[2], I, total: I + 620 }; }
  function fireTier(ev) { return ev.defused ? 0 : (ev.rule === 4 ? 3 : (ev.skull ? 2 : 1)); }
  // 落點:有餘火(3★、酋長)或酋長 → 血條現有血量末端;其他 → 我方卡片列上方
  function aimAt(scene, e, plan) {
    const G = geoOf(scene); if (!G) { plan.tx = plan.tx || (e.card ? e.card.x : 210); plan.ty = plan.ty || 600; return; }
    if (plan.hpT) { plan.tx = G.hpX; plan.ty = G.PHP_Y; } else { const x0 = e.card ? e.card.x : G.CX; plan.tx = clamp(x0, G.BX0 + 30, G.W - G.BX0 - 30); plan.ty = G.CARDS_Y - 38; }
  }
  // _ecAttack 鉤子呼叫(同步、結算前一刻):回傳給 enemyAttack 的 opts(關閉或不接手時回 null → 舊參數)。
  //   依序出手(規格 3.10):同一敵方回合的火城出手排成一條時間軸,前一隻總長(含 620 重置)結束才輪下一隻;輸入鎖從回合開始鎖到最後一隻結束。
  function fireLaunch(scene, e, legacyOrb, dl, ev) {
    const X = e && e._efx; if (!X || !ev) return null;
    const R = rt(scene), now = scene.time.now || 0, tier = fireTier(ev), P = atkPlan(tier);
    let b = X.ball;
    if (!b || !b.alive) {   // 審查疑點 1、3:拆除後弱球(或重置後新球)還沒長出來就出手 → 立刻補一顆當彈體,不拿看不見的佔位飛
      if (!fireReady(scene)) return null;
      const mv = ['weak', 'smash', 'skull', 'king'][tier];
      b = makeThreat(scene, { art: FIRE.ART, size: threatSize(mv, X.bm, mv === 'king' ? 0 : null), host: () => X.host, pulse: FIRE.PULSE[mv] });
    }
    if (legacyOrb && legacyOrb !== b.c) { try { legacyOrb.destroy(); } catch (er) { } }
    if (X.ring) X.ring.cut();
    const start = Math.max(dl || 0, (R.seqEnd || 0) - now, (R.oldLand || 0) + 60 - now - P.I);   // 前面已出手的舊普攻:命中要排在它落下之後(命中順序＝呼叫順序,補修二 2)
    R.seqEnd = now + start + P.total;
    X.ball = null; X.regrow = true; X.holdUntil = now + start + P.I + 620; X.waiting = false;
    b.detach();
    takeLock(scene, start + P.total);
    scene._ecImpactAt = Math.max(scene._ecImpactAt || 0, now + start + P.I + 120);   // 餘火 tick/徽章等所有敵攻彈著完
    scene._fxEndAt = Math.max(scene._fxEndAt || 0, now + start + P.total);           // 機制字卡(_mechSafe)、過關(stageClear)等演出全部結束
    if (ev.rule >= 3) R.burnHitAt = now + start + P.I;
    if (scene._tmHoldSet) scene._tmHoldSet(e, 0, start + P.I + 620);                  // F-16:新倒數數字在重置那一刻才跳出來(排隊中/出手中顯示 0)
    const plan = { tier, P, start, impact: P.I, ball: b, hpT: ev.rule >= 3 || tier === 3, tx: 0, ty: 0, maxHP: scene.maxHP || 1, ep: scene._atkLockEp || 0, e, X };   // ep:遊戲端用它判斷中途重來/離開(startStage 會換 epoch)
    aimAt(scene, e, plan);
    return { dmg: ev.raw, big: !!ev.skull || !!legacyOrb, fromOrb: { x: b.c.x, y: b.c.y }, orbObj: b.c, delay: start, efx: plan };
  }
  // enemyAttack 的演出起點(延遲 start 後)呼叫:暗幕/鏡頭/後仰前撲/發射;命中由遊戲端計時器在 plan.impact 呼叫 _playerImpact(不依賴本模組)
  function fireAttackVis(scene, e, plan) {
    const P = plan.P, tier = plan.tier;
    if (plan.mute || (scene.resultOpen && scene._resultTerminal)) { if (plan.ball && !plan.ball.dead) plan.ball.kill(); return; }   // 前一隻已打死我方:這一擊已由遊戲端當場結清(plan.mute,補修 A1)或結算畫面開了 → 排在後面的不再演
    if (scene.labSnd) scene.labSnd('s_clear15', 0.6);
    if (tier >= 2) dimTo(scene, tier === 3 ? 0.26 : 0.2, 360);
    if (tier === 3 && e.card) camIn(scene, e.card.x, (e.cy || 0) + 60, 300);
    rlater(scene, P.lean, () => { if (!e.dead) motion(scene, e, MOVE.strike(tier)); });
    rlater(scene, P.L, () => { aimAt(scene, e, plan); if (scene.labSnd) scene.labSnd(['s_fire1', 's_fire2', 's_fire3'][(rnd() * 3) | 0], 0.6); fly(scene, plan); });
    rlater(scene, P.I + 180, () => camOut(scene, 380));
    rlater(scene, P.I + 200, () => dimTo(scene, 0, 420));
  }
  // 發射:弧線向上拱 30px、Quad.easeIn;tier ≥2 每 28ms 掉一片火尾巴(fire_tail_1~3,size×.6,260ms 淡出)
  function fly(scene, plan) {
    const b = plan.ball; if (!b || b.dead || !b.c.scene) return; if (plan.mute) { b.kill(); return; }
    const R = rt(scene), c = b.c, ax = c.x, ay = c.y, P = plan.P, tail = plan.tier >= 2;
    const self = { t: 0, tt: 0, dead: false };
    self.update = dt => {
      if (b.dead || !c.scene) { self.kill(); return; }
      if (plan.mute) { b.kill(); self.kill(); return; }   // 飛行中被當場結清(補修 A1):球收掉,不再落地演出
      self.t += dt; const u = clamp(self.t / P.fly, 0, 1), v = u * u, x = lerp(ax, plan.tx, v), y = lerp(ay, plan.ty, v) - 30 * Math.sin(Math.PI * v);
      c.setPosition(x, y);
      if (tail) { self.tt += dt; while (self.tt >= 28) { self.tt -= 28; flick(scene, x, y, b.size * b.sx * 0.6, DEP.threat - 0.1, 0, 260); } }
      if (u >= 1) { b.kill(); self.kill(); }
    };
    self.kill = () => { if (self.dead) return; self.dead = true; R.parts.delete(self); };
    R.parts.add(self);
  }
  // 暗幕(規格 3.9):全螢幕黑,tier 2 → .20、tier 3 → .26,360ms 淡入;I+200 起 420ms 淡回 0。漸進,不是白閃。
  function dimTo(scene, a, ms) {
    const R = rt(scene); if (a > 0 && quiet(scene)) return;
    let d = R.dim;
    if (!d || !d.scene) { if (!(a > 0)) return; const v = scene.cameras.main.worldView; d = R.dim = scene.add.rectangle(v.centerX, v.centerY, v.width * 3 + 400, v.height * 3 + 400, 0x000000, 1).setDepth(DEP.dim).setAlpha(0); }
    scene.tweens.killTweensOf(d);
    tween(scene, { targets: d, alpha: a, duration: ms, ease: 'Sine.easeInOut', onComplete: () => { if (!(a > 0) && R.dim === d) { R.dim = null; d.destroy(); } } });
  }
  // 鏡頭(規格 3.9):tier 3 拉近 DPR×1.12、中心 (敵x, cy+60),300ms Sine.easeInOut;I+180 起 380ms 回位。我方終局特寫中不搶。
  function camIn(scene, x, y, ms) {
    if (quiet(scene)) return; const R = rt(scene), cam = scene.cameras.main, G = geoOf(scene); if (!cam || !cam.zoomTo || !cam.pan || !G) return;
    if (!R.cam) R.cam = { z: G.DPR, x: G.CX, y: Math.round(G.H / 2) };
    cam.zoomTo(R.cam.z * 1.12, ms, 'Sine.easeInOut', true); cam.pan(x, y, ms, 'Sine.easeInOut', true);
  }
  // 回位期間記 R.camBack(補修 A3):這 ms 內 dropScene(結算/重來/換波)仍找得到原鏡頭,停掉 pan/zoom 並直接歸位,不讓殘留補間蓋掉新設定
  function camOut(scene, ms) { const R = rt(scene), cam = scene.cameras.main, c = R.cam; if (!c || !cam) return; R.cam = null; if (cine(scene)) return; R.camBack = c; cam.zoomTo(c.z, ms, 'Sine.easeInOut', true); cam.pan(c.x, c.y, ms, 'Sine.easeInOut', true); rlater(scene, ms + 20, () => { if (R.camBack === c) R.camBack = null; }); }
  function camReset(scene) { const R = rt(scene), cam = scene.cameras.main, c = R.cam || R.camBack; R.cam = null; R.camBack = null; if (!c || !cam) return; if (cine(scene)) return; try { cam.panEffect.reset(); cam.zoomEffect.reset(); } catch (er) { } cam.setZoom(c.z); cam.centerOn(c.x, c.y); }
  // 命中我方(規格 3.9 impactFx):由 _playerImpact 鉤子呼叫,取代舊的白色閃光圈/衝擊環/屬色火花。
  //   命中圖 fire_burst16(30fps,120+110×big)＋#ff6a2a 柔光(.25,360ms 擴大)＋碎片火花 10+8×tier(半徑 40+30×big)＋震屏 (2+3×tier)px/(140+60×tier)ms。
  //   big＝clamp(這一擊傷害 ÷ (我方血量上限 × 0.56), .15, 1)(規格答案,補修 B10)。
  //   kind 'burn'(餘火每塊):8 顆碎片火花(半徑 26)＋餘火圖縮回(S-F4)。
  function impactFx(scene, tx, ty, dmg, dodged, efx) {
    if (scene.resultOpen && scene._resultTerminal) return true;
    if (efx && efx.mute) return true;
    if (efx && efx.kind === 'burn') { if (!dodged) { sparks(scene, tx, ty, 8, 26, DEP.hit + 0.2, CITY.fire.shard, 6); emberHit(scene); } return true; }
    if (!has(scene, KEY.burst)) return false;   // 命中圖缺載(補修二 3):新演出什麼都不做,回 false → 遊戲端改演舊命中特效
    const tier = (efx && efx.tier) | 0, big = clamp((dmg || 0) / Math.max(1, ((efx && efx.maxHP) || scene.maxHP || 1) * 0.56), 0.15, 1);
    if (!dodged) {
      if (scene.labSnd) scene.labSnd('s_player', 0.8);
      const sz = 120 + 110 * big, gl = own(scene, scene.add.circle(tx, ty - 10, sz * 0.22, CITY.fire.col, 0.25).setBlendMode(ADD).setDepth(DEP.hit));
      tween(scene, { targets: gl, scale: 2.6, alpha: 0, duration: 360, ease: 'Quad.easeOut', onComplete: () => gl.destroy() });
      anim(scene, { key: KEY.burst, x: tx, y: ty - 10, size: sz, fps: 30, depth: DEP.hit + 0.1 });
      sparks(scene, tx, ty - 10, 10 + 8 * tier, 40 + 30 * big, DEP.hit + 0.2, CITY.fire.shard);
    }
    shake(scene, 2 + 3 * tier, 140 + 60 * tier);
    return true;
  }

  // ── 餘火(規格 4.1 專屬元件、S-F4、F-14、F-15):ember_flame8 42px 寬、原點 (.5,.95)、掛在血條現有血量末端、血條下緣＋2,循環 11fps ──
  function emberObj(scene, grow) {
    const R = rt(scene); let E = R.ember; if (E && !E.dead) return E;
    const G = geoOf(scene); if (!G || !has(scene, KEY.ember)) return null;
    E = anim(scene, { key: KEY.ember, x: G.hpXs, y: G.PHP_Y + 10, size: 42, fps: LOOP_FPS, loop: true, depth: DEP.ember, origin: [0.5, 0.95], follow: s => { const g2 = geoOf(scene); if (g2) s.im.setPosition(g2.hpXs, g2.PHP_Y + 10); } });
    if (!E) return null; R.ember = E; const k0 = E.kill; E.kill = () => { if (R.ember === E) R.ember = null; k0(); };
    try { const T = scene.pHpTxt; if (T && T.scene && scene.children && scene.children.moveBelow) { E.im.setDepth(T.depth); scene.children.moveBelow(E.im, T); } } catch (er) { }   // 血量數字壓在火焰上面(40+ 玩家要讀得到血量;規格圖層 6 在血量文字之上,這裡刻意讓字在上,回報有寫)
    if (grow) { E.k = 0; E.update(0); tween(scene, { targets: E, k: 1, duration: 260, ease: 'Back.easeOut' }); }
    return E;
  }
  function emberGone(scene, E, ms, puff) {
    if (!E || E.dead) return; scene.tweens.killTweensOf(E);
    tween(scene, { targets: E, k: 0, duration: ms || 260, ease: 'Quad.easeIn', onComplete: () => { if (puff && E.im.scene) steam(scene, E.im.x, E.im.y - 14, 40, DEP.ember + 0.1); E.kill(); } });
    if (rt(scene).ember === E) rt(scene).ember = null;
  }
  // burn_start(敵方回合收尾提交餘火)時呼叫:I+90 9 顆小方塊從命中點周圍 30~56px 飛向血條末端(130ms Quad.easeIn);I+220 新餘火長出;舊的先清(不疊加、重新起算)。
  function emberStart(scene) {
    if (!ready(scene, 'ember')) return false;
    const R = rt(scene), now = scene.time.now || 0, I = R.burnHitAt > 0 ? R.burnHitAt : Math.max(now, (scene._ecImpactAt || now) - 120);
    rlater(scene, Math.max(0, I + 90 - now), () => {
      const G = geoOf(scene); if (!G || (scene.resultOpen && scene._resultTerminal)) return;
      for (let k = 0; k < 9; k++) {
        const ang = rr(0, Math.PI * 2), d = rr(30, 56), q = own(scene, scene.add.rectangle(G.hpX + Math.cos(ang) * d, G.PHP_Y + Math.sin(ang) * d, 6, 6, CITY.fire.shard[k % 4], 1).setStrokeStyle(1.5, 0x2a1208, 0.9).setDepth(DEP.hit + 0.2));
        tween(scene, { targets: q, x: G.hpX, y: G.PHP_Y, scale: 0.4, duration: 130, ease: 'Quad.easeIn', onComplete: () => q.destroy() });
      }
    });
    rlater(scene, Math.max(0, I + 220 - now), () => { if (scene.resultOpen && scene._resultTerminal) return; if (scene._ecBurnLive && !(scene._ecBurnLive() > 0)) return;   /* 中途已清(復活 _ecBurnClear 等):不再長出 */ emberGone(scene, R.ember, 120, false); emberObj(scene, true); });
    return true;
  }
  // burn_tick(每放一塊):扣血那一刻(遊戲端 dl 後呼叫 _playerImpact)前 200ms 先脹到 1.7 倍;扣血後縮回(240ms);
  //   還有下一次 → 縮到 .68;最後一次 → 縮到 0(260ms)＋蒸氣。鎖:多鎖約 660ms(規格 S-F4)。
  //   補修 A8:這一跳四捨五入為 0(D≤3 時 15% 那跳)或扣血被跳過(選單開著),遊戲端不會呼叫 _playerImpact → 這裡保底:到點 +30ms 還沒縮回就自己縮。
  function emberTick(scene, dl) {
    const R = rt(scene), t0 = scene.time.now || 0; takeLock(scene, dl + 460);
    rlater(scene, Math.max(0, dl - 200), () => { const E = R.ember || emberObj(scene, false); if (!E) return; scene.tweens.killTweensOf(E); tween(scene, { targets: E, k: 1.7, duration: 200, ease: 'Quad.easeOut' }); });
    rlater(scene, dl + 30, () => { if (!(R.emberHitAt > t0) && R.ember && !R.ember.dead) emberHit(scene); });
    return true;
  }
  function emberHit(scene) {
    const R = rt(scene); R.emberHitAt = scene.time.now || 0; const E = R.ember || emberObj(scene, false); if (!E) return;
    const left = scene._ecBurnLive ? scene._ecBurnLive() : 0; scene.tweens.killTweensOf(E);
    tween(scene, { targets: E, k: 1, duration: 240, ease: 'Quad.easeOut', onComplete: () => { if (left > 0) tween(scene, { targets: E, k: 0.68, duration: 200, ease: 'Sine.easeInOut' }); else emberGone(scene, E, 260, true); } });
  }
  function emberOff(scene) { const R = scene._efxRt; if (R && R.alive && R.ember) emberGone(scene, R.ember, 220, false); }

  // ── 拆除(規格 4.1 S-F3(b)):T0＝我方一擊到達 ──
  //   0:靶環掉段＋立刻消失;火球改播破裂圖(球×1.28)格 0~2(32fps,93.75ms);怪頓幀 204ms
  //   93.75:停格 110ms
  //   203.75:爆開——6 顆碎片火花(半徑 .9×球直徑)、震屏 3px/140ms、怪後退、頭上蒸氣(敵圖寬×.38)、酋長離開燃燒、骷髏裂開換沙漏;格 3~15
  //   623.75:換成小火球(420ms 長出);解鎖。鎖:一擊飛行＋約 624ms(到達時起算 624)。
  function fireDefuse(scene, e, flags) {
    const X = e && e._efx; if (!X) return;
    bind(scene, flags); const now = scene.time.now || 0, b = X.ball; X.fx = X.fx.filter(o => o && o.scene);   // 舊的(已銷毀)參照丟掉,不累積
    takeLock(scene, 624); freeze(scene, e, 204); X.breakAt = now + 204;
    if (X.ring) { X.ring.drop(); X.ring.cut(); }
    X.ball = null; X.regrow = true; X.holdUntil = now + 624; X.waiting = false;
    const px = b ? b.c.x : X.host.x, py = b ? b.c.y : X.host.y, d = b ? b.size * b.sx : X.bm * 0.6;
    if (b && has(scene, KEY.shatter)) {
      b.kill();
      const s = anim(scene, { key: KEY.shatter, x: px, y: py, size: d * ART_FIT, depth: DEP.burst, frameAt: t => t < 93.75 ? Math.floor(t / 31.25) : t < 203.75 ? 2 : 3 + Math.floor((t - 203.75) / 31.25) });
      if (s) xfx(X, s.im);
    } else if (b) b.fade(480, 0.55);
    skullSplit(scene, e, X, 204);
    later(X, scene, 204, () => {
      sparks(scene, px, py, 6, 0.9 * d, DEP.burst + 0.2, CITY.fire.shard);
      shake(scene, 3, 140);
      motion(scene, e, MOVE.recoil());
      const f = readGame(e), a = anchor(f), sw = Math.max(40, (f.dispW || e.cardW || 120) * 0.38);
      const st = steam(scene, a.x, a.headY - sw * 0.25, sw, DEP.steam); if (st) xfx(X, st.im);
      if (scene.labSnd) scene.labSnd('s_block', 0.5);
    });
    later(X, scene, 625, () => { if (e._efx === X) fireSync(scene, e, flags); });
  }
  // 酋長第 1、2 下(降溫,stage＝打完剩幾下 2/1;規格 S-F3(a)):
  //   0:靶環掉最後一段(380ms,碎片處延 110ms 冒蒸氣);怪頓幀 100ms / 220:火球縮到下一級(180ms Back.easeOut)
  //   330:怪被壓低 press(冷卻次數)、震屏 1.5px/100ms、致死狀態若改變骷髏直接換沙漏(無裂開) / 520:解鎖
  function fireHit(scene, e, stage, flags) {
    const X = e && e._efx; if (!X || !(stage > 0)) return;
    bind(scene, flags); takeLock(scene, 520); freeze(scene, e, 100);
    if (X.ring) { if (X.ring.left > stage + 1) X.ring.left = stage + 1; X.ring.drop(110); }
    later(X, scene, 220, () => { if (e._efx !== X) return; X.fast = true; try { fireSync(scene, e, flags); } finally { X.fast = false; } });
    later(X, scene, 330, () => {
      if (e._efx !== X || e.dead) return;
      const EC = ecRef(), hits = (EC && EC.TUNING && EC.TUNING.CHIEF_HITS) || FIRE.HITS;
      motion(scene, e, MOVE.press(Math.max(1, hits - stage))); shake(scene, 1.5, 100);
      if (scene._ecGlass) scene._ecGlass(e, false);   // 舊版靠 _ecCoolFx 內的彈跳回呼換圖;開關開時 _ecCoolFx 不演 → 這裡補叫(只換圖、不彈跳)
    });
  }
  // 窗口外被打(規格 F-09):core 沒有事件 → 遊戲端在 _ecResolveHits 呼叫:這批火城受害者裡沒拿到 enemy_hit 的,到達當下點頭(hitJolt 70ms)。
  function fireJolts(scene, gv, evs, landMs) {
    const E = scene.enemies || [], got = new Set((evs || []).filter(v => v && v.t === 'enemy_hit').map(v => E[v.e]));
    (gv || []).forEach(v => { const X = v && v._g && v._efx; if (!X || got.has(v)) return; later(X, scene, landMs || 0, () => { if (!v.dead && v.hp > 0) motion(scene, v, MOVE.jolt()); }); });
  }
  // 酋長身體切換(規格 4.1 StateShift;不含身後 aura_fire8、不含鬥氣):取代 _ecChiefArt 的直接換圖。
  //   進入:+280ms 起隆起 520ms(前 286ms 放大 1.09、上抬 8px;到頂時燃燒版交叉淡化 240ms＋4 片火星;再 234ms 收到 1.02、上抬 2px);
  //   離開(被拆除,爆開那一刻):160ms 縮到 .95、下沉 6px,換回平靜版並 420ms 回 1.0;頭上 5 團煙。重置時若不在燃燒就再進入一次。
  //   回傳 true＝新演出接手(舊直接換圖不做)。
  const KING = 'card_c41_king_full', KING_HOT = 'card_c41_king_full_hot';
  function chiefShift(scene, e, hot, artOk, first) {
    if (!e || e.dead || !e.sprite || !e.img) return false;
    const k = e.sprite.texture && e.sprite.texture.key; if (k !== KING && k !== KING_HOT) return false;
    if (artOk === false || !has(scene, KING_HOT)) return false;
    const X = e._efx; if (!X) { if (!fireReady(scene)) return false; e._efxHot = !!hot; return true; }   // 補修 A4:一般火球圖缺 → 不會有 e._efx 來讀 _efxHot,交回舊的直接換圖
    if (X.hot === !!hot) return true; X.hot = !!hot;
    const now = scene.time.now || 0, want = hot ? KING_HOT : KING;
    if (hot) {
      const at = first ? 280 : Math.max(0, (X.holdUntil || 0) - now);   // 開場 +280;出手後重置(I+620)再進入
      later(X, scene, at, () => {
        if (e._efx !== X || e.dead || X.hot !== true) return; if (e.sprite.texture.key === want) { burnSparks(scene, e, X); return; }
        motion(scene, e, MOVE.burnIn());
        later(X, scene, 286, () => { if (e._efx !== X || e.dead || X.hot !== true) return; swapArt(scene, e, X, want, 240); const f = readGame(e), a = anchor(f); for (let i = 0; i < 4; i++) flick(scene, a.x + rr(-0.3, 0.3) * (f.dispW || 120), a.headY + rr(0, 40), rr(30, 48), DEP.burst, rr(40, 80), rr(420, 620)); if (scene.labSnd) scene.labSnd('s_fire2', 0.45); burnSparks(scene, e, X); });
      });
    } else {
      // 拆除時 _ecChiefArt 比 fireDefuse 先被呼叫(breakAt 還沒設)→ 下一個 tick 再看爆開時刻;爆開時怪正在後退(recoil),不再另起縮下動作蓋掉它
      later(X, scene, 0, () => later(X, scene, Math.max(0, (X.breakAt || 0) - (scene.time.now || 0)), () => {
        if (e._efx !== X || e.dead || X.hot !== false) return; if (e.sprite.texture.key === want) return;
        if (!((scene.time.now || 0) - (X.breakAt || -1e9) < 700)) motion(scene, e, MOVE.burnOut());
        later(X, scene, 160, () => { if (e._efx !== X || e.dead || X.hot !== false) return; swapArt(scene, e, X, want, 160); const f = readGame(e), a = anchor(f); for (let i = 0; i < 5; i++) puff(scene, a.x + rr(-0.18, 0.18) * (f.dispW || 120), a.headY + rr(-6, 10)); });
      }));
    }
    return true;
  }
  // 燃燒中每 520ms 冒一片火星(規格答案,補修 B11):fire_tail_1~3、30~48px、上升 40~80px、420~620ms;離開燃燒(X.hot 不是 true)、立繪不是燃燒版、怪死就停。
  //   掛在場景元件清單:結算/重來/換波(dropScene)、怪清理(drop)一起收;亂數用模組自己的 rnd。
  function burnSparks(scene, e, X) {
    if (X.spk && !X.spk.dead) return; const R = rt(scene), self = { t: 0, dead: false };
    self.update = dt => {
      if (e._efx !== X || e.dead || X.hot !== true || !e.sprite || !e.sprite.active) { self.kill(); return; }
      self.t += dt; if (self.t < 520) return; self.t -= 520; if (self.t > 520) self.t = 0;
      if (e.sprite.texture.key !== KING_HOT) return;
      const f = readGame(e), a = anchor(f); flick(scene, a.x + rr(-0.3, 0.3) * (f.dispW || 120), a.headY + rr(0, 40), rr(30, 48), DEP.burst, rr(40, 80), rr(420, 620));
    };
    self.kill = () => { if (self.dead) return; self.dead = true; R.parts.delete(self); if (X.spk === self) X.spk = null; };
    X.spk = self; R.parts.add(self);
  }
  function puff(scene, x, y) { const c = own(scene, scene.add.circle(x, y, rr(7, 11), CITY.fire.steam, 0.7).setDepth(DEP.steam)); tween(scene, { targets: c, y: y - rr(28, 50), x: x + rr(-8, 8), scale: 1.9, alpha: 0, duration: rr(600, 820), ease: 'Quad.easeOut', onComplete: () => c.destroy() }); }
  // 立繪交叉淡化:本體直接換成新圖(fitEnemySprite 釘腳底、同寬),上面疊一張舊圖跟著偏移層淡出
  function swapArt(scene, e, X, want, ms) {
    const sp = e.sprite, G = scene.enemyG; if (!sp || !sp.active || sp.texture.key === want || !has(scene, want)) return;
    let ov = null; const base = { x: sp.x, y: sp.y, sx: sp.scaleX, sy: sp.scaleY };
    if (G && G.exists && G.exists(sp)) { ov = scene.add.image(sp.x, sp.y, sp.texture.key, sp.frame.name).setOrigin(sp.originX, sp.originY).setScale(sp.scaleX, sp.scaleY).setFlip(sp.flipX, sp.flipY); G.add(ov); G.moveTo(ov, G.getIndex(sp) + 1); xfx(X, ov); }
    sp.setTexture(want); if (scene.fitEnemySprite) scene.fitEnemySprite(e); e.restY = sp.y;
    if (!ov) return;
    const R = rt(scene), self = { a: 1, dead: false };
    self.update = () => { if (!ov.scene || !sp.active) { self.kill(); return; } const f = (e._fxSt && e._fxSt.off) || {}; ov.setPosition(base.x + (f.dx || 0), base.y + (f.dy || 0)).setScale(base.sx * (f.sx || 1), base.sy * (f.sy || 1)).setAngle(f.ang || 0).setAlpha(self.a * sp.alpha); };
    self.kill = () => { if (self.dead) return; self.dead = true; R.parts.delete(self); scene.tweens.killTweensOf(self); try { if (ov.scene) ov.destroy(); } catch (er) { } };
    R.parts.add(self); self.update();
    tween(scene, { targets: self, a: 0, duration: ms || 240, ease: 'Sine.easeInOut', onComplete: () => self.kill() });
  }

  // ── 清理 ──
  // 清掉一隻怪的全部新演出物件(換波、死亡、出錯)。ms>0:火球淡出。內部全包 try,不會中斷換波或死亡流程(審查 B3)。
  // killing=true(killEnemy):佔位 _finOrb 還在時,照舊 _breakEnemyOrb 的「狀態」部分做(_clearEnemyOrb＋倒數重設),只是不演碎球、不浮「打斷!」
  //   → 開關開與關,死掉那隻的 e.timer 等欄位逐值相同(A/B 實測抓到的差異)。
  function drop(scene, e, ms, killing) {
    const X = e && e._efx; if (!X) return;
    try { (X.tms || []).forEach(t => { try { t.remove(false); } catch (er) { } }); X.tms = []; } catch (er) { }
    try { if (X.ball) { if (ms > 0) X.ball.fade(ms); else X.ball.kill(); } } catch (er) { } X.ball = null;
    try { if (X.ring) X.ring.kill(); } catch (er) { } X.ring = null;
    try { if (X.badge) X.badge.kill(); } catch (er) { } X.badge = null;
    try { if (X.spk) X.spk.kill(); } catch (er) { } X.spk = null;
    try { (X.fx || []).slice().forEach(o => { try { scene.tweens.killTweensOf(o); if (o.scene) o.destroy(); } catch (er) { } }); X.fx = []; } catch (er) { }   // slice:物件銷毀時會自己從 X.fx 移出(xfx),不能邊走邊刪
    try { if (e.glass && e.glass.scene && e.glass.alpha === 0 && !e.dead) e.glass.setAlpha(1); } catch (er) { }
    try {
      if (e._finOrb && e._finOrb.type === 'Zone') {
        if (killing && scene._clearEnemyOrb) { scene._clearEnemyOrb(e); e.timer = Math.max(1, e.interval || 3); }
        else { try { e._finOrb.destroy(); } catch (er) { } e._finOrb = null; }
      }
    } catch (er) { }
    e._efx = null;
  }
  // 場景層全部收掉:每隻怪的 drop＋已脫離怪身的球(飛行中/淡出中)、短效物件(R.fx)、暗幕、鏡頭(含回位中)、餘火、排程、輸入鎖。
  //   keepEmber(換波/再挑戰/離開再進):餘火圖不在這裡硬收——下一波初始化的 _ecBurnClear→_ecBurnBadge(0)→emberOff 會讓它縮掉(核心餘火不跨波)。
  //   keepLocks(出錯關步,補修 A2):輸入鎖不放,讓遊戲端排好的命中照原排程扣完、鎖各自到時才放。
  function dropScene(scene, keepEmber, keepLocks) {
    (scene.enemies || []).forEach(e => { try { drop(scene, e); } catch (er) { } });
    const R = scene._efxRt; if (!R || !R.alive || R.scene !== scene) return;
    try { R.tms.forEach(t => { try { t.remove(false); } catch (er) { } }); R.tms = []; } catch (er) { }
    if (!keepLocks) { try { R.locks.forEach(rel => { try { rel(); } catch (er) { } }); R.locks.clear(); } catch (er) { } }
    try { [...R.fx].forEach(o => { try { scene.tweens.killTweensOf(o); if (o.scene) o.destroy(); } catch (er) { } }); R.fx.clear(); } catch (er) { }
    try { if (R.dim) { scene.tweens.killTweensOf(R.dim); if (R.dim.scene) R.dim.destroy(); } } catch (er) { } R.dim = null;
    try { camReset(scene); } catch (er) { } R.cam = null;
    const em = keepEmber ? R.ember : null;
    try { [...R.parts].forEach(p => { if (p !== em) { try { p.kill(); } catch (er) { } } }); } catch (er) { }
    R.parts.clear(); if (em && !em.dead) R.parts.add(em); else R.ember = null;
    if (!keepLocks) { try { [...R.olds].forEach(k => { try { k(); } catch (er) { } }); } catch (er) { } }   // 火城 A1(2026-11-27):重來/換波/正式結算 → 已結清或已換局的舊普攻彈道收掉(還沒落下的 k() 自己不收)
    if (!keepLocks) { R.seqEnd = 0; R.oldLand = 0; }   // 火城 A2(2026-11-27):出錯關步(keepLocks)不清出手時間軸——這一批已排好的落點不變,之後才出手的照樣排在後面(lateSlot);時間軸是絕對時刻,走完自然失效
    R.burnHitAt = 0;
  }
  // 出錯關步時:全收,並把舊演出立刻補回(審查 B6:舊球、舊骷髏光暈、酋長立繪,不等下一次同步才出現)
  function dropAll(scene) {
    dropScene(scene, false, true);
    (scene.enemies || []).forEach(e => {
      if (!e || e.dead || e.hp <= 0 || !e._g) return;
      try { if (scene._ecOrbSync) scene._ecOrbSync(e); } catch (er) { }
      try { if (scene._ecGlass) scene._ecGlass(e, false); } catch (er) { }
      try { if (scene._ecChiefArt) scene._ecChiefArt(e, !!(e._g.skull && !e._g.defused)); } catch (er) { }
    });
    try { const n = scene._ecBurnLive ? scene._ecBurnLive() : 0; if (n > 0 && scene._ecBurnBadge) scene._ecBurnBadge(n); } catch (er) { }   // 餘火還在:舊徽章當場補回(補修二 5;新餘火圖剛被收掉)
  }
  // ── 敵方回合命中帳的配套(補修 A1;遊戲端 enemyAttack/_playerImpact 呼叫)──
  // 這個場景有火城新演出在跑(場上有掛 e._efx 的怪)→ 遊戲端這一擊要記帳(依呼叫順序登記,命中才扣,致死時當場結清)。
  function fireTurn(scene) { const R = scene._efxRt; return !!(R && R.alive && R.scene === scene && (scene.enemies || []).some(x => x && x._efx)); }
  // 舊普攻(非火城新出手:稀有怪、缺圖退回的哥布林等):只有「前面真的有新出手還在排」(R.seqEnd 只由新出手設定)時才延到那條時間軸結束;
  //   同一段被延後的舊普攻彼此共用同一個起點 → 與 f 一樣同時落下、按呼叫順序。前面沒有新出手 → 照原延遲、不加鎖、不動任何時刻(與 f 相同),
  //   只記下它的落下時刻 R.oldLand,讓之後才出手的新火球命中排在它後面。回傳演出延遲(補修二 2)。
  const OLD_TOTAL = 360 + 440 + 300, OLD_HIT = 360 + 440;
  function oldSlot(scene, dl) {
    const R = rt(scene), now = scene.time.now || 0, d = dl > 0 ? dl : 0, q = (R.seqEnd || 0) - now, start = q > d ? q : d;
    R.oldLand = Math.max(R.oldLand || 0, now + start + OLD_HIT);
    if (start > d) {   // 真的被延後:鎖到這一擊演完,彈著時刻併入 _ecImpactAt(餘火等)/_fxEndAt(字卡、過關)
      takeLock(scene, start + OLD_TOTAL);
      scene._ecImpactAt = Math.max(scene._ecImpactAt || 0, now + start + OLD_HIT + 120);
      scene._fxEndAt = Math.max(scene._fxEndAt || 0, now + start + OLD_TOTAL);
    }
    return start;
  }
  // 致死當場結清後:這一回合已全部落下 → 放掉出手時間軸的輸入鎖(之後是結算或復活詢問),時間軸歸零
  function settle(scene) {
    const R = scene._efxRt; if (!R || !R.alive || R.scene !== scene) return;
    try { R.locks.forEach(rel => { try { rel(); } catch (er) { } }); R.locks.clear(); } catch (er) { }
    R.seqEnd = 0; R.oldLand = 0;
  }
  // 當場結清的那一擊(補修二 1):標 mute,並立刻收掉它的彈體——排隊中(已脫離怪身、還沒起手)或飛行中的火球都收,不留到復活之後
  //   出手者不再等原本的重置時刻:倒數數字的「顯示 0」放掉、火球立刻重新長出(復活後畫面回到常駐狀態)。
  function mutePlan(scene, P) {
    if (!P) return; P.mute = true; try { if (P.ball && !P.ball.dead) P.ball.kill(); } catch (er) { }
    const e = P.e, X = P.X, now = scene.time.now || 0; if (!e || !X || e._efx !== X || e.dead || e.hp <= 0) return;
    if (X.holdUntil > now) X.holdUntil = now; X.waiting = false; if (e._tmHold != null) { e._tmHold = null; e._tmHoldUntil = now; }
    try { fireSync(scene, e, rt(scene).flags); } catch (er) { fail(rt(scene), er); }
  }
  // 火城 A2(2026-11-27):s2 已關(這一批出手中途出錯)但已排的新出手時間軸還沒走完 → 照 oldSlot 排到它後面;沒有時間軸(或已走完)回 null＝照關閉時的原延遲。只讀不建 runtime。
  function lateSlot(scene, dl) { const R = scene._efxRt; if (!R || !R.alive || R.scene !== scene || !((R.seqEnd || 0) > (scene.time.now || 0))) return null; return oldSlot(scene, dl); }
  // 火城 A1(2026-11-27):舊普攻已飛出的彈道登記到帳上 j.kill。kill() 回 false＝這筆還沒結清(不收、留著);收掉或落地(k.off)就撤銷登記。
  function oldFx(scene, j, kill) {
    const R = rt(scene), k = () => { let gone = true; try { gone = kill() !== false; } catch (er) { } if (gone) k.off(); };
    k.off = () => { R.olds.delete(k); if (j.kill === k) j.kill = null; };
    R.olds.add(k); j.kill = k; return k;
  }
  /*EFX-RT-END*/

  return {
    STEPS, allOff, parseFlags, anyOn, guard, ASSETS, assetsFor, preload,
    FIRE, fireMove, fireTop, fireCool, fireArt, fireRingSegs, lerpCol, ringCol, ringT, ringRadius,
    rt, rnd, cb, frameCtr, makeThreat, makeRing, makeLine, makeBadge, fireReady, ready, fireGeom, fireSync, fireMarker, fireLaunch, fireAttackVis, impactFx, atkPlan, fireTier, ATK,
    emberStart, emberTick, emberHit, emberOff, fireDefuse, fireHit, fireJolts, chiefShift, burnSparks, drop, dropScene, dropAll, fireTurn, oldSlot, settle, mutePlan, xfx, lateSlot, oldFx, OLD_TOTAL, OLD_HIT,
    CHIN, CHIN_DEF, CHIN_TOP, SIZE_OF, KING_SIZE, COL_W, COL_SZC, RING_RESERVE, ART_K, ART_FIT, CITY, RING_COL, BADGE, EMOTE, BUB,
    fullArtBaseH, fitMirror, headUp, anchor, readGame, chinId, chinIdFromArt, chinIdOf, chinOf, colW, nearestDist, ballMax, threatSize, artBox, charge, bubW, bubbleCtr,
  };
});
