# REGULR — How Everything Works (Plain English)

> A feature-by-feature, button-by-button walkthrough of what happens behind the scenes when the user interacts with the app. Written for product, design, and non-technical readers.

---

## Table of Contents

1. [The Big Picture — What This App Does](#1-the-big-picture--what-this-app-does)
2. [Where Your Data Lives](#2-where-your-data-lives)
3. [The Brain — How REGULR Knows What To Suggest](#3-the-brain--how-regulr-knows-what-to-suggest)
4. [Onboarding — Getting Started](#4-onboarding--getting-started)
5. [The Dashboard — Your Daily Home](#5-the-dashboard--your-daily-home)
6. [The Plan Screen — Your Workout Roadmap](#6-the-plan-screen--your-workout-roadmap)
7. [The Diet Screen — Eating to Match Your Goal](#7-the-diet-screen--eating-to-match-your-goal)
8. [The Tips Screen — Daily Learning](#8-the-tips-screen--daily-learning)
9. [The Profile Screen — Who You Are](#9-the-profile-screen--who-you-are)
10. [Ask Coach — The Floating Chat Button](#10-ask-coach--the-floating-chat-button)
11. [The Weekly Review — REGULR's Self-Adjustment](#11-the-weekly-review--regulrs-self-adjustment)
12. [Plan Updates Banner — How REGULR Tells You What It Changed](#12-plan-updates-banner--how-regulr-tells-you-what-it-changed)
13. [The Memory — How REGULR Learns What You Like](#13-the-memory--how-regulr-learns-what-you-like)

---

## 1. The Big Picture — What This App Does

REGULR is a gym habit + intelligent coaching app. It does three things:

1. **Keeps you showing up** — streaks, XP, levels, badges, the 2-Day Rule
2. **Tells you what to do each day** — a structured training plan with sessions, exercises, sets, and reps
3. **Adapts to your real data** — weekly it looks at how hard you trained, whether you stalled, whether you missed sessions, and whether your weight is moving the right way, then it proposes specific tweaks to your plan and your calories

Every coaching tip, every suggested change, every answer from the chatbot is grounded in **The Muscle Ladder by Jeff Nippard** — a science-based hypertrophy book. The app doesn't invent advice; it surfaces what the book says applies to your situation right now.

---

## 2. Where Your Data Lives

Everything you do — your weight, your sessions, your XP, your check-ins, your meal plan — is saved on your **own device first** (in the browser's storage). If you sign in, a copy is also saved to **Supabase** (cloud) so you can recover it if you switch devices.

**Important behaviour:**
- The device is the source of truth while you're using the app.
- The cloud is a backup that fires silently in the background.
- If you sign in on a new device, the cloud wins — your device gets the cloud copy.
- Nothing the app sends to the AI is permanently stored on Anthropic's servers (the conversation history in Ask Coach lives only in memory while the chat panel is open).

---

## 3. The Brain — How REGULR Knows What To Suggest

Three things power every suggestion:

### a. The Book (Tier 1 + Tier 2)

The Muscle Ladder is split into two formats inside the app:

- **60 rules** — fixed conditions like "if your weekly chest sets exceed 22, you've passed MRV, so drop volume." These run instantly on your data with zero AI needed.
- **40 topic chunks** — short passages (200–400 words each) covering one topic each: volume landmarks, deload triggers, exercise selection, RIR, cutting protocol, etc. Whenever the AI needs to answer, the app looks up the 3–4 most relevant chunks and gives them to the AI as context.

### b. Your Signals

Every time the app needs to think, it first computes some numbers from your last 14 days of data:

- **avg_rir** — on average, how many reps did you leave in the tank? (Lower = harder effort)
- **stalled_weeks** — how long have you been stuck at the same weights?
- **adherence_pct** — what percentage of your scheduled sessions did you complete?
- **muscle_weekly_sets** — how many sets per muscle group are you actually doing?
- **weekly_weight_change_pct** — is your body weight trending up or down, and by how much?
- **rir_zero_consecutive_sessions** — how many sessions in a row did you fail your last set?

These numbers classify you into one of five **training states**:

| State | What it means |
|---|---|
| **Fresh** | Not enough data yet |
| **Progressing** | You're working hard and lifts are going up |
| **Stalled** | Same effort, same weights, nothing moving |
| **Under-recovering** | You're hitting failure too often or missing sessions |
| **Under-loading** | You're leaving too much in the tank |

### c. Your Memory

Every time you tap **Accept** or **Dismiss** on a coaching suggestion, REGULR remembers it (last 20 of each). Next time the AI talks to you, it sees these and avoids repeating rejected ideas + builds on accepted ones.

---

## 4. Onboarding — Getting Started

### Landing screen → "Get Started" button

Takes you to onboarding. If you've already onboarded, you skip straight to the Dashboard.

### PlanBuilder — choose how to start

You see three paths:

1. **"Build me a plan"** → guided questionnaire (goal, days/week, experience), then auto-generates a 4-week training plan
2. **"Import my plan"** → paste in an existing workout you already follow
3. **"Critique my plan"** → submit a plan to get an AI evaluation before you commit to it

### "Critique my plan" → the AI critique

Behind the scenes: your plan gets sent to Anthropic's Claude with relevant book chunks. The AI returns:

- A **score out of 100**
- A **verdict** (2–3 sentences)
- Up to **3 strengths** with book references
- Up to **4 issues** with severity tags
- Up to **5 proposed edits** (specific changes you can apply)

Every strength, issue, and edit cites a chapter of the book. The AI is forbidden from inventing science — if the book is silent, it says so.

### Profile setup

Before finishing, you set your weight, height, age, sex, goal, activity level, training experience, dietary preference, cuisine, and any **injuries**. The injury list (lower back, knee, shoulder, etc.) is the most important field for future suggestions — the AI will never recommend an exercise that aggravates a listed injury.

---

## 5. The Dashboard — Your Daily Home

This is where you land every day. It shows everything at a glance: your level, your streak, your session for today, your weight check-in, the coach's message, and any updates REGULR wants you to look at.

### What happens when the Dashboard loads

The moment you open the Dashboard, several things happen in the background:

1. **Reads your data** from your device's storage.
2. **Checks if you've missed sessions** (the "return state"). If you missed 2+ days, you'll see a return banner with a reduced workout suggestion.
3. **Picks a tip of the day** from the library and marks it seen.
4. **Picks a coach message** — if it's a normal day with a session ahead, the coach will say something like "Time to start your session — keep it tight today." If you're returning from missed days, the message is empathetic and pressure-free.
5. **Quietly runs the weekly review** (see Section 11) if it's a new week and you have enough sessions logged.

### The Level + XP bar

Pure visual feedback. Your total XP is read straight from storage; the bar fills based on how close you are to the next level. The "+XP" flash that appears after completing a session is a 2-second animation.

### The Consistency Track (dot grid)

20 dots representing the last 20 days:
- **Green dot** = you trained that day
- **Primary-color dot** = today
- **Muted red** = a scheduled day you missed
- **Grey** = a rest day or future day

### Weight check-in widget — "Log" button

You type your weight in kg and tap **Log**. Behind the scenes:

1. Your weight saves to your user profile (`body_weight_kg`).
2. A new entry appears in your weight history (`weight_log`).
3. The background sync sends it to Supabase if you're signed in.
4. The button shows a green "✓ Saved" for 2 seconds.

This single number matters more than people think: your weight history is what the weekly diet review uses to decide whether to bump or drop your calories.

### "Complete Session" button (on the SessionCard)

This is the most important button in the app. When you tap it:

1. **Streak math runs**: did you train today? Did you miss yesterday? The streak counter updates, and if you came back from a missed day, you get a comeback bonus XP.
2. **XP is awarded**: base XP + streak bonus + comeback bonus.
3. **Badge check runs**: did this session unlock any badges (10-day streak, 100 sessions, etc.)?
4. **Level-up check runs**: if your new XP crosses a threshold, a Level-Up modal appears.
5. **Session is marked complete** in your plan: the dot in your weekly grid turns green.
6. **Persona is re-evaluated**: REGULR has 5 personas (starter, follower, optimizer, struggler, self-directed) and adjusts which one fits you based on your behavior pattern.
7. **The coach sends a post-session message** via the AI: a one-or-two-sentence note tuned to your persona ("Solid work. Recovery starts now." / "8 sessions in. You're settling into the rhythm." etc.).
8. **Analytics tracks the event**.
9. **Confetti fires** if you hit a streak milestone (7, 14, 30, 60 days).

### Workout logger (inside the SessionCard)

When you log sets, reps, and weight for each exercise, the app does two big things:

1. **Calculates session calories** using a proper TDEE-based formula plus session volume — you'll see "Calories Burned: 412 kcal" appear below the session card.
2. **Sends your session data to the AI** for post-session analysis. The AI returns suggestions, plan adjustments, and diet adjustments — all grounded in the book and tailored to your data.

### Post-Session Insights card

This is what appears after the AI analyzes your session. Up to three suggestion cards show up, each with:

- A category (Exercise / Diet / Recovery)
- A one-line suggestion
- A book reference

Each card has **Accept** and **Dismiss**:

- **Accept** → REGULR remembers you liked this kind of suggestion, and it filters out the card.
- **Dismiss** → REGULR remembers you didn't like this, and won't propose it again. The card disappears.

### Plan Updates Banner (top of dashboard)

If REGULR's weekly review created any plan changes (or if a personalise-plan run added a swap), they show up as banner cards here. See Section 12.

### The Ask Coach floating button

Bottom-right corner of the Dashboard, always visible. See Section 10.

---

## 6. The Plan Screen — Your Workout Roadmap

Shows your active plan, week by week, session by session, exercise by exercise.

### Week tabs / session expand

Tapping a week expands it. Tapping a session shows the full exercise list with sets, reps, and a YouTube search link for each exercise (search query: `"Jeff Nippard {exercise} form"` — opens in a new tab).

### Edit pencil on a session

Tap to enter inline edit mode. You see the exercise list as editable rows. You can:
- **Add an exercise** — type to search a database of standard exercises, or just type a custom name
- **Edit set/rep schemes** — change "4x8-12" to "3x6-10" etc.
- **Remove an exercise** — tap the X

When you tap **Save**, the new exercise list is written back to your plan in storage. The change is visible immediately on the Dashboard's session card.

### The "✨ Personalise for me" button (top of plan)

This is REGULR's Persona C feature. You picked a pre-built Nippard plan; now REGULR asks: "Does this actually fit *your* body, *your* injuries, *your* experience?"

When you tap it:

1. REGULR gathers every unique exercise name in your plan.
2. It builds a request with your profile: sex, goal, weight, height, age, training experience, injuries, dietary prefs.
3. It sends this to the AI with the book context for "exercise substitution by injury and experience."
4. The AI returns up to **4 substitutions** (e.g., "Barbell Squat → Hack Squat because you have a knee issue, Ch. 6 — Exercise Selection") and a short notes paragraph.

You see a card for each substitution with two buttons:

**Apply**:
- The old exercise is replaced everywhere in your plan with the new one (3x8-12 by default).
- A "plan update" is logged so it shows on the Dashboard.
- REGULR remembers you accepted this kind of swap.

**Skip**:
- The substitution is dropped from the panel.
- REGULR remembers you skipped this kind of swap.

If you have no injuries and you're intermediate or advanced, the AI may return zero substitutions and just a short note confirming the plan suits you.

---

## 7. The Diet Screen — Eating to Match Your Goal

### Daily target card (top of screen)

The number you see (e.g., "2300 kcal") isn't picked by AI. It's computed deterministically:

1. **BMR** via Mifflin-St Jeor formula (your weight, height, age, sex)
2. **TDEE** = BMR × activity factor (sedentary, light, moderate, active)
3. **Adjusted for goal**:
   - Fat loss: −20% (deficit)
   - Build max: +10% (surplus)
   - Recomp: 0% (maintenance)

Macros are then calculated:
- **Protein**: ~2.0 g/kg on a cut, ~1.8 g/kg on a bulk
- **Fat**: at least 0.8 g/kg (hormonal floor)
- **Carbs**: whatever calories remain

The MacroBars below show today's consumption vs. target (filled when you log meals from your meal plan).

### "Generate meal plan →" button

Tap this and REGULR's AI builds a custom 7-day meal plan tailored to your macros, cuisine, dietary preference, and eating habits.

The plan is structured as 7 days × 3–4 meals each (breakfast, snack, lunch, dinner). Each meal includes:
- Meal name
- Ingredient list
- Calorie + macro breakdown

The plan is saved to your storage. The screen then shows day tabs (Mon–Sun) and you can flip between them.

### "Regenerate plan" button

Same as above, but discards the existing plan. Useful if you don't like the suggestions or want variety.

### Weekly check-in section — "Save check-in" button

You pick an adherence level (Off / 25% / 50% / 75% / 100%) and optionally enter your weight. Tap save.

Behind the scenes:
1. A new check-in entry is added (`{date, weight_kg, adherence_pct}`).
2. Your last adherence percentage is updated.
3. If you entered a weight, your body weight and weight history get updated.
4. If you're on a cut and adherence is ≥ 50%, your "consecutive cut weeks" counter ticks up by 1.

You need **at least 2 weekly check-ins** before the weekly review can run.

### "Run weekly review" button (Calorie adaptation section)

This is the diet equivalent of the training weekly review. Tap it and REGULR's AI looks at your trend over the last 6 weekly check-ins and recommends what to do with your calories.

The AI follows strict, book-derived rules:

| Your situation | Recommendation |
|---|---|
| Cutting, losing > 1% bw per week | **+150 kcal** — too fast, you'll lose muscle |
| Cutting, losing < 0.1% bw per week for 2+ weeks | **−200 kcal** — your TDEE adapted, time to nudge |
| Cutting for 12+ consecutive weeks | **Diet break** — go back to maintenance for a week |
| Bulking, gaining > 0.5% bw per week | **−200 kcal** — most of that gain is fat |
| Bulking, weight stalled 2+ weeks | **+150 kcal** |
| Recomp | **Keep calories stable**, push protein |
| Any goal + adherence < 50% for 2+ weeks | **Simplify**, don't change calories — fix consistency first |

You'll see a card with:
- The recommendation (e.g., "Decrease")
- The exact calorie delta (e.g., "−200 kcal → 2100")
- A 1–2 sentence reason
- A book reference

**Apply**:
- Your new target calories are saved.
- Your macros are recalculated to match the new calorie target.
- The adjustment is logged in your adaptations history.
- REGULR remembers you accepted this.
- The MacroBars at the top of the screen update immediately.

**Dismiss**:
- The card closes.
- REGULR remembers you rejected this.
- Nothing else changes.

---

## 8. The Tips Screen — Daily Learning

The Tips screen has two layers:

### The static tip library

A curated library of bite-sized tips organized by category (Technique, Recovery, Mindset, Progress). One is selected each day by `selectTip()` based on your persona and what you've seen before.

### The "Coach Insight — From The Muscle Ladder" section

This is the smart part. When the Tips screen loads, it does this:

1. Computes your training signals from your data.
2. Classifies your training state (e.g., "stalled" or "under-recovering").
3. Looks up book passages that match your state.
4. Picks one to show you based on today's date.

The tip you see is the same all day — refresh and it stays. Tomorrow it'll rotate to a different chunk from the same state-relevant pool.

**No AI is called here.** The book chunks are pre-loaded into the app; it's pure local matching. This makes the screen instant and free.

---

## 9. The Profile Screen — Who You Are

### Body Stats — "Save" button

Fields: weight, height, age, sex, goal, activity level, training experience, diet preference, cuisine, eating habits.

When you tap save, all fields write to your user profile. The change syncs to Supabase in the background if you're signed in.

### Injury chips

Eight toggleable chips: lower_back, knee, shoulder, elbow, wrist, hip, neck, ankle.

Tapping a chip toggles it on/off. **These are the most important fields in your profile** because they constrain every AI suggestion:

- **Personalise plan** will never recommend an exercise that aggravates your listed injuries.
- **Ask Coach** uses them as context when answering form/substitution questions.
- **Weekly review** treats them as a hard constraint.

### Theme toggle

Switches between light and dark mode. Saves to local storage. No backend call.

### Export Backup button

Downloads your entire data as a JSON file (named `regulr-backup-YYYY-MM-DD.json`). Useful for switching devices manually.

### Import Backup button

Opens a file picker. You select a previously exported JSON file, and your current data is replaced with the contents.

### Reset Data button

Wipes all local data. Used carefully (or in dev).

---

## 10. Ask Coach — The Floating Chat Button

A round button always visible on the Dashboard (bottom-right). This is your on-demand coach.

### When you tap the button

The button expands into a 380px chat panel. If you've never used it before, you see 4 suggested questions:

- *How do I fix lower back rounding on RDLs?*
- *What can I do instead of barbell squats with a bad knee?*
- *How close to failure should my last set be?*
- *Should I deload this week?*

Tap any of them and it sends as if you typed it.

### When you ask a question

1. Your question appears as a chat bubble on the right.
2. A "Thinking..." indicator appears.
3. Behind the scenes, REGULR sends:
   - Your question
   - Your active plan name
   - Your **current exercise** (if you have a session in progress, it knows what you're doing right now)
   - Your **injuries**
   - Your goal
   - Your training experience
   - The last 6 turns of conversation (so follow-up questions make sense)
4. The AI looks up 3 relevant book chunks based on your question + current exercise + injuries.
5. The AI returns:
   - A 2–4 sentence answer
   - A book reference (e.g., "Ch. 5 — Effort and Proximity to Failure")
   - Optional substitution suggestions if you asked for an alternative exercise

### What the chat shows

- Your messages: solid colored bubbles, right-aligned.
- AI messages: outlined bubbles, left-aligned, with the book reference in italic underneath.
- Substitution suggestions render as colored chips: *"Hack Squat — Knee-friendly quad alternative"*

### Important behaviour

- **Conversation history is in-memory only**. Close the panel and the history clears.
- **No personal data ever leaves your device beyond what's needed for the answer**. Only the immediate context goes to the AI.
- **If the AI is offline**, you'll see "The coach is offline right now. Try again in a moment."

### X (close) button

Collapses the chat back to the round button. History is wiped.

---

## 11. The Weekly Review — REGULR's Self-Adjustment

This is the most powerful feature in the app, and it happens **automatically without you tapping anything**.

### When it runs

Every time you open the Dashboard, REGULR silently checks: "Has it been a new ISO calendar week since I last ran the weekly review?"

If yes, AND if you have:
- Completed onboarding
- An active plan
- At least 5 completed sessions

...then it runs. It only runs once per week per device, even if you refresh the Dashboard 50 times.

### What it does

1. Computes your training signals (RIR, stalled weeks, adherence, muscle volumes, weight trend).
2. Classifies your training state (e.g., "stalled" or "under-recovering").
3. Runs all 60 deterministic rules to find which ones currently apply (e.g., "MRV exceeded for back," "deload due," "lower-back injury constraint").
4. Bundles your signals, matched rules, and your AI memory (accepted/rejected suggestions) into one request.
5. Sends it to Claude Sonnet with relevant book context.
6. The AI returns up to 3 specific plan changes, each with a book citation:
   - **reduce_volume** (drop X sets for muscle Y)
   - **add_exercise** (add X for muscle Y)
   - **replace_exercise** (swap X for Y)
   - **adjust_frequency** (more or fewer days per week)
   - **increase_load** (small load bump)
   - **deload** (reduce intensity this week)
   - **swap** (1-1 exchange)
7. The changes are saved to your `plan_updates` list as "unseen."

### What you see

The next time you look at the Dashboard, the **Plan Updates Banner** appears at the top showing each change as an actionable card.

### The five training-state rules

| Your state | What the AI proposes |
|---|---|
| Progressing | 0–1 small changes (small load bump or extra set) |
| Stalled | Up to 2 changes (rep range shift, exercise swap, or deload) |
| Under-recovering | Deload or reduce volume |
| Under-loading | Small load increase, or +2 sets to a lagging muscle |
| Fresh | Zero changes — not enough data yet |

### Why this matters

You never have to think about programming. REGULR watches your data, sees what the book would say, and proposes the smallest viable change. Nothing big. Nothing surprising. Just one or two tweaks per week, with the chapter reference next to each one so you can verify.

---

## 12. Plan Updates Banner — How REGULR Tells You What It Changed

The Plan Updates Banner sits at the top of the Dashboard. It only appears when there are unseen updates.

Each update card shows:
- **Source label**: "Weekly Review" or "Personalised for you"
- **Summary** (one sentence)
- **A list of specific changes**, each with:
  - The change type (Reduce Volume, Swap Exercise, etc.)
  - The exercise(s) involved
  - The reason
  - The book reference (italic)
  - **Apply** and **Dismiss** buttons

### Apply on a single change

- The change is written into your actual plan (e.g., exercise gets replaced, sets get reduced).
- REGULR remembers you liked this kind of change.
- The change is marked applied.

### Dismiss on a single change

- The change is discarded.
- REGULR remembers you didn't want this.
- The card slides away.

### "Dismiss All" button at the top of the banner

Closes the entire banner. All unseen updates get marked seen (so they don't reappear).

---

## 13. The Memory — How REGULR Learns What You Like

Every time you tap **Accept** or **Dismiss** on any AI suggestion across the app, REGULR records it:

```
{ text: "Swap Barbell Squat → Hack Squat", category: "personalise_plan", date: "2026-05-14" }
```

It keeps the last 20 accepted and the last 20 rejected.

### Where the memory is used

When the AI generates its next weekly review or post-session analysis, REGULR sends the last 5 of each:

- **Accepted suggestions** → the AI sees these and may propose similar things ("you liked volume increases for back — consider one for legs too").
- **Rejected suggestions** → the AI is explicitly told not to repeat these.

This means **the more you use REGULR, the more its suggestions match your preferences**. If you keep dismissing deload recommendations, it will stop suggesting them. If you keep accepting hamstring volume increases, it might propose chest volume increases too.

### Where it's tracked

Four buttons across the app all feed the same memory:

- Dashboard's InsightsCard (post-session suggestions)
- Diet screen's calorie adaptation (Apply / Dismiss)
- PlanView's personalise-plan substitutions (Apply / Skip)
- Plan Updates Banner's weekly review changes (Apply / Dismiss)

All flow into one place — your AI memory. This is what makes REGULR feel like it gets you over time.

---

## Summary — What Touches the AI and What Doesn't

| Action | Calls AI? |
|---|---|
| Logging weight | No |
| Completing a session | Only for the persona-aware coach message |
| Logging sets/reps | Yes — post-session analysis |
| Viewing the daily tip | No — pure book lookup |
| Generating a meal plan | Yes |
| Running weekly calorie review | Yes |
| Running weekly training review | Yes (auto, once/week) |
| Personalising the plan | Yes |
| Asking the chatbot | Yes |
| Critiquing a plan during onboarding | Yes |
| Saving profile / injuries | No |
| Editing exercises in the plan | No |
| Theme toggle / backup / import | No |

Everything calorie-related (BMR, TDEE, macros) is deterministic math — never AI. The AI is reserved for tasks that benefit from judgment + context: critiques, suggestions, substitutions, and conversational answers.

---

*This document describes every user-facing button and the resulting backend behavior in the deployed REGULR app (commit 79475b4).*
