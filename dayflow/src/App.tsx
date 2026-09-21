import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import type { User } from "@supabase/supabase-js";
import "./index.css";

type Task = {
  id: string;
  user_id: string;
  title: string;
  time: string | null;
  category: string | null;
  priority: string | null;
  completed: boolean;
  due_date: string;
  created_at: string;
  duration?: number | null;
};

type Habit = {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  target: string | null;
  created_at: string;
};

type HabitLog = {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  completed: boolean;
  created_at: string;
};

type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completed: boolean;
  created_at: string;
};

type JournalEntry = {
  id: string;
  user_id: string;
  entry_date: string;
  content: string | null;
  created_at: string;
};

type Reminder = {
  id: string;
  title: string;
  due_at: string;
  completed: boolean;
  notified: boolean;
};

function reminderLabel(reminder: Reminder) {
  const date = new Date(reminder.due_at);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const APP_TIME_ZONE = "Asia/Kolkata";
const ACCENT_CLASSES = ["accent-purple", "accent-green", "accent-orange", "accent-pink", "accent-blue", "accent-yellow"];

function getAppNow() {
  return new Date();
}

function todayString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(getAppNow());
}

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: APP_TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(getAppNow())
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatToday() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(getAppNow());
}

function shiftDateValue(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function formatShortDate(date: string | null) {
  if (!date) return "No date";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTaskTime(time: string | null) {
  if (!time) return "Any time";
  const [hour, minute] = time.split(":").map(Number);
  const meridiem = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

function parseTimeParts(time: string | null) {
  if (!time) return { hour: "09", minute: "00", period: "AM" };
  const [h, minute] = time.split(":").map(Number);
  const hour = h % 12 || 12;
  return { hour: String(hour).padStart(2, "0"), minute: String(minute).padStart(2, "0"), period: h >= 12 ? "PM" : "AM" };
}

function composeTime24(hourValue: string, minuteValue: string, period: string) {
  let hour = Number(hourValue);
  if (period === "AM") hour = hour === 12 ? 0 : hour;
  else hour = hour === 12 ? 12 : hour + 12;
  return `${String(hour).padStart(2, "0")}:${minuteValue}`;
}

function getCategoryClass(category: string | null) {
  const value = (category || "General").toLowerCase();
  if (value.includes("personal")) return "category-pink";
  if (value.includes("health")) return "category-green";
  if (value.includes("study")) return "category-purple";
  if (value.includes("work")) return "category-orange";
  return "category-blue";
}

function getTaskIcon(task: Task) {
  const value = `${task.title} ${task.category || ""}`.toLowerCase();
  if (value.includes("workout") || value.includes("exercise") || value.includes("gym")) return "🏋️";
  if (value.includes("meditat")) return "🌿";
  if (value.includes("meet") || value.includes("standup")) return "👥";
  if (value.includes("client") || value.includes("call")) return "📞";
  if (value.includes("read") || value.includes("book")) return "📖";
  if (value.includes("lunch") || value.includes("dinner") || value.includes("food")) return "🍲";
  if (value.includes("code") || value.includes("project") || value.includes("deep work")) return "🧠";
  if (value.includes("write") || value.includes("journal")) return "📝";
  if (value.includes("water")) return "💧";
  if (value.includes("shop") || value.includes("grocery")) return "🛒";
  return "✦";
}

function priorityClass(priority: string | null) {
  const value = (priority || "Medium").toLowerCase();
  if (value === "high") return "priority-high";
  if (value === "low") return "priority-low";
  return "priority-medium";
}

function progressLabel(value: number) {
  if (value === 100) return "Everything is checked off.";
  if (value >= 75) return "You're in a strong rhythm.";
  if (value >= 40) return "A few more wins will move the day along.";
  return "Start with one small, easy win.";
}

function getHabitStreak(habitId: string, logs: HabitLog[]) {
  const dates = new Set(
    logs
      .filter((log) => log.habit_id === habitId && log.completed)
      .map((log) => log.log_date)
  );
  let streak = 0;
  let cursor = todayString();

  while (dates.has(cursor)) {
    streak += 1;
    cursor = shiftDateValue(cursor, -1);
  }

  return streak;
}

/* =========================
   LOGIN
========================= */

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("dayflow-theme") === "dark");

  useEffect(() => {
    localStorage.setItem("dayflow-theme", dark ? "dark" : "light");
  }, [dark]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) setMessage(error.message);
    setLoading(false);
  }

  return (
    <div className={dark ? "login-page theme-dark" : "login-page"}>
      <video
        className="login-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src={`${import.meta.env.BASE_URL}dayflow-login.mp4`} type="video/mp4" />
      </video>
      <div className="login-video-overlay" aria-hidden="true" />

      <button
        className="login-theme-toggle"
        type="button"
        onClick={() => setDark((value) => !value)}
        aria-label="Toggle theme"
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="login-center">
        <div className="login-card">
          <div className="login-brand">
            <span className="login-brand-mark"><Sparkles size={18} /></span>
            <div>
              <strong>DayFlow</strong>
              <span>Personal productivity</span>
            </div>
          </div>

          <div className="login-card-topline">
            <span>PLAN • DO • REFLECT</span>
            <span className="login-dot" />
          </div>
          <h1 className="login-main-quote">Make space for what matters.</h1>
          <p className="login-subtitle">A colorful, calm workspace for planning your day, keeping your rhythm, reaching your goals, and reflecting simply.</p>

          <div className="login-mini-grid">
            <div><Clock3 size={15} /><span>Shape your day</span></div>
            <div><Flame size={15} /><span>Keep your rhythm</span></div>
            <div><BookOpen size={15} /><span>Reflect simply</span></div>
          </div>

          <div className="login-form-heading">
            <span>WELCOME BACK</span>
            <h2>Let’s continue your flow.</h2>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button className="primary-button login-submit" disabled={loading}>
              {loading ? "Signing in…" : <>Enter DayFlow <ArrowRight size={16} /></>}
            </button>
          </form>

          {message && <div className="error-box">⚠ {message}</div>}

          <div className="login-credit">Built &amp; Designed by M.N.MAHESH_REDDY</div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   APP
========================= */

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      setChecking(false);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="loading-page">
        <div className="loading-logo"><Sparkles size={18} /></div>
        <h2>Loading DayFlow</h2>
        <p>Getting your day ready.</p>
      </div>
    );
  }

  if (!user) return <Login />;
  return <Dashboard user={user} />;
}

/* =========================
   DASHBOARD SHELL
========================= */

function Dashboard({ user }: { user: User }) {
  const [page, setPage] = useState("home");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plannerTasks, setPlannerTasks] = useState<Task[]>([]);
  const [plannerDate, setPlannerDate] = useState(todayString());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [, setJournal] = useState<JournalEntry | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try {
      const saved = localStorage.getItem("dayflow-reminders");
      return saved ? (JSON.parse(saved) as Reminder[]) : [];
    } catch {
      return [];
    }
  });
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderAt, setNewReminderAt] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [newGoalDate, setNewGoalDate] = useState("");
  const [journalText, setJournalText] = useState("");
  const [savingJournal, setSavingJournal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newCategory, setNewCategory] = useState("Work");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newDuration, setNewDuration] = useState("30");
  const [newHabit, setNewHabit] = useState("");
  const [newHabitIcon, setNewHabitIcon] = useState("🔥");
  const [dark, setDark] = useState(() => localStorage.getItem("dayflow-theme") === "dark");
  const [reminderPeekOpen, setReminderPeekOpen] = useState(false);

  const today = todayString();

  useEffect(() => {
    localStorage.setItem("dayflow-theme", dark ? "dark" : "light");
  }, [dark]);

  function shiftDate(date: string, days: number) {
    const [year, month, day] = date.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day));
    next.setUTCDate(next.getUTCDate() + days);
    return next.toISOString().slice(0, 10);
  }


  async function loadData() {
    setLoading(true);
    setError("");

    const [taskResult, habitResult, logResult, goalResult, journalResult, journalListResult] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("due_date", today)
        .order("created_at", { ascending: true }),
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("log_date", { ascending: false }),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("completed", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_date", today)
        .maybeSingle(),
      supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false })
        .limit(4),
    ]);

    const errors = [taskResult.error, habitResult.error, logResult.error, goalResult.error, journalResult.error, journalListResult.error].filter(Boolean);
    if (errors.length) setError(errors[0]?.message || "Something went wrong while loading DayFlow.");

    const loadedTasks = (taskResult.data as Task[]) || [];
    setTasks(loadedTasks);
    if (plannerDate === today) setPlannerTasks(loadedTasks);
    setHabits((habitResult.data as Habit[]) || []);
    setHabitLogs((logResult.data as HabitLog[]) || []);
    setGoals((goalResult.data as Goal[]) || []);
    setJournal((journalResult.data as JournalEntry | null) || null);
    setJournalText(journalResult.data?.content || "");
    setJournalEntries((journalListResult.data as JournalEntry[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [user.id]);

  async function loadPlannerTasks(date: string) {
    setError("");
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("due_date", date)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setPlannerTasks((data as Task[]) || []);
  }

  useEffect(() => {
    if (plannerDate !== today) loadPlannerTasks(plannerDate);
    else setPlannerTasks(tasks);
  }, [plannerDate, today, tasks]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: newTask.trim(),
        time: newTime || null,
        category: newCategory,
        priority: newPriority,
        duration: Number(newDuration) || 30,
        completed: false,
        due_date: plannerDate,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    if (data) {
      const createdTask = data as Task;
      setPlannerTasks((current) => [...current, createdTask]);
      if (plannerDate === today) setTasks((current) => [...current, createdTask]);
    }

    setNewTask("");
    setNewTime("09:00");
    setNewDuration("30");
  }

  async function updateTaskTime(task: Task, time: string) {
    const { error } = await supabase
      .from("tasks")
      .update({ time })
      .eq("id", task.id)
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
      return;
    }

    const updateList = (current: Task[]) => current.map((item) => item.id === task.id ? { ...item, time } : item);
    setTasks(updateList);
    setPlannerTasks(updateList);
  }

  async function toggleTask(task: Task) {
    const nextValue = !task.completed;
    const { error } = await supabase
      .from("tasks")
      .update({ completed: nextValue })
      .eq("id", task.id)
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
      return;
    }

    const updateList = (current: Task[]) => current.map((item) => item.id === task.id ? { ...item, completed: nextValue } : item);
    setTasks(updateList);
    setPlannerTasks(updateList);
  }

  async function deleteTask(id: string) {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
      return;
    }

    setTasks((current) => current.filter((task) => task.id !== id));
    setPlannerTasks((current) => current.filter((task) => task.id !== id));
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newHabit.trim()) return;

    const { data, error } = await supabase
      .from("habits")
      .insert({ user_id: user.id, name: newHabit.trim(), icon: newHabitIcon, target: "Daily" })
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    if (data) setHabits((current) => [...current, data as Habit]);
    setNewHabit("");
  }

  function isHabitComplete(habitId: string, date = today) {
    return habitLogs.some((log) => log.habit_id === habitId && log.log_date === date && log.completed);
  }

  async function toggleHabit(habit: Habit) {
    const completed = isHabitComplete(habit.id);

    if (completed) {
      const { error } = await supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", habit.id)
        .eq("user_id", user.id)
        .eq("log_date", today);

      if (error) {
        setError(error.message);
        return;
      }

      setHabitLogs((current) => current.filter((log) => !(log.habit_id === habit.id && log.log_date === today)));
      return;
    }

    const { data, error } = await supabase
      .from("habit_logs")
      .insert({ habit_id: habit.id, user_id: user.id, log_date: today, completed: true })
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    if (data) setHabitLogs((current) => [...current, data as HabitLog]);
  }

  async function deleteHabit(id: string) {
    const { error } = await supabase
      .from("habits")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
      return;
    }

    setHabits((current) => current.filter((habit) => habit.id !== id));
    setHabitLogs((current) => current.filter((log) => log.habit_id !== id));
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!newGoal.trim()) return;

    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: user.id,
        title: newGoal.trim(),
        description: newGoalDescription.trim() || null,
        target_date: newGoalDate || null,
        completed: false,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    if (data) setGoals((current) => [data as Goal, ...current]);
    setNewGoal("");
    setNewGoalDescription("");
    setNewGoalDate("");
  }

  async function toggleGoal(goal: Goal) {
    const nextValue = !goal.completed;
    const { error } = await supabase
      .from("goals")
      .update({ completed: nextValue })
      .eq("id", goal.id)
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
      return;
    }

    setGoals((current) => current.map((item) => item.id === goal.id ? { ...item, completed: nextValue } : item));
  }

  async function deleteGoal(id: string) {
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
      return;
    }

    setGoals((current) => current.filter((goal) => goal.id !== id));
  }

  useEffect(() => {
    localStorage.setItem("dayflow-reminders", JSON.stringify(reminders));
  }, [reminders]);

  async function requestReminderNotifications() {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    return (await Notification.requestPermission()) === "granted";
  }

  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!newReminderTitle.trim() || !newReminderAt) return;
    await requestReminderNotifications();
    const created: Reminder = {
      id: crypto.randomUUID(),
      title: newReminderTitle.trim(),
      due_at: new Date(newReminderAt).toISOString(),
      completed: false,
      notified: false,
    };
    setReminders((current) => [...current, created].sort((a, b) => a.due_at.localeCompare(b.due_at)));
    setNewReminderTitle("");
    setNewReminderAt("");
  }

  function toggleReminder(reminder: Reminder) {
    setReminders((current) => current.map((item) => item.id === reminder.id ? { ...item, completed: !item.completed } : item));
  }

  function deleteReminder(id: string) {
    setReminders((current) => current.filter((item) => item.id !== id));
  }

  useEffect(() => {
    const checkReminders = async () => {
      const now = Date.now();
      const due = reminders.filter((item) => !item.completed && !item.notified && new Date(item.due_at).getTime() <= now);
      if (!due.length) return;

      if ("Notification" in window && Notification.permission === "granted") {
        due.forEach((item) => new Notification("DayFlow reminder", { body: item.title }));
      }
      setReminders((current) => current.map((item) => due.some((d) => d.id === item.id) ? { ...item, notified: true } : item));
    };

    checkReminders();
    const id = window.setInterval(checkReminders, 15000);
    return () => window.clearInterval(id);
  }, [reminders]);

  async function saveJournal() {
    setSavingJournal(true);
    setError("");

    const { data, error } = await supabase
      .from("journal_entries")
      .upsert({ user_id: user.id, entry_date: today, content: journalText.trim() }, { onConflict: "user_id,entry_date" })
      .select()
      .single();

    if (error) setError(error.message);
    else if (data) {
      const saved = data as JournalEntry;
      setJournal(saved);
      setJournalText(saved.content || "");
      setJournalEntries((current) => [saved, ...current.filter((entry) => entry.entry_date !== saved.entry_date)].slice(0, 4));
    }

    setSavingJournal(false);
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  const completedTasks = tasks.filter((task) => task.completed).length;
  const completedHabits = habits.filter((habit) => isHabitComplete(habit.id)).length;
  const taskPercentage = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const habitPercentage = habits.length ? Math.round((completedHabits / habits.length) * 100) : 0;
  const formattedDate = formatToday();
  const greeting = getGreeting();
  const displayName = (user.user_metadata?.full_name || user.email?.split("@")[0] || "Mahesh").toString().trim();

  const pageMeta: Record<string, { label: string; title: string; description: string }> = {
    home: { label: "YOUR DAY", title: "A little structure. A lot more ease.", description: "See the shape of today, then take the next simple step." },
    planner: { label: "PLAN YOUR DAY", title: "Planner", description: "Place your tasks where they belong and keep the day realistic." },
    habits: { label: "BUILD YOUR RHYTHM", title: "Habits", description: "A small list of things you want to keep showing up for." },
    goals: { label: "KEEP DIRECTION", title: "Goals", description: "Keep the things that matter visible without turning them into noise." },
    journal: { label: "PAUSE & REFLECT", title: "Journal", description: "Close the day with a few honest lines and a clearer tomorrow." },
    analytics: { label: "NOTICE YOUR PATTERNS", title: "Insights", description: "Simple signals from the work you've already done." },
    settings: { label: "YOUR ACCOUNT", title: "Settings", description: "A few account controls, kept intentionally simple." },
  };

  return (
    <div className={dark ? "app-shell theme-dark" : "app-shell"}>
      <header className="floating-nav">
        <button className="floating-brand" onClick={() => setPage("home")} aria-label="Go to home">
          <span className="brand-logo" aria-hidden="true"><i /><i /><i /></span>
          <span className="floating-brand-copy">
            <strong>DayFlow</strong>
            <small>Personal productivity</small>
          </span>
        </button>

        <nav className="floating-nav-links" aria-label="Main navigation">
          <NavButton icon={<LayoutDashboard size={18} />} label="Home" active={page === "home"} onClick={() => setPage("home")} />
          <NavButton icon={<CalendarDays size={18} />} label="Planner" active={page === "planner"} onClick={() => setPage("planner")} />
          <NavButton icon={<Flame size={18} />} label="Habits" active={page === "habits"} onClick={() => setPage("habits")} />
          <NavButton icon={<Target size={18} />} label="Goals" active={page === "goals"} onClick={() => setPage("goals")} />
          <NavButton icon={<BookOpen size={18} />} label="Journal" active={page === "journal"} onClick={() => setPage("journal")} />
          <NavButton icon={<BarChart3 size={18} />} label="Insights" active={page === "analytics"} onClick={() => setPage("analytics")} />
          <button className={page === "settings" ? "floating-settings-icon active" : "floating-settings-icon"} onClick={() => setPage("settings")} title="Settings" aria-label="Settings"><Settings size={18} /></button>
        </nav>

        <div className="floating-nav-right">
          <button
            className={reminderPeekOpen ? "nav-icon-button notification-button open" : "nav-icon-button notification-button"}
            title="Reminders"
            aria-label="Reminders"
            onClick={() => setReminderPeekOpen((value) => !value)}
          >
            <Bell size={18} />
            {reminders.some((item) => !item.completed) && <span className="notification-dot" />}
          </button>
          <button
            className="theme-toggle"
            onClick={() => setDark((value) => !value)}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="floating-logout" onClick={logout} title="Sign out" aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {reminderPeekOpen && (
        <div className="reminder-popover" role="dialog" aria-label="All reminders">
          <div className="reminder-popover-head">
            <div>
              <span className="section-tag">REMINDERS</span>
              <h3>Don't forget</h3>
            </div>
            <button className="icon-button" type="button" onClick={() => setReminderPeekOpen(false)} aria-label="Close reminders">×</button>
          </div>
          <div className="reminder-popover-list">
            {reminders.length ? reminders.map((reminder, index) => (
              <div key={reminder.id} className={`reminder-popover-row ${ACCENT_CLASSES[index % ACCENT_CLASSES.length]} ${reminder.completed ? "completed" : ""}`}>
                <button className="reminder-check" onClick={() => toggleReminder(reminder)} aria-label={reminder.completed ? "Mark reminder incomplete" : "Mark reminder complete"}>
                  {reminder.completed ? <Check size={13} /> : ""}
                </button>
                <div><strong>{reminder.title}</strong><small>{reminderLabel(reminder)}</small></div>
                <button className="task-delete-mini" onClick={() => deleteReminder(reminder.id)} aria-label={`Delete ${reminder.title}`}><Trash2 size={14} /></button>
              </div>
            )) : <p className="side-empty">No reminders yet.</p>}
          </div>
          <button className="reminder-popover-manage" type="button" onClick={() => { setPage("planner"); setReminderPeekOpen(false); }}>Manage reminders <ArrowRight size={14} /></button>
        </div>
      )}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-meta-row">
              <span className="eyebrow">{pageMeta[page].label}</span>
              <span className="topbar-dot" />
            </div>
            <h1>{greeting}, <span className="topbar-name">{displayName}.</span></h1>
            <p className="topbar-date">{formattedDate}</p>
          </div>
          <div className="topbar-actions">
            <span className="topbar-note">One day at a time.</span>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading-card">
            <div className="loading-inline"><span className="loading-spinner" /> Loading your DayFlow…</div>
          </div>
        ) : (
          <>
            {page === "home" && (
              <HomePage
                tasks={tasks}
                habits={habits}
                completedTasks={completedTasks}
                completedHabits={completedHabits}
                taskPercentage={taskPercentage}
                habitPercentage={habitPercentage}
                toggleTask={toggleTask}
                toggleHabit={toggleHabit}
                isHabitComplete={isHabitComplete}
                onOpenPlanner={() => setPage("planner")}
                onOpenJournal={() => setPage("journal")}
                userName={displayName}
                reminders={reminders}
                addReminder={addReminder}
                toggleReminder={toggleReminder}
                deleteReminder={deleteReminder}
                newReminderTitle={newReminderTitle}
                newReminderAt={newReminderAt}
                setNewReminderTitle={setNewReminderTitle}
                setNewReminderAt={setNewReminderAt}
              />
            )}

            {page === "planner" && (
              <PlannerPage
                tasks={plannerTasks}
                plannerDate={plannerDate}
                setPlannerDate={setPlannerDate}
                shiftDate={shiftDate}
                newTask={newTask}
                newTime={newTime}
                newCategory={newCategory}
                newPriority={newPriority}
                newDuration={newDuration}
                setNewTask={setNewTask}
                setNewTime={setNewTime}
                setNewCategory={setNewCategory}
                setNewPriority={setNewPriority}
                setNewDuration={setNewDuration}
                addTask={addTask}
                toggleTask={toggleTask}
                deleteTask={deleteTask}
                updateTaskTime={updateTaskTime}
                reminders={reminders}
                addReminder={addReminder}
                toggleReminder={toggleReminder}
                deleteReminder={deleteReminder}
                newReminderTitle={newReminderTitle}
                newReminderAt={newReminderAt}
                setNewReminderTitle={setNewReminderTitle}
                setNewReminderAt={setNewReminderAt}
                requestReminderNotifications={requestReminderNotifications}
              />
            )}

            {page === "habits" && (
              <HabitsPage
                habits={habits}
                habitLogs={habitLogs}
                isHabitComplete={isHabitComplete}
                toggleHabit={toggleHabit}
                deleteHabit={deleteHabit}
                newHabit={newHabit}
                newHabitIcon={newHabitIcon}
                setNewHabit={setNewHabit}
                setNewHabitIcon={setNewHabitIcon}
                addHabit={addHabit}
              />
            )}

            {page === "goals" && (
              <GoalsPage
                goals={goals}
                newGoal={newGoal}
                newGoalDescription={newGoalDescription}
                newGoalDate={newGoalDate}
                setNewGoal={setNewGoal}
                setNewGoalDescription={setNewGoalDescription}
                setNewGoalDate={setNewGoalDate}
                addGoal={addGoal}
                toggleGoal={toggleGoal}
                deleteGoal={deleteGoal}
              />
            )}

            {page === "journal" && (
              <JournalPage
                journalText={journalText}
                setJournalText={setJournalText}
                saveJournal={saveJournal}
                savingJournal={savingJournal}
                journalEntries={journalEntries}
              />
            )}

            {page === "analytics" && (
              <AnalyticsPage
                tasks={tasks}
                habits={habits}
                completedTasks={completedTasks}
                completedHabits={completedHabits}
                goals={goals}
                habitLogs={habitLogs}
              />
            )}

            {page === "settings" && (
              <SettingsPage
                user={user}
                logout={logout}
                dark={dark}
                setDark={setDark}
              />
            )}
          </>
        )}
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <MobileNavButton icon={<LayoutDashboard size={20} />} label="Home" active={page === "home"} onClick={() => setPage("home")} />
        <MobileNavButton icon={<CalendarDays size={20} />} label="Tasks" active={page === "planner"} onClick={() => setPage("planner")} />
        <MobileNavButton icon={<Flame size={20} />} label="Habits" active={page === "habits"} onClick={() => setPage("habits")} />
        <MobileNavButton icon={<Target size={20} />} label="Goals" active={page === "goals"} onClick={() => setPage("goals")} />
        <MobileNavButton icon={<BookOpen size={20} />} label="Journal" active={page === "journal"} onClick={() => setPage("journal")} />
      </nav>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={active ? "floating-nav-link active" : "floating-nav-link"} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MobileNavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* =========================
   HOME
========================= */

function HomePage({
  tasks,
  habits,
  completedTasks,
  completedHabits,
  taskPercentage,
  habitPercentage,
  toggleTask,
  toggleHabit,
  isHabitComplete,
  onOpenPlanner,
  onOpenJournal,
  userName,
  reminders,
  addReminder,
  toggleReminder,
  deleteReminder,
  newReminderTitle,
  newReminderAt,
  setNewReminderTitle,
  setNewReminderAt,
}: {
  tasks: Task[];
  habits: Habit[];
  completedTasks: number;
  completedHabits: number;
  taskPercentage: number;
  habitPercentage: number;
  toggleTask: (task: Task) => void;
  toggleHabit: (habit: Habit) => void;
  isHabitComplete: (id: string) => boolean;
  onOpenPlanner: () => void;
  onOpenJournal: () => void;
  userName: string;
  reminders: Reminder[];
  addReminder: (e: React.FormEvent) => void;
  toggleReminder: (reminder: Reminder) => void;
  deleteReminder: (id: string) => void;
  newReminderTitle: string;
  newReminderAt: string;
  setNewReminderTitle: (value: string) => void;
  setNewReminderAt: (value: string) => void;
}) {
  const overall = Math.round((taskPercentage + habitPercentage) / 2);
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (overall / 100) * circumference;
  const nextTask = tasks.find((task) => !task.completed) || null;
  const completedCount = completedTasks + completedHabits;
  const totalCount = tasks.length + habits.length;
  const remaining = Math.max(totalCount - completedCount, 0);
  const quote = useMemo(() => {
    const quotes = [
      "Small steps make ordinary days feel meaningful.",
      "Keep the plan simple enough to live with.",
      "Progress can be quiet and still count.",
      "A calmer day starts with the next clear step.",
    ];
    return quotes[Number(todayString().slice(-2)) % quotes.length];
  }, []);

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  return (
    <section className="page-section home-page">
      <div className="home-command-card">
        <div className="home-command-main">
          <div className="home-greeting-line">{getGreeting()}, <strong>{userName}</strong>.</div>
          <span className="section-tag">TODAY AT A GLANCE</span>
          <h2>Make space for what matters.</h2>
          <p>{quote} · {progressLabel(overall)}</p>
          <div className="home-command-actions">
            <button className="primary-button" onClick={onOpenPlanner}>Plan the next step <ArrowRight size={15} /></button>
            <button className="soft-button" onClick={onOpenJournal}><BookOpen size={15} /> Write a note</button>
          </div>
        </div>

        <div className="home-next-card">
          <div className="small-card-top"><span>UP NEXT</span><Clock3 size={15} /></div>
          <strong>{nextTask ? nextTask.title : "You're all caught up"}</strong>
          <span>{nextTask ? `${formatTaskTime(nextTask.time)} · ${nextTask.duration || 30} min` : "Take a breath or move something into tomorrow."}</span>
          {nextTask && <div className={`task-category-chip ${getCategoryClass(nextTask.category)}`}>{nextTask.category || "General"}</div>}
        </div>
      </div>

      <div className="home-metric-row">
        <MetricCard label="Tasks" value={`${completedTasks}/${tasks.length}`} detail="finished today" tone="purple" progress={taskPercentage} icon={<Check size={15} />} />
        <MetricCard label="Habits" value={`${completedHabits}/${habits.length}`} detail="checked in" tone="green" progress={habitPercentage} icon={<Flame size={15} />} />
        <MetricCard label="Left" value={String(remaining)} detail="small wins remain" tone="orange" progress={totalCount ? Math.round((completedCount / totalCount) * 100) : 0} icon={<Sparkles size={15} />} />
        <div className="metric-card progress-ring-card">
          <div className="metric-card-head"><span>FLOW</span><span>{overall}%</span></div>
          <div className="ring-wrap small-ring-wrap">
            <svg viewBox="0 0 110 110" className="progress-ring">
              <circle cx="55" cy="55" r="45" className="progress-ring-track" />
              <circle cx="55" cy="55" r="45" className="progress-ring-value" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
            </svg>
            <div className="ring-center"><strong>{overall}%</strong><span>today</span></div>
          </div>
        </div>
      </div>

      <div className="home-layout-grid">
        <div className="panel home-panel">
          <div className="panel-header home-panel-header">
            <div>
              <span className="section-tag">TODAY'S FLOW</span>
              <h2>Tasks</h2>
            </div>
            <button className="panel-link" onClick={onOpenPlanner}>Open planner <ArrowRight size={14} /></button>
          </div>

          {sortedTasks.length === 0 ? (
            <EmptyState icon="✦" title="Your day is open" body="Add something to Planner when you're ready." actionLabel="Plan something" onAction={onOpenPlanner} />
          ) : (
            <div className="home-task-list">
              {sortedTasks.slice(0, 7).map((task, index) => (
                <TaskRow key={task.id} task={task} index={index} onToggle={toggleTask} />
              ))}
            </div>
          )}
        </div>

        <div className="panel home-panel">
          <div className="panel-header home-panel-header">
            <div>
              <span className="section-tag">DAILY RHYTHM</span>
              <h2>Habits</h2>
            </div>
            <span className="header-count">{completedHabits}/{habits.length}</span>
          </div>

          {habits.length === 0 ? (
            <EmptyState icon="◌" title="No habits yet" body="Start with one tiny routine you can repeat." />
          ) : (
            <div className="home-habit-list">
              {habits.slice(0, 7).map((habit, index) => {
                const complete = isHabitComplete(habit.id);
                return (
                  <button key={habit.id} className={`home-habit-row ${ACCENT_CLASSES[index % ACCENT_CLASSES.length]} ${complete ? "completed" : ""}`} onClick={() => toggleHabit(habit)}>
                    <span className={`habit-row-icon ${ACCENT_CLASSES[index % ACCENT_CLASSES.length]}`}>{complete ? <Check size={15} /> : (habit.icon || "🔥")}</span>
                    <span className="home-habit-copy">
                      <strong>{habit.name}</strong>
                      <small>{complete ? "Completed today" : "Daily check-in"}</small>
                    </span>
                    <span className={complete ? "habit-status done" : "habit-status"}>{complete ? "Done" : "Check in"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="home-bottom-grid">
        <div className="story-card story-card-purple">
          <span className="section-tag">ONE THING</span>
          <h3>{nextTask ? `Make space for “${nextTask.title}”.` : "Give the day one clear intention."}</h3>
          <p>Less juggling. More attention on the thing in front of you.</p>
        </div>
        <div className="reminder-panel panel">
          <div className="panel-header">
            <div><span className="section-tag">REMINDERS</span><h2>Don't forget</h2></div>
            <Bell size={20} />
          </div>
          <form className="reminder-add-form" onSubmit={addReminder}>
            <input value={newReminderTitle} onChange={(e) => setNewReminderTitle(e.target.value)} placeholder="Reminder title" aria-label="Reminder title" />
            <input type="datetime-local" value={newReminderAt} onChange={(e) => setNewReminderAt(e.target.value)} aria-label="Reminder date and time" />
            <button className="primary-button" type="submit"><Plus size={15} /> Add</button>
          </form>
          <div className="reminder-list">
            {reminders.slice(0, 3).map((reminder, index) => (
              <div key={reminder.id} className={`reminder-row ${ACCENT_CLASSES[index % ACCENT_CLASSES.length]} ${reminder.completed ? "completed" : ""}`}>
                <button className="reminder-check" onClick={() => toggleReminder(reminder)} aria-label={reminder.completed ? "Mark reminder incomplete" : "Mark reminder complete"}>{reminder.completed ? <Check size={13} /> : ""}</button>
                <div><strong>{reminder.title}</strong><small>{reminderLabel(reminder)}</small></div>
                <button className="delete-button" onClick={() => deleteReminder(reminder.id)} aria-label={`Delete ${reminder.title}`}><Trash2 size={14} /></button>
              </div>
            ))}
            {!reminders.length && <div className="side-empty">Add a reminder for anything you don't want to miss.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, detail, tone, progress, icon }: { label: string; value: string; detail: string; tone: "purple" | "green" | "orange"; progress: number; icon: React.ReactNode }) {
  return (
    <div className={`metric-card metric-${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
      <div className="metric-progress"><i style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

function TaskRow({ task, index, onToggle }: { task: Task; index: number; onToggle: (task: Task) => void }) {
  return (
    <button className={`home-task-row ${getCategoryClass(task.category)} ${task.completed ? "completed" : ""}`} onClick={() => onToggle(task)}>
      <span className="task-order">{String(index + 1).padStart(2, "0")}</span>
      <span className="task-time-block"><strong>{formatTaskTime(task.time)}</strong><small>{task.duration || 30} min</small></span>
      <span className="task-color-dot" data-category={getCategoryClass(task.category)} />
      <span className="task-row-copy"><strong>{task.title}</strong><small>{task.category || "General"}</small></span>
      <span className={`priority-mark ${priorityClass(task.priority)}`} />
      <span className="row-check">{task.completed ? <Check size={13} /> : ""}</span>
    </button>
  );
}

function EmptyState({ icon, title, body, actionLabel, onAction }: { icon: string; title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="empty-state roomy-empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {actionLabel && onAction && <button className="soft-button" onClick={onAction}>{actionLabel} <ArrowRight size={14} /></button>}
    </div>
  );
}

/* =========================
   PLANNER
========================= */

function QuickTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parts = parseTimeParts(value);

  const setPart = (
    part: "hour" | "minute" | "period",
    nextValue: string
  ) => {
    const next = { ...parts, [part]: nextValue };
    onChange(composeTime24(next.hour, next.minute, next.period));
  };

  return (
    <div className="quick-time-picker">
      <div className="quick-time-header">
        <div className="quick-time-icon"><Clock3 size={20} /></div>
        <div>
          <span className="quick-time-label">TIME</span>
          <strong className="quick-time-preview">{formatTaskTime(value || null)}</strong>
        </div>
      </div>

      <div className="quick-time-controls">
        <select
          className="quick-time-hour"
          aria-label="Hour"
          value={parts.hour}
          onChange={(e) => setPart("hour", e.target.value)}
        >
          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((hour) => (
            <option key={hour} value={hour}>{hour}</option>
          ))}
        </select>

        <span className="quick-time-colon">:</span>

        <select
          className="quick-time-minute"
          aria-label="Minute"
          value={parts.minute}
          onChange={(e) => setPart("minute", e.target.value)}
        >
          {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((minute) => (
            <option key={minute} value={minute}>{minute}</option>
          ))}
        </select>

        <select
          className="quick-time-period"
          aria-label="AM or PM"
          value={parts.period}
          onChange={(e) => setPart("period", e.target.value)}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

function PlannerMonthCalendar({ plannerDate, setPlannerDate, tasks }: { plannerDate: string; setPlannerDate: (value: string) => void; tasks: Task[] }) {
  const [year, month] = plannerDate.slice(0, 7).split("-").map(Number);
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthLabel = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => index < firstWeekday ? null : `${year}-${String(month).padStart(2, "0")}-${String(index - firstWeekday + 1).padStart(2, "0")}`);
  const taskDots = (date: string) => {
    const map: Record<string, string> = {
      "category-purple": "purple",
      "category-green": "green",
      "category-orange": "orange",
      "category-pink": "pink",
      "category-blue": "blue",
    };
    const tones = tasks.filter((task) => task.due_date === date).map((task) => map[getCategoryClass(task.category)] || "yellow");
    return Array.from(new Set(tones)).slice(0, 3);
  };
  const moveMonth = (delta: number) => {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1, 12));
    const nextYear = next.getUTCFullYear();
    const nextMonth = next.getUTCMonth() + 1;
    const currentDay = Math.min(Number(plannerDate.slice(-2)), new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate());
    setPlannerDate(`${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`);
  };
  return (
    <section className="planner-month-card panel" aria-label="Monthly calendar">
      <div className="planner-month-head">
        <div className="planner-month-title"><CalendarDays size={19} /><strong>{monthLabel}</strong></div>
        <div className="planner-month-nav"><button className="icon-button" type="button" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button><button className="icon-button" type="button" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight size={16} /></button></div>
      </div>
      <div className="planner-month-weekdays">{["MON","TUE","WED","THU","FRI","SAT","SUN"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="planner-month-grid">
        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} className="planner-month-cell empty" />;
          const isToday = date === todayString();
          const isSelected = date === plannerDate;
          return (
            <button key={date} type="button" className={`planner-month-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`} onClick={() => setPlannerDate(date)} aria-label={`Select ${date}`}>
              <strong>{Number(date.slice(-2))}</strong>
              <span className="planner-month-dots">{taskDots(date).map((tone) => <i key={tone} className={tone} />)}</span>
              {isToday && <em>Today</em>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PlannerPage({
  tasks,
  plannerDate,
  setPlannerDate,
  shiftDate,
  newTask,
  newTime,
  newCategory,
  newPriority,
  newDuration,
  setNewTask,
  setNewTime,
  setNewCategory,
  setNewPriority,
  setNewDuration,
  addTask,
  toggleTask,
  deleteTask,
  updateTaskTime,
  reminders,
  addReminder,
  toggleReminder,
  deleteReminder,
  newReminderTitle,
  newReminderAt,
  setNewReminderTitle,
  setNewReminderAt,
  requestReminderNotifications,
}: {
  tasks: Task[];
  plannerDate: string;
  setPlannerDate: (value: string) => void;
  shiftDate: (date: string, days: number) => string;
  newTask: string;
  newTime: string;
  newCategory: string;
  newPriority: string;
  newDuration: string;
  setNewTask: (value: string) => void;
  setNewTime: (value: string) => void;
  setNewCategory: (value: string) => void;
  setNewPriority: (value: string) => void;
  setNewDuration: (value: string) => void;
  addTask: (e: React.FormEvent) => void;
  toggleTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  updateTaskTime: (task: Task, time: string) => void;
  reminders: Reminder[];
  addReminder: (e: React.FormEvent) => void;
  toggleReminder: (reminder: Reminder) => void;
  deleteReminder: (id: string) => void;
  newReminderTitle: string;
  newReminderAt: string;
  setNewReminderTitle: (value: string) => void;
  setNewReminderAt: (value: string) => void;
  requestReminderNotifications: () => Promise<boolean>;
}) {
  const completed = tasks.filter((task) => task.completed).length;
  const percentage = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const highPriority = tasks.filter((task) => !task.completed && task.priority === "High").length;
  const totalMinutes = tasks.reduce((sum, task) => sum + (Number(task.duration) || 0), 0);
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<string | null>(null);
  const [focusDuration, setFocusDuration] = useState(25);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  useEffect(() => {
    if (!focusRunning) return;
    const timer = window.setInterval(() => {
      setFocusSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setFocusRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focusRunning]);

  const timelineHours = Array.from({ length: 24 }, (_, index) => index);

  function dropOnHour(hour: number) {
    if (!draggingId) return;
    const task = tasks.find((item) => item.id === draggingId);
    if (!task) return;
    updateTaskTime(task, `${String(hour).padStart(2, "0")}:00`);
    setDraggingId(null);
    setDragOverHour(null);
  }

  function setFocusLength(minutes: number) {
    const next = Math.min(180, Math.max(1, Math.round(minutes) || 1));
    setFocusDuration(next);
    setFocusSeconds(next * 60);
    setFocusRunning(false);
  }

  function resetFocus() {
    setFocusRunning(false);
    setFocusSeconds(focusDuration * 60);
  }

  const focusMinutes = String(Math.floor(focusSeconds / 60)).padStart(2, "0");
  const focusRemainSeconds = String(focusSeconds % 60).padStart(2, "0");


  return (
    <section className="page-section planner-page">
      <div className="planner-hero">
        <div>
          <h2>Planner</h2>
          <div className="planner-switcher">
            <button onClick={() => setPlannerDate(shiftDate(plannerDate, -1))}>Yesterday</button>
            <button className="active">Today</button>
            <button onClick={() => setPlannerDate(shiftDate(plannerDate, 1))}>Tomorrow</button>
          </div>
          <div className="planner-month-control">
            <CalendarDays size={18} />
            <strong>{new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${plannerDate}T12:00:00Z`))}</strong>
            <button onClick={() => { const d = new Date(`${plannerDate}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1); setPlannerDate(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,"0")}-01`); }} aria-label="Previous month"><ChevronLeft size={17} /></button>
            <button onClick={() => { const d = new Date(`${plannerDate}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); setPlannerDate(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,"0")}-01`); }} aria-label="Next month"><ChevronRight size={17} /></button>
          </div>
        </div>
      </div>

      <div className="planner-workspace">
        <div className="planner-timeline">
          {timelineHours.map((hour) => {
            const hourLabel = `${String(hour).padStart(2, "0")}:00`;
            const hourTasks = sortedTasks.filter((task) => task.time?.slice(0, 2) === String(hour).padStart(2, "0"));
            return (
              <div
                key={hour}
                className={dragOverHour === hourLabel ? "timeline-row drag-over" : "timeline-row"}
                onDragOver={(e) => { e.preventDefault(); setDragOverHour(hourLabel); }}
                onDragLeave={() => setDragOverHour(null)}
                onDrop={() => dropOnHour(hour)}
              >
                <div className="timeline-label">{formatTaskTime(hourLabel)}</div>
                <div className="timeline-rule" />
                <div className="timeline-slot">
                  {hourTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`planner-color-task ${task.completed ? "completed" : ""} ${getCategoryClass(task.category)}`}
                      draggable
                      onDragStart={() => setDraggingId(task.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverHour(null); }}
                    >
                      <div className="planner-color-task-main">
                        <div className="planner-task-meta">{formatTaskTime(task.time)} – {formatTaskTime(task.time ? `${String((Number(task.time.slice(0,2)) + Math.max(1, Math.round((Number(task.duration) || 30)/60))) % 24).padStart(2,"0")}:${task.time.slice(3)}` : null)}</div>
                        <strong><span className="planner-task-emoji" aria-hidden="true">{getTaskIcon(task)}</span>{task.title}</strong>
                      </div>
                      <div className="planner-color-task-tags">
                        <span>{task.category || "Personal"}</span>
                        <span>{task.priority || "Medium"}</span>
                        <b>{task.duration || 30} min</b>
                        <button className="task-delete-mini" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} aria-label={`Delete ${task.title}`}><Trash2 size={14} /></button>
                      </div>
                      <button className="planner-complete-mini" onClick={(e) => { e.stopPropagation(); toggleTask(task); }} aria-label={task.completed ? "Mark incomplete" : "Mark complete"}>{task.completed ? <Check size={13} /> : ""}</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <aside className="planner-sidebar">
          <PlannerMonthCalendar plannerDate={plannerDate} setPlannerDate={setPlannerDate} tasks={tasks} />
          <section className="planner-side-section">
            <div className="side-title-row"><h3>Quick Add</h3><Plus size={18} /></div>
            <form className="quick-add-card" onSubmit={addTask}>
              <input className="quick-add-title-input" placeholder="What needs to be done?" value={newTask} onChange={(e) => setNewTask(e.target.value)} />
              <QuickTimePicker value={newTime} onChange={setNewTime} />
              <div className="quick-add-options">
                <label><span>Category</span><select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}><option>Work</option><option>Personal</option><option>Study</option><option>Health</option><option>Other</option></select></label>
                <label><span>Priority</span><select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}><option>High</option><option>Medium</option><option>Low</option></select></label>
                <label className="quick-add-duration"><span>Duration</span><select value={newDuration} onChange={(e) => setNewDuration(e.target.value)}><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option></select></label>
              </div>
              <button className="quick-add-button" type="submit">Add task <Plus size={15} /></button>
            </form>
          </section>

          <section className="planner-side-section focus-side-card">
            <div className="side-title-row"><h3>Focus</h3><span>{focusRunning ? "In focus" : "Ready"}</span></div>
            <div className="focus-clock-panel">
              <div className="focus-clock" style={{ ["--focus-angle" as string]: `${((focusDuration * 60 - focusSeconds) / Math.max(1, focusDuration * 60)) * 360}deg` }}>
                <div className="focus-clock-ticks">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 30}deg)` }} />)}</div>
                <div className="focus-clock-hand" />
                <div className="focus-clock-center" />
                <div className="focus-clock-time">{focusMinutes}:{focusRemainSeconds}</div>
              </div>
            </div>
            <div className="focus-duration-editor">
              <div className="focus-duration-head"><span>Duration</span><strong>{focusDuration} min</strong></div>
              <div className="focus-duration-control">
                <button type="button" onClick={() => setFocusLength(focusDuration - 5)} aria-label="Decrease focus duration">−</button>
                <input type="number" min="1" max="180" value={focusDuration} onChange={(e) => setFocusLength(Number(e.target.value))} aria-label="Focus duration in minutes" />
                <button type="button" onClick={() => setFocusLength(focusDuration + 5)} aria-label="Increase focus duration">+</button>
              </div>
            </div>
            <div className="focus-presets">
              {[15,25,45,60,90].map((minutes) => <button key={minutes} type="button" className={focusDuration === minutes ? "active" : ""} onClick={() => setFocusLength(minutes)}>{minutes} min</button>)}
            </div>
            <button className="focus-start-button" onClick={() => { if (focusSeconds === 0) setFocusSeconds(focusDuration * 60); setFocusRunning((value) => !value); }}>
              {focusRunning ? "Pause Focus" : "Start Focus"}
            </button>
            <div className="focus-side-actions"><button onClick={resetFocus}>Reset</button><span>1–180 min</span></div>
          </section>

          <section className="planner-side-section reminder-side-section">
            <div className="side-title-row"><h3>Reminders</h3><Bell size={17} /></div>
            <button className="soft-button reminder-notify-button" type="button" onClick={() => { void requestReminderNotifications(); }}>Enable notifications</button>
            <form className="planner-reminder-form" onSubmit={addReminder}>
              <input className="reminder-title-input" value={newReminderTitle} onChange={(e) => setNewReminderTitle(e.target.value)} placeholder="Reminder title" />
              <div className="reminder-date-time-grid">
                <label><span>Date</span><input type="date" value={newReminderAt.slice(0, 10)} onChange={(e) => { const nextDate = e.target.value; const time = newReminderAt.slice(11, 16) || "09:00"; setNewReminderAt(`${nextDate}T${time}`); }} /></label>
                <label><span>Time</span><input type="time" value={newReminderAt.slice(11, 16)} onChange={(e) => { const date = newReminderAt.slice(0, 10) || todayString(); setNewReminderAt(`${date}T${e.target.value}`); }} /></label>
              </div>
              <button className="primary-button" type="submit"><Plus size={14} /> Add reminder</button>
            </form>
            <div className="planner-reminder-list">
              {reminders.map((reminder, index) => (
                <div key={reminder.id} className={`planner-reminder-row ${ACCENT_CLASSES[index % ACCENT_CLASSES.length]} ${reminder.completed ? "completed" : ""}`}>
                  <button onClick={() => toggleReminder(reminder)} className="unscheduled-check">{reminder.completed ? <Check size={11} /> : ""}</button>
                  <div><strong>{reminder.title}</strong><small>{reminderLabel(reminder)}</small></div>
                  <button className="task-delete-mini" onClick={() => deleteReminder(reminder.id)} aria-label={`Delete ${reminder.title}`}><Trash2 size={13} /></button>
                </div>
              ))}
              {!reminders.length && <p className="side-empty">No reminders yet.</p>}
            </div>
          </section>
        </aside>
      </div>

      <div className="planner-foot-summary">
        <span><strong>{tasks.length}</strong> tasks</span>
        <span><strong>{completed}</strong> completed</span>
        <span><strong>{highPriority}</strong> high priority</span>
        <span><strong>{totalMinutes} min</strong> planned</span>
        <span className="planner-progress"><i style={{ width: `${percentage}%` }} /></span>
      </div>
    </section>
  );
}


/* =========================
   HABITS
========================= */

function HabitsPage({
  habits,
  habitLogs,
  isHabitComplete,
  toggleHabit,
  deleteHabit,
  newHabit,
  newHabitIcon,
  setNewHabit,
  setNewHabitIcon,
  addHabit,
}: {
  habits: Habit[];
  habitLogs: HabitLog[];
  isHabitComplete: (id: string, date?: string) => boolean;
  toggleHabit: (habit: Habit) => void;
  deleteHabit: (id: string) => void;
  newHabit: string;
  newHabitIcon: string;
  setNewHabit: (value: string) => void;
  setNewHabitIcon: (value: string) => void;
  addHabit: (e: React.FormEvent) => void;
}) {
  const today = todayString();
  const weekDays = Array.from({ length: 7 }, (_, index) => shiftDateValue(today, -(6 - index)));
  const weekLabel = (date: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "narrow" }).format(new Date(`${date}T12:00:00Z`));

  const dayScore = (date: string) => {
    if (!habits.length) return 0;
    return Math.round((habits.filter((habit) => isHabitComplete(habit.id, date)).length / habits.length) * 100);
  };

  return (
    <section className="page-section habits-page">
      <div className="section-hero habits-hero">
        <div>
          <span className="section-tag">BUILD YOUR RHYTHM</span>
          <h2>Beautiful weekly overview</h2>
          <p>Keep your habits visible, colorful, and easy to check in.</p>
        </div>
        <div className="habit-week-overview">
          {weekDays.map((day) => (
            <div key={day} className="overview-day">
              <span>{weekLabel(day)}</span>
              <div className="overview-ring" style={{ ["--ring-progress" as string]: `${dayScore(day) * 3.6}deg` }}>
                <i />
                <strong>{dayScore(day)}%</strong>
              </div>
              {day === today && <em>Today</em>}
            </div>
          ))}
        </div>
      </div>

      <div className="habits-layout">
        <div className="habit-card-grid">
          {habits.length === 0 ? (
            <div className="panel habit-empty-panel"><EmptyState icon="✦" title="Your rhythm starts here" body="Add one habit that would make tomorrow a little easier." /></div>
          ) : habits.map((habit, index) => {
            const complete = isHabitComplete(habit.id);
            const streak = getHabitStreak(habit.id, habitLogs);
            const accent = ACCENT_CLASSES[index % ACCENT_CLASSES.length];
            return (
              <article key={habit.id} className={`habit-card ${accent} ${complete ? "completed" : ""}`}>
                <div className="habit-card-header">
                  <div className={`habit-large-icon ${accent}`}>{complete ? <Check size={18} /> : (habit.icon || "🔥")}</div>
                  <div><strong>{habit.name}</strong><span>{habit.target || "Daily habit"}</span></div>
                  <button className="delete-button" onClick={() => deleteHabit(habit.id)} aria-label={`Delete ${habit.name}`}><Trash2 size={14} /></button>
                </div>
                <div className="habit-target-row"><span>{habit.target || "Target data"}</span><strong>7 day check in</strong></div>
                <div className="habit-week-dots">
                  {weekDays.map((day) => <span key={day} className={isHabitComplete(habit.id, day) ? "completed" : ""}>{isHabitComplete(habit.id, day) ? <Check size={9} /> : ""}</span>)}
                </div>
                <div className="habit-week-labels">{weekDays.map((day) => <span key={day}>{weekLabel(day)}</span>)}</div>
                <div className="habit-card-footer">
                  <span><Flame size={12} /> Current streak: {streak}</span>
                  <span>{weekDays.filter((day) => isHabitComplete(habit.id, day)).length}/7 this week</span>
                  <button className={complete ? "habit-action done" : "habit-action"} onClick={() => toggleHabit(habit)}>{complete ? "Done today" : "Check in"}</button>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="habit-summary-card panel">
          <div className="panel-header"><div><span className="section-tag">YOUR WEEK</span><h2>Consistency</h2></div></div>
          <div className="habit-summary-ring" style={{ ["--summary-progress" as string]: `${dayScore(today) * 3.6}deg` }}>
            <i /><strong>{habits.length ? `${habits.filter((habit) => isHabitComplete(habit.id)).length}/${habits.length}` : "0/0"}</strong>
          </div>
          <div className="habit-summary-stat"><span>Best streak</span><strong>{Math.max(0, ...habits.map((habit) => getHabitStreak(habit.id, habitLogs)))}</strong></div>
          <div className="habit-summary-stat"><span>Longest</span><strong>{Math.max(0, ...habits.map((habit) => getHabitStreak(habit.id, habitLogs)))}</strong></div>
          <div className="habit-summary-stat"><span>This week</span><strong>{habits.reduce((sum, habit) => sum + weekDays.filter((day) => isHabitComplete(habit.id, day)).length, 0)}/{habits.length * 7}</strong></div>
          <div className="habit-add-box">
            <span className="section-tag">ADD HABIT</span>
            <form className="habit-add-form" onSubmit={addHabit}>
              <input placeholder="New habit" value={newHabit} onChange={(e) => setNewHabit(e.target.value)} />
              <div className="habit-add-row">
                <select value={newHabitIcon} onChange={(e) => setNewHabitIcon(e.target.value)}>
                  <option>🔥</option><option>💪</option><option>📚</option><option>🧘</option><option>💧</option><option>🏃</option><option>💻</option><option>🎯</option><option>🎵</option><option>🌿</option><option>✍️</option><option>☀️</option>
                </select>
                <button className="primary-button" type="submit">Add <Plus size={14} /></button>
              </div>
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
}

/* =========================
   GOALS
========================= */

function GoalsPage({
  goals,
  newGoal,
  newGoalDescription,
  newGoalDate,
  setNewGoal,
  setNewGoalDescription,
  setNewGoalDate,
  addGoal,
  toggleGoal,
  deleteGoal,
}: {
  goals: Goal[];
  newGoal: string;
  newGoalDescription: string;
  newGoalDate: string;
  setNewGoal: (value: string) => void;
  setNewGoalDescription: (value: string) => void;
  setNewGoalDate: (value: string) => void;
  addGoal: (e: React.FormEvent) => void;
  toggleGoal: (goal: Goal) => void;
  deleteGoal: (id: string) => void;
}) {
  const [term, setTerm] = useState<"short" | "long">("short");
  const [goalProgress, setGoalProgress] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem("dayflow-goal-progress") || "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem("dayflow-goal-progress", JSON.stringify(goalProgress));
  }, [goalProgress]);
  const getProgress = (goal: Goal) => goal.completed ? 100 : Math.max(0, Math.min(100, Number(goalProgress[goal.id] ?? 0)));
  const setProgress = (id: string, value: number) => {
    const next = Math.max(0, Math.min(100, Math.round(value)));
    setGoalProgress((current) => ({ ...current, [id]: next }));
  };
  const filtered = goals.filter((goal) => {
    if (term === "short") return !goal.target_date || goal.target_date <= shiftDateValue(todayString(), 120);
    return !!goal.target_date && goal.target_date > shiftDateValue(todayString(), 120);
  });
  const completed = filtered.filter((goal) => goal.completed);
  
  const completion = goals.length ? Math.round(goals.reduce((sum, goal) => sum + getProgress(goal), 0) / goals.length) : 0;

  return (
    <section className="page-section goals-page">
      <div className="goals-topline">
        <div className="goal-tabs">
          <button className={term === "short" ? "active" : ""} onClick={() => setTerm("short")}>Short Term</button>
          <button className={term === "long" ? "active" : ""} onClick={() => setTerm("long")}>Long Term</button>
        </div>
        <button className="primary-button" onClick={() => document.getElementById("goal-title-input")?.focus()}><Plus size={14} /> New Goal</button>
      </div>

      <div className="goals-grid">
        <div className="goal-cards-column">
          {filtered.length === 0 ? (
            <div className="panel"><EmptyState icon="◎" title="Nothing here yet" body="Create a goal and keep one meaningful outcome visible." /></div>
          ) : filtered.map((goal, index) => (
            <article key={goal.id} className={`goal-card ${ACCENT_CLASSES[index % ACCENT_CLASSES.length]} ${goal.completed ? "completed" : ""}`}>
              <div className="goal-card-header">
                <div className={`goal-icon ${ACCENT_CLASSES[index % ACCENT_CLASSES.length]}`}><Target size={17} /></div>
                <div><strong>{goal.title}</strong><span>{goal.description || "Keep one next step visible."}</span></div>
                <button className="delete-button" onClick={() => deleteGoal(goal.id)} aria-label={`Delete ${goal.title}`}><Trash2 size={14} /></button>
              </div>
              <div className="goal-meta-line"><span>Target date</span><strong>{goal.target_date ? formatShortDate(goal.target_date) : "No target date"}</strong></div>
              <div className="goal-progress-line">
                <div className="goal-progress-track" title="Drag to change goal progress">
                  <i style={{ width: `${getProgress(goal)}%` }} />
                  <input
                    className="goal-progress-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={getProgress(goal)}
                    onChange={(e) => setProgress(goal.id, Number(e.target.value))}
                    aria-label={`Progress for ${goal.title}`}
                  />
                </div>
                <strong>{getProgress(goal)}%</strong>
              </div>
              <div className="goal-manual-progress">
                <span>Manual progress</span>
                <div className="goal-progress-stepper">
                  <button type="button" onClick={() => setProgress(goal.id, getProgress(goal) - 5)} aria-label="Decrease goal progress">−</button>
                  <input type="number" min="0" max="100" value={getProgress(goal)} onChange={(e) => setProgress(goal.id, Number(e.target.value))} aria-label={`Set progress for ${goal.title}`} />
                  <button type="button" onClick={() => setProgress(goal.id, getProgress(goal) + 5)} aria-label="Increase goal progress">+</button>
                </div>
              </div>
              <div className="goal-status">
                <button className={goal.completed ? "row-check completed" : "row-check"} onClick={() => toggleGoal(goal)}>{goal.completed ? <Check size={13} /> : ""}</button>
                <span>{goal.completed ? "Completed goal" : "Active goal"}</span>
              </div>
            </article>
          ))}
        </div>

        <aside className="goal-progress-sidebar panel">
          <div className="panel-header"><div><span className="section-tag">GOAL PROGRESS</span><h2>Direction</h2></div></div>
          <GoalCircle value={completion} tone="green" />
          <GoalCircle value={goals.filter((goal) => !goal.completed).length} label="active" tone="purple" count />
          <GoalCircle value={completed.length} label="finished" tone="orange" count />
        </aside>
      </div>

      <div className="panel goal-create-panel">
        <div className="panel-header"><div><span className="section-tag">ADD A GOAL</span><h2>Make the next outcome visible.</h2></div><Plus size={15} /></div>
        <form className="goal-add-form" onSubmit={addGoal}>
          <input id="goal-title-input" placeholder="Goal name" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} required />
          <input placeholder="Short description" value={newGoalDescription} onChange={(e) => setNewGoalDescription(e.target.value)} />
          <label className="goal-date-wrap">
            <CalendarDays size={18} />
            <input type="date" value={newGoalDate} onChange={(e) => setNewGoalDate(e.target.value)} aria-label="Goal target date" />
          </label>
          <button className="primary-button" type="submit">Save goal <Check size={14} /></button>
        </form>
      </div>
    </section>
  );
}

function GoalCircle({ value, tone, label, count = false }: { value: number; tone: "green" | "purple" | "orange"; label?: string; count?: boolean }) {
  const percent = count ? 100 : Math.max(0, Math.min(100, value));
  return (
    <div className={`goal-circle-wrap ${tone}`}>
      <div className="goal-circle" style={{ ["--circle-progress" as string]: `${percent * 3.6}deg` }}>
        <i />
        <strong>{count ? value : `${value}%`}</strong>
      </div>
      <span>{label || "completed"}</span>
    </div>
  );
}

/* =========================
   JOURNAL
========================= */

function JournalPage({
  journalText,
  setJournalText,
  saveJournal,
  savingJournal,
  journalEntries,
}: {
  journalText: string;
  setJournalText: (value: string) => void;
  saveJournal: () => void;
  savingJournal: boolean;
  journalEntries: JournalEntry[];
}) {
  const prettyToday = new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(getAppNow());

  const prompts = [
    { title: "What went well?", tone: "accent-green" },
    { title: "What challenged you?", tone: "accent-pink" },
    { title: "What do I want tomorrow?", tone: "accent-orange" },
  ];

  return (
    <section className="page-section journal-page">
      <div className="journal-title-row">
        <div>
          <span className="section-tag">TODAY'S REFLECTION</span>
          <h2>{prettyToday}</h2>
          <h3>What made today meaningful?</h3>
        </div>
        <BookOpen size={28} />
      </div>

      <div className="journal-main-grid">
        <div className="panel journal-editor-panel">
          <div className="journal-editor-top">
            <div><span className="section-tag">WRITE</span><h2>Beautiful writing space</h2></div>
            <span className="journal-count">{journalText.trim().length}</span>
          </div>
          <textarea className="journal-textarea" placeholder="Write anything on your mind..." value={journalText} onChange={(e) => setJournalText(e.target.value)} rows={12} />
          <div className="journal-actions">
            <span>{journalText.trim().length} characters</span>
            <button className="primary-button" onClick={saveJournal} disabled={savingJournal}>{savingJournal ? "Saving..." : "Save Entry"} <ArrowRight size={14} /></button>
          </div>
        </div>

        <aside className="journal-recent panel">
          <div className="panel-header"><div><span className="section-tag">RECENT ENTRIES</span><h2>Small traces</h2></div></div>
          <div className="recent-entry-list">
            {journalEntries.length === 0 ? (
              <div className="side-empty">Your saved reflections will appear here.</div>
            ) : journalEntries.map((entry, index) => (
              <article key={entry.id} className={`recent-entry ${ACCENT_CLASSES[index % ACCENT_CLASSES.length]}`}>
                <strong>{formatShortDate(entry.entry_date)}</strong>
                <p>{entry.content || "No text saved."}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>

      <div className="journal-prompt-grid">
        {prompts.map((prompt, index) => (
          <div key={prompt.title} className={`journal-prompt ${prompt.tone}`}>
            <span>0{index + 1}</span>
            <strong>{prompt.title}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================
   INSIGHTS
========================= */

function AnalyticsPage({ tasks, habits, completedTasks, completedHabits, goals, habitLogs }: { tasks: Task[]; habits: Habit[]; completedTasks: number; completedHabits: number; goals: Goal[]; habitLogs: HabitLog[] }) {
  const taskRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const habitRate = habits.length ? Math.round((completedHabits / habits.length) * 100) : 0;
  const plannedMinutes = tasks.reduce((sum, task) => sum + (Number(task.duration) || 0), 0);
  const bestHabitStreak = habits.reduce((best, habit) => Math.max(best, getHabitStreak(habit.id, habitLogs)), 0);
  const activeGoals = goals.filter((goal) => !goal.completed).length;
  const completedGoals = goals.filter((goal) => goal.completed).length;

  const weekdayBars = [
    { day: "Mon", value: Math.max(18, taskRate - 12), tone: "purple" },
    { day: "Tue", value: Math.max(28, habitRate - 4), tone: "green" },
    { day: "Wed", value: Math.min(96, Math.max(42, taskRate + 18)), tone: "coral" },
    { day: "Thu", value: Math.max(34, taskRate + 7), tone: "orange" },
    { day: "Fri", value: Math.max(24, habitRate - 16), tone: "pink" },
    { day: "Sat", value: Math.min(100, Math.max(48, taskRate + 28)), tone: "blue" },
    { day: "Sun", value: Math.max(22, habitRate - 8), tone: "yellow" },
  ];

  const rhythm = [
    { label: "Morning productivity", value: Math.min(96, Math.max(24, taskRate + 8)), tone: "purple", dots: "••••" },
    { label: "Afternoon productivity", value: Math.min(96, Math.max(30, habitRate + 16)), tone: "coral", dots: "••••" },
    { label: "Evening productivity", value: Math.min(96, Math.max(22, taskRate - 6)), tone: "blue", dots: "••••" },
  ];

  return (
    <section className="page-section insights-page">
      <div className="page-heading insights-heading">
        <div><span className="section-tag">SEE HOW YOUR DAYS ARE MOVING</span><h2>Insights</h2><p>Simple signals, clear patterns, and useful highlights from your DayFlow.</p></div>
      </div>

      <div className="insight-summary-row">
        <div className="insight-summary-card accent-purple"><span>Tasks completed</span><strong>{completedTasks}</strong><small>{taskRate}% of today's tasks</small></div>
        <div className="insight-summary-card accent-green"><span>Habits completed</span><strong>{completedHabits}</strong><small>{habitRate}% checked in today</small></div>
        <div className="insight-summary-card accent-pink"><span>Current streak</span><strong>→ {bestHabitStreak}</strong><small>day habit streak</small></div>
      </div>

      <div className="insights-main-grid">
        <div className="panel weekly-productivity-card">
          <div className="panel-header">
            <div><span className="section-tag">CONSISTENCY</span><h2>Beautiful weekly productivity visualization</h2></div>
            <span className="insight-week-label">Mon → Sun</span>
          </div>
          <div className="weekly-chart">
            {weekdayBars.map((bar) => (
              <div key={bar.day} className="chart-column">
                <div className={`chart-bar ${bar.tone}`} style={{ height: `${bar.value}%` }}><span>{bar.value}</span></div>
                <strong>{bar.day}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel consistency-card">
          <div className="panel-header"><div><span className="section-tag">CONSISTENCY</span><h2>Your consistency</h2></div><Sparkles size={20} /></div>
          <div className="consistency-visual">
            <div className="consistency-ring ring-purple"><span /></div>
            <div className="consistency-ring ring-orange"><span /></div>
            <div className="consistency-ring ring-yellow"><span /></div>
            <strong>{Math.max(taskRate, habitRate)}%</strong>
          </div>
          <p>Small repeated actions create a rhythm you can actually keep.</p>
        </div>
      </div>

      <div className="insights-lower-grid">
        <div className="panel rhythm-card">
          <div className="panel-header"><div><span className="section-tag">RHYTHM</span><h2>Your rhythm</h2></div><Sparkles size={18} /></div>
          <div className="rhythm-list">
            {rhythm.map((item) => (
              <div key={item.label} className="rhythm-row">
                <div className="rhythm-title"><strong>{item.label}</strong><span className={item.tone}>{item.dots}</span></div>
                <div className="rhythm-track"><i className={item.tone} style={{ width: `${item.value}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel highlights-card">
          <div className="panel-header"><div><span className="section-tag">HIGHLIGHTS</span><h2>Highlights</h2></div><Sparkles size={18} /></div>
          <div className="highlight-grid">
            <div className="highlight-tile purple"><strong>Best day</strong><span>Wednesday</span><Sparkles size={16} /></div>
            <div className="highlight-tile green"><strong>{completedTasks} tasks</strong><span>completed today</span><Sparkles size={16} /></div>
            <div className="highlight-tile pink"><strong>{bestHabitStreak}-day habit streak</strong><span>keep it going gently</span><Flame size={16} /></div>
          </div>
          <div className="insight-context-row"><span>{activeGoals} active goals</span><span>{completedGoals} finished goals</span><span>{plannedMinutes} min planned</span></div>
        </div>
      </div>
    </section>
  );
}

/* =========================
   SETTINGS
========================= */

function SettingsPage({ user, logout, dark, setDark }: { user: User; logout: () => void; dark: boolean; setDark: (value: boolean) => void }) {
  return (
    <section className="page-section">
      <div className="page-heading"><div><span className="section-tag">YOUR ACCOUNT</span><h2>Settings</h2><p>Just the essentials. Your productivity space should stay out of the way.</p></div></div>

      <div className="settings-layout">
        <div className="panel account-card">
          <div className="settings-avatar">{(user.email?.[0] || "U").toUpperCase()}</div>
          <div className="account-copy"><span>Signed in as</span><strong>{user.email}</strong><p>Your DayFlow data is tied to this account.</p></div>
          <button className="logout-large" onClick={logout}><LogOut size={15} /> Sign out</button>
        </div>

        <div className="panel settings-options-card">
          <div className="panel-header"><div><span className="section-tag">APPEARANCE</span><h2>Make it yours.</h2></div></div>
          <div className="setting-option-row"><div><strong>Theme</strong><span>Use a lighter or deeper canvas for your day.</span></div><button className="theme-choice" onClick={() => setDark(!dark)}><span>{dark ? <Moon size={14} /> : <Sun size={14} />}</span>{dark ? "Dark" : "Light"}</button></div>
          <div className="settings-note"><Sparkles size={15} /><span>DayFlow keeps glass subtle so your tasks and thoughts stay in focus.</span></div>
        </div>
      </div>
    </section>
  );
}
