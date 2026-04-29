#!/usr/bin/env node
// イントロ N1〜N23 を「A薬講演 — それはエビデンスか宣伝か」の批判的吟味
// 会話原稿で書き直す。登場人物: 座長 / 発表者 / G先生 (Gordon Guyatt 教授と
// GRADE Working Group の考え方をベースにした架空の EBM・GRADE 教育キャラクター)。
//
// 構成:
//   N1   冒頭の三者会話 (PICO 要求)
//   N2   6つの確認 (G先生)
//   N3   G先生 紹介
//   N4   基礎研究 ① 悪い発表
//   N5   基礎研究 ② 4 つの問題点
//   N6   基礎研究 ③ G先生の言い換え
//   N7   基礎研究 ④ 何が違うのか
//   N8   RCT ① 悪い発表
//   N9   RCT ② 3 つの問題点
//   N10  RCT ③ G先生の言い換え
//   N11  RCT ④ 何が違うのか
//   N12  SR/MA ① 悪い発表
//   N13  SR/MA ② 3 つの問題点
//   N14  SR/MA ③ G先生の言い換え
//   N15  SR/MA ④ 何が違うのか
//   N16  CPG ① 悪い発表
//   N17  CPG ② 3 つの問題点
//   N18  CPG ③ G先生の言い換え
//   N19  CPG ④ 何が違うのか
//   N20  まとめの会話 (座長 / G先生)
//   N21  最終メッセージ (G先生)
//   N22  本編へのロードマップ
//
// 実行後、必要なら `node scripts/rewrite-narrations.mjs --part1` などで本編
// 側の narration を再適用する。

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

const SECTION = "0. 導入：A薬の発表をどう読むべきか";

/** Build a dialogue narration string from an array of {speaker, text}. */
function dialogue(turns) {
  return turns
    .map((t) => `**${t.speaker}**\n${t.text}`)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// 4 つの研究タイプ
// ---------------------------------------------------------------------------

function fourSlideSet(c) {
  return [
    {
      id: `N_${c.key}_traditional`,
      section: SECTION,
      title: `${c.label} ① 悪い発表例`,
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
      title: `${c.label} ② 批判的コメント`,
      visual: {
        type: "card",
        data: {
          heading: "G先生による批判的コメント",
          bullets: c.problems,
          accent: "warning",
        },
      },
      narration: c.problemsDialogue,
      citationIds: c.citationIds,
    },
    {
      id: `N_${c.key}_proper`,
      section: SECTION,
      title: `${c.label} ③ G先生の言い換え`,
      visual: {
        type: "image",
        data: {
          src: c.rightImg,
          alt: `G先生による ${c.label} GRADE-based 発表スライド`,
          caption: c.proper,
        },
      },
      narration: c.properDialogue,
      citationIds: c.citationIds,
    },
    {
      id: `N_${c.key}_diff`,
      section: SECTION,
      title: `${c.label} ④ 何が違うのか`,
      visual: {
        type: "comparison",
        data: {
          leftHeader: "悪い発表",
          rightHeader: "G先生（GRADE）",
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
    traditional:
      "「A薬はマウス脳スライスで GABA 放出を 48% 抑制 → 明確な作用機序がある」",
    proper:
      "「A薬はマウス in vitro で機序仮説を支持。ヒト有効性は未検証、確実性=very low / 臨床判断には使用不能」",
    problems: [
      "**SR ではなく自分たちの一研究**: 利用可能な基礎研究全体を系統的に集めた評価ではない",
      "**配下の研究者・確証バイアス**: 自分の教室・自分の仮説が無意識に解釈を傾ける (知的 COI)",
      "**マウス・in vitro・代用指標**: GABA 放出 48% 低下が、症状改善・QOL・入院・死亡に意味するかは判断不能",
      "**基礎で有望でも臨床に届かない**: 動物・細胞で効いてもヒトで効かないことが繰り返されている",
    ],
    differences: [
      {
        left: "「自分の教室の大学院生の研究」を前面に",
        right: "**基礎研究全体の SR** がベースか確認",
      },
      {
        left: "GABA 放出 48% 低下 → 「効く」と外挿",
        right: "**患者重要アウトカム (症状・QOL・死亡)** で議論",
      },
      {
        left: "p値が有意 = 臨床的意味あり",
        right: "**機序の仮説 ≠ 臨床効果**",
      },
      {
        left: "確実性に言及なし",
        right: "**Very low / 臨床判断には使用不能** と明示",
      },
      {
        left: "「メカニズムが分かった」と断定",
        right: "**ヒトでの有効性・安全性は未検証** と明示",
      },
    ],
    citationIds: ["coreGRADE5", "coreGRADE0", "guyattLecture2025"],
    traditionalDialogue: dialogue([
      {
        speaker: "発表者",
        text:
          "まず、これは私のところの大学院生の●●先生が行ってくれた研究です。マウスの急性脳スライスを用いた patch-clamp 実験で、A薬は B シナプスからの C 伝達物質、具体的には **GABA 放出を抑制する** ことがわかりました。\n\nvehicle と比較して、GABA 作動性 IPSC の頻度は約 **48% 低下**、p 値も有意でした。したがって、A薬には **明確な作用機序がある** と考えられます。",
      },
      {
        speaker: "G先生",
        text:
          "ここが最初の大きな問題です。\n\nこの発表は一見、科学的に見えます。patch-clamp、マウス脳スライス、GABA 放出、p 値 — 専門的で説得力があるように聞こえる。しかし、**臨床意思決定の根拠** として見ると、これはまだ **仮説生成** にすぎません。",
      },
    ]),
    problemsDialogue: dialogue([
      {
        speaker: "G先生",
        text:
          "順に整理します。\n\n**ポイント1: これはシステマティックレビューではない**\nまず確認すべきは、この基礎研究が、利用可能な基礎研究全体を **系統的に集めて評価したもの** か、という点。答えは通常そうではありません。「私のところの大学院生が行った研究」 は **自分たちの研究の紹介** であって、全体を公平に集めたものではない。発表者にとって都合のよい結果が選ばれている可能性があります。",
      },
      {
        speaker: "G先生",
        text:
          "**ポイント2: 配下の研究者という構造的バイアス**\n金銭的 COI とは違う **知的 COI / 確証バイアス** の問題です。自分の仮説を支持する結果を、自分の配下の研究者が示し、それを臨床効果の根拠として前面に出す — 悪意の問題ではなく、人間は自分の研究・教室・仮説に自然に好意的になります。だからこそ EBM では **独立した再現性・系統的レビュー・患者アウトカム** が重要なのです。",
      },
      {
        speaker: "G先生",
        text:
          "**ポイント3: マウス・in vitro・代用指標**\nここで示されたのは「マウスで・脳スライスで・GABA 放出が・電気生理学的に変化した」ということ。患者にとって重要なのは **症状の改善・QOL・入院・死亡・有害事象** です。GABA 放出が 48% 低下したとしても、それが患者にとって良いか悪いか、あるいは臨床的に無意味か、このデータからは判断できません。",
      },
      {
        speaker: "G先生",
        text:
          "**ポイント4: 基礎研究の多くは臨床効果に到達しない**\nこれは医学研究の歴史で繰り返されてきた事実です。動物で効く、細胞で効く、機序は美しい — しかし、患者では効かない、あるいは害がある。\n\nしたがって基礎研究は重要ですが、それは **「臨床効果がある」という証明ではなく、「臨床で検証すべき仮説」** にすぎません。",
      },
    ]),
    properDialogue: dialogue([
      {
        speaker: "G先生",
        text:
          "ですから、このスライドを出すなら、こう言うべきです。\n\n> A薬はマウス in vitro 実験において、GABA 作動性シナプスからの GABA 放出を抑制した。これは **作用機序に関する仮説を支持する**。しかし、ヒトでの有効性、安全性、患者重要アウトカムへの効果は、このデータからは推論できない。**GRADE 上の臨床的確実性は very low、あるいは臨床判断には使用不能** である。\n\n「Hypothesis only」「ヒト有効性は未検証」「臨床判断には使えない」 — そう明示するのが正しいのです。",
      },
    ]),
    diffDialogue: dialogue([
      {
        speaker: "G先生",
        text:
          "違いの本質は **段階を区別する** こと。基礎研究は仮説生成、RCT は効果検証、メタ解析は総合判断 — 役割が違います。**メカニズムが分かれば効くはず** は通用しません。Core GRADE 5 (Indirectness) でも、メカニズム情報は推奨を支持する **補助的情報** にしかならないと明確にされています。基礎研究は重要ですが、**臨床効果の根拠としては独立で立てない** のです。",
      },
    ]),
  },

  // ===================== RCT =====================
  {
    key: "rct",
    label: "RCT",
    leftImg: "/images/intro/rct.jpg",
    rightImg: "/images/intro/rct-g.jpg",
    traditional:
      "「Yuasa らの多施設 RCT で A薬は標準治療に対し奏効率 3.0 倍、調整 OR 3.02、p<0.001」",
    proper:
      "「24週奏効率の絶対差 27.2pt、NNT≒3.7。ただしオープンラベル試験のためバイアスリスクあり、確実性は高くない」",
    problems: [
      "**相対効果だけを強調**: 「3 倍」 は OR。臨床家・患者には絶対効果と NNT が必要 (絶対差 27.2pt、NNT≒3.7)",
      "**アウトカムの意味**: 24 週奏効率は患者にとって本当に重要か？ 死亡・QOL・日常生活機能とどう対応？ 代用アウトカムなら慎重評価",
      "**オープンラベル**: 主観評価項目を含む試験で盲検化なし → 過大評価が起こりうる。確実性は高いとは言えない",
    ],
    differences: [
      {
        left: "「**3 倍効果**」 (OR を強調)",
        right: "**絶対差・NNT** で提示 (27.2pt、NNT≒3.7)",
      },
      {
        left: "主要評価項目の意味は不問",
        right: "**患者重要アウトカム** (死亡・QOL) との対応を確認",
      },
      {
        left: "盲検化に言及なし",
        right: "**オープンラベル → 過大評価リスク** を明示",
      },
      {
        left: "「明らかに有効」 と断定",
        right: "**確実性は高くない** とバイアスリスクを併記",
      },
    ],
    citationIds: [
      "coreGRADE1",
      "coreGRADE4",
      "robustRCT",
      "usersGuides2015",
    ],
    traditionalDialogue: dialogue([
      {
        speaker: "発表者",
        text:
          "次に RCT です。Yuasa らの多施設共同 RCT では、A薬は標準治療に対して **主要評価項目で 3.0 倍の効果** を示しました。A薬群の奏効率は **58.6%**、対照群は **31.4%** で、調整 OR は **3.02**、**p<0.001**。したがって、**A薬は明らかに有効** です。",
      },
      {
        speaker: "G先生",
        text:
          "ここでも注意が必要です。RCT は基礎研究より臨床判断に近い重要なエビデンスです。しかし **「RCT だから信じてよい」 わけではない**。\n\nまず問うべきは — **「3 倍」 とは何の 3 倍か** です。",
      },
    ]),
    problemsDialogue: dialogue([
      {
        speaker: "G先生",
        text:
          "**ポイント1: 相対効果だけを強調している**\n「3 倍効く」 は OR でしょう。臨床家や患者には **絶対効果** が重要です。\n\nこの試験では奏効率 58.6% vs 31.4%。**絶対差は 27.2 ポイント、NNT は約 3.7**。相対効果だけでなく、**絶対リスク差と NNT** を必ず提示する必要があります。",
      },
      {
        speaker: "G先生",
        text:
          "**ポイント2: アウトカムの意味**\n主要評価項目は「24 週奏効率」 — これは患者にとって本当に重要なアウトカムですか？ **死亡・重篤合併症・QOL・日常生活機能・症状改善** と、どの程度対応しているのか。単なるスコア改善や代用アウトカムであれば、臨床的意味は慎重に評価する必要があります。",
      },
      {
        speaker: "G先生",
        text:
          "**ポイント3: オープンラベルの問題**\nこの RCT は **盲検化されていない** オープンラベル試験です。主要評価項目が主観的要素を含む場合、盲検化なしでは **過大評価** が起こりえる。患者も医師も A薬を使っていると知っていれば、評価は良い方向に傾きます。\n\nつまり、無批判に 「A薬は 3 倍効く」 と宣伝するのは適切ではありません。",
      },
    ]),
    properDialogue: dialogue([
      {
        speaker: "G先生",
        text:
          "より正確には、こう言うべきです。\n\n> 多施設 RCT では、A薬群で 24 週奏効率が標準治療群より高かった。**絶対差 27.2pt、NNT≒3.7** で、効果は臨床的に意味がある可能性がある。ただし、**オープンラベル** 試験であり、主観的評価項目では **過大評価の可能性** がある。したがって **エビデンスの確実性は高いとは言えず**、バイアスリスクを考慮して評価する必要がある。\n\nこれが RCT の正しい読み方です。",
      },
    ]),
    diffDialogue: dialogue([
      {
        speaker: "G先生",
        text:
          "違いは 6 軸です。\n①効果指標 (相対のみ → 絶対差・NNT も)、\n②アウトカム (代用 → 患者重要)、\n③盲検化 (不問 → リスク明示)、\n④確実性 (なし → GRADE)、\n⑤益と害 (益のみ → 両方)、\n⑥推奨の構造 (断定 → 方向と強さ)。\n\nEBM の原則 (Sackett 1996, Users' Guides 2015) — 「単一研究に飛びつかない」「不確実性を明示する」「患者価値観を組み込む」 を要求するから、自然とこの形になります。",
      },
    ]),
  },

  // ===================== SR/メタ解析 =====================
  {
    key: "sr",
    label: "SR / メタ解析",
    leftImg: "/images/intro/sr.jpg",
    rightImg: "/images/intro/sr-g.jpg",
    traditional:
      "「12 件の RCT、3,820 例を統合: 統合 OR 2.45 (95%CI 1.65-3.65) — 高エビデンスで有効性確認」",
    proper:
      "「統合 OR 2.45 だが I²=72% と異質性大、含まれる試験にバイアスリスクあり → GRADE 確実性 = low、推定効果に相当な不確実性が残る」",
    problems: [
      "**SR/MA = 高確実性ではない**: 含まれる研究が小規模・非盲検・バイアスリスク高・結果がばらばら・CI 広・出版バイアス疑い ならば low / very low になる (garbage in, garbage out)",
      "**異質性 (I²=72%)**: 試験間で効果にばらつき。対象患者・併用治療・評価期間・盲検化の違い? 「すべての患者に同じように効く」 とは言えない",
      "**GRADE で 1〜2 段階下がる**: risk of bias で 1 段階、inconsistency で 1 段階下げると確実性は **low** に。「有意差あった」 ではなく 「low で不確実性が残る」 が正しい結論",
    ],
    differences: [
      {
        left: "**「エビデンスレベル最高」**",
        right: "**SR/MA でも内部の質次第で low / very low**",
      },
      {
        left: "I² に言及なし or 軽い",
        right: "**異質性 (I²=72%) を理由・解釈つきで提示**",
      },
      {
        left: "「有意差あった = 確認」",
        right: "**「効果あり」 と 「効果がどれくらい確かか」 を区別**",
      },
      {
        left: "出版バイアス・含まれる試験の質に無関心",
        right: "**GRADE 5 要因をすべて適用**",
      },
    ],
    citationIds: [
      "coreGRADE1",
      "coreGRADE2",
      "coreGRADE3",
      "coreGRADE4",
      "disseminationBias",
    ],
    traditionalDialogue: dialogue([
      {
        speaker: "発表者",
        text:
          "さらに、**エビデンスレベルが最も高い** システマティックレビュー / メタ解析でも、A薬の有効性が確認されています。**12 件の RCT、3,820 例** を統合した結果、統合 OR は **2.45**、95% CI は **1.65〜3.65** で有意差がありました。したがって、**A薬の有効性は高いエビデンスレベルで確認された** と言えます。",
      },
      {
        speaker: "G先生",
        text:
          "これは非常によくある宣伝の仕方です。しかし GRADE の考え方では不十分。まず **「エビデンスレベルが高い SR」** という言い方自体に注意が必要です。\n\n昔のエビデンスピラミッド (SR/MA → RCT → コホート → 症例対照 → 症例報告) は、研究デザインだけで上下を決める説明でした。しかし現在の GRADE では、重要なのは **研究デザインのラベルではなく、アウトカムごとのエビデンスの確実性** です。",
      },
    ]),
    problemsDialogue: dialogue([
      {
        speaker: "G先生",
        text:
          "**ポイント1: SR/MA だから高確実性ではない**\nシステマティックレビューであっても、中に含まれる研究が — 小規模 / 非盲検 / バイアスリスク高 / 結果がばらばら / CI 広 / 出版バイアス疑い — であれば、確実性は low にも very low にもなります。\n\n**SR/MA = 高エビデンスではありません**。**garbage in, garbage out**。質の低い研究を統合しても、質の高い結論にはなりません。",
      },
      {
        speaker: "G先生",
        text:
          "**ポイント2: 異質性が大きい**\nこのスライドでは I² が **72%** とされています。これはかなり大きな異質性です。試験間で効果にばらつきがある — 対象患者が違うのか、併用治療が違うのか、評価期間か、盲検化の有無が影響しているのか。理由を検討しなければなりません。\n\n統合 OR が 2.45 で有意だったとしても、**「すべての患者に同じように効く」 とは言えません**。",
      },
      {
        speaker: "G先生",
        text:
          "**ポイント3: GRADE では low になりうる**\nこの SR/MA を GRADE で評価すると、例えば **risk of bias で 1 段階**、**inconsistency で 1 段階** 下げる判断になりえます。結果として確実性は **low**。\n\n正しい表現は 「SR で有意差があった」 ではなく、**「統合効果は A薬を支持したが、異質性が大きく、含まれる試験のバイアスリスクもあるため、確実性は low」** です。",
      },
    ]),
    properDialogue: dialogue([
      {
        speaker: "G先生",
        text:
          "この場面では、こう言うべきです。\n\n> 12 件の RCT を統合した SR/MA では、A薬は標準治療より有効である可能性が示された。統合 OR は 2.45 で統計学的には有意だった。しかし **I²=72% と異質性が大きく**、オープンラベル試験を含むため **バイアスリスク** もある。したがって **GRADE での確実性は low** と評価される。**結果は有望だが、推定効果には相当な不確実性が残る**。\n\nこれが GRADE 的な読み方です。",
      },
    ]),
    diffDialogue: dialogue([
      {
        speaker: "G先生",
        text:
          "SR/MA の核心的な違いは — **「効果がある/ない」 と 「効果がどれくらい確かか」 を区別する** こと。従来型は前者だけ。GRADE は両方を提示します。\n\n5 要因 (バイアス・非一貫性・非直接性・不精確さ・出版バイアス) を Core GRADE 1〜6 のチェックリストで評価する。完全な客観ではないが、**再現可能で透明** — それが GRADE の強みです。",
      },
    ]),
  },

  // ===================== CPG =====================
  {
    key: "cpg",
    label: "診療ガイドライン",
    leftImg: "/images/intro/cpg.jpg",
    rightImg: "/images/intro/cpg-g.jpg",
    traditional:
      "「●学会の診療ガイドライン 2026 で A薬は推奨。日常診療でも積極的に使用すべき」",
    proper:
      "「●学会 CPG 2026 では A薬は **提案 (suggest)**、つまり **条件付き推奨** で根拠は **low certainty**。一律投与ではなく Shared Decision Making で判断すべき」",
    problems: [
      "**推奨の強さ (recommend vs suggest)**: 「提案する」 は GRADE で **suggest = 条件付き推奨**。「ガイドラインで推奨されているから全員に使うべき」 は誤読",
      "**エビデンスの確実性 (low)**: 推奨の根拠となる確実性が low → 多くの患者にとって妥当な選択肢の一つかもしれないが、一律投与ではない",
      "**Shared Decision Making が必要**: 期待される益・確実性・副作用・費用・患者の価値観 を説明し、患者と一緒に決める。CPG は意思決定を助ける道具で、医師と患者の判断を置き換えない",
    ],
    differences: [
      {
        left: "「推奨されている = 全員に使うべき」",
        right: "**suggest (条件付き) と recommend (強い) を区別**",
      },
      {
        left: "確実性に言及なし",
        right: "**low certainty を明示**",
      },
      {
        left: "ガイドラインを臨床判断に置き換える",
        right: "**SDM (Shared Decision Making) を促す道具**",
      },
      {
        left: "プロセス不透明",
        right: "**SR + EtD + 確実性 + 推奨の強さ + 価値観**",
      },
    ],
    citationIds: [
      "iom2011",
      "etdSchunemann2016",
      "guyatt2023sixQuestions",
      "guyatt2023limaCpg",
    ],
    traditionalDialogue: dialogue([
      {
        speaker: "発表者",
        text:
          "最後に、**●学会の診療ガイドライン 2026** でも、A薬は推奨されています。診療ガイドラインで推奨されているわけですから、**日常診療でも A薬を積極的に使用すべき** と考えます。",
      },
      {
        speaker: "G先生",
        text:
          "ここも非常に重要です。「ガイドラインで推奨されている」 という言葉は、臨床現場では強い説得力を持ちます。\n\nしかし GRADE では、ガイドラインの推奨を読むときに必ず **2 つの軸を分け** ます。1つ目は **推奨の強さ**、2つ目は **エビデンスの確実性** です。",
      },
    ]),
    problemsDialogue: dialogue([
      {
        speaker: "G先生",
        text:
          "**ポイント1: 推奨は strong か conditional か**\nこのガイドラインの推奨文を見ると、実は 「A薬の投与を **提案する**」 となっています。GRADE の用語では **recommend ではなく suggest** — 強い推奨ではなく **条件付き推奨**。\n\n「ガイドラインで推奨されているから全員に使うべき」 という読み方は、ここで **間違い** です。",
      },
      {
        speaker: "G先生",
        text:
          "**ポイント2: エビデンスの確実性は low**\nさらに、推奨の根拠となる確実性は **low**。条件付き推奨かつ low certainty ということは — **多くの患者にとって A薬は妥当な選択肢の一つかもしれないが、すべての患者に一律に投与すべきという意味ではない**、ということです。",
      },
      {
        speaker: "G先生",
        text:
          "**ポイント3: Shared Decision Making が必要**\nこのような場合に必要なのは SDM (Shared Decision Making) です。患者に対して — 期待される利益はどの程度か / その確実性は / 副作用や負担は / 費用は / 患者本人がどのアウトカムを重視するか — を説明し、**患者と一緒に決める**。\n\nガイドラインは **意思決定を助ける道具** であって、医師と患者の判断を置き換えるものではありません。",
      },
    ]),
    properDialogue: dialogue([
      {
        speaker: "G先生",
        text:
          "したがって、このガイドラインの正しい読み方はこうです。\n\n> ●学会診療ガイドライン 2026 では、A薬は標準治療への上乗せとして **「提案する」** とされている。ただしこれは **強い推奨ではなく条件付き推奨** であり、根拠となる **確実性は low**。したがって A薬は全患者に一律に投与すべき治療ではなく、**患者の価値観・期待される絶対効果・有害事象・費用・治療負担** を踏まえて Shared Decision Making により判断すべきである。",
      },
    ]),
    diffDialogue: dialogue([
      {
        speaker: "G先生",
        text:
          "CPG が AI-EBM スタイルでいちばん輝く理由は — **ガイドラインは政策** だから。多くの臨床現場の判断を左右するからこそ、「専門家の合意」 で済ませず、**SR + EtD + 確実性 + 推奨の強さ** を構造化して開示する責任があります。\n\n臨床医側は **Guyatt 2023 の 6 質問** を覚えておくと、目の前のガイドラインをすぐ評価できます — Q5 (推奨の強さはエビデンスの確実性と整合しているか?) が特に重要です。",
      },
    ]),
  },
];

// ---------------------------------------------------------------------------
// 冒頭・締めくくりのスライド
// ---------------------------------------------------------------------------

const newIntro = [
  // -------- N1 冒頭 (座長/発表者/G先生) --------
  {
    id: "N1",
    section: SECTION,
    title: "「A薬の発表をどう読むべきか — それはエビデンスか、宣伝か」",
    visual: {
      type: "card",
      data: {
        heading: "演題：「A薬の有効性について」",
        bullets: [
          "**基礎研究 → RCT → SR/メタ解析 → 診療ガイドライン** の順に紹介します",
          "Phase III RCT で **OR 3.02 (p<0.001)**、SR/MA でも有意差、CPG でも推奨",
          "**結論：A薬は新たな標準治療となるべきである**",
        ],
        accent: "warning",
      },
    },
    narration: dialogue([
      {
        speaker: "座長",
        text: "それでは、A薬の有効性についてご発表をお願いします。",
      },
      {
        speaker: "発表者",
        text:
          "ありがとうございます。本日は、A薬がいかに有効であるかについて、**基礎研究、RCT、システマティックレビュー、そして診療ガイドラインの推奨** まで含めてご紹介します。",
      },
      {
        speaker: "G先生",
        text:
          "少し待ってください。今の言い方だけでも注意が必要です。\n\n「基礎研究、RCT、SR、ガイドラインがある」 という並べ方は、一見すると強そうに見えます。しかし EBM では、**エビデンスを数珠つなぎに並べるだけでは不十分** です。\n\n重要なのは — **どの患者に、何と比較して、どの患者重要アウトカムが、どの程度改善し、その確実性はどの程度か**。つまり、**まず PICO が必要** です。",
      },
    ]),
    speakerNotes:
      "聴衆に問いかけて 5〜10 秒、考える時間をとる。発表者は架空、G先生も架空の教育用キャラクター (架空の Guyatt 風人格) であることを後で明示。",
    citationIds: ["sackett1996", "usersGuides2015", "coreGRADE1"],
  },

  // -------- N2 6 つの確認 --------
  {
    id: "N2",
    section: SECTION,
    title: "「効果あり」 と即断する前に — 6 つの確認",
    visual: {
      type: "table",
      data: {
        headers: ["#", "確認すべき問い"],
        rows: [
          ["1", "この**1つの研究だけ**で判断してよいか?"],
          ["2", "この結果を**支持しない／反対する研究**は本当に存在しないか?"],
          ["3", "この研究自体に**バイアス**はないか? (ランダム化、盲検化、脱落、追跡)"],
          [
            "4",
            "**患者にとって重要なアウトカム**が評価されているか? (PFS は代替指標。OS、QOL は?)",
          ],
          ["5", "効果（益）だけで、**害**はどう評価されたか?"],
          ["6", "コスト・**患者の価値観**・実行可能性は考慮されているか?"],
        ],
      },
    },
    narration: dialogue([
      {
        speaker: "G先生",
        text:
          "「A薬は効きます」 と即断する前に、**6 つの確認** をしましょう。\n\n**① この 1 つの研究だけで判断してよいか?**\n**② 反対する研究は本当に存在しないか?**\n**③ この研究自体にバイアスはないか? (ランダム化・盲検化・脱落・追跡)**\n**④ 患者にとって重要なアウトカムが評価されているか? (PFS は代替指標。OS、QOL は?)**\n**⑤ 益だけでなく、害はどう評価されたか?**\n**⑥ コスト・患者の価値観・実行可能性は考慮されたか?**",
      },
      {
        speaker: "G先生",
        text:
          "これらは **EBM の 3 原則 (Users' Guides 2015)** から自然に導かれます — ①最良のエビデンスは SR、②エビデンスの確実性を評価、③エビデンスだけでは臨床決断はできない。\n\nこれから、A薬を題材に **基礎研究 → RCT → SR/MA → 診療ガイドライン** の順で、悪い発表とその批判的吟味、そして **正しい言い換え** を一緒に見ていきます。",
      },
    ]),
    citationIds: ["usersGuides2015", "coreGRADE1", "guyatt2023sixQuestions"],
  },

  // -------- N3 G先生 紹介 --------
  {
    id: "N3",
    section: SECTION,
    title: "G先生とは",
    visual: {
      type: "card",
      data: {
        heading: "G先生 — 本セッション専用の架空キャラクター",
        bullets: [
          "**EBM・GRADE 的な批判的吟味の口調** で進める教育用キャラクター",
          "**Gordon Guyatt 教授本人の人格模倣ではない**。Guyatt 教授／GRADE Working Group の考え方に沿って作った仮想の講師",
          "Core GRADE 0〜7 と Guyatt 教授 2025 年講演を下敷きに、「単一研究に飛びつかない」「不確実性を明示する」「患者価値観を組み込む」 を体現",
          "次のスライドから、**4 つの研究タイプ × 4 スライド構成** で対比します",
          "各カテゴリ: ① 悪い発表 → ② 批判的コメント → ③ G先生の言い換え → ④ 違い",
        ],
      },
    },
    narration: dialogue([
      {
        speaker: "G先生",
        text:
          "本日、批判的吟味の役を務めるのは **「G先生」** です。Gordon Guyatt 教授と GRADE Working Group の Core GRADE シリーズ (0〜7) ・2025 年の講演・Q&A を下敷きにした **架空の教育用キャラクター** です。\n\n念のため強調しておきます。**Gordon Guyatt 教授そのものの人格模倣ではありません**。Guyatt 教授／GRADE の考え方に沿って、EBM・GRADE 的な批判的吟味の口調で進める仮想の講師です。実在人物の発言と完全に一致するものではない点だけご了承ください。",
      },
      {
        speaker: "G先生",
        text:
          "これから、仮想の **A薬** を題材に、**基礎研究 → RCT → SR/メタ解析 → 診療ガイドライン** の順に話を進めます。各カテゴリは 4 スライド構成 — ①悪い発表 → ②批判的コメント → ③G先生の言い換え → ④何が違うか。\n\n「効果がある」 と並べるだけでは不十分。**不確実性を正直に示し、患者にとって何が重要かを一緒に考える** — それが今日の通底のテーマです。",
      },
    ]),
    warnings: [
      "G先生は架空の教育用キャラクターであり、Gordon Guyatt 本人の発言とは異なる解釈が混じる可能性があります。",
    ],
    citationIds: [
      "guyattLecture2025",
      "guyattQA",
      "coreGRADE0",
      "guyatt2023sixQuestions",
    ],
  },

  // -------- 4 カテゴリ × 4 スライド = 16 枚 (N4-N19) --------
  ...categories.flatMap(fourSlideSet),

  // -------- N20 まとめの会話 --------
  {
    id: "N_summary",
    section: SECTION,
    title: "まとめ — 「エビデンスがある」 という言葉の罠",
    visual: {
      type: "list",
      data: {
        ordered: true,
        items: [
          {
            text: "**基礎研究は仮説生成にすぎない**",
            subItems: ["「メカニズムが分かった」 ≠ 「臨床で効く」", "GRADE 確実性は very low"],
          },
          {
            text: "**RCT は重要だが、絶対効果とバイアスを見る**",
            subItems: ["相対 (OR) だけでなく **絶対差・NNT**", "オープンラベルは過大評価リスク"],
          },
          {
            text: "**SR/MA は自動的に高確実性ではない**",
            subItems: ["異質性 (I²)・含まれる試験の質", "GRADE で low / very low になりうる"],
          },
          {
            text: "**CPG は推奨の強さと確実性を分けて読む**",
            subItems: [
              "strong vs conditional (recommend vs suggest)",
              "条件付き × low certainty なら **SDM**",
            ],
          },
        ],
      },
    },
    narration: dialogue([
      {
        speaker: "座長",
        text:
          "つまり、A薬には基礎研究、RCT、SR、ガイドラインがあるとしても、それだけで十分とは言えないということですね。",
      },
      {
        speaker: "G先生",
        text:
          "その通りです。\n\nこの発表の問題は、**「エビデンスがある」 という言葉を使いながら、実際にはエビデンスの確実性・不確実性・限界を十分に示していない** ことです。\n\n基礎研究は作用機序の仮説。RCT は重要だがオープンラベルなら過大評価の可能性。SR/MA は統合効果を示すが異質性が大きければ確実性は下がる。ガイドライン推奨は強さと確実性を分けて読まなければならない。",
      },
      {
        speaker: "G先生",
        text:
          "つまり、正しい結論は **「A薬は有効である」 ではない**。\n\nより正確には — **「A薬は有効である可能性があるが、根拠の確実性は低く、効果推定には不確実性がある。したがって、全患者への一律投与ではなく、患者ごとの価値観と状況を踏まえた条件付きの選択肢として扱うべきである」** です。",
      },
    ]),
    citationIds: [
      "sackett1996",
      "usersGuides2015",
      "coreGRADE1",
      "etdSchunemann2016",
    ],
  },

  // -------- N21 最終メッセージ --------
  {
    id: "N_message",
    section: SECTION,
    title: "GRADE の目的は、効果を大きく見せることではない",
    visual: {
      type: "card",
      data: {
        heading: "「強く見せる」 vs 「確からしさを示す」",
        bullets: [
          "**A薬について並べてはいけない** — 「効きます」「RCT で 3 倍」「SR で有意」「ガイドラインで推奨」",
          "**並べるべき** — 基礎研究は仮説生成 / RCT は絶対効果とバイアス / SR/MA は異質性と GRADE 確実性 / CPG は推奨の強さと確実性を分ける",
          "条件付き推奨 × low certainty なら **Shared Decision Making**",
          "**エビデンスを使うとは、都合のよい結果を並べることではない**",
          "**不確実性を正直に示し、患者にとって何が重要かを一緒に考えること** — それが GRADE の目的",
        ],
        accent: "info",
      },
    },
    narration: dialogue([
      {
        speaker: "G先生",
        text:
          "最後に大事なメッセージを。\n\nこの種の発表の最大の問題は、**エビデンスを 「強く見せる」 方向に編集している** ことです。しかし **GRADE の目的はその逆** です。\n\n効果を大きく見せることではなく、**どこまで確からしく、どこから先が不確実なのか** を明確にすることです。",
      },
      {
        speaker: "G先生",
        text:
          "短くまとめるならこう —\n\n> 基礎研究は仮説生成であり、臨床効果の証明ではない。\n> RCT は重要だが、「3 倍」 という相対効果だけでは不十分で、絶対効果・NNT・バイアスリスクを見る。\n> SR/MA は自動的に高確実性ではなく、含まれる研究の質・異質性・出版バイアスによって low にも very low にもなる。\n> CPG の推奨は、strong か conditional か、certainty が high か low かを分けて読む。\n> 条件付き推奨かつ low certainty なら、結論は 「全員に使うべき」 ではなく、「選択肢の一つとして患者と相談する」 である。",
      },
    ]),
    citationIds: [
      "sackett1996",
      "usersGuides2015",
      "coreGRADE0",
      "guyatt2023sixQuestions",
      "etdSchunemann2016",
    ],
  },

  // -------- N22 本編へのロードマップ --------
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
            text: "**EBM の本質** から、診療ガイドラインの定義を **「なぜ?」** から理解する（第1部）",
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
        speaker: "G先生",
        text:
          "ここから本編 (S1〜) に進みます。3 部構成 — **第1部** 診療ガイドラインの定義を 「なぜ?」 から理解 → **第2部** 作成プロセス → **第3部** 推奨決定の深い考察。\n\n「ふーん、そうなんだ」 ではなく **「なるほど、だから!」** と理解できるよう、ひとつひとつ丁寧に進めます。スマホ表示でも本文が読めるよう、A 大/中/小 のボタンで文字サイズを切り替えられます。それでは始めましょう。",
      },
    ]),
    citationIds: [
      "sackett1996",
      "iom2011",
      "coreGRADE0",
      "guyattLecture2025",
    ],
  },
];

// Renumber to N1, N2, ... in order.
const renumbered = newIntro.map((s, i) => ({
  ...s,
  id: `N${i + 1}`,
  order: i + 1,
}));

const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));
const otherSlides = (data.slides || []).filter((s) => !/^N/.test(s.id));
data.slides = [...renumbered, ...otherSlides];
data.meta.version = "0.6.0-step10-Gsensei";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(
  `Rewrote ${renumbered.length} intro slides (G先生 critical-appraisal dialogue); preserved ${otherSlides.length} other slides`
);
