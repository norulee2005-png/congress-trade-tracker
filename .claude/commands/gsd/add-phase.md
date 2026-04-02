---
name: gsd:add-phase
description: Add phase to end of current milestone in roadmap
argument-hint: <description>
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Add a new integer phase to the end of the current milestone in the roadmap.

Routes to the add-phase workflow which handles:
- Phase number calculation (next sequential integer)
- Directory creation with slug generation
- Roadmap structure updates
- STATE.md roadmap evolution tracking
</objective>

<execution_context>
@/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/workflows/add-phase.md
</execution_context>

<context>
Arguments: $ARGUMENTS (phase description)

Roadmap and state are resolved in-workflow via `init phase-op` and targeted tool calls.
</context>

<process>
**Follow the add-phase workflow** from `@/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/workflows/add-phase.md`.

The workflow handles all logic including:
1. Argument parsing and validation
2. Roadmap existence checking
3. Current milestone identification
4. Next phase number calculation (ignoring decimals)
5. Slug generation from description
6. Phase directory creation
7. Roadmap entry insertion
8. STATE.md updates
</process>
