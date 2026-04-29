import { useState } from "react";

import { fetchSolutions } from "./api/client";
import { Dashboard } from "./components/Dashboard";
import { ManifestForm } from "./components/ManifestForm";
import { PlanSelector } from "./components/PlanSelector";
import { TruckViewer } from "./components/TruckViewer";
import type { PackingPlan, SolveRequest, TruckSpec } from "./types";

type Tab = "manifest" | "results";

function App() {
  const [plans, setPlans]               = useState<PackingPlan[]>([]);
  const [selectedIdx, setSelectedIdx]   = useState(0);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [tab, setTab]                   = useState<Tab>("manifest");
  const [truckSpec, setTruckSpec]       = useState<TruckSpec>({
    W: 2400, L: 13600, H: 2440, payload_kg: 3000,
  });

  const selectedPlan = plans[selectedIdx] ?? null;

  async function handleSolve(req: SolveRequest) {
    setLoading(true);
    setError(null);
    setTruckSpec(req.truck);
    try {
      const results = await fetchSolutions(req);
      setPlans(results);
      setSelectedIdx(0);
      setTab("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Solve failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen grid grid-cols-[360px_1fr] bg-gray-950 text-gray-100 overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="border-r border-gray-800 flex flex-col overflow-hidden">

        {/* Logo */}
        <div className="px-4 py-3 border-b border-gray-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-900 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-blue-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M2 7.5L12 3l10 4.5v9L12 21 2 16.5v-9z" />
                <path d="M12 3v18M2 7.5l10 4.5 10-4.5" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest text-white uppercase">
                FLOW-3D
              </div>
              <div className="text-xs text-gray-600 -mt-0.5">Logistics DSS</div>
            </div>
          </div>
          <span className="text-xs font-mono text-gray-700 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
            v0.3
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 shrink-0">
          {(["manifest", "results"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold tracking-widest uppercase transition-all ${
                tab === t
                  ? "text-white border-b-2 border-blue-500"
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              {t === "manifest" ? (
                "Manifest"
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Results
                  {selectedPlan && (
                    <span className="px-1.5 py-px rounded-full bg-emerald-950 text-emerald-400 text-xs font-mono normal-case leading-none">
                      {Math.round(selectedPlan.v_util * 100)}%
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content — ManifestForm stays mounted to preserve form state */}
        <div className="flex-1 overflow-y-auto">
          <div className={tab === "manifest" ? "" : "hidden"}>
            <ManifestForm onSolve={handleSolve} loading={loading} />
          </div>
          {tab === "results" &&
            (plans.length > 0 ? (
              <>
                <PlanSelector
                  plans={plans}
                  selectedIdx={selectedIdx}
                  onSelect={setSelectedIdx}
                />
                <div className="border-t border-gray-800" />
                <Dashboard plan={selectedPlan!} />
              </>
            ) : (
              <div className="p-6 text-center text-sm text-gray-600">
                Run a solve to see results.
              </div>
            ))}
        </div>

        {error && (
          <div className="px-3 py-2 border-t border-red-900/50 bg-red-950/30 text-xs text-red-400 shrink-0 flex gap-2 items-start">
            <span className="shrink-0 mt-px">⚠</span>
            <span>{error}</span>
          </div>
        )}
      </aside>

      {/* ── Main viewer ─────────────────────────────────────────────────────── */}
      <main className="overflow-hidden">
        {selectedPlan ? (
          <TruckViewer
            plan={selectedPlan}
            truck={{ W: truckSpec.W, L: truckSpec.L, H: truckSpec.H }}
          />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm text-gray-300 font-medium">
                Solving packing plans…
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Generating 3 alternative plans
              </p>
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
      <div className="w-20 h-20 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-gray-700"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <path d="M2 7.5L12 3l10 4.5v9L12 21 2 16.5v-9z" />
          <path d="M12 3v18M2 7.5l10 4.5 10-4.5" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400">No packing plan loaded</p>
        <p className="text-xs text-gray-600 mt-1 max-w-sm">
          Fill in the cargo manifest on the left and click{" "}
          <span className="text-gray-400">Solve Packing Plan</span> to generate
          three alternative LIFO-compliant loading plans, each optimized for a
          different decision criterion.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 max-w-md w-full">
        <StrategyCard
          name="Optimal"
          tagline="Max utilization"
          tone="violet"
        />
        <StrategyCard
          name="Balanced"
          tagline="Fast & predictable"
          tone="teal"
        />
        <StrategyCard
          name="Stability"
          tagline="Low center of gravity"
          tone="amber"
        />
      </div>
    </div>
  );
}

type StrategyTone = "violet" | "teal" | "amber";

const TONE_CLASSES: Record<StrategyTone, { name: string; tag: string }> = {
  violet: { name: "text-violet-300", tag: "text-violet-400/60" },
  teal:   { name: "text-teal-300",   tag: "text-teal-400/60" },
  amber:  { name: "text-amber-300",  tag: "text-amber-400/60" },
};

function StrategyCard({
  name,
  tagline,
  tone,
}: {
  name: string;
  tagline: string;
  tone: StrategyTone;
}) {
  const c = TONE_CLASSES[tone];
  return (
    <div className="text-center px-2 py-2 rounded bg-gray-900 border border-gray-800">
      <div className={`text-xs font-bold ${c.name}`}>{name}</div>
      <div className={`text-xs mt-0.5 ${c.tag}`}>{tagline}</div>
    </div>
  );
}

export default App;
