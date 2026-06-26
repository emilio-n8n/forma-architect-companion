import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Code, Copy, Check, Download, Maximize2, Minimize2, Eye, FileCode } from "lucide-react";

interface CodeData {
  html?: string;
  css?: string;
  js?: string;
  title?: string;
}

type Tab = "html" | "css" | "js" | "preview";

function buildSrcdoc(data: CodeData): string {
  const html = data.html || "";
  const css = data.css || "";
  const js = data.js || "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${css}</style>
</head>
<body>${html}
<script>${js}<\/script>
</body>
</html>`;
}

function buildStandaloneHtml(data: CodeData): string {
  const html = data.html || "";
  const css = data.css || "";
  const js = data.js || "";
  const title = data.title || "Code Export";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${css}</style>
</head>
<body>${html}
<script>${js}<\/script>
</body>
</html>`;
}

const TAB_LABELS: Record<Tab, string> = {
  html: "HTML",
  css: "CSS",
  js: "JS",
  preview: "Aperçu",
};

const TAB_ICONS: Record<Tab, typeof FileCode> = {
  html: FileCode,
  css: FileCode,
  js: FileCode,
  preview: Eye,
};

export function CodePreview({ json }: { json: string }) {
  const [tab, setTab] = useState<Tab>("preview");
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const data: CodeData | null = useMemo(() => {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as CodeData;
      }
      return null;
    } catch {
      return null;
    }
  }, [json]);

  const [editable, setEditable] = useState<CodeData>({});

  useEffect(() => {
    if (data) setEditable(data);
  }, [data]);

  const srcdoc = useMemo(() => {
    if (!data) return "";
    return buildSrcdoc(editable);
  }, [editable, data]);

  const handleChange = useCallback((field: "html" | "css" | "js", value: string) => {
    setEditable((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCopy = useCallback(async () => {
    const content = JSON.stringify(editable, null, 2);
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [editable]);

  const handleDownload = useCallback(() => {
    const html = buildStandaloneHtml(editable);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${editable.title || "code"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [editable]);

  if (!data) {
    return (
      <div className="my-3 border border-[#333] rounded-2xl p-4 text-sm text-[#a3a3a3] bg-[#171717] text-center">
        Données de code invalides
      </div>
    );
  }

  const containerClass = fullscreen
    ? "fixed inset-0 z-50 bg-[#171717] border-0 rounded-none my-0"
    : "my-3 border border-[#333] rounded-2xl overflow-hidden bg-[#171717]";

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#333] bg-[#222]">
        <div className="flex items-center gap-2 min-w-0">
          <Code className="h-4 w-4 text-[#dcb383] shrink-0" />
          <span className="text-sm font-medium text-[#e5e5e5] truncate">
            {editable.title || "Code"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg hover:bg-[#333] transition-colors"
            title="Copier le JSON"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg hover:bg-[#333] transition-colors"
            title="Télécharger HTML"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setFullscreen((v) => !v)}
            className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg hover:bg-[#333] transition-colors"
            title={fullscreen ? "Quitter plein écran" : "Plein écran"}
          >
            {fullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex border-b border-[#333] bg-[#1e1e1e]">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
          const Icon = TAB_ICONS[t];
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-[#dcb383] text-[#dcb383] bg-[#222]"
                  : "border-transparent text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#222]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {TAB_LABELS[t]}
            </button>
          );
        })}
      </div>

      <div
        className={
          fullscreen
            ? "h-[calc(100vh-104px)]"
            : "max-h-[60vh] min-h-[200px]"
        }
      >
        {tab === "html" && (
          <CodeEditor
            value={editable.html || ""}
            onChange={(v) => handleChange("html", v)}
            language="html"
          />
        )}
        {tab === "css" && (
          <CodeEditor
            value={editable.css || ""}
            onChange={(v) => handleChange("css", v)}
            language="css"
          />
        )}
        {tab === "js" && (
          <CodeEditor
            value={editable.js || ""}
            onChange={(v) => handleChange("js", v)}
            language="js"
          />
        )}
        {tab === "preview" && (
          <iframe
            ref={iframeRef}
            srcDoc={srcdoc}
            title={editable.title || "Aperçu"}
            sandbox="allow-scripts"
            className="w-full h-full bg-white"
          />
        )}
      </div>
    </div>
  );
}

function CodeEditor({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (v: string) => void;
  language: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-full bg-[#0d0d0d] text-[#d4d4d4] font-mono text-xs leading-relaxed p-4 resize-none focus:outline-none border-0"
      spellCheck={false}
      placeholder={`// ${language.toUpperCase()}`}
    />
  );
}
