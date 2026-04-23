# /update-changelog

Reads the full git log, converts every commit into structured developer documentation,
updates `CHANGELOG.md`, and creates a git tag for the sprint or version being closed.

Work through all four phases in order.

---

## Phase 1 — Collect git history

Run all of these and hold the output in context:

```bash
git log --pretty=format:"%H|%ad|%s|%an" --date=short
git tag --sort=-version:refname
git diff --cached --name-only
git status --short
```

Also read the current `CHANGELOG.md` so you know what is already documented and where
the `[Unreleased]` section ends.

---

## Phase 2 — Classify every commit

For each commit returned by `git log`, do the following:

### 2a. Parse the commit type from the conventional-commit prefix

| Prefix in subject | Changelog section |
| ----------------- | ----------------- |
| `feat`            | Added             |
| `fix`             | Fixed             |
| `refactor`        | Changed           |
| `style`           | Changed           |
| `docs`            | Changed           |
| `chore`           | Changed           |
| `test`            | Added             |
| `perf`            | Changed           |
| No prefix / free text | infer from subject wording: "add/create/implement" → Added, "fix/correct/resolve" → Fixed, "remove/delete/drop" → Removed, everything else → Changed |

### 2b. Extract the scope and build a human-readable bullet

Use this template for each bullet:

```
- `<scope or file>`: <imperative sentence describing the change>.
  Thesis ref: section <X.X.X> — <constraint or algorithm> (omit if not applicable)
```

Rules:
- Use thesis variable names (`x_i`, `l_i`, `w_i`, `h_i`, `V_util`, `s_ij_k`, `b_i`,
  `L`, `W`, `H`, `T_exec`) when the change touches solver or coordinate logic.
- If a Placement or PackingPlan contract field was added, renamed, or removed, state the
  old and new name/type explicitly.
- If the commit message already has a bullet list in the body, expand each bullet into
  its own changelog line.
- Merge trivial commits (e.g. "fix typo", "fix whitespace") into the nearest related
  entry rather than creating standalone lines.

### 2c. Group commits by sprint

A sprint boundary is one of:
1. An existing git tag (e.g. `v0.1.0`, `sprint-1`).
2. A cluster of commits that share a coherent theme and span ≤ 2 calendar weeks.
3. A commit whose subject contains "sprint", "milestone", or "release".

If no tag exists yet, group all undocumented commits into the current sprint block.

---

## Phase 3 — Update CHANGELOG.md

### 3a. Structure rules

The file must always follow this layout (do not change the header or template comment):

```
# FLOW-3D — Sprint Log & Changelog

<intro paragraph — do not modify>

---

## [Unreleased]
> Add new entries here as you work. Move to a sprint block when the sprint ends.
### Added / Changed / Fixed / Removed
(entries for work not yet tagged)

---

## Sprint N — YYYY-MM-DD · <sprint goal title>
**Goal:** <one sentence>
### Added / Changed / Fixed / Removed
(entries)

---

## Sprint N-1 — ...
...
```

### 3b. Placement rules

- Commits that already appear in an existing dated sprint block must NOT be duplicated.
- Commits newer than the latest tag go into `[Unreleased]` if they have not been
  grouped into a sprint yet.
- When closing a sprint (the user asks to tag a version), move all `[Unreleased]`
  entries into a new dated sprint block and clear `[Unreleased]`.
- Omit empty sections (e.g. do not write `### Removed\n-` if nothing was removed).
- Sort entries within each section: solver/backend first, frontend second, config/docs last.

### 3c. Write the updated file

Produce the complete updated `CHANGELOG.md` and write it using the Write tool.
Do not summarise — write the full file every time.

---

## Phase 4 — Git tagging

### 4a. Determine the next tag

Look at existing tags from Phase 1. Apply semver:
- `feat` commits since last tag → bump **minor** (0.X.0)
- Only `fix`, `style`, `docs`, `chore` commits since last tag → bump **patch** (0.0.X)
- Any commit with `Breaking change:` in its footer → bump **major** (X.0.0)
- If no tags exist at all, start at `v0.1.0`.

Map sprint tags to versions:
- `sprint-1` = `v0.1.0`, `sprint-2` = `v0.2.0`, etc.

### 4b. Propose the tag to the user

Output the proposed tag and the one-line annotation before running any git command:

```
Proposed tag:  v0.2.0
Annotation:    "Sprint 2 — ILP solver + ConstraintValidator complete"
```

Ask the user to confirm before running:

```bash
git tag -a v0.2.0 -m "Sprint 2 — ILP solver + ConstraintValidator complete"
```

Do NOT push the tag automatically. After creating it locally, tell the user to run:

```bash
git push origin v0.2.0
```

---

## Phase 5 — Final report

Output a structured summary in this format:

```
══════════════════════════════════════════════
  FLOW-3D — Changelog Update
══════════════════════════════════════════════

COMMITS PROCESSED:   <N>
ALREADY DOCUMENTED:  <N>
NEW ENTRIES ADDED:   <N>

── Sections updated ──────────────────────────
  [Unreleased]   <N> entries
  Sprint <N>     <N> entries  (new block)  |  (existing, appended)

── Git tag ───────────────────────────────────
  Proposed:  <tag>  "<annotation>"
  Status:    awaiting your confirmation

── Next steps ────────────────────────────────
  1. Review CHANGELOG.md and adjust any bullet wording.
  2. Confirm the tag above (yes/no).
  3. Stage and commit: git add CHANGELOG.md && git commit -m "docs(config): update changelog for <tag>"
  4. Push tag after commit: git push origin <tag>
══════════════════════════════════════════════
```
