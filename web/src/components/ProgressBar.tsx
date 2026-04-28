interface Props {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: Props) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;
  return (
    <div
      className="h-1 w-full bg-[var(--card-border)]"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`進捗 ${current} / ${total}`}
    >
      <div
        className="h-full bg-[var(--primary)] transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
