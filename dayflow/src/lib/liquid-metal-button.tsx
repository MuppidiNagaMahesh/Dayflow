import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  metalConfig?: { colorBack?: string; colorTint?: string };
};

export function LiquidMetalButton({ icon, metalConfig, children, className = "", ...props }: Props) {
  return (
    <button
      {...props}
      className={`liquid-metal-button ${className}`}
      style={{
        "--metal-back": metalConfig?.colorBack || "#2563eb",
        "--metal-tint": metalConfig?.colorTint || "#93c5fd",
      } as React.CSSProperties}
    >
      <span>{children}</span>{icon}
    </button>
  );
}
