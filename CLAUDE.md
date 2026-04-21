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
