ARCHITECT KNOWLEDGE (standing principles — build to these, they are graded):

• GROUNDING (cite-or-abstain): any feature that answers questions from data must retrieve first and
  answer ONLY from what it retrieved, citing the source records. If nothing relevant is retrieved, say so
  plainly ("no supporting record") — NEVER invent an answer. A confident wrong answer is the worst outcome.
• TENANT ISOLATION (deny-by-default): every data read is scoped to the current user/workspace FIRST, then
  filtered. One user's query must never be able to reach another's rows. Default to no-access; open access
  explicitly. When persistence is Supabase, rely on row-level security keyed to auth.uid — never a
  service-role key in a user-facing path.
• VERIFY BEFORE DONE: the feature is not done until it demonstrably runs — real GET/POST that persist,
  real empty/loading/error states, no console errors, a clean production build. Prefer standard, boring
  patterns that provably work over clever ones that might.
• ADOPT, DON'T INVENT: reach for proven, license-clean building blocks (the platform's own auth/storage,
  well-trodden libraries) before writing bespoke infrastructure. Every line you don't invent is a line
  that can't regress.
• INPUT DISCIPLINE: validate and type every input at the boundary; fail closed on bad input (4xx, never a
  500 or a silent wrong write).

Implement a small but REAL, working full-stack web app in this Next.js (App Router, TypeScript, Tailwind CSS) project for:

a study-tracker SaaS where students sign up, log study sessions, and see their weekly dashboard

Requirements:
- A polished UI in app/page.tsx (a client component) with the core create/list/delete flow.
- A REAL backend API route at app/api/items/route.ts (GET + POST) — no mock data.
- Persist data. If SUPABASE_URL + SUPABASE_ANON_KEY env vars exist use Supabase; otherwise use an
  in-memory store in the route so it runs with zero config. Keep it typed and simple.
- Clean, responsive, no console errors. It must build with `next build` and run on Vercel.
- CODE MUST COMPILE: correct TypeScript types (no `any`-that-breaks), no unused imports/vars, only
  stable Next.js 16 App Router APIs. Prefer simple, standard patterns over clever ones.

DESIGN BAR — it must look like a senior product designer built it, NOT a generic AI template. Use
Tailwind and hold this bar (this is graded):
- Typography: a real hierarchy — one confident heading, clear secondary text, generous body
  line-height, tight tracking on large headings. Two weights only (normal + semibold).
- Space: an 8px rhythm (p-4/6/8, gap-4, space-y-6); generous whitespace; everything on a grid.
- Restraint: a neutral base (white / zinc) plus ONE accent color, used only for the primary action.
  No rainbow of colors, no heavy borders everywhere.
- Depth: subtle only — hairline borders (border border-zinc-200), rounded-xl cards, at most a light
  shadow. No decorative gradients, no neon, no emoji used as UI.
- Motion: gentle, purposeful transitions on hover/focus/state (transition duration-150). Never gratuitous.
- REAL states: design the empty state (an inviting prompt, not a blank), the loading state (skeleton or
  spinner), and the error state. They are part of the product, not afterthoughts.
- Detail: visible focus rings (focus-visible), hover states, mobile-first responsive layout, accessible
  labels and contrast.
- Voice: real, specific microcopy for THIS product (headings, buttons, empty-state text). Never lorem
  ipsum, never "get started by editing".
Aim for the calm, content-first polish of Linear / Stripe / Apple — clarity and restraint over decoration.

REAL SAAS (this product asked for accounts / auth / a multi-page product):
- AUTH: sign up + log in. Use Supabase Auth when SUPABASE_URL + SUPABASE_ANON_KEY exist (email+password
  is fine); otherwise a minimal signed session cookie so it still runs zero-config. NEVER store plaintext
  passwords and NEVER roll custom crypto — use the platform/library primitives.
- MULTIPLE REAL ROUTES: a public landing (app/page.tsx), an auth page (app/login/page.tsx), and a
  PROTECTED area (app/dashboard/page.tsx) that redirects to login when signed out.
- PER-USER DATA (graded isolation): every row carries an owner; every query filters to the CURRENT user
  so one account can never read another's rows (Supabase RLS on auth.uid when configured; an explicit
  owner check otherwise).
- The API (app/api/items/route.ts) REQUIRES an authenticated user and scopes reads/writes to them; it
  fails closed (401) for anyone signed out.
- Keep it coherent + typed; it must `next build` and run on Vercel. Hold the same design bar on every page.