import type { PlanData } from "@/lib/plans.functions";

const WALL_H = 2.7;
const WALL_T = 0.2;
const FLOOR_H = 2.7;

let vi = 1;
let lines: string[];

function v(x: number, y: number, z: number): number {
  lines.push(`v ${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)}`);
  return vi++;
}

function f(...indices: number[]) {
  lines.push("f " + indices.join(" "));
}

function addBox(cx: number, cy: number, cz: number, w: number, h: number, d: number) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const x0 = cx - hw, x1 = cx + hw;
  const y0 = cy - hh, y1 = cy + hh;
  const z0 = cz - hd, z1 = cz + hd;

  const i0 = v(x0, y0, z0), i1 = v(x1, y0, z0), i2 = v(x1, y0, z1), i3 = v(x0, y0, z1);
  const i4 = v(x0, y1, z0), i5 = v(x1, y1, z0), i6 = v(x1, y1, z1), i7 = v(x0, y1, z1);

  f(i0, i1, i2, i3); // bottom
  f(i4, i5, i6, i7); // top
  f(i1, i5, i6, i2); // front (+Z)
  f(i0, i4, i7, i3); // back (-Z)
  f(i1, i0, i4, i5); // right (+X)
  f(i2, i6, i7, i3); // left (-X)
}

export function planToObjString(plan: PlanData): string {
  vi = 1;
  lines = [];
  lines.push("# FORMA 3D Export");
  lines.push(`# ${plan.total_w}m x ${plan.total_h}m, ${plan.rooms.length} pieces`);
  lines.push("");

  const floors = [...new Set(plan.rooms.map((r) => r.floor ?? 1))].sort((a, b) => a - b);
  const roofTop = floors.length * FLOOR_H;

  for (const floor of floors) {
    const yBase = (floor - 1) * FLOOR_H;
    const floorRooms = plan.rooms.filter((r) => (r.floor ?? 1) === floor);

    // Floor slab
    lines.push(`o Niveau_${floor}_Dalle`);
    addBox(plan.total_w / 2, yBase, plan.total_h / 2, plan.total_w, 0.12, plan.total_h);

    // Walls per room
    for (const r of floorRooms) {
      lines.push(`o ${r.name.replace(/[^a-zA-Z0-9]/g, "_")}_N${floor}`);

      const walls: Array<{ a: [number, number]; b: [number, number]; wall: "N" | "S" | "E" | "W" }> = [
        { a: [r.x, r.y], b: [r.x + r.w, r.y], wall: "N" },
        { a: [r.x + r.w, r.y], b: [r.x + r.w, r.y + r.h], wall: "E" },
        { a: [r.x + r.w, r.y + r.h], b: [r.x, r.y + r.h], wall: "S" },
        { a: [r.x, r.y + r.h], b: [r.x, r.y], wall: "W" },
      ];

      for (const w of walls) {
        const isHoriz = w.wall === "N" || w.wall === "S";
        const len = isHoriz ? r.w : r.h;
        const openings = plan.openings
          .filter((o) => o.room_id === r.id && o.wall === w.wall)
          .map((o) => ({ start: o.offset, end: o.offset + o.width, type: o.type }))
          .sort((a, b) => a.start - b.start);

        let cursor = 0;
        const pushSeg = (s: number, e: number, bottom: number, height: number) => {
          if (e - s < 1e-3 || height < 1e-3) return;
          const t1 = s / len, t2 = e / len;
          const ax = w.a[0] + (w.b[0] - w.a[0]) * t1;
          const az = w.a[1] + (w.b[1] - w.a[1]) * t1;
          const bx = w.a[0] + (w.b[0] - w.a[0]) * t2;
          const bz = w.a[1] + (w.b[1] - w.a[1]) * t2;
          const mx = (ax + bx) / 2, mz = (az + bz) / 2;
          const segLen = Math.hypot(bx - ax, bz - az);
          if (segLen < 1e-3) return;
          addBox(mx, yBase + bottom + height / 2, mz, segLen, height, WALL_T);
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
    }
  }

  // Roof
  if (plan.roof) {
    lines.push("o Toit");
    const over = plan.roof.debord || 0.5;
    const rw = plan.total_w + over * 2;
    const rd = plan.total_h + over * 2;
    const pente = plan.roof.pente || 30;
    const h = (rw / 2) * Math.tan((pente * Math.PI) / 180);
    const cx = plan.total_w / 2, cz = plan.total_h / 2;
    const hw = rw / 2, hd = rd / 2;

    if (plan.roof.type === "plat") {
      addBox(cx, roofTop + 0.06, cz, rw, 0.12, rd);
    } else {
      // Pitched roof: triangular prism
      const t0 = v(cx - hw, roofTop, cz - hd);
      const t1 = v(cx + hw, roofTop, cz - hd);
      const t2 = v(cx, roofTop + h, cz - hd);
      const b0 = v(cx - hw, roofTop, cz + hd);
      const b1 = v(cx + hw, roofTop, cz + hd);
      const b2 = v(cx, roofTop + h, cz + hd);

      f(t0, t1, b1, b0); // bottom roof face
      f(t1, t2, b2, b1); // right slope
      f(t0, t2, b0);     // left slope (triangle)
      f(t0, t1, t2);     // front triangle
      f(b0, b1, b2);     // back triangle
    }
  }

  // Furniture
  if (plan.furniture) {
    for (const f of plan.furniture) {
      const room = plan.rooms.find((r) => r.id === f.piece_id);
      const yBase = room ? ((room.floor ?? 1) - 1) * FLOOR_H : 0;
      lines.push(`o Meuble_${f.type}_${f.id}`);
      addBox(f.x + f.w / 2, yBase + f.h / 2, f.z + f.d / 2, f.w, f.h, f.d);
    }
  }

  // Trees
  if (plan.landscaping?.arbres) {
    for (const t of plan.landscaping.arbres) {
      const trunkH = t.hauteur * 0.4;
      const trunkR = 0.08 * Math.sqrt(t.hauteur);
      const crownR = t.diametre_couronne / 2;
      lines.push(`o Arbre_${t.type}_${t.id}`);
      addBox(t.x, trunkH / 2, t.z, trunkR * 2, trunkH, trunkR * 2);
      addBox(t.x, trunkH + crownR * 0.4, t.z, crownR * 1.6, crownR, crownR * 1.6);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function downloadObj(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
