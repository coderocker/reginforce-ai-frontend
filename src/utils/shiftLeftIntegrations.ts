/** Shared helpers for shift-left integration UI. */

const DEFAULT_MANIFEST_FILES = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
] as const;

export function buildVsCodeSettingsSnippet(
  apiUrl: string,
  apiKey = "clp_your_secret_key_here",
): string {
  const base = apiUrl.replace(/\/$/, "");
  return JSON.stringify(
    {
      "complylens.apiUrl": base,
      "complylens.apiKey": apiKey,
      "complylens.vetOnSave": true,
      "complylens.manifestFiles": [...DEFAULT_MANIFEST_FILES],
    },
    null,
    2,
  );
}

/** Example curl for vet-files: one request with full manifest bodies (not per-package). */
export function buildVetFilesExampleCurl(
  apiUrl: string,
  apiKey = "clp_your_secret_key_here",
): string {
  const base = apiUrl.replace(/\/$/, "");
  const payload = {
    filename: "requirements.txt",
    base_content: "flask==3.0.0\n",
    head_content: "flask==3.0.0\nrequests==2.31.0\n",
    app_base_url: base,
  };
  return `curl -X POST "${base}/api/oss/shift-left/vet-files" \\
  -H "Content-Type: application/json" \\
  -H "X-Plugin-Api-Key: ${apiKey}" \\
  -d '${JSON.stringify(payload)}'`;
}

export { DEFAULT_MANIFEST_FILES };
