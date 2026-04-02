---
name: gsd:new-milestone
description: Start a new milestone cycle — update PROJECT.md and route to requirements
argument-hint: "[milestone name, e.g., 'v1.1 Notifications']"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
---
<objective>
Start a new milestone: questioning → research (optional) → requirements → roadmap.

Brownfield equivalent of new-project. Project exists, PROJECT.md has history. Gathers "what's next", updates PROJECT.md, then runs requirements → roadmap cycle.

**Creates/Updates:**
- `.planning/PROJECT.md` — updated with new milestone goals
- `.planning/research/` — domain research (optional, NEW features only)
- `.planning/REQUIREMENTS.md` — scoped requirements for this milestone
- `.planning/ROADMAP.md` — phase structure (continues numbering)
- `.planning/STATE.md` — reset for new milestone

**After:** `/gsd:plan-phase [N]` to start execution.
</objective>

<execution_context>
@/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/workflows/new-milestone.md
@/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/references/questioning.md
@/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/references/ui-brand.md
@/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/templates/project.md
@/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/templates/requirements.md
</execution_context>

<context>
Milestone name: $ARGUMENTS (optional - will prompt if not provided)

Project and milestone context files are resolved inside the workflow (`init new-milestone`) and delegated via `<files_to_read>` blocks where subagents are used.
</context>

<process>
Execute the new-milestone workflow from @/Users/shawn/.paperclip/instances/default/projects/ba9cc033-a0ef-4b13-8f2e-e82d2412aaf1/0bd2e8ef-12aa-418c-950f-da6f8b70fe63/_default/congress-trade-tracker/.claude/get-shit-done/workflows/new-milestone.md end-to-end.
Preserve all workflow gates (validation, questioning, research, requirements, roadmap approval, commits).
</process>
