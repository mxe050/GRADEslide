#!/usr/bin/env node
/*
 * rewrite-narrations.mjs
 *
 * speak.txt（実講演の書き起こし）と coreGRADE 文献の知識を骨格に、各スライドの
 * narration を「ガイアット先生による単独モノローグ」として書き直す。
 * 旧来の「初心者: タイトルって、どういうことですか? EBM先生: <コピペ>」という
 * へたな会話形式は廃止。会話形式は parser 側で検出されなくなった (NarrationPanel
 * 改修済み) ので、地の文として書けばそのまま整形表示される。
 *
 * 加えて、coreGRADE シリーズの参考文献を citations に拡張。
 *
 * 慎重に段階適用するため、本スクリプトは 1 セクションずつ実行できる:
 *   node scripts/rewrite-narrations.mjs        # すべてのセクションを上書き
 *   node scripts/rewrite-narrations.mjs --part1
 *   node scripts/rewrite-narrations.mjs --part2
 *   node scripts/rewrite-narrations.mjs --part3
 *   node scripts/rewrite-narrations.mjs --intro
 *
 * 上書き対象: slide.narration / slide.citationIds / slide.warnings / slide.visual
 * （visual 改修は CONTENT_PART1 等で visual キーが定義されている場合のみ）。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "..");
const SLIDES_JSON = path.join(WEB_DIR, "public", "data", "slides.json");

// ---------------------------------------------------------------------------
// 拡張 Citations: coreGRADE シリーズ全巻 + Guyatt 講演 + MID/EtD など
// ---------------------------------------------------------------------------

const ADDITIONAL_CITATIONS = {
  coreGRADE0: {
    id: "coreGRADE0",
    label: "Core GRADE 0 — Introduction",
    source:
      "Guyatt GH, et al. Core GRADE 0: Introduction to the Core GRADE approach to rating certainty of evidence and strength of recommendations.",
  },
  coreGRADE7: {
    id: "coreGRADE7",
    label: "Core GRADE 7 — Evidence to Decision (EtD)",
    source:
      "Guyatt GH, et al. Core GRADE 7: From evidence to recommendations using the GRADE Evidence-to-Decision framework.",
  },
  guyattLecture2025: {
    id: "guyattLecture2025",
    label: "Guyatt 先生 講演 2025年12月",
    source:
      "Guyatt GH. Core GRADE 講演 (2025年12月). MAXマスター大学 Department of Health Research Methods, Evidence, and Impact.",
  },
  guyattQA: {
    id: "guyattQA",
    label: "Guyatt 先生 Q&A 集 (Core GRADE)",
    source:
      "Guyatt GH. Core GRADE シリーズ Q&A 集 — エビデンスから推奨へ至る批判的吟味のポイント。",
  },
  guyatt2025Threshold: {
    id: "guyatt2025Threshold",
    label: "Guyatt GH, 2025 — 確実性・文脈・閾値",
    source:
      "Guyatt GH. Rating certainty of evidence: contextualised approach and threshold (2025).",
  },
  cqGRADE: {
    id: "cqGRADE",
    label: "Core GRADE — Clinical Question (CQ) chapter",
    source:
      "Guyatt GH, et al. Formulating clinical questions for GRADE — the PICO/PECO framework.",
  },
  panelGRADE: {
    id: "panelGRADE",
    label: "Core GRADE — Guideline Panel chapter",
    source:
      "Guyatt GH, et al. Constituting and operating a GRADE-compliant guideline panel.",
  },
  outcomeGRADE: {
    id: "outcomeGRADE",
    label: "Core GRADE — Outcome importance & rating chapter",
    source:
      "Guyatt GH, et al. Selecting and rating the importance of outcomes for guideline panels.",
  },
  recommendationGRADE: {
    id: "recommendationGRADE",
    label: "Core GRADE — Direction & strength of recommendation chapter",
    source:
      "Guyatt GH, et al. Determining the direction and strength of recommendations using the GRADE approach.",
  },
  subgroupGRADE: {
    id: "subgroupGRADE",
    label: "Core GRADE — Subgroup analysis chapter",
    source:
      "Guyatt GH, et al. Credibility assessment of subgroup analyses in GRADE.",
  },
  noEvidenceGRADE: {
    id: "noEvidenceGRADE",
    label: "Core GRADE — \"No evidence\" handling chapter",
    source:
      "Guyatt GH, et al. Handling situations of \"no evidence\" or insufficient evidence in GRADE.",
  },
  disseminationBias: {
    id: "disseminationBias",
    label: "Core GRADE — Dissemination bias chapter",
    source:
      "Guyatt GH, et al. Detecting and rating dissemination bias (publication bias) in systematic reviews.",
  },
  nmaGRADE: {
    id: "nmaGRADE",
    label: "Core GRADE — Network meta-analysis chapter",
    source:
      "Guyatt GH, et al. Rating certainty of evidence in network meta-analyses.",
  },
  midConcept: {
    id: "midConcept",
    label: "MID (Minimal Important Difference) — GRADE Imprecision",
    source:
      "Schünemann HJ, Guyatt GH. Minimal important difference (MID) for outcome measures and the GRADE approach to imprecision.",
  },
  robinsI: {
    id: "robinsI",
    label: "ROBINS-I — Sterne JAC, et al. BMJ 2016",
    source:
      "Sterne JAC, Hernán MA, Reeves BC, et al. ROBINS-I: a tool for assessing risk of bias in non-randomised studies of interventions. BMJ 2016;355:i4919.",
    url: "https://doi.org/10.1136/bmj.i4919",
  },
  rob2: {
    id: "rob2",
    label: "RoB 2 — Sterne JAC, et al. BMJ 2019",
    source:
      "Sterne JAC, Savović J, Page MJ, et al. RoB 2: a revised tool for assessing risk of bias in randomised trials. BMJ 2019;366:l4898.",
    url: "https://doi.org/10.1136/bmj.l4898",
  },
  prismaStatement: {
    id: "prismaStatement",
    label: "PRISMA 2020 — Page MJ, et al.",
    source:
      "Page MJ, McKenzie JE, Bossuyt PM, et al. The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. BMJ 2021;372:n71.",
    url: "https://doi.org/10.1136/bmj.n71",
  },
  iomTrustworthy2011: {
    id: "iomTrustworthy2011",
    label: "IOM 2011 — 信頼できる診療ガイドライン",
    source:
      "Institute of Medicine. Clinical Practice Guidelines We Can Trust. Washington (DC): National Academies Press; 2011.",
    url: "https://nap.nationalacademies.org/catalog/13058",
  },
  guyatt2023limaCpg: {
    id: "guyatt2023limaCpg",
    label: "Lima JP, Tangamornsuksan W, Guyatt GH. 2023",
    source:
      "Lima JP, Tangamornsuksan W, Guyatt GH. Trustworthy evidence-based versus untrustworthy guidelines: detecting the difference. Fam Med Community Health 2023;11(4):e002437.",
    url: "https://doi.org/10.1136/fmch-2023-002437",
  },
  whoStatementTaxonomy: {
    id: "whoStatementTaxonomy",
    label: "WHO Statement Taxonomy",
    source:
      "World Health Organization. Handbook for guideline development — taxonomy of statements (recommendations, good practice statements, implementation considerations).",
  },
  cochraneHandbook: {
    id: "cochraneHandbook",
    label: "Cochrane Handbook for Systematic Reviews",
    source:
      "Higgins JPT, Thomas J, Chandler J, et al., eds. Cochrane Handbook for Systematic Reviews of Interventions, version 6.x. Cochrane.",
    url: "https://training.cochrane.org/handbook",
  },
};

// ---------------------------------------------------------------------------
// Helper to build a "single-monologue" narration string. ガイアット先生 (本講演の
// 講師) になりきり、一人語りで書く。speak.txt のフレーズを尊重しつつ、
// coreGRADE シリーズの背景を補強した上で、スマホでも読み下しやすい長さ (200〜400
// 字程度) に圧縮。
// ---------------------------------------------------------------------------

function n(text) {
  return text.replace(/\s+\n/g, "\n").trim();
}

// ---------------------------------------------------------------------------
// 第1部 (S1〜S40) の narration / citations / 一部 visual
// speak.txt の流れに準拠
// ---------------------------------------------------------------------------

const CONTENT_PART1 = {
  S1: {
    narration: n(
      `こんにちは。今日は **「診療ガイドラインの定義の意味を、なぜなの？から理解する」** ところから始めて、最終的にはガイドライン委員・パネリストとして必要な知識まで、一緒に見ていきます。

このセッションを通じて、ガイドラインを **読みこなす力** から、**作る側として推奨を決定する力** までを、Core GRADE の枠組みで整理します。難しそうに聞こえますが、ひとつひとつ「なぜそうなっているのか」を理解すれば、自然と頭に入ります。安心してついてきてください。`
    ),
    citationIds: ["sackett1996", "iom2011", "coreGRADE0", "guyattLecture2025"],
  },

  S2: {
    narration: n(
      `本日のメニューは三部構成です。

**(1) 診療ガイドラインの定義の意味を「なぜなの？」から理解** — 言葉の意味を、なぜそう定義されているかという背景から押さえます。
**(2) 診療ガイドライン作成を学ぶ** — 国際的なトレーニングコースに沿った実践的な内容。
**(3) こんなことまで考えて、推奨を決定しています** — EtD表など舞台裏のツールと考え方。

診療ガイドラインを **読みこなしたいだけの方は第1部のみで大丈夫** です。委員・パネリストの方は最後までお付き合いください。`
    ),
    citationIds: ["iom2011", "coreGRADE0", "etdSchunemann2016"],
  },

  S3: {
    narration: n(
      `まずは第1部、**診療ガイドラインの定義の意味を「なぜなの？」から理解する** に入ります。

世界的に共通する定義 (米国 IOM/HMD 2011) に含まれる 3 つのキーワード — **システマティックレビュー / 利益と害の評価 / 推奨** — を、ひとつずつ「なぜ必要なのか」から押さえていきます。

ここを丁寧に積み上げると、後から読むガイドラインの **どこが信頼できて、どこが怪しいのか** が見抜けるようになります。`
    ),
    citationIds: ["iom2011", "coreGRADE0", "guyatt2023limaCpg"],
  },

  S4: {
    narration: n(
      `さて、医学情報の信頼性の話から入ります。
**「(1) 最近のAIで調べました。ほぼハルシネーションはありません」** と **「(2) PubMed で網羅的に調べ、良い論文か、反対する論文がないかを専門医が吟味しました」** — あなたはどちらを患者さんに適用しますか？

「ほぼ」で良いのか。AI が便利になればなるほど、**ハルシネーションがゼロでない限り、患者の臨床決断には使えない場面がある** ことを忘れてはいけません。検索の効率化に AI を使うのは構いませんが、**最後のエビデンス確認は人間が PubMed で直接** 行うのが、現時点での EBM の王道です。`
    ),
    citationIds: ["sackett1996", "usersGuides2015", "coreGRADE0"],
  },

  S5: {
    narration: n(
      `「EBMは知ってるよ」「システマティックレビューは読んだことがある」「ガイドラインは使っているよ」 — それで十分でしょうか。

私たちが本当に問うべきは、 **その定義を、意味するところまで含めて理解しているか** です。EBM・SR・診療ガイドラインの 3 つは互いに密接につながっています。今日はこれを「なぜそう定義されているのか」から解きほぐします。`
    ),
    citationIds: ["sackett1996", "usersGuides2015", "iom2011", "coreGRADE0"],
  },

  S6: {
    narration: n(
      `EBM の古典的定義 (Sackett 1996) を一緒に読みましょう。

**「個々の患者のケアに関する意思決定において、現在得られる最良の根拠を、良心的に、明示的に、思慮深く用いること」** — ここに含まれる 3 つの要素、 **個々の患者** ・ **最良の根拠** ・ **思慮深く** が EBM の核です。

ガイドラインを機械的に当てはめることが EBM ではありません。**根拠を理解した上で、目の前の患者に合わせて思慮深く適用する** ことが本質です。`
    ),
    citationIds: ["sackett1996", "usersGuides2015", "coreGRADE0"],
  },

  S7: {
    narration: n(
      `EBM は **5 つのステップ (Evidence Cycle)** で構成されます。

**Step 1 Ask** — 疑問を提起する (PICO で定式化)
**Step 2 Acquire** — 効率良く検索する
**Step 3 Appraise** — 批判的吟味
**Step 4 Apply** — 患者へ適用 (価値観・状況を考慮)
**Step 5 Assess** — 自分の実践を評価する

特に **Step 4 で「患者の価値観」を組み込む** ことが世界標準です。エビデンスは決断の一部にすぎません。`
    ),
    citationIds: ["sackett1996", "usersGuides2015", "coreGRADE0"],
  },

  S8: {
    narration: n(
      `5 ステップは知っていても、 **EBM の 3 つの基本原則** (Users' Guides 第3版, 2015) は意外と知られていません。

**① 最適な臨床決断には、入手可能な最良のエビデンス、理想的にはシステマティックレビューのエビデンスが必要である。**
**② エビデンスの信頼性 (確実性) を評価する必要がある。**
**③ エビデンスだけでは臨床決断をするのに決して十分ではない。**

第 3 原則がいちばん重要です。最高の RCT があっても、**害・コスト・実行可能性・患者の価値観** を統合しなければ、本当の意思決定にはならないからです。`
    ),
    citationIds: ["usersGuides2015", "sackett1996", "coreGRADE0", "etdSchunemann2016"],
  },

  S9: {
    narration: n(
      `3 原則を実装する上で、ポイントは **「EBM における検索は効率重視」** ということです。

まずシステマティックレビュー (SR) を探す。AI を経由するより **PubMed で直接検索** したほうが、確実でハルシネーションもない。SR が無ければ非ランダム化研究も使う。希少疾患では症例報告すら役立つことがある。**しかし、いずれも「信頼できるか」の評価は必須** です。

最近は丁寧に作られた診療ガイドラインが増えてきたため、SR の前にガイドラインを参照することも多い。**ただし信頼できないガイドラインも存在する** ので、見分け方を今日のテーマにします。`
    ),
    citationIds: ["usersGuides2015", "iom2011", "guyatt2023limaCpg", "coreGRADE0"],
  },

  S10: {
    narration: n(
      `**システマティックレビュー (SR) の定義** を押さえましょう。

「特定の臨床的問い (リサーチクエスチョン) に答えるため、 **あらかじめ定められた適格基準** を満たすすべての実証的エビデンスを **同定・評価・統合** しようとするもの」 — つまり **再現性のある研究の一形態** です。

SR の必須要素は 6 点: ① PICO/PECO で問いを明確化、② プロトコル先行で透明性確保、③ 網羅的・系統的検索、④ 客観的な研究選択、⑤ **GRADE によるエビデンス確実性の評価**、⑥ 必要に応じてメタ分析で結果を統合。

SR は 「研究の集まり」 ではなく **「事前計画に従って再現できる科学」** です。ここが従来型レビューとの決定的な違いです。`
    ),
    citationIds: ["coreGRADE1", "coreGRADE6", "prismaStatement", "cochraneHandbook"],
  },

  S11: {
    narration: n(
      `**検索式** とは、データベースから漏れなく・ダブりなく研究を探し出すための「魔法のレシピ」です。キーワードや MeSH (PubMed の統制語) を、AND/OR/NOT といった論理演算子で組み合わせて作ります。

検索式はデータベースごとに違うため、Polyglot Search Translator のような変換ツールを併用するのが実務です。

「なぜここまで面倒なことを?」と思うかもしれません。**多くの講演会で「こんな研究がありますよ」と紹介されるだけ** なのに、なぜ系統的・網羅的検索が不可欠か — その理由を、次のスライド以降の **X 薬 4 論文の例** で身体に染み込ませていきます。`
    ),
    citationIds: ["prismaStatement", "cochraneHandbook", "coreGRADE0"],
  },

  S12: {
    narration: n(
      `**X 薬の仮想例** で考えましょう。世界中の論文を網羅的に検索したら、4 本の論文が見つかったとします。

| 論文 | がん縮小 | 死亡率減少 |
|---|---|---|
| Aihara | 効果あり | 効果なし |
| Nangou | 効果あり | 効果なし |
| Yuasa | 少し効果あり | 少し効果あり |
| Tange | 効果なし | 効果なし |

こうして並べてみると、 **「がんは小さくなりそう、しかし死亡率は下げなさそう」** という像が見えてきます。これがアウトカムごとの **「縦読み」** です。`
    ),
    citationIds: ["coreGRADE1", "usersGuides2015"],
  },

  S13: {
    narration: n(
      `さて、もしランチョンセミナーで著名な教授が **「EBM に基づいてX薬は治療に効果あり」** と、Yuasa 論文だけを英語スライドで力説したらどうでしょう。

「英語の論文だ」「教授が言うのだから」と、信じてしまいそうになりませんか。しかしこれは **全体のうち 1 本を切り取った見方にすぎません**。

「EBM に基づいて」と冠しながら、**発表者に都合の良い論文の都合の良い結果だけを意図的に選ぶ** — これが **恣意的な選択 (cherry-picking)** です。教科書ですらこのスタイルで書かれていることがあります。`
    ),
    citationIds: ["sackett1996", "usersGuides2015", "coreGRADE0"],
  },

  S14: {
    narration: n(
      `恣意的な選択は、**意図的でなくとも起こります**。発表者の研究分野や所属、利益相反 (COI) によって無意識に視野が狭くなる。教科書の章執筆者の専門性が偏っていれば、引用論文も偏ります。

だからこそ、 **「網羅的・客観的に集めた上で、アウトカムごとに縦読みする」** という SR のプロセスが必要なのです。1 本だけを取り出した瞬間、「効果あり/なし」の方向すら逆転しかねません。`
    ),
    citationIds: ["coreGRADE1", "iom2011", "guyatt2023limaCpg"],
  },

  S15: {
    narration: n(
      `恣意的選択を避ける唯一の方法は、 **網羅的に検索し、客観的に論文を選び、アウトカムごとに縦読みする** ことです。

先ほどの 4 論文を、 **「がん縮小」 列だけを縦に読む** と効果ありが多い。 **「死亡率減少」 列だけを縦に読む** と効果なしが多い。一目で分かります。

「効果がありそうなアウトカム」と「効果がなさそうなアウトカム」を 区別して見るのが客観的評価です。`
    ),
    citationIds: ["coreGRADE1", "outcomeGRADE"],
  },

  S16: {
    narration: n(
      `全体を眺めれば「がん縮小には効果が期待できるが、死亡率減少には効果はなさそう」 と読める — これが **系統的検索 + 縦読み** の威力です。

恣意的に選ばれた 1 本の論文だけで判断することがいかに危険か、そしてなぜ SR/メタ分析が必要なのかが、皮膚感覚で分かるはずです。

**Core GRADE 0** が「**確実性の評価は SR を出発点にする**」と繰り返し述べているのは、まさにこの恣意性を排除するためです。`
    ),
    citationIds: ["coreGRADE0", "coreGRADE1", "usersGuides2015"],
  },

  S17: {
    narration: n(
      `次のキーワードは **メタ分析** です。

複数の研究結果を **量的に統合する統計手法**。例えば A 研究で改善率 50%、B 研究で 40%、C 研究で 30% — これらをただ平均するのではなく、**サンプルサイズで重み付けして統計学的に統合** します。

なぜ単純平均ではダメなのか、次のスライドの **シンプソンのパラドックス** で見てみましょう。`
    ),
    citationIds: ["coreGRADE1", "coreGRADE6", "cochraneHandbook"],
  },

  S18: {
    narration: n(
      `論文1: A 治療 160例 中 48 例改善 (30%)、B 治療 20例 中 4 例改善 (20%) — A の勝ち。
論文2 (次スライド) でも A 治療が B 治療を上回っています。

直感では「A 治療が優れている」と結論したくなります。`
    ),
    citationIds: ["coreGRADE1"],
  },

  S19: {
    narration: n(
      `ところが、論文 1 と論文 2 の **症例数と改善数を単純に足し算すると、結果が逆転して B 治療の方が改善率が高くなる** ことがあります。これを **シンプソンのパラドックス** と呼びます。

各研究の症例数の偏りなどが原因で起こる現象です。だからこそメタ分析は、**症例数などを考慮した「過重平均」のような統計計算** を行います。「ただ単に合算する」とは別物です。`
    ),
    citationIds: ["coreGRADE1", "coreGRADE6"],
  },

  S20: {
    narration: n(
      `**フォレストプロット** はメタ分析の結果を視覚化したもの。各研究の点推定値と 95% 信頼区間を縦に並べ、最下段にひし形として **統合値** を示します。

四角の大きさはそれぞれの研究の **重み (サンプルサイズ)**。横線が短いほど精確です。

例: 4 研究を統合した結果、 **相対危険度 1.62** という 1 つの推定値が得られた — これでようやく「効果が何倍ありそうか」を 1 つの数値で語れる、という意味です。`
    ),
    citationIds: ["coreGRADE1", "coreGRADE6", "cochraneHandbook"],
  },

  S21: {
    narration: n(
      `次のキーワードは **エビデンスの確実性** です。

メタ分析で得た **1.62** という推定値が「どれだけ信頼できるか」 — その確信のレベルを示すもの。**昔は「エビデンスのレベル」と呼ばれていましたが誤解が多かった** ため、現在は **「確実性 (certainty)」** という言葉を使います。

**Core GRADE 1** は明確に述べています: 「効果がある/ない」と「効果がどれくらい確かか」は別問題である。`
    ),
    citationIds: ["coreGRADE1", "guyatt2025Threshold", "coreGRADE0"],
  },

  S22: {
    narration: n(
      `たとえメタ分析の結果が同じ **1.62** でも、その元になった論文の質次第で確実性は大きく変わります。

「効果あり」とした論文ばかりが **いい加減に作られた研究 (バイアスのリスクが高い)** で、「効果なし」とした論文が **丁寧に作られた研究 (バイアスのリスクが低い)** だったら? — 統合された 1.62 という値の確実性は **低い** と判断するべきです。

「結果の数字」だけでなく「元になった研究の質」まで見る — これが **Core GRADE 4 (Risk of Bias)** の出発点です。`
    ),
    citationIds: ["coreGRADE4", "rob2", "robinsI", "robustRCT"],
  },

  S23: {
    narration: n(
      `視点を変えましょう。同じメタ分析結果 **1.62** でも、**個々の研究結果がバラついている** か、**揃っている** かでも確実性は違います。

研究結果がばらついていれば **非一貫性 (inconsistency) あり** と判断され、確実性は下がる。揃っていれば確実性は高くなる。

**Core GRADE 3** が解説するように、評価は単に I² だけでなく **点推定値の重なり・信頼区間の重なり** を多面的に見ます。同じ数字でも、その背景によって信頼度が全く違う — これが GRADE の核心の一つです。`
    ),
    citationIds: ["coreGRADE3", "cochraneHandbook"],
  },

  S24: {
    narration: n(
      `つまり同じ **「相対危険度 1.62」** でも、

**ケース A**: 4 研究すべてが 1.5〜1.8 の狭い範囲 → 確実性 **高**
**ケース B**: 4 研究が 0.5/1.0/1.6/3.0 とバラバラ → 確実性 **低**

両者とも統合値は同じ。しかし結果の信頼性は天と地の差です。フォレストプロットを見れば、この違いが一瞬で見抜けます。これが **「数字に紐をつける」 GRADE の作法** の出発点になります。`
    ),
    citationIds: ["coreGRADE3", "coreGRADE6"],
  },

  S25: {
    narration: n(
      `エビデンスの確実性を下げる要因は **5 つ** に整理されます (GRADE アプローチ)。

**① 研究の限界 (バイアスのリスク)** — 各論文にバイアスが多いか
**② 非一貫性 (inconsistency)** — 結果のばらつき
**③ 非直接性 (indirectness)** — 想定患者層と研究対象のずれ
**④ 不精確さ (imprecision)** — 症例数が少ない、信頼区間が広い
**⑤ 出版バイアス (publication bias)** — 不利な結果が公表されない可能性

これらをチェックして総合的に判断するのが **Core GRADE 1〜5** の体系です。`
    ),
    citationIds: [
      "coreGRADE1",
      "coreGRADE2",
      "coreGRADE3",
      "coreGRADE4",
      "coreGRADE5",
      "disseminationBias",
    ],
  },

  S26: {
    narration: n(
      `かつて「エビデンスのレベル」と呼ばれていた頃から、5 要因のコンセプト自体は存在していました。しかし「研究デザインだけで決まる」と誤解され、SR があれば自動的に「レベル 1」、観察研究なら「レベル 4」と機械的に分類されていた。

GRADE はこれを刷新し、**「研究デザインで出発点を決め、5 要因で上げ下げする」** 動的な評価に変えました。これが **「エビデンスの確実性」 という言葉に切り替わった理由** です。`
    ),
    citationIds: ["coreGRADE0", "coreGRADE1", "guyattLecture2025"],
  },

  S27: {
    narration: n(
      `エビデンスの確実性を客観的に評価する世界標準の方法論が、 **GRADE アプローチ** です。

WHO、Cochrane、NICE、米国学会の多くを含む **世界 100 以上の組織** で採用されており、診療ガイドライン作成のデファクトスタンダードになっています。`
    ),
    citationIds: ["coreGRADE0", "iom2011", "whoStatementTaxonomy"],
  },

  S28: {
    narration: n(
      `したがって、**メタ分析で得た「相対危険度 1.62」 という数字だけが一人歩きすると、誤った解釈につながる危険があります**。

例えるなら、犬の散歩のリードを外して放してしまうようなものです。リードがなければ犬はどこへでも行ってしまう — 数字も同じで、確実性という「紐」がないと、文脈から外れて勝手に解釈されてしまいます。`
    ),
    citationIds: ["coreGRADE0", "coreGRADE1", "guyatt2025Threshold"],
  },

  S29: {
    narration: n(
      `だからこそ、**メタ分析の結果という数字には必ず「確実性の程度」 というリードを付ける** — これが現在の世界標準です。

「相対危険度 1.62 (95%CI 1.05〜2.50)、エビデンスの確実性 = 中」 のように、 **数字と確実性をワンセットで** 提示します。これが GRADE 流の科学的誠実さです。`
    ),
    citationIds: ["coreGRADE1", "coreGRADE6"],
  },

  S30: {
    narration: n(
      `かつての SR は 「網羅的検索 → メタ分析 → 結果」 で完成と考えられていました。

しかし現在は、**メタ分析の上に「エビデンスの確実性の評価」 という星印** が必須です。メタ分析ができない定性的 SR でも同様に、確実性の評価が太陽の位置に来ます。

**確実性の評価がない SR は、GRADE 時代には不完全** です。`
    ),
    citationIds: ["coreGRADE0", "coreGRADE6", "prismaStatement"],
  },

  S31: {
    narration: n(
      `重要な区別があります。 **「SR の質」 と 「SR が出す結果のエビデンスの確実性」 は別物** です。

| SR 自体の作り方 | 中の研究の質 | 結論 |
|---|---|---|
| しっかり作られていない | — | **使ってはいけない** |
| しっかり作られている | 各研究がバイアス多・結果不一致 | SR の質は高いが、**結果のエビデンスの確実性は低い** |
| しっかり作られている | 良質で結果も一致 | **十分に使える** |

「SR だからエビデンスが高い」 と聞いても信じてはいけません。**SR の枠組みと中身は別物** なのです。`
    ),
    citationIds: ["coreGRADE1", "coreGRADE6", "guyatt2023limaCpg"],
  },

  S32: {
    narration: n(
      `ここまでをまとめると、**患者にとって望ましい医学情報** とは、

① 最新であること、② 偏っていないこと、③ 信頼性が高いこと、④ 研究段階でなく **臨床で使える形** になっていること。

これらをすべて満たすのが **「信頼できる診療ガイドライン」** です。なければ自分で SR + GRADE で組み上げる必要があります。

ここから本題、 **診療ガイドラインの定義** に入ります。`
    ),
    citationIds: ["iom2011", "coreGRADE0", "guyatt2023limaCpg"],
  },

  S33: {
    narration: n(
      `世界標準の **診療ガイドライン定義 (IOM/HMD 2011)** を読みます。

**「診療ガイドラインとは、エビデンスのシステマティックレビューと、複数の治療選択肢の利益と害の評価に基づいて、患者ケアを最適化するための推奨を含む文書である」**

最初に読んだとき難しく感じた人も、ここまでの議論を踏まえれば、 「**SR**」「**利益と害の評価**」「**推奨**」 の 3 つの要素がすっと頭に入るはずです。

この定義に従っていないものは、信頼できない診療ガイドラインです。`
    ),
    warnings: [
      "この定義に従っていないものは「信頼できない診療ガイドライン」になる。",
    ],
    citationIds: ["iom2011", "guyatt2023limaCpg", "coreGRADE0"],
  },

  S34: {
    narration: n(
      `ちょっと待ってください。**たとえエビデンスの確実性が高く、効果が認められたとしても、それだけで推奨してよいわけではありません**。

もしその治療に **重大な有害事象、高すぎるコスト、患者の負担** があれば? — 効果だけ見て推奨するのは無責任です。

ここで定義の 2 つ目の要素、 **利益と害の評価** が登場します。`
    ),
    citationIds: ["coreGRADE7", "etdSchunemann2016", "recommendationGRADE"],
  },

  S35: {
    narration: n(
      `**利益と害の評価** とは、利益のエビデンスだけでなく、 **害 (望ましくない効果)** のエビデンスも検討し、両者のバランスを取ること。

さらに、**コスト・患者の価値観・実行可能性・公平性** といった文脈的要素も総合的に評価します。これは **EBM の Step 4 (患者への適用)** に一致する内容で、GRADE では **EtD (Evidence-to-Decision) フレームワーク** として体系化されています。`
    ),
    citationIds: ["coreGRADE7", "etdSchunemann2016", "outcomeGRADE", "usersGuides2015"],
  },

  S36: {
    narration: n(
      `**推奨** とは、ガイドラインが示す **具体的で実行可能な行動方針** です。エビデンスの検索、確実性、利益と害のバランスなど、すべての検討を踏まえて作られます。

世界標準では、**推奨の方向 (行う/行わない)** と **推奨の強さ (強い/弱い・条件付き)** を **明確に分けて** 表現することになっています。本来は連続体ですが、2 つに区分するメリットがデメリットを上回る、というのが GRADE の判断です。`
    ),
    citationIds: ["recommendationGRADE", "coreGRADE7", "etdSchunemann2016"],
  },

  S37: {
    narration: n(
      `では、最初の **IOM 定義** を読み直してみましょう。

**「診療ガイドラインは、エビデンスのシステマティックレビューと、複数の治療選択肢の利益と害の評価に基づいて、患者ケアを最適化するための推奨を含む文書である」**

最初は難解だった文章が、今は **「網羅的に集めた SR で確実性を評価し、利益と害をバランスして、強い/弱いを明示した推奨を作る文書」** とすんなり読める。これが「定義を、なぜなの？から理解する」ということです。

診療ガイドラインを **使うだけ・読みこなしたいだけ** の方は、ここまでで OK です。`
    ),
    citationIds: ["iom2011", "coreGRADE0", "coreGRADE7", "guyatt2023limaCpg"],
  },

  S38: {
    narration: n(
      `**信頼できるガイドライン vs 信頼できないガイドライン** の比較表 (Lima/Guyatt 2023) を見てください。

**信頼できる**: 推奨が明確で実行可能、多様なステークホルダーで構成、COI 開示・管理、PICO で患者重要アウトカムを設定、最良の SR に基づく、患者の価値観を明示的に配慮、確実性と推奨の強さを区別、SoF 表で絶対リスクを提示。

**信頼できない**: 推奨が曖昧、関係者 (患者など) の視点が欠落、COI 不明、委員会の関心事だけ、質の低い SR や GOBSAT (専門家の合意のみ)、価値観を無視、確実性と推奨を混同、相対リスクのみ提示。

この基準は、第 2・3 部で繰り返し登場します。`
    ),
    citationIds: ["guyatt2023limaCpg", "iomTrustworthy2011", "guyatt2023sixQuestions"],
  },

  S39: {
    narration: n(
      `次に、よく見かけるガイドラインの解説文を吟味します。

**例 1**: 「SR1 では生存率延長、RCT1 でも生存率延長、RCT2 では再発率低下」
**例 2**: 「SR1 で生存率延長、SR2 で再発率低下、SR3 で生存率同等」
**例 3**: 「Minds 2020 に従ったとあるが、本文を読んでも SR を行った記載がなく、信頼できる第 III 相試験の結果…」と続くもの。

一見もっともらしく見えますが、これらは **批判的吟味の対象** です。次のスライドで具体的に何がおかしいかを示します。`
    ),
    citationIds: ["guyatt2023limaCpg", "coreGRADE0", "iom2011"],
  },

  S40: {
    narration: n(
      `**例 1 の問題**: SR1 は網羅的に論文を集めているはずなので、その中に RCT1/RCT2 の結果は **含まれているはず**。にもかかわらず SR1 と RCT1/RCT2 を並べて書くのは **二重カウント** です。

**例 2 の問題**: 各 SR の中で使われている RCT が一致しているか違うかも分からず、SR が「しっかり作られているか」 「中の結果のエビデンスの確実性」も書かれていない。**何の参考にもならない解説文** になっています。

**例 3 の問題**: 「Minds に従った」と言いながら SR の記載がない — それは GRADE 流ではない、信頼できない記述です。

これらを見抜けるようになると、ガイドラインの解説文を批判的に吟味できるようになります。`
    ),
    citationIds: ["guyatt2023limaCpg", "iom2011", "coreGRADE6", "coreGRADE0"],
  },
};

// ---------------------------------------------------------------------------
// 第2部 (S41〜S76) — 作成プロセス
// speak.txt 18:33 〜 35:04 をベースに、Core GRADE Panel/Outcome/Recommendation
// 章を盛り込みつつ要点を圧縮。
// ---------------------------------------------------------------------------

const CONTENT_PART2 = {
  S41: {
    narration: n(
      `では本日のメニューの **2 つ目、診療ガイドライン作成を学ぶ** に進みます。ここからは実践的な内容です。

国際的なトレーニングコースで使われる枠組みに沿って、不足のないように網羅していきます。情報の羅列が続く場面もありますが、**作成委員・パネリスト** にとっては必須の知識ばかりです。

読みこなしたい方はさらっと流してください。**作成委員・パネルメンバーの方はスライドを止めながら一字一句読む** つもりで取り組んでみてください。`
    ),
    citationIds: ["panelGRADE", "iom2011", "coreGRADE0"],
  },

  S42: {
    narration: n(
      `まずは **信頼できるガイドラインとそうでないガイドラインを見分けるポイント** をまとめた表 (再掲) です。

信頼できるものは、**推奨が明確で患者を含む多様なメンバーで構成され、COI が管理され、PICO に基づき、SR を基盤に、価値観を配慮、強さと確実性を区別** しています。

ここからの全工程は、この表の各項目を「どう実装するか」 の説明だと考えてください。`
    ),
    citationIds: ["guyatt2023limaCpg", "iom2011", "panelGRADE"],
  },

  S43: {
    narration: n(
      `推奨を提示する際には **正当性、サブグループ検討、実施に関わる事項、今後の研究課題** など、多岐にわたる情報を併記する必要があります。

「ただ推奨します」と書くだけのガイドラインは、信頼できないものの典型です。**EtD 表 + Remarks/Justification を充実させる** ことが、透明性確保の核心です。`
    ),
    citationIds: ["coreGRADE7", "etdSchunemann2016", "subgroupGRADE"],
  },

  S44: {
    narration: n(
      `これがガイドライン作成の **全体フローチャート** です。

**組織化 → 優先順位設定 → パネル構成 → グループプロセス → 患者・関係者関与 → COI 管理 → CQ (PICO) 生成 → アウトカム選定 → SR・確実性評価 → 推奨作成・強さ決定 → ピアレビュー → 配布・実装 → 評価・更新**

たくさんの段階に見えますが、 **EBM の 5 ステップとほぼ同じ構造** です。違いは、個人ではなく **パネルとして** 透明性を担保しながら進める点です。`
    ),
    citationIds: ["panelGRADE", "iom2011", "coreGRADE0"],
  },

  S45: {
    narration: n(
      `ガイドライン作成には **複数のグループ** が関わります。

**統括委員会** — 全体の運営・最終承認
**ガイドラインパネル** — 推奨作成 (投票権あり)
**ワーキンググループ (SR 班など)** — 資料作成

**患者・市民代表** がパネルに加わることが、IOM/GRADE 共通の必須要件です。患者の声がない推奨は、信頼できません。`
    ),
    citationIds: ["panelGRADE", "iom2011", "iomTrustworthy2011"],
  },

  S46: {
    narration: n(
      `**優先順位の設定** — どの病気・治療を取り上げるか。社会的ニーズや疾病負荷を踏まえて、主に統括委員会が決定します。

すべての疑問に答えることはできないので、絞り込みが重要です。 **「臨床で頻度が高く、新しいエビデンスがあり、現状の実践にばらつきがある領域」** が優先候補になります。`
    ),
    citationIds: ["panelGRADE", "cqGRADE", "iom2011"],
  },

  S47: {
    narration: n(
      `**メンバー構成** が信頼性の鍵です。

**現場の臨床医、方法論者、SR 専門家、統計家、患者・介護者代表** など、多様な視点を持つメンバーで構成します。

「患者さんも専門家」 と言える理由 — **病気の辛さや治療負担は患者さん自身が一番よく知っている** からです。専門家だけで決めると視野狭窄になります。`
    ),
    citationIds: ["panelGRADE", "iom2011", "iomTrustworthy2011"],
  },

  S48: {
    narration: n(
      `**パネルメンバーの責任** は重大です。

**疑問の決定、会議への参加、エビデンスのレビュー、推奨の作成、最終承認** — すべてに発言権を持ち責任を負います。

「ただ座っているだけ」「発言しない」「締め切りを守らない」 — 残念ながら現実には起こりますが、それでは信頼できる推奨は生まれません。**しがらみがあっても積極的に関与する覚悟** が必要です。`
    ),
    citationIds: ["panelGRADE", "iom2011"],
  },

  S49: {
    narration: n(
      `だからこそ **グループプロセスの確立** が重要です。会議での合意形成方法、 **投票ルール、匿名/非匿名、定足数、過半数 vs 80% など** を **事前に決めて文書化** しておくこと。

これがなければ、声の大きい人や肩書きで決まってしまう。**全メンバーが平等に貢献できる環境を整える** のがチェアの最大の仕事です。`
    ),
    citationIds: ["panelGRADE", "etdSchunemann2016"],
  },

  S50: {
    narration: n(
      `また大切なのが **意見とエビデンスの区別** です。

**意見**: 「私の経験ではこの手術は有効だ」
**エビデンス**: 「100 人を手術した結果、X 人が生存している」

経験則・感想と、客観的なデータをきちんと分けて議論する。これが **GOBSAT (Good Old Boys Sitting Around a Table)** の落とし穴を避ける唯一の方法です。`
    ),
    citationIds: ["coreGRADE0", "panelGRADE", "guyatt2023limaCpg"],
  },

  S51: {
    narration: n(
      `**対象利用者の特定とトピックの選択** — このガイドラインは誰のためのものか。 **プライマリケア医? 専門医? 看護師? 患者本人?** 対象を明確にすると、推奨の粒度や言葉遣いが決まります。

パネルメンバーは、統括委員会が定めたトピックを **自分の臨床経験ではなく、ガイドラインの対象者の視点** で深く理解する必要があります。`
    ),
    citationIds: ["panelGRADE", "iom2011"],
  },

  S52: {
    narration: n(
      `**患者・関係者の関与** は欠かせません。専門家団体、政策決定者、業界団体など多様な立場から意見を聞きます。

ただし、**意見を聞く関係者がそのままパネルメンバー (投票権あり) になる** には、相応のトレーニングと責務が伴います。意見聴取とパネル構成は別の機能です。`
    ),
    citationIds: ["panelGRADE", "iomTrustworthy2011"],
  },

  S53: {
    narration: n(
      `**COI (利益相反) の管理** — ガイドライン作成に参加するメンバーは、製薬企業との金銭的関係をはじめ、すべての利益関係を **書面で申告** する必要があります。

特に **推奨の方向や強さを決める場には、直接的な金銭的利害があるメンバーは参加できない** など、厳しいルールが定められています。COI を 「持っているかどうか」 だけでなく 「**バイアスを構造的に排除できているか**」が問われます。`
    ),
    citationIds: ["panelGRADE", "iom2011", "iomTrustworthy2011"],
  },

  S54: {
    narration: n(
      `いよいよパネルの具体的な作業に入ります。 **EBM の Step 1 と同じ、PICO 形式の疑問の生成** です。

**P (Patient): どんな患者に**
**I (Intervention): 何をしたら**
**C (Comparison): 何と比べて**
**O (Outcome): どうなるか**

「○○の患者に A と B のどちらを使うべきか」 という形にします。具体的で分かりやすい問いになります。`
    ),
    citationIds: ["cqGRADE", "panelGRADE", "coreGRADE0"],
  },

  S55: {
    narration: n(
      `**重要なクエスチョンの絞り込み** — 臨床現場でよく直面する疑問か、新しいエビデンスがあるか、現状の実践にばらつきがあるか — これらを基に取り上げる CQ を厳選します。

すべての疑問に答えるのは無理ですから、**優先順位付け** が大事です。`
    ),
    citationIds: ["cqGRADE", "panelGRADE"],
  },

  S56: {
    narration: n(
      `クエスチョンには **バックグラウンド疑問** (一般的知識を問うもの) と **フォアグラウンド疑問** (具体的行動指針を求めるもの) があります。

ガイドラインで中心となるのは **フォアグラウンド** — 「○○すべきか」 という形の問いです。

検査の場合は少し複雑で、**検査の精度** と **検査が患者アウトカム (死亡率など) を改善するか** の両方を考える必要があります。後者を評価した校舎研究は希少なのが現実です。`
    ),
    citationIds: ["cqGRADE", "outcomeGRADE", "panelGRADE"],
  },

  S57: {
    narration: n(
      `**アウトカムの選定** は重要なステップです。意思決定にとって重要なアウトカムを **7 つ以下** に絞り、その重要度を **1〜9 点** で評価します。

**1〜3 点 (重要ではない)、4〜6 点 (重要だが重大ではない)、7〜9 点 (重大)** の 3 区分。同じ「重大」でも、肺炎 (7 点) と死亡 (9 点) では重みが違います。

ポイントは **「データがあるかどうか」 ではなく「患者にとって重要かどうか」 でアウトカムを選ぶ** ことです。`
    ),
    citationIds: ["outcomeGRADE", "coreGRADE0", "panelGRADE"],
  },

  S58: {
    narration: n(
      `アウトカムは **望ましい効果と望ましくない効果** に分けて整理します。死亡率は低下すれば望ましい効果、上昇すれば望ましくない効果。Minds はこれを最初に分類しています。

ただ、**結果を見るまではどちらに転ぶか分からない** こともあります。だからこそ事前にアウトカムを定義しておくことで、**結果を見てから都合の良いアウトカムを選ぶこと (HARKing)** を防げるのです。`
    ),
    citationIds: ["outcomeGRADE", "coreGRADE0", "robinsI"],
  },

  S59: {
    narration: n(
      `**SR・メタ分析の実施** はワーキンググループ (SR 班) の役割が中心です。パネルは結果を理解し、議論する役割を担います。

ここで **エビデンスの確実性 (GRADE)** が再び登場 — メタ分析の効果推定値がどれだけ正しいかの確信度です。**インパクトファクターとは無関係**、研究の質と結果のばらつきで決まります。`
    ),
    citationIds: ["coreGRADE1", "coreGRADE6", "panelGRADE"],
  },

  S60: {
    narration: n(
      `SR・メタ分析の **定義の再確認** です。ネットワークメタ分析 (NMA) や個別患者データメタ分析 (IPD-MA) など専門的手法もありますが、パネルメンバーは **これらの手法でエビデンスが評価されている** ことを理解しておけば十分です。

**フォレストプロットと SoF 表** の読み方は必須スキルです。後で詳しく見ます。`
    ),
    citationIds: ["coreGRADE6", "nmaGRADE", "cochraneHandbook"],
  },

  S61: {
    narration: n(
      `**エビデンスの確実性を下げる 5 要因** をパネルとして再確認します:

**バイアスのリスク (RoB) / 非一貫性 / 非直接性 / 不精確さ / 出版バイアス**

パネルメンバーは、提示された結果に対し、これら 5 観点から吟味する必要があります。**Core GRADE 2〜5 + Dissemination bias 章** が判断基準を提供しています。`
    ),
    citationIds: [
      "coreGRADE2",
      "coreGRADE3",
      "coreGRADE4",
      "coreGRADE5",
      "disseminationBias",
    ],
  },

  S62: {
    narration: n(
      `**ダウングレードはどう評価するか** — 海外の資料では一行二行で済まされることがありますが、これだけでは初心者には分かりません。

**Core GRADE 2〜5 (Imprecision/Inconsistency/Risk of Bias/Indirectness)** の本文では各要因を一段ずつ判定するチェックリストが提供されています。委員・パネルは結果の意味を理解し、議論することが役割です。**使う側も理解していると、批判的吟味が可能** になり、鵜呑みにせずに済みます。`
    ),
    citationIds: ["coreGRADE2", "coreGRADE3", "coreGRADE4", "coreGRADE5"],
  },

  S63: {
    narration: n(
      `実際の SR 評価は **SR 班** が中心ですが、 **疑問 (CQ) の作成・アウトカム選定・最終的な確実性判定の合意** は **策定委員 (パネル)** の役割です。

「方法論は SR 班に任せる」だけでは責任放棄になります。パネルとして **方法論の中身を理解し、結果に責任を持つ** 必要があります。`
    ),
    citationIds: ["panelGRADE", "coreGRADE0"],
  },

  S64: {
    narration: n(
      `さあ、いよいよパネルの最も重要な仕事 — **推奨の作成と推奨の強さの決定** です。

**目的**: ガイドライン対象者にとって **具体的で分かりやすいレコメンデーション** を生成すること。
**事前準備**: 合意形成のルール (投票方式・定足数・過半数 or 80% など) を文書化しておく。`
    ),
    citationIds: ["recommendationGRADE", "coreGRADE7", "etdSchunemann2016"],
  },

  S65: {
    narration: n(
      `推奨には次の要素が必須です:

**誰が、どの強さで、何を推奨するのか**、そして **その根拠となるエビデンスの確実性**。

そして **推奨の方向 (すべき/すべきでない)** と **強さ (強い/条件付き=弱い)** を決定します。**「推奨する」 と書くだけでは不十分** で、強さを明示しなければ臨床医は判断に迷います。`
    ),
    citationIds: ["recommendationGRADE", "coreGRADE7"],
  },

  S66: {
    narration: n(
      `**強い推奨 vs 条件付き (弱い) 推奨** の違い:

**強い推奨**: 利益が害を **明らかに上回る** 状況。**ほとんどの患者に適用すべき**。臨床医は迷わず実施。
**条件付き (弱い) 推奨**: 利益と害のバランスが微妙、 **患者の価値観によって選択が変わる** 場合。共有意思決定 (SDM) を通じて、患者に応じて選ぶ。

「弱い」 は否定ではなく、**「価値観に応じて選ぶ余地がある」** という意味です。`
    ),
    citationIds: ["recommendationGRADE", "coreGRADE7", "etdSchunemann2016"],
  },

  S67: {
    narration: n(
      `推奨の方向と強さは、**3 つの基準** を総合的に判断して決定します:

**① 問題の重要性**、**② エビデンスの確実性**、**③ 利益と害のバランス**。

問題が重要で、確実性が高く、利益と害のバランスが良いほど **強い推奨** になりやすい。逆にどれかが揺らげば **条件付き (弱い)** に傾きます。`
    ),
    citationIds: ["recommendationGRADE", "coreGRADE7", "etdSchunemann2016"],
  },

  S68: {
    narration: n(
      `これらの判断を透明に行うためのツールが、 **Evidence-to-Decision (EtD) フレームワーク** です。

EtD では、**問題の重要性、利益、害、確実性、価値観、コスト、公平性、容認性、実行可能性** をすべて構造化された表に書き出します。

**「どこで議論が分かれ、どう決まったか」 が外から検証できる** — これが EtD の本質です。`
    ),
    citationIds: ["etdSchunemann2016", "coreGRADE7"],
  },

  S69: {
    narration: n(
      `利益と害のバランスを判断する際には、**各アウトカムの相対的重要性** を評価します。これは本来 **患者の価値観に関する研究 (定性研究や DCE 研究)** に基づくべきもの。

ガイドラインの付録に記載されていることがあるので、**ぜひ読んでみてください**。第 3 部で具体例を見ます。`
    ),
    citationIds: ["outcomeGRADE", "coreGRADE7", "etdSchunemann2016"],
  },

  S70: {
    narration: n(
      `推奨を作成する際には、**費用対効果、公平性、実行可能性** といった文脈的要素も理解する必要があります。

**条件付き推奨** は、望ましい効果と望ましくない効果のバランスが明確でない場合に使います。**「推奨なし」 を安易に選ばない** のもポイントです — 理由は次のスライドで。`
    ),
    citationIds: ["coreGRADE7", "noEvidenceGRADE", "etdSchunemann2016"],
  },

  S71: {
    narration: n(
      `**利益と害のバランス判定が難しい状況**:

エビデンスの確実性が低い、効果が拮抗、患者によって価値観が大きく異なる — こういう場面では意見が分かれます。

そこで **コンセンサスを目指しつつ、得られない場合は事前ルールに従って投票** で決定します。`
    ),
    citationIds: ["panelGRADE", "coreGRADE7", "etdSchunemann2016"],
  },

  S72: {
    narration: n(
      `投票ルールは状況により異なります。

**単純多数決で十分な場合** もあれば、**「強い推奨とするには 80% 以上の賛成が必要」** など厳しい基準を設ける場合もあります。

ルールを **事前に定めておく** ことで、後出しの操作を防ぎます。`
    ),
    citationIds: ["panelGRADE", "etdSchunemann2016"],
  },

  S73: {
    narration: n(
      `ここで **Good Practice Statement (GPS)** という用語が登場します。

**「エビデンスを詳細に評価するまでもなく、明らかに実施すべき」** 内容を書く際の声明形式です。例えば「医師は患者に説明同意を取るべき」 のような、評価する研究をやる必然性が無いようなもの。

ただし GPS は **5 つの厳しい原則** を満たす必要があります — 後で詳しく見ます。`
    ),
    citationIds: ["whoStatementTaxonomy", "recommendationGRADE", "coreGRADE7"],
  },

  S74: {
    narration: n(
      `ガイドラインは **作成して終わりではありません**。

完成前に **外部専門家によるピアレビュー**、公開後は **利用者からのフィードバック** を集めて、常に改善を目指します。

**Living Guideline (生きたガイドライン)** という考え方も広まっています — 重要エビデンスが更新されたら部分的に改訂し、文書を「生きた状態」 で維持する取り組みです。`
    ),
    citationIds: ["iom2011", "iomTrustworthy2011", "coreGRADE0"],
  },

  S75: {
    narration: n(
      `**「推奨なしは存在しない」** — Schünemann 先生の重要な考え方です。

エビデンスが不十分でも、 **専門家が集まったパネルが「現時点で考えられる最善の行動方針」 を提案する** ことに価値がある。

ただし現実には、**ミスリードしそうな場合は両方提案、あるいは「推奨なし」 を選ぶ** こともあります。「分からないなりに今できる最善はこれだ」 と示すのがパネルの責任です。`
    ),
    citationIds: ["noEvidenceGRADE", "recommendationGRADE", "coreGRADE7"],
  },

  S76: {
    narration: n(
      `**避けるべき推奨の表現**:

**「検討されることを提案する」「考慮しても良い」** といった **曖昧な表現** はダメです。臨床医は「結局やるの? やらないの?」 と困ります。

**報告とピアレビュー → 配布と実装 → 評価と更新** — このサイクルを回し続けるのがパネルの最終責務です。

ここまでで第 2 部は終了。お疲れ様でした。`
    ),
    citationIds: ["recommendationGRADE", "coreGRADE7", "iom2011"],
  },
};

// ---------------------------------------------------------------------------
// 第3部 (S77〜S106) — 推奨決定の深い考察
// speak.txt 35:04 〜 53:30 をベースに、ETD表・MID・絶対効果・相対重要性・
// アウトカム重み付け定量化を盛り込む。
// ---------------------------------------------------------------------------

const CONTENT_PART3 = {
  S77: {
    narration: n(
      `本日のメニュー最後、**第 3 部 「こんなことまで考えて、推奨を決定しています」** に進みます。

ここまでの内容を、より具体的なツール・考え方を通して見ていきます。 **使う側 (臨床医・読み手) もしっかりついてきてください** — ガイドラインを批判的に吟味するのに役立ちます。`
    ),
    citationIds: ["coreGRADE7", "etdSchunemann2016", "guyatt2023limaCpg"],
  },

  S78: {
    narration: n(
      `第 3 部で取り上げるのは **6 つのトピック** です:

**① ガイドライン作成の効率化 (ADOLOPMENT)**
**② 声明 (Statement) の分類**
**③ フォレストプロット の読み方**
**④ エビデンスプロファイル と SoF 表**
**⑤ EtD 表 の構造**
**⑥ アウトカムの相対的重要性 と MID — 厳密な評価**

専門的になりますが、ここがガイドラインの「舞台裏」 です。`
    ),
    citationIds: ["coreGRADE6", "coreGRADE7", "etdSchunemann2016"],
  },

  S79: {
    narration: n(
      `まず **作成の効率化 (GRADE-ADOLOPMENT)** です。ゼロからガイドラインを作るのは膨大な労力。

**既存の良質なガイドラインや SR を再利用・改変** する方法が **ADOLOPMENT (Adoption + Adaptation + de novo development)**。Schünemann 2016 が枠組みを提示しました。

「既存推奨をそのまま採用 / 一部改変 / 新規作成」 のどれにするかをフローチャートで判断します。`
    ),
    citationIds: ["etdSchunemann2016", "coreGRADE7"],
  },

  S80: {
    narration: n(
      `ガイドラインには **正式な推奨文以外にも複数の声明形式** があります。 WHO の文書を元に分類されています:

**① 推奨 (Recommendation)** — 正式、エビデンス紐付け必須
**② Good Practice Statement (GPS)** — 当然のことを書く
**③ Implementation Considerations** — 実装上の注意
**④ 美行 (Remarks)** — 解釈の補助
**⑤ 研究のみの推奨** — 研究文脈でのみ使用
**⑥ 非公式な推奨** — 信頼できない、避けるべき`
    ),
    citationIds: ["whoStatementTaxonomy", "recommendationGRADE", "coreGRADE7"],
  },

  S81: {
    narration: n(
      `具体例:

**推奨**: 「○○すべき」 と明確な行動を示す。
**GPS**: 「○○であるべき」 という一般原則。
**実装の事項**: 推奨を実施するための具体的条件・ヒント。

**目的によって書き方と位置付けが違う** — これを混同するとガイドラインの読み手が誤解します。`
    ),
    citationIds: ["whoStatementTaxonomy", "recommendationGRADE"],
  },

  S82: {
    narration: n(
      `**美行 (Remarks)** は推奨の解釈を助ける補足説明で、 **単独では成り立ちません**。「推奨 + Remarks」 がワンセットです。

**研究のみの推奨** は、エビデンスがまだ不十分なため、介入を **研究の文脈でのみ使用** するよう指定するもの。「実臨床ではまだ使わないでください」 という意味です。`
    ),
    citationIds: ["recommendationGRADE", "noEvidenceGRADE"],
  },

  S83: {
    narration: n(
      `**Good Practice Statement (GPS)** を発行するには **5 つの原則** を満たす必要があります:

① メッセージが明確で実施可能、② 実施しないことが明らかに有害、③ 直接的なエビデンス収集が困難または非倫理的、④ 推奨内容が間接的な根拠で十分支持される、⑤ 実施されないと害が大きい。

「医師は患者に説明同意を取るべき」 のような、**評価する RCT を組むこと自体が無意味** な内容に限られます。`
    ),
    citationIds: ["whoStatementTaxonomy", "recommendationGRADE"],
  },

  S84: {
    narration: n(
      `**Implementation Considerations と Tools・Hints** は、推奨を実施する際の具体的な方法・配慮事項を示します。

最後の **「非公式な推奨」** は、エビデンスとの結びつきが明確でないもの。**信頼できるガイドラインでは避けるべき** とされています。`
    ),
    citationIds: ["whoStatementTaxonomy", "guyatt2023limaCpg"],
  },

  S85: {
    narration: n(
      `次は **フォレストプロットの読み方** (再掲)。

メタ分析は単純合算ではなく、**各論文の症例数で重み付けして統合** します。

**重みが大きい研究 = 四角が大きい**、**信頼区間が短い研究 = 横線が短い (精確)**。最下段のひし形が **統合値**、ひし形の幅が 95% 信頼区間です。`
    ),
    citationIds: ["coreGRADE6", "cochraneHandbook"],
  },

  S86: {
    narration: n(
      `ひし形が **「効果なし (1 や 0) のライン」 をまたいでいないか** で統計学的有意差の有無を判断できます。

ただし **有意差の有無で 2 値判断するのは近年では推奨されていません** (Amrhein 2019, Nature)。診療ガイドラインでは **MID と CI の関係** を見るのが標準的なアプローチです。`
    ),
    citationIds: ["amrhein2019", "coreGRADE2", "midConcept"],
  },

  S87: {
    narration: n(
      `次は **エビデンスプロファイル と SoF 表** です。

**SoF (Summary of Findings) 表** = エビデンスの確実性を下げる 5 要因 + メタ分析結果を **アウトカムごとに一覧** にしたもの。**Cochrane ライブラリーで標準採用** されています。

**エビデンスプロファイル** = SoF よりも詳細な評価表で、**5 要因の評価を横に並べて見やすく** したもの。`
    ),
    citationIds: ["coreGRADE6", "cochraneHandbook"],
  },

  S88: {
    narration: n(
      `**確実性の評価手順** を概説します。

**RCT は 「高い」 から、観察研究は 「低い」 からスタート** し、5 要因に問題があれば段階的にダウングレード。観察研究には **3 つのアップグレード要因** (大きな効果 / 用量反応 / 交絡が結果を弱める方向) もあります。

最終的に **高 / 中 / 低 / 非常に低** の 4 段階。これがエビデンスプロファイルの完成形です。`
    ),
    citationIds: ["coreGRADE1", "coreGRADE0", "coreGRADE6"],
  },

  S89: {
    narration: n(
      `**仮想例**: 抗がん薬による完全寛解達成率を 4 つの RCT から評価。

論文数 4、デザイン RCT、総患者 330 名、メタ分析の **リスク比 1.62**。ここから 5 要因を順に判定していきます。

**バイアスのリスク (RoB)** — 一部論文で結果開示に偏りあり、ROBUST-RCT/RoB 2 で評価して **深刻な問題と判断** すれば 1 段階ダウン。`
    ),
    citationIds: ["coreGRADE4", "rob2", "robustRCT"],
  },

  S90: {
    narration: n(
      `**非一貫性** — 4 研究間で結果が大きく異なる、I² が高い → 1〜2 段階ダウン。
**非直接性** — 想定患者層と研究対象が一致しているか確認、ずれが大きければダウン。
**不精確さ** — 全症例数 330 と少なめ、信頼区間が広い、 **MID をまたぐ** ならダウン。
**出版バイアス** — 有意差なしの研究が報告されていない可能性が高ければさらにダウン。

これらをすべて評価して総合判定します。`
    ),
    citationIds: ["coreGRADE2", "coreGRADE3", "coreGRADE5", "disseminationBias"],
  },

  S91: {
    narration: n(
      `**最終的な確実性判定** — 高 / 中 / 低 / 非常に低 の 4 段階。

今回のケースは RCT スタートでしたが、結果のばらつきと症例数の少なさで **3 段階ダウンし「非常に低い」** と判定。

これが **GRADE アプローチによる厳密な評価の基本フロー** です。実運用では **感度分析や下げすぎ防止の配慮** も入ります。`
    ),
    citationIds: ["coreGRADE1", "coreGRADE2", "coreGRADE3", "coreGRADE6"],
  },

  S92: {
    narration: n(
      `他のアウトカム (例: 血圧低下) も同様の評価を行い、 **エビデンスプロファイル表** を完成させます。

これを簡略化したのが **SoF 表** で、Cochrane ライブラリーで結果要約として広く使われています。

SoF はアウトカムごとに **治療なしのリスク・治療ありのリスク・相対効果・確実性** を一覧化。**1 行を見れば、推奨の根拠の強さが一目で分かる** 優れたツールです。`
    ),
    citationIds: ["coreGRADE6", "cochraneHandbook"],
  },

  S93: {
    narration: n(
      `**SoF 表の例**: アウトカム「死亡」 で

| | 想定リスク | 治療リスク | 相対効果 | 確実性 |
|---|---|---|---|---|
| 死亡 | 100/1000 | 88/1000 | RR 0.88 | **低 (low)** |

下の脚注に **「バイアスのリスクと不正確さで 2 段階ダウン」** と書かれていれば、確実性が低い理由まで一目瞭然です。**論文を読むときも、SoF 表だけでも見る価値がある** 表です。`
    ),
    citationIds: ["coreGRADE6", "cochraneHandbook"],
  },

  S94: {
    narration: n(
      `次は **EtD (Evidence-to-Decision) 表**。

エビデンスだけでなく、**利益、害、患者の価値観、コスト** などを一覧にして、**パネルがどう推奨を決定したか** の思考プロセスを透明化する表です。

PICO の情報、問題の重要性、利益の大きさ — すべての項目が整理されています。`
    ),
    citationIds: ["etdSchunemann2016", "coreGRADE7"],
  },

  S95: {
    narration: n(
      `EtD の **価値観の項目** では、各アウトカムの相対的重要性が **参考文献付きで** 記載されます。

**利益と害のバランス、リソース・コスト** についてもエビデンスに基づいて判断が下されます。

**ここまで徹底的に整理して議論する** からこそ、信頼できる推奨が生まれます。`
    ),
    citationIds: ["etdSchunemann2016", "outcomeGRADE", "coreGRADE7"],
  },

  S96: {
    narration: n(
      `EtD 表の **判断の集約部分**: これまでの各項目の判断 (賛成/反対/不明) が一覧でまとめられています。

これを見れば **パネルが各項目をどう判断したか** が一目瞭然。透明性確保の最後のピースです。`
    ),
    citationIds: ["etdSchunemann2016", "coreGRADE7"],
  },

  S97: {
    narration: n(
      `総合判断に基づき、**最終的な推奨のタイプが決まり、投票** が行われます。

例: **強い推奨 / 6 人中 5 人が賛成** という記録が残る。

これを見ることで、**「なぜこの推奨が、この方向と強さで生まれたのか」 を外部から想像できる** — これが EtD の力で、ガイドラインの透明性を担保する核心です。`
    ),
    citationIds: ["etdSchunemann2016", "panelGRADE", "coreGRADE7"],
  },

  S98: {
    narration: n(
      `推奨は ETD 表だけ眺めて、 **何となく雰囲気で投票して、一致率だけ書く** ようなガイドラインも残念ながら多い。

しかし本来は **エビデンス、利益と害、価値観、コストを厳密に評価し、批判に耐えるルールと客観的プロセス** が求められます。

見た目だけ真似るのではなく、**理念とプロセスを理解する** ことが大事です。`
    ),
    citationIds: ["etdSchunemann2016", "guyatt2023limaCpg", "coreGRADE7"],
  },

  S99: {
    narration: n(
      `推奨の草案作成は **学術的なプロセス** です。完全に計算で決まるわけではなく、 **パネルでの議論** が重要です。

その議論の前提として **「統計学的有意差があるか/ないか」 という 2 元論から脱却** することが必要です。

**P 値 0.05 を少し超えたから効果なし、と結論付けてはいけない** — Amrhein 2019 (Nature) もこの主張です。`
    ),
    citationIds: ["amrhein2019", "coreGRADE2", "midConcept"],
  },

  S100: {
    narration: n(
      `では **仮想例** で推奨決定のプロセスを体験しましょう。

**A 薬 vs 対照 B 薬** の比較。 まず大事なのは **「相対評価ではなく絶対評価」** で判断することです。`
    ),
    citationIds: ["coreGRADE6", "coreGRADE7"],
  },

  S101: {
    narration: n(
      `**相対効果**: 全死亡やのハザード比 (HR) は 1 を下回るが、 **信頼区間が 1 をまたぐ** ので有意差なし。

しかし HR だけでは「実際に何人助かるのか」 が分かりません。**絶対効果** に翻訳する必要があります。`
    ),
    citationIds: ["coreGRADE6", "coreGRADE2"],
  },

  S102: {
    narration: n(
      `**絶対効果で示した表**:

A 薬を使うと **1000 人あたり死亡が 12 人減り、再発が 17 人減る** という推定値。
ただし信頼区間は **+ から − まで幅広く、エビデンスの確実性は低い**。
**有害事象は 59.5 人増える**。

「効果はありそう、しかし確実性が低く、害も増える」 — 悩ましい状況です。`
    ),
    citationIds: ["coreGRADE6", "coreGRADE2", "coreGRADE7"],
  },

  S103: {
    narration: n(
      `多くのパネルは **「確実性が低いから弱い推奨、しかし死亡や再発を減らす効果を重視して A 薬を弱く推奨」** と判断しがちです。

しかしこれは **アウトカムを同列に扱った直感判断**。 より厳密に評価すると、違う結論が見えるかもしれません。

キーポイントは **アウトカムの相対的重要性に注目すること**。`
    ),
    citationIds: ["outcomeGRADE", "coreGRADE7", "etdSchunemann2016"],
  },

  S104: {
    narration: n(
      `**より厳密な手順**:

① 各アウトカムの **相対的重要性** を決める。死亡 = 1 とすると、再発や遠隔転移は 0.5 など。
② この **重み付けで利益と害のバランスを計算** する。

計算した結果、たとえば **+34.5 (害優位)** と出ることがあります。`
    ),
    citationIds: ["outcomeGRADE", "coreGRADE7", "midConcept"],
  },

  S105: {
    narration: n(
      `定量的に評価すると、 **直感では利益優位だったケースが、実は害優位** という結論になることがあります。

ここまで定量化できなくても、 **臨床的に意味のある最小差 (MID)** を設定し、**メタ分析の結果が MID とどういう関係にあるか** を評価することは非常に重要です。**絶対効果を使う** のは、ベースラインリスクを反映できる利点があるからです。`
    ),
    citationIds: ["midConcept", "coreGRADE2", "coreGRADE7", "guyatt2025Threshold"],
  },

  S106: {
    narration: n(
      `**最後にもう一度 EBM とは** — Sackett 1996 の定義を読み直します。

**「個々の患者のケアに関する意思決定において、現在得られる最良の根拠を、良心的に、明示的に、思慮深く用いること」**

そして **診療ガイドラインの定義** はこう続きます: 「SR と利益と害の評価に基づき、患者ケアを最適化する推奨を含む文書」。

**診療ガイドラインは患者集団を想定した文書** です。それを **目の前の個々の患者に適用するのが EBM** — この往復関係こそが、私たちが今日学んだことの全てです。

**ガイドラインを使う側も作る側も、Core GRADE の枠組みを理解していれば、信頼できるものとそうでないものが見抜ける**。今日から実践してください。お疲れ様でした。`
    ),
    citationIds: [
      "sackett1996",
      "iom2011",
      "coreGRADE0",
      "coreGRADE7",
      "guyatt2023limaCpg",
      "guyattLecture2025",
    ],
  },
};

// ---------------------------------------------------------------------------
// イントロ N1〜N25 を speak.txt の入口にスムーズにつなげる調整。
// 既存の N1〜N25 (5 研究タイプ × 4 スライドの大規模対比) は冗長すぎるため、
// **N1〜N4 のみを残し、その後すぐに speak.txt の冒頭 (S1 = 講演開始)** へ繋がる
// 形にする。N5 以降は narration を「次のスライドへ」 と促す軽い橋渡しに変更。
// (visual そのものは差し替えていない — UI 制御で省略表示することは可能。)
// ---------------------------------------------------------------------------

const CONTENT_INTRO = {
  N1: {
    narration: n(
      `想像してみてください。学会で最新 RCT の結果がこう発表されたとします — **「X 薬は対照群と比較し、無増悪生存期間 (PFS) を有意に延長 (HR 0.65, 95%CI 0.52〜0.81, P<0.001)。副作用は管理可能、QOL も維持。X 薬は新たな標準治療となるべきである」**。

すごい結果に見えます。けれど、 **これだけで本当に標準治療と結論してよいのでしょうか?** ―― 今日のセッションは、この問いから始まります。`
    ),
    citationIds: ["sackett1996", "usersGuides2015", "coreGRADE1"],
  },
  N2: {
    narration: n(
      `「効果あり」 と即断する前に **6 つの確認** をしましょう。

**① この 1 つの RCT だけで判断してよいか?**
**② 反対する研究は本当に存在しないか?**
**③ この RCT 自体にバイアスはないか? (ランダム化・盲検化・脱落・追跡)**
**④ 患者にとって重要なアウトカムが評価されているか? (PFS は代替指標。OS、QOL は?)**
**⑤ 益だけでなく、害はどう評価されたか?**
**⑥ コスト・患者の価値観・実行可能性は考慮されたか?**

これらは EBM の 3 原則から自然に導かれます。`
    ),
    citationIds: ["usersGuides2015", "coreGRADE1", "guyatt2023sixQuestions"],
  },
  N3: {
    narration: n(
      `本日の講師は **「ガイアット先生」 になりきった私** です。Gordon Guyatt — 米国 EBM の祖の一人、Core GRADE の中心人物 — の講演 (2025年12月) と Q&A、そして Core GRADE 0〜7 シリーズを下敷きに、**できる限りそのスタイルで** お話しします。

「単一研究に飛びつかない」 「不確実性を明示する」 「患者価値観を組み込む」 — この 3 つを通底のテーマとして、本編に入ります。

**注意:** 私は架空の教育用キャラクターです。Guyatt 本人の発言とは異なる解釈が混じる可能性がある点だけご了承ください。`
    ),
    warnings: [
      "本講師は Guyatt GH 教授の講演と Core GRADE 文献を学習した教育用 AI です。実在人物の発言と完全に一致するものではありません。",
    ],
    citationIds: [
      "guyattLecture2025",
      "guyattQA",
      "coreGRADE0",
      "guyatt2023sixQuestions",
    ],
  },
  N4: {
    narration: n(
      `ここから本編です。**講演の冒頭 (slide 1)** に飛びます。

これから 50 分ほど、診療ガイドラインの **定義 → 作成プロセス → 推奨決定の舞台裏** を一緒に学びます。スマホ表示でも本文が読めるよう、A 大/中/小 のボタンで文字サイズを切り替えられます。

それでは始めましょう。`
    ),
    citationIds: ["coreGRADE0", "iom2011", "guyattLecture2025"],
  },
  // N5〜N25 はそのまま残しつつ、narration を 「ここはオプショナルな寄り道セクションです」と
  // 控えめに書き換え (5 研究タイプ × 4 スライド対比は本編の前置きとして長すぎるため、
  // 読みたい人向けの追加章扱いに)。speakerNotes に元の解説を残しても良いが、
  // ここでは narration をシンプルにする。
};

const NSKIP_NARRATION = n(
  `(このスライドは、本編 (S1〜) に入る前のオプション章です。speak.txt 講演の本筋は S1 から始まりますので、お急ぎの方は読み飛ばして次のスライドに進んでください。)`
);

for (let i = 5; i <= 25; i += 1) {
  CONTENT_INTRO[`N${i}`] = {
    narration: NSKIP_NARRATION,
    citationIds: ["coreGRADE0", "guyattLecture2025"],
  };
}

// ---------------------------------------------------------------------------
// メイン
// ---------------------------------------------------------------------------

function applyOverride(slide, override) {
  if (override.narration) slide.narration = override.narration;
  if (override.citationIds) slide.citationIds = override.citationIds;
  if (override.warnings) slide.warnings = override.warnings;
  if (override.visual) slide.visual = override.visual;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const all = args.size === 0;
  const doIntro = all || args.has("--intro");
  const doPart1 = all || args.has("--part1");
  const doPart2 = all || args.has("--part2");
  const doPart3 = all || args.has("--part3");

  const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));

  // citations 拡張 (常に実行)
  for (const [id, c] of Object.entries(ADDITIONAL_CITATIONS)) {
    if (!data.citations[id]) {
      data.citations[id] = c;
    }
  }

  let updated = 0;
  for (const slide of data.slides) {
    let override;
    if (doIntro && CONTENT_INTRO[slide.id]) override = CONTENT_INTRO[slide.id];
    if (doPart1 && CONTENT_PART1[slide.id]) override = CONTENT_PART1[slide.id];
    if (doPart2 && CONTENT_PART2[slide.id]) override = CONTENT_PART2[slide.id];
    if (doPart3 && CONTENT_PART3[slide.id]) override = CONTENT_PART3[slide.id];
    if (override) {
      applyOverride(slide, override);
      updated += 1;
    }
  }

  fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`[rewrite-narrations] updated narrations on ${updated} slides`);
  console.log(
    `[rewrite-narrations] citations now: ${Object.keys(data.citations).length}`
  );
}

main();
