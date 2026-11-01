import { test, expect, type Page, type Browser } from "@playwright/test";
import {
  gradeDoMes,
  hojeISO,
  inicioDaSemana,
  nomeDoMes,
  rotuloLongo,
  somarDias,
} from "../../src/lib/datas";

/**
 * Roteiro de uso real do planejador. Os passos rodam em sequência na mesma
 * página e compartilham o servidor (dados em memória), como um usuário faria.
 *
 * As datas são calculadas a partir de "hoje" com as mesmas funções do app:
 * os dados de exemplo são relativos à segunda-feira da semana atual, então o
 * roteiro funciona em qualquer dia em que for executado.
 */

const hoje = hojeISO();
const segunda = inicioDaSemana(hoje);
const dia = (n: number) => somarDias(segunda, n); // 0 = segunda ... 6 = domingo

test.describe.configure({ mode: "serial" });

let page: Page;
const errosConsole: string[] = [];

const card = (titulo: string) => page.locator(`article[data-card][aria-label="${titulo}"]`);
const coluna = (data: string) => page.locator(`section[aria-labelledby="dia-${data}"]`);
const titulo = () => page.locator("h1").first();
const focado = () => page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
const aviso = (texto: string | RegExp) => page.locator(".alerta", { hasText: texto });
const modo = (nome: string) => page.getByRole("radio", { name: nome }).click();

async function carregarListaInteira() {
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(250);
  }
  await expect(page.getByText(/Todas as \d+ tarefas carregadas/)).toBeVisible();
}

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => errosConsole.push(e.message));
});

test.afterAll(async () => {
  // Nenhum erro de JavaScript não tratado durante todo o roteiro.
  expect(errosConsole, errosConsole.join("\n")).toEqual([]);
  await page.close();
});

// ---------------------------------------------------------------- Lista

test("Lista: é a tela inicial, já renderizada no servidor", async () => {
  await page.goto("/");
  await expect(titulo()).toHaveText("Dia a dia");
  await expect(page.locator("[data-card]")).toHaveCount(10);
});

test("Lista: infinite scroll carrega o restante ao rolar", async () => {
  await carregarListaInteira();
  await expect(page.locator("[data-card]")).toHaveCount(17);
});

// ---------------------------------------------------------------- Semana

test("Semana: troca de modo e mostra 7 colunas", async () => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await modo("Semana");
  await expect(titulo()).toHaveText("Esta semana");
  await expect(page.locator("section.coluna")).toHaveCount(7);
});

test("Dica do card selecionado cabe na tela nas colunas da ponta", async () => {
  for (const t of ["Reunião de equipe", "Descansar"]) {
    await card(t).locator("h3").click();
    const caixa = await card(t).locator(".dica-card").boundingBox();
    expect(caixa).not.toBeNull();
    expect(caixa!.x).toBeGreaterThanOrEqual(0);
    expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(1440);
  }
});

test("Clique seleciona o card (a dica aparece só nele)", async () => {
  await card("Planejar a semana").locator("h3").click();
  expect(await focado()).toBe("Planejar a semana");
  await expect(page.locator(".dica-card:visible")).toHaveCount(1);
});

test("Digitar com o card selecionado edita a descrição; Enter salva", async () => {
  await page.keyboard.type("x");
  const area = card("Planejar a semana").locator("textarea");
  await expect(area).toBeVisible();
  await page.keyboard.type("yz");
  await expect(area).toHaveValue(/xyz$/);
  await page.keyboard.press("Enter");
  await expect(aviso("Descrição salva")).toBeVisible();
  await expect(card("Planejar a semana").locator("p")).toHaveText(/xyz$/);
  expect(await focado()).toBe("Planejar a semana");
});

test("Esc cancela a edição sem salvar", async () => {
  await page.keyboard.type("Q");
  await page.keyboard.press("Escape");
  await expect(card("Planejar a semana").locator("p")).not.toHaveText(/Q$/);
});

test("Alt+→ move para o dia seguinte e mantém a seleção", async () => {
  await card("Planejar a semana").focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(coluna(dia(1)).locator('[aria-label="Planejar a semana"]')).toBeVisible();
  expect(await focado()).toBe("Planejar a semana");
});

test("Alt+↑ sobe o card dentro do dia", async () => {
  await page.keyboard.press("Alt+ArrowUp");
  await expect
    .poll(async () => {
      const titulos = await coluna(dia(1)).locator("[data-card] h3").allInnerTexts();
      return titulos.indexOf("Planejar a semana") < titulos.length - 1;
    })
    .toBe(true);
});

test("Del abre a tela de exclusão com foco em Manter; Esc mantém o card", async () => {
  await card("Planejar a semana").focus();
  await page.keyboard.press("Delete");
  const dialogo = page.locator("dialog.modal-exclusao");
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole("button", { name: "Manter" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialogo).toBeHidden();
  await expect(card("Planejar a semana")).toHaveCount(1);
});

test("Excluir pela tela de confirmação remove o card", async () => {
  await card("Academia").focus();
  await page.keyboard.press("Delete");
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(aviso("excluída")).toBeVisible();
  await expect(card("Academia")).toHaveCount(0);
});

test("Concluir (primeiro clique) tira o card; Desfazer devolve", async () => {
  const alvo = card("Ligar para o banco");
  await alvo.hover();
  await alvo.getByRole("button", { name: /^Concluir/ }).click();
  await expect(alvo).toHaveCount(0);
  await aviso("concluída").getByRole("button", { name: "Desfazer" }).click();
  await expect(card("Ligar para o banco")).toHaveCount(1);
});

test("Criação rápida: avisa se vazio, cria e mantém o foco para a próxima", async () => {
  const col = coluna(dia(3));
  await col.getByRole("button", { name: /Adicionar/ }).click();
  await page.keyboard.press("Enter");
  await expect(col.getByText("Digite um título antes de apertar Enter")).toBeVisible();
  await page.keyboard.type("E2E rápida");
  await page.keyboard.press("Enter");
  await expect(col.locator('[aria-label="E2E rápida"]')).toBeVisible();
  await expect(col.locator(".adicao input")).toBeFocused();
  await expect(col.locator(".adicao input")).toHaveValue("");
  await page.keyboard.type("E2E sequência");
  await page.keyboard.press("Enter");
  await expect(col.locator('[aria-label="E2E sequência"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(col.locator(".adicao input")).toHaveCount(0);
});

test("Arrastar um card com o mouse para outro dia", async () => {
  await card("E2E rápida").dragTo(coluna(dia(4)).locator(".cards"));
  await expect(coluna(dia(4)).locator('[aria-label="E2E rápida"]')).toBeVisible();
});

test("Navegação: próxima semana e volta para hoje", async () => {
  await page.getByRole("button", { name: "Próxima semana" }).click();
  await expect(titulo()).toHaveText("Próxima semana");
  await expect(card("Apresentar resultados do trimestre")).toBeVisible();
  await page.getByRole("button", { name: "Hoje" }).click();
  await expect(titulo()).toHaveText("Esta semana");
});

test("Alt+→ no domingo atravessa para a semana seguinte, sem perder a seleção", async () => {
  await card("Descansar").focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(coluna(dia(7)).locator('[aria-label="Descansar"]')).toBeVisible();
  await expect(titulo()).toHaveText("Próxima semana");
  await expect.poll(focado).toBe("Descansar");
  await page.getByRole("button", { name: "Hoje" }).click();
});

// ---------------------------------------------------------------- Mês

test("Mês: calendário completo com hoje destacado", async () => {
  await modo("Mês");
  await expect(titulo()).toContainText(nomeDoMes(hoje));
  await expect(page.locator('[role="gridcell"]')).toHaveCount(gradeDoMes(hoje).length);
  await expect(page.locator(".dia-hoje")).toHaveCount(1);
});

test("Mês: arrastar uma tarefa para outro dia a remarca", async () => {
  const destino = page.locator(`[role="gridcell"][aria-label^="${rotuloLongo(dia(2))},"]`);
  await page.locator(".chip-tarefa", { hasText: "Feira" }).dragTo(destino);
  await expect(destino.locator(".chip-tarefa", { hasText: "Feira" })).toBeVisible();
});

test("Mês: clicar numa tarefa abre a semana dela com o card selecionado", async () => {
  // "Renovar passaporte" fica 16 dias após a segunda atual: neste mês ou no próximo.
  const chip = page.locator(".chip-tarefa", { hasText: "Renovar passaporte" });
  if (!(await chip.count())) await page.getByRole("button", { name: "Próximo mês" }).click();
  await chip.click();
  await expect(card("Renovar passaporte")).toBeVisible();
  await expect(titulo()).toHaveText("Daqui a 2 semanas");
  await expect.poll(focado).toBe("Renovar passaporte");
});

// ---------------------------------------------------------------- Concluídas

test("Concluídas: o painel abre, reabre uma tarefa e fecha com Esc", async () => {
  await page.getByRole("button", { name: /Concluídas/ }).click();
  const gaveta = page.locator("dialog.gaveta");
  await expect(gaveta).toBeVisible();
  await gaveta.getByRole("button", { name: /^Reabrir/ }).first().click();
  await expect(aviso("voltou")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(gaveta).toBeHidden();
});

// ---------------------------------------------------------------- Formulário

test("Formulário: sem título mostra o erro e não envia", async () => {
  await page.getByRole("link", { name: "Nova tarefa", exact: true }).click();
  await page.waitForURL(/\/tarefas\/nova/);
  await page.getByRole("button", { name: "Criar tarefa" }).click();
  await expect(page.getByText("Dê um título para a tarefa")).toBeVisible();
  await expect(page.locator("#titulo")).toBeFocused();
  expect(page.url()).toContain("/tarefas/nova");
});

test("Formulário: criar para amanhã volta para a Lista com aviso", async () => {
  await page.locator("#titulo").fill("E2E formulário");
  await page.getByRole("button", { name: "Amanhã" }).click();
  await page.locator("#descricao").fill("criada pelo teste");
  await page.getByRole("button", { name: "Criar tarefa" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/tarefas"));
  await expect(aviso("Tarefa criada")).toBeVisible();
  await expect(titulo()).toHaveText("Dia a dia");
  await carregarListaInteira();
  await expect(card("E2E formulário")).toBeVisible();
});

test("Editar pelo lápis: vem preenchido; muda título e data para o futuro", async () => {
  const c = card("E2E formulário");
  await c.hover();
  await c.getByRole("link", { name: /^Editar/ }).click();
  await page.waitForURL(/\/editar/);
  await expect(page.locator("#titulo")).toHaveValue("E2E formulário");
  await page.locator("#titulo").fill("E2E editado");
  await page.locator("#data").fill(somarDias(hoje, 40));
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/tarefas"));
  await expect(aviso("Alterações salvas")).toBeVisible();
});

test("Tarefa inexistente: página 404", async () => {
  const resposta = await page.goto("/tarefas/nao-existe/editar");
  expect(resposta?.status()).toBe(404);
  await expect(page.getByText("Tarefa não encontrada")).toBeVisible();
});

// ---------------------------------------------------------------- Falha de rede

test("Sem rede: concluir avisa 'Sem conexão' e o card volta ao lugar", async () => {
  await page.goto("/?modo=semana");
  await page.route("**/api/trpc/**", (r) => r.abort());
  const alvo = card("Responder e-mails");
  await alvo.hover();
  await alvo.getByRole("button", { name: /^Concluir/ }).click();
  await expect(aviso("Sem conexão")).toBeVisible();
  await expect(card("Responder e-mails")).toHaveCount(1);
  await page.unroute("**/api/trpc/**");
});

// ---------------------------------------------------------------- Celular

test.describe("Celular (390px)", () => {
  let cel: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      locale: "pt-BR",
    });
    cel = await ctx.newPage();
  });

  for (const [rotulo, url] of [
    ["lista", "/"],
    ["semana", "/?modo=semana"],
    ["mês", "/?modo=mes"],
    ["formulário", "/tarefas/nova"],
  ] as const) {
    test(`${rotulo}: sem rolagem horizontal na página`, async () => {
      await cel.goto(url);
      await cel.waitForTimeout(400);
      const { sw, cw } = await cel.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(sw).toBeLessThanOrEqual(cw);
    });
  }

  test("semana: abre no topo, com o carrossel posicionado em hoje", async () => {
    await cel.goto("/?modo=semana");
    await cel.waitForTimeout(500);
    const r = await cel.evaluate((data) => {
      const col = document.getElementById(`dia-${data}`)?.closest("section");
      return { y: window.scrollY, esquerda: col?.getBoundingClientRect().left ?? -1 };
    }, hoje);
    expect(r.y).toBe(0);
    // A coluna de hoje começa no início da tela (na segunda, o carrossel nem precisa rolar).
    expect(r.esquerda).toBeGreaterThanOrEqual(0);
    expect(r.esquerda).toBeLessThan(60);
  });

  test("ações do card visíveis sem precisar de hover", async () => {
    const opacidade = await cel
      .locator("[data-card] .acoes")
      .first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(opacidade).toBe("1");
  });
});
