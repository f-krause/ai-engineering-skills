---
name: ambition
description: >-
  Raise the ambition of a task before doing it: aim at the real outcome
  (altitude), use expert-grade methods, raw data, and an outside judge (depth),
  and borrow methods from other fields (range). Use when the user invokes
  /ambition, asks to make a prompt or plan more ambitious, deeper, or less
  generic, says output is shallow or generic, or starts an open-ended
  deliverable meant to drive a decision (business review, strategy memo,
  analysis, research write-up, roadmap, pitch) or a recurring task they keep
  re-requesting. Do not use for well-scoped bug fixes, small edits, factual
  questions, rewording, quick or time-boxed asks, mid-task follow-ups, creative
  pieces where the user's vision is the point, or work whose scope the user
  fixed. For prompts inside AI products, use ai-engineering instead.
argument-hint: "[task, prompt, or plan to upgrade]"
---

# Ambition

Turn "do this task" into "get this outcome, done the way the field's best would do it, checked by something other than me."

Every lens assumes you can act: install tools, query raw data, use connectors. If access is missing, name exactly what is needed.

## Pick The Mode

- **Upgrade mode:** the user invoked `/ambition`, pasted a prompt or plan to improve, or asked how to be more ambitious with it. Run the full pass and return the upgrade report. Do not run the task until the user picks a version, unless they already said to go ahead.
- **Lens mode:** the skill loaded on its own at the start of an open-ended deliverable. Apply depth and range inside the task, offer altitude in at most two lines, then do the work. The pass must never block the task.

Never lecture the user about ambition; show the upgraded version. If the user says "just do what I asked", drop the lens for the rest of the task.

## Scope Contract

The lenses change different things, so they need different permission:

| Lens | Changes | Default |
| --- | --- | --- |
| Depth | Inputs, methods, verification | Apply and mention in one line; offer instead if it multiplies effort or needs new setup |
| Range | Methods, tools, media, and critics from other fields | Apply as methods and review passes; offer instead if it changes the deliverable's form |
| Altitude | The goal itself | Never silently; propose the goal beyond the goal and what it needs |

Speed (same work, less time) is the baseline. This skill does not cover it.

## Altitude: Aim At The Outcome

The request is the user's best guess at a path to an outcome. Ask what should happen after this is done. What is the goal beyond the goal?

- Climb one or two rungs, not to "go make money".
  - Business review: fill the template → explain what changed, why, and what to do → find the three most urgent decisions with for/against arguments → design a better early-warning mechanism than a quarterly deck, show from history it would have caught things sooner, run it alongside one quarter.
  - Code: fix this crash → fix this class of crash → keep the app crash-free.
- Strong signal: meetings or decisions will happen about this work. Weak fit: creative work.
- Name the access that a durable, human-out-of-the-loop version needs, for example crash-report fetching, version-to-commit mapping, or machines to reproduce on. Offer to set it up; that setup is often the real unlock.
- Pitch the bigger version so it feels possible: give an existence proof (someone already does this), and frame it as a cheap trial that may fail, e.g. run it alongside the current process.

## Depth: Work Like The Field's Best

Bar: keep going until the field's best might learn something from the result.

- Switch methods, not vocabulary. "Act as an expert" usually changes only the jargon. Name the instrument the best practitioner uses and use it: a database and statistical model instead of a markdown table, a profiler instead of guesses, primary sources instead of summaries.
- Start from the rawest material available: logs, raw exports, source code, original filings. Avoid pre-digested summaries.
- Test the beliefs built into the request. "We think churn is an onboarding problem" → try to reproduce that from raw data and say if it does not hold.
- Once deep in the data, look for new knowledge: the blind spot, the earliest signal nobody tracks. Example: simulate last year's customers from logs, find the earliest churn signal, validate it on data it has not seen.
- Turn vague quality asks into a specific hard target, and set a stretch target next to the user's (asked 5s → also measure against 200ms). Treat hard targets as solvable; do not call something impossible before trying. Report the distance to the stretch target.
- Use an outside judge, never self-grading. Prefer something runnable: tests, benchmarks, backtests, holdout data, a reproduction, a fresh-context reviewer. Decide the judge before starting.
- Deeper, not bigger: more rigor per claim, not more pages.

## Range: Borrow Other Fields

- Replace nouns with verbs. A business review is not "a deck"; it is "getting busy people to believe a cause-and-effect story and decide under uncertainty in 30 minutes." The verbs point to useful fields: journalism, editing, decision science.
- Assemble the crew the stakes justify. For a must-not-fail review: analyst, journalist, editor; a motion and audio designer if presented live; a short seller and forensic accountant as red team.
- Borrow their tools and media, not just their critique: a 3D render in Blender instead of a mood board, an interactive model instead of a static chart. This is where range pays off most.
- Use the crew as methods, not voices. Do what a short seller does to research a position (find the weakest number, the unstated dependency); do not write like one. No role-play transcripts.
- With subagents available, give each field its own pass with a concrete method and acceptance check, then merge findings only.

## Upgrade Mode Output

First answer in one line each:

1. What would a top professional do here that the request does not ask for?
2. What is the rawest material they would start from?
3. Which specific methods and tools would they use?
4. What, other than the model or the user, would show the result is right?

Then return:

```markdown
**Outcome behind the request:** <one line>

**Altitude version:** <rewritten prompt>
**Depth version:** <rewritten prompt>
**Range version:** <rewritten prompt naming fields and their methods>
**Recommended:** <combined prompt to approve or paste>

**Needs:** <access, data, tools, or setup that unlocks it>
**Judge:** <the outside check>
```

Each version must be a usable prompt, not commentary. Ask which to run.

## Lens Mode Output

At most these two lines before starting:

```markdown
Approach: <depth upgrade, e.g. raw exports + cohort model, checked by holdout backtest>.
Bigger version, if useful: <goal beyond the goal>; needs <access or setup>.
```

Then do the task. Report results against the outside judge and any stretch target.

## Source Notes

Sources for this page live in `sources.md#ambition`.
