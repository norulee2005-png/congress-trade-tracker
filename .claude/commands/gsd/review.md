---
name: gsd:review
description: Request cross-AI peer review of phase plans from external AI CLIs
argument-hint: "--phase N [--gemini] [--claude] [--codex] [--all]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

<objective>
Invoke external AI CLIs (Gemini, Claude, Codex) to independently review phase plans.
Produces a structured REVIEWS.md with per-reviewer feedback that can be fed back into
planning via /gsd:plan-phase --reviews.

**Flow:** Detect CLIs → Build review prompt → Invoke each CLI → Collect responses → Write REVIEWS.md
</objective>

<execution_context>
@/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/workflows/review.md
</execution_context>

<context>
Phase number: extracted from $ARGUMENTS (required)

**Flags:**
- `--gemini` — Include Gemini CLI review
- `--claude` — Include Claude CLI review (uses separate session)
- `--codex` — Include Codex CLI review
- `--all` — Include all available CLIs
</context>

<process>
Execute the review workflow from @/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/workflows/review.md end-to-end.
</process>
