---
name: Nelson's Burguer — Painel da loja
description: Painel de operação claro e fosco, a fila de pedidos em colunas e o mesmo vermelho de brasa do site só para ação.
colors:
  brasa-50: "#FDF3F1"
  brasa-100: "#FBE4DF"
  brasa-200: "#F6C7BD"
  brasa-300: "#EE9F8F"
  brasa-400: "#E2705A"
  brasa: "#C8321E"
  brasa-600: "#AE2A18"
  brasa-700: "#912314"
  brasa-800: "#771F14"
  brasa-900: "#631D14"
  fundo: "#FAFAFA"
  texto: "#171717"
  cartao: "#FFFFFF"
  cinza-100: "#F5F5F5"
  cinza-200: "#E5E5E5"
  cinza-300: "#D4D4D4"
  cinza-500: "#737373"
  cinza-700: "#404040"
  sucesso: "#16A34A"
  perigo: "#DC2626"
typography:
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brasa}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.cartao}"
    textColor: "{colors.cinza-700}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input-field:
    backgroundColor: "{colors.cartao}"
    textColor: "{colors.texto}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
---

# Design System: Nelson's Burguer — Painel da loja

## Overview

**Creative North Star: "A Chapa Acesa"** (a mesma direção do site, em versão de trabalho)

No painel a chapa é a cozinha em movimento: superfície clara e fosca para trabalhar com iluminação de balcão, cartões brancos sobre fundo cinza muito claro, e o vermelho de brasa só onde há ação (confirmar, iniciar preparo, filtrar). Tudo existe para a equipe ler o estado dos pedidos de relance e agir com um toque.

A densidade é média-alta: colunas de pedidos por estágio, tabelas no desktop e listas de cartões no celular, rótulos curtos em português. Firme e utilitário, sem decoração.

**Key Characteristics:**
- Fundo #FAFAFA, cartões brancos com borda fina e sombra mínima.
- Vermelho de brasa para a ação principal; verde, azul, âmbar e roxo apenas como sinais de estágio do pedido.
- Mesma estrutura em 390, 720 e 768 px: tabela vira lista de cartões, menu lateral vira gaveta.
- Números tabulares ativados globalmente.
- Texto sempre com rótulo; ícone só acompanha texto.

## Colors

Neutros frios-neutros (escala `neutral` do Tailwind, sem azulado) mais a escala de brasa do site.

### Primary
- **Brasa** (#C8321E): ação principal (`primary-500`), foco e aba ativa. Hover em #AE2A18, pressionado em #912314, desabilitado em #EE9F8F. Tons 50–200 servem de fundo suave para destaque e seleção.

### Secondary
- **Sucesso** (#16A34A): confirmar, concluir, status positivo. **Perigo** (#DC2626): cancelar e excluir. Azul, âmbar e roxo (Tailwind padrão) aparecem como pontos de estágio nas colunas de pedido (Novos, Em preparo, Prontos).

### Neutral
- **Fundo** (#FAFAFA), **Texto** (#171717), **Cartão** (#FFFFFF), **Cinza 100/200/300** (#F5F5F5/#E5E5E5/#D4D4D4) para superfícies, bordas e campos, **Cinza 500/700** (#737373/#404040) para texto de apoio e rótulos.

### Named Rules
**The One Ember Rule.** Brasa só em ação e foco. Estados de pedido usam os pontos coloridos pequenos, nunca blocos vermelhos.
**The Status Dot Rule.** A cor de estágio é um ponto de 8px ao lado do nome da coluna; o texto carrega o significado.

## Typography

**Body/Display Font:** Geist (arquivo local `GeistVF.woff`, fallback system-ui)
**Mono Font:** Geist Mono, para códigos de confirmação (ex.: V7Y2) e números de pedido.

**Character:** técnica e limpa, com personalidade própria; boa para ler de longe num balcão.

### Hierarchy
- **Title** (600, 1.125rem, 1.3): título de página e de seção.
- **Body** (400, 0.875rem, 1.5): conteúdo de cartões e tabelas.
- **Label** (500, 0.75rem, 1.3): rótulos de campo e metadados.
- **Mono** (500, 0.875rem): código do pedido, telefone e valores alinhados.

## Layout

Página com menu lateral fixo no desktop (Operação: Pedidos, Histórico, Cozinha, Financeiro; Gestão: Loja e horários, Aparência, Cardápio, Estoque, Entregadores, Clientes, Usuários) e cabeçalho com título e controle da loja. No celular o menu vira gaveta aberta por botão de menu. Conteúdo em container de largura máxima (`max-w-6xl`) e colunas de pedidos que empilham em telas estreitas. Filtros em grade de 2 colunas no celular, 5 no desktop; a lista de resultados fica visível sem rolar.

## Elevation & Depth

Plano com sombra mínima: cartões brancos com borda de 1px (#E5E5E5) e `shadow-sm` leve; modais com overlay escurecido e sombra maior. Sem sombras decorativas.

### Named Rules
**The Hairline Rule.** Separar por borda fina de 1px, não por caixa pesada.

## Shapes

Cantos de 6px em botões, 8px em campos e cartões, 4px em chips e badges; borda de 1px. Botões têm contorno transparente na variante cheia para manter a altura igual.

## Components

### Buttons
- **Shape:** raio de 6px, borda de 1px, `px-4 py-2`.
- **Primary:** fundo Brasa, texto branco; hover/ativo escurecem em passos.
- **Secondary:** fundo branco, contorno Cinza 300, texto Cinza 700.
- **Danger/Success:** vermelho 600 / verde 600 cheios.
- **Ghost:** sem fundo; hover em Cinza 100.
- **Focus:** anel de 2px em Brasa a 40%. **Loading:** spinner no lugar do ícone.

### Cards / Containers
- Fundo branco, raio 8px, borda de 1px Cinza 200, padding de 16px. Cartão de pedido mostra número, código de confirmação em Mono, tempo, nome do cliente, itens resumidos e etiquetas de tipo e pagamento.

### Inputs / Fields
- Contorno de 1px Cinza 300, raio 8px, texto de 14px, rótulo acima. **Focus:** borda e anel de 2px em Brasa (200). **Error:** borda e mensagem em vermelho.

### Navigation
- Menu lateral com grupos rotulados, item ativo com fundo Brasa-50 e texto Brasa-700. Abas (Cardápio) com sublinhado de 2px na aba ativa e rolagem horizontal quando faltar espaço.

### Cartão de pedido (kanban)
Coluna por estágio com contagem e ponto de cor; ao tocar abre o detalhe do pedido em modal com ações primárias na base (Confirmar, Iniciar preparo, Pronto, Cliente retirou) e Cancelar à esquerda.

### Tabela responsiva
Tabela com cabeçalho em caixa-alta pequena a partir de 768px; abaixo disso vira lista de cartões com a ação em botão de texto.

## Do's and Don'ts

### Do:
- **Do** deixar o estado do pedido e a próxima ação óbvios de relance.
- **Do** manter ações de gestão em botão com texto, não só ícone.
- **Do** usar Mono para códigos e números de pedido.
- **Do** manter paridade de funções entre 390, 720 e 768 px.

### Don't:
- **Don't** fazer cara de app de delivery genérico nem painel de marketing.
- **Don't** usar gradientes, brilho ou sombras decorativas.
- **Don't** usar ícones ou emoji no lugar de rótulo claro.
- **Don't** usar vermelho de marca para estados que não são ação (use ponto de estágio ou Perigo).
- **Don't** esconder ações destrutivas sem confirmação.
