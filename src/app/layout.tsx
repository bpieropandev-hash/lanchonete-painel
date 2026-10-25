import { headers } from "next/headers";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastContainer } from "@/components/ui/Toast";
import { NOME_LOJA } from "@/lib/marca";

const geist = localFont({ src: "./fonts/GeistVF.woff", variable: "--font-geist", weight: "100 900" });
const geistMono = localFont({ src: "./fonts/GeistMonoVF.woff", variable: "--font-geist-mono", weight: "100 900" });

export const metadata: Metadata = {
  title: `Painel · ${NOME_LOJA}`,
  description: "Painel interno da loja: pedidos, cozinha, cardápio e caixa",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="pt-BR" nonce={nonce}>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
