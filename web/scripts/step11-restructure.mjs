#!/usr/bin/env node
// Step 11 整形:
//  (1) meta.sections[0].title と intro slides の section を「0. 導入：G先生に学ぶ」に統一
//  (2) S3 を削除して S2 と統合 (本日のメニュー の 2 連続を 1 つに)
//  (3) S31 のテーブルを slide031.jpg に完全一致するように修正
//  (4) S12-S29 / S34 / S35 を slideImage に変換 (rendered_slides を使用)
//  (5) order を再採番
//
// 実行: cd web && node scripts/step11-restructure.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_JSON = path.resolve(__dirname, "..", "public", "data", "slides.json");

const NEW_INTRO_SECTION = "0. 導入：G先生に学ぶ";

const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));

// (1) section title 統一
const introSection = data.meta.sections.find((s) => s.id === "intro");
if (introSection) introSection.title = NEW_INTRO_SECTION;
for (const slide of data.slides) {
  if (slide.id.startsWith("N")) slide.section = NEW_INTRO_SECTION;
}

// (2) S3 削除 + S2 narration 統合
const s2 = data.slides.find((x) => x.id === "S2");
if (s2) {
  s2.narration =
    "本日のメニューは三部構成です。\n" +
    "**(1) 診療ガイドラインの定義の意味を「なぜなの？」から理解** — 言葉の意味を、なぜそう定義されているかという背景から押さえます。\n" +
    "**(2) 診療ガイドライン作成を学ぶ** — 国際的なトレーニングコースに沿った実践的な内容。\n" +
    "**(3) こんなことまで考えて、推奨を決定しています** — EtD表など舞台裏のツールと考え方。\n\n" +
    "診療ガイドラインを **読みこなしたいだけの方は第1部のみで大丈夫** です。委員・パネリストの方は最後までお付き合いください。\n\n" +
    "それではまず第 1 部 — **診療ガイドラインの定義の意味を「なぜなの？」から理解** に入ります。世界共通の定義 (米国 IOM/HMD 2011) に含まれる **3 つのキーワード — システマティックレビュー / 利益と害の評価 / 推奨** をひとつずつ「なぜ必要なのか」から押さえていきます。";
  // bullets を整理 (S3 のクリーンな 3 行版に置き換え)
  if (s2.visual?.data?.bullets) {
    s2.visual.data.bullets = [
      "（1）診療ガイドラインの定義の意味を、なぜなの？から理解",
      "（2）診療ガイドライン作成を学ぶ",
      "（3）こんなことまで考えて、推奨を決定しています",
    ];
  }
}
data.slides = data.slides.filter((s) => s.id !== "S3");

// (3) S31 テーブル修正
const s31 = data.slides.find((x) => x.id === "S31");
if (s31) {
  s31.title = "必ず理解して欲しいこと — SR の質 ≠ メタ分析結果の確実性";
  s31.visual = {
    type: "table",
    data: {
      headers: [
        "ステップ1：SR そのものの作り方",
        "ステップ2：元となる各研究のバイアス・症例数・研究間の不一致",
        "SR の質とエビデンスの確実性をまとめると？",
        "臨床判断に使えるのか？",
      ],
      rows: [
        [
          "**しっかりと作られていない SR**",
          "─→",
          "**SR の質が低い**",
          "**得られた結果を使ってはいけない**",
        ],
        [
          "**しっかりと作られた SR**",
          "できの良くない研究や、各研究結果が不一致",
          "SR の質は高いが、その中の **エビデンスの確実性が低い**",
          "得られた結果を使うが **臨床判断に使えない可能性がある**",
        ],
        [
          "**しっかりと作られた SR**",
          "**良質な研究** であり、各研究結果も **一致**",
          "SR の質は高く、その中の **エビデンスの確実性も高い**",
          "**得られた結果を使うことが十分にできる**",
        ],
      ],
      caption:
        "SR という確かなエビデンスに従って、、、という講演者に騙されないこと！",
    },
  };
  s31.narration =
    "重要な区別があります。**「SR の質」 と 「SR が出す結果のエビデンスの確実性」 は別物** です。\n\n" +
    "SR そのものがしっかり作られていなければ、当然中身も信用できません。**得られた結果を使ってはいけない**。\n\n" +
    "SR がしっかり作られていても、中の研究がバイアス多め・結果も不一致 — このときは **SR の質は高いが、エビデンスの確実性は低い**。**臨床判断には使えない可能性** がある。\n\n" +
    "SR がしっかり作られ、中の研究も良質で結果も一致して初めて — **エビデンスの確実性も高く、十分に使える**。\n\n" +
    "「SR だからエビデンスが高い」 と聞いても信じてはいけません。**SR の枠組みと中身は別物** なのです。";
}

// (4) S12-S29, S34, S35 を slideImage に変換
const SLIDE_IMAGE_TARGETS = [
  ["S12", "slide012.jpg", "X薬のがん治療：4論文の縦読み（仮想例）"],
  ["S13", "slide013.jpg", "ランチョンセミナー：EBMに基づくがん治療における X薬の有用性"],
  ["S14", "slide014.jpg", "都合の良い解説 — エビデンスを名乗る恣意的な選択"],
  ["S15", "slide015.jpg", "縦読みの実例（網羅的検索版）"],
  ["S16", "slide016.jpg", "縦読みの実例（系統的検索版）"],
  ["S17", "slide017.jpg", "メタ分析とは？"],
  ["S18", "slide018.jpg", "論文1 の結果（A 治療のが高い）と"],
  ["S19", "slide019.jpg", "ただ単にあわせると、結果が逆転することがある！"],
  ["S20", "slide020.jpg", "メタ分析という統計手法"],
  ["S21", "slide021.jpg", "個々の研究の質を評価する — バイアスのリスク"],
  ["S22", "slide022.jpg", "バイアスのリスク評価が確実性を決める"],
  ["S23", "slide023.jpg", "各研究の結果のバラツキ — 非一貫性 (Inconsistency)"],
  [
    "S24",
    "slide024.jpg",
    "同じ「1.62」でも確実性が違う — フォレストプロットで見る",
  ],
  ["S25", "slide025.jpg", "エビデンスの確実性を下げる 5 要因"],
  ["S26", "slide026.jpg", "EBM のステップ 3：批判的吟味 — 研究の質と言われていた"],
  ["S27", "slide027.jpg", "エビデンスの確実性の客観評価 = GRADE アプローチ"],
  [
    "S28",
    "slide028.jpg",
    "メタ分析の値のみが一人歩きすると、間違った解釈が行なわれる可能性がある",
  ],
  ["S29", "slide029.jpg", "確実性の程度"],
  [
    "S34",
    "slide034.jpg",
    "ちょっと待った！ 確実性が高く、値も効果があったとしても・・・",
  ],
  ["S35", "slide035.jpg", "利益と害の評価とは？"],
];

for (const [id, file, title] of SLIDE_IMAGE_TARGETS) {
  const s = data.slides.find((x) => x.id === id);
  if (!s) continue;
  s.title = title;
  s.visual = {
    type: "slideImage",
    data: {
      src: `/images/slides-full/${file}`,
      alt: title,
    },
  };
}

// (5) order 再採番 (削除があったので)
data.slides.sort((a, b) => a.order - b.order);
data.slides.forEach((s, i) => {
  s.order = i + 1;
});

data.meta.version = "0.7.0-step11-restructure";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Restructure complete: ${data.slides.length} slides total`);
console.log(`Section[0]: ${data.meta.sections[0].title}`);
console.log(`Intro count: ${data.slides.filter((s) => s.id.startsWith("N")).length}`);
console.log(`SlideImage converted: ${SLIDE_IMAGE_TARGETS.length}`);
