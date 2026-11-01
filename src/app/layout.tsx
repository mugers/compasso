import type { Metadata } from "next";
import { TRPCProvider } from "@/trpc/Provider";
// Fontes empacotadas no projeto (@fontsource) em vez de next/font/google:
// o build não depende de baixar nada do Google, então funciona offline e em
// redes restritas. Bricolage para títulos e datas (personalidade); Instrument
// Sans para o texto corrido (legibilidade). As variáveis ficam em globals.css.
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "compasso",
  description: "Planejador de tarefas por semana, mês e lista. Next.js 15 + tRPC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <TRPCProvider>
          <main>{children}</main>
        </TRPCProvider>
      </body>
    </html>
  );
}
