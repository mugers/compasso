import { defineConfig } from "@playwright/test";

const PORTA = 3100;

/**
 * Testes de ponta a ponta: usam o app como um usuário, num navegador real.
 *
 * Sobem o próprio servidor de produção numa porta e pasta de build separadas
 * (3100 / .next-e2e): começam sempre com os dados de exemplo e não interferem
 * num `npm run dev` aberto.
 *
 * Navegador: por padrão o Chromium do Playwright (`npx playwright install
 * chromium` uma vez). Para usar o Chrome já instalado: PW_CHANNEL=chrome.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 6_000 },
  // Os testes compartilham o mesmo servidor (dados em memória) e seguem
  // um roteiro: rodam em sequência, um worker só.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    channel: process.env.PW_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next build && npx next start -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: { NEXT_DIST_DIR: ".next-e2e" },
  },
});
