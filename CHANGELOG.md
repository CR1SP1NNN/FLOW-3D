# FLOW-3D — Sprint Log & Changelog

Tracks all meaningful changes to the system by sprint. Update this file as part of
every commit that adds, removes, or changes a feature. Entries go under **Unreleased**
until the sprint is closed, then move to a dated sprint block.

---

## [Unreleased]

> Add new entries here as you work. Move to a sprint block when the sprint ends.

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
