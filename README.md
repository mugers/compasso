# compasso — Next.js 15 + tRPC

Planejador de tarefas com três modos de exibição: **Lista** (ordem de data, com infinite scroll; é a tela inicial), **Mês** (calendário) e **Semana** (quadro kanban). Cada semana é um compasso, daí o nome.

O backend guarda tudo **em memória** e é exposto via **tRPC**. O frontend usa **SSR** para pré-carregar a tela. Os cards podem ser **arrastados** entre dias, reordenados e agendados para semanas ou meses à frente.

## Como executar

Requisitos: Node 18.18+ (testado com Node 24).

```bash
npm install
npm run dev          # http://localhost:3000
# ou, em modo produção:
npm run build && npm start
```

A aplicação sobe com tarefas de exemplo na semana atual, na próxima e no mês seguinte. Reiniciar o servidor apaga os dados.

## Requisitos do desafio: onde estão

| Requisito | Onde |
|-----------|------|
| Next.js 15 + tRPC configurado | `src/server/trpc.ts`, `src/app/api/trpc/[trpc]/route.ts`, `src/trpc/` |
| Tarefa com `id`, `titulo`, `descricao?`, `dataCriacao` | `src/server/store.ts` (tipo `Tarefa`) |
| CRUD via tRPC: criar, listar, atualizar, deletar | `src/server/routers/tarefas.ts`: `criar`, `listar`, `atualizar`, `deletar` |
| Não criar sem título | Zod no servidor (`titulo` em `tarefas.ts`) e validação no formulário (`TarefaForm.tsx`) |
| Erros significativos (ex.: atualizar inexistente) | `NOT_FOUND` com mensagem em `tarefas.ts`; `errorFormatter` em `server/trpc.ts` |
| Listagem com SSR | `src/app/(inicio)/page.tsx` (busca no servidor) → modo **Lista** (`VisaoLista.tsx`) |
| Excluir na listagem com feedback | Lixeira ou Del → `ConfirmarExclusao.tsx` → aviso em `Alerta.tsx` |
| Formulário de criação/edição com hooks e validação | `src/components/TarefaForm.tsx`, `src/app/tarefas/nova` e `tarefas/[id]/editar` |
| Mensagens de erro (backend e frontend), carregando/sucesso/falha | `src/lib/erros.ts`, `Alerta.tsx`, `error.tsx`, `loading.tsx` |
| **Bônus:** infinite scroll | Modo Lista: `VisaoLista.tsx` + procedure paginada `listar` |
| **Bônus:** comentários e README | Comentários nas decisões principais e este arquivo |

**Além do pedido:** os modos Mês e Semana com arrastar e soltar, as datas futuras, concluir e reabrir, os atalhos de teclado, a edição inline e os testes e2e. Nada disso é necessário para os requisitos acima. Quem quiser avaliar só o escopo do desafio pode ficar no modo **Lista** e no formulário.

## Stack

| Camada       | Tecnologia                                    |
|--------------|-----------------------------------------------|
| Framework    | Next.js 15 (App Router) + React 19            |
| API          | tRPC v11 (adapter `fetch` num Route Handler)  |
| Validação    | Zod (no servidor), validação manual no form   |
| Cliente      | `@trpc/react-query` + TanStack Query v5       |
| Serialização | superjson (para trafegar `Date`)              |

## Estrutura

```
src/                         # (testes em tests/e2e, config em playwright.config.ts)
├─ server/
│  ├─ store.ts               # "banco" em memória (array em globalThis)
│  ├─ trpc.ts                # initTRPC, superjson e formatação de erros do Zod
│  └─ routers/
│     ├─ _app.ts             # router raiz + tipo AppRouter
│     └─ tarefas.ts          # todas as procedures de tarefas
├─ trpc/
│  ├─ client.ts              # createTRPCReact<AppRouter>
│  ├─ Provider.tsx           # QueryClient + cliente tRPC (httpBatchLink)
│  └─ server.ts              # caller usado no SSR (sem HTTP)
├─ lib/
│  ├─ datas.ts               # aritmética de datas "AAAA-MM-DD" (semanas, meses, rótulos)
│  ├─ constantes.ts          # nomes dos dias, moverTarefa (compartilhada servidor/cliente)
│  └─ erros.ts               # traduz erros do tRPC/rede em mensagens para o usuário
├─ components/
│  ├─ planejador/
│  │  ├─ Planejador.tsx      # raiz: cabeçalho, modos, navegação, mutations
│  │  ├─ VisaoSemana.tsx     # kanban da semana (drag-and-drop, criação rápida)
│  │  ├─ VisaoMes.tsx        # calendário mensal (arrastar entre dias)
│  │  ├─ VisaoLista.tsx      # lista por data com infinite scroll
│  │  ├─ CartaoTarefa.tsx    # card (atalhos de teclado, edição inline)
│  │  └─ tipos.ts            # tipos inferidos do AppRouter e modos de exibição
│  ├─ TarefaForm.tsx         # formulário de criação/edição
│  ├─ ConfirmarExclusao.tsx  # tela de confirmação de exclusão
│  ├─ PainelConcluidas.tsx   # gaveta com as concluídas
│  ├─ Alerta.tsx             # avisos de sucesso/erro
│  ├─ Carregando.tsx         # indicador de carregamento
│  └─ Icones.tsx             # ícones SVG inline
└─ app/
   ├─ api/trpc/[trpc]/route.ts      # endpoint HTTP do tRPC
   ├─ layout.tsx                    # fontes, provider do tRPC
   ├─ (inicio)/page.tsx             # planejador (SSR)
   ├─ (inicio)/loading.tsx          # indicador ao navegar (fora da raiz: preserva o 404 da edição)
   ├─ error.tsx                     # tela de erro com "Tentar de novo"
   ├─ not-found.tsx                 # 404 (tarefa inexistente)
   ├─ tarefas/nova/page.tsx         # criação (+ loading.tsx)
   └─ tarefas/[id]/editar/page.tsx  # edição (SSR; 404 se não existir)
```

## Modelo

```ts
type Tarefa = {
  id: string;           // UUID gerado no servidor
  titulo: string;       // obrigatório, 1–100 caracteres (após trim)
  descricao?: string;   // opcional, até 500 caracteres
  dataCriacao: Date;    // timestamp de criação
  data: string;         // dia agendado, "AAAA-MM-DD" (pode ser no futuro)
  concluida: boolean;   // concluídas saem do planejador
  dataConclusao?: Date;
};
```

## Endpoints (`/api/trpc`)

| Procedure             | Tipo     | Entrada                              | Erros                                     |
|-----------------------|----------|--------------------------------------|-------------------------------------------|
| `tarefas.quadro`      | query    | —                                    | —                                         |
| `tarefas.listar`      | query    | `{ limit?, cursor? }` (paginada)     | —                                         |
| `tarefas.concluidas`  | query    | —                                    | —                                         |
| `tarefas.buscarPorId` | query    | `{ id }`                             | `NOT_FOUND`                               |
| `tarefas.criar`       | mutation | `{ titulo, descricao?, data? }`      | `BAD_REQUEST` (título vazio, data inválida) |
| `tarefas.atualizar`   | mutation | `{ id, titulo, descricao?, data? }`  | `BAD_REQUEST`, `NOT_FOUND`                |
| `tarefas.mover`       | mutation | `{ id, data, posicao? }`             | `BAD_REQUEST`, `NOT_FOUND`                |
| `tarefas.concluir`    | mutation | `{ id }`                             | `BAD_REQUEST` (já concluída), `NOT_FOUND` |
| `tarefas.reabrir`     | mutation | `{ id }`                             | `BAD_REQUEST` (já aberta), `NOT_FOUND`    |
| `tarefas.deletar`     | mutation | `{ id }`                             | `NOT_FOUND`                               |

- `quadro` devolve todas as tarefas abertas. O cliente filtra pela semana ou pelo mês visível, o que deixa a troca de período instantânea.
- `listar` devolve `{ itens, total, nextCursor }` em ordem de data. O cursor é o offset do próximo item.
- Sem `data`, `criar` usa o dia de hoje (fuso de São Paulo).

## Modos de exibição

- **Semana:** quadro kanban de segunda a domingo. As setas ‹ › avançam ou voltam semanas, e "Hoje" retorna à semana atual. O título é relativo ("Esta semana", "Próxima semana", "Daqui a 3 semanas"), com as datas por extenso abaixo.
- **Mês:** calendário com até 3 tarefas por dia. Arrastar uma tarefa para outro dia a remarca. Clicar numa tarefa ou no número do dia abre aquela semana, e o "+" de cada dia cria uma tarefa já com a data.
- **Lista:** todas as tarefas abertas em ordem de data, agrupadas por dia ("Hoje", "Amanhã", "Em 5 dias"). Usa **infinite scroll**: a primeira página vem do SSR e as seguintes chegam por `tarefas.listar` conforme a rolagem.

O modo e o período ficam na URL (`/?modo=mes&ref=2026-11-01`). Um F5 ou um link compartilhado abre no mesmo lugar, já renderizado no servidor.

## Principais decisões

- **Datas como texto "AAAA-MM-DD":** uma tarefa é marcada para um *dia*, não um instante. Guardar a data civil evita bugs de fuso. A aritmética (`src/lib/datas.ts`) é feita em UTC, e "hoje" é calculado no servidor, no fuso de São Paulo, e repassado ao cliente para que os dois concordem.
- **SSR sem HTTP:** os Server Components usam `createCaller` para chamar as procedures diretamente. Os dados do servidor viram o `initialData` das queries, então o HTML já chega pronto e não há requisição duplicada na hidratação.
- **Atualização otimista:** mover, concluir e editar a descrição mudam o cache na hora e o servidor confirma depois. Em caso de falha, a tela volta ao estado anterior e mostra o erro.
- **`moverTarefa` compartilhada:** a função pura em `src/lib/constantes.ts` roda no servidor e no cliente, para os dois calcularem a mesma ordem.
- **Validação em duas camadas:** o formulário valida no cliente para dar resposta imediata, e o Zod valida de novo no servidor, que é a fonte da verdade.
- **Erros legíveis:** o `errorFormatter` troca a mensagem padrão de erro do Zod (um JSON com todos os issues) pela primeira mensagem legível. No cliente, `mensagemDeErro` (`src/lib/erros.ts`) mostra os erros tratados como vieram, esconde detalhes de erros 500 e transforma falha de rede em "Sem conexão com o servidor".
- **Estados de tela:** cada operação tem carregando, sucesso e falha. Avisos de sucesso somem sozinhos, os de erro ficam até serem fechados, e mudanças otimistas são desfeitas se o servidor recusar. `loading.tsx` e `error.tsx` cobrem a navegação e falhas de SSR.
- **Store em `globalThis`:** sobrevive ao hot-reload do `next dev`.
- **Limitação conhecida:** na `listar`, a paginação por offset pode pular ou repetir um item se houver exclusões entre uma página e outra. Num banco real, eu usaria um cursor por `(data, id)`.

## Interface

- **Paleta:** a cor de destaque é o menta `#1FC496`. Como ela tem pouco contraste sobre branco (~2,2:1), textos sobre fundo claro usam o tom profundo `#0B7A5C` (~5,3:1), e superfícies menta recebem texto escuro.
- **Tipografia:** Bricolage Grotesque nos títulos e nas datas, Instrument Sans no texto. As fontes vêm empacotadas no projeto (`@fontsource`), então o build não precisa baixar nada do Google.
- **Card selecionado** (clique ou Tab): ganha um anel menta e aceita atalhos:
  - **digitar** edita a descrição ali mesmo (Enter salva, Shift + Enter quebra linha, Esc cancela);
  - **Alt + setas** move o card (← → trocam de dia, atravessando semanas; ↑ ↓ reordenam);
  - **Del** abre a exclusão.
- **Ações do card:** editar, **concluir** (botão menta, no centro) e excluir. Concluir tira o card da tela e o aviso oferece "Desfazer". O botão "Concluídas" abre uma gaveta lateral (`<dialog>` nativo) de onde a tarefa pode ser reaberta.
- **Exclusão:** pede confirmação numa tela própria, com "Manter" (menta, foco inicial) e "Excluir" (vermelho).
- **Formulário:** a data tem atalhos (Hoje, Amanhã, Próxima segunda, Daqui a 1 mês) e um seletor nativo. Depois de salvar, o app volta para a Lista com a confirmação.
- **Acessibilidade:** alternativa por teclado ao arraste, foco visível, alvos de toque de 44px, ações sempre visíveis sem hover e animações desligadas com `prefers-reduced-motion`.
- **Responsivo:** abaixo de 1100px a semana vira um carrossel por dia. Abaixo de 700px o calendário mostra um ponto por tarefa.
- O drag-and-drop usa a API nativa do HTML5, sem dependências, e funciona com mouse. No celular, a data é trocada pelo formulário.

## Testes de ponta a ponta

`tests/e2e/planejador.spec.ts` usa o app como um usuário, num navegador real (Playwright). São 31 passos:

- Lista com infinite scroll; troca de modos; navegação entre semanas e meses.
- Seleção de card, edição inline da descrição, Alt + setas (inclusive atravessando a semana) e Del.
- Exclusão com confirmação, concluir com "Desfazer", painel de concluídas.
- Criação rápida em sequência e arrastar com o mouse na semana e no calendário.
- Formulário (validação, criar, editar e mudar a data) e página 404.
- Queda de rede ("Sem conexão" e o card volta ao lugar).
- Celular: sem rolagem horizontal, abre no topo e as ações aparecem sem hover.

```bash
npx playwright install chromium   # só na primeira vez
npm run test:e2e
# ou, usando o Chrome já instalado:  PW_CHANNEL=chrome npm run test:e2e
```

Os testes sobem o próprio servidor de produção (porta 3100, build em `.next-e2e`). Começam sempre com os dados de exemplo e podem rodar com o `npm run dev` aberto. As datas são calculadas a partir de "hoje", então o roteiro funciona em qualquer dia.

## Exemplos com curl

```bash
# criar sem título → 400 "O título é obrigatório"
curl -X POST localhost:3000/api/trpc/tarefas.criar \
  -H 'content-type: application/json' -d '{"json":{"titulo":""}}'

# criar para o futuro
curl -X POST localhost:3000/api/trpc/tarefas.criar \
  -H 'content-type: application/json' -d '{"json":{"titulo":"Viagem","data":"2027-01-15"}}'

# atualizar inexistente → 404 'Tarefa com id "x" não encontrada'
curl -X POST localhost:3000/api/trpc/tarefas.atualizar \
  -H 'content-type: application/json' -d '{"json":{"id":"x","titulo":"a"}}'
```
