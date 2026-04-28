"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";

interface Props {
  prevId: string | null;
  nextId: string | null;
  index: number;
  total: number;
}

export function NavFooter({ prevId, nextId, index, total }: Props) {
  const router = useRouter();
  return (
    <footer
      className="sticky bottom-0 z-20 border-t border-[var(--card-border)] bg-[var(--background)]/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-2.5 md:py-3 flex items-center gap-3">
        <NavButton
          disabled={!prevId}
          onClick={() => prevId && router.push(`/slide/${prevId}`)}
          aria="前のスライドへ"
        >
          <span aria-hidden="true">‹</span>
          <span>前へ</span>
        </NavButton>
        <div className="text-center text-xs md:text-sm text-[var(--muted)] tabular-nums whitespace-nowrap">
          {index + 1} / {total}
        </div>
        <NavButton
          primary
          disabled={!nextId}
          onClick={() => nextId && router.push(`/slide/${nextId}`)}
          aria="次のスライドへ"
        >
          <span>次へ</span>
          <span aria-hidden="true">›</span>
        </NavButton>
      </div>
    </footer>
  );
}

function NavButton({
  children,
  onClick,
  disabled,
  primary,
  aria,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  aria: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={aria}
      className={clsx(
        "flex-1 inline-flex items-center justify-center gap-1.5 h-12 md:h-12 rounded-xl text-base font-semibold transition-colors select-none",
        primary
          ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:bg-[var(--card-border)] disabled:text-[var(--muted)]"
          : "border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--card-border)]/60 disabled:opacity-40"
      )}
    >
      {children}
    </button>
  );
}
