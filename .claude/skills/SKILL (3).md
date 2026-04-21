---
name: functionality-validator
description: Test that every feature works correctly. Use when the user says "validate functionality", "test everything", "check all flows", "functionality audit", or after completing any build phase. Traces every click handler, navigation path, form submission, loading state, error state, and empty state.
---

# Functionality Validator

Tests every user-facing feature to ensure nothing is broken, dead, or missing.

## Step 1: Navigation Map

Build a complete map of every page and verify it's reachable:

```bash
# List all pages
find src/app -name "page.tsx" -o -name "page.ts" | sort
```

Expected pages:
```
(marketing)/page.tsx          → Landing page (/)
(auth)/login/page.tsx         → Login (/login)
(auth)/signup/page.tsx        → Signup (/signup)
(auth)/forgot-password/page.tsx → Forgot password (/forgot-password)
(dashboard)/dashboard/page.tsx → Dashboard home (/dashboard)
(dashboard)/projects/page.tsx  → Projects list (/projects)
(dashboard)/projects/[id]/page.tsx → Project detail (/projects/[id])
(dashboard)/trends/page.tsx    → Trends (/trends)
(dashboard)/integrations/page.tsx → Integrations (/integrations)
(dashboard)/settings/page.tsx  → Settings (/settings)
(dashboard)/billing/page.tsx   → Billing (/billing)
```

Verify every `<Link>` and `router.push()` points to a real page. No 404s.

## Step 2: Click Handler Audit

Search for every interactive element and verify it does something:

```bash
# Find all onClick handlers
grep -rn "onClick" src/ --include="*.tsx" | wc -l

# Find buttons without onClick
grep -rn "<button" src/ --include="*.tsx" | grep -v "onClick\|type=\"submit\"\|disabled"
```

Every button, clickable card, link, and toggle must have a handler that produces a visible result: navigation, modal, toast, state change, or form submission.

### Specific handlers to verify:

**Landing page:**
- [ ] "Features" nav link → smooth scrolls to How It Works section
- [ ] "Pricing" nav link → smooth scrolls to Pricing section  
- [ ] Dark mode toggle → switches theme
- [ ] "Log In" → navigates to /login
- [ ] "Get Started Free →" (hero) → navigates to /signup
- [ ] "Watch Demo" → navigates to /signup (or shows demo modal)
- [ ] Each pricing CTA → navigates to /signup (free) or creates Stripe checkout (pro/business)
- [ ] FAQ items → expand/collapse independently
- [ ] Footer links → scroll to correct sections
- [ ] Logo → scrolls to top

**Auth pages:**
- [ ] Logo → navigates to /
- [ ] Login submit → authenticates, redirects to /dashboard
- [ ] Signup submit → creates account, redirects to /dashboard
- [ ] Google OAuth → initiates OAuth flow
- [ ] "Forgot password?" → navigates to /forgot-password
- [ ] "Send Reset Link" → shows success state (green checkmark + "Check your email")
- [ ] "Back to Login" (on success state) → navigates to /login
- [ ] "Sign up free" / "Log in" cross-links → navigate correctly

**Dashboard Home:**
- [ ] Quick Analysis textarea → counts reviews as you type (split on double newlines)
- [ ] "Analyze →" with empty textarea → shows error toast
- [ ] "Analyze →" with text → shows progress bar with step messages → shows inline results
- [ ] "Open Full Report →" (on results) → navigates to project detail
- [ ] "New Analysis" (on results) → clears results, shows textarea again
- [ ] "Upload CSV" → navigates to project detail add tab
- [ ] Project cards → navigate to /projects/[id]
- [ ] Insight feed items → navigate to relevant project

**Projects List:**
- [ ] "New Project" → opens modal
- [ ] Modal: empty name → shows error toast
- [ ] Modal: valid name → creates project, navigates to /projects/[id]
- [ ] Modal: click outside → closes
- [ ] Project cards → navigate to /projects/[id]

**Project Detail:**
- [ ] Breadcrumb "Projects" → navigates to /projects
- [ ] Tab switching → shows correct content, preserves URL
- [ ] Add Reviews > Paste: empty submit → error toast
- [ ] Add Reviews > Paste: valid submit → adds reviews, triggers analysis, switches to Analysis tab
- [ ] Add Reviews > Paste: Clear button → clears textarea
- [ ] Add Reviews > CSV: click drop zone → simulates file upload
- [ ] Add Reviews > CSV: Remove → clears file
- [ ] Add Reviews > CSV: Import → triggers analysis
- [ ] Analysis: Export → toast "Downloaded!"
- [ ] Analysis: Share → toast "Link copied!"
- [ ] Analysis: Re-analyze → loading spinner → refreshed results
- [ ] Reviews: filter buttons → filter the list, update count
- [ ] Reviews: search → filters by text (if implemented)
- [ ] History: click entry → loads that analysis in Analysis tab with info toast

**Trends:**
- [ ] Time range buttons → active state toggles (visual only for now)
- [ ] Topic cards → drill-down shows individual chart
- [ ] "All topics" button → returns to grid view
- [ ] Topic dropdown → same as clicking cards

**Integrations:**
- [ ] Connect → toggles to connected state, shows toast
- [ ] Disconnect → toggles to disconnected state, shows toast

**Settings:**
- [ ] Save Changes → saves profile to DB, shows toast
- [ ] Notification toggles → animate, save to DB, show toast
- [ ] Delete Account → shows confirmation modal
- [ ] Confirm delete → deletes account, redirects to /
- [ ] Cancel delete → closes modal

**Billing:**
- [ ] Change Plan → opens modal
- [ ] Current plan shows "Current" badge, no switch button
- [ ] Other plans show "Switch" button → triggers plan change
- [ ] Update payment → opens Stripe portal (or toast)
- [ ] Invoice PDF links → download or toast

**Sidebar:**
- [ ] Logo → navigates to /dashboard
- [ ] Each nav item → navigates to correct page, shows active state
- [ ] "New Analysis" (teal accent) → navigates to add reviews
- [ ] User avatar → opens dropdown
- [ ] Dropdown: Profile → /settings
- [ ] Dropdown: Billing → /billing
- [ ] Dropdown: Help → toast
- [ ] Dropdown: Sign Out → signs out, redirects to /
- [ ] Dark mode toggle → switches theme
- [ ] Collapse toggle → collapses/expands sidebar
- [ ] Mobile: hamburger → opens drawer, overlay click closes it

## Step 3: Loading States

Every async operation must show a loading indicator:

- [ ] Dashboard analysis → progress bar with percentage
- [ ] Project analysis → spinner with "Analyzing..." text
- [ ] Page transitions → loading skeleton or spinner
- [ ] Data fetching (projects list, reviews list) → skeleton or spinner
- [ ] Stripe checkout redirect → some indication of processing

```bash
# Check for loading state patterns
grep -rn "loading\|isLoading\|pending\|Spinner\|skeleton\|Skeleton" src/ --include="*.tsx" | wc -l
```

## Step 4: Error States

Every async operation must handle failure gracefully:

- [ ] Analysis API fails → shows error toast with retry option
- [ ] Supabase query fails → shows error message, not a crash
- [ ] Stripe checkout fails → shows error message
- [ ] Network offline → doesn't crash (at minimum, shows an error boundary)
- [ ] Invalid project ID in URL → 404 page, not a crash

```bash
# Check for error handling
grep -rn "catch\|error\|Error\|onError" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l
```

## Step 5: Empty States

Pages with no data must show helpful guidance, not blank space:

- [ ] Dashboard with 0 projects → "Create your first project" prompt with CTA
- [ ] Projects list with 0 projects → "No projects yet" with "Create Project" button
- [ ] Project with 0 reviews → "Add reviews to get started" message
- [ ] Project with 0 analyses → "No analyses yet — add reviews to begin"
- [ ] Trends with no data → "Not enough data yet" message
- [ ] Billing with no subscription → Shows Free plan info, upgrade CTAs

## Step 6: Form Validation

- [ ] Login: email required, password required
- [ ] Signup: name required, email required, password required (minimum length?)
- [ ] Forgot password: email required
- [ ] New Project: name required
- [ ] Add Reviews paste: non-empty text required
- [ ] All required fields show validation error on empty submit (not just console errors)

## Step 7: Toast Notifications

Verify toasts appear for all user actions:

```bash
# Count toast invocations
grep -rn "toast\.\|show(\|addToast\|sonner" src/ --include="*.tsx" --include="*.ts" | wc -l
```

Expected toast triggers:
- Settings saved
- Notification toggled on/off
- Analysis complete
- Reviews added
- Project created
- Export downloaded
- Share link copied
- Integration connected/disconnected
- Plan switched
- Error messages (paste empty, name required, limit reached)
- Help center coming soon

## Output

```
FUNCTIONALITY AUDIT — [date]
================================
Navigation:          ✅ PASS / ❌ FAIL (X dead links found)
Click Handlers:      ✅ PASS / ❌ FAIL (X dead buttons found)
Loading States:      ✅ PASS / ❌ FAIL (X missing)
Error States:        ✅ PASS / ❌ FAIL (X missing)
Empty States:        ✅ PASS / ❌ FAIL (X missing)
Form Validation:     ✅ PASS / ❌ FAIL (X missing)
Toast Notifications: ✅ PASS / ❌ FAIL (X missing)
================================
Buttons tested: X/X
Pages verified: X/X
```

Fix all FAIL items before proceeding.
