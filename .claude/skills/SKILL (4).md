---
name: performance-validator
description: Audit application performance. Use when the user says "validate performance", "performance check", "optimize", "speed audit", "bundle size", "why is it slow", or after completing any build phase. Checks bundle size, rendering efficiency, caching, image optimization, database query patterns, and API response times.
---

# Performance Validator

Ensures the application is fast, lean, and efficient before deployment.

## Step 1: Bundle Analysis

```bash
# Build and check output
npm run build 2>&1 | tail -30

# Check for oversized pages (target: <100KB first-load JS per route)
# Next.js shows this in the build output automatically
```

Check for:
- [ ] No single page exceeds 150KB first-load JS
- [ ] Landing page (marketing) is under 100KB — it's the entry point
- [ ] Dashboard pages share a common chunk (layout + UI components)
- [ ] No duplicate dependencies (e.g., two date libraries, two icon sets)

```bash
# Find large imports that could be tree-shaken or lazy-loaded
grep -rn "import \* as" src/ --include="*.ts" --include="*.tsx"
# These wildcard imports prevent tree-shaking — use named imports instead

# Check for heavy libraries that should be dynamically imported
grep -rn "import.*from.*['\"]\(recharts\|chart\.js\|d3\|three\|plotly\)" src/ --include="*.tsx"
# These should use next/dynamic with { ssr: false }
```

## Step 2: Rendering Efficiency

### Server vs Client Components
```bash
# Count client components
grep -rn "^'use client'" src/ --include="*.tsx" | wc -l

# These should ONLY be client components:
# - Interactive forms (login, signup, analysis paste)
# - State-driven UI (sidebar toggle, dark mode, modals, tabs)
# - Browser API usage (scroll, localStorage)

# These should be SERVER components:
# - Page layouts
# - Data display (project list, review list, analysis results)
# - Static content (landing page sections)
```

### Unnecessary Re-renders
Check for common re-render causes:
- [ ] Objects/arrays created inline in JSX props (creates new reference every render)
- [ ] Missing `key` props on list items
- [ ] State stored too high in the tree (lifting state should be minimal)
- [ ] Large components that should be split (any component over 200 lines)

```bash
# Find inline object creation in props (potential re-render trigger)
grep -rn "style={{" src/ --include="*.tsx" | wc -l
# High count is OK for Tailwind-free approach, but in a Tailwind project
# these should mostly be className strings instead

# Check for missing keys in .map()
grep -rn "\.map(" src/ --include="*.tsx" | grep -v "key="
```

### Memoization
- [ ] Heavy computations (chart data transformation, filtering) wrapped in `useMemo`
- [ ] Callback functions passed to child components wrapped in `useCallback`
- [ ] DonutChart SVG path calculations memoized (trigonometry is expensive)

## Step 3: Data Fetching Patterns

### Supabase Query Optimization
```bash
# Find all Supabase queries
grep -rn "from(" src/ --include="*.ts" --include="*.tsx" | grep "supabase\|select\|insert\|update"
```

Check for:
- [ ] Queries select only needed columns (`.select('id, name, sentiment')` not `.select('*')`)
- [ ] List queries have `.limit()` to prevent unbounded fetches
- [ ] Pagination exists for reviews list (not loading all reviews at once)
- [ ] Related data uses joins (`.select('*, analyses(count)')`) not separate queries
- [ ] No N+1 queries (fetching project, then fetching reviews for each project separately)

### Caching
- [ ] Landing page is statically generated (`export const dynamic = 'force-static'` or no data fetching)
- [ ] Dashboard data uses `revalidate` or SWR/React Query for client-side caching
- [ ] Analysis results are cached in the database (not re-calling Claude for the same data)
- [ ] Supabase client is created once per request, not per component

## Step 4: Image & Asset Optimization

```bash
# Check for unoptimized images
find public/ -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" | while read f; do
  size=$(wc -c < "$f")
  if [ "$size" -gt 100000 ]; then
    echo "LARGE: $f ($(($size/1024))KB) — should be optimized"
  fi
done

# Check that next/image is used instead of <img>
grep -rn "<img " src/ --include="*.tsx"
# Should return 0 — use <Image> from next/image instead
```

- [ ] OG image is under 200KB
- [ ] SVG icons are inline (not network requests)
- [ ] No unused images in public/

## Step 5: API Route Performance

### Claude API Optimization
- [ ] System prompt uses Anthropic prompt caching (include `cache_control` parameter)
- [ ] Model selection is correct: Haiku for free tier, Sonnet for paid
- [ ] Max tokens is set appropriately (4096 for analysis, not higher)
- [ ] Response streaming is used for the dashboard analysis flow (shows progress)

### Stripe API Optimization
- [ ] Stripe customer ID is cached in the profiles table (not looked up via API every time)
- [ ] Webhook processing is idempotent (same event processed twice doesn't corrupt data)

### General API Patterns
- [ ] API routes return early on validation failures (don't do auth check → plan check → query → then fail)
- [ ] No `await` in loops — use `Promise.all()` for parallel operations
- [ ] Response payloads are minimal (don't return full database rows when the client only needs 3 fields)

```bash
# Check for await-in-loop antipattern
grep -B2 -A2 "for.*await\|forEach.*await" src/app/api/ --include="*.ts" -r
```

## Step 6: Database Performance

- [ ] All foreign keys have indexes (user_id, project_id)
- [ ] Queries used in list views have appropriate indexes
- [ ] The monthly usage reset function is scheduled (Supabase cron or external)
- [ ] No expensive JOINs on unindexed columns
- [ ] JSONB columns (complaints, praises, etc.) are only queried by primary key, not filtered/searched

```sql
-- Verify indexes exist
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' ORDER BY tablename;

-- Expected indexes:
-- idx_projects_user ON projects(user_id)
-- idx_reviews_project ON reviews(project_id)  
-- idx_analyses_project ON analyses(project_id)
-- idx_reviews_sentiment ON reviews(sentiment)
```

## Step 7: Core Web Vitals Targets

After deployment, run Lighthouse and target:
- **LCP (Largest Contentful Paint)**: < 2.5s — hero section should render fast
- **FID (First Input Delay)**: < 100ms — landing page should be interactive immediately
- **CLS (Cumulative Layout Shift)**: < 0.1 — no layout jumps on load
- **Performance Score**: 90+ on landing page, 80+ on dashboard pages

Common fixes if scores are low:
- Preload critical fonts
- Inline critical CSS
- Lazy load below-fold content
- Use `loading="lazy"` on images
- Defer non-critical JavaScript

## Output

```
PERFORMANCE AUDIT — [date]
================================
Bundle Size:         ✅ PASS / ❌ FAIL (landing: XXkb, dashboard: XXkb)
Rendering:           ✅ PASS / ❌ FAIL (X client components, X unnecessary)
Data Fetching:       ✅ PASS / ❌ FAIL (details)
Assets:              ✅ PASS / ❌ FAIL (details)
API Routes:          ✅ PASS / ❌ FAIL (details)
Database:            ✅ PASS / ❌ FAIL (details)
Web Vitals (est):    ✅ PASS / ❌ FAIL (details)
================================
```
