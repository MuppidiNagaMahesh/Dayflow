# DayFlow — Complete Study OS UI

This version is a single consolidated modification of the existing DayFlow project.

## Included changes
- Premium liquid-glass Spotlight-style top navigation; legacy sidebar hidden.
- Login study environment with animated CSS study companion and LiquidMetal sign-in button.
- Login email/password text remains clearly visible on focus and browser autofill.
- Dashboard guidance moved to the top: daily insight + quote/note cards.
- Motivation/remember content kept intentional rather than dumped at the bottom.
- Planner redesigned as a visual study timetable with compact calendar and reliable native drag/drop scheduling.
- Dragging a task to an hour updates its saved time; dragging to Unscheduled clears its time.
- Habits redesigned with today check-ins, current streaks and a 7-day consistency map.
- Goals redesigned with active outcomes, due-state labels and completed-goal archive.
- Journal keeps all saved days visible and selectable.
- Insights now uses real task/habit/goal data and a 7-day activity view.
- Duplicate email display removed from the main top-right area.
- Responsive mobile navigation and layouts retained.

## Run
```powershell
npm install
npm run dev
```

Keep your `.env.local` with the existing browser-safe Supabase URL and publishable/anon key.
