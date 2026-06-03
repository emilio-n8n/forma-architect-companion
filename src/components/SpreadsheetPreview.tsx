import { useState, useMemo } from "react";
import { Table, Download, Copy, Check, ArrowUpDown, Sigma } from "lucide-react";

type CellValue = string | number | boolean | null;

interface SpreadsheetData {
  columns: { key: string; label: string; type?: "string" | "number" | "boolean" }[];
  rows: Record<string, CellValue>[];
  title?: string;
}

function formatCell(val: CellValue): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "boolean") return val ? "Oui" : "Non";
  if (typeof val === "number") {
    return Number.isInteger(val) ? val.toString() : val.toFixed(2);
  }
  return String(val);
}

function toCsv(data: SpreadsheetData): string {
  const headers = data.columns.map((c) => `"${c.label}"`).join(",");
  const rows = data.rows.map((r) =>
    data.columns.map((c) => `"${formatCell(r[c.key]).replace(/"/g, '""')}"`).join(","),
  );
  return [headers, ...rows].join("\n");
}

export function SpreadsheetPreview({ json }: { json: string }) {
  const [copied, setCopied] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const data: SpreadsheetData | null = useMemo(() => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.columns && parsed.rows) return parsed as SpreadsheetData;
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return null;
        if (parsed[0].columns && parsed[0].rows) return parsed[0] as SpreadsheetData;
        const keys = Object.keys(parsed[0]);
        return {
          columns: keys.map((k) => ({ key: k, label: k, type: typeof parsed[0][k] as "string" | "number" })),
          rows: parsed as Record<string, CellValue>[],
        };
      }
      return null;
    } catch {
      return null;
    }
  }, [json]);

  const sortedRows = useMemo(() => {
    if (!data) return [];
    if (!sortKey) return data.rows;
    return [...data.rows].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [data, sortKey, sortAsc]);

  const numericCols = useMemo(() => {
    if (!data) return new Set<string>();
    const cols = new Set<string>();
    for (const c of data.columns) {
      if (c.type === "number" || data.rows.every((r) => typeof r[c.key] === "number")) {
        cols.add(c.key);
      }
    }
    return cols;
  }, [data]);

  const aggregations = useMemo(() => {
    if (!data) return null;
    const agg: Record<string, { sum: number; avg: number; count: number }> = {};
    for (const col of data.columns) {
      if (!numericCols.has(col.key)) continue;
      const vals = data.rows.map((r) => Number(r[col.key])).filter((v) => !isNaN(v));
      agg[col.key] = {
        sum: vals.reduce((a, b) => a + b, 0),
        avg: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0,
        count: vals.length,
      };
    }
    return agg;
  }, [data, numericCols]);

  if (!data || data.columns.length === 0) {
    return (
      <div className="my-3 border border-[#333] rounded-2xl p-4 text-sm text-[#a3a3a3] bg-[#171717] text-center">
        Données de tableau invalides
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(toCsv(data));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob(["\ufeff" + toCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.title || "tableur"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-3 border border-[#333] rounded-2xl overflow-hidden bg-[#171717]">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#333] bg-[#222]">
        <div className="flex items-center gap-2 min-w-0">
          <Table className="h-4 w-4 text-[#dcb383] shrink-0" />
          <span className="text-sm font-medium text-[#e5e5e5] truncate">{data.title || "Tableur"}</span>
          <span className="text-xs text-[#a3a3a3] shrink-0">
            {data.rows.length} ligne{data.rows.length > 1 ? "s" : ""} · {data.columns.length} colonne{data.columns.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleCopy} className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg hover:bg-[#333] transition-colors" title="Copier CSV">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button onClick={handleDownload} className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg hover:bg-[#333] transition-colors" title="Télécharger CSV">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#1e1e1e]">
              <th className="text-left px-3 py-2 text-xs text-[#a3a3a3] font-medium border-b border-[#333] w-10 text-center">
                #
              </th>
              {data.columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-3 py-2 text-xs font-medium text-[#a3a3a3] border-b border-[#333] cursor-pointer hover:text-[#dcb383] select-none whitespace-nowrap"
                  onClick={() => {
                    if (sortKey === col.key) setSortAsc(!sortAsc);
                    else { setSortKey(col.key); setSortAsc(true); }
                  }}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <ArrowUpDown className={`h-3 w-3 ${sortAsc ? "rotate-0" : "rotate-180"}`} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr key={i} className="border-b border-[#333]/50 hover:bg-[#222] transition-colors">
                <td className="px-3 py-1.5 text-xs text-[#a3a3a3] text-center font-mono">
                  {i + 1}
                </td>
                {data.columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-1.5 whitespace-nowrap text-[#d4d4d4] ${numericCols.has(col.key) ? "text-right font-mono tabular-nums" : ""}`}
                  >
                    {formatCell(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {aggregations && Object.keys(aggregations).length > 0 && (
            <tfoot>
              <tr className="bg-[#222] border-t-2 border-[#dcb383]/40">
                <td className="px-3 py-2 text-xs text-[#a3a3a3] text-center">
                  <Sigma className="h-3 w-3 inline" />
                </td>
                {data.columns.map((col) => {
                  const agg = aggregations[col.key];
                  if (!agg) return <td key={col.key} className="px-3 py-2" />;
                  return (
                    <td key={col.key} className="px-3 py-2 text-xs text-[#a3a3a3] font-mono tabular-nums">
                      <span className="text-[#dcb383]">∑</span> {agg.sum.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                      <span className="text-[#a3a3a3]/50 mx-1">·</span>
                      <span className="text-[#dcb383]">x̄</span> {agg.avg.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
