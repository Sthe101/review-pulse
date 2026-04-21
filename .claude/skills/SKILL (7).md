---
name: seo-validator
description: Audit SEO, metadata, and discoverability. Use when the user says "validate SEO", "check meta tags", "SEO audit", "check indexing", or before deploying. Checks page titles, meta descriptions, Open Graph tags, structured data, sitemap, robots.txt, and Core Web Vitals impact.
---

# SEO & Metadata Validator

Ensures the application is discoverable by search engines and shareable on social media.

## Step 1: Page Titles & Descriptions

Every page must have a unique, descriptive `<title>` and `<meta name="description">`.

```bash
# Check for metadata exports in page files
grep -rn "metadata\|generateMetadata" src/app/ --include="*.tsx" --include="*.ts" | grep -v "node_modules"
```

Expected metadata:

| Page | Title | Description |
|------|-------|-------------|
| Landing | ReviewPulse — Turn Customer Reviews Into Your Unfair Advantage | Paste your reviews, get AI-powered insights in seconds. Sentiment analysis, complaint ranking, and action items. Free to start. |
| Login | Log In — ReviewPulse | Log in to your ReviewPulse account |
| Signup | Get Started Free — ReviewPulse | Create your free ReviewPulse account. No credit card required. |
| Dashboard | Dashboard — ReviewPulse | (noindex — authenticated page) |
| Projects | Projects — ReviewPulse | (noindex) |
| Project Detail | [Project Name] — ReviewPulse | (noindex) |
| Trends | Trends — ReviewPulse | (noindex) |
| Settings | Settings — ReviewPulse | (noindex) |
| Billing | Billing — ReviewPulse | (noindex) |

- [ ] Landing page title is under 60 characters
- [ ] Landing page description is 150-160 characters
- [ ] Dashboard pages have `robots: { index: false }` (private user data)
- [ ] No duplicate titles across pages

## Step 2: Open Graph & Social Cards

```bash
# Check for OG tags
grep -rn "openGraph\|twitter\|og:" src/app/ --include="*.tsx" --include="*.ts"
```

Landing page must have:
```typescript
export const metadata = {
  openGraph: {
    title: 'ReviewPulse — Turn Customer Reviews Into Your Unfair Advantage',
    description: 'AI-powered review analysis in 30 seconds. Free to start.',
    url: 'https://reviewpulse.ai',
    siteName: 'ReviewPulse',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ReviewPulse dashboard' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReviewPulse — AI Review Analysis',
    description: 'Paste your reviews. Get insights in 30 seconds.',
    images: ['/og.png'],
  },
};
```

- [ ] OG image exists at `public/og.png` (1200×630px, under 200KB)
- [ ] OG image shows the dashboard/analysis preview (not just a logo)
- [ ] Twitter card type is `summary_large_image`
- [ ] URLs are absolute (include domain)

## Step 3: Structured Data

Add JSON-LD structured data to the landing page for rich search results:

```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ReviewPulse',
  description: 'AI-powered customer review analysis tool',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '79',
    priceCurrency: 'USD',
  },
};
```

- [ ] JSON-LD script tag present on landing page
- [ ] Schema validates at https://validator.schema.org

## Step 4: Technical SEO

```bash
# Check for sitemap
cat src/app/sitemap.ts 2>/dev/null || echo "MISSING: sitemap.ts"

# Check for robots.txt
cat src/app/robots.ts 2>/dev/null || echo "MISSING: robots.ts"
```

### Sitemap
Must include all public pages with `lastModified` and `priority`:
- `/` (landing) — priority 1.0
- `/login` — priority 0.3
- `/signup` — priority 0.5

Must NOT include:
- `/dashboard`, `/projects`, `/settings`, `/billing` (private pages)

### Robots.txt
```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /projects
Disallow: /settings
Disallow: /billing
Disallow: /api/
Sitemap: https://reviewpulse.ai/sitemap.xml
```

### Additional checks
- [ ] Canonical URLs set on all public pages
- [ ] No orphan pages (every page reachable from navigation)
- [ ] Internal links use `<Link>` from next/link (not `<a>`)
- [ ] No broken links (404s)
- [ ] HTML lang attribute set (`<html lang="en">`)
- [ ] Favicon exists (`/favicon.ico` or via metadata)

## Step 5: Content & Keyword Optimization

Landing page should naturally include target keywords:
- [ ] "review analysis" or "review analyzer" in h1 or first paragraph
- [ ] "customer feedback" in the problem section
- [ ] "sentiment analysis" in the features/steps section
- [ ] "AI" or "AI-powered" in the hero
- [ ] Competitor names in FAQ (Birdeye comparison)
- [ ] Alt text on any images

The landing page should be fully server-rendered (SSG or SSR) — not client-rendered. Search engines index the initial HTML.

```bash
# Verify landing page is not client-only
grep "'use client'" src/app/\(marketing\)/page.tsx
# Should NOT find 'use client' at the page level (individual interactive components are OK)
```

## Output

```
SEO AUDIT — [date]
================================
Page Titles:         ✅ PASS / ❌ FAIL (X pages missing/incorrect)
Open Graph:          ✅ PASS / ❌ FAIL (details)
Structured Data:     ✅ PASS / ❌ FAIL (details)
Technical SEO:       ✅ PASS / ❌ FAIL (details)
Content Keywords:    ✅ PASS / ❌ FAIL (details)
================================
```
