#!/usr/bin/env node
// Step 17 (Phase 2-4): セクション 2 後半 (S60-S76) の narration 整流
//
//  S60-S76 では narration とスライドのトピックがバラバラに入れ違っていた。
//  各スライドのレンダリング画像 (slide060-076.jpg) を読んで、内容に合致する
//  narration に再配置する。元 narration を最大限再利用 (移動) しつつ、
//  該当する narration が無いものは元 PPT 画像から書き起こす。
//
//  実行: cd web && node scripts/step17-realign-narrations-s60-s76.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_JSON = path.resolve(__dirname, "..", "public", "data", "slides.json");
const data = JSON.parse(fs.readFileSync(SLIDES_JSON, "utf8"));

function get(id) {
  return data.slides.find((s) => s.id === id);
}

// 既存 narration を保存
const old = {};
for (let i = 60; i <= 76; i++) {
  const id = "S" + i;
  const s = get(id);
  if (s) old[id] = s.narration;
}

// 整流: 各スライドに正しいトピックの narration を再配置
const newNar = {
  // S60: アウトカム重要性 ← old S69 (各アウトカム相対的重要性)
  S60: old.S69,

  // S61: アウトカム評価への取り組み — slide061.jpg ベースの新規
  S61:
    "アウトカム評価では **7 つ以下が望ましい** (ルールではない)。意思決定における **重大 / 重大ではないが重要 / 重要ではない** を **1〜9 の評価尺度** で示します。\n\n" +
    "同じ「重大」でも、例えば **7 = 肺炎、9 = 死亡** では効用値が異なる、という具体性で評価します。\n\n" +
    "アウトカムは **重要性** によって決まるべきで、「測定が容易」 「SR に記載がある」 「RCT のプライマリーアウトカム」 だから、という理由で選んではいけません。**代替アウトカムも含め、意思決定に必要な全アウトカムを考慮** します。",

  // S62: エビデンス採用 ← old S63 (パネルとSR班の役割)
  S62: old.S63,

  // S63: SR/MA/NMA違い ← old S60 (SR/MA定義)
  S63: old.S60,

  // S64: 5要因 ← old S61 (5要因確認) + 補足として old S62 (ダウングレード詳細)
  S64:
    (old.S61 ? old.S61 + "\n\n" : "") +
    (old.S62 || ""),

  // S65: 推奨作成・強さ ← old S64 (推奨作成・強さ)
  S65: old.S64,

  // S66: 推奨の構造 ← old S65 (推奨必須要素) + old S66 (強い vs 条件付き)
  S66:
    (old.S65 ? old.S65 + "\n\n" : "") +
    (old.S66 || ""),

  // S67: 方向性と強さ要因 ← old S67 (3 基準) — そのまま
  S67: old.S67,

  // S68: EtD framework ← old S68 — そのまま
  S68: old.S68,

  // S69: 文脈的要素 ← old S70 (費用対効果・公平性・実行可能性)
  S69: old.S70,

  // S70: バランス難しい場合 ← old S71 (バランス難しい)
  S70: old.S71,

  // S71: 合意形成 GPS の5要件 ← old S72 (投票ルール) + old S73 (GPS)
  S71:
    (old.S72 ? old.S72 + "\n\n" : "") +
    (old.S73 || ""),

  // S72: ピアレビュー — slide072.jpg ベースの新規
  S72:
    "**ガイドラインのピアレビュー** は他の視点からの修正のために奨励されています。完成前に外部専門家にレビューを依頼することで、パネル内では気付かない盲点や、利用者視点で分かりにくい部分を炙り出せます。\n\n" +
    "公開後も **利用者からのフィードバック** を集めて、将来のバージョンで改善すべき領域を特定。**他組織が同じトピックのガイドラインを更新中かどうかは、原則として独立して計画** します (重複を避けるためでなく、独自性・透明性を担保するため)。",

  // S73: 推奨なし不存在 ← old S75 (Schünemann 推奨なし不存在)
  S73: old.S75,

  // S74: 報告ピアレビュー ← old S74 (作成終わりじゃない) — そのまま
  S74: old.S74,

  // S75: 配布・実装 — slide075.jpg ベースの新規
  S75:
    "**配布と実装** は、ガイドラインを **「使われる文書」 にするための工程** です。\n\n" +
    "**積極的配布計画**: オンライン提供、記者会見、SNS 戦略、関係者団体の集まりでの配布、対象読者がアクセスする学術誌での掲載 — 利用者にリーチする多面的アプローチを盛り込みます。\n\n" +
    "**ツール・サポート開発**: モバイルアプリ、臨床決断支援システムへの組み込み、教育資源としての改変。**他言語翻訳のルールと規定** も事前に定めておきます。",

  // S76: 評価と使用 — slide076.jpg ベースの新規
  S76:
    "**評価と使用** は、ガイドラインの **効果を実際に測定する** 工程です。\n\n" +
    "**パイロットテスト**: 対象エンドユーザーで先に試す。**監視・監査ツールの提供**: 推奨が実際に実行されているか、ガイドライン実行で変化するアウトカムを特定し測定する方法を提案。\n\n" +
    "**前向き評価**: 実行後の効果を判断するためのサポートとツールを提供する。「作って終わり」 ではなく、**継続的に改善する仕組み** を組み込んでこそ、信頼できるガイドラインです。",
};

// 適用
for (const [id, nar] of Object.entries(newNar)) {
  const s = get(id);
  if (!s) continue;
  if (typeof nar === "string" && nar.length > 0) {
    s.narration = nar;
  }
}

data.meta.version = "0.13.0-step17-realign-s60-s76";

fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Step 17 complete: narrations realigned for S60-S76");
