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
  const narration =
    narrationParts.join("\n\n") ||
    `*このスライドの解説テキストは原 PowerPoint から自動抽出されています。*`;

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
    narration:
      "EBMの古典的な定義です。ポイントは「個々の患者」「最良の根拠」「思慮深く」の3つ。\n\n「最良の根拠」とは何か、「思慮深く用いる」とはどういうことか — これを理解することが、診療ガイドラインを理解する出発点です。",
    citationIds: ["sackett1996"],
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
    narration:
      "EBMの3つの基本原則。これは Users' Guides to the Medical Literature 第3版（2015）に明記されているものです。\n\n特に3つ目の「エビデンスだけでは十分ではない」が重要です。患者の価値観、コスト、実行可能性まで考えなければ、本当の臨床決断はできません。",
    citationIds: ["usersGuides2015"],
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
    narration:
      "エビデンスの確実性を下げる5要因。これがGRADEアプローチの中核です。\n\nそれぞれの要因について、5つの「もし〜だったら」を考えていきます。これらをチェックすることで、「単なるメタ分析の結果」ではなく「どれくらい信頼できる結果か」を評価できます。",
    citationIds: ["coreGRADE1", "coreGRADE2", "coreGRADE4"],
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
    narration:
      "これが現在世界的に使われている診療ガイドラインの定義です。「ふーん、そうなんだ」ではなく、「なるほど、だからそうなのか」と理解できるように、ここまで一緒に考えてきました。",
    warnings: ["この定義に従っていないものは「信頼できない診療ガイドライン」となる"],
    citationIds: ["iom2011"],
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
    narration:
      "Good Practice Statement、略してGPSは、エビデンスの確実性や推奨の強さの正式評価には適さないが、明確に必要な行動を示す声明です。",
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
    narration:
      "P値至上主義からの脱却が、近年の重要なテーマです。「有意差がない」ことは「差がない」ことを意味しません。",
    citationIds: ["amrhein2019"],
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
