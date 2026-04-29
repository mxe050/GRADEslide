#!/usr/bin/env node
// Step 20 (Phase 2-5): セクション 3 (S82-S90) の narration off-by-3 整流
//
//  S82-S87 では narration がスライドのトピックから 3 つほど前にずれていた:
//    S82 (具体例) の narration → 実際は S85 (Remarks) の話
//    S83 (追加事項) の narration → 実際は S86 (GPS 5要件) の話
//    ...
//
//  対応:
//   - S82, S83, S84: 元 PPT 画像 (slide082-084.jpg) ベースの新規 narration
//   - S85 ← 旧 S82 (Remarks 単独不成立)
//   - S86 ← 旧 S83 (GPS 5要件)
//   - S87 ← 旧 S84 (Impl Considerations Tools/Hints)
//   - S88 ← 旧 S85 + 旧 S86 (forest plot 読み方を統合)
//   - S89: 維持 (forest plot 仮想例)
//   - S90 ← 旧 S87 + 旧 S88 (EP/SoF intro + 確実性評価手順)
//   - S91: 維持 (最終確実性判定)
//
//  実行: cd web && node scripts/step20-realign-section3.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_JSON = path.resolve(__dirname, "..", "public", "data", "slides.json");
const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));

function get(id) { return data.slides.find((s) => s.id === id); }

// 旧 narration 保存
const old = {};
["S82","S83","S84","S85","S86","S87","S88"].forEach(id => {
  const s = get(id);
  if (s) old[id] = s.narration;
});

const newNar = {
  // S82: 具体例 — slide082.jpg ベース (推奨/GPS/実装事項の 3 例)
  S82:
    "**具体例** をいくつか見てみましょう。\n\n" +
    "**推奨事項 (Recommendation)**: 「外科的結核の兆候/症状がある成人と子供に対しては、リファンピシン耐性検出のため **培養と表現型 DST ではなく、Xpert MTB/RIF または Xpert Ultra を使用すべき**」 (強い推奨、確実性=高)。\n\n" +
    "**Good Practice Statement (GPS)**: 「オピオイド依存症の治療は、**医療システム内で提供されるべき**」 — 一般的な原則を述べる。\n\n" +
    "**実装の考慮事項**: 「イソニアジド耐性結核の治療開始前に、リファンピシンに対する **迅速な分子検査が必要**」 — 推奨実施の具体的な前提条件を示す。",

  // S83: 追加事項 — slide083.jpg ベース
  S83:
    "**追加事項** として 2 種類の要素があります。\n\n" +
    "**① Remarks (備考)**: 推奨事項をサポートする説明文。推奨を **理解するために必要な条件** を記述します。「実装の考慮事項」「ツール」「ヒント」 もまた、推奨を適切に使うための追加詳細を提供します。\n\n" +
    "**② 研究推奨 (Research recommendations)**: ガイドライン内に研究の文脈での介入使用を特定する声明。明示的または暗黙的に行動を起こすことを示唆する場合があります。\n\n" +
    "WHO ガイドライン作成ハンドブックなど権威ある文書でも、こうした声明の分類は **これまで包括的に記述されていなかった** ため、Lotfi 2022 等で分類法と概念枠組みが提案されました。",

  // S84: WHO 文書のまとめ — slide084.jpg ベース
  S84:
    "**WHO 文書を検討した結果**、推奨やそれ以外の声明が分類できました。\n\n" +
    "**Formal recommendations (正式な推奨)**:\n" +
    "**定義**: 特定の集団 (および設定) において、**2 つ以上の管理または政策オプション間の選択** に関する実行可能な声明。代替肢が比較対象でない場合は明記する。\n\n" +
    "**説明・注釈**: 選択肢を支持する **方向性 (賛成/反対)** と **強さ (強い/条件付き)** を示すべき。介入効果・検査精度・価値観・費用について **エビデンスの確実性** が明示されているのが理想。**SR や HTA に裏付けられている** べきです。\n\n" +
    "**正式な推奨ではないもの**: 完全なガイドライン、方針声明、その他の基準設定文書 — これらは「推奨」とは別に扱います。",

  // S85: Remarks ← 旧 S82
  S85: old.S82,

  // S86: GPS 5要件 (table) ← 旧 S83
  S86: old.S83,

  // S87: 実施考慮事項 ← 旧 S84
  S87: old.S84,

  // S88: forest plot 読み方 ← 旧 S85 + 旧 S86 を統合
  S88:
    (old.S85 ? old.S85 + "\n\n" : "") +
    (old.S86 || ""),

  // S89: 維持 (forest plot 仮想例 RR 1.x)
  // (no change)

  // S90: EP/SoF intro ← 旧 S87 + 旧 S88
  S90:
    (old.S87 ? old.S87 + "\n\n" : "") +
    (old.S88 || ""),

  // S91: 維持 (最終確実性判定)
};

for (const [id, nar] of Object.entries(newNar)) {
  const s = get(id);
  if (!s) continue;
  if (typeof nar === "string" && nar.length > 0) {
    s.narration = nar;
  }
}

data.meta.version = "0.15.0-step20-section3-realign";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Step 20 complete: S82-S90 narrations realigned");
