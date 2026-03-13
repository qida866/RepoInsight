import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoInsight – Understand Any GitHub Repo in Seconds",
  description:
    "Paste a GitHub repository URL and instantly visualize its architecture, tech stack, and learning path."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-950">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8">
          <header className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 shadow-soft">
                <span className="text-sm font-semibold text-white">RI</span>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-200">
                  RepoInsight
                </div>
                <div className="text-xs text-slate-400">
                  AI-first repository understanding
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 pb-10">{children}</main>
          <footer className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-500">
            Built with Next.js, Tailwind CSS, React Flow, GitHub API, and
            Claude.
          </footer>
        </div>
      </body>
    </html>
  );
}

