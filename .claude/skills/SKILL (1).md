---
name: security-validator
description: Run a security audit on the codebase. Use when the user says "validate security", "security check", "security audit", "check for vulnerabilities", or after completing any build phase. Scans for leaked secrets, auth bypass, RLS gaps, injection risks, exposed internals, and unsafe patterns.
---

# Security Validator

Run this after every build phase or whenever security needs to be verified.

## Step 1: Secret Exposure Scan

Search the entire `src/` directory for leaked secrets. Any match outside `.env*` files or `api/` route handlers is a **CRITICAL** failure.

```bash
# Must return 0 results
grep -rn "SUPABASE_SERVICE_ROLE\|ANTHROPIC_API_KEY\|STRIPE_SECRET_KEY\|STRIPE_WEBHOOK_SECRET\|sk-ant-\|sk_live_\|sk_test_\|whsec_" src/ --include="*.ts" --include="*.tsx" | grep -v "process\.env\." | grep -v "\.env"
```

Also check:
- `.env.local` is listed in `.gitignore`
- No `.env` files are committed (check `git ls-files | grep .env`)
- No API keys in any `console.log`, error messages, or response bodies
- `NEXT_PUBLIC_` prefix is only used for truly public values (Supabase anon key, Stripe publishable key, app URL)

## Step 2: Authentication Checks

Verify every API route and server action:

```bash
# List all API routes
find src/app/api -name "route.ts" -o -name "route.tsx"
```

For each route, verify:
- It calls `getUser()` or equivalent auth check before any business logic
- Unauthenticated requests return 401, not a crash
- The Stripe webhook route is the ONLY exception (it uses signature verification instead)

For pages in `(dashboard)/`:
- Verify the layout or middleware redirects unauthenticated users
- Server components use the server Supabase client
- No client-side fetching that bypasses auth

## Step 3: Row Level Security

If Supabase migrations exist, read every RLS policy:

```bash
find supabase/migrations -name "*.sql" | xargs grep -A3 "CREATE POLICY"
```

Verify:
- Every table with user data has RLS enabled
- Policies use `auth.uid()` to scope access
- `profiles`: users can only read/write their own row
- `projects`: users can only access projects where `user_id = auth.uid()`
- `reviews`: users can only access reviews in their own projects (join check)
- `analyses`: users can only access analyses in their own projects (join check)
- `notification_prefs`: users can only access their own preferences
- No policy uses `USING (true)` or grants public access to user data
- DELETE policies exist and are scoped (can't delete other users' data)

## Step 4: Input Sanitization

Check for injection risks:

- **SQL Injection**: Verify all Supabase queries use the SDK (parameterized by default). Flag any raw SQL with string interpolation.
- **Prompt Injection**: Verify user review text is passed as the user message content to Claude, NOT interpolated into the system prompt. The system prompt should be a static constant.
- **XSS**: Verify no usage of `dangerouslySetInnerHTML`. If present, verify the content is sanitized.
- **Path Traversal**: If file uploads exist, verify filenames are sanitized.

```bash
# Should return 0 results
grep -rn "dangerouslySetInnerHTML" src/
grep -rn "eval(" src/ --include="*.ts" --include="*.tsx"
grep -rn "innerHTML" src/ --include="*.ts" --include="*.tsx"
```

## Step 5: Rate Limiting

Check that abuse-prone endpoints have rate limiting:
- `/api/analyze` — max 10 requests/minute/user (this is expensive)
- `/api/stripe/checkout` — max 5 requests/minute/user
- Auth endpoints — handled by Supabase, but verify no custom auth that bypasses it

## Step 6: Error Handling

Verify API routes don't leak stack traces or internal details:

```bash
# Check all catch blocks in API routes
grep -A5 "catch" src/app/api/*/route.ts
```

Every catch block should:
- Log the full error server-side (`console.error`)
- Return a generic user-friendly message to the client
- Never include `error.stack`, file paths, or database details in the response

## Step 7: Sensitive Data in Responses

Check that API responses don't include:
- Other users' data
- Internal database IDs that could be enumerated
- The raw Claude API response (store it in DB, but return only the parsed analysis)
- Stripe customer IDs or subscription IDs in client-facing responses

## Step 8: CSRF & CORS

- [ ] API routes that mutate data (POST, PUT, DELETE) verify the origin header or use SameSite cookies
- [ ] Next.js API routes don't set `Access-Control-Allow-Origin: *` on authenticated endpoints
- [ ] Stripe webhook route allows Stripe's origin but verifies via signature (not CORS)
- [ ] Supabase auth uses SameSite=Lax cookies (default with @supabase/ssr)

```bash
# Check for permissive CORS
grep -rn "Access-Control-Allow-Origin\|cors" src/ --include="*.ts" --include="*.tsx"
# Should return 0 results (Next.js handles CORS properly by default)
```

## Step 9: Security Headers

Verify `next.config.js` or middleware sets these headers:

```javascript
// next.config.js
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
```

```bash
# Check next.config for security headers
grep -A10 "headers\|X-Frame\|Content-Security\|X-Content-Type" next.config.* 2>/dev/null
```

- [ ] X-Frame-Options: DENY (prevents clickjacking)
- [ ] X-Content-Type-Options: nosniff (prevents MIME sniffing)
- [ ] Referrer-Policy set (prevents leaking URLs)
- [ ] No unnecessary Permissions-Policy grants

## Step 10: Dependency Audit

```bash
# Check for known vulnerabilities
npm audit --production

# Check for outdated packages with known CVEs
npm outdated
```

- [ ] `npm audit` returns 0 critical/high vulnerabilities
- [ ] No dependencies with known CVEs in production
- [ ] Lock file (package-lock.json) is committed

## Step 11: Data Cleanup on Account Deletion

When a user deletes their account:
- [ ] All their projects are deleted (CASCADE)
- [ ] All their reviews are deleted (CASCADE)
- [ ] All their analyses are deleted (CASCADE)
- [ ] Their Stripe subscription is cancelled
- [ ] Their Supabase auth account is deleted
- [ ] No orphaned data remains

```bash
# Check the delete account handler
grep -rn "delete.*account\|deleteUser\|auth.admin" src/ --include="*.ts" --include="*.tsx"
```

## Output

After running all checks, produce a summary:

```
SECURITY AUDIT — [date]
================================
Secret Exposure:     ✅ PASS / ❌ FAIL (details)
Authentication:      ✅ PASS / ❌ FAIL (details)
Row Level Security:  ✅ PASS / ❌ FAIL (details)
Input Sanitization:  ✅ PASS / ❌ FAIL (details)
Rate Limiting:       ✅ PASS / ❌ FAIL (details)
Error Handling:      ✅ PASS / ❌ FAIL (details)
Response Safety:     ✅ PASS / ❌ FAIL (details)
CSRF & CORS:         ✅ PASS / ❌ FAIL (details)
Security Headers:    ✅ PASS / ❌ FAIL (details)
Dependencies:        ✅ PASS / ❌ FAIL (details)
Account Deletion:    ✅ PASS / ❌ FAIL (details)
================================
```

Fix all FAIL items before proceeding.
