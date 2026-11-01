import type { Metadata } from "next";
import { TRPCProvider } from "@/trpc/Provider";
// Fonts bundled with the project (@fontsource) instead of next/font/google:
// the build doesn't download anything from Google, so it works offline and on
// restricted networks. Bricolage for headings and dates (personality);
// Instrument Sans for body text (readability). Variables live in globals.css.
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "compasso",
  description: "Task planner with list, month and week views. Next.js 15 + tRPC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>
          <main>{children}</main>
        </TRPCProvider>
      </body>
    </html>
  );
}
