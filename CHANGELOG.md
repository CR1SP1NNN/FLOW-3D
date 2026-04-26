# FLOW-3D — Sprint Log & Changelog

Tracks all meaningful changes to the system by sprint. Update this file as part of
every commit that adds, removes, or changes a feature. Entries go under **Unreleased**
until the sprint is closed, then move to a dated sprint block.

---

## [Unreleased]

> Add new entries here as you work. Move to a sprint block when the sprint ends.

---

## Sprint 2 — 2026-04-27 · Frontend UI — Manifest Form, 3D Hover, Multi-Plan Comparison

**Goal:** Deliver a fully interactive frontend: a complete cargo manifest input form,
hover tooltips on 3D-packed items, and a three-plan comparison selector so users can
evaluate trade-offs between ILP and FFD solver outputs.

### Added

**Frontend**
- `frontend/src/components/ManifestForm.tsx` — new full manifest input component with
  truck spec editor, stops editor, and per-item add/validate/delete; pre-populated with
  5 furniture items across 3 delivery stops for thesis demo.
- `frontend/src/components/PlanSelector.tsx` — new 3-card comparison panel showing
  `V_util` colour bar, packed/total count, `T_exec`, and solver mode badge for each
  alternative plan; selected card highlighted with a blue ring.
- `frontend/src/components/TruckViewer.tsx` — `THREE.Raycaster` `mousemove` handler;
  each item mesh stores its `Placement` in `mesh.userData`; renders an `ItemTooltip`
  overlay showing `item_id`, `w_i × l_i × h_i`, volume (m³), position (`x_i`, `y_i`,
  `z_i`), `orientation_index`, and `stop_id` colour dot; tooltip auto-flips left when
  cursor is past 60 % of canvas width.
  Thesis ref: section 3.5.2.1 — Placement contract (`x_i`, `y_i`, `z_i`, `w_i`,
  `l_i`, `h_i`, `orientation_index`, `stop_id`)
- `frontend/src/components/TruckViewer.tsx` — camera position and `OrbitControls`
  target persisted in `useRef` across scene rebuilds so orbit state survives
  3D ↔ Exploded ↔ Labels mode switches.
- `frontend/src/components/Dashboard.tsx` — LIFO load-sequence panel groups packed
  items by descending `stop_id` (highest loaded first, sits nearest rear); colour-coded
  `V_util` progress bar (green ≥ 70 %, amber ≥ 40 %, red below); ILP/FFD solver mode
  badge; amber callout for `unplaced_items`.
  Thesis ref: section 3.5.2.1 E — Route-Sequenced LIFO (`stop_i > stop_j → y_i + l_i ≤ y_j`)
- `frontend/src/api/client.ts` — `fetchSolutions(request): Promise<PackingPlan[]>`
  returns 3 alternative plans; real mode makes 3 parallel requests, mock mode returns
  `mockPlans` array.
- `frontend/src/data/mockPlan.ts` — added `mockPlanB` (FFD, `V_util` 0.41, `T_exec`
  23 ms, right-shifted layout) and `mockPlanC` (FFD, `V_util` 0.39, `T_exec` 15 ms,
  `bookshelf_01` unplaced) exported as `mockPlans: PackingPlan[]`.
- `frontend/src/App.tsx` — replaced single `plan: PackingPlan | null` state with
  `plans: PackingPlan[]` and `selectedIdx: number`; wires `fetchSolutions`; mounts
  `PlanSelector` above `Dashboard` in Results tab; loading copy updated to reflect
  "Generating 3 alternative plans".

---

## Sprint 1 — 2026-04-24 · Project Bootstrap

**Goal:** Establish the full project scaffold so all members can run the system locally
and put developer tooling (pre-push gate, changelog, slash commands) in place.

### Added

**Backend**
- `backend/solver/ilp_solver.py` — ILPSolver using Gurobi Branch-and-Bound (exact,
  O(2^n)); enforces non-overlap Big-M constraints (`s_ij_k`, k=1..6) and route-sequenced
  LIFO (`y_i + l_i <= y_j` when `stop_i > stop_j`).
  Thesis ref: section 3.5.2.1 B, E
- `backend/solver/ffd_solver.py` — FFDSolver using Route-Sequential First-Fit
  Decreasing (heuristic, O(n²)); items pre-sorted by descending stop order before
  placement to maintain LIFO along the Y-axis.
  Thesis ref: section 3.5.2.1 E
- `backend/core/validator.py` — ConstraintValidator: verifies non-overlap Big-M
  (`s_ij_k`, k=1..6), boundary conditions (`x_i+w_i ≤ W`, `y_i+l_i ≤ L`,
  `z_i+h_i ≤ H`), orientation admissibility, and route-sequenced LIFO after every solve.
  Thesis ref: section 3.5.2.1 B, C, E
- `backend/core/optimizer.py` — hybrid dispatch: routes to ILPSolver when
  `n ≤ SOLVER_THRESHOLD`, FFDSolver otherwise; always calls
  `ConstraintValidator.validate_all()` on the result.
- `backend/api/models.py` — Pydantic models implementing the full Placement and
  PackingPlan contracts (`item_id`, `x`, `y`, `z`, `w`, `l`, `h`,
  `orientation_index`, `stop_id`, `is_packed`, `v_util`, `t_exec_ms`, `solver_mode`,
  `unplaced_items`).
- `backend/api/routes.py` — FastAPI routes exposing the solver pipeline to the frontend.
- `backend/tests/test_smoke.py` — smoke tests covering both ILP and FFD solver paths.
- `backend/requirements.txt`, `ruff.toml`, `pytest.ini`, `settings.py` — backend
  dependency manifest, linter config, test config, and environment settings.

**Frontend**
- `frontend/src/components/TruckViewer.tsx` — Three.js r165+ interactive 3D truck
  loading viewer; renders each Placement using `x`, `y`, `z`, `w`, `l`, `h` coordinates
  (millimetres) and colour-codes items by `stop_id`.
- `frontend/src/components/Dashboard.tsx` — control panel displaying `v_util`,
  `t_exec_ms`, `solver_mode`, and the list of `unplaced_items` from PackingPlan.
- `frontend/src/api/client.ts` — typed API client consuming PackingPlan JSON from the
  FastAPI backend.
- `frontend/src/types/index.ts` — TypeScript interfaces mirroring the Placement and
  PackingPlan contracts.
- `frontend/src/data/mockPlan.ts` — mock PackingPlan for offline frontend development.
- `docs/mockPlan.json` — reference sample PackingPlan JSON used for manual testing.

**Config & Tooling**
- `CLAUDE.md` — project guide covering mandatory variable naming (`x_i`, `l_i`, `w_i`,
  `h_i`, `V_util`, `s_ij_k`, `b_i`, `L`, `W`, `H`, `T_exec`), JSON placement contract,
  constraint reference, module separation rules, and cross-platform commands.
- `.env.example` — environment variable template (`USE_MOCK_SOLVER`, `SOLVER_THRESHOLD`,
  `REDIS_URL`, `DATABASE_URL`, `GUROBI_LICENSE_FILE`).
- `.gitignore` — ignores `venv/`, `__pycache__/`, `*.pyc`, `node_modules/`, `dist/`,
  `.vite/`, Gurobi artefacts (`gurobi.log`, `*.rlp`), OS noise, and
  `.claude/settings.local.json`.
- `.claude/commands/check-git-push.md` — `/check-git-push` slash command: five-phase
  pre-push gate covering .gitignore audit, lint, tests, type check, secret scan,
  conflict markers, large-file check, and commit message generation.
- `.claude/commands/update-changelog.md` — `/update-changelog` slash command: reads
  git log, classifies commits by conventional-commit type, updates CHANGELOG.md sprint
  blocks, and proposes a semver git tag.
- `CHANGELOG.md` — this file; sprint log and developer changelog.

### Changed

- `README.md` — expanded with cross-platform setup instructions for backend (Windows
  and macOS venv activation), frontend (Node/npm), and Redis (Docker on Windows,
  Homebrew on macOS).

---

<!--
  SPRINT TEMPLATE — copy this block for each new sprint
  -------------------------------------------------------

## Sprint N — YYYY-MM-DD · <Sprint Goal>

**Goal:** One sentence describing what this sprint was meant to deliver.

### Added

**Backend**
-

**Frontend**
-

**Config & Tooling**
-

### Changed
-

### Fixed
-

### Removed
-

-->
