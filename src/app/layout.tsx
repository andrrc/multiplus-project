import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { connection } from "next/server";
import "./globals.css";

// A fonte da interface segue os protótipos compartilhados pela Múltiplus.
const fonteSistema = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans/IBMPlexSans-Regular.ttf", weight: "400" },
    { path: "./fonts/ibm-plex-sans/IBMPlexSans-Medium.ttf", weight: "500" },
    { path: "./fonts/ibm-plex-sans/IBMPlexSans-SemiBold.ttf", weight: "600" },
  ],
  variable: "--font-sistema",
  display: "swap",
});

export const metadata: Metadata = {
  // Usa a URL pública configurada para compor metadados absolutos.
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "Múltiplus Ambiental | Gestão de projetos e prazos",
    template: "%s | Múltiplus Ambiental",
  },
  description: "Gestão de clientes, projetos, tarefas e prazos ambientais da Múltiplus Ambiental.",
  applicationName: "Múltiplus Ambiental",
  generator: "Next.js",
  keywords: ["gestão ambiental", "projetos ambientais", "prazos ambientais", "Múltiplus Ambiental"],
  authors: [{ name: "Múltiplus Ambiental" }],
  creator: "Múltiplus Ambiental",
  publisher: "Múltiplus Ambiental",
  alternates: { canonical: "/" },
  // O conteúdo autenticado não deve ser indexado por buscadores.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true, nosnippet: true },
  },
  icons: { icon: "/icon.png", apple: "/icon.png" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Múltiplus Ambiental",
    title: "Múltiplus Ambiental | Gestão de projetos e prazos",
    description: "Gestão de clientes, projetos, tarefas e prazos ambientais.",
    url: "/",
    images: [{ url: "/og-multiplus.png", width: 1200, height: 630, alt: "Múltiplus Ambiental" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Múltiplus Ambiental | Gestão de projetos e prazos",
    description: "Gestão de clientes, projetos, tarefas e prazos ambientais.",
    images: ["/og-multiplus.png"],
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection(); // O nonce é único por requisição e não pode ser cacheado em HTML estático.
  // O layout raiz define idioma, fontes compartilhadas e a estrutura comum de todas as rotas.
  return (
    <html
      lang="pt-BR"
      className={`${fonteSistema.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
