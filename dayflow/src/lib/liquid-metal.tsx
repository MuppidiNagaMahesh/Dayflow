import type { HTMLAttributes } from "react";

export function AgentBentoGrid({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`agent-bento-grid ${className}`} aria-hidden="true">
      <div className="agent-bento-cell"><span>01</span><strong>Plan</strong><small>shape the day</small></div>
      <div className="agent-bento-cell"><span>02</span><strong>Focus</strong><small>protect attention</small></div>
      <div className="agent-bento-cell wide"><span>03</span><strong>Reflect</strong><small>remember what mattered</small></div>
    </div>
  );
}
