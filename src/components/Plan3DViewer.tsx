import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import type { PlanData } from "@/lib/plans.functions";
import * as THREE from "three";

const WALL_H = 2.7;
const WALL_T = 0.2;
const FLOOR_H = 2.7;

export function Plan3DViewer({ plan }: { plan: PlanData }) {
  const floors = [...new Set(plan.rooms.map((r) => r.floor ?? 1))].sort((a, b) => a - b);
  const totalHeight = floors.length * FLOOR_H;
  const cx = plan.total_w / 2;
  const cz = plan.total_h / 2;

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border/40 bg-[#1a1a1a]">
      <Canvas camera={{ position: [plan.total_w, plan.total_w * 0.9 + totalHeight, plan.total_h * 1.2], fov: 45 }} shadows>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 8]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <Environment preset="city" />
        <Grid args={[40, 40]} cellColor="#333" sectionColor="#555" position={[0, -0.01, 0]} infiniteGrid={false} />

        <group position={[-cx, 0, -cz]}>
          {floors.map((floor) => {
            const yBase = (floor - 1) * FLOOR_H;
            const floorRooms = plan.rooms.filter((r) => (r.floor ?? 1) === floor);
            return (
              <group key={floor}>
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[plan.total_w / 2, yBase, plan.total_h / 2]}>
                  <planeGeometry args={[plan.total_w, plan.total_h]} />
                  <meshStandardMaterial color="#d8cdb4" />
                </mesh>
                {floorRooms.map((r) => (
                  <RoomWalls key={r.id} room={r} plan={plan} yBase={yBase} />
                ))}
              </group>
            );
          })}
        </group>

        <OrbitControls makeDefault target={[0, totalHeight / 2, 0]} />
      </Canvas>
    </div>
  );
}

function RoomWalls({ room: r, plan, yBase = 0 }: { room: PlanData["rooms"][number]; plan: PlanData; yBase?: number }) {
  const walls: Array<{ a: [number, number]; b: [number, number]; wall: "N" | "S" | "E" | "W" }> = [
    { a: [r.x, r.y], b: [r.x + r.w, r.y], wall: "N" },
    { a: [r.x + r.w, r.y], b: [r.x + r.w, r.y + r.h], wall: "E" },
    { a: [r.x + r.w, r.y + r.h], b: [r.x, r.y + r.h], wall: "S" },
    { a: [r.x, r.y + r.h], b: [r.x, r.y], wall: "W" },
  ];

  const segments: Array<{ a: [number, number]; b: [number, number]; bottom: number; height: number }> = [];

  for (const w of walls) {
    const isHoriz = w.wall === "N" || w.wall === "S";
    const len = isHoriz ? r.w : r.h;
    const openings = plan.openings
      .filter((o) => o.room_id === r.id && o.wall === w.wall)
      .map((o) => ({ start: o.offset, end: o.offset + o.width, type: o.type }))
      .sort((a, b) => a.start - b.start);

    // Build segments along [0, len], adding wall pieces where there is no door (full height),
    // for windows leave wall below and above the opening.
    let cursor = 0;
    const pushSeg = (s: number, e: number, bottom: number, height: number) => {
      if (e - s < 1e-3) return;
      const a = pointAlong(w.a, w.b, s / len);
      const b = pointAlong(w.a, w.b, e / len);
      segments.push({ a, b, bottom, height });
    };
    for (const op of openings) {
      pushSeg(cursor, Math.max(cursor, op.start), 0, WALL_H);
      if (op.type === "window") {
        pushSeg(op.start, op.end, 0, 1.0); // sill
        pushSeg(op.start, op.end, 2.1, WALL_H - 2.1); // header
      } // door = full gap
      cursor = Math.max(cursor, op.end);
    }
    pushSeg(cursor, len, 0, WALL_H);
  }

  return (
    <>
      {segments.map((s, i) => (
        <WallSegment key={i} {...s} yBase={yBase} />
      ))}
    </>
  );
}

function pointAlong(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function WallSegment({ a, b, bottom, height, yBase = 0 }: { a: [number, number]; b: [number, number]; bottom: number; height: number; yBase?: number }) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  if (len < 1e-3 || height < 1e-3) return null;
  const angle = Math.atan2(dz, dx);
  const mx = (a[0] + b[0]) / 2;
  const mz = (a[1] + b[1]) / 2;
  return (
    <mesh position={[mx, yBase + bottom + height / 2, mz]} rotation={[0, -angle, 0]} castShadow receiveShadow>
      <boxGeometry args={[len, height, WALL_T]} />
      <meshStandardMaterial color="#efe8d8" side={THREE.DoubleSide} />
    </mesh>
  );
}
