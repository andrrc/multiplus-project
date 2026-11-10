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
            <ul>
              <li><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><span className="placeholder">[e-mail de suporte]</span></li>
              <li><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-13.2 7.9L3 21l1.1-4.6A9 9 0 1 1 21 12Z"/></svg><span className="placeholder">[WhatsApp com DDD]</span></li>
            </ul>
            <p className="hours">Atendimento de segunda a sexta, [horário].</p>
          </div>
        </aside>
        <main className="main">
          <div className="form-area"><div className="form-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand" src="/login-logo-referencia.png" alt="Múltiplus Ambiental" />
            <h1>Sistema de Gestão Múltiplus</h1>
            <p className="lead">{motivo === "sessao-invalidada" ? "Sua sessão não é mais válida. Entre novamente com uma conta ativa." : "Entre com o e-mail e a senha cadastrados."}</p>
            <LoginForm callbackUrl={callbackUrl ?? "/"} />
            <div className="mobile-support"><strong>Precisa de ajuda para acessar?</strong><br/><span className="placeholder">[e-mail de suporte]</span> ou <span className="placeholder">[WhatsApp com DDD]</span><br/>Segunda a sexta, [horário].</div>
          </div></div>
          <footer className="footer"><span>© 2026 Múltiplus Ambiental</span><nav aria-label="Links legais"><span>Política de privacidade</span></nav></footer>
        </main>
      </div>
    </div>
  );
}
