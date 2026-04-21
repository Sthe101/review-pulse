import { vi } from "vitest";

/**
 * Returns a chainable query-builder mock that resolves to `{ data, error: null }`.
 * Each builder method returns the same mock so `.select().eq().single()` etc. chain.
 */
function createQueryBuilder(defaultData: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainable = [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
    "in",
    "is",
    "or",
    "contains",
    "order",
    "limit",
    "range",
    "match",
  ] as const;

  for (const method of chainable) {
    builder[method] = vi.fn(() => builder);
  }

  const terminal = { data: defaultData, error: null };
  builder.single = vi.fn(async () => terminal);
  builder.maybeSingle = vi.fn(async () => terminal);
  builder.then = (resolve: (v: typeof terminal) => unknown) =>
    Promise.resolve(terminal).then(resolve);

  return builder;
}

export function createMockSupabaseClient() {
  const from = vi.fn(() => createQueryBuilder());

  const auth = {
    getUser: vi.fn(async () => ({
      data: { user: null },
      error: null,
    })),
    getSession: vi.fn(async () => ({
      data: { session: null },
      error: null,
    })),
    signInWithPassword: vi.fn(async () => ({
      data: { user: null, session: null },
      error: null,
    })),
    signUp: vi.fn(async () => ({
      data: { user: null, session: null },
      error: null,
    })),
    signOut: vi.fn(async () => ({ error: null })),
    exchangeCodeForSession: vi.fn(async () => ({
      data: { session: null },
      error: null,
    })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
    updateUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };

  const storage = {
    from: vi.fn(() => ({
      upload: vi.fn(async () => ({ data: { path: "" }, error: null })),
      download: vi.fn(async () => ({ data: null, error: null })),
      remove: vi.fn(async () => ({ data: [], error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
    })),
  };

  const rpc = vi.fn(async () => ({ data: null, error: null }));

  return { from, auth, storage, rpc };
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
