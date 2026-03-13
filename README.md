## RepoInsight

AI-first developer tool to **understand any GitHub repo in seconds**.

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Visualization**: React Flow (`@xyflow/react`)
- **Backend**: Next.js Route Handlers (`app/api/analyze/route.ts`)
- **External APIs**: GitHub REST API, Claude API

### Getting started

```bash
pnpm install # or npm install / yarn
pnpm dev
```

Then open `http://localhost:3000`.

### Environment variables

Create a `.env.local` file:

```bash
GITHUB_TOKEN=ghp_...
CLAUDE_API_KEY=sk-ant-...
```

Both are optional, but without them analysis will be slower or fall back to static copy.

