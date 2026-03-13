"use client";

import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface CodeViewerProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
  path?: string;
  repoName?: string;
  onExplain?: () => void;
}

export default function CodeViewer({
  code,
  language,
  title,
  className,
  path,
  onExplain
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore copy errors
    }
  };

  return (
    <div
      className={[
        "flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/95 px-3 py-2 text-[11px] text-slate-400">
        <span className="truncate font-medium text-slate-200">
          {title ?? path ?? "Code"}
        </span>
        <div className="flex items-center gap-2">
          {onExplain && (
            <button
              type="button"
              onClick={onExplain}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[10px] font-medium text-slate-200 hover:bg-slate-800/80"
            >
              Explain this file
            </button>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[10px] font-medium text-slate-200 hover:bg-slate-800/80"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            showLineNumbers
            wrapLines
            customStyle={{
              margin: 0,
              background: "transparent",
              padding: "0.75rem",
              fontSize: "0.75rem",
              minHeight: "100%"
            }}
            codeTagProps={{
              style: {
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace"
              }
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}

type FileSummaryShape =
  | {
      summary?: string;
      purpose?: string;
      mainFunctions?: string;
      connections?: string;
    }
  | {
      purpose?: string;
      keyConcepts?: string;
      architectureRole?: string;
      learnNext?: string;
    };

export function FileAiSummary({
  code,
  path,
  repoName,
  version,
  learnMode = true
}: {
  code: string;
  path?: string;
  repoName?: string;
  version?: number;
  /** When true, shows beginner-friendly explanation: purpose, key concepts, architecture role, what to learn next. */
  learnMode?: boolean;
}) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<FileSummaryShape | null>(null);

  useEffect(() => {
    if (!code || !version) return;
    let cancelled = false;
    setAiLoading(true);
    setAiError(null);
    setAiSummary(null);

    void (async () => {
      try {
        const res = await fetch("/api/explain-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path,
            code,
            repoName,
            learnMode
          })
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to get AI explanation");
        }
        const json = (await res.json()) as FileSummaryShape & { error?: string };
        if (cancelled) return;
        if (json.error) {
          setAiError(json.error);
        } else {
          setAiSummary(json);
        }
      } catch (err) {
        if (cancelled) return;
        setAiError(
          err instanceof Error ? err.message : "Failed to get AI explanation"
        );
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, path, repoName, version, learnMode]);

  const isLearnShape = learnMode && aiSummary && "keyConcepts" in aiSummary;

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-300">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-slate-200">
          {learnMode ? "Learn — file explanation" : "AI file summary"}
        </span>
        {aiError && (
          <span className="text-[10px] text-red-400">
            {aiError}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {aiSummary ? (
          <div className="space-y-2">
            {isLearnShape ? (
              <>
                {"purpose" in aiSummary && aiSummary.purpose && (
                  <section>
                    <h4 className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Purpose
                    </h4>
                    <p className="text-slate-200">{aiSummary.purpose}</p>
                  </section>
                )}
                {"keyConcepts" in aiSummary && aiSummary.keyConcepts && (
                  <section>
                    <h4 className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Key concepts
                    </h4>
                    <p className="whitespace-pre-wrap text-slate-200">
                      {aiSummary.keyConcepts}
                    </p>
                  </section>
                )}
                {"architectureRole" in aiSummary && aiSummary.architectureRole && (
                  <section>
                    <h4 className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      How it fits in the architecture
                    </h4>
                    <p className="text-slate-200">
                      {aiSummary.architectureRole}
                    </p>
                  </section>
                )}
                {"learnNext" in aiSummary && aiSummary.learnNext && (
                  <section>
                    <h4 className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      What to learn next
                    </h4>
                    <p className="text-slate-200">{aiSummary.learnNext}</p>
                  </section>
                )}
              </>
            ) : (
              <>
                {"summary" in aiSummary && aiSummary.summary && (
                  <p className="text-slate-200">{aiSummary.summary}</p>
                )}
                {"purpose" in aiSummary && aiSummary.purpose && (
                  <p className="text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Purpose:{" "}
                    </span>
                    {aiSummary.purpose}
                  </p>
                )}
                {"mainFunctions" in aiSummary && aiSummary.mainFunctions && (
                  <p className="text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Main functions:{" "}
                    </span>
                    {aiSummary.mainFunctions}
                  </p>
                )}
                {"connections" in aiSummary && aiSummary.connections && (
                  <p className="text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Connections:{" "}
                    </span>
                    {aiSummary.connections}
                  </p>
                )}
              </>
            )}
          </div>
        ) : aiLoading ? (
          <div className="space-y-1.5">
            <div className="h-2.5 w-3/4 skeleton" />
            <div className="h-2.5 w-11/12 skeleton" />
            <div className="h-2.5 w-2/3 skeleton" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

