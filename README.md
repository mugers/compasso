# compasso — Next.js 15 + tRPC

A task planner with three views: **List** (date order with infinite scroll; the home screen), **Month** (calendar) and **Week** (kanban board). Each week is a *compasso* — Portuguese for a musical measure — hence the name.

The backend keeps everything **in memory** and is exposed through **tRPC**. The frontend uses **SSR** to preload the screen. Cards can be **dragged** between days, reordered and scheduled weeks or months ahead.

## Getting started

Requirements: Node 18.18+ (tested with Node 24).

```bash
npm install
npm run dev          # http://localhost:3000
# or, in production mode:
npm run build && npm start
```

The app starts with sample tasks in the current week, the next one and the following month. Restarting the server clears the data.

## Challenge requirements: where they are

| Requirement | Where |
|-------------|-------|
| Next.js 15 + tRPC set up | `src/server/trpc.ts`, `src/app/api/trpc/[trpc]/route.ts`, `src/trpc/` |
| Task with `id`, `titulo`, `descricao?`, `dataCriacao` | `src/server/store.ts` (type `Tarefa`) |
| CRUD via tRPC: create, list, update, delete | `src/server/routers/tarefas.ts`: `criar`, `listar`, `atualizar`, `deletar` |
| No task without a title | Zod on the server (`titulo` in `tarefas.ts`) and form validation (`TarefaForm.tsx`) |
| Meaningful errors (e.g. updating a missing task) | `NOT_FOUND` with a message in `tarefas.ts`; `errorFormatter` in `server/trpc.ts` |
| Listing page with SSR | `src/app/(inicio)/page.tsx` (loads on the server) → **List** view (`VisaoLista.tsx`) |
| Delete from the list with feedback | Trash icon or Del → `ConfirmarExclusao.tsx` → toast in `Alerta.tsx` |
| Create/edit form with hooks and validation | `src/components/TarefaForm.tsx`, `src/app/tarefas/nova` and `tarefas/[id]/editar` |
| Error messages (backend and frontend), loading/success/failure | `src/lib/erros.ts`, `Alerta.tsx`, `error.tsx`, `loading.tsx` |
| **Bonus:** infinite scroll | List view: `VisaoLista.tsx` + the paginated `listar` procedure |
| **Bonus:** comments and README | Comments on the main decisions, and this file |

**Beyond the brief:** the Month and Week views with drag and drop, future dates, complete/reopen, keyboard shortcuts, inline editing and the e2e tests. None of it is needed for the requirements above. To review only the challenge scope, stay on the **List** view and the form.

**About naming:** the challenge specifies Portuguese field names (`titulo`, `descricao`, `dataCriacao`), so the code keeps the same domain vocabulary in identifiers (`Tarefa`, `criar`, `moverTarefa`...). Everything a person reads — UI, messages, comments and docs — is in English.

## Stack

| Layer         | Technology                                     |
|---------------|------------------------------------------------|
| Framework     | Next.js 15 (App Router) + React 19             |
| API           | tRPC v11 (`fetch` adapter in a Route Handler)  |
| Validation    | Zod (server), hand-written checks in the form  |
| Client        | `@trpc/react-query` + TanStack Query v5        |
| Serialization | superjson (to send `Date` values)              |

## Structure

```
src/                         # (tests in tests/e2e, config in playwright.config.ts)
├─ server/
│  ├─ store.ts               # in-memory "database" (array on globalThis)
│  ├─ trpc.ts                # initTRPC, superjson and Zod error formatting
│  └─ routers/
│     ├─ _app.ts             # root router + AppRouter type
│     └─ tarefas.ts          # every task procedure
├─ trpc/
│  ├─ client.ts              # createTRPCReact<AppRouter>
│  ├─ Provider.tsx           # QueryClient + tRPC client (httpBatchLink)
│  └─ server.ts              # caller used for SSR (no HTTP)
├─ lib/
│  ├─ datas.ts               # "YYYY-MM-DD" date arithmetic (weeks, months, labels)
│  ├─ constantes.ts          # day names, moverTarefa (shared by server and client)
│  └─ erros.ts               # turns tRPC/network errors into user messages
├─ components/
│  ├─ planejador/
│  │  ├─ Planejador.tsx      # root: header, views, navigation, mutations
│  │  ├─ VisaoSemana.tsx     # week kanban (drag-and-drop, quick add)
│  │  ├─ VisaoMes.tsx        # month calendar (drag between days)
│  │  ├─ VisaoLista.tsx      # date-ordered list with infinite scroll
│  │  ├─ CartaoTarefa.tsx    # card (keyboard shortcuts, inline editing)
│  │  └─ tipos.ts            # types inferred from AppRouter, view modes
│  ├─ TarefaForm.tsx         # create/edit form
│  ├─ ConfirmarExclusao.tsx  # delete confirmation dialog
│  ├─ PainelConcluidas.tsx   # completed tasks drawer
│  ├─ Alerta.tsx             # success/error toasts
│  ├─ Carregando.tsx         # loading indicator
│  └─ Icones.tsx             # inline SVG icons
└─ app/
   ├─ api/trpc/[trpc]/route.ts      # tRPC HTTP endpoint
   ├─ layout.tsx                    # fonts, tRPC provider
   ├─ (inicio)/page.tsx             # planner (SSR)
   ├─ (inicio)/loading.tsx          # navigation indicator (not at the root: keeps the edit page's 404)
   ├─ error.tsx                     # error screen with "Try again"
   ├─ not-found.tsx                 # 404 (missing task)
   ├─ tarefas/nova/page.tsx         # create (+ loading.tsx)
   └─ tarefas/[id]/editar/page.tsx  # edit (SSR; 404 if missing)
```

## Model

```ts
type Tarefa = {
  id: string;           // UUID generated on the server
  titulo: string;       // required, 1–100 characters (after trim)
  descricao?: string;   // optional, up to 500 characters
  dataCriacao: Date;    // creation timestamp
  data: string;         // scheduled day, "YYYY-MM-DD" (can be in the future)
  concluida: boolean;   // completed tasks leave the planner
  dataConclusao?: Date;
};
```

## Endpoints (`/api/trpc`)

| Procedure             | Type     | Input                                | Errors                                      |
|-----------------------|----------|--------------------------------------|---------------------------------------------|
| `tarefas.quadro`      | query    | —                                    | —                                           |
| `tarefas.listar`      | query    | `{ limit?, cursor? }` (paginated)    | —                                           |
| `tarefas.concluidas`  | query    | —                                    | —                                           |
| `tarefas.buscarPorId` | query    | `{ id }`                             | `NOT_FOUND`                                 |
| `tarefas.criar`       | mutation | `{ titulo, descricao?, data? }`      | `BAD_REQUEST` (empty title, invalid date)   |
| `tarefas.atualizar`   | mutation | `{ id, titulo, descricao?, data? }`  | `BAD_REQUEST`, `NOT_FOUND`                  |
| `tarefas.mover`       | mutation | `{ id, data, posicao? }`             | `BAD_REQUEST`, `NOT_FOUND`                  |
| `tarefas.concluir`    | mutation | `{ id }`                             | `BAD_REQUEST` (already completed), `NOT_FOUND` |
| `tarefas.reabrir`     | mutation | `{ id }`                             | `BAD_REQUEST` (already open), `NOT_FOUND`   |
| `tarefas.deletar`     | mutation | `{ id }`                             | `NOT_FOUND`                                 |

- `quadro` returns every open task. The client filters by the visible week or month, which keeps switching periods instant.
- `listar` returns `{ itens, total, nextCursor }` in date order. The cursor is the offset of the next item.
- Without `data`, `criar` uses today (São Paulo time zone).

## Views

- **List:** every open task in date order, grouped by day ("Today", "Tomorrow", "In 5 days"). It uses **infinite scroll**: the first page comes from SSR and the following ones arrive through `tarefas.listar` as you scroll.
- **Month:** a calendar with up to 3 tasks per day. Dragging a task to another day reschedules it. Clicking a task or the day number opens that week, and each day's "+" creates a task already dated.
- **Week:** a Monday-to-Sunday kanban board. The ‹ › arrows move between weeks and "Today" returns to the current one. The title is relative ("This week", "Next week", "In 3 weeks"), with the dates spelled out below.

The view and period live in the URL (`/?modo=mes&ref=2026-11-01`). A refresh or a shared link opens in the same place, already rendered on the server.

## Key decisions

- **Dates as "YYYY-MM-DD" text:** a task is scheduled for a *day*, not an instant. Storing the calendar date avoids time zone bugs. The arithmetic (`src/lib/datas.ts`) is done in UTC, and "today" is computed on the server in the São Paulo time zone and passed to the client so both agree.
- **SSR without HTTP:** Server Components use `createCaller` to call the procedures directly. Server data becomes the queries' `initialData`, so the HTML arrives ready and there is no duplicate request on hydration.
- **Optimistic updates:** moving, completing and editing the description change the cache immediately and the server confirms afterwards. On failure, the screen rolls back and shows the error.
- **Shared `moverTarefa`:** the pure function in `src/lib/constantes.ts` runs on both server and client, so both compute the same order.
- **Two-layer validation:** the form validates on the client for instant feedback, and Zod validates again on the server, which is the source of truth.
- **Readable errors:** `errorFormatter` replaces Zod's default error message (a JSON dump of every issue) with the first readable one. On the client, `mensagemDeErro` (`src/lib/erros.ts`) shows handled errors as they come, hides 500 details and turns network failures into "Can't reach the server".
- **Screen states:** every operation has loading, success and failure states. Success toasts disappear on their own, errors stay until dismissed, and optimistic changes are rolled back if the server refuses them. `loading.tsx` and `error.tsx` cover navigation and SSR failures.
- **Store on `globalThis`:** survives `next dev` hot reloads.
- **Known limitation:** in `listar`, offset pagination can skip or repeat an item if tasks are deleted between pages. With a real database I would use a `(data, id)` cursor.

## Interface

- **Palette:** the accent is mint `#1FC496`. Since it has little contrast on white (~2.2:1), text on light backgrounds uses the deep shade `#0B7A5C` (~5.3:1), and mint surfaces get dark text.
- **Typography:** Bricolage Grotesque for headings and dates, Instrument Sans for body text. The fonts are bundled with the project (`@fontsource`), so the build doesn't download anything from Google.
- **Selected card** (click or Tab): gets a mint ring and accepts shortcuts:
  - **typing** edits the description in place (Enter saves, Shift + Enter adds a line, Esc cancels);
  - **Alt + arrows** move the card (← → change the day, crossing weeks; ↑ ↓ reorder);
  - **Del** opens the delete dialog.
- **Card actions:** edit, **complete** (mint button, in the center) and delete. Completing removes the card and the toast offers "Undo". The "Completed" button opens a side drawer (native `<dialog>`) where tasks can be reopened.
- **Deleting:** asks for confirmation in its own dialog, with "Keep" (mint, initial focus) and "Delete" (red).
- **Form:** the date has shortcuts (Today, Tomorrow, Next Monday, In 1 month) and a native picker. After saving, the app returns to the List with a confirmation.
- **Accessibility:** a keyboard alternative to dragging, visible focus, 44px touch targets, actions always visible without hover, and animations disabled with `prefers-reduced-motion`.
- **Responsive:** below 1100px the week becomes a per-day carousel. Below 700px the calendar shows one dot per task.
- Drag-and-drop uses the native HTML5 API, with no dependencies, and works with a mouse. On phones, the date is changed through the form.

## End-to-end tests

`tests/e2e/planejador.spec.ts` uses the app like a user, in a real browser (Playwright). It has 31 steps:

- List with infinite scroll; switching views; navigating weeks and months.
- Card selection, inline description editing, Alt + arrows (including crossing the week) and Del.
- Deleting with confirmation, completing with "Undo", the completed drawer.
- Quick add in a row, and mouse drag on the week board and on the calendar.
- Form (validation, create, edit and change the date) and the 404 page.
- Network failure ("Can't reach the server" and the card stays in place).
- Phone: no horizontal scroll, opens at the top, and actions show without hover.

```bash
npx playwright install chromium   # first time only
npm run test:e2e
# or, using an installed Chrome:  PW_CHANNEL=chrome npm run test:e2e
```

The tests start their own production server (port 3100, build in `.next-e2e`). They always begin with the sample data and can run while `npm run dev` is open. Dates are computed from "today", so the script works on any day.

## curl examples

```bash
# create without a title → 400 "Title is required"
curl -X POST localhost:3000/api/trpc/tarefas.criar \
  -H 'content-type: application/json' -d '{"json":{"titulo":""}}'

# create for the future
curl -X POST localhost:3000/api/trpc/tarefas.criar \
  -H 'content-type: application/json' -d '{"json":{"titulo":"Trip","data":"2027-01-15"}}'

# update a missing task → 404 'Task with id "x" not found'
curl -X POST localhost:3000/api/trpc/tarefas.atualizar \
  -H 'content-type: application/json' -d '{"json":{"id":"x","titulo":"a"}}'
```
