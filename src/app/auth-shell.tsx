import type { ReactNode } from "react";
import "./login/login-reference.css";

/**
 * Estrutura das telas públicas de autenticação (recuperar e definir senha), igual à do login:
 * painel com foto ao lado e formulário centralizado. O CSS é o do login (`.login-reference`),
 * por isso os formulários filhos usam as classes dele (`.field`, `.btn`, `.alert`, `.notice`).
 */
export function AuthShell({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <div className="login-reference">
      <div className="page">
        {/* O painel com a foto aparece só em telas largas. */}
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
          <div className="form-area">
            <div className="form-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="brand" src="/login-logo-referencia.png" alt="Múltiplus Ambiental" />
              <h1>{titulo}</h1>
              <p className="lead">{subtitulo}</p>
              {children}
              <div className="mobile-support">
                <strong>Precisa de ajuda para acessar?</strong>
                <br />
                Entre em contato com a equipe Múltiplus.
              </div>
            </div>
          </div>
          <footer className="footer">
            <span>© 2026 Múltiplus Ambiental</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
