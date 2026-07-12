// 塊頭勇者 角色圖鑑資料 — 從遊戲主檔萃取，家族公式重算後之實際生效值。
// lv1=基礎(LV1未進化)、max=滿級(LV20未進化)。星級一律 ★3(可進化+2)。隊長技/主動技=實際生效版。
// n=圖鑑編號，依遊戲圖鑑分組順序(貓→犬→鳥→鼠→兔→魚→台灣，各隊火→水→雷→土→風)001→035。

export interface Card {
  id: string; n: string; name: string; en: string; species?: string; evo?: { name: string; en: string };
  el: 'fire' | 'water' | 'thunder' | 'earth' | 'wind';
  race: 'human' | 'yokai' | 'beast';
  fam: 'cat' | 'dog' | 'bird' | 'rat' | 'fish' | 'rabbit' | 'taiwan' | 'spider' | 'ghost' | 'wall' | 'witch';
  hero: boolean;
  dropOnly?: boolean;
  lv1: { atk: number; hp: number; rcv: number };
  max: { atk: number; hp: number; rcv: number };
  lead?: { name: string; desc: string };
  act: { name: string; desc: string; cd: number };
}

export interface Team { emoji: string; name: string; fam: string; color: string; ids: string[]; }

export const meta = {
  elName:  { fire: '火', water: '水', thunder: '雷', earth: '土', wind: '風' } as Record<string, string>,
  elColor: { fire: '#ff6a3d', water: '#37b6ff', thunder: '#f0b410', earth: '#c8873f', wind: '#3fbf54' } as Record<string, string>,
  famName: { cat: '貓', dog: '犬', bird: '鳥', rat: '鼠', fish: '魚', rabbit: '兔', taiwan: '台灣特有種', spider: '妖·蜘蛛', ghost: '妖·鬼', wall: '妖·牆', witch: '妖·魔女' } as Record<string, string>,
  raceName:{ human: '人類', yokai: '妖怪', beast: '靈獸' } as Record<string, string>,
  note: '三圍為家族公式重算後的實際值；LV1＝基礎、滿級＝LV20（未進化）。星級基礎一律 ★3，可進化再 +2（最高 ★5）。屬性相剋：火→風→雷→土→水→火。妖·蜘蛛／妖·鬼／妖·牆／妖·魔女 4 個雜牌家族僅關卡掉落、不進轉蛋，基礎 ★1、進化 ★2（無隊長技）。',
  teams: [
    { emoji: '🐱', name: '貓系', fam: 'cat',    color: '#8fd16a', ids: ['c02','c05','c08','c09','c11'] },
    { emoji: '🐶', name: '犬系', fam: 'dog',    color: '#e0c890', ids: ['c03','c06','c19','c10','c12'] },
    { emoji: '🐦', name: '鳥系', fam: 'bird',   color: '#c79bff', ids: ['c01','c04','c07','c25','c29'] },
    { emoji: '🐹', name: '鼠系', fam: 'rat',    color: '#d8b890', ids: ['c13','c16','c20','c23','c27'] },
    { emoji: '🐰', name: '兔系', fam: 'rabbit', color: '#e89ab0', ids: ['c31','c32','c33','c34','c35'] },
    { emoji: '🐟', name: '魚系', fam: 'fish',   color: '#7fc8e8', ids: ['c14','c17','c21','c24','c28'] },
    { emoji: '🇹🇼', name: '台灣特有種', fam: 'taiwan', color: '#8fe0a8', ids: ['c15','c18','c22','c26','c30'] },
    { emoji: '🕷️', name: '妖·蜘蛛', fam: 'spider', color: '#b79bff', ids: ['c36','c37','c38','c39','c40'] },
    { emoji: '👹', name: '妖·鬼', fam: 'ghost', color: '#ff6a4a', ids: ['c41','c42','c43','c44','c45'] },
    { emoji: '🧱', name: '妖·牆', fam: 'wall', color: '#c9a86a', ids: ['c46','c47','c48','c49','c50'] },
    { emoji: '🔮', name: '妖·魔女', fam: 'witch', color: '#b06ad0', ids: ['c51','c52','c53','c54','c55'] },
  ] as Team[],
};

export const cards: Card[] = [
  { id:'c02', n:'001', name:'暖暖', en:'Emby', el:'fire', race:'human', fam:'cat', hero:false, lv1:{atk:152,hp:320,rcv:23}, max:{atk:296,hp:624,rcv:45}, lead:{name:'貓·自我爆發',desc:'同屬攻 ×1.5'}, act:{name:'🐱 疾風連擊',desc:'對單敵 攻×1 連打 3 下（吃相剋）',cd:4} },
  { id:'c05', n:'002', name:'露露', en:'Dewy', el:'water', race:'human', fam:'cat', hero:false, lv1:{atk:110,hp:350,rcv:43}, max:{atk:215,hp:683,rcv:84}, lead:{name:'貓·自我爆發',desc:'同屬攻 ×1.5'}, act:{name:'🐱 疾風連擊',desc:'對單敵 攻×1 連打 3 下（吃相剋）',cd:4} },
  { id:'c08', n:'003', name:'霹霹', en:'Zappy', el:'thunder', race:'human', fam:'cat', hero:false, lv1:{atk:140,hp:320,rcv:29}, max:{atk:273,hp:624,rcv:57}, lead:{name:'貓·自我爆發',desc:'同屬攻 ×1.5'}, act:{name:'🐱 疾風連擊',desc:'對單敵 攻×1 連打 3 下（吃相剋）',cd:4} },
  { id:'c09', n:'004', name:'礫礫', en:'Pebbo', el:'earth', race:'human', fam:'cat', hero:false, lv1:{atk:116,hp:460,rcv:35}, max:{atk:226,hp:897,rcv:68}, lead:{name:'貓·自我爆發',desc:'同屬攻 ×1.5'}, act:{name:'🐱 疾風連擊',desc:'對單敵 攻×1 連打 3 下（吃相剋）',cd:4} },
  { id:'c11', n:'005', name:'飄飄', en:'Breezy', el:'wind', race:'human', fam:'cat', hero:false, lv1:{atk:131,hp:360,rcv:32}, max:{atk:255,hp:702,rcv:62}, lead:{name:'貓·自我爆發',desc:'同屬攻 ×1.5'}, act:{name:'🐱 疾風連擊',desc:'對單敵 攻×1 連打 3 下（吃相剋）',cd:4} },
  { id:'c03', n:'006', name:'焰焰', en:'Blazu', el:'fire', race:'human', fam:'dog', hero:false, lv1:{atk:133,hp:390,rcv:29}, max:{atk:259,hp:761,rcv:57}, lead:{name:'犬·攻守雙修',desc:'同屬 HP×1.2 + 攻×1.2'}, act:{name:'🐶 群擊',desc:'對全體敵 攻×2（吃相剋）',cd:5} },
  { id:'c06', n:'007', name:'潑潑', en:'Splashy', el:'water', race:'human', fam:'dog', hero:false, lv1:{atk:90,hp:420,rcv:50}, max:{atk:176,hp:819,rcv:98}, lead:{name:'犬·攻守雙修',desc:'同屬 HP×1.2 + 攻×1.2'}, act:{name:'🐶 群擊',desc:'對全體敵 攻×2（吃相剋）',cd:5} },
  { id:'c19', n:'008', name:'轟轟', en:'Boltz', el:'thunder', race:'human', fam:'dog', hero:false, lv1:{atk:120,hp:390,rcv:36}, max:{atk:234,hp:761,rcv:70}, lead:{name:'犬·攻守雙修',desc:'同屬 HP×1.2 + 攻×1.2'}, act:{name:'🐶 群擊',desc:'對全體敵 攻×2（吃相剋）',cd:5} },
  { id:'c10', n:'009', name:'岩岩', en:'Rocco', el:'earth', race:'human', fam:'dog', hero:false, lv1:{atk:96,hp:530,rcv:41}, max:{atk:187,hp:1034,rcv:80}, lead:{name:'犬·攻守雙修',desc:'同屬 HP×1.2 + 攻×1.2'}, act:{name:'🐶 群擊',desc:'對全體敵 攻×2（吃相剋）',cd:5} },
  { id:'c12', n:'010', name:'颯颯', en:'Gusto', el:'wind', race:'human', fam:'dog', hero:false, lv1:{atk:111,hp:430,rcv:39}, max:{atk:216,hp:839,rcv:76}, lead:{name:'犬·攻守雙修',desc:'同屬 HP×1.2 + 攻×1.2'}, act:{name:'🐶 群擊',desc:'對全體敵 攻×2（吃相剋）',cd:5} },
  { id:'c01', n:'011', name:'曦曦', en:'Pyri', el:'fire', race:'yokai', fam:'bird', hero:false, lv1:{atk:152,hp:250,rcv:27}, max:{atk:296,hp:488,rcv:53}, lead:{name:'鳥·控敵先制',desc:'開局剋屬敵 CD+2'}, act:{name:'🐦 亂鳴',desc:'剋屬敵 CD+2（出手延遲 +2）',cd:4} },
  { id:'c04', n:'012', name:'漣漣', en:'Rippy', el:'water', race:'yokai', fam:'bird', hero:false, lv1:{atk:110,hp:280,rcv:47}, max:{atk:215,hp:546,rcv:92}, lead:{name:'鳥·控敵先制',desc:'開局剋屬敵 CD+2'}, act:{name:'🐦 亂鳴',desc:'剋屬敵 CD+2（出手延遲 +2）',cd:4} },
  { id:'c07', n:'013', name:'嗶嗶', en:'Buzzo', el:'thunder', race:'yokai', fam:'bird', hero:false, lv1:{atk:140,hp:250,rcv:33}, max:{atk:273,hp:488,rcv:64}, lead:{name:'鳥·控敵先制',desc:'開局剋屬敵 CD+2'}, act:{name:'🐦 亂鳴',desc:'剋屬敵 CD+2（出手延遲 +2）',cd:4} },
  { id:'c25', n:'014', name:'苔苔', en:'Mossy', el:'earth', race:'yokai', fam:'bird', hero:false, lv1:{atk:116,hp:390,rcv:38}, max:{atk:226,hp:761,rcv:74}, lead:{name:'鳥·控敵先制',desc:'開局剋屬敵 CD+2'}, act:{name:'🐦 亂鳴',desc:'剋屬敵 CD+2（出手延遲 +2）',cd:4} },
  { id:'c29', n:'015', name:'翔翔', en:'Skye', el:'wind', race:'yokai', fam:'bird', hero:false, lv1:{atk:131,hp:290,rcv:36}, max:{atk:255,hp:566,rcv:70}, lead:{name:'鳥·控敵先制',desc:'開局剋屬敵 CD+2'}, act:{name:'🐦 亂鳴',desc:'剋屬敵 CD+2（出手延遲 +2）',cd:4} },
  { id:'c13', n:'016', name:'烘烘', en:'Sparki', el:'fire', race:'yokai', fam:'rat', hero:false, lv1:{atk:136,hp:370,rcv:29}, max:{atk:265,hp:722,rcv:57}, lead:{name:'鼠·大清爆發',desc:'同鼠系攻 ×1.5；HIT≥15 → 同屬攻 ×2'}, act:{name:'🐭 鼠潮',desc:'填滿該卡屬性宮並消除 → 大 HIT',cd:6} },
  { id:'c16', n:'017', name:'沁沁', en:'Mistu', el:'water', race:'yokai', fam:'rat', hero:false, lv1:{atk:94,hp:390,rcv:49}, max:{atk:183,hp:761,rcv:96}, lead:{name:'鼠·大清爆發',desc:'同鼠系攻 ×1.5；HIT≥15 → 同屬攻 ×2'}, act:{name:'🐭 鼠潮',desc:'填滿該卡屬性宮並消除 → 大 HIT',cd:6} },
  { id:'c20', n:'018', name:'滋滋', en:'Volty', el:'thunder', race:'yokai', fam:'rat', hero:false, lv1:{atk:124,hp:370,rcv:35}, max:{atk:242,hp:722,rcv:68}, lead:{name:'鼠·大清爆發',desc:'同鼠系攻 ×1.5；HIT≥15 → 同屬攻 ×2'}, act:{name:'🐭 鼠潮',desc:'填滿該卡屬性宮並消除 → 大 HIT',cd:6} },
  { id:'c23', n:'019', name:'栗栗', en:'Nutty', el:'earth', race:'yokai', fam:'rat', hero:false, lv1:{atk:99,hp:510,rcv:40}, max:{atk:193,hp:995,rcv:78}, lead:{name:'鼠·大清爆發',desc:'同鼠系攻 ×1.5；HIT≥15 → 同屬攻 ×2'}, act:{name:'🐭 鼠潮',desc:'填滿該卡屬性宮並消除 → 大 HIT',cd:6} },
  { id:'c27', n:'020', name:'旋旋', en:'Whirly', el:'wind', race:'yokai', fam:'rat', hero:false, lv1:{atk:114,hp:400,rcv:38}, max:{atk:222,hp:780,rcv:74}, lead:{name:'鼠·大清爆發',desc:'同鼠系攻 ×1.5；HIT≥15 → 同屬攻 ×2'}, act:{name:'🐭 鼠潮',desc:'填滿該卡屬性宮並消除 → 大 HIT',cd:6} },
  { id:'c31', n:'021', name:'焙焙', en:'Cindi', el:'fire', race:'beast', fam:'rabbit', hero:false, lv1:{atk:118,hp:460,rcv:33}, max:{atk:230,hp:897,rcv:64}, lead:{name:'兔·繁殖增幅',desc:'同兔系攻 ×1.5；同屬宮被解 → 該屬塊 +1 LV'}, act:{name:'🐰 化境',desc:'全盤屬性宮 1 回合內變成自己同屬（相剋爆發 setup）',cd:7} },
  { id:'c32', n:'022', name:'雪雪', en:'Frosti', el:'water', race:'beast', fam:'rabbit', hero:false, lv1:{atk:75,hp:490,rcv:54}, max:{atk:146,hp:956,rcv:105}, lead:{name:'兔·繁殖增幅',desc:'同兔系攻 ×1.5；同屬宮被解 → 該屬塊 +1 LV'}, act:{name:'🐰 化境',desc:'全盤屬性宮 1 回合內變成自己同屬（相剋爆發 setup）',cd:7} },
  { id:'c33', n:'023', name:'閃閃', en:'Jolty', el:'thunder', race:'beast', fam:'rabbit', hero:false, lv1:{atk:105,hp:460,rcv:40}, max:{atk:205,hp:897,rcv:78}, lead:{name:'兔·繁殖增幅',desc:'同兔系攻 ×1.5；同屬宮被解 → 該屬塊 +1 LV'}, act:{name:'🐰 化境',desc:'全盤屬性宮 1 回合內變成自己同屬（相剋爆發 setup）',cd:7} },
  { id:'c34', n:'024', name:'墩墩', en:'Cobby', el:'earth', race:'beast', fam:'rabbit', hero:false, lv1:{atk:81,hp:600,rcv:45}, max:{atk:158,hp:1170,rcv:88}, lead:{name:'兔·繁殖增幅',desc:'同兔系攻 ×1.5；同屬宮被解 → 該屬塊 +1 LV'}, act:{name:'🐰 化境',desc:'全盤屬性宮 1 回合內變成自己同屬（相剋爆發 setup）',cd:7} },
  { id:'c35', n:'025', name:'蓬蓬', en:'Puffy', el:'wind', race:'beast', fam:'rabbit', hero:false, lv1:{atk:96,hp:500,rcv:43}, max:{atk:187,hp:975,rcv:84}, lead:{name:'兔·繁殖增幅',desc:'同兔系攻 ×1.5；同屬宮被解 → 該屬塊 +1 LV'}, act:{name:'🐰 化境',desc:'全盤屬性宮 1 回合內變成自己同屬（相剋爆發 setup）',cd:7} },
  { id:'c14', n:'026', name:'燦燦', en:'Glowy', el:'fire', race:'beast', fam:'fish', hero:false, lv1:{atk:106,hp:460,rcv:39}, max:{atk:207,hp:897,rcv:76}, lead:{name:'魚·連鎖增幅',desc:'同魚系攻 ×1.5；combo≥2 → 同屬攻 ×1.8'}, act:{name:'🐟 活水',desc:'6 手內清該屬宮也按格數回血',cd:5} },
  { id:'c17', n:'027', name:'澄澄', en:'Marlo', el:'water', race:'beast', fam:'fish', hero:false, lv1:{atk:64,hp:490,rcv:59}, max:{atk:125,hp:956,rcv:115}, lead:{name:'魚·連鎖增幅',desc:'同魚系攻 ×1.5；combo≥2 → 同屬攻 ×1.8'}, act:{name:'🐟 活水',desc:'6 手內清該屬宮也按格數回血',cd:5} },
  { id:'c21', n:'028', name:'嘶嘶', en:'Ampy', el:'thunder', race:'beast', fam:'fish', hero:false, lv1:{atk:94,hp:460,rcv:46}, max:{atk:183,hp:897,rcv:90}, lead:{name:'魚·連鎖增幅',desc:'同魚系攻 ×1.5；combo≥2 → 同屬攻 ×1.8'}, act:{name:'🐟 活水',desc:'6 手內清該屬宮也按格數回血',cd:5} },
  { id:'c24', n:'029', name:'磊磊', en:'Bouldy', el:'earth', race:'beast', fam:'fish', hero:false, lv1:{atk:69,hp:600,rcv:51}, max:{atk:135,hp:1170,rcv:99}, lead:{name:'魚·連鎖增幅',desc:'同魚系攻 ×1.5；combo≥2 → 同屬攻 ×1.8'}, act:{name:'🐟 活水',desc:'6 手內清該屬宮也按格數回血',cd:5} },
  { id:'c28', n:'030', name:'咻咻', en:'Zephy', el:'wind', race:'beast', fam:'fish', hero:false, lv1:{atk:84,hp:500,rcv:49}, max:{atk:164,hp:975,rcv:96}, lead:{name:'魚·連鎖增幅',desc:'同魚系攻 ×1.5；combo≥2 → 同屬攻 ×1.8'}, act:{name:'🐟 活水',desc:'6 手內清該屬宮也按格數回血',cd:5} },
  { id:'c15', n:'031', name:'大武', en:'Dawu', species:'臺灣雲豹', evo:{name:'爆炎大武',en:'Blaze Dawu'}, el:'fire', race:'beast', fam:'taiwan', hero:true, lv1:{atk:141,hp:350,rcv:28}, max:{atk:275,hp:683,rcv:55}, lead:{name:'掠食者之威',desc:'攻擊力 ×1.12'}, act:{name:'🐆 裂空撲殺',desc:'總傷≈攻×2：敵單隻→集中、多隻→均分全體，各吃相剋',cd:3} },
  { id:'c18', n:'032', name:'武陵', en:'Wuling', species:'櫻花鉤吻鮭', evo:{name:'蒼瀾武陵',en:'Tidal Wuling'}, el:'water', race:'beast', fam:'taiwan', hero:true, lv1:{atk:98,hp:370,rcv:48}, max:{atk:191,hp:722,rcv:94}, lead:{name:'冰河迴生',desc:'HP≤10%（含致死）自動回 50%，過 9 輪再生'}, act:{name:'🐟 溯流之癒',desc:'本手清除按格數額外回血（上限約半血）',cd:4} },
  { id:'c22', n:'033', name:'太魯閣', en:'Taroko', species:'臺灣藍鵲', evo:{name:'紫電太魯閣',en:'Volt Taroko'}, el:'thunder', race:'beast', fam:'taiwan', hero:true, lv1:{atk:128,hp:350,rcv:34}, max:{atk:250,hp:683,rcv:66}, lead:{name:'鳴聲威懾',desc:'每關開場全敵延遲 +1 手（一次性）'}, act:{name:'🐦 群鵲圍攻',desc:'全體敵出手延遲 +2 手',cd:4} },
  { id:'c26', n:'034', name:'玉山', en:'Yushan', species:'臺灣黑熊', evo:{name:'磐岩玉山',en:'Terra Yushan'}, el:'earth', race:'beast', fam:'taiwan', hero:true, lv1:{atk:104,hp:490,rcv:39}, max:{atk:203,hp:956,rcv:76}, lead:{name:'熊之守護',desc:'擋下敵攻擊 1 次，過 5 輪再生護盾'}, act:{name:'🐻 巨塊',desc:'清空托盤→生成 1 個 3×3 疊塊，放上去補滿一宮→大清',cd:5} },
  { id:'c30', n:'035', name:'阿里', en:'Ali', species:'臺灣獼猴', evo:{name:'旋風阿里',en:'Gale Ali'}, el:'wind', race:'beast', fam:'taiwan', hero:true, lv1:{atk:119,hp:380,rcv:37}, max:{atk:232,hp:741,rcv:72}, lead:{name:'猴群偷襲',desc:'每塊有清→隊長偷打（攻×0.25）+1 combo'}, act:{name:'🐒 靈猴造塊',desc:'托盤 3 塊變成可覆蓋的 2×2 塊，易解宮',cd:4} },
  // ── 🕷️ 妖·蜘蛛（雜牌卡：僅關卡掉落、不進轉蛋；基礎 ★1，進化 ★2＝岩甲◯蜘蛛；無隊長技）──
  { id:'c36', n:'036', name:'火蜘蛛', en:'Fire Spider', evo:{name:'岩甲火蜘蛛',en:'Ironclad Fire Spider'}, el:'fire', race:'yokai', fam:'spider', hero:false, dropOnly:true, lv1:{atk:130,hp:90,rcv:8}, max:{atk:254,hp:176,rcv:16}, act:{name:'🕸️ 蛛絲纏縛',desc:'鎖定 1 敵，其出手倒數 +1 手',cd:4} },
  { id:'c37', n:'037', name:'水蜘蛛', en:'Water Spider', evo:{name:'岩甲水蜘蛛',en:'Ironclad Water Spider'}, el:'water', race:'yokai', fam:'spider', hero:false, dropOnly:true, lv1:{atk:65,hp:110,rcv:24}, max:{atk:127,hp:215,rcv:47}, act:{name:'🕸️ 蛛絲纏縛',desc:'鎖定 1 敵，其出手倒數 +1 手',cd:4} },
  { id:'c38', n:'038', name:'雷蜘蛛', en:'Thunder Spider', evo:{name:'岩甲雷蜘蛛',en:'Ironclad Thunder Spider'}, el:'thunder', race:'yokai', fam:'spider', hero:false, dropOnly:true, lv1:{atk:115,hp:95,rcv:14}, max:{atk:224,hp:185,rcv:27}, act:{name:'🕸️ 蛛絲纏縛',desc:'鎖定 1 敵，其出手倒數 +1 手',cd:4} },
  { id:'c39', n:'039', name:'土蜘蛛', en:'Earth Spider', evo:{name:'岩甲土蜘蛛',en:'Ironclad Earth Spider'}, el:'earth', race:'yokai', fam:'spider', hero:false, dropOnly:true, lv1:{atk:80,hp:140,rcv:14}, max:{atk:156,hp:273,rcv:27}, act:{name:'🕸️ 蛛絲纏縛',desc:'鎖定 1 敵，其出手倒數 +1 手',cd:4} },
  { id:'c40', n:'040', name:'風蜘蛛', en:'Wind Spider', evo:{name:'岩甲風蜘蛛',en:'Ironclad Wind Spider'}, el:'wind', race:'yokai', fam:'spider', hero:false, dropOnly:true, lv1:{atk:100,hp:100,rcv:16}, max:{atk:195,hp:195,rcv:31}, act:{name:'🕸️ 蛛絲纏縛',desc:'鎖定 1 敵，其出手倒數 +1 手',cd:4} },
  // ── 👹 妖·鬼（雜牌卡：僅關卡掉落、不進轉蛋；基礎 ★1，進化 ★2＝◯鬼哥；無隊長技）──
  { id:'c41', n:'041', name:'火小鬼', en:'Fire Imp', evo:{name:'火鬼哥',en:'Fire Oni'}, el:'fire', race:'yokai', fam:'ghost', hero:false, dropOnly:true, lv1:{atk:140,hp:85,rcv:8}, max:{atk:273,hp:166,rcv:16}, act:{name:'👊 怨擊',desc:'對指定 1 敵造成 攻擊力×2 傷害（吃相剋）',cd:5} },
  { id:'c42', n:'042', name:'水小鬼', en:'Water Imp', evo:{name:'水鬼哥',en:'Water Oni'}, el:'water', race:'yokai', fam:'ghost', hero:false, dropOnly:true, lv1:{atk:70,hp:120,rcv:22}, max:{atk:137,hp:234,rcv:43}, act:{name:'👊 怨擊',desc:'對指定 1 敵造成 攻擊力×2 傷害（吃相剋）',cd:5} },
  { id:'c43', n:'043', name:'雷小鬼', en:'Thunder Imp', evo:{name:'雷鬼哥',en:'Thunder Oni'}, el:'thunder', race:'yokai', fam:'ghost', hero:false, dropOnly:true, lv1:{atk:120,hp:90,rcv:13}, max:{atk:234,hp:176,rcv:25}, act:{name:'👊 怨擊',desc:'對指定 1 敵造成 攻擊力×2 傷害（吃相剋）',cd:5} },
  { id:'c44', n:'044', name:'土小鬼', en:'Earth Imp', evo:{name:'土鬼哥',en:'Earth Oni'}, el:'earth', race:'yokai', fam:'ghost', hero:false, dropOnly:true, lv1:{atk:85,hp:145,rcv:13}, max:{atk:166,hp:283,rcv:25}, act:{name:'👊 怨擊',desc:'對指定 1 敵造成 攻擊力×2 傷害（吃相剋）',cd:5} },
  { id:'c45', n:'045', name:'風小鬼', en:'Wind Imp', evo:{name:'風鬼哥',en:'Wind Oni'}, el:'wind', race:'yokai', fam:'ghost', hero:false, dropOnly:true, lv1:{atk:105,hp:100,rcv:15}, max:{atk:205,hp:195,rcv:29}, act:{name:'👊 怨擊',desc:'對指定 1 敵造成 攻擊力×2 傷害（吃相剋）',cd:5} },
  // ── 🧱 妖·牆（雜牌卡：僅關卡掉落、不進轉蛋；基礎 ★1，進化 ★2＝◯城牆怪；無隊長技）──
  { id:'c46', n:'046', name:'火牆怪', en:'Fire Wall', evo:{name:'火城牆怪',en:'Fire Rampart'}, el:'fire', race:'yokai', fam:'wall', hero:false, dropOnly:true, lv1:{atk:105,hp:135,rcv:8}, max:{atk:205,hp:263,rcv:16}, act:{name:'🧱 築牆阻擋',desc:'全體敵人出手倒數 +1 手',cd:6} },
  { id:'c47', n:'047', name:'水牆怪', en:'Water Wall', evo:{name:'水城牆怪',en:'Water Rampart'}, el:'water', race:'yokai', fam:'wall', hero:false, dropOnly:true, lv1:{atk:55,hp:165,rcv:20}, max:{atk:107,hp:322,rcv:39}, act:{name:'🧱 築牆阻擋',desc:'全體敵人出手倒數 +1 手',cd:6} },
  { id:'c48', n:'048', name:'雷牆怪', en:'Thunder Wall', evo:{name:'雷城牆怪',en:'Thunder Rampart'}, el:'thunder', race:'yokai', fam:'wall', hero:false, dropOnly:true, lv1:{atk:95,hp:140,rcv:12}, max:{atk:185,hp:273,rcv:23}, act:{name:'🧱 築牆阻擋',desc:'全體敵人出手倒數 +1 手',cd:6} },
  { id:'c49', n:'049', name:'土牆怪', en:'Earth Wall', evo:{name:'土城牆怪',en:'Earth Rampart'}, el:'earth', race:'yokai', fam:'wall', hero:false, dropOnly:true, lv1:{atk:70,hp:185,rcv:12}, max:{atk:137,hp:361,rcv:23}, act:{name:'🧱 築牆阻擋',desc:'全體敵人出手倒數 +1 手',cd:6} },
  { id:'c50', n:'050', name:'風牆怪', en:'Wind Wall', evo:{name:'風城牆怪',en:'Wind Rampart'}, el:'wind', race:'yokai', fam:'wall', hero:false, dropOnly:true, lv1:{atk:85,hp:150,rcv:14}, max:{atk:166,hp:293,rcv:27}, act:{name:'🧱 築牆阻擋',desc:'全體敵人出手倒數 +1 手',cd:6} },
  // ── 🔮 妖·魔女（雜牌卡：僅關卡掉落、不進轉蛋；基礎 ★1，進化 ★2＝大◯魔女；無隊長技）──
  { id:'c51', n:'051', name:'火魔女', en:'Fire Witch', evo:{name:'大火魔女',en:'Great Fire Witch'}, el:'fire', race:'yokai', fam:'witch', hero:false, dropOnly:true, lv1:{atk:135,hp:85,rcv:10}, max:{atk:263,hp:166,rcv:20}, act:{name:'🔮 魔女術式',desc:'對全體敵人造成 攻擊力×1.6 傷害（吃相剋）',cd:6} },
  { id:'c52', n:'052', name:'水魔女', en:'Water Witch', evo:{name:'大水魔女',en:'Great Water Witch'}, el:'water', race:'yokai', fam:'witch', hero:false, dropOnly:true, lv1:{atk:90,hp:130,rcv:22}, max:{atk:176,hp:254,rcv:43}, act:{name:'🔮 魔女術式',desc:'對全體敵人造成 攻擊力×1.6 傷害（吃相剋）',cd:6} },
  { id:'c53', n:'053', name:'雷魔女', en:'Thunder Witch', evo:{name:'大雷魔女',en:'Great Thunder Witch'}, el:'thunder', race:'yokai', fam:'witch', hero:false, dropOnly:true, lv1:{atk:125,hp:95,rcv:14}, max:{atk:244,hp:185,rcv:27}, act:{name:'🔮 魔女術式',desc:'對全體敵人造成 攻擊力×1.6 傷害（吃相剋）',cd:6} },
  { id:'c54', n:'054', name:'土魔女', en:'Earth Witch', evo:{name:'大土魔女',en:'Great Earth Witch'}, el:'earth', race:'yokai', fam:'witch', hero:false, dropOnly:true, lv1:{atk:95,hp:145,rcv:14}, max:{atk:185,hp:283,rcv:27}, act:{name:'🔮 魔女術式',desc:'對全體敵人造成 攻擊力×1.6 傷害（吃相剋）',cd:6} },
  { id:'c55', n:'055', name:'風魔女', en:'Wind Witch', evo:{name:'大風魔女',en:'Great Wind Witch'}, el:'wind', race:'yokai', fam:'witch', hero:false, dropOnly:true, lv1:{atk:115,hp:105,rcv:16}, max:{atk:224,hp:205,rcv:31}, act:{name:'🔮 魔女術式',desc:'對全體敵人造成 攻擊力×1.6 傷害（吃相剋）',cd:6} },
];

export const byId: Record<string, Card> = Object.fromEntries(cards.map(c => [c.id, c]));
// 圖鑑分組展開順序（前後切換用）
export const order: string[] = meta.teams.flatMap(t => t.ids);
