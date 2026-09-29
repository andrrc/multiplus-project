import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
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
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${sourceSerif4.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
