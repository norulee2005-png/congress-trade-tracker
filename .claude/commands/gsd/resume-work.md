---
name: gsd:resume-work
description: Resume work from previous session with full context restoration
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
  - SlashCommand
---

<objective>
Restore complete project context and resume work seamlessly from previous session.

Routes to the resume-project workflow which handles:

- STATE.md loading (or reconstruction if missing)
- Checkpoint detection (.continue-here files)
- Incomplete work detection (PLAN without SUMMARY)
- Status presentation
- Context-aware next action routing
  </objective>

<execution_context>
@/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/workflows/resume-project.md
</execution_context>

<process>
**Follow the resume-project workflow** from `@/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/workflows/resume-project.md`.

The workflow handles all resumption logic including:

1. Project existence verification
2. STATE.md loading or reconstruction
3. Checkpoint and incomplete work detection
4. Visual status presentation
5. Context-aware option offering (checks CONTEXT.md before suggesting plan vs discuss)
6. Routing to appropriate next command
7. Session continuity updates
   </process>
