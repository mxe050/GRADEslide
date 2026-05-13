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
    eyebrow: "EBMの全体地図",
    title: "EBMは、情報を患者の判断へ翻訳する流れ",
    body: "このアプリ全体の骨格です。GRADEは主役ではなく、信頼できる情報や推奨をEBMとして読むための補助線として使います。",
    src: "/images/ebm-grade-map/top-message.png",
    alt: "EBMとGRADEは同じ流れにあることを示すポスター上部",
    width: 930,
    height: 157,
  },
  {
    slideIds: ["N1", "S10"],
    eyebrow: "EBMの発展",
    title: "経験・権威から、系統的に読むEBMへ",
    body: "A薬の主張を読むときも、この流れで位置づけます。ラベルではなく、問い、集め方、患者アウトカム、確実性を見ます。",
    src: "/images/ebm-grade-map/development-flow.png",
    alt: "EBM以前から批判的吟味、SR、EBMの意思決定、GRADE、Core GRADEへ進む流れ",
    width: 933,
    height: 221,
  },
  {
    slideIds: ["S8", "S106"],
    eyebrow: "EBMの5ステップ",
    title: "AskからAssessまでを、読む順番にする",
    body: "Core GRADEの作業は、EBMの5ステップを推奨作成に拡張したものです。読み手は、どの段階の判断かを見れば迷いにくくなります。",
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
    title: "確実性は、読み手が推定値を信じるための情報",
    body: "Risk of Bias、Inconsistency、Indirectness、Imprecision、Publication biasは、推奨作成者だけでなく、情報の読み手にも必要な点検項目です。",
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
    title: "EtDは、推奨を読むための理由の地図",
    body: "利益・害、確実性、価値観、資源、公平性、実行可能性を読めると、その推奨をどの患者にどう使うべきかが見えます。",
    src: "/images/ebm-grade-map/etd.png",
    alt: "Evidence to DecisionのCore項目とOption項目",
    width: 637,
    height: 298,
  },
  {
    slideIds: ["S65"],
    eyebrow: "Step 5",
    title: "推奨は、読むときも方向と強さを分ける",
    body: "する・しないという方向と、強い・条件付きという強さは別の判断です。EBMでは、条件付き推奨ほど患者との相談が重要になります。",
    src: "/images/ebm-grade-map/recommendation-direction.png",
    alt: "推奨の方向と強さの整理",
    width: 586,
    height: 218,
  },
  {
    slideIds: ["S66", "S67"],
    eyebrow: "推奨パターン",
    title: "4つの推奨パターンは、EBM実践の分岐点",
    body: "強い推奨、条件付き推奨、条件付きで推奨しない、強く推奨しないを区別すると、共有意思決定が必要な場面を見落としにくくなります。",
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
          <span className="ebm-map-kicker">EBMの学習地図</span>
          <h2>この図を、EBMの読み方として使います</h2>
          <p>
            PICO、患者重要アウトカム、効果の大きさ、確実性、推奨を一つの流れで読みます。GRADEは、信頼できる情報を読み解くための道具として扱います。
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
            sizes="(min-width: 768px) 48rem, calc(100vw - 3rem)"
            className="ebm-map-excerpt-image"
          />
        </div>
      </aside>
    </section>
  );
}
