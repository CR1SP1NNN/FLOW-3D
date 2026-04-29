import type { PackingPlan, SolveStrategy } from "../types";

const PLAN_LABELS = ["A", "B", "C"] as const;

// DSS strategy → user-facing name. Drives the bottom tag in each card.
const STRATEGY_NAMES: Record<SolveStrategy, string> = {
  optimal: "Optimal",
  balanced: "Balanced",
  stability: "Stability",
};

interface PlanSelectorProps {
  plans: PackingPlan[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
}

export function PlanSelector({ plans, selectedIdx, onSelect }: PlanSelectorProps) {
  return (
    <div className="px-4 py-3 space-y-2">
      <p className="text-xs text-gray-600">
        Select a plan to preview in the 3D viewer.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {plans.map((plan, i) => {
          const utilPct  = Math.round(plan.v_util * 100);
          const packed   = plan.placements.filter((p) => p.is_packed).length;
          const total    = plan.placements.length;
          const selected = i === selectedIdx;

          const barColor =
            utilPct >= 70 ? "#5DCAA5" : utilPct >= 40 ? "#FBBF24" : "#F0997B";

          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`flex flex-col items-start gap-1.5 rounded-lg border p-2.5 text-left transition-all focus:outline-none ${
                selected
                  ? "border-blue-500 bg-blue-950/30 ring-1 ring-blue-500/40"
                  : "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800/60"
              }`}
            >
              {/* Plan label + solver */}
              <div className="flex items-center justify-between w-full">
                <span className={`text-xs font-bold ${selected ? "text-blue-300" : "text-gray-300"}`}>
                  Plan {PLAN_LABELS[i]}
                </span>
                <span
                  className={`text-xs font-bold px-1 py-px rounded leading-none ${
                    plan.solver_mode === "ILP"
                      ? "bg-violet-950 text-violet-300"
                      : "bg-teal-950 text-teal-300"
                  }`}
                >
                  {plan.solver_mode}
                </span>
              </div>

              {/* Util percentage */}
              <div className="w-full">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-lg font-bold font-mono leading-none" style={{ color: barColor }}>
                    {utilPct}
                    <span className="text-xs text-gray-600">%</span>
                  </span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${utilPct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="w-full space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Packed</span>
                  <span className="font-mono text-gray-400">
                    {packed}/{total}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Time</span>
                  <span className="font-mono text-gray-400">{plan.t_exec_ms}ms</span>
                </div>
              </div>

              {/* Strategy name tag */}
              <div className={`text-xs ${selected ? "text-blue-400" : "text-gray-600"}`}>
                {STRATEGY_NAMES[plan.strategy] ?? plan.strategy}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
