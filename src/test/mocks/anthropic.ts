import { vi } from "vitest";
import { sampleAnalysisResponse } from "@/test/fixtures/analysis";

export function createMockAnthropic(response = sampleAnalysisResponse) {
  return {
    messages: {
      create: vi.fn(async () => ({
        id: "msg_test_123",
        type: "message",
        role: "assistant",
        model: "claude-opus-4-7",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: {
          input_tokens: 1200,
          output_tokens: 640,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        content: [
          {
            type: "text",
            text: JSON.stringify(response),
          },
        ],
      })),
      stream: vi.fn(),
    },
  };
}

export type MockAnthropic = ReturnType<typeof createMockAnthropic>;
