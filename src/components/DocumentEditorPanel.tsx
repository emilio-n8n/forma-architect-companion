import { useState, useEffect } from "react";
import {
  FileText,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Share2,
  X,
  Download,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SpreadsheetPreview } from "./SpreadsheetPreview";
import { EmailPreview } from "./EmailPreview";

function markdownToWordHtml(md: string): string {
  const body = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, "</p><p>");
  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><style>
body{font-family:'Calibri',sans-serif;font-size:11pt;line-height:1.5;color:#1a1a1a;margin:2.5cm auto;max-width:800px;padding:0 20px}
h1{font-size:18pt;color:#dcb383;border-bottom:2px solid #dcb383;padding-bottom:6pt}
h2{font-size:14pt;color:#dcb383;margin-top:18pt}
h3{font-size:12pt;color:#e8c49a;margin-top:14pt}
strong{color:#1a3a5c}
code{background:#f0f0f0;padding:1pt 4pt;border-radius:2pt;font-size:10pt;font-family:'Consolas',monospace}
pre{background:#f5f5f5;padding:10pt;border-left:3pt solid #dcb383;margin:8pt 0}
li{margin-left:18pt;margin-bottom:4pt}
p{margin:4pt 0}
a{color:#2a5a8c}
</style></head><body>${body}</body></html>`;
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([mime.includes("csv") || mime.includes("msword") ? "\ufeff" + content : content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DocumentEditorPanel({
  content,
  onClose,
}: {
  content: { type: "doc" | "spreadsheet" | "email"; title: string; content: string } | null;
  onClose: () => void;
}) {
  const doc = content;
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen, onClose]);

  if (!doc) {
    return (
      <section
        className="flex-1 bg-[#171717] rounded-[24px] border border-[#333] flex flex-col overflow-hidden relative"
        data-purpose="document-panel"
      >
        <div className="flex items-center justify-end px-4 py-2">
          <button
            className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg hover:bg-[#333] transition-colors"
            onClick={onClose}
            title="Fermer le panneau"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-[#a3a3a3] text-sm -mt-8">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Sélectionnez un document dans la conversation</p>
            <p className="text-xs mt-1">ou demandez à l'agent d'en créer un</p>
          </div>
        </div>
      </section>
    );
  }

  const safeName = doc.title.replace(/[^a-zA-Z0-9\u00C0-\u024F -]/g, "").trim() || "document";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(doc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareText = `FORMA Agent — ${doc.title}\n\n${doc.content.slice(0, 500)}…`;
    if (navigator.share) {
      await navigator.share({ text: shareText }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(shareText);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handleDownload = () => {
    if (doc.type === "doc") {
      downloadBlob(markdownToWordHtml(doc.content), "application/msword", `${safeName}.docx`);
    } else if (doc.type === "spreadsheet") {
      try {
        const parsed = JSON.parse(doc.content);
        const cols = parsed.columns ?? [];
        const rows = parsed.rows ?? [];
        const csv = [
          cols.map((c: { label: string }) => `"${c.label}"`).join(","),
          ...rows.map((r: Record<string, unknown>) =>
            cols.map((c: { key: string }) => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`).join(","),
          ),
        ].join("\n");
        downloadBlob(csv, "text/csv;charset=utf-8", `${safeName}.csv`);
      } catch {
        downloadBlob(doc.content, "application/json", `${safeName}.json`);
      }
    } else {
      try {
        const parsed = JSON.parse(doc.content);
        const eml = [
          `From: ${parsed.from || "FORMA Agent"}`,
          `To: ${parsed.to ?? ""}`,
          parsed.cc ? `Cc: ${parsed.cc}` : "",
          `Subject: ${parsed.subject ?? ""}`,
          `Date: ${new Date().toUTCString()}`,
          "Content-Type: text/plain; charset=utf-8",
          "",
          parsed.body ?? "",
        ].filter(Boolean).join("\r\n");
        downloadBlob(eml, "message/rfc822;charset=utf-8", `${safeName}.eml`);
      } catch {
        downloadBlob(doc.content, "application/json", `${safeName}.json`);
      }
    }
  };

  const typeLabel = doc.type === "doc" ? "Document" : doc.type === "spreadsheet" ? "Tableur" : "Email";

  return (
    <section
      className={`flex-1 bg-[#171717] rounded-[24px] border border-[#333] flex flex-col overflow-hidden relative ${fullscreen ? "fixed inset-4 z-50" : ""}`}
      data-purpose="document-panel"
    >
      <header
        className="flex items-center justify-between gap-4 px-6 py-3 border-b border-[#333] text-sm text-[#a3a3a3] bg-[#171717] sticky top-0 z-10"
        data-purpose="document-toolbar"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-[10px] uppercase tracking-wider text-[#dcb383] bg-[#dcb383]/10 px-2 py-0.5 rounded-full shrink-0">
            {typeLabel}
          </span>
          <span className="text-[#e5e5e5] font-medium truncate">{doc.title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            className="hover:text-[#e5e5e5] p-1.5 rounded-lg hover:bg-[#262626] transition-colors"
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? "Réduire" : "Plein écran"}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            className="hover:text-[#e5e5e5] p-1.5 rounded-lg hover:bg-[#262626] transition-colors"
            onClick={handleCopy}
            title="Copier"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            className="hover:text-[#e5e5e5] p-1.5 rounded-lg hover:bg-[#262626] transition-colors"
            onClick={handleShare}
            title="Partager"
          >
            {shared ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
          </button>
          <button
            className="bg-[#dcb383] text-black px-3 py-1.5 rounded-full font-medium text-xs flex items-center gap-1.5 hover:bg-[#e8c49a] transition-colors ml-1"
            onClick={handleDownload}
            title={`Télécharger ${doc.type === "doc" ? ".docx" : doc.type === "spreadsheet" ? ".csv" : ".eml"}`}
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger
          </button>
          <button
            className="hover:text-[#e5e5e5] p-1.5 rounded-lg hover:bg-[#262626] transition-colors ml-1"
            onClick={onClose}
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <article
        className="flex-1 overflow-y-auto p-8 lg:p-12 text-[#e5e5e5] leading-relaxed"
        data-purpose="document-content"
      >
        {doc.type === "doc" && (
          <div className="prose prose-invert prose-sm max-w-none prose-headings:font-sans prose-headings:text-[#dcb383] prose-strong:text-[#dcb383] prose-a:text-[#dcb383] prose-code:text-[#dcb383] prose-code:bg-[#222] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#222] prose-pre:border prose-pre:border-[#333] prose-li:my-0.5 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
          </div>
        )}
        {doc.type === "spreadsheet" && <SpreadsheetPreview json={doc.content} />}
        {doc.type === "email" && <EmailPreview json={doc.content} />}
      </article>
    </section>
  );
}
