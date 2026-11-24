import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
export default defineConfig([
  ...next,
  globalIgnores([".next/**", "next-env.d.ts"]),
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
