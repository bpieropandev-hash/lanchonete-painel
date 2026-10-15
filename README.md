# Lanchonete: painel da loja

Painel interno (Next.js 15) para atendente, chapeiro e administrador. Consome a `lanchonete-api`.

Runtime Docker usa Node22/USER node, patches Debian e HEALTHCHECK, sem npm/npx/yarn. Comandos npm são para desenvolvimento/CI. Em Podman, construa com `--format docker` para preservar HEALTHCHECK.

## Rodando localmente

```bash
cp .env.example .env
npm install
npm run dev              # http://localhost:3002
```

O primeiro acesso usa o admin criado pelo `npm run seed` da API.

## Telas

| Tela | Quem usa | O que faz |
|---|---|---|
| **Pedidos** | admin, atendente | Quadro do expediente atual em tempo real, detalhe, avanço de status, cancelamento e link de WhatsApp |
| **Chapeiro (cozinha)** | admin, chapeiro | Tela da cozinha: fila por ordem de chegada, tempo de espera com cores, som que repete enquanto houver pedido novo, tela sempre acesa |
| **Loja** | admin (atendente só abre/fecha) | Abrir/fechar na hora, horários por dia, pedido mínimo, taxa padrão, **taxa por bairro**, entrega/retirada |
| **Cardápio** | admin | Produtos, variantes, ingredientes que vêm no lanche e **adicionais pagos** |
| **Caixa** | admin, atendente | Totais do expediente, fechamento com fundo de troco e conferência da gaveta |

## Operação

- **Tempo real:** se a conexão cair, o painel avisa e, ao reconectar, busca tudo de novo. A tela do chapeiro mostra "Sem conexão" e recarrega a fila a cada 20 s enquanto isso.
- **Tela da cozinha:** use um tablet ou TV com navegador. Ao abrir, toque na tela: isso libera o som e mantém a tela acesa (o navegador exige esse toque, inclusive depois de recarregar). O card fica laranja a partir de 15 min e vermelho a partir de 25 min. "Pronto/Saiu" pede um segundo toque para confirmar, porque tira o pedido da fila.
- **Expediente:** a tela de pedidos e o caixa usam o "dia operacional" da API. O pedido da madrugada conta na noite anterior.

## Deploy

`Dockerfile` com `output: "standalone"`. As variáveis `NEXT_PUBLIC_*` vão como `--build-arg` no build.

No Railway: veja o guia `DEPLOY-RAILWAY.md` no repositório `lanchonete-api`.

## Build e validação de dependências (2026-10-15)

Use Node.js 22. Instalação reprodutível e peers estritos:

```sh
npm ci --strict-peer-deps
npm run audit:prod
npm run audit
npm run lint
npm run typecheck
npm run build
```

Os gates de audit falham inclusive para severidade baixa; avisos remanescentes não são ocultados. Lint não altera fontes. Actions de CI estão fixadas por SHA e recebem somente `contents: read`. Consulte `auditoria/2026-10-15/FIX_DEPENDENCIES.md` no workspace pai para versões, evidências e limitações.

CSP é gerada no middleware por requisição: nonce substitui qualquer valor recebido do cliente, acompanha o header encaminhado ao render e o header da resposta. Scripts de produção não usam `unsafe-inline` ou `unsafe-eval`. O root layout lê headers para render dinâmico; isso desabilita prerender/ISR dessas páginas. API/WebSocket usam origens das variáveis `NEXT_PUBLIC_*`, e consultas CEP permitem `https://viacep.com.br`. Estilos inline continuam permitidos por compatibilidade de UI.
