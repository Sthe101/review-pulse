---
name: accessibility-validator
description: Audit accessibility and WCAG compliance. Use when the user says "validate accessibility", "a11y check", "accessibility audit", "screen reader", "keyboard navigation", or after completing any build phase. Checks color contrast, ARIA labels, keyboard navigation, focus management, and semantic HTML.
---

# Accessibility Validator

Ensures the application is usable by everyone, including users with disabilities. Targets WCAG 2.1 Level AA compliance.

## Step 1: Semantic HTML

```bash
# Check for div-soup — interactive elements should use semantic tags
grep -rn "onClick" src/ --include="*.tsx" | grep "<div\|<span" | grep -v "className.*btn\|className.*card\|role=" | head -20
```

Fix patterns:
- Clickable `<div>` without `role="button"` → use `<button>` instead
- Navigation lists → use `<nav>` and `<ul>`/`<li>`
- Form groups → use `<fieldset>` and `<legend>`
- Page sections → use `<main>`, `<section>`, `<article>`, `<aside>`
- Headings → use proper `<h1>` through `<h6>` in order (no skipping levels)

Check heading hierarchy:
```bash
# Extract heading usage
grep -rn "<h[1-6]" src/ --include="*.tsx" | sed 's/.*<h\([1-6]\).*/h\1/' | sort | uniq -c
```

- [ ] Each page has exactly one `<h1>`
- [ ] Heading levels don't skip (no h1 → h3 without h2)
- [ ] Dashboard pages: h1 for page title, h2 for section headers

## Step 2: Keyboard Navigation

Every interactive element must be reachable and operable via keyboard alone:

- [ ] All buttons focusable with Tab key
- [ ] All links focusable with Tab key
- [ ] Modal: focus trapped inside when open, Escape key closes it
- [ ] Sidebar: Tab navigates through nav items
- [ ] Dropdown menus: Escape closes, arrow keys navigate options
- [ ] FAQ accordion: Enter/Space toggles items
- [ ] Tab panels (project detail): arrow keys switch tabs
- [ ] Review filter buttons: Tab focuses, Enter/Space activates
- [ ] Form inputs: Tab order follows visual order

```bash
# Check for tabIndex misuse
grep -rn "tabIndex" src/ --include="*.tsx"
# tabIndex={0} is OK, tabIndex > 0 is almost always wrong
# Negative tabIndex removes from tab order — only for programmatic focus

# Check that onClick on non-button elements has keyboard handler
grep -rn "onClick" src/ --include="*.tsx" | grep "<div\|<span" | grep -v "onKeyDown\|onKeyPress\|role="
# These need onKeyDown={(e) => e.key === 'Enter' && handler()} AND role="button" AND tabIndex={0}
```

### Focus Management
- [ ] After modal opens → focus moves to the modal (first focusable element or close button)
- [ ] After modal closes → focus returns to the element that opened it
- [ ] After page navigation → focus moves to the main content area
- [ ] After toast appears → it does NOT steal focus (toasts are aria-live regions)
- [ ] Skip-to-content link exists (hidden, visible on focus) for keyboard users

```bash
# Check for focus management patterns
grep -rn "useRef\|\.focus()\|autoFocus" src/ --include="*.tsx"
```

## Step 3: ARIA Labels & Roles

```bash
# Find images/icons without labels
grep -rn "<svg\|<img\|<Icon\|<I " src/ --include="*.tsx" | grep -v "aria-label\|aria-hidden\|alt=" | head -20
```

Required ARIA attributes:
- [ ] Decorative icons: `aria-hidden="true"` (most UI icons)
- [ ] Meaningful icons (standalone, no text): `aria-label="description"`
- [ ] Icon-only buttons: `aria-label="action description"` (e.g., collapse sidebar, dark mode toggle)
- [ ] Sidebar collapse button: `aria-label="Collapse sidebar"` / `aria-label="Expand sidebar"`
- [ ] Dark mode toggle: `aria-label="Switch to dark mode"` / `aria-label="Switch to light mode"`
- [ ] Close buttons (modal, toast): `aria-label="Close"`
- [ ] Loading spinner: `aria-label="Loading"` and `role="status"`
- [ ] Toast container: `role="status"` and `aria-live="polite"`
- [ ] Modal overlay: `role="dialog"` and `aria-modal="true"` and `aria-labelledby` pointing to title
- [ ] Navigation: `<nav aria-label="Main navigation">`, `<nav aria-label="Sidebar">`
- [ ] Forms: inputs have associated `<label>` elements (not just placeholder text)
- [ ] Progress bar: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] Tabs: `role="tablist"`, `role="tab"`, `role="tabpanel"` with proper aria-selected and aria-controls

```bash
# Check forms have proper labels
grep -rn "<input\|<textarea\|<select" src/ --include="*.tsx" | grep -v "aria-label\|id=.*label\|<label"
```

## Step 4: Color Contrast

WCAG AA requires:
- **Normal text (< 18px)**: contrast ratio ≥ 4.5:1
- **Large text (≥ 18px bold or ≥ 24px)**: contrast ratio ≥ 3:1
- **UI components** (buttons, inputs, icons): contrast ratio ≥ 3:1

### Light mode checks
| Element | Foreground | Background | Ratio | Pass? |
|---------|-----------|------------|-------|-------|
| Body text | #0F172A | #FFFFFF | 16.75:1 | ✅ |
| Secondary text | #475569 | #FFFFFF | 7.09:1 | ✅ |
| Muted text | #94A3B8 | #FFFFFF | 3.03:1 | ⚠️ Borderline |
| Teal on white | #0D9488 | #FFFFFF | 4.11:1 | ⚠️ Check |
| Coral on white | #EA580C | #FFFFFF | 4.45:1 | ⚠️ Check |
| White on coral | #FFFFFF | #EA580C | 4.45:1 | ✅ |
| White on navy | #FFFFFF | #1E3A5F | 9.68:1 | ✅ |
| White on teal | #FFFFFF | #0D9488 | 4.11:1 | ⚠️ Check |

### Dark mode checks
| Element | Foreground | Background | Ratio | Pass? |
|---------|-----------|------------|-------|-------|
| Body text | #E8ECF2 | #151D2E | 10.53:1 | ✅ |
| Secondary text | #8B9AB8 | #151D2E | 4.87:1 | ✅ |
| Muted text | #566380 | #151D2E | 2.47:1 | ❌ FAIL |

**Action items:**
- [ ] Muted text (#94A3B8 on #FFFFFF) is 3.03:1 — passes for large text only. For small text (badges, meta dates), consider darkening to #6B7280 (5.27:1)
- [ ] Dark mode muted text (#566380 on #151D2E) is 2.47:1 — **FAILS**. Lighten to #7085A0 or similar to reach 4.5:1
- [ ] Teal text on white backgrounds — verify it's only used for headings (large text) or interactive elements (3:1 OK)

## Step 5: Motion & Animations

- [ ] No essential information conveyed through animation alone
- [ ] Respect `prefers-reduced-motion`: disable or reduce animations for users who set this

```bash
# Check for animation usage
grep -rn "animation\|transition\|@keyframes" src/ --include="*.tsx" --include="*.css"
```

Add to global CSS:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] Spinner animation respects reduced motion
- [ ] Progress bar transition respects reduced motion
- [ ] Card hover animations respect reduced motion
- [ ] Sidebar collapse transition respects reduced motion

## Step 6: Screen Reader Testing

Verify these announcements make sense:
- [ ] Page titles are descriptive (`<title>Dashboard — ReviewPulse</title>`)
- [ ] Navigation landmarks are labeled
- [ ] Dynamic content updates (toasts, analysis results) are announced via `aria-live`
- [ ] Form errors are associated with their inputs via `aria-describedby`
- [ ] Charts have text alternatives (the DonutChart should have an `aria-label` summarizing the data)
- [ ] Sentiment bar has an `aria-label` like "45% positive, 20% neutral, 28% negative"

## Output

```
ACCESSIBILITY AUDIT — [date]
================================
Semantic HTML:       ✅ PASS / ❌ FAIL (details)
Keyboard Navigation: ✅ PASS / ❌ FAIL (details)
ARIA Labels:         ✅ PASS / ❌ FAIL (X missing)
Color Contrast:      ✅ PASS / ❌ FAIL (X failures)
Motion:              ✅ PASS / ❌ FAIL (details)
Screen Reader:       ✅ PASS / ❌ FAIL (details)
================================
WCAG 2.1 AA:         ✅ COMPLIANT / ❌ X issues remaining
```
