# Pendências

Itens em aberto do dono, um arquivo por item, no formato de `plugins/wh/skills/implementation/PENDING.md` do plugin `wh` (copiado abaixo). É a entrada do `/wh:implementation`.

## Format

```markdown
---
id: P-NNN
status: open | in progress | dropped
created: YYYY-MM-DD
related: [P-NNN, …]
---

# <Title: what changes, in one line>

## Problem
What is missing or wrong today, and how it shows up. Owner's words when they exist.

## Strategy
The proposed direction, as numbered steps. Alternatives considered and why they lost, when there are any.

## Locations
Where the change happens, one line per place, each with its role in the change:
- `path:line` (§ Section) — what changes there

## Code references
Symbols the change touches or depends on, resolved by CodeGraph (`codegraph explore`) or the prompt-graph hook:
- `Symbol` `path:line` — role

## Other references
Docs, test-drive reports, runs, decisions that explain the item.

## Open questions
What the owner still decides, one `- <question>` per line; an answered one stays, as `- <question> → <answer> (owner, <date>)`. `—` when nothing.
```

