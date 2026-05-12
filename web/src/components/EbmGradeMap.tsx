"use client";

import Image from "next/image";
import Link from "next/link";

const MAP_COVER_SLIDE_ID = "MAP0";
const MAP_IMAGE_SRC = "/images/ebm-grade-map/ebm-grade-map.png";

type MapHotspot = {
  label: string;
  href: string;
  left: string;
  top: string;
  width: string;
  height: string;
};

type MapExcerpt = {
  eyebrow: string;
  title: string;
  body: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};

const coverHotspots: MapHotspot[] = [
  {
    label: "EBMとGRADEは同じ流れ",
    href: "/slide/N3",
    left: "0.6%",
    top: "6.7%",
    width: "98.8%",
    height: "9.4%",
  },
  {
    label: "EBMからGRADEへの発展",
    href: "/slide/N1",
    left: "0.6%",
    top: "16.5%",
    width: "98.8%",
    height: "13.2%",
  },
  {
    label: "Clinical Question (PICO)",
    href: "/slide/S55",
    left: "0.6%",
    top: "30.3%",
    width: "30.8%",
    height: "16.6%",
  },
  {
    label: "重要アウトカム決定",
    href: "/slide/S60",
    left: "31.9%",
    top: "30.3%",
    width: "23.3%",
    height: "16.6%",
  },
  {
    label: "エビデンスの確実性評価",
    href: "/slide/S64",
    left: "56.0%",
    top: "30.3%",
    width: "43.4%",
    height: "16.6%",
  },
  {
    label: "SoF",
    href: "/slide/S90",
    left: "0.6%",
    top: "47.2%",
    width: "30.6%",
    height: "17.8%",
  },
  {
    label: "Evidence to Decision",
    href: "/slide/S68",
    left: "31.7%",
    top: "47.2%",
    width: "67.7%",
    height: "17.8%",
  },
  {
    label: "推奨の方向と強さ",
    href: "/slide/S65",
    left: "0.6%",
    top: "65.9%",
    width: "62.3%",
    height: "13.0%",
  },
  {
    label: "4つの推奨パターン",
    href: "/slide/S66",
    left: "63.6%",
    top: "65.9%",
    width: "35.8%",
    height: "13.0%",
  },
  {
    label: "EBMの5ステップとCore GRADE",
    href: "/slide/S8",
    left: "0.6%",
    top: "79.4%",
    width: "98.8%",
    height: "15.0%",
  },
];

const topicLinks = [
  { label: "PICO", href: "/slide/S55" },
  { label: "アウトカム", href: "/slide/S60" },
  { label: "確実性評価", href: "/slide/S64" },
  { label: "SoF", href: "/slide/S90" },
  { label: "EtD", href: "/slide/S68" },
  { label: "推奨", href: "/slide/S65" },
  { label: "5ステップ", href: "/slide/S8" },
];

const mapExcerpts: Array<MapExcerpt & { slideIds: string[] }> = [
  {
    slideIds: ["N3"],
    eyebrow: "全体地図",
    title: "EBMとGRADEは、同じ流れの上にある",
    body: "このアプリ全体の骨格です。批判的吟味で根拠を読み、GRADEで確実性と推奨を透明に整理します。",
    src: "/images/ebm-grade-map/top-message.png",
    alt: "EBMとGRADEは同じ流れにあることを示すポスター上部",
    width: 930,
    height: 157,
  },
  {
    slideIds: ["N1", "S10"],
    eyebrow: "発展の流れ",
    title: "経験・権威から、SR、GRADE、Core GRADEへ",
    body: "A薬の主張を読むときも、この流れで位置づけます。ラベルではなく、根拠の集め方と確実性を見ます。",
    src: "/images/ebm-grade-map/development-flow.png",
    alt: "EBM以前から批判的吟味、SR、EBMの意思決定、GRADE、Core GRADEへ進む流れ",
    width: 933,
    height: 221,
  },
  {
    slideIds: ["S8", "S106"],
    eyebrow: "対応関係",
    title: "EBMの5ステップは、Core GRADEの作業に対応する",
    body: "AskからAssessまでを、臨床疑問、アウトカム、批判的吟味、EtD、振り返りに対応させて眺めます。",
    src: "/images/ebm-grade-map/steps-core-grade.png",
    alt: "EBMの5ステップとCore GRADEの対応関係",
    width: 930,
    height: 250,
  },
  {
    slideIds: ["S55"],
    eyebrow: "Step 1",
    title: "Clinical QuestionはPICOで固定する",
    body: "PICOを先に決めると、検索、評価、推奨の対象がぶれません。EBMの出発点は、よい問いを立てることです。",
    src: "/images/ebm-grade-map/pico.png",
    alt: "PICOの定義とClinical Questionの要点",
    width: 291,
    height: 278,
  },
  {
    slideIds: ["S60", "S104"],
    eyebrow: "Step 2",
    title: "重要アウトカムは、患者にとって重要かで決める",
    body: "critical、important、not importantを分けることで、効果の数字を患者の意思決定に接続できます。",
    src: "/images/ebm-grade-map/outcomes.png",
    alt: "重要アウトカム決定の基準",
    width: 219,
    height: 278,
  },
  {
    slideIds: ["S27", "S64"],
    eyebrow: "Step 3",
    title: "確実性は、下げる理由と上げる理由を明示する",
    body: "Risk of Bias、Inconsistency、Indirectness、Imprecision、Publication biasを、アウトカムごとに点検します。",
    src: "/images/ebm-grade-map/certainty.png",
    alt: "GRADEの確実性評価とグレードダウン、アップグレード要因",
    width: 408,
    height: 278,
  },
  {
    slideIds: ["S90"],
    eyebrow: "SoF",
    title: "SoFは、絶対効果と確実性をアウトカムごとに並べる",
    body: "読み手が最初に確認すべき表です。効果の大きさと確実性を同じ場所で見ます。",
    src: "/images/ebm-grade-map/sof.png",
    alt: "Summary of Findings表の例",
    width: 288,
    height: 298,
  },
  {
    slideIds: ["S68", "S95"],
    eyebrow: "Step 4",
    title: "EtDで、エビデンスから推奨への理由を残す",
    body: "利益・害、確実性、価値観、資源、公平性、実行可能性を同じ枠で議論し、判断の道筋を追跡可能にします。",
    src: "/images/ebm-grade-map/etd.png",
    alt: "Evidence to DecisionのCore項目とOption項目",
    width: 637,
    height: 298,
  },
  {
    slideIds: ["S65"],
    eyebrow: "Step 5",
    title: "推奨は、方向と強さを分けて決める",
    body: "する・しないという方向と、強い・条件付きという強さは別の判断です。",
    src: "/images/ebm-grade-map/recommendation-direction.png",
    alt: "推奨の方向と強さの整理",
    width: 586,
    height: 218,
  },
  {
    slideIds: ["S66", "S67"],
    eyebrow: "推奨パターン",
    title: "4つの推奨パターンで、患者との相談の深さが変わる",
    body: "強い推奨、条件付き推奨、条件付きで推奨しない、強く推奨しないを区別します。",
    src: "/images/ebm-grade-map/recommendation-patterns.png",
    alt: "4つの推奨パターン",
    width: 337,
    height: 218,
  },
];

export function isEbmGradeMapCoverSlide(slideId: string) {
  return slideId === MAP_COVER_SLIDE_ID;
}

export function EbmGradeMapCover() {
  return (
    <section className="reading-column ebm-map-column w-full">
      <div className="ebm-map-cover">
        <div className="ebm-map-cover-copy">
          <span className="ebm-map-kicker">学習地図</span>
          <h2>この図が、今回の基本です</h2>
          <p>
            EBMの文脈で、PICO、重要アウトカム、確実性評価、SoF、EtD、推奨作成を一つの流れとして読みます。
          </p>
        </div>
        <div className="ebm-map-shell">
          <Image
            src={MAP_IMAGE_SRC}
            alt="EBMからGRADEへ、批判的吟味からエビデンスの確実性評価と推奨作成へ進む学習地図"
            width={941}
            height={1672}
            sizes="(min-width: 1024px) 56rem, 100vw"
            className="ebm-map-image"
            priority
          />
          {coverHotspots.map((spot) => (
            <Link
              key={spot.label}
              href={spot.href}
              className="ebm-map-hotspot"
              style={{
                left: spot.left,
                top: spot.top,
                width: spot.width,
                height: spot.height,
              }}
              aria-label={`${spot.label}へ移動`}
              title={spot.label}
            />
          ))}
        </div>
        <nav className="ebm-map-topic-links" aria-label="EBM-GRADE学習地図">
          {topicLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}

export function EbmGradeMapExcerpt({ slideId }: { slideId: string }) {
  const excerpt = mapExcerpts.find((item) => item.slideIds.includes(slideId));

  if (!excerpt) return null;

  return (
    <section className="reading-column w-full">
      <aside className="ebm-map-excerpt" aria-label="EBMからGRADEへの対応図">
        <div className="ebm-map-excerpt-copy">
          <span>{excerpt.eyebrow}</span>
          <h3>{excerpt.title}</h3>
          <p>{excerpt.body}</p>
        </div>
        <div className="ebm-map-excerpt-scroll">
          <Image
            src={excerpt.src}
            alt={excerpt.alt}
            width={excerpt.width}
            height={excerpt.height}
            sizes="(min-width: 768px) 48rem, 130vw"
            className="ebm-map-excerpt-image"
          />
        </div>
      </aside>
    </section>
  );
}
