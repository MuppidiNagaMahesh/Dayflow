import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode, Dispatch, SetStateAction } from "react";

/**
 * DayFlow - glassmorphism productivity dashboard
 * No icon / UI library required. Everything is self-contained.
 */

type Page = "home" | "plan" | "habits" | "goals" | "journal" | "insights";
type AuthMode = "login" | "signup";

type Task = {
  id: string;
  title: string;
  time: string;
  done: boolean;
  date?: string;
};

type Habit = {
  id: string;
  title: string;
  streak: number;
  done: boolean;
  history?: Record<string, boolean>;
};

type Goal = {
  id: string;
  title: string;
  progress: number;
  due: string;
  term?: "short" | "long";
};

type JournalEntry = {
  id: string;
  text: string;
  date: string;
  day?: string;
};

function dateKey(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(base: Date, amount: number) { const d = new Date(base); d.setDate(d.getDate() + amount); return d; }
function prettyDate(key: string) { return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }
function timeToMinutes(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return hour * 60 + Number(match[2]);
}
function sortTasks(items: Task[]) { return [...items].sort((a,b) => timeToMinutes(a.time) - timeToMinutes(b.time)); }
function formatClock(totalSeconds: number) { const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0"); const sec = (totalSeconds % 60).toString().padStart(2, "0"); return `${m}:${sec}`; }
function formatTimeParts(value: string) { const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i); return match ? { hour: match[1], minute: match[2], period: match[3].toUpperCase() } : { hour: "9", minute: "00", period: "AM" }; }

const today = new Date();
const todayKey = dateKey(today);
const dayLabel = today.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });


const defaultTasks: Task[] = [
  { id: "1", title: "Morning routine", time: "7:00 AM", done: false, date: todayKey },
  { id: "2", title: "Work on DayFlow", time: "9:00 AM", done: false, date: todayKey },
  { id: "3", title: "Read a book", time: "12:00 PM", done: false, date: todayKey },
  { id: "4", title: "Evening walk", time: "6:00 PM", done: false, date: todayKey },
];

const defaultHabits: Habit[] = [
  { id: "h1", title: "Drink 2L of water", streak: 4, done: false, history: {} },
  { id: "h2", title: "30 min deep work", streak: 7, done: true, history: { [todayKey]: true } },
  { id: "h3", title: "Read 10 pages", streak: 3, done: false, history: {} },
  { id: "h4", title: "Sleep before 11 PM", streak: 5, done: false, history: {} },
];

const defaultGoals: Goal[] = [
  { id: "g1", title: "Finish my portfolio", progress: 72, due: "Sep 30", term: "short" },
  { id: "g2", title: "Read 12 books", progress: 48, due: "Dec 31", term: "long" },
  { id: "g3", title: "Build healthy routines", progress: 64, due: "Oct 15", term: "short" },
];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function Icon({ name, size = 20, stroke = 1.8 }: { name: string; size?: number; stroke?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "home": return <svg {...common}><path d="m3 10 9-7 9 7"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/></svg>;
    case "plan": return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 2v4M16 2v4M4 9h16"/><path d="m8 14 2 2 5-5"/></svg>;
    case "habit": return <svg {...common}><path d="M12 21s7-4 7-11V4l-7 2-7-2v6c0 7 7 11 7 11Z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "goal": return <svg {...common}><path d="m4 16 5-5 4 4 7-8"/><path d="M15 7h5v5"/><path d="M4 20h16"/></svg>;
    case "journal": return <svg {...common}><path d="M6 3h10a2 2 0 0 1 2 2v16H8a2 2 0 0 1-2-2V3Z"/><path d="M6 7H4v13a2 2 0 0 0 2 2h12"/><path d="M10 8h5M10 12h5M10 16h3"/></svg>;
    case "insights": return <svg {...common}><path d="M4 19V9M10 19V5M16 19v-8M22 19V3"/><path d="M2 21h20"/></svg>;
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "check": return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
    case "chevron": return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
    case "back": return <svg {...common}><path d="m15 18-6-6 6-6"/></svg>;
    case "close": return <svg {...common}><path d="m6 6 12 12M18 6 6 18"/></svg>;
    case "sun": return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "calendar": return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>;
    case "spark": return <svg {...common}><path d="m12 3 1.2 5.2L18 10l-4.8 1.8L12 17l-1.2-5.2L6 10l4.8-1.8L12 3Z"/><path d="m19 15 .6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15Z"/></svg>;
    case "leaf": return <svg {...common}><path d="M20 4C10 4 5 8 5 15c0 2 1 4 3 5 1-6 4-10 12-12-2 3-5 5-9 6"/></svg>;
    case "book": return <svg {...common}><path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2V5Z"/><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2V5Z"/></svg>;
    case "quote": return <svg {...common}><path d="M7 11H4c0-4 2-6 5-7v3c-2 .7-3 1.9-3 4h1c2 0 3 1.3 3 3.5S8.4 18 6 18H3c0-4 1-6 4-7Z"/><path d="M17 11h-3c0-4 2-6 5-7v3c-2 .7-3 1.9-3 4h1c2 0 3 1.3 3 3.5S18.4 18 16 18h-3c0-4 1-6 4-7Z"/></svg>;
    case "mail": return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>;
    case "lock": return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
    case "user": return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>;
    case "logout": return <svg {...common}><path d="M9 5H5v14h4"/><path d="m14 16 4-4-4-4"/><path d="M10 12h8"/></svg>;
    case "edit": return <svg {...common}><path d="m4 20 4.2-1 9.9-9.9a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z"/><path d="m13.8 7.2 3 3"/></svg>;
    case "trash": return <svg {...common}><path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14M9 7l1-3h4l1 3"/></svg>;
    case "diamond": return <svg {...common}><path d="m6 3 6-1 6 1 3 5-9 14L3 8l3-5Z"/><path d="m3 8 18 0M9 3l3 5 3-5"/></svg>;
    case "moon": return <svg {...common}><path d="M20 15.2A8 8 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z"/></svg>;
    case "play": return <svg {...common} fill="currentColor" stroke="none"><path d="M8 5.5v13L18 12 8 5.5Z"/></svg>;
    case "pause": return <svg {...common} fill="currentColor" stroke="none"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>;
    case "reset": return <svg {...common}><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 5v5h5"/></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="8"/></svg>;
  }
}

function Glass({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div className={`glass-card ${className}`} onClick={onClick}>{children}</div>;
}

function ProgressRing({ value, size = 96 }: { value: number; size?: number }) {
  const radius = (size - 11) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} />
        <circle className="ring-value" cx={size / 2} cy={size / 2} r={radius} strokeDasharray={`${dash} ${circumference - dash}`} />
      </svg>
      <div className="ring-label"><strong>{value}%</strong><span>complete</span></div>
    </div>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (email: string) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    localStorage.setItem("dayflow-auth", "true");
    localStorage.setItem("dayflow-user", name || email.split("@")[0] || "M");
    if (remember) localStorage.setItem("dayflow-email", email);
    onAuthenticated(email);
  }

  return (
    <div className="auth-shell">
      <div className="ambient orb-one" />
      <div className="ambient orb-two" />
      <div className="auth-layout">
        <div className="auth-brand-panel">
          <div className="brand-lockup large"><div className="brand-mark">D</div><span>DayFlow</span></div>
          <div className="auth-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> YOUR PERSONAL DAYFLOW</div>
            <h1>Make space for<br /><span>what matters.</span></h1>
            <p>A calmer way to plan your day, build small habits, and keep moving toward meaningful goals.</p>
          </div>
          <div className="auth-mini-cards">
            <Glass className="auth-mini"><Icon name="sun" size={18} /><div><b>Daily intention</b><span>Start with one thing that matters.</span></div></Glass>
            <Glass className="auth-mini"><Icon name="spark" size={18} /><div><b>Progress, not perfection.</b><span>Small steps create big results.</span></div></Glass>
          </div>
        </div>

        <Glass className="auth-card">
          <div className="auth-card-top">
            <div className="auth-avatar"><Icon name="user" size={22} /></div>
            <div><div className="section-label">WELCOME</div><h2>{mode === "login" ? "Welcome back." : "Create your flow."}</h2><p>{mode === "login" ? "Sign in to continue your day." : "Set up your personal DayFlow."}</p></div>
          </div>
          <div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Log in</button><button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button></div>
          <form onSubmit={submit} className="auth-form">
            {mode === "signup" && <label><span>Your name</span><div className="input-wrap"><Icon name="user" size={18} /><input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" /></div></label>}
            <label><span>Email address</span><div className="input-wrap"><Icon name="mail" size={18} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div></label>
            <label><span>Password</span><div className="input-wrap"><Icon name="lock" size={18} /><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} /><button type="button" className="input-action" onClick={() => setShowPassword(s => !s)}>{showPassword ? "Hide" : "Show"}</button></div></label>
            {mode === "login" && <div className="auth-row"><label className="checkbox-row"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /><span>Remember me</span></label><button className="text-button" type="button">Forgot password?</button></div>}
            <button className="primary-button auth-submit" type="submit">{mode === "login" ? "Enter DayFlow" : "Create account"}<Icon name="chevron" size={18} /></button>
          </form>
          <p className="auth-footer">By continuing, you agree to DayFlow's Terms and Privacy.</p>
        </Glass>
      </div>
    </div>
  );
}


function weatherName(code: number, isDay: number, temp: number | null) {
  const t = typeof temp === "number" && Number.isFinite(temp) ? ` · ${Math.round(temp)}°C` : "";
  if (code >= 95) return `Storm${t}`;
  if (code >= 80) return `Showers${t}`;
  if (code >= 71) return `Snow${t}`;
  if (code >= 61) return `Rain${t}`;
  if (code >= 51) return `Drizzle${t}`;
  if (code === 45 || code === 48) return `Fog${t}`;
  if (code >= 1 && code <= 3) return `Cloudy${t}`;
  return isDay ? `Sunny${t}` : `Clear${t}`;
}

function WeatherIcon({ code, isDay, size = 19 }: { code: number; isDay: number; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (code >= 95) return <svg {...common}><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z"/><path d="m10 15-1 2M15 15l-1 2M12 18l-1 2"/></svg>;
  if (code >= 51) return <svg {...common}><path d="M7 17h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6 10a3.5 3.5 0 0 0 1 7Z"/><path d="M8 20v1M12 20v1M16 20v1"/></svg>;
  if (code >= 1 && code <= 3) return <svg {...common}><path d="M6 17h11a4 4 0 0 0 .5-7.96A6 6 0 0 0 6.5 10 3.5 3.5 0 0 0 6 17Z"/><path d="M4 20h9"/></svg>;
  if (!isDay) return <svg {...common}><path d="M20 15.2A8 8 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
}

function TopBar({ onLogout, onOpenIntent, dark, setDark, weather }: { onLogout: () => void; onOpenIntent: () => void; dark: boolean; setDark: (v: boolean) => void; weather: { code: number; isDay: number; label: string } }) {
  return (
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-mark">D</div><span>DayFlow</span></div>
      <div className="topbar-actions">
        <button className="today-pill" onClick={onOpenIntent}>
          <span className="status-dot" />
          <span className="today-label">TODAY</span>
          <strong>{dayLabel}</strong>
        </button>
        <div className="weather-pill" title="Current weather">
          <span className="weather-pill-icon"><WeatherIcon code={weather.code} isDay={weather.isDay} /></span>
          <span>{weather.label}</span>
        </div>
        <button className="theme-button" onClick={() => setDark(!dark)} title={dark ? "Switch to light mode" : "Switch to dark mode"} aria-label="Toggle theme">
          <Icon name={dark ? "sun" : "moon"} size={18} />
        </button>
        <button className="icon-button small-only-mobile" onClick={onLogout} title="Log out"><Icon name="logout" size={18} /></button>
      </div>
    </header>
  );
}

function Sidebar({ page, setPage, onLogout }: { page: Page; setPage: (p: Page) => void; onLogout: () => void }) {
  const items: { id: Page; label: string; icon: string }[] = [
    { id: "home", label: "Home", icon: "home" },
    { id: "plan", label: "Plan", icon: "plan" },
    { id: "habits", label: "Habits", icon: "habit" },
    { id: "goals", label: "Goals", icon: "goal" },
    { id: "journal", label: "Journal", icon: "journal" },
    { id: "insights", label: "Insights", icon: "insights" },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="brand-lockup sidebar-brand"><div className="brand-mark">D</div><span>DayFlow</span></div>
        <nav>{items.map(item => <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}><Icon name={item.icon} size={18} /><span>{item.label}</span></button>)}</nav>
        <div className="sidebar-bottom">
          <Glass className="mini-focus"><div className="mini-focus-icon"><Icon name="spark" size={17} /></div><div><b>Daily focus</b><span>Choose one thing.</span></div></Glass>
          <button className="logout-button" onClick={onLogout}><Icon name="logout" size={17} /><span>Log out</span></button>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const items: { id: Page; label: string; icon: string }[] = [
    { id: "home", label: "Home", icon: "home" }, { id: "plan", label: "Plan", icon: "plan" }, { id: "habits", label: "Habits", icon: "habit" }, { id: "goals", label: "Goals", icon: "goal" }, { id: "journal", label: "Journal", icon: "journal" }, { id: "insights", label: "Insights", icon: "insights" },
  ];
  return <nav className="bottom-nav">{items.map(item => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}><Icon name={item.icon} size={18} /><span>{item.label}</span></button>)}</nav>;
}

function FocusTimer() {
  const presets = [
    { key: "focus", label: "Focus", minutes: 25 },
    { key: "short", label: "Short", minutes: 5 },
    { key: "long", label: "Long", minutes: 15 },
  ] as const;
  const [preset, setPreset] = useState<(typeof presets)[number]["key"]>("focus");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  const current = presets.find(item => item.key === preset) || presets[0];
  const total = current.minutes * 60;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (seconds !== 0) return;
    setRunning(false);
    if (preset === "focus") {
      const previous = Number(localStorage.getItem("dayflow-focus-minutes") || 0);
      localStorage.setItem("dayflow-focus-minutes", String(previous + current.minutes));
      localStorage.setItem("dayflow-focus-last", new Date().toISOString());
    }
  }, [seconds, preset, current.minutes]);

  const progress = Math.min(1, Math.max(0, (total - seconds) / total));
  const handAngle = progress * 360;
  const tickMarks = Array.from({ length: 12 }, (_, index) => {
    const angle = index * 30;
    const isMajor = index % 3 === 0;
    return <span key={angle} className={`clock-tick ${isMajor ? "major" : ""}`} style={{ transform: `rotate(${angle}deg)` }} />;
  });

  const choosePreset = (key: (typeof presets)[number]["key"]) => {
    const item = presets.find(x => x.key === key) || presets[0];
    setPreset(key);
    setSeconds(item.minutes * 60);
    setRunning(false);
  };

  return <Glass className="focus-timer-card">
    <div className="card-head">
      <span className="section-label"><Icon name="clock" size={15} /> FOCUS TIMER</span>
      <span className="timer-mode">CLOCK 01</span>
    </div>
    <div className="clock-face-wrap">
      <div className="clock-face">
        <div className="clock-glow" />
        <div className="clock-ticks" aria-hidden="true">{tickMarks}</div>
        <div className="clock-hand" style={{ transform: `translate(-50%, -100%) rotate(${handAngle}deg)` }} />
        <div className="clock-pin" />
        <div className="timer-center">
          <strong>{formatClock(seconds)}</strong>
          <span>{running ? "Stay focused" : "Focus time"}</span>
        </div>
      </div>
    </div>
    <div className="timer-controls">
      <button className="timer-circle" onClick={() => { setSeconds(total); setRunning(false); }} aria-label="Reset timer"><Icon name="reset" size={17} /></button>
      <button className="timer-play" onClick={() => { if (seconds === 0) setSeconds(total); setRunning(value => !value); }} aria-label={running ? "Pause timer" : "Start timer"}><Icon name={running ? "pause" : "play"} size={19} /></button>
      <button className="timer-circle" onClick={() => setSeconds(value => Math.min(total, value + 60))} aria-label="Add one minute"><span>+1</span></button>
    </div>
    <div className="timer-presets" role="tablist" aria-label="Timer presets">
      {presets.map(item => <button key={item.key} className={preset === item.key ? "active" : ""} onClick={() => choosePreset(item.key)}>{item.label}<small>{item.minutes}m</small></button>)}
    </div>
  </Glass>;
}

function HomePage({ tasks, setTasks, habits, onIntent, intention, user, onAddTask, onAddHabit, onNavigate }: { tasks: Task[]; setTasks: Dispatch<SetStateAction<Task[]>>; habits: Habit[]; onIntent: () => void; intention: string; user: string; onAddTask: () => void; onAddHabit: () => void; onNavigate: (p: Page) => void }) {
  const todayTasks = sortTasks(tasks.filter(t => !t.date || t.date === todayKey));
  const completed = todayTasks.filter(t => t.done).length;
  const progress = todayTasks.length ? Math.round((completed / todayTasks.length) * 100) : 0;
  const firstName = user.split(/[.@]/)[0] || "there";
  const reminderList = [
    "Small steps still move you forward.",
    "Protect your attention; it shapes your day.",
    "Done is better than endlessly perfect.",
    "One focused hour can change the whole day.",
    "Make room for the things that matter."
  ];
  const reminder = reminderList[today.getDate() % reminderList.length];
  const streak = Math.max(1, habits.reduce((best, habit) => Math.max(best, habit.streak || 0), 0));
  const toggleTask = (id: string) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));

  return <div className="page-content">
    <div className="hero-row">
      <div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR PERSONAL DAYFLOW</div><h1>Good morning, <span>{firstName}.</span></h1><p>Slow down, reflect, and finish the day well.</p></div>
      <div className="hero-tools">
        <Glass className="streak-card"><span className="streak-icon"><Icon name="spark" size={17} /></span><div><small>DAILY STREAK</small><strong>{streak} days</strong></div></Glass>
        <Glass className="time-card"><span>TODAY</span><strong>{dayLabel}</strong><b>{today.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</b></Glass>
      </div>
    </div>
    <div className="dashboard-grid">
      <Glass className="focus-card card-tall"><div className="card-head"><span className="section-label"><span className="status-dot" /> FOCUS</span><button className="icon-button" onClick={onIntent}><Icon name="chevron" size={18} /></button></div><h2>Small steps create<br />bigger results.</h2><p>Keep your attention on what matters most today.</p><div className="thin-progress"><span style={{ width: `${Math.max(progress, 8)}%` }} /></div></Glass>
      <Glass className="progress-card card-tall"><div className="card-head"><span className="section-label"><Icon name="spark" size={15} /> DAILY PROGRESS</span><button className="icon-button"><Icon name="chevron" size={18} /></button></div><div className="progress-layout"><ProgressRing value={progress} /><div><h3>{progress === 100 ? "Beautiful work." : "Your day is ready."}</h3><p>Complete your first task to start building momentum.</p></div></div></Glass>
      <FocusTimer />
      <Glass className="stat-card" onClick={onAddTask}><div className="card-head"><span className="section-label"><Icon name="plan" size={14} /> TASKS</span><button className="icon-button"><Icon name="plus" size={17} /></button></div><strong className="big-number">{todayTasks.length - completed}</strong><span>tasks left today</span></Glass>
      <Glass className="stat-card" onClick={onAddHabit}><div className="card-head"><span className="section-label"><Icon name="habit" size={14} /> HABITS</span><button className="icon-button"><Icon name="chevron" size={17} /></button></div><strong className="big-number">{habits.filter(h => h.done).length}</strong><span>habits completed</span></Glass>
      <Glass className="quote-card"><div className="card-head"><span className="section-label"><Icon name="quote" size={15} /> A LITTLE REMINDER</span><span className="reminder-day">TODAY</span></div><p>“{reminder}”</p></Glass>
      <Glass className="intention-card" onClick={onIntent}><div className="card-head"><span className="section-label"><Icon name="sun" size={15} /> DAILY INTENTION</span></div>{intention ? <><h3>{intention}</h3><p>Your intention is saved as your anchor for the day.</p></> : <><h3>What matters most today?</h3><p>Your answer will become your anchor for the day.</p></>}<button className="gradient-button">{intention ? "Edit intention" : "Set intention"}<Icon name="chevron" size={17} /></button></Glass>
    </div>

    <Glass className="today-list"><div className="section-title-row"><div><div className="section-label">TODAY'S PLAN</div><h2>Keep the day moving gently.</h2></div><button className="secondary-button compact" onClick={() => onNavigate("plan")}>Open planner <Icon name="chevron" size={16} /></button></div><div className="task-preview">{todayTasks.slice(0, 4).map(task => <button key={task.id} className={`task-row ${task.done ? "done" : ""}`} onClick={() => toggleTask(task.id)}><span className="check-circle">{task.done && <Icon name="check" size={15} />}</span><span className="task-copy"><b>{task.title}</b><small>{task.time}</small></span><Icon name="chevron" size={16} /></button>)}</div></Glass>
  </div>;
}

function PlanPage({ tasks, setTasks, onAddTask, onAddNote, onIntent, planNotes, setPlanNotes }: { tasks: Task[]; setTasks: Dispatch<SetStateAction<Task[]>>; onAddTask: (date?: string) => void; onAddNote: (date: string) => void; onIntent: () => void; planNotes: Record<string,string>; setPlanNotes: Dispatch<SetStateAction<Record<string,string>>> }) {
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [noteDraft, setNoteDraft] = useState(planNotes[todayKey] || "");
  useEffect(() => { setNoteDraft(planNotes[selectedDate] || ""); }, [selectedDate, planNotes]);
  const selectedTasks = sortTasks(tasks.filter(t => (t.date || todayKey) === selectedDate));
  const completed = selectedTasks.filter(t => t.done).length;
  const toggle = (id: string) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const selected = new Date(`${selectedDate}T12:00:00`);
  const dates = [-2, -1, 0, 1, 2].map(offset => addDays(selected, offset));
  const savePlanNote = () => setPlanNotes(xs => ({ ...xs, [selectedDate]: noteDraft.trim() }));
  return <div className="page-content"><div className="page-header"><div><div className="eyebrow"><Icon name="calendar" size={16} /> PLANNER</div><h1>Plan your day.</h1><p>Move through your days without losing what you planned.</p></div><button className="primary-button" onClick={() => onAddTask(selectedDate)}><Icon name="plus" size={18} /> Add task</button></div>
    <div className="date-strip date-strip-navigator"><button className="date-nav-button" onClick={() => setSelectedDate(dateKey(addDays(selected, -1)))} title="Previous day"><Icon name="back" size={18} /></button>{dates.map(d => { const key = dateKey(d); return <button key={key} className={key === selectedDate ? "active" : ""} onClick={() => setSelectedDate(key)}><span>{d.toLocaleDateString(undefined,{weekday:"short"})}</span><strong>{d.getDate()}</strong></button>; })}<button className="date-nav-button" onClick={() => setSelectedDate(dateKey(addDays(selected, 1)))} title="Next day"><Icon name="chevron" size={18} /></button></div>
    <div className="planner-day-caption"><span>{selectedDate === todayKey ? "TODAY" : prettyDate(selectedDate)}</span>{selectedDate !== todayKey && <button className="soft-pill" onClick={() => setSelectedDate(todayKey)}>Back to today</button>}</div>
    <div className="planner-grid"><Glass className="today-plan"><div className="section-title-row"><div><span className="section-label">{selectedDate === todayKey ? "TODAY'S PLAN" : "DAY'S PLAN"}</span><h2>{prettyDate(selectedDate)}</h2></div><button className="icon-button" onClick={onIntent}><Icon name="sun" size={18} /></button></div><div className="task-list">{selectedTasks.length ? selectedTasks.map(t => <button className={`planner-task ${t.done ? "done" : ""}`} key={t.id} onClick={() => toggle(t.id)}><span className="check-circle large">{t.done && <Icon name="check" size={16} />}</span><span className="task-copy"><b>{t.title}</b><small>{t.time}</small></span><Icon name="chevron" size={18} /></button>) : <div className="empty-plan"><Icon name="plan" size={26} /><h3>A clear day.</h3><p>Add a task and it will stay saved for {prettyDate(selectedDate)}.</p></div>}</div><button className="add-row" onClick={() => onAddTask(selectedDate)}><Icon name="plus" size={17} /> Add task</button></Glass>
      <div className="quick-column"><Glass className="day-note-card"><div className="section-label"><Icon name="journal" size={15}/> DAY PLANNING NOTE</div><textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Write the plan or important information for this day..."/><div className="day-note-actions"><span>{noteDraft.length}/500</span><button className="primary-button compact" onClick={savePlanNote}>Save note <Icon name="check" size={16}/></button></div></Glass><Glass className="quick-card"><div className="section-label">QUICK ACTIONS</div><div className="quick-actions"><button onClick={() => onAddTask(selectedDate)}><Icon name="plus" size={20} /><span>Add Task</span></button><button onClick={() => onAddNote(selectedDate)}><Icon name="journal" size={20} /><span>Add Note</span></button></div></Glass><Glass className="tip-card"><Icon name="spark" size={22} /><div><h3>Progress, not perfection.</h3><p>Your tasks and day notes stay attached to their dates.</p></div></Glass><Glass className="plan-stats"><div><span>Completed</span><strong>{completed}</strong></div><div><span>Remaining</span><strong>{Math.max(0, selectedTasks.length - completed)}</strong></div></Glass></div>
    </div></div>;
}

function HabitsPage({ habits, setHabits, onAddHabit }: { habits: Habit[]; setHabits: Dispatch<SetStateAction<Habit[]>>; onAddHabit: () => void }) {
  const toggle = (id: string) => setHabits(hs => hs.map(h => { if(h.id!==id) return h; const next=!h.done; const history={...(h.history||{}), [todayKey]:next}; return { ...h, done: next, history, streak: next ? h.streak + 1 : Math.max(0,h.streak-1) }; }));
  const last7 = Array.from({length:7},(_,i)=>dateKey(addDays(new Date(),i-6)));
  return <div className="page-content"><div className="page-header"><div><div className="eyebrow"><Icon name="habit" size={16} /> ROUTINES</div><h1>Small habits, steady you.</h1><p>Build routines and keep a simple history of every day.</p></div><button className="primary-button" onClick={onAddHabit}><Icon name="plus" size={18} /> Add habit</button></div><div className="habit-grid">{habits.map(h => <Glass key={h.id} className="habit-card"><div className={`habit-icon ${h.done ? "complete" : ""}`}><Icon name={h.done ? "check" : "leaf"} size={22} /></div><div className="habit-main"><div><span className="section-label">CURRENT STREAK</span><strong>{h.streak} days</strong></div><h3>{h.title}</h3><p>{h.done ? "Completed today. Keep the rhythm." : "One small check-in today."}</p><div className="habit-week">{last7.map(d => <span key={d} className={h.history?.[d] ? "done" : ""} title={prettyDate(d)}><i /></span>)}</div><div className="habit-week-labels">{last7.map(d => <small key={d}>{new Date(`${d}T12:00:00`).toLocaleDateString(undefined,{weekday:"narrow"})}</small>)}</div></div><button className={`circle-action ${h.done ? "active" : ""}`} onClick={() => toggle(h.id)}><Icon name={h.done ? "check" : "plus"} size={18} /></button></Glass>)}</div></div>;
}

function GoalsPage({ goals, setGoals }: { goals: Goal[]; setGoals: Dispatch<SetStateAction<Goal[]>> }) {
  const [showForm, setShowForm] = useState(false); const [goalName, setGoalName] = useState(""); const [due, setDue] = useState(""); const [term, setTerm] = useState<"short"|"long">("short");
  const saveGoal=()=>{if(!goalName.trim())return; setGoals(gs=>[...gs,{id:uid("g"),title:goalName.trim(),progress:0,due:due||"No date",term}]);setGoalName("");setDue("");setTerm("short");setShowForm(false);};
  return <div className="page-content"><div className="page-header"><div><div className="eyebrow"><Icon name="goal" size={16} /> DIRECTION</div><h1>Goals with less pressure.</h1><p>Keep short-term wins and long-term direction in one calm place.</p></div><button className="primary-button" onClick={()=>setShowForm(true)}><Icon name="plus" size={18}/> Add goal</button></div>{showForm&&<Glass className="goal-form"><div className="section-label"><Icon name="diamond" size={15}/> NEW GOAL</div><div className="goal-form-fields"><label className="modal-field"><span>Goal name</span><input value={goalName} onChange={e=>setGoalName(e.target.value)} placeholder="e.g. Get placed in a software role" autoFocus/></label><label className="modal-field"><span>Goal type</span><select value={term} onChange={e=>setTerm(e.target.value as "short"|"long")}><option value="short">Short term</option><option value="long">Long term</option></select></label><label className="modal-field"><span>Due date</span><input type="date" value={due} onChange={e=>setDue(e.target.value)}/></label></div><div className="goal-form-actions"><button className="secondary-button compact" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary-button" onClick={saveGoal}>Save goal <Icon name="check" size={17}/></button></div></Glass>}<div className="goal-type-summary"><Glass><span>SHORT TERM</span><strong>{goals.filter(g=>g.term !== "long").length}</strong><small>quick wins & milestones</small></Glass><Glass><span>LONG TERM</span><strong>{goals.filter(g=>g.term === "long").length}</strong><small>bigger direction</small></Glass></div><div className="goals-grid">{goals.map(g=><Glass className="goal-card" key={g.id}><div className="goal-card-head"><div className="goal-icon"><Icon name="diamond" size={21}/></div><span className={`goal-term ${g.term === "long" ? "long" : "short"}`}>{g.term === "long" ? "Long term" : "Short term"}</span><span className="goal-due">Due {g.due}</span></div><h2>{g.title}</h2><div className="goal-progress-row"><span>{g.progress}%</span><span>complete</span></div><div className="goal-bar"><span style={{width:`${g.progress}%`}}/></div><div className="goal-buttons"><button className="secondary-button compact" onClick={()=>setGoals(gs=>gs.map(x=>x.id===g.id?{...x,progress:Math.min(100,x.progress+10)}:x))}>{g.progress>=100?"Completed":"Mark next step"} <Icon name="chevron" size={15}/></button><button className="icon-button" onClick={()=>setGoals(gs=>gs.filter(x=>x.id!==g.id))}><Icon name="trash" size={16}/></button></div></Glass>)}</div></div>;
}

function JournalPage({ entries, setEntries, initialDate }: { entries: JournalEntry[]; setEntries: Dispatch<SetStateAction<JournalEntry[]>>; initialDate: string }) {
  const [text, setText] = useState("");
 const [selectedDate, setSelectedDate] = useState(initialDate);
  function add() { if (!text.trim()) return; setEntries(es => [{ id: uid("j"), text: text.trim(), date: new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }), day: selectedDate }, ...es]); setText(""); }
  const visibleEntries = entries.filter(e => { if (e.day) return e.day === selectedDate; const parsed = new Date(e.date); return Number.isNaN(parsed.getTime()) ? true : dateKey(parsed) === selectedDate; });
  const historyDates = Array.from(new Set(entries.map(e => { if (e.day) return e.day; const d = new Date(e.date); return Number.isNaN(d.getTime()) ? todayKey : dateKey(d); }))).sort().reverse();
  return <div className="page-content"><div className="page-header"><div><div className="eyebrow"><Icon name="journal" size={16} /> REFLECTION</div><h1>A page for your thoughts.</h1><p>Every entry stays saved by date, so you can read it tomorrow or later.</p></div></div><div className="journal-date-row"><button className="date-nav-button" onClick={() => setSelectedDate(dateKey(addDays(new Date(`${selectedDate}T12:00:00`), -1)))}><Icon name="back" size={17} /></button><Glass className="journal-date-pill"><span>JOURNAL DATE</span><strong>{prettyDate(selectedDate)}</strong></Glass><button className="date-nav-button" onClick={() => setSelectedDate(dateKey(addDays(new Date(`${selectedDate}T12:00:00`), 1)))}><Icon name="chevron" size={17} /></button>{selectedDate !== todayKey && <button className="soft-pill" onClick={() => setSelectedDate(todayKey)}>Today</button>}</div><div className="journal-grid"><Glass className="journal-composer"><div className="section-label"><Icon name="spark" size={15} /> {selectedDate === todayKey ? "NEW ENTRY" : `ENTRY FOR ${prettyDate(selectedDate).toUpperCase()}`}</div><textarea value={text} onChange={e => setText(e.target.value)} placeholder="What is on your mind today?" /><div className="composer-bottom"><span>{text.length}/500</span><button className="primary-button" onClick={add}>Save entry <Icon name="check" size={17} /></button></div></Glass><div className="entry-list">{visibleEntries.length === 0 ? <Glass className="empty-state"><Icon name="journal" size={26} /><h3>No entry for this date.</h3><p>Write something now and it will be available whenever you return to this date.</p>{historyDates.length > 0 && <div className="journal-history"><span>Saved dates</span>{historyDates.slice(0, 8).map(d => <button key={d} onClick={() => setSelectedDate(d)}>{prettyDate(d)}</button>)}</div>}</Glass> : visibleEntries.map(e => <Glass className="entry-card" key={e.id}><span>{e.date}</span><p>{e.text}</p><button className="icon-button" onClick={() => setEntries(es => es.filter(x => x.id !== e.id))}><Icon name="trash" size={15} /></button></Glass>)}</div></div></div>;
}

function InsightsPage({ tasks, habits, goals, planNotes, entries }: { tasks: Task[]; habits: Habit[]; goals: Goal[]; planNotes: Record<string,string>; entries: JournalEntry[] }) {
  const [range, setRange] = useState<"monthly"|"weekly"|"daily">("monthly");
  const now = new Date();
  const startDate = range === "daily" ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : range === "weekly" ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay()+6)%7)) : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = range === "daily" ? startDate : range === "weekly" ? addDays(startDate, 6) : new Date(now.getFullYear(), now.getMonth()+1, 0);
  const inRange = (key?: string) => { if (!key) return false; const d = new Date(`${key}T12:00:00`); return d >= startDate && d <= endDate; };
  const rangeTasks = tasks.filter(t => inRange(t.date || todayKey));
  const completedTasks = rangeTasks.filter(t => t.done).length;
  const rangeEntries = entries.filter(e => inRange(e.day));
  const rangePlanNotes = Object.keys(planNotes).filter(inRange).length;
  const habitChecks = habits.reduce((sum,h) => sum + Object.entries(h.history || {}).filter(([d,v]) => v && inRange(d)).length, 0);
  const taskProgress = rangeTasks.length ? Math.round(completedTasks / rangeTasks.length * 100) : 0;
  const habitProgress = habits.length ? Math.min(100, Math.round(habitChecks / Math.max(1, habits.length * (range === "daily" ? 1 : range === "weekly" ? 7 : 30)) * 100)) : 0;
  const goalProgress = goals.length ? Math.round(goals.reduce((s,g)=>s+g.progress,0)/goals.length) : 0;
  const values = range === "daily" ? [taskProgress, habitProgress, goalProgress, rangeEntries.length * 10, rangePlanNotes * 10, 70, 80] : Array.from({length:7},(_,i)=>Math.max(8, Math.round(((i+2)*13 + taskProgress) % 100)));
  return <div className="page-content"><div className="page-header"><div><div className="eyebrow"><Icon name="insights" size={16} /> REFLECT</div><h1>Notice the pattern.</h1><p>See your daily, weekly, and monthly progress in the same Liquid Glass view.</p></div></div><div className="insight-tabs"><button className={range === "monthly" ? "active" : ""} onClick={()=>setRange("monthly")}>Monthly</button><button className={range === "weekly" ? "active" : ""} onClick={()=>setRange("weekly")}>Weekly</button><button className={range === "daily" ? "active" : ""} onClick={()=>setRange("daily")}>Daily</button></div><div className="insight-grid"><Glass className="insight-main"><div className="section-title-row"><div><span className="section-label">{range.toUpperCase()} FLOW</span><h2>{range === "monthly" ? "Your month at a glance." : range === "weekly" ? "Your week at a glance." : "Today at a glance."}</h2></div><span className="soft-pill">{range === "monthly" ? now.toLocaleDateString(undefined,{month:"long",year:"numeric"}) : range === "weekly" ? "This week" : "Today"}</span></div><div className="bar-chart">{values.map((v,i)=><div className="bar-column" key={i}><div className="bar-track"><span style={{height:`${Math.max(8,v)}%`}}/></div><small>{range === "daily" ? ["Tasks","Habits","Goals","Notes","Plans","Focus","Mood"][i] : ["M","T","W","T","F","S","S"][i]}</small></div>)}</div></Glass><div className="metric-stack"><Glass><span className="section-label">TASKS</span><strong>{taskProgress}%</strong><p>{completedTasks} of {rangeTasks.length} completed</p></Glass><Glass><span className="section-label">HABITS</span><strong>{habitProgress}%</strong><p>{habitChecks} check-ins in range</p></Glass><Glass><span className="section-label">GOALS</span><strong>{goalProgress}%</strong><p>average progress</p></Glass></div></div><Glass className="insight-note"><div className="note-symbol"><Icon name="sun" size={22} /></div><div><span className="section-label">{range.toUpperCase()} SUMMARY</span><h3>{range === "monthly" ? "A wider view of your progress." : range === "weekly" ? "Small actions are adding up." : "Make today count."}</h3><p>{rangeEntries.length} journal entries · {rangePlanNotes} saved planning notes · {rangeTasks.length} tasks planned.</p></div></Glass></div>;
}

function Modal({ title, eyebrow, children, onClose, className = "" }: { title: string; eyebrow: string; children: ReactNode; onClose: () => void; className?: string }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className={`modal-card glass-card ${className}`.trim()} onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><span className="section-label">{eyebrow}</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><Icon name="close" size={19} /></button></div>{children}</div></div>;
}

function TimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parts = formatTimeParts(value);
  const update = (key: "hour"|"minute"|"period", next: string) => { const x = { ...parts, [key]: next }; onChange(`${x.hour}:${x.minute} ${x.period}`); };
  return <div className="iphone-time-picker"><div className="time-picker-column"><span>Hour</span><select value={parts.hour} onChange={e=>update("hour",e.target.value)}>{Array.from({length:12},(_,i)=>String(i+1)).map(h=><option key={h}>{h}</option>)}</select></div><div className="time-picker-colon">:</div><div className="time-picker-column"><span>Minute</span><select value={parts.minute} onChange={e=>update("minute",e.target.value)}>{Array.from({length:12},(_,i)=>String(i*5).padStart(2,"0")).map(m=><option key={m}>{m}</option>)}</select></div><div className="time-picker-column"><span>AM / PM</span><select value={parts.period} onChange={e=>update("period",e.target.value)}><option>AM</option><option>PM</option></select></div></div>;
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean>(() => (localStorage.getItem("dayflow-auth") === "true" || localStorage.getItem("dayflow-auth") === "1"));
  const [user, setUser] = useState<string>(() => localStorage.getItem("dayflow-user") || localStorage.getItem("dayflow-name") || localStorage.getItem("dayflow-email") || "M");
  const [page, setPage] = useState<Page>("home");
  const [tasks, setTasks] = useState<Task[]>(() => { const saved = JSON.parse(localStorage.getItem("dayflow-tasks") || "null"); return (saved || defaultTasks).map((t: Task) => ({ ...t, date: t.date || todayKey })); });
  const [habits, setHabits] = useState<Habit[]>(() => JSON.parse(localStorage.getItem("dayflow-habits") || "null") || defaultHabits);
  const [goals, setGoals] = useState<Goal[]>(() => JSON.parse(localStorage.getItem("dayflow-goals") || "null") || defaultGoals);
  const [entries, setEntries] = useState<JournalEntry[]>(() => JSON.parse(localStorage.getItem("dayflow-journal") || "null") || []);
  const [intentions, setIntentions] = useState<Record<string,string>>(() => JSON.parse(localStorage.getItem("dayflow-intentions") || "{}"));
  const [planNotes, setPlanNotes] = useState<Record<string,string>>(() => JSON.parse(localStorage.getItem("dayflow-plan-notes") || "{}"));
  const intention = intentions[todayKey] || "";
  const [modal, setModal] = useState<null | "intention" | "task" | "habit">(null);
  const [newTask, setNewTask] = useState({ title: "", time: "9:00 AM", date: todayKey });
  const [newHabit, setNewHabit] = useState("");
  const [journalDate, setJournalDate] = useState(todayKey);
  const [draftIntent, setDraftIntent] = useState(intention);
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem("dayflow-theme") === "dark");
  const [weather, setWeather] = useState({ code: 0, isDay: 1, label: "Weather" });

  useEffect(() => { localStorage.setItem("dayflow-tasks", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem("dayflow-habits", JSON.stringify(habits)); }, [habits]);
  useEffect(() => { localStorage.setItem("dayflow-goals", JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem("dayflow-journal", JSON.stringify(entries)); }, [entries]);
  useEffect(() => { localStorage.setItem("dayflow-intentions", JSON.stringify(intentions)); }, [intentions]);
  useEffect(() => { localStorage.setItem("dayflow-plan-notes", JSON.stringify(planNotes)); }, [planNotes]);

  useEffect(() => { localStorage.setItem("dayflow-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => { const old = localStorage.getItem("dayflow-intention"); if (old && !Object.keys(intentions).length) setIntentions({ [todayKey]: old }); }, []);

  useEffect(() => {
    let alive = true;
    const load = async (lat: number, lon: number) => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`);
        if (!response.ok) throw new Error("Weather request failed");
        const data = await response.json();
        if (!alive || !data.current) return;
        setWeather({
          code: Number(data.current.weather_code ?? 0),
          isDay: Number(data.current.is_day ?? 1),
          label: weatherName(Number(data.current.weather_code ?? 0), Number(data.current.is_day ?? 1), Number(data.current.temperature_2m)),
        });
      } catch {
        if (alive) setWeather({ code: 0, isDay: 1, label: "Weather unavailable" });
      }
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => load(position.coords.latitude, position.coords.longitude),
        () => load(16.9891, 81.7804),
        { enableHighAccuracy: false, timeout: 7000, maximumAge: 15 * 60 * 1000 }
      );
    } else {
      load(16.9891, 81.7804);
    }
    return () => { alive = false; };
  }, []);

  const openIntent = () => { setDraftIntent(intentions[todayKey] || ""); setModal("intention"); };
  const logout = () => { localStorage.removeItem("dayflow-auth"); setAuthenticated(false); setPage("home"); };
  const login = (email: string) => { setUser(localStorage.getItem("dayflow-user") || email); setAuthenticated(true); };
  const addTask = (date: string = todayKey) => { setNewTask({ title: "", time: "9:00 AM", date }); setModal("task"); };
  const saveTask = () => { if (!newTask.title.trim()) return; setTasks(ts => sortTasks([...ts, { id: uid("t"), title: newTask.title.trim(), time: newTask.time, done: false, date: newTask.date }])); setNewTask({ title: "", time: "9:00 AM", date: todayKey }); setModal(null); };
  const addHabit = () => setModal("habit");
  const addNoteForDate = (date: string) => { setJournalDate(date); setPage("journal"); };
  const saveHabit = () => { if (!newHabit.trim()) return; setHabits(hs => [...hs, { id: uid("h"), title: newHabit.trim(), streak: 0, done: false }]); setNewHabit(""); setModal(null); };
  const title = useMemo(() => ({ home: "Home", plan: "Plan", habits: "Habits", goals: "Goals", journal: "Journal", insights: "Insights" }[page]), [page]);

  if (!authenticated) return <AuthScreen onAuthenticated={login} />;

  const weatherClass = weather.code >= 51 ? "weather-rain" : weather.code >= 1 ? "weather-cloud" : weather.isDay ? "weather-sunny" : "weather-night";

  return <div className={`app-shell ${dark ? "theme-dark" : "theme-light"} ${weatherClass}`}>
    <div className="ambient ambient-a" /><div className="ambient ambient-b" /><div className="ambient ambient-c" />
    <div className="static-weather-scene" aria-hidden="true"><div className="scene-glow" /><div className="scene-horizon" /><div className="scene-mountain back" /><div className="scene-mountain front" /></div>
    <Sidebar page={page} setPage={setPage} onLogout={logout} />
    <div className="main-area">
      <TopBar onLogout={logout} onOpenIntent={openIntent} dark={dark} setDark={setDark} weather={weather} />
      <main className="route-area" key={page}>
        {page === "home" && <HomePage tasks={tasks} setTasks={setTasks} habits={habits} onIntent={openIntent} intention={intention} user={user} onAddTask={addTask} onAddHabit={addHabit} onNavigate={setPage} />}
        {page === "plan" && <PlanPage tasks={tasks} setTasks={setTasks} onAddTask={addTask} onAddNote={addNoteForDate} onIntent={openIntent} planNotes={planNotes} setPlanNotes={setPlanNotes} />}
        {page === "habits" && <HabitsPage habits={habits} setHabits={setHabits} onAddHabit={addHabit} />}
        {page === "goals" && <GoalsPage goals={goals} setGoals={setGoals} />}
        {page === "journal" && <JournalPage entries={entries} setEntries={setEntries} initialDate={journalDate} />}
        {page === "insights" && <InsightsPage tasks={tasks} habits={habits} goals={goals} planNotes={planNotes} entries={entries} />}
      </main>
      <BottomNav page={page} setPage={setPage} />
      <div className="mobile-page-name">{title}</div>
    </div>

    {modal === "intention" && <Modal className="intention-modal" eyebrow="DAILY INTENTION" title="What matters most today?" onClose={() => setModal(null)}><p className="modal-description">Choose one thing you want to give your attention to.</p><textarea className="modal-textarea" maxLength={200} value={draftIntent} onChange={e => setDraftIntent(e.target.value)} placeholder="Write your intention..." autoFocus /><div className="char-count">{draftIntent.length}/200</div><button className="primary-button full" onClick={() => { setIntentions(xs => ({ ...xs, [todayKey]: draftIntent.trim() })); setModal(null); }}>Save intention</button></Modal>}
    {modal === "task" && <Modal className="task-modal" eyebrow="NEW TASK" title="Add a gentle task" onClose={() => setModal(null)}><label className="modal-field"><span>Task</span><input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="e.g. Finish DSA practice" autoFocus /></label><label className="modal-field"><span>Date</span><input value={prettyDate(newTask.date)} readOnly /></label><label className="modal-field"><span>Time</span><TimePicker value={newTask.time} onChange={time => setNewTask({ ...newTask, time })} /></label><button className="primary-button full" onClick={saveTask}>Add task <Icon name="check" size={17} /></button></Modal>}
    {modal === "habit" && <Modal eyebrow="NEW HABIT" title="Add a small routine" onClose={() => setModal(null)}><label className="modal-field"><span>Habit</span><input value={newHabit} onChange={e => setNewHabit(e.target.value)} placeholder="e.g. Stretch for 5 minutes" autoFocus /></label><button className="primary-button full" onClick={saveHabit}>Add habit <Icon name="check" size={17} /></button></Modal>}
  </div>;
}

export default App;
