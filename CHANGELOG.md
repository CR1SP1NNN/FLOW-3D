# FLOW-3D — Sprint Log & Changelog

Tracks all meaningful changes to the system by sprint. Update this file as part of
every commit that adds, removes, or changes a feature. Entries go under **Unreleased**
until the sprint is closed, then move to a dated sprint block.

---

## [Unreleased]

> Add new entries here as you work. Move to a sprint block when the sprint ends.

### Added
-

### Changed
-

### Fixed
-

### Removed
-

---

## Sprint 1 — 2026-04-24 · Project Bootstrap

**Goal:** Establish the full project scaffold so all members can run the system locally.

### Added
- `CLAUDE.md` — project guide covering variable naming (`x_i`, `l_i`, `w_i`, `V_util`,
  `s_ij_k`), JSON placement contract, constraint reference (section 3.5.2.1), and module
  separation rules
- `backend/solver/ilp_solver.py` — ILPSolver using Gurobi Branch-and-Bound (exact,
  O(2^n)); enforces Big-M non-overlap (section 3.5.2.1 B) and LIFO sequencing
  (section 3.5.2.1 E)
- `backend/solver/ffd_solver.py` — FFDSolver using Route-Sequential First-Fit
  Decreasing (heuristic, O(n²)); LIFO pre-sort by stop order
- `backend/core/validator.py` — ConstraintValidator: validates non-overlap Big-M
  (`s_ij_k`, k=1..6), boundary (W/L/H), orientation, and route-sequenced LIFO after
  every solve
- `backend/core/optimizer.py` — hybrid dispatch: routes to ILPSolver when
  `n ≤ SOLVER_THRESHOLD`, FFDSolver otherwise; always calls
  `ConstraintValidator.validate_all()`
- `backend/api/` — FastAPI routes and Pydantic models implementing the PackingPlan
  contract (`placements`, `v_util`, `t_exec_ms`, `solver_mode`, `unplaced_items`)
- `backend/tests/test_smoke.py` — smoke tests for both ILP and FFD solver paths
- `backend/requirements.txt`, `ruff.toml`, `pytest.ini`, `settings.py` — backend
  tooling and configuration
- `frontend/src/components/TruckViewer.tsx` — Three.js r165+ 3D truck loading viewer
- `frontend/src/components/Dashboard.tsx` — control panel and metrics display
- `frontend/src/api/client.ts` — API client consuming PackingPlan JSON from backend
- `frontend/src/types/index.ts` — TypeScript types mirroring PackingPlan contract
- `docs/mockPlan.json` — sample PackingPlan for offline frontend development
- `.env.example` — environment template (`USE_MOCK_SOLVER`, `SOLVER_THRESHOLD`,
  `REDIS_URL`, `DATABASE_URL`, `GUROBI_LICENSE_FILE`)
- `.gitignore` — ignores `venv/`, `__pycache__/`, `*.pyc`, `node_modules/`, `dist/`,
  Gurobi artefacts, and OS noise
- `.claude/commands/check-git-push.md` — pre-push gate slash command

### Changed
- `README.md` — expanded with cross-platform setup instructions for backend, frontend,
  Redis (Docker on Windows, Homebrew on macOS), and venv activation

---

<!--
  SPRINT TEMPLATE — copy this block for each new sprint
  -------------------------------------------------------

## Sprint N — YYYY-MM-DD · <Sprint Goal>

**Goal:** One sentence describing what this sprint was meant to deliver.

### Added
-

### Changed
-

### Fixed
-

### Removed
-

-->
