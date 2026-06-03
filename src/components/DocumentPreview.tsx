import { useState } from "react";
import { FileText, Download, Copy, Check, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
h1{font-size:18pt;color:#1a3a5c;border-bottom:2px solid #1a3a5c;padding-bottom:6pt}
h2{font-size:14pt;color:#2a5a8c;margin-top:18pt}
h3{font-size:12pt;color:#3a7abc;margin-top:14pt}
strong{color:#1a3a5c}
code{background:#f0f0f0;padding:1pt 4pt;border-radius:2pt;font-size:10pt;font-family:'Consolas',monospace}
pre{background:#f5f5f5;padding:10pt;border-left:3pt solid #1a3a5c;margin:8pt 0}
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

export function DocumentPreview({ title, content }: { title?: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const docTitle = title || content.split("\n")[0]?.replace(/^#+\s*/, "").slice(0, 60) || "Document";
  const safeName = docTitle.replace(/[^a-zA-Z0-9\u00C0-\u024F -]/g, "").trim() || "document";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 border border-border/40 rounded-lg overflow-hidden bg-card">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">{docTitle}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)} title={expanded ? "Réduire" : "Agrandir"}>
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="Copier">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => downloadDocx(markdownToWordHtml(content), `${safeName}.docx`)}
            title="Télécharger .docx"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className={`${expanded ? "max-h-[70vh]" : "max-h-[40vh]"} overflow-y-auto transition-all`}>
        <div className="px-5 py-4 bg-white/5">
          <div className="prose prose-invert prose-sm max-w-none prose-headings:font-display prose-headings:text-foreground prose-strong:text-primary prose-a:text-primary prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border/40 prose-li:my-0.5 leading-relaxed [word-spacing:0.05em]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
