#!/usr/bin/env node
// Build S1〜S106 slide entries from extracted.json into a rich, readable web
// layout (card / table / imageCard / image) — NOT the rendered JPEG dump.
// Intro slides (N*) come from public/data/slides.json (edited via
// scripts/rewrite-intro.mjs).
//
// Run:  node scripts/build-slides.mjs   (from web/)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "..");
const ROOT_DIR = path.resolve(WEB_DIR, "..");
const EXTRACTED_JSON = path.join(
  ROOT_DIR,
  "pptx_work",
  "extracted_output",
  "extracted.json"
);
const EXTRACTED_IMG_DIR = path.join(
  ROOT_DIR,
  "pptx_work",
  "extracted_output",
  "images"
);
const SLIDES_JSON = path.join(WEB_DIR, "public", "data", "slides.json");
const PUBLIC_IMG_DIR = path.join(WEB_DIR, "public", "images", "slides");

// ---------- helpers ----------

function paragraphText(p) {
  return p.runs
    .map((r) => r.text || "")
    .join("")
    .trim();
}

function shapeText(sh) {
  if (!sh.text_frame) return "";
  return sh.text_frame.paragraphs
    .map(paragraphText)
    .filter(Boolean)
    .join("\n");
}

function topPt(sh) {
  return sh.top && typeof sh.top.pt === "number" ? sh.top.pt : 9999;
}

function leftPt(sh) {
  return sh.left && typeof sh.left.pt === "number" ? sh.left.pt : 9999;
}

function maxFontPt(sh) {
  if (!sh.text_frame) return 0;
  let m = 0;
  for (const p of sh.text_frame.paragraphs) {
    for (const r of p.runs) {
      if (typeof r.font_size_pt === "number" && r.font_size_pt > m) {
        m = r.font_size_pt;
      }
    }
  }
  return m;
}

function firstParagraph(sh) {
  if (!sh.text_frame) return "";
  for (const p of sh.text_frame.paragraphs) {
    const t = paragraphText(p);
    if (t) return t;
  }
  return "";
}

function sanitizeText(t) {
  if (!t) return t;
  return t.replace(/　/g, " ").replace(/[\t ]+/g, " ").trim();
}

function cleanTitle(t) {
  if (!t) return "";
  let s = t.replace(/[：:]\s*(?:追加情報|参考)?第?\d+版.*$/, "");
  s = s.replace(/[A-Z][a-zA-Z]+,\s*[A-Z]\.\s*[A-Z]?\.?.*$/, "");
  s = s.replace(/\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?\s+et\s+al\.?.*$/, "");
  return s.trim();
}

function pickTitle(textShapes) {
  const candidates = textShapes.slice(0, 6);
  if (candidates.length === 0) return undefined;

  const scored = candidates.map((sh, i) => {
    const raw = firstParagraph(sh);
    const cleaned = cleanTitle(raw);
    const len = cleaned.length;
    const font = maxFontPt(sh);
    const named = /タイトル/.test(sh.name || "");
    const looksCitation =
      / et al\.?/.test(raw) ||
      /\bdoi:|\bhttps?:\/\//i.test(raw) ||
      /^[A-Z][a-z]+ [A-Z][a-z]+,?/.test(raw);

    let score = 0;
    if (len >= 4 && len <= 40) score += 10;
    else if (len <= 60) score += 5;
    else if (len <= 90) score += 1;
    else score -= 6;

    if (font >= 28) score += 5;
    else if (font >= 22) score += 3;
    else if (font >= 18) score += 1;

    if (named) score += 6;
    if (looksCitation) score -= 10;

    score -= i * 0.5;
    return { sh, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].sh;
}

function tableToVisual(table) {
  if (!table || !table.cells || table.cells.length === 0) return null;
  const rows = table.cells.map((row) =>
    row.map((cell) => {
      if (!cell.text_frame) return "";
      return cell.text_frame.paragraphs
        .map(paragraphText)
        .filter(Boolean)
        .join(" ");
    })
  );
  if (rows.length === 0) return null;
  const headers = rows[0];
  const body = rows.slice(1);
  while (body.length > 0 && body[body.length - 1].every((c) => !c.trim())) {
    body.pop();
  }
  return { headers, rows: body };
}

function sectionFor(slideIdx) {
  if (slideIdx <= 40) return "1. 診療ガイドラインの定義を理解";
  if (slideIdx <= 76) return "2. 診療ガイドライン作成を学ぶ";
  return "3. 推奨決定の深い考察";
}

function imageRelPath(imageFile) {
  const basename = path.basename(imageFile);
  return `/images/slides/${basename}`;
}

// ---------- auto-dialogue ----------
//
// For S1〜S106, we don't have hand-written dialogue scripts (that would mean
// rewriting 100 narrations by hand). Instead, we wrap the auto-extracted
// narration in a 2-3 turn dialogue: 初心者 frames a question from the title,
// EBM先生 explains using the extracted body text, 初心者 closes with a brief
// recap. This is consistent across slides and keeps the dialogue tone the
// app uses for every screen.
//
// Curated overrides (REVISED_OVERRIDES below) replace these with hand-
// crafted dialogues for the most important slides.
function autoDialogue(title, rawBody) {
  if (!rawBody) {
    return [
      `初心者: 「${title}」って、どんな話なんですか？`,
      `EBM先生: このスライドは原 PowerPoint には本文が含まれていなかったので、解説テキストは準備中です。タイトルから内容を想像し、Core GRADE 1〜6 の該当章を参照してください。`,
    ].join("\n\n");
  }

  // Split body into 1〜3 chunks for the teacher's reply.
  const sentences = rawBody
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Use up to 4 sentences for the teacher's primary explanation
  const teacherText = sentences.slice(0, 6).join("\n\n");

  return [
    `初心者: 「${title}」って、どういうことですか？`,
    `EBM先生: ${teacherText}`,
    `初心者: なるほど、ここがポイントなんですね。`,
  ].join("\n\n");
}

// ---------- per-slide builder ----------

function buildSlide(raw, introCount) {
  const slideIdx = raw.slide_index;
  const id = `S${slideIdx}`;
  const order = introCount + slideIdx;

  const allShapes = (raw.shapes || []).slice();
  const textShapes = allShapes
    .filter((sh) => sh.text_frame && shapeText(sh))
    .sort((a, b) => topPt(a) - topPt(b) || leftPt(a) - leftPt(b));
  const tableShapes = allShapes.filter((sh) => sh.table);
  const imageShapes = allShapes.filter((sh) => sh.image_file);

  const titleShape = pickTitle(textShapes);
  let title = titleShape
    ? sanitizeText(cleanTitle(firstParagraph(titleShape)))
    : "";
  if (!title) title = `スライド ${slideIdx}`;
  // Don't truncate title — let it wrap. Just trim very-long ones.
  if (title.length > 80) title = title.slice(0, 78) + "…";

  const bodyShapes = textShapes.filter((s) => s !== titleShape);

  // ---- narration: all body text joined with blank lines ----
  const narrationParts = [];
  for (const sh of bodyShapes) {
    const t = shapeText(sh);
    if (t) narrationParts.push(t);
  }
  const rawBody = narrationParts.join("\n\n");
  const narration = autoDialogue(title, rawBody);

  // ---- decide visual ----
  let visual;

  // 1. Table-driven slide → big table visual
  if (tableShapes.length > 0) {
    const t = tableToVisual(tableShapes[0].table);
    if (t && t.headers.length > 0 && t.rows.length > 0) {
      visual = {
        type: "table",
        data: { headers: t.headers, rows: t.rows },
      };
    }
  }

  // 2. Single big image with body text → imageCard
  if (!visual && imageShapes.length === 1 && bodyShapes.length > 0) {
    const bullets = bodyShapes
      .flatMap((sh) =>
        sh.text_frame.paragraphs.map(paragraphText).filter(Boolean)
      )
      .map(sanitizeText)
      .filter((t) => t)
      .slice(0, 8);
    if (bullets.length > 0) {
      visual = {
        type: "imageCard",
        data: {
          heading: title,
          image: {
            src: imageRelPath(imageShapes[0].image_file),
            alt: title,
          },
          bullets,
        },
      };
    }
  }

  // 3. Image only (no body text) → image
  if (!visual && imageShapes.length >= 1 && bodyShapes.length === 0) {
    visual = {
      type: "image",
      data: {
        src: imageRelPath(imageShapes[0].image_file),
        alt: title,
        caption: title,
      },
    };
  }

  // 4. Text only → card
  if (!visual) {
    const allParas = bodyShapes
      .flatMap((sh) =>
        sh.text_frame.paragraphs.map(paragraphText).filter(Boolean)
      )
      .map(sanitizeText)
      .filter(Boolean);

    if (allParas.length === 0) {
      visual = {
        type: "card",
        data: {
          heading: title,
          body: "（このスライドには解説テキストが含まれていません。）",
        },
      };
    } else if (allParas.length === 1 && allParas[0].length > 60) {
      // single long paragraph → quote-style body
      visual = {
        type: "card",
        data: { heading: title, body: allParas[0] },
      };
    } else {
      visual = {
        type: "card",
        data: { heading: title, bullets: allParas },
      };
    }
  }

  return {
    id,
    order,
    section: sectionFor(slideIdx),
    title,
    visual,
    narration,
  };
}

// ---------- revised overrides (curated content) ----------

const REVISED_OVERRIDES = {
  S6: {
    title: "EBMとは？",
    visual: {
      type: "quote",
      data: {
        text: "根拠に基づく医療（EBM）とは、個々の患者のケアに関する意思決定において、現在得られる最良の根拠を、良心的に、明示的に、そして思慮深く用いることである。",
        citationId: "sackett1996",
      },
    },
    narration: [
      "初心者: EBM って言葉はよく聞きますが、定義は何ですか?",
      "EBM先生: Sackett 1996 の古典的定義がこれです。3 つのキーワードに注目してください: **個々の患者**、**最良の根拠**、**思慮深く**。",
      "初心者: 「個々の患者」が最初に来るんですね。意外でした。",
      "EBM先生: そう、EBM はガイドラインを機械的に当てはめるものではないんです。ガイドラインの根拠を理解した上で、目の前の患者に合わせて**思慮深く**適用する。これが本質です。",
      "初心者: 「最良の根拠」とは、つまり SR ですか?",
      "EBM先生: 理想的にはそうです。Users' Guides 第3版 (2015) でも、EBM の3原則の1つ目は「最良のエビデンス、理想的には SR」とされています。次のスライドで詳しく見ていきましょう。",
    ].join("\n\n"),
    citationIds: ["sackett1996", "usersGuides2015", "gradeHandbook"],
  },
  S8: {
    title: "EBMの3つの基本原則",
    visual: {
      type: "list",
      data: {
        ordered: true,
        items: [
          {
            text: "最適な臨床決断には入手可能な最適なエビデンス、理想的には**システマティックレビュー**のエビデンスを必要とする",
          },
          {
            text: "EBMは、エビデンスが信頼できるかどうか、すなわち診断検査・予後・治療選択肢についてどれほど確信をおけるものかを提供する",
          },
          {
            text: "**エビデンスだけでは臨床決断をするのに決して十分ではない**",
          },
        ],
      },
    },
    narration: [
      "初心者: EBM の 3 原則って、何ですか?",
      "EBM先生: Users' Guides 第3版 (2015) に明記されている 3 原則です。\n**①最良のエビデンス**: 理想的には SR。\n**②確実性の評価**: そのエビデンスがどれくらい確かか。\n**③エビデンスだけでは不十分**: 価値観・コスト・実行可能性が必要。",
      "初心者: ③が一番大事そうですね。",
      "EBM先生: その通り。多くの人が見落とすのが ③です。「最高の RCT」があっても、それだけでは臨床決断にならない。患者の価値観、コスト、実行可能性 — これらを統合して初めて意思決定なんです。",
      "初心者: GRADE はこれをどう実装するんですか?",
      "EBM先生: **EtD (Evidence-to-Decision) フレームワーク**で実装します。エビデンスとは別に、価値観・コスト・公平性・容認性・実行可能性を構造化して評価する。Schünemann 2016 が標準化した枠組みです。",
    ].join("\n\n"),
    citationIds: ["usersGuides2015", "etdSchunemann2016", "gradeHandbook"],
  },
  S25: {
    title: "エビデンスの確実性を下げる5要因",
    visual: {
      type: "table",
      data: {
        headers: ["要因", "概念", "もし〜だったら"],
        rows: [
          [
            "研究の限界 (risk of bias)",
            "limitation, risk of bias",
            "そのアウトカムの結果を構成する論文にバイアスが多く存在していたら",
          ],
          ["非一貫性 (inconsistency)", "inconsistency", "論文間で結果が異なっていれば"],
          [
            "非直接性 (indirectness)",
            "indirectness",
            "想定した臨床の疑問の患者層と、選択した論文の患者層が異なっていれば",
          ],
          [
            "不精確さ (imprecision)",
            "imprecision",
            "症例数の小さな精確でないデータばかりなら",
          ],
          [
            "出版バイアス (publication bias)",
            "publication bias",
            "有意差がなく報告されなかった論文や、都合が悪く書かれなかったアウトカムが多そうなら",
          ],
        ],
      },
    },
    narration: [
      "初心者: GRADE の中核って、結局何ですか?",
      "EBM先生: **エビデンスの確実性を下げる 5 要因**を体系的に評価することです。Core GRADE 1 で詳述されています:\n**①バイアス (RoB)** — 研究そのもののバイアス\n**②非一貫性** — 研究間で結果がばらつく\n**③非直接性** — PICO がずれている\n**④不精確さ** — CI が広い、効果なしや MID をまたぐ\n**⑤出版バイアス** — 隠された研究の可能性",
      "初心者: 5 要因をどうチェックするんですか?",
      "EBM先生: 各要因に「**もし〜だったら**」のチェック観点があります。Core GRADE 2〜5 で各要因の詳細チェックリストが提供されています。例えば不精確さなら「サンプル数が少ない」「CI が MID をまたぐ」など。",
      "初心者: 観察研究は最初から「低」スタートで、これでさらに下がるんでしたね。",
      "EBM先生: 正解です。RCT は「高」スタート、観察研究は「低」スタート。そこから 5 要因でダウングレード。観察研究はアップグレード要因 (大きな効果・用量反応・交絡が結果を弱める) もある。これが GRADE の柔軟さです。",
    ].join("\n\n"),
    citationIds: [
      "coreGRADE1",
      "coreGRADE2",
      "coreGRADE3",
      "coreGRADE4",
      "coreGRADE5",
      "gradeHandbook",
    ],
  },
  S33: {
    title: "診療ガイドラインの定義（IOM／HMD 2011）",
    visual: {
      type: "quote",
      data: {
        text: "診療ガイドラインとは、システマティックレビューによって得られたエビデンスと、代替的なケア選択肢の利益と害の評価に基づいて、患者ケアを最適化することを意図した推奨を含む記述である。",
        citationId: "iom2011",
      },
    },
    narration: [
      "初心者: 診療ガイドラインの正式な定義って、何ですか?",
      "EBM先生: IOM (現 HMD) 2011 がこの定義を世界標準として確立しました。**「SR と利益と害の評価に基づいて、患者ケアを最適化する推奨を含む記述」**。",
      "初心者: SR + 益と害の評価 + 推奨、の 3 要素ですね。",
      "EBM先生: その通り。これに**従わないものは「信頼できない診療ガイドライン」**とされます。専門家の合意だけ、利益のみ評価、推奨に強さがない — これらは IOM 定義を満たしません。",
      "初心者: 厳しい定義ですね。",
      "EBM先生: 患者ケアの政策を左右するからこそです。Guyatt 2023 はこの定義をベースに、**信頼できるガイドラインを見抜く 6 つの質問**を提案しています。臨床医が目の前のガイドラインを評価するチェックリストとして使えます。",
    ].join("\n\n"),
    warnings: ["この定義に従っていないものは「信頼できない診療ガイドライン」となる"],
    citationIds: ["iom2011", "guyatt2023sixQuestions", "gradeHandbook"],
  },
  S86: {
    title: "Good Practice Statement (GPS) の5要件",
    visual: {
      type: "table",
      data: {
        headers: ["#", "評価質問", "ポイント"],
        rows: [
          [
            "1",
            "エビデンス収集・要約が、パネルの限られた時間の使い方として効率が悪いか？",
            "倫理的・人権的に代替案が選ばれない場合など",
          ],
          [
            "2",
            "そのメッセージは実際の医療行為に必要か？",
            "パネルが必要性の根拠を文書中に示しているか",
          ],
          [
            "3",
            "関連するすべてのアウトカムを考えても、**正味で大きなプラスの効果**を持つか",
            "正式な推奨手順を経なくても、健康その他のEtD基準にプラスの影響があるか",
          ],
          [
            "4",
            "間接的なエビデンスを結びつける明確な根拠が文書化されているか",
            "推論の根拠が示されている",
          ],
          ["5", "声明は明確で実行可能か", "何を・どこで・誰がするかが明示されている"],
        ],
        caption: "GPSは5要件すべてを満たす必要がある",
      },
    },
    narration: [
      "初心者: GPS って、何ですか? GPS の機能の話?",
      "EBM先生: 違います (笑)。**Good Practice Statement** の略。GRADE の正式な推奨手順 (確実性評価 + EtD) は通さないが、明らかに必要な行動を示す声明です。",
      "初心者: 例えばどんな?",
      "EBM先生: 「医療スタッフは手洗いをする」のような、エビデンス収集が時間の浪費にしかならない自明な行動。これに毎回 SR をやるのは無意味です。",
      "初心者: でも、何でもかんでも GPS にしちゃうと甘くなりませんか?",
      "EBM先生: そこで **5 要件**です。① エビデンス収集が非効率、② メッセージが医療行為に必要、③ 関連アウトカム全体で正味プラスの効果、④ 推論根拠の文書化、⑤ 明確で実行可能。**全部満たさないと GPS にできない**。基準は厳しいんです。",
      "初心者: 安易に「専門家の意見」に逃げないための歯止めなんですね。",
      "EBM先生: その通り。信頼できるガイドラインなら、**非公式な推奨は完全に避けられる**はずです。",
    ].join("\n\n"),
    citationIds: ["etdSchunemann2016", "gradeHandbook"],
  },
  S99: {
    title: "「有意差なし」≠「差がない」",
    visual: {
      type: "table",
      data: {
        headers: ["解釈", "評価"],
        rows: [
          ["「効果がない」と表現する", "✗ 誤り（“差がない”と等しい）"],
          ["「差があるとは言えない」", "△ 正確だが情報量が小さい"],
          [
            "「点推定では20%効果あり、稀に3%悪化〜48%効果の可能性が残る」と議論する",
            "◎ GRADEで推奨される姿勢",
          ],
        ],
        caption:
          "仮想例：新薬 vs プラセボ、リスク比 1.20（95%CI: −3% 〜 +48%）、P=0.091",
      },
    },
    narration: [
      "初心者: 「有意差なし」と「差がない」って、同じじゃないんですか?",
      "EBM先生: **完全に違います**。これは現代の最重要トピックの一つです。Amrhein 2019 (Nature) が世界の科学者を巻き込んだ議論を起こしました。",
      "初心者: P=0.091 だと「効果なし」って結論しちゃいそうですが…",
      "EBM先生: それが間違い。点推定が **20% 効果**で、95%CI が「-3% 〜 +48%」だとしたら、「効果なし」とは到底言えない。**「効果あり」も「悪化」もあり得る不確実な状態**です。",
      "初心者: じゃあ何と言うべきですか?",
      "EBM先生: GRADE で推奨される姿勢は **「点推定では 20% 効果あり、稀に 3% 悪化〜48% 効果の可能性が残る」**と、CI の範囲全体を議論すること。Core GRADE 2 (Imprecision) ではこの考え方が中核となっています。",
      "初心者: P 値だけ見ると見落とすんですね。",
      "EBM先生: そう。**P 値は二項判断のための便宜的指標**。CI の幅と、それが MID (最小重要差) や効果なしをまたぐかが本質です。",
    ].join("\n\n"),
    citationIds: ["amrhein2019", "coreGRADE2", "gradeHandbook"],
  },
};

// Title-only overrides
const TITLE_OVERRIDES = {
  S12: "X薬のがん治療：4論文の縦読み（仮想例）",
  S15: "縦読みの実例（網羅的検索版）",
  S16: "縦読みの実例（系統的検索版）",
  S27: "エビデンスの確実性の客観評価 = GRADEアプローチ",
  S31: "SRの質 ≠ メタ分析結果の確実性",
  S54: "7. 利益相反（COI/DOI）の検討事項",
  S63: "メタ分析・SR・ネットワークメタ分析の違い",
  S64: "グレードダウン5要因の評価ポイント",
  S66: "推奨の構造（誰が・強さ・確実性）",
  S67: "推奨の方向性と強さに影響する要因",
  S68: "Evidence-to-Decision フレームワーク",
  S69: "推奨作成における文脈的要素",
  S71: "推奨決定の合意形成と GPS の5要件",
  S79: "GRADE-ADOLOPMENT：既存SR/CPGの活用",
  S81: "診療ガイドラインの推奨・声明の分類（WHO）",
  S87: "実施上の考慮事項・ツール・ヒント",
  S91: "エビデンスプロファイル と SoF表",
  S94: "EtD表 実例（1）",
  S103: "実際の作成プロセスの複雑性",
};

function applyOverride(slide) {
  const ov = REVISED_OVERRIDES[slide.id];
  if (ov) return { ...slide, ...ov };
  const t = TITLE_OVERRIDES[slide.id];
  if (t) return { ...slide, title: t };
  return slide;
}

// ---------- image copy ----------

function collectReferencedImages(slides) {
  const refs = new Set();
  for (const s of slides) {
    const v = s.visual;
    if (!v) continue;
    if (v.type === "image") refs.add(path.basename(v.data.src));
    if (v.type === "imageCard") refs.add(path.basename(v.data.image.src));
    if (v.type === "imageComparison") {
      refs.add(path.basename(v.data.leftImage.src));
      refs.add(path.basename(v.data.rightImage.src));
    }
    if (v.type === "imagePair") {
      refs.add(path.basename(v.data.leftImage.src));
      refs.add(path.basename(v.data.rightImage.src));
    }
  }
  return refs;
}

function copyImages(referenced) {
  fs.mkdirSync(PUBLIC_IMG_DIR, { recursive: true });
  let copied = 0;
  for (const name of referenced) {
    const src = path.join(EXTRACTED_IMG_DIR, name);
    const dst = path.join(PUBLIC_IMG_DIR, name);
    if (!fs.existsSync(src)) continue;
    if (fs.existsSync(dst)) {
      const ss = fs.statSync(src);
      const ds = fs.statSync(dst);
      if (ss.size === ds.size) continue;
    }
    fs.copyFileSync(src, dst);
    copied++;
  }
  return copied;
}

// ---------- main ----------

function main() {
  const extracted = JSON.parse(fs.readFileSync(EXTRACTED_JSON, "utf8"));
  const existing = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));

  const introSlides = (existing.slides || []).filter((s) => /^N/.test(s.id));
  const introCount = introSlides.length;

  const generated = extracted.slides
    .filter((s) => !s.extract_error)
    .map((s) => buildSlide(s, introCount))
    .map(applyOverride);

  const merged = [...introSlides, ...generated];

  const meta = {
    ...existing.meta,
    sections: [
      { id: "intro", title: "0. 導入：AI-EBM先生に学ぶ", startSlideId: "N1" },
      {
        id: "definition",
        title: "1. 診療ガイドラインの定義を理解",
        startSlideId: "S1",
      },
      {
        id: "creation",
        title: "2. 診療ガイドライン作成を学ぶ",
        startSlideId: "S41",
      },
      {
        id: "recommendation",
        title: "3. 推奨決定の深い考察",
        startSlideId: "S77",
      },
    ],
  };

  const out = {
    meta,
    citations: existing.citations || {},
    slides: merged,
  };

  const refs = collectReferencedImages(merged);
  const copied = copyImages(refs);

  fs.writeFileSync(SLIDES_JSON, JSON.stringify(out, null, 2) + "\n", "utf8");

  const counts = {};
  for (const s of generated) {
    counts[s.visual.type] = (counts[s.visual.type] || 0) + 1;
  }
  console.log(
    `Wrote ${merged.length} slides (intro=${introSlides.length}, generated=${generated.length})`
  );
  console.log("Visual type counts (S only):", counts);
  console.log(`Images referenced: ${refs.size}, copied/updated: ${copied}`);
  console.log(`Output: ${SLIDES_JSON}`);
}

main();
