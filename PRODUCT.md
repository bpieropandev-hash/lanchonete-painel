# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Equipe do Nelson's Burguer que opera a loja: administrador (dono), atendentes (confirmam pedidos, falam com clientes pelo WhatsApp) e cozinha/chapeiro (acompanham a fila e preparam). Usam em computador ou tablet no balcão e também no celular (a bancada de teste cobre 390, 720 e 768 px). Tarefa: receber pedidos em tempo real, confirmar, preparar, entregar, e gerir cardápio, loja e clientes. *(Papéis e dispositivos inferidos do código e do uso; confirmar com o dono.)*

## Product Purpose

Painel de operação da lanchonete: fila de pedidos em tempo real por estágio, cozinha, histórico com filtros, financeiro, cardápio (produtos, categorias, ingredientes, pães), loja e horários, entregadores, estoque (ainda não usado), clientes e usuários. Sucesso: nenhum pedido se perde, a equipe age rápido e o dono controla a loja sem depender de suporte.

## Positioning

Painel feito para a rotina desta loja: o cliente pede direto no site, e a equipe fecha o ciclo pelo WhatsApp com mensagens prontas a partir do painel.

## Operating Context

- Fila em estágios: Aguardando confirmação, Novos, Em preparo, Prontos e em entrega, Concluídos.
- Pedido em Pix só avança depois de a equipe conferir o comprovante no WhatsApp e confirmar o código de 4 caracteres; sem confirmação em 30 min o pedido cancela sozinho.
- Cada avanço de status abre uma mensagem pronta no WhatsApp para o cliente; não há mensagem ao marcar Entregue.
- Notinha impressa com itens e pão escolhido.
- Loja: "Seguir horário", "Abrir agora" e "Fechar agora" no controle de loja; pausas rápidas de 15/30/60 min.
- Clientes: lista com cashback e quantidade de pedidos; só ADMIN e ATENDENTE geram link de redefinição de senha (validade 1 h, uso único), enviado ao cliente por WhatsApp.
- Estoque não está integrado neste primeiro mês.

## Capabilities and Constraints

- Realtime por websocket; sessão por JWT.
- Pães cadastrados na aba Pães do cardápio, com acréscimo opcional; "Cliente escolhe o pão" ligado por padrão em lanches.
- Histórico de pedidos com busca, status, tipo e período.
- Front roda local por enquanto; só a API está publicada (Railway, banco de produção real). Cuidado com testes: usar dados claramente de teste.

## Brand Commitments

Nome: Nelson's Burguer. Cor primária vermelha da marca; logo existente. Português do Brasil, direto.

## Evidence on Hand

Pedidos reais #1 a #24 em produção (inclui testes). Sem métricas de uso da equipe; não inventar.

## Product Principles

1. Operação sob pressão: estado do pedido e próxima ação óbvios de relance.
2. Nada irreversível sem confirmação clara (cancelar, resetar senha, fechar loja).
3. Consistência entre telas e entre larguras; celular não é cidadão de segunda.
4. Dados do cliente tratados com cuidado (telefone, cashback, senha nunca exibida).
5. Menos opções, rótulos em português claro.

## Accessibility & Inclusion

Alvos de toque de pelo menos 44px nas ações principais, contraste legível em tela de balcão, rótulos textuais (não só ícones). Sem padrão formal declarado.
