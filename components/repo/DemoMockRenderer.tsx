"use client";

/**
 * DemoMockRenderer — polished fake demo screens when a real demo is not available.
 * Supports: SaaS dashboard, landing page, admin panel, e-commerce, blog, API backend.
 * Dark modern styling; 2–4 likely screens with labels; feels like a real product concept.
 */

export type AppArchetype =
  | "saas-dashboard"
  | "landing-page"
  | "admin-panel"
  | "e-commerce"
  | "blog"
  | "api-backend";

export interface DemoMockRendererProps {
  /** App type; determines layout and styling of mock screens */
  archetype: AppArchetype;
  /** Screen labels to show (e.g. Dashboard, Login, Analytics, Settings). Use 2–4. */
  screens?: string[];
  /** Optional subtitle or product name above the mock */
  productName?: string;
  /** Optional class for the root container */
  className?: string;
}

const DEFAULT_SCREENS: Record<AppArchetype, string[]> = {
  "saas-dashboard": ["Dashboard", "Analytics", "Team", "Settings"],
  "landing-page": ["Home", "Features", "Pricing", "Contact"],
  "admin-panel": ["Dashboard", "Users", "Content", "Settings"],
  "e-commerce": ["Shop", "Product", "Cart", "Checkout"],
  blog: ["Home", "Posts", "Article", "About"],
  "api-backend": ["Endpoints", "Docs", "Logs", "Settings"],
};

function getScreens(archetype: AppArchetype, screens?: string[]): string[] {
  const list = screens?.length ? screens.slice(0, 4) : DEFAULT_SCREENS[archetype];
  return list.length >= 2 ? list : [...list, ...DEFAULT_SCREENS[archetype]].slice(0, 4);
}

// ——— SaaS Dashboard mock ———
function MockSaaSDashboard({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col bg-slate-900 rounded-lg border border-slate-700/80 overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-700/60 px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
        <div className="h-2 w-2 rounded-full bg-amber-500/80" />
        <div className="h-2 w-2 rounded-full bg-rose-500/80" />
        <span className="ml-1 text-[10px] font-medium text-slate-400 truncate">{label}</span>
      </div>
      <div className="flex flex-1 min-h-0 p-2 gap-2">
        <aside className="w-12 shrink-0 flex flex-col gap-1.5 rounded-md bg-slate-800/60 p-1.5">
          {["", "", "", ""].map((_, i) => (
            <div key={i} className="h-6 rounded bg-slate-700/60" />
          ))}
        </aside>
        <main className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="h-5 rounded bg-slate-800/80 w-2/3" />
          <div className="grid grid-cols-3 gap-1.5 flex-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-md bg-slate-800/50 border border-slate-700/50 p-2">
                <div className="h-1.5 rounded bg-slate-600/70 w-1/2 mb-1.5" />
                <div className="h-2 rounded bg-slate-600/50 w-3/4" />
                <div className="h-1 rounded bg-slate-600/40 w-1/3 mt-1" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

// ——— Landing page mock ———
function MockLandingPage({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col bg-slate-900 rounded-lg border border-slate-700/80 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-700/60 px-3 py-2">
        <span className="text-[10px] font-medium text-slate-400">{label}</span>
        <div className="flex gap-1.5">
          <div className="h-1.5 w-8 rounded bg-slate-700/60" />
          <div className="h-1.5 w-8 rounded bg-slate-700/60" />
        </div>
      </div>
      <div className="flex-1 p-3 flex flex-col gap-2">
        <div className="h-10 rounded-lg bg-gradient-to-r from-slate-700/80 to-slate-800/80 w-full" />
        <div className="h-2 rounded bg-slate-700/60 w-4/5 mx-auto" />
        <div className="h-1.5 rounded bg-slate-700/50 w-3/5 mx-auto" />
        <div className="flex gap-2 justify-center mt-1">
          <div className="h-6 rounded-full bg-slate-600/70 w-16" />
          <div className="h-6 rounded-full bg-slate-700/50 w-16" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 flex-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-md bg-slate-800/50 border border-slate-700/50 p-2">
              <div className="h-2 rounded bg-slate-600/60 w-3/4 mb-1.5" />
              <div className="h-1 rounded bg-slate-600/40 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ——— Admin panel mock ———
function MockAdminPanel({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col bg-slate-900 rounded-lg border border-slate-700/80 overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-700/60 px-3 py-2">
        <span className="text-[10px] font-medium text-slate-400">{label}</span>
      </div>
      <div className="flex flex-1 min-h-0 p-2 gap-2">
        <div className="w-14 shrink-0 rounded-md bg-slate-800/60 p-1.5 flex flex-col gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-5 rounded bg-slate-700/60" />
          ))}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex gap-2">
            <div className="h-6 rounded bg-slate-700/60 flex-1" />
            <div className="h-6 rounded bg-slate-700/50 w-16" />
          </div>
          <div className="flex-1 rounded-md border border-slate-700/60 overflow-hidden">
            <div className="grid grid-cols-4 gap-px bg-slate-700/40 p-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-4 rounded-sm bg-slate-800/80" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ——— E-commerce mock ———
function MockEcommerce({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col bg-slate-900 rounded-lg border border-slate-700/80 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-700/60 px-3 py-2">
        <span className="text-[10px] font-medium text-slate-400">{label}</span>
        <div className="h-5 w-5 rounded-full bg-slate-700/60" />
      </div>
      <div className="flex-1 p-2 flex flex-col gap-2">
        <div className="h-5 rounded bg-slate-700/50 w-1/2" />
        <div className="grid grid-cols-2 gap-2 flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg bg-slate-800/50 border border-slate-700/50 overflow-hidden">
              <div className="h-14 bg-slate-700/50" />
              <div className="p-1.5">
                <div className="h-2 rounded bg-slate-600/60 w-3/4 mb-1" />
                <div className="h-1.5 rounded bg-slate-600/40 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ——— Blog mock ———
function MockBlog({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col bg-slate-900 rounded-lg border border-slate-700/80 overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-700/60 px-3 py-2">
        <span className="text-[10px] font-semibold text-slate-300">Blog</span>
        <span className="text-[10px] text-slate-500">{label}</span>
      </div>
      <div className="flex-1 p-3 flex flex-col gap-2">
        <div className="h-3 rounded bg-slate-700/60 w-full" />
        <div className="h-2 rounded bg-slate-700/50 w-11/12" />
        <div className="flex-1 rounded-md border border-slate-700/50 p-2 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2">
              <div className="h-12 w-14 shrink-0 rounded bg-slate-700/50" />
              <div className="flex-1 min-w-0">
                <div className="h-2 rounded bg-slate-600/60 w-full mb-1" />
                <div className="h-1.5 rounded bg-slate-600/40 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ——— API backend mock ———
function MockApiBackend({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col bg-slate-900 rounded-lg border border-slate-700/80 overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-700/60 px-3 py-2">
        <span className="text-[10px] font-mono text-slate-400">{label}</span>
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1.5 font-mono text-[10px]">
        <div className="flex items-center gap-2 rounded bg-slate-800/60 px-2 py-1.5">
          <span className="rounded bg-emerald-900/50 text-emerald-400 px-1">GET</span>
          <span className="text-slate-500">/api/v1/users</span>
        </div>
        <div className="flex items-center gap-2 rounded bg-slate-800/60 px-2 py-1.5">
          <span className="rounded bg-amber-900/50 text-amber-400 px-1">POST</span>
          <span className="text-slate-500">/api/v1/auth</span>
        </div>
        <div className="flex items-center gap-2 rounded bg-slate-800/60 px-2 py-1.5">
          <span className="rounded bg-sky-900/50 text-sky-400 px-1">GET</span>
          <span className="text-slate-500">/api/v1/health</span>
        </div>
        <div className="flex-1 rounded bg-slate-950/80 border border-slate-700/50 p-2 mt-1">
          <div className="text-slate-500">{`{ "status": "ok" }`}</div>
        </div>
      </div>
    </div>
  );
}

function MockScreen({
  archetype,
  label,
}: {
  archetype: AppArchetype;
  label: string;
}) {
  switch (archetype) {
    case "saas-dashboard":
      return <MockSaaSDashboard label={label} />;
    case "landing-page":
      return <MockLandingPage label={label} />;
    case "admin-panel":
      return <MockAdminPanel label={label} />;
    case "e-commerce":
      return <MockEcommerce label={label} />;
    case "blog":
      return <MockBlog label={label} />;
    case "api-backend":
      return <MockApiBackend label={label} />;
    default:
      return <MockSaaSDashboard label={label} />;
  }
}

export function normalizeArchetype(appType: string): AppArchetype {
  const lower = appType.toLowerCase();
  if (lower.includes("dashboard") || lower.includes("saas")) return "saas-dashboard";
  if (lower.includes("landing") || lower.includes("marketing")) return "landing-page";
  if (lower.includes("admin")) return "admin-panel";
  if (lower.includes("e-commerce") || lower.includes("commerce") || lower.includes("shop")) return "e-commerce";
  if (lower.includes("blog")) return "blog";
  if (lower.includes("api") || lower.includes("backend")) return "api-backend";
  return "saas-dashboard";
}

export default function DemoMockRenderer({
  archetype,
  screens: screensProp,
  productName,
  className = "",
}: DemoMockRendererProps) {
  const screens = getScreens(archetype, screensProp);

  return (
    <div className={`rounded-xl border border-slate-700/80 bg-slate-950/80 shadow-2xl overflow-hidden ${className}`}>
      {/* Browser-style chrome */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-700/80 bg-slate-900/90 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
        </div>
        {productName && (
          <span className="ml-2 text-xs font-medium text-slate-400 truncate max-w-[200px]">
            {productName}
          </span>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-500">
          Concept preview
        </span>
      </div>

      {/* 2–4 screen cards in a grid */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-3">
          {screens.length === 3 ? (
            <>
              {screens.slice(0, 2).map((label, i) => (
                <div key={i} className="min-w-0">
                  <MockScreen archetype={archetype} label={label} />
                </div>
              ))}
              <div className="min-w-0 col-span-2">
                <MockScreen archetype={archetype} label={screens[2]} />
              </div>
            </>
          ) : (
            screens.map((label, i) => (
              <div key={i} className="min-w-0">
                <MockScreen archetype={archetype} label={label} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
