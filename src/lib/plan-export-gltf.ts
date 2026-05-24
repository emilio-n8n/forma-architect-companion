import * as THREE from "three";
import type { PlanData, Furniture, Tree, Roof } from "@/lib/plans.functions";

const WALL_H = 2.7;
const WALL_T = 0.2;
const FLOOR_H = 2.7;

function isExternalWall(
  room: PlanData["rooms"][number],
  wall: string,
  allRooms: PlanData["rooms"],
): boolean {
  const eps = 0.01;
  return !allRooms.some((other) => {
    if (other.id === room.id) return false;
    if (wall === "N")
      return (
        Math.abs(room.y - (other.y + other.h)) < eps &&
        room.x < other.x + other.w &&
        room.x + room.w > other.x
      );
    if (wall === "S")
      return (
        Math.abs(room.y + room.h - other.y) < eps &&
        room.x < other.x + other.w &&
        room.x + room.w > other.x
      );
    if (wall === "W")
      return (
        Math.abs(room.x - (other.x + other.w)) < eps &&
        room.y < other.y + other.h &&
        room.y + room.h > other.y
      );
    if (wall === "E")
      return (
        Math.abs(room.x + room.w - other.x) < eps &&
        room.y < other.y + other.h &&
        room.y + room.h > other.y
      );
    return false;
  });
}

function buildWallMeshes(
  room: PlanData["rooms"][number],
  plan: PlanData,
  yBase: number,
  wallColors?: Record<string, string>,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];

  const walls: Array<{ a: [number, number]; b: [number, number]; wall: "N" | "S" | "E" | "W" }> = [
    { a: [room.x, room.y], b: [room.x + room.w, room.y], wall: "N" },
    { a: [room.x + room.w, room.y], b: [room.x + room.w, room.y + room.h], wall: "E" },
    { a: [room.x + room.w, room.y + room.h], b: [room.x, room.y + room.h], wall: "S" },
    { a: [room.x, room.y + room.h], b: [room.x, room.y], wall: "W" },
  ];

  const roomColor =
    wallColors?.[room.name.toLowerCase()] || wallColors?.[room.id] || "#efe8d8";

  for (const w of walls) {
    const isHoriz = w.wall === "N" || w.wall === "S";
    const len = isHoriz ? room.w : room.h;
    const openings = plan.openings
      .filter((o) => o.room_id === room.id && o.wall === w.wall)
      .map((o) => ({ start: o.offset, end: o.offset + o.width, type: o.type }))
      .sort((a, b) => a.start - b.start);
    const isExterior = isExternalWall(room, w.wall, plan.rooms);
    const color = isExterior
      ? wallColors?.exterieur || "#e8dcc8"
      : roomColor;

    let cursor = 0;
    const pushSeg = (s: number, e: number, bottom: number, height: number) => {
      if (e - s < 1e-3 || height < 1e-3) return;
      const t1 = s / len;
      const t2 = e / len;
      const ax = w.a[0] + (w.b[0] - w.a[0]) * t1;
      const az = w.a[1] + (w.b[1] - w.a[1]) * t1;
      const bx = w.a[0] + (w.b[0] - w.a[0]) * t2;
      const bz = w.a[1] + (w.b[1] - w.a[1]) * t2;
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      const segLen = Math.hypot(bx - ax, bz - az);
      if (segLen < 1e-3) return;
      const angle = Math.atan2(bz - az, bx - ax);

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(segLen, height, WALL_T),
        new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }),
      );
      mesh.position.set(mx, yBase + bottom + height / 2, mz);
      mesh.rotation.y = -angle;
      meshes.push(mesh);
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

  return meshes;
}

function buildFurnitureMesh(f: Furniture, yBase: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(f.x + f.w / 2, yBase, f.z + f.d / 2);
  group.rotation.y = (f.rotation * Math.PI) / 180;

  const color = new THREE.Color(f.couleur || "#8B7355");
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(f.w, f.h, f.d), mat);
  body.position.set(0, f.h / 2, 0);
  body.castShadow = true;
  group.add(body);

  return group;
}

function buildTreeMesh(t: Tree): THREE.Group {
  const group = new THREE.Group();
  group.position.set(t.x, 0, t.z);

  const trunkH = t.hauteur * 0.4;
  const trunkR = 0.08 * Math.sqrt(t.hauteur);
  const crownR = t.diametre_couronne / 2;

  const trunkMat = new THREE.MeshStandardMaterial({ color: "#5a3a1a", roughness: 0.9 });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkR * 0.6, trunkR, trunkH, 6),
    trunkMat,
  );
  trunk.position.set(0, trunkH / 2, 0);
  trunk.castShadow = true;
  group.add(trunk);

  const crownY = trunkH + crownR * 0.5;
  let crownColor = "#2d5a1e";
  if (t.type === "conifere") crownColor = "#1a4a1a";
  else if (t.type === "fruitier") crownColor = "#4a7a3a";
  else if (t.type === "palmier") crownColor = "#3a6a2a";

  const crownMat = new THREE.MeshStandardMaterial({ color: crownColor, roughness: 0.8 });

  if (t.type === "conifere") {
    const crown = new THREE.Mesh(new THREE.ConeGeometry(crownR, t.diametre_couronne, 8), crownMat);
    crown.position.set(0, crownY, 0);
    crown.castShadow = true;
    group.add(crown);
  } else if (t.type === "palmier") {
    const crownGeo = new THREE.BoxGeometry(crownR * 1.5, 0.02, 0.1);
    crownMat.side = THREE.DoubleSide;
    for (const angle of [0, 72, 144, 216, 288]) {
      const frond = new THREE.Mesh(crownGeo, crownMat);
      frond.position.set(0, crownY, 0);
      frond.rotation.x = 0.6;
      frond.rotation.y = (angle * Math.PI) / 180;
      group.add(frond);
    }
  } else {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(crownR, 7, 7), crownMat);
    crown.position.set(0, crownY, 0);
    crown.castShadow = true;
    group.add(crown);
  }

  return group;
}

function buildRoofMesh(roof: Roof, plan: PlanData, yBase: number): THREE.Mesh | THREE.Group | null {
  const W = plan.total_w;
  const D = plan.total_h;
  const over = roof.debord || 0.5;
  const rw = W + over * 2;
  const rd = D + over * 2;
  const pente = roof.pente || 30;
  const ridgeH = (rw / 2) * Math.tan((pente * Math.PI) / 180);
  const color = new THREE.Color(roof.couleur || "#4A4A4A");
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide });
  const cx = W / 2;
  const cz = D / 2;

  switch (roof.type) {
    case "plat": {
      const m = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.15, rd), mat);
      m.position.set(cx, yBase + 0.15 / 2, cz);
      m.receiveShadow = true;
      return m;
    }
    case "pentu":
    case "appentis":
    case "croupe":
    case "papillon": {
      const geom = new THREE.BufferGeometry();
      const hw = rw / 2;
      const hd = rd / 2;
      let verts: Float32Array;

      if (roof.type === "pentu") {
        verts = new Float32Array([
          -hw, 0, -hd, hw, 0, -hd, 0, ridgeH, -hd,
          -hw, 0, hd, hw, 0, hd, 0, ridgeH, hd,
          -hw, 0, -hd, -hw, 0, hd, 0, ridgeH, -hd,
          0, ridgeH, -hd, -hw, 0, hd, 0, ridgeH, hd,
          hw, 0, -hd, hw, 0, hd, 0, ridgeH, -hd,
          0, ridgeH, -hd, hw, 0, hd, 0, ridgeH, hd,
        ]);
      } else if (roof.type === "appentis") {
        verts = new Float32Array([
          -hw, 0, -hd, hw, ridgeH, -hd, -hw, 0, hd,
          hw, ridgeH, -hd, hw, ridgeH, hd, -hw, 0, hd,
          -hw, 0, -hd, -hw, 0, hd, hw, ridgeH, -hd,
          hw, ridgeH, -hd, -hw, 0, hd, hw, ridgeH, hd,
          -hw, 0, -hd, hw, ridgeH, -hd, hw, 0, -hd,
          -hw, 0, hd, hw, ridgeH, hd, hw, 0, hd,
        ]);
      } else if (roof.type === "croupe") {
        const ch = hw * 0.4;
        const fh = ridgeH - ch;
        verts = new Float32Array([
          -hw, 0, -hd, hw, 0, -hd, 0, ridgeH, 0,
          hw, 0, -hd, hw, 0, hd, 0, ridgeH, 0,
          hw, 0, hd, -hw, 0, hd, 0, ridgeH, 0,
          -hw, 0, hd, -hw, 0, -hd, 0, ridgeH, 0,
          -hw, 0, -hd, -hw, 0, -hd + ch, 0, ridgeH - fh, 0,
          hw, 0, -hd, hw, 0, -hd + ch, 0, ridgeH - fh, 0,
          hw, 0, hd, hw, 0, hd - ch, 0, ridgeH - fh, 0,
          -hw, 0, hd, -hw, 0, hd - ch, 0, ridgeH - fh, 0,
        ]);
      } else {
        verts = new Float32Array([
          -hw, 0, -hd, 0, ridgeH, -hd, hw, 0, -hd,
          -hw, 0, hd, 0, ridgeH, hd, hw, 0, hd,
          -hw, 0, -hd, -hw, 0, hd, 0, ridgeH, -hd,
          0, ridgeH, -hd, -hw, 0, hd, 0, ridgeH, hd,
          hw, 0, -hd, hw, 0, hd, 0, ridgeH, -hd,
          0, ridgeH, -hd, hw, 0, hd, 0, ridgeH, hd,
        ]);
      }

      geom.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      geom.computeVertexNormals();
      const m = new THREE.Mesh(geom, mat);
      m.position.set(cx, yBase, cz);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }
    default:
      return null;
  }
}

export async function planToGltfBlob(plan: PlanData): Promise<Blob> {
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");

  const scene = new THREE.Scene();

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 15, 8);
  scene.add(dirLight);

  const floors = [...new Set(plan.rooms.map((r) => r.floor ?? 1))].sort((a, b) => a - b);
  const roofTop = floors.length > 0 ? floors.length * FLOOR_H : 2.7;
  const cx = plan.total_w / 2;
  const cz = plan.total_h / 2;

  const building = new THREE.Group();
  building.position.set(-cx, 0, -cz);
  scene.add(building);

  for (const floor of floors) {
    const yBase = (floor - 1) * FLOOR_H;
    const floorRooms = plan.rooms.filter((r) => (r.floor ?? 1) === floor);
    const floorFurniture = plan.furniture?.filter((f) =>
      floorRooms.some((r) => r.id === f.piece_id),
    );

    const floorSlab = new THREE.Mesh(
      new THREE.BoxGeometry(plan.total_w, 0.12, plan.total_h),
      new THREE.MeshStandardMaterial({
        color: "#d8cdb4",
        transparent: floor > 1,
        opacity: floor > 1 ? 0.2 : 1,
      }),
    );
    floorSlab.position.set(plan.total_w / 2, yBase, plan.total_h / 2);
    floorSlab.receiveShadow = true;
    building.add(floorSlab);

    for (const r of floorRooms) {
      const wallMeshes = buildWallMeshes(r, plan, yBase, plan.wallColors);
      for (const m of wallMeshes) {
        m.castShadow = true;
        m.receiveShadow = true;
        building.add(m);
      }
    }

    if (floorFurniture) {
      for (const f of floorFurniture) {
        building.add(buildFurnitureMesh(f, yBase));
      }
    }
  }

  if (plan.roof) {
    const roofMesh = buildRoofMesh(plan.roof, plan, roofTop);
    if (roofMesh) building.add(roofMesh);
  }

  if (plan.landscaping?.arbres) {
    for (const t of plan.landscaping.arbres) {
      building.add(buildTreeMesh(t));
    }
  }

  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: "model/gltf-binary" }));
        } else {
          reject(new Error("GLTF export returned unexpected format"));
        }
      },
      (error) => reject(error),
      { binary: true },
    );
  });
}
