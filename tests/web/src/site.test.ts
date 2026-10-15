import { describe, expect, it } from "vitest";

describe("site identity (apps/web/lib/site.ts)", () => {
  it("names the site and links its source repository", async () => {
    const { SITE_NAME, SOURCE_URL } = await import("@/lib/site");
    expect(SITE_NAME.trim()).not.toBe("");
    expect(SOURCE_URL).toMatch(/^https:\/\/github\.com\/[A-Za-z0-9-]+\/[a-z0-9-]+$/);
  });
});
