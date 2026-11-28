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
    s3: [
      { key: 'fx_en_shield_rock', url: 'art/fx/fx_en_shield_rock.webp' },
      { key: 'fx_en_shield_rock_spike', url: 'art/fx/fx_en_shield_rock_spike.webp' },
      { key: 'fx_en_shield_break16', url: 'art/fx/fx_en_shield_break16.webp', frame: [384, 384] },
      { key: 'fx_en_rock_1', url: 'art/fx/fx_en_rock_1.webp' },
      { key: 'fx_en_rock_2', url: 'art/fx/fx_en_rock_2.webp' },
      { key: 'fx_en_rock_3', url: 'art/fx/fx_en_rock_3.webp' },
      { key: 'fx_en_rock_4', url: 'art/fx/fx_en_rock_4.webp' },
      { key: 'fx_en_earth_smash16', url: 'art/fx/fx_earth_smash16.webp', frame: [192, 192] },
      { key: 'fx_en_earth_rock_1', url: 'art/fx/fx_earth_rock_1.webp' },
      { key: 'fx_en_earth_rock_2', url: 'art/fx/fx_earth_rock_2.webp' },
      { key: 'fx_en_earth_rock_3', url: 'art/fx/fx_earth_rock_3.webp' },
    ], s4: [
      { key: 'fx_en_heal_orb8', url: 'art/fx/fx_en_heal_orb8.webp', frame: [256, 256] },
      { key: 'fx_en_heal_receive16', url: 'art/fx/fx_en_heal_receive16.webp', frame: [240, 240] },
      { key: 'fx_en_rescue_bubble8', url: 'art/fx/fx_en_rescue_bubble8.webp', frame: [224, 224] },
      { key: 'fx_en_water_bomb8', url: 'art/fx/fx_en_water_bomb8.webp', frame: [224, 224] },
      { key: 'fx_en_water_bomb_burst16', url: 'art/fx/fx_en_water_bomb_burst16.webp', frame: [384, 384] },
      { key: 'fx_en_water_cannon16', url: 'art/fx/fx_en_water_cannon16.webp', frame: [256, 256] },
      { key: 'fx_en_cast_circle8', url: 'art/fx/fx_en_cast_circle8.webp', frame: [168, 168] },
      { key: 'fx_en_steam_hiss8', url: 'art/fx/fx_en_steam_hiss8.webp', frame: [256, 256] },
      { key: 'fx_en_revive_splash16', url: 'art/fx/fx_en_revive_splash16.webp', frame: [352, 352] },
    ],
    s5: [
      { key: 'fx_en_thunder_orb8', url: 'art/fx/fx_en_thunder_orb8.webp', frame: [224, 224] },
      { key: 'fx_en_spark_short8', url: 'art/fx/fx_en_spark_short8.webp', frame: [112, 112] },
      { key: 'fx_en_thunder_strike16', url: 'art/fx/fx_en_thunder_strike16.webp', frame: [256, 256] },
    ], s6: [
      { key: 'fx_en_wind_orb8', url: 'art/fx/fx_en_wind_orb8.webp', frame: [256, 256] },
      { key: 'fx_en_wind_gust8', url: 'art/fx/fx_en_wind_gust8.webp', frame: [112, 112] },
      { key: 'fx_en_wind_slash16', url: 'art/fx/fx_en_wind_slash16.webp', frame: [256, 256] },
      { key: 'fx_en_wind_blade', url: 'art/fx/fx_en_wind_blade.webp' },
      { key: 'fx_en_wind_leaf_1', url: 'art/fx/fx_wind_leaf_1.webp' },
      { key: 'fx_en_wind_leaf_2', url: 'art/fx/fx_wind_leaf_2.webp' },
    ], s7: [
      { key: 'fx_en_emote_bubble', url: 'art/fx/fx_en_emote_bubble.webp' },
      { key: 'fx_en_emoteA_dizzy8', url: 'art/fx/fx_en_emoteA_dizzy8.webp', frame: [72, 72] },
      { key: 'fx_en_emoteA_cry8', url: 'art/fx/fx_en_emoteA_cry8.webp', frame: [72, 72] },
      { key: 'fx_en_emoteA_smug8', url: 'art/fx/fx_en_emoteA_smug8.webp', frame: [72, 72] },
      { key: 'fx_en_emoteA_whistle8', url: 'art/fx/fx_en_emoteA_whistle8.webp', frame: [72, 72] },
      { key: 'fx_en_emoteA_angry8', url: 'art/fx/fx_en_emoteA_angry8.webp', frame: [72, 72] },
      { key: 'fx_en_emoteA_heart8', url: 'art/fx/fx_en_emoteA_heart8.webp', frame: [72, 72] },
      { key: 'fx_en_emoteA_happy8', url: 'art/fx/fx_en_emoteA_happy8.webp', frame: [72, 72] },
      { key: 'fx_en_emoteA_bang8', url: 'art/fx/fx_en_emoteA_bang8.webp', frame: [72, 72] },
    ], s8: [
      { key: 'fx_en_aura_fire8', url: 'art/fx/fx_en_aura_fire8.webp', frame: [512, 512] },
      { key: 'fx_en_aura_wind8', url: 'art/fx/fx_en_aura_wind8.webp', frame: [512, 512] },
    ], s9: [],
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
  const RING_EDGE = 0x3a2418, RING_GAP = 0.26, RING_FRAME = 3, LOOP_FPS = 11, ADD = 1;   // ADD = Phaser.BlendModes.ADD
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
    scene.events.once('shutdown', () => { if ((R.water && R.water.size) || (R.wind && R.wind.size) || (R.windLocks && R.windLocks.size)) { try { dropScene(scene); } catch (err) {} } if (R.earth) for (const X of [...R.earth]) earthDrop(scene, X.e); if (R.thunder) for (const X of [...R.thunder]) thunderDrop(scene, X.e); if (R.wind) for (const X of [...R.wind]) windDrop(scene, X.e); windUnlock(scene); R.alive = false; scene.events.off('update', upd); R.parts.clear(); R.fx.clear(); R.tms = []; R.locks.clear(); R.olds.clear(); R.dim = null; R.cam = null; R.camBack = null; R.ember = null; });
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
  function takeLock(scene, ms, release, capture, planTimer) { if (!scene._atkLockOn || !(ms > 0)) return; const R = rt(scene), rel = scene._atkLockOn(ms); R.locks.add(rel); if (capture) capture(rel); const done = () => { if (R.locks.delete(rel)) { if (release) release(rel); else rel(); } }; if (planTimer) planTimer(done); else scene.time.delayedCall(ms, done); return rel; }
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
    const R = rt(scene), im = scene.add.image(o.x, o.y, o.key, 0);
    if (o.image) o.image(im);
    im.setDepth(o.depth || DEP.steam);
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
    if (o.register) o.register(self); else R.parts.add(self);
    self.update(0);
    return self;
  }
  function steam(scene, x, y, size, depth, earth) {
    if (!earth) return anim(scene, { key: KEY.steam, x, y, size, fps: 14, depth: depth || DEP.steam });
    if (has(scene, KEY.steam)) {
      return anim(scene, { key: KEY.steam, x, y, size, fps: 14, depth,
        image: im => earthOwn(scene, earth, im).setTint(CITY.earth.steam),
        register: part => earthPart(scene, earth, part) });
    }
    // Standalone earth does not preload the fire steam sheet.
    const k = EARTH.ring.steam;
    const puff = earthOwn(scene, earth, scene.add.graphics()).setPosition(x, y).setDepth(depth);
    puff.fillStyle(CITY.earth.steam, k.alpha);
    for (const [dx, dy, radius] of k.circles) puff.fillCircle(size * dx, size * dy, size * radius);
    earthTween(scene, earth, { targets: puff, y: y - size * k.rise, scale: k.scale, alpha: 0, duration: k.duration,
      ease: 'Quad.easeOut', onComplete: () => puff.destroy() });
  }
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
    const R = rt(scene), c = scene.add.container(0, 0), tws = [];
    if (o.hooks) o.hooks.own(c);
    else if (o.owner) thunderOwn(scene, o.owner, c);
    c.setDepth(o.depth || DEP.threat);
    const self = { c, size: o.size, goal: o.size, sx: o.grow ? 0 : 1, charge: 0, pulse: o.pulse || 1, phase: 0, t: rnd() * 1000, host: o.host, free: false, alive: true, dead: false, layers: [], art: null, szTw: null };
    const tw = cfg => { const t = o.hooks ? o.hooks.tween(cfg) : o.owner ? thunderTween(scene, o.owner, cfg) : tween(scene, cfg); tws.push(t); return t; };
    const layer = (key, a) => { const im = scene.add.image(0, 0, key, 0); if (o.hooks) o.hooks.own(im); else if (o.owner) thunderOwn(scene, o.owner, im); c.add(im); const L = { im, key, a, n: Math.max(1, scene.textures.get(key).frameTotal - 1), fct: frameCtr(scene, key), k: ART_K[key] || 1 }; self.layers.push(L); return L; };
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
      self.phase += dt / per * Math.PI * 2; self.t += dt * (o.owner ? 1 : lerp(1, 1.9, lv));
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
    if (o.hooks) o.hooks.part(self);
    else if (o.owner) thunderPart(scene, o.owner, self);
    else R.parts.add(self);
    if (o.grow) self.grow(); self.update(0);
    return self;
  }

  // 規格 3.2 靶環(視窗模式):程式畫奶油色粗弧＋深色細外框,不旋轉,呼吸 1800ms;n 段、段縫 0.26;準心十字;隨剩餘手數收緊變色。
  // o:{depth, color, width, segs, maxR:()=>px, follow:()=>{x,y,r}|null}
  function ringSpan(i, n) {
    const seg = Math.PI * 2 / n, gap = n > 1 ? RING_GAP : 0, start = -Math.PI / 2 + i * seg + gap / 2;
    return [start, start + seg - gap];
  }
  function ringStroke(g, x, y, r, start, end, width, color, alpha) {
    g.lineStyle(width, color, alpha); g.beginPath(); g.arc(x, y, r, start, end); g.strokePath();
  }
  function ringArc(g, x, y, r, start, end, width, color, alpha) {
    ringStroke(g, x, y, r, start, end, width + RING_FRAME, RING_EDGE, alpha);
    ringStroke(g, x, y, r, start, end, width, color, alpha);
  }
  function makeRing(scene, o) {
    if (o.progress) return makeProgressRing(scene, o);
    const R = rt(scene), g = scene.add.graphics().setDepth(o.depth || DEP.ring), depth = o.depth || DEP.ring;
    const self = { g, on: false, a: 0, alpha: 0, col: o.color || RING_COL, segs: o.segs || 1, left: o.segs || 1, width: o.width || 4, tk: { v: 0 }, top: 0, dead: false, pieces: [], tms: [] };
    const span = i => ringSpan(i, self.segs), arc = ringArc;
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

  function makeProgressRing(scene, o) {
    const K = EARTH.ring, { owner: X, shield, width, count, shieldRadius } = o;
    const g = earthOwn(scene, X, scene.add.graphics());
    const style = { fontFamily: K.font, color: K.textColor, stroke: K.textEdge, strokeThickness: K.textStroke };
    const label = earthOwn(scene, X, scene.add.text(0, 0, o.kind.toUpperCase(), { ...style, fontSize: K.labelSize })).setOrigin(.5);
    const number = earthOwn(scene, X, scene.add.text(0, 0, String(o.need), { ...style, fontSize: K.numberSize })).setOrigin(.5);
    label.alpha = number.alpha = 0;
    shield.add([g, label, number]);
    const base = shieldRadius + K.inset + width / 2;
    const state = { alpha: 0, progress: 0, from: 0, target: 0, chase: 0, age: 0, radius: base };
    let hidden = false;
    earthTween(scene, X, { targets: state, alpha: 1, duration: K.appear });
    return {
      update(dt, target) {
        if (hidden) return;
        const phase = quiet(scene) ? 0 : Math.sin((state.age += dt) / K.period * Math.PI * 2);
        const r = state.radius = base + K.breath * phase;
        if (state.target !== target) {
          state.from = state.progress; state.target = target; state.chase = 0;
        }
        state.chase = Math.min(K.chase, state.chase + dt);
        state.progress = lerp(state.from, state.target, state.chase / K.chase);
        const a = state.alpha * (K.breathBase + K.breathAlpha * phase);
        g.clear();
        for (let i = 0; i < count; i++) {
          const [start, end] = ringSpan(i, count), filled = clamp(state.progress * count - i, 0, 1);
          ringArc(g, 0, 0, r, start, end, width, RING_COL, a * K.baseAlpha);
          if (filled > 0) ringStroke(g, 0, 0, r, start, lerp(start, end, filled), width, K.bright, a);
        }
        label.alpha = number.alpha = a;
        if (label.width - K.textStroke <= 2 * r * K.textFit) {
          label.y = -r * K.textLift - number.height / 2;
          number.y = -r * K.textLift + label.height / 2;
        } else {
          label.y = r + (width + RING_FRAME) / 2 + label.height / 2;
          number.y = 0;
        }
      },
      drop() {
        if (hidden) return;
        hidden = true;
        for (const obj of [g, label, number]) obj.setVisible(false);
        const r = state.radius * shield.scaleX, w = width * shield.scaleX;
        const [start, end] = ringSpan(count - 1, count), mid = (start + end) / 2;
        const dx = Math.cos(mid) * r, dy = Math.sin(mid) * r;
        const x = shield.x + dx, y = shield.y + dy;
        const fragment = earthOwn(scene, X, scene.add.graphics()).setDepth(DEP.burst + K.dropDepth).setPosition(x, y);
        ringArc(fragment, -dx, -dy, r, start, end, w, K.bright, 1);
        earthTween(scene, X, { targets: fragment, x: x + dx * K.dropTravel, y: y + dy * K.dropTravel + K.dropFall,
          angle: (rnd() < .5 ? -1 : 1) * K.dropAngle, alpha: 0, duration: K.dropMs,
          ease: 'Quad.easeOut', onComplete: () => fragment.destroy() });
        steam(scene, x, y, Math.max(K.steamMin, r * K.dropTravel), DEP.burst + K.steamDepth, X);
      },
    };
  }

  // 規格 3.3 線:preview(流動虛線,線寬 4、虛 10/隙 8、60px/s、無箭頭)/wait(淡虛線,線寬 2、虛 5/隙 6、靜止、透明度 .5)/
  // zap(雷城電纜,細線 1.5＋光暈 3,11 折點每 125ms 重抽,jolt() 180ms 內每 45ms、振幅×3)/hold(土城守護,外 5 內 2、亮度脈動、3 顆珠)。
  // 火城不用線;這裡先把元件做好給土雷風(步 3/5/6)接。o:{style, color, from:()=>pt, to:()=>pt, depth, w, waitCol, waitA}
  const ZAP = { w: 1.5, glow: 3, core: 0xffe14a, halo: 0xe6c12f, haloA: 0.35, amp: 3, jolt: 3 };
  function makeLine(scene, o) {
    const R = rt(scene), g = scene.add.graphics();
    if (o.ownGraphics) o.ownGraphics(g);
    g.setDepth(o.depth || DEP.line);
    const self = { g, style: o.style || 'preview', col: o.color, t: 0, alpha: 0, dead: false, jolt: 0, zt: 0, zo: null, waitCol: o.waitCol, waitA: o.waitA };
    const animate = o.animate || (cfg => tween(scene, cfg));
    const fadeIn = animate({ targets: self, alpha: 1, duration: 220 });
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
    self.shock = () => { self.jolt = 180; if (o.animate) self.zo = null; };
    self.kill = () => { if (self.dead) return; self.dead = true; R.parts.delete(self); scene.tweens.killTweensOf(self); try { if (g.scene) g.destroy(); } catch (er) { } };
    self.destroy = ms => { if (self.dead) return; if (ms === 0) { self.kill(); return; } scene.tweens.killTweensOf(self); if (o.animate && o.stop) o.stop(fadeIn); animate({ targets: self, alpha: 0, duration: ms || 200, onComplete: () => self.kill() }); };
    R.parts.add(self);
    return self;
  }

  // 規格 3.4 倒數圖示(新模式):圖示 32px、數字 Russo One 26px #eaf3ff 描邊 #1a0d05 粗 6、x=16;數字變化 1.5→1(220ms Back.easeOut);
  // 待機彈跳:週期 n≤1 ? 260 : 700ms、b=|sin|、放大 1+(n≤1 ? .14 : .05)b、上移 (n≤1 ? 4 : 1.5)b(只動圖示)。開關出錯/怪換波時還原線上樣式。
  function makeBadge(scene, e, X, animate = cfg => tween(scene, cfg)) {
    const R = rt(scene), tx0 = e.turnTx, g0 = e.glass;
    const keep = tx0 && tx0.style ? { ff: tx0.style.fontFamily, fs: tx0.style.fontSize, sk: tx0.style.strokeThickness, fst: tx0.style.fontStyle, x: tx0.x } : null;
    const self = { t: 0, last: null, dead: false, styled: false };
    self.update = dt => {
      const g = e.glass, tx = e.turnTx; if (e.dead || !g || !g.scene || !tx || !tx.scene) return;
      if (!self.styled) { self.styled = true; tx.setFontFamily('"Russo One", sans-serif'); tx.setFontSize(BADGE.NUM_PX); tx.setFontStyle(''); tx.setStroke('#1a0d05', 6); }
      if (tx.x !== BADGE.NUM_X) tx.setX(BADGE.NUM_X);
      if (tx.style.color !== '#eaf3ff') tx.setColor('#eaf3ff');   // 規格 3.4 數字一律 #eaf3ff(線上舊版倒數 ≤2 會變黃/紅;規格與舊演出衝突照規格);開關出錯時 updateEnemies 會套回舊色
      if (self.last !== tx.text) { const was = self.last; self.last = tx.text; if (was != null) { scene.tweens.killTweensOf(tx); tx.setScale(1.5); animate({ targets: tx, scale: 1, duration: 220, ease: 'Back.easeOut' }); } }
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
  function skullSplit(scene, e, X, at, schedule = (ms, fn) => later(X, scene, ms, fn), animate = cfg => tween(scene, cfg)) {
    const g = e.glass, tg = e.turnG, key = e._glassKey; if (!g || !g.scene || !tg || !tg.scene || !/skull/.test(key || '') || !has(scene, key)) return;
    const x = tg.x + g.x, y = tg.y, fake = scene.add.image(x, y, key).setDepth(DEP.badge).setDisplaySize(BADGE.ICON, BADGE.ICON); xfx(X, fake);
    g.setAlpha(0); X.badgeHold = (scene.time.now || 0) + at + 560;
    schedule(at, () => {
      const w = fake.width, h = fake.height, sc = fake.scaleX; try { fake.destroy(); } catch (er) { }
      [-1, 1].forEach(s => {
        const im = scene.add.image(x, y, key).setDepth(DEP.badge).setScale(sc); im.setCrop(s < 0 ? 0 : w / 2, 0, w / 2, h); xfx(X, im);
        animate({ targets: im, x: x + s * 16, y: y + 30, angle: s * 40, alpha: 0, duration: 420, ease: 'Quad.easeIn', onComplete: () => im.destroy() });
      });
      schedule(240, () => {
        const gg = e.glass; if (!gg || !gg.scene || e.dead) return; scene.tweens.killTweensOf(gg); gg.setAngle(0); gg.y = 0; gg.setAlpha(1);
        const base = BADGE.ICON / (gg.width || BADGE.ICON); gg.setScale(0); animate({ targets: gg, scaleX: base, scaleY: base, duration: 260, ease: 'Back.easeOut' });
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
    if (flags && flags.s8 && X.ball) auraFireSync(scene, e, X, flags);
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
  // 土城的出手與火城共用 seqEnd / oldLand。命中記帳和傷害由 enemyAttack 負責。
  function earthTurn(scene) {
    return (scene.enemies || []).some(e => e && e._r && !e.dead) && earthReady(scene);
  }
  function earthLaunch(scene, e, ev, flags) {
    if (!e._r || !earthReady(scene) || scene._atkVoid()) return null;
    const k = EARTH.throw;
    const star = ev.rule, tier = star < 3 ? 1 : star - 1, P = atkPlan(tier);
    const R = rt(scene), X = earthState(scene, e, flags), now = scene.time.now || 0;
    const lift = star === 4 ? k.lift : 0;
    const impact = lift + P.I, total = lift + P.total;
    const start = Math.max(0, R.seqEnd - now, R.oldLand + k.afterOldHit - now - impact);
    const plan = { kind: 'earth', star, tier, P, impact, total, lift, e, hpT: true,
      ep: scene._atkLockEp || 0, owner: X, maxHP: scene.maxHP || 1 };
    aimAt(scene, e, plan);
    earthLock(scene, X, start + total);
    if (scene._tmHoldSet) scene._tmHoldSet(e, 0, start + total);
    R.seqEnd = now + start + total;
    scene._ecImpactAt = Math.max(scene._ecImpactAt || 0, now + start + impact + k.impactTail);
    scene._fxEndAt = Math.max(scene._fxEndAt || 0, R.seqEnd);
    return { efx: plan, delay: start, dmg: e.atk * (ev.mult > 1 ? ev.mult : 1), col: ev.guard ? k.guardColor : null };
  }
  function earthAttackVis(scene, e, plan) {
    if (plan.owner.dead || e.dead || plan.mute || (scene.resultOpen && scene._resultTerminal)) return;
    const k = EARTH.throw, X = plan.owner, P = plan.P, tier = plan.tier;
    const later = (delay, fn) => earthLater(scene, X, delay, () => {
      if (!plan.mute && !e.dead && plan.ep === (scene._atkLockEp || 0)) fn();
    });
    if (scene.labSnd) scene.labSnd('s_clear15', k.chargeSound);
    const a = anchor(readGame(e)), size = k.size[plan.star] * ((scene.enemies || []).length >= 3 ? k.crowdScale : 1);
    const rock = earthOwn(scene, X, scene.add.image(a.x, a.threatY, 'fx_en_rock_' + plan.star));
    rock.setDepth(DEP.hit + k.rockDepth).setDisplaySize(size, size);
    rock.earthFlight = 0;
    plan.ball = { dead: false, kill() {
      if (this.dead) return;
      this.dead = true;
      if (rock.scene) { scene.tweens.killTweensOf(rock); rock.destroy(); }
    } };
    if (plan.lift) {
      motion(scene, e, k.liftMotion);
      const scale = rock.scaleX;
      rock.setScale(scale * k.startScale);
      earthTween(scene, X, { targets: rock, scale, y: a.headY - k.liftAboveHead, duration: k.liftGrow, ease: 'Quad.easeOut' });
    }
    later(plan.lift, () => {
      if (tier >= 2 && !quiet(scene)) {
        const v = scene.cameras.main.worldView;
        const dim = earthOwn(scene, X, scene.add.rectangle(v.centerX, v.centerY, v.width * k.dimScale + k.dimMargin, v.height * k.dimScale + k.dimMargin, k.dimColor));
        dim.setDepth(DEP.dim).setAlpha(0);
        earthTween(scene, X, { targets: dim, alpha: tier === 3 ? k.kingDim : k.bigDim, duration: k.dimIn, ease: 'Sine.easeInOut' });
        earthTween(scene, X, { targets: dim, alpha: 0, delay: P.I + k.dimPause, duration: k.dimOut, ease: 'Sine.easeInOut', onComplete: () => dim.destroy() });
      }
      if (tier === 3 && !quiet(scene)) {
        const R = rt(scene);
        const camera = { update() {}, kill() {
          R.parts.delete(camera);
          if (R.earthCamera === camera) R.earthCamera = null;
          if (camera.saved && (R.cam === camera.saved || R.camBack === camera.saved)) camReset(scene);
        } };
        earthPart(scene, X, camera); R.earthCamera = camera;
        try { camIn(scene, a.x, e.cy + k.camY, k.camIn); } finally { camera.saved = R.cam; }
        earthLater(scene, X, P.I + k.camPause, () => {
          if (camera.saved && R.cam === camera.saved) camOut(scene, k.camOut, (delay, fn) => earthLater(scene, X, delay, fn));
        });
        earthLater(scene, X, P.I + k.camCleanup, () => camera.kill());
      }
    });
    later(plan.lift + P.lean, () => motion(scene, e, MOVE.strike(tier)));
    later(plan.lift + P.L, () => {
      if (!rock.scene) return;
      if (scene.labSnd) scene.labSnd(['s_fire1', 's_fire2', 's_fire3'][Math.floor(scene.time.now || 0) % 3], k.launchSound);
      aimAt(scene, e, plan);
      const x = rock.x, y = rock.y;
      earthTween(scene, X, { targets: rock, earthFlight: { from: 0, to: 1 }, duration: P.fly,
        onUpdate: () => {
          const u = rock.earthFlight, v = u * u;
          rock.setPosition(lerp(x, plan.tx, v), lerp(y, plan.ty, v) - k.arcHeight * Math.sin(Math.PI * v));
          if (plan.star === 3) rock.setAngle(P.fly * u * k.spin);
        }, onComplete: () => plan.ball.kill() });
    });
  }
  function earthCrack(scene, X, x, y) {
    const k = EARTH.crack;
    const g = earthOwn(scene, X, scene.add.graphics());
    g.setDepth(DEP.hit).setPosition(x, y);
    for (let n = 0; n < k.rays; n++) {
      const a = n * Math.PI / 3 + rr(...k.angle), len = rr(...k.length), mid = a + rr(...k.bend);
      const mx = Math.cos(mid) * len * k.midpoint, my = Math.sin(mid) * len * k.midpoint;
      for (const [width, col] of k.strokes) {
        g.lineStyle(width, col, 1).beginPath().moveTo(0, 0).lineTo(mx, my)
          .lineTo(Math.cos(a) * len, Math.sin(a) * len).strokePath();
      }
    }
    earthTween(scene, X, { targets: g, alpha: 0, delay: k.hold, duration: k.fade, onComplete: () => g.destroy() });
  }
  function earthImpact(scene, tx, ty, dmg, dodged, plan) {
    if (plan.mute || (scene.resultOpen && scene._resultTerminal)) return true;
    const k = EARTH.impact, X = plan.owner, tier = plan.tier, star = plan.star;
    if (X.dead || !earthReady(scene)) return false;
    if (!dodged) {
      if (scene.labSnd) scene.labSnd('s_player', k.volume);
      const big = clamp(dmg / Math.max(1, plan.maxHP * k.hpScale), k.minPower, 1), size = k.minSize + k.sizeGain * big;
      const gl = earthOwn(scene, X, scene.add.circle(tx, ty - k.above, size * k.glowRadius, CITY.earth.col, k.glowAlpha));
      gl.setDepth(DEP.hit).setBlendMode(ADD);
      earthTween(scene, X, { targets: gl, scale: k.glowScale, alpha: 0, duration: k.glowMs, onComplete: () => gl.destroy() });
      const hit = earthOwn(scene, X, scene.add.image(tx, ty - k.above, 'fx_en_earth_smash16', 0));
      hit.setDepth(DEP.hit + k.smashDepth).setDisplaySize(size, size);
      hit.animFrame = 0;
      earthTween(scene, X, { targets: hit, animFrame: { from: 0, to: k.frames }, duration: k.frames * 1000 / k.fps,
        onUpdate: () => hit.setFrame(Math.min(k.frames - 1, Math.floor(hit.animFrame))), onComplete: () => hit.destroy() });
      for (let n = 0; n < EARTH.throw.chips[star]; n++) {
        const ang = n * Math.PI * 2 / EARTH.throw.chips[star] + rr(...k.chipJitter), rad = rr(...k.chipDistance);
        const s = rr(...k.chipSize) * EARTH.throw.chipScale[star];
        const chip = earthOwn(scene, X, scene.add.image(tx, ty, 'fx_en_earth_rock_' + (1 + n % 3)));
        chip.setDisplaySize(s, s).setDepth(DEP.hit + k.chipDepth);
        earthTween(scene, X, { targets: chip, x: tx + Math.cos(ang) * rad, y: ty + Math.sin(ang) * rad,
          angle: rr(...k.chipAngle), alpha: 0, duration: rr(...k.chipMs), ease: 'Quad.easeOut', onComplete: () => chip.destroy() });
      }
      if (star === 4) earthCrack(scene, X, tx, ty);
    }
    shake(scene, k.shake + k.shakeGain * tier, k.shakeMs + k.shakeMsGain * tier);
    return true;
  }
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
    if (R.flags && R.flags.s8) auraFireAttack(scene, e, R.flags, ev, now + start + P.I);
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
  function camOut(scene, ms, schedule = (delay, fn) => rlater(scene, delay, fn)) { const R = rt(scene), cam = scene.cameras.main, c = R.cam; if (!c || !cam) return; R.cam = null; if (cine(scene)) return; R.camBack = c; cam.zoomTo(c.z, ms, 'Sine.easeInOut', true); cam.pan(c.x, c.y, ms, 'Sine.easeInOut', true); schedule(ms + 20, () => { if (R.camBack === c) R.camBack = null; }); }
  function camReset(scene) { const R = rt(scene), cam = scene.cameras.main, c = R.cam || R.camBack; R.cam = null; R.camBack = null; if (!c || !cam) return; if (cine(scene)) return; try { cam.panEffect.reset(); cam.zoomEffect.reset(); } catch (er) { } cam.setZoom(c.z); cam.centerOn(c.x, c.y); }
  // 命中我方(規格 3.9 impactFx):由 _playerImpact 鉤子呼叫,取代舊的白色閃光圈/衝擊環/屬色火花。
  //   命中圖 fire_burst16(30fps,120+110×big)＋#ff6a2a 柔光(.25,360ms 擴大)＋碎片火花 10+8×tier(半徑 40+30×big)＋震屏 (2+3×tier)px/(140+60×tier)ms。
  //   big＝clamp(這一擊傷害 ÷ (我方血量上限 × 0.56), .15, 1)(規格答案,補修 B10)。
  //   kind 'burn'(餘火每塊):8 顆碎片火花(半徑 26)＋餘火圖縮回(S-F4)。
  function impactFx(scene, tx, ty, dmg, dodged, efx) {
    if (efx && efx.kind === 'water') return waterImpact(scene, tx, ty, dmg, dodged, efx);
    if (efx && efx.kind === 'thunderShock') return thunderShockImpact(scene, tx, ty, efx);
    if (efx && efx.kind === 'earth') return earthImpact(scene, tx, ty, dmg, dodged, efx);
    if (efx && efx.kind === 'thunder') return thunderImpact(scene, tx, ty, dmg, dodged, efx);
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
      if (flags && flags.s8 && e._efx === X && e._g && e._g.defused) auraSet(scene, e, 'fire', -1, flags);
      sparks(scene, px, py, 6, 0.9 * d, DEP.burst + 0.2, CITY.fire.shard);
      shake(scene, 3, 140);
      motion(scene, e, MOVE.recoil());
      const f = readGame(e), a = anchor(f), sw = Math.max(40, (f.dispW || e.cardW || 120) * 0.38);
      const st = steam(scene, a.x, a.headY - sw * 0.25, sw, DEP.steam); if (st) xfx(X, st.im);
      if (scene.labSnd) scene.labSnd('s_block', 0.5);
    });
    if (flags && flags.s8 && e._g.rule === AURA.king) auraFireLayer(scene, e, false, flags, X.breakAt - now);
    later(X, scene, 625, () => { if (e._efx === X) fireSync(scene, e, flags); });
    if (flags && flags.s7) emoteSchedule(scene, e, X, 'fire', fn => {
      later(X, scene, EMOTEFX.fireAt, fn);
      return X.tms[X.tms.length - 1];
    }, () => fireBang(scene, e, X, 'dizzy', true));
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
    if (flags && flags.s8) auraSet(scene, e, 'fire', () => auraFireCoolLevel(stage), flags);
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
      if (scene._efxRt.flags && scene._efxRt.flags.s8) auraFireLayer(scene, e, true, scene._efxRt.flags, at);
      later(X, scene, at, () => {
        if (e._efx !== X || e.dead || X.hot !== true) return; if (e.sprite.texture.key === want) { burnSparks(scene, e, X); return; }
        motion(scene, e, MOVE.burnIn());
        later(X, scene, 286, () => { if (e._efx !== X || e.dead || X.hot !== true) return; swapArt(scene, e, X, want, 240); const f = readGame(e), a = anchor(f); for (let i = 0; i < 4; i++) flick(scene, a.x + rr(-0.3, 0.3) * (f.dispW || 120), a.headY + rr(0, 40), rr(30, 48), DEP.burst, rr(40, 80), rr(420, 620)); if (scene.labSnd) scene.labSnd('s_fire2', 0.45); burnSparks(scene, e, X); });
      });
    } else {
      if (scene._efxRt.flags && scene._efxRt.flags.s8 && !e._g.defused) auraFireLayer(scene, e, false, scene._efxRt.flags);
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
    if (e && e._waterFx) waterDrop(scene, e);
    if (e && e._earthFx) earthDrop(scene, e);
    if (e && e._thunderFx) thunderDrop(scene, e);
    if (e && e._windFx) windDrop(scene, e);
    fireDrop(scene, e, ms, killing);
  }
  function fireDrop(scene, e, ms, killing) {
    if (e && e._efxEmote) emoteDrop(scene, e, 'fire');
    if (e && e._efxAura && e._efxAura.city === 'fire') auraDrop(scene, e);
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
    if (scene._efxRt && scene._efxRt.emote) emoteDropScene(scene, keepLocks ? 'fire' : null);
    if (scene._efxRt && scene._efxRt.aura) auraDropScene(scene, keepLocks ? 'fire' : null);
    waterDropScene(scene, keepEmber && !keepLocks);
    const wind = scene._efxRt && scene._efxRt.wind;
    if (wind) for (const X of [...wind]) windDrop(scene, X.e);
    windUnlock(scene);
    const thunder = scene._efxRt && scene._efxRt.thunder;
    if (thunder) for (const X of [...thunder]) thunderDrop(scene, X.e);
    const earth = scene._efxRt && scene._efxRt.earth;
    if (earth) for (const X of [...earth]) earthDrop(scene, X.e);
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
    if (!keepLocks && R.waterEndAt) { R.waterEndAt = 0; R.waterFailedUntil = 0; }
    if (!keepLocks && R.windEndAt) { R.windEndAt = 0; R.windFailedUntil = 0; }
  }
  // 出錯關步時:全收,並把舊演出立刻補回(審查 B6:舊球、舊骷髏光暈、酋長立繪,不等下一次同步才出現)
  function dropAll(scene) {
    if (scene._efxRt && scene._efxRt.emote) emoteDropScene(scene, 'fire');
    if (scene._efxRt && scene._efxRt.aura) auraDropScene(scene, 'fire');
    const R = scene._efxRt;
    if (!R || !((R.earth && R.earth.size) || (R.thunder && R.thunder.size) || (R.wind && R.wind.size) || (R.windLocks && R.windLocks.size) || (R.water && R.water.size))) {
      dropScene(scene, false, true);
    } else {
      // Keep the shared attack timeline and locks, and remove just fire-owned resources.
      const earthParts = new Set(), earthObjects = new Set(), earthTimers = new Set();
      for (const X of [...(R.earth || []), ...(R.thunder || []), ...(R.wind || [])]) {
        for (const p of X.parts) earthParts.add(p);
        for (const o of X.objects) earthObjects.add(o);
        for (const t of X.tms) earthTimers.add(t);
      }
      for (const X of R.water || []) for (const J of X.jobs) for (const p of J.parts) earthParts.add(p);
      for (const e of scene.enemies || []) if (!e || !e._earthFx) { try { fireDrop(scene, e); } catch (er) { } }
      R.tms = R.tms.filter(t => {
        if (earthTimers.has(t)) return true;
        try { t.remove(false); } catch (er) { }
        return false;
      });
      for (const o of [...R.fx]) if (!earthObjects.has(o)) {
        R.fx.delete(o);
        try { scene.tweens.killTweensOf(o); if (o.scene) o.destroy(); } catch (er) { }
      }
      try { if (R.dim) { scene.tweens.killTweensOf(R.dim); if (R.dim.scene) R.dim.destroy(); } } catch (er) { }
      R.dim = null;
      const earthCam = R.earthCamera && R.earthCamera.saved;
      const thunderCam = R.thunderCamera && R.thunderCamera.saved;
      const waterCam = R.waterCamera;
      if ((!waterCam || (R.cam !== waterCam && R.camBack !== waterCam)) && (!earthCam || (R.cam !== earthCam && R.camBack !== earthCam)) &&
          (!thunderCam || (R.cam !== thunderCam && R.camBack !== thunderCam))) { try { camReset(scene); } catch (er) { } }
      for (const p of [...R.parts]) if (!earthParts.has(p)) {
        R.parts.delete(p);
        try { p.kill(); } catch (er) { }
      }
      R.ember = null;
      R.burnHitAt = 0;
    }
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
    windUnlock(scene);
    try { R.locks.forEach(rel => { try { rel(); } catch (er) { } }); R.locks.clear(); } catch (er) { }
    R.seqEnd = 0; R.oldLand = 0;
  }
  // 當場結清的那一擊(補修二 1):標 mute,並立刻收掉它的彈體——排隊中(已脫離怪身、還沒起手)或飛行中的火球都收,不留到復活之後
  //   出手者不再等原本的重置時刻:倒數數字的「顯示 0」放掉、火球立刻重新長出(復活後畫面回到常駐狀態)。
  function mutePlan(scene, P) {
    if (P && P.kind === 'water') { P.mute = true; waterMutePlan(scene, P); return; }
    if (P && P.kind === 'thunder') { P.mute = true; thunderMutePlan(scene, P); return; }
    if (P && P.kind === 'wind') { P.mute = true; windMutePlan(scene, P); return; }
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
  const EARTH = {
    SPIKE_DRAW: true, spike: 8.5, breath: 12, push: 13.5, root: 9,
    oldSpike: 5.5, oldBreath: 8, oldPush: 9.5, period: 1300,
    edge: 0x3a2418, gold: 0xf2c662, bright: 0xffd24a, gap: 2,
    shieldScale: [.46, .5, .53, .55], hitReset: 700, gather: 420,
    activeBreakMarker: false, resetGather: true, guardColor: 0xe0c49a,
    ring: {
      width: 3, starWidth: .75, inset: -2, breath: 1.5, period: 900, breathBase: .9, breathAlpha: .1,
      baseAlpha: .6, bright: 0xffd23a, chase: 120, appear: 260,
      font: '"Russo One", sans-serif', labelSize: '16px', numberSize: '28px',
      textColor: '#fff4dc', textEdge: '#2a1208', textStroke: 5, textFit: .84, textLift: .06,
      dropTravel: .7, dropFall: 10, dropAngle: 25, dropMs: 380, dropDepth: .2,
      steamMin: 36, steamDepth: .3,
      steam: { circles: [[-.19, .04, .20], [.12, 0, .24], [0, -.15, .21]], alpha: .32, rise: .4, scale: 2, duration: 500 },
    },
    geom: { colInset: 18, eyeLine: .17, eyeInset: .8, aboveGround: .3 },
    spikeBase: .48, spikeEdgeWidth: 1, spikeGrowDelay: 80, spikeGrowMs: 260,
    throw: {
      size: [0, 30, 46, 50, 76], chips: [0, 0, 5, 6, 8], chipScale: [0, 0, 1, 1.1, 1.3],
      chargeSound: .6, launchSound: .6, lift: 580, spin: 900 / 1300, afterOldHit: 60, impactTail: 120, guardColor: 0xff3a2a,
      crowdScale: .85, rockDepth: .1, startScale: .12, liftAboveHead: 34, liftGrow: 320, arcHeight: 30,
      liftMotion: [[320, 0, -8, 0, 1.06, 1.06, 'qo'], [580, 0, -8, 0, 1.06, 1.06], [650, 0, 0, 0, 1, 1, 'si']],
      dimScale: 3, dimMargin: 400, dimColor: 0x000000, kingDim: .26, bigDim: .2, dimIn: 360, dimPause: 200, dimOut: 420,
      camY: 60, camIn: 300, camPause: 180, camOut: 380, camCleanup: 610,
    },
    crack: { rays: 6, angle: [-.16, .16], bend: [-.24, .24], length: [26, 48], midpoint: .55,
      strokes: [[4.5, 0x2a1a10], [1.6, 0x8a6038]], hold: 600, fade: 500 },
    impact: {
      volume: .8, hpScale: .56, minPower: .15, minSize: 120, sizeGain: 110, above: 10,
      glowRadius: .22, glowAlpha: .25, glowScale: 2.6, glowMs: 360, smashDepth: .1, frames: 16, fps: 30,
      chipJitter: [-.2, .2], chipDistance: [30, 54], chipSize: [13, 17], chipDepth: .2, chipAngle: [-150, 150], chipMs: [300, 370],
      shake: 2, shakeGain: 3, shakeMs: 140, shakeMsGain: 60,
    },
    spark: { jitter: [-.2, .2], distance: [.6, 1], size: [4, 7], brown: 0x98643d, angle: [-100, 100], duration: [320, 460] },
    ripple: { duration: 250, radius: .45, glow: 0xffc850, alpha: .46, peak: .24, end: .60, fade: .36,
      echo: .18, width: 2, widthGain: 2.5, startRadius: .12 },
    block: {
      sound: .45, recoilSound: .45, recoilLock: 1000, lock: 300, pressScale: .86, pressY: 5, pressMs: 90, smallStones: 6, stones: 8,
      stoneSize: [13, 17], stoneX: [18, 50], stoneY: [-25, 15], stoneAngle: [30, 130], stoneMs: [300, 370],
      chipSize: 8, chipTravel: 150, chipFade: 120, recoilSparks: 8, recoilRadius: 30, absorbMs: 240, absorbRadius: .49,
      absorbDark: 0xc87a34, absorbMid: 0xffa526, absorbPivot: .62, absorbEnd: .38,
      absorbWidths: [3, 13], absorbAlphas: [.58, .95], pushMs: 150,
      thrustDelay: 130, thrustScale: 1.16, thrustY: 12, thrustMs: 110, returnMs: 300, returnDelay: 80,
      motion: [[110, 0, 9, 0, 1.06, 1.06, 'qo'], [220, 0, 0, 0, 1, 1, 'si']],
    },
    bolt: { radius: 6.5, halo: 0xffa020, outerAlpha: .28, outerRadius: 18, innerAlpha: .75, innerRadius: 10,
      flight: 380, arc: 280, fade: 120 },
    break: { blockSound: .6, boomSound: .45, hitDelay: 220, comboDelay: 160, freeze: 110, size: 1.7, frames: 16, duration: 500,
      sparks: 6, sparkRadius: .9, spikeTravel: 22, spikeFall: 15, spikeTurn: 95, spikeMs: 340, shake: 3, shakeMs: 140,
      motion: [[100, -7, -6, -4, .98, .98, 'qo'], [400, 0, 2, 0, 1, .96, 'si']] },
    rebuild: { sound: .45, resetScale: .94, startScale: .82, alpha: .35, gatherScale: .9, disperseScale: .72, disperseMs: 100,
      mergeStones: 4, gatherStones: 5, mergeInterval: 25, gatherInterval: 50, stoneX: [-40, 40], stoneSize: [14, 20],
      stoneEndScale: .25, mergeTravel: 145, gatherTravel: [320, 420], mergeDelay: 220, mergeScale: 1.16, mergeMs: 300,
      shake: 1.5, shakeMs: 90, sparkY: .4, sparks: 6, sparkRadius: 26, mechCheck: 300,
      motion: [[1, 0, 2, 0, 1, .96, 'l'], [300, 0, 0, 0, 1, 1, 'bo']] },
    number: { small: '19px', large: '38px', color: '#abb0b5', edge: '#35312e', stroke: 3 },
    recoil: { sparks: 8, sparkRadius: 26, shake: 1.5, shakeMs: 90, cards: 5, bump: 5, bumpMs: 220 },
    hold: { alpha: .45, hitAlpha: .8, hitMs: 300, extend: 200, retireDelay: 150, retireMs: 170, sparks: 7, sparkRadius: 24,
      retireScale: 1.2, ghostFade: 160, ghostSize: .7, ghostStartScale: .5, initialDelay: 300,
      tint: 0xffdca0, tintBase: .3, tintSwing: .25, tintRate: 300 },
    badge: { oldSkull: 26, oldGlass: 22 },
    rippleColor: 0xffd84a, warmBase: 0xfff4dc,
  };
  const THUNDER = {
    orb: { art: 'fx_en_thunder_orb8', size: .5, perCell: .17, charge: .4, urgent: .85, grow: 420, fade: 220, shrink: .45, sound: .35 },
    short: { pearl: 6, bangAt: 120, travel: 300, recoilAt: 520, shrinkMs: 200, spark: 'fx_en_spark_short8', sparkSize: 56, frames: 8, fps: 20, fadeStart: .6,
      shards: 14, headSparks: 6, shardRad: 48, headRad: 28, shardMs: [420, 560], glow: .5,
      smoke: 0x5a5a64, smokeCount: 4, smokeEvery: 150, smokeAlpha: .5, smokeScale: .34, smokeRadius: 23, smokeRise: 38, smokeMs: 380 },
    attack: { weak: 1, punish: 2, boss: 3, size: .42, arc: 30, afterOld: 60, impactTail: 120,
      singleWait: 60, orbWait: 420, hardenCell: 80, hardenTail: 900, volume: .6, punishSound: .5, launchSound: .6, dischargeBase: .3, dischargeStep: .1, dim: [.20, .26], dimColor: 0x000000,
      dimIn: 360, dimHold: 600, dimOut: 420, dimScale: 3, dimMargin: 400, camIn: 300, camHold: 1100, camOut: 380, camY: 60, camTail: 20 },
    strike: { art: 'fx_en_thunder_strike16', size: 120, sizeGain: 110, frames: 16, fps: 30, dy: 10, hpScale: .56, minPower: .15,
      sparks: 10, sparksGain: 8, radius: 40, radiusGain: 30, shake: 2, shakeGain: 3, shakeMs: 140, shakeMsGain: 60,
      glowAlpha: .25, glowRadius: .22, glowMs: 360, glowScale: 2.6, sfx: .8 },
    particles: { jitter: .3, minTravel: .6, size: [5, 9], angle: 90, spin: 120, scale: .5, ms: [320, 460] },
    // 清鐵塊 lockOne／lockMore 320／900ms，放一塊電擊 LOCK_SHOCK_1／LOCK_SHOCK_N 450／520ms，設 0 即不鎖。
    LOCK_SHOCK_1: 450,
    LOCK_SHOCK_N: 520,
    shock: {
      minRule: 3, thick: 2, swell: [1.1, 1.2], pulse: 95, gather: 190, arcCount: 3, arcRate: 3,
      gatherCount: 5, gatherRadius: [30, 42], gatherSize: [2, 4],
      chargeColors: [0xfff0a0, 0xe6c12f], merge: 70, hold: 60, mergeWidth: 2,
      travel: 110, lineWidth: 2.8, haloWidth: 2.2, outer: 0xc8a020,
      segment: 26, offset: 8, afterLine: 40, afterHalfWidth: 13,
      hitCount: 8, hitRadius: 26, hitSize: [3, 6], hitFade: 220,
      shakePx: 1.5, shakeMs: 90, textDy: 24, textPx: 24, textColor: '#ffe14a',
      hpJoltDx: 4, hpJoltMs: 45, hpJoltRepeat: 3, soundVolume: 0.35, hitSound: .8,
    },
    badge: { oldSize: 22, oldSkull: 26, aura: { rule: 1, skull: true } },
    ARC_DRAW: true, KEEP_OLD_HARDEN_RING: true,
    size: 37, cableDepth: 40.5, tileDepth: 40.55, arcDepth: 40.6, ironDepth: 41.1,
    cableDelay: 200, cableExtend: 170, cableFade: 160, footLift: 4, waitColor: 0xd8a818, waitAlpha: .8,
    layerMark: { color: 0xf3e4c4, width: .16, height: 3, gap: 2, top: 4 },
    place: { power: .9, delay: 120, gap: 130, flight: 360, arc: 90, turn: -120,
      startScale: .55, landScale: 1.18, landMs: 140, sink: 4, bounceMs: 220,
      dustCount: 4, dustColor: 0x9a9488, dustY: 14, dustMs: 280, dustRadius: [3, 5],
      dustAlpha: .54, dustGap: 7, dustSpread: 6, dustRise: 5, dustScale: 2, castVolume: .5, landVolume: .4, forgeVolume: .4 },
    ironColors: [0x7d8a9e, 0x454f5f, 0x9aa8bd],
    ironSparks: { size: [2, 5], jitter: .3, angle: 80, ms: 220 },
    arc: { points: 5, radius: 15.5, length: 14, jitter: 2.5, fps: 11, timer1: 1.9, timer2: 1.4 },
    clear: { stripCount: 8, breakCount: 16, stripDistance: 24, breakDistance: 40,
      stripScale: .9, breakScale: .3, stripMs: 180, breakMs: 220, turn: 30, color: 0x2f3744,
      bangDelay: 120, lockOne: 320, lockMore: 900, volume: .55, stripBlock: .65, stripBoom: .3, breakBlock: .7, breakBoom: .5 },
    harden: { gap: 80, beadGap: 90, beadCount: 3, beadRadius: 4.5, beadColor: 0xffe14a, beadMs: 420,
      showDelay: 620, scale: 1.2, ms: 200, sparks: 6, distance: 24, lock: 900, volume: .4,
      ringColor: 0xffe9a0, ringWidth: 5, ringAlpha: .95, ringScale: 1.45, ringMs: 420, ringGap: 110, ringDepth: 67 },
    shake: { px: 1.5, ms: 90 },
  };
  function earthReady(scene) { return ASSETS.s3.every(a => has(scene, a.key)); }
  function earthGeom(scene, e) {
    const k = EARTH.geom, f = readGame(e), a = anchor(f), star = e._r ? e._r.rule : clamp(e.star || 1, 1, 4);
    const others = (scene.enemies || []).filter(x => x && x !== e && x.card);
    const cw = colW(others.length + 1, f.szc, nearestDist(f.x, others.map(x => x.card.x)));
    const ground = a.ground == null ? f.imgY + f.dispH * (1 - f.oy) : a.ground;
    const w = Math.max(1, Math.min(cw - k.colInset, f.dispW * EARTH.shieldScale[star - 1], (ground - a.headY - f.dispH * k.eyeLine) / k.eyeInset));
    return { x: f.x, y: ground - w * k.aboveGround, w, star };
  }
  function earthState(scene, e, flags) {
    if (e._earthFx) return e._earthFx;
    const X = { e, flags, objects: new Set(), parts: new Set(), twists: new Set(), tms: new Set(), locks: new Set() };
    e._earthFx = X;
    const R = rt(scene);
    if (!R.earth) R.earth = new Set();
    R.earth.add(X);
    return X;
  }
  function earthGuard(scene, X, fn) {
    if (X.dead) return false;
    if (!X.flags.s3) { earthDrop(scene, X.e); return false; }
    return guard(X.flags, 's3', fn, false, () => earthFail(scene));
  }
  function earthPart(scene, X, part) {
    const update = part.update, kill = part.kill;
    part.update = dt => earthGuard(scene, X, () => update.call(part, dt));
    part.kill = () => { X.parts.delete(part); kill.call(part); };
    X.parts.add(part); rt(scene).parts.add(part);
    return part;
  }
  function earthOwn(scene, X, obj) {
    own(scene, obj); X.objects.add(obj);
    obj.once('destroy', () => X.objects.delete(obj));
    return obj;
  }
  function earthLater(scene, X, ms, fn) {
    const t = rlater(scene, ms, () => { X.tms.delete(t); earthGuard(scene, X, fn); });
    X.tms.add(t); return t;
  }
  function earthTween(scene, X, cfg) {
    const done = cfg.onComplete, upd = cfg.onUpdate;
    if (upd) cfg.onUpdate = (...args) => earthGuard(scene, X, () => upd(...args));
    cfg.onComplete = (...args) => { X.twists.delete(t); if (done) earthGuard(scene, X, () => done(...args)); };
    const t = tween(scene, cfg); X.twists.add(t); return t;
  }
  function earthLock(scene, X, ms) {
    const rel = takeLock(scene, ms, unlock => {
      try { unlock(); } catch (err) { earthGuard(scene, X, () => { throw err; }); }
    });
    if (rel) { X.locks.add(rel); earthLater(scene, X, ms, () => X.locks.delete(rel)); }
  }
  function earthRestore(scene, e, X = e && e._earthFx) {
    if (!X || !X.stance) return;
    if (X.stance === e._fxSt) scene._fxStateCut(e);
    X.stance = null;
    if (X.stanceWatch) { X.stanceWatch.kill(); X.stanceWatch = null; }
  }
  function earthDrop(scene, e) {
    if (e && e._efxEmote) emoteDrop(scene, e, 'earth');
    if (e && e._efxAura && e._efxAura.city === 'earth') auraDrop(scene, e);
    const X = e && e._earthFx; if (!X) return;
    const R = scene._efxRt;
    X.dead = true; e._earthFx = null;
    if (R && R.earth) R.earth.delete(X);
    if (X.sh && e.labShield === X.sh) e.labShield = null;
    const safe = fn => { try { fn(); } catch (err) {} };
    safe(() => earthBadgeDrop(scene, e, X));
    if (R && R.earth) {
      if (X.links) for (const link of [...X.links.values()]) safe(() => link.kill());
      for (const other of R.earth) if (other.links && other.links.has(e)) safe(() => other.links.get(e).kill());
    }
    if (X.resumeFreeze) safe(X.resumeFreeze);
    if (X.restoreRage) safe(X.restoreRage);
    if (X.gateVisible != null && !e.dead && e.gateTx) safe(()=>e.gateTx.setVisible(X.gateVisible));
    safe(() => earthRestore(scene, e, X));
    if (X.tintBase != null && e.sprite) safe(() => e.sprite.setTint(X.tintBase));
    for (const t of X.tms) safe(() => { t.remove(false); const i = R.tms.indexOf(t); if (i >= 0) R.tms.splice(i, 1); });
    for (const t of X.twists) safe(() => t.stop());
    for (const p of [...X.parts]) safe(() => p.kill());
    for (const o of [...X.objects]) safe(() => { scene.tweens.killTweensOf(o); if (o.scene) o.destroy(); });
    for (const rel of X.locks) safe(() => { if (R.locks.delete(rel)) rel(); });
  }
  function earthFail(scene) {
    const R = scene._efxRt;
    if (R && R.earth) { R.earthFailedUntil=R.seqEnd; for (const X of [...R.earth]) earthDrop(scene, X.e); }
    for (const e of scene.enemies || []) {
      if (!e || e.dead || !e._r || !e._r.up || !e.sprite || e.labShield || e._shieldPending) continue;
      try { scene._buildATField(e, e._r.gate.kind); } catch (err) {}
    }
    try { scene._ecGuardSync(); } catch (err) {}
  }
  function earthRun(scene, flags, e, op, ...args) {
    return guard(flags, 's3', () => {
      if (!e || !e.sprite || e.dead) return false;
      if (!earthReady(scene)) {
        if (e._earthFx && e._earthFx.sh) throw Error('土盾素材失效');
        return false;
      }
      const X = earthState(scene, e, flags);
      return EARTH_OP[op](scene, e, X, ...args);
    }, false, () => earthFail(scene));
  }
  function earthImage(scene, X, x, y, key, size, depth) {
    const im = earthOwn(scene, X, scene.add.image(x, y, key));
    return im.setDisplaySize(size, size).setDepth(depth || DEP.burst);
  }
  function earthStone(scene, X, i, x, y, size) {
    return earthImage(scene, X, x, y, 'fx_en_earth_rock_' + (1 + i % 3), size);
  }
  function earthSparks(scene, X, p, count, radius) {
    const k = EARTH.spark;
    for (let i = 0; i < count; i++) {
      const a = (i + rr(...k.jitter)) * Math.PI * 2 / count, d = radius * rr(...k.distance);
      const o = earthOwn(scene, X, scene.add.rectangle(p.x, p.y, rr(...k.size), rr(...k.size), i % 2 ? EARTH.gold : k.brown)).setDepth(DEP.burst);
      earthTween(scene, X, { targets: o, x: p.x + Math.cos(a)*d, y: p.y + Math.sin(a)*d, angle: rr(...k.angle), alpha: 0, duration: rr(...k.duration), onComplete: () => o.destroy() });
    }
  }
  function earthSpikeLength(scene, X, p, angle, breath, push) {
    let len = lerp(lerp(EARTH.spike, EARTH.breath, breath), EARTH.push, push);
    const min = lerp(lerp(EARTH.oldSpike, EARTH.oldBreath, breath), EARTH.oldPush, push);
    const ux = Math.cos(angle), uy = Math.sin(angle), base = p.w * EARTH.spikeBase;
    for (const nb of scene.enemies) {
      const other = nb && nb._earthFx;
      if (!other || other === X || !other.sh || !other.pos) continue;
      const q = other.pos, dx = q.x - p.x, dy = q.y - p.y, along = dx*ux + dy*uy;
      const across = dx*uy - dy*ux, width = EARTH.ring.width + q.star * EARTH.ring.starWidth;
      const radius = q.w / 2 + EARTH.ring.inset + EARTH.ring.breath + width + RING_FRAME / 2 + EARTH.gap;
      if (Math.abs(across) >= radius || along <= 0) continue;
      len = Math.min(len, Math.max(min, along - Math.sqrt(radius*radius - across*across) - base));
    }
    return len;
  }
  function earthShield(scene, e, X, reform) {
    if (X.sh && X.sh.active) return X.sh;
    if (!e._r.up || !e._r.gate) return false;
    const p = X.pos = earthGeom(scene, e), gate = e._r.gate;
    const sh = X.sh = earthOwn(scene, X, scene.add.container(p.x,p.y)).setDepth(DEP.threat);
    if (e.gateTx) { if (X.gateVisible==null) X.gateVisible=e.gateTx.visible; e.gateTx.setVisible(false); }
    e.labShield = sh; sh._earth = true; sh._R = p.w*.5;
    const face = earthImage(scene,X,0,0,p.star>=3?'fx_en_shield_rock_spike':'fx_en_shield_rock',p.w);
    const spikes = EARTH.SPIKE_DRAW && p.star >= 3 ? earthOwn(scene,X,scene.add.graphics()) : null;
    sh.add(spikes ? [face, spikes] : [face]); X.face = face;
    const width = EARTH.ring.width + p.star * EARTH.ring.starWidth;
    const count = gate.kind === 'hit' ? Math.max(1, Math.ceil(gate.n / 3)) : gate.n;
    const ring = makeRing(scene, { progress: true, owner: X, shield: sh, width, count,
      shieldRadius: sh._R, kind: gate.kind, need: gate.n });
    const state = { elapsed:0, hit:0, push:0, grow:reform?0:1, closing:false, ring };
    X.shState=state;
    if (reform && spikes) earthTween(scene,X,{targets:state,grow:1,delay:EARTH.spikeGrowDelay,duration:EARTH.spikeGrowMs});
    let part;
    part = earthPart(scene,X,{
      update(dt) {
        if (!sh.active || X.sh!==sh) { part.kill(); return; }
        state.elapsed+=dt;
        const target=state.closing ? 1 : clamp((gate.kind==='combo' ? (scene.combo||0)+(e._r.sk||0) : state.hit)/gate.n,0,1);
        ring.update(dt, target);
        if (spikes) {
          spikes.clear();
          const breath=quiet(scene)||(scene._ec && scene._ec.ec && scene._ec.ec.stun)?0:(1-Math.cos(state.elapsed*2*Math.PI/EARTH.period))/2;
          for(let i=0;i<8;i++){
            const a=(i+.5)*Math.PI/4, ux=Math.cos(a),uy=Math.sin(a),r=p.w*EARTH.spikeBase;
            const len=earthSpikeLength(scene,X,p,a,breath,state.push)*state.grow, h=EARTH.root/2;
            const pts=[{x:ux*r-uy*h,y:uy*r+ux*h},{x:ux*(r+len),y:uy*(r+len)},{x:ux*r+uy*h,y:uy*r-ux*h}];
            spikes.fillStyle(EARTH.gold,1).fillPoints(pts,true).lineStyle(EARTH.spikeEdgeWidth,EARTH.edge,1).strokePoints(pts,true);
          }
        }
      },
      kill(){rt(scene).parts.delete(part);}
    });
    if (!reform && scene._ecGuardSync) earthLater(scene,X,0,()=>scene._ecGuardSync());
    if (X.flags.s8) auraSet(scene, e, 'earth', auraEarthLevel, X.flags);
    return sh;
  }
  function earthRipple(scene,X,p) {
    const k = EARTH.ripple;
    const g=earthOwn(scene,X,scene.add.graphics()).setDepth(DEP.burst), state={u:0};
    earthTween(scene,X,{targets:state,u:1,duration:k.duration,onUpdate:()=>{
      const u=state.u,r=p.w*k.radius;
      g.clear().fillStyle(k.glow,k.alpha*clamp(u<k.peak?u/k.peak:(k.end-u)/k.fade,0,1)).fillCircle(p.x,p.y,r);
      for(const phase of [u,u-k.echo]) if(phase>=0) g.lineStyle(k.width+k.widthGain*(1-phase),EARTH.rippleColor,1-phase).strokeCircle(p.x,p.y,r*lerp(k.startRadius,1,phase));
    },onComplete:()=>g.destroy()});
  }
  function earthBlock(scene,e,X,ev) {
    const k = EARTH.block, sh=X.sh, state=X.shState, p=X.pos;
    if(!sh || !sh.active) return false;
    if(ev.kind==='hit') {
      state.hit=ev.have; const seq=state.hitSeq=(state.hitSeq||0)+1;
      earthLater(scene,X,EARTH.hitReset,()=>{if(state.hitSeq===seq)state.hit=0;});
    }
    const recoil=ev.recoil>0;
    if (scene.labSnd) scene.labSnd('s_block', k.sound);
    earthLock(scene,X,recoil?k.recoilLock:k.lock);
    earthTween(scene,X,{targets:sh,scale:k.pressScale,y:p.y+k.pressY,duration:k.pressMs,yoyo:!recoil});
    if(!recoil){
      earthRipple(scene,X,p);
      const count=p.star===1?k.smallStones:k.stones;
      for(let i=0;i<count;i++){
        const stone=earthStone(scene,X,i,p.x,p.y,rr(...k.stoneSize)),side=i%2?1:-1;
        earthTween(scene,X,{targets:stone,x:p.x+side*rr(...k.stoneX),y:p.y+rr(...k.stoneY),angle:side*rr(...k.stoneAngle),alpha:0,duration:rr(...k.stoneMs),onComplete:()=>stone.destroy()});
      }
      const chip=earthStone(scene,X,0,p.x,p.y,k.chipSize);
      earthTween(scene,X,{targets:chip,x:e.sprite.x,y:e.sprite.y,duration:k.chipTravel,onComplete:()=>earthTween(scene,X,{targets:chip,alpha:0,duration:k.chipFade,onComplete:()=>chip.destroy()})});
    }else{
      if (scene.labSnd) scene.labSnd('s_boom', k.recoilSound);
      earthSparks(scene,X,p,k.recoilSparks,k.recoilRadius);
      const glow=earthOwn(scene,X,scene.add.graphics()).setDepth(DEP.burst),a={u:0};
      earthTween(scene,X,{targets:a,u:1,duration:k.absorbMs,onUpdate:()=>{
        const u=a.u,r=lerp(p.w*k.absorbRadius,EARTH.bolt.radius,u);
        const c=u<k.absorbPivot?lerpCol(k.absorbDark,k.absorbMid,u/k.absorbPivot):lerpCol(k.absorbMid,EARTH.bright,(u-k.absorbPivot)/k.absorbEnd);
        glow.clear().lineStyle(lerp(...k.absorbWidths,u),c,lerp(...k.absorbAlphas,u)).strokeCircle(p.x,p.y,r);
      },onComplete:()=>glow.destroy()});
      earthTween(scene,X,{targets:state,push:1,duration:k.pushMs});
      earthLater(scene,X,k.thrustDelay,()=>{if(X.sh!==sh)return;
        if(!quiet(scene)) motion(scene,e,k.motion);
        earthTween(scene,X,{targets:sh,scale:k.thrustScale,y:p.y+k.thrustY,duration:k.thrustMs});
      });
      earthLater(scene,X,k.absorbMs,()=>{if(X.sh!==sh)return;
        earthTween(scene,X,{targets:state,push:0,duration:k.returnMs});
        earthTween(scene,X,{targets:sh,scale:1,y:p.y,delay:k.returnDelay,duration:k.returnMs,ease:'Back.easeOut'});
      });
    }
    return true;
  }
  function earthBolt(scene,e,X,tx,ty,source) {
    const k = EARTH.bolt;
    const p=(source && source._earthFx && source._earthFx.pos) || earthGeom(scene,source || e);
    earthLater(scene,X,EARTH.block.absorbMs,()=>{
      const point=earthOwn(scene,X,scene.add.graphics()).setDepth(DEP.hit);
      point.fillStyle(k.halo,k.outerAlpha).fillCircle(0,0,k.outerRadius).fillStyle(k.halo,k.innerAlpha).fillCircle(0,0,k.innerRadius).fillStyle(EARTH.bright,1).fillCircle(0,0,k.radius).setPosition(p.x,p.y);
      const flight={u:0};
      earthTween(scene,X,{targets:flight,u:1,duration:k.flight,ease:'Quad.easeIn',onUpdate:()=>{
        const u=flight.u; point.setPosition(lerp(p.x,tx,u),lerp(p.y,ty,u)-k.arc*u*(1-u));
      },onComplete:()=>earthTween(scene,X,{targets:point,alpha:0,duration:k.fade,onComplete:()=>point.destroy()})});
    });
    return true;
  }
  function earthFreeze(scene,e,X,ms) {
    if (quiet(scene) || !e.sprite || !e.sprite.active) return;
    if (X.resumeFreeze) X.resumeFreeze();
    const start = scene.time.now || 0, st = e._fxSt;
    const mine = st && st.frz == null, paused = [];
    const resume = () => {
      if (X.resumeFreeze !== resume) return;
      X.resumeFreeze = null;
      for (const t of paused) { try { t.resume(); } catch (err) {} }
      if (mine && e._fxSt === st && st.frz === start) {
        const elapsed = Math.max(0,(scene.time.now || 0) - start);
        st.t0 += elapsed; st.end += elapsed; st.frz = null;
      }
    };
    X.resumeFreeze = resume;
    for (const t of scene.tweens.getTweensOf(e.sprite)) {
      if (t.isPlaying && t.isPlaying()) { paused.push(t); t.pause(); }
    }
    if (mine) st.frz = start;
    earthLater(scene,X,ms,resume);
  }
  function earthBreak(scene,e,X,ev) {
    const k = EARTH.break, sh=X.sh, p=X.pos; if(!sh || !sh.active) return false;
    earthBadgeBreak(scene, e, X);
    const state=X.shState; state.closing=true;
    const delay=ev.kind==='hit'?k.hitDelay:k.comboDelay;
    const emoteStampAtHit = X.flags.s7 && emoteScheduleStamp(scene, e, 'earth', X.flags);
    earthLater(scene,X,delay,()=>{
      if(X.sh!==sh)return;
      state.ring.drop();
      earthFreeze(scene,e,X,k.freeze);
      if (X.flags.s7 && emoteStampAtHit) emoteSchedule(scene, e, X, 'earth',
        fn => earthLater(scene, X, e._r.rule === EMOTEFX.king && X.guardActive ? EMOTEFX.earthLinkedAt : EMOTEFX.earthAt, fn),
        () => earthBang(scene, e, X, 'dizzy', true), emoteStampAtHit);
      earthLater(scene,X,k.freeze,()=>{
        if(X.sh!==sh)return;
        if(e.labShield===sh)e.labShield=null;
        if (scene.labSnd) { scene.labSnd('s_block', k.blockSound); scene.labSnd('s_boom', k.boomSound); }
        X.sh=null; sh.destroy();
        if (X.flags.s8) auraSet(scene, e, 'earth', auraEarthLevel, X.flags);
        const sheet=earthImage(scene,X,p.x,p.y,'fx_en_shield_break16',p.w*k.size),frame={n:0};
        earthTween(scene,X,{targets:frame,n:k.frames,duration:k.duration,onUpdate:()=>sheet.setFrame(Math.min(k.frames-1,Math.floor(frame.n))),onComplete:()=>sheet.destroy()});
        earthSparks(scene,X,p,k.sparks,p.w*k.sparkRadius);
        if(EARTH.SPIKE_DRAW && p.star>=3) for(let i=0;i<8;i++){
          const a=(i+.5)*Math.PI/4, dx=Math.cos(a),dy=Math.sin(a),r=p.w*EARTH.spikeBase;
          const shard=earthOwn(scene,X,scene.add.triangle(p.x+r*dx,p.y+r*dy,0,0,EARTH.root,EARTH.root/2,0,EARTH.root,EARTH.gold)).setStrokeStyle(EARTH.spikeEdgeWidth,EARTH.edge).setRotation(a).setDepth(DEP.burst);
          earthTween(scene,X,{targets:shard,x:shard.x+k.spikeTravel*dx,y:shard.y+k.spikeTravel*dy+k.spikeFall,angle:shard.angle+k.spikeTurn,alpha:0,duration:k.spikeMs,onComplete:()=>shard.destroy()});
        }
        shake(scene,k.shake,k.shakeMs);
        if(!e._r.up && !quiet(scene)) {
          X.stance=motion(scene,e,k.motion);
          if (X.stance) {
            X.stance.kind = 'earthRest'; X.stance.end = Infinity;
            const watch = X.stanceWatch = earthPart(scene, X, {
              update() { if (e.dead || e._r.up || X.stance !== e._fxSt) earthRestore(scene, e, X); },
              kill() { rt(scene).parts.delete(watch); },
            });
          }
        }
        scene._ecGuardSync();
      });
    });
    if(e.gateTx)e.gateTx.setVisible(false);
    scene.updateEnemies();
    return true;
  }
  function earthGather(scene,e,X,mode) {
    if (mode === 'merge') earthRestore(scene, e, X);
    const k = EARTH.rebuild, p=X.pos=earthGeom(scene,e),key=p.star>=3?'fx_en_shield_rock_spike':'fx_en_shield_rock';
    const stamp=X.gatherSeq=(X.gatherSeq||0)+1;
    if(X.ghost){ X.ghost.destroy(); X.ghost=null; }
    const ghost=X.ghost=earthImage(scene,X,p.x,p.y,key,p.w,DEP.threat);
    const scale=ghost.scaleX, merge=mode==='merge',reset=mode==='reset';
    ghost.setScale(scale*(reset?k.resetScale:k.startScale)).setAlpha(reset||merge?k.alpha:0);
    const gather=()=>{if(ghost.scene)earthTween(scene,X,{targets:ghost,scale:scale*k.gatherScale,alpha:k.alpha,duration:EARTH.gather});};
    if(reset) earthTween(scene,X,{targets:ghost,alpha:0,scale:scale*k.disperseScale,duration:k.disperseMs,onComplete:gather});
    else if(!merge) gather();
    if (merge && scene.labSnd) scene.labSnd('s_clear15', k.sound);
    const count=merge?k.mergeStones:k.gatherStones;
    for(let i=0;i<count;i++)earthLater(scene,X,i*(merge?k.mergeInterval:k.gatherInterval)+(reset?k.disperseMs:0),()=>{
      if(X.gatherSeq!==stamp)return;
      const s=earthStone(scene,X,i,p.x+rr(...k.stoneX),p.y+p.w*EARTH.geom.aboveGround,rr(...k.stoneSize));
      earthTween(scene,X,{targets:s,x:p.x,y:p.y,scale:s.scaleX*k.stoneEndScale,alpha:0,duration:merge?k.mergeTravel:rr(...k.gatherTravel),ease:'Quad.easeIn',onComplete:()=>s.destroy()});
    });
    if(merge)earthLater(scene,X,k.mergeDelay,()=>{
      if(X.gatherSeq!==stamp || !e._r.up)return;
      ghost.destroy(); X.ghost=null;
      if(!quiet(scene)) motion(scene,e,k.motion);
      const sh=earthShield(scene,e,X,true);
      if(!sh)return;
      sh.setScale(k.mergeScale); earthTween(scene,X,{targets:sh,scale:1,duration:k.mergeMs,ease:'Back.easeOut'});
      shake(scene,k.shake,k.shakeMs); earthSparks(scene,X,{x:p.x,y:p.y+p.w*k.sparkY},k.sparks,k.sparkRadius);
      scene._ecGuardSync(); scene._mechCheck(k.mechCheck);
    });
    if (X.flags.s8) auraSet(scene, e, 'earth', auraEarthLevel, X.flags);
    return true;
  }
  const EARTH_OP={
    build:earthShield, block:earthBlock, bolt:earthBolt, break:earthBreak,
    gather:earthGather, ready:()=>true, number(scene,e,X,t,result,base,final) {
      if(!result || !(result.blocked || result.broke))return false;
      if(result.blocked) t.setFontSize(EARTH.number.small).setColor(EARTH.number.color).setStroke(EARTH.number.edge,EARTH.number.stroke);
      else {
        t.setFontSize(EARTH.number.large);
        if(final && result.bonus>0) {
          if(!X.shownBonuses) X.shownBonuses=new WeakSet();
          if(!X.shownBonuses.has(result)) { t.setText('-'+(base+result.bonus)); X.shownBonuses.add(result); }
        }
      }
      return true;
    },
    recoilHit(scene,e,X,x,y) {
      const k = EARTH.recoil;
      earthSparks(scene,X,{x,y},k.sparks,k.sparkRadius);shake(scene,k.shake,k.shakeMs);
      if(!quiet(scene)){
        const cards=(scene.teamCards || []).slice(0,k.cards).flatMap(c=>[c.rect,c.img,c.txt]).filter(o=>o && o.scene);
        const base=cards.map(o=>o.y);
        let age=0, last=0;
        const bump=earthPart(scene,X,{update(dt){
          age+=dt;
          const shift=k.bump*Math.sin(Math.PI*clamp(age/k.bumpMs,0,1));
          cards.forEach((o,i)=>{if(o.scene && Math.abs(o.y-(base[i]+last))<.01)o.y=base[i]+shift;});
          last=shift; if(age>=k.bumpMs)bump.kill();
        },kill(){
          cards.forEach((o,i)=>{if(o.scene && Math.abs(o.y-(base[i]+last))<.01)o.y=base[i];});
          rt(scene).parts.delete(bump);
        }});
      }
      if(scene.labSnd)scene.labSnd('s_player',EARTH.impact.volume);
      return true;
    },
    rageSwing(scene, e, X) {
      return scene._ecRageSwing(e, { stage: 1 }, {
        own: o => earthOwn(scene, X, o),
        tween: cfg => earthTween(scene, X, cfg),
        later: (ms, restore) => {
          X.restoreRage = restore;
          earthLater(scene, X, ms, () => { restore(); X.restoreRage = null; });
        },
      });
    },
    guardHit:earthGuardHit,
    badge: earthBadgeSync,
  };
  function earthGuardHit(scene,e,X) {
    const R=rt(scene), k = EARTH.hold;
    for(const king of R.earth) {
      const link=king.links && king.links.get(e);
      if(link && link.ghost && link.ghost.active){
        link.ghost.setAlpha(k.hitAlpha); earthTween(scene,king,{targets:link.ghost,alpha:k.alpha,duration:k.hitMs});
      }
    }
    return true;
  }
  function earthLink(scene,X,n,delay) {
    const k = EARTH.hold, g=X.e,p=earthGeom(scene,g),q=earthGeom(scene,n);
    const link={n,u:0,retiring:false,ghost:null,age:0,dead:false};
    X.links.set(n,link);
    const line=earthPart(scene,X,makeLine(scene,{style:'guard',color:EARTH.guardColor,from:()=>p,
      to:()=>({x:lerp(p.x,q.x,link.u),y:lerp(p.y,q.y,link.u)})}));
    link.kill=()=>{
      if(link.dead)return; link.dead=true;
      line.kill();
      if(link.ghost && link.ghost.scene)link.ghost.destroy();
      if(link.driver)link.driver.kill();
      if(X.links.get(n)===link)X.links.delete(n);
    };
    link.driver=earthPart(scene,X,{update(dt){
      link.age+=dt;
      if(n.dead || !n.sprite || !n.sprite.active){link.kill();return;}
      if(link.retiring){
        const t=link.age-k.retireDelay;
        if(t<0)return;
        link.u=link.from*(1-clamp(t/k.retireMs,0,1));
        if(t>=k.retireMs && !link.burst){
          link.burst=true; earthSparks(scene,X,q,k.sparks,k.sparkRadius);
          if(link.ghost){
            const gh=link.ghost;
            earthTween(scene,X,{targets:gh,alpha:0,scale:gh.scaleX*k.retireScale,duration:k.ghostFade});
          }
        }
        if(t>=k.retireMs+k.ghostFade)link.kill();
        return;
      }
      const u=clamp((link.age-delay)/k.extend,0,1); link.u=1-(1-u)*(1-u);
      if(u===1 && !link.ghost){
        const gh=link.ghost=earthImage(scene,X,q.x,q.y,'fx_en_shield_rock_spike',q.w*k.ghostSize,DEP.threat);
        const sc=gh.scaleX;gh.setScale(sc*k.ghostStartScale).setAlpha(0);
        earthTween(scene,X,{targets:gh,alpha:k.alpha,scale:sc,duration:k.extend,ease:'Back.easeOut'});
      }
    },kill(){rt(scene).parts.delete(link.driver);}});
    return link;
  }
  function earthGuardSync(scene,flags) {
    const k = EARTH.hold;
    return guard(flags,'s3',()=>{
      if(!earthReady(scene))return false;
      const kings=scene.enemies.filter(e=>e && e._r && e._r.rule===4 && !e._r.guest && !e.dead && e.sprite);
      if(!kings.length)return false;
      const pairs=scene.dive?[]:scene._ecGuardPairs(true);
      for(const king of kings){
        const X=earthState(scene,king,flags),want=pairs.filter(p=>p.g===king).map(p=>p.n);
        if(!X.links)X.links=new Map();
        for(const [n,link] of X.links){
          if(!want.includes(n) && !link.retiring){
            link.from=link.u;link.retiring=true;link.age=0;
          }
        }
        const first=!X.guardActive;
        if(want.length && first && !quiet(scene))motion(scene,king,MOVE.burnIn());
        for(const n of want){
          const prior=X.links.get(n);
          if(prior && !prior.retiring)continue;
          if(prior)prior.kill();
          earthLink(scene,X,n,first?k.initialDelay:0);
        }
        X.guardActive=!!want.length;
        if (flags.s8) auraSet(scene, king, 'earth', auraEarthLevel, flags);
        if(X.guardActive && !X.pulse){
          const sp=king.sprite; X.tintBase=sp.tintTopLeft==null?EARTH.warmBase:sp.tintTopLeft;
          let t=0;
          X.pulse=earthPart(scene,X,{update(dt){
            if(!X.links.size){
              sp.setTint(X.tintBase); X.tintBase=null;
              X.pulse.kill();X.pulse=null;
              if(!quiet(scene))motion(scene,king,MOVE.burnOut());
              return;
            }
            t+=dt;sp.setTint(lerpCol(X.tintBase,k.tint,k.tintBase+(quiet(scene)?0:k.tintSwing*Math.sin(t/k.tintRate))));
          },kill(){rt(scene).parts.delete(X.pulse);}});
        }
      }
      scene._ecRockRageSync(); return true;
    },false,()=>earthFail(scene));
  }
    function earthBadgeSync(scene, e, X, lethal) {
    const g = e.glass, tx = e.turnTx;
    if (e.dead || e.hp <= 0 || !g || !g.scene || !tx || !tx.scene || !e.turnG || !e.turnG.scene ||
        !has(scene, 'icon_hourglass') || !has(scene, 'icon_cd_skull')) return false;
    if (!X.badgeState) {
      const B = X.badgeState = { fx: [], tms: [], beforeKey: e._glassKey };
      B.badge = makeBadge(scene, e, B, cfg => earthTween(scene, X, cfg));
      earthPart(scene, X, B.badge);
    }
    const B = X.badgeState;
    if ((scene.time.now || 0) < (B.badgeHold || 0)) return true;
    if (e._glassKey === 'icon_cd_skull' && !e._r.up && X.sh && X.shState && !X.shState.closing) return true;
    const key = lethal() ? 'icon_cd_skull' : 'icon_hourglass';
    if (e._glassKey !== key) {
      scene.tweens.killTweensOf(g);
      g.setTexture(key).setDisplaySize(BADGE.ICON, BADGE.ICON).setAngle(0);
      e._glassKey = key;
    }
    return true;
  }
  function earthBadgeBreak(scene, e, X) {
    const B = X.badgeState;
    if (!B || e._glassKey !== 'icon_cd_skull' || !e.glass || !e.glass.scene) return;
    skullSplit(scene, e, B, 0,
      (ms, fn) => earthLater(scene, X, ms, fn), cfg => earthTween(scene, X, cfg));
    e.glass.setTexture('icon_hourglass').setDisplaySize(BADGE.ICON, BADGE.ICON).setAngle(0);
    e._glassKey = 'icon_hourglass';
  }
  function earthBadgeDrop(scene, e, X) {
    const B = X.badgeState;
    if (!B) return;
    X.badgeState = null;
    if (B.badge) B.badge.kill();
    B.fx.slice().forEach(o => {
      scene.tweens.killTweensOf(o);
      if (o.scene) o.destroy();
    });
    const g = e.glass, tx = e.turnTx;
    e._glassKey = B.beforeKey;
    if (e.dead) return;
    const key = e._countdownSk ? 'icon_cd_skull' : 'icon_hourglass';
    const size = e._countdownSk ? EARTH.badge.oldSkull : EARTH.badge.oldGlass;
    if (g && g.scene && has(scene, key)) g.setTexture(key).setDisplaySize(size, size).setAngle(0).setAlpha(1);
    if (tx && tx.scene) {
      const tm = Number(tx.text);
      tx.setColor(tm <= 1 ? '#ff5a4a' : tm === 2 ? '#ffc24a' : '#eaf3ff');
    }
  }

  /*EARTH-MORE*/

  function thunderReady(scene) { return ASSETS.s5.every(a => has(scene, a.key)); }
  function thunderState(scene, e, flags) {
    if (e._thunderFx) return e._thunderFx;
    const X = { e, flags, cells: new Map(), parts: new Set(), objects: new Set(),
      tms: new Set(), twists: new Set(), locks: new Set(), pending: new Set(),
      layers: new Set(), ghosts: new Map(), landings: new Set() };
    const R = rt(scene);
    if (!R.thunder) R.thunder = new Set();
    R.thunder.add(X);
    e._thunderFx = X;
    return X;
  }
  function thunderGuard(scene, X, fn) {
    if (X.dead) return false;
    if (!X.flags.s5) { thunderDrop(scene, X.e); return false; }
    return guard(X.flags, 's5', fn, false, () => thunderFail(scene));
  }
  function thunderPart(scene, X, part) {
    const update = part.update, kill = part.kill;
    part.update = dt => thunderGuard(scene, X, () => update.call(part, dt));
    part.kill = () => { X.parts.delete(part); kill.call(part); };
    X.parts.add(part);
    rt(scene).parts.add(part);
    return part;
  }
  function thunderOwn(scene, X, obj) {
    own(scene, obj);
    X.objects.add(obj);
    obj.once('destroy', () => X.objects.delete(obj));
    return obj;
  }
  function thunderLater(scene, X, ms, fn) {
    const t = scene.time.delayedCall(Math.max(0, ms), () => {
      X.tms.delete(t);
      thunderGuard(scene, X, fn);
    });
    X.tms.add(t);
    return t;
  }
  function thunderTween(scene, X, cfg) {
    const done = cfg.onComplete, update = cfg.onUpdate;
    if (update) cfg.onUpdate = (...args) => thunderGuard(scene, X, () => update(...args));
    cfg.onComplete = (...args) => {
      X.twists.delete(t);
      if (done) thunderGuard(scene, X, () => done(...args));
    };
    const t = scene.tweens.add(cfg);
    X.twists.add(t);
    return t;
  }
  function thunderLock(scene, X, ms) {
    const R = rt(scene);
    const unlock = takeLock(scene, ms, () => thunderGuard(scene, X, rel));
    const rel = () => {
      if (!X.locks.delete(rel)) return;
      R.locks.delete(unlock);
      if (unlock) unlock();
    };
    if (unlock) X.locks.add(rel);
    return rel;
  }
  function thunderDrop(scene, e) {
    if (e && e._efxEmote) emoteDrop(scene, e, 'thunder');
    if (e && e._efxAura && e._efxAura.city === 'thunder') auraDrop(scene, e);
    const X = e && e._thunderFx;
    if (!X) return;
    X.dead = true;
    e._thunderFx = null;
    const R = scene._efxRt;
    if (R && R.thunder) R.thunder.delete(X);
    const safe = fn => { try { fn(); } catch (err) {} };
    const reDraw = X.iron || X.pending.size || X.layers.size || X.ghosts.size;
    for (const o of X.pending) o._pend = false;
    for (const o of X.layers) o._vis = null;
    for (const t of X.tms) safe(() => t.remove(false));
    for (const t of X.twists) safe(() => t.stop());
    for (const p of [...X.parts]) safe(() => p.kill());
    for (const o of [...X.objects]) {
      safe(() => scene.tweens.killTweensOf(o));
      safe(() => { if (o.scene) o.destroy(); });
    }
    if (!e.dead && X.motion && X.motion === e._fxSt) safe(() => scene._fxStateCut(e));
    if (e._tmHold != null && X.attackHeld) { e._tmHold = null; e._tmHoldUntil = scene.time.now || 0; }
    for (const rel of [...X.locks]) safe(rel);
    if (reDraw && scene.sys && scene.sys.isActive()) safe(() => scene.refreshBoard());
  }
  function thunderFail(scene) {
    const R = scene._efxRt;
    if (R && R.thunder) {
      R.thunderFailedUntil = R.seqEnd;
      const landings = [];
      for (const X of [...R.thunder]) {
        landings.push(...X.landings);
        thunderDrop(scene, X.e);
      }
      for (const landed of landings) { try { landed(); } catch (err) {} }
    }
    for (const e of scene.enemies || []) {
      if (!e || !e._i || e.dead || e.hp <= 0) continue;
      try { scene._ecIronOrbSync(e); } catch (err) {}
    }
    try { scene.refreshBoard(); } catch (err) {}
    try { scene.updateEnemies(); } catch (err) {}
  }
  function thunderRun(scene, flags, e, op, ...args) {
    return guard(flags, 's5', () => {
      if (!e || !e._i || !e.sprite || e.dead || (scene.resultOpen && scene._resultTerminal)) return false;
      if (!thunderReady(scene)) {
        if (e._thunderFx) throw Error('雷城演出缺少貼圖');
        return false;
      }
      return THUNDER_OP[op](scene, e, thunderState(scene, e, flags), ...args);
    }, false, () => thunderFail(scene));
  }
  function thunderLive(scene, e) {
    return e._i.cells.filter(x => thunderHasCell(scene, x) && !x.obj._pend);
  }
  function thunderHasCell(scene, x) { return !!x.obj && scene.board[x.r] && scene.board[x.r][x.c] === x.obj; }
  function thunderMid(scene, cells) {
    if (!cells.length) return null;
    let x = 0, y = 0;
    for (const cell of cells) { const p = scene.cellCenter(cell.r, cell.c); x += p.x; y += p.y; }
    return { x: x / cells.length, y: y / cells.length };
  }
  function thunderFoot(e) {
    const f = readGame(e), a = anchor(f);
    return { x: e.x == null ? f.x : e.x, y: (e.shadow ? e.shadow.y : a.ground == null ? f.imgY + f.dispH * (1 - f.oy) : a.ground) - THUNDER.footLift };
  }
  function thunderDrawIron(scene, g, x, y, lock) {
    const s = THUNDER.size;
    scene._drawLockIron(g, x - s / 2, y - s / 2, s, lock);
    const mark = THUNDER.layerMark, w = s * mark.width;
    const x0 = x - (lock * w + (lock - 1) * mark.gap) / 2;
    g.fillStyle(mark.color, 1);
    for (let i = 0; i < lock; i++) g.fillRect(x0 + i * (w + mark.gap), y - s / 2 + mark.top, w, mark.height);
  }
  function thunderGhost(scene, X, p, lock) {
    const g = thunderOwn(scene, X, scene.add.graphics()).setDepth(THUNDER.ironDepth).setPosition(p.x, p.y);
    thunderDrawIron(scene, g, 0, 0, lock);
    return g;
  }
  function thunderPop(scene, X, cell, p, scale, ms, fall, ghost) {
    const g = (ghost || thunderGhost(scene, X, p, cell.obj.lock)).setPosition(p.x, p.y).setAngle(0).setScale(scale);
    const previous = X.ghosts.get(cell.obj);
    if (previous) previous.setVisible(false);
    X.ghosts.set(cell.obj, g);
    scene.refreshBoard();
    thunderTween(scene, X, { targets: g, scale: 1, duration: ms, ease: fall ? 'Quad.easeOut' : 'Back.easeOut' });
    if (fall) {
      g.y += THUNDER.place.sink;
      thunderTween(scene, X, { targets: g, y: p.y, duration: THUNDER.place.bounceMs, ease: 'Back.easeOut' });
    }
    thunderLater(scene, X, fall ? THUNDER.place.bounceMs : ms, () => {
      g.destroy();
      if (X.ghosts.get(cell.obj) === g) X.ghosts.delete(cell.obj);
      if (thunderHasCell(scene, cell)) scene.refreshBoard();
    });
  }
  function thunderSparks(scene, X, p, count, distance, colors) {
    const k = THUNDER.ironSparks;
    for (let i = 0; i < count; i++) {
      const a = (i + rr(-k.jitter, k.jitter)) * Math.PI * 2 / count;
      const g = thunderOwn(scene, X, scene.add.rectangle(p.x, p.y, rr(...k.size), rr(...k.size), colors[i % colors.length])).setDepth(THUNDER.ironDepth);
      thunderTween(scene, X, { targets: g, x: p.x + Math.cos(a) * distance, y: p.y + Math.sin(a) * distance,
        angle: rr(-k.angle, k.angle), alpha: 0, duration: k.ms, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
    }
  }
  function thunderDust(scene, X, p) {
    const t = THUNDER.place;
    for (let i = 0; i < t.dustCount; i++) {
      const x = p.x + (i - (t.dustCount - 1) / 2) * t.dustGap, y = p.y + t.dustY;
      const g = thunderOwn(scene, X, scene.add.circle(x, y, rr(...t.dustRadius), t.dustColor, t.dustAlpha)).setDepth(THUNDER.ironDepth);
      thunderTween(scene, X, { targets: g, x: x + (i - (t.dustCount - 1) / 2) * t.dustSpread, y: y - t.dustRise, alpha: 0, scale: t.dustScale, duration: t.dustMs, onComplete: () => g.destroy() });
    }
  }
  function thunderCable(scene, e, X) {
    if (X.line || !X.mid) return;
    X.extension = 0;
    const line = X.line = thunderPart(scene, X, makeLine(scene, {
      style: 'zap', depth: THUNDER.cableDepth, waitCol: THUNDER.waitColor, waitA: THUNDER.waitAlpha,
      ownGraphics: g => thunderOwn(scene, X, g),
      animate: cfg => thunderTween(scene, X, cfg), stop: t => X.twists.delete(t),
      from: () => thunderFoot(e),
      to: () => {
        const a = thunderFoot(e), b = X.mid;
        return { x: lerp(a.x, b.x, X.extension), y: lerp(a.y, b.y, X.extension) };
      },
    }));
    thunderTween(scene, X, { targets: X, extension: 1, duration: THUNDER.cableExtend, ease: 'Quad.easeIn' });
    return line;
  }
  function thunderArcs(g, p) {
    const t = THUNDER.arc, h = t.radius, length = t.length;
    const side = Math.floor(rnd() * 4), start = rr(-h, h - length);
    const pts = Array.from({ length: t.points }, (_, i) => {
      const u = start + length * i / (t.points - 1), v = h + rr(-t.jitter, t.jitter);
      return [[p.x + u, p.y - v], [p.x + v, p.y + u], [p.x + u, p.y + v], [p.x - v, p.y + u]][side];
    });
    for (const [width, col, alpha] of [[ZAP.glow, ZAP.halo, ZAP.haloA], [ZAP.w, ZAP.core, 1]]) {
      g.lineStyle(width, col, alpha);
      g.beginPath();
      g.moveTo(...pts[0]);
      for (const pt of pts.slice(1)) g.lineTo(...pt);
      g.strokePath();
    }
  }
  function thunderWatch(scene, e, X, dt) {
    if (e.dead || (scene.resultOpen && scene._resultTerminal)) { thunderDrop(scene, e); return; }
    const live = thunderLive(scene, e);
    for (const [obj, ghost] of X.ghosts) if (!live.some(q => q.obj === obj)) {
      ghost.setVisible(false);
      X.ghosts.delete(obj);
    }
    const painted = live.filter(q => !X.ghosts.has(q.obj));
    const stamp = painted.map(q => [q.r, q.c, (q.obj._vis != null ? q.obj._vis : q.obj.lock)].join(',')).join(';');
    if (X.ironStamp !== stamp) {
      X.ironStamp = stamp;
      X.iron.clear();
      for (const q of painted) {
        const p = scene.cellCenter(q.r, q.c);
        thunderDrawIron(scene, X.iron, p.x, p.y, (q.obj._vis != null ? q.obj._vis : q.obj.lock));
      }
    }
    if (live.length) {
      X.mid = thunderMid(scene, live);
      const touched = !scene._ecIronUntouched(e);
      if (X.line && !X.retiring && X.line.jolt <= 0 && !X.shortCable) X.line.setStyle(touched && e._i.rule >= 2 ? 'wait' : 'zap');
      if (X.arc) {
        const rate = touched ? 1 : e.timer <= 1 ? THUNDER.arc.timer1 : e.timer === 2 ? THUNDER.arc.timer2 : 1;
        const step = 1000 / THUNDER.arc.fps;
        const visible = live;
        const changed = visible.some(x => !X.cells.has(x.obj)) || visible.length !== X.cells.size;
        X.arcTime += dt * (X.arcCharge ? THUNDER.shock.arcRate : rate);
        if (changed || X.arcTime >= step || X.arcCharge !== X.arcDrawnCharge) {
          X.arcDrawnCharge = X.arcCharge;
          X.cells = new Map(visible.map(x => [x.obj, x]));
          X.arcTime %= step;
          X.arc.clear();
          for (const x of visible) {
            const count = X.arcCharge ? THUNDER.shock.arcCount : 1;
            for (let i = 0; i < count; i++) thunderArcs(X.arc, scene.cellCenter(x.r, x.c));
          }
        }
      }
    } else {
      X.cells.clear();
      if (X.arc) X.arc.clear();
      if (X.line && !X.retiring) { X.retiring = true; X.line.destroy(THUNDER.cableFade); }
    }
    if (X.line && X.line.dead) { X.line = null; X.retiring = false; }
    if (!X.dead) thunderOrbsSync(scene, e, X);
  }
  function thunderMonitor(scene, e, X) {
    if (X.watch) return;
    X.iron = thunderOwn(scene, X, scene.add.graphics()).setDepth(THUNDER.tileDepth);
    if (THUNDER.ARC_DRAW && e._i.rule >= 3) {
      X.arc = thunderOwn(scene, X, scene.add.graphics()).setDepth(THUNDER.arcDepth);
      X.arcTime = 0;
    }
    const R = rt(scene);
    X.watch = thunderPart(scene, X, { update: dt => thunderWatch(scene, e, X, dt), kill() { R.parts.delete(this); } });
    thunderWatch(scene, e, X, 0);
    scene.refreshBoard();
  }
  function thunderPlace(scene, e, X, ev) {
    const cells = (ev.cells || []).map(([r, c]) => e._i.cells.find(x => x.r === r && x.c === c))
      .filter(x => x && thunderHasCell(scene, x));
    if (!cells.length) return false;
    if (X.line) { X.line.kill(); X.line = null; X.retiring = false; }
    const t = THUNDER.place;
    const down = t.delay + t.flight + (cells.length - 1) * t.gap;
    const end = down + THUNDER.cableDelay + THUNDER.cableExtend;
    X.placeEnd = (scene.time.now || 0) + end;
    X.orbAfter = X.placeEnd;
    const rel = thunderLock(scene, X, end + 1);
    X.motion = motion(scene, e, MOVE.strike(t.power));
    if (scene.labSnd) scene.labSnd('s_block', t.castVolume);
    for (const cell of cells) {
      cell.obj._pend = true;
      X.pending.add(cell.obj);
    }
    scene.refreshBoard();
    thunderMonitor(scene, e, X);
    cells.forEach((cell, k) => thunderLater(scene, X, t.delay + t.gap * k, () => {
      if (!thunderHasCell(scene, cell)) { X.pending.delete(cell.obj); cell.obj._pend = false; return; }
      const from = { x: e.sprite.x, y: e.sprite.y }, p = scene.cellCenter(cell.r, cell.c);
      const g = thunderGhost(scene, X, from, cell.obj.lock).setAngle(t.turn).setScale(t.startScale);
      const flight = { u: 0 };
      thunderTween(scene, X, { targets: flight, u: 1, duration: t.flight, ease: 'Quad.easeIn',
        onUpdate: tween => {
          if (!thunderHasCell(scene, cell)) {
            X.pending.delete(cell.obj);
            cell.obj._pend = false;
            X.twists.delete(tween);
            tween.stop();
            g.destroy();
            return;
          }
          const u = flight.u;
          g.setPosition(lerp(from.x, p.x, u), lerp(from.y, p.y, u) - Math.sin(Math.PI * u) * t.arc)
            .setAngle(lerp(t.turn, 0, u)).setScale(lerp(t.startScale, t.landScale, u));
        },
        onComplete: () => {
          X.pending.delete(cell.obj);
          cell.obj._pend = false;
          if (!thunderHasCell(scene, cell)) { g.destroy(); return; }
          thunderPop(scene, X, cell, p, t.landScale, t.landMs, true, g);
          thunderDust(scene, X, p);
          shake(scene, THUNDER.shake.px, THUNDER.shake.ms);
          if (scene.labSnd) {
            scene.labSnd('s_boom', t.landVolume);
            for (let layer = 0; layer < cell.obj.lock; layer++) scene.labSnd('s_block', t.forgeVolume);
          }
        },
      });
    }));
    thunderLater(scene, X, down + THUNDER.cableDelay, () => {
      X.mid = thunderMid(scene, thunderLive(scene, e));
      thunderCable(scene, e, X);
    });
    const landed = () => {
      if (!X.landings.delete(landed)) return;
      X.orbAfter = 0;
      scene._ecIronLanded(e, ev, rel);
    };
    thunderLater(scene, X, end, landed);
    // 鉤子接手後才登記，同步出錯由舊放置流程負責。
    X.landings.add(landed);
    return true;
  }
  function thunderBang(scene, e, kind) {
    const X = e && e._thunderFx;
    if (X && X.flags && X.flags.s7) return emoteShow(scene, e, 'bang', { city: 'thunder', flags: X.flags, full: kind === 'full' });
  }
  function thunderClear(scene, e, X, hit, obj) {
    if (!e._i.cells.some(x => x.obj === obj && x.r === hit.r && x.c === hit.c)) return false;
    const p = scene.cellCenter(hit.r, hit.c), broken = hit.kind === 'break';
    const t = THUNDER.clear, star = e._i.rule, colors = THUNDER.ironColors;
    thunderSparks(scene, X, p, broken ? t.breakCount : t.stripCount, broken ? t.breakDistance : t.stripDistance,
      broken ? [...colors, t.color] : colors);
    thunderMonitor(scene, e, X);
    const short = star >= 2 && hit.wasLit && X.orb && X.orb.alive;
    if (short) thunderShort(scene, e, X, X.mid || p, thunderFoot(e));
    if (short && X.line) { X.line.setStyle('zap'); X.line.shock(); }
    if (X.flags.s7 && short && broken) emoteThunderLater(scene, e, X, THUNDER.short.bangAt, 'short');
    else if (short && broken) thunderLater(scene, X, THUNDER.short.bangAt, () => thunderBang(scene, e, 'short'));
    thunderLock(scene, X, star === 1 ? t.lockOne : t.lockMore);
    if (broken) {
      const g = thunderGhost(scene, X, p, hit.oldLock);
      thunderTween(scene, X, { targets: g, scale: t.breakScale, alpha: 0, angle: t.turn, duration: t.breakMs, onComplete: () => g.destroy() });
      shake(scene, THUNDER.shake.px, THUNDER.shake.ms);
      if (X.flags.s7 && !short) emoteThunderLater(scene, e, X, t.bangDelay, 'full');
      else if (star === 1) thunderLater(scene, X, t.bangDelay, () => thunderBang(scene, e, 'full'));
    } else {
      thunderPop(scene, X, { r: hit.r, c: hit.c, obj }, p, t.stripScale, t.stripMs);
    }
    if (scene.labSnd) {
      scene.labSnd('s_block', broken ? t.breakBlock : t.stripBlock);
      scene.labSnd('s_boom', broken ? t.breakBoom : t.stripBoom);
    }
    thunderWatch(scene, e, X, 0);
    return true;
  }
  function thunderHarden(scene, e, X, ev, delay) {
    const t = THUNDER.harden, snap = e._ecLockSnap;
    const todo = thunderLive(scene, e).filter(x => snap && snap.has(x.obj) && snap.get(x.obj) < x.obj.lock);
    if (!todo.length) return true;
    for (const cell of todo) { cell.obj._vis = snap.get(cell.obj); X.layers.add(cell.obj); }
    const start = () => {
      const wait = Math.max(500, (scene._ecImpactAt || 0) - (scene.time.now || 0) + 80);
      thunderLater(scene, X, wait, () => {
        thunderLock(scene, X, todo.length * t.gap + t.lock);
        thunderMonitor(scene, e, X);
        todo.forEach((cell, k) => {
          const p = scene.cellCenter(cell.r, cell.c);
          if (THUNDER.KEEP_OLD_HARDEN_RING) thunderLater(scene, X, k * t.ringGap, () => {
            if (!thunderHasCell(scene, cell)) return;
            const ring = thunderOwn(scene, X, scene.add.rectangle(p.x, p.y, THUNDER.size, THUNDER.size, t.ringColor, 0))
              .setStrokeStyle(t.ringWidth, t.ringColor, t.ringAlpha).setBlendMode(ADD).setDepth(t.ringDepth);
            thunderTween(scene, X, { targets: ring, scale: t.ringScale, alpha: 0, duration: t.ringMs, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
          });
          for (let d = 0; d < t.beadCount; d++) thunderLater(scene, X, k * t.gap + d * t.beadGap, () => {
            if (!thunderHasCell(scene, cell)) return;
            const a = thunderFoot(e), b = thunderMid(scene, thunderLive(scene, e)) || p;
            const split = Math.hypot(b.x - a.x, b.y - a.y) / (Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(p.x - b.x, p.y - b.y) || 1);
            const orb = thunderOwn(scene, X, scene.add.circle(a.x, a.y, t.beadRadius, t.beadColor)).setDepth(THUNDER.ironDepth);
            const flight = { u: 0 };
            thunderTween(scene, X, { targets: flight, u: 1, duration: t.beadMs, ease: 'Sine.easeIn',
              onUpdate: () => {
                const first = flight.u < split;
                const from = first ? a : b, to = first ? b : p;
                const u = first ? flight.u / split : (flight.u - split) / (1 - split || 1);
                orb.setPosition(lerp(from.x, to.x, u), lerp(from.y, to.y, u));
              },
              onComplete: () => orb.destroy(),
            });
          });
          thunderLater(scene, X, k * t.gap + t.showDelay, () => {
            cell.obj._vis = null;
            X.layers.delete(cell.obj);
            if (!thunderHasCell(scene, cell)) return;
            thunderPop(scene, X, cell, p, t.scale, t.ms);
            thunderSparks(scene, X, p, t.sparks, t.distance, [THUNDER.ironColors[0], THUNDER.ironColors[1], t.beadColor]);
            if (scene.labSnd) scene.labSnd('s_block', t.volume);
            scene._syncIronKi(e);
          });
        });
      });
    };
    if (delay > 0) thunderLater(scene, X, delay, start); else start();
    return true;
  }
  const THUNDER_OP = {
    place: thunderPlace, clear: thunderClear, harden: thunderHarden,
    sync: (scene, e, X) => {
      if (thunderLive(scene, e).length) thunderMonitor(scene, e, X);
      if (X.watch) thunderWatch(scene, e, X, 0);
      thunderOrbsSync(scene, e, X);
      return true;
    },
  };

  function thunderOrbWanted(scene, e) {
    const d = e._i;
    return d.rule >= 2 && !e.dead && !(e.hp <= 0) && e.sprite && e.sprite.scene && !(scene.resultOpen && scene._resultTerminal) &&
      d.cells.length > 0 && !d.cells.some(x => x.obj && x.obj._pend) && scene._ecIronUntouched(e);
  }
  function thunderOrb(scene, e, X, size) {
    const k = THUNDER.orb;
    return makeThreat(scene, { art: k.art, size, owner: X, host: () => {
      const a = anchor(readGame(e));
      return { x: a.threatX, y: a.threatY };
    } });
  }
  function thunderOrbsSync(scene, e, X) {
    const k = THUNDER.orb, now = scene.time.now || 0;
    if (e._ioOrb || e._ioBusy) scene._ecIronOrbClear(e);
    if (X.orbAfter > now || X.shorting) return;
    if (!thunderOrbWanted(scene, e)) {
      if (X.orb) { X.orb.fade(k.fade, k.shrink); X.orb = null; }
      if (X.flags.s8) auraSet(scene, e, 'thunder', -1, X.flags);
      return;
    }
    if (X.orb && X.orb.cellCount === e._i.cells.length) {
      X.orb.charge = e.timer === 1 ? k.urgent : k.charge;
      return;
    }
    const size = fireGeom(scene, e).bm * Math.min(1, k.size + k.perCell * e._i.cells.length);
    if (!X.orb || X.orb.dead) {
      X.orb = thunderOrb(scene, e, X, size);
      X.orb.grow(k.grow);
    } else if (X.orb.goal !== size) {
      X.orb.sizeTo(size, k.fade);
    }
    if (scene.labSnd) scene.labSnd('s_block', k.sound);
    if (X.flags.s8) auraSet(scene, e, 'thunder', auraThunderLevel, X.flags);
    X.orb.cellCount = e._i.cells.length;
    X.orb.charge = e.timer === 1 ? k.urgent : k.charge;
  }
  function thunderEffectFrame(scene, X, x, y, opt) {
    const im = thunderOwn(scene, X, scene.add.image(x, y, opt.art, 0)).setDepth(DEP.hit).setDisplaySize(opt.size, opt.size);
    const state = { u: 0 };
    thunderTween(scene, X, { targets: state, u: 1, duration: opt.frames * 1000 / opt.fps, onUpdate: () => {
      im.setFrame(Math.min(opt.frames - 1, Math.floor(state.u * opt.frames)));
      if (opt.fadeStart && state.u > opt.fadeStart) im.setAlpha((1 - state.u) / (1 - opt.fadeStart));
    }, onComplete: () => im.destroy() });
  }
  function thunderParticles(scene, X, x, y, n, radius, cols, ms = THUNDER.particles.ms) {
    const k = THUNDER.particles;
    for (let i = 0; i < n; i++) {
      const angle = i * Math.PI * 2 / n + rr(-k.jitter, k.jitter), d = rr(k.minTravel, 1) * radius, size = rr(...k.size);
      const o = thunderOwn(scene, X, scene.add.rectangle(x, y, size, size, cols[i % cols.length])).setDepth(DEP.hit).setAngle(rr(0, k.angle));
      thunderTween(scene, X, { targets: o, x: x + Math.cos(angle) * d, y: y + Math.sin(angle) * d, angle: o.angle + rr(-k.spin, k.spin),
        alpha: 0, scale: k.scale, duration: rr(...ms), ease: 'Quad.easeOut', onComplete: () => o.destroy() });
    }
  }
  function thunderAttackGlow(scene, X, x, y, radius, alpha) {
    const k = THUNDER.strike;
    const o = thunderOwn(scene, X, scene.add.circle(x, y, radius, CITY.thunder.col, alpha)).setDepth(DEP.hit).setBlendMode(ADD);
    thunderTween(scene, X, { targets: o, scale: k.glowScale, alpha: 0, duration: k.glowMs, ease: 'Quad.easeOut', onComplete: () => o.destroy() });
  }
  function thunderMotion(scene, X, keys) {
    X.motion = motion(scene, X.e, keys);
  }
  function thunderShort(scene, e, X, from, foot) {
    const orb = X.orb;
    if (!orb || !orb.alive) return;
    X.orb = null;
    X.shorting = true;
    X.shortCable = true;
    const k = THUNDER.short, c = CITY.thunder;
    const pearl = thunderOwn(scene, X, scene.add.circle(from.x, from.y, k.pearl, c.light)).setDepth(DEP.hit);
    thunderTween(scene, X, { targets: pearl, x: foot.x, y: foot.y, duration: k.travel, ease: 'Quad.easeIn', onComplete: () => pearl.destroy() });
    thunderLater(scene, X, k.travel, () => {
      X.shortCable = false;
      thunderEffectFrame(scene, X, foot.x, foot.y, { art: k.spark, size: k.sparkSize, frames: k.frames, fps: k.fps, fadeStart: k.fadeStart });
      thunderTween(scene, X, { targets: orb, sx: THUNDER.orb.shrink, duration: k.shrinkMs });
    });
    thunderLater(scene, X, k.recoilAt, () => {
      const { x, y } = orb.c;
      if (X.flags.s8) auraSet(scene, e, 'thunder', -1, X.flags);
      orb.kill();
      thunderAttackGlow(scene, X, x, y, orb.size * THUNDER.strike.glowRadius, k.glow);
      thunderParticles(scene, X, x, y, k.shards, k.shardRad, c.shard, k.shardMs);
      thunderMotion(scene, X, MOVE.recoil());
      const a = anchor(readGame(e));
      thunderParticles(scene, X, a.x, a.headY, k.headSparks, k.headRad, [c.light, c.col]);
      X.shorting = false;
      thunderOrbsSync(scene, e, X);
    });
    for (let i = 0; i < k.smokeCount; i++) thunderLater(scene, X, k.travel + i * k.smokeEvery, () => {
      const o = thunderOwn(scene, X, scene.add.circle(foot.x, foot.y, k.smokeRadius, k.smoke, k.smokeAlpha));
      o.setDepth(DEP.hit).setScale(k.smokeScale);
      thunderTween(scene, X, { targets: o, y: foot.y - k.smokeRise, alpha: 0, scale: 1, duration: k.smokeMs, onComplete: () => o.destroy() });
    });
  }
  function thunderTurn(scene) {
    return thunderReady(scene) && (scene.enemies || []).some(e => e && e._i && !e.dead);
  }
  function thunderLaunch(scene, e, ev, flags) {
    if (!e._i || !thunderReady(scene) || scene._atkVoid()) return null;
    const k = THUNDER.attack, punish = ev.kind === 'punish';
    const tier = !punish ? k.weak : (e._i.rule > k.boss ? k.boss : k.punish);
    const R = rt(scene), X = thunderState(scene, e, flags), now = scene.time.now || 0, P = atkPlan(tier);
    const added = punish && tier === k.boss ? thunderLive(scene, e).filter(x => e._ecLockSnap && x.obj.lock > e._ecLockSnap.get(x.obj)).length : 0;
    const extra = added ? added * k.hardenCell + k.hardenTail : 0;
    const placed = X.placeEnd > now;
    const start = Math.max(0, (X.placeEnd || 0) - now + (placed ? (e._i.rule < 2 ? k.singleWait : k.orbWait) : 0),
      R.seqEnd - now, R.oldLand + k.afterOld - now - P.I);
    const plan = { kind: 'thunder', tier, P, impact: P.I, e, hpT: true, ep: scene._atkLockEp || 0, owner: X, maxHP: scene.maxHP || 1 };
    aimAt(scene, e, plan);
    thunderLock(scene, X, start + P.total + extra);
    if (scene._tmHoldSet) { scene._tmHoldSet(e, 0, start + P.total + extra); X.attackHeld = true; }
    R.seqEnd = now + start + P.total + extra;
    scene._ecImpactAt = Math.max(scene._ecImpactAt || 0, now + start + P.I + k.impactTail);
    scene._fxEndAt = Math.max(scene._fxEndAt || 0, R.seqEnd);
    X.orbAfter = placed ? X.placeEnd : now + start + P.total;
    if (punish) {
      plan.discharge = clamp(e._i.cells.length || Math.round((ev.raw / Math.max(1, e.atk) - 1) / .5) || 1, 1, 3);
      plan.ball = X.orb;
      X.orb = null;
      if (plan.ball && !plan.ball.dead) { plan.ball.charge = 1; plan.ball.detach(); }
    }
    if (flags.s8 && punish) auraSet(scene, e, 'thunder', () => (scene.time.now || 0) < now + start + P.I ? AURA.large : auraThunderLevel(scene, e), flags);
    thunderLater(scene, X, start + P.total, () => thunderOrbsSync(scene, e, X));
    return { efx: plan, delay: start, dmg: ev.raw, big: punish };
  }
  function thunderAttackVis(scene, e, plan) {
    const X = plan.owner, P = plan.P, tier = plan.tier, k = THUNDER.attack;
    if (X.dead || e.dead || plan.mute || (scene.resultOpen && scene._resultTerminal)) return;
    const later = (delay, fn) => thunderLater(scene, X, delay, () => {
      if (!plan.mute && !e.dead && plan.ep === (scene._atkLockEp || 0)) fn();
    });
    if (tier >= k.punish && scene.labSnd) scene.labSnd('s_clear15', k.punishSound);
    if (scene.labSnd) scene.labSnd('s_clear15', k.volume);
    if (!plan.ball || plan.ball.dead) {
      const size = fireGeom(scene, e).bm * (tier === k.weak ? k.size : 1);
      plan.ball = thunderOrb(scene, e, X, size);
      if (tier !== k.weak) plan.ball.charge = 1;
    }
    if (tier >= k.punish && !quiet(scene)) {
      const v = scene.cameras.main.worldView;
      const dim = thunderOwn(scene, X, scene.add.rectangle(v.centerX, v.centerY, v.width * k.dimScale + k.dimMargin, v.height * k.dimScale + k.dimMargin, k.dimColor));
      dim.setDepth(DEP.dim).setAlpha(0);
      thunderTween(scene, X, { targets: dim, alpha: k.dim[tier - k.punish], duration: k.dimIn, ease: 'Sine.easeInOut' });
      thunderTween(scene, X, { targets: dim, alpha: 0, delay: P.I + k.dimHold, duration: k.dimOut, ease: 'Sine.easeInOut', onComplete: () => dim.destroy() });
    }
    if (tier === k.boss && !quiet(scene)) {
      const R = rt(scene), a = anchor(readGame(e));
      const camera = thunderPart(scene, X, { update() {}, kill() {
        R.parts.delete(camera);
        if (R.thunderCamera === camera) R.thunderCamera = null;
        if (camera.saved && (R.cam === camera.saved || R.camBack === camera.saved)) camReset(scene);
      } });
      R.thunderCamera = camera;
      try { camIn(scene, a.x, e.cy + k.camY, k.camIn); } finally { camera.saved = R.cam; }
      thunderLater(scene, X, k.camHold, () => {
        if (camera.saved && R.cam === camera.saved) camOut(scene, k.camOut, (delay, fn) => thunderLater(scene, X, delay, fn));
      });
      thunderLater(scene, X, k.camHold + k.camOut + k.camTail, () => camera.kill());
    }
    later(P.lean, () => thunderMotion(scene, X, MOVE.strike(tier)));
    later(P.L, () => {
      const b = plan.ball;
      if (!b || b.dead) return;
      if (scene.labSnd) scene.labSnd(['s_fire1', 's_fire2', 's_fire3'][Math.floor(scene.time.now || 0) % 3], k.launchSound);
      const o = b.detach(), x = o.x, y = o.y;
      const state = { u: 0 };
      aimAt(scene, e, plan);
      thunderTween(scene, X, { targets: state, u: 1, duration: P.fly, ease: 'Quad.easeIn', onUpdate: () => {
        o.setPosition(lerp(x, plan.tx, state.u), lerp(y, plan.ty, state.u) - k.arc * Math.sin(Math.PI * state.u));
      }, onComplete: () => b.kill() });
    });
  }
  function thunderImpact(scene, tx, ty, dmg, dodged, plan) {
    if (plan.mute || (scene.resultOpen && scene._resultTerminal)) return true;
    const k = THUNDER.strike, X = plan.owner, tier = plan.tier;
    if (X.dead || !thunderReady(scene)) return false;
    const attack = THUNDER.attack;
    if (plan.discharge && scene.labSnd) scene.labSnd('s_boom', attack.dischargeBase + plan.discharge * attack.dischargeStep);
    if (!dodged) {
      if (scene.labSnd) scene.labSnd('s_player', k.sfx);
      const big = clamp(dmg / Math.max(1, plan.maxHP * k.hpScale), k.minPower, 1), size = k.size + k.sizeGain * big;
      thunderAttackGlow(scene, X, tx, ty - k.dy, size * k.glowRadius, k.glowAlpha);
      thunderEffectFrame(scene, X, tx, ty - k.dy, { ...k, size });
      thunderParticles(scene, X, tx, ty - k.dy, k.sparks + k.sparksGain * tier, k.radius + k.radiusGain * big, CITY.thunder.shard);
    }
    shake(scene, k.shake + k.shakeGain * tier, k.shakeMs + k.shakeMsGain * tier);
    return true;
  }
  function thunderMutePlan(scene, plan) {
    const X = plan.owner, e = plan.e;
    if (!X || X.dead || e.dead) return;
    thunderGuard(scene, X, () => {
      if (plan.ball) plan.ball.kill();
      if (X.motion && X.motion === e._fxSt) scene._fxStateCut(e);
      X.motion = null;
      X.orbAfter = 0;
      if (e._tmHold != null) { e._tmHold = null; e._tmHoldUntil = scene.time.now || 0; }
      thunderOrbsSync(scene, e, X);
    });
  }
  function thunderBadge(scene, e, flags) {
    const g = e.glass, tx = e.turnTx, turn = e.turnG;
    if (!thunderReady(scene) || e.dead || e.hp <= 0 || !g || !g.scene || !tx || !tx.scene || !g.setTexture ||
        !turn || !turn.scene || !has(scene, 'icon_hourglass') || !has(scene, 'icon_cd_skull')) return false;
    const X = thunderState(scene, e, flags);
    const fresh = !X.badgeState;
    if (fresh) {
      const parent = turn.parentContainer, index = parent ? parent.getIndex(turn) : -1;
      const B = X.badgeState = { depth: turn.depth, parent, index, next: parent && parent.list[index + 1], key: e._glassKey,
        art: g.texture && g.texture.key, angle: g.angle, tint: g.isTinted ? g.tintTopLeft : null, tintFill: g.tintFill };
      const badge = makeBadge(scene, e, B, cfg => thunderTween(scene, X, cfg));
      const kill = badge.kill;
      badge.kill = () => {
        kill();
        X.badgeState = null;
        if (!turn.scene) return;
        if (B.parent && turn.parentContainer !== B.parent) {
          if (!B.parent.scene) { turn.destroy(); return; }
          const i = B.next ? B.parent.getIndex(B.next) : -1;
          B.parent.addAt(turn, i < 0 ? B.index : i);
        }
        turn.setDepth(B.depth);
        if (e.dead) return;
        if (g.scene) {
          if (B.art && has(scene, B.art)) g.setTexture(B.art);
          const size = B.key && B.key !== 'icon_hourglass' ? THUNDER.badge.oldSkull : THUNDER.badge.oldSize;
          g.setDisplaySize(size, size).setAngle(B.angle);
          if (B.tint != null) {
            if (B.tintFill) g.setTintFill(B.tint); else g.setTint(B.tint);
          }
          e._glassKey = B.key;
        }
        if (tx.scene) {
          const tm = Number(tx.text);
          tx.setColor(tm <= 1 ? '#ff5a4a' : tm === 2 ? '#ffc24a' : '#eaf3ff');
        }
        scene._ecHealGlass(e, false);
      };
      thunderPart(scene, X, badge);
      if (B.parent) { B.parent.remove(turn); scene.add.existing(turn); }
      turn.setDepth(DEP.badge);
    }
    const skull = !!e._ironSk && !scene.resultOpen && !scene.dive;
    const key = skull ? 'icon_cd_skull' : 'icon_hourglass';
    if (fresh || e._glassKey !== key) {
      scene.tweens.killTweensOf(g);
      g.clearTint();
      g.setTexture(key).setDisplaySize(BADGE.ICON, BADGE.ICON).setAngle(0);
      e._glassKey = key;
    }
    if (skull || e._skAura) scene._ecSkullAura(e, THUNDER.badge.aura);
    return true;
  }

  function thunderShockLine(scene, X, from, to, width, duration, hold) {
    const k = THUNDER.shock;
    const count = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / k.segment));
    const pts = [from];
    for (let i = 1; i < count; i++) {
      const f = i / count;
      pts.push({ x: lerp(from.x, to.x, f) + rr(-k.offset, k.offset), y: lerp(from.y, to.y, f) + rr(-k.offset, k.offset) });
    }
    pts.push(to);
    const g = thunderOwn(scene, X, scene.add.graphics()).setDepth(DEP.hit);
    const s = { u: 0 };
    thunderTween(scene, X, { targets: s, u: 1, duration, onUpdate: () => {
      const u = s.u * count, i = Math.floor(u), cut = pts.slice(0, i + 1);
      if (i < count) cut.push({ x: lerp(pts[i].x, pts[i + 1].x, u - i), y: lerp(pts[i].y, pts[i + 1].y, u - i) });
      g.clear().lineStyle(width * k.haloWidth, k.outer, 1).strokePoints(cut)
        .lineStyle(width, k.chargeColors[0], 1).strokePoints(cut);
    }, onComplete: () => { if (hold) thunderLater(scene, X, hold, () => g.destroy()); else g.destroy(); } });
  }

  function thunderShock(scene, flags, events, target) {
    if (!thunderReady(scene)) return false;
    const k = THUNDER.shock, charged = new Map(), cells = [];
    for (const ev of events) {
      if (ev.t !== 'shock') continue;
      const e = scene.enemies[ev.e];
      if (!e || e.dead || !e._i || e._i.rule < k.minRule || charged.has(e)) continue;
      const live = thunderLive(scene, e);
      if (!live.length) continue;
      charged.set(e, live);
      for (const c of live) cells.push({ ...scene.cellCenter(c.r, c.c), cell: c, e });
    }
    if (!cells.length) return false;
    const X = thunderState(scene, cells[0].e, flags), multi = cells.length > 1;
    const delay = k.gather + (multi ? k.merge : 0), ms = delay + k.travel;
    let lead = cells[0], distance = Infinity;
    for (const p of cells) {
      const d = Math.hypot(target.x - p.x, target.y - p.y);
      if (d < distance) { lead = p; distance = d; }
    }
    thunderLock(scene, X, multi ? THUNDER.LOCK_SHOCK_N : THUNDER.LOCK_SHOCK_1);
    for (const e of charged.keys()) {
      const owner = thunderState(scene, e, flags);
      const label = owner.arcCharge = {};
      thunderMonitor(scene, e, owner);
      thunderLater(scene, owner, k.gather, () => { if (owner.arcCharge === label) owner.arcCharge = null; });
    }
    for (const p of cells) {
      const c = p.cell, lock = c.obj._vis == null ? c.obj.lock : c.obj._vis;
      const g = thunderGhost(scene, X, p, lock);
      const redraw = () => { if (!scene.board[c.r] || scene.board[c.r][c.c] !== c.obj) g.setVisible(false); };
      thunderTween(scene, X, { targets: g, scale: k.swell[lock >= k.thick ? 1 : 0], duration: k.pulse, yoyo: true,
        onUpdate: redraw, onComplete: () => g.destroy() });
      for (let i = 0; i < k.gatherCount; i++) {
        const a = rnd() * Math.PI * 2, r = rr(...k.gatherRadius), edge = rr(...k.gatherSize);
        const particle = thunderOwn(scene, X, scene.add.rectangle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, edge, edge, k.chargeColors[i % k.chargeColors.length])).setDepth(DEP.hit);
        thunderTween(scene, X, { targets: particle, x: p.x, y: p.y, scale: 0, duration: k.gather, onComplete: () => particle.destroy() });
      }
    }
    if (scene.labSnd) scene.labSnd('s_boom', k.soundVolume);
    if (multi) thunderLater(scene, X, k.gather, () => {
      for (const p of cells) if (p !== lead) thunderShockLine(scene, X, p, lead, k.mergeWidth, k.merge, k.hold);
    });
    thunderLater(scene, X, delay, () => thunderShockLine(scene, X, lead, target, k.lineWidth, k.travel, 0));
    return { X, ms };
  }

  function thunderShockImpact(scene, tx, ty, efx) {
    if (efx.mute || (scene.resultOpen && scene._resultTerminal)) return true;
    const X = efx.shockOwner, k = THUNDER.shock;
    if (!X || X.dead) return false;
    for (let i = 0; i < k.hitCount; i++) {
      const a = i * Math.PI * 2 / k.hitCount, s = rr(...k.hitSize);
      const q = thunderOwn(scene, X, scene.add.rectangle(tx, ty, s, s, k.chargeColors[i % k.chargeColors.length])).setDepth(DEP.hit);
      thunderTween(scene, X, { targets: q, x: tx + Math.cos(a) * k.hitRadius, y: ty + Math.sin(a) * k.hitRadius,
        alpha: 0, duration: k.hitFade, onComplete: () => q.destroy() });
    }
    shake(scene, k.shakePx, k.shakeMs);
    const g = thunderOwn(scene, X, scene.add.graphics()).setDepth(DEP.hit);
    g.lineStyle(k.lineWidth, k.chargeColors[0], 1).lineBetween(tx - k.afterHalfWidth, ty, tx + k.afterHalfWidth, ty);
    thunderLater(scene, X, k.afterLine, () => g.destroy());
    if (scene.labSnd) scene.labSnd('s_player', k.hitSound);
    return true;
  }

  function thunderShockText(scene, X, tx, ty, raw, first) {
    const k = THUNDER.shock;
    if (!X || X.dead) return false;
    scene._ecBarText(tx, ty + k.textDy, '−' + raw, k.textColor, k.textPx);
    if (!first) {
      if (scene.labSnd) scene.labSnd('s_player', k.hitSound);
      return true;
    }
    for (const o of [scene.pHpGfx, scene.pHpFrame, scene.pHpTxt]) {
      if (!o) continue;
      const x = o.x;
      scene.tweens.killTweensOf(o);
      thunderTween(scene, X, { targets: o, x: x + k.hpJoltDx, duration: k.hpJoltMs, yoyo: true,
        repeat: k.hpJoltRepeat, onComplete: () => o.setX(x), onStop: () => { o.x = x; } });
    }
    return true;
  }

  // windAura: on, off, fat (e._ecFat), fat-settle (WIND.fat.auraStep).
  const WIND = {
    SPIKE_DRAW: true, REFED_SPIKES: true, ABS_BALL: false,
    frameHalf: 21.5, arm: 9, stroke: 1.5, outline: 2.7, green: 0x7ae902, edge: 0x0a3c06, edgeAlpha: .6,
    cornerSpike: 8, sideSpike: 6.4, spikeHalf: 1.5, spikeGap: 2.5, spikeRule: 3,
    markDepth: 41.6, lineDepth: 40.45, storePad: 2, seekDy: 40,
    breath: 600, breathScale: 1.07, emptyBreath: 1300, emptyFrom: .7, emptyTo: .42,
    lookX: 8, lookY: 5, lookAngle: 7, lookThreshold: 12, lookMs: 90, returnMs: 200,
    extendMs: 150, closeAt: 240, closeMs: 120, storeCloseMs: 200, markMs: 360, enterScale: 1.5, markVolume: .3, storeMarkVolume: .35,
    emptyBounce: 1.16, emptyBounceMs: 55, twitchAt: 110, twitchMs: 100, twitchPx: 4,
    refedAt: 190, refedBounce: 1.12, refedBounceMs: 50, flowAt: 270,
    oldSkullSize: 26, oldGlassSize: 22, warnTurn: 2,
    cardHop: 6, cardHopMs: 55, retireMs: 160, eatRetireMs: 180, eatScale: .35,
    empty: { sound: .35, orbSound: .45, time: 1110, counterTime: 1390, secondTime: 480, peckAt: 810, fastPeckAt: 180,
      angerAt: 210, secondTwitchAt: 90, gatherAt: 810, counterGatherAt: 1090, orbAt: 980, counterOrbAt: 1260,
      secondGrowAt: 380, secondGrowMs: 100, jump: 24, jumpHalf: 82.5, jumpCount: 2 },
    refed: { partial: 380, last: 650, angerAt: 100, shrinkMs: 140, fadeMs: 110, scatter: 12,
      radius: [36, 60], scatterMs: 300, jump: 22, up: 110, down: 100, squash: .92, compress: 45, bounce: 130 },
    anger: { depth: 68.3, dx: 15, dy: -8, size: [34, 28], out: 90, normal: 260, quick: 160 },
    orb: { art: 'fx_en_wind_orb8', charge: .4, urgent: .85, single: .85, partial: .68, double: .95,
      growFrom: .35, growPeak: 1.16, growUp: 70, growDown: 60 },
    gather: { count: 16, leafEvery: 4, leafSize: 15, radius: [58, 92], ms: 110, counterMs: 170, spiral: 5 },
    food: { fly: 520, gap: 380, bossGap: 1150, tail: 280, bossTail: 640, happyAt: 580, bossHappyAt: 940,
      gust: 'fx_en_wind_gust8', gustFps: 16, gustFrames: 8, gustSize: 54, gustAlpha: .9, leafChance: .25, leafSize: 12,
      leafMs: 360, mouth: .12, storeLand: 420, radius: 16, spiral: 5, spin: 540, windupMs: 200, backX: -3.6, backY: -4.8, backAngle: -4.2,
      backScale: 1.03, chewScale: 1.07, chewMs: 80, cardY: 6, cardAngle: -4, cardSparks: 6, cardRadius: 20,
      cardShakeX: 2, cardShakeY: -1.6, cardShakeMs: 70, volume: .4, storeVolume: .5, eatVolume: .5 },
    peck: { art: 'fx_en_wind_blade', total: [280, 200], windup: [110, 70], fly: [120, 100], dy: [28, 20], scale: [1.14, 1.1],
      blade: [46, 38], hit: [70, 56], spin: 360, sparks: 8, radius: 26, shake: 1.5, shakeMs: 90 },
    hungry: { sound: .55, chargeSound: .6, launchSound: .6, tier: 2, total: 1437, afterOld: 60, arc: 30, dim: .20, dimIn: 360, dimHold: 600, dimOut: 420,
      dimScale: 2, dimMargin: 200, shade: 0x000000, hit: 120, gain: 110, sparks: 26, radius: 40, radiusGain: 30,
      shake: 8, shakeMs: 260, hpScale: .56, minPower: .15, glow: .25, glowScale: 2.6, glowMs: 360 },
    hit: { art: 'fx_en_wind_slash16', frames: 16, fps: 30, dy: 10, sfx: .8 },
    fat: { sound: .5, at: 780, peak: 1.11, first: 1.04, step: .04, rise: 8, settle: 400, later: 240, auraStep: 190,
      raise: 220, lower: 180, leaves: 4, size: 15, smoke: 4, smokeEvery: 60, smokeCol: 0xd0e0d4, smokeRadius: 7, drift: 22, oldStep: .08 },
    leaf: ['fx_en_wind_leaf_1', 'fx_en_wind_leaf_2'], leafDepth: 41.8, particleRadius: 2.5, particleMs: 300,
  };
  function windReady(scene) {
    return ASSETS.s6.every(a => has(scene, a.key)) &&
      ['icon_hourglass', 'icon_cd_skull', 'icon_anger'].every(key => has(scene, key));
  }
  function windState(scene, e, flags) {
    if (e._windFx) return e._windFx;
    const R = rt(scene);
    if (!R.wind) R.wind = new Set();
    const X = { e, flags, marks: new Map(), parts: new Set(), objects: new Set(), twists: new Set(),
      tms: new Set(), restores: new Set(), landings: new Set(), anger: [], generation: scene._ecDGen, life: scene._deadG || 0 };
    R.wind.add(X);
    e._windFx = X;
    windPart(scene, X, { update: () => {
      if (!windLive(scene, e, X)) { windDrop(scene, e); return; }
      if (!windReady(scene)) throw Error('Wind assets unavailable');
      if (scene._ecDuckOn && !scene.dive) { windSync(scene, e, X); windMoodSync(scene, e, X); }
    }, kill() {} });
    return X;
  }
  function windLive(scene, e, X) {
    return !!(e._d && e._ecVis && !e.dead && e.hp > 0 && e.sprite && e.sprite.active && e.card &&
      !scene._atkStale && !(scene.resultOpen && scene._resultTerminal) &&
      scene.sys && scene.sys.isActive() && (!X || (X.generation === scene._ecDGen && X.life === (scene._deadG || 0))));
  }
  function windGuard(scene, X, fn) {
    if (X.dead) return false;
    if (!X.flags.s6) { windDrop(scene, X.e); return false; }
    return guard(X.flags, 's6', () => {
      if (!windLive(scene, X.e, X)) { windDrop(scene, X.e); return false; }
      return fn();
    }, false, () => windFail(scene));
  }
  function windPart(scene, X, part) {
    const update = part.update, kill = part.kill, R = rt(scene);
    part.update = dt => windGuard(scene, X, () => update.call(part, dt));
    part.kill = (...args) => { X.parts.delete(part); R.parts.delete(part); kill.call(part, ...args); };
    X.parts.add(part);
    R.parts.add(part);
    return part;
  }
  function windOwn(scene, X, o) {
    X.objects.add(o);
    o.once('destroy', () => X.objects.delete(o));
    return o;
  }
  function windLater(scene, X, ms, fn) {
    const t = scene.time.delayedCall(ms, () => {
      X.tms.delete(t);
      windGuard(scene, X, fn);
    });
    X.tms.add(t);
    return t;
  }
  function windTween(scene, X, cfg) {
    const done = cfg.onComplete, update = cfg.onUpdate;
    if (update) cfg.onUpdate = (...args) => windGuard(scene, X, () => update(...args));
    cfg.onComplete = (...args) => {
      X.twists.delete(t);
      if (done) windGuard(scene, X, () => done(...args));
    };
    const t = scene.tweens.add(cfg);
    X.twists.add(t);
    return t;
  }
  function windStop(X, tween) {
    if (tween && X.twists.delete(tween)) tween.stop();
  }
  function windLock(scene, ms, e) {
    const R = rt(scene), X = e && e._windFx;
    if (!R.windLocks) R.windLocks = new Set();
    const unlock = takeLock(scene, ms, () => { try { release(); } catch (err) {} });
    const release = () => {
      if (!R.windLocks.delete(release)) return;
      R.locks.delete(unlock);
      if (X) X.restores.delete(release);
      unlock();
    };
    if (unlock) {
      R.windLocks.add(release);
      if (X) X.restores.add(release);
    }
    return release;
  }
  function windUnlock(scene) {
    const R = scene._efxRt;
    if (R && R.windLocks) for (const release of [...R.windLocks]) {
      try { release(); } catch (err) {}
    }
  }
  function windDrop(scene, e) {
    if (e && e._efxEmote) emoteDrop(scene, e, 'wind');
    if (e && e._efxAura && e._efxAura.city === 'wind') auraDrop(scene, e);
    const X = e && e._windFx;
    if (!X) return;
    X.dead = true;
    e._windFx = null;
    const R = scene._efxRt;
    if (R && R.wind) R.wind.delete(X);
    const safe = fn => { try { fn(); } catch (err) {} };
    for (const t of X.tms) safe(() => t.remove(false));
    for (const t of X.twists) safe(() => t.stop());
    for (const p of [...X.parts]) safe(() => p.kill());
    for (const o of [...X.objects]) safe(() => { if (o.scene) o.destroy(); });
    for (const restore of X.restores) safe(restore);
    if (X.motion && X.motion === e._fxSt) safe(() => scene._fxStateCut(e));
    if (e.dead && X.generation === scene._ecDGen && X.life === (scene._deadG || 0)) {
      for (const land of X.landings) safe(land);
    }
  }
  function windFail(scene) {
    const R = scene._efxRt;
    if (R && R.windEndAt) R.windFailedUntil = Math.max(R.windFailedUntil || 0, R.windEndAt);
    if (R && R.wind) for (const X of [...R.wind]) {
      const landings = [...X.landings];
      windDrop(scene, X.e);
      for (const land of landings) { try { land(); } catch (err) {} }
      if (X.grew) {
        try { scene._ecFatSet(X.e, 1 + WIND.fat.oldStep * (X.e._ecFat | 0)); } catch (err) {}
      }
    }
    windUnlock(scene);
    try { scene._ecDuckSync(); } catch (err) {}
    try { scene._ecIronSkTick(); } catch (err) {}
  }
  function windRun(scene, flags, e, op, ...args) {
    return guard(flags, 's6', () => {
      if (!windLive(scene, e)) { windDrop(scene, e); return false; }
      if (!windReady(scene)) {
        if (e._windFx) throw Error('Wind assets unavailable');
        return false;
      }
      if (e._windFx && !windLive(scene, e, e._windFx)) windDrop(scene, e);
      const X = windState(scene, e, flags);
      if (op === 'badge') return windBadge(scene, e, X, args[0]);
      if (!scene._ecDuckOn || scene.dive) return false;
      if (op === 'mark') windMark(scene, e, X, ...args);
      else if (op === 'reveal') {
        Object.keys(e._ecVis.marks).forEach((slot, i) => windMark(scene, e, X, slot, true, i * WIND.markMs));
      } else if (op === 'eat') windEatMark(scene, X, ...args);
      else if (op === 'emptyStore') windHopCard(scene, X, args[0]);
      else if (op === 'empty') windEmpty(scene, e, X, ...args);
      else if (op === 'refed') windRefed(scene, e, X, ...args);
      else if (op === 'food') windFood(scene, e, X, args[0]);
      else if (op === 'fat') windFat(scene, e, X, args[0]);
      else if (op === 'happy') windBang(scene, e, X, 'happy', false);
      else if (op === 'round') windRound(scene, X);
      windSync(scene, e, X);
      windMoodSync(scene, e, X);
      return true;
    }, false, () => windFail(scene));
  }
  function windHopCard(scene, X, slot) {
    const m = X.e._ecVis.marks[slot], card = m && m.store && scene.teamCards && scene.teamCards[m.idx];
    if (!card) return;
    const targets = [card.rect, card.txt, card.img].filter(o => o && o.scene);
    const offset = { y: 0 };
    let previous = 0;
    const apply = y => {
      for (const o of targets) if (o.scene) o.y += y - previous;
      previous = y;
    };
    const restore = () => { apply(0); X.restores.delete(restore); };
    X.restores.add(restore);
    windTween(scene, X, { targets: offset, y: -WIND.cardHop, duration: WIND.cardHopMs,
      yoyo: true, ease: 'Sine.easeInOut', onUpdate: () => apply(offset.y), onComplete: restore });
  }
  function windBadge(scene, e, X, lethal) {
    const g = e.glass, tx = e.turnTx, turn = e.turnG;
    if (!g || !g.scene || !tx || !tx.scene || !turn || !turn.scene) return false;
    if (!X.badgeState) {
      const oldKey = e._glassKey, oldSkull = !!e._countdownSk, oldDepth = turn.depth;
      const part = makeBadge(scene, e, X, cfg => windTween(scene, X, cfg));
      const kill = part.kill;
      part.kill = () => {
        e._glassKey = oldKey;
        kill();
        if (turn.scene) turn.setDepth(oldDepth);
        if (e.dead) return;
        if (g.scene) {
          const key = oldSkull ? (has(scene, 'icon_cd_skull') ? 'icon_cd_skull' : 'icon_skull') : oldKey || 'icon_hourglass';
          const size = oldSkull ? WIND.oldSkullSize : WIND.oldGlassSize;
          g.setTexture(key).setDisplaySize(size, size).setAngle(0);
        }
        if (tx.scene) {
          const tm = parseInt(tx.text, 10);
          tx.setColor(tm <= 1 ? '#ff5a4a' : tm === WIND.warnTurn ? '#ffc24a' : '#eaf3ff');
        }
      };
      X.badgeState = windPart(scene, X, part);
      scene.tweens.killTweensOf(g);
      turn.setDepth(DEP.badge);
      g.setAngle(0);
    }
    const key = lethal() ? 'icon_cd_skull' : 'icon_hourglass';
    if (X.badgeKey !== key) {
      X.badgeKey = e._glassKey = key;
      g.setTexture(key).setDisplaySize(BADGE.ICON, BADGE.ICON);
    }
    return true;
  }
  function windAnchor(e) {
    const a = anchor(readGame(e));
    return { x: a.threatX, y: a.threatY };
  }
  function windTarget(scene, m) {
    if (!m.store) return scene.cellCenter(m.r, m.c);
    if (m.gone) return null;
    const card = scene.teamCards && scene.teamCards[m.idx], so = card && card.storeObj;
    if (!so || !so.scene || !so.active || !so.visible) return null;
    const b = so.getBounds();
    return { x: b.centerX, y: b.centerY, hw: b.width / 2 + WIND.storePad, hh: b.height / 2 + WIND.storePad };
  }
  function windDrawFrame(g, p, spike) {
    const w = WIND, x = p.hw || w.frameHalf, y = p.hh || w.frameHalf;
    g.clear();
    for (const [width, col, alpha] of [[w.outline, w.edge, w.edgeAlpha], [w.stroke, w.green, 1]]) {
      g.lineStyle(width, col, alpha);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        g.beginPath();
        g.moveTo(sx * x, sy * (y - Math.min(y, w.arm)));
        g.lineTo(sx * x, sy * y);
        g.lineTo(sx * (x - Math.min(x, w.arm)), sy * y);
        g.strokePath();
      }
    }
    if (!spike) return;
    g.fillStyle(w.green, 1);
    const triangle = (px, py, dx, dy, len) => {
      const bx = px + dx * w.spikeGap, by = py + dy * w.spikeGap;
      g.fillTriangle(bx - dy * w.spikeHalf, by + dx * w.spikeHalf,
        bx + dy * w.spikeHalf, by - dx * w.spikeHalf, bx + dx * len, by + dy * len);
    };
    for (const sx of [-1, 1]) {
      triangle(sx * x, 0, sx, 0, w.sideSpike);
      triangle(0, sx * y, 0, sx, w.sideSpike);
      for (const sy of [-1, 1]) triangle(sx * x, sy * y, sx * Math.SQRT1_2, sy * Math.SQRT1_2, w.cornerSpike);
    }
  }
  function windBreath(scene, X, M) {
    const w = WIND, g = M.frame;
    g.setScale(1).setAlpha(M.empty ? w.emptyFrom : 1);
    M.frameTween = windTween(scene, X, { targets: g,
      ...(M.empty ? { alpha: w.emptyTo, duration: w.emptyBreath } : { scale: w.breathScale, duration: w.breath }),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  function windLine(scene, e, X, M, extend) {
    const w = WIND;
    M.extension = extend ? 0 : 1;
    M.line = windPart(scene, X, makeLine(scene, {
      style: M.empty ? 'wait' : 'preview', color: CITY.wind.light, depth: w.lineDepth,
      ownGraphics: o => windOwn(scene, X, o), animate: cfg => windTween(scene, X, cfg), stop: t => X.twists.delete(t),
      from: () => windAnchor(e), to: () => {
        const a = windAnchor(e), p = M.point, dx = p.x - a.x, dy = p.y - a.y;
        const len = Math.hypot(dx, dy) || 1, j = M.twitch || 0;
        return { x: a.x + dx * M.extension - dy * j / len, y: a.y + dy * M.extension + dx * j / len };
      },
    }));
    if (extend) windTween(scene, X, { targets: M, extension: 1, duration: w.extendMs, ease: 'Quad.easeOut' });
  }
  function windFrame(scene, X, M, enter) {
    const w = WIND;
    const g = M.frame = windOwn(scene, X, scene.add.graphics()).setDepth(w.markDepth).setPosition(M.point.x, M.point.y);
    windDrawFrame(g, M.point, M.spike);
    if (!enter) { windBreath(scene, X, M); return; }
    g.setScale(w.enterScale).setAlpha(0);
    M.frameTween = windTween(scene, X, { targets: g, scale: 1, alpha: 1, duration: M.mark.store ? w.storeCloseMs : w.closeMs,
      ease: 'Back.easeOut', onComplete: () => windBreath(scene, X, M) });
  }
  function windMark(scene, e, X, slot, silent, delay) {
    const m = e._ecVis.marks[slot], p = m && windTarget(scene, m);
    if (!p) return;
    const w = WIND, M = windRecord(scene, X, String(slot), m, p);
    M.entering = true;
    const valid = () => !M.eaten && X.marks.get(String(slot)) === M && e._ecVis.marks[slot] === m;
    const start = () => {
      if (!valid()) return;
      const dx = M.point.x - windAnchor(e).x, side = dx < 0 ? -1 : 1;
      X.motion = motion(scene, e, [[w.lookMs, Math.abs(dx) > w.lookThreshold ? side * w.lookX : 0, w.lookY, side * w.lookAngle, 1, 1, 'qo'],
        [w.closeAt, Math.abs(dx) > w.lookThreshold ? side * w.lookX : 0, w.lookY, side * w.lookAngle, 1, 1],
        [w.closeAt + w.returnMs, 0, 0, 0, 1, 1, 'si']]);
      windLater(scene, X, w.lookMs, () => { if (valid()) windLine(scene, e, X, M, true); });
      windLater(scene, X, w.closeAt, () => {
        if (!valid()) return;
        M.entering = false;
        M.empty = !!m.empty;
        M.spike = windSpike(X, m);
        if (M.line) M.line.setStyle(M.empty ? 'wait' : 'preview');
        windFrame(scene, X, M, true);
        if (!silent && scene.labSnd) scene.labSnd('s_clear15', m.store ? w.storeMarkVolume : w.markVolume);
      });
    };
    if (delay > 0) windLater(scene, X, delay, start); else start();
  }
  function windRecord(scene, X, slot, mark, point) {
    const old = X.marks.get(slot);
    if (old) windRetire(scene, X, slot, WIND.retireMs);
    const M = { mark, point, empty: !!mark.empty, spike: windSpike(X, mark) };
    X.marks.set(slot, M);
    return M;
  }
  function windSpike(X, mark) {
    return WIND.SPIKE_DRAW && X.e._d.rule >= WIND.spikeRule && !mark.empty;
  }
  function windRetire(scene, X, slot, ms) {
    const M = X.marks.get(slot);
    if (!M) return;
    X.marks.delete(slot);
    M.transition = (M.transition || 0) + 1;
    windStop(X, M.frameTween);
    if (M.eaten) return;
    if (M.line) M.line.destroy(ms);
    if (M.frame && M.frame.scene) windTween(scene, X, { targets: M.frame, alpha: 0,
      duration: ms, onComplete: () => M.frame.destroy() });
  }
  function windEatMark(scene, X, r, c, store) {
    for (const M of X.marks.values()) {
      const m = M.mark;
      if (!M.eaten && (store ? m.store : !m.store && m.r === r && m.c === c)) {
        M.eaten = true;
        M.transition = (M.transition || 0) + 1;
        windStop(X, M.frameTween);
        if (M.line) M.line.destroy(WIND.eatRetireMs);
        if (M.frame && M.frame.scene) windTween(scene, X, { targets: M.frame, alpha: 0, scale: WIND.eatScale, duration: WIND.eatRetireMs,
          onComplete: () => M.frame.destroy() });
      }
    }
  }
  function windFrameTransition(scene, X, M, empty, timing) {
    const w = WIND, line = M.line, g = M.frame;
    M.empty = empty;
    const stamp = M.transition = (M.transition || 0) + 1;
    const live = () => M.transition === stamp && g.scene && line && !line.dead;
    const bounce = () => {
      if (!live()) return;
      windStop(X, M.frameTween);
      M.spike = timing && timing.withCounter ? M.spike : windSpike(X, M.mark) && (empty || w.REFED_SPIKES);
      windDrawFrame(g, M.point, M.spike);
      g.setScale(1).setAlpha(empty ? w.emptyFrom : 1);
      M.frameTween = windTween(scene, X, { targets: g, scale: empty ? w.emptyBounce : w.refedBounce,
        duration: empty ? w.emptyBounceMs : w.refedBounceMs, yoyo: true, onComplete: () => windBreath(scene, X, M) });
    };
    if (empty) {
      bounce();
      windLater(scene, X, timing && timing.second ? w.empty.secondTwitchAt : w.twitchAt, () => {
        if (!live()) return;
        M.twitch = w.twitchPx;
        windTween(scene, X, { targets: M, twitch: -w.twitchPx, duration: w.twitchMs / 2, yoyo: true,
          onComplete: () => { M.twitch = 0; } });
        windLater(scene, X, w.twitchMs / 2, () => { if (live()) line.setStyle('wait'); });
      });
    } else {
      windLater(scene, X, w.refedAt, bounce);
      windLater(scene, X, w.flowAt, () => { if (live()) line.setStyle('preview'); });
    }
  }
  function windSync(scene, e, X) {
    const marks = e._ecVis.marks;
    for (const [slot, M] of X.marks) {
      if (marks[slot] !== M.mark) windRetire(scene, X, slot, WIND.retireMs);
    }
    for (const slot of Object.keys(marks)) {
      const m = marks[slot], p = windTarget(scene, m);
      let M = X.marks.get(slot);
      if (!p) { if (M && !M.eaten) windRetire(scene, X, slot, WIND.retireMs); continue; }
      if (M && !M.entering && !M.eaten && (!M.frame.scene || M.line.dead)) {
        windRetire(scene, X, slot, WIND.retireMs);
        M = null;
      }
      if (!M) {
        M = windRecord(scene, X, slot, m, p);
        windLine(scene, e, X, M, false);
        windFrame(scene, X, M, false);
      }
      if (M.eaten) continue;
      if (M.frame && M.frame.scene) {
        M.frame.setPosition(p.x, p.y);
        if (p.hw !== M.point.hw || p.hh !== M.point.hh) windDrawFrame(M.frame, p, M.spike);
        if (M.empty !== !!m.empty) windFrameTransition(scene, X, M, !!m.empty);
      }
      M.point = p;
    }
    if (X.flags.s8) auraWindSync(scene, e, X);
  }
  function windBang(scene, e, X, kind, full) {
    if (X && X.flags && X.flags.s7) return emoteShow(scene, e, kind, { city: 'wind', flags: X.flags, full });
  }
  function windAura(scene, e, X, what) {
    if (!X.flags.s8) return;
    if (what === 'fat' || what === 'fat-settle') auraWindLayer(scene, e, e._ecFat | 0, X.flags, false);
    auraSet(scene, e, 'wind', auraWindLevel, X.flags);
  }

  function windBallSize(scene, e, count) {
    const k = WIND.orb;
    return fireGeom(scene, e).bm * (e._d.rule < WIND.spikeRule || !count ? k.single : count > 1 ? k.double : k.partial);
  }
  function windBall(scene, e, X, count, grow) {
    const k = WIND.orb;
    const b = makeThreat(scene, { art: k.art, size: windBallSize(scene, e, count), host: () => {
      const a = anchor(readGame(e));
      return { x: a.threatX, y: a.threatY };
    }, hooks: { own: o => windOwn(scene, X, o), tween: cfg => windTween(scene, X, cfg), part: p => windPart(scene, X, p) } });
    b.charge = windTurn(e) <= 1 ? k.urgent : k.charge;
    b.foodCount = count;
    if (grow) {
      b.sx = k.growFrom;
      windTween(scene, X, { targets: b, sx: k.growPeak, duration: k.growUp, ease: 'Quad.easeOut', onComplete: () => {
        if (!b.dead) windTween(scene, X, { targets: b, sx: 1, duration: k.growDown, ease: 'Sine.easeInOut' });
      } });
      b.update(0);
    }
    return b;
  }
  function windTurn(e) { return e._tmHold != null ? e._tmHold : e.timer; }
  function windResize(scene, X, b, count, duration, ease) {
    windStop(X, b.szTw);
    b.foodCount = count;
    b.goal = windBallSize(scene, X.e, count);
    b.szTw = windTween(scene, X, { targets: b, size: b.goal, duration, ease });
  }
  function windAnger(scene, e, X, count, fast) {
    const k = WIND.anger, a = anchor(readGame(e));
    while (X.anger.length > count) {
      const o = X.anger.pop();
      windTween(scene, X, { targets: o, scale: 0, duration: k.out, ease: 'Quad.easeIn', onComplete: () => o.destroy() });
    }
    while (X.anger.length < count) {
      const i = X.anger.length, size = k.size[i];
      const o = windOwn(scene, X, scene.add.image(a.iconX + i * k.dx, a.iconY + i * k.dy, 'icon_anger'));
      o.setDepth(k.depth).setDisplaySize(size, size);
      const x = o.scaleX, y = o.scaleY;
      o.setScale(0);
      X.anger.push(o);
      windTween(scene, X, { targets: o, scaleX: x, scaleY: y, duration: fast ? k.quick : k.normal, ease: 'Back.easeOut' });
    }
  }
  function windAngerCount(e) { return clamp(e._ecVis.anger | 0, 0, WIND.anger.size.length); }
  function windMoodSync(scene, e, X) {
    const a = anchor(readGame(e)), count = windAngerCount(e);
    if (!X.angerPending) windAnger(scene, e, X, count, false);
    X.anger.forEach((o, i) => o.setPosition(a.iconX + i * WIND.anger.dx, a.iconY + i * WIND.anger.dy));
    if (!count && X.ball && !X.ballHeld) { X.ball.kill(); X.ball = null; }
    if (!X.ball && count && !X.ballPending && !X.ballHeld) X.ball = windBall(scene, e, X, count, false);
    if (X.ball && !X.ballHeld) {
      X.ball.charge = windTurn(e) === 1 ? WIND.orb.urgent : WIND.orb.charge;
      if (!X.ballPending && X.ball.foodCount !== count) {
        windStop(X, X.ball.szTw);
        X.ball.foodCount = count;
        X.ball.size = X.ball.goal = windBallSize(scene, e, count);
      }
    }
  }
  function windParticles(scene, X, x, y, count, radius, ms, color) {
    for (let i = 0; i < count; i++) {
      const a = i * Math.PI * 2 / count, d = rr(radius[0], radius[1]);
      const o = windOwn(scene, X, scene.add.circle(x, y, WIND.particleRadius, Array.isArray(color) ? color[i % color.length] : color)).setDepth(DEP.hit);
      windTween(scene, X, { targets: o, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => o.destroy() });
    }
  }
  function windLeaf(scene, X, index, x, y, size) {
    return windOwn(scene, X, scene.add.image(x, y, WIND.leaf[index % WIND.leaf.length])).setDepth(WIND.leafDepth).setDisplaySize(size, size);
  }
  function windGather(scene, e, X, counter) {
    const k = WIND.gather, a = anchor(readGame(e));
    for (let i = 0; i < k.count; i++) {
      const angle = i * Math.PI * 2 / k.count, r = rr(k.radius[0], k.radius[1]), p = { u: 0 };
      const x = a.threatX + Math.cos(angle) * r, y = a.threatY + Math.sin(angle) * r;
      const o = i % k.leafEvery === 0 ? windLeaf(scene, X, i / k.leafEvery, x, y, k.leafSize) :
        windOwn(scene, X, scene.add.circle(x, y, WIND.particleRadius, CITY.wind.shard[i % CITY.wind.shard.length])).setDepth(DEP.hit);
      windTween(scene, X, { targets: p, u: 1, duration: counter ? k.counterMs : k.ms, ease: 'Quad.easeIn', onUpdate: () => {
        const v = angle + p.u * Math.PI * k.spiral, d = r * (1 - p.u);
        o.setPosition(a.threatX + Math.cos(v) * d, a.threatY + Math.sin(v) * d);
      }, onComplete: () => o.destroy() });
    }
  }
  function windEmpty(scene, e, X, slot, still, second, counter) {
    const k = WIND.empty, M = X.marks.get(String(slot));
    if (M && M.frame && !M.eaten && M.empty !== true) windFrameTransition(scene, X, M, true, { second, withCounter: counter });
    const mark = e._ecVis.marks[slot];
    if (mark && mark.store && !still) windHopCard(scene, X, slot);
    if (still) return;
    if (scene.labSnd) windLater(scene, X, second ? k.secondTwitchAt : WIND.twitchAt, () => scene.labSnd('s_block', k.sound));
    const mood = X.angerPending = {}, build = X.ballPending = {};
    windLater(scene, X, second ? k.fastPeckAt : k.angerAt, () => {
      if (X.angerPending !== mood) return;
      if (!second) {
        windBang(scene, e, X, 'angry', false);
        if (scene.labSnd) scene.labSnd('s_clear15', k.sound);
        const keys = [];
        for (let i = 0; i < k.jumpCount; i++) {
          keys.push([(i * 2 + 1) * k.jumpHalf, 0, -k.jump, 0, 1, 1, 'qo'], [(i + 1) * 2 * k.jumpHalf, 0, 0, 0, 1, 1, 'qi']);
        }
        X.motion = motion(scene, e, keys);
      }
      windAnger(scene, e, X, windAngerCount(e), true);
      X.angerPending = null;
    });
    const gather = second ? k.secondGrowAt : counter ? k.counterGatherAt : k.gatherAt;
    if (!second || counter) windLater(scene, X, gather, () => {
      if (X.ballPending !== build) return;
      if (M && M.frame && M.frame.scene && counter) {
        M.spike = false;
        windDrawFrame(M.frame, M.point, false);
      }
      if (!second) windGather(scene, e, X, e._d.rule >= WIND.spikeRule);
    });
    windLater(scene, X, second ? k.secondGrowAt : counter ? k.counterOrbAt : k.orbAt, () => {
      if (X.ballPending !== build) return;
      X.ballPending = null;
      const count = windAngerCount(e);
      if (!count) return;
      if (X.ball) windResize(scene, X, X.ball, count, k.secondGrowMs, 'Back.easeOut');
      else {
        X.ball = windBall(scene, e, X, count, true);
        if (scene.labSnd) scene.labSnd('s_clear15', k.orbSound);
        if (!(e._ecFat > 0)) windAura(scene, e, X, 'on');
      }
    });
  }
  function windRefed(scene, e, X, slot, still, last) {
    if (still) return;
    const k = WIND.refed, mood = X.angerPending = {};
    X.ballPending = null;
    if (X.ball && !X.ballHeld) {
      if (!last) windResize(scene, X, X.ball, windAngerCount(e), k.shrinkMs, 'Linear');
      else {
        const b = X.ball;
        X.ball = null;
        windParticles(scene, X, b.c.x, b.c.y, k.scatter, k.radius, k.scatterMs, CITY.wind.shard);
        windStop(X, b.szTw);
        b.fade(k.fadeMs);
        if (!(e._ecFat > 0)) windAura(scene, e, X, 'off');
      }
    }
    windLater(scene, X, k.angerAt, () => {
      if (X.angerPending !== mood) return;
      windAnger(scene, e, X, windAngerCount(e), false);
      X.angerPending = null;
    });
    if (last) windLater(scene, X, k.partial, () => {
      if (windAngerCount(e)) return;
      windBang(scene, e, X, 'heart', true);
      X.motion = motion(scene, e, [[k.up, 0, -k.jump, 0, 1, 1, 'qo'], [k.up + k.down, 0, 0, 0, 1, 1, 'qi'],
        [k.up + k.down + k.compress, 0, 0, 0, 1, k.squash, 'qo'], [k.up + k.down + k.compress + k.bounce, 0, 0, 0, 1, 1, 'bo']]);
    });
  }
  function windRound(scene, X) {
    X.angerPending = X.ballPending = null;
    windAnger(scene, X.e, X, 0, false);
    if (X.ball && !X.ballHeld) { X.ball.kill(); X.ball = null; }
  }
  function windFood(scene, e, X, food) {
    const k = WIND.food, land = () => {
      if (!X.landings.delete(land)) return;
      if (food.onLand) food.onLand();
    };
    if (!food.iron) X.landings.add(land);
    const ghost = food.ghost && windOwn(scene, X, food.ghost);
    windEatMark(scene, X, food.r, food.c, food.store);
    if (food.iron) return;
    if (scene.labSnd) scene.labSnd('s_boom', food.store ? k.storeVolume : k.volume);
    if (food.store) {
      const o = food.card && food.card.storeObj;
      if (o && o.scene) {
        const targets = [food.card.rect, food.card.txt, food.card.img].filter(x => x && x.scene);
        const p = { dy: 0, angle: 0, u: 0 }, prev = { dy: 0, angle: 0, dx: 0, y: 0 };
        const down = () => {
          for (const x of targets) if (x.scene) { x.y += p.dy - prev.dy; x.angle += p.angle - prev.angle; }
          prev.dy = p.dy; prev.angle = p.angle;
        };
        const shake = () => {
          if (!o.scene) return;
          const dx = p.u * k.cardShakeX, y = p.u * k.cardShakeY;
          o.setPosition(o.x + dx - prev.dx, o.y + y - prev.y);
          prev.dx = dx; prev.y = y;
        };
        const restore = () => {
          p.dy = p.angle = p.u = 0; down(); shake(); X.restores.delete(restore);
        };
        X.restores.add(restore);
        windTween(scene, X, { targets: p, u: 1, duration: k.cardShakeMs, yoyo: true, ease: 'Sine.easeInOut',
          onUpdate: shake });
        windTween(scene, X, { targets: p, dy: k.cardY, angle: k.cardAngle, duration: k.cardShakeMs, yoyo: true,
          ease: 'Sine.easeInOut', onUpdate: down, onComplete: restore });
      }
      windParticles(scene, X, food.x, food.y, k.cardSparks, [k.cardRadius, k.cardRadius], WIND.particleMs, food.col);
    }
    if (food.store) windLater(scene, X, k.storeLand, () => {
      land();
      if (scene.labSnd) scene.labSnd('s_block', k.eatVolume);
    });
    const a = anchor(readGame(e)), mouthY = a.headY + a.dispH * k.mouth;
    X.motion = motion(scene, e, [[k.windupMs, k.backX, k.backY, k.backAngle, k.backScale, k.backScale, 'si'],
      [k.fly, 0, 0, 0, 1, 1, 'si']]);
    const g = windOwn(scene, X, scene.add.image(food.x, food.y, k.gust, 0));
    g.setDepth(DEP.hit).setDisplaySize(k.gustSize, k.gustSize).setAlpha(k.gustAlpha);
    g.setRotation(Math.atan2(mouthY - food.y, a.x - food.x));
    const p = { u: 0 };
    const scale = ghost ? ghost.scaleX : 1;
    let prevX = food.x, prevY = food.y, leaf = 0;
    windTween(scene, X, { targets: p, u: 1, duration: k.fly, onUpdate: () => {
      const u = p.u * p.u, v = p.u * k.fly, d = (1 - u) * k.radius, angle = u * k.spiral * Math.PI;
      const x = lerp(food.x, a.x, u) + Math.cos(angle) * d, y = lerp(food.y, mouthY, u) + Math.sin(angle) * d;
      g.setPosition(x, y).setFrame(Math.floor(v * k.gustFps / 1000) % k.gustFrames);
      if (x !== prevX || y !== prevY) g.setRotation(Math.atan2(y - prevY, x - prevX));
      prevX = x; prevY = y;
      if (ghost && ghost.scene) ghost.setPosition(x, y).setAngle(k.spin * u).setScale(lerp(scale, scale * WIND.eatScale, u));
      if (rnd() < k.leafChance) {
        const o = windLeaf(scene, X, leaf++, x, y, k.leafSize);
        windTween(scene, X, { targets: o, alpha: 0, duration: k.leafMs, onComplete: () => o.destroy() });
      }
    }, onComplete: () => {
      g.destroy();
      if (ghost && ghost.scene) ghost.destroy();
      land();
      if (!food.store && scene.labSnd) scene.labSnd('s_block', k.eatVolume);
      const keys = [], n = e._d.rule > WIND.spikeRule ? 2 : 1;
      for (let i = 0; i < n; i++) keys.push([(i * 2 + 1) * k.chewMs, 0, 0, 0, k.chewScale, k.chewScale, 'qo'],
        [(i + 1) * 2 * k.chewMs, 0, 0, 0, 1, 1, 'qi']);
      X.motion = motion(scene, e, keys);
    } });
  }
  function windFat(scene, e, X, layer) {
    const k = WIND.fat, a = anchor(readGame(e)), first = layer === 1;
    X.grew = true;
    e._ecFat = layer;
    scene._ecFatInstall(e);
    if (scene.labSnd) scene.labSnd('s_heal', k.sound);
    const p = { f: e.sprite._fatF || 1 }, final = k.first + k.step * (layer - 1);
    if (first) {
      X.motion = motion(scene, e, [[k.raise, 0, -k.rise, 0, 1, 1, 'qo'], [k.settle, 0, 0, 0, 1, 1, 'si']]);
      for (let i = 0; i < k.leaves; i++) {
        const x = a.x + (i - (k.leaves - 1) / 2) * k.size, o = windLeaf(scene, X, i, x, a.threatY, k.size);
        windTween(scene, X, { targets: o, y: o.y - k.drift, alpha: 0, duration: k.settle, onComplete: () => o.destroy() });
      }
    } else for (let i = 0; i < k.smoke; i++) windLater(scene, X, i * k.smokeEvery, () => {
      const x = a.x + (i - (k.smoke - 1) / 2) * k.size;
      const o = windOwn(scene, X, scene.add.circle(x, a.threatY, k.smokeRadius, k.smokeCol)).setDepth(DEP.hit);
      windTween(scene, X, { targets: o, y: o.y - k.drift, alpha: 0, duration: k.settle, onComplete: () => o.destroy() });
    });
    const resize = (f, duration, ease, next) => windTween(scene, X, { targets: p, f, duration, ease,
      onUpdate: () => scene._ecFatSet(e, p.f), onComplete: () => { scene._ecFatSet(e, f); if (next) next(); } });
    if (first) resize(k.peak, k.raise, 'Quad.easeOut', () => resize(final, k.lower, 'Sine.easeInOut'));
    else resize(final, k.later, 'Back.easeOut');
    windAura(scene, e, X, 'fat');
    windLater(scene, X, k.auraStep, () => windAura(scene, e, X, 'fat-settle'));
  }
  function windStrikePlan(opt) {
    const i = opt.fast ? 1 : 0, k = WIND.peck;
    return opt.peck ? { lean: 0, L: k.windup[i], I: k.windup[i] + k.fly[i], fly: k.fly[i], total: k.total[i] } : atkPlan(WIND.hungry.tier);
  }
  function windReserve(scene, e, opt) {
    const R = rt(scene), now = scene.time.now || 0, P = windStrikePlan(opt);
    const start = Math.max(opt.base || 0, R.seqEnd - now, R.oldLand + WIND.hungry.afterOld - now - P.I);
    const endAt = now + start + P.total;
    R.seqEnd = endAt;
    R.windEndAt = endAt;
    scene._fxEndAt = Math.max(scene._fxEndAt || 0, endAt);
    return { start, landAt: now + start + P.I, endAt };
  }
  function windSlotActive(scene, failed) {
    const R = scene._efxRt;
    return !!(R && R.alive && R.scene === scene && (failed ? R.windFailedUntil : R.windEndAt) > (scene.time.now || 0));
  }
  function windLaunch(scene, flags, e, opt) {
    if (!flags.s6) return false;
    return guard(flags, 's6', () => {
      if (!windLive(scene, e) || (scene._atkVoid && scene._atkVoid())) return false;
      if (!windReady(scene)) {
        if (e._windFx) throw Error('Wind assets unavailable');
        return false;
      }
      const X = windState(scene, e, flags), now = scene.time.now || 0, h = WIND.hungry;
      const i = opt.fast ? 1 : 0, P = windStrikePlan(opt);
      if (opt.visual === false && X.hitPlan) {
        const plan = X.hitPlan;
        return { ...plan, visual: false, impact: Math.max(0, plan.landAt - now) };
      }
      const slot = opt.slot || windReserve(scene, e, opt), start = Math.max(0, slot.landAt - now - P.I);
      const plan = { kind: 'wind', e, owner: X, tier: h.tier, hpT: true, P, peck: opt.peck,
        fast: i, visual: opt.visual, start, impact: start + P.I, total: start + P.total,
        ep: scene._atkLockEp || 0, totalRaw: opt.totalRaw, maxHP: opt.maxHP || scene.maxHP || 1, landAt: now + start + P.I };
      aimAt(scene, e, plan);
      windLock(scene, plan.total, e);
      if (!opt.peck) {
        X.hitPlan = plan;
        X.ballHeld = plan;
        plan.ball = X.ball;
        X.ball = null;
        if (plan.ball && !plan.ball.dead) {
          windStop(X, plan.ball.szTw);
          plan.ball.charge = 1;
        }
        windLater(scene, X, plan.total, () => {
          if (X.hitPlan === plan) X.hitPlan = null;
          if (X.ballHeld === plan) X.ballHeld = null;
        });
      }
      return plan;
    }, false, () => windFail(scene));
  }
  function windAttackVis(scene, e, plan) {
    const X = plan.owner, P = plan.P, pk = WIND.peck, h = WIND.hungry, i = plan.fast;
    if (X.dead || plan.visual === false || plan.mute) return;
    const later = (ms, fn) => windLater(scene, X, plan.start + ms, () => {
      if (!plan.mute && plan.ep === (scene._atkLockEp || 0)) fn();
    });
    later(0, () => {
      if (plan.peck) {
        X.motion = motion(scene, e, [[P.L, 0, pk.dy[i], 0, pk.scale[i], pk.scale[i], 'qi'],
          [P.total, 0, 0, 0, 1, 1, 'si']]);
      } else {
        windAura(scene, e, X, 'off');
        if (scene.labSnd) scene.labSnd('s_clear15', h.sound);
        if (quiet(scene)) return;
        const v = scene.cameras.main.worldView;
        const o = windOwn(scene, X, scene.add.rectangle(v.centerX, v.centerY, v.width * h.dimScale + h.dimMargin,
          v.height * h.dimScale + h.dimMargin, h.shade)).setDepth(DEP.dim).setAlpha(0);
        plan.dim = o;
        plan.dimIn = windTween(scene, X, { targets: o, alpha: h.dim, duration: h.dimIn, ease: 'Sine.easeInOut' });
        plan.dimOut = windTween(scene, X, { targets: o, alpha: 0, delay: P.I + h.dimHold, duration: h.dimOut,
          ease: 'Sine.easeInOut', onComplete: () => o.destroy() });
      }
    });
    later(P.lean, () => {
      if (scene.labSnd) scene.labSnd('s_clear15', h.chargeSound);
      if (!plan.peck) X.motion = motion(scene, e, MOVE.strike(h.tier));
    });
    later(P.L, () => {
      const a = anchor(readGame(e));
      if (scene.labSnd) scene.labSnd(['s_fire1', 's_fire2', 's_fire3'][Math.floor(scene.time.now || 0) % 3], h.launchSound);
      let o, b;
      if (plan.peck) {
        const x = a.x, y = a.headY + a.dispH * WIND.food.mouth;
        o = windOwn(scene, X, scene.add.image(x, y, pk.art)).setDepth(DEP.proj).setDisplaySize(pk.blade[i], pk.blade[i])
          .setRotation(Math.atan2(plan.ty - y, plan.tx - x));
        plan.blade = o;
      } else {
        b = plan.ball && !plan.ball.dead ? plan.ball : windBall(scene, e, X, 0, false);
        plan.ball = b;
        b.charge = 1;
        o = b.detach();
      }
      const x = o.x, y = o.y, angle = o.angle, p = { u: 0 };
      windTween(scene, X, { targets: p, u: 1, duration: P.fly, ease: 'Quad.easeIn', onUpdate: () => {
        if (!o.scene) return;
        const arc = plan.peck ? 0 : h.arc * Math.sin(Math.PI * p.u);
        o.setPosition(lerp(x, plan.tx, p.u), lerp(y, plan.ty, p.u) - arc);
        if (plan.peck) o.setAngle(angle + pk.spin * p.u);
      }, onComplete: () => { if (b) b.kill(); else if (o.scene) o.destroy(); } });
    });
  }
  function windImpact(scene, x, y, dmg, dodged, plan) {
    const X = plan.owner, k = WIND.hit, h = WIND.hungry, pk = WIND.peck;
    if (plan.visual === false || plan.mute || (scene.resultOpen && scene._resultTerminal)) return true;
    if (X.dead || !windReady(scene)) return false;
    if (!dodged) {
      if (scene.labSnd) scene.labSnd('s_player', k.sfx);
      const big = clamp((plan.totalRaw || dmg) / Math.max(1, plan.maxHP * h.hpScale), h.minPower, 1);
      const size = plan.peck ? pk.hit[plan.fast] : h.hit + h.gain * big;
      const radius = plan.peck ? pk.radius : h.radius + h.radiusGain * big;
      const ty = y - k.dy;
      if (!plan.peck) {
        const o = windOwn(scene, X, scene.add.circle(x, ty, size / 2, CITY.wind.col, h.glow)).setDepth(DEP.hit).setBlendMode(ADD);
        windTween(scene, X, { targets: o, scale: h.glowScale, alpha: 0, duration: h.glowMs, onComplete: () => o.destroy() });
      }
      const im = windOwn(scene, X, scene.add.image(x, ty, k.art, 0)).setDepth(DEP.hit).setDisplaySize(size, size), p = { u: 0 };
      windTween(scene, X, { targets: p, u: 1, duration: k.frames * 1000 / k.fps, onUpdate: () => {
        im.setFrame(Math.min(k.frames - 1, Math.floor(p.u * k.frames)));
      }, onComplete: () => im.destroy() });
      windParticles(scene, X, x, ty, plan.peck ? pk.sparks : h.sparks, [radius, radius], WIND.particleMs, CITY.wind.shard);
    }
    shake(scene, plan.peck ? pk.shake : h.shake, plan.peck ? pk.shakeMs : h.shakeMs);
    return true;
  }
  function windMutePlan(scene, plan) {
    const X = plan.owner;
    if (!X || X.dead) return;
    windGuard(scene, X, () => {
      if (plan.ball && !plan.ball.dead) plan.ball.kill();
      windStop(X, plan.dimIn);
      windStop(X, plan.dimOut);
      if (plan.dim && plan.dim.scene) plan.dim.destroy();
      if (plan.blade && plan.blade.scene) plan.blade.destroy();
      if (X.motion && X.motion === plan.e._fxSt) scene._fxStateCut(plan.e);
      if (X.ballHeld === plan) X.ballHeld = null;
      windMoodSync(scene, plan.e, X);
    });
  }
  // waterAura: 'small' 憤怒、'large' 孤身、'off' 解除。
  const WATER = {
    KEEP_SKULL_AURA: false, depthFx: DEP.burst, msPerSecond: 1000,
    lonelyIn: 560, dropDepthBase: 9.9, dropDepthFly: 68.1,
    drop: { w: 18, h: 21.6, gap: 23, tipGap: 1, bob: 1, get max() { return typeof EnemyCore !== 'undefined' && EnemyCore.TUNING && EnemyCore.TUNING.REVIVE_MAX > 0 ? EnemyCore.TUNING.REVIVE_MAX : 2; }, clearance: 1.5, buttonY: 40,
      buttonR: 23, hpW: 40, hpH: 9, bobMs: 900, grow: 360, stagger: 120, fade: 380, exitScale: 2,
      edge: 1.3, highlight: 1.8, shineX: -2.8, shineY: 11 },
    lonely: { rageAt: 390, ballAt: 550, end: 910, look: [[110,-7,0,-7,1,1,'si'],[260,7,0,7,1,1,'si'],[370,0,0,0,1,1,'si']],
      small: .62, low: .35, high: .8, grow: 420, expand: 320, reset: 260, fade: 110 },
    heavy: { normal: 2, boss: 3, sparks: 10, sparkGain: 8, shake: 2, shakeGain: 3, ms: 140, msGain: 60, sparkDist: [.6, 1], sparkFade: [320, 460],
      dim: [.20,.26], dimIn: 360, dimHold: 600, dimOut: 420, dimScale: 3, dimMargin: 400,
      camY: 60, camIn: 300, camHold: 1100, camOut: 380 },
    revive: { rise: 16, scale: 1.8, lift: 180, arc: 54, fly: 380, stand: 260, end: 1200,
      stagger: 130, castStagger: 150, standGrow: 360, tail: 40, frames: 16, fps: 26, size: 1.4,
      sound: .8, castSound: .85, standSound: .45, key: 'fx_en_revive_splash16' },
    heal: { duration: 1550, rageAt: 1350, raise: 200, hold: 560, returnMs: 200, dy: -14, scale: 1.05,
      orbDy: -2, orbSize: 48, grow: 320, launch: 620, fade: 200, fadeScale: 1.3,
      lightW: 22, lightH: 7, lightAlpha: .95, lightCenter: 0xe8f6ff, lightSpread: 8, arc: 36,
      lightOffsets: [0, -1, 1], fly: 340, gap: 70, laneGap: 45, receive: 980, receiveScale: .95,
      frames: 16, fps: 24, bounce: 140, bounceDy: -10, hpColor: 0x9dff8a, hpHeight: 7,
      hpWait: 350, hpFade: 900, textTail: 1340, textDy: -20, textSize: 26, textColor: '#74e09a', textStroke: '#0b4a22',
      chargeSound: .45, receiveSound: .75 },
    rescue: { duration: 1240, fall: 200, fallX: 8, fallY: 8, fallAngle: 16, sparks: 10, radius: 30,
      lean: 220, leanX: 9, leanAngle: 6, leanMs: 130, leanHold: 140, launch: 360, land: 700,
      fly: 340, width: 20, endScale: .9, alpha: .75, firstFrames: 4, rise: 810, riseMs: 160,
      hopMs: 130, hopY: -10, hopScale: 1.1, pop: 210, popFrames: 3, fade: 100, fallbackY: 40,
      cardDelay: 1400, chargeSound: .4, landSound: .85, legacyRageDelay: 520, legacyFuryDelay: 220 },
    attack: { tier: 1, normalSize: .5, rageSize: .7, grow: 150, charge: .4, arc: 30, afterOld: 60,
      layers: [[.5, .55], [.38, 1], [.22, 1]], hitDy: -10, frames: 16, fps: 30,
      width: 120, widthGain: 110, hpScale: .56, minPower: .15, sparks: 18, radius: 40, radiusGain: 30,
      shake: 5, shakeMs: 200, glow: .25, glowScale: 2.6, glowMs: 360,
      chargeSound: .6, shotSound: .6, hitSound: .8, shots: ['s_fire1', 's_fire2', 's_fire3'] },
    particle: { size: 5, ms: 360, endScale: .2 },
    badge: { oldGlass: 22, oldSkull: 26, stroke: '#1a0d05', strokeWidth: 6, color: '#eaf3ff',
      hotColor: '#ff5a4a', warnColor: '#ffc24a', warn: 2, bump: 1.5, bumpMs: 220,
      hot: [260, .14, 4], idle: [700, .05, 1.5] },
    symDepth: DEP.badge + .1,
    // Aura (step 8) and dizzy (step 7) are timing hooks only.
    rage: { enter: 260, sync: 160, exit: 100, at: 220, boost: 176, settle: 144, restore: 300,
      uplift: -8, idleY: -2, scale: 1.11, idleScale: 1.04, furySound: .6, sound: .45, cardDelay: 900 },
    cast: { size: .95, pulse: .6, grow: 420, width: 6, get hits() { return typeof EnemyCore !== 'undefined' && EnemyCore.TUNING && EnemyCore.TUNING.CAST_HITS > 0 ? EnemyCore.TUNING.CAST_HITS : 2; }, edge: 16, colMin: 1, colMax: 3,
      ringFade: 260, hands: 520, breath: 1800, alphaMin: .01, alphaBase: .9, alphaSwing: .1,
      crossCount: 4, crossIn: 5, crossOut: 10, crossBorder: 7, crossWidth: 4, dropDepth: .2,
      dropDist: .7, dropY: 10, dropAngle: 25, dropDirection: .5, dropMs: 380, steamMin: 36, steamFps: 14, steamFrames: 8,
      shrink: .72, shrinkMs: 260, freeze: 100, hitLock: 320, breakLock: 500, dizzyAt: 140,
      shake: 3, shakeMs: 140, shards: 14, shardRad: [.6, 1], shardMs: [320, 460],
      shardSize: [5, 9], shardWobble: .3, shardAngle: 90, shardSpin: 120, shardEndScale: .5,
      shardStroke: 1.5, shardEdge: 0x2a1208, shardEdgeAlpha: .9, breakSteam: 1.2,
      healFade: 200, reviveFade: 320, quietFade: 420, cardDelay: 500, chargeSound: .5,
      hitSound: .5, oldBreakAt: 170, oldReviveFlight: 360, oldHealFlight: 340, breakSound: .6, reviveBreakSound: .5, shotSound: .5 },
    art: { orb: 'fx_en_heal_orb8', receive: 'fx_en_heal_receive16', bubble: 'fx_en_rescue_bubble8',
      bomb: 'fx_en_water_bomb8', burst: 'fx_en_water_bomb_burst16', cannon: 'fx_en_water_cannon16',
      glass: 'icon_hourglass', skull: 'icon_cd_skull', anger: 'icon_anger', cast: 'fx_en_cast_circle8', steam: 'fx_en_steam_hiss8' },
  };
  function waterReady(scene) {
    const a = WATER.art;
    return [a.orb, a.receive, a.bubble, a.bomb, a.burst, a.cannon, a.glass, a.skull].every(key => has(scene, key));
  }
  function waterCastReady(scene) { return has(scene, WATER.art.cast) && has(scene, WATER.art.steam); }
  function waterVisualLive(e) { return !!(e && !e.dead && e.sprite && e.sprite.active); }
  function waterLive(e) { return waterVisualLive(e) && e.hp > 0; }
  function waterState(scene, e, flags) {
    const R = rt(scene), previous = e._waterFx;
    if (previous && (previous.generation !== scene._ecDGen || previous.life !== scene._deadG)) waterExpire(scene, previous);
    if (e._waterFx) return e._waterFx;
    if (!R.water) R.water = new Set();
    const X = { e, flags, generation: scene._ecDGen, life: scene._deadG, jobs: new Set() };
    R.water.add(X);
    e._waterFx = X;
    return X;
  }
  function waterJob(scene, X, live) {
    const J = { X, live, parts: new Set(), objects: new Set(), tms: new Set(), tweens: new Set(),
      restores: new Set(), onFail: new Set() };
    X.jobs.add(J);
    waterPart(scene, J, { update() {}, kill() {} });
    return J;
  }
  function waterGuard(scene, J, fn) {
    if (J.dead) return false;
    const X = J.X;
    if (!X.flags.s4 || X.generation !== scene._ecDGen || X.life !== scene._deadG) {
      waterExpire(scene, X);
      return false;
    }
    return guard(X.flags, 's4', () => {
      if (!J.live()) { waterClose(scene, J); return false; }
      return fn();
    }, false, () => waterFail(scene));
  }
  function waterPart(scene, J, part) {
    const R = rt(scene);
    const wrapper = { update: dt => waterGuard(scene, J, () => {
      if (part.dead) { J.parts.delete(wrapper); R.parts.delete(wrapper); return; }
      part.update(dt);
    }), kill: () => part.kill() };
    J.parts.add(wrapper);
    R.parts.add(wrapper);
    return part;
  }
  function waterOwn(J, o) {
    J.objects.add(o);
    o.once('destroy', () => J.objects.delete(o));
    return o;
  }
  function waterLater(scene, J, ms, fn) {
    const t = scene.time.delayedCall(ms, () => {
      J.tms.delete(t);
      waterGuard(scene, J, fn);
    });
    J.tms.add(t);
    return t;
  }
  function waterTween(scene, J, cfg) {
    const t = scene.tweens.add({ ...cfg,
      onUpdate: cfg.onUpdate && (() => waterGuard(scene, J, cfg.onUpdate)),
      onComplete: () => { J.tweens.delete(t); if (cfg.onComplete) waterGuard(scene, J, cfg.onComplete); },
    });
    J.tweens.add(t);
    return t;
  }
  function waterSafe(fn) { try { fn(); } catch (err) {} }
  function waterLock(scene, J, ms, done) {
    const R = rt(scene);
    let unlock;
    const release = () => {
      if (!J.restores.delete(release)) return;
      R.locks.delete(unlock);
      unlock();
    };
    takeLock(scene, ms, () => {
      waterSafe(release);
      if (done) waterGuard(scene, J, done);
    }, rel => { unlock = rel; J.restores.add(release); }, fn => waterLater(scene, J, ms, fn));
    return release;
  }
  function waterClose(scene, J, failed) {
    if (J.dead) return;
    J.dead = true;
    const R = scene._efxRt;
    J.X.jobs.delete(J);
    for (const t of J.tms) waterSafe(() => t.remove(false));
    for (const t of J.tweens) waterSafe(() => t.stop());
    for (const p of J.parts) { R.parts.delete(p); waterSafe(p.kill); }
    for (const o of [...J.objects]) waterSafe(() => { if (o.scene) o.destroy(); });
    for (const restore of J.restores) waterSafe(restore);
    if (failed) for (const fn of J.onFail) waterSafe(fn);
    if (!J.X.jobs.size) waterDropState(scene, J.X);
  }
  function waterDropState(scene, X, failed) {
    if (X.e._waterFx === X && X.e._efxAura) auraDrop(scene, X.e);
    if (X.e._waterFx === X) X.e._waterFx = null;
    scene._efxRt.water.delete(X);
    for (const J of [...X.jobs]) waterClose(scene, J, failed);
  }
  function waterExpire(scene, X) {
    const resume = X.flags.s4 && X.generation === scene._ecDGen && X.life !== scene._deadG &&
      !(scene.resultOpen && scene._resultTerminal);
    const wave = X.flags.s4 && X.generation !== scene._ecDGen && !(scene.resultOpen && scene._resultTerminal);
    const tails = [...X.jobs].map(J => resume ? J.onLife : wave ? J.onWave : null).filter(Boolean);
    waterDropState(scene, X);
    for (const tail of tails) guard(X.flags, 's4', tail, null, () => waterFail(scene));
  }
  function waterDetachedJob(scene, X) {
    // Death effects survive the enemy drop, but still belong to the scene and s4.
    const detached = { ...X, jobs: new Set() };
    scene._efxRt.water.add(detached);
    return waterJob(scene, detached, () => true);
  }
  function waterDrop(scene, e, failed) {
    if (e && e._efxEmote) emoteDrop(scene, e, 'water');
    if (e && e._efxAura && e._efxAura.city === 'water') auraDrop(scene, e);
    if (e && e._waterFx) waterDropState(scene, e._waterFx, failed);
  }
  function waterDropScene(scene, wave) {
    const R = scene._efxRt;
    if (!R || !R.water) return;
    for (const X of [...R.water]) {
      const tails = wave && X.flags.s4 && !(scene.resultOpen && scene._resultTerminal)
        ? [...X.jobs].map(J => J.onWave).filter(Boolean) : [];
      waterDropState(scene, X);
      for (const tail of tails) guard(X.flags, 's4', tail, null, () => waterFail(scene));
    }
  }
  function waterFail(scene, fallback) {
    const R = scene._efxRt;
    const states = R && R.water ? [...R.water] : [];
    if (R && R.water) R.waterFailedUntil = R.waterEndAt;
    const active = states.filter(X => X.e._waterFx === X).map(X => ({ e: X.e, cast: X.cast, rage: X.rage, drops: X.drops && X.drops.length }));
    for (const X of states) waterDropState(scene, X, true);
    for (const m of scene.enemies || []) {
      if (!m._revPend) continue;
      waterSafe(() => {
        try { scene._lnRise(m); } finally { m._revPend = false; m.dispHp = null; }
      });
    }
    for (const X of active) {
      const e = X.e;
      if (!waterLive(e) || !e._h) continue;
      if (X.drops) waterSafe(() => scene._lnDropSync(e));
      if (e._lnShown && e._h.lonely) waterSafe(() => scene._lnBallSync(e));
      if (X.rage && e._ecRage) waterSafe(() => scene._ecRageSync(e));
      const cast = e._h.cast;
      if (cast && X.cast && !X.cast.pending && e !== (fallback && fallback.e)) {
        waterSafe(() => waterLegacyCast(scene, e, cast.type, cast.left));
      }
    }
    if (fallback) waterSafe(() => waterLegacyCast(scene, fallback.e, fallback.type, fallback.left));
  }
  function waterLegacyCast(scene, e, type, left) {
    if (e._ecCast || !e.sprite) return;
    if (type === 'revive') scene._buildReviveCast(e, left, true);
    else scene._buildHealCast(e, left, true);
  }
  function waterRun(scene, flags, e, op, ...args) {
    let fallback, committed = false;
    const handled = guard(flags, 's4', () => {
      if (!e || (op !== 'rescue' && !e._h)) return false;
      if (scene.resultOpen && scene._resultTerminal && (op === 'dropSync' || op === 'ballSync' || op === 'lonelyOn' || op === 'lonelySchedule' || op === 'lonelyOff' || op === 'afterAttack' || op === 'revive')) {
        waterDrop(scene, e);
        if (op === 'revive') args[0].forEach(m => { m._revPend = false; m.dispHp = null; });
        return true;
      }
      if (op === 'castDeath') {
        const C = e._waterFx && e._waterFx.cast;
        if (!C || C.ended) return false;
        fallback = { e, type: C.type, left: C.ring.left };
        return waterCastDeath(scene, e._waterFx);
      }
      if (op === 'castLegacy') {
        const C = e._waterFx && e._waterFx.cast;
        if (C) {
          const left = C.ring.left, type = C.type;
          waterClose(scene, C.J);
          if (waterLive(e) && !(scene.resultOpen && scene._resultTerminal)) waterLegacyCast(scene, e, type, left);
        }
        return false;
      }
      if (op === 'lateCastHit' || op === 'lateCastBreak') {
        const [C, ev] = args;
        if (!C.J.dead || (C.J.X.generation === scene._ecDGen && C.J.X.life === scene._deadG) ||
            e._ecCast || e.dead || (scene.resultOpen && scene._resultTerminal)) return false;
        if (op === 'lateCastHit') waterSound(scene, 's_block', WATER.cast.hitSound);
        if ((op === 'lateCastBreak' || !ev.left) && !C.broken) {
          C.broken = true;
          const audio = waterDetachedJob(scene, { ...C.J.X, generation: scene._ecDGen, life: scene._deadG });
          const recover = waterCastBreakSound(scene, audio, C, true);
          audio.onLife = audio.onWave = recover;
          audio.onFail.add(recover);
        }
        return true;
      }
      const rage = op === 'rageSync' || op === 'rageStart', cast = op.indexOf('cast') === 0;
      if (scene._atkStale || scene.dive || (scene.resultOpen && scene._resultTerminal)) {
        if (scene.resultOpen && scene._resultTerminal && (cast || rage)) { waterDrop(scene, e); return true; }
        if (rage || op === 'castStart') return false;
        if (cast || (op === 'heal' && args[1] && args[1].boss)) {
          const C = e._waterFx && e._waterFx.cast;
          if (C && !C.ended) waterRun(scene, flags, e, 'castLegacy');
          return false;
        }
        if (op === 'healPending') return false;
      }
      if (!waterVisualLive(e)) return rage;
      if (e.hp <= 0 && (rage || op === 'castStart')) return true;
      if (op === 'castInterrupt') return !e._ecCast && !!(e._waterFx && e._waterFx.cast && e._waterFx.cast.broken);
      if (op === 'castHands' || op === 'castHit' || op === 'castRevive' || op === 'castQuiet') {
        const C = e._waterFx && e._waterFx.cast;
        if (!C || C.ended) return false;
        if (op === 'castHands') waterCastHands(scene, C, args[0]);
        if (op === 'castHit') {
          fallback = { e, type: C.type, left: C.ring.left };
          waterCastHit(scene, C, args[0]);
        }
        if (op === 'castRevive') {
          fallback = { e, type: C.type, left: C.ring.left };
          waterCastFade(scene, C, WATER.cast.reviveFade);
        }
        if (op === 'castQuiet') waterCastFade(scene, C, WATER.cast.quietFade);
        return true;
      }
      if (!waterLive(e) && op !== 'rageSync' && op !== 'rageStart' && op !== 'castStart') return false;
      if (!waterReady(scene)) {
        if (scene._efxRt && scene._efxRt.water && scene._efxRt.water.size) throw Error('Water assets unavailable');
        return false;
      }
      if ((rage || op === 'lonelySchedule' || op === 'lonelyOn' || op === 'ballSync' || op === 'lonelyOff') && !has(scene, WATER.art.anger)) return false;
      if ((op === 'castStart' || (op === 'heal' && args[1] && args[1].boss)) && !waterCastReady(scene)) return false;
      if (op === 'heal' && args[1] && args[1].boss && e._ecCast) return false;
      if (op === 'healPending') {
        if (!e._h.boss || e._ecCast || scene._pDead || !(args[0] > 0) || !waterCastReady(scene)) return false;
        waterHealHold(scene, waterState(scene, e, flags), args[0] + WATER.heal.duration);
        return true;
      }
      if (op === 'resume') {
        const C = e._h.cast;
        if (C && !e._ecCast && waterCastReady(scene)) fallback = { e, type: C.type, left: C.left };
        return waterResume(scene, flags, e);
      }
      if (op === 'rageSync' && !e._ecRage) {
        if (e._ecRageObjs) scene._ecRageClear(e);
        return true;
      }
      const X = waterState(scene, e, flags);
      if (op === 'dropSync') { waterDrops(scene, X, args[0], args[1]); if (!X.jobs.size) waterDropState(scene, X); return true; }
      if (op === 'ballSync') { waterBallSync(scene, X, args[0], args[1]); if (!X.jobs.size) waterDropState(scene, X); return true; }
      if (op === 'lonelySchedule' || op === 'lonelyOn') return waterLonely(scene, X, args[0], args[1], op === 'lonelySchedule', () => { committed = true; }, args[2]);
      if (op === 'lonelyOff') { waterLonelyOff(scene, X); return true; }
      if (op === 'revive') return waterRevive(scene, X, args[0], args[1], args[2], args[3], () => { committed = true; });
      if (op === 'afterAttack') return waterAfterAttack(scene, X, args[0], args[1], args[2]);
      if (op === 'badge') return waterBadge(scene, X, args[0]);
      if (op === 'rageSync') waterRageSymbol(scene, X, WATER.rage.sync);
      if (flags.s8 && op === 'rageSync' && (!e._h.lonely || !X.looking) && !e._efxAura) auraWaterResume(scene, e, X);
      if (op === 'rageStart') waterRageStart(scene, X, args[0]);
      if (op === 'castStart') waterCastStart(scene, X, args[0], false, () => { committed = true; });
      if (op === 'heal') {
        if (args[1] && args[1].boss && X.cast && !X.cast.ended) {
          fallback = { e, type: X.cast.type, left: X.cast.ring.left };
          waterCastFade(scene, X.cast, WATER.cast.healFade);
        }
        waterHeal(scene, X, args[0], args[1]);
      }
      if (op === 'rescue') waterRescue(scene, X, args[0]);
      return true;
    }, false, () => waterFail(scene, fallback));
    return handled || committed;
  }
  function waterResume(scene, flags, e) {
    if (scene._atkStale || scene.dive || scene._pDead || (scene.resultOpen && scene._resultTerminal)) return false;
    const rage = e._ecRage && has(scene, WATER.art.anger), cast = e._h.cast;
    const restoreCast = cast && !e._ecCast && waterCastReady(scene);
    if (!rage && !restoreCast) return false;
    const X = waterState(scene, e, flags);
    if (rage && !X.rage) waterRageSymbol(scene, X, WATER.rage.sync);
    if (flags.s8) auraWaterResume(scene, e, X);
    if (restoreCast && !X.cast) waterCastStart(scene, X, cast, true);
    return true;
  }
  function waterRageSymbol(scene, X, duration) {
    const e = X.e, healer = e._h, r = WATER.rage, old = X.rage;
    const J = waterJob(scene, X, () => waterVisualLive(e) && e._h === healer);
    const size = e._ecRage === 2 || e._ecRage === 3 ? EMOTE.LONELY : EMOTE.SIZE;
    J.size = size;
    const replace = old && old.icon && old.icon.scene && old.size !== size;
    if (e._ecRageObjs && !replace) scene._ecRageClear(e);
    X.rage = J;
    const show = () => {
      const a = anchor(readGame(e));
      const icon = J.icon = waterImage(scene, J, WATER.art.anger, a.iconX, a.iconY, size, WATER.symDepth);
      const scale = icon.scaleX;
      icon.setScale(0);
      J.enter = waterTween(scene, J, { targets: icon, scale, duration, ease: 'Back.easeOut' });
      waterPart(scene, J, { update() {
        const p = anchor(readGame(e));
        icon.setPosition(p.iconX, p.iconY);
      }, kill() {} });
    };
    const clean = () => {
      if (J.dead) return;
      const icon = J.icon;
      if (e.dead && X.flags.s4 && X.generation === scene._ecDGen && X.life === scene._deadG && icon && icon.scene) {
        guard(X.flags, 's4', () => {
          const D = waterDetachedJob(scene, X);
          J.objects.delete(icon);
          waterOwn(D, icon);
          waterTween(scene, D, { targets: icon, scale: 0, duration: r.exit, ease: 'Quad.easeIn',
            onComplete: () => waterClose(scene, D) });
        }, false, () => waterFail(scene));
      }
      waterClose(scene, J);
    };
    J.restores.add(() => {
      if (e._ecRageObjs === clean) e._ecRageObjs = null;
      if (X.rage === J) X.rage = null;
    });
    e._ecRageObjs = clean;
    scene._healTrack(clean);
    if (!replace) { show(); return; }
    if (old.tweens.delete(old.enter)) old.enter.stop();
    J.restores.add(() => waterClose(scene, old));
    waterTween(scene, old, { targets: old.icon, scale: 0, duration: r.exit, ease: 'Quad.easeIn',
      onComplete: () => { waterClose(scene, old); waterGuard(scene, J, show); } });
  }
  function waterAura(scene, e, X, what) {
    if (!X.flags.s8) return;
    const level = what === 'large' ? AURA.large : what === 'small' ? AURA.small : -1;
    auraSet(scene, e, 'water', level < 0 ? level : () => auraWaterLevel(e, level), X.flags);
  }
  function waterBang(scene, e, X, kind, full) {
    if (X && X.flags && X.flags.s7) return emoteShow(scene, e, kind, { city: 'water', flags: X.flags, full });
  }
  function waterRageStart(scene, X, ev) {
    const e = X.e, r = WATER.rage;
    e._ecRage = ev.stage === 2 ? 2 : 1;
    waterRageSymbol(scene, X, r.enter);
    const J = waterJob(scene, X, () => waterLive(e));
    let sounded = false, added = false, shown = false;
    const sound = () => {
      if (sounded) return;
      sounded = true;
      waterSound(scene, 's_boom', ev.stage === 2 ? r.furySound : r.sound);
    };
    const card = () => {
      if (shown) return;
      if (!added) { scene._mechAdd('water_rage'); added = true; }
      scene._mechCheck(r.cardDelay);
      shown = true;
    };
    waterLater(scene, J, r.at, () => {
      const settle = r.boost + r.settle;
      waterMotion(scene, J, e, [[r.boost, 0, r.uplift, 0, r.scale, r.scale, 'qo'],
        [settle, 0, r.idleY, 0, r.idleScale, r.idleScale, 'bo'],
        [settle + r.restore, 0, 0, 0, 1, 1, 'si']]);
      sound();
      card();
      waterAura(scene, e, X, 'small');
    });
    waterLater(scene, J, r.at + r.boost + r.settle + r.restore, () => waterClose(scene, J));
    J.onFail.add(sound);
    J.onFail.add(card);
  }
  function waterRing(scene, C) {
    const k = WATER.cast, J = C.J, e = J.X.e;
    const g = waterOwn(J, scene.add.graphics()).setDepth(DEP.ring);
    const R = { g, phase: 0, alpha: 0, left: k.hits, top: null, t: { v: 0 } };
    R.radius = () => {
      const n = (scene.enemies || []).filter(waterLive).length;
      const max = COL_W[clamp(n, k.colMin, k.colMax)] / 2 - k.edge;
      return ringRadius(C.ball.size * C.ball.sx / 2, k.width, R.t.v, R.phase, max);
    };
    waterPart(scene, J, { update(dt) {
      R.phase += dt / k.breath * Math.PI * 2;
      if (!C.ended && R.top != null && e.timer != null && e.timer !== R.source) {
        R.source = e.timer;
        waterCastHandsTo(scene, C, e.timer);
      }
      g.clear();
      if (R.alpha <= k.alphaMin || !R.left) return;
      const { x, y } = C.host(), r = R.radius(), col = ringCol(R.t.v, RING_COL);
      const alpha = R.alpha * (k.alphaBase + k.alphaSwing * Math.sin(R.phase));
      for (let i = 0; i < R.left; i++) {
        const [start, end] = ringSpan(i, k.hits);
        ringArc(g, x, y, r, start, end, k.width, col, alpha);
      }
      for (let i = 0; i < k.crossCount; i++) {
        const an = i * Math.PI / 2, ca = Math.cos(an), sa = Math.sin(an);
        const p0 = r - k.width / 2 - k.crossIn, p1 = r + k.width / 2 + k.crossOut;
        g.lineStyle(k.crossBorder, RING_EDGE, alpha);
        g.lineBetween(x + ca * p0, y + sa * p0, x + ca * p1, y + sa * p1);
        g.lineStyle(k.crossWidth, col, alpha);
        g.lineBetween(x + ca * p0, y + sa * p0, x + ca * p1, y + sa * p1);
      }
    }, kill() {} });
    R.fade = waterTween(scene, J, { targets: R, alpha: 1, duration: k.ringFade });
    return R;
  }
  function waterCastStart(scene, X, ev, resume, commit) {
    const e = X.e, k = WATER.cast, old = X.cast, healer = e._h;
    const J = waterJob(scene, X, () => waterVisualLive(e) && e._h === healer);
    if (old) waterClose(scene, old.J);
    if (e._ecCast) {
      const cast = e._ecCast;
      cast._breaking = true;
      if (cast.cross) cast.cross.destroy();
      e._ecCast = null;
    }
    const C = { J, type: ev.type, pending: !resume, host() {
      const a = anchor(readGame(e));
      return { x: a.threatX, y: a.threatY };
    } };
    X.cast = C;
    J.restores.add(() => { if (X.cast === C) X.cast = null; });
    C.fullSize = k.size * fireGeom(scene, e).bm;
    C.ball = makeThreat(scene, {
      art: WATER.art.cast, size: C.fullSize, host: C.host, pulse: k.pulse,
      depth: DEP.threat, hooks: {
        own: o => waterOwn(J, o), tween: cfg => waterTween(scene, J, cfg), part: p => waterPart(scene, J, p),
      },
    });
    C.ball.grow(k.grow);
    C.ball.update(0);
    C.ring = waterRing(scene, C);
    if (resume) {
      const R = C.ring, timer = e.timer;
      R.left = clamp(ev.left | 0, 0, k.hits);
      R.top = e.interval != null ? e.interval : timer;
      R.source = R.leftHands = timer;
      R.t.v = ringT(R.top, timer);
      if (R.left < k.hits) C.ball.size = C.ball.goal = C.fullSize * k.shrink;
    } else {
      scene._mechCheck(k.cardDelay);
      C.pending = false;
      commit();
      try { if (scene._eneCast) scene._eneCast(e); } finally { waterSound(scene, 's_clear15', k.chargeSound); }
    }
  }
  function waterCastHands(scene, C, ev) {
    const R = C.ring, left = ev.t === 'cd_roll' ? ev.cd : ev.timer;
    if (ev.t === 'cd_roll' && R.top == null) R.top = left;
    if (R.top == null || left == null) return;
    R.source = C.J.X.e.timer;
    waterCastHandsTo(scene, C, left);
  }
  function waterCastHandsTo(scene, C, left) {
    const R = C.ring;
    if (R.leftHands === left) return;
    R.leftHands = left;
    if (R.hands && C.J.tweens.delete(R.hands)) R.hands.stop();
    R.hands = waterTween(scene, C.J, { targets: R.t, v: ringT(R.top, left),
      duration: WATER.cast.hands, ease: 'Sine.easeInOut' });
  }
  function waterCastFade(scene, C, ms) {
    const J = C.J, R = C.ring;
    C.ended = true;
    if (J.tweens.delete(R.fade)) R.fade.stop();
    C.ball.fade(ms);
    waterTween(scene, J, { targets: R, alpha: 0, duration: ms, onComplete: () => waterClose(scene, J) });
  }
  function waterSteam(scene, J, x, y, size) {
    const k = WATER.cast;
    return anim(scene, { key: WATER.art.steam, x, y, size, fps: k.steamFps, depth: DEP.steam,
      image: im => waterOwn(J, im), register: part => waterPart(scene, J, part) });
  }
  function waterArcDrop(scene, C, left) {
    const k = WATER.cast, R = C.ring;
    const { x, y } = C.host(), r = R.radius();
    const [start, end] = ringSpan(left, k.hits), mid = (start + end) / 2;
    const dx = Math.cos(mid) * r, dy = Math.sin(mid) * r;
    const arc = waterOwn(C.J, scene.add.graphics()).setDepth(DEP.ring + k.dropDepth).setPosition(x, y);
    ringArc(arc, 0, 0, r, start, end, k.width, ringCol(R.t.v, RING_COL), 1);
    waterTween(scene, C.J, { targets: arc, x: x + dx * k.dropDist, y: y + dy * k.dropDist + k.dropY,
      angle: (rnd() < k.dropDirection ? -1 : 1) * k.dropAngle, alpha: 0, duration: k.dropMs,
      ease: 'Quad.easeOut', onComplete: () => arc.destroy() });
    waterSteam(scene, C.J, x + dx, y + dy, Math.max(k.steamMin, r * k.dropDist));
  }
  function waterFreeze(scene, J, e, ms) {
    if (quiet(scene)) return;
    const now = scene.time.now || 0;
    const tws = scene.tweens.getTweensOf(e.sprite).filter(t => t.isPlaying && t.isPlaying());
    const st = e._fxSt, mine = !!(st && st.frz == null);
    const release = () => {
      if (!J.restores.delete(release)) return;
      tws.forEach(t => waterSafe(() => t.resume()));
      if (mine && e._fxSt === st && st.frz === now) {
        const elapsed = (scene.time.now || 0) - now;
        st.t0 += elapsed; st.end += elapsed; st.frz = null;
      }
    };
    J.restores.add(release);
    tws.forEach(t => t.pause());
    if (mine) st.frz = now;
    waterLater(scene, J, ms, release);
  }
  function waterCastShatter(scene, J, C) {
    const k = WATER.cast, { x, y } = C.host();
    const layer = C.ball.layers[0];
    const width = (layer && layer.im.displayWidth) || C.ball.size * C.ball.sx * ART_FIT || C.fullSize * ART_FIT;
    C.ball.kill();
    C.ring.left = 0;
    C.ring.g.clear();
    for (let i = 0; i < k.shards; i++) {
      const angle = i / k.shards * Math.PI * 2 + rr(-k.shardWobble, k.shardWobble);
      const d = rr(...k.shardRad) * width / 2, size = rr(...k.shardSize);
      const shard = waterOwn(J, scene.add.rectangle(x, y, size, size, CITY.water.shard[i % CITY.water.shard.length]))
        .setDepth(WATER.depthFx).setStrokeStyle(k.shardStroke, k.shardEdge, k.shardEdgeAlpha).setAngle(rr(0, k.shardAngle));
      waterTween(scene, J, { targets: shard, x: x + Math.cos(angle) * d, y: y + Math.sin(angle) * d,
        angle: shard.angle + rr(-k.shardSpin, k.shardSpin), alpha: 0, scale: k.shardEndScale,
        duration: rr(...k.shardMs), ease: 'Quad.easeOut', onComplete: () => shard.destroy() });
    }
    waterSteam(scene, J, x, y, width * k.breakSteam);
  }
  function waterCastBreakSound(scene, J, C, close) {
    const k = WATER.cast, revive = C.type === 'revive';
    let shot = false, landed = false;
    const launch = () => {
      if (shot) return;
      shot = true;
      if (scene.labSnd) waterSound(scene, WATER.attack.shots[(rnd() * WATER.attack.shots.length) | 0], k.shotSound);
    };
    const land = () => {
      if (landed) return;
      landed = true;
      waterSound(scene, 's_block', k.breakSound);
      if (revive) waterSound(scene, 's_boom', k.reviveBreakSound);
    };
    waterLater(scene, J, k.oldBreakAt, launch);
    waterLater(scene, J, k.oldBreakAt + (revive ? k.oldReviveFlight : k.oldHealFlight), () => {
      land();
      if (close) waterClose(scene, J);
    });
    return () => { waterSafe(launch); waterSafe(land); };
  }
  function waterCastHit(scene, C, ev) {
    const k = WATER.cast, R = C.ring, J = C.J, X = J.X, e = X.e;
    const left = clamp(ev.left | 0, 0, k.hits);
    if (R.left <= left) return;
    waterArcDrop(scene, C, left);
    R.left = left;
    waterFreeze(scene, J, e, k.freeze);
    C.ball.sizeTo(C.fullSize * k.shrink, k.shrinkMs);
    if (left) {
      waterLock(scene, J, k.hitLock);
      waterSound(scene, 's_block', k.hitSound);
      return;
    }
    C.ended = C.broken = true;
    waterLock(scene, J, k.breakLock);
    waterCastShatter(scene, J, C);
    shake(scene, k.shake, k.shakeMs);
    const recoil = MOVE.recoil();
    waterLater(scene, J, k.freeze, () => waterMotion(scene, J, e, recoil));
    waterLater(scene, J, k.dizzyAt, () => waterBang(scene, e, X, 'dizzy', false));
    waterLater(scene, J, k.freeze + recoil[recoil.length - 1][0], () => waterClose(scene, J));
    const audio = waterDetachedJob(scene, X);
    const recoverSound = waterCastBreakSound(scene, audio, C, true);
    waterSound(scene, 's_block', k.hitSound);
    audio.onLife = audio.onWave = recoverSound;
    audio.onFail.add(recoverSound);
  }
  function waterCastDeath(scene, X) {
    const C = X && X.cast;
    if (!C || C.ended) return false;
    const k = WATER.cast, D = waterDetachedJob(scene, X);
    C.ended = true;
    waterCastShatter(scene, D, C);
    const recoverSound = waterCastBreakSound(scene, D, C);
    const tail = Math.max(k.shardMs[1], k.steamFrames * WATER.msPerSecond / k.steamFps,
      k.oldBreakAt + Math.max(k.oldReviveFlight, k.oldHealFlight));
    waterLater(scene, D, Math.ceil(tail), () => waterClose(scene, D));
    D.onFail.add(recoverSound);
    return true;
  }
  function waterMotion(scene, J, e, keys) {
    const st = motion(scene, e, keys);
    if (st) J.restores.add(() => { if (e._fxSt === st) scene._fxStateCut(e); });
  }
  function waterOnce(fn) {
    let done = false;
    return () => { if (!done) { done = true; fn(); } };
  }
  function waterSound(scene, key, vol) { if (scene.labSnd) scene.labSnd(key, vol); }
  function waterBadge(scene, X, lethal) {
    const e = X.e, g = e.glass, tx = e.turnTx, turn = e.turnG, b = WATER.badge;
    if (!g || !g.scene || !tx || !tx.scene || !turn || !turn.scene) {
      if (X.badgeState) waterClose(scene, X.badgeState.J);
      return false;
    }
    if (X.badgeState && (X.badgeState.g !== g || X.badgeState.tx !== tx || X.badgeState.turn !== turn)) {
      waterClose(scene, X.badgeState.J);
      return waterBadge(scene, waterState(scene, e, X.flags), lethal);
    }
    if (!X.badgeState) {
      const J = waterJob(scene, X, () => waterLive(e) && !!e._h);
      const style = tx.style, keep = { key: e._glassKey, texture: g.texture.key, gy: g.y, angle: g.angle,
        width: g.displayWidth, height: g.displayHeight, depth: turn.depth, x: tx.x, scale: tx.scaleX,
        family: style.fontFamily, size: style.fontSize, font: style.fontStyle, stroke: style.stroke,
        thickness: style.strokeThickness };
      const S = X.badgeState = { J, g, tx, turn, t: 0, last: tx.text };
      J.restores.add(() => {
        X.badgeState = null;
        e._glassKey = keep.key;
        if (turn.scene) turn.setDepth(keep.depth);
        if (g.scene) g.setTexture(keep.texture).setDisplaySize(keep.width, keep.height).setAngle(keep.angle).setY(keep.gy);
        if (tx.scene) {
          const n = parseInt(tx.text, 10);
          tx.setX(keep.x).setScale(keep.scale).setFontFamily(keep.family).setFontSize(keep.size)
            .setFontStyle(keep.font).setStroke(keep.stroke, keep.thickness)
            .setColor(n <= 1 ? b.hotColor : n === b.warn ? b.warnColor : b.color);
        }
      });
      J.onFail.add(() => { if (waterLive(e)) scene._ecHealGlass(e, false); });
      turn.setDepth(DEP.badge);
      g.setAngle(0);
      tx.setFontFamily('"Russo One", sans-serif').setFontSize(BADGE.NUM_PX).setFontStyle('')
        .setStroke(b.stroke, b.strokeWidth).setColor(b.color).setX(BADGE.NUM_X);
      waterPart(scene, J, { update(dt) {
        if (S.last !== tx.text) {
          S.last = tx.text;
          if (S.bump) S.bump.stop();
          tx.setScale(b.bump);
          S.bump = waterTween(scene, J, { targets: tx, scale: 1, duration: b.bumpMs, ease: 'Back.easeOut' });
        }
        const [period, scale, dy] = parseInt(tx.text, 10) <= 1 ? b.hot : b.idle;
        S.t += dt;
        const u = Math.abs(Math.sin(S.t / period * Math.PI));
        g.setScale(BADGE.ICON / (g.width || BADGE.ICON) * (1 + scale * u)).setY(-dy * u);
      }, kill() {} });
    }
    const S = X.badgeState, key = lethal ? WATER.art.skull : WATER.art.glass;
    if (S.key !== key || g.texture.key !== key) {
      S.key = e._glassKey = key;
      g.setTexture(key).setDisplaySize(BADGE.ICON, BADGE.ICON);
    }
    if (scene._ecSkullAura && (WATER.KEEP_SKULL_AURA || e._skAura)) scene._ecSkullAura(e, { rule: 1, skull: true }, false, !WATER.KEEP_SKULL_AURA);
    return true;
  }
  function waterThreat(scene, J, art, size, host, grow) {
    const b = makeThreat(scene, { art, size, host, hooks: {
      own: o => waterOwn(J, o), tween: cfg => waterTween(scene, J, cfg), part: p => waterPart(scene, J, p),
    } });
    b.grow(grow);
    if (!art) {
      const colors = [CITY.water.col, CITY.water.col, CITY.water.light];
      WATER.attack.layers.forEach(([r, alpha], i) => {
        const o = waterOwn(J, scene.add.circle(0, 0, size * r, colors[i], alpha));
        b.c.add(o);
      });
      const update = b.update;
      b.update = dt => { update(dt); if (!b.dead) b.c.setScale(b.sx); };
      b.c.setScale(0);
    } else b.update(0);
    return b;
  }
  function waterImage(scene, J, key, x, y, size, depth) {
    return waterOwn(J, scene.add.image(x, y, key, 0)).setDepth(depth).setDisplaySize(size, size);
  }
  function waterFrames(scene, J, im, first, count, duration, done) {
    const p = { u: 0 };
    im.setFrame(first);
    waterTween(scene, J, { targets: p, u: 1, duration, onUpdate: () => {
      im.setFrame(first + Math.min(count - 1, Math.floor(p.u * count)));
    }, onComplete: done });
  }
  function waterParticles(scene, J, x, y, count, radius, depth, spread) {
    const p = WATER.particle, colors = CITY.water.shard, h = WATER.heavy;
    for (let i = 0; i < count; i++) {
      const rad = rnd() * Math.PI * 2;
      const o = waterOwn(J, scene.add.rectangle(x, y, p.size, p.size, colors[i % colors.length])).setDepth(depth);
      const distance = spread ? radius * rr(h.sparkDist[0], h.sparkDist[1]) : radius;
      waterTween(scene, J, { targets: o, x: x + Math.cos(rad) * distance, y: y + Math.sin(rad) * distance,
        alpha: 0, scale: p.endScale, duration: spread ? rr(h.sparkFade[0], h.sparkFade[1]) : p.ms,
        onComplete: () => o.destroy() });
    }
  }
  function waterFly(scene, J, o, x, y, tx, ty, arc, ms, ease, done) {
    const p = { u: 0 };
    waterTween(scene, J, { targets: p, u: 1, duration: ms, ease, onUpdate: () => {
      o.setPosition(lerp(x, tx, p.u), lerp(y, ty, p.u) - arc * Math.sin(Math.PI * p.u));
    }, onComplete: done });
  }
  function waterHpHold(scene, J, a, hp) {
    const R = rt(scene);
    if (!R.waterHp) R.waterHp = new Map();
    let holds = R.waterHp.get(a);
    if (!holds) { holds = new Set(); R.waterHp.set(a, holds); }
    const entry = { hp };
    holds.add(entry);
    a.dispHp = holds.values().next().value.hp;
    const release = () => {
      if (!J.restores.delete(release)) return;
      holds.delete(entry);
      if (!holds.size) R.waterHp.delete(a);
      a.dispHp = holds.size && waterLive(a) ? holds.values().next().value.hp : null;
      scene.updateEnemies();
    };
    J.restores.add(release);
    return release;
  }
  function waterReceive(scene, J, a, from, gain) {
    const h = WATER.heal, f = readGame(a), pos = anchor(f), size = f.szc * h.receiveScale;
    const im = waterImage(scene, J, WATER.art.receive, f.x, pos.ground - size / 2, size, WATER.depthFx);
    waterFrames(scene, J, im, 0, h.frames, h.frames * WATER.msPerSecond / h.fps, () => im.destroy());
    waterMotion(scene, J, a, [[h.bounce, 0, h.bounceDy, 0, 1, 1, 'qo'], [h.bounce * 2, 0, 0, 0, 1, 1, 'si']]);
    if (a.hpGfx && [a.hpx, a.hpW, a.hpGfx.y, a.max].every(n => typeof n === 'number' && isFinite(n)) && a.max > 0) {
      const left = a.hpx + a.hpW * clamp(from / a.max, 0, 1);
      const right = a.hpx + a.hpW * clamp(a.hp / a.max, 0, 1);
      if (right > left) {
        const o = waterOwn(J, scene.add.rectangle((left + right) / 2, a.hpGfx.y, right - left, h.hpHeight, h.hpColor));
        o.setDepth(WATER.depthFx);
        waterTween(scene, J, { targets: o, alpha: 0, delay: h.hpWait, duration: h.hpFade, onComplete: () => o.destroy() });
      }
    }
    scene._ecBigText(a.sprite.x, a.sprite.y + h.textDy, '+' + gain, h.textColor, h.textSize, h.textStroke,
      null, { own: o => waterOwn(J, o), animate: cfg => waterTween(scene, J, cfg) });
  }
  function waterHealHold(scene, X, duration) {
    const e = X.e, healer = e._h, now = scene.time.now || 0, end = now + duration;
    let H = X.healHold;
    if (H) {
      if (e._tmHold !== H.shown || e._tmHoldUntil !== H.end || H.end >= end) return;
      H.J.tms.delete(H.timer);
      H.timer.remove(false);
    } else {
      const pre = e._tmHold, until = e._tmHoldUntil;
      if (pre != null && until >= end) return;
      const J = waterJob(scene, X, () => waterLive(e) && e._h === healer);
      H = X.healHold = { J, shown: pre != null && until > now ? pre : 0 };
      J.restores.add(() => {
        X.healHold = null;
        if (e._tmHold !== H.shown || e._tmHoldUntil !== H.end) return;
        e._tmHold = until > (scene.time.now || 0) ? pre : null;
        e._tmHoldUntil = until;
        if (!e.dead) scene.updateEnemies();
      });
    }
    H.end = end;
    e._tmHold = H.shown;
    e._tmHoldUntil = end;
    H.timer = waterLater(scene, H.J, duration, () => waterClose(scene, H.J));
  }
  function waterHeal(scene, X, before, ev) {
    const e = X.e, h = WATER.heal, a = anchor(readGame(e)), pos = { x: a.x, y: a.headY + h.orbDy };
    const J = waterJob(scene, X, () => waterLive(e) && !!e._h);
    if (ev && ev.boss) waterHealHold(scene, X, h.duration);
    const recipients = [];
    scene.enemies.forEach((ally, i) => {
      if (waterLive(ally) && before && before[i] != null && ally.hp > before[i]) {
        recipients.push({ ally, from: before[i], gain: ally.hp - before[i] });
      }
    });
    const raise = [h.raise, 0, h.dy, 0, h.scale, h.scale, 'qo'];
    waterMotion(scene, J, e, [raise, [h.raise + h.hold, ...raise.slice(1)],
      [h.raise + h.hold + h.returnMs, 0, 0, 0, 1, 1, 'si']]);
    const orb = waterThreat(scene, J, WATER.art.orb, h.orbSize, () => pos, h.grow);
    waterLock(scene, J, h.duration, () => scene.updateEnemies());
    waterLater(scene, J, h.launch, () => orb.fade(h.fade, h.fadeScale));
    let end = h.duration;
    const receiveSound = waterOnce(() => waterSound(scene, 's_heal', h.receiveSound));
    J.onLife = J.onWave = receiveSound;
    if (!recipients.length) waterLater(scene, J, h.receive, receiveSound);
    recipients.forEach(({ ally, from, gain }, k) => {
      const A = waterJob(scene, X, () => waterLive(e) && !!e._h && waterLive(ally));
      const release = waterHpHold(scene, A, ally, from);
      const arrival = h.receive + k * h.gap;
      const tail = arrival + Math.max(h.hpWait + h.hpFade, h.textTail);
      end = Math.max(end, tail);
      h.lightOffsets.forEach((side, d) => waterLater(scene, A, h.launch + k * h.gap + d * h.laneGap, () => {
        const f = readGame(ally);
        const o = waterOwn(A, scene.add.ellipse(pos.x, pos.y, h.lightW, h.lightH,
          side ? CITY.water.light : h.lightCenter, h.lightAlpha)).setDepth(WATER.depthFx);
        waterFly(scene, A, o, pos.x, pos.y, f.x + side * h.lightSpread, f.imgY, h.arc, h.fly,
          'Sine.easeIn', () => o.destroy());
      }));
      waterLater(scene, A, arrival, () => {
        release();
        receiveSound();
        waterReceive(scene, A, ally, from, gain);
      });
      waterLater(scene, A, tail, () => waterClose(scene, A));
    });
    waterLater(scene, J, end, () => waterClose(scene, J));
    waterSound(scene, 's_clear15', h.chargeSound);
  }
  function waterRescue(scene, X, healer) {
    const v = X.e, r = WATER.rescue, f = readGame(v);
    const J = waterJob(scene, X, () => waterLive(v));
    const hasHealer = () => healer !== v && waterLive(healer);
    const dir = hasHealer() && readGame(healer).x > f.x ? -1 : 1;
    let card = false, bubble, flight, dst, end;
    const mech = () => {
      if (card) return;
      card = true;
      scene._mechAdd('water_rescue');
      scene._mechCheck(r.cardDelay);
    };
    const charge = waterOnce(() => waterSound(scene, 's_clear15', r.chargeSound));
    const landSound = waterOnce(() => waterSound(scene, 's_heal', r.landSound));
    const chargedByHealer = hasHealer();
    J.onLife = J.onWave = () => { if (chargedByHealer) charge(); mech(); landSound(); };
    const fall = [r.fall, r.fallX * dir, r.fallY, r.fallAngle * dir, 1, 1, 'qo'];
    waterMotion(scene, J, v, [fall, [r.rise, ...fall.slice(1)],
      [r.rise + r.riseMs, 0, 0, 0, 1, 1, 'bo'],
      [r.rise + r.riseMs + r.hopMs, 0, r.hopY, 0, r.hopScale, r.hopScale, 'qo'],
      [r.rise + r.riseMs + r.hopMs * 2, 0, 0, 0, 1, 1, 'si']]);
    waterParticles(scene, J, f.x, f.imgY, r.sparks, r.radius, WATER.depthFx);
    waterLock(scene, J, r.duration, () => scene.updateEnemies());
    waterLater(scene, J, r.lean, () => {
      if (!hasHealer()) return;
      charge();
      const lean = [r.leanMs, r.leanX * dir, 0, r.leanAngle * dir, 1, 1, 'qo'];
      waterMotion(scene, J, healer, [lean, [r.leanMs + r.leanHold, ...lean.slice(1)],
        [r.leanMs * 2 + r.leanHold, 0, 0, 0, 1, 1, 'si']]);
    });
    waterLater(scene, J, r.launch, () => {
      const src = hasHealer() ? readGame(healer) : { x: f.x, imgY: f.imgY - r.fallbackY };
      dst = readGame(v);
      end = dst.szc * r.endScale;
      const p = { u: 0 };
      bubble = waterImage(scene, J, WATER.art.bubble, src.x, src.imgY, r.width, WATER.depthFx).setAlpha(r.alpha);
      flight = waterTween(scene, J, { targets: p, u: 1, duration: r.fly, onUpdate: () => {
        const size = lerp(r.width, end, p.u);
        bubble.setPosition(lerp(src.x, dst.x, p.u), lerp(src.imgY, dst.imgY, p.u)).setDisplaySize(size, size)
          .setFrame(Math.min(r.firstFrames - 1, Math.floor(p.u * r.firstFrames)));
      } });
    });
    waterLater(scene, J, r.land, () => {
      if (J.tweens.delete(flight)) flight.stop();
      bubble.setPosition(dst.x, dst.imgY).setDisplaySize(end, end).setFrame(r.firstFrames);
      mech();
      landSound();
    });
    waterLater(scene, J, r.rise, () => waterFrames(scene, J, bubble, r.firstFrames + 1, r.popFrames, r.pop, () => {
      waterTween(scene, J, { targets: bubble, alpha: 0, duration: r.fade, onComplete: () => bubble.destroy() });
    }));
    waterLater(scene, J, r.duration, () => waterClose(scene, J));
    J.onFail.add(mech);
  }
  function waterRageDelay(scene, e, ev, evs) {
    const h = WATER.heal, r = WATER.rescue;
    const legacy = ev.stage === 2 ? r.legacyFuryDelay : r.legacyRageDelay;
    if (!e._h || !waterReady(scene)) return legacy;
    const newRage = !ev.lonely && has(scene, WATER.art.anger);
    if (ev.stage !== 1 && !newRage) return legacy;
    return Math.max(legacy,
      evs.some(x => x.t === 'heal' && x.e === ev.e && (!x.boss || (newRage && waterCastReady(scene)))) ? h.rageAt : 0,
      evs.some(x => x.t === 'rescue' && x.by === ev.e) ? r.duration : 0);
  }
  function waterStageLive(scene, e) { return waterLive(e) && !!e._h && !(scene.resultOpen && scene._resultTerminal); }
  function waterDropShape(scene, J, x, y, depth) {
    const d = WATER.drop, r = d.w / 2, bottom = d.h - r;
    const g = waterOwn(J, scene.add.graphics()).setPosition(x, y).setDepth(depth);
    g.fillStyle(CITY.water.col, 1);
    g.lineStyle(d.edge, CITY.water.light, 1);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(r, bottom);
    g.arc(0, bottom, r, 0, Math.PI, false); g.closePath(); g.fillPath(); g.strokePath();
    g.fillStyle(CITY.water.light, 1); g.fillCircle(d.shineX, d.shineY, d.highlight);
    return g;
  }
  function waterDropPos(e, i, n, buttons, cardY) {
    const d = WATER.drop, w = e.hpW || d.hpW, cx = e.hpx != null ? e.hpx + w / 2 : e.card.x;
    const left = cx - (n - 1) * d.gap / 2, y = (e.hpGfx ? e.hpGfx.y : e.restY) + (e.hpH || d.hpH) / 2 + d.tipGap;
    let top = y;
    for (const bx of buttons || []) {
      for (let k = 0; k < n; k++) {
        const dx = Math.max(0, Math.abs(bx - left - k * d.gap) - d.w / 2), rad = d.buttonR + d.clearance;
        if (dx < rad) top = Math.min(top, cardY - d.buttonY - Math.sqrt(rad * rad - dx * dx) - d.h - d.bob);
      }
    }
    return { x: left + i * d.gap, y: top };
  }
  function waterDrops(scene, X, buttons, cardY) {
    const e = X.e, h = e._h, d = WATER.drop, list = X.drops || (X.drops = []);
    const show = h.boss && scene.enemies.some(m => m !== e && !m.boss && !m._m && !m._y && !m._j);
    const n = show ? clamp((h.charges | 0) + (h.cast && h.cast.type === 'revive' ? 1 : 0), 0, d.max) : 0;
    while (list.length > n) {
      const item = list.pop();
      item.bob.stop();
      waterTween(scene, item.J, { targets: item.g, scale: d.exitScale, alpha: 0, duration: d.fade,
        onComplete: () => waterClose(scene, item.J) });
    }
    for (let i = 0; i < n; i++) {
      const p = waterDropPos(e, i, n, buttons, cardY);
      let item = list[i];
      if (!item) {
        const J = waterJob(scene, X, () => waterStageLive(scene, e));
        const g = waterDropShape(scene, J, p.x, p.y, WATER.dropDepthBase).setScale(0);
        if (scene.enemyG && scene.enemyG.exists(e.hpGfx)) {
          scene.enemyG.add(g); scene.enemyG.moveTo(g, scene.enemyG.getIndex(e.hpGfx));
        }
        item = { g, J, y: p.y, offset: 0 }; list.push(item);
        J.restores.add(() => { const k = list.indexOf(item); if (k >= 0) list.splice(k, 1); });
        waterTween(scene, J, { targets: g, scale: 1, duration: d.grow, delay: i * d.stagger, ease: 'Back.easeOut' });
        item.bob = waterTween(scene, J, { targets: item, offset: d.bob, duration: d.bobMs, yoyo: true, repeat: -1,
          ease: 'Sine.easeInOut', onUpdate: () => { g.y = item.y + item.offset; } });
      }
      item.y = p.y;
      item.g.setPosition(p.x, p.y + item.offset);
    }
  }
  function waterBallOff(scene, X) {
    const b = X.ball;
    if (!b) return;
    X.ball = null;
    b.fade(WATER.lonely.fade);
    waterLater(scene, b.job, WATER.lonely.fade, () => waterClose(scene, b.job));
  }
  function waterBallSync(scene, X, timer, cd) {
    const e = X.e, k = WATER.lonely;
    if (!e._h.lonely || !waterLive(e)) { waterBallOff(scene, X); return; }
    if (!e._lnShown || X.looking || X.firing || scene.dive || (scene.resultOpen && scene._resultTerminal)) return;
    const f = cd > 1 ? clamp((cd - timer) / (cd - 1), 0, 1) : 1;
    const size = fireGeom(scene, e).bm * lerp(k.small, 1, f);
    let b = X.ball;
    if (!b || b.dead) {
      const J = waterJob(scene, X, () => waterStageLive(scene, e));
      b = waterThreat(scene, J, WATER.art.bomb, size, () => {
        const a = anchor(readGame(e)); return { x: a.threatX, y: a.threatY };
      }, X.justFired ? k.reset : k.grow);
      X.justFired = false;
      X.ball = b; b.job = J;
      J.restores.add(() => { if (X.ball === b) X.ball = null; });
    } else b.sizeTo(size, size < b.goal ? k.reset : k.expand);
    b.charge = lerp(k.low, k.high, f);
  }
  function waterLonely(scene, X, ev, cd, schedule, commit, previous) {
    const e = X.e, k = WATER.lonely;
    if (!e._h.lonely || X.looking) return true;
    const J = waterJob(scene, X, () => waterStageLive(scene, e) && e._h.lonely);
    const lead = schedule ? WATER.lonelyIn : 0;
    X.looking = true; J.restores.add(() => { X.looking = false; });
    let sounded = false;
    const finish = () => {
      if (!sounded) scene._lnOn(e, ev);
      else { scene._ecRageSync(e); scene._lnBallSync(e); scene._ecGlass(e, true); scene.updateEnemies(); }
    };
    J.onFail.add(finish);
    J.onLife = finish;
    J.onWave = () => { if (!sounded) waterSound(scene, 's_boom', WATER.rage.sound); };
    commit();
    const enter = () => {
      e._lnShown = true;
      if (ev && ev.castCut && !waterRun(scene, X.flags, e, 'castQuiet') && e._ecCast) {
        const c = e._ecCast; e._ecCast = null; c._breaking = true;
        if (c.pulse) c.pulse.stop();
        if (c.gather) c.gather.remove();
        if (c.cross) waterTween(scene, J, { targets: c.cross, alpha: 0, duration: WATER.cast.quietFade, onComplete: () => c.cross.destroy() });
        J.restores.add(() => { if (c.cross && c.cross.scene) c.cross.destroy(); });
      }
      if (schedule) waterMotion(scene, J, e, k.look);
    };
    const rage = () => { e._ecRage = scene._lnRageLv(e); scene._ecRageSync(e); sounded = true; waterSound(scene, 's_boom', WATER.rage.sound); };
    const ball = () => {
      if (scene._tmRelease) scene._tmRelease(e);
      X.looking = false; waterBallSync(scene, X, e.timer, cd); scene._ecGlass(e, true); scene.updateEnemies();
    };
    if (schedule) {
      if (scene._tmHoldSet && (previous != null || e._tmHold != null)) {
        const old = e._tmHold, until = e._tmHoldUntil;
        scene._tmHoldSet(e, old == null ? previous : old, lead + k.ballAt);
        const ownUntil = e._tmHoldUntil;
        J.restores.add(() => {
          if (e._tmHold != null && e._tmHoldUntil === ownUntil) {
            e._tmHold = old; e._tmHoldUntil = until;
            if (scene._tmRelease) scene._tmRelease(e);
          }
        });
      }
      waterLock(scene, J, lead + k.end);
      waterLater(scene, J, lead, enter);
    } else enter();
    waterLater(scene, J, lead + k.rageAt, rage);
    waterLater(scene, J, lead + k.ballAt, ball);
    waterLater(scene, J, lead + k.end, () => { waterAura(scene, e, X, 'large'); waterClose(scene, J); });
    return true;
  }
  function waterLonelyOff(scene, X) {
    const e = X.e;
    if (e._h.lonely) return;
    e._lnShown = false; waterBallOff(scene, X); waterAura(scene, e, X, 'off');
    e._ecRage = e._h.rageStage >= 1 ? 1 : false;
    if (e._ecRage) { scene._ecRageSync(e); waterAura(scene, e, X, 'small'); }
    else scene._ecRageClear(e);
    scene._ecGlass(e, false); scene.updateEnemies();
  }
  function waterAfterAttack(scene, X, plan, cb, n) {
    if (!plan) return false;
    const J = waterJob(scene, X, () => waterStageLive(scene, X.e));
    const extra = n == null ? 0 : WATER.revive.end + WATER.revive.stagger * Math.max(0, n - 1);
    let pending = true;
    const run = () => { if (pending) { pending = false; cb(); } };
    waterLater(scene, J, Math.max(0, plan.at + plan.impact + extra - scene.time.now), () => { run(); waterClose(scene, J); });
    J.onFail.add(run);
    J.onLife = run;
    return true;
  }
  function waterRevive(scene, X, list, lonely, delay, plan, commit) {
    const e = X.e, k = WATER.revive;
    if (!has(scene, k.key) || !has(scene, WATER.art.anger) || (lonely && !plan)) return false;
    const J = waterJob(scene, X, () => waterStageLive(scene, e));
    const gap = lonely ? k.stagger : k.castStagger, last = gap * Math.max(0, list.length - 1);
    const start = (delay || 0) + (lonely ? Math.max(0, plan.at + plan.impact - scene.time.now) : 0);
    const lock = lonely ? start + plan.P.total - plan.P.I + k.end + last :
      start + k.lift + k.fly + k.stand + k.standGrow + k.tail + last;
    let sounded = false;
    const sound = () => {
      if (sounded) return;
      sounded = true;
      waterSound(scene, 's_heal', lonely ? k.sound : k.castSound);
    };
    J.onWave = sound;
    J.onFail.add(sound);
    J.restores.add(() => {
      if (X.generation === scene._ecDGen && X.life !== scene._deadG && waterStageLive(scene, e)) sound();
    });
    list.forEach(m => {
      m._revPend = true; m.dispHp = 0;
      J.restores.add(() => {
        if (m._revPend) {
          try {
            if (!(scene.resultOpen && scene._resultTerminal)) {
              if (X.generation === scene._ecDGen) scene._lnRise(m, X.flags.s4);
              else if (waterLive(m)) waterSound(scene, 's_heal', k.standSound);
            }
          } finally { m._revPend = false; m.dispHp = null; }
        }
      });
    });
    commit();
    waterLock(scene, J, lock);
    waterLater(scene, J, lock, () => waterClose(scene, J));
    const begin = () => {
      const item = X.drops && X.drops.pop();
      const pos = item ? { x: item.g.x, y: item.g.y } : waterDropPos(e, 0, 1);
      if (item) waterClose(scene, item.J);
      const g = waterDropShape(scene, J, pos.x, pos.y, WATER.dropDepthFly);
      waterTween(scene, J, { targets: g, y: pos.y - k.rise, scale: k.scale, duration: k.lift, ease: 'Sine.easeOut' });
      waterLater(scene, J, k.lift, () => g.destroy());
      sound();
      scene._lnDropSync(e);
      list.forEach((m, i) => {
        const t = k.lift + i * gap, land = t + k.fly;
        waterLater(scene, J, t, () => {
          if (!waterVisualLive(m)) return;
          const a = anchor(readGame(m)), sx = pos.x, sy = pos.y - k.rise, ground = a.ground == null ? a.cy + a.szc / 2 : a.ground;
          const drop = waterDropShape(scene, J, sx, sy, WATER.dropDepthFly).setScale(k.scale), p = { u: 0 };
          waterTween(scene, J, { targets: p, u: 1, duration: k.fly, onUpdate: () => {
            if (!waterVisualLive(m)) { drop.setVisible(false); return; }
            drop.setPosition(lerp(sx, a.x, p.u), lerp(sy, ground, p.u) - k.arc * Math.sin(Math.PI * p.u));
            drop.rotation = Math.atan2(ground - sy - Math.PI * k.arc * Math.cos(Math.PI * p.u), a.x - sx) + Math.PI / 2;
          }, onComplete: () => drop.destroy() });
        });
        waterLater(scene, J, land, () => {
          if (!waterVisualLive(m)) return;
          const a = anchor(readGame(m)), size = m.cardW * k.size, ground = a.ground == null ? a.cy + a.szc / 2 : a.ground;
          const im = waterImage(scene, J, k.key, a.x, ground - size / 2, size, WATER.depthFx);
          waterFrames(scene, J, im, 0, k.frames, k.frames * WATER.msPerSecond / k.fps, () => im.destroy());
        });
        waterLater(scene, J, land + k.stand, () => {
          let scheduled = false;
          try { scene._lnRise(m, true); scheduled = true; }
          finally { if (!scheduled && !m._revPend && m.dispHp === 0) m.dispHp = null; }
        });
      });
      scene.updateEnemies();
    };
    if (start) waterLater(scene, J, start, begin); else begin();
    return true;
  }
  function waterHeavyView(scene, J, plan) {
    if (quiet(scene)) return;
    const h = WATER.heavy, v = scene.cameras.main.worldView;
    const dim = waterOwn(J, scene.add.rectangle(v.centerX, v.centerY, v.width * h.dimScale + h.dimMargin,
      v.height * h.dimScale + h.dimMargin, 0)).setDepth(DEP.dim).setAlpha(0);
    waterTween(scene, J, { targets: dim, alpha: h.dim[plan.tier - h.normal], duration: h.dimIn, ease: 'Sine.easeInOut' });
    waterTween(scene, J, { targets: dim, alpha: 0, delay: plan.P.I + h.dimHold, duration: h.dimOut,
      ease: 'Sine.easeInOut', onComplete: () => { dim.destroy(); waterClose(scene, J); } });
    if (plan.tier !== h.boss) return;
    const R = rt(scene), e = J.X.e;
    let saved;
    J.restores.add(() => {
      if (R.waterCamera === saved) R.waterCamera = null;
      if (saved && (R.cam === saved || R.camBack === saved)) camReset(scene);
    });
    try { camIn(scene, anchor(readGame(e)).x, e.cy + h.camY, h.camIn); } finally { R.waterCamera = saved = R.cam; }
    waterLater(scene, J, h.camHold, () => {
      if (saved && R.cam === saved) camOut(scene, h.camOut, (ms, fn) => waterLater(scene, J, ms, fn));
    });
  }
  function waterTurn(scene) {
    const R = scene._efxRt;
    return !!((R && R.alive && R.scene === scene && R.waterEndAt > (scene.time.now || 0)) ||
      ((scene.enemies || []).some(e => e && e._h && waterLive(e)) && waterReady(scene)));
  }
  function waterLaunch(scene, flags, e, ev) {
    return guard(flags, 's4', () => {
      if (!waterLive(e) || !e._h || !waterReady(scene) || (ev.lonely && !has(scene, WATER.art.anger)) || scene._atkVoid()) return false;
      const X = waterState(scene, e, flags), R = rt(scene), now = scene.time.now || 0, a = WATER.attack;
      const tier = ev.lonely || ev.fury ? (e._h.boss ? WATER.heavy.boss : WATER.heavy.normal) : a.tier;
      const P = atkPlan(tier), start = Math.max(0, R.seqEnd - now, R.oldLand + a.afterOld - now - P.I);
      const plan = { kind: 'water', e, P, start, tier, at: now, lonely: ev.lonely, impact: start + P.I, total: start + P.total,
        ep: scene._atkLockEp || 0, rage: ev.rage, hpT: true };
      aimAt(scene, e, plan);
      const J = plan.owner = waterJob(scene, X, () => waterLive(e) && !!e._h);
      if (tier >= WATER.heavy.normal) J.live = () => waterStageLive(scene, e);
      if (ev.lonely) {
        X.firing = true;
        J.restores.add(() => { X.firing = false; });
        waterLater(scene, J, plan.impact, () => { X.firing = false; X.justFired = true; });
        if (X.ball) { plan.ball = X.ball; X.ball = null; plan.ball.charge = 1; plan.ball.detach();
          J.restores.add(() => waterClose(scene, plan.ball.job)); }
      }
      waterLock(scene, J, plan.total);
      waterLater(scene, J, plan.total, () => waterClose(scene, J));
      R.waterEndAt = R.seqEnd = now + plan.total;
      scene._fxEndAt = Math.max(scene._fxEndAt || 0, R.seqEnd);
      return plan;
    }, false, () => waterFail(scene));
  }
  function waterAttackVis(scene, e, plan, land) {
    const P = plan.P, J = plan.owner, a = WATER.attack;
    let landed = false;
    const landOnce = () => {
      if (landed || plan.mute || plan.ep !== (scene._atkLockEp || 0)) return;
      landed = true;
      try { land(); } catch (err) { guard(J.X.flags, 's4', () => { throw err; }, false, () => waterFail(scene)); }
    };
    try { scene.time.delayedCall(plan.impact, landOnce); }
    catch (err) {
      guard(J.X.flags, 's4', () => { throw err; }, false, () => waterFail(scene));
      landOnce();
      return;
    }
    const shot = waterOnce(() => waterSound(scene, a.shots[Math.floor(rnd() * a.shots.length)], a.shotSound));
    waterGuard(scene, J, () => {
      const later = (ms, fn) => waterLater(scene, J, plan.start + ms, fn);
      later(0, () => {
        const g = fireGeom(scene, e), pos = { x: g.a.threatX, y: g.a.threatY };
        const heavy = plan.tier >= WATER.heavy.normal;
        if (heavy && !quiet(scene)) waterHeavyView(scene, waterJob(scene, J.X, () => waterStageLive(scene, e)), plan);
        if (!plan.ball) {
          plan.ball = waterThreat(scene, J, heavy || plan.rage ? WATER.art.bomb : null,
            g.bm * (heavy ? 1 : plan.rage ? a.rageSize : a.normalSize), () => pos, a.grow);
          plan.ball.charge = a.charge;
        }
        waterSound(scene, 's_clear15', a.chargeSound);
        J.onLife = J.onWave = shot;
      });
      later(P.lean, () => waterMotion(scene, J, e, MOVE.strike(plan.tier)));
      later(P.L, () => {
        const b = plan.ball, o = b.detach();
        b.charge = 1;
        shot();
        waterFly(scene, J, o, o.x, o.y, plan.tx, plan.ty, a.arc, P.fly, 'Quad.easeIn', () => b.kill());
      });
    });
  }
  function waterImpact(scene, x, y, dmg, dodged, plan) {
    const a = WATER.attack, J = plan.owner;
    if (plan.mute || (scene.resultOpen && scene._resultTerminal)) return true;
    return waterGuard(scene, J, () => {
      if (!waterReady(scene)) throw Error('Water assets unavailable');
      if (!dodged) {
        const big = clamp(dmg / Math.max(1, scene.maxHP * a.hpScale), a.minPower, 1);
        const size = a.width + a.widthGain * big, ty = y + a.hitDy;
        const glow = waterOwn(J, scene.add.circle(x, ty, size / 2, CITY.water.col, a.glow))
          .setDepth(DEP.hit).setBlendMode(ADD);
        waterTween(scene, J, { targets: glow, scale: a.glowScale, alpha: 0, duration: a.glowMs,
          onComplete: () => glow.destroy() });
        const im = waterImage(scene, J, plan.tier >= WATER.heavy.normal || plan.rage ? WATER.art.burst : WATER.art.cannon, x, ty, size, DEP.hit);
        waterFrames(scene, J, im, 0, a.frames, a.frames * WATER.msPerSecond / a.fps, () => im.destroy());
        waterParticles(scene, J, x, ty, plan.tier >= WATER.heavy.normal ? WATER.heavy.sparks + WATER.heavy.sparkGain * plan.tier : a.sparks, a.radius + a.radiusGain * big, DEP.hit, plan.tier >= WATER.heavy.normal);
      }
      if (plan.tier >= WATER.heavy.normal) shake(scene, WATER.heavy.shake + WATER.heavy.shakeGain * plan.tier, WATER.heavy.ms + WATER.heavy.msGain * plan.tier);
      else shake(scene, a.shake, a.shakeMs);
      if (!dodged) waterSound(scene, 's_player', a.hitSound);
      return true;
    });
  }
  function waterMutePlan(scene, plan) { if (plan.owner) waterClose(scene, plan.owner); }

  /*AURA-BEGIN*/
  const AURA = {
    step: { fire:'s2', earth:'s3', water:'s4', thunder:'s5', wind:'s6' },
    visual: { fire:'_efx', earth:'_earthFx', water:'_waterFx', thunder:'_thunderFx', wind:'_windFx' },
    core: { fire:'_g', earth:'_r', water:'_h', thunder:'_i', wind:'_d' },
    colors: {
      earth:['#ffc23a','#ff8a10','#d04a08','255,150,20','255,100,10'],
      fire:['#ff6a3c','#f2301a','#b0120a','255,50,30','235,30,20'],
      water:['#c4ecff','#3f9eff','#1650c4','90,170,255','26,84,214'],
      thunder:['#ffe24a','#ffc414','#c88a00','255,210,30','255,190,10'],
      wind:['#eeff86','#9de234','#2f8a10','210,255,90','50,140,18']
    },
    rate:[3,9,20], rise:[[28,36],[34,46],[42,54]], life:[[950,1100],[800,950],[640,780]],
    size:[[11,12],[12,13.5],[13,14.5]], cap:120, fade:300, group:3, groupRate:.75,
    headChance:.3, headX:.078, headY:[-.04,.06], shoulderX:[.134,.224], shoulderY:[.12,.5],
    drift:3.5, margin:5, peak:.15, shrink:.2, second:1000, maxDt:100, depth:10.05, back:9.95,
    texW:20, texH:40, cx:10, cy:9, halo:9, spark:4, haloAlpha:.58, tailAlpha:.8, tailHalf:3, midpoint:.5,
    alpha:.4, fps:11, frames:8, fireWidth:.95, fireIn:520, fireOut:360, windIn:400, windDelay:190, windTween:190,
    windWidth:[1.05,1.05,1.2,1.35], windHeight:[.41,.41,.51,.58], windAlpha:[0,1.3,1.8,2.4],
    fireKey:'fx_en_aura_fire8', windKey:'fx_en_aura_wind8', king:4, small:0, medium:1, large:2, oldColor:0xff5a2a, oldMax:3
  };
  function auraGate(flags,city) { return !!(flags && flags.s8 && flags[AURA.step[city]]); }
  function auraLive(scene,e) {
    return !!(!scene._pDead && !scene._atkStale && !(scene.resultOpen && scene._resultTerminal) && e && !e.dead && !(e.hp <= 0) && e.sprite && e.sprite.scene && e.sprite.active !== false &&
      (!scene.enemies || scene.enemies.indexOf(e) >= 0));
  }
  function auraDispose(o) { if (o) { try { o.destroy(); } catch (err) {} } }
  function auraDrop(scene,e) {
    const X=e && e._efxAura;
    if (!X || X.scene !== scene) return;
    const R=X.R;
    R.aura.delete(X);
    X.sparks.forEach(p=>{ auraDispose(p.obj); R.auraCount--; });
    X.sparks.length=0;
    auraDispose(X.layer); X.layer=null;
    e._efxAura=null;
    if (!R.aura.size && R.auraUpdate) {
      const update=R.auraUpdate, shutdown=R.auraShutdown;
      R.auraUpdate=null; R.auraShutdown=null;
      try { scene.events.off('update',update); } catch (err) {}
      try { scene.events.off('shutdown',shutdown); } catch (err) {}
    }
  }
  function auraDropScene(scene,city) {
    const R=scene && scene._efxRt;
    if (R && R.aura) R.aura.forEach(X=>{ if (!city || city===X.city) auraDrop(scene,X.e); });
  }
  function auraRestore(X) {
    const e=X.e, g=e._g;
    if (!X.took || !auraLive(X.scene,e) || !g || g.rule!==AURA.king || !X.scene._enemyKi) return;
    const left=!g.defused ? Math.min(AURA.oldMax,Math.max(0,g.left|0)) : 0;
    if (left) X.scene._enemyKi(e,left,AURA.oldColor);
  }
  function auraFail(scene,flags,err) {
    if (flags) flags.s8=false;
    const R=scene._efxRt;
    if (R) R.auraFailed=true;
    if (R && R.aura) R.aura.forEach(X=>{
      auraDrop(scene,X.e);
      try { auraRestore(X); } catch (restoreErr) {}
    });
    try { console.error('[EFX] s8 鬥氣已關閉',err); } catch (logErr) {}
  }
  function auraCurrent(X) {
    return X.generation===X.scene._ecDGen && X.life===X.scene._deadG &&
      X.e[AURA.core[X.city]]===X.state && X.e[AURA.visual[X.city]]===X.visual && !(X.visual && X.visual.dead);
  }
  function auraEntry(scene,e,city,flags) {
    if (!auraGate(flags,city) || !auraLive(scene,e) || !e[AURA.core[city]]) return null;
    const state=e[AURA.core[city]];
    let X=e._efxAura;
    if (X && (X.city!==city || !auraCurrent(X) || X.flags!==flags)) { auraDrop(scene,e); X=null; }
    if (X) return X;
    const R=rt(scene);
    if (R.auraFailed) return null;
    if (!R.aura) { R.aura=new Set(); R.auraCount=0; }
    X={R:R, scene:scene, e:e, city:city, state:state, flags:flags, generation:scene._ecDGen, life:scene._deadG, visual:e[AURA.visual[city]], level:-1, weight:0, carry:0,
      sparks:[], hot:false, glow:0, stack:0, stackAt:0, visualStack:0, startStack:0, frameTime:0, layer:null, took:false};
    e._efxAura=X; R.aura.add(X);
    if (!R.auraUpdate) {
      R.auraUpdate=function(time,delta) {
        R.aura.forEach(Y=>{
          try {
            if (!R.alive || !auraLive(scene,Y.e) || !auraCurrent(Y)) { auraDrop(scene,Y.e); return; }
            if (!auraGate(Y.flags,Y.city)) { auraDrop(scene,Y.e); auraRestore(Y); return; }
            auraTick(Y,Math.max(0,Math.min(AURA.maxDt,delta || 0)));
          } catch (err) { auraFail(scene,Y.flags,err); }
        });
      };
      R.auraShutdown=function(){ auraDropScene(scene); };
      scene.events.on('update',R.auraUpdate); scene.events.once('shutdown',R.auraShutdown);
    }
    return X;
  }
  function auraSet(scene,e,city,level,flags) {
    if (!auraGate(flags,city)) return;
    try {
      if (typeof level!=='function' && level<0 && !e._efxAura) return;
      const X=auraEntry(scene,e,city,flags);
      if (X) X.level=level;
    } catch (err) { auraFail(scene,flags,err); }
  }
  function auraTakes(scene,flags,e) {
    if (!auraGate(flags,'fire') || !e || !e._g || e._g.rule!==AURA.king) return false;
    try {
      const X=e._efxAura;
      if (!X || X.city!=='fire' || X.R.auraFailed || !auraCurrent(X) || !fireReady(scene)) return false;
      X.took=true;
      return !!X;
    } catch (err) { auraFail(scene,flags,err); return false; }
  }
  function auraFireLayer(scene,e,hot,flags,delay) {
    if (!auraGate(flags,'fire') || (!hot && !e._efxAura)) return;
    try {
      const X=auraEntry(scene,e,'fire',flags);
      if (X) { X.nextHot=!!hot; X.hotDelay=Math.max(0,delay || 0); }
    }
    catch (err) { auraFail(scene,flags,err); }
  }
  function auraWindLayer(scene,e,stack,flags,restore) {
    if (!auraGate(flags,'wind') || (!stack && !e._efxAura)) return;
    try {
      const X=auraEntry(scene,e,'wind',flags);
      stack=Math.min(AURA.windWidth.length-1,Math.max(0,stack|0));
      if (!X || (X.stack===stack && !restore)) return;
      X.startStack=X.visualStack; X.stack=stack; X.stackAt=0;
      if (restore || (!X.glow && stack===1)) {
        X.visualStack=stack; X.startStack=stack;
        if (restore) X.glow=stack ? 1 : 0;
        X.stackAt=AURA.windDelay+AURA.windTween;
      }
    } catch (err) { auraFail(scene,flags,err); }
  }
  function auraTexture(scene,city) {
    const key='efx_aura_spark_'+city;
    if (has(scene,key)) return key;
    const t=scene.textures.createCanvas(key,AURA.texW,AURA.texH), c=t.getContext(), k=AURA.colors[city];
    const x=AURA.cx, y=AURA.cy;
    const halo=c.createRadialGradient(x,y,0,x,y,AURA.halo);
    halo.addColorStop(0,'rgba('+k[3]+','+AURA.haloAlpha+')'); halo.addColorStop(1,'rgba('+k[3]+',0)');
    c.fillStyle=halo; c.fillRect(0,0,AURA.texW,AURA.texH);
    const tail=c.createLinearGradient(x,y,x,AURA.texH);
    tail.addColorStop(0,'rgba('+k[4]+','+AURA.tailAlpha+')'); tail.addColorStop(1,'rgba('+k[4]+',0)');
    c.fillStyle=tail; c.beginPath(); c.moveTo(x-AURA.tailHalf,y); c.lineTo(x,AURA.texH);
    c.lineTo(x+AURA.tailHalf,y); c.closePath(); c.fill();
    const head=c.createRadialGradient(x,y,0,x,y,AURA.spark);
    head.addColorStop(0,k[0]); head.addColorStop(AURA.midpoint,k[1]); head.addColorStop(1,k[2]);
    c.fillStyle=head; c.beginPath(); c.arc(x,y,AURA.spark,0,Math.PI/AURA.midpoint); c.fill(); t.refresh();
    return key;
  }
  function auraRandom(range) { return rr(range[0],range[1]); }
  function auraSpawn(X,a,level,n) {
    const seed=RS;
    if (X.R.auraSeed!=null) RS=X.R.auraSeed;
    try { auraSpawnSpark(X,a,level,n); }
    finally { X.R.auraSeed=RS; RS=seed; }
  }
  function auraSpawnSpark(X,a,level,n) {
    const scene=X.scene, head=rr(0,1)<AURA.headChance;
    let distance=Infinity;
    (scene.enemies || []).forEach(e=>{
      if (e===X.e || !auraLive(scene,e)) return;
      const b=anchor(readGame(e)), dx=a.threatX-b.threatX, dy=a.threatY-b.threatY;
      distance=Math.min(distance,Math.sqrt(dx*dx+dy*dy));
    });
    const limit=Math.max(0,colW(Math.min(AURA.group,n),a.szc,distance)/2-AURA.margin-AURA.drift);
    const spread=Math.min(1,limit/(a.dispW*AURA.shoulderX[1]));
    const dx=head ? rr(-AURA.headX,AURA.headX) : auraRandom(AURA.shoulderX)*(rr(0,1)<AURA.midpoint ? -1 : 1);
    const x=a.x+dx*a.dispW*spread, y=a.headY+auraRandom(head ? AURA.headY : AURA.shoulderY)*a.dispH*spread;
    const p={x:x,y:y,age:0,life:auraRandom(AURA.life[level]),rise:auraRandom(AURA.rise[level]),
      drift:rr(-AURA.drift,AURA.drift),size:auraRandom(AURA.size[level]),obj:null};
    const key=auraTexture(scene,X.city);
    p.obj=scene.add.image(x,y,key); X.sparks.push(p); X.R.auraCount++;
    p.obj.setDepth(AURA.depth).setBlendMode(X.city==='water' || X.city==='wind' ? 'NORMAL' : 'ADD').setAlpha(0);
  }
  function auraInterpolate(values,s) {
    const lo=Math.floor(s), hi=Math.min(values.length-1,lo+1);
    return values[lo]+(values[hi]-values[lo])*(s-lo);
  }
  function auraLayerTick(X,a,dt) {
    if (X.hotDelay!=null) {
      X.hotDelay-=dt;
      if (X.hotDelay<=0) { dt=-X.hotDelay; X.hot=X.nextHot; X.hotDelay=null; }
    }
    const wind=X.city==='wind', want=wind ? X.stack>0 : X.hot;
    if (!want && !X.layer && !X.glow) return;
    const fade=wind ? (want ? AURA.windIn : AURA.fade) : (want ? AURA.fireIn : AURA.fireOut);
    X.glow=Math.max(0,Math.min(1,X.glow+(want ? dt : -dt)/fade));
    if (!X.glow && !want) { auraDispose(X.layer); X.layer=null; X.frameTime=0; return; }
    const key=wind ? AURA.windKey : AURA.fireKey;
    if (!X.layer) {
      if (!has(X.scene,key)) return;
      X.layer=X.scene.add.image(a.x,a.ground,key,0);
      X.layer.setDepth(AURA.back).setOrigin(AURA.midpoint,1).setBlendMode(wind ? 'NORMAL' : 'ADD');
    }
    X.frameTime=(X.frameTime+dt)%(AURA.second*AURA.frames/AURA.fps);
    X.layer.setFrame(Math.floor(X.frameTime*AURA.fps/AURA.second));
    let w=a.dispW*AURA.fireWidth,h=w, alpha=X.glow*AURA.alpha;
    if (wind) {
      X.stackAt+=dt;
      const u=Math.max(0,Math.min(1,(X.stackAt-AURA.windDelay)/AURA.windTween));
      X.visualStack=X.startStack+(X.stack-X.startStack)*Math.sin(u*Math.PI*AURA.midpoint);
      w=a.dispW*auraInterpolate(AURA.windWidth,X.visualStack);
      h=w*auraInterpolate(AURA.windHeight,X.visualStack);
      alpha*=auraInterpolate(AURA.windAlpha,X.visualStack);
    }
    X.layer.setPosition(a.x,a.ground).setDisplaySize(w,h).setAlpha(alpha);
  }
  function auraTick(X,dt) {
    const scene=X.scene, e=X.e, a=anchor(readGame(e));
    let level=typeof X.level==='function' ? X.level(scene,e) : X.level;
    level=Math.min(AURA.rate.length-1,level|0);
    if (level>0 && reduced()) level--;
    const on=level>=0;
    X.weight=Math.max(0,Math.min(1,X.weight+(on ? dt : -dt)/AURA.fade));
    if (on) X.lastLevel=level;
    if (X.weight>0 && a.dispW>0 && X.lastLevel!=null) {
      const n=(scene.enemies || []).reduce((count,other)=>count+(auraLive(scene,other)?1:0),0);
      X.carry+=dt/AURA.second*AURA.rate[X.lastLevel]*X.weight*(n>=AURA.group ? AURA.groupRate : 1);
      while (X.carry>=1) {
        X.carry--;
        if (X.R.auraCount<AURA.cap) auraSpawn(X,a,X.lastLevel,n);
      }
    } else X.carry=0;
    for (let i=X.sparks.length-1;i>=0;i--) {
      const p=X.sparks[i]; p.age+=dt;
      if (p.age>=p.life || !X.weight) {
        auraDispose(p.obj); X.sparks.splice(i,1); X.R.auraCount--; continue;
      }
      const u=p.age/p.life, fade=(u-AURA.peak)/(1-AURA.peak);
      const alpha=u<AURA.peak ? u/AURA.peak : 1-fade*fade;
      const h=p.size*(1-AURA.shrink*u);
      p.obj.setPosition(p.x+p.drift*u,p.y-p.rise*Math.sin(u*Math.PI*AURA.midpoint))
        .setDisplaySize(h*AURA.texW/AURA.texH,h).setAlpha(alpha*X.weight);
    }
    auraLayerTick(X,a,dt);
  }
  function auraFireSync(scene, e, X, flags) {
    if (X.hot && (!e._efxAura || !auraCurrent(e._efxAura))) auraFireLayer(scene, e, true, flags);
    auraSet(scene, e, 'fire', auraFireLevel, flags);
  }
  function auraFireCoolLevel(left) {
    const core = ecRef(), hits = (core && core.TUNING && core.TUNING.CHIEF_HITS) || FIRE.HITS;
    return AURA.large - fireCool({ left }, hits);
  }
  function auraFireLevel(scene, e) {
    const g = e._g;
    return g.defused ? -1 : g.rule === AURA.king ? auraFireCoolLevel(g.left) : g.skull ? AURA.large : -1;
  }
  function auraFireAttack(scene, e, flags, ev, land) {
    const level = auraFireLevel(scene, { _g: ev });
    auraSet(scene, e, 'fire', () => {
      if (e._efx.ball) return auraFireLevel(scene, e);
      return (scene.time.now || 0) < land ? level : -1;
    }, flags);
  }
  function auraEarthLevel(scene, e) {
    const X = e._earthFx, rock = e._r;
    if (!X.sh || !X.sh.active || (!rock.up && !(X.shState && X.shState.closing))) return -1;
    const core=ecRef();
    if (rock.rule === AURA.king && !rock.guest && X.links) {
      const guarding=!core || !core.rockGuarding || !scene._ec || core.rockGuarding(scene._ec,e);
      for (const L of X.links.values()) {
        if (L.dead || L.n.dead || L.n.hp <= 0 || !L.n.sprite) continue;
        if (L.retiring ? L.age < EARTH.hold.retireDelay && L.from > 0 : guarding && L.u > 0) return AURA.large;
      }
    }
    return rock.rule > 1 ? AURA.medium : AURA.small;
  }
  function auraThunderLevel(scene, e) {
    const X = e._thunderFx;
    return e._i.rule > 1 && X.orb && X.orb.alive ? AURA.large : -1;
  }
  function auraWindLevel(scene, e) {
    const X = e._windFx, plan = X.ballHeld;
    if (plan && !plan.mute && (scene.time.now || 0) >= plan.landAt - plan.P.I) return -1;
    const ball = X.ball || (plan && !plan.mute && plan.ball), stack = e._d.rule === AURA.king ? e._ecFat | 0 : 0;
    return Math.max(ball && ball.alive ? AURA.medium : -1, Math.min(AURA.large, stack - 1));
  }
  function auraWindSync(scene, e, X) {
    if ((!e._efxAura || !auraCurrent(e._efxAura)) && e._ecFat > 0 && e._d.rule === AURA.king)
      auraWindLayer(scene, e, e._ecFat | 0, X.flags, true);
    auraSet(scene, e, 'wind', auraWindLevel, X.flags);
  }
  function auraWaterLevel(e, level) {
    const healer = e._h;
    if (level === AURA.large && (healer.lonely || e._lnShown)) return AURA.large;
    if (!healer.lonely && (healer.rage || healer.rageStage > 0 || e._ecRage)) return AURA.small;
    return -1;
  }
  function auraWaterResume(scene, e, X) {
    const level = e._h.lonely ? AURA.large : AURA.small;
    auraSet(scene, e, 'water', () => auraWaterLevel(e, level), X.flags);
  }
  function auraResume(scene, flags) {
    try {
      for (const e of scene.enemies || []) {
        if (!e || e.dead || e.hp <= 0) continue;
        if (flags.s2 && e._g && e._efx) {
          auraSet(scene, e, 'fire', auraFireLevel, flags);
          if (e._efx.hot) auraFireLayer(scene, e, true, flags);
        }
        if (flags.s3 && e._r && e._earthFx) auraSet(scene, e, 'earth', auraEarthLevel, flags);
        if (flags.s5 && e._i && e._thunderFx) auraSet(scene, e, 'thunder', auraThunderLevel, flags);
        if (flags.s6 && e._d && e._windFx) auraWindSync(scene, e, e._windFx);
      }
    } catch (err) { auraFail(scene, flags, err); }
  }
  /*AURA-END*/
  /*EMOTE-BEGIN*/
  const EMOTEFX = {
    lead: 120, close: 120, replace: 60, gap: 120, rate: 1200,
    frames: 8, frame: 72, sourceFrame: 192, fullFrame: 100, shortFrame: 45,
    widthRatio: .72, heightRatio: .687, facePoint: [127.43, 135.08], nudgeWidth: 48,
    depth: DEP.badge + .2, closeScale: .3, back: 1.70158,
    fireAt: 403.75, earthAt: 310, earthLinkedAt: 810, king: 4,
    fallback: { size: 28, ms: 700, fill: 0xe8f2ff, edge: 0x25324a, stroke: 1, radius: 7, tailHalf: 5, bodyHeight: 180 },
    // Each row: priority, body X/Y in the 192px cell, vertical nudge, timing.
    faces: {
      dizzy: [3, 95.5, 98.1, 0, 'full'], cry: [1, 95.3, 99.2, 0, 'full'],
      smug: [1, 94.7, 94.6, -4, 'full'], whistle: [1, 95, 93.2, 0, 'either'],
      angry: [2, 95.2, 88.2, 0, 'short', 'icon_anger'], heart: [2, 87.2, 104.5, -2, 'full', 'icon_heartpink'],
      happy: [2, 95.2, 98.1, 0, 'short'], bang: [2, 97, 101.1, -2, 'either'],
    },
  };
  function emoteFrameMs(face, full) {
    const K = EMOTEFX, mode = K.faces[face][4];
    return mode === 'full' || (mode === 'either' && full) ? K.fullFrame : K.shortFrame;
  }
  function emoteDur(face, full) {
    const K = EMOTEFX;
    return K.lead + K.frames * emoteFrameMs(face, full) + K.close;
  }
  function emoteFaceXY(face, width) {
    const K = EMOTEFX, data = K.faces[face], k = width / BUB.vw;
    const scale = K.widthRatio * width / K.frame, unit = K.frame / K.sourceFrame;
    return {
      x: (K.facePoint[0] - BUB.tip[0]) * k + (K.frame / 2 - data[1] * unit) * scale,
      y: (K.facePoint[1] - BUB.tip[1]) * k + (K.frame / 2 - data[2] * unit) * scale + data[3] * width / K.nudgeWidth,
      scale,
    };
  }
  function hitFaceKind(atkEl, enemyEl) {
    const elements = typeof EL !== 'undefined' ? EL :
      typeof module === 'object' && module.exports ? require('./battle-core.js').EL : null;
    const atk = elements && elements[atkEl], enemy = elements && elements[enemyEl];
    if (!atk || !enemy) return null;
    return atk.beats === enemyEl ? 'cry' : enemy.beats === atkEl ? 'smug' : null;
  }

  function emoteStamp(scene, e, city, flags) {
    return { scene, e, city, flags, core: e[AURA.core[city]], visual: e[AURA.visual[city]],
      wave: scene._ecDGen, life: scene._deadG, epoch: scene._atkLockEp };
  }
  function emoteLive(S) {
    const { scene, e, city, flags } = S;
    return emoteGate(flags, city) && auraLive(scene, e) &&
      (!scene.sys || scene.sys.isActive()) && S.wave === scene._ecDGen && S.life === scene._deadG &&
      S.epoch === scene._atkLockEp && S.core && S.core === e[AURA.core[city]] &&
      S.visual === e[AURA.visual[city]] && !(S.visual && S.visual.dead);
  }
  function emoteGate(flags, city) { return !!(flags && flags.s7 && flags[AURA.step[city]]); }

  function emoteDrop(scene, e, city) {
    const S = e && e._efxEmote;
    if (!S || S.scene !== scene || (city && S.city !== city)) return;
    delete e._efxEmote;
    S.R.emote.delete(S);
    if (!S.R.emote.size) {
      try { scene.events.off('shutdown', S.R.emoteShutdown); } catch (err) {}
      S.R.emoteShutdown = null;
    }
    S.timers.forEach(t => emoteCancel(S, t));
    S.timers.clear();
    emoteDispose(S.cur);
    S.cur = null;
    emoteIdle(S.R);
  }
  function emoteCancel(S, t) {
    try { t.remove(false); } catch (err) {}
    const X = S.visual, list = X && X.tms;
    if (Array.isArray(list)) { const i = list.indexOf(t); if (i >= 0) list.splice(i, 1); }
    else if (list) list.delete(t);
    const i = S.R.tms.indexOf(t);
    if (i >= 0) S.R.tms.splice(i, 1);
  }
  function emoteDispose(B) {
    if (!B) return;
    B.objects.forEach(o => { try { if (o.scene) o.destroy(); } catch (err) {} });
    B.objects.length = 0;
  }
  function emoteDropScene(scene, city) {
    const R = scene._efxRt;
    if (R && R.emote) R.emote.forEach(S => { if (!city || S.city === city) emoteDrop(scene, S.e, city); });
  }
  function emoteFail(scene, flags, err) {
    if (flags) flags.s7 = false;
    emoteDropScene(scene);
    try { console.error('[EFX] s7 出錯,本場關閉此步', err); } catch (logErr) {}
  }
  function emoteIdle(R) {
    if (!R.emoteUpdate) return;
    for (const S of R.emote) if (S.cur || S.queue || S.timers.size) return;
    const update = R.emoteUpdate;
    R.emoteUpdate = null;
    R.emoteNext = {};
    try { R.scene.events.off('update', update); } catch (err) {}
  }
  function emoteWatch(R) {
    if (R.emoteUpdate) return;
    R.emoteNext = {};
    R.emoteUpdate = () => {
      let active = R.emote.values().next().value;
      try {
        const now = R.scene.time.now;
        for (const S of R.emote) {
          active = S;
          if (!emoteLive(S)) emoteDrop(S.scene, S.e);
          else emoteAdvance(S, now);
        }
        const queue = [...R.emote].filter(S => S.queue && !S.cur);
        queue.sort((a, b) => anchor(readGame(a.e)).x - anchor(readGame(b.e)).x);
        for (const S of queue) {
          active = S;
          const Q = S.queue;
          if (now < (R.emoteNext[Q.face] || 0)) continue;
          S.queue = null;
          emoteBuild(S, Q, now);
          R.emoteNext[Q.face] = now + EMOTEFX.gap;
        }
        emoteIdle(R);
      } catch (err) { emoteFail(R.scene, active && active.flags, err); }
    };
    R.scene.events.on('update', R.emoteUpdate);
  }
  function emoteState(stamp) {
    const { scene, e, city } = stamp;
    let S = e._efxEmote;
    if (S && (S.city !== city || !emoteLive(S))) { emoteDrop(scene, e); S = null; }
    if (S) return S;
    const R = rt(scene);
    if (!R.emote) R.emote = new Set();
    S = { ...stamp, R, cur: null, queue: null, until: 0, lastAt: -Infinity, lastPri: 0, timers: new Set() };
    e._efxEmote = S;
    R.emote.add(S);
    if (!R.emoteShutdown) {
      R.emoteShutdown = () => {
        try { emoteDropScene(scene); } catch (err) { emoteFail(scene, stamp.flags, err); }
      };
      scene.events.once('shutdown', R.emoteShutdown);
    }
    return S;
  }
  function emoteShow(scene, e, face, opts) {
    opts = opts || {};
    const city = opts.city || (e && Object.keys(AURA.core).find(k => e[AURA.core[k]]));
    const flags = opts.flags || (scene._efxRt && scene._efxRt.flags) || (city && e[AURA.visual[city]] && e[AURA.visual[city]].flags);
    if (!emoteGate(flags, city)) return false;
    try {
      const stamp = emoteStamp(scene, e, city, flags);
      if (!emoteLive(stamp)) return false;
      const K = EMOTEFX, data = K.faces[face];
      if (!Array.isArray(data)) return false;
      const key = 'fx_en_emoteA_' + face + '8';
      const icon = !has(scene, key);
      if (icon && !(data[5] && has(scene, data[5]))) return false;
      const S = emoteState(stamp), now = scene.time.now, pri = data[0];
      if ((S.queue && pri <= S.queue.pri) || (S.cur && pri <= S.cur.pri) ||
          (now - S.lastAt < K.rate && pri <= S.lastPri)) return false;
      S.queue = { face, pri, key: icon ? data[5] : key, icon, full: opts.full, closeToIcon: face === 'angry' };
      if (S.cur && S.cur.replaceAt == null) {
        S.cur.replaceAt = now;
        S.cur.replaceScale = S.cur.root.scaleX;
      }
      emoteWatch(S.R);
      return true;
    } catch (err) { emoteFail(scene, flags, err); return false; }
  }
  function emoteFrame(scene, x, y, width, k) {
    const F = EMOTEFX.fallback;
    let g;
    try {
      g = scene.add.graphics();
      const tipX = -x, height = F.bodyHeight * k, top = y - height / 2, bottom = top + height;
      g.fillStyle(F.edge).fillTriangle(tipX - F.tailHalf, bottom - F.stroke, tipX + F.tailHalf, bottom - F.stroke, 0, 0);
      g.fillStyle(F.fill).fillTriangle(tipX - F.tailHalf + F.stroke, bottom - F.stroke, tipX + F.tailHalf - F.stroke, bottom - F.stroke, 0, -F.stroke);
      g.fillRoundedRect(x - width / 2, top, width, height, F.radius);
      g.lineStyle(F.stroke, F.edge).strokeRoundedRect(x - width / 2, top, width, height, F.radius);
      return g;
    } catch (err) {
      if (g) { try { g.destroy(); } catch (disposeErr) {} }
      return null;
    }
  }
  function emoteBuild(S, Q, now) {
    const { scene, e } = S, K = EMOTEFX;
    if (!has(scene, Q.key)) return;
    const self = anchor(readGame(e));
    const others = (scene.enemies || [e]).filter(n => n && !n.dead && !(n.hp <= 0) && n.sprite).map(n => anchor(readGame(n)));
    const w = bubW(others.length), ctr = bubbleCtr(self, others, (geoOf(scene) || {}).W || 420, w), k = w / BUB.vw;
    const dx = (BUB.ctr[0] - BUB.tip[0]) * k, dy = (BUB.ctr[1] - BUB.tip[1]) * k;
    const B = S.cur = { ...Q, now, ctr, objects: [], replaceAt: null };
    if (Q.icon) {
      B.root = scene.add.image(self.iconX, self.iconY, Q.key);
      B.objects.push(B.root);
      B.root.setDisplaySize(K.fallback.size, K.fallback.size).setDepth(K.depth);
      S.until = now + K.fallback.ms;
    } else {
      let frame;
      if (has(scene, 'fx_en_emote_bubble')) {
        frame = scene.add.image((BUB.W / 2 - BUB.tip[0]) * k, (BUB.H / 2 - BUB.tip[1]) * k, 'fx_en_emote_bubble');
        B.objects.push(frame);
        frame.setDisplaySize(BUB.W * k, BUB.H * k);
      } else {
        frame = emoteFrame(scene, dx, dy, w, k);
        if (!frame) { S.cur = null; return; }
        B.objects.push(frame);
      }
      const pos = emoteFaceXY(Q.face, w);
      B.faceSprite = scene.add.sprite(pos.x, pos.y, Q.key, 0);
      B.objects.push(B.faceSprite);
      B.faceSprite.setDisplaySize(pos.scale * K.frame, w * K.heightRatio);
      B.root = scene.add.container(ctr.x - dx, ctr.y - dy);
      B.objects.unshift(B.root);
      B.root.add([frame, B.faceSprite]);
      B.root.setDepth(K.depth).setScale(0);
      B.x = ctr.x - dx;
      B.y = ctr.y - dy;
      B.iconX = self.iconX - dx * K.closeScale;
      B.iconY = self.iconY - dy * K.closeScale;
      B.frameMs = emoteFrameMs(Q.face, Q.full);
      S.until = now + emoteDur(Q.face, Q.full);
    }
    S.lastAt = now;
    S.lastPri = Q.pri;
  }
  function emoteAdvance(S, now) {
    const B = S.cur, K = EMOTEFX;
    if (!B) return;
    if (!B.root.scene || (B.replaceAt == null ? now >= S.until : now >= B.replaceAt + K.replace)) {
      emoteDispose(B);
      S.cur = null;
      return;
    }
    if (B.replaceAt != null) {
      B.root.setScale(B.replaceScale * (1 - (now - B.replaceAt) / K.replace));
      return;
    }
    if (B.icon) return;
    const age = now - B.now, closeAt = K.lead + B.frameMs * K.frames;
    if (age <= 0) return;
    if (age < K.lead) {
      const p = age / K.lead - 1;
      B.root.setScale(1 + (K.back + 1) * p * p * p + K.back * p * p);
      return;
    }
    B.faceSprite.setFrame(Math.min(K.frames - 1, Math.floor((age - K.lead) / B.frameMs)));
    const p = Math.max(0, (age - closeAt) / K.close);
    if (B.closeToIcon) {
      const u = p * p;
      B.root.setScale(1 - (1 - K.closeScale) * u);
      B.root.setPosition(B.x + (B.iconX - B.x) * u, B.y + (B.iconY - B.y) * u);
    } else B.root.setScale(1 - ((K.back + 1) * p * p * p - K.back * p * p));
  }
  function emoteScheduleStamp(scene, e, city, flags) {
    try { return emoteStamp(scene, e, city, flags); }
    catch (err) { emoteFail(scene, flags, err); return null; }
  }
  function emoteSchedule(scene, e, X, city, schedule, play, before) {
    let flags;
    try {
      flags = city === 'fire' ? scene._efxRt.flags : X.flags;
      if (!emoteGate(flags, city)) return;
      const stamp = before || emoteStamp(scene, e, city, flags);
      if (!emoteLive(stamp)) return;
      const S = emoteState(stamp);
      const t = schedule(() => {
        try {
          S.timers.delete(t);
          if (e._efxEmote === S && emoteLive(stamp)) play();
        } catch (err) { emoteFail(scene, flags, err); }
      });
      S.timers.add(t);
      emoteWatch(S.R);
    } catch (err) { emoteFail(scene, flags, err); }
  }
  function emoteThunderLater(scene, e, X, ms, kind) {
    emoteSchedule(scene, e, X, 'thunder', fn => thunderLater(scene, X, ms, fn), () => thunderBang(scene, e, kind));
  }
  function fireBang(scene, e, X, kind, full) {
    return emoteShow(scene, e, kind, { city: 'fire', flags: scene._efxRt.flags, full });
  }
  function earthBang(scene, e, X, kind, full) {
    return emoteShow(scene, e, kind, { city: 'earth', flags: X.flags, full });
  }
  /*EMOTE-END*/
  /*EFX-RT-END*/

  return {
    STEPS, allOff, parseFlags, anyOn, guard, ASSETS, assetsFor, preload,
    WATER, waterReady, waterRun, waterDrop, waterFail, waterRageDelay, waterTurn, waterLaunch, waterAttackVis,
    WIND, windReady, windRun, windDrop, windFail, windLock, windReserve, windSlotActive, windLaunch, windAttackVis, windImpact, windMutePlan,
    THUNDER, thunderReady, thunderBadge, thunderRun, thunderDrop, thunderFail, thunderShock, thunderShockText,
    thunderLaunch, thunderAttackVis, thunderTurn,
    EARTH, earthGuardSync, earthRun, earthDrop, earthFail, earthReady, earthRestore,
    earthLaunch, earthTurn, earthAttackVis, earthImpact,
    FIRE, fireMove, fireTop, fireCool, fireArt, fireRingSegs, lerpCol, ringCol, ringT, ringRadius,
    rt, rnd, cb, frameCtr, makeThreat, makeRing, makeLine, makeBadge, fireReady, ready, fireGeom, fireSync, fireMarker, fireLaunch, fireAttackVis, impactFx, atkPlan, fireTier, ATK,
    emberStart, emberTick, emberHit, emberOff, fireDefuse, fireHit, fireJolts, chiefShift, burnSparks, drop, dropScene, dropAll, fireTurn, oldSlot, settle, mutePlan, xfx, lateSlot, oldFx, OLD_TOTAL, OLD_HIT,
    auraTakes, auraResume,
    EMOTEFX, emoteShow, emoteDur, emoteFaceXY, hitFaceKind, emoteDrop,
    CHIN, CHIN_DEF, CHIN_TOP, SIZE_OF, KING_SIZE, COL_W, COL_SZC, RING_RESERVE, ART_K, ART_FIT, CITY, RING_COL, BADGE, EMOTE, BUB,
    fullArtBaseH, fitMirror, headUp, anchor, readGame, chinId, chinIdFromArt, chinIdOf, chinOf, colW, nearestDist, ballMax, threatSize, artBox, charge, bubW, bubbleCtr,
  };
});
