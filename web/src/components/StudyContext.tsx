"use client";

import clsx from "clsx";
import type { Slide } from "@/lib/types";
import { getAllSlides, getAppData } from "@/lib/slides";

interface Props {
  slide: Slide;
  index: number;
  total: number;
}

const sectionGuides: Record<string, string> = {
  intro: "主張を PICO・絶対効果・確実性に分解して読む",
  definition: "診療ガイドラインの定義を SR と利益・害の評価から読む",
  creation: "CPG 作成の工程と GRADE の確実性評価をつなげる",
  recommendation: "EtD で推奨の方向と強さが決まる流れを見る",
};

const coursePath = ["EBM", "PICO", "RCT", "SR", "CPG", "推奨"];

export function StudyContext({ slide, index, total }: Props) {
  const app = getAppData();
  const slides = getAllSlides();
  const section = app.meta.sections.find((item) => item.title === slide.section);
  const sectionIndex = Math.max(
    0,
    app.meta.sections.findIndex((item) => item.title === slide.section)
  );
  const slidesInSection = slides.filter((item) => item.section === slide.section);
  const sectionSlideIndex = Math.max(
    0,
    slidesInSection.findIndex((item) => item.id === slide.id)
  );
  const guide = section ? sectionGuides[section.id] : "スライドの主張を根拠・効果・確実性に分けて読む";

  return (
    <aside className="study-context" aria-label="学習の現在地">
      <div className="study-context-main">
        <div className="study-context-kicker">
          <span>現在地</span>
          <span className="tabular-nums">
            {index + 1} / {total}
          </span>
        </div>
        <div className="study-context-title">
          第{sectionIndex + 1}章: {guide}
        </div>
        <div className="study-context-sub tabular-nums">
          この章 {sectionSlideIndex + 1} / {slidesInSection.length}
        </div>
      </div>
      <ol className="study-context-path" aria-label="学習ルート">
        {coursePath.map((item, itemIndex) => (
          <li
            key={item}
            className={clsx(
              "study-context-chip",
              itemIndex <= Math.min(sectionIndex + 1, coursePath.length - 1) && "is-active"
            )}
          >
            {item}
          </li>
        ))}
      </ol>
    </aside>
  );
}
