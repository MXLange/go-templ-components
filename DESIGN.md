# Sistema visual de go-templ-components

## Contexto

- Artefato: biblioteca de componentes e catálogo técnico para dashboards.
- Público: desenvolvedores Go; usuários de sistemas administrativos.
- Objetivo: compor interfaces com comportamento previsível e CSS controlado pelo projeto consumidor.
- Adjetivos: técnico, discreto, legível e adaptável.
- Essência: clareza, controle, consistência.
- Técnico: alinhamento de dados e números tabulares.
- Discreto: neutros, bordas definidas e ausência de sombras decorativas.
- Legível: hierarquia tipográfica e foco visível.
- Adaptável: temas, densidades, tokens e cascade layer pública.
- Modos: light e dark. Densidades: compact e comfortable.
- Referências de interação: padrões nativos de HTML e composição de componentes do Templ.

## Direção visual

O sistema combina estrutura técnica com espaçamento ajustável.
O catálogo usa navegação de componentes, exemplos funcionais e código junto ao resultado.
A demonstração de CSS personalizado faz parte da interface principal.
Um editor aplica o CSS durante a digitação e permite restaurar o exemplo original.

A assinatura é a mesma estrutura em duas densidades, preservando hierarquia e alinhamento.
O dashboard combina um resumo numérico com um registro de atividade.
Não usa uma sequência de cards com métricas iguais.

## Tipografia

A biblioteca herda a fonte do consumidor. O token `--gtc-font-family` permite substituí-la.
O catálogo usa IBM Plex Sans, nos pesos 400 e 600, com arquivos locais sob licença OFL.
Exemplos de código e identificadores usam monospace.

Escala funcional aproximada de 1,125: 13, 15, 17, 19, 22 e 25 pixels.
O catálogo usa 40 pixels no título principal em telas amplas.
Texto corrido usa line-height 1,6. Componentes usam 1,5.
Títulos curtos usam line-height entre 1,2 e 1,4.

## Cores e tokens

As cores usam OKLCH. O tema claro inclui valores hex de fallback.
O alvo de compatibilidade exige OKLCH para ambos os temas.
O destaque azul representa ação. Verde, âmbar e vermelho representam estados acompanhados por texto.

| Token de cor `--gtc-color-*` | Light | Dark |
| --- | --- | --- |
| `bg` | `oklch(0.972 0.004 240)` | `oklch(0.17 0.012 250)` |
| `surface` | `oklch(1 0 0)` | `oklch(0.215 0.013 250)` |
| `raised` | `oklch(0.96 0.006 240)` | `oklch(0.27 0.016 250)` |
| `text` | `oklch(0.28 0.025 250)` | `oklch(0.94 0.007 250)` |
| `muted` | `oklch(0.47 0.025 250)` | `oklch(0.74 0.018 250)` |
| `border` | `oklch(0.6 0.02 250)` | `oklch(0.57 0.02 250)` |
| `divider` | `oklch(0.88 0.01 250)` | `oklch(0.36 0.018 250)` |
| `primary` | `oklch(0.45 0.11 245)` | `oklch(0.76 0.09 240)` |
| `primary-text` | `oklch(1 0 0)` | `oklch(0.19 0.02 240)` |
| `success` | `oklch(0.42 0.09 150)` | `oklch(0.8 0.1 150)` |
| `warning` | `oklch(0.43 0.09 75)` | `oklch(0.83 0.11 85)` |
| `error` | `oklch(0.46 0.16 28)` | `oklch(0.78 0.11 28)` |

`overlay` usa `rgb(15 23 42 / 55%)` em ambos os temas.
Bordas de controles usam `border`. Separadores sem função interativa usam `divider`.
O tema dark aumenta a luminosidade das superfícies elevadas.

## Espaçamento, raio e superfícies

- Base de espaçamento: 4 pixels. Escala: 4, 8, 12, 16, 24 e 32 pixels.
- `--gtc-radius`: 6 pixels. `--gtc-radius-large`: 10 pixels.
- Superfícies usam borda, sem sombra decorativa.
- Controles comfortable: altura mínima de 44 pixels; padding horizontal de 14 pixels.
- Controles compact: altura mínima de 32 pixels; padding horizontal de 10 pixels.
- Células: padding de 14 ou 8 pixels.
- Painéis: padding de 24 ou 16 pixels.
- Checkbox: alvo mínimo de 24 pixels e rótulo associado clicável.

## Layout

O catálogo usa navegação lateral de 16rem e conteúdo flexível.
A navegação lateral permanece visível durante o scroll e usa rolagem própria quando ultrapassa a altura da tela.
Abaixo de 800 pixels, a navegação passa para cima do conteúdo.
Tabelas mantêm rolagem horizontal dentro da região de dados.
Exemplos de formulário usam duas colunas em telas amplas e uma coluna em telas estreitas.

Espaçamento dentro de grupos é menor que o espaçamento entre seções.
Conteúdo e código permanecem alinhados à esquerda.

## Componentes e estados

- Button: primary preenchido, secondary com borda e ghost transparente.
- Estados: hover, active, focus-visible, disabled e loading.
- Campos: rótulo visível, ajuda e erro associados por `aria-describedby`.
- Validação: o consumidor fornece `Error` e mantém o valor enviado.
- Sucesso: `data-gtc-valid="true"` aplica borda verde quando não há `aria-invalid="true"`.
- O catálogo valida o exemplo de e-mail durante a digitação e atualiza a mensagem associada.
- Tabs: seleção explícita, roving tabindex e navegação por setas, Home e End.
- Dropdown: um nível, fechamento por Escape, Tab, seleção ou clique externo.
- Dialog: modal nativo, ciclo de foco e retorno ao trigger.
- Sidebar: recolhimento com estado sincronizado e `inert`.
- Sidebar mobile optativa: painel modal até 800 pixels, com backdrop, foco contido, Escape e retorno ao trigger.
- O painel reutiliza os mesmos nós e restaura o estado desktop quando o viewport muda.
- Table: texto à esquerda; números à direita e tabulares.
- Pagination: centralizada, com primeira, anterior, próxima e última página. Controles indisponíveis ficam desabilitados.
- Link e Pagination: navegação completa por padrão; atualização parcial optativa por região.
- Atualização parcial: `aria-busy`, foco no container sem rolagem automática e erro acessível ao lado da região.
- O catálogo compara navegação completa e parcial em exemplos separados, com dados independentes.
- Mensagens e nomes acessíveis: pt-BR por padrão; inglês ou overrides pelo contexto e pela instância.
- O catálogo mantém sua explicação em pt-BR e declara `lang` nos exemplos traduzidos.
- Toast: texto escapado, anúncio acessível e dispensa manual por padrão.
- Estados vazio, carregamento e erro aparecem no catálogo.

## Movimento, ícones e imagens

`--gtc-duration`: 140ms. `--gtc-ease`: `cubic-bezier(0.2, 0.7, 0.2, 1)`.
Toast usa entrada com opacity e transform. Não usa animação de saída para atrasar a dispensa.
Com `prefers-reduced-motion: reduce`, a entrada não usa animação.
A biblioteca não inclui um catálogo de ícones nem exige imagens.
Fechamento e expansão usam símbolos acompanhados por nomes acessíveis.

## Personalização

Todo CSS da biblioteca usa `@layer gtc`.
CSS do consumidor sem layer prevalece sobre o estilo nativo.
Tokens, classes e estados documentados são contratos públicos.
O consumidor pode substituir fonte, cores, geometria e estados.
Sua escolha visual prevalece sobre os padrões deste documento.

## Acessibilidade e auditoria

- Contraste verificado por axe nos temas light e dark.
- Densidades compact e comfortable incluídas nos testes.
- Teclado, foco, Escape e retorno do foco verificados com Playwright em Chromium, Firefox e WebKit.
- Reflow verificado em viewport de 320 pixels.
- CSS personalizado verificado sem `!important`.
- Avaliação manual com leitor de tela pendente.

Auditoria visual em 2026-10-30: screenshots desktop light e mobile dark revisados.
Hierarquia, alinhamento, espaçamento e contenção da tabela mantidos nos dois formatos.
Os testes de navegador cobrem o editor CSS. Axe verifica as quatro combinações de tema e densidade.
Não declarar conformidade WCAG completa apenas pelos testes automatizados.

## Histórico

- 2026-10-30: sistema inicial, catálogo, temas, densidades e contrato de personalização.
