// 我方招式能量圖：貼圖 key → 實際載入的檔名（2026-11-24 能量圖換無邊框版；規格 docs/spec-battle-feel-v2.md 開頭「修訂紀錄 2026-11-24」換圖清單 27 列）
// 用法（index.html 的載入處呼叫 FxArt.path(key)）：
//   預設 → 載下表的新檔（art/fx/<新檔名>.webp）；表上沒有的 key → 照舊載 art/fx/<key>.webp
//   網址加 ?fxart=old → 整批退回舊檔（全部載 art/fx/<key>.webp）
//   單張退回 → 把下表那一列刪掉或註解掉即可（舊檔一律保留、沒有覆蓋）
// 新檔名規則：fx_<原 key 去掉 fx_>_nb.webp（nb = no border，無邊框）；整張尺寸、格數、每格大小與舊檔相同，所以 frameWidth 等設定不用動
// 不換的（照舊）：土屬石頭／石刺／earth_crack／earth_smash16、風的葉子、heal_heart
(function (root) {
  'use strict';
  const NEW = {
    // 火
    fx_fire_tail_1: 'fx_fire_tail_1_nb',
    fx_fire_tail_2: 'fx_fire_tail_2_nb',
    fx_fire_tail_3: 'fx_fire_tail_3_nb',
    fx_fire_pop: 'fx_fire_pop_nb',
    fx_fire_burst16: 'fx_fire_burst16_nb',
    fx_fire_front8: 'fx_fire_front8_nb',
    // 水
    fx_water_ball: 'fx_water_ball_nb',
    fx_water_drop_1: 'fx_water_drop_1_nb',
    fx_water_drop_2: 'fx_water_drop_2_nb',
    fx_water_drop_3: 'fx_water_drop_3_nb',
    fx_water_splash: 'fx_water_splash_nb',
    fx_water_cannon16: 'fx_water_cannon16_nb',
    fx_water_front8: 'fx_water_front8_nb',
    fx_water_surface8: 'fx_water_surface8_nb',
    // 雷
    fx_thunder_spark_1: 'fx_thunder_spark_1_nb',
    fx_thunder_spark_2: 'fx_thunder_spark_2_nb',
    fx_thunder_spark_3: 'fx_thunder_spark_3_nb',
    fx_thunder_hit: 'fx_thunder_hit_nb',
    fx_thunder_strike16: 'fx_thunder_strike16_nb',
    fx_thunder_cloud: 'fx_thunder_cloud_nb',
    fx_thunder_residue8: 'fx_thunder_residue8_nb',
    // 風
    fx_wind_blade: 'fx_wind_blade_nb',
    fx_wind_slash: 'fx_wind_slash_nb',
    fx_wind_slash16: 'fx_wind_slash16_nb',
    fx_wind_multislash16: 'fx_wind_multislash16_nb',
    fx_wind_tornado8: 'fx_wind_tornado8_nb',
    // 補血
    fx_heal_bloom16: 'fx_heal_bloom16_nb',
  };
  function useOld(search) { return /[?&]fxart=old(?:&|#|$)/.test(String(search || '')); }
  const OLD = useOld(root.location && root.location.search);
  function file(key, old) { return ((old === undefined ? OLD : old) ? key : (NEW[key] || key)); }
  function path(key, old) { return 'art/fx/' + file(key, old) + '.webp'; }
  const api = { NEW, old: OLD, useOld, file, path };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FxArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
