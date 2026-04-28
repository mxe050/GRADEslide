#!/usr/bin/env node
// One-off: replace the intro slides in public/data/slides.json with a new
// 10-slide structure that uses all 5 image pairs in /images/intro/.
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
      "ある学会のシンポジウムで、こんなスライドが出てきました。最新の第III相試験で**有意な効果**が示されたX薬。\n\nあなたは、この講演を聞いてどう反応しますか？「効果あり、すぐに使おう」と思うでしょうか？それとも、何か違和感を持つでしょうか？\n\n— もし違和感を持てたなら、あなたは EBM 的な感覚を持っています。違和感が言語化できなくても大丈夫。これから一緒に、何が足りないのかを見ていきましょう。",
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
      "もしこれら6つの確認に答えられないとすれば、その講演は **エビデンスの「点」を見せられているだけ** です。\n\n単一のRCTがどれだけ「有意」であっても、それは全体の中の1つに過ぎません。本当に意味のある臨床判断には、これらすべてに答えられる枠組みが必要です。これがまさに **EBM・GRADE の問題意識** です。",
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
          "次のスライドから、5つの研究タイプ（RCT・SR・診療ガイドライン・観察研究・基礎研究）について、従来の発表と AI-EBM 先生の発表を**画像で**対比します",
        ],
      },
    },
    narration:
      "AI-EBM 先生は、本セッション専用に設定した**架空の教育用キャラクター**です。EBM・GRADE アプローチの公開された原則を体現しています。\n\n以降の N4〜N8 では、5つの研究タイプ（RCT、SR、診療ガイドライン、観察研究、基礎研究）について、**従来の発表スタイル** と **AI-EBM 先生の発表スタイル** を画像で対比します。",
    warnings: [
      "AI-EBM先生は架空の教育用キャラクター。実在の特定の人物を表すものではない",
    ],
    citationIds: ["coreGRADE1", "iom2011"],
  },
  {
    id: "N4",
    section: SECTION,
    title: "RCT（ランダム化比較試験）— 従来 vs AI-EBM 先生",
    visual: {
      type: "imagePair",
      data: {
        leftImage: { src: "/images/intro/rct.jpg", alt: "従来の RCT 発表スタイル" },
        rightImage: {
          src: "/images/intro/rct-g.jpg",
          alt: "AI-EBM 先生による GRADE-based の RCT 発表",
        },
        leftCaption: "従来の発表",
        rightCaption: "AI-EBM 先生（GRADE）",
      },
    },
    narration:
      "RCT について、**従来の発表**（左）と **AI-EBM 先生の発表**（右）を比較します。\n\n左：単一の RCT の結果を「効果あり」と断定する。\n右：エビデンスの総体（SR + メタ分析）として捉え、確実性・益と害・患者価値観を組み込んで構造化された推奨を提示する。",
    citationIds: ["usersGuides2015", "coreGRADE1", "robustRCT"],
  },
  {
    id: "N5",
    section: SECTION,
    title: "システマティックレビュー — 従来 vs AI-EBM 先生",
    visual: {
      type: "imagePair",
      data: {
        leftImage: { src: "/images/intro/sr.jpg", alt: "従来の SR 発表" },
        rightImage: {
          src: "/images/intro/sr-g.jpg",
          alt: "AI-EBM 先生による GRADE-based の SR 発表",
        },
        leftCaption: "従来の発表",
        rightCaption: "AI-EBM 先生（GRADE）",
      },
    },
    narration:
      "SR でも同様に、左：研究を集めただけで「結論」とする発表と、右：エビデンスの確実性を体系的に評価し、不確実性を明示する発表とでは本質が違います。",
    citationIds: ["coreGRADE1"],
  },
  {
    id: "N6",
    section: SECTION,
    title: "診療ガイドライン — 従来 vs AI-EBM 先生",
    visual: {
      type: "imagePair",
      data: {
        leftImage: { src: "/images/intro/cpg.jpg", alt: "従来の診療ガイドライン発表" },
        rightImage: {
          src: "/images/intro/cpg-g.jpg",
          alt: "AI-EBM 先生による GRADE-based の診療ガイドライン発表",
        },
        leftCaption: "従来の発表",
        rightCaption: "AI-EBM 先生（GRADE）",
      },
    },
    narration:
      "診療ガイドラインでも、左：「専門家の合意」止まりの推奨と、右：SR + 益と害評価 + 推奨の方向と強さまで構造化されたものでは、信頼性が決定的に異なります。",
    citationIds: ["iom2011"],
  },
  {
    id: "N7",
    section: SECTION,
    title: "観察研究 — 従来 vs AI-EBM 先生",
    visual: {
      type: "imagePair",
      data: {
        leftImage: {
          src: "/images/intro/observational.jpg",
          alt: "従来の観察研究発表",
        },
        rightImage: {
          src: "/images/intro/observational-g.jpg",
          alt: "AI-EBM 先生による観察研究発表",
        },
        leftCaption: "従来の発表",
        rightCaption: "AI-EBM 先生（GRADE）",
      },
    },
    narration:
      "観察研究は RCT より確実性が低い研究デザインですが、適切に評価すれば貴重なエビデンスになります。AI-EBM 先生は確実性が低いことを明示し、結果を慎重に解釈します。",
  },
  {
    id: "N8",
    section: SECTION,
    title: "基礎研究 — 従来 vs AI-EBM 先生",
    visual: {
      type: "imagePair",
      data: {
        leftImage: { src: "/images/intro/basic.jpg", alt: "従来の基礎研究発表" },
        rightImage: {
          src: "/images/intro/basic-g.jpg",
          alt: "AI-EBM 先生による基礎研究発表",
        },
        leftCaption: "従来の発表",
        rightCaption: "AI-EBM 先生（GRADE）",
      },
    },
    narration:
      "基礎研究も同様。動物実験や細胞研究の結果を「ヒトで効く」と外挿するのは飛躍です。AI-EBM 先生は非直接性の問題を明示し、慎重に解釈します。",
  },
  {
    id: "N9",
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
      "5つの研究タイプを通じて見えてきた AI-EBM 先生の本質は、この**4原則**です。\n\nこの4原則は、EBM の古典的定義（Sackett 1996）と Users' Guides 第3版（2015）に明示されている原則を、診療ガイドラインの文脈に整理したものです。",
    citationIds: ["sackett1996", "usersGuides2015"],
  },
  {
    id: "N10",
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

const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));
const otherSlides = (data.slides || []).filter((s) => !/^N\d+$/.test(s.id));
const newIntroWithOrder = newIntro.map((s, i) => ({ ...s, order: i + 1 }));
data.slides = [...newIntroWithOrder, ...otherSlides];
data.meta.version = "0.3.0-step3-images";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(
  `Rewrote ${newIntroWithOrder.length} intro slides; preserved ${otherSlides.length} other slides`
);
