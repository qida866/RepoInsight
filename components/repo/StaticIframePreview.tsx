"use client";

/**
 * Iframe preview for static sites. Renders the main HTML in an iframe (srcdoc),
 * inlining CSS/JS from loaded files so the preview works without a server.
 */
interface StaticIframePreviewProps {
  files: Record<string, string>;
  onClose: () => void;
}

function getKey(files: Record<string, string>, path: string): string | undefined {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  const keys = Object.keys(files);
  const exact = keys.find((k) => k === path || k === normalized || k.endsWith("/" + normalized));
  if (exact) return exact;
  const lower = normalized.toLowerCase();
  return keys.find((k) => k.toLowerCase() === lower || k.toLowerCase().endsWith("/" + lower));
}

/** Inline stylesheets and scripts from `files` into HTML string. */
function inlineAssets(html: string, files: Record<string, string>): string {
  let out = html;
  // <link rel="stylesheet" href="styles.css"> -> <style>...</style>
  out = out.replace(
    /<link([^>]*)\s+rel\s*=\s*["']stylesheet["']([^>]*)\s+href\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (_, before, mid, href) => {
      const key = getKey(files, href);
      const content = key ? files[key] : "";
      return content ? `<style>${content}</style>` : "";
    }
  );
  // <script src="..."></script> -> <script>...</script>
  out = out.replace(
    /<script([^>]*)\s+src\s*=\s*["']([^"']+)["']([^>]*)><\/script>/gi,
    (_, before, src) => {
      const key = getKey(files, src);
      const content = key ? files[key] : "";
      return content ? `<script>${content}</script>` : "";
    }
  );
  return out;
}

function getMainHtml(files: Record<string, string>): string | null {
  const indexKey = Object.keys(files).find(
    (k) => k.toLowerCase().endsWith("index.html") || k.toLowerCase() === "index.html"
  );
  if (indexKey) return files[indexKey];
  const firstHtml = Object.entries(files).find(([p]) => p.toLowerCase().endsWith(".html"));
  return firstHtml ? firstHtml[1] : null;
}

export default function StaticIframePreview({ files, onClose }: StaticIframePreviewProps) {
  const rawHtml = getMainHtml(files);
  const html = rawHtml ? inlineAssets(rawHtml, files) : "<!DOCTYPE html><html><body><p>No index.html found.</p></body></html>";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2">
        <span className="text-sm font-medium text-slate-200">Static preview — iframe</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
        >
          Close
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <iframe
          title="Static site preview"
          srcDoc={html}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
}
