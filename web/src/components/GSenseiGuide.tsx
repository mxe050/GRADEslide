"use client";

import Image from "next/image";
import clsx from "clsx";
import type { Slide } from "@/lib/types";

type Variant = "context" | "narration";

interface Props {
  slide: Slide;
  variant: Variant;
}

const sectionTips: Record<string, string> = {
  "0. 導入：G先生に学ぶ": "まずは宣伝っぽい言葉を、PICO・絶対効果・確実性に分けて読みます。",
  "1. 診療ガイドラインの定義を理解": "定義の言葉を、SR・利益と害・患者ケアの3点に分解します。",
  "2. 診療ガイドライン作成を学ぶ": "作成手順を、誰が何を判断するかという流れで追います。",
  "3. 推奨決定の深い考察": "EtDを使って、推奨の方向と強さが決まる理由を見ます。",
};

const visualTips: Record<string, string> = {
  card: "カードは見出しを先に読み、太字だけを拾ってから本文に戻ると楽です。",
  table: "表は列見出しを確認してから、1行ずつ差を比べると迷いません。",
  comparison: "左右比較は、一度に全部読まず、同じ行の違いだけを見ます。",
  quote: "引用は結論ではなく、次に続く解説の出発点として読みます。",
  list: "リストは順番に意味があります。番号や並びを変えずに追いましょう。",
  image: "画像は細部より先に、何を対比している図かをつかみます。",
  imageCard: "画像で全体像、右側の箇条書きで読み方を確認します。",
  imageComparison: "画像比較は、見た目の違いを患者アウトカムの意味に戻します。",
  slideImage: "元スライド画像は、まず全体を眺め、必要ならタップで拡大します。",
  imagePair: "2枚の画像は、どちらが根拠として強いかを比べて読みます。",
};

const termTips: Array<[RegExp, string]> = [
  [/PICO|CQ|クエスチョン/, "PICOは、患者・介入・比較・アウトカムの順に声に出すと整理できます。"],
  [/RCT|ランダム化/, "RCTは強い設計ですが、盲検化・アウトカム・絶対効果まで見ます。"],
  [/SR|システマティックレビュー|メタ解析|メタ分析/, "SRはラベルではなく、検索・選択・統合・確実性評価の手続きとして読みます。"],
  [/確実性|GRADE|グレード/, "確実性は「どれくらい信じてよいか」です。高低だけでなく下げた理由を見ます。"],
  [/アウトカム|利益|害|MID/, "アウトカムは、測りやすさではなく患者にとっての重要性から考えます。"],
  [/推奨|recommend|suggest|EtD|条件付き|強い推奨/, "推奨は、方向・強さ・確実性・患者の価値観をセットで読みます。"],
  [/COI|利益相反|DOI/, "利益相反は人を責める話ではなく、判断が偏らない仕組みの話です。"],
  [/ガイドライン|CPG/, "ガイドラインは集団への文書、EBMは目の前の患者への適用です。"],
];

const poses = [
  "point-up",
  "clipboard",
  "present",
  "talk-side",
  "point-side",
  "wave",
  "clipboard-point",
  "invite",
] as const;

export function GSenseiGuide({ slide, variant }: Props) {
  const guide = buildGuide(slide);
  const pose = selectPose(slide, variant);
  const size = variant === "context" ? 86 : 116;

  return (
    <aside
      className={clsx(
        "g-sensei-guide",
        variant === "context" ? "g-sensei-guide--context" : "g-sensei-guide--narration"
      )}
      aria-label="G先生の読み方ガイド"
    >
      <div className="g-sensei-portrait" aria-hidden="true">
        <Image
          src={`/images/g-sensei/${pose}.jpg`}
          alt=""
          width={344}
          height={437}
          sizes={variant === "context" ? "86px" : "116px"}
          className="g-sensei-image"
          style={{ maxWidth: size }}
          priority={false}
        />
      </div>
      <div className="g-sensei-copy">
        <div className="g-sensei-label">G先生の読み方</div>
        <p className="g-sensei-message">{guide.message}</p>
        {variant === "narration" && (
          <ul className="g-sensei-points">
            {guide.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function buildGuide(slide: Slide): { message: string; points: string[] } {
  const haystack = `${slide.title}\n${slide.section}\n${slide.narration}`;
  const sectionTip = sectionTips[slide.section] ?? "このスライドの主張を、根拠・効果・確実性に分けて読みます。";
  const termTip =
    termTips.find(([pattern]) => pattern.test(haystack))?.[1] ??
    "まず結論を急がず、「何を根拠にそう言えるのか」を確認します。";
  const visualTip =
    visualTips[slide.visual.type] ?? "図表と本文を行き来して、同じ言葉を探しながら読みます。";

  return {
    message: sectionTip,
    points: [termTip, visualTip],
  };
}

function selectPose(slide: Slide, variant: Variant): (typeof poses)[number] {
  if (variant === "context") {
    if (slide.visual.type === "slideImage") return "clipboard";
    if (slide.visual.type === "comparison" || slide.visual.type === "imageComparison") return "point-side";
    if (slide.section.startsWith("0.")) return "wave";
    return "point-up";
  }
  const offset = slide.visual.type === "table" ? 1 : slide.visual.type === "comparison" ? 4 : 0;
  return poses[(slide.order + offset) % poses.length];
}
