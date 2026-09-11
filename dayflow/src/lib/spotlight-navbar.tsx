import type { ReactNode } from "react";
import { BarChart3, BookOpen, CalendarDays, Flame, LayoutDashboard, Target } from "lucide-react";

type Item = { label: string; href: string };
type Props = { items: Item[]; active?: string; onNavigate?: (label: string) => void; rightContent?: ReactNode };
const icons: Record<string, ReactNode> = {
  Dashboard: <LayoutDashboard size={15} />, Planner: <CalendarDays size={15} />, Habits: <Flame size={15} />,
  Goals: <Target size={15} />, Journal: <BookOpen size={15} />, Insights: <BarChart3 size={15} />,
};
export function SpotlightNavbar({ items, active, onNavigate, rightContent }: Props) {
  return <header className="spotlight-navbar">
    <button className="spotlight-brand" onClick={() => onNavigate?.("home")} aria-label="DayFlow dashboard">
      <span className="spotlight-brand-mark">✦</span><span><strong>DayFlow</strong><small>Study OS</small></span>
    </button>
    <nav className="spotlight-links" aria-label="DayFlow navigation">
      {items.map(item => { const target = item.label === "Dashboard" ? "home" : item.label === "Insights" ? "analytics" : item.label.toLowerCase(); return <button key={item.label} className={active === target ? "spotlight-link active" : "spotlight-link"} onClick={() => onNavigate?.(target)}>{icons[item.label]}<span>{item.label}</span></button>; })}
    </nav>
    <div className="spotlight-right">{rightContent}</div>
  </header>;
}
