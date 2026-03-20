import { describe, expect, it } from "vitest";

import {
  normalizeSupabaseUrlInput,
  resolveOptionalSupabaseServiceRoleConfig,
  resolveRequiredSupabaseServiceRoleConfig,
} from "../../scripts/chatbot/supabase-env.mjs";

describe("chatbot supabase env", () => {
  it("normalizes a hosted project ref into a full URL", () => {
    expect(normalizeSupabaseUrlInput("rcrulfdobtmfxzpuyryn")).toBe("https://rcrulfdobtmfxzpuyryn.supabase.co");
  });

  it("falls back to VITE_SUPABASE_PROJECT_URL when SUPABASE_URL is unset", () => {
    expect(
      resolveRequiredSupabaseServiceRoleConfig({
        VITE_SUPABASE_PROJECT_URL: "rcrulfdobtmfxzpuyryn",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    ).toEqual({
      supabaseUrl: "https://rcrulfdobtmfxzpuyryn.supabase.co",
      serviceRoleKey: "service-role-key",
    });
  });

  it("treats missing optional Supabase config as disabled", () => {
    expect(resolveOptionalSupabaseServiceRoleConfig({})).toEqual({
      enabled: false,
      supabaseUrl: "",
      serviceRoleKey: "",
    });
  });

  it("rejects invalid Supabase URL inputs", () => {
    expect(() =>
      resolveRequiredSupabaseServiceRoleConfig({
        SUPABASE_URL: "not a url/value",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    ).toThrow("Invalid SUPABASE_URL");
  });
});
