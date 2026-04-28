#!/usr/bin/env node
// Convert pptx_work/extracted_output/extracted.json (106 slides) into S1〜S106
// slide entries, merge with existing N1〜N6 in public/data/slides.json, and copy
// referenced images into public/images/slides/.
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

function shapeText(sh) {
  if (!sh.text_frame) return "";
  return sh.text_frame.paragraphs
    .map((p) => p.runs.map((r) => r.text || "").join(""))
    .map((t) => t.trim())
    .filter(Boolean)
    .join("\n");
}

function paragraphText(p) {
  return p.runs
    .map((r) => r.text || "")
    .join("")
    .trim();
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

function cleanTitle(t) {
  if (!t) return "";
  // Strip trailing version-edition noise (Japanese):
  //   "...原則：追加情報第3版：Users‘ Guides..." → "...原則"
  let s = t.replace(/[：:]\s*(?:追加情報|参考)?第?\d+版.*$/, "");
  // Strip trailing author citation that starts with "<Name>, <Initial>." pattern:
  //   "システマティックレビューの定義Higgins, J. P. T.," → "システマティックレビューの定義"
  s = s.replace(/[A-Z][a-zA-Z]+,\s*[A-Z]\.\s*[A-Z]?\.?.*$/, "");
  // Strip "et al" suffix
  s = s.replace(/\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?\s+et\s+al\.?.*$/, "");
  return s.trim();
}

function pickTitle(textShapes) {
  // textShapes already sorted by top.pt asc.
  // For each candidate, compute "cleaned" first paragraph (citation suffix stripped)
  // then score by length, font size, placeholder name, position.
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

    // Strong bonus for the topmost shape — most slides put title on top
    score -= i * 0.5;
    return { sh, score, len, cleaned };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].sh;
}

function sectionFor(slideIdx) {
  if (slideIdx <= 40) return "1. 診療ガイドラインの定義を理解";
  if (slideIdx <= 76) return "2. 診療ガイドライン作成を学ぶ";
  return "3. 推奨決定の深い考察";
}

function sanitizeText(t) {
  if (!t) return t;
  // collapse whitespace, drop control chars
  return t.replace(/　/g, " ").replace(/[\t ]+/g, " ").trim();
}

function buildSlide(raw, introCount) {
  const slideIdx = raw.slide_index;
  const id = `S${slideIdx}`;
  const order = introCount + slideIdx;

  // Collect shapes (still needed to derive title + narration text)
  const allShapes = (raw.shapes || []).slice();
  const textShapes = allShapes
    .filter((sh) => sh.text_frame && shapeText(sh))
    .sort((a, b) => topPt(a) - topPt(b) || leftPt(a) - leftPt(b));

  const titleShape = pickTitle(textShapes);
  let title = titleShape
    ? sanitizeText(cleanTitle(firstParagraph(titleShape)))
    : "";
  if (!title) title = `スライド ${slideIdx}`;
  if (title.length > 40) title = title.slice(0, 38) + "…";

  const bodyShapes = textShapes.filter((s) => s !== titleShape);

  // narration: join body paragraphs with blank lines (used in NarrationPanel)
  const narrationParts = [];
  for (const sh of bodyShapes) {
    const t = shapeText(sh);
    if (t) narrationParts.push(t);
  }
  const narration =
    narrationParts.join("\n\n") ||
    `*このスライドの解説テキストは原 PowerPoint から自動抽出されたものです。*`;

  // Visual: always use the rendered full slide image (1600×900 JPEG exported
  // from the original sample.pptx). The image already contains the title and
  // every visual element, so we don't render a separate title above it.
  const padded = String(slideIdx).padStart(3, "0");
  const visual = {
    type: "slideImage",
    data: {
      src: `/images/slides-full/slide${padded}.jpg`,
      alt: title,
    },
  };

  return {
    id,
    order,
    section: sectionFor(slideIdx),
    title,
    visual,
    narration,
  };
}

// ---------- revised overrides (from spec 5.2 / 5.3) ----------
// These preserve auto-generated narration's section/order but replace the
// visual + title + narration with manually curated content where the spec
// provides it.

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
    speakerNotes:
      "AI を使ったハルシネーションがある検索より、PubMed で SR を直接検索する方が確実、という補足が原スライドにある",
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
          [
            "非一貫性 (inconsistency)",
            "inconsistency",
            "論文間で結果が異なっていれば",
          ],
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
      "これが現在世界的に使われている診療ガイドラインの定義です。「ふーん、そうなんだ」ではなく、「なるほど、だからそうなのか」と理解できるように、ここまで一緒に考えてきました。\n\nキーワードは「システマティックレビュー」「利益と害の評価」「患者ケアの最適化」「推奨」。これらすべてに、必然的な理由があります。",
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
          [
            "5",
            "声明は明確で実行可能か",
            "何を・どこで・誰がするかが明示されている",
          ],
        ],
        caption: "GPSは5要件すべてを満たす必要がある",
      },
    },
    narration:
      "Good Practice Statement、略してGPSは、エビデンスの確実性や推奨の強さの正式評価には適さないが、明確に必要な行動を示す声明です。\n\n発行するには、ここに示す5要件をすべて満たす必要があります。逆に言えば、信頼できるエビデンスベースのガイドラインなら、非公式な推奨は完全に避けられるはずです。",
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
      "P値至上主義からの脱却が、近年の重要なテーマです。「有意差がない」ことは「差がない」ことを意味しません。\n\n帰無仮説を棄却できなくても、治療がアウトカムに影響しないとは言えない。点推定値と95%信頼区間の幅を見て、臨床的に意味のある効果があり得るかを議論する — これがGRADEで推奨される姿勢です。",
    citationIds: ["amrhein2019"],
  },
};

// Title-only overrides — body / narration / visual are kept from auto-extraction.
// Use when the original PPTX has no clear title placeholder and the auto
// heuristic produced a truncated body sentence as the title.
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
  if (ov) {
    // The slide *image* is the visual — don't replace it with curated visuals
    // even if the override defines them. We still pull the curated narration,
    // title, citations, warnings, and speaker notes.
    const merged = { ...slide };
    if (ov.title) merged.title = ov.title;
    if (ov.narration) merged.narration = ov.narration;
    if (ov.citationIds) merged.citationIds = ov.citationIds;
    if (ov.warnings) merged.warnings = ov.warnings;
    if (ov.speakerNotes) merged.speakerNotes = ov.speakerNotes;
    return merged;
  }
  const t = TITLE_OVERRIDES[slide.id];
  if (t) return { ...slide, title: t };
  return slide;
}

// ---------- image copy ----------

function collectReferencedImages(slides) {
  const refs = new Set();
  for (const s of slides) {
    const v = s.visual;
    if (v.type === "image") refs.add(path.basename(v.data.src));
    if (v.type === "imageCard") refs.add(path.basename(v.data.image.src));
    if (v.type === "imageComparison") {
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

  const introSlides = (existing.slides || []).filter((s) => /^N\d+$/.test(s.id));
  const introCount = introSlides.length;

  const generated = extracted.slides
    .filter((s) => !s.extract_error)
    .map((s) => buildSlide(s, introCount))
    .map(applyOverride);

  const merged = [...introSlides, ...generated];

  // Update meta sections — drop "（準備中）"
  const meta = {
    ...existing.meta,
    version: "0.2.0-step2",
    sections: [
      { id: "intro", title: "0. 導入：AI-EBM先生に学ぶ", startSlideId: "N1" },
      { id: "definition", title: "1. 診療ガイドラインの定義を理解", startSlideId: "S1" },
      { id: "creation", title: "2. 診療ガイドライン作成を学ぶ", startSlideId: "S41" },
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

  // Copy images referenced by generated slides
  const refs = collectReferencedImages(generated);
  const copied = copyImages(refs);

  fs.writeFileSync(SLIDES_JSON, JSON.stringify(out, null, 2) + "\n", "utf8");

  // Summary
  const counts = {};
  for (const s of generated) {
    counts[s.visual.type] = (counts[s.visual.type] || 0) + 1;
  }
  console.log(
    `Wrote ${merged.length} slides (intro=${introSlides.length}, generated=${generated.length})`
  );
  console.log("Visual type counts:", counts);
  console.log(`Images referenced: ${refs.size}, copied/updated: ${copied}`);
  console.log(`Output: ${SLIDES_JSON}`);
}

main();
