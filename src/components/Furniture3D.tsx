// @ts-nocheck
import type { Furniture } from "@/lib/plans.functions";
import * as THREE from "three";

export function FurnitureGroup({ items, yBase = 0 }: { items: Furniture[]; yBase?: number }) {
  return (
    <group>
      {items.map((f) => (
        <FurnitureItem key={f.id} item={f} yBase={yBase} />
      ))}
    </group>
  );
}

function FurnitureItem({ item: f, yBase = 0 }: { item: Furniture; yBase?: number }) {
  const color = new THREE.Color(f.couleur || "#8B7355");
  const pos: [number, number, number] = [f.x + f.w / 2, yBase, f.z + f.d / 2];
  const rotY = (f.rotation * Math.PI) / 180;
  const mat = <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />;
  const matDark = <meshStandardMaterial color={color.clone().multiplyScalar(0.7)} roughness={0.7} />;

  switch (f.type) {
    case "table":
      return (
        <group position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, f.h - 0.04, 0]} castShadow>
            <boxGeometry args={[f.w, 0.05, f.d]} />
            {mat}
          </mesh>
          {legs(f.w, f.d, f.h - 0.04, matDark)}
        </group>
      );

    case "chaise":
      return (
        <group position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.4, 0.05, 0.4]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.5, -0.18]} castShadow>
            <boxGeometry args={[0.4, 0.45, 0.04]} />
            {mat}
          </mesh>
          {legs(0.36, 0.36, 0.25, matDark)}
        </group>
      );

    case "lit":
      return (
        <group position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, 0.15, 0]} castShadow>
            <boxGeometry args={[f.w, 0.15, f.d]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.3, f.d * 0.25]} castShadow>
            <boxGeometry args={[f.w * 0.7, 0.08, f.d * 0.35]} />
            <meshStandardMaterial color="#F5F5F0" roughness={0.9} />
          </mesh>
        </group>
      );

    case "canape":
      return (
        <group position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[f.w, 0.2, f.d]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.4, -f.d * 0.3]} castShadow>
            <boxGeometry args={[f.w, 0.4, f.d * 0.35]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.55, f.d * 0.15]}>
            <boxGeometry args={[f.w * 0.85, 0.08, f.d * 0.4]} />
            <meshStandardMaterial color="#F5F5F0" roughness={0.9} />
          </mesh>
        </group>
      );

    case "armoire":
      return (
        <group position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, f.h / 2, 0]} castShadow>
            <boxGeometry args={[f.w, f.h, f.d]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
          </mesh>
          <mesh position={[0, f.h / 2, f.d / 2 + 0.01]}>
            <boxGeometry args={[f.w * 0.8, f.h * 0.85, 0.01]} />
            <meshStandardMaterial color="#333" roughness={0.3} metalness={0.3} />
          </mesh>
        </group>
      );

    case "bureau":
      return (
        <group position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, f.h - 0.03, 0]} castShadow>
            <boxGeometry args={[f.w, 0.04, f.d]} />
            {mat}
          </mesh>
          {legs(f.w - 0.1, f.d - 0.1, f.h - 0.04, matDark)}
        </group>
      );

    case "cuisine":
      return (
        <group position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, 0.45, f.d * 0.2]} castShadow>
            <boxGeometry args={[f.w, 0.9, f.d * 0.6]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.94, f.d * 0.2]}>
            <boxGeometry args={[f.w, 0.03, f.d * 0.6]} />
            <meshStandardMaterial color="#555" roughness={0.2} metalness={0.4} />
          </mesh>
        </group>
      );

    case "etagere":
      return (
        <group position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, f.h / 2, 0]}>
            <boxGeometry args={[f.w, f.h, f.d]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {[0.2, 0.5, 0.8].map((t) => (
            <mesh key={t} position={[0, f.h * t, f.d / 2 + 0.01]}>
              <boxGeometry args={[f.w * 0.9, 0.02, 0.01]} />
              <meshStandardMaterial color="#888" roughness={0.3} metalness={0.2} />
            </mesh>
          ))}
        </group>
      );

    case "table_salon":
      return (
        <group position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[f.w / 2, f.w / 2, 0.05, 16]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 0.35, 8]} />
            {matDark}
          </mesh>
        </group>
      );

    case "commode":
      return (
        <group position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, f.h / 2, 0]} castShadow>
            <boxGeometry args={[f.w, f.h, f.d]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          {[1, 2, 3].map((n) => (
            <mesh key={n} position={[f.w * 0.25 * (n - 2), f.h * 0.3, f.d / 2 + 0.01]}>
              <boxGeometry args={[f.w * 0.2, f.h * 0.06, 0.01]} />
              <meshStandardMaterial color="#aaa" roughness={0.3} metalness={0.2} />
            </mesh>
          ))}
        </group>
      );

    case "chevet":
      return (
        <group position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, f.h / 2, 0]} castShadow>
            <boxGeometry args={[f.w, f.h, f.d]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          <mesh position={[0, f.h * 0.2, f.d / 2 + 0.01]}>
            <boxGeometry args={[f.w * 0.5, f.h * 0.04, 0.01]} />
            <meshStandardMaterial color="#aaa" roughness={0.3} metalness={0.2} />
          </mesh>
        </group>
      );

    default:
      return (
        <group position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, f.h / 2, 0]} castShadow>
            <boxGeometry args={[f.w, f.h, f.d]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        </group>
      );
  }
}

function legs(w: number, d: number, h: number, mat: JSX.Element) {
  const r = 0.03;
  const offX = w / 2 - r;
  const offZ = d / 2 - r;
  const positions: [number, number, number][] = [];
  if (w > 0.1 && d > 0.1) {
    positions.push([-offX, 0, -offZ], [-offX, 0, offZ], [offX, 0, -offZ], [offX, 0, offZ]);
  }
  return positions.map((p, i) => (
    <mesh key={i} position={[p[0], h / 2, p[2]]} castShadow>
      <cylinderGeometry args={[r, r, h, 6]} />
      {mat}
    </mesh>
  ));
}
