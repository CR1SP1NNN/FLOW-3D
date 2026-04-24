# FLOW-3D — Sprint Log & Changelog

Tracks all meaningful changes to the system by sprint. Update this file as part of
every commit that adds, removes, or changes a feature. Entries go under **Unreleased**
until the sprint is closed, then move to a dated sprint block.

---

## [Unreleased]

> Add new entries here as you work. Move to a sprint block when the sprint ends.

---

## Sprint 2 — 2026-04-24 · Live ILP Model and ConstraintValidator

**Goal:** Implement the complete Gurobi ILP formulation (constraints A–E plus Rigid
Orientation) and the independent ConstraintValidator, replacing all solver stubs with
production-ready code.

### Added

**Backend**
- `backend/solver/ilp_solver.py`: Implement live Gurobi ILP model — `_variable_domains()`
  defines `b_i ∈ {0,1}`, `s_ij,k ∈ {0,1}` (k=1..6), and integer-mm coordinates
  `x_i, y_i, z_i ≥ 0` bounded by `W`, `L`, `H`.
  Thesis ref: section 3.5.2.1 D
- `backend/solver/ilp_solver.py`: Implement `_boundary()` — enforces `x_i+w_i ≤ W·b_i`,
  `y_i+l_i ≤ L·b_i`, `z_i+h_i ≤ H·b_i`; unpacked items (`b_i=0`) are pinned to the
  origin because `w_i`, `l_i`, `h_i` are strictly positive.
  Thesis ref: section 3.5.2.1 C
- `backend/solver/ilp_solver.py`: Implement `_non_overlap()` — Big-M disjunctive
  separation across 6 spatial planes using axis-specific constants `M_x=W`, `M_y=L`,
  `M_z=H` (tighter LP relaxation than a single global M); adds activation constraint
  `∑s_ij,k ≥ b_i + b_j − 1`.
  Thesis ref: section 3.5.2.1 B
- `backend/solver/ilp_solver.py`: Implement `_lifo()` — Sequential Loading Constraint
  `y_i + l_i ≤ y_j + L·(2 − b_i − b_j)` for every ordered pair where
  `stop_i > stop_j`; the `L·(2 − b_i − b_j)` slack gate ensures unpacked items do
  not pin packed items' `y_i` coordinates.
  Thesis ref: section 3.5.2.1 E
- `backend/solver/ilp_solver.py`: Implement Rigid Orientation (`_orientation()`) —
  adds 6 binary variables `o_i,k` per item; `∑o_i,k = b_i` selects exactly one
  orientation when packed; `side_up=True` restricts `o_i,k` to upright set `{0,1}`
  (original `h_i` stays along truck z-axis). `_effective_dims()` linearizes the
  6-permutation `ORIENTATION_PERMUTATIONS` table so `w_eff`, `l_eff`, `h_eff` replace
  constants in `_boundary()`, `_non_overlap()`, and `_lifo()`.
  Thesis ref: section 3.5.2.1 (Rigid Orientation)
- `backend/solver/ilp_solver.py`: Implement `_objective()` — maximizes
  `V_util = ∑(v_i · b_i) / (W·L·H)`; denominator is a positive constant so the
  numerator is maximized directly; coefficients are normalised to `[0,1]` to avoid
  Gurobi large-coefficient numerical warnings.
  Thesis ref: section 3.5.2.1 A
- `backend/solver/ilp_solver.py`: Implement `_extract_plan()` — reads `b_i.X`,
  `o_i,k.X`, and `x_i/y_i/z_i.X` from the solved model; emits actual
  `orientation_index` and effective `(w, l, h)` on each `Placement` so downstream
  consumers (frontend, validator) need no re-computation.
- `backend/core/validator.py`: Implement `validate_non_overlap()` — O(n²) pairwise
  scan over packed placements; passes when at least one of the six axis-aligned
  separation conditions holds for every pair.
  Thesis ref: section 3.5.2.1 B
- `backend/core/validator.py`: Implement `validate_boundary()` — rejects any packed
  placement where `x_i < 0`, or `x_i+w_i > W`, `y_i+l_i > L`, `z_i+h_i > H`.
  Thesis ref: section 3.5.2.1 C
- `backend/core/validator.py`: Implement `validate_lifo()` — O(n²) check that every
  packed pair with `stop_i > stop_j` satisfies `y_i + l_i ≤ y_j`.
  Thesis ref: section 3.5.2.1 E
- `backend/core/validator.py`: Implement `validate_orientation()` — asserts
  `orientation_index ∈ [0,5]` for every placement; `side_up` upright enforcement is
  delegated to the solver's `_orientation()` constraints (the placement-only view
  cannot recover the manifest `side_up` flag).
  Thesis ref: section 3.5.2.1 (Rigid Orientation)
- `backend/tests/test_validator.py`: Add 9 pytest cases for `ConstraintValidator` —
  covers happy path (mockPlan.json passes all checks), targeted failures for each of
  the four check types, touching-face boundary for non-overlap, and the rule that
  unpacked placements are skipped by all spatial checks.

### Changed

- `README.md`: Expand cross-platform setup instructions; updated with latest project
  structure and development workflow details.

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
- `backend/core/validator.py` — ConstraintValidator scaffold: stub methods for
  non-overlap Big-M (`s_ij_k`, k=1..6), boundary conditions (`x_i+w_i ≤ W`,
  `y_i+l_i ≤ L`, `z_i+h_i ≤ H`), orientation admissibility, and route-sequenced
  LIFO (all returning `True` pending implementation).
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
