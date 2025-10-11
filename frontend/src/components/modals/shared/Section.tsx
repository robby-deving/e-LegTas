import React from "react";
import { ChevronRight } from "lucide-react";

export default function Section({
  label,
  open,
  onToggle,
  children,
  className = "",
  variant = "card",
  flushLeft = false,
}: {
  label: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "card" | "plain";
  flushLeft?: boolean;
}) {
  const isPlain = variant === "plain";
  const wrapper = isPlain ? className : `rounded-md border border-gray-200 ${className}`;

  const header = isPlain
    ? `relative flex w-full items-center gap-2 py-1 ${flushLeft ? "" : "pl-6"}`
    : "flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-50";

  const body = isPlain
    ? `${flushLeft ? "" : "pl-6"} pb-2 pt-1 space-y-2`
    : "px-4 pb-3 pt-1 space-y-2";

  const chevronPos = isPlain ? (flushLeft ? "-left-4" : "left-0") : "left-0";

  return (
    <div className={wrapper}>
      <button type="button" onClick={onToggle} className={header}>
        <ChevronRight
          className={`h-4 w-4 text-gray-600 transition-transform absolute ${chevronPos} top-1.5 ${
            open ? "rotate-90" : ""
          }`}
        />
        <div className="text-sm font-semibold text-gray-900">{label}</div>
      </button>
      {open && <div className={body}>{children}</div>}
    </div>
  );
}
