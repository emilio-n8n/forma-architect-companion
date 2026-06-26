import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Code } from "lucide-react";

export function isTruncated(text: string): boolean {
  const openCount = (text.match(/```(doc|spreadsheet|email|code)\b/g) || []).length;
  const closeCount = (text.match(/```$/gm) || []).length;
  return openCount > closeCount;
}

export function ReactMarkdownContent({
  text,
  onOpenContent,
  messageIdx,
}: {
  text: string;
  onOpenContent: (content: { type: "doc" | "spreadsheet" | "email" | "code"; title: string; content: string } | null) => void;
  messageIdx: number;
}) {
  const renderers: import("react-markdown").Components = {
    strong: ({ children }) => {
      const t = typeof children === "string" ? children : "";
      if (t.startsWith("[RF:")) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#dcb383]/30 bg-[#dcb383]/5 text-[#dcb383] font-mono text-[11px] leading-tight mx-0.5">
            {t}
          </span>
        );
      }
      return <strong>{children}</strong>;
    },
    code: ({ className, children, ...props }) => {
      const isInline = !className;
      const content = String(children || "").replace(/\n$/, "");
      const lang = className?.replace(/^language-/, "") ?? "";
      if (!isInline && lang === "doc") {
        const title = content.split("\n")[0]?.replace(/^#+\s*/, "").trim();
        return (
          <div
            className="border border-[#333] rounded-2xl p-4 flex items-center gap-3 bg-[#171717] cursor-pointer hover:bg-[#1e1e1e] transition-colors my-3"
            onClick={() => onOpenContent({ type: "doc", title: title || "Document", content })}
          >
            <div className="text-[#a3a3a3]">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#e5e5e5] text-sm truncate">{title || "Document"}</h4>
              <p className="text-xs text-[#a3a3a3] mt-0.5">
                {new Date().toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      }
      if (!isInline && lang === "spreadsheet") {
        let title = "Tableur";
        try {
          const parsed = JSON.parse(content);
          if (parsed.title) title = parsed.title;
        } catch {}
        return (
          <div
            className="border border-[#333] rounded-2xl p-4 flex items-center gap-3 bg-[#171717] cursor-pointer hover:bg-[#1e1e1e] transition-colors my-3"
            onClick={() => onOpenContent({ type: "spreadsheet", title, content })}
          >
            <div className="text-[#a3a3a3]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m0 0V5.625M12 18.375c0 .621-.504 1.125-1.125 1.125H4.5M12 5.625V3.375c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25M12 5.625h7.5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#e5e5e5] text-sm truncate">{title}</h4>
              <p className="text-xs text-[#a3a3a3] mt-0.5">Tableau de données · cliquer pour ouvrir</p>
            </div>
          </div>
        );
      }
      if (!isInline && lang === "email") {
        let subject = "Email";
        try {
          const parsed = JSON.parse(content);
          if (parsed.subject) subject = parsed.subject;
        } catch {}
        return (
          <div
            className="border border-[#333] rounded-2xl p-4 flex items-center gap-3 bg-[#171717] cursor-pointer hover:bg-[#1e1e1e] transition-colors my-3"
            onClick={() => onOpenContent({ type: "email", title: subject, content })}
          >
            <div className="text-[#a3a3a3]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#e5e5e5] text-sm truncate">{subject}</h4>
              <p className="text-xs text-[#a3a3a3] mt-0.5">Email · cliquer pour ouvrir</p>
            </div>
          </div>
        );
      }
      if (!isInline && lang === "code") {
        let title = "Code";
        try {
          const parsed = JSON.parse(content);
          if (parsed.title) title = parsed.title;
        } catch {}
        return (
          <div
            className="border border-[#333] rounded-2xl p-4 flex items-center gap-3 bg-[#171717] cursor-pointer hover:bg-[#1e1e1e] transition-colors my-3"
            onClick={() => onOpenContent({ type: "code", title, content })}
          >
            <div className="text-[#a3a3a3]">
              <Code className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#e5e5e5] text-sm truncate">{title}</h4>
              <p className="text-xs text-[#a3a3a3] mt-0.5">Code HTML/CSS/JS · cliquer pour ouvrir</p>
            </div>
          </div>
        );
      }
      if (isInline) {
        return (
          <code className="text-[#dcb383] bg-[#222] px-1 py-0.5 rounded text-sm" {...props}>
            {children}
          </code>
        );
      }
      return (
        <pre className="bg-[#222] border border-[#333] rounded-lg p-4 overflow-x-auto text-sm text-[#e5e5e5]">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    p: ({ children }) => <p className="my-2 leading-relaxed text-[#d4d4d4]">{children}</p>,
    h1: ({ children }) => <h1 className="text-xl font-semibold text-[#f5f5f5] mt-6 mb-3 leading-tight">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-semibold text-[#f0f0f0] mt-5 mb-2 leading-tight">{children}</h2>,
    h3: ({ children }) => <h3 className="text-[15px] font-semibold text-[#e8e8e8] mt-4 mb-1.5">{children}</h3>,
    h4: ({ children }) => <h4 className="text-sm font-semibold text-[#e5e5e5] mt-3 mb-1">{children}</h4>,
    ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1 marker:text-[#dcb383]/60">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1 marker:text-[#dcb383]/60">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed text-[#d4d4d4]">{children}</li>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#dcb383] underline decoration-[#dcb383]/40 underline-offset-2 hover:decoration-[#dcb383] break-words">
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-[#dcb383]/40 pl-3 my-3 text-[#bbb] italic">{children}</blockquote>
    ),
    hr: () => <hr className="my-4 border-[#2a2a2a]" />,
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto rounded-lg border border-[#2a2a2a]">
        <table className="min-w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-[#1a1a1a] text-[#dcb383]">{children}</thead>,
    th: ({ children }) => <th className="text-left font-medium px-3 py-2 border-b border-[#2a2a2a]">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2 border-b border-[#222] text-[#d4d4d4] align-top">{children}</td>,
    tr: ({ children }) => <tr className="even:bg-[#141414]">{children}</tr>,
  };

  return (
    <div className="max-w-full text-sm text-[#d4d4d4] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderers}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
