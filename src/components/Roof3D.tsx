import type { Roof, PlanData } from "@/lib/plans.functions";
import * as THREE from "three";
import { useMemo } from "react";

export function RoofMesh({ roof, plan, yBase }: { roof: Roof; plan: PlanData; yBase: number }) {
  const W = plan.total_w;
  const D = plan.total_h;
  const over = roof.debord || 0.5;
  const rw = W + over * 2;
  const rd = D + over * 2;
  const color = new THREE.Color(roof.couleur || "#4A4A4A");
  const mat = <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />;

  const [pente, hauteur] = useMemo(() => {
    const p = roof.pente || 30;
    const h = (rw / 2) * Math.tan((p * Math.PI) / 180);
    return [p, h];
  }, [roof.pente, rw]);

  switch (roof.type) {
    case "plat":
      return (
        <mesh position={[W / 2, yBase + 0.15, D / 2]} receiveShadow>
          <boxGeometry args={[rw, 0.15, rd]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      );

    case "pentu": {
      const geom = new THREE.BufferGeometry();
      const hw = rw / 2;
      const hd = rd / 2;
      const verts = new Float32Array([
        -hw, 0, -hd, hw, 0, -hd, 0, hauteur, -hd,
        -hw, 0, hd, hw, 0, hd, 0, hauteur, hd,
        -hw, 0, -hd, -hw, 0, hd, 0, hauteur, -hd,
        0, hauteur, -hd, -hw, 0, hd, 0, hauteur, hd,
        hw, 0, -hd, hw, 0, hd, 0, hauteur, -hd,
        0, hauteur, -hd, hw, 0, hd, 0, hauteur, hd,
      ]);
      geom.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      geom.computeVertexNormals();
      return (
        <mesh geometry={geom} position={[W / 2, yBase, D / 2]} castShadow receiveShadow>
          {mat}
        </mesh>
      );
    }

    case "croupe": {
      const geom = new THREE.BufferGeometry();
      const hw = rw / 2;
      const hd = rd / 2;
      const ch = hw * 0.4;
      const fh = hauteur - ch;
      const verts = new Float32Array([
        -hw, 0, -hd, hw, 0, -hd, 0, hauteur, 0,
        hw, 0, -hd, hw, 0, hd, 0, hauteur, 0,
        hw, 0, hd, -hw, 0, hd, 0, hauteur, 0,
        -hw, 0, hd, -hw, 0, -hd, 0, hauteur, 0,
        -hw, 0, -hd, -hw, 0, -hd + ch, 0, hauteur - fh, 0,
        hw, 0, -hd, hw, 0, -hd + ch, 0, hauteur - fh, 0,
        hw, 0, hd, hw, 0, hd - ch, 0, hauteur - fh, 0,
        -hw, 0, hd, -hw, 0, hd - ch, 0, hauteur - fh, 0,
      ]);
      geom.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      geom.computeVertexNormals();
      return (
        <mesh geometry={geom} position={[W / 2, yBase, D / 2]} castShadow receiveShadow>
          {mat}
        </mesh>
      );
    }

    case "appentis": {
      const geom = new THREE.BufferGeometry();
      const hw = rw / 2;
      const hd = rd / 2;
      const verts = new Float32Array([
        -hw, 0, -hd, hw, hauteur, -hd, -hw, 0, hd,
        hw, hauteur, -hd, hw, hauteur, hd, -hw, 0, hd,
        -hw, 0, -hd, -hw, 0, hd, hw, hauteur, -hd,
        hw, hauteur, -hd, -hw, 0, hd, hw, hauteur, hd,
        -hw, 0, -hd, hw, hauteur, -hd, hw, 0, -hd,
        -hw, 0, hd, hw, hauteur, hd, hw, 0, hd,
      ]);
      geom.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      geom.computeVertexNormals();
      return (
        <mesh geometry={geom} position={[W / 2, yBase, D / 2]} castShadow receiveShadow>
          {mat}
        </mesh>
      );
    }

    case "papillon": {
      const geom = new THREE.BufferGeometry();
      const hw = rw / 2;
      const hd = rd / 2;
      const verts = new Float32Array([
        -hw, 0, -hd, 0, hauteur, -hd, hw, 0, -hd,
        -hw, 0, hd, 0, hauteur, hd, hw, 0, hd,
        -hw, 0, -hd, -hw, 0, hd, 0, hauteur, -hd,
        0, hauteur, -hd, -hw, 0, hd, 0, hauteur, hd,
        hw, 0, -hd, hw, 0, hd, 0, hauteur, -hd,
        0, hauteur, -hd, hw, 0, hd, 0, hauteur, hd,
      ]);
      geom.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      geom.computeVertexNormals();
      return (
        <mesh geometry={geom} position={[W / 2, yBase, D / 2]} castShadow receiveShadow>
          {mat}
        </mesh>
      );
    }

    default:
      return null;
  }
}
