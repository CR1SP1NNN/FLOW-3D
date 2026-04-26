import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { PackingPlan, Placement } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** 1 Three.js unit = 10 mm → truck ≈ 240 × 244 × 1360 units */
const MM_PER_UNIT = 10;

/** Stop colours — index 0 = stop_id 1 */
const STOP_PALETTE: number[] = [
  0xf0997b, // stop 1 — warm orange (nearest door)
  0x5dcaa5, // stop 2 — teal
  0xafa9ec, // stop 3 — soft purple
  0x60a5fa, // stop 4 — blue
  0xfbbf24, // stop 5 — amber
  0xf472b6, // stop 6 — pink
  0x34d399, // stop 7 — emerald
];
const FALLBACK_COLOR = 0x888780;

function colorForStop(stop_id: number): number {
  return STOP_PALETTE[(stop_id - 1) % STOP_PALETTE.length] ?? FALLBACK_COLOR;
}

function hexCss(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

/** Render item_id text as a billboard sprite above the item. */
function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width  = 256;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(11,13,18,0.88)";
  ctx.fillRect(0, 0, 256, 48);
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "bold 20px 'Segoe UI', system-ui, sans-serif";
  const label = text.length > 16 ? text.slice(0, 14) + "…" : text;
  ctx.fillText(label, 10, 32);
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    sizeAttenuation: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(55, 10, 1);
  return sprite;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TruckViewerProps {
  plan:  PackingPlan;
  truck: { W: number; L: number; H: number };
}

type ViewMode = "3d" | "exploded" | "labels";

interface TooltipState {
  placement: Placement;
  /** px from left edge of mount */
  x: number;
  /** px from top edge of mount */
  y: number;
  /** mount width for side-flip */
  mountWidth: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TruckViewer({ plan, truck }: TruckViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cameraPosRef    = useRef(new THREE.Vector3(-600, 600, 1400));
  const cameraTargetRef = useRef<THREE.Vector3 | null>(null);
  const [mode, setMode]       = useState<ViewMode>("3d");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const packed      = plan.placements.filter((p) => p.is_packed);
  const uniqueStops = [...new Set(packed.map((p) => p.stop_id))].sort((a, b) => a - b);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width  = mount.clientWidth  || 800;
    const height = mount.clientHeight || 600;

    // ── Scene / camera / renderer ──────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d12);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 20000);
    camera.position.copy(cameraPosRef.current);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // ── Lighting ───────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 0.65);
    sun.position.set(400, 800, 600);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8fa0c8, 0.25);
    fill.position.set(-300, 100, -500);
    scene.add(fill);

    const truckW = truck.W / MM_PER_UNIT;
    const truckL = truck.L / MM_PER_UNIT;
    const truckH = truck.H / MM_PER_UNIT;

    // ── Floor grid ─────────────────────────────────────────────────────────
    const gridHelper = new THREE.GridHelper(
      Math.max(truckW, truckL) * 1.5, 20, 0x1e2533, 0x1a2030,
    );
    gridHelper.position.set(truckW / 2, -0.3, truckL / 2);
    scene.add(gridHelper);

    // ── Truck interior floor ───────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(truckW, truckL);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x111827, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(truckW / 2, 0.1, truckL / 2);
    scene.add(floorMesh);

    // ── Truck wireframe ────────────────────────────────────────────────────
    const truckGeo     = new THREE.BoxGeometry(truckW, truckH, truckL);
    const truckEdgeGeo = new THREE.EdgesGeometry(truckGeo);
    const truckWire    = new THREE.LineSegments(
      truckEdgeGeo,
      new THREE.LineBasicMaterial({ color: 0x2d3748 }),
    );
    truckWire.position.set(truckW / 2, truckH / 2, truckL / 2);
    scene.add(truckWire);

    // ── Door face (tinted blue, at z = truckL) ─────────────────────────────
    const doorGeo  = new THREE.PlaneGeometry(truckW, truckH);
    const doorMat  = new THREE.MeshBasicMaterial({
      color: 0x1e3a5f, transparent: true, opacity: 0.1, side: THREE.DoubleSide,
    });
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.set(truckW / 2, truckH / 2, truckL);
    scene.add(doorMesh);

    // ── Exploded-view offset ───────────────────────────────────────────────
    const stopOrder = [...new Set(packed.map((p) => p.stop_id))].sort((a, b) => b - a);
    const EXPLODE_GAP = 120;

    // ── Geometry / material disposal lists ────────────────────────────────
    const geos:       THREE.BufferGeometry[] = [truckGeo, truckEdgeGeo, floorGeo, doorGeo];
    const mats:       THREE.Material[]       = [floorMat, truckWire.material as THREE.Material, doorMat];
    const spriteMats: THREE.SpriteMaterial[] = [];

    // ── Item meshes for raycasting ─────────────────────────────────────────
    const itemMeshes: THREE.Mesh[] = [];

    // ── Render each packed item ────────────────────────────────────────────
    for (const p of packed) {
      const w = p.w / MM_PER_UNIT;
      const l = p.l / MM_PER_UNIT;
      const h = p.h / MM_PER_UNIT;

      const stopIdx = stopOrder.indexOf(p.stop_id);
      const zOffset = mode === "exploded" ? stopIdx * EXPLODE_GAP : 0;

      const cx = p.x / MM_PER_UNIT + w / 2;
      const cy = p.z / MM_PER_UNIT + h / 2;
      const cz = p.y / MM_PER_UNIT + l / 2 + zOffset;

      const geom = new THREE.BoxGeometry(w, h, l);
      geos.push(geom);

      const color = colorForStop(p.stop_id);
      const mat   = new THREE.MeshLambertMaterial({
        color,
        transparent: true,
        opacity: mode === "labels" ? 0.65 : 0.88,
      });
      mats.push(mat);

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(cx, cy, cz);
      // Store placement data for hover tooltip
      mesh.userData = { placement: p };
      scene.add(mesh);
      itemMeshes.push(mesh);

      const eGeo = new THREE.EdgesGeometry(geom);
      const eMat = new THREE.LineBasicMaterial({ color: 0x0b0d12, transparent: true, opacity: 0.45 });
      geos.push(eGeo);
      mats.push(eMat);
      const edges = new THREE.LineSegments(eGeo, eMat);
      edges.position.copy(mesh.position);
      scene.add(edges);

      if (mode === "labels") {
        const sprite = makeTextSprite(p.item_id);
        sprite.position.set(cx, cy + h / 2 + 7, cz);
        scene.add(sprite);
        spriteMats.push(sprite.material as THREE.SpriteMaterial);
      }
    }

    // ── Orbit controls ─────────────────────────────────────────────────────
    const defaultTarget = new THREE.Vector3(truckW / 2, truckH / 2, truckL / 2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(cameraTargetRef.current ?? defaultTarget);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.update();

    // ── Render loop ────────────────────────────────────────────────────────
    let frameId = 0;
    function animate() {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // ── Resize handler ─────────────────────────────────────────────────────
    function handleResize() {
      const w = mount!.clientWidth;
      const h = mount!.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", handleResize);

    // ── Hover / raycasting ─────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();

    function handleMouseMove(e: MouseEvent) {
      const rect = mount!.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)   / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(itemMeshes, false);
      if (hits.length > 0) {
        const placement = hits[0].object.userData.placement as Placement;
        setTooltip({
          placement,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          mountWidth: rect.width,
        });
      } else {
        setTooltip(null);
      }
    }

    function handleMouseLeave() {
      setTooltip(null);
    }

    mount.addEventListener("mousemove", handleMouseMove);
    mount.addEventListener("mouseleave", handleMouseLeave);

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      mount.removeEventListener("mousemove", handleMouseMove);
      mount.removeEventListener("mouseleave", handleMouseLeave);
      cameraPosRef.current.copy(camera.position);
      cameraTargetRef.current = controls.target.clone();
      controls.dispose();
      for (const g of geos)        g.dispose();
      for (const m of mats)        m.dispose();
      for (const sm of spriteMats) { sm.map?.dispose(); sm.dispose(); }
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      setTooltip(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, truck, mode]);

  return (
    <div className="relative w-full h-full">

      {/* ── View-mode buttons ── */}
      <div className="absolute top-3 left-3 z-10 flex gap-1.5">
        {(["3d", "exploded", "labels"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
              mode === m
                ? "bg-blue-600 border-blue-500 text-white shadow"
                : "bg-gray-900/90 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
          >
            {m === "3d" ? "3D" : m === "exploded" ? "Exploded" : "Labels"}
          </button>
        ))}
      </div>

      {/* ── Stop legend (bottom-right) ── */}
      <div className="absolute bottom-4 right-4 z-10 bg-gray-950/90 border border-gray-800 rounded-lg px-3 py-2.5 text-xs space-y-1.5 min-w-[120px]">
        <div className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">
          Load Order
        </div>
        {uniqueStops
          .slice()
          .reverse()
          .map((sid, i, arr) => (
            <div key={sid} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: hexCss(colorForStop(sid)) }}
              />
              <span className="text-gray-300">Stop {sid}</span>
              {i === 0 && <span className="text-gray-700 text-xs">(rear)</span>}
              {i === arr.length - 1 && arr.length > 1 && (
                <span className="text-gray-700 text-xs">(door)</span>
              )}
            </div>
          ))}
      </div>

      {/* ── Door label (bottom-left) ── */}
      <div className="absolute bottom-4 left-4 z-10">
        <span className="text-xs bg-blue-950/60 border border-blue-900/50 text-blue-400 px-2 py-1 rounded">
          ← DOOR
        </span>
      </div>

      {/* ── Hover tooltip ── */}
      {tooltip && (
        <ItemTooltip
          placement={tooltip.placement}
          x={tooltip.x}
          y={tooltip.y}
          mountWidth={tooltip.mountWidth}
        />
      )}

      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}

// ── Tooltip sub-component ─────────────────────────────────────────────────────

function ItemTooltip({
  placement: p,
  x,
  y,
  mountWidth,
}: {
  placement: Placement;
  x: number;
  y: number;
  mountWidth: number;
}) {
  const flipLeft = x > mountWidth * 0.6;
  const color = `#${(STOP_PALETTE[(p.stop_id - 1) % STOP_PALETTE.length] ?? FALLBACK_COLOR)
    .toString(16)
    .padStart(6, "0")}`;

  return (
    <div
      className="absolute z-20 pointer-events-none"
      style={{
        left:      flipLeft ? x - 12 : x + 14,
        top:       Math.max(8, y - 8),
        transform: flipLeft ? "translateX(-100%)" : "none",
      }}
    >
      <div className="bg-gray-900/98 border border-gray-700 rounded-lg px-3 py-2.5 shadow-2xl min-w-[180px]">
        {/* Item ID */}
        <div className="font-mono font-bold text-white text-sm mb-2 truncate max-w-[200px]">
          {p.item_id}
        </div>

        <div className="space-y-1 text-xs">
          {/* Dimensions */}
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">W × L × H</span>
            <span className="font-mono text-gray-300">
              {p.w} × {p.l} × {p.h}
              <span className="text-gray-600 ml-0.5">mm</span>
            </span>
          </div>

          {/* Volume */}
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Volume</span>
            <span className="font-mono text-gray-300">
              {((p.w * p.l * p.h) / 1e9).toFixed(3)}
              <span className="text-gray-600 ml-0.5">m³</span>
            </span>
          </div>

          {/* Position */}
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Position</span>
            <span className="font-mono text-gray-300">
              ({p.x}, {p.y}, {p.z})
            </span>
          </div>

          {/* Orientation */}
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Orientation</span>
            <span className="font-mono text-gray-300">#{p.orientation_index}</span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800 pt-1 mt-1">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: color }}
              />
              <span style={{ color }}>Stop {p.stop_id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
