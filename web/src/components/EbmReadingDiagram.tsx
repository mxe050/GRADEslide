"use client";

type ReadingDiagram = {
  slideIds: string[];
  kicker: string;
  title: string;
  body: string;
  mode:
    | "claim"
    | "study"
    | "effect"
    | "sr"
    | "certainty"
    | "sof"
    | "etd"
    | "recommendation";
  nodes: string[];
};

const diagrams: ReadingDiagram[] = [
  {
    slideIds: ["N3", "N1", "S6"],
    kicker: "EBMの読み方",
    title: "主張を、患者に関係する問いへ戻す",
    body: "EBMでは、強そうな言葉をそのまま信じません。まず、誰に、何と比べて、どの患者重要アウトカムが、どの程度変わるのかへ分解します。",
    mode: "claim",
    nodes: ["主張", "PICO", "患者アウトカム", "効果の大きさ", "確実性"],
  },
  {
    slideIds: ["N7", "N11", "N15", "S21", "S22"],
    kicker: "研究を読む",
    title: "研究デザインの名前で止まらない",
    body: "基礎研究、RCT、SRというラベルは出発点です。EBMでは、設計、アウトカム、バイアス、直接性まで見て、どこまで臨床判断に使えるかを考えます。",
    mode: "study",
    nodes: ["デザイン", "方法", "アウトカム", "偏り", "適用先"],
  },
  {
    slideIds: ["N9", "N11", "S24", "S100", "S101", "S104"],
    kicker: "効果を読む",
    title: "相対効果を、絶対効果に翻訳する",
    body: "3倍、50%減少、OR 2.0といった数字は、そのままだと大きく見えます。EBMでは、1000人あたり何人変わるかに戻して読みます。",
    mode: "effect",
    nodes: ["相対効果", "ベースラインリスク", "絶対差", "NNT/NNH", "患者の意味"],
  },
  {
    slideIds: ["S10", "S11", "S12", "S15", "S63"],
    kicker: "SRを読む",
    title: "1本の論文ではなく、全体像を読む",
    body: "SRは論文の寄せ集めではありません。問いを固定し、検索し、選択し、評価し、必要に応じて統合する研究です。",
    mode: "sr",
    nodes: ["問い", "検索", "選択", "評価", "統合"],
  },
  {
    slideIds: ["S25", "S27", "S29", "S31", "S64"],
    kicker: "確実性を読む",
    title: "効くかどうかの前に、どれくらい信じられるか",
    body: "GRADEの5要因は、作成者だけのチェックリストではありません。読み手が、推定値をどれくらい信じてよいかを判断する地図です。",
    mode: "certainty",
    nodes: ["バイアス", "ばらつき", "非直接性", "不精確", "出版バイアス"],
  },
  {
    slideIds: ["S90", "S91", "S92", "S93"],
    kicker: "SoFを読む",
    title: "アウトカムごとに、効果と確実性を同時に見る",
    body: "SoF表は、読み手のための圧縮地図です。死亡、症状、QOL、害などを別々に見て、絶対効果と確実性を同じ行で確認します。",
    mode: "sof",
    nodes: ["アウトカム", "絶対効果", "相対効果", "確実性", "理由"],
  },
  {
    slideIds: ["S34", "S44", "S67", "S68", "S69", "S95", "S97", "S98"],
    kicker: "EtDを読む",
    title: "エビデンスから推奨へ進む理由を追う",
    body: "EtDは、推奨作成者だけの道具ではありません。利益、害、確実性、価値観、コスト、実行可能性を読めると、推奨の納得度を自分で点検できます。",
    mode: "etd",
    nodes: ["利益", "害", "確実性", "価値観", "実行可能性"],
  },
  {
    slideIds: ["S36", "S65", "S66", "S71", "S73", "S77", "S81", "S82", "S84", "S106"],
    kicker: "推奨を読む",
    title: "推奨文は、行動の命令ではなく判断の要約",
    body: "強い推奨か、条件付き推奨かで、患者との相談の深さが変わります。推奨の方向、強さ、確実性、価値観の余地を分けて読みます。",
    mode: "recommendation",
    nodes: ["対象者", "方向", "強さ", "確実性", "価値観"],
  },
];

export function EbmReadingDiagram({ slideId }: { slideId: string }) {
  const diagram = diagrams.find((item) => item.slideIds.includes(slideId));

  if (!diagram) return null;

  return (
    <section className="reading-column w-full">
      <aside className={`ebm-reading-diagram ebm-reading-diagram--${diagram.mode}`}>
        <div className="ebm-reading-diagram-copy">
          <span>{diagram.kicker}</span>
          <h3>{diagram.title}</h3>
          <p>{diagram.body}</p>
        </div>
        <ol className="ebm-reading-diagram-flow" aria-label={diagram.title}>
          {diagram.nodes.map((node, index) => (
            <li key={node}>
              <span className="ebm-reading-diagram-index">{index + 1}</span>
              <span>{node}</span>
            </li>
          ))}
        </ol>
      </aside>
    </section>
  );
}
