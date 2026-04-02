---
name: gsd:insert-phase
description: Insert urgent work as decimal phase (e.g., 72.1) between existing phases
argument-hint: <after> <description>
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Insert a decimal phase for urgent work discovered mid-milestone that must be completed between existing integer phases.

Uses decimal numbering (72.1, 72.2, etc.) to preserve the logical sequence of planned phases while accommodating urgent insertions.

Purpose: Handle urgent work discovered during execution without renumbering entire roadmap.
</objective>

<execution_context>
@/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/workflows/insert-phase.md
</execution_context>

<context>
Arguments: $ARGUMENTS (format: <after-phase-number> <description>)

Roadmap and state are resolved in-workflow via `init phase-op` and targeted tool calls.
</context>

<process>
Execute the insert-phase workflow from @/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/workflows/insert-phase.md end-to-end.
Preserve all validation gates (argument parsing, phase verification, decimal calculation, roadmap updates).
</process>
