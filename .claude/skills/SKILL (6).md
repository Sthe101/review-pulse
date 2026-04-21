---
name: data-integrity-validator
description: Audit data integrity and type safety. Use when the user says "validate data", "type check", "data integrity", "validate types", "check edge cases", or after completing any build phase. Checks TypeScript strictness, runtime validation with Zod, database constraints, and edge case handling.
---

# Data Integrity Validator

Ensures data flowing through the application is validated, typed, and can't corrupt the database or crash the UI.

## Step 1: TypeScript Strictness

```bash
# Check tsconfig.json strict settings
cat tsconfig.json | grep -A5 "strict\|noUncheckedIndexedAccess\|noImplicitAny"
```

Required settings:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] `strict: true` is set (enables noImplicitAny, strictNullChecks, etc.)
- [ ] No `any` types in application code (check with `grep -rn ": any\|as any" src/ --include="*.ts" --include="*.tsx"`)
- [ ] No `@ts-ignore` or `@ts-expect-error` without a comment explaining why
- [ ] No `!` non-null assertions without justification

```bash
# Find all type safety bypasses
grep -rn "as any\|: any\|@ts-ignore\|@ts-expect-error\|\!\\." src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

Run the TypeScript compiler and verify zero errors:
```bash
npx tsc --noEmit
```

## Step 2: Runtime Validation (Zod)

API routes must validate all incoming data at runtime. TypeScript only checks at compile time — malicious or malformed requests bypass it.

```bash
# Check if Zod is installed
grep "zod" package.json

# Check API routes for validation
grep -rn "z\.\|zod\|schema\|parse\|safeParse" src/app/api/ --include="*.ts"
```

### Required validation schemas:

**POST /api/analyze**
```typescript
const AnalyzeSchema = z.object({
  reviews: z.array(z.object({
    content: z.string().min(1).max(10000),
    rating: z.number().int().min(1).max(5).optional(),
    author: z.string().max(200).optional(),
    source: z.string().max(100).optional(),
  })).min(1).max(500),  // enforce plan limits
  project_id: z.string().uuid(),
});
```

**POST /api/stripe/checkout**
```typescript
const CheckoutSchema = z.object({
  priceId: z.enum(['pro', 'business']),
});
```

**POST /api/projects (if exists)**
```typescript
const ProjectSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  industry: z.enum(['E-commerce', 'SaaS', 'Restaurant', 'Healthcare', 'Agency', 'Other']),
});
```

- [ ] Every API route validates the request body with Zod before processing
- [ ] Validation errors return 400 with specific field-level error messages
- [ ] String inputs are trimmed and length-limited
- [ ] UUIDs are validated as actual UUIDs
- [ ] Numeric inputs are bounded (rating 1-5, not -1 or 999)
- [ ] Arrays have max length limits (can't send 10,000 reviews in one request)

## Step 3: Claude API Response Validation

The Claude API returns JSON that must match your expected schema. If Claude hallucinates or returns malformed data, the UI should not crash.

```typescript
const AnalysisResponseSchema = z.object({
  summary: z.string(),
  sentiment: z.object({
    positive: z.number().min(0).max(100),
    neutral: z.number().min(0).max(100),
    negative: z.number().min(0).max(100),
    mixed: z.number().min(0).max(100),
  }),
  overall_score: z.number().min(0).max(100),
  complaints: z.array(z.object({
    rank: z.number(),
    title: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    frequency: z.number(),
    percent: z.number(),
    trend: z.enum(['growing', 'stable', 'declining']),
    suggestion: z.string(),
  })),
  // ... etc for praises, feature_requests, action_items
});
```

- [ ] Claude's JSON response is parsed with `safeParse`, not raw `JSON.parse`
- [ ] If parsing fails, the API retries once with a more explicit prompt
- [ ] If retry fails, the API returns 500 with "Analysis failed, please try again"
- [ ] The raw response is saved to `raw_response` column for debugging
- [ ] Sentiment percentages are normalized to sum to 100 (even if Claude returns 101)

## Step 4: Database Constraint Verification

```sql
-- Check all constraints exist
SELECT conname, contype, conrelid::regclass 
FROM pg_constraint 
WHERE connamespace = 'public'::regnamespace 
ORDER BY conrelid::regclass, contype;
```

Required constraints:
- [ ] `profiles.plan` CHECK only allows 'free', 'pro', 'business'
- [ ] `reviews.rating` CHECK between 1 and 5
- [ ] `reviews.sentiment` CHECK only allows 'positive', 'negative', 'neutral', 'mixed'
- [ ] `profiles.reviews_used_this_month` DEFAULT 0, cannot be negative
- [ ] Foreign keys have ON DELETE CASCADE (deleting a user cascades to projects → reviews → analyses)
- [ ] `projects.name` is NOT NULL
- [ ] `reviews.content` is NOT NULL
- [ ] UUIDs use `gen_random_uuid()` default

## Step 5: Edge Case Data Handling

Test how the application handles these inputs:

### Reviews
- [ ] Empty string review → rejected by Zod (min length 1)
- [ ] Very long review (10,000 chars) → accepted but truncated if needed
- [ ] Unicode characters (emoji, CJK, Arabic) → stored and displayed correctly
- [ ] HTML in review text → rendered as text, not parsed as HTML (XSS protection)
- [ ] Review with only whitespace → trimmed and rejected
- [ ] Review with newlines → preserved in display

### Project Names
- [ ] Very long name (200+ chars) → truncated or rejected
- [ ] Special characters in name (`<script>alert(1)</script>`) → escaped
- [ ] Duplicate project names → allowed (different IDs)

### Numbers
- [ ] Rating of 0, 6, -1, NaN → rejected by constraint
- [ ] Sentiment score > 100 or < 0 → normalized
- [ ] reviews_used_this_month overflow → capped at plan limit

### Concurrent Operations
- [ ] Two analysis requests for same project at same time → both complete, no data corruption
- [ ] Deleting a project while an analysis is running → analysis fails gracefully
- [ ] Changing plan while an analysis is running → analysis uses the plan at time of request

## Step 6: Client-Side Data Safety

```bash
# Check for potential null/undefined crashes in components
grep -rn "\.map(\|\.length\|\.filter(" src/ --include="*.tsx" | grep -v "?\.\||| \[\]\|??" | head -20
```

- [ ] All `.map()` calls on data that could be null use optional chaining (`data?.map()`) or default arrays (`(data || []).map()`)
- [ ] All `.length` accesses on potentially null arrays are guarded
- [ ] Loading states prevent rendering of data that hasn't loaded yet
- [ ] Error boundaries catch component-level crashes and show fallback UI

## Step 7: Supabase Generated Types

```bash
# Generate types from the database schema
npx supabase gen types typescript --project-id $PROJECT_ID > src/types/database.ts
```

- [ ] Generated types exist at `src/types/database.ts`
- [ ] All Supabase queries use the generated types (not `any`)
- [ ] When the schema changes, types are regenerated
- [ ] Insert/update operations use the correct `Insert`/`Update` type variants

## Output

```
DATA INTEGRITY AUDIT — [date]
================================
TypeScript Strict:   ✅ PASS / ❌ FAIL (X any types, X errors)
Runtime Validation:  ✅ PASS / ❌ FAIL (X routes unvalidated)
Claude Response:     ✅ PASS / ❌ FAIL (details)
DB Constraints:      ✅ PASS / ❌ FAIL (X missing)
Edge Cases:          ✅ PASS / ❌ FAIL (X unhandled)
Client Safety:       ✅ PASS / ❌ FAIL (X potential crashes)
Generated Types:     ✅ PASS / ❌ FAIL (details)
================================
```
