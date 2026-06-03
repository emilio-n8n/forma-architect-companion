import { useState, useEffect } from "react";
import {
  FileText,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Undo2,
  Redo2,
  Share2,
  Settings,
  PenLine,
  X,
  Cloud,
  List,
  Link2,
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

function downloadDocx(html: string, filename: string) {
  const blob = new Blob(["\ufeff" + html], { type: "application/msword" });
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
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        if (isEditing) setIsEditing(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen, isEditing]);

  if (!doc) {
    return (
      <section
        className="flex-1 bg-[#171717] rounded-[24px] border border-[#333] flex flex-col overflow-hidden relative"
        data-purpose="document-panel"
      >
        <div className="flex items-center justify-end px-4 py-2">
          <button className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg hover:bg-[#333] transition-colors" onClick={onClose} title="Fermer le panneau">
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

  const handleCloud = () => {
    downloadDocx(markdownToWordHtml(doc.content), `${safeName}.docx`);
  };

  const safeName = doc.title.replace(/[^a-zA-Z0-9\u00C0-\u024F -]/g, "").trim() || "document";

  return (
    <section
      className="flex-1 bg-[#171717] rounded-[24px] border border-[#333] flex flex-col overflow-hidden relative"
      data-purpose="document-panel"
    >
      <header
        className="flex items-center justify-between px-6 py-3 border-b border-[#333] text-sm text-[#a3a3a3] bg-[#171717] sticky top-0 z-10"
        data-purpose="document-toolbar"
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-[#e5e5e5] font-medium truncate">{doc.title}</span>
          {doc.type === "spreadsheet" && (
            <span className="text-[10px] uppercase tracking-wider text-[#dcb383] bg-[#dcb383]/10 px-2 py-0.5 rounded-full">Tableur</span>
          )}
          {doc.type === "email" && (
            <span className="text-[10px] uppercase tracking-wider text-[#dcb383] bg-[#dcb383]/10 px-2 py-0.5 rounded-full">Email</span>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {doc.type === "doc" && (
              <>
                <button className="hover:text-[#e5e5e5] p-1" onClick={handleCloud} title="Télécharger .docx">
                  <Cloud className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-[#333] mx-1" />
                <button className="hover:text-[#e5e5e5] p-1 cursor-default opacity-50" title="Annuler (non disponible)">
                  <Undo2 className="w-4 h-4" />
                </button>
                <button className="hover:text-[#e5e5e5] p-1 cursor-default opacity-50" title="Rétablir (non disponible)">
                  <Redo2 className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-[#333] mx-1" />
                <span className="text-[#e5e5e5] px-2 cursor-default flex items-center gap-1 text-xs">
                  Paragraphe <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="m19.5 8.25-7.5 7.5-7.5-7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <div className="w-px h-4 bg-[#333] mx-1" />
                <button className="hover:text-[#e5e5e5] p-1 font-serif font-bold cursor-default opacity-50" title="Gras">B</button>
                <button className="hover:text-[#e5e5e5] p-1 font-serif italic cursor-default opacity-50" title="Italique">I</button>
                <button className="hover:text-[#e5e5e5] p-1 line-through cursor-default opacity-50" title="Barré">S</button>
                <button className="hover:text-[#e5e5e5] p-1 cursor-default opacity-50" title="Liste">
                  <List className="w-4 h-4" />
                </button>
                <button className="hover:text-[#e5e5e5] p-1 cursor-default opacity-50" title="Liste à puces">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button className="hover:text-[#e5e5e5] p-1 font-serif cursor-default opacity-50" title="Formule">fx</button>
                <button className="hover:text-[#e5e5e5] p-1 cursor-default opacity-50" title="Lien">
                  <Link2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="hover:text-[#e5e5e5] p-1" onClick={handleCopy} title="Copier">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button className="hover:text-[#e5e5e5] p-1" title="Partager" onClick={handleShare}>
            {shared ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
          </button>
          {doc.type === "doc" && (
            <button
              className="bg-[#dcb383] text-black px-4 py-1.5 rounded-full font-medium text-xs flex items-center gap-1 hover:bg-[#e8c49a] transition-colors"
              onClick={() => downloadDocx(markdownToWordHtml(doc.content), `${safeName}.docx`)}
              title="Télécharger .docx"
            >
              Créer
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="m19.5 8.25-7.5 7.5-7.5-7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
          <button className="hover:text-[#e5e5e5] p-1 ml-2" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <article
        className={`flex-1 overflow-y-auto p-8 lg:p-16 pb-32 text-[#e5e5e5] leading-relaxed ${fullscreen ? "fixed inset-0 z-50 bg-[#171717] pt-20" : ""}`}
        data-purpose="document-content"
      >
        {doc.type === "doc" && isEditing && (
          <textarea
            className="w-full h-full min-h-[60vh] bg-transparent border-none text-[#e5e5e5] font-mono text-sm leading-relaxed resize-none focus:outline-none"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            autoFocus
          />
        )}
        {doc.type === "doc" && !isEditing && (
          <div className="prose prose-invert prose-sm max-w-none prose-headings:font-sans prose-headings:text-[#dcb383] prose-strong:text-[#dcb383] prose-a:text-[#dcb383] prose-code:text-[#dcb383] prose-code:bg-[#222] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#222] prose-pre:border prose-pre:border-[#333] prose-li:my-0.5 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
          </div>
        )}
        {doc.type === "spreadsheet" && (
          <div className="max-w-full">
            <SpreadsheetPreview json={doc.content} />
          </div>
        )}
        {doc.type === "email" && (
          <div className="max-w-full">
            <EmailPreview json={doc.content} />
          </div>
        )}
      </article>

      <div
        className="absolute bottom-6 right-6 flex flex-col gap-2 bg-[#2a2a2a] border border-[#3f3f3f] rounded-full p-2 shadow-lg"
        data-purpose="floating-actions"
      >
        <button
          className="p-2 text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#3a3a3a] rounded-full transition-colors"
          title={fullscreen ? "Réduire" : "Plein écran"}
          onClick={() => setFullscreen(!fullscreen)}
        >
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        <button
          className="p-2 text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#3a3a3a] rounded-full transition-colors"
          title="Paramètres"
          onClick={() => {
            const el = document.querySelector('[data-purpose="document-content"]');
            el?.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          className="p-2 text-[#dcb383] hover:bg-[#3a3a3a] rounded-full transition-colors"
          title={isEditing ? "Terminer l'édition" : "Modifier"}
          onClick={() => {
            if (!isEditing) {
              setEditContent(doc.content);
            }
            setIsEditing(!isEditing);
          }}
        >
          <PenLine className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
