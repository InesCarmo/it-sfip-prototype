import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT-SFIP — Navigable Prototype",
  description: "Low-fidelity prototype for the IT Strategic Funding Intelligence Platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt"><body>{children}</body></html>;
}
