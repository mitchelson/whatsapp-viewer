# WhatsApp Viewer

Visualizador de conversas exportadas do WhatsApp que roda 100% no navegador. Nenhum arquivo é enviado para servidor.

Site: https://whatsappviewer.zenvixlabs.app

## Recursos

- Abre o `.txt` (sem mídia) ou o `.zip` (com mídia) exportado pelo WhatsApp, de Android ou iPhone, em vários idiomas
- Visual familiar, inspirado no WhatsApp: balões, separadores de data, nomes coloridos em grupos, tema claro e escuro
- Arraste o arquivo direto na landing: ele é repassado ao visualizador localmente (IndexedDB), sem upload
- Fotos, figurinhas, vídeos, áudios e documentos direto na conversa, com galeria e visualizador
- Filtro por período, filtro por pessoa, "ir para a data" e escolha de quem é você
- Busca instantânea sem acentos, com destaque e navegação entre resultados
- Exportação em PDF da conversa filtrada (via impressão do navegador)
- Landing page em português e inglês

## Stack

- [Astro](https://astro.build) com saída estática e ilhas [Preact](https://preactjs.com) + `@preact/signals`
- Tailwind CSS v4
- Parser em Web Worker (200 mil mensagens em menos de 1 segundo)
- `@tanstack/virtual-core` para a lista virtualizada
- `@zip.js/zip.js` carregado sob demanda, extraindo cada mídia só quando ela aparece na tela

## Desenvolvimento

```sh
pnpm install
pnpm dev       # http://localhost:4321
pnpm test      # testes do parser
pnpm build     # gera dist/
```

## Estrutura

```
src/
  i18n/                 textos PT e EN
  layouts/Base.astro    topo com seletor de idioma e tema
  components/           landing e visualizador
  lib/parser/           parser das exportações + worker
  lib/zip.ts            leitura do ZIP e cache de mídia
  lib/filter.ts         filtros, linhas e busca
  lib/store.ts          estado global (signals)
tests/                  testes do parser
```

## Privacidade

Não há backend. O `vercel.json` define uma Content Security Policy com `connect-src 'self'`, então o navegador bloqueia qualquer envio de dados para fora.

Não afiliado ao WhatsApp ou à Meta.
