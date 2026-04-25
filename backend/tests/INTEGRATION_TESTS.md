# Integration tests for `/api/solve`

This document describes the end-to-end HTTP tests in
[`test_integration_solve.py`](./test_integration_solve.py). They are the
first tests in the suite that exercise the **full request pipeline with
`USE_MOCK_SOLVER=False`** — i.e. the real FFDSolver and ILPSolver run
against live data, the `AbstractSolver.solve()` template-method safety
net invokes `ConstraintValidator`, and the `PackingPlan` JSON contract
round-trips through FastAPI.

The unit tests in `test_ffd_solver.py` and `test_validator.py` cover
solver and validator internals; these tests answer a different question:
*does the deployed pipeline behave correctly when wired together?*

## Scope

| Layer              | Covered? | Tested via                                          |
| ------------------ | -------- | --------------------------------------------------- |
| FastAPI routing    | Yes      | `httpx.ASGITransport` + `AsyncClient`               |
| Pydantic contract  | Yes      | `PackingPlan(**response.json()["plan"])`            |
| OptimizationEngine | Yes      | `_engine.threshold` overridden per test             |
| FFDSolver          | Yes      | `force_ffd` fixture pins threshold to 0             |
| ILPSolver          | Yes      | `force_ilp` fixture pins threshold to 1000          |
| ConstraintValidator| Yes      | Auto-runs in `AbstractSolver.solve`; re-checked client side |

## Fixtures

- **`live_solver`** — patches `solver.ffd_solver.USE_MOCK_SOLVER` and
  `solver.ilp_solver.USE_MOCK_SOLVER` to `False` for the duration of one
  test. Required because the default `.env` ships with
  `USE_MOCK_SOLVER=True` so frontend developers without a Gurobi license
  can still run the API.
- **`force_ffd` / `force_ilp`** — temporarily mutate the module-level
  `_engine.threshold` (the `OptimizationEngine` instance constructed at
  import time in `api/routes.py`). This is the cleanest way to dispatch
  small manifests to either path without sending hundreds of items.
  Each fixture restores the original value in a `finally` block.
- **`client`** — an `httpx.AsyncClient` bound to the FastAPI app via
  `ASGITransport`, so tests run in-process without a real network port.

## Test plan

### 1. `test_ffd_solve_round_trip_validates`

POSTs a four-item, three-stop manifest, GETs the result, and asserts:

- HTTP 200 on both calls.
- `body["status"] == "done"`.
- `plan.solver_mode == "FFD"`.
- `plan.unplaced_items == []`.
- `0.0 <= v_util <= 1.0` and `t_exec_ms >= 0`.
- All four items appear in `placements`.
- `ConstraintValidator().validate_all(plan, truck) is True` — a
  client-side re-check that the safety net inside `AbstractSolver.solve`
  is doing its job before the plan reaches the API layer.

This is the canonical "happy path" test: if it fails, the FFD pipeline
is broken end-to-end.

### 2. `test_ffd_lifo_orders_later_stops_deeper_in_y`

Sends three single-stop items at stops 1, 2, 3 and asserts the
**Sequential Loading Constraint** from thesis section 3.5.2.1 E:

> if `stop_i > stop_j`: `y_i + l_i <= y_j`

i.e. items destined for later drops sit deeper along the Y axis (`y = 0`
is the truck rear, `y = L` is the loading door). This exercises the
spatial-not-just-temporal interpretation of LIFO that the thesis
mandates and that `validator.validate_lifo` enforces.

### 3. `test_ffd_records_unplaced_when_item_cannot_fit`

Submits an oversized `side_up` item alongside a normal item. Asserts:

- The oversize item lands in `unplaced_items` rather than crashing the
  request (i.e. the FFD's "fail every candidate" branch is reachable
  through HTTP).
- The fitting item is still placed.

This guards against a regression where a single unplaceable item could
abort the whole solve.

### 4. `test_ffd_side_up_item_keeps_h_on_z_axis`

Submits a single rigid item (`side_up=True`, `h=1700`). Asserts the
returned `orientation_index ∈ {0, 1}` (`UPRIGHT_ORIENTATIONS`) and
`placement.h == 1700`. This is the end-to-end check for the
**Rigid Orientation** constraint: refrigerators and wardrobes must not
be tipped onto their sides.

### 5. `test_ilp_solve_round_trip_validates`

ILP-path counterpart to test 1. Skipped with
`pytest.importorskip`-style guard (`_gurobi_available()`) when:

- `gurobipy` is not installed, or
- a Gurobi license is missing / expired (probed by solving a 1-variable
  model at collection time).

This is intentional: three of four team members run Windows without a
local Gurobi license, and CI may not either. The ILP path still has
unit-level coverage in `test_validator.py` and in any future
`test_ilp_solver.py`.

When it runs, it asserts `plan.solver_mode == "ILP"` and re-validates
the plan client-side, confirming that the Gurobi-built model honours
the same constraints the validator checks.

## Running

```bash
cd backend
python -m pytest tests/test_integration_solve.py -v
```

To run only the FFD subset (e.g. on a machine without Gurobi):

```bash
python -m pytest tests/test_integration_solve.py -v -k "ffd"
```

## Why these tests live separately from `test_smoke.py`

`test_smoke.py` exists to prove the API responds with a well-formed
shell — it intentionally runs against the mock so it stays green on
laptops without a Gurobi licence. The integration suite is the opposite
contract: it forces the real solvers on, so any regression in the
solver → validator → API hand-off surfaces here before it reaches the
frontend.
