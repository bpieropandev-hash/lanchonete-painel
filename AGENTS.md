<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Sessão do funcionário no navegador

- `src/app/api/session/[action]/route.ts` é o BFF de login, refresh, logout e troca de senha. `src/lib/browser-session.server.ts` chama a API e guarda somente o refresh em cookie `HttpOnly`, `Secure`, `SameSite=Lax` e `__Host-` em produção; exige `Origin` da própria origem e `X-Session-Intent: browser`.
- `src/lib/api.ts` guarda o access token apenas em memória. Na inicialização, remove chaves de token de versões antigas do `localStorage`. `hydrate()` renova a sessão pelo BFF; as chamadas diretas à API e o WebSocket usam o access em memória. Serializar operações de sessão entre abas para evitar replay do refresh.
- Validar com `npm run test:security`, `npm run lint`, `npm run typecheck`, `npm run build` e `npm run audit:prod` em Node 26.
