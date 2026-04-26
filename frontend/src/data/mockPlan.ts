import mockPlanJson from "../../../docs/mockPlan.json";
import type { PackingPlan } from "../types";

export const mockPlan: PackingPlan = mockPlanJson as PackingPlan;

// Plan B — FFD heuristic, same items rearranged
const mockPlanB: PackingPlan = {
  v_util: 0.41,
  t_exec_ms: 23,
  solver_mode: "FFD",
  unplaced_items: [],
  placements: [
    { item_id: "wardrobe_01",    x: 1200, y: 0,    z: 0, w: 1200, l: 600, h: 1800, orientation_index: 0, stop_id: 3, is_packed: true },
    { item_id: "desk_01",        x: 0,    y: 0,    z: 0, w: 1000, l: 600, h: 750,  orientation_index: 0, stop_id: 3, is_packed: true },
    { item_id: "dining_table_01",x: 0,    y: 600,  z: 0, w: 1500, l: 900, h: 750,  orientation_index: 0, stop_id: 2, is_packed: true },
    { item_id: "sofa_01",        x: 400,  y: 1500, z: 0, w: 2000, l: 900, h: 850,  orientation_index: 0, stop_id: 1, is_packed: true },
    { item_id: "bookshelf_01",   x: 1600, y: 2400, z: 0, w: 800,  l: 300, h: 1800, orientation_index: 0, stop_id: 1, is_packed: true },
  ],
};

// Plan C — FFD fast, bookshelf_01 cannot be packed (capacity constraint hit)
const mockPlanC: PackingPlan = {
  v_util: 0.39,
  t_exec_ms: 15,
  solver_mode: "FFD",
  unplaced_items: ["bookshelf_01"],
  placements: [
    { item_id: "wardrobe_01",    x: 0,    y: 0,    z: 0, w: 1200, l: 600, h: 1800, orientation_index: 0, stop_id: 3, is_packed: true  },
    { item_id: "desk_01",        x: 1200, y: 0,    z: 0, w: 1000, l: 600, h: 750,  orientation_index: 0, stop_id: 3, is_packed: true  },
    { item_id: "dining_table_01",x: 0,    y: 600,  z: 0, w: 1500, l: 900, h: 750,  orientation_index: 0, stop_id: 2, is_packed: true  },
    { item_id: "sofa_01",        x: 0,    y: 1500, z: 0, w: 2000, l: 900, h: 850,  orientation_index: 0, stop_id: 1, is_packed: true  },
    { item_id: "bookshelf_01",   x: 0,    y: 0,    z: 0, w: 800,  l: 300, h: 1800, orientation_index: 0, stop_id: 1, is_packed: false },
  ],
};

export const mockPlans: PackingPlan[] = [mockPlan, mockPlanB, mockPlanC];
