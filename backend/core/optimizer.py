"""Hybrid ILP/FFD dispatcher (thesis section 3.5.2.3).

OptimizationEngine.optimize() counts the manifest and routes to the correct
solver based on SOLVER_THRESHOLD. The post-solve `ConstraintValidator` run
is performed inside `AbstractSolver.solve()` itself (template method), so a
solver cannot return an unchecked plan to this layer.

When gurobipy is not installed or no valid licence is present, the engine
automatically degrades to FFD for all manifest sizes so the system stays
fully operational without a Gurobi licence.
"""

from __future__ import annotations

import logging
from typing import List

from api.models import FurnitureItem, PackingPlan, TruckSpec
from settings import SOLVER_THRESHOLD
from solver.ffd_solver import FFDSolver
from solver.ilp_solver import ILPSolver

_log = logging.getLogger(__name__)

try:
    import gurobipy  # noqa: F401
    _GUROBI_AVAILABLE = True
except Exception:
    _GUROBI_AVAILABLE = False
    _log.warning("gurobipy unavailable — ILP path disabled, all manifests use FFD")


class OptimizationEngine:
    """Decision controller that picks the active solver per manifest size."""

    def __init__(self) -> None:
        self.threshold: int = SOLVER_THRESHOLD
        self._ilp: ILPSolver = ILPSolver()
        self._ffd: FFDSolver = FFDSolver()

    def get_active_algorithm(self, n: int) -> str:
        """Return 'ILP' if Gurobi is available and n <= threshold, else 'FFD' (thesis 3.5.2.3)."""
        if _GUROBI_AVAILABLE and n <= self.threshold:
            return "ILP"
        return "FFD"

    def optimize(
        self, items: List[FurnitureItem], truck: TruckSpec
    ) -> PackingPlan:
        mode = self.get_active_algorithm(len(items))
        if mode == "ILP":
            try:
                return self._ilp.solve(items, truck)
            except Exception as exc:
                _log.warning("ILP solver failed (%s) — falling back to FFD", exc)
        return self._ffd.solve(items, truck)
