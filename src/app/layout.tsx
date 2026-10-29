import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";

// As fontes locais tornam o build reproduzível e mantêm os pesos usados pela interface.
const raleway = localFont({
  src: "./fonts/raleway/Raleway-Latin-Variable.woff2",
  weight: "400 700",
  variable: "--font-raleway",
  display: "swap",
});

// Montserrat é usada nos textos de leitura conforme a identidade visual do sistema.
const montserrat = localFont({
  src: "./fonts/montserrat/Montserrat-Latin-Variable.woff2",
  weight: "400 700",
  variable: "--font-montserrat",
  display: "swap",
});

// A faixa Unicode restringe Droid Serif aos algarismos, inclusive em textos mistos.
const droidSerif = localFont({
  src: [
    { path: "./fonts/droid-serif/DroidSerif-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/droid-serif/DroidSerif-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-droid-serif",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: [],
  declarations: [{ prop: "unicode-range", value: "U+0030-0039" }],
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

export default function RootLayout({ children }: { children: ReactNode }) {
  // O layout raiz define idioma, fontes compartilhadas e a estrutura comum de todas as rotas.
  return (
    <html
      lang="pt-BR"
      className={`${raleway.variable} ${montserrat.variable} ${droidSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
