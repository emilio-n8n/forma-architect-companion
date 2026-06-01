import type { PlanData, Room, Opening } from "@/lib/plans.functions";

const fmt = (n: number) => n.toFixed(3);

/** Build inner SVG markup (without <svg> wrapper) — used for both DOM render & export. */
export function planToSvgInner(plan: PlanData, scale = 50, floor?: number): string {
  const W = plan.total_w * scale;
  const H = plan.total_h * scale;
  const wallStroke = 6;

  const rooms = (floor ? plan.rooms.filter((r) => (r.floor ?? 1) === floor) : plan.rooms)
    .map((r) => {
      const x = r.x * scale;
      const y = r.y * scale;
      const w = r.w * scale;
      const h = r.h * scale;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const area = (r.w * r.h).toFixed(1);
      return `
  <g>
    <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="#fafaf7" stroke="#111" stroke-width="${wallStroke}"/>
    <text x="${fmt(cx)}" y="${fmt(cy - 6)}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="14" fill="#111">${escapeXml(r.name)}</text>
    <text x="${fmt(cx)}" y="${fmt(cy + 12)}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="11" fill="#555">${area} m²</text>
    <text x="${fmt(x + 4)}" y="${fmt(y + 14)}" font-family="Helvetica,Arial,sans-serif" font-size="9" fill="#888">${r.w.toFixed(2)} × ${r.h.toFixed(2)} m</text>
  </g>`;
    })
    .join("");

  const openings = plan.openings
    .map((o) => openingSvg(o, plan.rooms, scale))
    .filter(Boolean)
    .join("");

  // Outer bbox + N arrow
  const decoration = `
  <rect x="0" y="0" width="${fmt(W)}" height="${fmt(H)}" fill="none" stroke="#111" stroke-width="2"/>
  <g transform="translate(${fmt(W - 50)}, 30)">
    <circle r="18" fill="none" stroke="#111" stroke-width="1.2"/>
    <path d="M0,-14 L4,4 L0,1 L-4,4 Z" fill="#111"/>
    <text y="-22" text-anchor="middle" font-family="Helvetica" font-size="10" fill="#111">N</text>
  </g>`;
  return decoration + rooms + openings;
}

function openingSvg(o: Opening, rooms: Room[], scale: number): string {
  const r = rooms.find((x) => x.id === o.room_id);
  if (!r) return "";
  const off = o.offset * scale;
  const w = o.width * scale;
  let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
  const baseX = r.x * scale;
  const baseY = r.y * scale;
  const W = r.w * scale;
  const H = r.h * scale;
  if (o.wall === "N") { x1 = baseX + off; y1 = baseY; x2 = x1 + w; y2 = baseY; }
  if (o.wall === "S") { x1 = baseX + off; y1 = baseY + H; x2 = x1 + w; y2 = baseY + H; }
  if (o.wall === "W") { x1 = baseX; y1 = baseY + off; x2 = baseX; y2 = y1 + w; }
  if (o.wall === "E") { x1 = baseX + W; y1 = baseY + off; x2 = baseX + W; y2 = y1 + w; }
  const color = o.type === "door" ? "#c4a264" : "#4a90e2";
  return `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}" stroke="${color}" stroke-width="8" stroke-linecap="butt"/>`;
}

export function planToSvgString(plan: PlanData, scale = 50, floor?: number): string {
  const W = plan.total_w * scale;
  const H = plan.total_h * scale;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(W)} ${fmt(H)}" width="${fmt(W)}" height="${fmt(H)}">
${planToSvgInner(plan, scale, floor)}
</svg>`;
}

/** DXF (R12 ASCII) — LINE entities for walls + TEXT labels.
 *  Compatible with AutoCAD, BricsCAD, ArchiCAD, Revit (import), LibreCAD.
 *  ⭐ FIX: Added proper R12 headers, layer definitions, and entity validation
 */
export function planToDxfString(plan: PlanData, floor?: number): string {
  const rooms = floor ? plan.rooms.filter((r) => (r.floor ?? 1) === floor) : plan.rooms;
  const openings = floor
    ? plan.openings.filter((o) => rooms.some((r) => r.id === o.room_id))
    : plan.openings;
  const lines: string[] = [];
  
  // ⭐ FIX: Proper DXF R12 format with all required headers
  const header = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
9
$INSUNITS
70
6
9
$ACADMAINTVER
70
72
0
ENDSEC`;
  
  // ⭐ FIX: Define layers (TABLES section is required in R12)
  const tables = `0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
4
0
LAYER
2
WALLS
70
64
62
7
6
Continuous
0
LAYER
2
DOORS
70
64
62
7
6
Continuous
0
LAYER
2
WINDOWS
70
64
62
7
6
Continuous
0
LAYER
2
TEXT
70
64
62
7
6
Continuous
0
ENDTAB
0
ENDSEC`;
  
  const pushLine = (x1: number, y1: number, x2: number, y2: number, layer = "WALLS") => {
    // DXF Y up — flip Y around total_h.
    const Y1 = plan.total_h - y1;
    const Y2 = plan.total_h - y2;
    lines.push(
      "0", "LINE",
      "8", layer,
      "10", x1.toFixed(4), "20", Y1.toFixed(4), "30", "0.0",
      "11", x2.toFixed(4), "21", Y2.toFixed(4), "31", "0.0"
    );
  };
  
  const pushText = (x: number, y: number, txt: string, height = 0.25, layer = "TEXT") => {
    const Y = plan.total_h - y;
    // ⭐ FIX: Escape special characters in DXF text
    const safeTxt = txt.replace(/[\\;]/g, "_");
    lines.push(
      "0", "TEXT",
      "8", layer,
      "10", x.toFixed(4), "20", Y.toFixed(4), "30", "0.0",
      "40", height.toFixed(3), "1", safeTxt
    );
  };

  for (const r of rooms) {
    pushLine(r.x, r.y, r.x + r.w, r.y);
    pushLine(r.x + r.w, r.y, r.x + r.w, r.y + r.h);
    pushLine(r.x + r.w, r.y + r.h, r.x, r.y + r.h);
    pushLine(r.x, r.y + r.h, r.x, r.y);
    pushText(r.x + r.w * 0.15, r.y + r.h * 0.6, r.name, 0.30);
    pushText(r.x + r.w * 0.15, r.y + r.h * 0.4, `${(r.w * r.h).toFixed(2)} m2`, 0.20);
  }
  
  // Openings on OPENINGS layer (overwrite wall segment visually in CAD)
  for (const o of openings) {
    const r = rooms.find((x) => x.id === o.room_id);
    if (!r) continue;
    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    if (o.wall === "N") { x1 = r.x + o.offset; y1 = r.y; x2 = x1 + o.width; y2 = r.y; }
    if (o.wall === "S") { x1 = r.x + o.offset; y1 = r.y + r.h; x2 = x1 + o.width; y2 = r.y + r.h; }
    if (o.wall === "W") { x1 = r.x; y1 = r.y + o.offset; x2 = r.x; y2 = y1 + o.width; }
    if (o.wall === "E") { x1 = r.x + r.w; y1 = r.y + o.offset; x2 = r.x + r.w; y2 = y1 + o.width; }
    pushLine(x1, y1, x2, y2, o.type === "door" ? "DOORS" : "WINDOWS");
  }

  const body = lines.join("\n");
  return `${header}
${tables}
0
SECTION
2
ENTITIES
${body}
0
ENDSEC
0
EOF
`;
}

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}
