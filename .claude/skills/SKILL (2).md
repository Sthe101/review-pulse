---
name: design-validator
description: Validate that the implementation matches the design prototype. Use when the user says "validate design", "check design", "design audit", "does it match the prototype", or after completing any build phase. Compares components, colors, spacing, dark mode, and mobile responsiveness against design-reference.jsx.
---

# Design Validator

Compares the built application against `design-reference.jsx` (the UI prototype) to ensure pixel-level consistency.

## Prerequisites

The file `design-reference.jsx` must exist in the project root. If it doesn't, ask the user to provide it.

## Step 1: Color System Verification

Read the CSS variables from the prototype (lines 5-7 of design-reference.jsx) and compare against the project's `globals.css` or `tailwind.config.ts`:

### Light mode (`:root` / default)
```
--bg: #FFFFFF       (page sections background)
--bg2: #FFFFFF      (cards, inputs, sidebar)
--bg3: #F8FAFC      (subtle backgrounds, steps section)
--tx: #0F172A       (primary text)
--tx2: #475569      (secondary text)
--tx3: #94A3B8      (muted text, placeholders)
--bd: #E2E8F0       (borders, dividers)
--bd2: #CBD5E1      (input borders)
--teal: #0D9488     (primary accent, active states)
--navy: #1E3A5F     (secondary accent, buttons)
--coral: #EA580C    (CTA buttons, highlights)
--pos: #059669      (positive sentiment, success)
--neg: #DC2626      (negative sentiment, errors)
--warn: #D97706     (warnings, mixed sentiment)
--posbg: #D1FAE5    --negbg: #FEE2E2    --warnbg: #FEF3C7
--tealbg: #F0FDFA   --navybg: #EFF6FF
--pagebg: #F8FAFC   (dashboard background)
```

### Dark mode (`.dark` class)
```
--bg: #0B1120       --bg2: #151D2E      --bg3: #1C2840
--tx: #E8ECF2       --tx2: #8B9AB8      --tx3: #566380
--bd: #243045       --bd2: #2D3D55
--navybg: #1C2840   --tealbg: #12282A
--posbg: #12282A    --negbg: #2E1820    --warnbg: #2E2818
--pagebg: #0B1120
```

Flag any missing or incorrect values.

## Step 2: Component Design Checks

For each component, verify against the prototype:

### Buttons (prototype CSS lines 12-18)
- `btn-coral`: background coral, white text, 10px 24px padding, 8px border-radius
- `btn-navy`: background navy, white text, 10px 20px padding
- `btn-teal`: background teal, white text, 10px 24px padding
- `btn-outline`: bg2 background, tx2 text, bd border, 8px 16px padding
- All buttons: 600 font-weight, 14px font-size, opacity 0.9 on hover, scale(0.98) on active

### Cards (prototype CSS lines 9-11)
- Background: var(--bg2), border: 1px solid var(--bd), border-radius: 12px
- Hover: box-shadow 0 4px 12px rgba(0,0,0,0.08)
- Clickable variant: translateY(-2px) + stronger shadow on hover

### Badge
- Font-size 11px, font-weight 600, padding 2px 8px, border-radius 99px

### Modal
- Fixed overlay with rgba(0,0,0,0.5) + backdrop-filter blur(4px)
- Card with 28px 32px padding, max-width 480px, border-radius 12px
- Title 18px 600 weight, close button top-right

### Inputs (prototype CSS lines 19-20)
- Background var(--bg2), color var(--tx), border 1px solid var(--bd2)
- Border-radius 8px, padding 10px 12px, font-size 14px
- Focus: border-color var(--teal)

### DonutChart
- SVG 160px default, 4 segments (green/grey/red/orange), center circle with score number
- Center circle fill: var(--bg2) — must adapt to dark mode
- Score text fill: var(--tx) — must adapt to dark mode

### SentimentBar
- Tri-color horizontal bar: green (positive), grey (neutral), red (negative)
- Border-radius 99px, default height 8px

## Step 3: Layout Checks

### Sidebar (prototype lines 244-272)
- Expanded: 256px wide, shows logo text, nav labels, usage meter, user name/email, dark mode label
- Collapsed: 64px wide, icons centered, all text hidden, usage meter hidden, user shows avatar only, dropdown pops right
- Dark mode toggle: moon/sun icon with label (hidden when collapsed)
- Collapse button: chevron left/right at bottom

### Landing page (prototype lines 147-213)
- Sticky nav with backdrop blur
- Hero: two-column with 48px h1, tilted mockup card
- Pricing: 3 cards, middle one elevated with teal border + "Most Popular" badge
- FAQ: accordion items, independent toggle

### Dashboard pages
- Content max-width 1200px
- Padding 24px 32px (16px on mobile)
- Stat grids: 4 columns (2 on very small screens)

## Step 4: Dark Mode Verification

Toggle dark mode and verify:

1. **No hardcoded hex colors in styles** — every color should use CSS variables
   ```bash
   # Find potential issues (exclude SVG fill/stroke which are intentional)
   grep -rn "style={{" src/ --include="*.tsx" | grep -oP '#[0-9A-Fa-f]{6}' | sort -u
   ```
   Allowed hardcoded hex: SVG chart segment fills (#059669, #94A3B8, #DC2626, #D97706), button white text (#fff)

2. **Every surface adapts**: page background, card backgrounds, text colors, borders, input fields, badges, tooltips, modal overlay, toast backgrounds

3. **Charts adapt**: DonutChart center circle and text, line chart grid lines, trend bar colors

4. **Contrast is sufficient**: text must be readable on its background in both modes. Check tx on bg2, tx2 on bg2, tx3 on bg3.

## Step 5: Mobile Responsiveness (768px breakpoint)

Resize to 375px width and verify:

1. **Sidebar**: hidden by default, appears as slide-out drawer when hamburger is clicked, backdrop overlay visible
2. **Mobile top bar**: visible with hamburger, logo, user avatar
3. **Landing nav**: desktop links hidden, mobile CTA + dark mode toggle shown
4. **Hero**: stacks vertically, h1 shrinks to 32px, mockup card goes full width without rotation
5. **Grid layouts**: all 2-column grids collapse to single column (`.grid-2`)
6. **Stat grids**: go to 2x2 on 480px
7. **Content padding**: 16px on mobile
8. **No horizontal scroll** on any page
9. **Modals**: still centered and usable at narrow widths
10. **Tables**: don't overflow (billing history, invoice table)

## Step 6: Typography & Spacing

- Font family: system-ui, -apple-system, sans-serif
- H1: 24px 600 weight (dashboard), 48px 700 weight (landing hero)
- H2: 32px 700 weight (landing sections), 18px 600 weight (analysis section headers)
- Body text: 14px regular
- Small text: 13px for labels, 12px for meta text, 11px for badges
- Card padding: 20-24px
- Section gaps: 16-24px between cards
- Consistent border-radius: 12px for cards, 8px for buttons/inputs, 99px for badges/bars

## Output

```
DESIGN AUDIT — [date]
================================
Color System:        ✅ PASS / ❌ FAIL (details)
Components:          ✅ PASS / ❌ FAIL (details)
Layout:              ✅ PASS / ❌ FAIL (details)
Dark Mode:           ✅ PASS / ❌ FAIL (details)
Mobile:              ✅ PASS / ❌ FAIL (details)
Typography:          ✅ PASS / ❌ FAIL (details)
================================
```

Fix all FAIL items before proceeding.
