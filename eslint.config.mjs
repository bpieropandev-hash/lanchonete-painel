import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "coverage/**"] },
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Regras do React Compiler (eslint-config-next 16), que o projeto não usa.
      // Os efeitos sinalizados carregam dados da API; revisar ao adotar o compiler.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/incompatible-library": "off",
      // Logout e sessão expirada recarregam a página de propósito, para
      // descartar todo o estado em memória da sessão anterior.
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
];

export default config;
