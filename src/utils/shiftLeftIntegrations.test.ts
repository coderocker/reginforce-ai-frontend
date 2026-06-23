import { describe, expect, it } from "vitest";
import { buildVsCodeSettingsSnippet, buildVetFilesExampleCurl, DEFAULT_MANIFEST_FILES } from "./shiftLeftIntegrations";

describe("buildVsCodeSettingsSnippet", () => {
  it("strips trailing slash from apiUrl", () => {
    const snippet = buildVsCodeSettingsSnippet("http://localhost:8000/");
    const parsed = JSON.parse(snippet) as Record<string, unknown>;
    expect(parsed["complylens.apiUrl"]).toBe("http://localhost:8000");
  });

  it("includes default manifest files and vetOnSave", () => {
    const parsed = JSON.parse(buildVsCodeSettingsSnippet("http://api.test")) as Record<string, unknown>;
    expect(parsed["complylens.vetOnSave"]).toBe(true);
    expect(parsed["complylens.manifestFiles"]).toEqual([...DEFAULT_MANIFEST_FILES]);
  });

  it("embeds the provided api key placeholder", () => {
    const parsed = JSON.parse(
      buildVsCodeSettingsSnippet("http://api.test", "clp_test_key"),
    ) as Record<string, unknown>;
    expect(parsed["complylens.apiKey"]).toBe("clp_test_key");
  });
});

describe("buildVetFilesExampleCurl", () => {
  it("uses vet-files with full manifest bodies in one request", () => {
    const curl = buildVetFilesExampleCurl("http://localhost:8000/", "clp_test");
    expect(curl).toContain("/api/oss/shift-left/vet-files");
    expect(curl).toContain("base_content");
    expect(curl).toContain("head_content");
    expect(curl).toContain("flask==3.0.0");
    expect(curl).toContain("requests==2.31.0");
    expect(curl).toContain("clp_test");
  });
});
