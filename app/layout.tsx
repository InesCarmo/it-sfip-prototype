import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT-SFIP — Strategic Funding Intelligence Platform",
  description: "Plataforma de inteligência de financiamento do Instituto de Telecomunicações.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt"><body>{children}</body></html>;
}
