import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import "./login-reference.css";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; motivo?: string }> }) {
  const { callbackUrl, motivo } = await searchParams;
  return (
    <div className="login-reference">
      <div className="page">
        <aside className="panel" aria-label="Apresentação e suporte">
          <div className="panel-text">
            <div className="rule" />
            <h2>Prazos, responsáveis e documentos ambientais organizados em um só lugar.</h2>
            <p>Acesso da equipe Múltiplus, dos clientes e dos responsáveis designados em cada empresa.</p>
          </div>
          <div className="support">
            <h3>Suporte</h3>
            <p className="hours">Precisa de ajuda para acessar? Entre em contato com a equipe Múltiplus.</p>
          </div>
        </aside>
        <main className="main">
          <div className="form-area"><div className="form-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand" src="/login-logo-referencia.png" alt="Múltiplus Ambiental" />
            <h1>Sistema de Gestão Múltiplus</h1>
            <p className="lead">{motivo === "sessao-invalidada" ? "Sua sessão não é mais válida. Entre novamente com uma conta ativa." : "Entre com o e-mail e a senha cadastrados."}</p>
            <LoginForm callbackUrl={callbackUrl ?? "/"} />
            <div className="mobile-support"><strong>Precisa de ajuda para acessar?</strong><br/>Entre em contato com a equipe Múltiplus.</div>
          </div></div>
          <footer className="footer"><span>© 2026 Múltiplus Ambiental</span></footer>
        </main>
      </div>
    </div>
  );
}
