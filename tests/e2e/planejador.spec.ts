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
 * A real-usage script for the planner. Steps run in sequence on the same page
 * and share the server (in-memory data), the way a user would.
 *
 * Dates are computed from "today" with the same helpers the app uses: the
 * sample data is relative to the current week's Monday, so the script works
 * on whatever day it runs.
 */

const hoje = hojeISO();
const segunda = inicioDaSemana(hoje);
const dia = (n: number) => somarDias(segunda, n); // 0 = Monday ... 6 = Sunday

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
  await expect(page.getByText(/All \d+ tasks loaded/)).toBeVisible();
}

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => errosConsole.push(e.message));
});

test.afterAll(async () => {
  // No unhandled JavaScript error during the whole script.
  expect(errosConsole, errosConsole.join("\n")).toEqual([]);
  await page.close();
});

// ---------------------------------------------------------------- List

test("List: is the home screen, already rendered on the server", async () => {
  await page.goto("/");
  await expect(titulo()).toHaveText("Day by day");
  await expect(page.locator("[data-card]")).toHaveCount(10);
});

test("List: infinite scroll loads the rest while scrolling", async () => {
  await carregarListaInteira();
  await expect(page.locator("[data-card]")).toHaveCount(17);
});

// ---------------------------------------------------------------- Week

test("Week: switches view and shows 7 columns", async () => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await modo("Week");
  await expect(titulo()).toHaveText("This week");
  await expect(page.locator("section.coluna")).toHaveCount(7);
});

test("Selected card hint fits on screen on the outer columns", async () => {
  for (const t of ["Team meeting", "Rest"]) {
    await card(t).locator("h3").click();
    const caixa = await card(t).locator(".dica-card").boundingBox();
    expect(caixa).not.toBeNull();
    expect(caixa!.x).toBeGreaterThanOrEqual(0);
    expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(1440);
  }
});

test("Clicking selects the card (the hint shows only on it)", async () => {
  await card("Plan the week").locator("h3").click();
  expect(await focado()).toBe("Plan the week");
  await expect(page.locator(".dica-card:visible")).toHaveCount(1);
});

test("Typing on a selected card edits the description; Enter saves", async () => {
  await page.keyboard.type("x");
  const area = card("Plan the week").locator("textarea");
  await expect(area).toBeVisible();
  await page.keyboard.type("yz");
  await expect(area).toHaveValue(/xyz$/);
  await page.keyboard.press("Enter");
  await expect(aviso("Description saved")).toBeVisible();
  await expect(card("Plan the week").locator("p")).toHaveText(/xyz$/);
  expect(await focado()).toBe("Plan the week");
});

test("Esc cancels the edit without saving", async () => {
  await page.keyboard.type("Q");
  await page.keyboard.press("Escape");
  await expect(card("Plan the week").locator("p")).not.toHaveText(/Q$/);
});

test("Alt+→ moves to the next day and keeps the selection", async () => {
  await card("Plan the week").focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(coluna(dia(1)).locator('[aria-label="Plan the week"]')).toBeVisible();
  expect(await focado()).toBe("Plan the week");
});

test("Alt+↑ moves the card up within the day", async () => {
  await page.keyboard.press("Alt+ArrowUp");
  await expect
    .poll(async () => {
      const titulos = await coluna(dia(1)).locator("[data-card] h3").allInnerTexts();
      return titulos.indexOf("Plan the week") < titulos.length - 1;
    })
    .toBe(true);
});

test("Del opens the delete dialog focused on Keep; Esc keeps the card", async () => {
  await card("Plan the week").focus();
  await page.keyboard.press("Delete");
  const dialogo = page.locator("dialog.modal-exclusao");
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole("button", { name: "Keep" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialogo).toBeHidden();
  await expect(card("Plan the week")).toHaveCount(1);
});

test("Deleting through the dialog removes the card", async () => {
  await card("Gym").focus();
  await page.keyboard.press("Delete");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(aviso("deleted")).toBeVisible();
  await expect(card("Gym")).toHaveCount(0);
});

test("Complete (first click) removes the card; Undo brings it back", async () => {
  const alvo = card("Call the bank");
  await alvo.hover();
  await alvo.getByRole("button", { name: /^Complete/ }).click();
  await expect(alvo).toHaveCount(0);
  await aviso("completed").getByRole("button", { name: "Undo" }).click();
  await expect(card("Call the bank")).toHaveCount(1);
});

test("Quick add: warns when empty, creates and keeps focus for the next one", async () => {
  const col = coluna(dia(3));
  await col.getByRole("button", { name: /Add/ }).click();
  await page.keyboard.press("Enter");
  await expect(col.getByText("Type a title before pressing Enter")).toBeVisible();
  await page.keyboard.type("E2E quick");
  await page.keyboard.press("Enter");
  await expect(col.locator('[aria-label="E2E quick"]')).toBeVisible();
  await expect(col.locator(".adicao input")).toBeFocused();
  await expect(col.locator(".adicao input")).toHaveValue("");
  await page.keyboard.type("E2E sequence");
  await page.keyboard.press("Enter");
  await expect(col.locator('[aria-label="E2E sequence"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(col.locator(".adicao input")).toHaveCount(0);
});

test("Dragging a card with the mouse to another day", async () => {
  await card("E2E quick").dragTo(coluna(dia(4)).locator(".cards"));
  await expect(coluna(dia(4)).locator('[aria-label="E2E quick"]')).toBeVisible();
});

test("Navigation: next week and back to today", async () => {
  await page.getByRole("button", { name: "Next week" }).click();
  await expect(titulo()).toHaveText("Next week");
  await expect(card("Present quarterly results")).toBeVisible();
  await page.getByRole("button", { name: "Today" }).click();
  await expect(titulo()).toHaveText("This week");
});

test("Alt+→ on Sunday crosses into the next week without losing the selection", async () => {
  await card("Rest").focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(coluna(dia(7)).locator('[aria-label="Rest"]')).toBeVisible();
  await expect(titulo()).toHaveText("Next week");
  await expect.poll(focado).toBe("Rest");
  await page.getByRole("button", { name: "Today" }).click();
});

// ---------------------------------------------------------------- Month

test("Month: full calendar with today highlighted", async () => {
  await modo("Month");
  await expect(titulo()).toContainText(nomeDoMes(hoje));
  await expect(page.locator('[role="gridcell"]')).toHaveCount(gradeDoMes(hoje).length);
  await expect(page.locator(".dia-hoje")).toHaveCount(1);
});

test("Month: dragging a task to another day reschedules it", async () => {
  const destino = page.locator(`[role="gridcell"][aria-label^="${rotuloLongo(dia(2))},"]`);
  await page.locator(".chip-tarefa", { hasText: "Grocery shopping" }).dragTo(destino);
  await expect(destino.locator(".chip-tarefa", { hasText: "Grocery shopping" })).toBeVisible();
});

test("Month: clicking a task opens its week with the card selected", async () => {
  // "Renew passport" is 16 days after the current Monday: this month or the next.
  const chip = page.locator(".chip-tarefa", { hasText: "Renew passport" });
  if (!(await chip.count())) await page.getByRole("button", { name: "Next month" }).click();
  await chip.click();
  await expect(card("Renew passport")).toBeVisible();
  await expect(titulo()).toHaveText("In 2 weeks");
  await expect.poll(focado).toBe("Renew passport");
});

// ---------------------------------------------------------------- Completed

test("Completed: the drawer opens, reopens a task and closes with Esc", async () => {
  await page.getByRole("button", { name: /Completed/ }).click();
  const gaveta = page.locator("dialog.gaveta");
  await expect(gaveta).toBeVisible();
  await gaveta.getByRole("button", { name: /^Reopen/ }).first().click();
  await expect(aviso("is back in the planner")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(gaveta).toBeHidden();
});

// ---------------------------------------------------------------- Form

test("Form: without a title shows the error and does not submit", async () => {
  await page.getByRole("link", { name: "New task", exact: true }).click();
  await page.waitForURL(/\/tarefas\/nova/);
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByText("Give the task a title")).toBeVisible();
  await expect(page.locator("#titulo")).toBeFocused();
  expect(page.url()).toContain("/tarefas/nova");
});

test("Form: creating for tomorrow returns to the List with a toast", async () => {
  await page.locator("#titulo").fill("E2E form");
  await page.getByRole("button", { name: "Tomorrow" }).click();
  await page.locator("#descricao").fill("created by the test");
  await page.getByRole("button", { name: "Create task" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/tarefas"));
  await expect(aviso("Task created")).toBeVisible();
  await expect(titulo()).toHaveText("Day by day");
  await carregarListaInteira();
  await expect(card("E2E form")).toBeVisible();
});

test("Edit via the pencil: prefilled; changes title and moves date to the future", async () => {
  const c = card("E2E form");
  await c.hover();
  await c.getByRole("link", { name: /^Edit/ }).click();
  await page.waitForURL(/\/editar/);
  await expect(page.locator("#titulo")).toHaveValue("E2E form");
  await page.locator("#titulo").fill("E2E edited");
  await page.locator("#data").fill(somarDias(hoje, 40));
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/tarefas"));
  await expect(aviso("Changes saved")).toBeVisible();
});

test("Missing task: 404 page", async () => {
  const resposta = await page.goto("/tarefas/nao-existe/editar");
  expect(resposta?.status()).toBe(404);
  await expect(page.getByText("Task not found")).toBeVisible();
});

// ---------------------------------------------------------------- Network failure

test("Offline: completing shows 'Can't reach the server' and the card stays", async () => {
  await page.goto("/?modo=semana");
  await page.route("**/api/trpc/**", (r) => r.abort());
  const alvo = card("Reply to emails");
  await alvo.hover();
  await alvo.getByRole("button", { name: /^Complete/ }).click();
  await expect(aviso("Can't reach the server")).toBeVisible();
  await expect(card("Reply to emails")).toHaveCount(1);
  await page.unroute("**/api/trpc/**");
});

// ---------------------------------------------------------------- Phone

test.describe("Phone (390px)", () => {
  let cel: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      locale: "en-US",
    });
    cel = await ctx.newPage();
  });

  for (const [rotulo, url] of [
    ["list", "/"],
    ["week", "/?modo=semana"],
    ["month", "/?modo=mes"],
    ["form", "/tarefas/nova"],
  ] as const) {
    test(`${rotulo}: no horizontal page scroll`, async () => {
      await cel.goto(url);
      await cel.waitForTimeout(400);
      const { sw, cw } = await cel.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(sw).toBeLessThanOrEqual(cw);
    });
  }

  test("week: opens at the top, with the carousel on today", async () => {
    await cel.goto("/?modo=semana");
    await cel.waitForTimeout(500);
    const r = await cel.evaluate((data) => {
      const col = document.getElementById(`dia-${data}`)?.closest("section");
      return { y: window.scrollY, esquerda: col?.getBoundingClientRect().left ?? -1 };
    }, hoje);
    expect(r.y).toBe(0);
    // Today's column starts at the left edge (on Mondays the carousel doesn't even scroll).
    expect(r.esquerda).toBeGreaterThanOrEqual(0);
    expect(r.esquerda).toBeLessThan(60);
  });

  test("card actions are visible without hover", async () => {
    const opacidade = await cel
      .locator("[data-card] .acoes")
      .first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(opacidade).toBe("1");
  });
});
