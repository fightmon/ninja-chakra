/* 塊頭勇者 角色圖鑑資料 — 從遊戲主檔(play/index.html)萃取，數值為家族公式重算後之實際生效值。
   lv1=基礎(LV1,未進化)、max=滿級(LV20,未進化)。星級一律 ★3(可進化 +2，最高 ★5)。
   隊長技/主動技為遊戲中「實際生效」的家族技/台灣卡技（非設計草稿死碼）。
   n=圖鑑編號，依遊戲圖鑑分組順序(貓→犬→鳥→鼠→兔→魚→台灣，各隊火→水→雷→土→風)由 001 順編到 035。 */
window.DEX = {
  meta: {
    elName: { fire:'火', water:'水', thunder:'雷', earth:'土', wind:'風' },
    elColor:{ fire:'#ff6a3d', water:'#37b6ff', thunder:'#f0b410', earth:'#c8873f', wind:'#3fbf54' },
    famName:{ cat:'貓', dog:'犬', bird:'鳥', rat:'鼠', fish:'魚', rabbit:'兔', taiwan:'台灣特有種' },
    raceName:{ human:'人忍', yokai:'妖怪', beast:'靈獸' },
    note:'三圍為家族公式重算後的實際值；LV1＝基礎、滿級＝LV20（未進化）。星級基礎一律 ★3，可進化再 +2（最高 ★5）。屬性相剋：火→風→雷→土→水→火。',
    // 圖鑑分組順序＝遊戲內圖鑑(SPECIES_TEAMS)：物種隊由上到下，每隊內火→水→雷→土→風
    teams:[
      {emoji:'🐱',name:'貓系',fam:'cat',color:'#8fd16a',ids:['c02','c05','c08','c09','c11']},
      {emoji:'🐶',name:'犬系',fam:'dog',color:'#e0c890',ids:['c03','c06','c19','c10','c12']},
      {emoji:'🐦',name:'鳥系',fam:'bird',color:'#c79bff',ids:['c01','c04','c07','c25','c29']},
      {emoji:'🐹',name:'鼠系',fam:'rat',color:'#d8b890',ids:['c13','c16','c20','c23','c27']},
      {emoji:'🐰',name:'兔系',fam:'rabbit',color:'#e89ab0',ids:['c31','c32','c33','c34','c35']},
      {emoji:'🐟',name:'魚系',fam:'fish',color:'#7fc8e8',ids:['c14','c17','c21','c24','c28']},
      {emoji:'🇹🇼',name:'台灣特有種',fam:'taiwan',color:'#8fe0a8',ids:['c15','c18','c22','c26','c30']}
    ]
  },
  cards: [
    {id:'c02',n:'001',name:'茜',el:'fire',race:'human',fam:'cat',hero:false,lv1:{atk:152,hp:320,rcv:23},max:{atk:296,hp:624,rcv:45},lead:{name:'貓·自我爆發',desc:'同屬攻 ×1.5'},act:{name:'🐱 疾風連擊',desc:'對單敵 攻×1 連打 3 下（吃相剋）',cd:4}},
    {id:'c05',n:'002',name:'雫',el:'water',race:'human',fam:'cat',hero:false,lv1:{atk:110,hp:350,rcv:43},max:{atk:215,hp:683,rcv:84},lead:{name:'貓·自我爆發',desc:'同屬攻 ×1.5'},act:{name:'🐱 疾風連擊',desc:'對單敵 攻×1 連打 3 下（吃相剋）',cd:4}},
    {id:'c08',n:'003',name:'響',el:'thunder',race:'human',fam:'cat',hero:false,lv1:{atk:140,hp:320,rcv:29},max:{atk:273,hp:624,rcv:57},lead:{name:'貓·自我爆發',desc:'同屬攻 ×1.5'},act:{name:'🐱 疾風連擊',desc:'對單敵 攻×1 連打 3 下（吃相剋）',cd:4}},
    {id:'c09',n:'004',name:'椿',el:'earth',race:'human',fam:'cat',hero:false,lv1:{atk:116,hp:460,rcv:35},max:{atk:226,hp:897,rcv:68},lead:{name:'貓·自我爆發',desc:'同屬攻 ×1.5'},act:{name:'🐱 疾風連擊',desc:'對單敵 攻×1 連打 3 下（吃相剋）',cd:4}},
    {id:'c11',n:'005',name:'空',el:'wind',race:'human',fam:'cat',hero:false,lv1:{atk:131,hp:360,rcv:32},max:{atk:255,hp:702,rcv:62},lead:{name:'貓·自我爆發',desc:'同屬攻 ×1.5'},act:{name:'🐱 疾風連擊',desc:'對單敵 攻×1 連打 3 下（吃相剋）',cd:4}},
    {id:'c03',n:'006',name:'炎助',el:'fire',race:'human',fam:'dog',hero:false,lv1:{atk:133,hp:390,rcv:29},max:{atk:259,hp:761,rcv:57},lead:{name:'犬·攻守雙修',desc:'同屬 HP×1.2 + 攻×1.2'},act:{name:'🐶 群擊',desc:'對全體敵 攻×2（吃相剋）',cd:5}},
    {id:'c06',n:'007',name:'水無',el:'water',race:'human',fam:'dog',hero:false,lv1:{atk:90,hp:420,rcv:50},max:{atk:176,hp:819,rcv:98},lead:{name:'犬·攻守雙修',desc:'同屬 HP×1.2 + 攻×1.2'},act:{name:'🐶 群擊',desc:'對全體敵 攻×2（吃相剋）',cd:5}},
    {id:'c19',n:'008',name:'雷太',el:'thunder',race:'human',fam:'dog',hero:false,lv1:{atk:120,hp:390,rcv:36},max:{atk:234,hp:761,rcv:70},lead:{name:'犬·攻守雙修',desc:'同屬 HP×1.2 + 攻×1.2'},act:{name:'🐶 群擊',desc:'對全體敵 攻×2（吃相剋）',cd:5}},
    {id:'c10',n:'009',name:'土丸',el:'earth',race:'human',fam:'dog',hero:false,lv1:{atk:96,hp:530,rcv:41},max:{atk:187,hp:1034,rcv:80},lead:{name:'犬·攻守雙修',desc:'同屬 HP×1.2 + 攻×1.2'},act:{name:'🐶 群擊',desc:'對全體敵 攻×2（吃相剋）',cd:5}},
    {id:'c12',n:'010',name:'疾風',el:'wind',race:'human',fam:'dog',hero:false,lv1:{atk:111,hp:430,rcv:39},max:{atk:216,hp:839,rcv:76},lead:{name:'犬·攻守雙修',desc:'同屬 HP×1.2 + 攻×1.2'},act:{name:'🐶 群擊',desc:'對全體敵 攻×2（吃相剋）',cd:5}},
    {id:'c01',n:'011',name:'朱',el:'fire',race:'yokai',fam:'bird',hero:false,lv1:{atk:152,hp:250,rcv:27},max:{atk:296,hp:488,rcv:53},lead:{name:'鳥·控敵先制',desc:'開局剋屬敵 CD+2'},act:{name:'🐦 亂鳴',desc:'剋屬敵 CD+2（出手延遲 +2）',cd:4}},
    {id:'c04',n:'012',name:'凪',el:'water',race:'yokai',fam:'bird',hero:false,lv1:{atk:110,hp:280,rcv:47},max:{atk:215,hp:546,rcv:92},lead:{name:'鳥·控敵先制',desc:'開局剋屬敵 CD+2'},act:{name:'🐦 亂鳴',desc:'剋屬敵 CD+2（出手延遲 +2）',cd:4}},
    {id:'c07',n:'013',name:'鳴',el:'thunder',race:'yokai',fam:'bird',hero:false,lv1:{atk:140,hp:250,rcv:33},max:{atk:273,hp:488,rcv:64},lead:{name:'鳥·控敵先制',desc:'開局剋屬敵 CD+2'},act:{name:'🐦 亂鳴',desc:'剋屬敵 CD+2（出手延遲 +2）',cd:4}},
    {id:'c25',n:'014',name:'梟',el:'earth',race:'yokai',fam:'bird',hero:false,lv1:{atk:116,hp:390,rcv:38},max:{atk:226,hp:761,rcv:74},lead:{name:'鳥·控敵先制',desc:'開局剋屬敵 CD+2'},act:{name:'🐦 亂鳴',desc:'剋屬敵 CD+2（出手延遲 +2）',cd:4}},
    {id:'c29',n:'015',name:'翔',el:'wind',race:'yokai',fam:'bird',hero:false,lv1:{atk:131,hp:290,rcv:36},max:{atk:255,hp:566,rcv:70},lead:{name:'鳥·控敵先制',desc:'開局剋屬敵 CD+2'},act:{name:'🐦 亂鳴',desc:'剋屬敵 CD+2（出手延遲 +2）',cd:4}},
    {id:'c13',n:'016',name:'豆',el:'fire',race:'yokai',fam:'rat',hero:false,lv1:{atk:136,hp:370,rcv:29},max:{atk:265,hp:722,rcv:57},lead:{name:'鼠·大清爆發',desc:'同鼠系攻 ×1.5；HIT≥15 → 同屬攻 ×2'},act:{name:'🐭 鼠潮',desc:'填滿該卡屬性宮並消除 → 大 HIT',cd:6}},
    {id:'c16',n:'017',name:'露',el:'water',race:'yokai',fam:'rat',hero:false,lv1:{atk:94,hp:390,rcv:49},max:{atk:183,hp:761,rcv:96},lead:{name:'鼠·大清爆發',desc:'同鼠系攻 ×1.5；HIT≥15 → 同屬攻 ×2'},act:{name:'🐭 鼠潮',desc:'填滿該卡屬性宮並消除 → 大 HIT',cd:6}},
    {id:'c20',n:'018',name:'智',el:'thunder',race:'yokai',fam:'rat',hero:false,lv1:{atk:124,hp:370,rcv:35},max:{atk:242,hp:722,rcv:68},lead:{name:'鼠·大清爆發',desc:'同鼠系攻 ×1.5；HIT≥15 → 同屬攻 ×2'},act:{name:'🐭 鼠潮',desc:'填滿該卡屬性宮並消除 → 大 HIT',cd:6}},
    {id:'c23',n:'019',name:'栗',el:'earth',race:'yokai',fam:'rat',hero:false,lv1:{atk:99,hp:510,rcv:40},max:{atk:193,hp:995,rcv:78},lead:{name:'鼠·大清爆發',desc:'同鼠系攻 ×1.5；HIT≥15 → 同屬攻 ×2'},act:{name:'🐭 鼠潮',desc:'填滿該卡屬性宮並消除 → 大 HIT',cd:6}},
    {id:'c27',n:'020',name:'楓',el:'wind',race:'yokai',fam:'rat',hero:false,lv1:{atk:114,hp:400,rcv:38},max:{atk:222,hp:780,rcv:74},lead:{name:'鼠·大清爆發',desc:'同鼠系攻 ×1.5；HIT≥15 → 同屬攻 ×2'},act:{name:'🐭 鼠潮',desc:'填滿該卡屬性宮並消除 → 大 HIT',cd:6}},
    {id:'c31',n:'021',name:'莓',el:'fire',race:'beast',fam:'rabbit',hero:false,lv1:{atk:118,hp:460,rcv:33},max:{atk:230,hp:897,rcv:64},lead:{name:'兔·繁殖增幅',desc:'同兔系攻 ×1.5；同屬宮被解 → 該屬塊 +1 LV'},act:{name:'🐰 化境',desc:'全盤屬性宮 1 回合內變成自己同屬（相剋爆發 setup）',cd:7}},
    {id:'c32',n:'022',name:'雪',el:'water',race:'beast',fam:'rabbit',hero:false,lv1:{atk:75,hp:490,rcv:54},max:{atk:146,hp:956,rcv:105},lead:{name:'兔·繁殖增幅',desc:'同兔系攻 ×1.5；同屬宮被解 → 該屬塊 +1 LV'},act:{name:'🐰 化境',desc:'全盤屬性宮 1 回合內變成自己同屬（相剋爆發 setup）',cd:7}},
    {id:'c33',n:'023',name:'鈴',el:'thunder',race:'beast',fam:'rabbit',hero:false,lv1:{atk:105,hp:460,rcv:40},max:{atk:205,hp:897,rcv:78},lead:{name:'兔·繁殖增幅',desc:'同兔系攻 ×1.5；同屬宮被解 → 該屬塊 +1 LV'},act:{name:'🐰 化境',desc:'全盤屬性宮 1 回合內變成自己同屬（相剋爆發 setup）',cd:7}},
    {id:'c34',n:'024',name:'餅',el:'earth',race:'beast',fam:'rabbit',hero:false,lv1:{atk:81,hp:600,rcv:45},max:{atk:158,hp:1170,rcv:88},lead:{name:'兔·繁殖增幅',desc:'同兔系攻 ×1.5；同屬宮被解 → 該屬塊 +1 LV'},act:{name:'🐰 化境',desc:'全盤屬性宮 1 回合內變成自己同屬（相剋爆發 setup）',cd:7}},
    {id:'c35',n:'025',name:'萌',el:'wind',race:'beast',fam:'rabbit',hero:false,lv1:{atk:96,hp:500,rcv:43},max:{atk:187,hp:975,rcv:84},lead:{name:'兔·繁殖增幅',desc:'同兔系攻 ×1.5；同屬宮被解 → 該屬塊 +1 LV'},act:{name:'🐰 化境',desc:'全盤屬性宮 1 回合內變成自己同屬（相剋爆發 setup）',cd:7}},
    {id:'c14',n:'026',name:'緋貂',el:'fire',race:'beast',fam:'fish',hero:false,lv1:{atk:106,hp:460,rcv:39},max:{atk:207,hp:897,rcv:76},lead:{name:'魚·連鎖增幅',desc:'同魚系攻 ×1.5；combo≥2 → 同屬攻 ×1.8'},act:{name:'🐟 活水',desc:'6 手內清該屬宮也按格數回血',cd:5}},
    {id:'c17',n:'027',name:'蒼蛟',el:'water',race:'beast',fam:'fish',hero:false,lv1:{atk:64,hp:490,rcv:59},max:{atk:125,hp:956,rcv:115},lead:{name:'魚·連鎖增幅',desc:'同魚系攻 ×1.5；combo≥2 → 同屬攻 ×1.8'},act:{name:'🐟 活水',desc:'6 手內清該屬宮也按格數回血',cd:5}},
    {id:'c21',n:'028',name:'紫豹',el:'thunder',race:'beast',fam:'fish',hero:false,lv1:{atk:94,hp:460,rcv:46},max:{atk:183,hp:897,rcv:90},lead:{name:'魚·連鎖增幅',desc:'同魚系攻 ×1.5；combo≥2 → 同屬攻 ×1.8'},act:{name:'🐟 活水',desc:'6 手內清該屬宮也按格數回血',cd:5}},
    {id:'c24',n:'029',name:'石龜',el:'earth',race:'beast',fam:'fish',hero:false,lv1:{atk:69,hp:600,rcv:51},max:{atk:135,hp:1170,rcv:99},lead:{name:'魚·連鎖增幅',desc:'同魚系攻 ×1.5；combo≥2 → 同屬攻 ×1.8'},act:{name:'🐟 活水',desc:'6 手內清該屬宮也按格數回血',cd:5}},
    {id:'c28',n:'030',name:'風隼',el:'wind',race:'beast',fam:'fish',hero:false,lv1:{atk:84,hp:500,rcv:49},max:{atk:164,hp:975,rcv:96},lead:{name:'魚·連鎖增幅',desc:'同魚系攻 ×1.5；combo≥2 → 同屬攻 ×1.8'},act:{name:'🐟 活水',desc:'6 手內清該屬宮也按格數回血',cd:5}},
    {id:'c15',n:'031',name:'臺灣雲豹',el:'fire',race:'beast',fam:'taiwan',hero:true,lv1:{atk:141,hp:350,rcv:28},max:{atk:275,hp:683,rcv:55},lead:{name:'掠食者之威',desc:'攻擊力 ×1.12'},act:{name:'🐆 裂空撲殺',desc:'總傷≈攻×2：敵單隻→集中、多隻→均分全體，各吃相剋',cd:3}},
    {id:'c18',n:'032',name:'櫻花鉤吻鮭',el:'water',race:'beast',fam:'taiwan',hero:true,lv1:{atk:98,hp:370,rcv:48},max:{atk:191,hp:722,rcv:94},lead:{name:'冰河迴生',desc:'HP≤10%（含致死）自動回 50%，過 9 輪再生'},act:{name:'🐟 溯流之癒',desc:'本手清除按格數額外回血（上限約半血）',cd:4}},
    {id:'c22',n:'033',name:'臺灣藍鵲',el:'thunder',race:'beast',fam:'taiwan',hero:true,lv1:{atk:128,hp:350,rcv:34},max:{atk:250,hp:683,rcv:66},lead:{name:'鳴聲威懾',desc:'每關開場全敵延遲 +1 手（一次性）'},act:{name:'🐦 群鵲圍攻',desc:'全體敵出手延遲 +2 手',cd:4}},
    {id:'c26',n:'034',name:'臺灣黑熊',el:'earth',race:'beast',fam:'taiwan',hero:true,lv1:{atk:104,hp:490,rcv:39},max:{atk:203,hp:956,rcv:76},lead:{name:'熊之守護',desc:'擋下敵攻擊 1 次，過 5 輪再生護盾'},act:{name:'🐻 巨塊',desc:'清空托盤→生成 1 個 3×3 疊塊，放上去補滿一宮→大清',cd:5}},
    {id:'c30',n:'035',name:'臺灣獼猴',el:'wind',race:'beast',fam:'taiwan',hero:true,lv1:{atk:119,hp:380,rcv:37},max:{atk:232,hp:741,rcv:72},lead:{name:'猴群偷襲',desc:'每塊有清→隊長偷打（攻×0.25）+1 combo'},act:{name:'🐒 靈猴造塊',desc:'托盤 3 塊變成可覆蓋的 2×2 塊，易解宮',cd:4}}
  ]
};
