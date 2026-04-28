#!/usr/bin/env node
// One-off: replace the intro slides in public/data/slides.json with a 25-slide
// structure that, for each of the 5 evidence types, walks through:
//   1. 従来の発表 (image only)
//   2. 従来の問題点 (text card)
//   3. AI-EBM 先生の発表 (image only)
//   4. 違い (comparison)
// All narration is written as a 初心者 × EBM先生 dialogue, drawing on the
// Core GRADE 1〜6 / GRADE Handbook (Japanese v2) materials.
//
// After running this, run scripts/build-slides.mjs to regenerate S1〜S106.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_JSON = path.resolve(
  __dirname,
  "..",
  "public",
  "data",
  "slides.json"
);

const SECTION = "0. 導入：AI-EBM先生に学ぶ";

/** Build a dialogue narration string from an array of {speaker, text} */
function dialogue(turns) {
  return turns
    .map((t) => `${t.speaker}: ${t.text.replace(/\n/g, "\n")}`)
    .join("\n\n");
}

// ---------- per-category content ----------

function fourSlideSet(c) {
  return [
    {
      id: `N_${c.key}_traditional`,
      section: SECTION,
      title: `${c.label} ① 従来の発表`,
      visual: {
        type: "image",
        data: {
          src: c.leftImg,
          alt: `従来の${c.label}発表スライド`,
          caption: c.traditional,
        },
      },
      narration: c.traditionalDialogue,
      citationIds: c.citationIds,
    },
    {
      id: `N_${c.key}_problems`,
      section: SECTION,
      title: `${c.label} ② 従来の発表 — 問題点`,
      visual: {
        type: "card",
        data: {
          heading: "⚠ 何が足りないのか？",
          bullets: c.problems,
          accent: "warning",
        },
      },
      narration: c.problemsDialogue,
      citationIds: c.citationIds,
    },
    {
      id: `N_${c.key}_aiebm`,
      section: SECTION,
      title: `${c.label} ③ AI-EBM 先生の発表`,
      visual: {
        type: "image",
        data: {
          src: c.rightImg,
          alt: `AI-EBM 先生による ${c.label} GRADE-based 発表スライド`,
          caption: c.aiEbm,
        },
      },
      narration: c.aiEbmDialogue,
      citationIds: c.citationIds,
    },
    {
      id: `N_${c.key}_diff`,
      section: SECTION,
      title: `${c.label} ④ 何が違うのか？`,
      visual: {
        type: "comparison",
        data: {
          leftHeader: "従来の発表",
          rightHeader: "AI-EBM 先生（GRADE）",
          rows: c.differences,
        },
      },
      narration: c.diffDialogue,
      citationIds: c.citationIds,
    },
  ];
}

const categories = [
  // ===================== 基礎研究 =====================
  {
    key: "basic",
    label: "基礎研究",
    leftImg: "/images/intro/basic.jpg",
    rightImg: "/images/intro/basic-g.jpg",
    traditional: "「化合物 X はマウスの GABA 放出を選択的に抑制 → ヒトに効く！」",
    aiEbm: "「化合物 X が GABA 放出を抑制 (マウス) — ヒト有効性は未検証、確実性=とても低い」",
    problems: [
      "**動物・細胞 → ヒト** の外挿は飛躍ではないか？",
      "用量・投与経路は**ヒトの臨床で実現可能**か？",
      "毒性・副作用は基礎研究の段階では評価困難",
      "GRADE の**非直接性 (indirectness)** で大きくダウングレードされる",
      "「メカニズムが分かった」と「臨床で効く」は別物",
    ],
    differences: [
      { left: "動物実験結果を直接外挿", right: "**ヒト有効性は未検証**と明示" },
      { left: "「効果あり！」と断定", right: "**「メカニズムは示唆」**にとどめる" },
      { left: "副作用の議論浅い", right: "**ヒトでの安全性は別途必要**と明示" },
      { left: "非直接性を考慮しない", right: "**GRADE 非直接性で大きくダウングレード**" },
      { left: "メカニズム = 効果と混同", right: "**仮説と臨床効果を区別**" },
    ],
    citationIds: ["coreGRADE5", "gradeHandbook"],
    traditionalDialogue: dialogue([
      {
        speaker: "初心者",
        text: "先生、これ面白そうな基礎研究ですね。化合物 X がマウスの GABA 放出を抑える、と。すごい発見では？",
      },
      {
        speaker: "EBM先生",
        text: "確かに**メカニズム解明**としては価値があります。ただ落ち着いて、「これでヒトに使える」と発表者が言ったらどう感じますか？",
      },
      {
        speaker: "初心者",
        text: "うーん…マウスとヒトは違うから、ちょっと飛躍ですかね？",
      },
      {
        speaker: "EBM先生",
        text: "そう、その違和感が大事です。GRADE では研究の対象や設定がリサーチクエスチョンと食い違うことを**非直接性 (indirectness)** と呼びます。基礎研究の結果をヒトに当てはめるのは、典型的な非直接性の例です。",
      },
    ]),
    problemsDialogue: dialogue([
      {
        speaker: "初心者",
        text: "つまり、基礎研究の結果は何を示せて、何を示せないんですか？",
      },
      {
        speaker: "EBM先生",
        text: "示せるのは **「メカニズムの仮説」「シグナル」**。示せないのは **「ヒトの臨床アウトカムへの効果」「安全性」「最適な用量」** です。",
      },
      {
        speaker: "初心者",
        text: "なるほど。じゃあ基礎研究を引用して「ヒトに効く」と発表するのは…",
      },
      {
        speaker: "EBM先生",
        text: "**非直接性を見落としています**。Core GRADE 5 (Indirectness) では、対象・介入・アウトカム・比較の4要素のずれが大きいほど確実性は下がる、とされています。動物実験はその全部がずれている可能性が高いんです。",
      },
    ]),
    aiEbmDialogue: dialogue([
      {
        speaker: "初心者",
        text: "では AI-EBM 先生だったら、同じ基礎研究をどう発表しますか？",
      },
      {
        speaker: "EBM先生",
        text: "まず、**研究タイプを率直に開示** します。「これは仮説段階のエビデンス」「ヒトでの有効性は未検証」と最初に明言する。",
      },
      {
        speaker: "初心者",
        text: "GRADE の確実性はどう判定するんですか？",
      },
      {
        speaker: "EBM先生",
        text: "観察研究は通常「低」スタートですが、ヒト以外の研究はさらに**非直接性で大きくダウングレード**して「とても低い (Very low)」と判定するのが一般的です。AI-EBM 先生はその判定理由を脚注に書きます。",
      },
      {
        speaker: "初心者",
        text: "「結果が良いから論文として発表」ではないんですね。",
      },
      {
        speaker: "EBM先生",
        text: "発表は構わない。しかし**結論を「ヒトの臨床に直結」と書かない**。それが AI-EBM 先生のスタイルです。",
      },
    ]),
    diffDialogue: dialogue([
      {
        speaker: "初心者",
        text: "基礎研究の発表で、従来 vs AI-EBM 先生の本質的な違いは？",
      },
      {
        speaker: "EBM先生",
        text: "**段階を区別する**ことです。基礎研究は仮説生成、RCT は効果検証、メタ分析は総合判断 — それぞれ役割が違う。AI-EBM 先生はその段階を率直に伝えます。",
      },
      {
        speaker: "初心者",
        text: "GRADE 的にも「メカニズムが分かれば効くはず」は通用しないんですね。",
      },
      {
        speaker: "EBM先生",
        text: "通用しません。Core GRADE 5 では、メカニズム情報は推奨を支持する「補助的情報」にしかならないと明確にされています。基礎研究は重要ですが、**臨床効果の根拠としては独立で立てない**んです。",
      },
    ]),
  },

  // ===================== RCT =====================
  {
    key: "rct",
    label: "RCT（ランダム化比較試験）",
    leftImg: "/images/intro/rct.jpg",
    rightImg: "/images/intro/rct-g.jpg",
    traditional: "「X薬は対照群と比較し PFS を有意に延長 — 標準治療となるべき」",
    aiEbm: "「X薬の臨床的価値: 体系的評価と推奨 — メタ分析・GRADE・推奨の方向と強さ」",
    problems: [
      "**1つの RCT** だけで判断してよいか？反対する研究は本当に存在しないか？",
      "RCT 自体に**バイアス**はないか？（ランダム化、盲検化、脱落、追跡期間…）",
      "**患者にとって重要なアウトカム**が評価されているか？（PFS は代替指標。OS・QOL は？）",
      "効果（益）だけで、**害**はどう評価されたか？",
      "コスト・**患者の価値観**・実行可能性は考慮されているか？",
    ],
    differences: [
      { left: "**単一の RCT**", right: "**エビデンス総体**（SR + メタ分析）" },
      { left: "確実性に言及なし", right: "**GRADE で 5 要因を体系的に評価**" },
      { left: "効果（PFS）のみ", right: "**益と害の両方** + 患者重要アウトカム" },
      { left: "価値観に言及なし", right: "**患者価値観・意向** を組み込み" },
      { left: "「標準治療となるべき」と断定", right: "**方向と強さ** を明示（条件付き提案）" },
      { left: "講師の主観", right: "**再現可能なプロセス**" },
    ],
    citationIds: ["coreGRADE1", "coreGRADE4", "robustRCT", "usersGuides2015"],
    traditionalDialogue: dialogue([
      {
        speaker: "初心者",
        text: "「X薬は HR 0.65 で PFS が有意に延長、P<0.001、結論: 標準治療となるべき」 — これ、すごく説得力ありそうですが…",
      },
      {
        speaker: "EBM先生",
        text: "これがまさに**従来型の RCT 発表**です。よく見かけますね。けれど、ここで一旦立ち止まって考えましょう。**この発表だけで臨床に使ってよいか？**",
      },
      {
        speaker: "初心者",
        text: "ええ…他に研究がないかは？バイアスは？害は？と、いろいろ確認したくなりますね。",
      },
      {
        speaker: "EBM先生",
        text: "完璧です。EBM の3原則の1つ目は「**最適な臨床決断には入手可能な最良のエビデンス、理想的にはシステマティックレビューが必要**」(Users' Guides 2015)。1つの RCT は、SR の中の1点にすぎません。",
      },
    ]),
    problemsDialogue: dialogue([
      {
        speaker: "初心者",
        text: "従来型の RCT 発表に欠けている点を整理してください。",
      },
      {
        speaker: "EBM先生",
        text: "5 つあります。\n**① 単一研究**: 反対する研究があるかもしれない。SR で確認が必要。\n**② バイアス評価不足**: ROBUST-RCT のようなツールでランダム化・盲検化・脱落・追跡を体系的に評価したか?\n**③ アウトカム選択**: PFS は代替指標。本当に患者に重要なのは OS・QOL・有害事象。",
      },
      {
        speaker: "EBM先生",
        text: "**④ 害の評価不足**: 益だけでなく、Grade 3 以上の有害事象や治療中止率まで提示したか?\n**⑤ 価値観・コスト**: 同じ効果でも、患者によって受け入れられるかは違う。コスト・実行可能性は?",
      },
      {
        speaker: "初心者",
        text: "「有意差あり」って言われると、つい全部スキップしてしまいそうです。",
      },
      {
        speaker: "EBM先生",
        text: "そこが落とし穴です。**「効果あり」と「効果がどれくらい確かか」は別問題**です。Core GRADE 1 では、確実性をエビデンスから別途評価することが核心とされています。",
      },
    ]),
    aiEbmDialogue: dialogue([
      {
        speaker: "初心者",
        text: "AI-EBM 先生はどう発表するんですか？",
      },
      {
        speaker: "EBM先生",
        text: "**4本のRCTを集めたメタ分析** (HR 0.85, 95%CI 0.72–1.01) を提示します。点推定で 15% 効果ですが、信頼区間が「効果なし」をまたいでいる。",
      },
      {
        speaker: "初心者",
        text: "「またいでいる」のは問題なんですか？",
      },
      {
        speaker: "EBM先生",
        text: "Core GRADE 2 (Imprecision) では、CI が**MID (最小重要差) や効果なし** をまたぐと不精確さでダウングレードします。さらに有害事象の確実性も別途評価し、結果として **「条件付き (弱い) 推奨」** になります。",
      },
      {
        speaker: "初心者",
        text: "弱い推奨って、否定的な意味じゃないんですね。",
      },
      {
        speaker: "EBM先生",
        text: "違います。**「益と害のバランスが患者の価値観次第で変わる」**という意味です。情報提供型の推奨で、共有意思決定 (SDM) を促す形です。",
      },
    ]),
    diffDialogue: dialogue([
      {
        speaker: "初心者",
        text: "RCT 発表における従来 vs AI-EBM 先生の決定的な違いをもう一度整理を。",
      },
      {
        speaker: "EBM先生",
        text: "**6 つの軸**で違います。\n①エビデンスの扱い (単一→総体)、\n②確実性の評価 (なし→GRADE 5要因)、\n③アウトカム (益のみ→益と害)、\n④価値観 (なし→組み込み)、\n⑤推奨の構造 (断定→方向と強さ)、\n⑥透明性 (主観→再現可能プロセス)。",
      },
      {
        speaker: "初心者",
        text: "AI-EBM 先生は単に丁寧なだけじゃなくて、**EBM の原則そのもの**を実装しているんですね。",
      },
      {
        speaker: "EBM先生",
        text: "その通りです。EBM の原則 (Sackett 1996, Users' Guides 2015) が「単一研究に飛びつかない」「不確実性を明示する」「患者価値観を組み込む」を要求しているから、自然とこのスタイルになるのです。",
      },
    ]),
  },

  // ===================== SR =====================
  {
    key: "sr",
    label: "システマティックレビュー",
    leftImg: "/images/intro/sr.jpg",
    rightImg: "/images/intro/sr-g.jpg",
    traditional: "「6本の研究で X 薬の効果が確認された — エビデンスは十分」",
    aiEbm: "「メタ分析 HR 0.85 (95%CI 0.72–1.01)、確実性=中、不精確さでダウングレード」",
    problems: [
      "対象研究の**選定基準**は明示されているか？（適格基準、検索戦略）",
      "個々の研究の**バイアス評価**は行われたか？（ROBUST-RCT, RoB 2）",
      "結果の**非一貫性** (heterogeneity) は評価されたか？",
      "効果推定値の**確実性**（GRADE）は判定されたか？",
      "「効果あり」と「効果がどれくらい確かか」は別物 — 区別されているか？",
    ],
    differences: [
      { left: "研究を集計して「効果あり」", right: "**確実性付きで効果推定値を提示**" },
      { left: "バイアス評価に言及なし or 軽い", right: "**ROBUST-RCT 等で個別評価**" },
      { left: "非一貫性は表面的", right: "**点推定・信頼区間・I² で多面評価**" },
      { left: "確実性に言及なし", right: "**GRADE 5要因を全部適用**" },
      { left: "「とにかく効果あり」", right: "**「どれくらい確かか」を区別**" },
    ],
    citationIds: [
      "coreGRADE1",
      "coreGRADE2",
      "coreGRADE3",
      "coreGRADE4",
      "gradeHandbook",
    ],
    traditionalDialogue: dialogue([
      {
        speaker: "初心者",
        text: "SR の発表で「6本の研究で確認されました」と言われると、すごく信頼できる気がします。",
      },
      {
        speaker: "EBM先生",
        text: "数を集めるだけで信頼性が保証されるわけではないんです。**SR の質と、SR が出す結果の確実性は別問題**です。",
      },
      {
        speaker: "初心者",
        text: "別問題ですか？",
      },
      {
        speaker: "EBM先生",
        text: "そうです。Core GRADE 1 で強調されるポイントです。質の高い SR でも、含まれる研究が小規模だったり結果がばらついていれば、効果推定値の確実性は「とても低い」になります。",
      },
    ]),
    problemsDialogue: dialogue([
      {
        speaker: "初心者",
        text: "従来型 SR 発表で確認すべきポイントは何ですか？",
      },
      {
        speaker: "EBM先生",
        text: "**5 点**。\n**① 適格基準と検索戦略**: PRISMA に準拠? 検索期間と DB は?\n**② 個別研究のバイアス**: ROBUST-RCT/RoB 2 の判定は?\n**③ 非一貫性**: 点推定・CI・I² で判断したか?",
      },
      {
        speaker: "EBM先生",
        text: "**④ 確実性 (GRADE)**: 5要因で総合判定したか?\n**⑤ 「効果あり」と「確実性」の区別**: 「効果あり、ただし確実性は低い」が正しい結論。",
      },
      {
        speaker: "初心者",
        text: "I² って何ですか?",
      },
      {
        speaker: "EBM先生",
        text: "研究間のばらつきを示す統計量です。ただし I² だけ見ても駄目で、Core GRADE 3 では**点推定値の重なり・CI の重なり・I²** を多面的に評価します。0% でも非一貫性があることもあれば、80% でも臨床的には問題ない場合もあります。",
      },
    ]),
    aiEbmDialogue: dialogue([
      {
        speaker: "初心者",
        text: "AI-EBM 先生は SR をどう発表しますか?",
      },
      {
        speaker: "EBM先生",
        text: "**メタ分析の結果に必ず確実性をつけます**。「HR 0.85 (95%CI 0.72–1.01), 確実性=中、不精確さでダウングレード」のように。",
      },
      {
        speaker: "初心者",
        text: "数字だけじゃなくて、その「中」の理由まで?",
      },
      {
        speaker: "EBM先生",
        text: "そうです。GRADE 5要因のどれでダウングレードしたか、脚注やエビデンスプロファイルに明示します。Core GRADE 6 (SoF) では、結果を SoF表で簡潔に提示する形が推奨されています。",
      },
      {
        speaker: "初心者",
        text: "「効果がどれくらい確かか」を読者に手渡すんですね。",
      },
      {
        speaker: "EBM先生",
        text: "それが GRADE の真髄です。読者は確実性に応じた判断ができるようになります。",
      },
    ]),
    diffDialogue: dialogue([
      {
        speaker: "初心者",
        text: "SR 発表における核心的な違いは?",
      },
      {
        speaker: "EBM先生",
        text: "**「効果がある/ない」と「効果がどれくらい確かか」を区別する**ことです。従来型は前者だけ。AI-EBM 先生は両方を提示します。",
      },
      {
        speaker: "初心者",
        text: "確実性の判定は主観的になりませんか?",
      },
      {
        speaker: "EBM先生",
        text: "5要因 (バイアス・非一貫性・非直接性・不精確さ・出版バイアス) を Core GRADE 1〜6 のチェックリストで評価します。**完全な客観ではないが、再現可能で透明**。これが GRADE の強みです。",
      },
    ]),
  },

  // ===================== 診療ガイドライン =====================
  {
    key: "cpg",
    label: "診療ガイドライン",
    leftImg: "/images/intro/cpg.jpg",
    rightImg: "/images/intro/cpg-g.jpg",
    traditional: "「専門家委員会の合意により X 治療を推奨する」",
    aiEbm: "「SR ベースの推奨 + 益と害 + 確実性 + 推奨の強さ + 価値観 + 透明な合意プロセス」",
    problems: [
      "推奨の根拠となった**システマティックレビュー**は提示されているか？",
      "**益と害の評価**は明示されているか？",
      "推奨の**強さ**（強い／条件付き）は示されているか？",
      "エビデンスの**確実性**は示されているか？",
      "**患者の価値観**・コスト・実行可能性まで考慮されているか？",
      "誰が推奨し、利益相反はどう管理されたか？",
    ],
    differences: [
      { left: "「専門家の合意」", right: "**SR + EtD フレームワーク**" },
      { left: "益のみ言及", right: "**益と害をバランスよく評価**" },
      { left: "推奨の強さ不明", right: "**強い／条件付きを明示**" },
      { left: "確実性に言及なし", right: "**GRADE で確実性を判定**" },
      { left: "価値観に言及なし", right: "**患者価値観を組み込み**" },
      { left: "プロセス不透明", right: "**透明・再現可能なプロセス**" },
    ],
    citationIds: ["iom2011", "etdSchunemann2016", "guyatt2023sixQuestions", "gradeHandbook"],
    traditionalDialogue: dialogue([
      {
        speaker: "初心者",
        text: "「専門家委員会で合意された推奨」って、信頼してよさそうですよね？",
      },
      {
        speaker: "EBM先生",
        text: "実は注意が必要です。**合意のプロセスが不透明**だと信頼性が下がります。誰が、どのエビデンスに基づいて、どんな益と害を比べて決めたのか — それが見えないと、結論だけ聞かされても判断できません。",
      },
      {
        speaker: "初心者",
        text: "じゃあ「信頼できる診療ガイドライン」って、どう定義されているんですか?",
      },
      {
        speaker: "EBM先生",
        text: "IOM 2011 が標準的な定義を出しています。**「SR と益と害の評価に基づいて、患者ケアを最適化する推奨を含む記述」**。これに従わないものは、信頼できないとされます。",
      },
    ]),
    problemsDialogue: dialogue([
      {
        speaker: "初心者",
        text: "従来型ガイドラインで欠けやすい項目は?",
      },
      {
        speaker: "EBM先生",
        text: "Guyatt 2023 の **6つの質問** が良いチェックリストです。\n**Q1: 推奨は明確か?** 何をすべきか分かるか。\n**Q2: 代替案を考慮したか?**\n**Q3: 患者にとって重要なアウトカムを全て考慮したか?**",
      },
      {
        speaker: "EBM先生",
        text: "**Q4: 最新の SR に基づいているか?**\n**Q5: 推奨の強さはエビデンスの確実性と整合しているか?** 不確実なエビデンスから強い推奨を出していないか。\n**Q6: 利益相反 (COI) は適切に管理されたか?**",
      },
      {
        speaker: "初心者",
        text: "Q5 が特に重要そうですね。",
      },
      {
        speaker: "EBM先生",
        text: "Guyatt 自身が最も警戒しているポイントです。**確実性が低いのに「全員に強く推奨」**となっていたら、パネルの信念や COI が紛れ込んでいる可能性があります。",
      },
    ]),
    aiEbmDialogue: dialogue([
      {
        speaker: "初心者",
        text: "AI-EBM 先生 (GRADE準拠) のガイドラインは何が違いますか?",
      },
      {
        speaker: "EBM先生",
        text: "**EtD (Evidence-to-Decision) フレームワーク**を使います。Schünemann 2016 が標準化したもので、推奨を作る際に以下を全て構造化して評価します:\n• 問題の重要性\n• 益と害のバランス\n• エビデンスの確実性",
      },
      {
        speaker: "EBM先生",
        text: "• 患者の価値観・好み\n• リソース (コスト)\n• 公平性\n• 容認性\n• 実行可能性",
      },
      {
        speaker: "初心者",
        text: "全部を表にして見せるんですね。",
      },
      {
        speaker: "EBM先生",
        text: "そうです。**全パネリストが同じ枠組みで議論し、結論への道筋が外部から検証可能**。これが「信頼できるガイドライン」の本質です。",
      },
    ]),
    diffDialogue: dialogue([
      {
        speaker: "初心者",
        text: "ガイドラインで AI-EBM 先生スタイルがいちばん輝く理由は?",
      },
      {
        speaker: "EBM先生",
        text: "**ガイドラインは政策**だからです。多くの臨床現場の判断を左右する。だから「専門家の合意」で済ませず、SR + EtD + 確実性 + 推奨の強さを構造化して開示する責任があります。",
      },
      {
        speaker: "初心者",
        text: "信頼できるか見抜くには、Guyatt 2023 の 6質問でチェックすればいいんですね。",
      },
      {
        speaker: "EBM先生",
        text: "正解です。臨床医側のチェックツールとして覚えておくと、目の前のガイドラインをすぐ評価できます。",
      },
    ]),
  },

  // ===================== 観察研究 =====================
  {
    key: "obs",
    label: "観察研究",
    leftImg: "/images/intro/observational.jpg",
    rightImg: "/images/intro/observational-g.jpg",
    traditional: "「コホート研究で X が Y のリスクを下げると示された」",
    aiEbm: "「観察研究のメタ分析、確実性=低、用量反応勾配あり → 中にアップグレード」",
    problems: [
      "**交絡因子**は十分に調整されたか？",
      "**選択バイアス**は評価されたか？",
      "因果関係の方向は適切に検証されたか？（逆因果の可能性）",
      "アウトカム測定に**偏り**はないか？",
      "GRADE では観察研究は「**低い確実性から開始**」する原則を適用しているか？",
    ],
    differences: [
      { left: "「効果あり」と直接結論", right: "**確実性を「低」から開始**" },
      { left: "交絡因子の議論浅い", right: "**多変量調整・感度分析を明示**" },
      { left: "因果と相関を混同", right: "**因果推論の前提を検証**" },
      { left: "RCT と同列に扱う", right: "**研究デザイン階層を尊重**" },
      { left: "アップグレード基準なし", right: "**GRADE のアップグレード要因を適用**" },
    ],
    citationIds: ["coreGRADE1", "coreGRADE4", "gradeHandbook"],
    traditionalDialogue: dialogue([
      {
        speaker: "初心者",
        text: "コホート研究で「リスクが下がる」って結果は信頼してよさそうですが…",
      },
      {
        speaker: "EBM先生",
        text: "観察研究は**因果関係の証明には弱い**んです。RCT と違って、患者群がランダム割付されていない。だから「治療を受けた人」と「受けなかった人」の間に、別の違いが隠れている可能性があります。",
      },
      {
        speaker: "初心者",
        text: "それが「交絡因子」ですね。",
      },
      {
        speaker: "EBM先生",
        text: "正解です。GRADE では観察研究を「**確実性=低**」からスタートするのが原則 (Core GRADE 1)。RCT は「高」、観察研究は「低」。これは研究デザインの階層に基づきます。",
      },
    ]),
    problemsDialogue: dialogue([
      {
        speaker: "初心者",
        text: "従来型観察研究の発表で見落とされやすい問題は?",
      },
      {
        speaker: "EBM先生",
        text: "**5 点**。\n**① 交絡**: 多変量調整は十分? 残余交絡の可能性は?\n**② 選択バイアス**: コホートに入る/外れる基準は?\n**③ 因果の方向**: 逆因果 (アウトカム→曝露) の可能性は?",
      },
      {
        speaker: "EBM先生",
        text: "**④ 測定バイアス**: アウトカムの測定者は曝露を知っているか?\n**⑤ GRADE 階層**: 観察研究は「低」スタート、を適用しているか?",
      },
      {
        speaker: "初心者",
        text: "「相関と因果の区別」っていう古典ですね。",
      },
      {
        speaker: "EBM先生",
        text: "そうです。Hill の基準を踏まえつつ、GRADE の枠組みでは Core GRADE 4 (Risk of Bias) で観察研究のバイアスを ROBINS-I などで評価し、確実性を統合します。",
      },
    ]),
    aiEbmDialogue: dialogue([
      {
        speaker: "初心者",
        text: "AI-EBM 先生は観察研究をどう扱うんですか?",
      },
      {
        speaker: "EBM先生",
        text: "「**確実性を低からスタート**」と明示し、その上で**アップグレード要因**を吟味します。GRADE には観察研究を引き上げる 3 要因があるんです:\n**① 大きな効果** (RR 2倍以上など)\n**② 用量反応勾配**\n**③ 交絡が結果を弱める方向** (差が出にくい状況なのに差が出ている)",
      },
      {
        speaker: "初心者",
        text: "アップグレードもできるんですね!",
      },
      {
        speaker: "EBM先生",
        text: "可能です。喫煙と肺がんのように、観察研究でも「中」や「高」になり得ます。ただし**根拠を明示**することが必須です。AI-EBM 先生は脚注にアップグレード理由を必ず書きます。",
      },
    ]),
    diffDialogue: dialogue([
      {
        speaker: "初心者",
        text: "観察研究で AI-EBM 先生のスタイルが効くポイントは?",
      },
      {
        speaker: "EBM先生",
        text: "**「研究デザインの階層を尊重しつつ、根拠があれば柔軟にアップグレード」**ができることです。RCT がない領域 (希少疾患・倫理的に試験不可能) でも、観察研究を適切に評価して臨床判断につなげられます。",
      },
      {
        speaker: "初心者",
        text: "「観察研究=信頼できない」と単純に切り捨てない、ということですね。",
      },
      {
        speaker: "EBM先生",
        text: "そうです。**慎重に、しかし無視せず**。GRADE の柔軟性が活きる領域です。",
      },
    ]),
  },
];

// ---------- intro slides ----------

const newIntro = [
  {
    id: "N1",
    section: SECTION,
    title: "想像してみてください — こんな講演に出会ったら？",
    visual: {
      type: "card",
      data: {
        heading: "演題：「X薬の革新的な臨床効果」",
        bullets: [
          "最新の Phase III RCT (Yuasa et al., 2024) にて、X薬は対照群と比較し**有意な無増悪生存期間（PFS）の延長**を認めた",
          "**HR 0.65** (95%CI 0.52–0.81), **P < 0.001**",
          "副作用は管理可能、QOL も維持された",
          "**結論：X薬は新たな標準治療となるべきである**",
        ],
        accent: "warning",
      },
    },
    narration: dialogue([
      {
        speaker: "初心者",
        text: "先生、これすごいスライドじゃないですか? P<0.001 で有意差。X薬すぐ使うべきですよね?",
      },
      {
        speaker: "EBM先生",
        text: "ちょっと待ってください。「**有意差あり**」と「**臨床に使うべき**」は同じではないんです。",
      },
      {
        speaker: "初心者",
        text: "違うんですか? 有意差あるなら効果あるってことでは?",
      },
      {
        speaker: "EBM先生",
        text: "効果が「ある」と「効果が**どれくらい確か**か」は別問題。それに、効果があっても**害**や**コスト**、**患者の価値観**を考えないと、本当に使うべきか判断できません。これがまさに **EBM・GRADE の問題意識** です。",
      },
      {
        speaker: "初心者",
        text: "「すぐ使う」と言ってしまった私、まだまだですね…",
      },
      {
        speaker: "EBM先生",
        text: "気づけたなら大丈夫。これから一緒に、何が必要なのか順番に見ていきましょう。",
      },
    ]),
    speakerNotes: "聴衆に問いかけて 5〜10 秒、考える時間をとる。",
    citationIds: ["sackett1996", "usersGuides2015", "coreGRADE1"],
  },
  {
    id: "N2",
    section: SECTION,
    title: "「効果あり」と即断してよいか — 6つの確認",
    visual: {
      type: "table",
      data: {
        headers: ["#", "確認すべき問い"],
        rows: [
          ["1", "この**1つのRCTだけ**で判断してよいか？"],
          ["2", "この結果を**支持しない／反対する研究**は本当に存在しないか？"],
          ["3", "このRCT自体に**バイアス**はないか？（ランダム化、盲検化、脱落、追跡期間…）"],
          ["4", "**患者にとって重要なアウトカム**が評価されているか？（PFSは代替指標。OS、QOLは？）"],
          ["5", "効果（益）だけで、**害**はどう評価されたか？"],
          ["6", "コスト・**患者の価値観**・実行可能性は考慮されているか？"],
        ],
      },
    },
    narration: dialogue([
      {
        speaker: "初心者",
        text: "6つも確認するんですね。多くないですか…?",
      },
      {
        speaker: "EBM先生",
        text: "実は EBM の 3 原則から自然に導かれるんです。**Users' Guides 第3版 (2015)** ではこう書かれています:\n①最良のエビデンスは SR\n②エビデンスの確実性を評価\n③エビデンスだけでは臨床決断はできない",
      },
      {
        speaker: "初心者",
        text: "①が「複数研究で確認」、②が「バイアス・確実性」、③が「価値観・コスト」につながるんですね。",
      },
      {
        speaker: "EBM先生",
        text: "そう、つながっています。これから 5 つの研究タイプ (RCT、SR、診療ガイドライン、観察研究、基礎研究) について、**1 つずつ 4 スライド**で対比していきます。",
      },
      {
        speaker: "初心者",
        text: "4 スライドの構成は?",
      },
      {
        speaker: "EBM先生",
        text: "①従来の発表 → ②問題点 → ③AI-EBM 先生の発表 → ④何が違うか。物語のように進みます。",
      },
    ]),
    citationIds: ["usersGuides2015", "coreGRADE1"],
  },
  {
    id: "N3",
    section: SECTION,
    title: "AI-EBM 先生とは",
    visual: {
      type: "card",
      data: {
        heading: "AI-EBM 先生 — 本セッション専用の架空キャラクター",
        bullets: [
          "EBM・GRADE アプローチの公開された原則を体現した教育用キャラクター",
          "実在の特定の人物を表すものではない",
          "「単一研究に飛びつかない」「不確実性を明示する」「患者価値観を組み込む」を体現",
          "次のスライドから、**5 つの研究タイプ × 4 スライド構成** で対比します",
          "各カテゴリは: ① 従来の発表 → ② 問題点 → ③ AI-EBM 先生の発表 → ④ 違い",
        ],
      },
    },
    narration: dialogue([
      {
        speaker: "初心者",
        text: "AI-EBM 先生って、誰なんですか?",
      },
      {
        speaker: "EBM先生",
        text: "**架空の教育用キャラクター**です。EBM や GRADE の公開原則を体現していますが、特定の実在人物ではありません。",
      },
      {
        speaker: "初心者",
        text: "なぜ「先生」を仮想で立てるんですか?",
      },
      {
        speaker: "EBM先生",
        text: "**理想形を可視化する**ため。EBM の原則をフルに体現すると発表はどう変わるか。それを「先生」のキャラクターで具体例として示すと分かりやすいんです。",
      },
      {
        speaker: "初心者",
        text: "なるほど、これから 5 つの研究タイプで対比するんですね。",
      },
      {
        speaker: "EBM先生",
        text: "そうです。基礎研究 → RCT → SR → 診療ガイドライン → 観察研究、の順で進みます。\n\n**注意:** N3 で必ず「架空のキャラクター」と明言しています。実在人物と結びつけないでください。",
      },
    ]),
    warnings: [
      "AI-EBM先生は架空の教育用キャラクター。実在の特定の人物を表すものではない",
    ],
    citationIds: ["coreGRADE1", "iom2011", "gradeHandbook"],
  },
  ...categories.flatMap(fourSlideSet),
  {
    id: "N_principles",
    section: SECTION,
    title: "ポイント：AI-EBM 先生に込められた EBM の核心",
    visual: {
      type: "list",
      data: {
        ordered: true,
        items: [
          {
            text: "**エビデンスは「点」ではなく「総体」で評価する**",
            subItems: [
              "1つの研究は絶対ではない",
              "系統的なレビューで、反対する研究まで含めて統合する",
            ],
          },
          {
            text: "**エビデンスの確実性を体系的に評価する**",
            subItems: [
              "「効果あり／なし」ではなく「どれくらい確かか」を評価",
              "GRADE アプローチが世界標準",
            ],
          },
          {
            text: "**エビデンスだけでは臨床決断はできない**",
            subItems: [
              "益と害のバランス、患者の価値観・意向、コスト、実行可能性まで考慮",
            ],
          },
          {
            text: "**プロセスは再現可能で透明であるべき**",
            subItems: [
              "個人の意見ではなく、構造化された方法で",
              "誰が再評価しても、同じ結論に近づける",
            ],
          },
        ],
      },
    },
    narration: dialogue([
      {
        speaker: "初心者",
        text: "5 つの研究タイプを通して見て、共通する AI-EBM 先生の本質は?",
      },
      {
        speaker: "EBM先生",
        text: "**4 つの原則**に集約されます。\n**①総体で評価**: 1 研究より SR。\n**②確実性を体系的に評価**: GRADE。\n**③エビデンスだけでは不十分**: 益と害、価値観、コスト。\n**④プロセスは透明・再現可能**: 個人の主観でなく構造化された方法。",
      },
      {
        speaker: "初心者",
        text: "全部 EBM の古典的原則 (Sackett 1996) から派生するんですね。",
      },
      {
        speaker: "EBM先生",
        text: "そうです。だから AI-EBM 先生は「特別な才能」ではなく、**EBM を真面目に実践しているだけ**。誰でも体現できるアプローチです。",
      },
    ]),
    citationIds: ["sackett1996", "usersGuides2015", "coreGRADE1", "gradeHandbook"],
  },
  {
    id: "N_roadmap",
    section: SECTION,
    title: "本日のロードマップ",
    visual: {
      type: "list",
      data: {
        ordered: true,
        items: [
          {
            text: "**EBM の本質** から、診療ガイドラインの定義を **「なぜ？」** から理解する（第1部）",
          },
          {
            text: "その理解の上で、診療ガイドラインの **作成プロセス** を学ぶ（第2部）",
          },
          {
            text: "推奨を決定する際の **深い考察** を共有する（第3部）",
          },
        ],
      },
    },
    narration: dialogue([
      {
        speaker: "初心者",
        text: "ここから本編なんですね。何を学んでいきますか?",
      },
      {
        speaker: "EBM先生",
        text: "3 部構成です。\n**第 1 部**: 診療ガイドラインの定義を「なぜ?」から理解。\n**第 2 部**: 作成プロセス。\n**第 3 部**: 推奨決定の深い考察。",
      },
      {
        speaker: "初心者",
        text: "「ふーん、そうなんだ」じゃなくて「**なるほど、だから!**」と理解できるように?",
      },
      {
        speaker: "EBM先生",
        text: "それが目標です。本編に進みましょう。",
      },
    ]),
    citationIds: ["sackett1996", "iom2011", "gradeHandbook"],
  },
];

// Renumber to N1, N2, ..., N25
const renumbered = newIntro.map((s, i) => ({ ...s, id: `N${i + 1}`, order: i + 1 }));

const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));
const otherSlides = (data.slides || []).filter((s) => !/^N/.test(s.id));
data.slides = [...renumbered, ...otherSlides];
data.meta.version = "0.5.0-step5-dialogue";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(
  `Rewrote ${renumbered.length} intro slides (with dialogue narration); preserved ${otherSlides.length} other slides`
);
