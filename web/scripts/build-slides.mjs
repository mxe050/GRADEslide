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

/**
 * Returns true if `t` is essentially noise — a single token like a researcher
 * label ("Tange1)"), a bare number ("1.62"), or extremely short fragment.
 * These show up frequently in the auto-extracted body of slides whose
 * original PPT used the text just to label a forest plot or table cell.
 */
function isNoise(t) {
  if (!t) return true;
  const s = t.trim();
  if (s.length < 3) return true;
  // Pure numbers / numbers with delimiters
  if (/^[\d.,\-+%]+$/.test(s)) return true;
  // Single Latin name with optional citation marker, e.g. "Tange1)"
  if (/^[A-Z][a-zA-Z]+\d{0,2}\)?$/.test(s)) return true;
  // Single Japanese shape decoration ("→", "×" etc.)
  if (/^[→←↑↓●◯○×・…〜＝]+$/.test(s)) return true;
  return false;
}

/** Drop noise bullets and consecutive duplicates. */
function cleanBullets(arr) {
  const out = [];
  let last = "";
  for (const raw of arr) {
    const t = (raw || "").trim();
    if (!t || isNoise(t)) continue;
    if (t === last) continue; // de-duplicate adjacent
    out.push(t);
    last = t;
  }
  // Also drop exact duplicates anywhere in the list (keep first occurrence)
  const seen = new Set();
  return out.filter((t) => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
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
// EBM先生 explains using the extracted body text — but with junk filtered
// out, so we don't surface fragments like "Tange1)" or "1.62" as a sentence
// from the teacher.
//
// Curated overrides (REVISED_OVERRIDES below) replace these with hand-
// crafted dialogues for the most important slides.
function autoDialogue(title, rawBody) {
  // Split into paragraphs and drop noise lines.
  const paragraphs = (rawBody || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((p) => !isNoise(p));

  // Drop adjacent duplicates and de-dupe globally.
  const seen = new Set();
  const cleaned = [];
  let last = "";
  for (const p of paragraphs) {
    if (p === last) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    cleaned.push(p);
    last = p;
  }

  if (cleaned.length === 0) {
    return [
      `初心者: 「${title}」 — このスライドのポイントを教えてください。`,
      `EBM先生: このスライドは原 PowerPoint から自動抽出した本文がノイズで、ここに展開できる解説テキストがありません。タイトル「${title}」が示すトピックについて、Core GRADE 1〜6 の該当章 (例: 確実性なら Core GRADE 1、不精確さなら Core GRADE 2) を参照してください。`,
      `初心者: 後で coreGRADE シリーズで確認してみます。`,
    ].join("\n\n");
  }

  // Take up to 4 substantive paragraphs for the teacher's explanation.
  // Prefer paragraphs with reasonable length (more likely to be sentences).
  const substantive = cleaned.filter((p) => p.length >= 8).slice(0, 4);
  const teacherText =
    substantive.length > 0
      ? substantive.join("\n\n")
      : cleaned.slice(0, 3).join(" / ");

  return [
    `初心者: 「${title}」って、どういうことですか？`,
    `EBM先生: ${teacherText}`,
    `初心者: ありがとうございます。要点を押さえて理解できそうです。`,
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
  // NOTE: heading omitted to avoid duplicating the slide title (h2).
  if (!visual && imageShapes.length === 1 && bodyShapes.length > 0) {
    const rawBullets = bodyShapes
      .flatMap((sh) =>
        sh.text_frame.paragraphs.map(paragraphText).filter(Boolean)
      )
      .map(sanitizeText);
    const bullets = cleanBullets(rawBullets).slice(0, 6);
    if (bullets.length > 0) {
      visual = {
        type: "imageCard",
        data: {
          heading: "",
          image: {
            src: imageRelPath(imageShapes[0].image_file),
            alt: title,
          },
          bullets,
        },
      };
    } else {
      // Image with only noise text → just show the image with caption.
      visual = {
        type: "image",
        data: {
          src: imageRelPath(imageShapes[0].image_file),
          alt: title,
          caption: title,
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
  // NOTE: We intentionally don't set `heading` here — the slide title is
  // already shown by VisualPanel as h2 above the card. Setting heading=title
  // (which we used to do) caused duplicate text in the rendered slide.
  if (!visual) {
    const rawParas = bodyShapes
      .flatMap((sh) =>
        sh.text_frame.paragraphs.map(paragraphText).filter(Boolean)
      )
      .map(sanitizeText);
    const allParas = cleanBullets(rawParas);

    if (allParas.length === 0) {
      visual = {
        type: "card",
        data: {
          body: "（このスライドには解説テキストが含まれていません。詳しい解説は下のEBM先生の対話を参照してください。）",
        },
      };
    } else if (allParas.length === 1 && allParas[0].length > 60) {
      visual = {
        type: "card",
        data: { body: allParas[0] },
      };
    } else {
      visual = {
        type: "card",
        data: { bullets: allParas.slice(0, 8) },
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

// Slides where the auto-extracted body is just noise (researcher names,
// numbers from a forest plot etc.). For these we replace title + visual +
// dialogue with hand-crafted educational content.
const NOISE_SLIDE_OVERRIDES = {
  S20: {
    title: "メタ分析という統計手法",
    visual: {
      type: "card",
      data: {
        bullets: [
          "**メタ分析 (meta-analysis)** = 複数の研究結果を**量的に統合**する統計手法",
          "個々の研究の効果推定値 (相対危険度・オッズ比など) を**サンプルサイズで重み付け**してまとめる",
          "より大きな研究はより重く、小さな研究はより軽く扱う",
          "出力: **統合された効果推定値 + 95% 信頼区間**",
          "前提: 研究を網羅的に検索し、適格基準で選定した SR の中で実施する",
        ],
      },
    },
    narration: [
      "初心者: メタ分析って具体的に何をしているんですか？",
      "EBM先生: 複数の研究結果を**量的に統合**する統計手法です。例えば「治療 X が死亡リスクを下げるか」を調べた研究が 4 本あったら、それらを単純平均ではなく、**サンプルサイズで重み付け**して 1 つの数字にまとめます。",
      "初心者: 大きな研究の方が信頼できるから、重く扱うんですね。",
      "EBM先生: その通り。出力は**統合された相対危険度や オッズ比 + 95% 信頼区間**。例えば 4 研究のメタ分析で「相対危険度 0.85 (95%CI 0.72–1.01)」というふうに出ます。\n\nただし重要な前提として、**SR の中で実施する**こと。研究を恣意的に選ばず、網羅的に検索した上でメタ分析するから初めて意味のある統合になります。",
      "初心者: 単に集めるだけじゃダメで、SR の枠組みが必要なんですね。",
    ].join("\n\n"),
    citationIds: ["coreGRADE1", "coreGRADE3", "gradeHandbook"],
  },
  S21: {
    title: "個々の研究の質を評価する — バイアスのリスク",
    visual: {
      type: "comparison",
      data: {
        leftHeader: "丁寧に作られていた → バイアスのリスク=低",
        rightHeader: "いい加減に作られていた → バイアスのリスク=高",
        rows: [
          { left: "ランダム化が適切", right: "ランダム化が不明 / 不適切" },
          { left: "盲検化が確実", right: "盲検化なし / 不十分" },
          { left: "脱落者が少ない", right: "脱落多い・追跡不完全" },
          { left: "ITT解析", right: "Per-protocol のみ" },
          { left: "**結果の確実性=高**", right: "**結果の確実性=低**" },
        ],
      },
    },
    narration: [
      "初心者: 同じ「相対危険度 1.62」という結果でも、論文の質によって意味が変わるんですか？",
      "EBM先生: そう、まさにそこが GRADE の核心です。論文の質が**丁寧 (バイアスのリスク=低)** か**いい加減 (バイアスのリスク=高)** かで、結果の確実性は大きく違います。",
      "初心者: バイアスって、具体的にどう評価するんですか？",
      "EBM先生: ROBUST-RCT や Cochrane RoB 2 などのチェックツールで、**ランダム化の適切性、盲検化、脱落、追跡完全性、ITT解析**などをチェックします。Core GRADE 4 (Risk of Bias) で詳述されています。",
      "初心者: 結果は同じ数字でも、意味が違ってくるんですね。",
      "EBM先生: それが「**結果がある／ない**」と「**結果がどれくらい確かか**」を区別する GRADE の真髄です。",
    ].join("\n\n"),
    citationIds: ["coreGRADE4", "robustRCT", "gradeHandbook"],
  },
  S22: {
    title: "バイアスのリスク評価が確実性を決める",
    visual: {
      type: "card",
      data: {
        bullets: [
          "メタ分析の結果が **相対危険度 1.62** だったとしても — 数字は同じ",
          "**論文がすべて丁寧** に作られていれば → 結果の確実性=**高**",
          "**論文がすべていい加減** に作られていれば → 結果の確実性=**低**",
          "つまり「効果がある」と「効果がどれくらい確かか」は別問題",
          "GRADE 5要因の **第1要因** がこのバイアスのリスク",
        ],
      },
    },
    narration: [
      "初心者: メタ分析の結果が「相対危険度 1.62」と出たら、それで終わりですか？",
      "EBM先生: いいえ、ここからが GRADE の出番です。**同じ 1.62 でも、含まれる論文の質次第で「確実性=高」になることも「確実性=低」になることもある**。",
      "初心者: バイアスのリスクが低い (=丁寧な研究) ばかりなら、結果は信用できる。",
      "EBM先生: 正解。逆に**いい加減な研究 (バイアスのリスク=高) ばかりなら、1.62 という数字は本当の効果を反映していない可能性**があります。Core GRADE 4 では、ROBUST-RCT などのツールで個々の研究のバイアスを評価することが必須とされています。",
      "初心者: ここが GRADE 5 要因の最初の評価項目なんですね。",
      "EBM先生: その通り。バイアス・非一貫性・非直接性・不精確さ・出版バイアス、の 5 要因のトップに来ます。",
    ].join("\n\n"),
    citationIds: ["coreGRADE1", "coreGRADE4", "gradeHandbook"],
  },
  S23: {
    title: "各研究の結果のバラツキ — 非一貫性 (Inconsistency)",
    visual: {
      type: "card",
      data: {
        bullets: [
          "4 つの研究 (Tange / Yuasa / Nangou / Aihara) のメタ分析を考える",
          "結果が **すべて似た方向** (例: 全部 1.5〜1.8 の範囲) → 一貫している",
          "結果が **大きく異なる** (例: 0.5、1.0、1.6、3.0) → 非一貫性あり",
          "メタ分析の数値 (例: 1.62) は同じでも、**バラツキの大きさで確実性が変わる**",
          "GRADE 5要因の **第2要因** = 非一貫性 (inconsistency)",
        ],
      },
    },
    narration: [
      "初心者: もし 4 つの研究 (Tange、Yuasa、Nangou、Aihara) を集めてメタ分析したとして、研究ごとの結果がバラついていたら、どう扱うんですか？",
      "EBM先生: 良い疑問です。メタ分析の最終的な数字 (例: 相対危険度 1.62) は同じでも、**個々の研究結果がどれくらいバラついているか** で確実性は変わります。",
      "初心者: 全部の研究が 1.5 〜 1.8 の範囲なら一貫、0.5 から 3.0 までバラついていたら非一貫、ということですね。",
      "EBM先生: その通り。これが GRADE 5要因の**第2要因「非一貫性 (Inconsistency)」**。Core GRADE 3 で詳述されています。**点推定値の重なり、信頼区間の重なり、I² 統計量** などを多面的にチェックします。",
      "初心者: 非一貫性が大きいと、確実性をダウングレードするんですね。",
      "EBM先生: そうです。「メタ分析の値は出たが、研究ごとに見るとバラバラ」という状態は、その値を**そのまま信用できない**ことを意味します。",
    ].join("\n\n"),
    citationIds: ["coreGRADE3", "gradeHandbook"],
  },
  S24: {
    title: "同じ「1.62」でも確実性が違う — フォレストプロットで見る",
    visual: {
      type: "card",
      data: {
        bullets: [
          "**ケース A**: 4 研究すべてが 1.5〜1.8 に固まる → メタ分析 1.62、確実性=**高**",
          "**ケース B**: 4 研究が 0.5 / 1.0 / 1.6 / 3.0 とバラける → メタ分析 1.62、確実性=**低**",
          "両ケースとも統合値は同じ 1.62。しかし**結果の信頼性は天と地の差**",
          "**フォレストプロット** = 各研究と統合値を縦に並べた図 (バラツキが視覚的に分かる)",
          "GRADE では非一貫性でこのケース B をダウングレードする",
        ],
      },
    },
    narration: [
      "初心者: 「同じ 1.62 でも確実性が違う」って、どう見抜くんですか？",
      "EBM先生: **フォレストプロット**で視覚化するのが定番です。各研究の点推定値と信頼区間を**縦に並べて**、最下段にメタ分析の統合値を書く図です。",
      "初心者: 各研究が 1.5〜1.8 の狭い範囲に固まっていれば、確実性は高い。",
      "EBM先生: そう。逆に 0.5 から 3.0 までバラついていたら、たまたま統合値が 1.62 になっただけで、**真の効果がどれかは分からない**状態。Core GRADE 3 (Inconsistency) ではこの非一貫性を点推定の重なり・CI の重なり・I² で評価します。",
      "初心者: メタ分析の数字だけ見ると見落とすんですね。",
      "EBM先生: その通り。だから AI-EBM 先生の発表では、**フォレストプロット + 非一貫性の判定**を必ずセットで提示します。GRADE のエビデンスプロファイルでもこの情報が脚注に載ります。",
    ].join("\n\n"),
    citationIds: ["coreGRADE3", "coreGRADE6", "gradeHandbook"],
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
  const ns = NOISE_SLIDE_OVERRIDES[slide.id];
  if (ns) return { ...slide, ...ns };
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
