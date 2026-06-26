import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Share2,
  X,
  Download,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Minus,
  Undo2,
  Redo2,
  Save,
  Eye,
  Edit3,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SpreadsheetPreview } from "./SpreadsheetPreview";
import { EmailPreview } from "./EmailPreview";
import { toast } from "sonner";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

function mdToEditorHtml(md: string): string {
  const lines = md.split("\n");
  const result: string[] = [];
  let inList: "ul" | "ol" | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const headingMatch = line.match(/^(#{1,3}) (.+)/);
    if (headingMatch) {
      if (inList) { result.push(`</${inList}>`); inList = null; }
      const level = headingMatch[1].length;
      result.push(`<h${level}>${inlineFormat(escapeHtml(headingMatch[2]))}</h${level}>`);
      continue;
    }

    const ulMatch = line.match(/^- (.+)/);
    if (ulMatch) {
      if (inList !== "ul") {
        if (inList) result.push(`</${inList}>`);
        result.push("<ul>");
        inList = "ul";
      }
      result.push(`<li>${inlineFormat(escapeHtml(ulMatch[1]))}</li>`);
      continue;
    }

    const olMatch = line.match(/^\d+\. (.+)/);
    if (olMatch) {
      if (inList !== "ol") {
        if (inList) result.push(`</${inList}>`);
        result.push("<ol>");
        inList = "ol";
      }
      result.push(`<li>${inlineFormat(escapeHtml(olMatch[1]))}</li>`);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      if (inList) { result.push(`</${inList}>`); inList = null; }
      result.push("<hr>");
      continue;
    }

    if (!line.trim()) {
      if (inList) { result.push(`</${inList}>`); inList = null; }
      continue;
    }

    if (inList) { result.push(`</${inList}>`); inList = null; }
    result.push(`<p>${inlineFormat(escapeHtml(line))}</p>`);
  }

  if (inList) result.push(`</${inList}>`);
  return result.join("\n");
}

function htmlToMd(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;

  function process(node: ChildNode, indent: string): string {
    let result = "";
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        result += child.textContent;
      } else if (child instanceof HTMLElement) {
        const tag = child.tagName.toLowerCase();
        const inner = process(child, indent);
        switch (tag) {
          case "h1": result += `\n\n# ${inner.trim()}\n\n`; break;
          case "h2": result += `\n\n## ${inner.trim()}\n\n`; break;
          case "h3": result += `\n\n### ${inner.trim()}\n\n`; break;
          case "strong": case "b": result += `**${inner}**`; break;
          case "em": case "i": result += `*${inner}*`; break;
          case "u": result += inner; break;
          case "a": {
            const href = child.getAttribute("href") || "";
            result += `[${inner}](${href})`;
            break;
          }
          case "li": {
            const parent = child.parentElement;
            const isOrdered = parent?.tagName.toLowerCase() === "ol";
            const prefix = isOrdered ? "1. " : "- ";
            result += `${indent}${prefix}${inner.trim()}\n`;
            break;
          }
          case "ul": case "ol": result += `\n${process(child, indent + "  ")}\n`; break;
          case "hr": result += `\n\n---\n\n`; break;
          case "p": result += `\n\n${inner.trim()}\n\n`; break;
          case "br": result += "\n"; break;
          case "code": result += `\`${inner}\``; break;
          case "div": result += process(child, indent); break;
          case "span": result += inner; break;
          default: result += inner; break;
        }
      }
    }
    return result;
  }

  return process(div, "").replace(/\n{4,}/g, "\n\n\n").trim();
}

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

type FmtState = {
  bold: boolean; italic: boolean; underline: boolean;
  h1: boolean; h2: boolean; h3: boolean;
  ol: boolean; ul: boolean;
};

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
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [activeContent, setActiveContent] = useState(doc?.content ?? "");
  const [isModified, setIsModified] = useState(false);
  const [fmt, setFmt] = useState<FmtState>({
    bold: false, italic: false, underline: false,
    h1: false, h2: false, h3: false,
    ol: false, ul: false,
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

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

  useEffect(() => {
    if (doc) {
      setActiveContent(doc.content);
      setIsModified(false);
      initializedRef.current = false;
    }
  }, [doc]);

  useEffect(() => {
    if (!editorRef.current || !doc || doc.type !== "doc" || mode !== "edit") return;
    if (initializedRef.current) return;
    editorRef.current.innerHTML = mdToEditorHtml(activeContent);
    initializedRef.current = true;
  }, [activeContent, doc, mode]);

  useEffect(() => {
    if (mode !== "edit" || !doc || doc.type !== "doc") return;
    const update = () => {
      setFmt({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        h1: ["h1", "<h1>"].includes(document.queryCommandValue("formatBlock")),
        h2: ["h2", "<h2>"].includes(document.queryCommandValue("formatBlock")),
        h3: ["h3", "<h3>"].includes(document.queryCommandValue("formatBlock")),
        ol: document.queryCommandState("insertOrderedList"),
        ul: document.queryCommandState("insertUnorderedList"),
      });
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [mode, doc]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    setIsModified(true);
  }, []);

  const handleUndo = useCallback(() => {
    document.execCommand("undo");
    setIsModified(true);
    editorRef.current?.focus();
  }, []);

  const handleRedo = useCallback(() => {
    document.execCommand("redo");
    setIsModified(true);
    editorRef.current?.focus();
  }, []);

  const handleSave = useCallback(() => {
    if (!editorRef.current) return;
    const md = htmlToMd(editorRef.current.innerHTML);
    setActiveContent(md);
    setIsModified(false);
  }, []);

  const handleInsertLink = useCallback(() => {
    const url = window.prompt("Entrez l'URL du lien:", "https://");
    if (url) {
      exec("createLink", url);
    }
  }, [exec]);

  const handleInsertHr = useCallback(() => {
    exec("insertHorizontalRule");
  }, [exec]);

  const handleHeading = useCallback((level: string) => {
    const current = document.queryCommandValue("formatBlock");
    if (current?.toLowerCase().includes(level) || current?.toLowerCase() === level) {
      exec("formatBlock", "<p>");
    } else {
      exec("formatBlock", `<${level}>`);
    }
  }, [exec]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      if (e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else {
        e.preventDefault();
        handleUndo();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "y") {
      e.preventDefault();
      handleRedo();
    }
  }, [handleSave, handleUndo, handleRedo]);

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
    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareText = `FORMA Agent — ${doc.title}\n\n${activeContent.slice(0, 500)}…`;
    if (navigator.share) {
      await navigator.share({ text: shareText }).catch((e) => { console.error("[navigator.share]", e); toast.error(e instanceof Error ? e.message : "Une erreur est survenue"); });
    } else {
      await navigator.clipboard.writeText(shareText);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handleDownload = () => {
    if (doc.type === "doc") {
      downloadBlob(markdownToWordHtml(activeContent), "application/msword", `${safeName}.docx`);
    } else if (doc.type === "spreadsheet") {
      try {
        const parsed = JSON.parse(activeContent);
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
        downloadBlob(activeContent, "application/json", `${safeName}.json`);
      }
    } else {
      try {
        const parsed = JSON.parse(activeContent);
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
        downloadBlob(activeContent, "application/json", `${safeName}.json`);
      }
    }
  };

  const typeLabel = doc.type === "doc" ? "Document" : doc.type === "spreadsheet" ? "Tableur" : "Email";

  const tbBtn = (onClick: () => void, active: boolean, title: string, children: React.ReactNode) => (
    <button
      className={`p-1.5 rounded-lg transition-colors ${
        active
          ? "bg-[#dcb383]/20 text-[#dcb383]"
          : "text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#262626]"
      }`}
      onClick={onClick}
      title={title}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );

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
          {isModified && (
            <span className="text-[10px] text-[#dcb383] bg-[#dcb383]/10 px-2 py-0.5 rounded-full shrink-0">
              Modifié
            </span>
          )}
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

      {doc.type === "doc" && (
        <div className="border-b border-[#333] bg-[#171717] sticky z-10" style={{ top: "49px" }}>
          <div className="flex items-center gap-0.5 px-3 py-1.5 overflow-x-auto">
            {tbBtn(() => setMode(mode === "edit" ? "preview" : "edit"), false, mode === "edit" ? "Aperçu" : "Édition")(
              mode === "edit" ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />
            )}
            <span className="w-px h-5 bg-[#333] mx-1 shrink-0" />

            {tbBtn(() => exec("bold"), fmt.bold, "Gras (Ctrl+B)")(<Bold className="w-4 h-4" />)}
            {tbBtn(() => exec("italic"), fmt.italic, "Italique (Ctrl+I)")(<Italic className="w-4 h-4" />)}
            {tbBtn(() => exec("underline"), fmt.underline, "Souligné (Ctrl+U)")(<Underline className="w-4 h-4" />)}
            <span className="w-px h-5 bg-[#333] mx-1 shrink-0" />

            {tbBtn(() => handleHeading("h1"), fmt.h1, "Titre 1")(<span className="text-xs font-bold leading-none">H1</span>)}
            {tbBtn(() => handleHeading("h2"), fmt.h2, "Titre 2")(<span className="text-xs font-bold leading-none">H2</span>)}
            {tbBtn(() => handleHeading("h3"), fmt.h3, "Titre 3")(<span className="text-xs font-bold leading-none">H3</span>)}
            <span className="w-px h-5 bg-[#333] mx-1 shrink-0" />

            {tbBtn(() => exec("insertOrderedList"), fmt.ol, "Liste numérotée")(<ListOrdered className="w-4 h-4" />)}
            {tbBtn(() => exec("insertUnorderedList"), fmt.ul, "Liste à puces")(<List className="w-4 h-4" />)}
            <span className="w-px h-5 bg-[#333] mx-1 shrink-0" />

            {tbBtn(handleInsertLink, false, "Insérer un lien")(<Link className="w-4 h-4" />)}
            {tbBtn(handleInsertHr, false, "Ligne horizontale")(<Minus className="w-4 h-4" />)}
            <span className="w-px h-5 bg-[#333] mx-1 shrink-0" />

            {tbBtn(handleUndo, false, "Annuler (Ctrl+Z)")(<Undo2 className="w-4 h-4" />)}
            {tbBtn(handleRedo, false, "Rétablir (Ctrl+Maj+Z)")(<Redo2 className="w-4 h-4" />)}
            <span className="w-px h-5 bg-[#333] mx-1 shrink-0" />

            <button
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                isModified
                  ? "bg-[#dcb383] text-black hover:bg-[#e8c49a]"
                  : "text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#262626]"
              }`}
              onClick={handleSave}
              title="Enregistrer (Ctrl+S)"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Save className="w-4 h-4" />
              <span className="text-[10px] font-medium">Sauvegarder</span>
            </button>
          </div>
        </div>
      )}

      <article
        className="flex-1 overflow-y-auto p-8 lg:p-12 text-[#e5e5e5] leading-relaxed"
        data-purpose="document-content"
      >
        {doc.type === "doc" && mode === "preview" && (
          <div className="prose prose-invert prose-sm max-w-none prose-headings:font-sans prose-headings:text-[#dcb383] prose-strong:text-[#dcb383] prose-a:text-[#dcb383] prose-code:text-[#dcb383] prose-code:bg-[#222] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#222] prose-pre:border prose-pre:border-[#333] prose-li:my-0.5 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeContent}</ReactMarkdown>
          </div>
        )}
        {doc.type === "doc" && mode === "edit" && (
          <div
            ref={editorRef}
            className="min-h-[300px] focus:outline-none leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-[#dcb383] [&_h1]:border-b [&_h1]:border-[#dcb383]/30 [&_h1]:pb-2 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#dcb383] [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-[#e8c49a] [&_h3]:mt-4 [&_h3]:mb-1 [&_strong]:text-[#dcb383] [&_a]:text-[#dcb383] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_hr]:border-[#333] [&_hr]:my-6 [&_code]:bg-[#222] [&_code]:text-[#dcb383] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_p]:my-2"
            contentEditable
            suppressContentEditableWarning
            onKeyDown={handleKeyDown}
            onInput={() => setIsModified(true)}
            data-purpose="rich-editor"
          />
        )}
        {doc.type === "spreadsheet" && <SpreadsheetPreview json={activeContent} />}
        {doc.type === "email" && <EmailPreview json={activeContent} />}
      </article>
    </section>
  );
}
