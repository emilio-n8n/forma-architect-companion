import type { Tree } from "@/lib/plans.functions";
import * as THREE from "three";
import { useMemo } from "react";

export function TreeGroup({ trees, yBase = 0 }: { trees: Tree[]; yBase?: number }) {
  return (
    <group>
      {trees.map((t) => (
        <SingleTree key={t.id} tree={t} yBase={yBase} />
      ))}
    </group>
  );
}

function SingleTree({ tree: t, yBase = 0 }: { tree: Tree; yBase?: number }) {
  const trunkH = t.hauteur * 0.4;
  const trunkR = 0.08 * Math.sqrt(t.hauteur);
  const crownR = t.diametre_couronne / 2;
  const crownY = yBase + trunkH + crownR * 0.5;

  const crownColor = useMemo(() => {
    switch (t.type) {
      case "conifere": return new THREE.Color("#1a4a1a");
      case "fruitier": return new THREE.Color("#4a7a3a");
      case "palmier": return new THREE.Color("#3a6a2a");
      default: return new THREE.Color("#2d5a1e");
    }
  }, [t.type]);

  const trunkColor = new THREE.Color("#5a3a1a");

  switch (t.type) {
    case "conifere":
      return (
        <group position={[t.x, 0, t.z]}>
          <mesh position={[0, yBase + trunkH / 2, 0]} castShadow>
            <cylinderGeometry args={[trunkR * 0.6, trunkR * 1.2, trunkH, 6]} />
            <meshStandardMaterial color={trunkColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, crownY, 0]} castShadow>
            <coneGeometry args={[crownR, t.diametre_couronne, 8]} />
            <meshStandardMaterial color={crownColor} roughness={0.8} />
          </mesh>
        </group>
      );

    case "palmier":
      return (
        <group position={[t.x, 0, t.z]}>
          <mesh position={[0, yBase + trunkH / 2, 0]} castShadow>
            <cylinderGeometry args={[trunkR * 0.4, trunkR, trunkH, 6]} />
            <meshStandardMaterial color={trunkColor} roughness={0.9} />
          </mesh>
          {[0, 72, 144, 216, 288].map((angle) => (
            <mesh key={angle} position={[0, crownY, 0]} rotation={[0.6, (angle * Math.PI) / 180, 0]}>
              <boxGeometry args={[crownR * 1.5, 0.02, 0.1]} />
              <meshStandardMaterial color={new THREE.Color("#3a7a2a")} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      );

    case "fruitier":
      return (
        <group position={[t.x, 0, t.z]}>
          <mesh position={[0, yBase + trunkH / 2, 0]} castShadow>
            <cylinderGeometry args={[trunkR * 0.5, trunkR, trunkH, 6]} />
            <meshStandardMaterial color={trunkColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, crownY, 0]} castShadow>
            <sphereGeometry args={[crownR * 0.8, 6, 6]} />
            <meshStandardMaterial color={crownColor} roughness={0.8} />
          </mesh>
        </group>
      );

    default:
      return (
        <group position={[t.x, 0, t.z]}>
          <mesh position={[0, yBase + trunkH / 2, 0]} castShadow>
            <cylinderGeometry args={[trunkR * 0.6, trunkR, trunkH, 6]} />
            <meshStandardMaterial color={trunkColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, crownY, 0]} castShadow>
            <sphereGeometry args={[crownR, 7, 7]} />
            <meshStandardMaterial color={crownColor} roughness={0.8} />
          </mesh>
        </group>
      );
  }
}
