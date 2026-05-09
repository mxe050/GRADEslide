import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const slidesPath = path.join(root, "public", "data", "slides.json");
const publicDir = path.join(root, "public");

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`slides.json を読めません: ${error.message}`);
    return null;
  }
}

const data = readJson(slidesPath);

if (data) {
  if (!data.meta || typeof data.meta !== "object") fail("meta がありません");
  if (!Array.isArray(data.meta?.sections)) fail("meta.sections が配列ではありません");
  if (!data.citations || typeof data.citations !== "object") fail("citations がありません");
  if (!Array.isArray(data.slides)) fail("slides が配列ではありません");

  const slides = Array.isArray(data.slides) ? data.slides : [];
  const sections = Array.isArray(data.meta?.sections) ? data.meta.sections : [];
  const sectionTitles = new Set(sections.map((section) => section.title));
  const slideIds = new Set();
  const orders = new Set();

  for (const section of sections) {
    if (!section.id || !section.title || !section.startSlideId) {
      fail(`section の形式が不正です: ${JSON.stringify(section)}`);
    }
  }

  for (const slide of slides) {
    const label = slide?.id ?? "(idなし)";
    if (!slide || typeof slide !== "object") {
      fail("slide が object ではありません");
      continue;
    }
    if (typeof slide.id !== "string" || slide.id.length === 0) fail(`${label}: id が不正です`);
    if (slideIds.has(slide.id)) fail(`${label}: id が重複しています`);
    slideIds.add(slide.id);

    if (!Number.isFinite(slide.order)) fail(`${label}: order が数値ではありません`);
    if (orders.has(slide.order)) fail(`${label}: order が重複しています`);
    orders.add(slide.order);

    if (typeof slide.title !== "string" || !slide.title.trim()) fail(`${label}: title が空です`);
    if (typeof slide.section !== "string" || !sectionTitles.has(slide.section)) {
      fail(`${label}: section が meta.sections にありません (${slide.section})`);
    }
    if (typeof slide.narration !== "string" || !slide.narration.trim()) {
      fail(`${label}: narration が空です`);
    }
    if (!slide.visual || typeof slide.visual !== "object" || typeof slide.visual.type !== "string") {
      fail(`${label}: visual.type が不正です`);
    }
    if (!slide.visual?.data || typeof slide.visual.data !== "object") {
      fail(`${label}: visual.data が不正です`);
    }

    for (const citationId of slide.citationIds ?? []) {
      if (!data.citations?.[citationId]) fail(`${label}: citationId が見つかりません (${citationId})`);
    }

    for (const imagePath of collectImagePaths(slide.visual)) {
      const normalized = imagePath.replace(/^\/+/, "");
      const absolute = path.join(publicDir, normalized);
      if (!fs.existsSync(absolute)) fail(`${label}: 画像が見つかりません (${imagePath})`);
    }

    const allText = JSON.stringify(slide);
    if (allText.includes("新羅用")) fail(`${label}: 「新羅用」という誤字らしき語があります`);
    if (allText.includes("なの？")) warn(`${label}: 「なの？」が残っています。意図した表現か確認してください`);
  }

  for (const section of sections) {
    if (!slideIds.has(section.startSlideId)) {
      fail(`section ${section.id}: startSlideId が存在しません (${section.startSlideId})`);
    }
  }
}

if (warnings.length > 0) {
  console.log("Warnings:");
  for (const item of warnings) console.log(`- ${item}`);
}

if (errors.length > 0) {
  console.error("Slide validation failed:");
  for (const item of errors) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`Slide validation passed: ${data.slides.length} slides`);

function collectImagePaths(visual) {
  if (!visual || typeof visual !== "object") return [];
  const paths = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (typeof value.src === "string") paths.push(value.src);
    for (const child of Object.values(value)) visit(child);
  };
  visit(visual.data);
  return paths;
}
