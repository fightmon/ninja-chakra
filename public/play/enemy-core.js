/* ===== enemy-core.js — 敵人機制核心(純資料 + 純函式;無 Phaser/DOM/localStorage)=====
 * 2026-11-06 階段 0/1/2/3(火城哥布林 + 風城賊鴨 + 雷城鐵機人 + 土城石頭怪 + 水城補師):遊戲與 sim「共用同一份」敵人行為計算層。
 *   介面 = 就地改 state / 敵人物件 + 回傳「事件陣列」;遊戲(P2)之後只照事件播動畫,sim 照事件記帳。
 *   亂數一律走 battle-core 的 brnd(同種子可重現);事件裡的 e = 敵人在 state.enemies 的索引(可序列化)。
 * 載入:瀏覽器 classic script,放在 battle-core.js 之後;Node:require('./enemy-core.js')(同目錄自動 require battle-core)。
 *   全域只新增一個名字 EnemyCore(用 var:掛在 global 物件上,方便測試比對「只多一個全域」)。
 * 規則依據(2026-11-06 階段 4 開檔核對的現行版號):docs/spec-fire-encounter-pool.md v1.4.7 §2.3、§4.0~4.8;docs/spec-wind-encounter-pool.md v0.4.9 §2.3;docs/spec-thunder-encounter-pool.md v0.4.6 §2.3;
 *   docs/spec-earth-encounter-pool.md v0.4.6 §2.3(C1~C14);docs/spec-water-encounter-pool.md v0.4.10 §2.3(D1~D13);
 *   docs/spec-stage-encounters.md v1.5.12 §4.2、§4.4、§4.5、§4.7、§5.2、§5.3(寶玉核心盾)、§5.3b(金屬怪)、§5.3c(金錢怪);docs/spec-daily-island.md v1.2.4(金屬怪每日一樣只逃跑)。
 * 本階段含:共通(TUNING/rollCD/打中計數/damagePlayer/afterBlock/damageEnemy/resolveVictims/enemyPhase/initMech)+火城哥布林 1~4★
 *   +風城賊鴨 1~4★(標記食物→CD 歸 0 結算、挑嘴、當下反擊、屬塊食物、越吃越壯、吃鐵塊剝層)+雷城鐵機人 1~4★(鐵塊格數/層數、懲罰、電擊、越放越硬)。
 *   +土城石頭怪 1~4★(星數制擋傷/破盾門檻/隨機盾/重建/反震/守護;applyClear 是清除結算入口)
 *   +水城補師 1~4★(補量/急救/憤怒/魔王位詠唱補血與詠唱復活/詠唱中止;急救攔截在 damageEnemy 單一入口)。五城招牌怪至此全走核心。
 *   +階段 4 稀有怪(製作人 2026-11-06 拍板,同一種怪所有模式機制一樣):銀怪=金屬怪 c71~73(只逃跑不攻擊,逃跑倒數 6~8)、金怪=金錢怪 c74~76(不逃跑;CD 2/3/4,抽 4 = 縮小直接變下一隻)、
 *   寶玉怪 c61~65 1~4★(登場放「寶玉核心」進盤面、核心在時擋 95~99%、全碎才吃傷害;syncCores 偵測核心被清=敲碎)。魔王位詠唱復活改 1 輪(TUNING.REVIVE_ROUNDS,預設 1)。
 * 盤面:state.board[r][c](9×9),空=falsy,有方塊=truthy(sim 可以是數字 1 或物件);鐵塊格=物件 {el:'iron',lock,owner};寶玉核心格=物件 {el:'core',core:true,owner}(實心格,像鐵塊算填滿);
 *   賊鴨標記存座標(e._d.food[].pos),鐵機人存自己鐵格的物件參照(e._i.cells[].obj);核心只讀寫這個二維陣列,不碰 battle-core。
 * 敵回合出手順序:同一敵回合賊鴨永遠先於鐵機人(actOrder:賊鴨先、其餘依陣列序)。 */
var EnemyCore = (function () {
  'use strict';

  // ───────── C0 TUNING:全部可被 sim 以環境變數覆寫(applyEnv)─────────
  const TUNING = {
    CD1: [2, 3],            // 1★ 猛擊 CD 範圍(含兩端,均勻)
    CD23: [2, 5],           // 2★/3★ CD 範圍;最大值(5)= 終結猛擊(骷髏)
    CD4: [4, 5],            // 4★ 酋長 CD(每次出手都是終結猛擊);🆕v1.5.0(2026-11-09)6~7→4~5【預設,待 sim】:套 3 手窗口後 6~7 會空等太久
    WIN23: 2,               // 🆕v1.5.0 蓄力窗口:1~3★ 倒數剩 ≤2 手(且已過抽 CD 那手)才打得斷
    WIN4: 3,                // 🆕v1.5.0 蓄力窗口:4★ 酋長剩 ≤3 手(要打 3 下)
    DEFUSED_K: 1.0,         // 🆕v1.5.0 1~3★ 被拆除後那一擊(普攻)= ATK × 此值【預設,待 sim】;星級差距靠各自 ATK
    SKULL_P: 0.25,          // 2★/3★ 抽到骷髏(CD=CD23 上限)的機率;其餘 CD 在 [CD23[0], CD23[1]-1] 均勻。0.25 時 2/3/4/5 各 25%(= 規格「平均抽」)
    PER_CD: 0.5,            // 【數值待 sim】普通出手傷害 = ATK × (CD × PER_CD),即 ATK×(CD/2):CD2=1.0× CD3=1.5× CD4=2.0×(CD 越長越痛)
    SKULL_K: 40,            // 2★/3★ 骷髏(終結猛擊)傷害 = ATK × SKULL_K(最痛;須 > CD4 普通出手 2.0×)【製作人 2026-11-06:只照初級校準 = 40】
    CHIEF_K: 51.4,          // 4★ 酋長每次出手(皆終結猛擊)= ATK × CHIEF_K × 降溫係數【階段 4 校準 2026-11-06:被打中 2 下(×0.25)後那一擊,上級 ★3 LV60 平衡隊(HP 6770)吃完約剩 1/3 血;上級 S3 酋長 ATK 351 → K = (1−1/3)×6770 ÷ (0.25×351) = 51.4;推導見 enc-sim-20261106/stage4/calib-chief.mjs】
    COOL: [1, 0.5, 0.25],   // 酋長降溫:剩 3/2/1 下時出手的傷害係數(打中第 1 下→0.5、第 2 下→0.25)
    // 【試玩期獨立值 2026-11-06,正式套 cityDiff(城×難度 ATK 倍率)後改回表值:normal 骷髏 2.475 / 酋長 2.986;hell 骷髏 10.711 / 酋長 15.454】遊戲目前沒套城×難度 ATK 倍率 → normal 改用 alt(32.495 / 39.21 = 原值 ×13.13),hell 原值 ×1.32(14.14 / 20.4);其餘難度不動。來源:enc-sim-20261106/stage5/tuning-table.json alt.fire_normal_sane
    K_BY_DIFF: 1,           // 【階段 5 製作人 2026-11-06】1=骷髏/酋長倍率走下面兩張「依難度」的表(每難度各自校準);0=退回上面單值 SKULL_K / CHIEF_K(舊行為,全難度共用)。state.ec.dk(initState 的 opts.dk)不在表內 → 也退回單值
    SKULL_K_BY_DIFF: { baby: 55.011, beginner: [22.569, 34.076, 45.514], normal: [27.082, 32.496, 42.944], advanced: [24.296, 28.271, 28.227], super: [13.155, 15.309, 15.272], hell: [8.457, 9.751, 9.672] },   // 骷髏傷害 = ATK × 此值(依難度 × 依輪;數字=全輪共用、[r1,r2,r3]=依輪);【2026-11-09 依輪重校】該難度該輪「適當等級」平衡隊(五屬各一)吃『最大非魔王 2★/3★ 哥布林(初級無小怪攜帶者→沿用魔王值)的一發骷髏;魔王另見 BOSS_SKULL_K_BY_DIFF』+ 餘火全額(3★ 才有餘火,×(1+0.3+0.15))後剩 ≈15%;ATK 已乘輪倍率;入門無骷髏沿用舊值。推導=003_plan/enc-sim-20261109/calib-kround.mjs → kround-table.md
    BOSS_SKULL_K_BY_DIFF: { beginner: [22.569, 34.076, 45.514], normal: [7.184, 8.619, 11.404] },   // 魔王 2★/3★ 骷髏另一張表(【2026-11-09 lethal】校準候選=魔王攜帶者,同樣吃完剩 ≈15%;魔王是 4★ 酋長的難度無此格→kFor 退回小怪表);kFor(state,'skull',e) 在 e.boss 時先查此表。推導=calib-kround.mjs
    MINION_SKULL_DMG_BY_STAGE: {},   // 2026-11-09 停用:30/40% 比現況 55~62% 還輕,反效果;表見 enc-sim-20261109/minion/   // 【2026-11-09 minionhp】小怪關(S1/S2)骷髏血量檢定:格式 { 難度: [[R1S1,R1S2],[R2S1,R2S2],[R3S1,R3S2]] },值=骷髏「一擊傷害」(絕對值,不乘 ATK;不含餘火),= 該難度×輪「建議等級」混色平衡隊 maxHP × 比例。只有 advanced/super/hell 有格;缺格/0/魔王關(S3)/魔王 → 走原 SKULL_K_BY_DIFF。受 K_BY_DIFF 開關管。需 state.ec.stage(initState 的 opts.stage,1|2|3;沒給=0=不套)。推導=003_plan/enc-sim-20261109/minion/table.mjs。env 覆寫:MINION_SKULL_DMG_BY_STAGE=JSON 字串
    CHIEF_K_BY_DIFF: { baby: 70.803, beginner: 106.906, normal: 39.21, advanced: [27.748, 32.344, 32.407], super: [17.831, 20.704, 20.669], hell: [12.227, 14.068, 13.944] },   // 酋長(4★)出手傷害 = ATK × 此值 × 降溫係數(依難度 × 依輪);【2026-11-09 依輪重校】該難度該輪適當等級平衡隊吃『被打中 2 下(×0.25)後那一擊』+ 餘火全額(×1.45)後剩 ≈1/3(⇒ 被打 1 下那擊必致死);入門/初級/中級無酋長沿用舊值;推導同上
    CHIEF_DEFUSED_K_BY_DIFF: { advanced: [7.941, 9.256, 9.274], super: [5.103, 5.925, 5.915], hell: [3.499, 4.026, 3.99] },   // 【2026-11-09 chiefdef】【2026-11-09 hpcheck 血量檢定】酋長拆除後那一擊 = 該難度×輪「建議等級」混色平衡隊 maxHP × 0.5263(不含餘火;錨點 R1 hell LV40 HP 3823 → 2012 ≈ 舊 K=3.5;K=比例×HP÷酋長ATK(已乘輪倍率),只填有酋長的 advanced/super/hell,來源 calib-kround.mjs --chief-def-ratio=0.5263 --write)。原說明:酋長拆除後那一擊的「依難度×依輪」表(格式同 CHIEF_K_BY_DIFF:數字=全輪共用、[r1,r2,r3]=依輪;未給輪=第 2 輪欄)。該格有值(>0)→ ATK × 表值;沒值 → 退回下面單值 CHIEF_DEFUSED_K。受 K_BY_DIFF 開關管。掃描用 env: CHIEF_DEFUSED_K_BY_DIFF=hell=3.2,super=2.1(只給單值=全輪共用)
    CHIEF_DEFUSED_K: 1.4,   // 4★ 酋長被拆除後那一擊(一般攻擊)傷害 = ATK × 此值【預設,製作人 2026-11-08:比一般哥布林痛一點,1.25~1.5 可調】;不吃難度表 K、不降溫,仍留餘火
    CHIEF_HITS: 3,          // 酋長要打滿幾下才拆除(拆除後出手時計數回此值;2026-11-08 起「中止」改「拆除變普攻」)
    BURN: [0.3, 0.15],      // 餘火:玩家之後放的下兩塊各扣「該擊實際傷害 D」的 30%、15%【2026-11-09 製作人:0.5/0.25 → 0.3/0.15,餘火調輕;依輪 K 表已把餘火全額 ×(1+0.3+0.15) 算進校準】
    OPEN_SKULL: 1,          // 1=初級魔王(2★)登場第一擊必終結猛擊(CD5);0=關
    BEAR_CD: 5,             // 黑熊隊長技冷卻(手)= index.html lead.v||5
    SALMON_LOW: 0.1,        // 鮭魚:扣完血後 HP ≤ ceil(maxHP×0.1)
    SALMON_BACK: 0.5,       //      → 回到 round(maxHP×0.5)
    SALMON_CD: 5,           // 觸發後冷卻 N 手再就緒(0=一場一次);只在 initState 沒給 leadV 時用(= index.html `_reviveCD = lead.v || 5` 的缺值預設 5)。鮭魚卡 c18 實際 v:9 → 呼叫端傳 opts.leadV=9(index.html:1119/:8048/:7234)
    // ── 風城賊鴨(spec-wind v0.4.6 §2.3)──
    DUCK_BASE: [3, 2, 3, 2], // 基本 CD(1★/2★/3★/4★);每輪 CD = 基本 + 隨機 DUCK_RAND,最低 DUCK_MIN
    DUCK_RAND: [0, 2],      // 每輪重擲的隨機加值(含兩端)
    DUCK_MIN: 2,            // 每輪抽出的 CD 下限(火屬 CD+1 由呼叫端加在 timer 上,不受此限)
    HUNGRY_K: 2,            // 【預設】餓肚子:每少一份打一份,每份 = ATK × 此值 × 飽足倍率
    COUNTER_K: 1,           // 【預設】當下反擊(3★/4★)= ATK × 此值 × 飽足倍率
    FAT_PER: 0.2,           // 【預設】4★ 越吃越壯:每層 +20% 攻擊(小打大打都吃)
    FAT_MAX: 3,             // 飽足最多 3 層
    STORED_P: 0.5,          // 【sim 旋鈕】4★:每輪標記時「卡上有屬塊」的機率;有 → 食物 = 1 屬塊 + 1 格,沒有 → 2 格。屬塊被用掉(useStored)算空
    PICKY_MAX_MISS: 6,      // 【預設】挑嘴:缺格最少的行/宮若缺格 > 此值(盤面太空)→ 退回隨機標記
    // ── 雷城鐵機人(spec-thunder v0.4.3 §2.3)──
    IRON_BASE: 2,           // 基本 CD;每輪 = 基本 + 隨機 IRON_RAND,最低 IRON_MIN
    IRON_RAND: [0, 2],
    IRON_MIN: 2,
    IRON_CELLS: [1, 1, 2, 3],   // 1★/2★/3★/4★ 鐵塊連體格數
    IRON_LAYERS: [1, 1, 1, 2],  // 每格層數
    IRON_MAXLOCK: 3,            // 4★ 越放越硬:每格最多 3 層
    IRON_PUNISH_K: 0.5,         // 【預設】懲罰倍率 = 1 + 此值 × 該鐵機人剩餘鐵格數(2026-11-11 大毛拍板 0.25→0.5)
    SHOCK_PCT: 0.01,            // 【預設】電擊(3★/4★):每放一塊扣 剩餘鐵格數 × 此值 × 最大血量
    IRON_EMPTY_FRAC: 0.25,      // 盤面空格 ≤ 81×此值 不放鐵塊(→普攻)
    FAT_MODE: 'each',           // 4★ 賊鴨越吃越壯【製作人 2026-11-06 拍板 each】:'each'(預設)=每吃到一份疊 1 層(兩份都吃到的一輪 +2),有一份沒吃到→歸零;'both'=2 份都吃到才疊 1 層(舊版,保留可切換)
    FAT_HUNGRY: 'keep',         // 4★ 餓到時飽足層怎麼處理【2026-11-11 大毛拍板:餓到不歸零】:'keep'(預設)=吃到幾份就疊幾層(each)/ 或 both 模式下「全部吃到才疊 1 層」;餓到那份只是不加、已有的層不扣;'reset'=舊版,只要有一份餓到,全部歸零(同輪吃到的也不留)。'both' 模式:keep=有餓到這輪不疊也不歸零,reset=歸零
    // ── 土城石頭怪(spec-earth v0.4.4 §2.3)──
    ROCK_BASE: 2,               // 出手 CD = 基本 + 隨機 ROCK_RAND,最低 ROCK_MIN(每輪重擲)
    ROCK_RAND: [0, 2],
    ROCK_MIN: 2,
    ROCK_LEAK: [0.40, 0.25, 0.10, 0.05],   // 1★/2★/3★/4★ 盾在時承受(漏傷)比例 = 1 − 擋傷%(60/75/90/95%)
    ROCK_C1: 2,                 // 1★ 破盾門檻 COMBO
    ROCK_H2: 12,                // 2★ 破盾門檻 HIT
    ROCK_RC: 3, ROCK_RH: 15,    // 3★/4★ 隨機盾:COMBO 3 或 HIT 15(各 50%,開場與每次重建都重抽,C8)
    ROCK_REBUILD: 2,            // 破盾後固定重建倒數(CD 2,不隨機,C9)
    ROCK_BREAK_BONUS: 0.5,      // 破盾那手 全額 + 50%
    ROCK_SHIELD_ATK: [1.5, 2.5, 2.5, 2.5],   // 【2026-11-11 製作人定案(press2)】預設 1★×1.5/2★↑×2.5(1=關;關閉對照用 ROCK_SHIELD_ATK=1,1,1,1);盾在時的普攻傷害 × 依星倍率(1★/2★/3★/4★;串場石頭怪固定 1★ 規則=第 1 格)。sim 掃描:ROCK_SHIELD_ATK=1.5,2,2,2
    RECOIL_PCT: 0.2,            // 【預設】反震:被擋下傷害的 20% 反彈給玩家(3★/4★)
    GUARD_PCT: 0.5,             // 【預設】守護:盾在的 4★ 石頭王,左右相鄰且當下沒盾的同伴「承受」比例(減半)
    // ── 水城補師(spec-water v0.4.8 §2.3)──
    HEAL_BASE: 2,               // 出手 CD = 基本 + 隨機 HEAL_RAND,最低 HEAL_MIN(每輪重擲)
    HEAL_RAND: [0, 2],
    HEAL_MIN: 2,
    HEAL_RATE: [0.25, 0.33, 0.50, 0.40],   // 1★/2★/3★/4★(博士)補量 = 友軍最大 HP 的比例
    HEAL_LOW: 0.5,              // 隊友(不含自己)血量嚴格 < 此比例才補
    HEAL_RAGE_LOW: [1.25, 1.5, 1.5, 1.5],    // 【定案 2026-11-11,製作人採用】補師「憤怒」第一段:任一隊友(不含自己、不含稀有怪)血量曾 < HEAL_LOW(50%)→ 補師自己的攻擊 × 此值(依星 1★~4★);鎖存到本關結束
    HEAL_RAGE_DEAD: [1.5, 2, 2, 2],   // 【定案 2026-11-11】第二段「暴怒」:任一隊友死亡 → 補師攻擊 × 此值(取代第一段,不相乘);鎖存。LOW/DEAD 任一格 >1 就停用既有「急救/復活後憤怒」RAGE_MULT;全 1=舊行為
    HEAL_RAGE_NOHEAL: 1,        // 【定案 2026-11-11,製作人採用;原旋鈕說明如下】1=補師進入憤怒/暴怒態(rageStage≥1)後不補血、不急救,一律攻擊(魔王位博士〔d.boss〕不受影響,維持詠唱補血/復活招牌)。設 1 會啟用新兩段憤怒系統(停用舊「急救/復活後憤怒」);倍率仍讀 HEAL_RAGE_LOW/DEAD
    HEAL_RAGE_TRIG: 'healed',      // 【定案 2026-11-11,預設改 healed;原說明如下】第一段憤怒觸發:'low'=現行(任一隊友曾 < HEAL_LOW);'healed'=這隻補師成功補血(含急救)一次之後才鎖存。第二段暴怒(隊友死亡)兩者相同
    RAGE_MULT: 1.5,             // 【預設】憤怒:攻擊 ×1.5,到本關結束,只觸發一次
    REVIVE_MAX: 2,              // 魔王位 ≥3★ 全滅復活次數(一場)
    CAST_HITS: 2,               // 詠唱成功前累計打中幾下就中止
    RESCUE_ON: 1,               // 【sim 旋鈕】1=急救開;0=關(量「急救讓戰鬥拉長多少」的對照用)
    CAST_CD: 0,                 // 【sim 旋鈕】0=詠唱各步驟間 CD 照一般重擲(補血詠唱視窗=CD 手);>0=詠唱進行中每步固定此 CD(1=字面「補血 1 手/復活 2 手」)
    REVIVE_ROUNDS: 1,           // 【製作人 2026-11-06 拍板】詠唱復活 = 幾個魔王出手輪(預設 1,與詠唱補血同;一輪 CD 約 2~4 手);2 = 舊版(sim 對照用)
    // ── 稀有怪(spec-stage-encounters v1.5.12 §5.2/§5.3/§5.3b/§5.3c,製作人 2026-11-06 拍板)──
    METAL_FLEE: [6, 8],         // 銀怪=金屬怪:逃跑倒數(含兩端),存 e._m.flee,每手 −1、歸 0 必逃(同手攻擊倒數也歸 0 → 先逃不攻擊);無屬(剋屬不加);與攻擊倒數一起被延遲技推後(delayEnemy,2026-11-09 製作人更正)
    METAL_ATK_CD: [2, 3],       // 【2026-11-09 metalatk】金屬怪攻擊倒數(含兩端,存 e.timer = 畫面顯示的倒數):每手 −1、歸 0 出手後重抽;延遲技(雷主動技 timer+N)作用在它
    METAL_HIT: { 1: 200, 2: 380, 3: 680 },   // 【2026-11-09 製作人拍板·預設】金屬怪依星固定傷害(不看 e.atk;約為該星「容易抓到的等級」LV20/40/60 平衡隊血量的 10%);sim:METAL_HIT=1:200,2:380,3:680
    METAL_K: 1.0,               // 金屬怪攻擊傷害 = METAL_HIT[星] × 此值(整體係數,走 damagePlayer)
    MONEY_CD: [2, 4],           // 金怪=金錢怪:出手 CD 抽 2/3/4(各 1/3)
    MONEY_SHRINK_CD: 4,         // 抽到此值 = 這輪結束時縮小(直接變成下一隻);已 1★ 抽到 → 改普攻(MONEY_CHIP)
    MONEY_K: 1,                 // 【數值待 sim】金怪 CD 2~3 的攻擊 = ATK × 此值
    MONEY_BY_ROUND: { 1: { force: 'all', shrinkCd: 2 }, 2: { force: 'first', shrinkCd: 3 } },   // 【2026-11-09 money】依輪(state.ec.round):force 'all'=還不是 1★ 就每抽強制縮小(cd_roll downgrade:true,倒數 shrinkCd);'first'=只有登場第一抽強制縮小;缺輪(第 3 輪/round=0)=現行隨機
    MONEY_CHIP: 0.1,            // 1★ 金怪抽到縮小 CD → 普攻 = 玩家最大血量 × 此值(約 1/10)
    MONEY_HP_STEP: 2.0,         // 【預設】縮小換卡時若敵人物件沒給 starTable:下一隻最大 HP = 目前最大 HP ÷ 此值
    MONEY_ATK_STEP: 1.3,        // 【預設】同上,ATK ÷ 此值
    JEWEL_BLOCK: [0.95, 0.97, 0.98, 0.99],   // 寶玉怪 1★/2★/3★/4★:還有未敲碎核心(已放或待放)時擋下傷害比例
    JEWEL_BASE: 2,              // 寶玉怪出手 CD = 基本 + 隨機 JEWEL_RAND,最低 JEWEL_MIN(每輪重擲)
    JEWEL_RAND: [0, 2],
    JEWEL_MIN: 2,
    JEWEL_K: 1,                 // 【數值待 sim】寶玉怪攻擊 = ATK × 此值
  };
  const _RANGE_KEYS = ['CD1', 'CD23', 'CD4', 'DUCK_RAND', 'IRON_RAND', 'ROCK_RAND', 'HEAL_RAND', 'METAL_FLEE', 'METAL_ATK_CD', 'MONEY_CD', 'JEWEL_RAND'], _LIST_KEYS = ['COOL', 'BURN', 'DUCK_BASE', 'IRON_CELLS', 'IRON_LAYERS', 'ROCK_LEAK', 'HEAL_RATE', 'JEWEL_BLOCK', 'ROCK_SHIELD_ATK', 'HEAL_RAGE_LOW', 'HEAL_RAGE_DEAD'], _STR_KEYS = ['FAT_MODE', 'FAT_HUNGRY', 'HEAL_RAGE_TRIG'], _JSON_KEYS = ['MINION_SKULL_DMG_BY_STAGE', 'MONEY_BY_ROUND'], _MAP_KEYS = ['METAL_HIT', 'SKULL_K_BY_DIFF', 'BOSS_SKULL_K_BY_DIFF', 'CHIEF_K_BY_DIFF', 'CHIEF_DEFUSED_K_BY_DIFF'];
  // sim 用:applyEnv(process.env)——鍵名同 TUNING(例 SKULL_K=8 CD4=6~7 COOL=1,0.5,0.25);回傳實際被覆寫的鍵
  function applyEnv(env) {
    const hit = {};
    Object.keys(TUNING).forEach(k => {
      const v = env && env[k]; if (v == null || v === '') return;
      if (_MAP_KEYS.indexOf(k) >= 0) { const m = {}; String(v).split(',').forEach(kv => { const p = kv.split(/[=:]/); if (p.length === 2 && isFinite(+p[1])) m[p[0].trim()] = +p[1]; }); if (Object.keys(m).length) { TUNING[k] = Object.assign({}, TUNING[k], m); hit[k] = m; } }   // 格式 baby=12.5,hell=30(只覆寫給的難度)
      else if (_JSON_KEYS.indexOf(k) >= 0) { try { const o = JSON.parse(String(v)); if (o && typeof o === 'object') { TUNING[k] = Object.assign({}, TUNING[k], o); hit[k] = o; } } catch (err) { } }   // 整張依難度的表(JSON),只覆寫給的難度
      else if (_STR_KEYS.indexOf(k) >= 0) { TUNING[k] = String(v); hit[k] = String(v); }
      else if (_RANGE_KEYS.indexOf(k) >= 0) { const p = String(v).split(/[~,]/).map(Number); if (p.length === 2 && p.every(isFinite)) { TUNING[k] = p; hit[k] = p; } }
      else if (_LIST_KEYS.indexOf(k) >= 0) { const p = String(v).split(',').map(Number); if (p.length >= 1 && p.every(isFinite)) { TUNING[k] = p; hit[k] = p; } }
      else if (isFinite(+v)) { TUNING[k] = +v; hit[k] = +v; }
    });
    if (env && (env.SKULL_K != null && env.SKULL_K !== '' || env.CHIEF_K != null && env.CHIEF_K !== '') && (env.K_BY_DIFF == null || env.K_BY_DIFF === '')) TUNING.K_BY_DIFF = 0;   // 給了單值 SKULL_K / CHIEF_K 又沒明講 K_BY_DIFF → 視為要用單值(舊 sim 腳本的 SKULL_K=4 CHIEF_K=5 仍照舊生效)
    return hit;
  }

  // ───────── 外部依賴(battle-core 的 brnd / EL):預設抓全域,Node 抓 require;sim 載入快照副本時用 bind 注入同一份 ─────────
  let _brnd = null, _EL = null;
  function bind(o) { if (o && o.brnd) _brnd = o.brnd; if (o && o.EL) _EL = o.EL; }
  function rnd(n) {
    if (!_brnd) _brnd = (typeof brnd === 'function') ? brnd : require('./battle-core.js').brnd;
    return _brnd(n);
  }
  function ELT() {
    if (!_EL) _EL = (typeof EL !== 'undefined') ? EL : require('./battle-core.js').EL;
    return _EL;
  }
  // 2026-11-16 大毛拍板取消「剋屬打中→敵人倒數 +1」:旋鈕放 battle-core CONFIG.COUNTER_DELAY(0=關預設;1=舊行為 +1)。瀏覽器抓全域 CONFIG,Node require battle-core(同一個物件,測試/sim 改它即可)
  function counterDelay() {
    const C = (typeof CONFIG !== 'undefined') ? CONFIG : require('./battle-core.js').CONFIG;
    return (C && C.COUNTER_DELAY | 0) > 0 ? (C.COUNTER_DELAY | 0) : 0;
  }
  const _rInt = (a, b) => a + rnd(b - a + 1);   // 含兩端整數均勻

  // ───────── C8 initMech:依旗標判斷怪種(不信 safe 陣容的 mon:'gob'——敵人物件上沒有 mon 時改看 finisher/finCD 旗標)─────────
  // 回傳 null=不是哥布林(核心不管);否則 {rule:1~4, star, guest}。串場(他城)哥布林不論星數鎖 1★ 規則。
  function classify(e) {
    const isGob = (e.mon != null) ? (e.mon === 'gob') : (e.finisher > 0 && e.finCD > 0);
    if (!isGob) return null;
    const star = (e.star != null) ? e.star : (e.boss ? (e.tier || 4) : (e.tier || 1));
    const guest = !!e.guest;
    return { rule: guest ? 1 : Math.max(1, Math.min(4, star | 0)), star, guest };
  }

  // 賊鴨/鐵機人判斷:敵人物件有 mon 就只看 mon;沒有 mon(舊資料/safe 陣容)才看 peck/iron 旗標。串場(guest)不論星數鎖 1★ 規則。
  const _starOf = e => (e.star != null) ? e.star : (e.boss ? (e.tier || 4) : (e.tier || 1));
  function classifyDuck(e) {
    const is = (e.mon != null) ? (e.mon === 'duck') : (e.peck > 0); if (!is) return null;
    const star = _starOf(e), guest = !!e.guest; return { rule: guest ? 1 : Math.max(1, Math.min(4, star | 0)), star, guest };
  }
  function classifyIron(e) {
    const is = (e.mon != null) ? (e.mon === 'iron') : (e.iron > 0); if (!is) return null;
    const star = _starOf(e), guest = !!e.guest; return { rule: guest ? 1 : Math.max(1, Math.min(4, star | 0)), star, guest };
  }

  function classifyRock(e) {   // 石頭怪:有 mon 就只看 mon;沒有 mon(舊資料/safe)才看 shield 旗標。串場(guest)鎖 1★ 規則
    const is = (e.mon != null) ? (e.mon === 'rock') : !!e.shield; if (!is) return null;
    const star = _starOf(e), guest = !!e.guest; return { rule: guest ? 1 : Math.max(1, Math.min(4, star | 0)), star, guest };
  }
  function classifyHealer(e) {   // 補師:有 mon 就只看 mon;沒有 mon 才看 healAlly 旗標。串場(guest)鎖 1★ 規則
    const is = (e.mon != null) ? (e.mon === 'healer') : (e.healAlly > 0); if (!is) return null;
    const star = _starOf(e), guest = !!e.guest; return { rule: guest ? 1 : Math.max(1, Math.min(4, star | 0)), star, guest };
  }

  // 稀有怪判斷(階段 4):有 mon 就只看 mon('metal'|'money'|'jewel');沒有 mon 時,銀/金怪才退回看 cardId(c71~73 / c74~76,每日修煉的敵人物件沒有 mon);寶玉怪一定要有 mon。
  function classifyMetal(e) {
    const is = (e.mon != null) ? (e.mon === 'metal') : (e.cardId === 'c71' || e.cardId === 'c72' || e.cardId === 'c73'); if (!is) return null;
    const star = (e.mon == null && e.star == null) ? ({ c71: 1, c72: 2, c73: 3 })[e.cardId] : _starOf(e);
    return { star: Math.max(1, Math.min(3, star | 0)) };
  }
  function classifyMoney(e) {
    const is = (e.mon != null) ? (e.mon === 'money') : (e.cardId === 'c74' || e.cardId === 'c75' || e.cardId === 'c76'); if (!is) return null;
    const star = (e.mon == null && e.star == null) ? ({ c74: 1, c75: 2, c76: 3 })[e.cardId] : _starOf(e);
    return { star: Math.max(1, Math.min(3, star | 0)) };
  }
  function classifyJewel(e) {
    if (e.mon !== 'jewel') return null;
    return { star: Math.max(1, Math.min(4, _starOf(e) | 0)) };
  }

  // ───────── C1 rollCD:回傳 {cd, skull}(不改任何狀態)─────────
  // 🆕v1.5.0(火城規格 2026-11-09):蓄力窗口=集氣球出現期間。看到球才打得斷;剛抽到 CD 那手(timer==cd,含被剋屬推回)不算
  function inWindow(e) { const g = e && e._g; if (!g) return false; const W = g.rule === 4 ? TUNING.WIN4 : TUNING.WIN23; return e.timer >= 1 && e.timer <= W && e.timer < g.cd; }
  function rollCD(e) {
    const c = (e._g && e._g.rule) ? e._g : classify(e); if (!c) return null;
    const rule = c.rule;
    if (rule === 1) return { cd: _rInt(TUNING.CD1[0], TUNING.CD1[1]), skull: false };
    if (rule === 4) return { cd: _rInt(TUNING.CD4[0], TUNING.CD4[1]), skull: true };   // 酋長每次出手都是終結猛擊
    const hi = TUNING.CD23[1];
    if (rnd(10000) < TUNING.SKULL_P * 10000) return { cd: hi, skull: true };
    return { cd: _rInt(TUNING.CD23[0], hi - 1), skull: false };
  }
  function _roll(state, e, i, evs, force) {   // 抽 CD 並寫回 e(timer/interval)與 e._g;force=true → 固定骷髏 CD5(登場骷髏)
    const g = e._g;
    let r;
    if (force) { r = { cd: TUNING.CD23[1], skull: true }; }
    else r = rollCD(e);
    g.cd = r.cd; g.skull = r.skull; e.timer = r.cd; e.interval = r.cd;
    evs.push({ t: 'cd_roll', e: i, cd: r.cd, skull: r.skull, rule: g.rule });
  }

  function initMech(e, ctx) {   // 單隻初始化;ctx:{idx, dk, state}(賊鴨上場即標記需要 state.board)。回傳事件陣列
    ctx = ctx || {}; const evs = [];
    e._d = null; e._i = null; e._r = null; e._h = null; e._m = null; e._y = null; e._j = null; e._rescHand = false;
    const c = classify(e);
    if (!c) {
      e._g = null;
      const dc = classifyDuck(e); if (dc) { _duckInit(ctx.state, e, ctx.idx != null ? ctx.idx : -1, dc, evs); return evs; }
      const ic = classifyIron(e); if (ic) { _ironInit(ctx.state, e, ctx.idx != null ? ctx.idx : -1, ic, evs); return evs; }
      const rc = classifyRock(e); if (rc) { _rockInit(ctx.state, e, ctx.idx != null ? ctx.idx : -1, rc, evs); return evs; }
      const hc = classifyHealer(e); if (hc) { _healerInit(ctx.state, e, ctx.idx != null ? ctx.idx : -1, hc, evs); return evs; }
      const mc = classifyMetal(e); if (mc) { _metalInit(ctx.state, e, ctx.idx != null ? ctx.idx : -1, mc, evs); return evs; }
      const yc = classifyMoney(e); if (yc) { _moneyInit(ctx.state, e, ctx.idx != null ? ctx.idx : -1, yc, evs); return evs; }
      const jc = classifyJewel(e); if (jc) { _jewelInit(ctx.state, e, ctx.idx != null ? ctx.idx : -1, jc, evs); return evs; }
      return evs;
    }
    const g = e._g = { rule: c.rule, star: c.star, guest: c.guest, cd: 0, skull: false, left: TUNING.CHIEF_HITS, hitClear: false, skipTick: false, defused: false };
    // 登場骷髏:只有初級魔王(2★)第一擊必終結猛擊(雙魔王兩隻都是);其他情況一律照 CD 抽
    const opening = !!TUNING.OPEN_SKULL && ctx.dk === 'beginner' && !!e.boss && c.rule === 2 && !c.guest;
    _roll(null, e, ctx.idx != null ? ctx.idx : -1, evs, opening);
    return evs;
  }

  // ───────── 玩家側狀態(黑熊/鮭魚/餘火)─────────
  // opts:{lead:'none'|'bear'|'salmon', leadV(隊長卡 v 值:鮭魚=冷卻手數,缺值→TUNING.SALMON_CD=5), dk}。回傳事件(各怪首次 cd_roll)
  function initState(state, opts) {
    opts = opts || {};
    state.ec = { dk: opts.dk || null, round: (opts.round === 1 || opts.round === 2 || opts.round === 3) ? opts.round : 0, stage: (opts.stage === 1 || opts.stage === 2 || opts.stage === 3) ? opts.stage : 0, lead: opts.lead || 'none', leadV: (opts.leadV > 0) ? (opts.leadV | 0) : 0, bearReady: opts.lead === 'bear', bearCD: 0, bearHand: false,
      salmonReady: opts.lead === 'salmon', salmonCD: 0, burn: null, burnCand: 0, dead: false };
    const evs = [];
    state.enemies.forEach((e, i) => { initMech(e, { idx: i, dk: opts.dk, state }).forEach(x => evs.push(x)); });
    return evs;
  }

  // ───────── C3 damagePlayer ─────────
  // kind:'attack'(一般攻擊)|'rage'(憤怒補師的攻擊)|'gob'(哥布林攻擊含骷髏)|'burn'(餘火)|'hungry'(賊鴨餓肚子)|'counter'(賊鴨當下反擊)|'iron'(鐵機人普攻)|'punish'(鐵機人懲罰)|'shock'(電擊)|'recoil'(石頭怪反震)。
  // 黑熊(隊長技擋一次)擋 attack/rage/gob/hungry/counter/iron/punish,擋掉=dealt 0(→無餘火);餘火 burn、電擊 shock、反震 recoil 不被黑熊擋、不吃護甲、不吃迴避(sim 無護甲/迴避)。
  // 賊鴨的反擊與大打黑熊擋得住(spec-wind v0.4.6);擋下後餓判定/飽足歸零/CD 重抽照常(由呼叫端結算,不看 blocked)。
  // 鮭魚(照 index.html:8048):dmg>0 且扣完血後 HP ≤ ceil(maxHP×SALMON_LOW) → HP=round(maxHP×SALMON_BACK)(一場一次;SALMON_CD>0 則過 N 手再就緒);被餘火打到 0 也算。
  function damagePlayer(state, raw, opts) {
    opts = opts || {}; const kind = opts.kind || 'attack', ec = state.ec, evs = [];
    let dealt = Math.round(raw); if (raw > 0 && dealt < 1) dealt = 1; if (dealt < 0) dealt = 0;
    let blocked = false, revived = false;
    if (kind !== 'burn' && kind !== 'shock' && kind !== 'recoil' && dealt > 0 && ec && (ec.bearReady || ec.bearHand)) {   // 黑熊:這一手所有敵攻都無效(index.html:8033)
      if (ec.bearReady) { ec.bearReady = false; ec.bearCD = TUNING.BEAR_CD; ec.bearHand = true; }
      blocked = true; dealt = 0;
    }
    if (dealt > 0) {
      state.playerHP = Math.max(0, state.playerHP - dealt);
      if (ec && ec.salmonReady && state.playerHP <= Math.ceil(state.maxHP * TUNING.SALMON_LOW)) {
        state.playerHP = Math.round(state.maxHP * TUNING.SALMON_BACK); ec.salmonReady = false; ec.salmonCD = (ec.leadV > 0) ? ec.leadV : TUNING.SALMON_CD; revived = true;
        evs.push({ t: 'revive', hp: state.playerHP });
      }
    }
    evs.unshift({ t: 'player_damage', kind, e: opts.e != null ? opts.e : -1, raw: Math.round(raw), dealt, blocked, hp: state.playerHP });
    if (state.playerHP <= 0 && ec && !ec.dead) { ec.dead = true; evs.push({ t: 'death', who: 'player', kind }); }
    return { dealt, blocked, revived, ev: evs };
  }

  // ───────── C5 damageEnemy:敵人扣血單一入口(扣血 + 急救攔截 + 死亡標記)─────────
  // 水城補師「急救」(spec-water §2.3 D1~D5):2★/3★ 補師(非串場)在「該手結算後仍存活」時,把「被打倒的那一下」的非魔王隊友救回、留 1 血;
  //   每隻一場一次;不救自己、不救魔王位(魔王位補師也不救魔王,但魔王位補師可以救護衛/其他補師);多隻可救時由站位最左者發動;
  //   同手內被救者之後的傷害不再追殺(hp 夾 1,e._rescHand,endEnemyPhase 清);3★ 補師發動急救 → 憤怒(2★ 無憤怒)。
  //   一手多隻同時受傷(AoE)→ applyClear 先全部扣完血再一起 _settle,才能判斷「補師該手結算後仍存活」(D4)。
  function _hpHit(e, dmg) { if (e.dead) return false; e.hp = Math.max(0, e.hp - Math.max(0, dmg)); return true; }
  function _canRescue(h) { return TUNING.RESCUE_ON > 0 && !h.guest && (h.rule === 2 || h.rule === 3) && !h.rescued && !_noHeal(h); }
  function _noHeal(h) { return TUNING.HEAL_RAGE_NOHEAL > 0 && !h.boss && (h.rageStage | 0) > 0; }   // press2:憤怒/暴怒態的非魔王位補師不補血不急救
  function _healedRage(h, hi, evs) { if (TUNING.HEAL_RAGE_TRIG !== 'healed' || !_newRageOn() || (h.rageStage | 0) > 0) return; h.rageStage = 1; evs.push({ t: 'heal_rage', e: hi, stage: 1, mult: _healRageMult(h), rule: h.rule }); }   // press2:TRIG='healed' → 這隻補師補血/急救成功後鎖存第一段
  function _newRageOn() { return TUNING.HEAL_RAGE_LOW.some(v => v > 1) || TUNING.HEAL_RAGE_DEAD.some(v => v > 1) || TUNING.HEAL_RAGE_NOHEAL > 0; }   // press:新兩段憤怒開啟 → 舊「急救/復活後憤怒」停用
  function _rageOn(h, i, by, evs) { if (h.rage || _newRageOn()) return; h.rage = true; evs.push({ t: 'rage', e: i, by, mult: TUNING.RAGE_MULT }); }
  function _settle(state, list, evs) {   // list = 本批受傷的敵人(依受傷順序);hp≤0 者 → 急救或死亡
    try { _settle0(state, list, evs); } finally { _healRageScan(state, evs); }   // press:扣血/死亡都結算完才掃一次補師憤怒(只在新旋鈕開啟時才做事)
  }
  function _settle0(state, list, evs) {
    const dying = list.filter(x => !x.dead && x.hp <= 0); if (!dying.length) return;
    const rescuers = state.enemies.filter(h => h._h && !h.dead && h.hp > 0 && _canRescue(h._h));   // 該批扣完血後仍存活、還沒用過急救
    dying.forEach(x => {
      const xi = state.enemies.indexOf(x);
      if (x._rescHand) { x.hp = 1; return; }   // 同手已被救過:剩餘傷害不再追殺
      let res = null;
      if (!x.boss) for (const h of rescuers) { if (h === x || h._h.rescued) continue; res = h; break; }   // 站位最左者(陣列序=站位序);魔王位不被救
      if (res) {
        x.hp = 1; x._rescHand = true; res._h.rescued = true; const ri = state.enemies.indexOf(res);
        evs.push({ t: 'rescue', e: xi, by: ri, rule: res._h.rule });
        if (res._h.rule === 3) _rageOn(res._h, ri, 'rescue', evs);   // 3★:發動急救 → 憤怒
        _healedRage(res._h, ri, evs);
      } else {
        x.dead = true; if (x._h) x._h.cast = null;   // 魔王死 → 詠唱取消
        const dv = { t: 'death', who: 'enemy', e: xi };   // 稀有怪的死亡事件多帶 rare/star(獎勵跟「當下那隻」:縮小後的金怪掉的是縮小後那張卡)
        if (x._m) { dv.rare = 'metal'; dv.star = x._m.star; } else if (x._y) { dv.rare = 'money'; dv.star = x._y.star; } else if (x._j) { dv.rare = 'jewel'; dv.star = x._j.star; _jewelVanish(state, x, xi, evs); }
        evs.push(dv);
      }
    });
  }
  // press 補師兩段憤怒(鎖存):1 段=有隊友血量 < HEAL_LOW(曾經);2 段=有隊友死亡(非稀有怪);只有活著的補師會鎖存;兩段取代不相乘(攻擊時依 rageStage 查表)。
  function _healRageScan(state, evs) {
    if (!_newRageOn()) return;
    const E = state.enemies;
    E.forEach((h, i) => {
      const d = h._h; if (!d || !_alive(h) || (d.rageStage | 0) >= 2) return;
      if (E.some(x => x !== h && x.dead && !_isRare(x))) { d.rageStage = 2; evs.push({ t: 'heal_rage', e: i, stage: 2, mult: _healRageMult(d), rule: d.rule }); }
      else if (!(d.rageStage | 0) && TUNING.HEAL_RAGE_TRIG !== 'healed' && E.some(x => x !== h && _alive(x) && !_isRare(x) && x.hp < x.max * TUNING.HEAL_LOW)) { d.rageStage = 1; evs.push({ t: 'heal_rage', e: i, stage: 1, mult: _healRageMult(d), rule: d.rule }); }
    });
  }
  function _healRageMult(d) { const st = d.rageStage | 0, t = st === 2 ? TUNING.HEAL_RAGE_DEAD : st === 1 ? TUNING.HEAL_RAGE_LOW : null, m = t && t[d.rule - 1]; return m > 0 ? m : 1; }
  function damageEnemy(state, e, dmg) {
    const evs = [];
    if (e.dead) return evs;
    if (e._j) dmg = _jewelCut(e, state.enemies.indexOf(e), dmg, evs);   // 寶玉怪:還有未敲碎核心 → 先擋 95~99%
    _hpHit(e, dmg); _settle(state, [e], evs);
    return evs;
  }

  // ───────── C2/C6 resolveVictims:打中計數 + 哥布林中止/降溫 + 剋屬 CD+1 ─────────
  // ctx:{kind:'clear'|'active', atkEls:[本次攻擊的屬], n:本次清格數(僅記錄)}。
  // 計數:'clear' 每一手(3 塊)對同一隻最多 1 下(g.hitClear 本手旗標,endEnemyPhase 才清);'active' 每次都另算 1 下。
  // 🆕v1.5.0(2026-11-09):只有蓄力窗口內(inWindow)打中才計數。1~3★:1 下 → 拆除(defuse),不再中止重抽;_interrupt/skipTick 保留但已不使用。
  // 4★:剩餘次數 3→2→1→(第 3 下)拆除(defuse):不中止、不重抽,骷髏變沙漏、CD 照原倒數、歸 0 打一般普攻(傷害=ATK×CHIEF_DEFUSED_K 預設 1.4【1.25~1.5 可調】,仍留餘火)、出手後才重抽;拆除後再打中不計數;第 1/2 下降溫;剋屬命中 → CD+1(可超出 CD4 範圍)。
// 【定案 2026-11-08 試玩回饋】舊行為「第 3 下中止+重抽 CD」已改為上述拆除。
  function resolveVictims(state, victims, ctx) {
    ctx = ctx || {}; const kind = ctx.kind || 'clear', evs = [];
    victims.forEach(e => {
      if (e._h) { _castHit(state, e, kind, evs); return; }   // 魔王位補師詠唱中:打中計數(2 下中止)
      const g = e._g; if (!g || e.dead || e.hp <= 0) return;
      const i = state.enemies.indexOf(e);
      if (kind === 'clear') { if (g.hitClear) return; g.hitClear = true; }
      if (!g.defused && inWindow(e)) {   // 🆕v1.5.0:只有窗口內打中才算(窗口外只扣血);拆除後同輪再打不計
        evs.push({ t: 'enemy_hit', e: i, kind, left: g.left });
        if (g.rule <= 3) _defuse(state, e, i, evs, kind);   // 1~3★:1 下拆除(不再中止重抽)
        else { g.left--; if (g.left <= 0) _defuse(state, e, i, evs, kind); }   // 4★:第 1/2 下降溫、第 3 下拆除
      }
      const T = ELT(), adv = (ctx.atkEls || []).some(a => T[a] && T[a].beats === e.el);   // 🆕v1.5.0 剋屬打中 → CD+1:1~4★、隨時(不限窗口)、無上限
      const cdN = counterDelay(); if (adv && cdN > 0) { delayEnemy(e, cdN); evs.push({ t: 'cd_extend', e: i, by: cdN, timer: e.timer }); }   // 2026-11-16 大毛拍板取消(COUNTER_DELAY=0 預設不延後;1=舊行為)
    });
    return evs;
  }
  // 4★ 第 3 下(降溫到 0):不中止、不重抽、CD 照原倒數;這次蓄力被拆除=骷髏變沙漏,歸 0 時打一般普攻(仍留餘火),出手後才重抽 CD 並計數回 3
  function _defuse(state, e, i, evs, by) {
    const g = e._g; g.left = 0; g.defused = true; g.skull = false;
    evs.push({ t: 'defuse', e: i, by, rule: g.rule, timer: e.timer });
  }
  function _interrupt(state, e, i, evs, by) {
    const g = e._g; g.left = TUNING.CHIEF_HITS; g.skipTick = true;
    evs.push({ t: 'interrupt', e: i, by, rule: g.rule });
    _roll(state, e, i, evs, false);
  }

  // ───────── 風城賊鴨(spec-wind v0.4.6 §2.3)─────────
  // 狀態 e._d = { rule, star, guest, cd, food:[slot], hasStore, storeAlive, fat, counterHand, emptied }
  //   slot = { kind:'cell'|'store', pos:[r,c]|null(待標), empty:bool(標記格目前是否已變空,用來偵測「變空」的瞬間), used:bool(屬塊已被用掉) }
  // 規則表:1★ 1 份/隨機標記;2★ 1 份/挑嘴;3★ 2 份/挑嘴+當下反擊;4★ 2 份/挑嘴+當下反擊+屬塊食物+越吃越壯;串場(guest)固定 1★。
  const NB = 9;
  function _duckRoll(state, e, i, evs) {
    const d = e._d, base = TUNING.DUCK_BASE[d.rule - 1] != null ? TUNING.DUCK_BASE[d.rule - 1] : 3;
    const cd = Math.max(TUNING.DUCK_MIN, base + _rInt(TUNING.DUCK_RAND[0], TUNING.DUCK_RAND[1]));
    d.cd = cd; e.timer = cd; e.interval = cd;
    evs.push({ t: 'cd_roll', e: i, mon: 'duck', cd, skull: false, rule: d.rule });
  }
  function _takenSet(state) {   // 所有活賊鴨已標記的格(別隻已標的格不重標;同隻另一份也不能同格)
    const s = new Set();
    state.enemies.forEach(x => { const d = x._d; if (!d || x.dead || x.hp <= 0) return; d.food.forEach(sl => { if (sl.pos) s.add(sl.pos[0] * NB + sl.pos[1]); }); });
    return s;
  }
  // 挑一格食物:picky=false 隨機;picky=true 挑「缺格最少的一行或一宮」(同分行宮混合隨機),盤面太空(最少缺格 > PICKY_MAX_MISS)退回隨機
  function _pickCell(state, picky) {
    const b = state.board, taken = _takenSet(state), el = [];
    for (let r = 0; r < NB; r++) for (let c = 0; c < NB; c++) if (b[r][c] && !b[r][c].core && !taken.has(r * NB + c)) el.push([r, c]);   // 賊鴨不把寶玉核心當食物
    if (!el.length) return null;
    if (!picky) return el[rnd(el.length)];
    const miss = { r: [], c: [], b: [] };
    for (let k = 0; k < NB; k++) { miss.r[k] = 0; miss.c[k] = 0; miss.b[k] = 0; }
    for (let r = 0; r < NB; r++) for (let c = 0; c < NB; c++) if (!b[r][c]) { miss.r[r]++; miss.c[c]++; miss.b[Math.floor(r / 3) * 3 + Math.floor(c / 3)]++; }
    const L = { r: [], c: [], b: [] }; for (let k = 0; k < NB; k++) { L.r[k] = []; L.c[k] = []; L.b[k] = []; }
    el.forEach(p => { L.r[p[0]].push(p); L.c[p[1]].push(p); L.b[Math.floor(p[0] / 3) * 3 + Math.floor(p[1] / 3)].push(p); });
    let best = 99, cands = [];
    ['r', 'c', 'b'].forEach(t => { for (let k = 0; k < NB; k++) { if (!L[t][k].length) continue; const m = miss[t][k]; if (m < best) { best = m; cands = [L[t][k]]; } else if (m === best) cands.push(L[t][k]); } });
    if (best > TUNING.PICKY_MAX_MISS) return el[rnd(el.length)];
    const line = cands[rnd(cands.length)]; return line[rnd(line.length)];
  }
  function _duckFill(state, e, i, evs) {   // 補標:把「待標」的份數標上(上場、出手後、玩家每放一塊後都會呼叫)
    const d = e._d;
    d.food.forEach((sl, k) => {
      if (sl.kind !== 'cell' || sl.pos) return;
      const p = _pickCell(state, d.rule >= 2); if (!p) return;
      sl.pos = p; sl.empty = false; evs.push({ t: 'duck_mark', e: i, slot: k, r: p[0], c: p[1], picky: d.rule >= 2 });
    });
  }
  function _duckNewRound(state, e, i, evs) {   // 新一輪:抽 CD + 決定食物組成 + 立刻標記
    const d = e._d, n = d.rule >= 3 ? 2 : 1;
    _duckRoll(state, e, i, evs);
    d.hasStore = d.rule === 4 && rnd(10000) < TUNING.STORED_P * 10000; d.storeAlive = d.hasStore;
    d.food = []; for (let k = 0; k < n; k++) d.food.push({ kind: (d.hasStore && k === 0) ? 'store' : 'cell', pos: null, empty: false, used: false, ever: false });
    d.emptied = 0;
    evs.push({ t: 'duck_round', e: i, rule: d.rule, n, store: d.hasStore, fat: d.fat });
    _duckFill(state, e, i, evs);
  }
  function _duckInit(state, e, i, c, evs) {
    e._d = { rule: c.rule, star: c.star, guest: c.guest, cd: 0, food: [], hasStore: false, storeAlive: false, fat: 0, counterHand: false, emptied: 0 };
    _duckNewRound(state, e, i, evs);
  }
  function _fatMult(d) { return 1 + TUNING.FAT_PER * d.fat; }
  function _duckAct(state, e, i) {
    const d = e._d, evs = [], b = state.board;
    e.timer--;
    if (e.timer > 0) { evs.push({ t: 'cd_tick', e: i, timer: e.timer, mon: 'duck' }); return evs; }
    // CD 歸 0:只看標記格「當下」有沒有東西(有→吃掉;空/待標→餓)
    let fed = 0, hungry = 0, pend = 0; const fatBefore = d.fat;
    d.food.forEach(sl => {
      let has = false;
      if (sl.kind === 'store') { has = !sl.used && d.storeAlive; if (has) { sl.used = true; d.storeAlive = false; } }
      else if (sl.pos) {
        const cell = b[sl.pos[0]][sl.pos[1]];
        if (cell && !cell.core) {   // 標記格若被放了寶玉核心(不該發生):不吃、算餓
          has = true;
          if (cell.el === 'iron' && (cell.lock || 1) > 1) { cell.lock--; evs.push({ t: 'duck_eat', e: i, r: sl.pos[0], c: sl.pos[1], iron: true, stripped: true, lock: cell.lock }); }   // 多層鐵塊只剝 1 層
          else { b[sl.pos[0]][sl.pos[1]] = null; evs.push({ t: 'duck_eat', e: i, r: sl.pos[0], c: sl.pos[1], iron: cell.el === 'iron', stripped: false }); }   // 一般格/1 層鐵塊 = 吃光
        }
      } else pend++;
      if (has) fed++; else hungry++;
    });
    evs.push({ t: 'duck_resolve', e: i, rule: d.rule, fed, hungry, pend, n: d.food.length, fat: fatBefore, emptied: d.emptied, ever: d.food.filter(f => f.ever).length, store: d.hasStore, mult: _fatMult(d) });
    for (let k = 0; k < hungry; k++) {
      if (state.ec.dead) break;
      const r = damagePlayer(state, e.atk * TUNING.HUNGRY_K * (1 + TUNING.FAT_PER * fatBefore), { kind: 'hungry', e: i }); r.ev.forEach(x => evs.push(x));
    }
    if (d.rule === 4) { d.fat = (hungry > 0 && TUNING.FAT_HUNGRY === 'reset') ? 0 : Math.min(TUNING.FAT_MAX, d.fat + (TUNING.FAT_MODE === 'each' ? fed : (hungry > 0 ? 0 : 1))); if (d.fat !== fatBefore) evs.push({ t: 'duck_fat', e: i, fat: d.fat, from: fatBefore }); }
    _duckNewRound(state, e, i, evs);
    return evs;
  }
  // 每放一塊之後(afterBlock ②):偵測標記格「變空」→ 3★/4★ 當下反擊(整隻一手最多一次、CD 不重置、待標不觸發);再補標待標份數
  function _duckAfterBlock(state, evs) {
    state.enemies.forEach((e, i) => {
      const d = e._d; if (!d || e.dead || e.hp <= 0) return;
      let trig = false;
      d.food.forEach((sl, k) => {
        if (sl.kind === 'cell' && !sl.pos) return;   // 待標:沒有格子可「變空」,不顯示生氣、不反擊
        const em = sl.kind === 'store' ? !!sl.used : !state.board[sl.pos[0]][sl.pos[1]];
        if (em && !sl.empty) { sl.empty = true; sl.ever = true; d.emptied++; trig = true; evs.push({ t: 'duck_empty', e: i, slot: k, store: sl.kind === 'store' }); }
        else if (!em && sl.empty) { sl.empty = false; evs.push({ t: 'duck_refed', e: i, slot: k }); }
      });
      if (trig && d.rule >= 3 && !d.counterHand && !state.ec.dead) {
        d.counterHand = true;
        const raw = e.atk * TUNING.COUNTER_K * _fatMult(d); evs.push({ t: 'duck_counter', e: i, raw: Math.round(raw), fat: d.fat });
        damagePlayer(state, raw, { kind: 'counter', e: i }).ev.forEach(x => evs.push(x));
      }
      _duckFill(state, e, i, evs);
    });
  }
  // 玩家用掉卡上的屬塊 → 所有活賊鴨已標記的屬塊食物變空(下一個 afterBlock 偵測並觸發反擊);回傳被用掉的份數
  function useStored(state) {
    let n = 0; state.enemies.forEach(e => { const d = e._d; if (!d || e.dead || e.hp <= 0 || !d.storeAlive) return; d.food.forEach(sl => { if (sl.kind === 'store' && !sl.used) { sl.used = true; n++; } }); d.storeAlive = false; });
    return n;
  }
  function markedCells(state) {   // 給 sim 的 AVOID_MARK policy:所有活賊鴨已標記的格(key = r*9+c)
    return _takenSet(state);
  }

  // ───────── 雷城鐵機人(spec-thunder v0.4.3 §2.3)─────────
  // 狀態 e._i = { rule, star, guest, cd, cells:[{r,c,obj,lock0}] }(obj=盤面上的鐵塊物件參照;lock0=上次出手結算後的層數,用來判「有沒有被動過」)
  function _ironRoll(state, e, i, evs) {
    const d = e._i, cd = Math.max(TUNING.IRON_MIN, TUNING.IRON_BASE + _rInt(TUNING.IRON_RAND[0], TUNING.IRON_RAND[1]));
    d.cd = cd; e.timer = cd; e.interval = cd;
    evs.push({ t: 'cd_roll', e: i, mon: 'iron', cd, skull: false, rule: d.rule });
  }
  function _ironInit(state, e, i, c, evs) {
    e._i = { rule: c.rule, star: c.star, guest: c.guest, cd: 0, cells: [] };
    _ironRoll(state, e, i, evs);
  }
  const _IR_SHAPES = {
    1: [[[0, 0]]],
    2: [[[0, 0], [0, 1]], [[0, 0], [1, 0]]],
    3: [[[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 0]], [[0, 0], [0, 1], [1, 1]], [[0, 1], [1, 0], [1, 1]]],
  };
  function _ironAlive(state, d) { return d.cells.filter(x => state.board[x.r][x.c] === x.obj); }
  // 放置:連體 n 格、全放在空格、放下後不會讓任何行/列/宮變滿;盤面空格 ≤ 81×IRON_EMPTY_FRAC 不放;優先選半滿宮(已填 2~6)起點。回傳 true=放了
  function _ironPlace(state, e, i, d, evs) {
    const b = state.board; let empty = 0; for (let r = 0; r < NB; r++) for (let c = 0; c < NB; c++) if (!b[r][c]) empty++;
    if (empty <= NB * NB * TUNING.IRON_EMPTY_FRAC) return false;
    const rf = [], cf = [], bf = []; for (let k = 0; k < NB; k++) { rf[k] = 0; cf[k] = 0; bf[k] = 0; }
    for (let r = 0; r < NB; r++) for (let c = 0; c < NB; c++) if (b[r][c]) { rf[r]++; cf[c]++; bf[Math.floor(r / 3) * 3 + Math.floor(c / 3)]++; }
    const n = TUNING.IRON_CELLS[d.rule - 1], shapes = _IR_SHAPES[n] || _IR_SHAPES[1], layers = Math.max(1, TUNING.IRON_LAYERS[d.rule - 1] | 0);
    const cands = [];
    shapes.forEach(sh => { for (let ar = 0; ar < NB; ar++) for (let ac = 0; ac < NB; ac++) {
      let okc = true; const cells = [];
      for (const [dr, dc] of sh) { const r = ar + dr, c = ac + dc; if (r >= NB || c >= NB || b[r][c]) { okc = false; break; } cells.push([r, c]); }
      if (!okc) continue;
      const ra = {}, ca = {}, ba = {}; cells.forEach(([r, c]) => { ra[r] = (ra[r] || 0) + 1; ca[c] = (ca[c] || 0) + 1; const bb = Math.floor(r / 3) * 3 + Math.floor(c / 3); ba[bb] = (ba[bb] || 0) + 1; });
      let full = false;
      for (const r in ra) if (rf[r] + ra[r] >= NB) full = true;
      for (const c in ca) if (cf[c] + ca[c] >= NB) full = true;
      for (const q in ba) if (bf[q] + ba[q] >= NB) full = true;
      if (full) continue;
      const f0 = bf[Math.floor(cells[0][0] / 3) * 3 + Math.floor(cells[0][1] / 3)];
      cands.push({ cells, g: (f0 >= 2 && f0 <= 6) ? 0 : 1 });
    } });
    if (!cands.length) return false;
    for (let k = cands.length - 1; k > 0; k--) { const j = rnd(k + 1); const t = cands[k]; cands[k] = cands[j]; cands[j] = t; }
    cands.sort((x, y) => x.g - y.g);
    const pick = cands[0]; d.cells = [];
    pick.cells.forEach(([r, c]) => { const obj = { el: 'iron', lock: layers, owner: i }; b[r][c] = obj; d.cells.push({ r, c, obj, lock0: layers }); });
    evs.push({ t: 'iron_place', e: i, rule: d.rule, cells: pick.cells.map(x => x.slice()), lock: layers, empty });
    return true;
  }
  function _ironAct(state, e, i) {
    const d = e._i, evs = [];
    e.timer--;
    if (e.timer > 0) { evs.push({ t: 'cd_tick', e: i, timer: e.timer, mon: 'iron' }); return evs; }
    const alive = _ironAlive(state, d); let mode;
    if (!alive.length) {   // 場上沒有自己的鐵塊 → 放新的 + 普攻
      const placed = _ironPlace(state, e, i, d, evs); if (!placed) { d.cells = []; evs.push({ t: 'iron_blocked', e: i }); }
      mode = 'place';
      damagePlayer(state, e.atk, { kind: 'iron', e: i }).ev.forEach(x => evs.push(x));
      evs.push({ t: 'iron_act', e: i, rule: d.rule, mode, placed, alive: d.cells.length, touched: false });
    } else {
      const touched = alive.length < d.cells.length || alive.some(x => x.obj.lock < x.lock0);   // B2:上次出手以來有格被剝層或消失(含被賊鴨吃)
      let hardened = false;
      if (touched || d.rule < 2) { mode = 'plain'; damagePlayer(state, e.atk, { kind: 'iron', e: i }).ev.forEach(x => evs.push(x)); }
      else { mode = 'punish'; damagePlayer(state, e.atk * (1 + TUNING.IRON_PUNISH_K * alive.length), { kind: 'punish', e: i }).ev.forEach(x => evs.push(x)); }
      if (!touched && d.rule === 4) { alive.forEach(x => { x.obj.lock = Math.min(TUNING.IRON_MAXLOCK, (x.obj.lock || 1) + 1); }); hardened = true; evs.push({ t: 'iron_harden', e: i, locks: alive.map(x => x.obj.lock) }); }
      d.cells = alive; d.cells.forEach(x => { x.lock0 = x.obj.lock; });
      evs.push({ t: 'iron_act', e: i, rule: d.rule, mode, alive: alive.length, touched, hardened });
    }
    _ironRoll(state, e, i, evs);
    return evs;
  }
  // 電擊(afterBlock ③):3★/4★ 鐵塊還在 → 每放一塊扣 剩餘鐵格數 × SHOCK_PCT × 最大血量;多隻疊加、可致死、黑熊不擋(damagePlayer 'shock' 排除)
  function _shockAfterBlock(state, evs) {
    state.enemies.forEach((e, i) => {
      const d = e._i; if (!d || e.dead || e.hp <= 0 || d.rule < 3 || state.ec.dead) return;
      const n = _ironAlive(state, d).length; if (!n) return;
      const raw = state.maxHP * TUNING.SHOCK_PCT * n; evs.push({ t: 'shock', e: i, n, raw: Math.round(raw) });
      damagePlayer(state, raw, { kind: 'shock', e: i }).ev.forEach(x => evs.push(x));
    });
  }
  function actOrder(state) {   // 同一敵回合賊鴨永遠先於鐵機人(不依站位);其餘依陣列序
    const a = [], rest = []; state.enemies.forEach((e, i) => { (e._d ? a : rest).push(i); }); return a.concat(rest);
  }

  // ───────── 土城石頭怪(spec-earth v0.4.4 §2.3,C1~C14)─────────
  // 狀態 e._r = { rule, star, guest, up(盾在), rebuilding, gate:{kind:'combo'|'hit', n}|null }
  // 規則表:1★ 擋 60%+COMBO 2;2★ 擋 75%+HIT 12;3★ 擋 90%+隨機盾(COMBO 3/HIT 15)+反震;4★ 擋 95%+隨機盾+反震+守護;串場(guest)鎖 1★。
  // 清除結算入口 = applyClear(呼叫端算好「一次清除」的 n(HIT 格數)/combo/每隻受害者的傷害 dmg/攻擊屬 atkEls),核心負責:盾判定/漏傷/破盾+50%/重建倒數/反震/守護/扣血(含急救)。
  function _rockGate(rule) {
    if (rule === 1) return { kind: 'combo', n: TUNING.ROCK_C1 };
    if (rule === 2) return { kind: 'hit', n: TUNING.ROCK_H2 };
    return rnd(2) === 0 ? { kind: 'combo', n: TUNING.ROCK_RC } : { kind: 'hit', n: TUNING.ROCK_RH };   // 3★/4★ 隨機盾,開場也抽(C8)
  }
  function _rockRoll(state, e, i, evs) {
    const d = e._r, cd = Math.max(TUNING.ROCK_MIN, TUNING.ROCK_BASE + _rInt(TUNING.ROCK_RAND[0], TUNING.ROCK_RAND[1]));
    e.timer = cd; e.interval = cd; evs.push({ t: 'cd_roll', e: i, mon: 'rock', cd, skull: false, rule: d.rule });
  }
  function _rockInit(state, e, i, c, evs) {
    e._r = { rule: c.rule, star: c.star, guest: c.guest, up: true, rebuilding: false, gate: null, sk: 0, bonusNext: false };
    e._r.gate = _rockGate(c.rule); evs.push({ t: 'shield_up', e: i, rule: c.rule, kind: e._r.gate.kind, n: e._r.gate.n, open: true });
    _rockRoll(state, e, i, evs);
  }
  function _rockAct(state, e, i) {
    const d = e._r, evs = [];
    e.timer--;
    if (e.timer > 0) { evs.push({ t: 'cd_tick', e: i, timer: e.timer, mon: 'rock' }); return evs; }
    if (d.up) { const sm = TUNING.ROCK_SHIELD_ATK[d.rule - 1] > 0 ? TUNING.ROCK_SHIELD_ATK[d.rule - 1] : 1; evs.push(sm === 1 ? { t: 'rock_attack', e: i, rule: d.rule } : { t: 'rock_attack', e: i, rule: d.rule, mult: sm }); damagePlayer(state, e.atk * sm, { kind: 'attack', e: i }).ev.forEach(x => evs.push(x)); }   // press:盾在時普攻 × ROCK_SHIELD_ATK[星](預設 1)   // 有盾:CD 歸 0 = 普攻
    else { d.up = true; d.rebuilding = false; d.sk = 0; d.bonusNext = false; d.gate = _rockGate(d.rule); evs.push({ t: 'shield_rebuild', e: i, rule: d.rule, kind: d.gate.kind, n: d.gate.n }); }   // 無盾:重建(不攻擊),隨機盾重抽
    _rockRoll(state, e, i, evs);
    return evs;
  }
  // ctx:{ n:本次清除 HIT 格數, combo:本次清除後的 combo, dmg:每隻受害者本次傷害(整數), atkEls:[攻擊屬], curb:true=剋屬命中 CD+1(石頭怪由本函式處理;其他怪由呼叫端) }
  // 一次清除 = 一個「手」的結算單位(C2:守護以呼叫開始前的盾狀態為準)。反震:一次呼叫內各受害者加總成一次 'recoil' 傷害;若同一次把最後一隻怪清掉=勝利,反震取消。
  function applyClear(state, victims, ctx) {
    ctx = ctx || {}; const evs = [], T = ELT(), n = ctx.n || 0, combo = ctx.combo || 0, dmg0 = Math.max(0, Math.round(ctx.dmg || 0)), atkEls = ctx.atkEls || [];   // 2026-11-16 ctx.dmgOf(v)(選用):全體攻擊逐隻相剋→每隻受害者各自的傷害;沒給=沿用 ctx.dmg 一律同值
    const E = state.enemies, shield0 = E.map(x => !!(x._r && x._r.up && !x.dead && x.hp > 0));   // 呼叫前的盾狀態快照
    const guardian = E.map(x => !!(x._r && x._r.rule === 4 && !x._r.guest && x._r.up && !x.dead && x.hp > 0));
    const batch = []; let recoilSum = 0;
    victims.forEach(v => {
      if (v.dead || v.hp <= 0) return;
      const vi = E.indexOf(v), beaten = atkEls.some(a => T[a] && T[a].beats === v.el), dmg = (typeof ctx.dmgOf === 'function') ? Math.max(0, Math.round(ctx.dmgOf(v) || 0)) : dmg0;
      const guarded = !shield0[vi] && ((vi > 0 && guardian[vi - 1]) || (vi < E.length - 1 && guardian[vi + 1]));   // C1~C4:左右各一格(死亡空位不補、不跨),當下沒盾才受守護,兩邊不疊加
      let amt = dmg;
      if (v._r) {
        const r = v._r;
        if (r.rebuilding && beaten && !ctx.active) { v.timer = Math.max(v.timer || 0, 2); evs.push({ t: 'rebuild_reset', e: vi, timer: v.timer }); }   // 剋屬(雷剋土)打中重建中 → 倒數重設
        if (ctx.curb && beaten && counterDelay() > 0) { delayEnemy(v, counterDelay()); evs.push({ t: 'cd_extend', e: vi, by: counterDelay(), timer: v.timer }); }   // C13:剋屬命中 CD+1(先於破盾的 timer=2,同遊戲順序)。2026-11-16 大毛拍板取消(COUNTER_DELAY=0 預設不延後;1=舊行為)
        if (shield0[vi]) {
          const g = r.gate, act = !!ctx.active;
          // 主動技(2026-11-10):combo 盾 = 共用 combo + 這隻的主動技次數 sk ≥ n 破盾;主動技打中(盾在、combo 盾)先 sk+1 再判定;ctx.noSk=風技(本身已讓共用 combo+1,不重複算)
          if (act && g && g.kind === 'combo' && !ctx.noSk) { r.sk = (r.sk | 0) + 1; evs.push({ t: 'rock_sk', e: vi, sk: r.sk, need: g.n, left: Math.max(0, g.n - combo - r.sk) }); }
          const eff = combo + (r.sk | 0), reach = !g || (g.kind === 'hit' ? n >= g.n : eff >= g.n), blocked = !!g && !reach;
          if (blocked || (act && reach)) {   // 一般清除達標=破盾(全額 +50%);主動技達標=破盾但「這一下照樣被擋」,下一擊才吃全額 +50%(r.bonusNext)
            const leak = TUNING.ROCK_LEAK[r.rule - 1], chip = Math.round(dmg * leak), absorbed = Math.round(dmg * (1 - leak));
            const recoil = (r.rule >= 3 && !r.guest) ? Math.round(absorbed * TUNING.RECOIL_PCT) : 0;   // C5:被擋下傷害(不含破盾追加)×20%
            amt = chip; recoilSum += recoil;
            if (blocked) evs.push({ t: 'shield_block', e: vi, rule: r.rule, kind: g.kind, need: g.n, have: g.kind === 'hit' ? n : eff, diff: g.n - (g.kind === 'hit' ? n : eff), chip, absorbed, recoil });
            else { r.up = false; r.rebuilding = true; r.gate = null; r.sk = 0; r.bonusNext = true; v.timer = TUNING.ROCK_REBUILD; evs.push({ t: 'shield_break', e: vi, rule: r.rule, kind: g.kind, bonus: 0, total: amt, active: true, chip, absorbed, recoil }); }
          } else {
            const bonus = Math.round(dmg * TUNING.ROCK_BREAK_BONUS); amt = dmg + bonus;   // 破盾:該手全額 +50%,不受守護、不反震
            r.up = false; r.rebuilding = true; r.gate = null; r.sk = 0; r.bonusNext = false; v.timer = TUNING.ROCK_REBUILD;
            evs.push({ t: 'shield_break', e: vi, rule: r.rule, kind: g ? g.kind : null, bonus, total: amt });
          }
        } else if (r.bonusNext && !r.up) { const bonus = Math.round(dmg * TUNING.ROCK_BREAK_BONUS); amt = dmg + bonus; r.bonusNext = false; evs.push({ t: 'break_bonus', e: vi, bonus, total: amt }); }   // 主動技破盾後的下一擊:全額 +50%(不受守護)
        else if (guarded) { amt = Math.round(dmg * TUNING.GUARD_PCT); evs.push({ t: 'guard', e: vi, dmg, taken: amt }); }
      } else {
        const blocked = (v.hitGate && n < v.hitGate) || (v.comboGate && combo < v.comboGate);   // 非石頭怪的舊式門檻欄位(沿用 sim/遊戲現行)
        if (blocked) amt = Math.round(dmg * (v.shieldLeak || 0));
        else if (guarded) { amt = Math.round(dmg * TUNING.GUARD_PCT); evs.push({ t: 'guard', e: vi, dmg, taken: amt }); }
      }
      if (v._j) {   // 寶玉怪:相剋加成已在 dmg 內(先算),這裡再被核心盾擋;剋屬命中 CD+1(全域規則)
        if (ctx.curb && beaten && counterDelay() > 0) { delayEnemy(v, counterDelay()); evs.push({ t: 'cd_extend', e: vi, by: counterDelay(), timer: v.timer }); }   // 2026-11-16 大毛拍板取消(同上)
        amt = _jewelCut(v, vi, amt, evs);
      }
      _hpHit(v, amt); batch.push(v);
    });
    _settle(state, batch, evs);
    if (recoilSum > 0) {
      if (!E.some(x => !x.dead && x.hp > 0)) evs.push({ t: 'recoil_cancel', raw: recoilSum });   // 同一次清掉最後一隻 = 直接勝利
      else damagePlayer(state, recoilSum, { kind: 'recoil' }).ev.forEach(x => evs.push(x));
    }
    return evs;
  }

  // ───────── 水城補師(spec-water v0.4.8 §2.3,D1~D13)─────────
  // 狀態 e._h = { rule, star, guest, boss, rescued, rage, revivedOnce, charges, cast:{type:'heal'|'revive', readyIn, left}|null, hitClear }
  // 規則表:1★ 補 25%;2★ 補 33%+急救;3★ 補 50%+急救+憤怒(急救後);4★ 博士(魔王專用)詠唱補 40%+全滅復活 2 次+憤怒(復活成功後),無急救;串場鎖 1★(補 25%,無急救/憤怒)。
  // 一般補師(非魔王):輪到牠時隊友(不含自己)有人 <50% → 補全體活著友軍(含自己),否則普攻;補血立即、不能打斷。
  // 魔王位:一手只做一件事——小兵全滅(≥3★,有額度)→詠唱復活(額度起手扣、2 輪後成);隊友有人 <50% →詠唱補血(下一輪補);否則攻擊。詠唱成功前被打中 CAST_HITS(2)下 → 中止(額度不返還)。
  function _healerInit(state, e, i, c, evs) {
    e._h = { rule: c.rule, star: c.star, guest: c.guest, boss: !!e.boss, rescued: false, rage: false, revivedOnce: false, charges: (!!e.boss && c.rule >= 3 && !c.guest) ? TUNING.REVIVE_MAX : 0, cast: null, hitClear: false };
    _healRoll(state, e, i, evs);
  }
  function _healRoll(state, e, i, evs) {
    const d = e._h; let cd = Math.max(TUNING.HEAL_MIN, TUNING.HEAL_BASE + _rInt(TUNING.HEAL_RAND[0], TUNING.HEAL_RAND[1]));
    if (d.cast && TUNING.CAST_CD > 0) cd = TUNING.CAST_CD;   // 旋鈕:詠唱進行中每步固定 CD(1=字面 1 手/2 手)
    e.timer = cd; e.interval = cd; evs.push({ t: 'cd_roll', e: i, mon: 'healer', cd, skull: false, rule: d.rule });
  }
  const _alive = x => !x.dead && x.hp > 0;
  function _anyLow(state, e) { return state.enemies.some(x => x !== e && _alive(x) && x.hp < x.max * TUNING.HEAL_LOW); }
  function _healAll(state, e, i, evs) {
    const d = e._h, rate = TUNING.HEAL_RATE[d.rule - 1]; let total = 0, cnt = 0;
    state.enemies.forEach(a => { if (!_alive(a)) return; const hh = Math.max(1, Math.round(a.max * rate)), before = a.hp; a.hp = Math.min(a.max, a.hp + hh); total += a.hp - before; cnt++; });
    evs.push({ t: 'heal', e: i, rule: d.rule, rate, total, n: cnt, boss: d.boss });
    _healedRage(d, i, evs);
  }
  function _healerAttack(state, e, i, evs) {
    const d = e._h, nw = _newRageOn(), nm = nw ? _healRageMult(d) : 1, raged = nw ? nm > 1 : d.rage, raw = e.atk * (nw ? nm : (raged ? TUNING.RAGE_MULT : 1));
    evs.push(nw ? { t: 'healer_attack', e: i, rule: d.rule, rage: raged, raw: Math.round(raw), stage: d.rageStage | 0, mult: nm } : { t: 'healer_attack', e: i, rule: d.rule, rage: raged, raw: Math.round(raw) });
    damagePlayer(state, raw, { kind: raged ? 'rage' : 'attack', e: i }).ev.forEach(x => evs.push(x));
  }
  function _fireRevive(state, e, i, evs) {
    const d = e._h, dead = state.enemies.filter(m => m !== e && m.dead && !_isRare(m) && !m.boss); d.cast = null;   // 【定案 2026-11-11】魔王永遠不被復活(雙魔王陣容另一隻魔王死了也不復活)
    dead.forEach(m => { m.dead = false; m.hp = m.max; });
    evs.push({ t: 'revive_done', e: i, n: dead.length });
    if (d.rule === 4 && !d.revivedOnce) { d.revivedOnce = true; _rageOn(d, i, 'revive', evs); }   // 4★:第一次復活成功 → 憤怒(3★ 魔王的復活不觸發,D7)
  }
  function _healerAct(state, e, i) {
    const d = e._h, evs = [];
    e.timer--;
    if (e.timer > 0) { evs.push({ t: 'cd_tick', e: i, timer: e.timer, mon: 'healer' }); return evs; }
    if (!d.boss) { if (_anyLow(state, e) && !_noHeal(d)) _healAll(state, e, i, evs); else _healerAttack(state, e, i, evs); }
    else if (d.cast) {
      if (--d.cast.readyIn <= 0) { if (d.cast.type === 'revive') _fireRevive(state, e, i, evs); else { d.cast = null; _healAll(state, e, i, evs); } }
    } else {
      const others = state.enemies.filter(x => x !== e && !_isRare(x) && !x.boss);   // 「小兵全滅」只看一般小兵:稀有怪(銀/金/寶玉)與魔王不算,也不被復活(spec-daily-island 決議 4)
      if (d.charges > 0 && others.length > 0 && others.every(x => !_alive(x))) { d.charges--; d.cast = { type: 'revive', readyIn: Math.max(1, TUNING.REVIVE_ROUNDS | 0), left: TUNING.CAST_HITS }; evs.push({ t: 'cast_start', e: i, type: 'revive', charges: d.charges }); }
      else if (_anyLow(state, e)) { d.cast = { type: 'heal', readyIn: 1, left: TUNING.CAST_HITS }; evs.push({ t: 'cast_start', e: i, type: 'heal' }); }
      else _healerAttack(state, e, i, evs);
    }
    _healRoll(state, e, i, evs);
    return evs;
  }
  // 詠唱中被打中:'clear' 每手最多 1 下(hitClear,endEnemyPhase 清),'active' 另算 1 下;任何屬性都算;剩 0 → 中止
  function _castHit(state, e, kind, evs) {
    const d = e._h; if (!d || !d.cast || e.dead || e.hp <= 0) return;
    if (kind === 'clear') { if (d.hitClear) return; d.hitClear = true; }
    const i = state.enemies.indexOf(e); d.cast.left--;
    evs.push({ t: 'cast_hit', e: i, kind, left: d.cast.left, type: d.cast.type });
    if (d.cast.left <= 0) { evs.push({ t: 'cast_interrupt', e: i, type: d.cast.type, by: kind }); d.cast = null; }
  }
  function urgentCast(state, ignoreHitClear) {   // 呼叫端輔助:正在詠唱、還能被打中計數的魔王位補師(給 sim 的 policy:玩家看到十字架會想打牠)
    return state.enemies.find(e => e._h && e._h.cast && _alive(e) && (ignoreHitClear || !e._h.hitClear)) || null;
  }

  // ───────── 階段 4 稀有怪(spec-stage-encounters v1.5.12 §5.2/§5.3/§5.3b/§5.3c;同一種怪所有模式機制一樣)─────────
  // 銀怪=金屬怪 e._m = { star, fled, flee }【2026-11-09 metalatk 製作人更正:像 DQ 金屬史萊姆,會攻擊也會逃跑】:
  //   e.timer = 「攻擊倒數」(畫面顯示的那個數字;每手 −1,歸 0 出手:傷害 = ATK × METAL_K,走 damagePlayer,事件 metal_attack;出手後重抽 METAL_ATK_CD,事件 cd_roll mon:'metal');延遲技(雷主動技 timer+N)/剋屬(無)只作用在它。
  //   e._m.flee = 「逃跑倒數」METAL_FLEE(6~8):每手 −1(不受延遲技影響),歸 0 必逃 → e.dead=e.fled=true、事件 flee(逃走不掉東西);畫面不顯示數字,≤3 時冒汗(cd_tick 事件帶 flee 欄位)。
  //   同一手兩個倒數同時歸 0:先逃,不攻擊。無屬(剋屬不加)。
  // 金怪=金錢怪 e._y = { star, cd, down, shrinks, start }:不逃跑;CD 抽 MONEY_CD(2/3/4 各 1/3)。2~3 = 攻擊;4 = 這輪結束縮小=直接變下一隻(c76→c75→c74,換卡、血量照比例、獎勵跟當下那隻);1★ 抽 4 → 普攻玩家最大血量 × MONEY_CHIP。
  //   CD 抽到 4 且還不是 1★ 時 cd_roll 事件帶 downgrade:true(畫面顯示降級符號)。
  //   【2026-11-09 money 依輪】TUNING.MONEY_BY_ROUND:第 1 輪還不是 1★ 就每抽強制縮小(倒數 2,3★:第 2 手→2★、第 4 手→1★,之後照現行);第 2 輪只有登場第一抽強制縮小(倒數 3),之後照現行隨機;第 3 輪/round=0 不變。縮小判斷改看 d.down(強制縮小倒數會與攻擊 CD 同值);1★ 抽到 SHRINK_CD(down=false)仍是普攻。
  // 寶玉怪 e._j = { star, cores:[{r,c,obj,broken}], pending, placed, waiting, sdown }:登場放「核心」(數量=星數)進盤面空格;放不下的先「待放」,之後每放一塊/每輪再檢查;
  //   只要還有未敲碎核心(已放或待放)就擋下 JEWEL_BLOCK 傷害;核心格被清(syncCores 偵測 board[r][c] !== obj)= 敲碎;全碎才吃全額;會攻擊(CD 基本 2+隨機 0~2);不逃跑、不給時限。
  const _isRare = x => !!(x._m || x._y || x._j);
  // 延遲技統一入口(2026-11-09 製作人更正:攻擊倒數與逃跑倒數一起延):所有怪 timer += n;金屬怪(未死)再 _m.flee += n;回傳新 timer
  function delayEnemy(e, n) {
    if (!e) return 0;
    e.timer = (e.timer || 0) + n;
    if (e._m && !e.dead && !e._m.fled) e._m.flee += n;
    return e.timer;
  }
  function _metalRoll(state, e, i, evs, init) {   // 重抽「攻擊倒數」(e.timer);init=登場時另抽逃跑倒數 e._m.flee
    const cd = _rInt(TUNING.METAL_ATK_CD[0], TUNING.METAL_ATK_CD[1]); e.timer = cd; e.interval = cd;
    const ev = { t: 'cd_roll', e: i, mon: 'metal', cd, skull: false, rule: e._m.star, flee: false };
    if (init) { e._m.flee = _rInt(TUNING.METAL_FLEE[0], TUNING.METAL_FLEE[1]); ev.fleeIn = e._m.flee; }   // fleeIn:登場時的逃跑倒數(畫面不顯示數字,只給冒汗用)
    evs.push(ev);
  }
  function _metalInit(state, e, i, c, evs) { e._m = { star: c.star, fled: false, flee: 0 }; _metalRoll(state, e, i, evs, true); }
  function _metalAct(state, e, i) {
    const evs = [];
    e._m.flee--; e.timer--;
    if (e._m.flee <= 0) { e._m.fled = true; e.fled = true; e.dead = true; evs.push({ t: 'flee', e: i, star: e._m.star }); return evs; }   // 逃跑倒數歸 0 必逃(同手也歸 0 → 不攻擊)
    if (e.timer > 0) { evs.push({ t: 'cd_tick', e: i, timer: e.timer, mon: 'metal', flee: e._m.flee }); return evs; }
    const base = TUNING.METAL_HIT[e._m.star]; const raw = (base != null ? base : e.atk) * TUNING.METAL_K; evs.push({ t: 'metal_attack', e: i, rule: e._m.star, raw: Math.round(raw), flee: e._m.flee }); damagePlayer(state, raw, { kind: 'attack', e: i }).ev.forEach(x => evs.push(x));
    _metalRoll(state, e, i, evs, false);
    return evs;
  }

  function _moneyRoll(state, e, i, evs) {
    const d = e._y, cd = _rInt(TUNING.MONEY_CD[0], TUNING.MONEY_CD[1]); d.cd = cd; e.timer = cd; e.interval = cd;
    d.down = (cd === TUNING.MONEY_SHRINK_CD && d.star > 1);
    const rd = state && state.ec ? state.ec.round : 0, bp = TUNING.MONEY_BY_ROUND && TUNING.MONEY_BY_ROUND[rd];
    if (bp && d.star > 1 && (bp.force === 'all' || (bp.force === 'first' && d.shrinks === 0))) { d.down = true; d.cd = bp.shrinkCd; e.timer = bp.shrinkCd; e.interval = bp.shrinkCd; }
    evs.push({ t: 'cd_roll', e: i, mon: 'money', cd: d.cd, skull: false, rule: d.star, downgrade: d.down });
  }
  function _moneyInit(state, e, i, c, evs) { e._y = { star: c.star, cd: 0, down: false, shrinks: 0, start: c.star }; _moneyRoll(state, e, i, evs); }
  function _moneyShrink(state, e, i, evs) {   // 縮小 = 直接變成下一隻:換卡(cardId c73+星)、星數−1、最大 HP/ATK 換成下一隻的、血量百分比不變
    const d = e._y, from = d.star, to = from - 1, ratio = e.max > 0 ? e.hp / e.max : 1, T = e.starTable && e.starTable[to];
    const nm = T ? T.max : Math.max(1, Math.round(e.max / TUNING.MONEY_HP_STEP)), na = (T && T.atk != null) ? T.atk : Math.max(1, Math.round(e.atk / TUNING.MONEY_ATK_STEP));
    e.max = nm; e.hp = Math.max(1, Math.round(ratio * nm)); e.atk = na; d.star = to; d.shrinks++; e.star = to; e.tier = to; e.cardId = 'c' + (73 + to); if (e.dropCard) e.dropCard = e.cardId;
    evs.push({ t: 'shrink', e: i, from, to, ratio, hp: e.hp, max: e.max, card: e.cardId });
  }
  function _moneyAct(state, e, i) {
    const d = e._y, evs = [];
    e.timer--;
    if (e.timer > 0) { evs.push({ t: 'cd_tick', e: i, timer: e.timer, mon: 'money' }); return evs; }
    if (d.down || d.cd === TUNING.MONEY_SHRINK_CD) {   // d.down=縮小那一抽(依輪強制縮小的倒數可能與攻擊 CD 同值);1★ 抽到 SHRINK_CD(down=false)→ 普攻
      if (d.down) _moneyShrink(state, e, i, evs);
      else { const raw = state.maxHP * TUNING.MONEY_CHIP; evs.push({ t: 'money_attack', e: i, rule: d.star, chip: true, raw: Math.round(raw) }); damagePlayer(state, raw, { kind: 'attack', e: i }).ev.forEach(x => evs.push(x)); }   // 1★:抽 4 改普攻(約 1/10 最大血量)
    } else { const raw = e.atk * TUNING.MONEY_K; evs.push({ t: 'money_attack', e: i, rule: d.star, chip: false, raw: Math.round(raw) }); damagePlayer(state, raw, { kind: 'attack', e: i }).ev.forEach(x => evs.push(x)); }
    _moneyRoll(state, e, i, evs);
    return evs;
  }

  const _boxIdx = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3);
  function _coreLeft(d) { return d.pending + d.cores.filter(k => !k.broken).length; }
  function _jewelShield(e) { const d = e._j; return !!d && _coreLeft(d) > 0; }   // 還有未敲碎(已放或待放)的核心
  function _jewelCut(e, i, amt, evs) {   // 核心盾:在 → 只承受 (1−擋傷%);相剋加成已算在 amt 裡(先算再擋)
    const d = e._j; if (!d || !_jewelShield(e)) return amt;
    const chip = Math.round(amt * (1 - TUNING.JEWEL_BLOCK[d.star - 1]));
    evs.push({ t: 'core_block', e: i, rule: d.star, dmg: amt, chip, left: _coreLeft(d) });
    return chip;
  }
  // 放核心:空格、不補滿任何行/列/宮、同一隻的各顆核心不同行不同列不同宮(只對照尚未敲碎的)、不放在賊鴨已標記的格;放不下就「待放」(不退讓)
  function _jewelFill(state, e, i, evs, init) {
    const d = e._j; if (!d || d.pending <= 0 || e.dead || e.hp <= 0 || !state || !state.board) return;
    const b = state.board;
    while (d.pending > 0) {
      const rf = [], cf = [], bf = []; for (let k = 0; k < NB; k++) { rf[k] = 0; cf[k] = 0; bf[k] = 0; }
      for (let r = 0; r < NB; r++) for (let c = 0; c < NB; c++) if (b[r][c]) { rf[r]++; cf[c]++; bf[_boxIdx(r, c)]++; }
      const uR = new Set(), uC = new Set(), uB = new Set(); d.cores.forEach(k => { if (!k.broken) { uR.add(k.r); uC.add(k.c); uB.add(_boxIdx(k.r, k.c)); } });
      const taken = _takenSet(state), cands = [];
      for (let r = 0; r < NB; r++) for (let c = 0; c < NB; c++) {
        if (b[r][c] || taken.has(r * NB + c)) continue;
        const bx = _boxIdx(r, c); if (uR.has(r) || uC.has(c) || uB.has(bx)) continue;
        if (rf[r] + 1 >= NB || cf[c] + 1 >= NB || bf[bx] + 1 >= NB) continue;   // 放下去就補滿行/列/宮 → 不放
        cands.push([r, c]);
      }
      if (!cands.length) { if (!d.waiting) { d.waiting = true; evs.push({ t: 'core_wait', e: i, pending: d.pending, init: !!init }); } return; }
      const p = cands[rnd(cands.length)], obj = { el: 'core', core: true, owner: i };
      b[p[0]][p[1]] = obj; d.cores.push({ r: p[0], c: p[1], obj, broken: false }); d.pending--; d.placed++;
      evs.push({ t: 'core_place', e: i, r: p[0], c: p[1], left: d.pending, init: !!init, late: d.waiting });
    }
    d.waiting = false;
  }
  function _jewelInit(state, e, i, c, evs) {
    e._j = { star: c.star, cores: [], pending: c.star, placed: 0, waiting: false, sdown: false };
    _jewelFill(state, e, i, evs, true); _jewelRoll(state, e, i, evs);
  }
  function _jewelRoll(state, e, i, evs) {
    const cd = Math.max(TUNING.JEWEL_MIN, TUNING.JEWEL_BASE + _rInt(TUNING.JEWEL_RAND[0], TUNING.JEWEL_RAND[1])); e.timer = cd; e.interval = cd;
    evs.push({ t: 'cd_roll', e: i, mon: 'jewel', cd, skull: false, rule: e._j.star });
  }
  function _jewelAct(state, e, i) {
    const evs = [], d = e._j;
    _jewelFill(state, e, i, evs, false);
    e.timer--;
    if (e.timer > 0) { evs.push({ t: 'cd_tick', e: i, timer: e.timer, mon: 'jewel' }); return evs; }
    const raw = e.atk * TUNING.JEWEL_K; evs.push({ t: 'jewel_attack', e: i, rule: d.star, shield: _jewelShield(e), raw: Math.round(raw) });
    damagePlayer(state, raw, { kind: 'attack', e: i }).ev.forEach(x => evs.push(x));
    _jewelRoll(state, e, i, evs);
    return evs;
  }
  function _jewelAfterBlock(state, evs) { state.enemies.forEach((e, i) => { if (e._j && !e.dead && e.hp > 0) _jewelFill(state, e, i, evs, false); }); }
  function _jewelVanish(state, x, xi, evs) {   // 寶玉怪被打倒:場上剩的核心一起消失(【預設】規格未寫)
    const d = x._j; let n = 0; d.cores.forEach(k => { if (!k.broken) { k.broken = true; if (state.board && state.board[k.r][k.c] === k.obj) { state.board[k.r][k.c] = null; n++; } } }); d.pending = 0;
    if (n) evs.push({ t: 'core_vanish', e: xi, n });
  }
  function coreCells(state) {   // 場上還活著(未敲碎、仍在盤面)的核心格 [[r,c,e索引]...](給 policy / UI 用)
    const out = [];
    state.enemies.forEach((e, i) => { const d = e._j; if (!d || e.dead) return; d.cores.forEach(k => { if (!k.broken && state.board[k.r][k.c] === k.obj) out.push([k.r, k.c, i]); }); });
    return out;
  }
  // 玩家清除/主動技之後呼叫:核心格已不在盤面上(任何原因被清掉)→ 敲碎;最後一顆碎 → 核心盾破(core_shield_down)。afterBlock 會自動呼叫;主動技直接清格時呼叫端也要呼叫。
  function syncCores(state) {
    const evs = [];
    state.enemies.forEach((e, i) => {
      const d = e._j; if (!d || e.dead) return;
      d.cores.forEach(k => { if (!k.broken && state.board[k.r][k.c] !== k.obj) { k.broken = true; evs.push({ t: 'core_break', e: i, r: k.r, c: k.c, left: _coreLeft(d) }); } });
      if (!d.sdown && !_jewelShield(e)) { d.sdown = true; evs.push({ t: 'core_shield_down', e: i }); }
    });
    return evs;
  }

  // ───────── C7 enemyPhase:哥布林/賊鴨/鐵機人的 timer 倒數與出手派工(其他怪種仍由 sim 舊碼)─────────
  function _kLookup(tb0, dk, rd) { if (!tb0 || !dk || tb0[dk] == null) return 0; const v = Array.isArray(tb0[dk]) ? tb0[dk][rd - 1] : tb0[dk]; return v > 0 ? v : 0; }
  function kFor(state, which, e) {   // 骷髏/酋長倍率:K_BY_DIFF 開且難度在表內 → 表值;否則單值(which='skull'|'chief')
    // 2026-11-09 依輪:表值可為數字(全輪共用)或長度 3 陣列 [r1,r2,r3];輪 = state.ec.round(initState 的 opts.round,1|2|3);沒給/0(沒開三輪)→ 視為第 2 輪欄
    // 2026-11-09 lethal:which='skull' 且 e 是魔王(e.boss)→ 先查 BOSS_SKULL_K_BY_DIFF(缺格/null/0 → 退回小怪表 SKULL_K_BY_DIFF)
    const dk = (state.ec && state.ec.dk) || state.dk;
    const rd = (state.ec && (state.ec.round === 1 || state.ec.round === 3)) ? state.ec.round : 2;
    if (TUNING.K_BY_DIFF && dk) {
      if (which === 'skull' && e && !e.boss && e.atk > 0) { const st = state.ec && state.ec.stage; if (st === 1 || st === 2) { const mt = TUNING.MINION_SKULL_DMG_BY_STAGE, row = mt && mt[dk] && mt[dk][rd - 1], dmg = row ? row[st - 1] : 0; if (dmg > 0) return dmg / e.atk * (e._pm > 0 ? e._pm : 1); } }   // 2026-11-09 minionhp:小怪關(S1/S2)骷髏 = 絕對傷害(建議隊 HP × 比例);魔王/S3/缺格 → 往下走原表
      if (which === 'skull' && e && e.boss) { const b = _kLookup(TUNING.BOSS_SKULL_K_BY_DIFF, dk, rd); if (b > 0) return b; }
      if (which === 'chiefdef') { const c = _kLookup(TUNING.CHIEF_DEFUSED_K_BY_DIFF, dk, rd); if (c > 0) return c; return TUNING.CHIEF_DEFUSED_K; }   // 2026-11-09 chiefdef:拆除後那擊;表缺格 → 單值
      const v = _kLookup(which === 'chief' ? TUNING.CHIEF_K_BY_DIFF : TUNING.SKULL_K_BY_DIFF, dk, rd); if (v > 0) return v;
    }
    if (which === 'chiefdef') return TUNING.CHIEF_DEFUSED_K;
    return which === 'chief' ? TUNING.CHIEF_K : TUNING.SKULL_K;
  }
  // 哥布林「下一次出手」的倍率(enemyAct 與 nextHitDamage 共用,公式只此一份)。回傳 { mult, skull }
  function _hitMult(state, e, g) {
    if (g.rule === 4 && !g.defused) { const idx = Math.max(0, Math.min(TUNING.COOL.length - 1, TUNING.CHIEF_HITS - g.left)); return { skull: true, mult: kFor(state, 'chief', e) * TUNING.COOL[idx] }; }
    if (g.rule === 4) return { skull: false, mult: kFor(state, 'chiefdef', e) };   // 拆除後的一般攻擊:ATK×1.4(不是 CD×PER_CD)
    if (g.defused) return { skull: false, mult: TUNING.DEFUSED_K };   // 🆕v1.5.0 1~3★ 拆除後普攻
    if (g.skull) return { skull: true, mult: kFor(state, 'skull', e) / (e._pm > 0 ? e._pm : 1) };   // 2026-11-10 atk:普攻係數 e._pm 只加強普通出手,骷髏絕對傷害不變(除回去;小怪關絕對傷害分支在 kFor 內先乘 _pm,兩邊抵銷)
    return { skull: false, mult: g.cd * TUNING.PER_CD };
  }
  // 這隻哥布林下一次出手的原始傷害(未四捨五入;不含餘火)。非哥布林/已死 → 0。遊戲與 sim 的 enemyAct 實際出手走同一函式。
  function nextHitDamage(state, e) { const g = e && e._g; if (!g || e.dead || e.hp <= 0) return 0; return e.atk * _hitMult(state, e, g).mult; }
  // 致死判定(只供顯示:骷髏圖示/光暈;不影響傷害):下一擊(不含餘火,四捨五入同 damagePlayer)>= 隊伍「最大」血量
  function isLethal(state, e) { const d = nextHitDamage(state, e); return d > 0 && Math.round(d) >= state.maxHP; }
  function enemyAct(state, i) {   // 單隻;sim 為了維持與舊碼相同的出手順序,逐隻呼叫(順序請用 actOrder)
    const e = state.enemies[i], evs = [], g = e && e._g;
    if (e && !e.dead && e.hp > 0) { if (e._m) return _metalAct(state, e, i); if (e._y) return _moneyAct(state, e, i); if (e._j) return _jewelAct(state, e, i); if (e._d) return _duckAct(state, e, i); if (e._i) return _ironAct(state, e, i); if (e._r) return _rockAct(state, e, i); if (e._h) return _healerAct(state, e, i); }
    if (!g || e.dead || e.hp <= 0) return evs;
    if (g.skipTick) { g.skipTick = false; return evs; }   // 本手被中止:CD 不另外倒數
    e.timer--;
    if (e.timer > 0) { evs.push({ t: 'cd_tick', e: i, timer: e.timer }); return evs; }
    // 出手
    const hm = _hitMult(state, e, g), mult = hm.mult, skull = hm.skull;   // 與 nextHitDamage 同源
    const raw = nextHitDamage(state, e), lethal = skull && isLethal(state, e);   // lethal:出手當下(重抽 CD 前)這一擊是否「會死」(只供顯示:浮字 💀 骷髏重擊!),不影響傷害
    evs.push({ t: 'enemy_attack', e: i, cd: g.cd, skull, lethal, rule: g.rule, left: g.left, mult, raw: Math.round(raw), defused: !!g.defused });
    const r = damagePlayer(state, raw, { kind: 'gob', e: i });
    r.ev.forEach(x => evs.push(x));
    if (g.rule >= 3 && r.dealt > 0 && r.dealt > state.ec.burnCand) state.ec.burnCand = r.dealt;   // 3★/4★ 餘火:以實際傷害 D 計(黑熊擋掉=0=無餘火);同一輪多隻取最大
    g.left = TUNING.CHIEF_HITS; g.defused = false;
    _roll(state, e, i, evs, false);
    return evs;
  }
  function endEnemyPhase(state) {   // 一輪敵人行動結束:提交餘火(取最大、不疊加、重新起算)+ 黑熊冷卻 + 清本手旗標
    const ec = state.ec, evs = [];
    if (ec.burnCand > 0) {
      const D = ec.burnCand, restart = !!ec.burn; ec.burn = { D, idx: 0 }; ec.burnCand = 0;
      evs.push({ t: 'burn_start', D, steps: TUNING.BURN.map(f => Math.round(D * f)), restart });
    }
    ec.bearHand = false;
    if (ec.bearCD > 0) { ec.bearCD--; if (ec.bearCD <= 0) ec.bearReady = (ec.lead === 'bear'); }
    if (ec.salmonCD > 0) { ec.salmonCD--; if (ec.salmonCD <= 0) ec.salmonReady = (ec.lead === 'salmon'); }
    state.enemies.forEach(e => { if (e._g) { e._g.hitClear = false; e._g.skipTick = false; } if (e._d) e._d.counterHand = false; if (e._h) e._h.hitClear = false; e._rescHand = false; });
    return evs;
  }
  function enemyPhase(state) {
    const evs = [];
    actOrder(state).forEach(i => { enemyAct(state, i).forEach(x => evs.push(x)); });
    endEnemyPhase(state).forEach(x => evs.push(x));
    return evs;
  }

  // ───────── C4 afterBlock:玩家每放一塊後的固定順序 ─────────
  //   ①清除結算(呼叫端先做完:resolveVictims/damageEnemy/回血)→ ②賊鴨當下反擊(+補標)→ ③電擊 → ④餘火 tick → ⑤死亡判定
  //   同一塊把最後一隻怪清掉=直接勝利,不結算待燒餘火(burn_cancel)。
  const hooks = { duck: null, shock: null };   // 外掛點(預設不用):在內建賊鴨反擊/電擊之後再呼叫 (state)=>events
  function afterBlock(state) {
    const ec = state.ec, evs = [];
    const alive = state.enemies.some(e => !e.dead && e.hp > 0);
    if (!alive) { if (ec.burn) { evs.push({ t: 'burn_cancel', reason: 'victory' }); ec.burn = null; } return evs; }
    syncCores(state).forEach(x => evs.push(x));   // 寶玉核心:格子被清掉(任何原因,含主動技)= 敲碎
    if (!ec.dead) _duckAfterBlock(state, evs);
    _jewelAfterBlock(state, evs);   // 待放的核心每放一塊檢查一次有沒有合適空位
    if (hooks.duck) (hooks.duck(state) || []).forEach(x => evs.push(x));
    _shockAfterBlock(state, evs);
    if (hooks.shock) (hooks.shock(state) || []).forEach(x => evs.push(x));
    if (ec.burn && !ec.dead) {
      const b = ec.burn, raw = Math.round(b.D * TUNING.BURN[b.idx]);
      const r = damagePlayer(state, raw, { kind: 'burn' });
      evs.push({ t: 'burn_tick', idx: b.idx, raw, dealt: r.dealt });
      r.ev.forEach(x => evs.push(x));
      b.idx++; if (b.idx >= TUNING.BURN.length) ec.burn = null;
    }
    return evs;   // ⑤死亡判定:damagePlayer 已發 death 並設 ec.dead;呼叫端以 state.playerHP<=0 / ec.dead 收尾
  }

  // 呼叫端輔助:最急且可中止的哥布林(給 sim 的 INTR policy 與遊戲提示用)。need=還要打幾下才中止;回傳 enemy 或 null。
  function urgentGob(state, slack, ignoreHitClear) {   // ignoreHitClear=true:主動技找目標(主動技命中另算 1 下,不受本手已被清除打中的限制)
    slack = (slack == null) ? 1 : slack; let best = null, bs = 1e9;
    state.enemies.forEach(e => { const g = e._g; if (!g || e.dead || e.hp <= 0 || g.defused || !inWindow(e) || (g.hitClear && !ignoreHitClear)) return;   // 🆕v1.5.0 窗口外打了無效→不當目標
      const need = (g.rule === 4) ? g.left : 1, s = e.timer - need;
      if (s <= slack && (s < bs || (s === bs && best && e.atk > best.atk))) { best = e; bs = s; } });
    return best;
  }

  return { TUNING, inWindow, applyEnv, bind, classify, classifyDuck, classifyIron, classifyRock, classifyHealer, classifyMetal, classifyMoney, classifyJewel, syncCores, coreCells, coreShield: _jewelShield, applyClear, urgentCast, rollCD, initMech, initState, damagePlayer, damageEnemy, resolveVictims, delayEnemy,
    enemyAct, endEnemyPhase, enemyPhase, afterBlock, urgentGob, hooks, actOrder, useStored, markedCells, kFor, nextHitDamage, isLethal };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = EnemyCore; }
