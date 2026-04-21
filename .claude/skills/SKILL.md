---
name: phase-validator
description: Run a complete phase validation covering security, design, and functionality. Use when the user says "validate phase", "validate everything", "run all checks", "phase check", "is this ready", or at the end of any build phase. This orchestrates the security-validator, design-validator, and functionality-validator skills together and produces a combined report.
---

# Phase Validator

Runs all three validators (security, design, functionality) in sequence and produces a combined pass/fail report. Use this at the end of every build phase before committing.

## How to Run

When triggered, execute in this order:

1. **Read the current phase** — check CLAUDE.md for which phases are complete to understand what should exist
2. **Run security-validator** — follow `skills/security-validator/SKILL.md`
3. **Run design-validator** — follow `skills/design-validator/SKILL.md`
4. **Run functionality-validator** — follow `skills/functionality-validator/SKILL.md`
5. **Run performance-validator** — follow `skills/performance-validator/SKILL.md`
6. **Run accessibility-validator** — follow `skills/accessibility-validator/SKILL.md`
7. **Run data-integrity-validator** — follow `skills/data-integrity-validator/SKILL.md`
8. **Run seo-validator** (Phase 3+ only) — follow `skills/seo-validator/SKILL.md`
9. **Produce combined report** (format below)
10. **Fix all FAIL items** automatically where possible
11. **Re-run failed checks** to confirm fixes
12. **Update CLAUDE.md** with the phase summary once all checks pass

## Phase-Specific Focus Areas

Different phases have different risk profiles. Run ALL validators every time, but weight attention accordingly:

### Phase 1 (Scaffold + Design System)
- **Design: CRITICAL** — this sets the foundation, every color and spacing must be exact
- **Accessibility: HIGH** — component-level ARIA and keyboard support is easiest to add now
- **Performance: MEDIUM** — verify no bloated imports
- **Data Integrity: LOW** — no data yet
- **Security: LOW** — no auth or API routes yet
- **Functionality: MEDIUM** — components should render, dark mode should toggle
- **SEO: SKIP** — no pages to index yet

### Phase 2 (Database + Auth)
- **Security: CRITICAL** — RLS policies, auth middleware, secret exposure
- **Data Integrity: CRITICAL** — database constraints, type generation, Zod schemas
- **Design: MEDIUM** — auth pages must match prototype
- **Functionality: HIGH** — signup/login/forgot flows must complete end-to-end
- **Accessibility: MEDIUM** — form labels, focus management on auth pages
- **Performance: LOW** — minimal frontend
- **SEO: SKIP**

### Phase 3 (Landing Page)
- **Design: CRITICAL** — this is the conversion page, must be pixel-perfect
- **SEO: CRITICAL** — meta tags, OG image, structured data, keywords
- **Accessibility: HIGH** — heading hierarchy, link text, color contrast
- **Performance: HIGH** — landing page must be fast (LCP < 2.5s)
- **Security: LOW** — public page, no sensitive operations
- **Functionality: MEDIUM** — scroll links, FAQ accordion, navigation
- **Data Integrity: SKIP**

### Phase 4 (Dashboard Pages)
- **Functionality: CRITICAL** — every button, tab, filter, modal, chart must work
- **Design: HIGH** — many pages, must all match prototype
- **Accessibility: HIGH** — charts need alt text, tabs need ARIA roles, filters need keyboard support
- **Performance: MEDIUM** — check component splitting, unnecessary re-renders
- **Security: MEDIUM** — verify data fetching is scoped to authenticated user
- **Data Integrity: MEDIUM** — null checks on data, empty states
- **SEO: LOW** — dashboard pages are noindex

### Phase 5 (Claude Analysis Engine)
- **Security: CRITICAL** — API key exposure, prompt injection, rate limiting
- **Data Integrity: CRITICAL** — Zod validation on input AND Claude output, edge case data
- **Performance: HIGH** — prompt caching, model selection, response streaming
- **Functionality: HIGH** — analysis must return valid data, errors handled, limits enforced
- **Design: SKIP** — no new UI
- **Accessibility: SKIP**
- **SEO: SKIP**

### Phase 6 (Stripe Integration)
- **Security: CRITICAL** — webhook verification, checkout session scoping
- **Data Integrity: HIGH** — plan state consistency, idempotent webhooks
- **Functionality: HIGH** — checkout flow, plan changes, usage limits
- **Performance: LOW** — minimal impact
- **Design: LOW** — minimal UI changes
- **Accessibility: LOW**
- **SEO: SKIP**

### Phase 7 (Deploy)
- **ALL: HIGH** — final sweep before going live
- **Security: CRITICAL** — headers, dependencies, full sweep
- **SEO: CRITICAL** — everything must be in place before launch
- **Performance: CRITICAL** — run Lighthouse, check bundle size
- **Accessibility: HIGH** — last chance before real users

## Combined Report Format

```
╔══════════════════════════════════════════════════╗
║  PHASE [N] VALIDATION — [Phase Name]             ║
║  Date: [date]                                    ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  SECURITY (11 checks)                            ║
║  ├─ Secret Exposure:    ✅ PASS                  ║
║  ├─ Authentication:     ✅ PASS                  ║
║  ├─ Row Level Security: ✅ PASS                  ║
║  ├─ Input Sanitization: ✅ PASS                  ║
║  ├─ Rate Limiting:      ⚠️  N/A (no API yet)     ║
║  ├─ Error Handling:     ✅ PASS                  ║
║  ├─ Response Safety:    ✅ PASS                  ║
║  ├─ CSRF & CORS:        ✅ PASS                  ║
║  ├─ Security Headers:   ✅ PASS                  ║
║  ├─ Dependencies:       ✅ PASS (0 vulns)        ║
║  └─ Account Deletion:   ⚠️  N/A                  ║
║                                                  ║
║  DESIGN (6 checks)                               ║
║  ├─ Color System:       ✅ PASS                  ║
║  ├─ Components:         ✅ PASS                  ║
║  ├─ Layout:             ✅ PASS                  ║
║  ├─ Dark Mode:          ✅ PASS                  ║
║  ├─ Mobile:             ✅ PASS                  ║
║  └─ Typography:         ✅ PASS                  ║
║                                                  ║
║  FUNCTIONALITY (7 checks)                        ║
║  ├─ Navigation:         ✅ PASS (12/12)          ║
║  ├─ Click Handlers:     ✅ PASS (47/47)          ║
║  ├─ Loading States:     ✅ PASS                  ║
║  ├─ Error States:       ✅ PASS                  ║
║  ├─ Empty States:       ✅ PASS                  ║
║  ├─ Form Validation:    ✅ PASS                  ║
║  └─ Toasts:             ✅ PASS (15 found)       ║
║                                                  ║
║  PERFORMANCE (7 checks)                          ║
║  ├─ Bundle Size:        ✅ PASS (landing: 82KB)  ║
║  ├─ Rendering:          ✅ PASS (6 client comps) ║
║  ├─ Data Fetching:      ✅ PASS                  ║
║  ├─ Assets:             ✅ PASS                  ║
║  ├─ API Routes:         ⚠️  N/A                  ║
║  ├─ Database:           ⚠️  N/A                  ║
║  └─ Web Vitals (est):   ✅ PASS                  ║
║                                                  ║
║  ACCESSIBILITY (6 checks)                        ║
║  ├─ Semantic HTML:      ✅ PASS                  ║
║  ├─ Keyboard Nav:       ✅ PASS                  ║
║  ├─ ARIA Labels:        ✅ PASS                  ║
║  ├─ Color Contrast:     ⚠️  1 warning (muted)    ║
║  ├─ Motion:             ✅ PASS                  ║
║  └─ Screen Reader:      ✅ PASS                  ║
║                                                  ║
║  DATA INTEGRITY (7 checks)                       ║
║  ├─ TypeScript Strict:  ✅ PASS (0 errors)       ║
║  ├─ Runtime Validation: ⚠️  N/A (no API yet)     ║
║  ├─ Claude Response:    ⚠️  N/A                  ║
║  ├─ DB Constraints:     ⚠️  N/A                  ║
║  ├─ Edge Cases:         ✅ PASS                  ║
║  ├─ Client Safety:      ✅ PASS                  ║
║  └─ Generated Types:    ⚠️  N/A                  ║
║                                                  ║
║  SEO (5 checks) — Phase 3+ only                  ║
║  ├─ Page Titles:        ⚠️  N/A                  ║
║  ├─ Open Graph:         ⚠️  N/A                  ║
║  ├─ Structured Data:    ⚠️  N/A                  ║
║  ├─ Technical SEO:      ⚠️  N/A                  ║
║  └─ Keywords:           ⚠️  N/A                  ║
║                                                  ║
╠══════════════════════════════════════════════════╣
║  RESULT: ✅ ALL CHECKS PASS                      ║
║  Ready to commit and proceed to Phase [N+1]      ║
╚══════════════════════════════════════════════════╝
```

If any checks FAIL:

```
╠══════════════════════════════════════════════╣
║  RESULT: ❌ 3 ISSUES FOUND                   ║
║                                              ║
║  1. [SECURITY] API key exposed in            ║
║     src/components/analysis.tsx:14            ║
║     → FIXED: moved to server-side API route  ║
║                                              ║
║  2. [DESIGN] Card border-radius is 8px,      ║
║     prototype specifies 12px                 ║
║     → FIXED: updated to 12px                 ║
║                                              ║
║  3. [FUNCTIONALITY] "Export" button on        ║
║     project detail has no onClick handler    ║
║     → FIXED: added toast notification        ║
║                                              ║
║  Re-validation: ✅ ALL CHECKS NOW PASS       ║
║  Ready to commit and proceed to Phase [N+1]  ║
╚══════════════════════════════════════════════╝
```

## After Validation Passes

Append to CLAUDE.md:

```markdown
## Phase [N] — [Name] — ✅ Validated [date]
- [What was built — 2-3 bullet points]
- Security: [any notable decisions]
- Known limitations: [anything deferred to a later phase]
```
