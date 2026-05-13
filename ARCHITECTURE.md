# REGULR — Full Backend & Feature Architecture

> Describes every feature, every button, and what runs in the backend when they are pressed.
> Written against the deployed codebase as of the Phase 5 implementation.

---

## Table of Contents

1. [Stack Overview](#1-stack-overview)
2. [Data Layer — localStorage Schema](#2-data-layer--localstorage-schema)
3. [Supabase Sync Strategy](#3-supabase-sync-strategy)
4. [Routing](#4-routing)
5. [Book Grounding System (3-Tier)](#5-book-grounding-system-3-tier)
6. [Signal & Rule Engine](#6-signal--rule-engine)
7. [AI Memory](#7-ai-memory)
8. [Screen: Dashboard](#8-screen-dashboard)
9. [Screen: PlanView](#9-screen-planview)
10. [Screen: Diet](#10-screen-diet)
11. [Screen: Tips](#11-screen-tips)
12. [Screen: Profile](#12-screen-profile)
13. [Component: AskCoach (Floating Chat)](#13-component-askcoach-floating-chat)
14. [Netlify Function: qa-chat](#14-netlify-function-qa-chat)
15. [Netlify Function: weekly-mutation](#15-netlify-function-weekly-mutation)
16. [Netlify Function: adapt-diet](#16-netlify-function-adapt-diet)
17. [Netlify Function: personalise-plan](#17-netlify-function-personalise-plan)
18. [Netlify Function: plan-critique](#18-netlify-function-plan-critique)
19. [Netlify Function: generate-coaching](#19-netlify-function-generate-coaching)
20. [Netlify Function: _book-context (shared helper)](#20-netlify-function-_book-context-shared-helper)
21. [Utility: weeklyMutation.js](#21-utility-weeklymutationjs)
22. [Utility: signalEngine.js](#22-utility-signalenginejs)
23. [Utility: bookEngine.js](#23-utility-bookenginejs)
24. [Utility: tipFromBook.js](#24-utility-tipfrombookjs)
25. [Utility: aiMemory.js](#25-utility-aimemoryjs)
26. [Full AI Pipeline — End to End](#26-full-ai-pipeline--end-to-end)

---

## 1. Stack Overview

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router v6 |
| Styling | Tailwind CSS + inline style tokens via `useThemeColors` |
| Persistence | `localStorage` (primary), Supabase (cloud backup) |
| Serverless functions | Netlify Functions (ESM, bundled with esbuild) |
| AI model — chat/Q&A | `claude-haiku-4-5` (fast, cheap) |
| AI model — plan analysis | `claude-sonnet-4-6` (reasoning) |
| Prompt caching | Anthropic ephemeral cache on both system blocks |
| CMS | Sanity (read-only; hero images, copy labels) |
| Analytics | Custom `trackPageView` / `trackSessionCompleted` wrappers |

---

## 2. Data Layer — localStorage Schema

All app state is stored under one key: `regulr_data`. The shape below is `DEFAULT_DATA` in `src/utils/storage.js`:

```
{
  version: '1.4',
  created_at: ISO string,
  last_opened: ISO string,
  onboarding_complete: boolean,

  user: {
    name, persona, user_type, preferred_time,
    level, total_xp, xp_to_next_level,
    body_weight_kg, height_cm, age, sex,
    goal,                    // 'fat_loss' | 'build_max' | 'recomp' | 'maintenance'
    activity_level,
    preferred_unit,          // 'kg' | 'lbs'
    injuries: string[],      // ['lower_back', 'knee', 'shoulder', ...]
    dietary_preference,      // 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian'
    cuisine,                 // free text
    eating_habits,           // free text
    training_experience,     // 'beginner' | 'intermediate' | 'advanced'
  },

  plans: TrainingPlan[],     // each plan has: id, name, status ('active'|'archived'),
                             //   gym_goal, experience_level, scheduled_days,
                             //   current_week, total_weeks, weeks[{week_number, sessions[]}]

  streaks: {
    current, best,
    last_check_in_date, last_scheduled_date, consecutive_misses
  },

  check_ins: [{
    date, plan_id, session_id, completed, completed_at,
    xp_earned, bonus_xp, final_calories, calorie_reasoning,
    body_weight_kg (optional)
  }],

  badges: Badge[],
  tips: { seen_tip_ids, last_tip_date, last_tip_id },

  settings: { theme: 'light'|'dark', notifications_enabled },

  workout_logs: WorkoutLog[],       // raw performance data per session

  fitness_state: {
    phase, fatigue_level, adherence, strength_trend, weight_trend, last_updated
  },

  diet: {
    baseline_calories, current_calories,
    last_adjustment_reason, last_updated,
    macros: { protein_g, fat_g, carb_g },
    meal_plan: { week_plan: [...], notes, book_reference },
    meal_plan_generated_at,
    weekly_checkins: [{ date, weight_kg, adherence_pct }],
    last_weekly_adherence_pct,
    consecutive_cut_weeks,
    adaptations: [{ id, date, delta_kcal, reason, book_reference, accepted }],
  },

  ai_insights: [],

  ai_memory: {
    accepted_suggestions: [{ text, category, date }],  // last 20
    rejected_suggestions: [{ text, category, date }],  // last 20
  },

  plan_updates: [{
    id, date, week_stamp, source, summary,
    training_state, changes: [...], seen
  }],

  weight_log: [{ date, weight_kg }],
  last_weekly_mutation_week: '2026-W20',  // ISO week stamp
}
```

### Migration chain

`migrateData()` runs on every `loadData()` call and upgrades old snapshots in place:

- `v1.0 → v1.1`: adds `workout_logs`, `fitness_state`, `diet`, `ai_insights`, `ai_memory`
- `v1.1 → v1.2`: adds `plan_updates`, `weight_log`
- `v1.2 → v1.3`: deep-merges `diet` to add all new diet sub-fields
- `v1.3 → v1.4`: deep-merges `user` to add `injuries`, `dietary_preference`, `cuisine`, `eating_habits`, `training_experience`

---

## 3. Supabase Sync Strategy

**Pattern: localStorage first; Supabase is a background backup.**

### On every `saveData()` call

`syncToSupabase(data)` fires fire-and-forget (no await, swallows all errors):
1. Calls `supabase.auth.getUser()` — skips if not signed in
2. Runs three parallel upserts: `pushProfileToSupabase`, `pushStreaksToSupabase`, `pushSettingsToSupabase`

Heavy mutations (check-ins, badges, plans) call their own `supabaseSync.js` helpers at the mutation site.

### On sign-in (`loadFromSupabase`)

Called once after successful auth. Pulls the cloud record and merges it into localStorage. **Supabase wins on all fields** — if the cloud has more check-ins, badges, or plans, those replace local. The merged result is then written back to localStorage so the next session starts with synced data.

### Conflict resolution

There is no conflict detection — Supabase is treated as the authoritative record for signed-in users. Unsigned users live entirely in localStorage.

---

## 4. Routing

Defined in `src/App.jsx`:

| Path | Component | Nav visible |
|---|---|---|
| `/` | Landing | No |
| `/onboarding` | PlanBuilder | No |
| `/onboarding/custom` | CustomPlanBuilder | No |
| `/onboarding/import` | PlanImporter | No |
| `/onboarding/critique` | PlanCritique | No |
| `/dashboard` | Dashboard | Yes |
| `/plan` | PlanView | Yes |
| `/diet` | Diet | Yes |
| `/progress` | Progress | Yes |
| `/profile` | Profile | Yes |
| `/tips` | Tips | Yes |
| `/studio/*` | SanityStudio | No |
| `*` | Redirect to `/` | — |

The navigation bar (top on desktop, bottom sheet on mobile) is rendered by `App.jsx` whenever `location.pathname` starts with any of the six nav-screen paths.

---

## 5. Book Grounding System (3-Tier)

All AI features are grounded in *The Muscle Ladder* by Jeff Nippard. Content is structured in three tiers:

### Tier 1 — Rule Library (`src/data/book-rules.json`)

~60 deterministic rules, zero AI tokens. Each rule has:
- `id`, `domain` (volume, progression, diet, …)
- `trigger` — a key/value object evaluated by `bookEngine.matchesTrigger()`
- `action` — concrete instruction (`{ type: 'add_sets', delta: 2, muscle: 'Back' }`)
- `book_reference` — chapter citation
- `rationale` — human-readable explanation

Rules are evaluated 100% client-side via `evaluateRules(signals)` and passed to AI functions as context. The AI is instructed to reflect these in its output.

### Tier 2 — Topic Chunks (`src/data/book-chunks.json`)

40 chunks (~11,200 tokens total), one per major topic across all 15 chapters. Each chunk has:
- `id`, `topic`, `chapter`
- `keywords` — 5–10 terms for retrieval
- `applies_to` — feature tags (`['plan_critique', 'weekly_mutation', 'qa_chat', …]`)
- `content` — 200–400 word faithful excerpt with Nippard-specific numbers

**Retrieval algorithm** (both client-side `bookEngine.retrieveBookChunks` and server-side `_book-context.retrieveChunks`):
1. Tokenize query string
2. Score each chunk: +3 per keyword match, +4 for topic substring match, +2 for `applies_to` tag match
3. Fallback: +1 per content substring match if score is still 0
4. Return top N (default 3–4) sorted by score

At call time, 3–4 chunks are retrieved and injected into the AI system prompt inside `<book>` tags. This keeps per-call token cost low (~1,000–1,400 tokens).

### Tier 3 — pgvector Embeddings

Deferred. Not yet implemented. Would enable full semantic search over the complete book text.

### Shared `_book-context.js` helper

Used by all Netlify functions. `buildBookSystemBlock(query, limit)`:
1. Calls `retrieveChunks(query, limit)` to get relevant chunks
2. Returns: `CORE_PRINCIPLES + "\n\n<book>\n" + chunks + "\n</book>"`

`CORE_PRINCIPLES` is a ~300-token hardcoded summary of Nippard's key numbers (MEV/MAV/MRV per muscle, RPE targets per exercise tier, diet rate targets, supplement tiers).

### Prompt caching

Every AI call constructs a 2-block system prompt:
- **Block 1**: `buildBookSystemBlock(...)` with `cache_control: { type: 'ephemeral' }`
- **Block 2**: Task-specific instructions with `cache_control: { type: 'ephemeral' }`

Anthropic caches both blocks, halving cost and latency on repeated calls with the same context.

---

## 6. Signal & Rule Engine

### `computeBookSignals(data)` — `src/utils/signalEngine.js`

Runs entirely client-side. Reads full localStorage data and returns:

| Signal | How computed |
|---|---|
| `avg_rir` | Mean RIR across all logged sets in the last 14 days |
| `rir_zero_consecutive_sessions` | Count of most-recent sessions all ending at RIR=0 |
| `stalled_weeks` | Max weeks with e1RM slope < 0.5 kg/session (Epley formula) |
| `adherence_pct` | Completed sessions / scheduled sessions in last 14 days × 100 |
| `muscle_weekly_sets` | `{ Chest: N, Back: N, … }` from exercise name keyword matching |
| `muscle_frequency_min` | Minimum days/week any muscle was trained |
| `weekly_weight_change_pct` | % body-weight change per week (linear slope over last 28 days of weight_log) |
| `injuries` | Pulled from `data.user.injuries` |

### `classifyTrainingState(signals)`

Returns one of five states:
- `fresh` — no RIR data yet (< 5 sessions)
- `progressing` — RIR ≤ 2, stalled_weeks = 0
- `stalled` — stalled_weeks ≥ 2 AND avg_rir ≤ 1
- `under_recovering` — 3+ consecutive sessions at RIR=0, OR adherence < 50%
- `under_loading` — avg_rir ≥ 3 (leaving too much in the tank)

### `evaluateRules(signals)` — `src/utils/bookEngine.js`

Iterates all 60 rules and returns those whose `trigger` clause is satisfied. `matchesTrigger` handles:
- Direct equality: `{ goal: 'fat_loss' }`
- Numeric suffixes: `avg_rir_lte: 1`, `stalled_weeks_gte: 2`
- Array membership: `injuries_contains: 'lower_back'`
- Composite: `muscle_weekly_sets_gt_mrv: true` (checks against landmark rules)

---

## 7. AI Memory

Stored in `data.ai_memory` (localStorage), capped at 20 entries each.

### `recordAccepted({ text, category })` — `src/utils/aiMemory.js`

Called when a user clicks **Apply** / **Accept** on any AI suggestion. Pushes `{ text, category, date }` to `data.ai_memory.accepted_suggestions` and trims to last 20.

Called from:
- `Dashboard.jsx` — InsightsCard (post-session suggestions)
- `Diet.jsx` — calorie adaptation Accept button
- `PlanView.jsx` — personalise-plan substitution Apply button
- `PlanUpdatesBanner` — weekly mutation change Apply

### `recordRejected({ text, category })`

Called when a user clicks **Dismiss** / **Skip**. Same pattern. Called from same four sites.

### `getMemoryContext()`

Returns `{ accepted_suggestions: last 5, rejected_suggestions: last 5 }`. Injected into AI payloads for `weekly-mutation` and `generate-coaching` (post_session) so the AI avoids repeating rejected ideas and builds on accepted ones.

---

## 8. Screen: Dashboard

**File**: `src/screens/Dashboard.jsx`

### On mount (`loadDashboard`)

1. Calls `getData()` from localStorage
2. Redirects to `/` if `onboarding_complete` is false
3. Calls `detectReturnState(d)` — determines if user has missed sessions
4. If return state ≥ 2: sets a ReturnBanner message + triggers `generate-coaching` with `trigger: 'return'`
5. If return state = 1 (normal day with session): triggers `generate-coaching` with `trigger: 'session_start'`
6. Calls `selectTip(d)` — picks a tip from the static tip library, marks it seen
7. **Fires `runWeeklyMutation()`** (fire-and-forget) — see Section 21

### Buttons and their backend effects

#### "Log" (weight check-in widget)

```
handleWeightSave()
→ parseFloat(weightInput)
→ updateData(d => {
    d.user.body_weight_kg = kg
    d.weight_log.push({ date: today, weight_kg: kg })
  })
→ saveData() → localStorage + background Supabase sync
```

#### "Complete Session" (SessionCard)

```
handleComplete()
→ updateStreak(d)           → new streak numbers
→ calculateSessionXP(...)   → XP total + comeback bonus
→ checkBadges(d)            → badge unlock check
→ checkLevelUp(oldXP, newXP)→ level-up check
→ updateData(d => {
    d.streaks = newStreaks
    d.user.total_xp += xp
    d.check_ins.push(checkIn)   // status: 'completed'
    session.status = 'completed'
    badges pushed/updated
    level updated if levelled up
  })
→ updatePersona(updated, authUser?.id)
   → re-evaluates persona type ('starter'|'follower'|'optimizer'|'struggler'|'self_directed')
→ setCoachTrigger('session_complete'), setShowCoach(true)
   → CoachMessage component POSTs to /.netlify/functions/generate-coaching
→ trackSessionCompleted(analytics)
```

#### Performance Log (WorkoutLogger inside SessionCard)

After the user logs sets/reps/weight for exercises:
```
handlePerformanceLogged(analysisResult)
→ reads latest workout_logs entry
→ setSessionCalories({ final_calories, calorie_reasoning })
→ if analysisResult.suggestions → setAiInsights (shown in InsightsCard)
→ if analysisResult.plan_adjustments → applyPlanAdjustments(activePlan, ...)
   → mutates plan in localStorage
→ if analysisResult.diet_adjustments → applyDietAdjustments(diet, ...)
   → mutates diet in localStorage
→ setPlanUpdates(getData().plan_updates)
```

The `analysisResult` comes from `generate-coaching` with `trigger: 'post_session'`.

#### InsightsCard — "Accept" / "Dismiss"

```
Accept: recordAccepted(suggestion) → data.ai_memory.accepted_suggestions
Dismiss: recordRejected(suggestion) → data.ai_memory.rejected_suggestions
Both: filter suggestion out of aiInsights state
```

#### PlanUpdatesBanner

Rendered above the session card. Shows unseen `plan_updates` entries (weekly mutations, personalise-plan swaps, critique applications). Each change card has **Apply** / **Dismiss** buttons that call `recordAccepted` / `recordRejected`.

---

## 9. Screen: PlanView

**File**: `src/screens/PlanView.jsx`

Shows the active plan week-by-week, session-by-session, exercise-by-exercise.

### "✨ Personalise for me" button

```
handlePersonalise()
→ collectExerciseNames(plan)   // extract unique exercise names via pipe-split
→ POST /.netlify/functions/personalise-plan  {
    plan_name, exercises: string[], profile: { sex, goal, body_weight_kg,
    height_cm, age, experience_level, injuries, dietary_preference, cuisine }
  }
→ setPersonalisation(result)   // renders substitution cards
```

Each returned substitution card has **Apply** / **Skip**:

**Apply**:
```
acceptSubstitution(sub)
→ recordAccepted({ text, category: 'personalise_plan' })
→ updateData(d => {
    replaceExercise(plan, sub.old_exercise, { name: sub.new_exercise, sets: 3, reps: '8-12' })
    plan_updates.push({ source: 'personalise_plan', changes: [...], seen: false })
  })
→ setData(updated), setSelectedPlan(updated plan)
```

**Skip**:
```
dismissSubstitution(sub)
→ recordRejected({ text, category: 'personalise_plan' })
→ removes sub from personalisation.substitutions state (no storage write)
```

### Session inline editing

Clicking the edit pencil on a session opens an exercise list editor:

```
startEditing(session)
→ parseExercises(mainBlock.detail)  // splits pipe-separated exercise string
→ setEditExercises([{ name, sets }])

saveEdits(sessionTitle)
→ re-joins as "ExerciseName NxN | ExerciseName NxN | ..."
→ updateData(d => mainBlock.detail = detailStr)
→ saves to localStorage + Supabase background sync
```

### YouTube links (SessionCard exercise rows)

Each exercise name generates a YouTube search URL:
```
https://www.youtube.com/results?search_query=Jeff+Nippard+{exercise.name}+form
```
Opens in a new tab. No backend call.

---

## 10. Screen: Diet

**File**: `src/screens/Diet.jsx`

### On mount

```
calculateDietTarget(profile)
→ Mifflin-St Jeor BMR × activity factor = TDEE
→ adjust for goal: fat_loss (-20%), build_max (+10%), recomp (0%)
→ calculateMacros(profile, calories)
   → protein: 2.0 g/kg (cut) or 1.8 g/kg (bulk)
   → fat: 0.8 g/kg minimum
   → carbs: remainder
→ setTarget({ baseline_calories, bmr, tdee, macros })
```

All calorie math is **100% deterministic — no AI involved**.

### "Generate meal plan →" button

```
handleGenerate()
→ POST /.netlify/functions/generate-meal-plan {
    target: { calories, protein_g, fat_g, carb_g },
    user: { goal, sex, cuisine, dietary_preference, eating_habits }
  }
→ result.week_plan → setMealPlan(result)
→ updateData(d => {
    d.diet.meal_plan = result
    d.diet.meal_plan_generated_at = now
    d.diet.baseline_calories = target.baseline_calories
    d.diet.current_calories = target.baseline_calories
    d.diet.macros = target.macros
  })
```

### "Save check-in" button (Weekly check-in section)

```
handleCheckin()
→ requires selectedAdherence (0/25/50/75/100%)
→ updateData(d => {
    d.diet.weekly_checkins.push({ date, weight_kg, adherence_pct })
    d.diet.last_weekly_adherence_pct = selectedAdherence
    if weight entered: d.user.body_weight_kg = weight; d.weight_log.push(...)
    if goal=fat_loss AND adherence≥50: d.diet.consecutive_cut_weeks += 1
  })
```

### "Run weekly review" button (Calorie adaptation section)

```
handleRunAdaptation()
→ computeTrend(d):
   last 6 weekly_checkins → weekly_weight_change_pct (slope), weeks_in_phase, last_adherence_pct
   if < 2 check-ins → error "Need at least 2 weekly check-ins"
→ POST /.netlify/functions/adapt-diet {
    profile: { sex, goal, weight_kg, current_calories },
    trend: { weekly_weight_change_pct, weeks_in_phase, last_adherence_pct }
  }
→ setAdaptation(result)  → shows card with recommendation + delta_kcal
```

**Apply** button on adaptation card:
```
acceptAdaptation()
→ recordAccepted({ text: recommendation+reason, category: 'diet_adaptation' })
→ calculateMacros(profile, newCals) → recalculate macros for new calorie target
→ updateData(d => {
    d.diet.current_calories = newCals
    d.diet.macros = newMacros
    d.diet.last_adjustment_reason = adaptation.reason
    d.diet.adaptations.push({ ..., accepted: true })
  })
→ setTarget updated → MacroBar components re-render
```

**Dismiss** button:
```
dismissAdaptation()
→ recordRejected({ text, category: 'diet_adaptation' })
→ updateData: adaptations.push({ ..., accepted: false })
→ setAdaptation(null)
```

---

## 11. Screen: Tips

**File**: `src/screens/Tips.jsx`

### On mount (`loadAll`)

For gym users (onboarding complete + active plan):
```
selectBookTip(d)              // from src/utils/tipFromBook.js
→ computeBookSignals(d)       // signals from localStorage
→ classifyTrainingState(signals)  // e.g. 'stalled'
→ STATE_QUERIES[state]        // maps state → keyword query string
→ retrieveBookChunks(query, 'tips_feed', 3)
→ date-stable index: (YYYYMMDD % candidates.length)
→ returns { id, topic, chapter, content, keywords, training_state }
→ setBookTip(result)
```

The "Coach Insight — From The Muscle Ladder" section renders:
- Chapter tag (e.g. `Ch. 8 — Volume`)
- Training state tag (e.g. `stalled`)
- Topic heading
- Content paragraph

This tip stays the same all day (date-stable) but updates the next calendar day. No AI call, no network request — pure local computation over the pre-loaded book chunks.

---

## 12. Screen: Profile

**File**: `src/screens/Profile.jsx`

Extended in v1.4 to include training-specific and diet-specific fields.

### Body stats section

Fields: weight (kg), height (cm), age, sex, goal, activity level, training experience, diet preference, cuisine, eating habits.

**"Save body stats" button**:
```
handleBodyStatsSave()
→ updateData(d => {
    d.user.body_weight_kg = ...
    d.user.height_cm = ...
    d.user.age = ...
    d.user.sex = ...
    d.user.goal = ...
    d.user.activity_level = ...
    d.user.training_experience = ...   // NEW v1.4
    d.user.dietary_preference = ...    // NEW v1.4
    d.user.cuisine = ...               // NEW v1.4
    d.user.eating_habits = ...         // NEW v1.4
  })
→ saveData() → localStorage + Supabase profile sync
```

### Injury chips

Eight toggle-chip buttons: lower_back, knee, shoulder, elbow, wrist, hip, neck, ankle.

```
toggleInjury(key)
→ if key in injuries → remove it; else → add it
→ updateData(d => { d.user.injuries = newInjuries })
```

Injuries are used in:
- `personalise-plan` — never recommend exercises that aggravate listed injuries
- `qa-chat` — context for substitution recommendations
- `weekly-mutation` — constraint passed to AI

### Theme toggle

```
→ localStorage.setItem('regulr_theme', 'dark'|'light')
→ document.documentElement.classList.toggle('dark'/'light')
```

No backend call.

### Export / Import backup

```
exportData() → Blob(JSON.stringify(data)) → <a download> click
importData(file) → FileReader → JSON.parse → saveData(data)
```

---

## 13. Component: AskCoach (Floating Chat)

**File**: `src/components/AskCoach.jsx`

Mounted on Dashboard. Fixed-position button at `right: 20px, bottom: 108px, z-index: 60`.

### Collapsed state

A single round button renders. Click → `setOpen(true)`.

### Expanded state

380px × max 620px chat panel.

**Empty state**: 4 suggested questions render as clickable chips.
Clicking a chip calls `ask(question)` directly.

### `ask(question)` function

```
→ setMessages([...prev, { role: 'user', content: question }])
→ setBusy(true)
→ getData() from localStorage
→ find activePlan
→ build history = messages[].filter(role user|assistant).map(role, content)
→ POST /.netlify/functions/qa-chat {
    question,
    context: {
      active_plan: activePlan.name,
      current_exercise: currentExercise prop (first exercise of today's session),
      injuries: data.user.injuries,
      goal: data.user.goal,
      experience_level: data.user.training_experience
    },
    history: last 6 turns
  }
→ result: { answer, book_reference?, suggested_substitutions? }
→ setMessages([...prev, {
    role: 'assistant',
    content: result.answer,
    book_reference: result.book_reference,
    subs: result.suggested_substitutions
  }])
```

**Response rendering**:
- Assistant messages align left, user messages right (primary color bubble)
- `book_reference` renders below the answer in italic
- `suggested_substitutions` render as colored chips: `{name} — {reason}`

**Conversation history is in-memory only** — not persisted to localStorage.

---

## 14. Netlify Function: qa-chat

**File**: `netlify/functions/qa-chat.js`
**Trigger**: POST `/.netlify/functions/qa-chat`
**Model**: `claude-haiku-4-5`, max_tokens: 600

### Request body
```json
{
  "question": "How close to failure should my last set be?",
  "context": {
    "active_plan": "PPL Hypertrophy",
    "current_exercise": "Bench Press",
    "injuries": ["lower_back"],
    "goal": "build_max",
    "experience_level": "intermediate"
  },
  "history": [{ "role": "user", "content": "..." }, ...]
}
```

### Processing pipeline

1. Extract `question`, `context`, `history` from body
2. Build retrieval query: `question + current_exercise + injuries.join(' ')`
3. `buildBookSystemBlock(retrievalQuery, 3)` — retrieves 3 relevant chunks
4. Build `userTurn` JSON: `{ question, context }`
5. Build `messages` array: validate and limit history to last 6 turns (max 1000 chars/turn), append userTurn
6. POST to `https://api.anthropic.com/v1/messages` with 2-block cached system prompt
7. Parse JSON from response, extract `answer`, `book_reference`, `suggested_substitutions`
8. Sanitize: ensure `answer` is string, `suggested_substitutions` is array (max 3)
9. Return JSON

### Response shape
```json
{
  "answer": "2-4 sentence coaching answer",
  "book_reference": "Ch. 5 — Effort and Proximity to Failure",
  "suggested_substitutions": [
    { "name": "Hack Squat", "reason": "Knee-friendly quad alternative" }
  ]
}
```

### Fallback
If `ANTHROPIC_API_KEY` is missing, returns a static fallback. If JSON parse fails, returns prose answer directly in `answer` field.

---

## 15. Netlify Function: weekly-mutation

**File**: `netlify/functions/weekly-mutation.js`
**Trigger**: POST `/.netlify/functions/weekly-mutation` (called by `weeklyMutation.js` client-side)
**Model**: `claude-sonnet-4-6`, max_tokens: 1200

### Request body
```json
{
  "user": { "name", "sex", "goal", "experience_level", "injuries": [] },
  "signals": {
    "avg_rir", "rir_zero_consecutive_sessions", "stalled_weeks",
    "adherence_pct", "muscle_weekly_sets", "muscle_frequency_min",
    "weeks_since_deload", "weekly_weight_change_pct"
  },
  "training_state": "stalled",
  "matched_rules": [{ "id", "domain", "name", "action", "rationale", "book_reference" }],
  "ai_memory": { "accepted_suggestions": [], "rejected_suggestions": [] },
  "plan_summary": { "active_plan_name", "sessions_per_week", "scheduled_days", "week_number", "total_weeks" }
}
```

### Processing pipeline

1. Build book query: `training_state + "volume MRV deload progression frequency overload" + matched_rules domains`
2. `buildBookSystemBlock(bookQuery, 4)` — retrieves 4 relevant book chunks
3. POST to Anthropic with 2-block cached system
4. Parse JSON response
5. Hard cap: `result.changes.slice(0, 3)` — never more than 3 changes
6. Return `{ summary, changes }`

### Response shape
```json
{
  "summary": "Focus on volume reduction this week",
  "changes": [
    {
      "type": "reduce_volume",
      "exercise": "Romanian Deadlift",
      "muscle": "Hamstrings",
      "delta_sets": -2,
      "reason": "RIR = 0 for 3 consecutive sessions suggests MRV proximity",
      "book_reference": "Ch. 9 — Managing Fatigue"
    }
  ]
}
```

### State → action mapping (from system prompt)

| Training state | Default action |
|---|---|
| `progressing` | 0–1 minor changes (small load bump or volume nudge) |
| `stalled` | up to 2 changes (rep range shift, exercise swap, or deload) |
| `under_recovering` | recommend deload or reduce_volume |
| `under_loading` | small load increase or +2 sets to lagging muscle |
| `fresh` | 0 changes (insufficient data) |

---

## 16. Netlify Function: adapt-diet

**File**: `netlify/functions/adapt-diet.js`
**Trigger**: POST `/.netlify/functions/adapt-diet`
**Model**: `claude-sonnet-4-6`, max_tokens: 500

### Request body
```json
{
  "profile": { "sex", "goal", "weight_kg", "current_calories" },
  "trend": { "weekly_weight_change_pct", "weeks_in_phase", "last_adherence_pct" }
}
```

### Deterministic rules (embedded in system prompt)

These override AI judgment — the model is instructed to apply them first:

| Condition | Action |
|---|---|
| Cut + weekly loss > 1% bw | +150 kcal |
| Cut + weekly loss < 0.1% bw for 2+ weeks | −200 kcal |
| Cut + 12+ consecutive weeks | `diet_break` (→ maintenance) |
| Bulk + weekly gain > 0.5% bw | −200 kcal |
| Bulk + weight stalled 2+ weeks | +150 kcal |
| Recomp | Keep calories stable |
| Any goal + adherence < 50% for 2+ weeks | `simplify` (0 delta) |

### Response shape
```json
{
  "recommendation": "decrease",
  "delta_kcal": -200,
  "new_calories": 2100,
  "reason": "Weight has been stalling for 3 weeks despite consistent cut adherence. TDEE has adapted.",
  "book_reference": "Ch. 11 — Cutting Protocol"
}
```

Sanitization: `delta_kcal` is clamped to `[-300, 300]`. `new_calories` is always recomputed as `current_calories + delta_kcal` server-side (ignores any AI value).

---

## 17. Netlify Function: personalise-plan

**File**: `netlify/functions/personalise-plan.js`
**Trigger**: POST `/.netlify/functions/personalise-plan`
**Model**: `claude-sonnet-4-6`, max_tokens: 1000

### Request body
```json
{
  "plan_name": "PPL Hypertrophy",
  "exercises": ["Barbell Squat", "Romanian Deadlift", "Bench Press", ...],
  "profile": {
    "sex", "goal", "body_weight_kg", "height_cm", "age",
    "experience_level": "beginner",
    "injuries": ["lower_back", "knee"],
    "equipment_available": "full gym"
  }
}
```

### Processing pipeline

1. Build retrieval query: `"exercise substitution selection injury" + experience_level + injuries.join(' ')`
2. `buildBookSystemBlock(query, 4)` — 4 relevant chunks about exercise selection and injury
3. POST to Anthropic
4. Parse JSON, cap `substitutions.slice(0, 4)`
5. Return

### Injury constraint (in system prompt)

Never suggest an exercise that could aggravate listed injuries. Examples:
- `lower_back` → swap conventional deadlift for trap-bar deadlift
- `knee` → swap back squat for hack squat or leg press
- `shoulder` → swap overhead press for landmine press

### Response shape
```json
{
  "summary": "2 swaps recommended for knee and lower-back safety",
  "substitutions": [
    {
      "old_exercise": "Barbell Back Squat",
      "new_exercise": "Hack Squat",
      "reason": "Reduces knee shear force while preserving quad stimulus",
      "book_reference": "Ch. 6 — Exercise Selection"
    }
  ],
  "notes": "Your intermediate experience level means these variations will still drive significant hypertrophy."
}
```

---

## 18. Netlify Function: plan-critique

**File**: `netlify/functions/plan-critique.js`
**Trigger**: POST `/.netlify/functions/plan-critique`
**Model**: `claude-sonnet-4-6`, max_tokens: 1400

Called from the PlanCritique onboarding screen. The user submits an existing plan for analysis.

### Request body
```json
{
  "plan": { /* full plan object */ },
  "user": { "goal", "experience_level", "body_weight_kg" }
}
```

### Processing pipeline

1. Extract `planSummary` from plan: goal, experience, days_per_week, scheduled_days, sessions (with exercise list)
2. Book query: `"plan critique {goal} {experience} volume frequency exercise selection"`
3. `buildBookSystemBlock(query, 4)` — 4 chunks
4. POST to Anthropic
5. Sanitize: `overall_score` clamped 0–100, `strengths.slice(0,3)`, `issues.slice(0,4)`, `proposed_edits.slice(0,5)`
6. Return

### Response shape
```json
{
  "overall_score": 72,
  "verdict": "Decent base structure. Volume is appropriate but exercise selection has gaps.",
  "strengths": [
    { "observation": "3x/week frequency", "principle": "Allows adequate recovery", "book_reference": "Ch. 8" }
  ],
  "issues": [
    { "issue": "No direct hamstring work", "severity": "high", "explanation": "...", "book_reference": "Ch. 6" }
  ],
  "proposed_edits": [
    {
      "exercise": "Romanian Deadlift",
      "change_type": "add",
      "from": null,
      "to": "3x8-12",
      "rationale": "Fills the hamstring gap",
      "book_reference": "Ch. 6",
      "session_day": "Wednesday"
    }
  ]
}
```

---

## 19. Netlify Function: generate-coaching

**File**: `netlify/functions/generate-coaching.js`
**Trigger**: POST `/.netlify/functions/generate-coaching`
**Model**: `claude-haiku-4-5`

Handles two distinct modes based on `trigger`:

### Mode 1 — Short coaching messages (all triggers except `post_session`)

**Triggers**: `session_complete`, `session_start`, `streak_milestone`, `return`, `weekly_summary`

- Uses `PERSONA_SYSTEM_PROMPTS[persona]` (5 personas: starter, follower, optimizer, struggler, self_directed)
- `TRIGGER_TEMPLATES[trigger](context)` generates the user message
- max_tokens: 120
- Response: `{ message: string }` — rendered in CoachMessage component on Dashboard

### Mode 2 — Structured post-session analysis (`post_session`)

- Uses `POST_SESSION_SYSTEM` (book-grounded coach)
- `buildPostSessionPrompt(context)` — 15-line summary of session data (calories, volume, exercises, fitness state, weight trend, adherence, skipped exercises, overload candidates, AI memory)
- 2-block system prompt: book context (3 chunks for goal + fitness state query) + task prompt
- max_tokens: 600
- Response shape:
```json
{
  "state_update": {},
  "suggestions": [
    { "category": "exercise|diet|recovery", "text": "...", "book_reference": "Ch. X" }
  ],
  "plan_adjustments": [
    {
      "type": "reduce_volume|add_exercise|replace_exercise|adjust_frequency",
      "detail": "...",
      "old_exercise": "...",
      "new_exercise": { "name": "...", "sets": 3, "reps": "8-12" },
      "book_reference": "Ch. X"
    }
  ],
  "diet_adjustments": [
    { "delta": 0, "reason": "...", "book_reference": "Ch. X" }
  ]
}
```

The Dashboard's `handlePerformanceLogged()` reads this result and applies:
- `suggestions` → shown in InsightsCard
- `plan_adjustments` → `applyPlanAdjustments(plan, ...)` mutates plan in localStorage
- `diet_adjustments` → `applyDietAdjustments(diet, ...)` mutates diet in localStorage

---

## 20. Netlify Function: _book-context (shared helper)

**File**: `netlify/functions/_book-context.js`

Imported by all 6 AI Netlify functions. Not directly callable as an endpoint.

Imports `book-chunks.json` and `book-rules.json` at bundle time (esbuild inlines JSON). Exports:
- `CHUNKS` — 40 chunk objects
- `RULE_LIBRARY` — 60 rule summaries (for context if needed)
- `CORE_PRINCIPLES` — ~300-token hardcoded Nippard summary
- `retrieveChunks(query, limit)` — keyword scoring retrieval
- `buildBookSystemBlock(query, limit)` — returns full system block text

**esbuild note**: `import json from '../../src/data/file.json'` is not valid in Node 22 without `with { type: 'json' }`, but Netlify's esbuild bundler inlines JSON at compile time, so this works correctly in production and in local `netlify dev`.

---

## 21. Utility: weeklyMutation.js

**File**: `src/utils/weeklyMutation.js`

### `shouldRunWeeklyMutation(data)`

Returns `true` only when ALL conditions are met:
1. `onboarding_complete === true`
2. Active plan exists
3. At least 5 completed check-ins (avoid spamming new users)
4. `data.last_weekly_mutation_week !== isoWeekStamp(new Date())`

### `isoWeekStamp(date)`

Computes ISO 8601 week string: `"2026-W20"`. Uses the official ISO algorithm (Thursday rule).

### `runWeeklyMutation()`

Called on every Dashboard mount. Execution flow:

```
1. shouldRunWeeklyMutation() → if false, return null
2. Mark the week stamp immediately (before network):
   updateData(d => d.last_weekly_mutation_week = weekStamp)
   (prevents retry loops on network failure)
3. buildPayload(data):
   → computeBookSignals(data)
   → evaluateRules(signals)
   → classifyTrainingState(signals)
   → rulesForPrompt(matched, 6)  — top 6 matched rules
   → getMemoryContext()          — last 5 accepted/rejected
4. POST /.netlify/functions/weekly-mutation
5. If result.changes.length > 0:
   → normalizeChanges(result.changes)  — ensure consistent shape
   → create plan_update entry { id, date, week_stamp, source: 'weekly_mutation', ... }
   → updateData(d => d.plan_updates.push(update))
   → return update
6. Dashboard: setPlanUpdates(getData().plan_updates)
```

---

## 22. Utility: signalEngine.js

**File**: `src/utils/signalEngine.js`

### `computeBookSignals(data)` (primary export for AI pipeline)

All deterministic. Reads `data.performance_log`, `data.plans`, `data.check_ins`, `data.weight_log`.

Key calculations:
- **avg_rir**: mean of all `rir` values in last 14 days of performance logs
- **rir_zero_consecutive_sessions**: sorted by descending date, count from top until a non-zero RIR
- **stalled_weeks**: per exercise, fit a linear regression on e1RM (Epley: `weight × (1 + reps/30)`) over last 4 sessions; if slope < 0.5 kg/session, count weeks since first of those sessions
- **adherence_pct**: `(sessions completed in 14d / sessions scheduled in 14d) × 100`
- **muscle_weekly_sets**: keyword classification of exercise names into 8 muscle groups (Chest, Back, Legs, Shoulders, Biceps, Triceps, Glutes, Calves); sum sets per muscle over 14 days
- **weekly_weight_change_pct**: `((last_weight - first_weight) / first_weight) × 100 × (7 / days_span)` over last 28 days of weight_log

### `classifyTrainingState(signals)`

Priority order:
1. `fresh` if `avg_rir === null`
2. `stalled` if `stalled_weeks >= 2 AND avg_rir <= 1`
3. `under_recovering` if `rir_zero_consecutive_sessions >= 3 OR adherence_pct < 50`
4. `under_loading` if `avg_rir >= 3`
5. `progressing` if `avg_rir <= 2 AND stalled_weeks === 0`
6. `fresh` (fallback)

---

## 23. Utility: bookEngine.js

**File**: `src/utils/bookEngine.js`

### `evaluateRules(signals)`

Iterates all 60 rules. For each rule, calls `matchesTrigger(rule.trigger, signals)`.

`matchesTrigger` checks every key in the trigger object. Supported clause patterns:
- `{ goal: 'fat_loss' }` → direct equality
- `{ avg_rir_lte: 1 }` → numeric comparison (suffix: `_lt`, `_lte`, `_gt`, `_gte`, `_eq`)
- `{ injuries_contains: 'lower_back' }` → array membership
- `{ muscle_weekly_sets_gt_mrv: true }` → checks each muscle's sets against MRV values in landmark rules
- `{ rir_negative_pattern: true }` → boolean flag from signals
- All clauses must match (AND logic)

### `retrieveBookChunks(query, context, limit)`

Used client-side by `tipFromBook.js`. Identical scoring algorithm to `_book-context.retrieveChunks` but also adds `+2` for `applies_to` tag matching the context parameter.

### `rulesForPrompt(rules, limit)`

Takes matched rules array, trims to `limit`, returns compressed objects: `{ id, domain, name, action, rationale, book_reference }`.

---

## 24. Utility: tipFromBook.js

**File**: `src/utils/tipFromBook.js`

### `selectBookTip(data)`

No AI call. Pure local computation.

```
computeBookSignals(data)
→ classifyTrainingState(signals)  → e.g. 'stalled'
→ STATE_QUERIES[state]           → 'stalled plateau exercise variation deload rep range'
→ retrieveBookChunks(query, 'tips_feed', 3)  → top 3 chunks
→ today = new Date().toISOString().split('T')[0]
→ idx = parseInt(today.replace(/-/g,''), 10) % candidates.length
→ return chunk as { id, topic, chapter, content, keywords, training_state }
```

The date-modulo ensures the same tip shows all day but rotates on the next calendar day.

### STATE_QUERIES mapping

| State | Query |
|---|---|
| `progressing` | `progressive overload double progression load increase` |
| `stalled` | `stalled plateau exercise variation deload rep range` |
| `under_recovering` | `fatigue management deload recovery sleep MRV` |
| `under_loading` | `effort RIR proximity to failure stimulus tension` |
| `fresh` | `hypertrophy fundamentals mechanical tension volume frequency` |

---

## 25. Utility: aiMemory.js

**File**: `src/utils/aiMemory.js`

### Storage

`data.ai_memory.accepted_suggestions` and `data.ai_memory.rejected_suggestions` in localStorage. Each entry: `{ text, category, date }`. Capped at 20 per list (oldest trimmed).

### `recordAccepted({ text, category })`

Called whenever the user clicks Apply / Accept on any AI suggestion. The `category` field identifies which feature produced the suggestion:
- `'diet_adaptation'` — Diet screen calorie adaptation
- `'personalise_plan'` — PlanView personalise-plan swap
- `'post_session'` — Dashboard InsightsCard
- `'weekly_mutation'` — PlanUpdatesBanner

### `getMemoryContext()`

Returns last 5 of each type. Used in `weekly-mutation` and `generate-coaching (post_session)` payloads so the AI can:
- Build on accepted suggestions (e.g., user liked the previous volume increase → consider more)
- Avoid repeating rejected suggestions (explicit rule in both system prompts)

---

## 26. Full AI Pipeline — End to End

Below is the complete flow for the highest-value feature: **Weekly Plan Mutation**.

```
Dashboard mounts
  └─ loadDashboard()
       └─ runWeeklyMutation()          [weeklyMutation.js]
            ├─ shouldRunWeeklyMutation(data)
            │    checks: onboarding, active plan, ≥5 sessions, new ISO week
            │    → if false: return null (no-op)
            │
            ├─ mark week stamp in localStorage (idempotency guard)
            │
            ├─ buildPayload(data)
            │    ├─ computeBookSignals(data)     [signalEngine.js]
            │    │    reads: performance_log, check_ins, weight_log, plans
            │    │    computes: avg_rir, stalled_weeks, adherence_pct,
            │    │              muscle_weekly_sets, weekly_weight_change_pct
            │    │
            │    ├─ classifyTrainingState(signals)
            │    │    → e.g. 'stalled'
            │    │
            │    ├─ evaluateRules(signals)       [bookEngine.js]
            │    │    → matched rules e.g. [{ id: 'deload_trigger', ... }]
            │    │
            │    ├─ rulesForPrompt(matched, 6)
            │    │    → compact rule summaries for AI context
            │    │
            │    └─ getMemoryContext()           [aiMemory.js]
            │         → last 5 accepted + rejected suggestions
            │
            └─ POST /.netlify/functions/weekly-mutation
                 │
                 ├─ buildBookSystemBlock(query, 4)   [_book-context.js]
                 │    ├─ retrieveChunks(training_state + rule domains)
                 │    │    scores 40 chunks by keyword overlap → top 4
                 │    └─ CORE_PRINCIPLES + <book>{4 chunks}</book>
                 │
                 ├─ 2-block cached system prompt:
                 │    Block 1: book context (ephemeral cache)
                 │    Block 2: SYSTEM_PROMPT_TASK (ephemeral cache)
                 │
                 ├─ POST https://api.anthropic.com/v1/messages
                 │    model: claude-sonnet-4-6
                 │    max_tokens: 1200
                 │
                 ├─ parse JSON response
                 ├─ cap changes at 3
                 └─ return { summary, changes: [...] }
                      │
                      ├─ normalizeChanges(result.changes)
                      ├─ create plan_update entry
                      │    { id, date, week_stamp, source: 'weekly_mutation',
                      │      summary, training_state, changes, seen: false }
                      │
                      └─ updateData(d => d.plan_updates.push(update))
                           └─ saveData() → localStorage + Supabase background sync

Dashboard re-renders
  └─ PlanUpdatesBanner shows unseen plan_updates
       └─ User clicks Apply on a change
            ├─ recordAccepted()     → data.ai_memory
            └─ markSeen()          → plan_updates[i].seen = true
```

---

*Document generated from the live codebase at commit f1bed0b.*
