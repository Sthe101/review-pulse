# ReviewPulse
AI-powered customer review analysis SaaS.

## Tech Stack
Next.js 14, TypeScript, Tailwind, Supabase, Anthropic Claude API, Stripe, Vercel

## Architecture
- Route groups: (marketing), (auth), (dashboard)
- Design reference: design-reference.jsx
- PDF/CSV templates: reviewpulse-export-templates.jsx
- Validators: skills/ directory

## Build Progress

### Step 1 — Project scaffold & design system
- Next.js 14 app scaffolded with TypeScript, Tailwind, App Router, `src/` dir (`npx create-next-app@latest`).
- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`.
- Dependencies installed: `@supabase/supabase-js`, `@supabase/ssr`, `@anthropic-ai/sdk`, `stripe`, `@stripe/stripe-js`, `zustand`, `zod`, `papaparse`, `sonner` (+ `@types/papaparse`).
- `.env.local.example` — all 13 env var names (Supabase, Anthropic, Stripe, Google Business, encryption, app URL).
- `.gitignore` — `node_modules`, `.next`, `.env.local`, `.env`, `.vercel`, `*.tsbuildinfo`.
- `tailwind.config.ts` — extends brand colors: teal `#0D9488`, navy `#1E3A5F`, coral `#EA580C`, pos `#059669`, neg `#DC2626`, warn `#D97706`. `darkMode: "class"`.
- `src/app/globals.css` — CSS custom properties for light (`:root`) and dark (`.dark`), with `--tx3` darkened to `#64748B` (light) / `#7A8BA8` (dark) for WCAG AA contrast. Utility classes: `.card`, `.card-click`, `.btn` + 5 variants (`coral`, `navy`, `teal`, `outline`, `danger`), `.badge`, `.sidebar` + `.collapsed`, `.mobile-bar`, `.overlay`. `@keyframes spin` + `pulse`, `prefers-reduced-motion`, `*:focus-visible` 2px teal outline, 768px / 480px media queries.
- `src/stores/theme-store.ts` — Zustand with `persist` middleware (localStorage `reviewpulse-theme`); `toggle()` flips state + toggles `.dark` on `documentElement`, `hydrate()` for mount sync.
- `src/components/theme-provider.tsx` — client provider, runs `hydrate()` on mount.
- `src/components/ui/` — `icon.tsx` (typed `IconName` union, 35 icons incl. `sun`/`moon`/`bell`; `$` renamed to `dollar`), `button.tsx` (5 variants × 3 sizes + `fullWidth` + `loading` Spinner), `card.tsx` (clickable with keyboard support), `badge.tsx` (5 variants + custom color/bg), `modal.tsx` (portal, backdrop blur, Esc, click-outside, focus trap, `role="dialog"`/`aria-modal`), `spinner.tsx` (sm/md/lg, `role="status"`), `skeleton.tsx`, `empty-state.tsx`, `sentiment-bar.tsx` (percentage aria-label), `donut-chart.tsx` (center score + aria-label), `toast-provider.tsx` (sonner, bottom-right).
- `src/components/layout/` — `dashboard-shell.tsx` (sidebar + collapse + mobile drawer + overlay + usage gauge + user menu + theme toggle), `landing-layout.tsx` (sticky nav + footer, `next/link`).
- `src/app/layout.tsx` — `html lang="en"`, metadata template `"%s — ReviewPulse"` / default `"ReviewPulse"`, wraps `ThemeProvider` + `ToastProvider`.
- `src/app/page.tsx` — launch hero with inline SVG logo + "ReviewPulse" + tagline.
- `src/app/test/page.tsx` — renders every UI component in every variant (temporary; deleted in Feature 4.1).
- `.claude/hooks/evaluate.sh` — rewrote to use Python instead of `jq` (jq not installed on this Windows/git-bash machine; every PreToolUse hook was erroring with exit 127 due to `set -euo pipefail`).
- Logo fix: lowered navy bar (viewBox `0 0 32 32`) from `y=10 h=18` to `y=12 h=16` in both `page.tsx` and `icon.tsx` — the orange curve's stroke (width 2.5) now fully covers the bar top instead of the bar peeking through.
- Build: `npm run build` → 0 errors, 3 static routes (`/`, `/_not-found`, `/test`).

### Step 2 — Supabase schema & client setup
- `supabase/migrations/001_initial_schema.sql` — 8 tables: `profiles` (extends `auth.users`, plan enum `free`/`pro`/`business`, Stripe ids, monthly usage counter, onboarding checklist JSONB), `projects` (industry enum, `is_demo` flag), `reviews` (content 1–10k chars, rating 1–5, sentiment enum, `themes TEXT[]`), `analyses` (sentiment breakdown 0–100, `overall_score`, complaints/praises/feature_requests/action_items JSONB), `notification_prefs`, `integrations` (9 platforms incl. `google_business`/`yelp`/`trustpilot`/`app_store`/`play_store`/`amazon`/`g2`/`slack`/`zapier`, encrypted tokens, unique `(user_id, platform, platform_account_id)`), `sync_logs`, `shared_reports` (16-byte hex `share_token` via `gen_random_bytes`, password hash, expiry, view counter).
- RLS enabled on all 8 tables. Policies: owner-only `FOR ALL` on most; `profiles` split into SELECT/UPDATE/INSERT; `reviews`/`analyses`/`sync_logs` scope via parent ownership subquery; `shared_reports` has extra public SELECT policy when `is_active = true`.
- Triggers & functions: `public.handle_new_user()` (SECURITY DEFINER) auto-inserts `profiles` + `notification_prefs` rows on `auth.users` insert; `reset_monthly_usage()` zeros `reviews_used_this_month` and bumps `billing_cycle_start` for rows older than 30 days (wire to cron later).
- Indexes: `projects(user_id)`, `reviews(project_id)`, `reviews(sentiment)`, `analyses(project_id)`, `analyses(created_at)`, `integrations(user_id)`, partial `integrations(status) WHERE status='connected'`, `sync_logs(integration_id)`, `shared_reports(share_token)`.
- `src/lib/supabase/client.ts` — `createBrowserClient<Database>` from `@supabase/ssr`, reads `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `src/lib/supabase/server.ts` — `createServerClient<Database>` with `await cookies()` (Next 15 async API) using the `getAll`/`setAll` cookie interface; try/catch around `setAll` for Server Component safety.
- `src/lib/supabase/middleware.ts` — `updateSession(request)` helper: refreshes auth token via `supabase.auth.getUser()`, propagates cookies through a rewritten `NextResponse`. Not yet wired — needs `src/middleware.ts` entrypoint.
- `src/types/database.ts` — row interfaces (`Profile`, `Project`, `Review`, `Analysis`, `NotificationPrefs`, `Integration`, `SyncLog`, `SharedReport`) + enum unions (`Plan`, `Industry`, `Sentiment`, `IntegrationPlatform`, `IntegrationStatus`, `SyncStatus`) + `OnboardingChecklist`, `AnalysisItem`, `ActionItem`. Exports `Database` generic (`public.Tables.*` with `Row`/`Insert`/`Update`) consumed by all three clients.
- `pgcrypto` extension required for `gen_random_uuid()` / `gen_random_bytes()` — enabled by default on Supabase.
