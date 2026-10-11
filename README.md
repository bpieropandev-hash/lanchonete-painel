# Lanchonete: painel da loja

Painel interno (Next.js 14) para atendente, chapeiro e administrador. Consome a `lanchonete-api`.

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
| **Pedidos** | admin, atendente | Quadro do expediente atual em tempo real, detalhe, avanço de status, cancelamento, link de WhatsApp e **impressão da comanda** |
| **Chapeiro** | admin, chapeiro | Fila da cozinha em letra grande, som de pedido novo, aviso de cancelamento |
| **Loja** | admin (atendente só abre/fecha) | Abrir/fechar na hora, horários por dia, pedido mínimo, taxa padrão, **taxa por bairro**, entrega/retirada |
| **Cardápio** | admin | Produtos, variantes, ingredientes que vêm no lanche e **adicionais pagos** |
| **Caixa** | admin, atendente | Totais do expediente, fechamento com fundo de troco e conferência da gaveta |

## Operação

- **Tempo real:** se a conexão cair, o painel avisa e, ao reconectar, busca tudo de novo. A tela do chapeiro mostra "Sem conexão" e recarrega a fila a cada 20 s enquanto isso.
- **Comanda:** o botão "Imprimir" abre uma comanda de 80 mm. Deixe a impressora térmica como padrão no computador do caixa. Para imprimir sem a caixa de diálogo, abra o Chrome com `--kiosk-printing`. O navegador precisa permitir pop-ups do painel.
- **Expediente:** a tela de pedidos e o caixa usam o "dia operacional" da API. O pedido da madrugada conta na noite anterior.

## Deploy

`Dockerfile` com `output: "standalone"`. As variáveis `NEXT_PUBLIC_*` vão como `--build-arg` no build.
