import { headers } from "next/headers";
import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Painel - Lanchonete",
  description: "Painel interno de gerenciamento da lanchonete",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="pt-BR" nonce={nonce}>
      <body className="antialiased">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
