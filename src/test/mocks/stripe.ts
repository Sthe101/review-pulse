import { vi } from "vitest";

export function createMockStripe() {
  return {
    customers: {
      create: vi.fn(async () => ({
        id: "cus_test_123",
        email: "test@example.com",
        object: "customer",
      })),
      retrieve: vi.fn(async (id: string) => ({
        id,
        email: "test@example.com",
        object: "customer",
      })),
      update: vi.fn(async (id: string) => ({ id, object: "customer" })),
      del: vi.fn(async (id: string) => ({ id, deleted: true })),
    },
    subscriptions: {
      create: vi.fn(async () => ({
        id: "sub_test_123",
        status: "active",
        customer: "cus_test_123",
        items: { data: [{ price: { id: "price_test_pro" } }] },
      })),
      retrieve: vi.fn(async (id: string) => ({
        id,
        status: "active",
        customer: "cus_test_123",
      })),
      update: vi.fn(async (id: string) => ({ id, status: "active" })),
      cancel: vi.fn(async (id: string) => ({ id, status: "canceled" })),
      list: vi.fn(async () => ({ data: [], has_more: false })),
    },
    invoices: {
      retrieve: vi.fn(async (id: string) => ({
        id,
        status: "paid",
        amount_paid: 2900,
        currency: "usd",
      })),
      list: vi.fn(async () => ({ data: [], has_more: false })),
      retrieveUpcoming: vi.fn(async () => ({
        amount_due: 2900,
        currency: "usd",
      })),
    },
    webhooks: {
      constructEvent: vi.fn((payload: string | Buffer) => ({
        id: "evt_test_123",
        type: "customer.subscription.created",
        data: {
          object: JSON.parse(
            typeof payload === "string" ? payload : payload.toString()
          ),
        },
      })),
    },
    billingPortal: {
      sessions: {
        create: vi.fn(async () => ({
          id: "bps_test_123",
          url: "https://billing.stripe.com/session/test",
        })),
      },
    },
    checkout: {
      sessions: {
        create: vi.fn(async () => ({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/session/test",
        })),
        retrieve: vi.fn(async (id: string) => ({
          id,
          status: "complete",
          customer: "cus_test_123",
          subscription: "sub_test_123",
        })),
      },
    },
  };
}

export type MockStripe = ReturnType<typeof createMockStripe>;
