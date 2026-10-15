import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The template's Form resets its ref during render (`formRef.current?.reset()`);
    // the rule that flags it arrived with eslint-config-next 16 and the
    // template is kept as written.
    rules: { "react-hooks/refs": "off" },
  },
  globalIgnores([".next/**", ".open-next/**", "next-env.d.ts", "cloudflare-env.d.ts"]),
]);
