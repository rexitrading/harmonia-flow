---
name: Harmonia
description: Gestão musical ritualística para lojas maçônicas
colors:
  deep-lodge: "#1b203b"
  lodge-surface: "#202844"
  silver-ink: "#f0f1f6"
  silver-primary: "#a5adbf"
  twilight-secondary: "#2b3756"
  muted-slate: "#2a3452"
  muted-text: "#9ea6b9"
  compass-blue: "#5b7aa6"
  ritual-red: "#d4493b"
  border-subtle: "#3a496a"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2rem, 5vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.3em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.silver-primary}"
    textColor: "{colors.deep-lodge}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#949cae"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.silver-ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  button-destructive:
    backgroundColor: "{colors.ritual-red}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.lodge-surface}"
    textColor: "{colors.silver-ink}"
    rounded: "{rounded.xl}"
    padding: "20px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.silver-ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
  badge:
    backgroundColor: "#5b7aa633"
    textColor: "{colors.compass-blue}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: Harmonia

## 1. Overview

**Creative North Star: "The Midnight Lodge"**

Harmonia opera na penumbra do templo. O sistema visual é contido e instrumental: cada pixel serve à operação, nada compete com o ritual. A interface é um painel de controle silencioso, lido sob iluminação baixa, operado com uma mão pelo celular durante a sessão.

A paleta é monocromática em azul profundo com prata como voz principal. Não há ornamentação decorativa. A tipografia serifada (Cormorant Garamond) carrega o peso cerimonial nos títulos; o Inter sans-serif garante legibilidade operacional nos dados. O resultado é uma ferramenta que se sente como equipamento ritualístico, não como app de consumo.

O sistema rejeita explicitamente a estética de apps de DJ e festa: nada de neon, gradientes saturados, tipografia agressiva ou visual que remeta a pista de dança (PRODUCT.md). Também evita o visual maçônico antiquado: sem clipart, sem dourado excessivo, sem ornamentos que não comuniquem estado.

**Key Characteristics:**
- Dark-first, mobile-first: projetado para templo escuro e operação por celular
- Monocromático com acento único: azul profundo + prata, sem policromia
- Tipografia dual: serifada cerimonial + sans operacional
- Flat com profundidade tonal: sem sombras decorativas, hierarquia por contraste de luz
- Touch targets generosos: mínimo 44px, navegação com uma mão

## 2. Colors

A paleta é um noturno azul-prateado. Todas as cores vivem no eixo azul-violeta (hue 240-250 OKLCH), com variação apenas em luz e saturação. O vermelho é reservado exclusivamente para destruição.

### Primary
- **Silver Primary** (`oklch(0.72 0.03 250)` / #a5adbf): A voz principal. Usada em botões primários, texto de destaque, e como cor de ação. Prata com leve temperatura azulada, legível sobre qualquer superfície escura do sistema.
- **Silver Ink** (`oklch(0.96 0.01 250)` / #f0f1f6): Texto principal sobre fundos escuros. Quase branco com traço azulado imperceptível. Usado em headings e corpo de texto.

### Neutral
- **Deep Lodge** (`oklch(0.18 0.04 250)` / #1b203b): Background principal. Azul tão escuro que beira o preto, mas mantém temperatura fria. Nunca usar preto puro (#000).
- **Lodge Surface** (`oklch(0.22 0.05 250)` / #202844): Superfícies elevadas (cards, dialogs, header). Um degrau acima do background em luz.
- **Twilight Secondary** (`oklch(0.28 0.06 250)` / #2b3756): Estados hover em superfícies, backgrounds secundários.
- **Muted Slate** (`oklch(0.26 0.04 250)` / #2a3452): Elementos desabilitados, áreas inativas.
- **Border Subtle** (`oklch(0.32 0.05 250)` / #3a496a): Bordas e divisores. Visível mas discreto.
- **Muted Text** (`oklch(0.72 0.03 250)` / #9ea6b9): Texto secundário, labels, timestamps. Deve manter contraste 4.5:1 contra o background.

### Accent
- **Compass Blue** (`oklch(0.55 0.08 240)` / #5b7aa6): Acento funcional. Badges de status, indicadores de momento, ícones de destaque, ring de foco. Usado com parcimônia.

### Destructive
- **Ritual Red** (`oklch(0.60 0.20 25)` / #d4493b): Exclusivamente para ações destrutivas (excluir sessão, remover faixa). Nunca usado para qualquer outro propósito.

### Named Rules

**The Monochrome Rule.** Toda a interface opera no eixo azul-violeta (hue 240-250). A única exceção cromática é o vermelho destrutivo. Nenhuma outra família de hue é permitida sem justificativa funcional explícita.

**The Silver Voice Rule.** O prata (silver-primary) é a cor de ação e destaque. Sua raridade é o que lhe dá força. Em qualquer tela, o prata deve ocupar no máximo 10-15% da superfície. Se tudo é destaque, nada é.

## 3. Typography

**Display Font:** Cormorant Garamond (com Georgia, serif)
**Body Font:** Inter (com system-ui, sans-serif)

**Character:** O Cormorant Garamond carrega a solenidade maçônica nos títulos com suas serifas elegantes e proporções clássicas. O Inter garante legibilidade cirúrgica nos dados operacionais: track names, timestamps, status labels. O contraste entre as duas famílias comunica a dualidade do produto: tradição ritualística + precisão instrumental.

### Hierarchy
- **Display** (400, clamp(2rem, 5vw, 4.5rem), 1.1): Hero da landing, títulos de página principal. Reservado para momentos de gravitas. Nunca em corpo ou labels.
- **Headline** (400-600, 1.5-2.25rem, 1.2): Títulos de seção dentro de páginas ("Sessões", "Momentos", "Faixas"). Sempre em Cormorant Garamond.
- **Title** (600, 1.25rem, 1.3): Títulos de card, nomes de sessão, nomes de momento. Cormorant Garamond em peso semibold.
- **Body** (400, 0.875rem, 1.5): Texto corrido, descrições, notas. Inter regular. Line length máximo 65ch.
- **Label** (500, 0.625rem, 1, uppercase tracking 0.3em): Eyebrows, status badges, timestamps. Inter uppercase com tracking amplo. Reservado para labels curtos (até 4 palavras).

### Named Rules

**The Two-Voice Rule.** Cormorant Garamond para tudo que carrega peso cerimonial (títulos, headings). Inter para tudo que carrega informação operacional (dados, labels, botões, inputs). Nunca inverter: Cormorant em dados operacionais parece decorativo; Inter em títulos perde gravitas.

**The No-Caps Body Rule.** Uppercase é reservado exclusivamente para labels curtos (≤4 palavras) com tracking amplo. Nunca usar em corpo de texto, descrições ou frases completas.

## 4. Elevation

O sistema usa profundidade tonal, não sombras projetadas. Superfícies se distinguem por degraus de luz: o background é o mais escuro, cards são um tom acima, dialogs e overlays são mais um tom acima. Isso cria hierarquia espacial sem recorrer a drop shadows que pareceriam artificiais em um ambiente escuro.

### Shadow Vocabulary

- **Glow** (`0 8px 40px -8px oklch(0.55 0.12 240 / 0.4)`): Brilho sutil sob botões primários e CTAs de destaque. Não é uma sombra projetada; é um halo luminoso que ancora o elemento ao fundo.
- **Elegant** (`0 4px 24px -4px oklch(0 0 0 / 0.4)`): Elevação mínima para dialogs e modais. Difuso, quase imperceptível.

### Named Rules

**The Flat-by-Default Rule.** Superfícies são planas em repouso. Sombras aparecem apenas como resposta a estado (hover, foco) ou para elementos flutuantes (dialogs, tooltips, dropdowns). Cards em repouso não têm sombra.

## 5. Components

### Buttons
- **Shape:** Cantos suavemente arredondados (8px radius). Nem pill, nem sharp.
- **Primary:** Fundo silver-primary (#a5adbf) com texto deep-lodge (#1b203b). Padding 8px 16px. Altura 36px. O botão primário é o elemento mais claro da tela: impossível não ver.
- **Hover:** Redução sutil de opacidade (90%). Transição por `transition-colors`.
- **Ghost:** Fundo transparente, texto silver-ink. Hover revela fundo accent/20. Usado em ações secundárias (sair, cancelar).
- **Destructive:** Fundo ritual-red (#d4493b) com texto branco. Exclusivo para excluir e remover.
- **Focus:** Ring de 1px em compass-blue ao redor do elemento. Nunca outline duplo.

### Cards / Containers
- **Corner Style:** Cantos arredondados generosos (16px radius para cards principais).
- **Background:** Lodge Surface (#202844), um degrau acima do background.
- **Shadow Strategy:** Flat em repouso. Hover adiciona borda accent (compass-blue) como indicador de interatividade, não sombra.
- **Border:** 1px border-subtle (#3a496a) em repouso. Hover troca para compass-blue.
- **Internal Padding:** 20px (p-5) para cards de sessão.

### Inputs / Fields
- **Style:** Fundo transparente com borda 1px border-subtle. Radius 8px. Altura 36px.
- **Focus:** Ring de 1px em compass-blue. Borda não muda de cor; o ring aparece além dela.
- **Placeholder:** Muted-text (#9ea6b9). Deve manter contraste 4.5:1 contra o fundo transparente.
- **Error:** Borda troca para ritual-red. Mensagem de erro em ritual-red abaixo do campo.

### Navigation
- **Header:** Fundo lodge-surface com 40% de opacidade e backdrop-blur. Bordas inferior border-subtle. Altura compacta (py-4).
- **Logo:** Diamante geométrico (quadrado rotacionado 45°) com borda silver-primary + texto "Harmonia" em Cormorant Garamond.
- **Mobile:** Header fixo no topo. Sem sidebar. Navegação linear: landing → login → sessões → sessão → execução.

### Status Badge
- **Style:** Fundo accent com 20% de opacidade, texto compass-blue. Radius 4px. Texto em uppercase com tracking amplo, tamanho 10px.
- **Usage:** Indicador de status de sessão (draft, ready, live, finished). Posicionado no canto superior do card.

## 6. Do's and Don'ts

### Do:
- **Do** usar o prata (silver-primary) como a única cor de ação. Botões primários, links ativos, e indicadores interativos devem ser prateados sobre fundo escuro.
- **Do** manter touch targets mínimos de 44x44px em todos os elementos interativos. O uso principal é pelo celular, com uma mão, durante a sessão.
- **Do** usar Cormorant Garamond para todos os títulos e headings. O peso cerimonial da serifa é parte da identidade.
- **Do** comunicar estado por contraste tonal: superfícies ativas são mais claras que superfícies inativas. Status badges usam opacidade do accent, não cores diferentes.
- **Do** testar todos os textos contra o background para contraste mínimo de 4.5:1 (WCAG AA). O muted-text (#9ea6b9) sobre deep-lodge (#1b203b) passa com ~5.2:1.
- **Do** usar `prefers-reduced-motion` em todas as transições. O contexto cerimonial não se beneficia de animação; a redução para crossfade ou instant é sempre aceitável.
- **Do** manter o gradiente hero (`linear-gradient(135deg, deep-lodge, twilight-secondary)`) como fundo da landing e login. Ele estabelece o tom noturno desde o primeiro contato.

### Don't:
- **Don't** usar estética de app de DJ ou festa. Nada de neon, gradientes saturados, tipografia agressiva, ou visual que remeta a Serato, VirtualDJ, ou Traktor (PRODUCT.md). O contexto é cerimonial e fraternal.
- **Don't** adicionar cores fora do eixo azul-violeta sem justificativa funcional. O monocromatismo é a identidade; policromia é ruído.
- **Don't** usar sombras projetadas em cards ou superfícies em repouso. Profundidade é tonal, não projetada.
- **Don't** usar uppercase em corpo de texto ou frases com mais de 4 palavras. Labels curtos com tracking amplo são a única exceção.
- **Don't** usar glassmorphism decorativo. Backdrop-blur é permitido no header (funcional, ancora a navegação) mas nunca em cards ou containers como efeito estético.
- **Don't** usar preto puro (#000) como background. O deep-lodge (#1b203b) mantém temperatura fria; preto puro é neutro e perde a identidade.
- **Don't** usar gradient text (`background-clip: text` com gradiente) como padrão decorativo. O gradient-silver na landing hero é a única exceção permitida, e deve ser usado com moderação.
- **Don't** criar animações bounce ou elastic. Toda transição usa ease-out (quart/quint/expo). O contexto é solene, não lúdico.
