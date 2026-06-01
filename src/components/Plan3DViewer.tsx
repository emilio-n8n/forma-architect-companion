// @ts-nocheck
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import type { PlanData } from "@/lib/plans.functions";
import { FurnitureGroup } from "@/components/Furniture3D";
import { RoofMesh } from "@/components/Roof3D";
import { TreeGroup } from "@/components/Tree3D";
import * as THREE from "three";
import { useMemo, useEffect } from "react";

// ⭐ FIX: Memory Leak - Cleanup Three.js resources when component unmounts
function SceneCleanup() {
  const gl = useThree((state) => state.gl);
  
  useEffect(() => {
    return () => {
      // Cleanup WebGL resources
      try {
        // Dispose all textures
        const textures = gl.getParameter(gl.TEXTURES);
        for (let i = 0; i < textures.length; i++) {
          const texture = gl.getTexture(textures[i]);
          if (texture) gl.deleteTexture(texture);
        }
        
        // Dispose all renderbuffers
        const renderbuffers = gl.getParameter(gl.RENDERBUFFERS);
        for (let i = 0; i < renderbuffers.length; i++) {
          gl.deleteRenderbuffer(renderbuffers[i]);
        }
        
        // Dispose all framebuffers
        const framebuffers = gl.getParameter(gl.FRAMEBUFFERS);
        for (let i = 0; i < framebuffers.length; i++) {
          gl.deleteFramebuffer(framebuffers[i]);
        }
        
        // Force garbage collection hint
        if (window.gc) window.gc();
      } catch (e) {
        console.error("Three.js cleanup error:", e);
      }
    };
  }, [gl]);
  
  return null;
}

const WALL_H = 2.7;
const WALL_T = 0.2;
const FLOOR_H = 2.7;

export function Plan3DViewer({
  plan,
  wallColors,
  showFurniture = true,
  showRoof = true,
  showTrees = true,
  showParcel = true,
}: {
  plan: PlanData;
  wallColors?: Record<string, string>;
  showFurniture?: boolean;
  showRoof?: boolean;
  showTrees?: boolean;
  showParcel?: boolean;
}) {
  const floors = useMemo(
    () => [...new Set(plan.rooms.map((r) => r.floor ?? 1))].sort((a, b) => a - b),
    [plan.rooms]
  );
  const totalHeight = floors.length * FLOOR_H;
  const cx = plan.total_w / 2;
  const cz = plan.total_h / 2;
  const roofTop = floors.length > 0 ? floors.length * FLOOR_H : 2.7;

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border/40 bg-[#1a1a1a]">
      <Canvas
        camera={{ position: [plan.total_w * 0.8, plan.total_w * 0.7 + totalHeight, plan.total_h * 1.1], fov: 60 }}
        shadows
      >
        {/* ⭐ FIX: Memory Leak - Cleanup Three.js resources on unmount */}
        <SceneCleanup />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 8]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <Environment preset="city" />

        <Grid
          args={[Math.max(40, plan.total_w * 2), Math.max(40, plan.total_h * 2)]}
          cellColor="#333"
          sectionColor="#555"
          position={[0, -0.01, 0]}
          infiniteGrid={false}
        />

        <group position={[-cx, 0, -cz]}>
          {floors.map((floor) => {
            const yBase = (floor - 1) * FLOOR_H;
            const floorRooms = plan.rooms.filter((r) => (r.floor ?? 1) === floor);
            const floorFurniture = plan.furniture?.filter((f) =>
              floorRooms.some((r) => r.id === f.piece_id)
            );
            return (
              <group key={floor}>
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[plan.total_w / 2, yBase, plan.total_h / 2]}>
                  <planeGeometry args={[plan.total_w, plan.total_h]} />
                  <meshStandardMaterial
                    color="#d8cdb4"
                    transparent={floor > 1}
                    opacity={floor > 1 ? 0.2 : 1}
                    depthWrite={floor <= 1}
                  />
                </mesh>
                {floorRooms.map((r) => (
                  <RoomWalls key={r.id} room={r} plan={plan} yBase={yBase} wallColors={wallColors} />
                ))}
                {showFurniture && floorFurniture && floorFurniture.length > 0 && (
                  <FurnitureGroup items={floorFurniture} yBase={yBase} />
                )}
              </group>
            );
          })}
          {showRoof && plan.roof && (
            <RoofMesh roof={plan.roof} plan={plan} yBase={roofTop} />
          )}
          {showTrees && plan.landscaping?.arbres && plan.landscaping.arbres.length > 0 && (
            <TreeGroup trees={plan.landscaping.arbres} />
          )}
          {showParcel && plan.parcel?.contour && plan.parcel.contour.length > 2 && (
            <ParcelOutline contour={plan.parcel.contour} />
          )}
        </group>

        <OrbitControls makeDefault target={[0, totalHeight / 2, 0]} />
      </Canvas>
    </div>
  );
}

function ParcelOutline({ contour }: { contour: Array<{ x: number; z: number }> }) {
  const points = useMemo(() => contour.map((p) => new THREE.Vector3(p.x, 0.01, p.z)), [contour]);
  if (points.length < 2) return null;

  const closed = [...points, points[0]];
  const positions = Float32Array.from(closed.flatMap((p) => [p.x, p.y, p.z]));

  return (
    <>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={closed.length} array={positions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#c4a264" opacity={0.6} transparent />
      </line>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <shapeGeometry args={[shapeFromPoints(contour)]} />
        <meshStandardMaterial color="#c4a264" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function shapeFromPoints(pts: Array<{ x: number; z: number }>): THREE.Shape {
  const s = new THREE.Shape();
  pts.forEach((p, i) => (i === 0 ? s.moveTo(p.x, p.z) : s.lineTo(p.x, p.z)));
  s.closePath();
  return s;
}

function RoomWalls({
  room: r,
  plan,
  yBase = 0,
  wallColors,
}: {
  room: PlanData["rooms"][number];
  plan: PlanData;
  yBase?: number;
  wallColors?: Record<string, string>;
}) {
  const walls: Array<{ a: [number, number]; b: [number, number]; wall: "N" | "S" | "E" | "W" }> = [
    { a: [r.x, r.y], b: [r.x + r.w, r.y], wall: "N" },
    { a: [r.x + r.w, r.y], b: [r.x + r.w, r.y + r.h], wall: "E" },
    { a: [r.x + r.w, r.y + r.h], b: [r.x, r.y + r.h], wall: "S" },
    { a: [r.x, r.y + r.h], b: [r.x, r.y], wall: "W" },
  ];

  const segments: Array<{
    a: [number, number];
    b: [number, number];
    bottom: number;
    height: number;
    isExterior: boolean;
  }> = [];

  for (const w of walls) {
    const isHoriz = w.wall === "N" || w.wall === "S";
    const len = isHoriz ? r.w : r.h;
    const openings = plan.openings
      .filter((o) => o.room_id === r.id && o.wall === w.wall)
      .map((o) => ({ start: o.offset, end: o.offset + o.width, type: o.type }))
      .sort((a, b) => a.start - b.start);

    const isExterior = isExternalWall(r, w.wall, plan.rooms);
    let cursor = 0;
    const pushSeg = (s: number, e: number, bottom: number, height: number) => {
      if (e - s < 1e-3) return;
      const a = pointAlong(w.a, w.b, s / len);
      const b = pointAlong(w.a, w.b, e / len);
      segments.push({ a, b, bottom, height, isExterior });
    };
    for (const op of openings) {
      pushSeg(cursor, Math.max(cursor, op.start), 0, WALL_H);
      if (op.type === "window") {
        pushSeg(op.start, op.end, 0, 1.0);
        pushSeg(op.start, op.end, 2.1, WALL_H - 2.1);
      }
      cursor = Math.max(cursor, op.end);
    }
    pushSeg(cursor, len, 0, WALL_H);
  }

  const roomColor = wallColors?.[r.name.toLowerCase()] || wallColors?.[r.id] || "#efe8d8";

  return (
    <>
      {segments.map((s, i) => (
        <WallSegment
          key={i}
          a={s.a}
          b={s.b}
          bottom={s.bottom}
          height={s.height}
          yBase={yBase}
          color={s.isExterior ? (wallColors?.exterieur || "#e8dcc8") : roomColor}
        />
      ))}
    </>
  );
}

function isExternalWall(room: PlanData["rooms"][number], wall: string, allRooms: PlanData["rooms"]): boolean {
  const eps = 0.01;
  return !allRooms.some((other) => {
    if (other.id === room.id) return false;
    if (wall === "N") return Math.abs(room.y - (other.y + other.h)) < eps &&
      room.x < other.x + other.w && room.x + room.w > other.x;
    if (wall === "S") return Math.abs(room.y + room.h - other.y) < eps &&
      room.x < other.x + other.w && room.x + room.w > other.x;
    if (wall === "W") return Math.abs(room.x - (other.x + other.w)) < eps &&
      room.y < other.y + other.h && room.y + room.h > other.y;
    if (wall === "E") return Math.abs(room.x + room.w - other.x) < eps &&
      room.y < other.y + other.h && room.y + room.h > other.y;
    return false;
  });
}

function pointAlong(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function WallSegment({
  a,
  b,
  bottom,
  height,
  yBase = 0,
  color,
}: {
  a: [number, number];
  b: [number, number];
  bottom: number;
  height: number;
  yBase?: number;
  color: string;
}) {
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
      <meshStandardMaterial color={new THREE.Color(color)} side={THREE.DoubleSide} />
    </mesh>
  );
}
