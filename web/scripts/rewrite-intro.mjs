#!/usr/bin/env node
// One-off: replace the intro slides in public/data/slides.json with a 25-slide
// structure that, for each of the 5 evidence types, walks through:
//   1. 従来の発表 (image only)        — just the traditional slide, big
//   2. 従来の問題点 (text card)       — calls out what's wrong
//   3. AI-EBM 先生の発表 (image only) — just the AI-EBM slide, big
//   4. 違い (comparison)              — what changed and why
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

// ---------- helpers for the 4-slide-per-category pattern ----------

/** category: { key, label, leftImg, rightImg, traditional, aiEbm, problems, differences, citationIds } */
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
      narration: c.traditionalNarration,
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
      narration: c.problemsNarration,
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
      narration: c.aiEbmNarration,
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
      narration: c.diffNarration,
      ...(c.citationIds ? { citationIds: c.citationIds } : {}),
    },
  ];
}

const categories = [
  {
    key: "rct",
    label: "RCT（ランダム化比較試験）",
    leftImg: "/images/intro/rct.jpg",
    rightImg: "/images/intro/rct-g.jpg",
    traditional: "「X薬は対照群と比較し PFS を有意に延長 — 標準治療となるべき」",
    traditionalNarration:
      "従来の RCT 発表スライドの典型例です。**1つの第III相 RCT** の結果を示し、HR・P値を挙げ、「効果あり」と断定しています。\n\nここで一旦、立ち止まって考えてみてください。**この発表だけで臨床に使ってよいか？**",
    problems: [
      "**1つの RCT** だけで判断してよいか？反対する研究は本当に存在しないか？",
      "RCT 自体に**バイアス**はないか？（ランダム化、盲検化、脱落、追跡期間…）",
      "**患者にとって重要なアウトカム**が評価されているか？（PFS は代替指標。OS・QOL は？）",
      "効果（益）だけで、**害**はどう評価されたか？",
      "コスト・**患者の価値観**・実行可能性は考慮されているか？",
      "「標準治療となるべき」と**断定**してよいか？",
    ],
    problemsNarration:
      "従来の発表に欠けているもの: **エビデンスの総体性、確実性の評価、害の検討、価値観、推奨の構造**。\n\n単一研究の有意な結果は、全体像のごく一部です。",
    aiEbm:
      "「X薬の臨床的価値: 体系的評価と推奨」 — メタ分析・GRADE・益と害・推奨の方向と強さ",
    aiEbmNarration:
      "AI-EBM 先生は、**4本の RCT を集めたメタ分析** (HR 0.85, 95%CI 0.72–1.01) を提示し、**GRADE で確実性を評価** (益=中、害=高)、**患者にとって重要なアウトカム** (OS・QOL・有害事象) を評価し、**条件付き (弱い) 推奨** を提示します。",
    differences: [
      { left: "**単一の RCT**", right: "**エビデンス総体**（SR + メタ分析）" },
      { left: "確実性に言及なし", right: "**GRADE で 5 要因を体系的に評価**" },
      { left: "効果（PFS）のみ", right: "**益と害の両方** + 患者重要アウトカム" },
      { left: "価値観に言及なし", right: "**患者価値観・意向** を組み込み" },
      { left: "「標準治療となるべき」と断定", right: "**方向と強さ** を明示（条件付き提案）" },
      { left: "講師の主観", right: "**再現可能なプロセス**" },
    ],
    diffNarration:
      "RCT 発表における従来 vs AI-EBM 先生の本質的な違いは 6 点。**EBM の原則そのものが「単一研究に飛びつかない」「不確実性を明示する」「患者価値観を組み込む」を要求している**のです。",
    citationIds: ["usersGuides2015", "coreGRADE1", "robustRCT"],
  },
  {
    key: "sr",
    label: "システマティックレビュー",
    leftImg: "/images/intro/sr.jpg",
    rightImg: "/images/intro/sr-g.jpg",
    traditional: "「6本の研究で X 薬の効果が確認された — エビデンスは十分」",
    traditionalNarration:
      "従来の SR 発表は、研究を集計して「効果あり」と結論する形式が多く見られます。**研究を集めただけでは確実性は保証されない**ことに注意が必要です。",
    problems: [
      "対象研究の**選定基準**は明示されているか？（適格基準、検索戦略）",
      "個々の研究の**バイアス評価**は行われたか？（ROBUST-RCT, RoB 2）",
      "結果の**非一貫性** (heterogeneity) は評価されたか？",
      "効果推定値の**確実性**（GRADE）は判定されたか？",
      "「効果あり」と「効果がどれくらい確かか」は別物 — 区別されているか？",
    ],
    problemsNarration:
      "**SR の質と、SR の中のメタ分析結果の確実性は別物** です。質の高い SR でも、含まれる研究のバイアスや非一貫性次第で、確実性は「とても低い」になることもあります。",
    aiEbm:
      "「メタ分析 HR 0.85 (95%CI 0.72–1.01)、確実性=中、不精確さでダウングレード」",
    aiEbmNarration:
      "AI-EBM 先生は、**メタ分析の結果に必ず「確実性」という紐をつけます**。研究の限界・非一貫性・非直接性・不精確さ・出版バイアスの 5 要因を体系的に評価し、結果の信頼性を明示します。",
    differences: [
      { left: "研究を集計して「効果あり」", right: "**確実性付きで効果推定値を提示**" },
      { left: "バイアス評価に言及なし or 軽い", right: "**ROBUST-RCT 等で個別評価**" },
      { left: "非一貫性は表面的", right: "**点推定・信頼区間・I² で多面評価**" },
      { left: "確実性に言及なし", right: "**GRADE 5要因を全部適用**" },
      { left: "「とにかく効果あり」", right: "**「どれくらい確かか」を区別**" },
    ],
    diffNarration:
      "SR 発表における違いは「効果がある/ない」と「効果がどれくらい確かか」を**区別している**かどうか。それが GRADE の真髄です。",
    citationIds: ["coreGRADE1", "coreGRADE2", "coreGRADE4"],
  },
  {
    key: "cpg",
    label: "診療ガイドライン",
    leftImg: "/images/intro/cpg.jpg",
    rightImg: "/images/intro/cpg-g.jpg",
    traditional: "「専門家委員会の合意により X 治療を推奨する」",
    traditionalNarration:
      "従来の診療ガイドライン発表では「**専門家の合意**」として推奨が示されることが多くありますが、**合意のプロセスが不透明**な場合は信頼性が下がります。",
    problems: [
      "推奨の根拠となった**システマティックレビュー**は提示されているか？",
      "**益と害の評価**は明示されているか？",
      "推奨の**強さ**（強い／条件付き）は示されているか？",
      "エビデンスの**確実性**は示されているか？",
      "**患者の価値観**・コスト・実行可能性まで考慮されているか？",
      "誰が推奨し、利益相反はどう管理されたか？",
    ],
    problemsNarration:
      "IOM (HMD) 2011 の定義: **「診療ガイドラインとは、SR と益と害の評価に基づいて、患者ケアを最適化する推奨を含む記述」**。これに従わないものは「信頼できない診療ガイドライン」となります。",
    aiEbm:
      "「SR ベースの推奨 + 益と害 + 確実性 + 推奨の強さ + 価値観 + 透明な合意プロセス」",
    aiEbmNarration:
      "AI-EBM 先生による診療ガイドラインは、**Evidence-to-Decision フレームワーク** に従い、SR・益と害・確実性・価値観・コスト・容認性・実行可能性をすべて構造化して提示し、推奨の方向と強さを明示します。",
    differences: [
      { left: "「専門家の合意」", right: "**SR + EtD フレームワーク**" },
      { left: "益のみ言及", right: "**益と害をバランスよく評価**" },
      { left: "推奨の強さ不明", right: "**強い／条件付きを明示**" },
      { left: "確実性に言及なし", right: "**GRADE で確実性を判定**" },
      { left: "価値観に言及なし", right: "**患者価値観を組み込み**" },
      { left: "プロセス不透明", right: "**透明・再現可能なプロセス**" },
    ],
    diffNarration:
      "診療ガイドラインこそ、AI-EBM 先生のスタイルが最も活きる領域です。患者ケアを最適化する「推奨」の根拠が、すべて構造化されて開示されることが本質です。",
    citationIds: ["iom2011", "coreGRADE1"],
  },
  {
    key: "obs",
    label: "観察研究",
    leftImg: "/images/intro/observational.jpg",
    rightImg: "/images/intro/observational-g.jpg",
    traditional: "「コホート研究で X が Y のリスクを下げると示された」",
    traditionalNarration:
      "観察研究は研究デザイン上、RCT より**確実性が低い**研究タイプです。それを直接「効果あり」と発表すると、交絡因子・選択バイアスを見落とします。",
    problems: [
      "**交絡因子**は十分に調整されたか？",
      "**選択バイアス**は評価されたか？",
      "因果関係の方向は適切に検証されたか？（逆因果の可能性）",
      "アウトカム測定に**偏り**はないか？",
      "GRADE では観察研究は「**低い確実性から開始**」する原則を適用しているか？",
    ],
    problemsNarration:
      "観察研究の最大の落とし穴は**因果関係**の解釈です。「相関」と「因果」を区別し、観察研究のエビデンスは慎重に解釈する必要があります。",
    aiEbm:
      "「観察研究のメタ分析、確実性=低、用量反応勾配あり → 中にアップグレード」",
    aiEbmNarration:
      "AI-EBM 先生は観察研究を「**低い確実性から開始**」し、大きな効果・用量反応勾配・交絡が結果を弱める方向にあるなどの要素があれば**アップグレード**します。アップグレードの根拠も明示されます。",
    differences: [
      { left: "「効果あり」と直接結論", right: "**確実性を「低」から開始**" },
      { left: "交絡因子の議論浅い", right: "**多変量調整・感度分析を明示**" },
      { left: "因果と相関を混同", right: "**因果推論の前提を検証**" },
      { left: "RCT と同列に扱う", right: "**研究デザイン階層を尊重**" },
      { left: "アップグレード基準なし", right: "**GRADE のアップグレード要因を適用**" },
    ],
    diffNarration:
      "観察研究は RCT より弱いエビデンスですが、**適切に評価すれば貴重な情報源**になります。確実性を低から始め、根拠があればアップグレードする — それが GRADE の作法です。",
    citationIds: ["coreGRADE1", "coreGRADE4"],
  },
  {
    key: "basic",
    label: "基礎研究",
    leftImg: "/images/intro/basic.jpg",
    rightImg: "/images/intro/basic-g.jpg",
    traditional: "「動物実験で X 化合物が GABA 放出を選択的に抑制」 → 「ヒトに使える！」",
    traditionalNarration:
      "基礎研究の結果を「ヒトでも効く」と外挿する発表をしばしば目にします。動物実験・細胞実験の結果は**直接ヒトに当てはめられない**ことを忘れています。",
    problems: [
      "**動物・細胞 → ヒト** の外挿は飛躍ではないか？",
      "用量・投与経路は**ヒトの臨床で実現可能**か？",
      "毒性・副作用は基礎研究の段階では評価困難",
      "GRADE の**非直接性 (indirectness)** で大きくダウングレードされる",
      "「メカニズムが分かった」と「臨床で効く」は別物 — 区別されているか？",
    ],
    problemsNarration:
      "基礎研究は仮説を生む段階のエビデンス。臨床的有効性の判断には、**RCT などのヒトでの研究**が必要です。GRADE では非直接性で確実性が大きく下がります。",
    aiEbm:
      "「化合物 X が GABA 放出を抑制 (マウス) — ヒト有効性は未検証、確実性=とても低い」",
    aiEbmNarration:
      "AI-EBM 先生は基礎研究を「**仮説段階のエビデンス**」と明示し、ヒトでの有効性は未検証であること、**非直接性で確実性が低い**ことを率直に提示します。",
    differences: [
      { left: "動物実験結果を直接外挿", right: "**ヒト有効性は未検証**と明示" },
      { left: "「効果あり！」", right: "**「メカニズムは示唆」**にとどめる" },
      { left: "副作用の議論浅い", right: "**ヒトでの安全性は別途必要**と明示" },
      { left: "非直接性を考慮しない", right: "**GRADE 非直接性で大きくダウングレード**" },
      { left: "メカニズム = 効果と混同", right: "**仮説と臨床効果を区別**" },
    ],
    diffNarration:
      "基礎研究はメカニズム解明には不可欠ですが、**臨床効果の根拠としては弱い**。AI-EBM 先生は段階を明示し、ヒトでの確認の必要性を率直に伝えます。",
    citationIds: ["coreGRADE1"],
  },
];

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
    narration:
      "ある学会のシンポジウムで、こんなスライドが出てきました。最新の第III相試験で**有意な効果**が示されたX薬。\n\nあなたは、この講演を聞いてどう反応しますか？\n\n— もし違和感を持てたなら、あなたは EBM 的な感覚を持っています。これから一緒に、何が足りないのかを見ていきましょう。",
    speakerNotes: "聴衆に問いかけて5〜10秒、考える時間をとる。",
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
    narration:
      "もしこれら6つの確認に答えられないとすれば、その講演は **エビデンスの「点」を見せられているだけ** です。\n\nこれから 5 つの研究タイプ（RCT・SR・診療ガイドライン・観察研究・基礎研究）について、従来の発表と AI-EBM 先生の発表を**1つずつ4スライド**で対比していきます。",
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
    narration:
      "AI-EBM 先生は、本セッション専用に設定した**架空の教育用キャラクター**です。\n\n以降の N4〜N23 では、5 つの研究タイプについて 1 カテゴリあたり 4 スライドで本質的な違いを掘り下げます。",
    warnings: [
      "AI-EBM先生は架空の教育用キャラクター。実在の特定の人物を表すものではない",
    ],
    citationIds: ["coreGRADE1", "iom2011"],
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
    narration:
      "5 つの研究タイプ × 4 スライドの旅を通じて見えてきた AI-EBM 先生の本質は、この**4原則**です。",
    citationIds: ["sackett1996", "usersGuides2015"],
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
    narration:
      "これから本編に入っていきましょう。「ふーん、そうなんだ」ではなく、「**なるほど、だからそうなのか**」という理解を目指します。",
    citationIds: ["sackett1996", "iom2011"],
  },
];

// Renumber to N1, N2, ..., N25
const renumbered = newIntro.map((s, i) => ({ ...s, id: `N${i + 1}`, order: i + 1 }));

const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));
const otherSlides = (data.slides || []).filter((s) => !/^N/.test(s.id));
data.slides = [...renumbered, ...otherSlides];
data.meta.version = "0.4.0-step4-rebuild";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(
  `Rewrote ${renumbered.length} intro slides; preserved ${otherSlides.length} other slides`
);
